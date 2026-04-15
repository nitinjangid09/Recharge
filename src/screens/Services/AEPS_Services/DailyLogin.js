/**
 * DailyLogin.js
 *
 * AEPS NPCI Daily Login screen
 * Supports: Fingerprint (Mantra MFS100/MFS110, Morpho, Startek, SecuGen) + Face auth
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
  StatusBar,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';

import RDService, { RD_ERROR_CODES } from './RDService';
import { aepsDailyLogin } from '../../../api/AuthApi';
import { AlertService } from '../../../componets/Alerts/CustomAlert';
import * as NavigationService from '../../../utils/NavigationService';
import HeaderBar from '../../../componets/HeaderBar/HeaderBar';
import { fadeIn, slideUp, buttonPress } from '../../../utils/ScreenAnimations';
import Colors from '../../../constants/Colors';
import Fonts from '../../../constants/Fonts';

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

// ─── Constants for Premium UI ────────────────────────────────────────────────
const GOLD = "#D4A843";
const GOLD_DIM = "rgba(212,168,67,0.15)";
const WHITE = "#FFFFFF";
const WHITE_30 = "rgba(255,255,255,0.30)";
const WHITE_10 = "rgba(255,255,255,0.10)";

const DailyLogin = () => {
  // ── Form state ───────────────────────────────────────────────────────────
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [authMethod, setAuthMethod] = useState('finger'); // Default to finger
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
        mobile: mobileNumber,
        latitude: coords.latitude,
        longitude: coords.longitude,
        captureType: 'finger',
        biometricData: pidData,
        deviceType: device, // Pass device type for backend identification
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
      let message = 'Fingerprint capture failed. Please try again.';
      switch (err?.code) {
        case RD_ERROR_CODES.NOT_INSTALLED:
          message = `RD Service app is not installed for ${RDService.getDeviceLabel(device)}.`;
          break;
        case RD_ERROR_CODES.CANCELLED:
          message = 'Fingerprint capture was cancelled.';
          break;
        case RD_ERROR_CODES.NO_PID:
          message = 'No fingerprint data received. Please try again.';
          break;
        case RD_ERROR_CODES.ACTIVITY_NOT_FOUND:
          message = 'Could not open RD Service. Ensure the device is connected.';
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
        mobile: mobileNumber,
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
        <View style={[styles.rdBanner, styles.rdChecking]}>
          <ActivityIndicator size="small" color="#555" />
          <Text style={styles.rdBannerText}>  Checking RD Service…</Text>
        </View>
      );
    }

    if (rdStatus === STATUS.INSTALLED) {
      return (
        <View style={[styles.rdBanner, styles.rdInstalled]}>
          <Icon name="check-circle" size={16} color="#16A34A" />
          <Text style={styles.rdBannerText}>
            {'  '}{RDService.getDeviceLabel(device)} RD Service is ready
          </Text>
        </View>
      );
    }

    if (rdStatus === STATUS.NOT_INSTALLED) {
      return (
        <View style={[styles.rdBanner, styles.rdMissing]}>
          <Icon name="alert-circle" size={16} color="#DC2626" />
          <Text style={styles.rdBannerText}>
            {'  '}RD Service not found for {RDService.getDeviceLabel(device)}
          </Text>
          <TouchableOpacity onPress={() => RDService.openInstallPage(device)}>
            <Text style={styles.installLink}>Install Now →</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return null;
  };

  const isSubmitDisabled =
    loading ||
    (authMethod === 'finger' &&
      (!device ||
        rdStatus === STATUS.NOT_INSTALLED ||
        rdStatus === STATUS.CHECKING));

  const selectedDeviceLabel = device ? RDService.getDeviceLabel(device) : null;

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#0D0C1A" />
      <HeaderBar
        title="NPCI Daily Login"
        onBack={() => NavigationService.goBack()}
        dark
      />
      <LinearGradient colors={['#0D0C1A', '#13111E', '#0A0919']} style={StyleSheet.absoluteFill} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
          
          <View style={styles.header}>
             <Icon name="fingerprint" size={48 * S} color={GOLD} />
             <Text style={styles.headerTitle}>Two-Factor Authentication</Text>
             <Text style={styles.headerSubtitle}>Authenticate with NPCI to start your day</Text>
          </View>

          <View style={styles.card}>
            {/* Aadhaar Input */}
            <View style={styles.fieldWrap}>
                <Text style={styles.label}>AADHAAR NUMBER</Text>
                <View style={[styles.inputBox, errors.aadhaar && styles.inputBoxError]}>
                    <Icon name="card-account-details-outline" size={20} color={GOLD} style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="12-digit Aadhaar"
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        keyboardType="numeric"
                        maxLength={12}
                        value={aadhaarNumber}
                        onChangeText={(v) => {
                            setAadhaarNumber(v);
                            if (errors.aadhaar) setErrors((p) => ({ ...p, aadhaar: null }));
                        }}
                    />
                    {aadhaarNumber.length === 12 && <Icon name="check-circle" size={18} color="#22C55E" />}
                </View>
                {errors.aadhaar ? <Text style={styles.errorText}>{errors.aadhaar}</Text> : null}
            </View>

            {/* Mobile Number */}
            <View style={styles.fieldWrap}>
                <Text style={styles.label}>MOBILE NUMBER</Text>
                <View style={[styles.inputBox, errors.mobile && styles.inputBoxError]}>
                    <Icon name="phone-outline" size={20} color={GOLD} style={styles.inputIcon} />
                    <TextInput
                        style={styles.input}
                        placeholder="10-digit Mobile"
                        placeholderTextColor="rgba(255,255,255,0.2)"
                        keyboardType="numeric"
                        maxLength={10}
                        value={mobileNumber}
                        onChangeText={(v) => {
                            setMobileNumber(v);
                            if (errors.mobile) setErrors((p) => ({ ...p, mobile: null }));
                        }}
                    />
                    {mobileNumber.length === 10 && <Icon name="check-circle" size={18} color="#22C55E" />}
                </View>
                {errors.mobile ? <Text style={styles.errorText}>{errors.mobile}</Text> : null}
            </View>

            {/* Auth Method Toggle */}
            <Text style={styles.label}>VERIFICATION METHOD</Text>
            <View style={styles.methodRow}>
              <TouchableOpacity
                style={[styles.methodBtn, authMethod === 'finger' && styles.methodActive]}
                onPress={() => selectAuthMethod('finger')}
              >
                <Icon name="fingerprint" size={18} color={authMethod === 'finger' ? WHITE : WHITE_30} />
                <Text style={[styles.methodBtnText, authMethod === 'finger' && styles.methodActiveText]}>Fingerprint</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodBtn, authMethod === 'face' && styles.methodActive]}
                onPress={() => selectAuthMethod('face')}
              >
                <Icon name="face-recognition" size={18} color={authMethod === 'face' ? WHITE : WHITE_30} />
                <Text style={[styles.methodBtnText, authMethod === 'face' && styles.methodActiveText]}>Face Auth</Text>
              </TouchableOpacity>
            </View>

            {/* Device Picker */}
            {authMethod === 'finger' && (
              <View style={styles.fieldWrap}>
                <Text style={styles.label}>BIOMETRIC DEVICE</Text>
                <TouchableOpacity
                  style={[styles.inputBox, errors.device && styles.inputBoxError]}
                  onPress={() => setShowDeviceList((v) => !v)}
                  activeOpacity={0.7}
                >
                  <Icon name="usb-port" size={20} color={GOLD} style={styles.inputIcon} />
                  <Text style={selectedDeviceLabel ? styles.pickerValue : styles.pickerPlaceholder}>
                    {selectedDeviceLabel ?? 'Select device'}
                  </Text>
                  <Icon name={showDeviceList ? 'chevron-up' : 'chevron-down'} size={20} color={WHITE_30} />
                </TouchableOpacity>

                {showDeviceList && (
                  <View style={styles.dropdown}>
                    {DEVICE_LIST.map((d) => (
                      <TouchableOpacity
                        key={d.value}
                        style={[styles.dropdownItem, device === d.value && styles.dropdownItemActive]}
                        onPress={() => selectDevice(d.value)}
                      >
                        <Text style={[styles.dropdownText, device === d.value && styles.dropdownTextActive]}>
                          {d.label}
                        </Text>
                        {device === d.value && <Icon name="check" size={18} color={GOLD} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                
                <RDStatusBanner />
                {errors.device ? <Text style={styles.errorText}>{errors.device}</Text> : null}
              </View>
            )}

            {/* Submit */}
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                style={[styles.submitBtn, isSubmitDisabled && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitDisabled}
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator color={WHITE} /> : (
                  <>
                    <Icon name={authMethod === 'face' ? 'camera-account' : 'fingerprint'} size={22} color={WHITE} style={{marginRight: 10}} />
                    <Text style={styles.submitBtnText}>
                        {authMethod === 'face' ? 'Start Face Auth' : 'Authenticate Finger'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>

          </View>

          <View style={styles.footer}>
             <Icon name="shield-check" size={14} color={WHITE_30} />
             <Text style={styles.footerText}>NPCI CERTIFIED · ENCRYPTED CONNECTION</Text>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DailyLogin;

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  header: { alignItems: 'center', marginTop: 10 * S, marginBottom: 24 * S },
  headerTitle: { fontSize: 22 * S, fontFamily: Fonts.Bold, color: WHITE, marginTop: 12 },
  headerSubtitle: { fontSize: 13, fontFamily: Fonts.Medium, color: WHITE_30, marginTop: 4 },

  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 24,
    padding: 20 * S,
    borderWidth: 1,
    borderColor: WHITE_10,
  },

  fieldWrap: { marginBottom: 18 * S },
  label: { fontSize: 11, fontFamily: Fonts.Bold, color: GOLD, marginBottom: 8, letterSpacing: 1 },
  
  inputBox: {
    height: 56 * S,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: WHITE_10,
  },
  inputBoxError: { borderColor: '#EF4444' },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 15, color: WHITE, fontFamily: Fonts.Medium },
  
  errorText: { color: '#EF4444', fontSize: 12, marginTop: 5, marginLeft: 4 },

  methodRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  methodBtn: {
    flex: 1,
    height: 48 * S,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: WHITE_10,
  },
  methodActive: { backgroundColor: GOLD, borderColor: GOLD },
  methodBtnText: { color: WHITE_30, fontSize: 13, fontFamily: Fonts.Bold },
  methodActiveText: { color: WHITE },

  pickerPlaceholder: { color: 'rgba(255,255,255,0.2)', flex: 1, fontSize: 15 },
  pickerValue: { color: WHITE, flex: 1, fontSize: 15 },

  dropdown: {
    marginTop: 8,
    backgroundColor: '#1A182E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: WHITE_10,
    overflow: 'hidden',
    elevation: 10,
  },
  dropdownItem: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: WHITE_10,
  },
  dropdownItemActive: { backgroundColor: 'rgba(212,168,67,0.1)' },
  dropdownText: { color: WHITE_30, fontSize: 14, fontFamily: Fonts.Medium },
  dropdownTextActive: { color: GOLD, fontFamily: Fonts.Bold },

  rdBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    marginTop: 12,
  },
  rdBannerText: { fontSize: 12, color: WHITE_30, fontFamily: Fonts.Medium, flex: 1 },
  rdChecking: {},
  rdInstalled: { backgroundColor: 'rgba(34,197,94,0.1)' },
  rdMissing: { backgroundColor: 'rgba(239,68,68,0.1)' },
  installLink: { color: '#EF4444', fontFamily: Fonts.Bold, fontSize: 12 },

  submitBtn: {
    height: 58 * S,
    borderRadius: 18,
    backgroundColor: GOLD,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10 * S,
    elevation: 8,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: { color: WHITE, fontSize: 16, fontFamily: Fonts.Bold, letterSpacing: 0.5 },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 * S },
  footerText: { fontSize: 10, fontFamily: Fonts.Bold, color: WHITE_30, letterSpacing: 1 },
});
