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
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { launchImageLibrary, launchCamera } from "react-native-image-picker";
import Colors from "../constants/Colors";
import Fonts from "../constants/Fonts";
import HeaderBar from "../componets/HeaderBar";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAllTopupBanks, addOfflineTopupRequest } from "../api/AuthApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import CustomAlert from "../componets/CustomAlert";

// ─── Reusable input field ─────────────────────────────────────────────────
const InputBox = ({ label, value, setValue, icon, placeholder, keyboardType }) => (
  <View style={styles.fieldWrapper}>
    <Text style={styles.boxLabel}>{label}</Text>
    <View style={styles.inputContainer}>
      <TextInput
        value={value}
        onChangeText={(val) =>
          setValue(
            keyboardType === "numeric" || keyboardType === "number-pad"
              ? val.replace(/[^0-9]/g, "")
              : val
          )
        }
        keyboardType={keyboardType || "default"}
        placeholder={placeholder}
        placeholderTextColor="#9E9E9E"
        style={styles.boxInput}
      />
      <Icon name={icon} size={22} color={Colors.finance_accent} />
    </View>
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

  // CustomAlert state
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState("info");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [uploadVisible, setUploadVisible] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const showAlert = (type, title, message) => {
    setAlertType(type);
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const d = String(selectedDate.getDate()).padStart(2, "0");
      setPaymentDate(`${y}-${m}-${d}`);
    }
  };

  // ── Fetch banks ───────────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      setBanksLoading(true);
      try {
        const headerToken = await AsyncStorage.getItem("header_token");
        const result = await getAllTopupBanks({ headerToken });
        const ok = result?.success === true || result?.status === "success" || result?.status === 1 || result?.statusCode === 200;
        if (ok) {
          setBanks(result.data || []);
        } else {
          console.log("[OfflineTopup] Fetch banks request not successful:", result);
        }
      } catch (e) {
        console.log("Fetch banks error:", e);
      } finally {
        setBanksLoading(false);
      }
    })();
  }, []);

  // ── Image picker handlers ─────────────────────────────────────────────────
  const handleCamera = () =>
    launchCamera({ mediaType: "photo", quality: 0.7 }, (res) => {
      if (!res.didCancel && res.assets?.length) setPaymentProof(res.assets[0].uri);
    });

  const handleGallery = () =>
    launchImageLibrary({ mediaType: "photo", quality: 0.7 }, (res) => {
      if (!res.didCancel && res.assets?.length) setPaymentProof(res.assets[0].uri);
    });

  const handleFile = () =>
    launchImageLibrary({ mediaType: "photo", quality: 0.7 }, (res) => {
      if (!res.didCancel && res.assets?.length) setPaymentProof(res.assets[0].uri);
    });

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!amount || !receiverBank || !utrNumber) {
      showAlert("error", "Validation Error", "Please fill in all mandatory fields (Amount, Bank, UTR).");
      return;
    }
    setSubmitting(true);
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      const result = await addOfflineTopupRequest({
        amount, mode, receiverBank, utrNumber, paymentDate, paymentProof, headerToken,
      });
      if (result?.success) {
        showAlert("success", "Request Submitted!", "Your topup request has been submitted successfully.");
      } else {
        showAlert("error", "Submission Failed", result?.message || "Unable to submit request. Please try again.");
      }
    } catch (e) {
      showAlert("error", "Unexpected Error", "Something went wrong. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  const selectedBankName = banks.find((b) => b._id === receiverBank)?.bankName;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.innerContent}>
        <HeaderBar title="Topup Request" onBack={() => navigation.goBack()} />

        <View style={styles.formCard}>
          <Text style={styles.cardHeader}>Submit Topup Request</Text>

          {/* Amount */}
          <InputBox
            label="Amount (₹)"
            placeholder="Enter amount (e.g., 500)"
            value={amount}
            setValue={setAmount}
            icon="currency-inr"
            keyboardType="numeric"
          />

          {/* Bank picker */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.boxLabel}>Receiver Bank</Text>
            <TouchableOpacity style={styles.inputContainer} onPress={() => setBankModalVisible(true)} activeOpacity={0.7}>
              <View style={{ flex: 1, height: 40, justifyContent: "center" }}>
                <Text style={{ color: receiverBank ? Colors.finance_text : "#9E9E9E", fontFamily: Fonts.Medium, fontSize: 14 }}>
                  {selectedBankName || "Choose a Bank"}
                </Text>
              </View>
              <Icon name="chevron-down" size={22} color={Colors.finance_accent} />
            </TouchableOpacity>
          </View>

          {/* UTR */}
          <InputBox
            label="UTR / Ref Number"
            placeholder="e.g., 6545654323"
            value={utrNumber}
            setValue={setUtrNumber}
            icon="text-box-search-outline"
          />

          {/* Date */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.boxLabel}>Payment Date</Text>
            <TouchableOpacity style={styles.inputContainer} onPress={() => setShowDatePicker(true)} activeOpacity={0.7}>
              <View style={{ flex: 1, height: 40, justifyContent: "center" }}>
                <Text style={{ color: paymentDate ? Colors.finance_text : "#9E9E9E", fontFamily: Fonts.Medium, fontSize: 13 }}>
                  {paymentDate || "Select Payment Date (YYYY-MM-DD)"}
                </Text>
              </View>
              <Icon name="calendar" size={22} color={Colors.finance_accent} />
            </TouchableOpacity>
          </View>
          {showDatePicker && (
            <DateTimePicker value={date} mode="date" display="default" maximumDate={new Date()} onChange={onDateChange} />
          )}

          {/* Payment proof */}
          <View style={styles.fieldWrapper}>
            <Text style={styles.boxLabel}>Payment Proof</Text>
            <TouchableOpacity
              style={[styles.inputContainer, paymentProof && styles.inputProofActive]}
              onPress={() => setUploadVisible(true)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1, height: 40, justifyContent: "center" }}>
                <Text style={{ color: paymentProof ? "#22C55E" : "#9E9E9E", fontFamily: Fonts.Medium, fontSize: 13, fontWeight: paymentProof ? "700" : "400" }}>
                  {paymentProof ? "✓  Proof Attached" : "Upload Payment Screenshot"}
                </Text>
              </View>
              <Icon
                name={paymentProof ? "check-circle" : "camera-plus-outline"}
                size={22}
                color={paymentProof ? "#22C55E" : Colors.finance_accent}
              />
            </TouchableOpacity>

            {paymentProof ? (
              <View style={styles.previewBox}>
                <Image source={{ uri: paymentProof }} style={styles.previewImg} />
                <TouchableOpacity style={styles.changeOverlay} onPress={() => setUploadVisible(true)}>
                  <Icon name="pencil" size={13} color="#fff" />
                  <Text style={styles.changeTxt}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          {/* Submit */}
          <TouchableOpacity onPress={handleSubmit} style={{ marginTop: 26 }} disabled={submitting} activeOpacity={0.85}>
            <LinearGradient colors={[Colors.finance_accent, "#C29A47"]} style={styles.btnGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              {submitting
                ? <ActivityIndicator size="small" color="#000" />
                : <><Icon name="send" size={16} color="#000" style={{ marginRight: 8 }} /><Text style={styles.btnText}>Submit Request</Text></>
              }
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ─── Bank selection modal ─── */}
      <Modal visible={bankModalVisible} transparent animationType="fade" onRequestClose={() => setBankModalVisible(false)}>
        <View style={styles.bankOverlay}>
          <View style={styles.bankModal}>
            <Text style={styles.bankModalTitle}>Choose Receiver Bank</Text>
            {banksLoading && <ActivityIndicator size="small" color={Colors.finance_accent} style={{ marginBottom: 10 }} />}
            {!banksLoading && banks.length === 0 && (
              <Text style={{ color: "#999", marginVertical: 10, fontFamily: Fonts.Medium }}>No banks found.</Text>
            )}
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 250, width: "100%" }} contentContainerStyle={{ paddingBottom: 10 }}>
              {banks.map((b) => (
                <TouchableOpacity
                  key={b._id}
                  style={[styles.bankItem, receiverBank === b._id && styles.bankItemActive]}
                  onPress={() => { setReceiverBank(b._id); setBankModalVisible(false); }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={[styles.bankName, receiverBank === b._id && { color: Colors.finance_accent }]} numberOfLines={1}>{b.bankName}</Text>
                    {receiverBank === b._id && <Icon name="check-circle" size={16} color={Colors.finance_accent} />}
                  </View>
                  <Text style={styles.bankSub}>Acc Holder: {b.accountHolderName}</Text>
                  <Text style={styles.bankSub}>Acc No: {b.accountNumber}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.bankCloseBtn} onPress={() => setBankModalVisible(false)}>
              <Text style={styles.bankCloseTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Full-screen loader ─── */}
      {submitting && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color={Colors.finance_accent} />
          <Text style={styles.loaderTxt}>Submitting request...</Text>
        </View>
      )}

      {/* ─── Standard Custom Alert (success / error / warning) ─── */}
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

      {/* ─── Image Upload Custom Alert ─── */}
      <CustomAlert
        visible={uploadVisible}
        type="upload"
        title="Upload Payment Proof"
        message="Select how you'd like to add your screenshot"
        onClose={() => setUploadVisible(false)}
        onCamera={handleCamera}
        onGallery={handleGallery}
        onFile={handleFile}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.homeSecondry },
  innerContent: { alignItems: "center", paddingBottom: 40 },

  formCard: {
    width: "92%",
    backgroundColor: Colors.bg,
    borderRadius: 20,
    padding: 20,
    marginTop: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  cardHeader: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
    color: Colors.finance_text,
    marginBottom: 15,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  fieldWrapper: { width: "100%", marginTop: 15 },
  boxLabel: {
    color: Colors.finance_text,
    fontSize: 13,
    fontFamily: Fonts.Bold,
    marginBottom: 6,
    marginLeft: 4,
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: "rgba(212,176,106,0.4)",
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  inputProofActive: {
    borderColor: "#22C55E",
    backgroundColor: "#F0FDF4",
  },
  boxInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: Colors.finance_text,
    fontFamily: Fonts.Medium,
  },

  // Proof preview
  previewBox: {
    marginTop: 10,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  previewImg: { width: "100%", height: 180, resizeMode: "cover" },
  changeOverlay: {
    position: "absolute",
    top: 10, right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  changeTxt: { color: "#fff", fontSize: 12, fontFamily: Fonts.Medium },

  // Submit button
  btnGradient: {
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  btnText: { color: "#000", fontFamily: Fonts.Bold, fontSize: 15, letterSpacing: 0.5 },

  // Bank modal
  bankOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  bankModal: { width: "88%", backgroundColor: "#fff", borderRadius: 20, padding: 18, alignItems: "center", elevation: 10 },
  bankModalTitle: { fontSize: 16, fontFamily: Fonts.Bold, color: Colors.finance_text, marginBottom: 15 },
  bankItem: { width: "100%", paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderColor: "rgba(0,0,0,0.04)" },
  bankItemActive: { backgroundColor: Colors.finance_accent + "11" },
  bankName: { fontSize: 13, fontFamily: Fonts.Bold, color: "#333", flex: 1 },
  bankSub: { fontSize: 10, color: "#666", marginTop: 2, fontFamily: Fonts.Medium },
  bankCloseBtn: { marginTop: 15, paddingVertical: 10, width: "100%", alignItems: "center", backgroundColor: "#F5F5F5", borderRadius: 10 },
  bankCloseTxt: { fontFamily: Fonts.Bold, color: "#333", fontSize: 13 },

  // Loader
  loaderOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", zIndex: 999 },
  loaderTxt: { color: "#FFF", fontFamily: Fonts.Medium, fontSize: 14, marginTop: 8 },
});