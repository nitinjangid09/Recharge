import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Modal,
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Colors from "../../../constants/Colors";
import Fonts from "../../../constants/Fonts";
import { fadeIn, slideUp, buttonPress } from "../../../utils/ScreenAnimations";
import CustomAlert from "../../../componets/Alerts/CustomAlert";
import { 
  fetchDmtCustomer, 
  registerDmtCustomer, 
  dmtCustomerEkyc, 
  generateDmtRegOtp 
} from "../../../api/AuthApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

// ─── Responsive Scaling ───────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get("window");
const BASE_W = 390;
const BASE_H = 844;
const scale = (s) => Math.round((SW / BASE_W) * s);
const vs = (s) => Math.round((SH / BASE_H) * s);
const rs = (s) => Math.round(Math.sqrt((SW * SH) / (BASE_W * BASE_H)) * s);

// ─── Format Aadhaar: "XXXXXXXXXXXX" → "XXXX XXXX XXXX" ───────────────────────
const formatAadhaar = (raw) => {
  const d = raw.replace(/\D/g, "").slice(0, 12);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
};

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
const DmtLogin = () => {
  const navigation = useNavigation();

  const [mobileNumber, setMobileNumber] = useState("");
  const [aadhaarRaw, setAadhaarRaw] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [otpVisible, setOtpVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [error, setError] = useState("");
  
  // Static context as requested
  const appCtx = {
    latitude: "26.8881633",
    longitude: "75.7362708",
    publicIp: "122.176.4.14"
  };

  // Alert
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ type: "", title: "", message: "" });
  const showAlert = (type, title, message) => {
    setAlertData({ type, title, message });
    setAlertVisible(true);
  };

  // Animations
  const headerOp = useRef(new Animated.Value(0)).current;
  const headerTY = useRef(new Animated.Value(vs(30))).current;
  const formOp = useRef(new Animated.Value(0)).current;
  const formTY = useRef(new Animated.Value(vs(24))).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const otpScale = useRef(new Animated.Value(0.85)).current;
  const otpOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([fadeIn(headerOp, 500), slideUp(headerTY, 500)]).start();
    setTimeout(() => {
      Animated.parallel([fadeIn(formOp, 500), slideUp(formTY, 500)]).start();
    }, 180);
  }, []);

  useEffect(() => {
    formOp.setValue(0);
    formTY.setValue(vs(20));
    setError("");
    Animated.parallel([fadeIn(formOp, 350), slideUp(formTY, 350)]).start();
  }, [step]);

  useEffect(() => {
    if (otpVisible) {
      otpScale.setValue(0.85);
      otpOpacity.setValue(0);
      setOtpError("");
      Animated.parallel([
        Animated.spring(otpScale, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
        Animated.timing(otpOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [otpVisible]);

  // Handlers
  const handleMobileSubmit = async () => {
    const mobileRegex = /^[6-9][0-9]{9}$/;
    if (!mobileRegex.test(mobileNumber)) {
      setError("Please enter a valid 10-digit mobile number starting with 6-9");
      return;
    }
    setError("");
    
    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem("header_token");
      const res = await fetchDmtCustomer({
        data: {
          mobileNumber,
          ...appCtx
        },
        headerToken: token,
        idempotencyKey: `DMT_LOOKUP_${mobileNumber}_${Date.now()}`
      });

      if (res.success || res.status === "SUCCESS") {
        // Customer is registered, navigate to Home
        const customerName = res.data?.CustomerName || "";
        await AsyncStorage.setItem("sender_mobile", mobileNumber);
        await AsyncStorage.setItem("sender_name", customerName);
        navigation.replace("DmtHome", { mobileNumber, customerName });
      } else if (res.message?.toLowerCase().includes("not registered")) {
        // Not registered, show Aadhaar field (Step 2)
        setStep(2);
      } else {
        setError(res.message || "Customer lookup failed");
      }
    } catch (err) {
      console.log("DMT lookup error:", err);
      setError("Unable to reach server. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAadhaarSubmit = async () => {
    if (aadhaarRaw.length !== 12) {
      setError("Please enter a valid 12-digit Aadhaar number");
      return;
    }
    setError("");
    setIsLoading(true);

    try {
      const token = await AsyncStorage.getItem("header_token");
      // Use the provided eKYC logic and PID data
      const res = await dmtCustomerEkyc({
        data: {
          mobileNumber,
          aadhaarNumber: aadhaarRaw,
          pidData: "<?xml version=\"1.0\"?><PidData>...</PidData>" // Use provided XML context
        },
        headerToken: token,
        idempotencyKey: `DMT_EKYC_${mobileNumber}_${Date.now()}`
      });

      if (res.success || res.status === "SUCCESS") {
        // After eKYC, generate registration OTP
        const otpRes = await generateDmtRegOtp({
          data: { mobileNumber },
          headerToken: token,
          idempotencyKey: `DMT_GEN_OTP_${mobileNumber}_${Date.now()}`
        });

        if (otpRes.success) {
          setOtp("");
          setOtpVisible(true);
        } else {
          setError(otpRes.message || "Failed to generate OTP after eKYC");
        }
      } else {
        setError(res.message || "eKYC Verification failed");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpVerify = async () => {
    if (otp.length !== 6) {
      setOtpError("Please enter a valid 6-digit OTP");
      return;
    }
    setOtpError("");
    setIsLoading(true);

    try {
      const token = await AsyncStorage.getItem("header_token");
      const res = await registerDmtCustomer({
        data: {
          mobileNumber,
          otp,
          ...appCtx
        },
        headerToken: token,
        idempotencyKey: `DMT_REG_${mobileNumber}_${Date.now()}`
      });

      if (res.success || res.status === "SUCCESS") {
        setOtpVisible(false);
        await AsyncStorage.setItem("sender_mobile", mobileNumber);
        navigation.replace("DmtHome", { mobileNumber });
      } else {
        setOtpError(res.message || "Verification failed");
      }
    } catch (err) {
      setOtpError("Network error. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ══ HEADER ══ */}
        <Animated.View
          style={[styles.header, { opacity: headerOp, transform: [{ translateY: headerTY }] }]}
        >
          <View style={styles.secureBadge}>
            <Text style={styles.secureBadgeIcon}>🔒</Text>
            <Text style={styles.secureBadgeTxt}>SECURED BY DMT</Text>
          </View>
          <View style={styles.titleRow}>
            <Text style={styles.titleAccent}>DMT </Text>
            <Text style={styles.titleWhite}>Login</Text>
          </View>
          <Text style={styles.headerSub}>Secure Domestic Money Transfer</Text>
        </Animated.View>

        {/* ══ FORM BODY ══ */}
        <Animated.ScrollView
          style={[styles.scroll, { opacity: formOp, transform: [{ translateY: formTY }] }]}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── STEP 1: Mobile ─── */}
          {step === 1 && (
            <View style={styles.formCard}>
              <Text style={styles.fieldHeading}>SEARCH CUSTOMER BY MOBILE</Text>
              <View style={[styles.inputRow, error ? styles.inputError : null]}>
                <View style={styles.searchIconBox}>
                  <Icon name="account-search-outline" size={rs(20)} color={Colors.primary} />
                </View>
                <View style={styles.prefixDivider} />
                <View style={styles.prefixBox}>
                  <Text style={styles.prefixTxt}>+91</Text>
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="Enter mobile number"
                  placeholderTextColor={Colors.gray}
                  keyboardType="number-pad"
                  maxLength={10}
                  value={mobileNumber}
                  onChangeText={(t) => {
                    setMobileNumber(t.replace(/\D/g, ""));
                    if (error) setError("");
                  }}
                />
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.hintRow}>
                <Text style={styles.hintTxt}>Enter your 10-digit registered mobile number</Text>
              </View>

              <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: vs(20) }}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: (mobileNumber.length === 10 && !isLoading) ? Colors.primary : Colors.gold }]}
                  onPress={handleMobileSubmit}
                  disabled={mobileNumber.length !== 10 || isLoading}
                  activeOpacity={0.88}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <>
                      <Text style={[styles.buttonText, { color: mobileNumber.length === 10 ? Colors.white : Colors.slate_500 }]}>Continue</Text>
                      <Text style={[styles.btnArrowTxt, { color: mobileNumber.length === 10 ? Colors.white : Colors.slate_500 }]}>→</Text>
                    </>
                  )}
                </TouchableOpacity>
              </Animated.View>
            </View>
          )}

          {/* ─── STEP 2: Aadhaar ─── */}
          {step === 2 && (
            <View style={styles.formCard}>
              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, styles.stepDotDone]}>
                  <Text style={styles.stepDotTxt}>✓</Text>
                </View>
                <View style={styles.stepConnector} />
                <View style={[styles.stepDot, styles.stepDotActive]}>
                  <Text style={styles.stepDotTxt}>2</Text>
                </View>
              </View>

              <View style={styles.mobileChip}>
                <Text style={styles.mobileChipCode}>+91</Text>
                <Text style={styles.mobileChipTxt}>{mobileNumber}</Text>
                <TouchableOpacity
                  onPress={() => setStep(1)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.mobileChipEdit}>Edit</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.fieldHeading}>ENTER AADHAAR NUMBER</Text>
              <View style={[styles.inputRow, error ? styles.inputError : null]}>
                <Text style={styles.aadhaarIcon}>🪪</Text>
                <View style={styles.prefixDivider} />
                <TextInput
                  style={[styles.input, { letterSpacing: scale(2) }]}
                  placeholder="XXXX XXXX XXXX"
                  placeholderTextColor={Colors.gray}
                  keyboardType="number-pad"
                  maxLength={14}
                  value={formatAadhaar(aadhaarRaw)}
                  onChangeText={(t) => {
                    const raw = t.replace(/\D/g, "").slice(0, 12);
                    setAadhaarRaw(raw);
                    if (error) setError("");
                  }}
                />
                {aadhaarRaw.length > 0 && (
                  <TouchableOpacity
                    onPress={() => setAadhaarRaw("")}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Text style={styles.clearIcon}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.hintRow}>
                <Text style={styles.hintTxt}>
                  Enter your 12-digit Aadhaar number ({aadhaarRaw.length}/12)
                </Text>
              </View>

              <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: vs(20) }}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: (aadhaarRaw.length === 12 && !isLoading) ? Colors.primary : Colors.gold }]}
                  onPress={handleAadhaarSubmit}
                  disabled={aadhaarRaw.length !== 12 || isLoading}
                  activeOpacity={0.88}
                >
                  {isLoading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <>
                      <Text style={[styles.buttonText, { color: aadhaarRaw.length === 12 ? Colors.white : Colors.slate_500 }]}>Verify Aadhaar</Text>
                      <Text style={[styles.btnArrowTxt, { color: aadhaarRaw.length === 12 ? Colors.white : Colors.slate_500 }]}>→</Text>
                    </>
                  )}
                </TouchableOpacity>
              </Animated.View>

              <TouchableOpacity style={styles.linkBtn} onPress={() => setStep(1)}>
                <Text style={styles.linkTxt}>← Change mobile number</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Security note */}
          <View style={styles.secureNote}>
            <Text style={styles.secureNoteIcon}>🔐</Text>
            <Text style={styles.secureNoteTxt}>
              Your data is encrypted end-to-end. We never store your Aadhaar details.
            </Text>
          </View>
        </Animated.ScrollView>

        <Modal visible={otpVisible} transparent animationType="none" onRequestClose={() => setOtpVisible(false)}>
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[styles.otpCard, { opacity: otpOpacity, transform: [{ scale: otpScale }] }]}
            >
              <View style={styles.otpIconWrap}>
                <Text style={styles.otpIcon}>💬</Text>
              </View>
              <Text style={styles.otpTitle}>Verify OTP</Text>
              <Text style={styles.otpSub}>
                OTP sent to <Text style={styles.otpMobile}>+91 {mobileNumber}</Text>
              </Text>
              <View style={[styles.otpInputRow, otpError ? styles.inputError : null]}>
                <TextInput
                  style={styles.otpInput}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  selection={{ start: otp.length, end: otp.length }}
                  onChangeText={(t) => {
                    setOtp(t.replace(/[^0-9]/g, ""));
                    if (otpError) setOtpError("");
                  }}
                  placeholder="• • • • • •"
                  placeholderTextColor={Colors.gray}
                />
              </View>
              {otpError ? <Text style={styles.errorTextModal}>{otpError}</Text> : null}
              <TouchableOpacity
                style={[styles.otpBtn, { backgroundColor: (otp.length === 6 && !isLoading) ? Colors.primary : Colors.gold }]}
                onPress={handleOtpVerify}
                disabled={otp.length !== 6 || isLoading}
                activeOpacity={0.88}
              >
                {isLoading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={[styles.otpBtnTxt, { color: otp.length === 6 ? Colors.white : Colors.slate_500 }]}>Verify OTP</Text>
                )}
              </TouchableOpacity>
              <View style={styles.otpFooter}>
                <TouchableOpacity>
                  <Text style={styles.resendTxt}>Resend OTP</Text>
                </TouchableOpacity>
                <Text style={styles.otpDivider}>|</Text>
                <TouchableOpacity onPress={() => setOtpVisible(false)}>
                  <Text style={styles.cancelTxt}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </View>
        </Modal>

        <CustomAlert
          visible={alertVisible}
          type={alertData.type}
          title={alertData.title}
          message={alertData.message}
          onClose={() => setAlertVisible(false)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default DmtLogin;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  scroll: { flex: 1, backgroundColor: Colors.beige },
  scrollContent: { padding: scale(16), paddingBottom: vs(50) },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: scale(20),
    paddingTop: vs(16),
    paddingBottom: vs(30),
    borderBottomLeftRadius: scale(28),
    borderBottomRightRadius: scale(28),
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: scale(20),
    paddingHorizontal: scale(10),
    paddingVertical: vs(4),
    marginBottom: vs(14),
    gap: scale(5),
  },
  secureBadgeIcon: { fontSize: rs(10) },
  secureBadgeTxt: {
    fontFamily: Fonts.Bold,
    color: Colors.white,
    fontSize: rs(9),
    fontWeight: "800",
    letterSpacing: 1.1,
  },
  titleRow: { flexDirection: "row", alignItems: "baseline", marginBottom: vs(6) },
  titleAccent: {
    fontFamily: Fonts.Bold,
    color: Colors.white,
    fontSize: rs(32),
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  titleWhite: {
    fontFamily: Fonts.Bold,
    color: Colors.white,
    fontSize: rs(32),
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  headerSub: {
    fontFamily: Fonts.Medium,
    color: "rgba(255,255,255,0.65)",
    fontSize: rs(13),
    fontWeight: "500",
  },
  formCard: {
    backgroundColor: Colors.cardbg,
    borderRadius: scale(20),
    padding: scale(18),
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.30)",
  },
  fieldHeading: {
    fontFamily: Fonts.Bold,
    fontSize: rs(9),
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 1.1,
    marginBottom: vs(10),
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: "rgb(235, 235, 235)",
    paddingHorizontal: scale(14),
    minHeight: vs(54),
  },
  inputError: {
    borderColor: Colors.red,
    borderWidth: 1.5,
  },
  errorText: {
    fontFamily: Fonts.Bold,
    color: Colors.red,
    fontSize: rs(10),
    marginTop: vs(6),
    marginBottom: vs(4),
    fontWeight: "600",
  },
  errorTextModal: {
    fontFamily: Fonts.Bold,
    color: Colors.red,
    fontSize: rs(10),
    marginTop: vs(2),
    marginBottom: vs(12),
    fontWeight: "600",
    textAlign: "center",
  },
  prefixBox: { paddingRight: scale(8) },
  prefixTxt: { fontFamily: Fonts.Bold, color: Colors.primary, fontSize: rs(14), fontWeight: "900" },
  prefixDivider: { width: 1, height: vs(20), backgroundColor: Colors.kyc_border, marginHorizontal: scale(10) },
  searchIconBox: { paddingRight: scale(4) },
  aadhaarIcon: { fontSize: rs(16), marginRight: scale(8) },
  clearIcon: {
    fontFamily: Fonts.Bold,
    color: Colors.gray,
    fontSize: rs(14),
    fontWeight: "700",
    marginLeft: scale(6),
  },
  input: {
    fontFamily: Fonts.Bold,
    flex: 1,
    fontSize: rs(14),
    color: Colors.heroEnd,
    padding: 0,
    fontWeight: "600",
  },
  hintRow: { marginTop: vs(8) },
  hintTxt: {
    fontFamily: Fonts.Medium,
    color: Colors.gray,
    fontSize: rs(10),
  },
  stepIndicator: { flexDirection: "row", alignItems: "center", marginBottom: vs(14) },
  stepDot: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.kyc_border,
  },
  stepDotDone: { backgroundColor: Colors.kyc_success },
  stepDotActive: { backgroundColor: Colors.primary },
  stepDotTxt: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(10), fontWeight: "900" },
  stepConnector: { flex: 1, height: 2, backgroundColor: Colors.primary, marginHorizontal: scale(6) },
  mobileChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary + "10",
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: vs(8),
    marginBottom: vs(16),
    gap: scale(8),
    borderWidth: 1,
    borderColor: Colors.primary + "25",
  },
  mobileChipCode: { fontFamily: Fonts.Bold, color: Colors.primary, fontSize: rs(13), fontWeight: "900" },
  mobileChipTxt: {
    fontFamily: Fonts.Bold,
    flex: 1,
    fontSize: rs(13),
    fontWeight: "700",
    color: Colors.primary,
  },
  mobileChipEdit: { fontFamily: Fonts.Bold, color: Colors.primary, fontSize: rs(11), fontWeight: "800" },
  button: {
    borderRadius: scale(14),
    paddingVertical: vs(15),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(10),
  },
  btnDisabled: {
    backgroundColor: Colors.gold,
  },
  buttonText: {
    fontFamily: Fonts.Bold,
    color: Colors.white,
    fontSize: rs(15),
    fontWeight: "900",
    letterSpacing: 0.4,
  },
  btnArrowTxt: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(14), fontWeight: "900" },
  linkBtn: { alignItems: "center", marginTop: vs(16) },
  linkTxt: { fontFamily: Fonts.Bold, color: Colors.primary, fontSize: rs(12), fontWeight: "700" },
  secureNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scale(8),
    marginTop: vs(16),
    backgroundColor: Colors.bg_F8,
    borderRadius: scale(12),
    padding: scale(12),
    borderWidth: 1,
    borderColor: "rgb(235, 235, 235)",
  },
  secureNoteIcon: { fontSize: rs(14), marginTop: vs(1) },
  secureNoteTxt: {
    fontFamily: Fonts.Regular,
    flex: 1,
    color: Colors.gray,
    fontSize: rs(10),
    lineHeight: rs(16),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scale(24),
  },
  otpCard: {
    width: "100%",
    backgroundColor: Colors.cardbg,
    borderRadius: scale(24),
    paddingVertical: vs(28),
    paddingHorizontal: scale(22),
    alignItems: "center",
  },
  otpIconWrap: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(16),
    backgroundColor: Colors.primary + "15",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: vs(12),
  },
  otpIcon: { fontSize: rs(26) },
  otpTitle: {
    fontFamily: Fonts.Bold,
    fontSize: rs(18),
    fontWeight: "900",
    color: Colors.primary,
    marginBottom: vs(4),
  },
  otpSub: { fontFamily: Fonts.Medium, fontSize: rs(12), color: Colors.gray, textAlign: "center" },
  otpMobile: { fontFamily: Fonts.Bold, color: Colors.primary, fontWeight: "800" },
  otpInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.bg_F8,
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: "rgb(235, 235, 235)",
    paddingHorizontal: scale(14),
    width: "100%",
  },
  otpInput: {
    fontFamily: Fonts.Bold,
    width: "100%",
    paddingVertical: vs(14),
    fontSize: rs(22),
    textAlign: "center",
    letterSpacing: scale(8),
    paddingLeft: scale(8),
    color: Colors.primary,
    fontWeight: "800",
  },
  otpBtn: {
    width: "100%",
    backgroundColor: Colors.primary,
    borderRadius: scale(14),
    paddingVertical: vs(14),
    alignItems: "center",
    marginBottom: vs(14),
    marginTop: vs(10),
  },
  otpBtnTxt: {
    fontFamily: Fonts.Bold,
    color: Colors.white,
    fontSize: rs(14),
    fontWeight: "900",
    letterSpacing: 0.3,
  },
  otpFooter: { flexDirection: "row", alignItems: "center", gap: scale(12) },
  resendTxt: { fontFamily: Fonts.Bold, color: Colors.primary, fontSize: rs(12), fontWeight: "700" },
  otpDivider: { color: Colors.kyc_border, fontSize: rs(14) },
  cancelTxt: { fontFamily: Fonts.Medium, color: Colors.gray, fontSize: rs(12), fontWeight: "600" },
});
