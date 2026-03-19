import React, { useState, useRef, useEffect, Component } from "react";
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
import Colors from "../../constants/Colors";
import Fonts from "../../constants/Fonts";
import { fadeIn, slideUp, buttonPress } from "../../utils/ScreenAnimations";
import CustomAlert from "../../componets/CustomAlert";

// ─── Responsive Scaling ───────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get("window");
const BASE_W = 390;
const BASE_H = 844;
const scale = (s) => Math.round((SW / BASE_W) * s);
const vs = (s) => Math.round((SH / BASE_H) * s);
const rs = (s) => Math.round(Math.sqrt((SW * SH) / (BASE_W * BASE_H)) * s);

// ─── Format Aadhaar: "XXXXXXXXXXXX" → "XXXX XXXX XXXX" ───────────────────────
const formatAadhaar = (raw) => {
  // raw is digits only, max 12
  const d = raw.replace(/\D/g, "").slice(0, 12);
  return d.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
};

// ─── OTP boxes component — fills left to right ───────────────────────────────
const OtpBoxes = ({ value, onChange }) => {
  const inputRef = useRef(null);
  const digits = value.split(""); // array of entered digits

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={() => inputRef.current?.focus()}
      style={otpStyles.row}
    >
      {/* Hidden real input — always focused */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, "").slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        caretHidden
        style={otpStyles.hiddenInput}
        autoFocus
      />

      {/* 6 visible boxes */}
      {Array.from({ length: 6 }).map((_, i) => {
        const filled = i < digits.length;
        const isCaret = i === digits.length;
        return (
          <View
            key={i}
            style={[
              otpStyles.box,
              filled && otpStyles.boxFilled,
              isCaret && otpStyles.boxCaret,
            ]}
          >
            <Text style={otpStyles.boxTxt}>{filled ? digits[i] : ""}</Text>
            {isCaret && <View style={otpStyles.cursor} />}
          </View>
        );
      })}
    </TouchableOpacity>
  );
};

const otpStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: scale(8),
    marginVertical: vs(16),
    position: "relative",
  },
  hiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
  box: {
    flex: 1,
    height: vs(52),
    borderRadius: scale(12),
    backgroundColor: Colors.gray_F5, // F7F7F7 equivalent
    borderWidth: 1.5,
    borderColor: Colors.gray_E0,
    alignItems: "center",
    justifyContent: "center",
  },
  boxFilled: {
    backgroundColor: Colors.accent + "10",
    borderColor: Colors.accent,
  },
  boxCaret: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "0A", // #F0F4FF approx
  },
  boxTxt: {
    fontFamily: Fonts.Bold,
    fontSize: rs(20),
    fontWeight: "900",
    color: Colors.primary,
  },
  cursor: {
    position: "absolute",
    bottom: vs(10),
    width: scale(2),
    height: vs(18),
    backgroundColor: Colors.primary,
    borderRadius: 1,
  },
});

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
const DmtLogin = () => {
  const navigation = useNavigation();

  const [mobileNumber, setMobileNumber] = useState("");
  const [aadhaarRaw, setAadhaarRaw] = useState(""); // digits only
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [otpVisible, setOtpVisible] = useState(false);

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
    Animated.parallel([fadeIn(formOp, 350), slideUp(formTY, 350)]).start();
  }, [step]);

  useEffect(() => {
    if (otpVisible) {
      otpScale.setValue(0.85);
      otpOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(otpScale, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
        Animated.timing(otpOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [otpVisible]);

  // Handlers
  const handleMobileSubmit = () => {
    if (mobileNumber.length !== 10) {
      return showAlert("error", "Invalid Mobile", "Enter valid 10-digit mobile number");
    }
    buttonPress(btnScale).start(() => setStep(2));
  };

  const handleAadhaarSubmit = () => {
    if (aadhaarRaw.length !== 12) {
      return showAlert("error", "Invalid Aadhaar", "Enter valid 12-digit Aadhaar number");
    }
    buttonPress(btnScale).start(() => { setOtp(""); setOtpVisible(true); });
  };

  const handleOtpVerify = () => {
    if (otp.length !== 6) {
      return showAlert("error", "Invalid OTP", "Enter valid 6-digit OTP");
    }
    setOtpVisible(false);
    navigation.navigate("DmtHome");
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
              <Text style={styles.fieldHeading}>ENTER MOBILE NUMBER</Text>

              {/* +91 prefix ON LEFT, no flag */}
              <View style={styles.inputRow}>
                <View style={styles.prefixBox}>
                  <Text style={styles.prefixTxt}>+91</Text>
                </View>
                <View style={styles.prefixDivider} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter mobile number"
                  placeholderTextColor={Colors.gray_BD}
                  keyboardType="number-pad"
                  maxLength={10}
                  value={mobileNumber}
                  onChangeText={(t) => setMobileNumber(t.replace(/\D/g, ""))}
                />
              </View>

              <View style={styles.hintRow}>
                <Text style={styles.hintTxt}>
                  Enter your 10-digit registered mobile number
                </Text>
              </View>

              <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: vs(20) }}>
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleMobileSubmit}
                  activeOpacity={0.88}
                >
                  <Text style={styles.buttonText}>Continue</Text>
                  <Text style={styles.btnArrowTxt}>→</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          )}

          {/* ─── STEP 2: Aadhaar ─── */}
          {step === 2 && (
            <View style={styles.formCard}>
              {/* Step indicator */}
              <View style={styles.stepIndicator}>
                <View style={[styles.stepDot, styles.stepDotDone]}>
                  <Text style={styles.stepDotTxt}>✓</Text>
                </View>
                <View style={styles.stepConnector} />
                <View style={[styles.stepDot, styles.stepDotActive]}>
                  <Text style={styles.stepDotTxt}>2</Text>
                </View>
              </View>

              {/* Mobile chip */}
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

              {/* Aadhaar input — formatted XXXX XXXX XXXX */}
              <View style={styles.inputRow}>
                <Text style={styles.aadhaarIcon}>🪪</Text>
                <View style={styles.prefixDivider} />
                <TextInput
                  style={[styles.input, { letterSpacing: scale(2) }]}
                  placeholder="XXXX XXXX XXXX"
                  placeholderTextColor={Colors.gray_BD}
                  keyboardType="number-pad"
                  maxLength={14} // 12 digits + 2 spaces
                  value={formatAadhaar(aadhaarRaw)}
                  onChangeText={(t) => {
                    // strip spaces → store raw digits
                    const raw = t.replace(/\D/g, "").slice(0, 12);
                    setAadhaarRaw(raw);
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


              <View style={styles.hintRow}>
                <Text style={styles.hintTxt}>
                  Enter your 12-digit Aadhaar number ({aadhaarRaw.length}/12)
                </Text>
              </View>

              <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: vs(20) }}>
                <TouchableOpacity
                  style={styles.button}
                  onPress={handleAadhaarSubmit}
                  activeOpacity={0.88}
                >
                  <Text style={styles.buttonText}>Verify Aadhaar</Text>
                  <Text style={styles.btnArrowTxt}>→</Text>
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

        {/* ══ OTP MODAL ══ */}
        <Modal visible={otpVisible} transparent animationType="none" onRequestClose={() => setOtpVisible(false)}>
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.otpCard,
                { opacity: otpOpacity, transform: [{ scale: otpScale }] },
              ]}
            >
              <View style={styles.otpIconWrap}>
                <Text style={styles.otpIcon}>💬</Text>
              </View>
              <Text style={styles.otpTitle}>Verify OTP</Text>
              <Text style={styles.otpSub}>
                OTP sent to{" "}
                <Text style={styles.otpMobile}>+91 {mobileNumber}</Text>
              </Text>

              {/* OTP boxes — fills left to right */}
              <View style={styles.otpInputRow}>
                <TextInput
                  style={styles.otpInput}
                  keyboardType="number-pad"
                  maxLength={6}
                  value={otp}
                  onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, ""))}
                  placeholder="• • • • • •"
                  placeholderTextColor={Colors.gray_BD}
                />
              </View>
              <TouchableOpacity
                style={styles.otpBtn}
                onPress={handleOtpVerify}
                activeOpacity={0.88}
              >
                <Text style={styles.otpBtnTxt}>Verify OTP</Text>
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

