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
  const [authMethod, setAuthMethod] = useState(null);
  const [device, setDevice] = useState(null);
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

    // Load pre-filled mobile number
    // AsyncStorage.getItem('user_phone').then((phone) => {
    //   if (phone) setMobileNumber(phone);
    // });
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
      const headerKey = await AsyncStorage.getItem('header_key');
      const idempotencyKey = `DL_FP_${Date.now()}`;

      const payload = {
        aadhaar: aadhaarNumber,
        latitude: coords.latitude,
        longitude: coords.longitude,
        captureType: 'finger',
        biometricData: RDService.parsePidXml(pidData),
      };

      const res = await aepsDailyLogin({ data: payload, headerToken, headerKey, idempotencyKey });

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
        <View style={styles.rdBanner}>
          <ActivityIndicator size="small" color={Colors.amber} />
          <Text style={styles.rdBannerText}>  Checking RD Service...</Text>
        </View>
      );
    }

    if (rdStatus === STATUS.INSTALLED) {
      return (
        <View style={styles.rdBanner}>
          <MaterialCommunityIcons name="check-circle" size={16} color={Colors.green} />
          <Text style={[styles.rdBannerText, { color: Colors.green }]}>  RD Service Ready</Text>
        </View>
      );
    }

    if (rdStatus === STATUS.NOT_INSTALLED) {
      return (
        <View style={styles.rdBanner}>
          <MaterialCommunityIcons name="alert-circle" size={16} color={Colors.red} />
          <Text style={[styles.rdBannerText, { color: Colors.red }]}>  RD Service Missing</Text>
          <TouchableOpacity onPress={() => RDService.openInstallPage(device)}>
            <Text style={styles.installLink}> (Install Now)</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  // ── Disable submit while checking or if RD Service missing ───────────────
  const isSubmitDisabled =
    loading ||
    (authMethod === 'finger' &&
      (!device ||
        rdStatus === STATUS.NOT_INSTALLED ||
        rdStatus === STATUS.CHECKING));

  const selectedDeviceLabel = device ? RDService.getDeviceLabel(device) : null;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar
        title="NPCI Daily Login"
        onBack={() => NavigationService.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[styles.headerSection, { opacity: fadeAnim }]}
        >
          <View style={styles.shieldCircle}>
            <MaterialCommunityIcons name="shield-lock" size={32} color={Colors.kyc_accent} />
          </View>
          <Text style={styles.mainTitle}>Merchant Login</Text>
          <Text style={styles.mainSubtitle}>Mandatory identity verification for today's transactions</Text>
        </Animated.View>

        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <View style={styles.card}>

            {/* ── Aadhaar ─────────────────────────────────────────────── */}
            <Text style={styles.label}>AADHAAR NUMBER</Text>
            <View style={[styles.inputContainer, errors.aadhaar && styles.inputError]}>
              <MaterialCommunityIcons name="account-search-outline" size={24} color={Colors.kyc_accent} />
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
              <MaterialCommunityIcons name="phone" size={22} color={Colors.kyc_accent} />
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

            {/* ── Auth Method ──────────────────────────────────────────── */}
            <View style={styles.authRow}>
              <TouchableOpacity
                style={[styles.authTile, authMethod === 'finger' && styles.authTileActive]}
                onPress={() => selectAuthMethod('finger')}
              >
                <MaterialCommunityIcons 
                  name="fingerprint" 
                  size={30} 
                  color={authMethod === 'finger' ? '#FFF' : '#777'} 
                />
                <Text style={[styles.authTileText, authMethod === 'finger' && styles.authTileTextActive]}>
                  Fingerprint
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.authTile, authMethod === 'face' && styles.authTileActive]}
                onPress={() => selectAuthMethod('face')}
              >
                <MaterialCommunityIcons 
                  name="face-recognition" 
                  size={30} 
                  color={authMethod === 'face' ? '#FFF' : '#777'} 
                />
                <Text style={[styles.authTileText, authMethod === 'face' && styles.authTileTextActive]}>
                  Face Search
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── Device Picker (fingerprint only) ────────────────────── */}
            {authMethod === 'finger' && (
              <View style={{ marginTop: 15 }}>
                <Text style={styles.label}>SELECT DEVICE</Text>

                <TouchableOpacity
                  style={[styles.inputContainer, styles.picker, errors.device && styles.inputError]}
                  onPress={() => setShowDeviceList((v) => !v)}
                  activeOpacity={0.7}
                >
                  <MaterialCommunityIcons name="usb-flash-drive" size={20} color={Colors.kyc_accent} />
                  <Text style={selectedDeviceLabel ? styles.pickerValue : styles.pickerPlaceholder}>
                    {selectedDeviceLabel ?? 'Choose scanner'}
                  </Text>
                  <MaterialCommunityIcons name={showDeviceList ? "chevron-up" : "chevron-down"} size={20} color="#999" />
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
                          <MaterialCommunityIcons name="check" size={16} color={Colors.primary} />
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
          </View>
        </Animated.View>

        <View style={styles.instructionRow}>
           <View style={styles.dot} />
           <Text style={styles.instructionText}>Select verification method.</Text>
        </View>

        {/* ── Submit Button ────────────────────────────────────────── */}
        <Animated.View style={{ transform: [{ scale: btnScale }], paddingHorizontal: 20 }}>
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
                  {authMethod === 'face' ? 'Start Face Recognition' : 'Capture Fingerprint'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>NPCI • RBI COMPLIANT • SECURE GATEWAY</Text>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

export default DailyLogin;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FAF3E1' // Beige Background from image
  },
  scroll: { 
    paddingBottom: 30 
  },

  headerSection: {
    alignItems: 'center',
    marginTop: 25,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  shieldCircle: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor: '#FFF',
      alignItems: 'center',
      justifyContent: 'center',
      elevation: 5,
      shadowColor: '#000',
      shadowOpacity: 0.1,
      shadowRadius: 5,
      shadowOffset: { width: 0, height: 2 },
      marginBottom: 15,
  },
  mainTitle: {
      fontSize: 24,
      fontWeight: '600',
      color: '#222',
  },
  mainSubtitle: {
      fontSize: 13,
      color: '#777',
      textAlign: 'center',
      marginTop: 4,
      maxWidth: '80%',
  },

  card: {
    backgroundColor: '#F9E7C4', // Card background
    marginHorizontal: 20,
    padding: 22,
    borderRadius: 35,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },

  label: {
    fontSize: 10,
    fontWeight: '700',
    color: '#888',
    marginTop: 15,
    marginBottom: 8,
    letterSpacing: 0.5,
  },

  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 18,
    paddingHorizontal: 15,
    height: 52,
  },
  input: {
    flex: 1,
    marginLeft: 10,
    color: '#111',
    fontSize: 14,
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
    marginLeft: 10,
  },

  // ── Auth tiles ────
  authRow: {
      flexDirection: 'row',
      gap: 15,
      marginTop: 25,
      marginBottom: 5,
  },
  authTile: {
      flex: 1,
      height: 100,
      backgroundColor: '#FFF',
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
  },
  authTileActive: {
      backgroundColor: '#1A1A2E', // Dark Blue
  },
  authTileText: {
      fontSize: 13,
      color: '#777',
      fontWeight: '600',
  },
  authTileTextActive: {
      color: '#FFF',
  },

  // ── Device picker ─────────
  picker: {
    justifyContent: 'space-between',
  },
  pickerPlaceholder: { color: '#AAA', fontSize: 13, flex: 1, marginLeft: 10 },
  pickerValue: { color: '#222', fontSize: 13, flex: 1, marginLeft: 10, fontWeight: '500' },

  // ── Dropdown ──────────────
  dropdown: {
    backgroundColor: '#FFF',
    borderRadius: 18,
    marginTop: 8,
    overflow: 'hidden',
    elevation: 4,
  },
  dropdownItem: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  dropdownItemActive: { backgroundColor: '#F9F9F9' },
  dropdownText: { color: '#333', fontSize: 13 },
  dropdownTextActive: { color: '#1A1A2E', fontWeight: '700' },

  // ── RD Status banner ──────
  rdBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingHorizontal: 5,
  },
  rdBannerText: { fontSize: 12, color: '#666' },
  installLink: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '700',
  },

  instructionRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 30,
      marginVertical: 15,
  },
  dot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: Colors.kyc_accent,
      marginRight: 10,
  },
  instructionText: {
      fontSize: 12,
      color: '#888',
      fontWeight: '500',
  },

  // ── Submit ────────────────
  submitBtn: {
    backgroundColor: '#1A1A2E',
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    elevation: 3,
  },
  submitBtnDisabled: { backgroundColor: '#444' },
  submitBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.2,
  },

  footer: {
      marginTop: 30,
      alignItems: 'center',
  },
  footerText: {
      fontSize: 10,
      color: '#AAA',
      letterSpacing: 1,
      fontWeight: '500',
  },
});
