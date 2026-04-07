import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Modal,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import CustomAlert from "../../componets/Utils/CustomAlert";
import Fonts from "../../constants/Fonts";
import Colors from "../../constants/Colors";

const { width } = Dimensions.get("window");

/* ─────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────── */
const T = {
  ink: "#0F0E0D",
  ink2: "#3A3835",
  ink3: "#7A756E",
  ink4: "#B5AFA7",
  ink5: "#E2DDD8",
  surface2: "#F4F2EE",
  amber: "#C96A00",
  amber2: "#E07A00",
  amberBg: "rgba(201,106,0,0.07)",
  red: "#C13B3B",
};

/* ─────────────────────────────────────────────
   FLOATING-LABEL INPUT
───────────────────────────────────────────── */
const FloatInput = ({
  label,
  value,
  onChangeText,
  keyboardType = "default",
  autoCapitalize = "none",
  maxLength,
  error,
  textAlign,
  letterSpacing,
}) => {
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;
  const [focused, setFocused] = useState(false);

  const animLabel = (v) => Animated.timing(labelAnim, { toValue: v, duration: 140, useNativeDriver: false }).start();
  const animBorder = (v) => Animated.timing(borderAnim, { toValue: v, duration: 120, useNativeDriver: false }).start();

  const onFocus = () => { setFocused(true); animLabel(1); animBorder(1); };
  const onBlur = () => { setFocused(false); if (!value) animLabel(0); animBorder(0); };

  const labelTop = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 9] });
  const labelSize = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 10.5] });
  const labelColor = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [T.ink3, T.amber] });
  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [error ? T.red : T.ink5, T.amber],
  });

  return (
    <View style={styles.fFieldContainer}>
      <Animated.View
        style={[
          styles.fField,
          {
            borderColor,
            shadowOpacity: focused ? 1 : 0,
            shadowColor: error ? T.red : T.amber,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 6,
            elevation: focused ? 2 : 0,
          },
        ]}
      >
        <Animated.Text
          style={[styles.fLabel, { top: labelTop, fontSize: labelSize, color: labelColor }]}
          pointerEvents="none"
        >
          {label}
        </Animated.Text>

        <TextInput
          style={[
            styles.fInput,
            textAlign && { textAlign },
            letterSpacing && { letterSpacing },
          ]}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          maxLength={maxLength}
          placeholder=" "
          placeholderTextColor="transparent"
          autoCorrect={false}
        />
      </Animated.View>
      {error ? <Text style={styles.fError}>{error}</Text> : null}
    </View>
  );
};

/* ─────────────────────────────────────────────
   TOPBAR
───────────────────────────────────────────── */
const Topbar = ({ onBack }) => (
  <View style={styles.topbar}>
    <TouchableOpacity style={styles.topbarBack} onPress={onBack}>
      <Icon name="chevron-left" size={18} color={Colors.white} />
    </TouchableOpacity>
    <Text style={styles.topbarTitle}>Forgot Pin</Text>
    <View style={{ width: 34 }} />
  </View>
);