// ══════════════════════════════════════════════════════════════════════════════
//  STYLES
// ══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  scroll: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { padding: scale(16), paddingBottom: vs(50) },

  // ── Header ──
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: scale(20),
    paddingTop: vs(16),
    paddingBottom: vs(30),
    borderBottomLeftRadius: scale(28),
    borderBottomRightRadius: scale(28),
  },

  secureBadge: {
    flexDirection: "row", alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: Colors.whiteOpacity_10,
    borderWidth: 1, borderColor: Colors.whiteOpacity_18,
    borderRadius: scale(20),
    paddingHorizontal: scale(10), paddingVertical: vs(4),
    marginBottom: vs(14), gap: scale(5),
  },
  secureBadgeIcon: { fontSize: rs(10) },
  secureBadgeTxt: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(9), fontWeight: "800", letterSpacing: 1.1 },

  titleRow: { flexDirection: "row", alignItems: "baseline", marginBottom: vs(6) },
  titleAccent: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(32), fontWeight: "900", letterSpacing: 0.5 },
  titleWhite: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(32), fontWeight: "900", letterSpacing: 0.5 },
  headerSub: { fontFamily: Fonts.Medium, color: Colors.whiteOpacity_65, fontSize: rs(13), fontWeight: "500" },

  // ── Form card ──
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: scale(20), padding: scale(18),
    elevation: 3, shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8,
  },
  fieldHeading: {
    fontFamily: Fonts.Bold, fontSize: rs(9), fontWeight: "800", color: Colors.primary,
    letterSpacing: 1.1, marginBottom: vs(10),
  },

  // ── Input row ──
  inputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.gray_FA, borderRadius: scale(14),
    borderWidth: 1, borderColor: Colors.gray_EB,
    paddingHorizontal: scale(14), minHeight: vs(54),
    marginBottom: vs(8),
  },

  // +91 prefix — left side, no flag
  prefixBox: {
    paddingRight: scale(8),
  },
  prefixTxt: {
    fontFamily: Fonts.Bold, color: Colors.primary, fontSize: rs(14), fontWeight: "900",
  },
  prefixDivider: {
    width: 1, height: vs(20), backgroundColor: Colors.gray_E0,
    marginRight: scale(12),
  },

  aadhaarIcon: { fontSize: rs(16), marginRight: scale(8) },
  clearIcon: { fontFamily: Fonts.Bold, color: Colors.gray_BD, fontSize: rs(14), fontWeight: "700", marginLeft: scale(6) },

  input: {
    fontFamily: Fonts.Bold, flex: 1, fontSize: rs(14), color: Colors.gray_21, padding: 0, fontWeight: "600",
  },

  // Aadhaar progress dots
  aadhaarProgress: {
    flexDirection: "row", alignItems: "center",
    marginBottom: vs(8), gap: scale(3),
  },
  aadhaarDot: {
    width: scale(7), height: scale(7), borderRadius: scale(4),
    backgroundColor: Colors.gray_E0,
  },
  aadhaarDotFilled: { backgroundColor: Colors.accent },


  // Step indicator
  stepIndicator: {
    flexDirection: "row", alignItems: "center",
    marginBottom: vs(14),
  },
  stepDot: {
    width: scale(26), height: scale(26), borderRadius: scale(13),
    alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.gray_E0,
  },
  stepDotDone: { backgroundColor: "#16A34A" }, // Success color kept hardcoded as we don't have green
  stepDotActive: { backgroundColor: Colors.accent },
  stepDotTxt: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(10), fontWeight: "900" },
  stepConnector: {
    flex: 1, height: 2, backgroundColor: Colors.accent,
    marginHorizontal: scale(6),
  },

  // Mobile chip
  mobileChip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.accent + "10",
    borderRadius: scale(10), paddingHorizontal: scale(12), paddingVertical: vs(8),
    marginBottom: vs(16), gap: scale(8),
    borderWidth: 1, borderColor: Colors.accent + "25",
  },
  mobileChipCode: { fontFamily: Fonts.Bold, color: Colors.primary, fontSize: rs(13), fontWeight: "900" },
  mobileChipTxt: { fontFamily: Fonts.Bold, flex: 1, fontSize: rs(13), fontWeight: "700", color: Colors.primary },
  mobileChipEdit: { fontFamily: Fonts.Bold, color: Colors.accent, fontSize: rs(11), fontWeight: "800" },

  // Button
  button: {
    backgroundColor: Colors.accent, borderRadius: scale(14),
    paddingVertical: vs(15), flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: scale(10),
    elevation: 3, shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8,
  },
  buttonText: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(15), fontWeight: "900", letterSpacing: 0.4 },

  btnArrowTxt: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(14), fontWeight: "900" },

  // Link
  linkBtn: { alignItems: "center", marginTop: vs(16) },
  linkTxt: { fontFamily: Fonts.Bold, color: Colors.accent, fontSize: rs(12), fontWeight: "700" },

  // Security note
  secureNote: {
    flexDirection: "row", alignItems: "flex-start",
    gap: scale(8), marginTop: vs(16),
    backgroundColor: Colors.bg_F8, borderRadius: scale(12),
    padding: scale(12), borderWidth: 1, borderColor: Colors.gray_EB,
  },
  secureNoteIcon: { fontSize: rs(14), marginTop: vs(1) },
  secureNoteTxt: { fontFamily: Fonts.Regular, flex: 1, color: Colors.gray_9E, fontSize: rs(10), lineHeight: rs(16) },

  // ── OTP Modal ──
  modalOverlay: {
    flex: 1, backgroundColor: Colors.blackOpacity_45,
    justifyContent: "center", alignItems: "center",
    paddingHorizontal: scale(24),
  },
  otpCard: {
    width: "100%", backgroundColor: Colors.white,
    borderRadius: scale(24),
    paddingVertical: vs(28), paddingHorizontal: scale(22),
    alignItems: "center",
    elevation: 10, shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16,
  },
  otpIconWrap: {
    width: scale(56), height: scale(56), borderRadius: scale(16),
    backgroundColor: Colors.accent + "15",
    alignItems: "center", justifyContent: "center", marginBottom: vs(12),
  },
  otpIcon: { fontSize: rs(26) },
  otpTitle: { fontFamily: Fonts.Bold, fontSize: rs(18), fontWeight: "900", color: Colors.primary, marginBottom: vs(4) },
  otpSub: { fontFamily: Fonts.Medium, fontSize: rs(12), color: Colors.gray_9E, textAlign: "center" },
  otpMobile: { fontFamily: Fonts.Bold, color: Colors.primary, fontWeight: "800" },
  otpInputRow: { width: "100%", marginBottom: vs(20) },
  otpInput: {
    fontFamily: Fonts.Bold,
    width: "100%",
    backgroundColor: Colors.gray_FA,
    borderRadius: scale(14),
    borderWidth: 1, borderColor: Colors.gray_EB,
    paddingVertical: vs(14),
    fontSize: rs(22), textAlign: "center",
    letterSpacing: scale(8),
    color: Colors.primary, fontWeight: "800",
  },
  otpBtn: {
    width: "100%", backgroundColor: Colors.accent,
    borderRadius: scale(14), paddingVertical: vs(14),
    alignItems: "center", elevation: 2,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6,
    marginBottom: vs(14),
  },
  otpBtnTxt: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(14), fontWeight: "900", letterSpacing: 0.3 },

  otpFooter: { flexDirection: "row", alignItems: "center", gap: scale(12) },
  resendTxt: { fontFamily: Fonts.Bold, color: Colors.accent, fontSize: rs(12), fontWeight: "700" },
  otpDivider: { color: Colors.gray_E0, fontSize: rs(14) },
  cancelTxt: { fontFamily: Fonts.Medium, color: Colors.gray_9E, fontSize: rs(12), fontWeight: "600" },
});