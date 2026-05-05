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
import Colors from "../../../constants/Colors";
import Fonts from "../../../constants/Fonts";
import CustomAlert from "../../../componets/Alerts/CustomAlert";
import ReceiptModal from "../../../componets/ReceiptModal/ReceiptModal";
import { fadeIn, slideUp, buttonPress } from "../../../utils/ScreenAnimations";
import { transferDmtFund, generateDmtTotp } from "../../../api/AuthApi";

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AlertService } from "../../../componets/Alerts/CustomAlert";
import { ActivityIndicator } from "react-native";
import HeaderBar from "../../../componets/HeaderBar/HeaderBar";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";


// ─── Responsive Scaling ───────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get("window");
const BASE_W = 390;
const BASE_H = 844;
const scale = (s) => Math.round((SW / BASE_W) * s);
const vs = (s) => Math.round((SH / BASE_H) * s);
const rs = (s) => Math.round(Math.sqrt((SW * SH) / (BASE_W * BASE_H)) * s);

// Quick amount chips
const QUICK_AMOUNTS = ["500", "1000", "2000", "5000", "10000"];

const MoneyTransferScreen = ({ route, navigation }) => {
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
  const [error, setError] = useState("");
  const [otpError, setOtpError] = useState("");
  const [submitting, setSubmitting] = useState(false);


  // Alert
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ type: "", title: "", message: "" });
  const [receiptData, setReceiptData] = useState(null);
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

  useEffect(() => {
    if (confirmModal) animateModal(confirmScale, confirmOp);
  }, [confirmModal]);
  useEffect(() => {
    if (otpModal) animateModal(otpScale, otpOp);
  }, [otpModal]);

  // Validation
  const validateAmount = () => {
    const n = parseFloat(amount);
    if (!amount) {
      setError("Please enter an amount");
      return false;
    }
    if (isNaN(n) || n <= 0) {
      setError("Enter a valid transfer amount");
      return false;
    }
    setError("");
    return true;
  };

  const validateOtp = () => {
    if (!otp) {
      setOtpError("Please enter the OTP");
      return false;
    }
    if (!/^\d{4}$/.test(otp)) {
      setOtpError("OTP must be exactly 4 digits");
      return false;
    }
    setOtpError("");
    return true;
  };

  const handleConfirm = () => {
    if (validateAmount()) {
      buttonPress(btnScale).start(() => setConfirmModal(true));
    }
  };

  const getLocation = () =>
    new Promise((resolve) => {
      // First try with high accuracy
      Geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        (err) => {
          console.log('[GEOLOCATION] High Accuracy Error:', err);
          // Fallback to low accuracy (useful for indoors)
          Geolocation.getCurrentPosition(
            (pos2) => resolve(pos2.coords),
            (err2) => {
              console.log('[GEOLOCATION] Low Accuracy Error:', err2);
              resolve(null);
            },
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 10000 }
          );
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
      );
    });

  const getPublicIp = async () => {
    try {
      // Use multiple services for better reliability
      const response = await fetch("https://api.ipify.org?format=json");
      const data = await response.json();
      return data.ip;
    } catch (e) {
      console.log("[IP] Service 1 Error:", e);
      try {
        const response = await fetch("https://ifconfig.me/all.json");
        const data = await response.json();
        return data.ip_addr;
      } catch (e2) {
        console.log("[IP] Service 2 Error:", e2);
        return null;
      }
    }
  };

  const handleSendOtp = async () => {
    try {
      setSubmitting(true);

      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          AlertService.showAlert({ type: "error", title: "Permission Denied", message: "Location permission is required." });
          setSubmitting(false);
          return;
        }
      }

      const coords = await getLocation();
      const ip = await getPublicIp();

      if (!coords) {
        AlertService.showAlert({
          type: "error",
          title: "Location Error",
          message: "Unable to retrieve your current location. Please ensure GPS is ON and you are in a good signal area."
        });
        setSubmitting(false);
        return;
      }

      if (!ip) {
        AlertService.showAlert({
          type: "error",
          title: "Network Error",
          message: "Unable to retrieve your device IP address. Please check your internet connection."
        });
        setSubmitting(false);
        return;
      }

      const headerToken = await AsyncStorage.getItem("header_token");
      const idempotencyKey = `OTP_${Date.now()}`;

      const res = await generateDmtTotp({
        data: {
          mobileNumber: account.mobile || "7877239670",
          beneficiaryId: account.id || account._id || account.beneficiaryId,
          amount: amount,
          latitude: String(coords.latitude),
          longitude: String(coords.longitude),
          publicIp: ip
        },
        headerToken,
        idempotencyKey
      });

      if (res.success || res.status === "SUCCESS") {
        setConfirmModal(false);
        setTimeout(() => {
          setOtp("");
          setOtpError("");
          setOtpModal(true);
        }, 300);
      } else {
        AlertService.showAlert({
          type: "error",
          title: "OTP Failed",
          message: res.message || "Unable to send OTP. Please try again."
        });
      }
    } catch (err) {
      console.log("OTP Error:", err);
      AlertService.showAlert({
        type: "error",
        title: "Error",
        message: "Something went wrong while sending OTP."
      });
    } finally {
      setSubmitting(false);
    }
  };


  const handleTransfer = async () => {
    if (!validateOtp()) return;

    try {
      setSubmitting(true);

      const coords = await getLocation();
      const ip = await getPublicIp();

      if (!coords) {
        AlertService.showAlert({
          type: "error",
          title: "Location Error",
          message: "Unable to retrieve your current location. Please ensure GPS is ON and you are in a good signal area."
        });
        setSubmitting(false);
        return;
      }

      if (!ip) {
        AlertService.showAlert({
          type: "error",
          title: "Network Error",
          message: "Unable to retrieve your device IP address. Please check your internet connection."
        });
        setSubmitting(false);
        return;
      }

      const headerToken = await AsyncStorage.getItem("header_token");
      const idempotencyKey = `DMT_${Date.now()}`;

      const payload = {
        mobileNumber: account.mobile,
        latitude: String(coords.latitude),
        longitude: String(coords.longitude),
        publicIp: ip,
        otp: otp,
        amount: amount,
        beneficiaryId: account.id || account._id || account.beneficiaryId,
        beneficiaryAccount: account.accountNumber,
        ifsc: account.ifsc,
        name: account.name
      };

      const res = await transferDmtFund({
        data: payload,
        headerToken,
        idempotencyKey
      });

      if (res.success || res.status === "SUCCESS") {
        setOtpModal(false);
        const finalAmount = amount;
        setAmount("");
        setOtp("");

        setReceiptData({
          status: "success",
          title: "Transfer Successful",
          amount: finalAmount,
          date: new Date().toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          }),
          txn_ref: res.data?.txnId || res.txnId || "DMT" + Date.now(),
          details: [
            { label: "Recipient", value: account.name },
            { label: "Bank", value: account.bank },
            { label: "Account No.", value: account.accountNumber },
            { label: "IFSC", value: account.ifsc },
            { label: "Service", value: "DMT Money Transfer" },
          ],
          note: res.message || `₹${finalAmount} transferred to ${account.name} successfully!`,
        });
      } else {
        AlertService.showAlert({
          type: "error",
          title: "Transfer Failed",
          message: res.message || "Unable to process fund transfer."
        });
      }
    } catch (err) {
      console.log("Transfer Error:", err);
      AlertService.showAlert({
        type: "error",
        title: "Error",
        message: "Something went wrong. Please try again."
      });
    } finally {
      setSubmitting(false);
    }
  };


  return (
    <SafeAreaView style={styles.safe}>
      <HeaderBar title="Money Transfer" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ══ HEADER ══ */}
        <Animated.View
          style={[styles.header, { opacity: headerOp, transform: [{ translateY: headerTY }] }]}
        >
          <View style={styles.secureBadge}>
            <Icon name="shield-check" size={14} color={Colors.finance_accent} />
            <Text style={styles.secureBadgeTxt}>SECURED TRANSFER</Text>
          </View>

          <View style={styles.recipientChip}>
            <View style={styles.recipientAvatar}>
              <Text style={styles.recipientAvatarTxt}>
                {account.name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.recipientName}>{account.name}</Text>
              <Text style={styles.recipientBank}>{account.bank} • {account.accountNumber}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Icon name="check-decagram" size={16} color={Colors.white} />
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
          <View style={styles.modernCard}>
            <View style={styles.cardHighlightHeader}>
              <Icon name="cash-multiple" size={14} color={Colors.finance_accent} />
              <Text style={styles.cardHighlightTitle}>ENTER TRANSFER AMOUNT</Text>
            </View>
            <View style={styles.cardBody}>
              <View style={[styles.modernInputWrapper, error ? { borderBottomColor: Colors.red } : null]}>
                <Text style={styles.floatingLabel}>Amount (₹)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0.00"
                  placeholderTextColor={Colors.slate_500}
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={(t) => {
                    let v = t.replace(/[^0-9]/g, "");
                    if (v.startsWith("0")) v = v.replace(/^0+/, "");
                    setAmount(v);
                    if (error) setError("");
                  }}
                  maxLength={10}
                />
              </View>
              {error ? <Text style={styles.errorText}>{error}</Text> : null}

              <View style={styles.hintRow}>
                <Icon name="information-outline" size={12} color={Colors.finance_accent} />
                <Text style={styles.hintTxt}>Daily limit: ₹25,000 per transaction</Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.quickRow}
                contentContainerStyle={{ gap: 8, paddingVertical: 10 }}
              >
                {QUICK_AMOUNTS.map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={[styles.quickChip, amount === q && styles.quickChipActive]}
                    onPress={() => {
                      setAmount(q);
                      if (error) setError("");
                    }}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.quickChipTxt, amount === q && styles.quickChipTxtActive]}>
                      ₹{Number(q).toLocaleString("en-IN")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

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
                    <Text style={[styles.summaryLbl, { color: Colors.primary, fontFamily: Fonts.Bold }]}>
                      Total Debit
                    </Text>
                    <Text
                      style={[
                        styles.summaryVal,
                        { color: Colors.finance_accent, fontFamily: Fonts.Bold, fontSize: rs(14) },
                      ]}
                    >
                      ₹{Number(amount).toLocaleString("en-IN")}
                    </Text>
                  </View>
                </View>
              )}

              <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 24 }}>
                <TouchableOpacity
                  style={[styles.button, { backgroundColor: (amount.length > 0 && Number(amount) > 0) ? Colors.primary : Colors.gold }]}
                  onPress={handleConfirm}
                  disabled={!amount || Number(amount) <= 0}
                  activeOpacity={0.88}
                >
                  <Text style={[styles.buttonText, { color: (amount.length > 0 && Number(amount) > 0) ? Colors.white : Colors.slate_500 }]}>Proceed Transfer</Text>
                  <Icon name="arrow-right" size={18} color={(amount.length > 0 && Number(amount) > 0) ? Colors.white : Colors.slate_500} />
                </TouchableOpacity>
              </Animated.View>
            </View>
          </View>

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
          <Animated.View
            style={[styles.modalCard, { opacity: confirmOp, transform: [{ scale: confirmScale }] }]}
          >
            <View style={[styles.modalIconWrap, { backgroundColor: Colors.accent + "15" }]}>
              <Text style={styles.modalIcon}>💸</Text>
            </View>
            <Text style={styles.modalTitle}>Confirm Transfer</Text>
            <Text style={styles.modalSub}>You are about to transfer</Text>
            <View style={styles.amountHighlight}>
              <Text style={styles.amountHighlightTxt}>₹{Number(amount).toLocaleString("en-IN")}</Text>
            </View>
            <Text style={styles.modalRecipient}>
              to <Text style={{ color: Colors.primary, fontWeight: "800" }}>{account.name}</Text>
            </Text>
            <Text style={styles.modalBankInfo}>{account.bank} • {account.accountNumber}</Text>
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setConfirmModal(false)}
                activeOpacity={0.8}
              >
                <Text style={styles.modalCancelTxt}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalConfirmBtn, submitting && { opacity: 0.7 }]}
                onPress={handleSendOtp}
                activeOpacity={0.88}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.modalConfirmTxt}>Send OTP</Text>
                )}
              </TouchableOpacity>

            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* ══ OTP MODAL ══ */}
      <Modal visible={otpModal} transparent animationType="none" onRequestClose={() => setOtpModal(false)}>
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[styles.modalCard, { opacity: otpOp, transform: [{ scale: otpScale }] }]}
          >
            <View style={[styles.modalIconWrap, { backgroundColor: "rgba(255,255,255,0.1)" }]}>
              <Icon name="message-text-outline" size={rs(26)} color={Colors.finance_accent} />
            </View>
            <Text style={styles.modalTitle}>Verify OTP</Text>
            <Text style={styles.modalSub}>OTP sent to your registered mobile number</Text>
            <View style={[styles.inputRow, { marginTop: vs(14), marginBottom: vs(4) }, otpError ? styles.inputError : null]}>
              <TextInput
                style={[
                  styles.input,
                  { flex: 1, textAlign: "center", fontSize: rs(22), letterSpacing: scale(8), fontWeight: "800", paddingLeft: scale(8) },
                ]}
                placeholder="• • • •"
                placeholderTextColor={Colors.gray}
                keyboardType="number-pad"
                value={otp}
                selection={{ start: otp.length, end: otp.length }}
                onChangeText={(t) => {
                  setOtp(t.replace(/[^0-9]/g, ""));
                  if (otpError) setOtpError("");
                }}
                maxLength={4}
                autoFocus
              />
            </View>
            {otpError ? <Text style={styles.errorText}>{otpError}</Text> : null}

            <View style={styles.hintRow}>
              <Text style={styles.hintDot}>•</Text>
              <Text style={styles.hintTxt}>Enter 4-digit OTP sent to your mobile</Text>
            </View>

            <TouchableOpacity
              style={[styles.button, { marginTop: vs(16), backgroundColor: (otp.length === 4 && !submitting) ? Colors.primary : Colors.gold }]}
              onPress={handleTransfer}
              activeOpacity={0.88}
              disabled={otp.length !== 4 || submitting}
            >
              {submitting ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={[styles.buttonText, { color: otp.length === 4 ? Colors.white : Colors.slate_500 }]}>Verify &amp; Transfer</Text>
              )}
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

      <ReceiptModal
        visible={!!receiptData}
        onClose={() => setReceiptData(null)}
        navigation={navigation}
        data={receiptData}
      />
    </SafeAreaView>
  );
};

