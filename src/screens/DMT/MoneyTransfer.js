import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import Fonts from "../../constants/Fonts";
import CustomAlert from "../../componets/CustomAlert";
import { fadeIn, slideUp, buttonPress } from "../../utils/ScreenAnimations";

// ─── Responsive Scaling ───────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get("window");
const BASE_W = 390;
const BASE_H = 844;
const scale = (s) => Math.round((SW / BASE_W) * s);
const vs = (s) => Math.round((SH / BASE_H) * s);
const rs = (s) => Math.round(Math.sqrt((SW * SH) / (BASE_W * BASE_H)) * s);

// Quick amount chips
const QUICK_AMOUNTS = ["500", "1000", "2000", "5000", "10000"];

const MoneyTransferScreen = ({ route }) => {
  const account = route?.params?.account || {
    name: "Rahul Sharma",
    bank: "State Bank of India",
    accountNumber: "XXXXXX4589",
    ifsc: "SBIN0004589",
  };

  const [amount, setAmount] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmModal, setConfirmModal] = useState(false);
  const [otpModal, setOtpModal] = useState(false);

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

  // Modal animations
  const confirmScale = useRef(new Animated.Value(0.88)).current;
  const confirmOp = useRef(new Animated.Value(0)).current;
  const otpScale = useRef(new Animated.Value(0.88)).current;
  const otpOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([fadeIn(headerOp, 500), slideUp(headerTY, 500)]).start();
    setTimeout(() => {
      Animated.parallel([fadeIn(formOp, 500), slideUp(formTY, 500)]).start();
    }, 180);
  }, []);

  const animateModal = (scaleAnim, opAnim) => {
    scaleAnim.setValue(0.88);
    opAnim.setValue(0);
    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
      Animated.timing(opAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => { if (confirmModal) animateModal(confirmScale, confirmOp); }, [confirmModal]);
  useEffect(() => { if (otpModal) animateModal(otpScale, otpOp); }, [otpModal]);

  // Validation
  const validateAmount = () => {
    const n = parseFloat(amount);
    if (!amount) { showAlert("error", "Invalid Amount", "Please enter an amount"); return false; }
    if (isNaN(n) || n <= 0) { showAlert("error", "Invalid Amount", "Enter a valid transfer amount"); return false; }
    return true;
  };

  const validateOtp = () => {
    if (!otp) { showAlert("error", "Invalid OTP", "Please enter the OTP"); return false; }
    if (!/^\d{6}$/.test(otp)) { showAlert("error", "Invalid OTP", "OTP must be 6 digits"); return false; }
    return true;
  };

  const handleConfirm = () => {
    if (validateAmount()) {
      buttonPress(btnScale).start(() => setConfirmModal(true));
    }
  };

  const handleSendOtp = () => {
    setConfirmModal(false);
    setTimeout(() => setOtpModal(true), 300);
  };

  const handleTransfer = () => {
    if (validateOtp()) {
      setOtpModal(false);
      setAmount("");
      setOtp("");
      showAlert("success", "Transfer Successful", `₹${amount} transferred to ${account.name} successfully!`);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ══ HEADER — matches DmtLogin ══ */}
        <Animated.View
          style={[styles.header, { opacity: headerOp, transform: [{ translateY: headerTY }] }]}
        >
          {/* Badge */}
          <View style={styles.secureBadge}>
            <Text style={styles.secureBadgeIcon}>💸</Text>
            <Text style={styles.secureBadgeTxt}>SECURED TRANSFER</Text>
          </View>

          {/* Two-tone title */}
          <View style={styles.titleRow}>
            <Text style={styles.titleAccent}>DMT </Text>
            <Text style={styles.titleWhite}>Transfer</Text>
          </View>
          <Text style={styles.headerSub}>Secure Domestic Money Transfer</Text>

          {/* Recipient chip */}
          <View style={styles.recipientChip}>
            <View style={styles.recipientAvatar}>
              <Text style={styles.recipientAvatarTxt}>
                {account.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.recipientName}>{account.name}</Text>
              <Text style={styles.recipientBank}>{account.bank}  •  {account.accountNumber}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedTxt}>✓</Text>
            </View>
          </View>
        </Animated.View>

        {/* ══ FORM BODY ══ */}
        <Animated.ScrollView
          style={[styles.scroll, { opacity: formOp, transform: [{ translateY: formTY }] }]}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.formCard}>
            <Text style={styles.fieldHeading}>ENTER TRANSFER AMOUNT</Text>

            {/* Amount input row */}
            <View style={styles.inputRow}>
              <Text style={styles.currencySymbol}>₹</Text>
              <View style={styles.inputDivider} />
              <TextInput
                style={styles.input}
                placeholder="Enter Amount"
                placeholderTextColor={Colors.gray_BD}
                keyboardType="numeric"
                value={amount}
                onChangeText={(t) => setAmount(t.replace(/[^0-9.]/g, ""))}
                maxLength={10}
              />
              {amount.length > 0 && (
                <TouchableOpacity
                  onPress={() => setAmount("")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.clearIcon}>✕</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Hint */}
            <View style={styles.hintRow}>
              <Text style={styles.hintDot}>•</Text>
              <Text style={styles.hintTxt}>
                Daily limit: ₹25,000 per transaction
              </Text>
            </View>

            {/* Quick amount chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.quickRow}
              contentContainerStyle={{ gap: scale(8), paddingRight: scale(4) }}
            >
              {QUICK_AMOUNTS.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[styles.quickChip, amount === q && styles.quickChipActive]}
                  onPress={() => setAmount(q)}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.quickChipTxt, amount === q && styles.quickChipTxtActive]}>
                    ₹{Number(q).toLocaleString("en-IN")}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Amount summary (shows when filled) */}
            {amount.length > 0 && Number(amount) > 0 && (
              <View style={styles.summaryBox}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLbl}>Transfer Amount</Text>
                  <Text style={styles.summaryVal}>₹{Number(amount).toLocaleString("en-IN")}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLbl}>Service Charge</Text>
                  <Text style={styles.summaryVal}>₹0.00</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLbl, { color: Colors.primary, fontWeight: "800" }]}>Total Debit</Text>
                  <Text style={[styles.summaryVal, { color: Colors.accent, fontWeight: "900", fontSize: rs(14) }]}>
                    ₹{Number(amount).toLocaleString("en-IN")}
                  </Text>
                </View>
              </View>
            )}

            {/* Proceed button */}
            <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: vs(20) }}>
              <TouchableOpacity
                style={styles.button}
                onPress={handleConfirm}
                activeOpacity={0.88}
              >
                <Text style={styles.buttonText}>Proceed Transfer</Text>
                <Text style={styles.btnArrowTxt}>→</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Security note */}
          <View style={styles.secureNote}>
            <Text style={styles.secureNoteIcon}>🔐</Text>
            <Text style={styles.secureNoteTxt}>
              All transactions are encrypted end-to-end and verified via OTP for your safety.
            </Text>
          </View>
        </Animated.ScrollView>
      </KeyboardAvoidingView>

      {/* ══ CONFIRM MODAL ══ */}
      <Modal visible={confirmModal} transparent animationType="none" onRequestClose={() => setConfirmModal(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalCard, { opacity: confirmOp, transform: [{ scale: confirmScale }] }]}>

            {/* Icon */}
            <View style={[styles.modalIconWrap, { backgroundColor: Colors.accent + "15" }]}>
              <Text style={styles.modalIcon}>💸</Text>
            </View>

            <Text style={styles.modalTitle}>Confirm Transfer</Text>
            <Text style={styles.modalSub}>
              You are about to transfer
            </Text>

            {/* Amount highlight */}
            <View style={styles.amountHighlight}>
              <Text style={styles.amountHighlightTxt}>₹{Number(amount).toLocaleString("en-IN")}</Text>
            </View>

            <Text style={styles.modalRecipient}>
              to <Text style={{ color: Colors.primary, fontWeight: "800" }}>{account.name}</Text>
            </Text>
            <Text style={styles.modalBankInfo}>{account.bank}  •  {account.accountNumber}</Text>

            {/* Buttons */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setConfirmModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={handleSendOtp}
                activeOpacity={0.88}
              >
                <Text style={styles.modalConfirmTxt}>Send OTP</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ══ OTP MODAL ══ */}
      <Modal visible={otpModal} transparent animationType="none" onRequestClose={() => setOtpModal(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View style={[styles.modalCard, { opacity: otpOp, transform: [{ scale: otpScale }] }]}>

            <View style={[styles.modalIconWrap, { backgroundColor: Colors.whiteOpacity_10 }]}>
              <Text style={styles.modalIcon}>💬</Text>
            </View>

            <Text style={styles.modalTitle}>Verify OTP</Text>
            <Text style={styles.modalSub}>
              OTP sent to your registered mobile number
            </Text>

            {/* OTP input */}
            <View style={[styles.inputRow, { marginTop: vs(14), marginBottom: vs(4) }]}>
              <TextInput
                style={[styles.input, { flex: 1, textAlign: "center", fontSize: rs(22), letterSpacing: scale(8), fontWeight: "800" }]}
                placeholder="• • • • • •"
                placeholderTextColor={Colors.gray_BD}
                keyboardType="number-pad"
                value={otp}
                onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, ""))}
                maxLength={6}
                autoFocus
              />
            </View>

            <View style={styles.hintRow}>
              <Text style={styles.hintDot}>•</Text>
              <Text style={styles.hintTxt}>Enter 6-digit OTP sent to your mobile</Text>
            </View>

            <TouchableOpacity
              style={[styles.button, { marginTop: vs(16) }]}
              onPress={handleTransfer}
              activeOpacity={0.88}
            >
              <Text style={styles.buttonText}>Verify &amp; Transfer</Text>
            </TouchableOpacity>

            <View style={styles.otpFooter}>
              <TouchableOpacity>
                <Text style={styles.resendTxt}>Resend OTP</Text>
              </TouchableOpacity>
              <Text style={styles.otpDivider}>|</Text>
              <TouchableOpacity onPress={() => setOtpModal(false)}>
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
    </SafeAreaView>
  );
};

