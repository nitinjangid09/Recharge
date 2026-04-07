/**
 * CustomAlert.jsx
 *
 * Usage — Standard alert only:
 *   <CustomAlert visible type="success" title="Done!" message="Saved." onClose={fn} />
 *
 * (Upload functionality moved to ImageUploadAlert.js)
 */

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
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../../constants/Colors";
import Fonts from "../../constants/Fonts";

const { width } = Dimensions.get("window");
const S = width / 375;

// ─── Type → accent color ──────────────────────────────────────────────────
const getColor = (type) => {
  switch (type) {
    case "success": return "#22C55E";
    case "error": return "#EF4444";
    case "warning": return "#F59E0B";
    default: return Colors.primary || "#6366F1";
  }
};

// ─── Type → icon name (MaterialCommunityIcons) ────────────────────────────
const getIcon = (type) => {
  switch (type) {
    case "success": return "check-circle-outline";
    case "error": return "close-circle-outline";
    case "warning": return "alert-circle-outline";
    default: return "information-outline";
  }
};

const CustomAlert = ({
  visible,
  type = "info",
  title,
  message,
  onClose,
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

          <TouchableOpacity
            style={[styles.alertBtn, { backgroundColor: accentColor }]}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.alertBtnTxt}>OK</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default CustomAlert;

const styles = StyleSheet.create({
  overlay: {
    flex: 1, justifyContent: "center", alignItems: "center",
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.58)",
  },
  alertBox: {
    width: width * 0.82,
    backgroundColor: "#fff",
    borderRadius: 22 * S,
    alignItems: "center",
    overflow: "hidden",
    elevation: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    paddingBottom: 28 * S,
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
  alertBtn: {
    width: "80%",
    paddingVertical: 14 * S,
    borderRadius: 14 * S,
    alignItems: "center",
  },
  alertBtnTxt: {
    color: "#fff",
    fontFamily: Fonts.Bold,
    fontSize: 16 * S,
    letterSpacing: 0.4,
  },
});