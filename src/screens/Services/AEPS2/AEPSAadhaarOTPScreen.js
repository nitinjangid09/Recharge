/**
 * Screen: AEPSAadhaarOTPScreen
 * Route:  /aeps/aadhaar-otp
 *
 * Step 1 → Enter 12-digit Aadhaar → Send OTP
 * Step 2 → Enter 6-digit OTP → Verify
 *
 * Uses local state to toggle between the two sub-steps.
 */

import React, { useState, useRef } from 'react';
import { AlertService } from '../../../componets/Alerts/CustomAlert';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Animated,
  KeyboardAvoidingView,
  ScrollView,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../../constants/Colors';
import HeaderBar from '../../../componets/HeaderBar/HeaderBar';
import { generateAepsEkycOtp, verifyAepsEkycOtp } from '../../../api/AuthApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';

const { width: SW, height: SH } = Dimensions.get("window");
const scale = (n) => Math.round((SW / 375) * n);
const vscale = (n) => Math.round((SH / 812) * n);
const rs = (n, lo = n * 0.82, hi = n * 1.28) =>
  Math.min(Math.max(scale(n), lo), hi);

// WalletBar removed


// ─── OTP Box Row ──────────────────────────────────────────────────
const OTPBoxes = ({ value, length = 6 }) => (
  <View style={otpStyles.row}>
    {Array.from({ length }).map((_, i) => (
      <View key={i} style={[otpStyles.box, value[i] ? otpStyles.boxFilled : null]}>
        <Text style={otpStyles.digit}>{value[i] || ''}</Text>
      </View>
    ))}
  </View>
);

const otpStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: rs(8), justifyContent: 'center', marginBottom: rs(6) },
  box: {
    width: rs(44),
    height: rs(52),
    borderRadius: rs(13),
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: 'rgba(212,176,106,0.32)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    backgroundColor: '#fff',
  },
  digit: { fontSize: rs(20), fontWeight: '700', color: Colors.black },
});