export default MoneyTransferScreen;

// ══════════════════════════════════════════════════════════════════════════════
//  STYLES
// ══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  scroll: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { padding: scale(16), paddingBottom: vs(50) },

  // ── Header (DmtLogin style) ──
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: scale(20),
    paddingTop: vs(16),
    paddingBottom: vs(26),
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
  headerSub: { fontFamily: Fonts.Medium, color: Colors.whiteOpacity_65, fontSize: rs(13), fontWeight: "500", marginBottom: vs(18) },

  // Recipient chip in header
  recipientChip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.whiteOpacity_10,
    borderWidth: 1, borderColor: Colors.whiteOpacity_18,
    borderRadius: scale(14), padding: scale(10), gap: scale(10),
  },
  recipientAvatar: {
    width: scale(38), height: scale(38), borderRadius: scale(10),
    backgroundColor: Colors.accent, alignItems: "center", justifyContent: "center",
  },
  recipientAvatarTxt: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(13), fontWeight: "900" },
  recipientName: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(13), fontWeight: "800" },
  recipientBank: { fontFamily: Fonts.Regular, color: Colors.whiteOpacity_65, fontSize: rs(10), marginTop: vs(2) },
  verifiedBadge: {
    width: scale(24), height: scale(24), borderRadius: scale(12),
    backgroundColor: "#16A34A", alignItems: "center", justifyContent: "center",
  },
  verifiedTxt: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(10), fontWeight: "900" },

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

  // Input
  inputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.gray_FA, borderRadius: scale(14),
    borderWidth: 1, borderColor: Colors.gray_EB,
    paddingHorizontal: scale(14), minHeight: vs(54),
    marginBottom: vs(8),
  },
  currencySymbol: { fontFamily: Fonts.Bold, color: Colors.primary, fontSize: rs(20), fontWeight: "900", marginRight: scale(4) },
  inputDivider: { width: 1, height: vs(20), backgroundColor: Colors.gray_E0, marginRight: scale(10) },
  input: { fontFamily: Fonts.Bold, flex: 1, fontSize: rs(15), color: Colors.gray_21, padding: 0, fontWeight: "700" },
  clearIcon: { fontFamily: Fonts.Bold, color: Colors.gray_BD, fontSize: rs(14), fontWeight: "700", marginLeft: scale(6) },

  // Hint
  hintRow: { flexDirection: "row", alignItems: "flex-start", gap: scale(5), marginBottom: vs(2) },
  hintDot: { color: Colors.accent, fontSize: rs(12), lineHeight: rs(16), marginTop: vs(1) },
  hintTxt: { fontFamily: Fonts.Regular, color: Colors.gray_9E, fontSize: rs(10), lineHeight: rs(16), flex: 1 },

  // Quick chips
  quickRow: { marginTop: vs(12), marginBottom: vs(4) },
  quickChip: {
    paddingHorizontal: scale(12), paddingVertical: vs(7),
    borderRadius: scale(20), backgroundColor: Colors.gray_F0,
    borderWidth: 1, borderColor: Colors.gray_E0,
  },
  quickChipActive: { backgroundColor: Colors.accent + "18", borderColor: Colors.accent },
  quickChipTxt: { fontFamily: Fonts.Medium, fontSize: rs(11), color: Colors.gray_75, fontWeight: "600" },
  quickChipTxtActive: { fontFamily: Fonts.Bold, color: Colors.accent, fontWeight: "800" },

  // Summary
  summaryBox: {
    marginTop: vs(16), backgroundColor: Colors.bg_F8,
    borderRadius: scale(12), padding: scale(12),
    borderWidth: 1, borderColor: Colors.gray_EB,
  },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: vs(5) },
  summaryDivider: { height: 1, backgroundColor: Colors.gray_EB },
  summaryLbl: { fontFamily: Fonts.Medium, fontSize: rs(11), color: Colors.gray_9E, fontWeight: "600" },
  summaryVal: { fontFamily: Fonts.Bold, fontSize: rs(12), color: Colors.primary, fontWeight: "700" },

  // Button
  button: {
    backgroundColor: Colors.accent, borderRadius: scale(14),
    padding: vs(15), flexDirection: "row",
    alignItems: "center", justifyContent: "center", gap: scale(10),
    elevation: 3, shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.35, shadowRadius: 8,
  },
  buttonText: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(15), fontWeight: "900", letterSpacing: 0.4 },
  btnArrow: {
    width: scale(26), height: scale(26), borderRadius: scale(13),
    backgroundColor: Colors.whiteOpacity_10,
    alignItems: "center", justifyContent: "center",
  },
  btnArrowTxt: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(13), fontWeight: "900" },

  // Security note
  secureNote: {
    flexDirection: "row", alignItems: "flex-start",
    gap: scale(8), marginTop: vs(16),
    backgroundColor: Colors.bg_F8, borderRadius: scale(12),
    padding: scale(12), borderWidth: 1, borderColor: Colors.gray_EB,
  },
  secureNoteIcon: { fontSize: rs(14), marginTop: vs(1) },
  secureNoteTxt: { fontFamily: Fonts.Regular, flex: 1, color: Colors.gray_9E, fontSize: rs(10), lineHeight: rs(16) },

  // ── Modals ──
  modalOverlay: {
    flex: 1, backgroundColor: Colors.blackOpacity_45,
    justifyContent: "center", alignItems: "center",
    paddingHorizontal: scale(24),
  },
  modalCard: {
    width: "100%", backgroundColor: Colors.white,
    borderRadius: scale(24),
    paddingVertical: vs(28), paddingHorizontal: scale(22),
    alignItems: "center",
    elevation: 10, shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 16,
  },

  modalIconWrap: {
    width: scale(56), height: scale(56), borderRadius: scale(16),
    alignItems: "center", justifyContent: "center", marginBottom: vs(12),
  },
  modalIcon: { fontSize: rs(26) },
  modalTitle: { fontFamily: Fonts.Bold, fontSize: rs(18), fontWeight: "900", color: Colors.primary, marginBottom: vs(4) },
  modalSub: { fontFamily: Fonts.Medium, fontSize: rs(12), color: Colors.gray_9E, marginBottom: vs(12), textAlign: "center" },
  modalRecipient: { fontFamily: Fonts.Regular, fontSize: rs(13), color: Colors.gray_9E, textAlign: "center", marginBottom: vs(4) },
  modalBankInfo: { fontFamily: Fonts.Regular, fontSize: rs(11), color: Colors.gray_BD, marginBottom: vs(20), textAlign: "center" },

  amountHighlight: {
    backgroundColor: Colors.accent + "12",
    borderRadius: scale(12), paddingHorizontal: scale(20), paddingVertical: vs(10),
    marginBottom: vs(8),
    borderWidth: 1, borderColor: Colors.accent + "25",
  },
  amountHighlightTxt: { fontFamily: Fonts.Bold, color: Colors.accent, fontSize: rs(28), fontWeight: "900" },

  modalBtnRow: { flexDirection: "row", gap: scale(10), width: "100%", marginTop: vs(4) },
  modalCancelBtn: {
    flex: 1, paddingVertical: vs(13), borderRadius: scale(12),
    backgroundColor: Colors.gray_F4, alignItems: "center",
  },
  modalCancelTxt: { fontFamily: Fonts.Bold, color: Colors.gray_75, fontSize: rs(13), fontWeight: "700" },
  modalConfirmBtn: {
    flex: 2, paddingVertical: vs(13), borderRadius: scale(12),
    backgroundColor: Colors.accent, alignItems: "center",
    elevation: 2, shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4,
  },
  modalConfirmTxt: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(13), fontWeight: "900" },

  // OTP footer
  otpFooter: { flexDirection: "row", alignItems: "center", gap: scale(12), marginTop: vs(14) },
  resendTxt: { fontFamily: Fonts.Bold, color: Colors.accent, fontSize: rs(12), fontWeight: "700" },
  otpDivider: { color: Colors.gray_E0, fontSize: rs(14) },
  cancelTxt: { fontFamily: Fonts.Medium, color: Colors.gray_9E, fontSize: rs(12), fontWeight: "600" },
});