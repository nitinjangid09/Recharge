/**
 * CustomAlert.jsx
 *
 * Usage — Standard alert:
 *   <CustomAlert visible type="success" title="Done!" message="Saved." onClose={fn} />
 *
 * Usage — Image upload sheet:
 *   <CustomAlert visible type="upload" title="Upload" message="Choose source"
 *     onClose={fn} onCamera={fn} onGallery={fn} onFile={fn} />
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
import LinearGradient from "react-native-linear-gradient";
import Colors from "../constants/Colors";
import Fonts from "../constants/Fonts";

const { width } = Dimensions.get("window");
const S = width / 375;

// ─── Type → accent color ──────────────────────────────────────────────────
const getColor = (type) => {
  switch (type) {
    case "success": return "#22C55E";
    case "error": return "#EF4444";
    case "warning": return "#F59E0B";
    case "upload": return Colors.finance_accent || "#D4A843";
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

// ─── Upload option cards config ───────────────────────────────────────────
const UPLOAD_OPTIONS = [
  {
    key: "camera",
    icon: "camera",
    label: "Camera",
    subtitle: "Capture",
    bg: "#EFF6FF",
    iconColor: "#2563EB",
    delay: 60,
  },
  {
    key: "gallery",
    icon: "image-multiple",
    label: "Gallery",
    subtitle: "Browse",
    bg: "#ECFDF5",
    iconColor: "#059669",
    delay: 120,
  },
  {
    key: "file",
    icon: "folder-open",
    label: "Files",
    subtitle: "Select",
    bg: "#FDF2F8",
    iconColor: "#DB2777",
    delay: 180,
  },
];

// ─── Animated upload card ─────────────────────────────────────────────────
const UploadCard = ({ option, onPress }) => {
  const slideY = useRef(new Animated.Value(30)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideY, {
        toValue: 0,
        duration: 350,
        delay: option.delay,
        useNativeDriver: true,
      }),
      Animated.timing(fade, {
        toValue: 1,
        duration: 250,
        delay: option.delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const pressIn = () => Animated.spring(btnScale, { toValue: 0.95, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={[styles.uploadCardWrap, { opacity: fade, transform: [{ translateY: slideY }, { scale: btnScale }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[styles.uploadCard, { backgroundColor: option.bg }]}
      >
        <View style={styles.uploadCardIconWrap}>
          <Icon name={option.icon} size={22 * S} color={option.iconColor} />
        </View>
        <Text style={[styles.uploadCardLabel, { color: option.iconColor }]}>{option.label}</Text>
        <Text style={styles.uploadCardSub}>{option.subtitle}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  CustomAlert
// ═══════════════════════════════════════════════════════════════════════════
const CustomAlert = ({
  visible,
  type = "info",
  title,
  message,
  onClose,
  onCamera,
  onGallery,
  onFile,
}) => {
  const isUpload = type === "upload";
  const accentColor = getColor(type);

  // Standard dialog animations
  const dialogScale = useRef(new Animated.Value(0.82)).current;
  const dialogFade = useRef(new Animated.Value(0)).current;

  // Upload sheet animations
  const sheetY = useRef(new Animated.Value(600)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;
  const titleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      if (isUpload) {
        Animated.parallel([
          Animated.timing(backdropOp, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.spring(sheetY, { toValue: 0, bounciness: 6, speed: 11, useNativeDriver: true }),
          Animated.timing(titleAnim, { toValue: 1, duration: 350, delay: 150, useNativeDriver: true }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(dialogFade, { toValue: 1, duration: 240, useNativeDriver: true }),
          Animated.spring(dialogScale, { toValue: 1, friction: 6, tension: 65, useNativeDriver: true }),
        ]).start();
      }
    } else {
      if (isUpload) {
        Animated.parallel([
          Animated.timing(backdropOp, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(sheetY, { toValue: 600, duration: 230, useNativeDriver: true }),
          Animated.timing(titleAnim, { toValue: 0, duration: 120, useNativeDriver: true }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(dialogFade, { toValue: 0, duration: 180, useNativeDriver: true }),
          Animated.timing(dialogScale, { toValue: 0.82, duration: 180, useNativeDriver: true }),
        ]).start();
      }
    }
  }, [visible]);

  const handleOption = (cb) => {
    onClose?.();
    setTimeout(() => cb?.(), 260);
  };

  if (!visible) return null;

  // ══════════════════════════════════════════════════════════════════════
  //  UPLOAD  →  full redesign bottom-sheet
  // ══════════════════════════════════════════════════════════════════════
  if (isUpload) {
    return (
      <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>

        {/* Tap-to-dismiss backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOp }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>

        {/* Bottom sheet */}
        <Animated.View style={[styles.uploadSheet, { transform: [{ translateY: sheetY }] }]}>

          {/* Drag handle */}
          <View style={styles.uploadHandle} />

          {/* Header */}
          <Animated.View style={[styles.uploadHeader, { opacity: titleAnim }]}>
            <View style={[styles.uploadHeaderIcon, { backgroundColor: accentColor + "15", borderColor: accentColor + "35" }]}>
              <Icon name="cloud-upload" size={24 * S} color={accentColor} />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.uploadTitle}>{title || "Upload Photo"}</Text>
              <Text style={styles.uploadSubtitle}>{message || "Choose a source to continue"}</Text>
            </View>

            <TouchableOpacity onPress={onClose} style={styles.uploadCloseBtn}>
              <Icon name="close" size={14 * S} color="#FFF" />
            </TouchableOpacity>
          </Animated.View>

          {/* Section label */}
          <View style={styles.sectionRow}>
            <View style={styles.sectionLine} />
            <Text style={styles.sectionLabel}>CHOOSE SOURCE</Text>
            <View style={styles.sectionLine} />
          </View>

          {/* 3-column card grid */}
          <View style={styles.uploadCardRow}>
            {UPLOAD_OPTIONS.map((opt) => (
              <UploadCard
                key={opt.key}
                option={opt}
                onPress={() =>
                  handleOption(
                    opt.key === "camera" ? onCamera :
                      opt.key === "gallery" ? onGallery : onFile
                  )
                }
              />
            ))}
          </View>

          {/* Footer */}
          <View style={styles.uploadFooter}>
            <TouchableOpacity style={styles.uploadCancelBtn} onPress={onClose} activeOpacity={0.75}>
              <Text style={styles.uploadCancelTxt}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <View style={{ height: Platform.OS === "ios" ? 28 : 12 }} />
        </Animated.View>
      </Modal>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  //  SUCCESS / ERROR / WARNING / INFO  →  centre dialog
  // ══════════════════════════════════════════════════════════════════════
  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Animated.View style={[styles.overlayBg, { opacity: dialogFade }]} />

        <Animated.View style={[styles.alertBox, { transform: [{ scale: dialogScale }], opacity: dialogFade }]}>

          {/* Coloured top accent bar */}
          <View style={[styles.alertAccentBar, { backgroundColor: accentColor }]} />

          {/* Icon circle */}
          <View style={[styles.alertIconCircle, { backgroundColor: accentColor + "18", borderColor: accentColor + "35", shadowColor: accentColor }]}>
            <Icon name={getIcon(type)} size={36 * S} color={accentColor} />
          </View>

          <Text style={[styles.alertTitle, { color: accentColor }]}>{title}</Text>
          <Text style={styles.alertMessage}>{message}</Text>

          {/* CTA button */}
          <TouchableOpacity
            style={[styles.alertBtn, { backgroundColor: accentColor, shadowColor: accentColor }]}
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

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({

  // ── Standard alert dialog ──────────────────────────────────────────────
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
    elevation: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 22,
    paddingBottom: 28 * S,
  },
  alertAccentBar: {
    width: "100%",
    height: 5 * S,
    borderTopLeftRadius: 22 * S,
    borderTopRightRadius: 22 * S,
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
    shadowOpacity: 0.2,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  alertTitle: {
    fontSize: 20 * S,
    fontFamily: Fonts.Bold,
    marginBottom: 8 * S,
    textAlign: "center",
    letterSpacing: -0.2,
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
    width: width * 0.82 - 48 * S,
    paddingVertical: 14 * S,
    borderRadius: 14 * S,
    alignItems: "center",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  alertBtnTxt: {
    color: "#fff",
    fontFamily: Fonts.Bold,
    fontSize: 16 * S,
    letterSpacing: 0.4,
  },

  // ── Upload bottom-sheet ────────────────────────────────────────────────
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  uploadSheet: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 24 * S,
    borderTopRightRadius: 24 * S,
    paddingHorizontal: 16 * S,
    paddingTop: 8 * S,
    paddingBottom: Platform.OS === "ios" ? 30 * S : 16 * S,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  uploadHandle: {
    alignSelf: "center",
    width: 36 * S,
    height: 4,
    backgroundColor: "#E2E8F0",
    borderRadius: 2,
    marginBottom: 20 * S,
  },
  uploadHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12 * S,
    marginBottom: 16 * S,
  },
  uploadHeaderIcon: {
    width: 46 * S,
    height: 46 * S,
    borderRadius: 14 * S,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadTitle: {
    color: "#0F172A",
    fontSize: 18 * S,
    fontFamily: Fonts.Bold,
    letterSpacing: -0.4,
  },
  uploadSubtitle: {
    color: "#64748B",
    fontSize: 13 * S,
    fontFamily: Fonts.Medium,
    marginTop: 2,
  },
  uploadCloseBtn: {
    width: 28 * S,
    height: 28 * S,
    borderRadius: 14 * S,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
  },
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10 * S,
    marginBottom: 16 * S,
  },
  sectionLine: { flex: 1, height: 1, backgroundColor: Colors.primary },
  sectionLabel: {
    color: Colors.primary,
    fontSize: 10 * S,
    fontFamily: Fonts.Bold,
    letterSpacing: 1.2,
  },
  uploadCardRow: {
    flexDirection: "row",
    marginBottom: 20 * S,
    marginHorizontal: -4 * S,
  },
  uploadCardWrap: { flex: 1, padding: 10 * S },
  uploadCard: {
    borderRadius: 16 * S,
    padding: 8 * S,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },
  uploadCardIconWrap: {
    width: 44 * S,
    height: 44 * S,
    borderRadius: 12 * S,
    backgroundColor: "rgba(255,255,255,0.7)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadCardLabel: {
    fontSize: 13 * S,
    fontFamily: Fonts.Bold,
  },
  uploadCardSub: {
    color: "#64748B",
    fontSize: 10 * S,
    fontFamily: Fonts.Medium,
    marginTop: 2 * S,
  },
  uploadFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.primary,
    paddingTop: 18 * S,
  },
  uploadCancelBtn: {
    alignItems: "center",
    paddingVertical: 14 * S,
    borderRadius: 12 * S,
    backgroundColor: Colors.primary,
  },
  uploadCancelTxt: {
    color: Colors.white,
    fontFamily: Fonts.Bold,
    fontSize: 15 * S,
  },
});