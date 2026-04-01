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
import CustomAlert from "../../componets/CustomAlert";
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
};

/* ─────────────────────────────────────────────
   FLOATING-LABEL PIN INPUT
───────────────────────────────────────────── */
const FloatPinInput = ({
  label,
  value,
  onChangeText,
  secureTextEntry,
  onToggleSecure,
  showSecure,
  error,
}) => {
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;
  const [focused, setFocused] = useState(false);

  const animLabel = (to) =>
    Animated.timing(labelAnim, { toValue: to, duration: 140, useNativeDriver: false }).start();
  const animBorder = (to) =>
    Animated.timing(borderAnim, { toValue: to, duration: 120, useNativeDriver: false }).start();

  const onFocus = () => { setFocused(true); animLabel(1); animBorder(1); };
  const onBlur = () => { setFocused(false); if (!value) animLabel(0); animBorder(0); };

  const labelTop = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [18, 9] });
  const labelSize = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [14, 10.5] });
  const labelColor = labelAnim.interpolate({ inputRange: [0, 1], outputRange: [T.ink3, T.amber] });
  const borderColor = borderAnim.interpolate({ inputRange: [0, 1], outputRange: [T.ink5, T.amber] });

  return (
    <View style={styles.fFieldContainer}>
      <Animated.View
        style={[
          styles.fField,
          {
            borderColor: error ? Colors.red || "#C13B3B" : borderColor,
            shadowColor: error ? Colors.red || "#C13B3B" : T.amber,
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: focused ? 1 : 0,
            shadowRadius: 6,
            elevation: focused ? 2 : 0,
          },
        ]}
      >
        {/* Floating label */}
        <Animated.Text
          style={[styles.fLabel, { top: labelTop, fontSize: labelSize, color: labelColor }]}
          pointerEvents="none"
        >
          {label}
        </Animated.Text>

        {/* PIN input — number-pad, max 4 digits */}
        <TextInput
          style={styles.fInput}
          value={value}
          onChangeText={(t) => onChangeText(t.replace(/\D/g, "").slice(0, 4))}
          onFocus={onFocus}
          onBlur={onBlur}
          secureTextEntry={secureTextEntry}
          keyboardType="number-pad"
          maxLength={4}
          placeholder=" "
          placeholderTextColor="transparent"
          autoCorrect={false}
        />

        {/* Eye toggle */}
        <TouchableOpacity
          style={styles.fIcon}
          onPress={onToggleSecure}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon
            name={showSecure ? "eye-outline" : "eye-off-outline"}
            size={14}
            color={focused ? T.amber : T.ink4}
          />
        </TouchableOpacity>
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
    <Text style={styles.topbarTitle}>Change PIN</Text>
    <View style={{ width: 34 }} />
  </View>
);

/* ─────────────────────────────────────────────
   MAIN SCREEN
───────────────────────────────────────────── */
const ChangePinScreen = ({ navigation }) => {
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
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

  const pressIn = () =>
    Animated.timing(btnScale, { toValue: 0.97, duration: 80, useNativeDriver: true }).start();
  const pressOut = () =>
    Animated.timing(btnScale, { toValue: 1, duration: 160, useNativeDriver: true }).start();

  const validatePin = (pin) => /^\d{4}$/.test(pin);

  const handleSubmit = useCallback(() => {
    const newErrors = {};
    if (!oldPin) newErrors.old = "Current PIN is required";
    if (!newPin) newErrors.new = "New PIN is required";
    if (!confirmPin) newErrors.confirm = "Confirm PIN is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (!validatePin(oldPin)) {
      setErrors({ old: "All digits must be numeric" });
      return;
    }
    if (!validatePin(newPin)) {
      setErrors({ new: "PIN must be exactly 4 digits" });
      return;
    }
    if (!validatePin(confirmPin)) {
      setErrors({ confirm: "PIN must be exactly 4 digits" });
      return;
    }

    if (newPin !== confirmPin) {
      setErrors({ confirm: "PINs do not match" });
      return;
    }
    if (oldPin === newPin) {
      setErrors({ new: "New PIN must differ from current" });
      return;
    }

    setErrors({});
    showAlert("success", "Success", "PIN changed successfully.");
  }, [oldPin, newPin, confirmPin]);

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
          {/* ── pw-head (PIN variant) ── */}
          <View style={styles.pwHead}>
            <View style={styles.pwHeadIc}>
              <Icon name="dialpad" size={20} color={T.amber} />
            </View>
            <Text style={styles.pwHeadTitle}>Change PIN</Text>
            <Text style={styles.pwHeadSub}>
              Update your 4-digit wallet PIN to keep your transactions secure
            </Text>
          </View>

          {/* ── Form body ── */}
          <View style={styles.formBody}>
            {/* Current PIN */}
            <FloatPinInput
              label="Current PIN"
              value={oldPin}
              onChangeText={(t) => { setOldPin(t); setErrors(prev => ({ ...prev, old: null })); }}
              secureTextEntry={!showOld}
              showSecure={showOld}
              onToggleSecure={() => setShowOld((v) => !v)}
              error={errors.old}
            />

            {/* New PIN */}
            <FloatPinInput
              label="New PIN"
              value={newPin}
              onChangeText={(t) => { setNewPin(t); setErrors(prev => ({ ...prev, new: null })); }}
              secureTextEntry={!showNew}
              showSecure={showNew}
              onToggleSecure={() => setShowNew((v) => !v)}
              error={errors.new}
            />

            {/* Confirm PIN */}
            <FloatPinInput
              label="Confirm New PIN"
              value={confirmPin}
              onChangeText={(t) => { setConfirmPin(t); setErrors(prev => ({ ...prev, confirm: null })); }}
              secureTextEntry={!showConfirm}
              showSecure={showConfirm}
              onToggleSecure={() => setShowConfirm((v) => !v)}
              error={errors.confirm}
            />

            {/* Tip box */}
            <View style={styles.tipBox}>
              <Icon name="shield-outline" size={14} color={T.ink4} style={{ marginTop: 1 }} />
              <Text style={styles.tipText}>
                Never share your PIN with anyone. Use a unique combination that's easy for you to remember but hard for others to guess.
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
                  <Text style={styles.btnSolidTxt}>Update PIN</Text>
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

export default ChangePinScreen;

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
    backgroundColor: '#0F172A',
    borderBottomWidth: 1,
    borderBottomColor: "rgba(15,14,13,0.04)",
    gap: 12,
  },
  topbarBack: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: "center",
    justifyContent: "center",
  },
  topbarTitle: {
    flex: 1,
    textAlign: "center",
    fontFamily: Fonts.SemiBold,
    fontSize: 18,
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
  },
  fError: {
    fontFamily: Fonts.Medium,
    fontSize: 10,
    color: Colors.red || "#C13B3B",
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
    fontSize: 20,
    color: T.ink,
    letterSpacing: 6,
  },
  fIcon: {
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
  },

  /* ── PIN dot row ── */
  pinDotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 14,
    marginBottom: 18,
    marginTop: 2,
  },
  pinDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: T.ink5,
    backgroundColor: "transparent",
  },
  pinDotOn: {
    backgroundColor: T.amber,
    borderColor: T.amber,
    shadowColor: T.amber,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },

  /* ── Tip box ── */
  tipBox: {
    flexDirection: "row",
    gap: 10,
    padding: 13,
    backgroundColor: Colors.white,
    borderRadius: 14,
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

});