// ─── Main Screen ──────────────────────────────────────────────────
export default function AEPSAadhaarOTPScreen({ navigation }) {
  const [aadhaar, setAadhaar] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1 = enter aadhaar, 2 = enter OTP
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Format aadhaar: XXXX XXXX XXXX
  const formatAadhaar = (raw) => {
    const clean = raw.replace(/\D/g, '').slice(0, 12);
    return clean.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
  };

  const handleAadhaarChange = (text) => {
    const clean = text.replace(/\s/g, '');
    if (clean.length <= 12) setAadhaar(formatAadhaar(clean));
  };

  const handleSendOTP = async () => {
    const clean = aadhaar.replace(/\s/g, '');
    if (clean.length === 0) {
      setError('Please fill Aadhaar number');
      return;
    }
    if (clean.length !== 12) {
      setError('Aadhaar must be 12 digits');
      return;
    }
    setError('');
    setLoading(true);

    try {
      // 1. Get Location (with requested static defaults)
      let latitude = "26.889811";
      let longitude = "75.738343";

      const getPos = () => new Promise((resolve) => {
        Geolocation.getCurrentPosition(
          p => resolve({
            lat: p.coords.latitude.toString(),
            lon: p.coords.longitude.toString()
          }),
          () => resolve(null), // Fallback if user denies or GPS is off
          { enableHighAccuracy: true, timeout: 8000 }
        );
      });

      const loc = await getPos();
      if (loc) {
        latitude = loc.lat;
        longitude = loc.lon;
      }

      // 2. Prepare Payload
      const hToken = await AsyncStorage.getItem("header_token");
      const clientRefId = `EKYC${Date.now()}${Math.floor(100000 + Math.random() * 900000)}`;

      const payload = {
        aadhaar: clean,
        latitude,
        longitude
      };

      // 3. Call API with Static Raw JSON
      const res = await generateAepsEkycOtp({
        data: payload,
        headerToken: hToken,
        idempotencyKey: clientRefId
      });

      if (res.success) {
        setLoading(false);
        // Response: {"success":true,"data":{"message":"OTP request has been sent"}}
        const successMsg = res?.data?.message || 'OTP has been sent to your registered mobile number';
        AlertService.showAlert({ type: 'success', title: 'OTP Sent', message: successMsg });
        Animated.timing(fadeAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
          setStep(2);
          Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start();
        });
      } else {
        setLoading(false);
        const displayMsg = typeof res.message === 'object' ? JSON.stringify(res.message) : (res.message || 'Unable to generate OTP');
        AlertService.showAlert({ type: 'error', title: 'OTP Failed', message: displayMsg });
      }
    } catch (err) {
      setLoading(false);
      const errMsg = typeof err?.message === 'object' ? JSON.stringify(err.message) : (err?.message || 'Something went wrong. Please try again.');
      AlertService.showAlert({ type: 'error', title: 'Error', message: errMsg });
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length === 0) {
      setError('Please enter OTP');
      return;
    }
    if (otp.length !== 6) {
      setError('OTP must be 6 digits');
      return;
    }
    setError('');
    setLoading(true);

    try {
      const hToken = await AsyncStorage.getItem("header_token");
      const clientRefId = `VFY${Date.now()}`;
      const payload = {
        aadhaar: aadhaar.replace(/\s/g, ''),
        otp: otp,
      };

      const res = await verifyAepsEkycOtp({
        data: payload,
        headerToken: hToken,
        idempotencyKey: clientRefId
      });

      setLoading(false);

      if (res.success) {
        AlertService.showAlert({ type: 'success', title: 'Verified', message: res.message || 'Verification successful' });
        // Navigate to Daily Login screen
        navigation.navigate('AEPSPortalAccess');
      } else {
        const failMsg = typeof res.message === 'object' ? JSON.stringify(res.message) : (res.message || 'OTP verification failed');
        AlertService.showAlert({ type: 'error', title: 'Verification Failed', message: failMsg });
      }
    } catch (err) {
      setLoading(false);
      const errMsg = typeof err?.message === 'object' ? JSON.stringify(err.message) : (err?.message || 'Error occurred');
      AlertService.showAlert({ type: 'error', title: 'Error', message: errMsg });
    }
  };

  const handleResend = () => {
    setOtp('');
    AlertService.showAlert({ type: 'success', title: 'OTP Sent', message: 'A new code has been sent to your mobile.' });
  };

  return (
    <SafeAreaView style={styles.safe}>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <HeaderBar
          title="Verification"
          onBack={() => step === 2 ? setStep(1) : navigation?.goBack()}
        />
        <ScrollView
          style={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: rs(16), paddingTop: rs(16), paddingBottom: rs(40) }}
        >

          <Animated.View style={[styles.card, { opacity: fadeAnim }]}>
            {/* ── Badge ── */}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>AEPS VERIFICATION</Text>
            </View>

            {/* ── Title ── */}
            <Text style={styles.cardTitle}>
              {step === 1 ? 'Aadhaar OTP\nVerification' : 'Enter Your\nOTP Code'}
            </Text>
            <Text style={styles.cardDesc}>
              {step === 1
                ? 'Start with your Aadhaar number. We will send a one-time code to your linked mobile so you can verify securely.'
                : `We sent a 6-digit code to the mobile number linked with Aadhaar ${aadhaar}. Enter it below.`}
            </Text>

            {/* ── Step 1: Aadhaar Input ── */}
            {step === 1 && (
              <>
                <Text style={styles.fieldLabel}>AADHAAR NUMBER</Text>
                <View style={styles.aadhaarField}>
                  <TextInput
                    style={styles.aadhaarInput}
                    value={aadhaar}
                    onChangeText={handleAadhaarChange}
                    placeholder="Enter 12-digit Aadhaar"
                    placeholderTextColor={Colors.text_placeholder}
                    keyboardType="numeric"
                    maxLength={14}
                  />
                </View>
                {(step === 1 && error) ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity
                  onPress={handleSendOTP}
                  activeOpacity={0.8}
                  style={[
                    styles.sendBtn,
                    aadhaar.replace(/\s/g, '').length < 12 && styles.sendBtnDisabled,
                  ]}
                >
                  <Text style={[styles.sendBtnText, aadhaar.replace(/\s/g, '').length < 12 && { color: Colors.black }]}>
                    {loading ? 'Sending...' : 'Send OTP'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── Step 2: OTP Input ── */}
            {step === 2 && (
              <>
                <Text style={styles.fieldLabel}>ENTER 6-DIGIT OTP</Text>

                {/* Invisible full-width TextInput behind boxes for focus */}
                <View style={{ position: 'relative', marginBottom: rs(24) }}>
                  <OTPBoxes value={otp} length={6} />
                  <TextInput
                    style={styles.hiddenInput}
                    value={otp}
                    onChangeText={(t) => setOtp(t.replace(/\D/g, '').slice(0, 6))}
                    keyboardType="numeric"
                    maxLength={6}
                    autoFocus
                  />
                </View>
                {(step === 2 && error) ? <Text style={styles.errorText}>{error}</Text> : null}

                <TouchableOpacity
                  onPress={handleVerifyOTP}
                  activeOpacity={0.8}
                  style={[styles.sendBtn, otp.length < 6 && styles.sendBtnDisabled]}
                >
                  <Text style={[styles.sendBtnText, otp.length < 6 && { color: Colors.black }]}>Verify OTP</Text>
                </TouchableOpacity>

                <View style={styles.resendRow}>
                  <Text style={styles.resendHint}>Didn't receive the code?  </Text>
                  <TouchableOpacity onPress={handleResend}>
                    <Text style={styles.resendLink}>Resend OTP</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity onPress={() => setStep(1)} style={{ marginTop: 4 }}>
                  <Text style={styles.changeAadhaar}>← Change Aadhaar number</Text>
                </TouchableOpacity>
              </>
            )}

            {/* ── Help Box ── */}
            <View style={styles.helpBox}>
              <Text style={styles.helpTitle}>Need help?</Text>
              <Text style={styles.helpText}>
                {step === 1
                  ? 'Enter your Aadhaar number first, then tap Send OTP. The OTP field appears only after the code is sent.'
                  : 'OTP is valid for 10 minutes. Check the mobile number linked to your Aadhaar for the code.'}
              </Text>
            </View>
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView >
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { paddingHorizontal: rs(16), paddingBottom: rs(40) },

  card: {
    backgroundColor: Colors.homebg,
    borderRadius: rs(24),
    padding: rs(24),
    marginTop: rs(8),
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: rs(4) }, shadowOpacity: 0.07, shadowRadius: rs(16) },
      android: { elevation: 3 },
    }),
  },

  badge: {
    backgroundColor: Colors.input_bg,
    borderRadius: rs(20),
    paddingHorizontal: rs(12),
    paddingVertical: rs(5),
    alignSelf: 'flex-start',
    marginBottom: rs(12),
  },
  badgeText: {
    fontSize: rs(10),
    fontWeight: '800',
    color: Colors.kyc_accent,
    letterSpacing: 1,
  },

  cardTitle: {
    fontSize: rs(24),
    fontWeight: '800',
    color: Colors.black,
    letterSpacing: -0.6,
    lineHeight: rs(30),
    marginBottom: rs(10),
  },
  cardDesc: {
    fontSize: rs(13),
    color: Colors.text_secondary,
    lineHeight: rs(20),
    marginBottom: rs(22),
  },

  fieldLabel: {
    fontSize: rs(10),
    fontWeight: '700',
    color: Colors.text_secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: rs(6),
  },

  aadhaarField: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: rs(14),
    borderWidth: 0.5,
    borderColor: 'rgba(212,176,106,0.32)',
    paddingHorizontal: rs(14),
    paddingVertical: rs(13),
    gap: rs(10),
    marginBottom: rs(16),
  },
  fieldIcon: { fontSize: rs(16) },
  aadhaarInput: { flex: 1, fontSize: rs(17), fontWeight: '600', color: Colors.black, letterSpacing: rs(2), padding: 0 },

  sendBtn: {
    backgroundColor: Colors.primary,
    borderRadius: rs(16),
    paddingVertical: rs(15),
    alignItems: 'center',
    marginBottom: rs(16),
  },
  sendBtnDisabled: { backgroundColor: Colors.gray_F0 },
  sendBtnText: { fontSize: rs(15), fontWeight: '700', color: Colors.white, letterSpacing: 0.5 },

  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  resendRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: rs(6), marginBottom: rs(4) },
  resendHint: { fontSize: rs(12), color: Colors.text_secondary },
  resendLink: { fontSize: rs(12), fontWeight: '700', color: Colors.black, textDecorationLine: 'underline' },
  changeAadhaar: { fontSize: rs(12), color: Colors.text_secondary, textAlign: 'center', marginBottom: rs(16) },

  helpBox: {
    backgroundColor: Colors.white,
    borderRadius: rs(14),
    padding: rs(14),
    marginTop: rs(4),
    borderWidth: 0.5,
    borderColor: 'rgba(212,176,106,0.2)',
  },
  errorText: {
    fontSize: rs(10),
    color: '#ef4444',
    marginTop: -rs(10),
    marginBottom: rs(10),
    fontWeight: '600',
    marginLeft: rs(4)
  },
  helpTitle: { fontSize: rs(13), fontWeight: '700', color: Colors.black, marginBottom: rs(4) },
  helpText: { fontSize: rs(12), color: Colors.text_secondary, lineHeight: rs(18) },
});
