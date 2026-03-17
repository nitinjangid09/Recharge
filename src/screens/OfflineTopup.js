import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  Image,
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
const InputBox = ({ label, value, setValue, icon, placeholder, keyboardType }) => {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.boxLabel}>{label}</Text>
      <View style={styles.inputContainer}>
        <TextInput
          value={value}
          onChangeText={setValue}
          keyboardType={keyboardType || "default"}
          placeholder={placeholder}
          placeholderTextColor="#9E9E9E"
          style={styles.boxInput}
        />
        <Icon name={icon} size={22} color={Colors.finance_accent} />
      </View>
    </View>
  );
};

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
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("success");

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      setPaymentDate(`${year}-${month}-${day}`);
    }
  };

  useEffect(() => {
    const fetchBanks = async () => {
      setBanksLoading(true);
      try {
        const headerToken = await AsyncStorage.getItem("header_token");
        const result = await getAllTopupBanks({ headerToken });
        console.log("[DEBUG] Banks Result:", result);
        if (result?.success) {
          setBanks(result.data || []);
        }
      } catch (e) {
        console.log("Fetch banks error:", e);
      } finally {
        setBanksLoading(false);
      }
    };
    fetchBanks();
  }, []);

  const pickImage = () => {
    Alert.alert("Upload Proof", "Choose an option", [
      {
        text: "Camera",
        onPress: () => {
          launchCamera({ mediaType: "photo", quality: 0.7 }, (res) => {
            if (!res.didCancel && res.assets?.length) setPaymentProof(res.assets[0].uri);
          });
        },
      },
      {
        text: "Gallery",
        onPress: () => {
          launchImageLibrary({ mediaType: "photo", quality: 0.7 }, (res) => {
            if (!res.didCancel && res.assets?.length) setPaymentProof(res.assets[0].uri);
          });
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleSubmit = async () => {
    if (!amount || !receiverBank || !utrNumber) {
      setAlertType("error");
      setAlertTitle("Validation Error");
      setAlertMessage("Please fill in all mandatory fields (Amount, Bank, UTR)");
      setAlertVisible(true);
      return;
    }
    
    setSubmitting(true);
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      const result = await addOfflineTopupRequest({
        amount,
        mode,
        receiverBank,
        utrNumber,
        paymentDate,
        paymentProof,
        headerToken
      });

      if (result?.success) {
        setAlertType("success");
        setAlertTitle("Success");
        setAlertMessage("Topup request submitted successfully!");
        setAlertVisible(true);
      } else {
        setAlertType("error");
        setAlertTitle("Failed");
        setAlertMessage(result?.message || "Failed to submit request");
        setAlertVisible(true);
      }
    } catch (e) {
      console.log("Submit Error:", e);
      setAlertType("error");
      setAlertTitle("Error");
      setAlertMessage("Something went wrong during submission");
      setAlertVisible(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.innerContent}>
        <HeaderBar title="Offline Topup Request" onBack={() => navigation.goBack()} />

        <View style={styles.formCard}>
          <Text style={styles.cardHeader}>Submit Topup Request</Text>

          <InputBox
            label="Amount (₹)"
            placeholder="Enter amount (e.g., 10)"
            value={amount}
            setValue={setAmount}
            icon="currency-inr"
            keyboardType="numeric"
          />

          <View style={styles.fieldWrapper}>
            <Text style={styles.boxLabel}>Mode</Text>
            <View style={styles.modeContainer}>
              {["upi", "neft", "rtgs", "cash"].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.modeItem, mode === m && styles.modeItemActive]}
                  onPress={() => setMode(m)}
                >
                  <Text style={[styles.modeText, mode === m && styles.modeTextActive]}>
                    {m.toUpperCase()}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.fieldWrapper}>
            <Text style={styles.boxLabel}>Select Receiver Bank</Text>
            <TouchableOpacity 
              style={styles.inputContainer} 
              onPress={() => setBankModalVisible(true)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1, height: 40, justifyContent: "center" }}>
                <Text style={{ color: receiverBank ? Colors.finance_text : "#9E9E9E", fontFamily: Fonts.Medium, fontSize: 14 }}>
                  {receiverBank ? banks.find(b => b._id === receiverBank)?.bankName || "Select Bank" : "Choose a Bank"}
                </Text>
              </View>
              <Icon name="chevron-down" size={22} color={Colors.finance_accent} />
            </TouchableOpacity>
          </View>

          <InputBox
            label="UTR / Ref Number"
            placeholder="e.g., 6545654323"
            value={utrNumber}
            setValue={setUtrNumber}
            icon="text-box-search-outline"
          />

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
            <DateTimePicker
              value={date}
              mode="date"
              display="default"
              maximumDate={new Date()}
              onChange={onDateChange}
            />
          )}

          <View style={styles.fieldWrapper}>
            <Text style={styles.boxLabel}>Payment Proof</Text>
            <TouchableOpacity style={styles.inputContainer} onPress={pickImage} activeOpacity={0.7}>
              <View style={{ flex: 1, height: 40, justifyContent: "center" }}>
                <Text style={{ color: paymentProof ? Colors.finance_text : "#9E9E9E", fontFamily: Fonts.Medium, fontSize: 13 }}>
                  {paymentProof ? "Proof Selected" : "Upload Payment Screenshot"}
                </Text>
              </View>
              <Icon name="camera-plus-outline" size={22} color={Colors.finance_accent} />
            </TouchableOpacity>
            {paymentProof ? (
              <Image source={{ uri: paymentProof }} style={{ width: "100%", height: 180, borderRadius: 12, marginTop: 10, resizeMode: "cover", borderWidth: 1, borderColor: "rgba(0,0,0,0.1)" }} />
            ) : null}
          </View>

          <TouchableOpacity onPress={handleSubmit} style={{ marginTop: 25 }}>
            <LinearGradient
              colors={[Colors.finance_accent, "#C29A47"]}
              style={styles.btnGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.btnText}>Submit Request</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* ─── Bank Selection Dialog ─── */}
      <Modal visible={bankModalVisible} transparent animationType="fade" onRequestClose={() => setBankModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Receiver Bank</Text>
            {banksLoading && <ActivityIndicator size="small" color={Colors.finance_accent} style={{ marginBottom: 10 }} />}
            {banks.length === 0 && !banksLoading && <Text style={{ color: "#999", marginVertical: 10 }}>No bank items details found.</Text>}
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 250, width: "100%" }} contentContainerStyle={{ paddingBottom: 10 }}>
              {banks.map((b) => (
                <TouchableOpacity key={b._id} style={[styles.modalBankCard, receiverBank === b._id && styles.modalBankCardActive]} onPress={() => { setReceiverBank(b._id); setBankModalVisible(false); }}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <Text style={[styles.modalBankName, receiverBank === b._id && styles.modalBankNameActive]} numberOfLines={1}>{b.bankName}</Text>
                    {receiverBank === b._id && <Icon name="check-circle" size={16} color={Colors.finance_accent} style={{ marginLeft: 5 }} />}
                  </View>
                  <Text style={styles.modalBankSub} numberOfLines={1}>Acc Holder: {b.accountHolderName}</Text>
                  <Text style={styles.modalBankSub} numberOfLines={1}>Acc No: {b.accountNumber}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setBankModalVisible(false)}>
              <Text style={styles.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {submitting && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color={Colors.finance_accent} />
          <Text style={styles.loaderText}>Submitting request...</Text>
        </View>
      )}

      {/* ─── Response Custom Alert ─── */}
      <Modal visible={alertVisible} transparent animationType="slide">
         <View style={styles.alertOverlay}>
            <View style={styles.alertContent}>
               <View style={[styles.alertIconCircle, { backgroundColor: alertType === 'success' ? '#22C55E' : '#EF4444' }]}>
                  <Icon name={alertType === 'success' ? 'check' : 'close'} size={32} color="#fff" />
               </View>
               <Text style={styles.alertTitle}>{alertTitle}</Text>
               <Text style={styles.alertMessage}>{alertMessage}</Text>
               
               <TouchableOpacity 
                 style={{ width: "100%", marginTop: 10 }} 
                 onPress={() => {
                   setAlertVisible(false);
                   if (alertType === 'success') {
                      setTimeout(() => navigation.goBack(), 100);
                   }
                 }}
               >
                 <LinearGradient
                   colors={[Colors.finance_accent, "#C29A47"]}
                   style={styles.alertBtn}
                   start={{ x: 0, y: 0 }}
                   end={{ x: 1, y: 1 }}
                 >
                   <Text style={{ color: "#000", fontFamily: Fonts.Bold, fontSize: 14 }}>Done</Text>
                 </LinearGradient>
               </TouchableOpacity>
            </View>
         </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.finance_bg_1 },
  innerContent: { alignItems: "center", paddingBottom: 40 },
  formCard: {
    width: "92%",
    backgroundColor: "#fff",
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
    borderColor: "rgba(212, 176, 106, 0.4)",
    borderRadius: 12,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "center",
  },
  boxInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
    color: Colors.finance_text,
    fontFamily: Fonts.Medium,
  },
  modeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 5,
  },
  modeItem: {
    flex: 1,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(212, 176, 106, 0.4)",
    borderRadius: 10,
    alignItems: "center",
    marginHorizontal: 3,
    backgroundColor: "#F9F9F9",
  },
  modeItemActive: {
    backgroundColor: Colors.finance_accent + "22",
    borderColor: Colors.finance_accent,
  },
  modeText: { fontSize: 11, fontFamily: Fonts.Bold, color: "#666" },
  modeTextActive: { color: Colors.finance_accent },
  btnGradient: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  btnText: { color: "#000", fontFamily: Fonts.Bold, fontSize: 15, letterSpacing: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center" },
  modalContent: { width: "88%", backgroundColor: "#fff", borderRadius: 20, padding: 18, alignItems: "center", elevation: 10 },
  modalTitle: { fontSize: 16, fontFamily: Fonts.Bold, color: Colors.finance_text, marginBottom: 15 },
  modalBankCard: { width: "100%", paddingVertical: 12, paddingHorizontal: 4, borderBottomWidth: 1, borderColor: "rgba(0,0,0,0.04)" },
  modalBankCardActive: { backgroundColor: Colors.finance_accent + "11" },
  modalBankName: { fontSize: 13, fontFamily: Fonts.Bold, color: "#333", flex: 1 },
  modalBankNameActive: { color: Colors.finance_accent },
  modalBankSub: { fontSize: 10, color: "#666", marginTop: 2, fontFamily: Fonts.Medium },
  closeBtn: { marginTop: 15, paddingVertical: 10, width: "100%", alignItems: "center", backgroundColor: "#F5F5F5", borderRadius: 10 },
  closeBtnText: { fontFamily: Fonts.Bold, color: "#333", fontSize: 13 },
  loaderOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", zIndex: 999 },
  loaderText: { color: "#FFF", fontFamily: Fonts.Medium, fontSize: 14, marginTop: 8 },
  alertOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", zIndex: 1000 },
  alertContent: { width: "84%", backgroundColor: "#fff", borderRadius: 24, padding: 25, alignItems: "center", elevation: 12 },
  alertIconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: "center", alignItems: "center", marginBottom: 15 },
  alertTitle: { fontSize: 18, fontFamily: Fonts.Bold, color: Colors.finance_text, marginBottom: 8 },
  alertMessage: { fontSize: 13, color: "#666", textAlign: "center", marginBottom: 20, fontFamily: Fonts.Medium, lineHeight: 18 },
  alertBtn: { width: "100%", paddingVertical: 12, borderRadius: 12, alignItems: "center", elevation: 2 },
});
