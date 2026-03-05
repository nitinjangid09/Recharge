import React, { useState } from "react";
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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../utils/Color";
import showAlert from "../../componets/CustomAlert"

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

const MoneyTransferScreen = () => {
  const [amount, setAmount] = useState("");
  const [otp, setOtp] = useState("");
  const [confirmModal, setConfirmModal] = useState(false);
  const [otpModal, setOtpModal] = useState(false);

  /* ------------------ Amount Validation ------------------ */
  const validateAmount = () => {
    const numericAmount = parseFloat(amount);

    if (!amount) {
      showAlert("Error", "Please enter amount");
      return false;
    }

    if (isNaN(numericAmount) || numericAmount <= 0) {
      showAlert("Error", "Enter valid amount");
      return false;
    }

    return true;
  };

  /* ------------------ OTP Validation ------------------ */
  const validateOtp = () => {
    if (!otp) {
      showAlert("Error", "Please enter OTP");
      return false;
    }

    if (!/^\d{6}$/.test(otp)) {
      showAlert("Error", "OTP must be 6 digit number");
      return false;
    }

    return true;
  };

  const handleConfirm = () => {
    if (validateAmount()) {
      setConfirmModal(true);
    }
  };

  const handleSendOtp = () => {
    setConfirmModal(false);
    setOtpModal(true);
  };

  const handleTransfer = () => {
    if (validateOtp()) {
      showAlert("Success", "Money Transferred Successfully");
      setOtpModal(false);
      setAmount("");
      setOtp("");
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" />

      {/* ================= HEADER ================= */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>DMT Transfer</Text>
        <Text style={styles.headerSubtitle}>
          Secure Domestic Money Transfer
        </Text>
      </View>

      {/* ================= BODY ================= */}
      <View style={styles.bodyWrapper}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.container}
        >
          <Text style={styles.label}>Enter Transfer Amount</Text>

          <TextInput
            style={styles.input}
            placeholder="₹ Enter Amount"
            keyboardType="numeric"
            value={amount}
            onChangeText={(text) =>
              setAmount(text.replace(/[^0-9.]/g, ""))
            }
            placeholderTextColor={Colors.gray}
            maxLength={10}
          />

          <TouchableOpacity style={styles.button} onPress={handleConfirm}>
            <Text style={styles.buttonText}>Proceed Transfer</Text>
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>

      {/* ================= CONFIRM MODAL ================= */}
      <Modal transparent visible={confirmModal} animationType="fade">
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Confirm Transfer</Text>
            <Text style={styles.modalText}>
              Are you sure you want to transfer ₹{amount}?
            </Text>

            <View style={styles.row}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setConfirmModal(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleSendOtp}
              >
                <Text style={styles.confirmText}>Send OTP</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ================= OTP MODAL ================= */}
      <Modal transparent visible={otpModal} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Enter OTP</Text>

            <TextInput
              style={styles.input}
              placeholder="Enter 6 Digit OTP"
              keyboardType="number-pad"
              value={otp}
              onChangeText={(text) =>
                setOtp(text.replace(/[^0-9]/g, ""))
              }
              maxLength={6}
              placeholderTextColor={Colors.gray}
            />

            <TouchableOpacity style={styles.button} onPress={handleTransfer}>
              <Text style={styles.buttonText}>Verify & Transfer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default MoneyTransferScreen;
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary,
  },

  /* ===== HEADER ===== */
  header: {
    backgroundColor: Colors.primary,
    paddingVertical: 45,
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.white,
  },

  headerSubtitle: {
    fontSize: 15,
    color: Colors.lightGray,
    marginTop: 5,
  },

  /* ===== BODY ===== */
  bodyWrapper: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingTop: 40,
  },

  container: {
    paddingHorizontal: isTablet ? 60 : 25,
  },

  label: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.black,
    marginBottom: 15,
  },

  input: {
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 14,
    padding: 16,
    fontSize: 14,
    marginBottom: 16,
    backgroundColor: Colors.white,
  },
  button: {
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },

  buttonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: "bold",
  },

  /* ===== MODAL ===== */
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalBox: {
    width: "85%",
    backgroundColor: Colors.white,
    padding: 25,
    borderRadius: 20,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.black,
    marginBottom: 15,
    textAlign: "center",
  },

  modalText: {
    fontSize: 15,
    color: Colors.gray,
    marginBottom: 25,
    textAlign: "center",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  cancelBtn: {
    flex: 1,
    backgroundColor: Colors.gray,
    padding: 14,
    borderRadius: 12,
    marginRight: 10,
    alignItems: "center",
  },

  confirmBtn: {
    flex: 1,
    backgroundColor: Colors.accent,
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  cancelText: {
    color: Colors.white,
    fontWeight: "bold",
  },

  confirmText: {
    color: Colors.white,
    fontWeight: "bold",
  },
});