/* ─────────────────────────────────────────────
   MAIN SCREEN
───────────────────────────────────────────── */
const ForgotPinScreen = ({ navigation }) => {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpModal, setOtpModal] = useState(false);
  const [errors, setErrors] = useState({});

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ type: "", title: "", message: "" });

  const btnScale = useRef(new Animated.Value(1)).current;
  const modalScale = useRef(new Animated.Value(0)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;

  const showAlert = (type, title, message) => {
    setAlertData({ type, title, message });
    setAlertVisible(true);
  };

  const pressIn = () => Animated.timing(btnScale, { toValue: 0.97, duration: 80, useNativeDriver: true }).start();
  const pressOut = () => Animated.timing(btnScale, { toValue: 1, duration: 160, useNativeDriver: true }).start();

  const isValidEmail = (v) => /^\S+@\S+\.\S+$/.test(v);

  /* ── Open / close OTP modal ── */
  const openModal = () => {
    setOtpModal(true);
    Animated.parallel([
      Animated.timing(modalOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.spring(modalScale, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(modalOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(modalScale, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => setOtpModal(false));
  };

  /* ── Send OTP ── */
  const handleSendOtp = useCallback(() => {
    const newErrors = {};
    if (!email.trim()) newErrors.email = "Email address is required";
    else if (!isValidEmail(email)) newErrors.email = "Enter a valid email address";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setOtp("");
    openModal();
  }, [email]);

  /* ── Verify OTP ── */
  const handleVerifyOtp = useCallback(() => {
    if (!otp.trim()) {
      showAlert("error", "Error", "Please enter the OTP");
      return;
    }
    if (otp.length !== 6) {
      showAlert("error", "Invalid OTP", "OTP must be 6 digits");
      return;
    }
    closeModal();
    navigation?.navigate("ResetPin");
  }, [otp]);

  return (
    <SafeAreaView style={styles.safe}>
      <Topbar onBack={() => navigation?.goBack()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── pw-head ── */}
          <View style={styles.pwHead}>
            <View style={styles.pwHeadIc}>
              <Icon name="pin-outline" size={20} color={T.amber} />
            </View>
            <Text style={styles.pwHeadTitle}>Forgot Pin</Text>
            <Text style={styles.pwHeadSub}>
              Enter your registered email and we'll send you a 6-digit OTP to reset your PIN
            </Text>
          </View>

          {/* ── Form body ── */}
          <View style={styles.formBody}>
            <FloatInput
              label="Email Address"
              value={email}
              onChangeText={(t) => { setEmail(t); setErrors((p) => ({ ...p, email: null })); }}
              keyboardType="email-address"
              error={errors.email}
            />

            {/* Tip box */}
            <View style={styles.tipBox}>
              <Icon name="information-outline" size={14} color={T.ink4} style={{ marginTop: 1 }} />
              <Text style={styles.tipText}>
                Make sure to enter the email linked to your account. Check your spam folder if you don't receive the OTP.
              </Text>
            </View>

            {/* Send OTP button */}
            <View style={styles.btnGroup}>
              <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                <TouchableOpacity
                  style={styles.btnSolid}
                  onPressIn={pressIn}
                  onPressOut={pressOut}
                  onPress={handleSendOtp}
                  activeOpacity={1}
                >
                  <Icon name="send-outline" size={16} color="#fff" />
                  <Text style={styles.btnSolidTxt}>Send OTP</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── OTP Modal ── */}
      <Modal transparent visible={otpModal} animationType="none">
        <Animated.View style={[styles.modalOverlay, { opacity: modalOpacity }]}>
          <Animated.View style={[styles.modalBox, { transform: [{ scale: modalScale }] }]}>

            <View style={styles.modalHeadIc}>
              <Icon name="shield-key-outline" size={22} color={T.amber} />
            </View>
            <Text style={styles.modalTitle}>Enter OTP</Text>
            <Text style={styles.modalSub}>
              A 6-digit code was sent to{"\n"}
              <Text style={styles.modalEmail}>{email}</Text>
            </Text>

            <FloatInput
              label="6-digit OTP"
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              textAlign="center"
              letterSpacing={8}
            />

            <TouchableOpacity style={styles.verifyBtn} onPress={handleVerifyOtp}>
              <Text style={styles.verifyTxt}>Verify & Continue</Text>
            </TouchableOpacity>

            <View style={styles.modalFooter}>
              <TouchableOpacity>
                <Text style={styles.resendTxt}>Resend OTP</Text>
              </TouchableOpacity>
              <View style={styles.modalDivider} />
              <TouchableOpacity onPress={closeModal}>
                <Text style={styles.cancelTxt}>Cancel</Text>
              </TouchableOpacity>
            </View>

          </Animated.View>
        </Animated.View>
      </Modal>

      <CustomAlert
        visible={alertVisible}
        type={alertData.type}
        title={alertData.title}
        message={alertData.message}
        onClose={() => setAlertVisible(false)}
      />
    </SafeAreaView>
  );
};

export default ForgotPinScreen;

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scrollContent: {
    paddingBottom: 48,
  },

  /* ── Topbar ── */
  topbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#0F172A",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15,14,13,0.04)",
    gap: 12,
  },
  topbarBack: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  topbarTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: Fonts.SemiBold,
    fontSize: 15,
    color: Colors.white,
    letterSpacing: -0.3,
  },

  /* ── pw-head ── */
  pwHead: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: T.ink5,
    backgroundColor: Colors.bg,
  },
  pwHeadIc: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: T.amberBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  pwHeadTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 24,
    color: T.ink,
    letterSpacing: -0.72,
    marginBottom: 4,
  },
  pwHeadSub: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: T.ink3,
    lineHeight: 19.5,
  },

  /* ── Form body ── */
  formBody: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  /* ── Floating field ── */
  fFieldContainer: {
    marginBottom: 14,
  },
  fField: {
    position: "relative",
    height: 56,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: T.ink5,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
  },
  fLabel: {
    position: "absolute",
    left: 14,
    fontFamily: Fonts.Regular,
    color: T.ink3,
    pointerEvents: "none",
  },
  fError: {
    fontFamily: Fonts.Medium,
    fontSize: 10,
    color: T.red,
    marginTop: 4,
    marginLeft: 14,
  },
  fInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 14,
    paddingTop: 20,
    paddingBottom: 8,
    fontFamily: Fonts.Medium,
    fontSize: 14,
    color: T.ink,
  },

  /* ── Tip box ── */
  tipBox: {
    flexDirection: "row",
    gap: 10,
    padding: 13,
    backgroundColor: Colors.white,
    borderRadius: 14,
    marginTop: 2,
    marginBottom: 0,
    borderWidth: 1,
    borderColor: T.ink5,
  },
  tipText: {
    flex: 1,
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: T.ink3,
    lineHeight: 18,
  },

  /* ── Buttons ── */
  btnGroup: {
    marginTop: 20,
    gap: 10,
  },
  btnSolid: {
    height: 52,
    borderRadius: 999,
    backgroundColor: T.ink,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  btnSolidTxt: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: "#fff",
    letterSpacing: -0.14,
  },

  /* ── OTP Modal ── */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  modalBox: {
    width: "100%",
    backgroundColor: Colors.bg,
    borderRadius: 24,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: "center",
  },
  modalHeadIc: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: T.amberBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  modalTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: T.ink,
    letterSpacing: -0.5,
    marginBottom: 6,
    textAlign: "center",
  },
  modalSub: {
    fontFamily: Fonts.Regular,
    fontSize: 13,
    color: T.ink3,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 22,
  },
  modalEmail: {
    fontFamily: Fonts.SemiBold,
    color: T.amber,
  },
  verifyBtn: {
    width: "100%",
    height: 52,
    borderRadius: 999,
    backgroundColor: T.ink,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 6,
    shadowColor: T.ink,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  verifyTxt: {
    fontFamily: Fonts.SemiBold,
    fontSize: 14,
    color: "#fff",
    letterSpacing: -0.14,
  },
  modalFooter: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 18,
    gap: 12,
  },
  modalDivider: {
    width: 1,
    height: 14,
    backgroundColor: T.ink5,
  },
  resendTxt: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: T.amber,
  },
  cancelTxt: {
    fontFamily: Fonts.Medium,
    fontSize: 13,
    color: T.ink3,
  },
});