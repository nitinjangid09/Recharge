import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Image,
  Animated,
  Dimensions,
  PixelRatio,
  PermissionsAndroid,
  Alert,
  RefreshControl,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { launchImageLibrary, launchCamera } from "react-native-image-picker";
import Colors from "../constants/Colors";
import Fonts from "../constants/Fonts";
import HeaderBar from "../componets/HeaderBar/HeaderBar";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAllTopupBanks, addOfflineTopupRequest, getAllOfflineTopupRequests } from "../api/AuthApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomAlert from "../componets/Alerts/CustomAlert";
import ImageUploadAlert from "../componets/Alerts/Imageuploadalert";
import ReceiptModal from "../componets/ReceiptModal/ReceiptModal";
import CalendarModal from "../componets/Calendar/CalendarModal";

// ─── Responsive scale ─────────────────────────────────────────────────────
const { width: W } = Dimensions.get("window");
const S = (n) => Math.round(PixelRatio.roundToNearestPixel(n * (W / 375)));

const ACCENT = Colors.finance_accent || "#D4A843";
const FG = Colors.finance_text || "#1A1A2E";
const SURFACE = Colors.white || "#FFFFFF";
const BG = Colors.homeSecondry || "#F4F5F7";
const CARD_BG = Colors.bg || "#FFFFFF";

// ─── Payment mode config ──────────────────────────────────────────────────
const PAYMENT_MODES = [
  { key: "upi", label: "UPI", hint: "Instant transfer" },
  { key: "imps", label: "IMPS", hint: "Real-time transfer" },
  { key: "neft", label: "NEFT", hint: "2–4 hrs transfer" },
  { key: "bank", label: "Bank", hint: "Bank transfer" },
];

