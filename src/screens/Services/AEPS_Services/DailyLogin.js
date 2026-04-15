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
      <HeaderBar
        title="NPCI Daily Login"
        onBack={() => NavigationService.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Animated.View
          style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}
        >
          <View style={styles.card}>

            {/* ── Aadhaar ─────────────────────────────────────────────── */}
            <Text style={styles.label}>Aadhaar Number</Text>
            <TextInput
              style={[styles.input, errors.aadhaar && styles.inputError]}
              placeholder="Enter 12-digit Aadhaar"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              maxLength={12}
              value={aadhaarNumber}
              onChangeText={(v) => {
                setAadhaarNumber(v);
                if (errors.aadhaar) setErrors((p) => ({ ...p, aadhaar: null }));
              }}
            />
            {errors.aadhaar ? <Text style={styles.error}>{errors.aadhaar}</Text> : null}

            {/* ── Mobile ──────────────────────────────────────────────── */}
            <Text style={styles.label}>Mobile Number</Text>
            <TextInput
              style={[styles.input, errors.mobile && styles.inputError]}
              placeholder="Enter 10-digit mobile number"
              placeholderTextColor="#9CA3AF"
              keyboardType="numeric"
              maxLength={10}
              value={mobileNumber}
              onChangeText={(v) => {
                setMobileNumber(v);
                if (errors.mobile) setErrors((p) => ({ ...p, mobile: null }));
              }}
            />
            {errors.mobile ? <Text style={styles.error}>{errors.mobile}</Text> : null}

            {/* ── Auth Method ──────────────────────────────────────────── */}
            <Text style={styles.label}>Verification Method</Text>
            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.methodBtn, authMethod === 'finger' && styles.methodActive]}
                onPress={() => selectAuthMethod('finger')}
              >
                <Text style={[styles.methodBtnText, authMethod === 'finger' && styles.methodActiveText]}>
                  🖐  Fingerprint
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodBtn, authMethod === 'face' && styles.methodActive]}
                onPress={() => selectAuthMethod('face')}
              >
                <Text style={[styles.methodBtnText, authMethod === 'face' && styles.methodActiveText]}>
                  🤳  Face Auth
                </Text>
              </TouchableOpacity>
            </View>
            {errors.method ? <Text style={styles.error}>{errors.method}</Text> : null}

            {/* ── Device Picker (fingerprint only) ────────────────────── */}
            {authMethod === 'finger' && (
              <>
                <Text style={styles.label}>Biometric Device</Text>

                <TouchableOpacity
                  style={[styles.input, styles.picker, errors.device && styles.inputError]}
                  onPress={() => setShowDeviceList((v) => !v)}
                  activeOpacity={0.7}
                >
                  <Text style={selectedDeviceLabel ? styles.pickerValue : styles.pickerPlaceholder}>
                    {selectedDeviceLabel ?? 'Select biometric device'}
                  </Text>
                  <Text style={styles.pickerArrow}>{showDeviceList ? '▲' : '▼'}</Text>
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
                          <Text style={styles.dropdownCheck}>✓</Text>
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
              </>
            )}

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
                  <Text style={styles.submitBtnText}>
                    {authMethod === 'face' ? 'Start Face Authentication' : 'Capture Fingerprint'}
                  </Text>
                )}
              </TouchableOpacity>
            </Animated.View>

          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DailyLogin;

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F0F4F8' },
  scroll: { padding: 20 },

  card: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },

  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginTop: 12,
    marginBottom: 5,
  },

  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    padding: 13,
    borderRadius: 9,
    backgroundColor: '#FAFAFA',
    color: '#111',
    fontSize: 14,
    marginBottom: 2,
  },

  inputError: {
    borderColor: '#EF4444',
  },

  error: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 4,
    marginTop: 2,
  },

  // ── Auth method toggle ────
  row: { flexDirection: 'row', gap: 10, marginBottom: 4 },

  methodBtn: {
    flex: 1,
    paddingVertical: 13,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  methodActive: {
    backgroundColor: '#22C55E',
    borderColor: '#16A34A',
  },
  methodBtnText: {
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 14,
  },
  methodActiveText: {
    color: '#fff',
  },

  // ── Device picker ─────────
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerPlaceholder: { color: '#9CA3AF', fontSize: 14 },
  pickerValue: { color: '#111', fontSize: 14 },
  pickerArrow: { color: '#6B7280', fontSize: 12 },

  // ── Dropdown ──────────────
  dropdown: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 9,
    overflow: 'hidden',
    marginTop: 4,
    marginBottom: 6,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 4,
  },
  dropdownItem: {
    paddingVertical: 13,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  dropdownItemActive: { backgroundColor: '#F0FDF4' },
  dropdownText: { color: '#374151', fontSize: 14 },
  dropdownTextActive: { color: '#16A34A', fontWeight: '600' },
  dropdownCheck: { color: '#16A34A', fontWeight: '700', fontSize: 15 },

  // ── RD Status banner ──────
  rdBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    padding: 11,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  rdChecking: { backgroundColor: '#F3F4F6' },
  rdInstalled: { backgroundColor: '#DCFCE7' },
  rdMissing: { backgroundColor: '#FEF9C3' },

  rdBannerText: { fontSize: 13, color: '#374151', flexShrink: 1 },
  installLink: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '700',
    marginTop: 3,
  },

  // ── Submit ────────────────
  submitBtn: {
    backgroundColor: '#2563EB',
    padding: 16,
    alignItems: 'center',
    borderRadius: 10,
    marginTop: 22,
  },
  submitBtnDisabled: { backgroundColor: '#93C5FD' },
  submitBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 0.3,
  },
});
