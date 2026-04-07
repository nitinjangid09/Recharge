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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import CustomAlert from "../../componets/Alerts/CustomAlert";
import Fonts from "../../constants/Fonts";
import Colors from "../../constants/Colors";

/* ─────────────────────────────────────────────
   DESIGN TOKENS  (Camlenio premium palette)
───────────────────────────────────────────── */
const T = {
  ink: "#0F0E0D",
  ink2: "#3A3835",
  ink3: "#7A756E",
  ink4: "#B5AFA7",
  ink5: "#E2DDD8",
  surface: "#FAFAF8",
  surface2: "#F4F2EE",
  surface3: "#EDE9E3",
  amber: "#C96A00",
  amber2: "#E07A00",
  amberBg: "rgba(201,106,0,0.07)",
  amberRing: "rgba(201,106,0,0.18)",
  red: "#C13B3B",
  green: "#1A7F5A",
  greenBg: "rgba(26,127,90,0.07)",
};

/* ─────────────────────────────────────────────
   PASSWORD STRENGTH
───────────────────────────────────────────── */
const STRENGTH_LABELS = ["—", "Weak", "Fair", "Strong", "Strong"];
const STRENGTH_COLORS = ["", T.amber2, "#D4A017", T.amber, T.green];

function calcStrength(v) {
  let s = 0;
  if (v.length >= 8) s++;
  if (/[A-Z]/.test(v)) s++;
  if (/[0-9]/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  return s;
}

/* ─────────────────────────────────────────────
   FLOATING-LABEL INPUT  (mirrors .f-field)
───────────────────────────────────────────── */
const FloatInput = ({ id, label, value, onChangeText, secureTextEntry, onToggleSecure, showSecure, error }) => {
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;
  const [focused, setFocused] = useState(false);

  const animLabel = (toValue) =>
    Animated.timing(labelAnim, { toValue, duration: 140, useNativeDriver: false }).start();

  const animBorder = (toValue) =>
    Animated.timing(borderAnim, { toValue, duration: 120, useNativeDriver: false }).start();

  const onFocus = () => { setFocused(true); animLabel(1); animBorder(1); };
  const onBlur = () => { setFocused(false); if (!value) animLabel(0); animBorder(0); };

  const labelTop = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 9] });
  const labelSize = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 10.5] });
  const labelColor = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [T.ink3, T.amber] });
  const borderColor = borderAnim.interpolate({ inputRange: [0, 1], outputRange: [error ? T.red : T.ink5, T.amber] });
  const shadowOpacity = borderAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View style={styles.fFieldContainer}>
      <Animated.View
        style={[
          styles.fField,
          {
            borderColor,
            shadowOpacity,
            shadowColor: error ? T.red : T.amber,
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 6,
            elevation: focused ? 2 : 0,
          },
        ]}
      >
        {/* Floating label */}
        <Animated.Text
          style={[
            styles.fLabel,
            { top: labelTop, fontSize: labelSize, color: labelColor },
          ]}
          pointerEvents="none"
        >
          {label}
        </Animated.Text>

        {/* Text input */}
        <TextInput
          style={styles.fInput}
          value={value}
          onChangeText={onChangeText}
          onFocus={onFocus}
          onBlur={onBlur}
          secureTextEntry={secureTextEntry}
          placeholder=" "
          placeholderTextColor="transparent"
          autoCapitalize="none"
          autoCorrect={false}
        />

        {/* Eye toggle */}
        <TouchableOpacity
          style={styles.fIcon}
          onPress={onToggleSecure}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name={showSecure ? "eye-outline" : "eye-off-outline"} size={14} color={focused ? T.amber : T.ink4} />
        </TouchableOpacity>
      </Animated.View>
      {error ? <Text style={styles.fError}>{error}</Text> : null}
    </View>
  );
};

