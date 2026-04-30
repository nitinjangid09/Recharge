import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../../constants/Colors";
import Fonts from "../../constants/Fonts";

// ─── Alert Service (Consolidated) ──────────────────────────────────────────
let alertReference = null;

export const AlertService = {
  setAlertReference: (ref) => {
    alertReference = ref;
  },
  showAlert: (config) => {
    if (alertReference) {
      alertReference.show(config);
    } else {
      console.warn("[AlertService] No global alert provider registered.");
    }
  },
  hideAlert: () => {
    if (alertReference) {
      alertReference.hide();
    }
  },
};

const { width } = Dimensions.get("window");
const S = width / 375;

// ─── Type → accent color ──────────────────────────────────────────────────
const getColor = (type) => {
  switch (type) {
    case "success": return "#22C55E";
    case "error": return "#EF4444";
    case "warning": return "#F59E0B";
    case "theme": return Colors.finance_accent || "#d4b06a";
    default: return Colors.primary || "#6366F1";
  }
};

// ─── Type → icon name (MaterialCommunityIcons) ────────────────────────────
const getIcon = (type) => {
  switch (type) {
    case "success": return "check-circle-outline";
    case "error": return "close-circle-outline";
    case "warning": return "alert-circle-outline";
    case "theme": return "lock-open-outline";
    default: return "information-outline";
  }
};

const CustomAlert = ({
  visible,
  type = "info",
  title,
  message,
  onClose,
  onConfirm,
  confirmText = "OK",
  cancelText = "Cancel",
  isLoading = false,
}) => {
  const accentColor = getColor(type);

  const dialogScale = useRef(new Animated.Value(0.82)).current;
  const dialogFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(dialogFade, { toValue: 1, duration: 240, useNativeDriver: true }),
        Animated.spring(dialogScale, { toValue: 1, friction: 6, tension: 65, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(dialogFade, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(dialogScale, { toValue: 0.82, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.overlayBg, { opacity: dialogFade }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>

        <Animated.View style={[styles.alertBox, { transform: [{ scale: dialogScale }], opacity: dialogFade }]}>
          <View style={[styles.alertAccentBar, { backgroundColor: accentColor }]} />

          <View style={[styles.alertIconCircle, { backgroundColor: accentColor + "18", borderColor: accentColor + "35" }]}>
            <Icon name={getIcon(type)} size={36 * S} color={accentColor} />
          </View>

          <Text style={[styles.alertTitle, { color: accentColor }]}>{title}</Text>
          <Text style={styles.alertMessage}>{message}</Text>

          {isLoading ? (
            <ActivityIndicator size="large" color={accentColor} style={{ marginBottom: 24 * S }} />
          ) : (
            <View style={styles.btnRow}>
              {onConfirm && (
                <TouchableOpacity
                  style={[styles.alertBtn, styles.cancelBtn, { borderColor: accentColor + "34" }]}
                  onPress={onClose}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.alertBtnTxt, { color: "#64748B" }]}>{cancelText}</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={[styles.alertBtn, onConfirm ? { flex: 1.2 } : { width: "80%" }, { backgroundColor: accentColor }]}
                onPress={() => {
                  if (onConfirm) {
                    onConfirm();
                  } else {
                    onClose();
                  }
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.alertBtnTxt}>{onConfirm ? confirmText : "OK"}</Text>
              </TouchableOpacity>
            </View>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

export default CustomAlert;

const styles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.58)",
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  alertBox: {
    width: width * 0.82,
    backgroundColor: Colors.white,
    borderRadius: 22 * S,
    alignItems: "center",
    overflow: "hidden",    paddingBottom: 28 * S,
  },
  alertAccentBar: {
    width: "100%",
    height: 5 * S,
    marginBottom: 26 * S,
  },
  alertIconCircle: {
    width: 74 * S,
    height: 74 * S,
    borderRadius: 37 * S,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16 * S,
  },
  alertTitle: {
    fontSize: 20 * S,
    fontFamily: Fonts.Bold,
    marginBottom: 8 * S,
    textAlign: "center",
    paddingHorizontal: 20 * S,
  },
  alertMessage: {
    fontSize: 14 * S,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 24 * S,
    lineHeight: 21 * S,
    paddingHorizontal: 24 * S,
    fontFamily: Fonts.Medium,
  },
  btnRow: {
    flexDirection: "row",
    gap: 12 * S,
    width: "100%",
    paddingHorizontal: 24 * S,
    justifyContent: "center",
  },
  alertBtn: {
    paddingVertical: 14 * S,
    borderRadius: 14 * S,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelBtn: {
    flex: 1,
    backgroundColor: "transparent",
    borderWidth: 1.5,
  },
  alertBtnTxt: {
    color: "#fff",
    fontFamily: Fonts.Bold,
    fontSize: 16 * S,
    letterSpacing: 0.4,
  },
});