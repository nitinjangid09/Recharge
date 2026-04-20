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
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import CustomAlert from "../../componets/Alerts/CustomAlert";
import Fonts from "../../constants/Fonts";
import Colors from "../../constants/Colors";
import HeaderBar from "../../componets/HeaderBar/HeaderBar";
import { resetPassword } from "../../api/AuthApi";


/* ─────────────────────────────────────────────
   PASSWORD STRENGTH
───────────────────────────────────────────── */
const STRENGTH_LABELS = ["—", "Weak", "Fair", "Strong", "Strong"];
const STRENGTH_COLORS = ["", Colors.amber2, "#D4A017", Colors.amber, Colors.green];

function calcStrength(v) {
  let s = 0;
  if (v.length >= 8) s++;
  if (/[A-Z]/.test(v)) s++;
  if (/[0-9]/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  return s;
}

/* ─────────────────────────────────────────────
   FLOATING-LABEL INPUT
───────────────────────────────────────────── */
const FloatInput = ({ label, value, onChangeText, secureTextEntry, onToggleSecure, showSecure, error, success }) => {
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
  const labelColor = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [Colors.ink3, Colors.amber] });

  let finalBorderColor = error ? Colors.red : (success ? Colors.green : Colors.ink5);
  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [finalBorderColor, success ? Colors.green : Colors.amber]
  });

  return (
    <View style={styles.fFieldContainer}>
      <Animated.View
        style={[
          styles.fField,
          {
            borderColor,
            shadowOpacity: (error || success || focused) ? 1 : 0,
            shadowColor: error ? Colors.red : (success ? Colors.green : Colors.amber),
            shadowOffset: { width: 0, height: 0 },
            shadowRadius: 6,
            elevation: (focused || error || success) ? 2 : 0,
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
          maxLength={32}
        />
        <TouchableOpacity
          style={styles.fIcon}
          onPress={onToggleSecure}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          {success && !error ? (
            <Icon name="check-circle" size={16} color={Colors.green} />
          ) : (
            <Icon name={showSecure ? "eye-outline" : "eye-off-outline"} size={14} color={focused ? Colors.amber : Colors.ink4} />
          )}
        </TouchableOpacity>
      </Animated.View>
      {error ? <Text style={styles.fError}>{error}</Text> : null}
      {success && !error ? <Text style={styles.fSuccess}>{success}</Text> : null}
    </View>
  );
};

/* ─────────────────────────────────────────────
   STRENGTH BAR
───────────────────────────────────────────── */
const StrengthBar = ({ value }) => {
  const s = value ? calcStrength(value) : 0;
  const label = value ? STRENGTH_LABELS[s] : "—";
  const color = value && s > 0 ? STRENGTH_COLORS[s] : Colors.ink4;

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
            style={[styles.strengthSeg, i < s && { backgroundColor: color }]}
          />
        ))}
      </View>
    </View>
  );
};

