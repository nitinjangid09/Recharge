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
import Colors from "../constants/Colors";

const { width } = Dimensions.get("window");
const S = width / 375;

// ─── Emoji icons — zero extra libraries ───────────────────────────────────
const ICON = {
  success: "✅",
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
  upload: "⬆️",
  camera: "📷",
  gallery: "🖼️",
  file: "📁",
};

// ─── Accent colour per type ───────────────────────────────────────────────
const getColor = (type) => {
  switch (type) {
    case "success": return Colors.success || "#28a745";
    case "error": return Colors.error || "#dc3545";
    case "warning": return Colors.warning || "#f0ad4e";
    case "upload": return Colors.primary || "#A78BFA";
    default: return Colors.primary || "#6366F1";
  }
};

// ─── Upload option rows ───────────────────────────────────────────────────
const UPLOAD_OPTIONS = [
  { key: "camera", emoji: ICON.camera, label: "Take a Photo", subtitle: "Use your device camera", color: "#60A5FA", delay: 60 },
  { key: "gallery", emoji: ICON.gallery, label: "Choose from Gallery", subtitle: "Pick from your photo library", color: "#34D399", delay: 130 },
  { key: "file", emoji: ICON.file, label: "Browse Files", subtitle: "Select from file storage", color: "#F472B6", delay: 200 },
];

const UploadOptionRow = ({ option, onPress }) => {
  const slide = useRef(new Animated.Value(50)).current;
  const fade = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slide, {
        toValue: 0, duration: 380, delay: option.delay,
        useNativeDriver: true, easing: (t) => 1 - Math.pow(1 - t, 3),
      }),
      Animated.timing(fade, {
        toValue: 1, duration: 300, delay: option.delay, useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const pressIn = () => Animated.spring(btnScale, { toValue: 0.95, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }, { scale: btnScale }] }}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={styles.optionRow}
      >
        {/* Icon bubble */}
        <View style={[styles.optionBubble, { backgroundColor: option.color + "22", borderColor: option.color + "55" }]}>
          <Text style={styles.optionEmoji}>{option.emoji}</Text>
        </View>

        {/* Labels */}
        <View style={styles.optionTextWrap}>
          <Text style={styles.optionLabel}>{option.label}</Text>
          <Text style={styles.optionSub}>{option.subtitle}</Text>
        </View>

        {/* Chevron */}
        <Text style={styles.chevron}>›</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  CustomAlert
