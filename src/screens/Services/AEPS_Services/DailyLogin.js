/**
 * DailyLogin.js
 *
 * AEPS NPCI Daily Login screen
 * Supports: Fingerprint (Mantra, Morpho, Startek, SecuGen) + Face auth
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Alert,
  PermissionsAndroid,
  Platform,
  Modal,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import RDService, { RD_ERROR_CODES } from './RDService';
import { aepsDailyLogin } from '../../../api/AuthApi';
import { AlertService } from '../../../componets/Alerts/CustomAlert';
import * as NavigationService from '../../../utils/NavigationService';
import HeaderBar from '../../../componets/HeaderBar/HeaderBar';
import { fadeIn, slideUp, buttonPress } from '../../../utils/ScreenAnimations';
import Colors from '../../../constants/Colors';

const { width: SW } = Dimensions.get('window');
const S = SW / 375;

// ─── Device list comes from RDService.js ─────────────────────────────────────
const DEVICE_LIST = RDService.DEVICE_LIST;

// ─── RD Status constants ──────────────────────────────────────────────────────
const STATUS = {
  IDLE: 'idle',
  CHECKING: 'checking',
  INSTALLED: 'installed',
  NOT_INSTALLED: 'not_installed',
};

const DailyLogin = () => {
  // ── Form state ───────────────────────────────────────────────────────────
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [authMethod, setAuthMethod] = useState(null); // 'finger' | 'face'
  const [device, setDevice] = useState(null); // 'MANTRA' | 'MORPHO' | ...
  const [showDeviceList, setShowDeviceList] = useState(false);

  // ── RD Service check state ────────────────────────────────────────────────
  const [rdStatus, setRdStatus] = useState(STATUS.IDLE);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // ── Animations ────────────────────────────────────────────────────────────
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20 * S)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      fadeIn(fadeAnim, 600),
      slideUp(slideAnim, 600),
    ]).start();
  }, []);

  // ── Re-check RD Service whenever device selection changes ─────────────────
  useEffect(() => {
    if (!device || authMethod !== 'finger') {
      setRdStatus(STATUS.IDLE);
      return;
    }

    let cancelled = false;
    setRdStatus(STATUS.CHECKING);

    RDService.isInstalled(device)
      .then((installed) => {
        if (!cancelled) {
          setRdStatus(installed ? STATUS.INSTALLED : STATUS.NOT_INSTALLED);
        }
      })
      .catch(() => {
        if (!cancelled) setRdStatus(STATUS.NOT_INSTALLED);
      });

    return () => { cancelled = true; };
  }, [device, authMethod]);

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const e = {};
    if (!/^\d{12}$/.test(aadhaarNumber)) e.aadhaar = 'Valid 12-digit Aadhaar required';
    if (!/^\d{10}$/.test(mobileNumber)) e.mobile = 'Valid 10-digit mobile number required';
    if (!authMethod) e.method = 'Please choose a verification method';
    if (authMethod === 'finger' && !device) e.device = 'Please select a biometric device';
    if (authMethod === 'finger' && rdStatus === STATUS.NOT_INSTALLED) {
      e.rdservice = `RD Service not installed for ${RDService.getDeviceLabel(device)}`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Switch auth method (reset device state) ───────────────────────────────
  const selectAuthMethod = (method) => {
    setAuthMethod(method);
    setDevice(null);
    setRdStatus(STATUS.IDLE);
    setErrors({});
  };

  // ── Select device from dropdown ───────────────────────────────────────────
  const selectDevice = (deviceKey) => {
    setDevice(deviceKey);
    setShowDeviceList(false);
    setErrors((prev) => ({ ...prev, device: null, rdservice: null }));
  };

  // ─────────────────────────────────────────────────────────────────────────
  // FINGERPRINT FLOW
  // ─────────────────────────────────────────────────────────────────────────
  const handleFingerprint = async () => {
    // If not installed, show install prompt and bail
    if (rdStatus === STATUS.NOT_INSTALLED) {
      Alert.alert(
        'RD Service Not Installed',
        `Please install the RD Service app for ${RDService.getDeviceLabel(device)} to continue.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Install Now', onPress: () => RDService.openInstallPage(device) },
        ]
      );
      return;
    }

    if (!validate()) return;

    try {
      setLoading(true);

      // ── Request Location Permission for Android ──
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Location permission is required for AEPS Daily Login.');
          setLoading(false);
          return;
        }
      }

      buttonPress(btnScale).start();

      // ── Capture fingerprint PID from RD Service ──
      const pidData = await RDService.capture(device);

      // ── Get User Location ──────────────────────────────────────────────────
      const getLocation = () =>
        new Promise((resolve) => {
          Geolocation.getCurrentPosition(
            (pos) => resolve(pos.coords),
            (err) => {
              console.log('[GEOLOCATION] Error:', err);
              // Fallback to default if coordinates fail
              resolve({ latitude: 26.88978, longitude: 75.738251 });
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
          );
        });

      const coords = await getLocation();

      const headerToken = await AsyncStorage.getItem('header_token');
      const idempotencyKey = `DL_FP_${Date.now()}`;

      const payload = {
        aadhaar: aadhaarNumber,
        latitude: coords.latitude,
        longitude: coords.longitude,
        captureType: 'finger',
        biometricData: pidData,
      };

      const res = await aepsDailyLogin({ data: payload, headerToken, idempotencyKey });

      if (res.success || res.status === 'SUCCESS') {
        AlertService.showAlert({
          type: 'success',
          title: 'Login Successful',
          message: res.message || 'Fingerprint authentication successful',
          onClose: () => NavigationService.goBack(),
        });
      } else {
        AlertService.showAlert({
          type: 'error',
          title: 'Authentication Failed',
          message: res.message || 'Please try again',
        });
      }
    } catch (err) {
      // Handle specific RD Service error codes
      let message = 'Fingerprint capture failed. Please try again.';

      switch (err?.code) {
        case RD_ERROR_CODES.NOT_INSTALLED:
          message = `RD Service app is not installed. Please install it for ${RDService.getDeviceLabel(device)}.`;
          break;
        case RD_ERROR_CODES.CANCELLED:
          message = 'Fingerprint capture was cancelled.';
          break;
        case RD_ERROR_CODES.NO_PID:
          message = 'No fingerprint data received. Please try again.';
          break;
        case RD_ERROR_CODES.ACTIVITY_NOT_FOUND:
          message = 'Could not open RD Service. Ensure the device is connected and the app is installed.';
          break;
        case RD_ERROR_CODES.BUSY:
          message = 'A fingerprint capture is already in progress.';
          break;
        default:
          message = err?.message || message;
      }

      AlertService.showAlert({
        type: 'error',
        title: 'Fingerprint Error',
        message,
      });
    } finally {
      setLoading(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // FACE AUTH FLOW
  // ─────────────────────────────────────────────────────────────────────────
  const handleFace = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      // ── Request Location Permission for Android ──
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Location permission is required for AEPS Daily Login.');
          setLoading(false);
          return;
        }
      }
      buttonPress(btnScale).start();

      // ── Get User Location ──────────────────────────────────────────────────
      const getLocation = () =>
        new Promise((resolve) => {
          Geolocation.getCurrentPosition(
            (pos) => resolve(pos.coords),
            (err) => {
              console.log('[GEOLOCATION] Error:', err);
              resolve({ latitude: 26.88978, longitude: 75.738251 });
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
          );
        });

      const coords = await getLocation();

      const headerToken = await AsyncStorage.getItem('header_token');
      const idempotencyKey = `DL_FACE_${Date.now()}`;

      const payload = {
        aadhaar: aadhaarNumber,
        latitude: coords.latitude,
        longitude: coords.longitude,
        captureType: 'face',
        biometricData: 'FACERD_CAPTURE',
      };

      const res = await aepsDailyLogin({ data: payload, headerToken, idempotencyKey });

      if (res.success || res.status === 'SUCCESS') {
        AlertService.showAlert({
          type: 'success',
          title: 'Login Successful',
          message: res.message || 'Face authentication successful',
          onClose: () => NavigationService.goBack(),
        });
      } else {
        AlertService.showAlert({
          type: 'error',
          title: 'Authentication Failed',
          message: res.message || 'Please try again',
        });
      }
    } catch (err) {
      AlertService.showAlert({
        type: 'error',
        title: 'Error',
        message: err?.message || 'Network or system error. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  // ── Submit dispatcher ─────────────────────────────────────────────────────
  const handleSubmit = () => {
    if (!validate()) return;
    if (authMethod === 'finger') handleFingerprint();
    else handleFace();
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RD SERVICE STATUS BANNER
  // ─────────────────────────────────────────────────────────────────────────
  const RDStatusBanner = () => {
    if (!device || authMethod !== 'finger') return null;

    if (rdStatus === STATUS.CHECKING) {
      return (
        <View style={[styles.rdBanner, styles.rdChecking]}>
          <ActivityIndicator size="small" color="#555" />
          <Text style={styles.rdBannerText}>  Checking RD Service…</Text>
        </View>
      );
    }

    if (rdStatus === STATUS.INSTALLED) {
      return (
        <View style={[styles.rdBanner, styles.rdInstalled]}>
          <Text style={styles.rdBannerText}>
            ✅  {RDService.getDeviceLabel(device)} RD Service is ready
          </Text>
        </View>
      );
    }

    if (rdStatus === STATUS.NOT_INSTALLED) {
      return (
        <View style={[styles.rdBanner, styles.rdMissing]}>
          <Text style={styles.rdBannerText}>
            ⚠️  Connect {RDService.getDeviceLabel(device)} and install its RD Service.{'  '}
          </Text>
          <TouchableOpacity onPress={() => RDService.openInstallPage(device)}>
            <Text style={styles.installLink}>Install Now →</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  // ── Disable submit while checking or if RD Service missing ───────────────
  const isSubmitDisabled = loading;

  const selectedDeviceLabel = device ? RDService.getDeviceLabel(device) : null;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      {/* ── Custom Header ───────────────────────────────────────────────── */}
      <View style={styles.customHeader}>
        <TouchableOpacity
          style={styles.backCircle}
          onPress={() => NavigationService.goBack()}
        >
          <MaterialCommunityIcons name="chevron-left" size={28} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NPCI Daily Login</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Shield & Title ──────────────────────────────────────────────── */}
        <Animated.View style={[styles.headerSection, { opacity: fadeAnim }]}>
          <View style={styles.shieldCircle}>
            <MaterialCommunityIcons name="shield-lock" size={34} color="#B8860B" />
          </View>
          <Text style={styles.mainTitle}>Merchant Login</Text>
          <Text style={styles.mainSubtitle}>
            Mandatory identity verification for today's transactions
          </Text>
        </Animated.View>

        <Animated.View
          style={{
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <View style={styles.card}>
            {/* ── Aadhaar ─────────────────────────────────────────────── */}
            <Text style={styles.label}>AADHAAR NUMBER</Text>
            <View style={[styles.inputContainer, errors.aadhaar && styles.inputError]}>
              <MaterialCommunityIcons name="face-recognition" size={24} color="#B8860B" />
              <TextInput
                style={styles.input}
                placeholder="12 Digit Aadhaar Number"
                placeholderTextColor="#A0A0A0"
                keyboardType="numeric"
                maxLength={12}
                value={aadhaarNumber}
                onChangeText={(v) => {
                  setAadhaarNumber(v);
                  if (errors.aadhaar) setErrors((p) => ({ ...p, aadhaar: null }));
                }}
              />
            </View>
            {errors.aadhaar ? <Text style={styles.error}>{errors.aadhaar}</Text> : null}

            {/* ── Mobile ──────────────────────────────────────────────── */}
            <Text style={styles.label}>MOBILE NUMBER</Text>
            <View style={[styles.inputContainer, errors.mobile && styles.inputError]}>
              <MaterialCommunityIcons name="phone" size={22} color="#B8860B" />
              <TextInput
                style={styles.input}
                placeholder="10 Digit Mobile Number"
                placeholderTextColor="#A0A0A0"
                keyboardType="numeric"
                maxLength={10}
                value={mobileNumber}
                onChangeText={(v) => {
                  setMobileNumber(v);
                  if (errors.mobile) setErrors((p) => ({ ...p, mobile: null }));
                }}
              />
            </View>
            {errors.mobile ? <Text style={styles.error}>{errors.mobile}</Text> : null}

            {/* ── Auth Method Tiles ────────────────────────────────────── */}
            <View style={styles.authRow}>
              <TouchableOpacity
                style={[styles.authTile, authMethod === 'finger' && styles.authTileActive]}
                onPress={() => selectAuthMethod('finger')}
              >
                <MaterialCommunityIcons
                  name="fingerprint"
                  size={32}
                  color={authMethod === 'finger' ? '#FFF' : '#777'}
                />
                <Text
                  style={[
                    styles.authTileText,
                    authMethod === 'finger' && styles.authTileTextActive,
                  ]}
                >
                  Fingerprint
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.authTile, authMethod === 'face' && styles.authTileActive]}
                onPress={() => selectAuthMethod('face')}
              >
                <MaterialCommunityIcons
                  name="face-recognition"
                  size={32}
                  color={authMethod === 'face' ? '#FFF' : '#777'}
                />
                <Text
                  style={[
                    styles.authTileText,
                    authMethod === 'face' && styles.authTileTextActive,
                  ]}
                >
                  Face Search
                </Text>
              </TouchableOpacity>
            </View>
            {errors.method ? <Text style={styles.error}>{errors.method}</Text> : null}

            {/* ── Device Picker (fingerprint only) ────────────────────── */}
            {authMethod === 'finger' && (
              <View style={{ marginTop: 20 }}>
                <Text style={styles.label}>SELECT DEVICE</Text>

                <TouchableOpacity
                  style={[
                    styles.inputContainer,
                    styles.picker,
                    errors.device && styles.inputError,
                  ]}
                  onPress={() => setShowDeviceList((v) => !v)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="usb-flash-drive" size={20} color="#B8860B" />
                  <Text style={selectedDeviceLabel ? styles.pickerValue : styles.pickerPlaceholder}>
                    {selectedDeviceLabel ?? 'Choose scanner'}
                  </Text>
                  <MaterialCommunityIcons
                    name={showDeviceList ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#A0A0A0"
                  />
                </TouchableOpacity>

                {errors.device ? <Text style={styles.error}>{errors.device}</Text> : null}

                {/* Dropdown list */}
                {showDeviceList && (
                  <View style={styles.dropdown}>
                    {DEVICE_LIST.map((d) => (
                      <TouchableOpacity
                        key={d.value}
                        style={[
                          styles.dropdownItem,
                          device === d.value && styles.dropdownItemActive,
                        ]}
                        onPress={() => selectDevice(d.value)}
                      >
                        <Text
                          style={[
                            styles.dropdownText,
                            device === d.value && styles.dropdownTextActive,
                          ]}
                        >
                          {d.label}
                        </Text>
                        {device === d.value && (
                          <MaterialCommunityIcons name="check" size={18} color="#1A1A2E" />
                        )}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}

                {/* RD Service status banner */}
                <RDStatusBanner />
                {errors.rdservice ? (
                  <Text style={styles.error}>{errors.rdservice}</Text>
                ) : null}
              </View>
            )}

            {/* Verification dot instruction */}
            <View style={styles.instructionRow}>
              <View style={styles.dot} />
              <Text style={styles.instructionText}>Select verification method.</Text>
            </View>

            {/* ── Submit Button ────────────────────────────────────────── */}
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                style={[styles.submitBtn, isSubmitDisabled && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitDisabled}
                activeOpacity={0.85}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <MaterialCommunityIcons name="fingerprint" size={24} color="#FFF" style={{ marginRight: 10 }} />
                    <Text style={styles.submitBtnText}>
                      {authMethod === 'face' ? 'Start Face Authentication' : 'Capture Fingerprint'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>NPCI • RBI COMPLIANT • SECURE GATEWAY</Text>
        </View>

        <Modal transparent visible={loading} animationType="fade">
          <View style={styles.loaderOverlay}>
            <View style={styles.loaderCard}>
              <ActivityIndicator size="large" color="#1A1A2E" />
              <Text style={styles.loaderText}>Processing...</Text>
              <Text style={styles.loaderSub}>Please wait while we verify your identity.</Text>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DailyLogin;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF3E1',
  },
  customHeader: {
    height: 60,
    backgroundColor: '#1A1A2E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  headerTitle: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: '700',
  },
  scroll: {
    paddingBottom: 40,
  },
  headerSection: {
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 25,
    paddingHorizontal: 20,
  },
  shieldCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    marginBottom: 20,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#333',
  },
  mainSubtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginTop: 6,
    maxWidth: '85%',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#F9E7C4',
    marginHorizontal: 15,
    padding: 24,
    borderRadius: 40,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#888',
    marginTop: 18,
    marginBottom: 10,
    letterSpacing: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 18,
    height: 56,
  },
  input: {
    flex: 1,
    marginLeft: 12,
    color: '#222',
    fontSize: 15,
    fontWeight: '500',
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  error: {
    color: '#EF4444',
    fontSize: 11,
    marginTop: 4,
    marginLeft: 12,
  },
  authRow: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 30,
  },
  authTile: {
    flex: 1,
    height: 110,
    backgroundColor: '#FFF',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  authTileActive: {
    backgroundColor: '#1A1A2E',
  },
  authTileText: {
    fontSize: 14,
    color: '#777',
    fontWeight: '600',
  },
  authTileTextActive: {
    color: '#FFF',
  },
  picker: {
    justifyContent: 'space-between',
  },
  pickerPlaceholder: {
    color: '#BBB',
    fontSize: 14,
    flex: 1,
    marginLeft: 12,
  },
  pickerValue: {
    color: '#333',
    fontSize: 14,
    flex: 1,
    marginLeft: 12,
    fontWeight: '500',
  },
  dropdown: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    marginTop: 10,
    paddingVertical: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 5 },
  },
  dropdownItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  dropdownItemActive: {
    backgroundColor: '#F8FAFC',
  },
  dropdownText: {
    color: '#444',
    fontSize: 14,
  },
  dropdownTextActive: {
    color: '#1A1A2E',
    fontWeight: '700',
  },
  rdBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    paddingHorizontal: 5,
  },
  rdBannerText: {
    fontSize: 12,
    color: '#666',
  },
  installLink: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '700',
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 20,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#B8860B',
    marginRight: 10,
  },
  instructionText: {
    fontSize: 13,
    color: '#888',
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: '#1A1A2E',
    height: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 25,
    elevation: 4,
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  submitBtnDisabled: {
    backgroundColor: '#555',
  },
  submitBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 17,
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: 35,
    alignItems: 'center',
    paddingBottom: 20,
  },
  footerText: {
    fontSize: 11,
    color: '#AAA',
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  loaderOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderCard: {
    backgroundColor: '#FFF',
    padding: 35,
    borderRadius: 25,
    alignItems: 'center',
    width: '85%',
    elevation: 12,
  },
  loaderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111',
    marginTop: 20,
  },
  loaderSub: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 10,
    lineHeight: 22,
  },
});