export default MoneyTransferScreen;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  scroll: { flex: 1, backgroundColor: Colors.beige },
  scrollContent: { padding: scale(16), paddingBottom: vs(50) },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: scale(20),
    paddingTop: vs(16),
    paddingBottom: vs(26),
    borderBottomLeftRadius: scale(30),
    borderBottomRightRadius: scale(30),
  },
  secureBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: scale(20),
    paddingHorizontal: scale(10),
    paddingVertical: vs(4),
    marginBottom: vs(14),
    gap: scale(5),
  },
  secureBadgeTxt: {
    fontFamily: Fonts.Bold,
    color: Colors.white,
    fontSize: rs(9),
    letterSpacing: 1.1,
  },
  recipientChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    borderRadius: scale(14),
    padding: scale(10),
    gap: scale(10),
  },
  recipientAvatar: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(10),
    backgroundColor: 'rgb(46, 46, 46)',
    alignItems: "center",
    justifyContent: "center",
  },
  recipientAvatarTxt: { fontFamily: Fonts.Bold, color: Colors.finance_accent, fontSize: rs(13) },
  recipientName: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(13) },
  recipientBank: {
    fontFamily: Fonts.Regular,
    color: "rgba(255,255,255,0.65)",
    fontSize: rs(10),
    marginTop: vs(2),
  },
  verifiedBadge: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: Colors.finance_accent,
    alignItems: "center",
    justifyContent: "center",
  },

  modernCard: {
    backgroundColor: Colors.cardbg,
    borderRadius: 18,
    marginBottom: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.30)',
  },
  cardHighlightHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgb(46, 46, 46)',
    gap: 8,
  },
  cardHighlightTitle: {
    fontSize: 11,
    fontFamily: Fonts.Bold,
    color: Colors.finance_accent,
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: 16,
  },
  modernInputWrapper: {
    borderBottomWidth: 1.5,
    borderBottomColor: "rgba(212,176,106,0.40)",
    marginBottom: 12,
    paddingVertical: 8,
  },
  floatingLabel: {
    fontSize: 10,
    fontFamily: Fonts.Bold,
    color: Colors.finance_accent,
    letterSpacing: 1,
    marginBottom: 4,
    textTransform: 'uppercase',
  },

  errorText: {
    fontFamily: Fonts.Bold,
    color: Colors.red,
    fontSize: rs(10),
    marginTop: vs(2),
    marginBottom: vs(12),
  },
  input: {
    fontFamily: Fonts.Bold,
    flex: 1,
    fontSize: 18,
    color: Colors.primary,
    padding: 0,
  },
  hintRow: { flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 12 },
  hintTxt: { fontFamily: Fonts.Medium, color: Colors.slate_700, fontSize: rs(10) },
  quickRow: { marginBottom: 16 },
  quickChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.04)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  quickChipActive: { backgroundColor: "rgba(212,176,106,0.1)", borderColor: Colors.finance_accent },
  quickChipTxt: { fontFamily: Fonts.Bold, fontSize: rs(11), color: Colors.slate_700 },
  quickChipTxtActive: { color: Colors.finance_accent },
  summaryBox: {
    backgroundColor: "rgba(0,0,0,0.02)",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: vs(5),
  },
  summaryDivider: { height: 1, backgroundColor: "rgba(0,0,0,0.04)" },
  summaryLbl: { fontFamily: Fonts.Medium, fontSize: rs(11), color: Colors.slate_700 },
  summaryVal: { fontFamily: Fonts.Bold, fontSize: rs(12), color: Colors.primary },
  button: {
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  buttonText: {
    fontFamily: Fonts.Bold,
    color: Colors.white,
    fontSize: 16,
    letterSpacing: 0.5,
  },
  secureNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scale(8),
    marginTop: vs(16),
    backgroundColor: "rgba(212,176,106,0.05)",
    borderRadius: scale(12),
    padding: scale(12),
    borderWidth: 1,
    borderColor: "rgba(212,176,106,0.1)",
  },
  secureNoteIcon: { fontSize: rs(14), marginTop: vs(1) },
  secureNoteTxt: {
    fontFamily: Fonts.Regular,
    flex: 1,
    color: Colors.slate_700,
    fontSize: rs(10),
    lineHeight: rs(16),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scale(24),
  },
  modalCard: {
    width: "100%",
    backgroundColor: Colors.cardbg,
    borderRadius: scale(24),
    paddingVertical: vs(28),
    paddingHorizontal: scale(22),
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212,176,106,0.2)",
  },
  modalIconWrap: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(16),
    backgroundColor: 'rgb(46, 46, 46)',
    alignItems: "center",
    justifyContent: "center",
    marginBottom: vs(12),
  },
  modalIcon: { fontSize: rs(26) },
  modalTitle: {
    fontFamily: Fonts.Bold,
    fontSize: rs(18),
    color: Colors.primary,
    marginBottom: vs(4),
  },
  modalSub: {
    fontFamily: Fonts.Medium,
    fontSize: rs(12),
    color: Colors.slate_700,
    marginBottom: vs(12),
    textAlign: "center",
  },
  modalRecipient: {
    fontFamily: Fonts.Regular,
    fontSize: rs(13),
    color: Colors.slate_700,
    textAlign: "center",
    marginBottom: vs(4),
  },
  modalBankInfo: {
    fontFamily: Fonts.Regular,
    fontSize: rs(11),
    color: Colors.slate_700,
    marginBottom: vs(20),
    textAlign: "center",
  },
  amountHighlight: {
    backgroundColor: "rgba(212,176,106,0.1)",
    borderRadius: scale(12),
    paddingHorizontal: scale(20),
    paddingVertical: vs(10),
    marginBottom: vs(16),
    borderWidth: 1,
    borderColor: "rgba(212,176,106,0.3)",
  },
  amountHighlightTxt: { fontFamily: Fonts.Bold, color: Colors.finance_accent, fontSize: rs(28) },
  modalBtnRow: { flexDirection: "row", gap: scale(10), width: "100%", marginTop: vs(4) },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: vs(13),
    borderRadius: scale(12),
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
  },
  modalCancelTxt: { fontFamily: Fonts.Bold, color: Colors.slate_700, fontSize: rs(13) },
  modalConfirmBtn: {
    flex: 2,
    paddingVertical: vs(13),
    borderRadius: scale(12),
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  modalConfirmTxt: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(13) },
  otpFooter: { flexDirection: "row", alignItems: "center", gap: scale(12), marginTop: vs(14) },
  resendTxt: { fontFamily: Fonts.Bold, color: Colors.finance_accent, fontSize: rs(12) },
  otpDivider: { color: Colors.kyc_border, fontSize: rs(14) },
  cancelTxt: { fontFamily: Fonts.Medium, color: Colors.slate_700, fontSize: rs(12) },
});