/* ─────────────────────────────────────────────
   MAIN SCREEN
───────────────────────────────────────────── */
const ResetPasswordScreen = ({ navigation, route }) => {
  const { email, otp } = route.params || {};

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ type: "", title: "", message: "", onClose: null });

  const btnScale = useRef(new Animated.Value(1)).current;

  const showAlert = (type, title, message, onClose = null) => {
    setAlertData({ type, title, message, onClose });
    setAlertVisible(true);
  };

  const pressIn = () => Animated.timing(btnScale, { toValue: 0.97, duration: 80, useNativeDriver: true }).start();
  const pressOut = () => Animated.timing(btnScale, { toValue: 1, duration: 160, useNativeDriver: true }).start();

  const handleSubmit = useCallback(async () => {
    const newErrors = {};
    if (!newPassword) newErrors.new = "New password is required";
    else if (newPassword.length < 8) newErrors.new = "Password must be at least 8 characters";

    if (!confirmPassword) newErrors.confirm = "Confirm password is required";
    else if (newPassword !== confirmPassword) newErrors.confirm = "Passwords do not match";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      const response = await resetPassword({ 
        email, 
        otp, 
        newPassword 
      });

      if (response.success || response.status === "SUCCESS") {
        showAlert("success", "Success", response.message || "Password reset successfully.", () => {
          navigation.navigate("Login");
        });
      } else {
        showAlert("error", "Failed", response.message || "Unable to reset password.");
      }
    } catch (err) {
      showAlert("error", "Error", "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [email, otp, newPassword, confirmPassword, navigation]);

  return (
    <SafeAreaView style={styles.safe}>
      <HeaderBar title="Reset Password" onBack={() => navigation?.goBack()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.pwHead}>
            <View style={styles.pwHeadIc}>
              <Icon name="lock-reset" size={20} color={Colors.amber} />
            </View>
            <Text style={styles.pwHeadTitle}>New Password</Text>
            <Text style={styles.pwHeadSub}>
              Set a strong password to protect your account for {email}
            </Text>
          </View>

          <View style={styles.formBody}>
            <FloatInput
              label="New Password"
              value={newPassword}
              onChangeText={(t) => { setNewPassword(t); setErrors(p => ({ ...p, new: null })); }}
              secureTextEntry={!showNew}
              showSecure={showNew}
              onToggleSecure={() => setShowNew(!showNew)}
              error={errors.new}
            />

            <StrengthBar value={newPassword} />

            <FloatInput
              label="Confirm New Password"
              value={confirmPassword}
              onChangeText={(t) => {
                setConfirmPassword(t);
                if (newPassword && t && t !== newPassword) {
                  setErrors(p => ({ ...p, confirm: "Passwords do not match" }));
                } else {
                  setErrors(p => ({ ...p, confirm: null }));
                }
              }}
              secureTextEntry={!showConfirm}
              showSecure={showConfirm}
              onToggleSecure={() => setShowConfirm(!showConfirm)}
              error={errors.confirm}
              success={newPassword && confirmPassword && newPassword === confirmPassword ? "Passwords Match" : null}
            />

            <View style={styles.tipBox}>
              <Icon name="shield-outline" size={14} color={Colors.ink4} style={{ marginTop: 1 }} />
              <Text style={styles.tipText}>
                Use 8+ characters with a mix of uppercase letters, numbers, and symbols.
              </Text>
            </View>

            <View style={styles.btnGroup}>
              <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                <TouchableOpacity
                  style={[styles.btnSolid, loading && { opacity: 0.8 }]}
                  onPressIn={pressIn}
                  onPressOut={pressOut}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.btnSolidTxt}>Reset Password</Text>
                  )}
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
        onClose={() => {
          setAlertVisible(false);
          alertData.onClose && alertData.onClose();
        }}
      />
    </SafeAreaView>
  );
};

export default ResetPasswordScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { paddingBottom: 48 },
  pwHead: {
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.ink5,
  },
  pwHeadIc: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: Colors.amberBg,
    alignItems: "center", justifyContent: "center", marginBottom: 14,
  },
  pwHeadTitle: { fontFamily: Fonts.Bold, fontSize: 24, color: Colors.ink, letterSpacing: -0.72, marginBottom: 4 },
  pwHeadSub: { fontFamily: Fonts.Regular, fontSize: 13, color: Colors.ink3, lineHeight: 19.5 },
  formBody: { paddingHorizontal: 16, paddingTop: 20 },
  fFieldContainer: { marginBottom: 14 },
  fField: {
    height: 56, backgroundColor: Colors.white, borderWidth: 1.5, borderColor: Colors.ink5,
    borderRadius: 14, flexDirection: "row", alignItems: "center",
  },
  fLabel: { position: "absolute", left: 14, fontFamily: Fonts.Regular, color: Colors.ink3 },
  fError: { fontFamily: Fonts.Medium, fontSize: 10, color: Colors.red, marginTop: 4, marginLeft: 14 },
  fSuccess: { fontFamily: Fonts.Medium, fontSize: 10, color: Colors.green, marginTop: 4, marginLeft: 14 },
  fInput: { flex: 1, height: "100%", paddingHorizontal: 14, paddingTop: 20, paddingBottom: 8, fontFamily: Fonts.Medium, fontSize: 14, color: Colors.ink },
  fIcon: { paddingHorizontal: 14, alignItems: "center", justifyContent: "center", height: "100%" },
  strength: { marginBottom: 20, marginTop: -6 },
  strengthLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  strengthLabelTxt: { fontFamily: Fonts.SemiBold, fontSize: 11, color: Colors.ink3 },
  strengthVal: { fontFamily: Fonts.SemiBold, fontSize: 11 },
  strengthBar: { flexDirection: "row", gap: 4 },
  strengthSeg: { flex: 1, height: 3, borderRadius: 2, backgroundColor: Colors.surface3 },
  tipBox: { flexDirection: "row", gap: 10, padding: 13, backgroundColor: Colors.white, borderRadius: 14, marginTop: 2, borderWidth: 1, borderColor: Colors.ink5 },
  tipText: { flex: 1, fontFamily: Fonts.Regular, fontSize: 12, color: Colors.ink3, lineHeight: 18 },
  btnGroup: { marginTop: 20 },
  btnSolid: { height: 52, borderRadius: 999, backgroundColor: Colors.ink, alignItems: "center", justifyContent: "center", elevation: 6 },
  btnSolidTxt: { fontFamily: Fonts.SemiBold, fontSize: 14, color: "#fff" },
});