/* ─────────────────────────────────────────────
   STRENGTH BAR
───────────────────────────────────────────── */
const StrengthBar = ({ value }) => {
  const s = value ? calcStrength(value) : 0;
  const label = value ? STRENGTH_LABELS[s] : "—";
  const color = value && s > 0 ? STRENGTH_COLORS[s] : T.ink4;

  return (
    <View style={styles.strength}>
      <View style={styles.strengthLabelRow}>
        <Text style={styles.strengthLabelTxt}>Password strength</Text>
        <Text style={[styles.strengthVal, { color }]}>{label}</Text>
      </View>
      <View style={styles.strengthBar}>
        {[0, 1, 2, 3].map((i) => (
          <View
            key={i}
            style={[
              styles.strengthSeg,
              i < s && { backgroundColor: color },
            ]}
          />
        ))}
      </View>
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
    <Text style={styles.topbarTitle}>Change Password</Text>
    <View style={{ width: 34 }} />
  </View>
);

/* ─────────────────────────────────────────────
   MAIN SCREEN
───────────────────────────────────────────── */
const ChangePasswordScreen = ({ navigation }) => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState({});

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ type: "", title: "", message: "" });

  const btnScale = useRef(new Animated.Value(1)).current;

  const showAlert = (type, title, message) => {
    setAlertData({ type, title, message });
    setAlertVisible(true);
  };

  const pressIn = () => Animated.timing(btnScale, { toValue: 0.97, duration: 80, useNativeDriver: true }).start();
  const pressOut = () => Animated.timing(btnScale, { toValue: 1, duration: 160, useNativeDriver: true }).start();

  const handleSubmit = useCallback(() => {
    const newErrors = {};
    if (!oldPassword) newErrors.old = "Current password is required";
    if (!newPassword) newErrors.new = "New password is required";
    if (!confirmPassword) newErrors.confirm = "Confirm password is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrors({ confirm: "Passwords do not match" });
      return;
    }

    if (oldPassword === newPassword) {
      setErrors({ new: "New password must differ from current" });
      return;
    }

    setErrors({});
    showAlert("success", "Success", "Password changed successfully.");
  }, [oldPassword, newPassword, confirmPassword]);

  return (
    <SafeAreaView style={styles.safe}>
      {/* Sticky topbar */}
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
              <Icon name="lock-outline" size={20} color={T.amber} />
            </View>
            <Text style={styles.pwHeadTitle}>Change Password</Text>
            <Text style={styles.pwHeadSub}>
              Keep your account secure with a unique, hard-to-guess password
            </Text>
          </View>

          {/* ── Form body ── */}
          <View style={styles.formBody}>
            {/* Current password */}
            <FloatInput
              label="Current Password"
              value={oldPassword}
              onChangeText={(t) => { setOldPassword(t); setErrors(p => ({ ...p, old: null })); }}
              secureTextEntry={!showOld}
              showSecure={showOld}
              onToggleSecure={() => setShowOld((v) => !v)}
              error={errors.old}
            />

            {/* New password */}
            <FloatInput
              label="New Password"
              value={newPassword}
              onChangeText={(t) => { setNewPassword(t); setErrors(p => ({ ...p, new: null })); }}
              secureTextEntry={!showNew}
              showSecure={showNew}
              onToggleSecure={() => setShowNew((v) => !v)}
              error={errors.new}
            />

            {/* Strength bar */}
            <StrengthBar value={newPassword} />

            {/* Confirm password */}
            <FloatInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setErrors(p => ({ ...p, confirm: null })); }}
              secureTextEntry={!showConfirm}
              showSecure={showConfirm}
              onToggleSecure={() => setShowConfirm((v) => !v)}
              error={errors.confirm}
            />

            {/* Tip box */}
            <View style={styles.tipBox}>
              <Icon name="shield-outline" size={14} color={T.ink4} style={{ marginTop: 1 }} />
              <Text style={styles.tipText}>
                Use 8+ characters with a mix of uppercase letters, numbers, and symbols for maximum security.
              </Text>
            </View>

            {/* Buttons */}
            <View style={styles.btnGroup}>
              <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                <TouchableOpacity
                  style={styles.btnSolid}
                  onPressIn={pressIn}
                  onPressOut={pressOut}
                  onPress={handleSubmit}
                  activeOpacity={1}
                >
                  <Text style={styles.btnSolidTxt}>Update Password</Text>
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

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

export default ChangePasswordScreen;

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
    backgroundColor: "rgba(255, 255, 255, 0.1)",
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
  fIcon: {
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },

  /* ── Strength bar ── */
  strength: {
    marginBottom: 20,
    marginTop: -6,
  },
  strengthLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  strengthLabelTxt: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
    color: T.ink3,
  },
  strengthVal: {
    fontFamily: Fonts.SemiBold,
    fontSize: 11,
  },
  strengthBar: {
    flexDirection: "row",
    gap: 4,
  },
  strengthSeg: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: T.surface3,
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
  btnGhost: {
    height: 42,
    borderRadius: 999,
    backgroundColor: T.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  btnGhostTxt: {
    fontFamily: Fonts.SemiBold,
    fontSize: 13,
    color: T.ink2,
    letterSpacing: -0.13,
  },
});