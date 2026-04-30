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

import RDService, { RD_ERROR_CODES } from '../../../utils/RDService';
import { aepsInstantDailyLogin } from '../../../api/AuthApi';
import { AlertService } from '../../../componets/Alerts/CustomAlert';
import * as NavigationService from '../../../utils/NavigationService';
import HeaderBar from '../../../componets/HeaderBar/HeaderBar';
import { fadeIn, slideUp, buttonPress } from '../../../utils/ScreenAnimations';
import Colors from '../../../constants/Colors';
import FullScreenLoader from '../../../componets/Loader/FullScreenLoader';

const { width: SW, height: SH } = Dimensions.get("window");
const scale = (n) => Math.round((SW / 375) * n);
const rs = (n, lo = n * 0.82, hi = n * 1.28) =>
  Math.min(Math.max(scale(n), lo), hi);

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
  const slideAnim = useRef(new Animated.Value(rs(20))).current;
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
    if (!/^[6-9]\d{9}$/.test(mobileNumber)) e.mobile = 'Enter a valid 10-digit mobile number starting with 6-9';
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
      const headerKey = await AsyncStorage.getItem('header_key');
      const idempotencyKey = `DL_FP_${Date.now()}`;

      // Payload format as requested: matching Balance Enquiry logic (without bankId)
      const payload = {
        aadhaar: String(aadhaarNumber),
        mobile: String(mobileNumber),
        latitude: Number(coords.latitude),
        longitude: Number(coords.longitude),
        captureType: 'finger',
        biometricData: RDService.parsePidXml(pidData),
      };

      const res = await aepsInstantDailyLogin({
        data: payload,
        headerToken,
        headerKey,
        idempotencyKey
      });

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
                  const filtered = v.replace(/[^0-9]/g, "");
                  setAadhaarNumber(filtered);
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
                  const filtered = v.replace(/[^0-9]/g, "");
                  setMobileNumber(filtered);
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
                <MaterialCommunityIcons name="fingerprint" size={24} color="#FFF" style={{ marginRight: 10 }} />
                <Text style={styles.submitBtnText}>
                  {authMethod === 'face' ? 'Start Face Authentication' : 'Capture Fingerprint'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>NPCI • RBI COMPLIANT • SECURE GATEWAY</Text>
        </View>

        <FullScreenLoader visible={loading} label="Processing Identity..." />
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
    height: rs(60),
    backgroundColor: '#1A1A2E',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: rs(15),
    borderBottomLeftRadius: rs(20),
    borderBottomRightRadius: rs(20),
  },
  backCircle: {
    width: rs(40),
    height: rs(40),
    borderRadius: rs(20),
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#FFF',
    fontSize: rs(16),
    fontWeight: '700',
  },
  scroll: {
    paddingBottom: rs(40),
  },
  headerSection: {
    alignItems: 'center',
    marginTop: rs(25),
    marginBottom: rs(20),
    paddingHorizontal: rs(20),
  },
  shieldCircle: {
    width: rs(72),
    height: rs(72),
    borderRadius: rs(36),
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: rs(15),
  },
  mainTitle: {
    fontSize: rs(24),
    fontWeight: '700',
    color: '#333',
  },
  mainSubtitle: {
    fontSize: rs(13),
    color: '#888',
    textAlign: 'center',
    marginTop: rs(4),
    maxWidth: '85%',
    lineHeight: rs(18),
  },
  card: {
    backgroundColor: '#F9E7C4',
    marginHorizontal: rs(15),
    padding: rs(20),
    borderRadius: rs(30),
  },
  label: {
    fontSize: rs(10),
    fontWeight: '700',
    color: '#888',
    marginTop: rs(14),
    marginBottom: rs(8),
    letterSpacing: 0.8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: rs(18),
    paddingHorizontal: rs(16),
    height: rs(54),
  },
  input: {
    flex: 1,
    marginLeft: rs(10),
    color: '#222',
    fontSize: rs(14),
    fontWeight: '500',
  },
  inputError: {
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  error: {
    color: '#EF4444',
    fontSize: rs(10),
    marginTop: rs(4),
    marginLeft: rs(12),
  },
  authRow: {
    flexDirection: 'row',
    gap: rs(12),
    marginTop: rs(24),
  },
  authTile: {
    flex: 1,
    height: rs(90),
    backgroundColor: '#FFF',
    borderRadius: rs(20),
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(6),
  },
  authTileActive: {
    backgroundColor: '#1A1A2E',
  },
  authTileText: {
    fontSize: rs(13),
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
    fontSize: rs(14),
    flex: 1,
    marginLeft: rs(10),
  },
  pickerValue: {
    color: '#333',
    fontSize: rs(14),
    flex: 1,
    marginLeft: rs(10),
    fontWeight: '500',
  },
  dropdown: {
    backgroundColor: '#FFF',
    borderRadius: rs(18),
    marginTop: rs(10),
    paddingVertical: rs(6),
  },
  dropdownItem: {
    paddingVertical: rs(14),
    paddingHorizontal: rs(18),
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
    fontSize: rs(13),
  },
  dropdownTextActive: {
    color: '#1A1A2E',
    fontWeight: '700',
  },
  rdBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: rs(12),
    paddingHorizontal: rs(5),
  },
  rdBannerText: {
    fontSize: rs(11),
    color: '#666',
  },
  installLink: {
    fontSize: rs(11),
    color: '#EF4444',
    fontWeight: '700',
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: rs(20),
    marginBottom: rs(15),
  },
  dot: {
    width: rs(6),
    height: rs(6),
    borderRadius: rs(3),
    backgroundColor: '#B8860B',
    marginRight: rs(8),
  },
  instructionText: {
    fontSize: rs(12),
    color: '#888',
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: '#1A1A2E',
    height: rs(58),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: rs(20),
  },
  submitBtnDisabled: {
    backgroundColor: '#555',
  },
  submitBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: rs(15),
    letterSpacing: 0.5,
  },
  footer: {
    marginTop: rs(30),
    alignItems: 'center',
    paddingBottom: rs(20),
  },
  footerText: {
    fontSize: rs(10),
    color: '#AAA',
    letterSpacing: 1.2,
    fontWeight: '600',
  },
});