// ─── Compact text-only pill ───────────────────────────────────────────────
const ModePill = ({ mode, isActive, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: 0.93, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={[pillSt.wrap, { transform: [{ scale }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[pillSt.pill, isActive && pillSt.pillActive]}
      >
        {isActive && <View style={pillSt.dot} />}
        <Text style={[pillSt.label, isActive && pillSt.labelActive]}>
          {mode.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const pillSt = StyleSheet.create({
  wrap: { flex: 1 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S(4),
    paddingVertical: S(9),
    paddingHorizontal: S(6),
    borderRadius: S(10),
    borderWidth: 1,
    borderColor: "rgba(212,176,106,0.28)",
    // ── KEY: always white background ──
    backgroundColor: SURFACE,
  },
  pillActive: {
    // Tinted white — very subtle gold wash on white
    backgroundColor: SURFACE,
    borderColor: ACCENT,
    borderWidth: 1.5,
  },
  dot: {
    width: S(5),
    height: S(5),
    borderRadius: S(3),
    backgroundColor: ACCENT,
  },
  label: {
    // ── matches field label: same font, same size ──
    fontSize: S(12),
    fontFamily: Fonts.Bold,
    color: "#B0B0B0",
    letterSpacing: 0.2,
    includeFontPadding: false,
    lineHeight: S(16),
  },
  labelActive: {
    color: ACCENT,
  },
});

// ─── Field label — single source of truth ────────────────────────────────
// All labels: same font (Fonts.Bold), same size (S(12)), same colour (FG)
const FieldLabel = ({ text }) => (
  <Text style={st.fieldLabel}>{text}</Text>
);

// ─── Reusable text input row ──────────────────────────────────────────────
const InputBox = ({ label, value, setValue, icon, placeholder, keyboardType, error, maxLength, filter }) => (
  <View style={st.fieldWrap}>
    <FieldLabel text={label} />
    <View style={[st.inputRow, error ? st.inputRowError : null]}>
      <TextInput
        value={value}
        onChangeText={(val) => {
          let v = val;
          if (filter === "alphanumeric") {
            v = v.replace(/[^a-zA-Z0-9]/g, "");
          } else if (keyboardType === "numeric" || keyboardType === "number-pad") {
            v = v.replace(/[^0-9]/g, "");
          }
          setValue(v);
        }}
        keyboardType={keyboardType || "default"}
        placeholder={placeholder}
        placeholderTextColor="#C4C4C4"
        style={st.inputText}
        maxLength={maxLength}
      />
      <Icon name={icon} size={S(18)} color={error ? "#EF4444" : ACCENT + "90"} />
    </View>
    {!!error && <Text style={st.errorTxt}>{error}</Text>}
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════
//  OfflineTopup
// ═══════════════════════════════════════════════════════════════════════════
export default function OfflineTopup({ navigation }) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("upi");
  const [receiverBank, setReceiverBank] = useState("");
  const [utrNumber, setUtrNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [paymentProof, setPaymentProof] = useState("");
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [date, setDate] = useState(new Date());
  const [submitting, setSubmitting] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState("info");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [uploadVisible, setUploadVisible] = useState(false);
  const [errors, setErrors] = useState({});
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const activeModeHint = PAYMENT_MODES.find(m => m.key === mode)?.hint || "";

  const showAlert = (type, title, message) => {
    setAlertType(type); setAlertTitle(title); setAlertMessage(message); setAlertVisible(true);
  };

  const onDateConfirm = (selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const d = String(selectedDate.getDate()).padStart(2, "0");
      setPaymentDate(`${y}-${m}-${d}`);
      if (errors.paymentDate) setErrors(prev => ({ ...prev, paymentDate: null }));
    }
  };

  const fetchBanks = async () => {
    setBanksLoading(true);
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      const result = await getAllTopupBanks({ headerToken });
      const ok = result?.success === true || result?.status === "success" || result?.statusCode === 200;
      if (ok) setBanks(result.data || []);
    } catch (e) {
      console.log("Fetch banks error:", e);
    } finally {
      setBanksLoading(false);
    }
  };

  const fetchRequests = async () => {
    setRequestsLoading(true);
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      const result = await getAllOfflineTopupRequests({ headerToken, page: 1, limit: 10 });
      if (result?.success) setRequests(result.data || []);
    } catch (e) {
      console.log("Fetch requests error:", e);
    } finally {
      setRequestsLoading(false);
      setRefreshing(false); // Reset both loaders
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    setAmount("");
    setMode("upi");
    setReceiverBank("");
    setUtrNumber("");
    setPaymentDate("");
    setPaymentProof("");
    setErrors({});
    await Promise.all([fetchBanks(), fetchRequests()]);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchBanks();
    fetchRequests();
  }, []);

  const handleCamera = async () => {
    try {
      // ── API 33+ handles permissions differently, but for older we still need check ──
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: "Camera Permission",
          message: "App needs camera access to capture payment proof.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED || Platform.OS === 'ios') {
        const result = await launchCamera({
          mediaType: "photo",
          quality: 0.7,
          saveToPhotos: false,
          includeBase64: false,
        });

        if (result.didCancel) {
          console.log("User cancelled camera");
        } else if (result.errorCode) {
          console.log("Camera Error: ", result.errorMessage || result.errorCode);
          showAlert("error", "Camera Error", result.errorMessage || "Unable to open camera.");
        } else if (result.assets?.length) {
          setPaymentProof(result.assets[0].uri);
          if (errors.paymentProof) setErrors(prev => ({ ...prev, paymentProof: null }));
        }
      } else {
        showAlert("error", "Permission Denied", "Camera permission is required to use this feature.");
      }
    } catch (err) {
      console.warn("Camera Error:", err);
      showAlert("error", "Error", "Unexpected error opening camera.");
    }
  };
  const handleGallery = () => launchImageLibrary({ mediaType: "photo", quality: 0.7 }, (res) => {
    if (!res.didCancel && res.assets?.length) {
      setPaymentProof(res.assets[0].uri);
      if (errors.paymentProof) setErrors(prev => ({ ...prev, paymentProof: null }));
    }
  });
  const handleFile = () => launchImageLibrary({ mediaType: "photo", quality: 0.7 }, (res) => {
    if (!res.didCancel && res.assets?.length) {
      setPaymentProof(res.assets[0].uri);
      if (errors.paymentProof) setErrors(prev => ({ ...prev, paymentProof: null }));
    }
  });

  const handleSubmit = async () => {
    let hasError = false;
    let newErrors = {};
    if (!amount) { newErrors.amount = "Amount is required"; hasError = true; }
    else if (Number(amount) <= 0) { newErrors.amount = "Amount must be greater than 0"; hasError = true; }
    else if (Number(amount) > 1000000) { newErrors.amount = "Max amount allowed is ₹10,00,000"; hasError = true; }

    if (!receiverBank) { newErrors.receiverBank = "Please select a receiver bank"; hasError = true; }
    if (!utrNumber) { newErrors.utrNumber = "UTR / Ref number is required"; hasError = true; }
    if (!paymentDate) { newErrors.paymentDate = "Payment date is required"; hasError = true; }
    if (!paymentProof) { newErrors.paymentProof = "Payment proof screenshot is required"; hasError = true; }

    setErrors(newErrors);
    if (hasError) return;

    setSubmitting(true);
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      const result = await addOfflineTopupRequest({ amount, mode, receiverBank, utrNumber, paymentDate, paymentProof, headerToken });
      if (result?.success) {
        setReceiptData({
          status: "success",
          title: "Request Submitted",
          amount: amount,
          date: paymentDate,
          txn_ref: utrNumber,
          details: [
            { label: "Bank", value: selectedBankName },
            { label: "Payment Mode", value: mode.toUpperCase() },
            { label: "UTR Number", value: utrNumber },
            { label: "Amount", value: `₹${amount}` },
          ],
          note: "Your topup request has been submitted and is pending approval (usually within 2-4 hours)."
        });
        fetchRequests(); // Automatically refresh list
      } else {
        showAlert("error", "Submission Failed", result?.message || "Unable to submit. Please try again.");
      }
    } catch (e) {
      showAlert("error", "Unexpected Error", "Something went wrong. Please try again later.");
    } finally { setSubmitting(false); }
  };

  const selectedBankName = banks.find((b) => b._id === receiverBank)?.bankName;

  return (
    <SafeAreaView style={st.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ACCENT}
            colors={[ACCENT]}
            progressBackgroundColor="#FFF"
          />
        }
      >
        <HeaderBar title="Topup Request" onBack={() => navigation.goBack()} />

        <View style={st.card}>
          <Text style={st.cardTitle}>Submit Topup Request</Text>

          {/* ── Amount ── */}
          <InputBox
            label="Amount (₹)"
            placeholder="Enter amount"
            value={amount}
            setValue={(val) => {
              if (val !== "" && Number(val) > 1000000) {
                setErrors(prev => ({ ...prev, amount: "Max amount allowed is ₹10,00,000" }));
                return;
              }
              setAmount(val);
              if (errors.amount) setErrors(prev => ({ ...prev, amount: null }));
            }}
            icon="currency-inr"
            keyboardType="numeric"
            error={errors.amount}
          />

          {/* ── Payment Mode ── */}
          <View style={st.fieldWrap}>
            {/* label row: same FieldLabel + inline hint */}
            <View style={st.modeLabelRow}>
              <FieldLabel text="Payment Mode" />
              <Text style={st.modeHintTxt}>{activeModeHint}</Text>
            </View>

            <View style={st.pillRow}>
              {PAYMENT_MODES.map((m) => (
                <ModePill
                  key={m.key}
                  mode={m}
                  isActive={mode === m.key}
                  onPress={() => setMode(m.key)}
                />
              ))}
            </View>
          </View>

          {/* ── Receiver Bank ── */}
          <View style={st.fieldWrap}>
            <FieldLabel text="Receiver Bank" />
            <TouchableOpacity
              style={[st.inputRow, errors.receiverBank ? st.inputRowError : null]}
              onPress={() => {
                if (errors.receiverBank) setErrors(prev => ({ ...prev, receiverBank: null }));
                setBankModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[st.inputText, { color: receiverBank ? FG : "#C4C4C4", paddingVertical: S(11) }]}
                numberOfLines={1}
              >
                {selectedBankName || "Choose a Bank"}
              </Text>
              <Icon name="chevron-down" size={S(18)} color={errors.receiverBank ? "#EF4444" : ACCENT + "90"} />
            </TouchableOpacity>
            {!!errors.receiverBank && <Text style={st.errorTxt}>{errors.receiverBank}</Text>}
          </View>

          {/* ── UTR ── */}
          <InputBox
            label="UTR / Ref Number"
            placeholder="e.g., 6545654323"
            value={utrNumber}
            setValue={(val) => {
              setUtrNumber(val);
              if (errors.utrNumber) setErrors(prev => ({ ...prev, utrNumber: null }));
            }}
            icon="text-box-search-outline"
            keyboardType="default"
            maxLength={20}
            filter="alphanumeric"
            error={errors.utrNumber}
          />

          {/* ── Payment Date ── */}
          <View style={st.fieldWrap}>
            <FieldLabel text="Payment Date" />
            <TouchableOpacity
              style={[st.inputRow, errors.paymentDate ? st.inputRowError : null]}
              onPress={() => {
                if (errors.paymentDate) setErrors(prev => ({ ...prev, paymentDate: null }));
                setShowDatePicker(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={[st.inputText, { color: paymentDate ? FG : "#C4C4C4", paddingVertical: S(11) }]}>
                {paymentDate || "YYYY-MM-DD"}
              </Text>
              <Icon name="calendar" size={S(18)} color={errors.paymentDate ? "#EF4444" : ACCENT + "90"} />
            </TouchableOpacity>
            {!!errors.paymentDate && <Text style={st.errorTxt}>{errors.paymentDate}</Text>}
          </View>
          <CalendarModal
            visible={showDatePicker}
            title="Select Payment Date"
            initialDate={date}
            maxDate={new Date()}
            onCancel={() => setShowDatePicker(false)}
            onConfirm={onDateConfirm}
          />

          {/* ── Payment Proof ── */}
          <View style={st.fieldWrap}>
            <FieldLabel text="Payment Proof" />
            <TouchableOpacity
              style={[st.inputRow, errors.paymentProof ? st.inputRowError : paymentProof && !errors.paymentProof ? st.inputRowGreen : null]}
              onPress={() => {
                if (errors.paymentProof) setErrors(prev => ({ ...prev, paymentProof: null }));
                setUploadVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={[
                st.inputText,
                {
                  color: paymentProof ? "#16A34A" : "#C4C4C4",
                  fontFamily: paymentProof ? Fonts.Bold : Fonts.Medium,
                  paddingVertical: S(11),
                },
              ]}>
                {paymentProof ? "✓  Proof Attached" : "Upload Payment Screenshot"}
              </Text>
              <Icon
                name={paymentProof ? "check-circle" : "camera-plus-outline"}
                size={S(18)}
                color={errors.paymentProof ? "#EF4444" : paymentProof ? "#16A34A" : ACCENT + "90"}
              />
            </TouchableOpacity>
            {!!errors.paymentProof && <Text style={st.errorTxt}>{errors.paymentProof}</Text>}

            {!!paymentProof && (
              <View style={st.previewBox}>
                <Image source={{ uri: paymentProof }} style={st.previewImg} />
                <View style={st.chipRow}>
                  <TouchableOpacity style={st.actionChip} onPress={() => setUploadVisible(true)}>
                    <Icon name="pencil" size={S(11)} color="#fff" />
                    <Text style={st.actionChipTxt}>Change</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[st.actionChip, st.removeChipBg]} onPress={() => setPaymentProof("")}>
                    <Icon name="delete" size={S(11)} color="#fff" />
                    <Text style={st.actionChipTxt}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* ── Submit ── */}
          <TouchableOpacity onPress={handleSubmit} style={st.submitWrap} disabled={submitting} activeOpacity={0.85}>
            <LinearGradient
              colors={[ACCENT, "#C29A47"]}
              style={st.submitBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#000" />
                : <>
                  <Icon name="send" size={S(15)} color="#000" />
                  <Text style={st.submitTxt}>Submit Request</Text>
                </>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Requests History ── */}
        <View style={st.historySection}>
          <View style={st.historyHeaderRow}>
            <View style={st.historyHeaderLeft}>
              <Icon name="clock-outline" size={S(16)} color={FG} />
              <Text style={st.historyHeaderTitle}>Recent Requests</Text>
            </View>
            <View style={st.historyCountBadge}>
              <Text style={st.historyCountTxt}>{requests.length}</Text>
            </View>
          </View>

          {requestsLoading ? (
            <ActivityIndicator size="small" color={ACCENT} style={{ marginVertical: S(30) }} />
          ) : requests.length > 0 ? (
            requests.map((item) => {
              const status = (item.status || "pending").toLowerCase();
              const isApproved = status === "approved";
              const isRejected = status === "rejected";
              const statusColor = isApproved ? "#16A34A" : isRejected ? "#DC2626" : "#D97706";
              const statusBg = isApproved ? "#F0FDF4" : isRejected ? "#FEF2F2" : "#FFFBEB";
              const statusIcon = isApproved ? "check-circle" : isRejected ? "close-circle" : "timer-sand";

              return (
                <View key={item._id} style={st.transactionCard}>
                  {/* Card Header: Amount & Status */}
                  <View style={st.cardHeaderTop}>
                    <View style={st.amtColumn}>
                      <Text style={st.amtSymbol}>₹<Text style={st.amtVal}>{item.amount}</Text></Text>
                      <Text style={st.dateLabel}>
                        {new Date(item.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </Text>
                    </View>
                    <View style={[st.cardStatusPill, { backgroundColor: statusBg, borderColor: statusColor + "20" }]}>
                      <Icon name={statusIcon} size={S(11)} color={statusColor} style={{ marginRight: S(4) }} />
                      <Text style={[st.cardStatusTxt, { color: statusColor }]}>
                        {status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Card Divider */}
                  <View style={st.cardInnerDivider} />

                  {/* Card Body: Details */}
                  <View style={st.cardDetailsGrid}>
                    <View style={st.detailItem}>
                      <Text style={st.detailLabel}>REFERENCE ID</Text>
                      <Text style={st.detailValue} numberOfLines={1}>{item.referenceId}</Text>
                    </View>
                    <View style={[st.detailItem, { alignItems: "flex-end" }]}>
                      <Text style={st.detailLabel}>PAYMENT MODE</Text>
                      <View style={st.modeGroup}>
                        <Icon name={item.mode === "upi" ? "qrcode-scan" : "bank-outline"} size={S(10)} color={FG + "70"} />
                        <Text style={st.detailValue}>{item.mode.toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={[st.cardDetailsGrid, { marginTop: S(8) }]}>
                    <View style={st.detailItem}>
                      <Text style={st.detailLabel}>UTR / TRANS NO</Text>
                      <Text style={st.detailValue}>{item.utrNumber}</Text>
                    </View>
                  </View>
                </View>
              );
            })
          ) : (
            <View style={st.emptyStateBox}>
              <View style={st.emptyIconCircle}>
                <Icon name="history" size={S(32)} color="#D1D5DB" />
              </View>
              <Text style={st.emptyTitle}>No transaction history</Text>
              <Text style={st.emptySubtitle}>Your offline topup requests will appear here</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ─── Bank bottom sheet ─── */}
      <Modal visible={bankModalVisible} transparent animationType="slide" onRequestClose={() => setBankModalVisible(false)}>
        <View style={st.overlay}>
          <View style={st.sheetCard}>
            <View style={st.sheetHandle} />
            <Text style={st.sheetTitle}>Choose Receiver Bank</Text>

            {banksLoading && <ActivityIndicator size="small" color={ACCENT} style={{ marginBottom: S(10) }} />}
            {!banksLoading && banks.length === 0 && (
              <Text style={st.sheetEmpty}>No banks found.</Text>
            )}

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: S(260), width: "100%" }}
              contentContainerStyle={{ paddingBottom: S(10) }}
            >
              {banks.map((b) => (
                <TouchableOpacity
                  key={b._id}
                  style={[st.bankRow, receiverBank === b._id && st.bankRowActive]}
                  onPress={() => { setReceiverBank(b._id); setBankModalVisible(false); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[st.bankName, receiverBank === b._id && { color: ACCENT }]} numberOfLines={1}>
                      {b.bankName}
                    </Text>
                    <Text style={st.bankSub}>{b.accountHolderName}  ·  {b.accountNumber}</Text>
                  </View>
                  {receiverBank === b._id && <Icon name="check-circle" size={S(16)} color={ACCENT} />}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={st.sheetCloseBtn} onPress={() => setBankModalVisible(false)}>
              <Text style={st.sheetCloseTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Loader ─── */}
      {submitting && (
        <View style={st.loaderOverlay}>
          {/* <ActivityIndicator size="large" color={ACCENT} /> */}
          <Text style={st.loaderTxt}>Submitting request…</Text>
        </View>
      )}

      {/* ─── Alerts ─── */}
      <CustomAlert
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onClose={() => {
          setAlertVisible(false);
          if (alertType === "success") setTimeout(() => navigation.goBack(), 120);
        }}
      />
      <ImageUploadAlert
        visible={uploadVisible}
        onClose={() => setUploadVisible(false)}
        onCamera={handleCamera}
        onGallery={handleGallery}
        onFile={handleFile}
      />

      <ReceiptModal
        visible={!!receiptData}
        onClose={() => setReceiptData(null)}
        navigation={navigation}
        data={receiptData}
      />
    </SafeAreaView>
  );
}

// ─── Unified stylesheet ───────────────────────────────────────────────────
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { alignItems: "center", paddingBottom: S(40) },

  // ── Card ─────────────────────────────────────────────────────────────
  card: {
    width: "92%",
    backgroundColor: CARD_BG,
    borderRadius: S(18),
    padding: S(18),
    marginTop: S(16),
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: S(10),
  },
  cardTitle: {
    fontSize: S(15),
    fontFamily: Fonts.Bold,
    color: FG,
    textAlign: "center",
    letterSpacing: 0.4,
    marginBottom: S(4),
  },

  // ── Field wrapper ─────────────────────────────────────────────────────
  fieldWrap: { width: "100%", marginTop: S(16) },

  // ── UNIFIED field label ───────────────────────────────────────────────
  // Amount label, Payment Mode label, Receiver Bank label, UTR label,
  // Payment Date label, Payment Proof label — all share this one style.
  fieldLabel: {
    fontSize: S(12),          // same size everywhere
    fontFamily: Fonts.Bold,   // same weight everywhere
    color: FG,                // same colour everywhere
    marginBottom: S(7),
    letterSpacing: 0.2,
    includeFontPadding: false,
    lineHeight: S(16),
  },

  // ── Payment mode ──────────────────────────────────────────────────────
  modeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: S(8),       // overrides the fieldLabel marginBottom
  },
  modeHintTxt: {
    fontSize: S(10),
    fontFamily: Fonts.Medium,
    color: ACCENT,
    includeFontPadding: false,
    lineHeight: S(14),
  },
  pillRow: {
    flexDirection: "row",
    gap: S(7),
  },

  // ── Input row ─────────────────────────────────────────────────────────
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212,176,106,0.32)",
    borderRadius: S(11),
    backgroundColor: SURFACE,  // always white
    paddingHorizontal: S(12),
  },
  inputRowGreen: {
    borderColor: "#16A34A",
    backgroundColor: "#F0FDF4",
  },
  inputText: {
    flex: 1,
    fontSize: S(13),
    color: FG,
    fontFamily: Fonts.Medium,
    paddingVertical: S(11),
    includeFontPadding: false,
  },
  inputRowError: {
    borderColor: "#EF4444",
  },
  errorTxt: {
    color: "#EF4444",
    fontSize: S(10),
    fontFamily: Fonts.Medium,
    marginTop: S(4),
  },

  // ── Proof preview ─────────────────────────────────────────────────────
  previewBox: {
    marginTop: S(10),
    borderRadius: S(12),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
  },
  previewImg: { width: "100%", height: S(170), resizeMode: "cover" },
  chipRow: {
    position: "absolute",
    top: S(10), right: S(10),
    flexDirection: "row",
    gap: S(8),
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: S(4),
    backgroundColor: "rgba(0,0,0,0.52)",
    borderRadius: S(20),
    paddingHorizontal: S(10),
    paddingVertical: S(5),
  },
  removeChipBg: {
    backgroundColor: "rgba(220, 38, 38, 0.85)",
  },
  actionChipTxt: { color: "#fff", fontSize: S(11), fontFamily: Fonts.Medium },

  // ── Submit ────────────────────────────────────────────────────────────
  submitWrap: { marginTop: S(22) },
  submitBtn: {
    borderRadius: S(12),
    paddingVertical: S(14),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S(7),
    elevation: 3,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: S(8),
  },
  submitTxt: {
    color: "#000",
    fontFamily: Fonts.Bold,
    fontSize: S(14),
    letterSpacing: 0.4,
  },

  // ── Bank bottom sheet ─────────────────────────────────────────────────
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheetCard: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: S(22),
    borderTopRightRadius: S(22),
    padding: S(18),
    paddingTop: S(10),
    alignItems: "center",
    elevation: 12,
  },
  sheetHandle: {
    width: S(36), height: S(4),
    borderRadius: S(2),
    backgroundColor: "#E5E7EB",
    marginBottom: S(14),
  },
  sheetTitle: {
    fontSize: S(15),
    fontFamily: Fonts.Bold,
    color: FG,
    marginBottom: S(14),
    alignSelf: "flex-start",
  },
  sheetEmpty: {
    color: "#999",
    marginVertical: S(10),
    fontFamily: Fonts.Medium,
    fontSize: S(13),
  },
  bankRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: S(12),
    paddingHorizontal: S(4),
    borderBottomWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    gap: S(8),
  },
  bankRowActive: { backgroundColor: ACCENT + "0E", borderRadius: S(8) },
  bankName: { fontSize: S(13), fontFamily: Fonts.Bold, color: FG },
  bankSub: { fontSize: S(10), fontFamily: Fonts.Medium, color: "#9CA3AF", marginTop: S(2) },
  sheetCloseBtn: {
    marginTop: S(14),
    paddingVertical: S(12),
    width: "100%",
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderRadius: S(12),
  },
  sheetCloseTxt: { fontFamily: Fonts.Bold, color: FG, fontSize: S(13) },

  // ── Loader ────────────────────────────────────────────────────────────
  loaderOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loaderTxt: { color: "#FFF", fontFamily: Fonts.Medium, fontSize: S(13), marginTop: S(8) },

  historySection: { width: "92%", marginTop: S(24), marginBottom: S(10) },
  historyHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: S(15), paddingHorizontal: S(4) },
  historyHeaderLeft: { flexDirection: "row", alignItems: "center", gap: S(8) },
  historyHeaderTitle: { fontSize: S(14), fontFamily: Fonts.Bold, color: FG, letterSpacing: 0.3 },
  historyCountBadge: { backgroundColor: SURFACE, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", borderRadius: S(8), paddingHorizontal: S(8), paddingVertical: S(2) },
  historyCountTxt: { fontSize: S(11), fontFamily: Fonts.Bold, color: FG },

  transactionCard: { backgroundColor: SURFACE, borderRadius: S(16), padding: S(14), marginBottom: S(12), elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: S(6), borderWidth: 1, borderColor: "rgba(0,0,0,0.03)" },
  cardHeaderTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  amtColumn: { gap: S(2) },
  amtSymbol: { fontSize: S(13), fontFamily: Fonts.Bold, color: ACCENT },
  amtVal: { fontSize: S(19), color: FG },
  dateLabel: { fontSize: S(10), fontFamily: Fonts.Medium, color: "#9CA3AF" },
  cardStatusPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: S(10), paddingVertical: S(5), borderRadius: S(100), borderWidth: 1 },
  cardStatusTxt: { fontSize: S(10), fontFamily: Fonts.Bold, letterSpacing: 0.5 },
  cardInnerDivider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: S(12), opacity: 0.8 },
  cardDetailsGrid: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: S(9), fontFamily: Fonts.Bold, color: "#9CA3AF", letterSpacing: 0.8, marginBottom: S(4) },
  detailValue: { fontSize: S(12), fontFamily: Fonts.Bold, color: FG, letterSpacing: 0.2 },
  modeGroup: { flexDirection: "row", alignItems: "center", gap: S(5) },

  emptyStateBox: { alignItems: "center", paddingVertical: S(40), backgroundColor: "rgba(212,176,106,0.04)", borderRadius: S(18), borderStyle: "dashed", borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" },
  emptyIconCircle: { width: S(64), height: S(64), borderRadius: S(32), backgroundColor: SURFACE, alignItems: "center", justifyContent: "center", marginBottom: S(14), elevation: 1 },
  emptyTitle: { fontSize: S(15), fontFamily: Fonts.Bold, color: FG, marginBottom: S(4) },
  emptySubtitle: { fontSize: S(12), fontFamily: Fonts.Medium, color: "#9CA3AF", textAlign: "center" },
});