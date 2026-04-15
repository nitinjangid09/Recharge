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
  StatusBar,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import Geolocation from '@react-native-community/geolocation';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import RDService, { RD_ERROR_CODES } from './RDService'; // ← adjust path as needed
import { aepsDailyLogin } from '../../../api/AuthApi';
import { AlertService } from '../../../componets/Alerts/CustomAlert';
import * as NavigationService from '../../../utils/NavigationService';
import HeaderBar from '../../../componets/HeaderBar/HeaderBar';
import { fadeIn, slideUp, buttonPress } from '../../../utils/ScreenAnimations';

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
      <StatusBar barStyle="light-content" backgroundColor="#121631" />
      
      {/* ── Custom Header ── */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backBtn}
          onPress={() => NavigationService.goBack()}
        >
          <Icon name="chevron-left" size={28} color="#121631" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>NPCI Daily Login</Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }], alignItems: 'center' }}
        >
          {/* ── Shield Icon ── */}
          <View style={styles.shieldWrapper}>
            <View style={styles.shieldCircle}>
              <Icon name="shield-lock" size={40} color="#D4A14C" />
            </View>
          </View>

          <Text style={styles.merchantTitle}>Merchant Login</Text>
          <Text style={styles.merchantSub}>Mandatory identity verification for today's transactions</Text>

          <View style={styles.goldCard}>
            {/* ── Aadhaar ─────────────────────────────────────────────── */}
            <Text style={styles.cardLabel}>AADHAAR NUMBER</Text>
            <View style={[styles.inputGroup, errors.aadhaar && styles.inputGroupError]}>
              <Icon name="face-recognition" size={22} color="#D4A14C" style={styles.inputIcon} />
              <TextInput
                style={styles.inputField}
                placeholder="12 Digit Aadhaar Number"
                placeholderTextColor="#9CA3AF"
                keyboardType="numeric"
                maxLength={12}
                value={aadhaarNumber}
                onChangeText={(v) => {
                  setAadhaarNumber(v);
                  if (errors.aadhaar) setErrors((p) => ({ ...p, aadhaar: null }));
                }}
              />
            </View>
            {errors.aadhaar ? <Text style={styles.errorText}>{errors.aadhaar}</Text> : null}

            {/* ── Mobile ──────────────────────────────────────────────── */}
            <View style={{ marginTop: 20 }}>
              <Text style={styles.cardLabel}>MOBILE NUMBER</Text>
              <View style={[styles.inputGroup, errors.mobile && styles.inputGroupError]}>
                <Icon name="phone" size={22} color="#D4A14C" style={styles.inputIcon} />
                <TextInput
                  style={styles.inputField}
                  placeholder="10 Digit Mobile Number"
                  placeholderTextColor="#9CA3AF"
                  keyboardType="numeric"
                  maxLength={10}
                  value={mobileNumber}
                  onChangeText={(v) => {
                    setMobileNumber(v);
                    if (errors.mobile) setErrors((p) => ({ ...p, mobile: null }));
                  }}
                />
              </View>
              {errors.mobile ? <Text style={styles.errorText}>{errors.mobile}</Text> : null}
            </View>

            {/* ── Method Selection ────────────────────────────────────── */}
            <View style={styles.methodRow}>
              <TouchableOpacity
                style={[styles.methodCard, authMethod === 'finger' && styles.methodCardActive]}
                onPress={() => selectAuthMethod('finger')}
              >
                <Icon name="fingerprint" size={32} color={authMethod === 'finger' ? '#D4A14C' : '#6B7280'} />
                <Text style={[styles.methodText, authMethod === 'finger' && styles.methodTextActive]}>Fingerprint</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodCard, authMethod === 'face' && styles.methodCardActive]}
                onPress={() => selectAuthMethod('face')}
              >
                <Icon name="face-recognition" size={32} color={authMethod === 'face' ? '#D4A14C' : '#6B7280'} />
                <Text style={[styles.methodText, authMethod === 'face' && styles.methodTextActive]}>Face Search</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Help text ── */}
          <View style={styles.helpRow}>
            <View style={styles.helpDot} />
            <Text style={styles.helpText}>Select verification method.</Text>
          </View>

          {/* ────── RD Device Picker (if fingerprint) ────── */}
          {authMethod === 'finger' && (
             <View style={{ width: '100%', marginTop: 10 }}>
                <TouchableOpacity
                  style={[styles.devicePicker, errors.device && styles.inputGroupError]}
                  onPress={() => setShowDeviceList(!showDeviceList)}
                >
                  <Text style={device ? styles.deviceValue : styles.devicePlaceholder}>
                    {selectedDeviceLabel ?? 'Select Biometric Device'}
                  </Text>
                  <Icon name={showDeviceList ? "chevron-up" : "chevron-down"} size={20} color="#6B7280" />
                </TouchableOpacity>

                {showDeviceList && (
                  <View style={styles.deviceList}>
                    {DEVICE_LIST.map((d) => (
                      <TouchableOpacity
                        key={d.value}
                        style={styles.deviceItem}
                        onPress={() => selectDevice(d.value)}
                      >
                        <Text style={styles.deviceItemText}>{d.label}</Text>
                        {device === d.value && <Icon name="check" size={18} color="#D4A14C" />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                <RDStatusBanner />
             </View>
          )}

          {/* ── Submit Button ── */}
          <Animated.View style={{ transform: [{ scale: btnScale }], width: '100%', marginTop: 30 }}>
            <TouchableOpacity
              style={[styles.captureBtn, isSubmitDisabled && styles.captureBtnDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitDisabled}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <View style={styles.captureBtnIn}>
                  <Icon name={authMethod === 'face' ? "face-recognition" : "fingerprint"} size={22} color="#fff" style={{marginRight: 10}} />
                  <Text style={styles.captureBtnText}>
                    {authMethod === 'face' ? 'Capture Face Search' : 'Capture Fingerprint'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.footerText}>NPCI • RBI COMPLIANT • SECURE GATEWAY</Text>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DailyLogin;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAF6ED' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },

  // ── Custom Header ──
  header: {
    height: 60,
    backgroundColor: '#121631',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: 25,
    borderBottomRightRadius: 25,
  },
  backBtn: {
    position: 'absolute',
    left: 15,
    backgroundColor: '#fff',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },

  // ── Top Section ──
  shieldWrapper: {
    marginTop: 30,
    marginBottom: 20,
  },
  shieldCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  merchantTitle: {
    fontSize: 26,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 5,
  },
  merchantSub: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
    marginBottom: 30,
  },

  // ── Gold Card ──
  goldCard: {
    backgroundColor: '#F6E9CF',
    width: '100%',
    borderRadius: 35,
    padding: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    letterSpacing: 1,
    marginBottom: 8,
    marginLeft: 5,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 55,
  },
  inputGroupError: {
    borderWidth: 1,
    borderColor: '#EF4444',
  },
  inputIcon: {
    marginRight: 10,
  },
  inputField: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '400',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 11,
    marginTop: 4,
    marginLeft: 5,
  },

  // ── Method Row ──
  methodRow: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 25,
  },
  methodCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  methodCardActive: {
    borderColor: '#D4A14C',
    backgroundColor: '#FFFBF2',
  },
  methodText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  methodTextActive: {
    color: '#1F2937',
  },

  // ── Help ──
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 15,
    marginLeft: 10,
  },
  helpDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D4A14C',
    marginRight: 8,
  },
  helpText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '400',
  },

  // ── Device Picker ──
  devicePicker: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 50,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  devicePlaceholder: { color: '#9CA3AF', fontSize: 14 },
  deviceValue: { color: '#1F2937', fontSize: 14, fontWeight: '400' },

  deviceList: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginTop: 5,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    elevation: 3,
  },
  deviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  deviceItemText: { fontSize: 14, color: '#374151', fontWeight: '500' },

  // ── RD Banner ──
  rdBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
    marginTop: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  rdChecking: { backgroundColor: '#F9FAFB' },
  rdInstalled: { backgroundColor: '#F0FDF4', borderColor: '#BBF7D0' },
  rdMissing: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  rdBannerText: { fontSize: 12, color: '#374151', flex: 1 },
  installLink: { color: '#2563EB', fontWeight: '500', fontSize: 12, marginLeft: 5 },

  // ── Capture Button ──
  captureBtn: {
    backgroundColor: '#121631',
    borderRadius: 20,
    height: 65,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  captureBtnIn: { flexDirection: 'row', alignItems: 'center' },
  captureBtnDisabled: { backgroundColor: '#9CA3AF' },
  captureBtnText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: 0.5,
  },

  footerText: {
    marginTop: 40,
    fontSize: 11,
    fontWeight: '400',
    color: '#9CA3AF',
    letterSpacing: 1,
  },
});