//
//  Props
//  ─────────────────────────────────────────────────────────────────────────
//  visible    {boolean}                         — show / hide
//  type       {"success"|"error"|"warning"|     — alert variant
//              "info"|"upload"}
//  title      {string}                          — heading text
//  message    {string}                          — body text
//  onClose    {() => void}                      — dismiss callback
//
//  ── upload-only props ──────────────────────────────────────────────────
//  onCamera   {() => void}
//  onGallery  {() => void}
//  onFile     {() => void}
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

  // ── Standard dialog animations ────────────────────────────────────────
  const dialogScale = useRef(new Animated.Value(0.85)).current;
  const dialogFade = useRef(new Animated.Value(0)).current;

  // ── Upload sheet animations ───────────────────────────────────────────
  const sheetY = useRef(new Animated.Value(600)).current;
  const backdropOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      if (isUpload) {
        Animated.parallel([
          Animated.timing(backdropOp, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.spring(sheetY, { toValue: 0, bounciness: 5, speed: 14, useNativeDriver: true }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(dialogFade, { toValue: 1, duration: 260, useNativeDriver: true }),
          Animated.spring(dialogScale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
        ]).start();
      }
    } else {
      if (isUpload) {
        Animated.parallel([
          Animated.timing(backdropOp, { toValue: 0, duration: 200, useNativeDriver: true }),
          Animated.timing(sheetY, { toValue: 600, duration: 230, useNativeDriver: true }),
        ]).start();
      } else {
        Animated.parallel([
          Animated.timing(dialogFade, { toValue: 0, duration: 180, useNativeDriver: true }),
          Animated.timing(dialogScale, { toValue: 0.85, duration: 180, useNativeDriver: true }),
        ]).start();
      }
    }
  }, [visible]);

  const handleUploadOption = (cb) => {
    onClose?.();
    setTimeout(() => cb?.(), 260);
  };

  if (!visible) return null;

  // ══════════════════════════════════════════════════════════════════════
  //  UPLOAD → animated bottom-sheet
  // ══════════════════════════════════════════════════════════════════════
  if (isUpload) {
    return (
      <Modal transparent visible={visible} animationType="none" onRequestClose={onClose} statusBarTranslucent>
        {/* Tap-to-dismiss backdrop */}
        <Animated.View style={[styles.backdrop, { opacity: backdropOp }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        </Animated.View>

        {/* Bottom sheet */}
        <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}>

          {/* Drag handle */}
          <View style={styles.sheetHandle} />

          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderLeft}>
              <View style={[styles.sheetIconCircle, { backgroundColor: accentColor + "22", borderColor: accentColor + "44" }]}>
                <Text style={{ fontSize: 22 }}>{ICON.upload}</Text>
              </View>
              <View>
                <Text style={styles.sheetTitle}>{title || "Upload Image"}</Text>
                <Text style={styles.sheetSubtitle}>{message || "Choose a source to continue"}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.sheetCloseBtn}>
              <Text style={styles.sheetCloseTxt}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Upload option rows */}
          <View style={styles.optionsList}>
            {UPLOAD_OPTIONS.map((opt) => (
              <UploadOptionRow
                key={opt.key}
                option={opt}
                onPress={() =>
                  handleUploadOption(
                    opt.key === "camera" ? onCamera :
                      opt.key === "gallery" ? onGallery : onFile
                  )
                }
              />
            ))}
          </View>

          {/* Cancel */}
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelTxt}>Cancel</Text>
          </TouchableOpacity>

          <View style={{ height: Platform.OS === "ios" ? 24 : 10 }} />
        </Animated.View>
      </Modal>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  //  SUCCESS / ERROR / WARNING / INFO → centre dialog
  // ══════════════════════════════════════════════════════════════════════
  return (
    <Modal transparent visible={visible} animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.overlay}>
        {/* Animated dim layer */}
        <Animated.View style={[styles.overlayBg, { opacity: dialogFade }]} />

        {/* Alert card */}
        <Animated.View style={[styles.alertBox, { transform: [{ scale: dialogScale }], opacity: dialogFade }]}>

          {/* Icon circle */}
          <View style={[styles.iconCircle, { backgroundColor: accentColor + "18", borderColor: accentColor + "40", shadowColor: accentColor }]}>
            <Text style={styles.iconEmoji}>{ICON[type] || ICON.info}</Text>
          </View>

          {/* Title */}
          <Text style={[styles.alertTitle, { color: accentColor }]}>{title}</Text>

          {/* Message */}
          <Text style={styles.alertMessage}>{message}</Text>

          {/* OK button */}
          <TouchableOpacity
            style={[styles.alertBtn, { backgroundColor: accentColor, shadowColor: accentColor }]}
            onPress={onClose}
            activeOpacity={0.82}
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

  // ── Centre dialog ─────────────────────────────────────────────────────
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  overlayBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  alertBox: {
    width: width * 0.82,
    backgroundColor: "#fff",
    borderRadius: 20 * S,
    paddingHorizontal: 24 * S,
    paddingVertical: 32 * S,
    alignItems: "center",
    elevation: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  iconCircle: {
    width: 70 * S,
    height: 70 * S,
    borderRadius: 35 * S,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 18 * S,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  iconEmoji: { fontSize: 30 },
  alertTitle: {
    fontSize: 20 * S,
    fontWeight: "700",
    marginBottom: 10 * S,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  alertMessage: {
    fontSize: 14 * S,
    color: "#555",
    textAlign: "center",
    marginBottom: 24 * S,
    lineHeight: 21 * S,
    paddingHorizontal: 4 * S,
  },
  alertBtn: {
    width: "100%",
    paddingVertical: 13 * S,
    borderRadius: 12 * S,
    alignItems: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 5,
  },
  alertBtnTxt: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16 * S,
    letterSpacing: 0.3,
  },

  // ── Upload bottom-sheet ────────────────────────────────────────────────
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  sheet: {
    position: "absolute",
    bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.bg || "#1E293B",
    borderTopLeftRadius: 26 * S,
    borderTopRightRadius: 26 * S,
    paddingHorizontal: 20 * S,
    paddingTop: 12 * S,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 20,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 38 * S,
    height: 4,
    backgroundColor: "#475569",
    borderRadius: 2,
    marginBottom: 16 * S,
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14 * S,
  },
  sheetHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12 * S,
  },
  sheetIconCircle: {
    width: 46 * S,
    height: 46 * S,
    borderRadius: 13 * S,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetTitle: {
    color: Colors.text || "#F1F5F9",
    fontSize: 17 * S,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  sheetSubtitle: {
    color: Colors.gray || "#64748B",
    fontSize: 12 * S,
    marginTop: 2,
  },
  sheetCloseBtn: {
    width: 30 * S,
    height: 30 * S,
    borderRadius: 15 * S,
    backgroundColor: "#334155",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCloseTxt: {
    color: "#94A3B8",
    fontSize: 13 * S,
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#334155",
    marginBottom: 10 * S,
  },

  // Option rows
  optionsList: { gap: 4, marginBottom: 14 * S },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14 * S,
    paddingVertical: 13 * S,
    paddingHorizontal: 12 * S,
    borderRadius: 14 * S,
    backgroundColor: Colors.bg2 || "#0F172A",
    marginBottom: 4,
  },
  optionBubble: {
    width: 46 * S,
    height: 46 * S,
    borderRadius: 13 * S,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  optionEmoji: { fontSize: 20 },
  optionTextWrap: { flex: 1 },
  optionLabel: {
    color: Colors.text || "#E2E8F0",
    fontSize: 15 * S,
    fontWeight: "600",
  },
  optionSub: {
    color: Colors.gray || "#475569",
    fontSize: 12 * S,
    marginTop: 2,
  },
  chevron: { color: "#475569", fontSize: 22, paddingLeft: 4 },

  // Cancel
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 14 * S,
    borderRadius: 14 * S,
    backgroundColor: "#334155",
  },
  cancelTxt: {
    color: Colors.gray || "#94A3B8",
    fontWeight: "600",
    fontSize: 15 * S,
  },
});