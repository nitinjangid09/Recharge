import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import CustomAlert from "../../componets/CustomAlert";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { FadeSlideUp } from "../../utils/ScreenAnimations";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

const ChangePinScreen = () => {
  const [oldPin, setOldPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({
    type: "",
    title: "",
    message: "",
  });

  const showAlert = (type, title, message) => {
    setAlertData({ type, title, message });
    setAlertVisible(true);
  };

  const validatePin = (pin) => /^\d{4}$/.test(pin);

  const handleChangePin = () => {
    if (!oldPin || !newPin || !confirmPin) {
      return showAlert("error", "Missing Fields", "All fields are required");
    }

    if (!validatePin(oldPin) || !validatePin(newPin)) {
      return showAlert(
        "error",
        "Invalid PIN",
        "PIN must be exactly 4 digits"
      );
    }

    if (newPin !== confirmPin) {
      return showAlert("error", "Mismatch", "New PIN and Confirm PIN do not match");
    }

    if (oldPin === newPin) {
      return showAlert(
        "warning",
        "Same PIN",
        "New PIN must be different from old PIN"
      );
    }

    showAlert("success", "Success", "PIN changed successfully");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FadeSlideUp>
        {/* Header */}
        <View style={styles.topSection}>
          <Text style={styles.title}>Change PIN</Text>
          <Text style={styles.subtitle}>
            Secure your account by updating your PIN
          </Text>
        </View>

        {/* Form Section */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.card}>
            <ScrollView showsVerticalScrollIndicator={false}>

              {/* Old PIN */}
              <Text style={styles.label}>Old PIN</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="Enter old PIN"
                  placeholderTextColor={Colors.gray}
                  secureTextEntry={!showOld}
                  keyboardType="number-pad"
                  maxLength={4}
                  style={styles.input}
                  value={oldPin}
                  onChangeText={setOldPin}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowOld(!showOld)}
                >
                  <Icon
                    name={showOld ? "eye" : "eye-off"}
                    size={22}
                    color={Colors.primary}
                  />
                </TouchableOpacity>
              </View>

              {/* New PIN */}
              <Text style={styles.label}>New PIN</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="Enter new PIN"
                  placeholderTextColor={Colors.gray}
                  secureTextEntry={!showNew}
                  keyboardType="number-pad"
                  maxLength={4}
                  style={styles.input}
                  value={newPin}
                  onChangeText={setNewPin}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowNew(!showNew)}
                >
                  <Icon
                    name={showNew ? "eye" : "eye-off"}
                    size={22}
                    color={Colors.primary}
                  />
                </TouchableOpacity>
              </View>

              {/* Confirm PIN */}
              <Text style={styles.label}>Confirm PIN</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="Confirm new PIN"
                  placeholderTextColor={Colors.gray}
                  secureTextEntry={!showConfirm}
                  keyboardType="number-pad"
                  maxLength={4}
                  style={styles.input}
                  value={confirmPin}
                  onChangeText={setConfirmPin}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowConfirm(!showConfirm)}
                >
                  <Icon
                    name={showConfirm ? "eye" : "eye-off"}
                    size={22}
                    color={Colors.primary}
                  />
                </TouchableOpacity>
              </View>



              {/* Submit Button */}
              <TouchableOpacity
                style={styles.button}
                onPress={handleChangePin}
                activeOpacity={0.85}
              >
                <Text style={styles.buttonText}>Update PIN</Text>
              </TouchableOpacity>

            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </FadeSlideUp>

      {/* Custom Alert */}
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

export default ChangePinScreen;
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary,
  },

  /* ---------------- HEADER ---------------- */
  topSection: {
    paddingHorizontal: 24,
    paddingTop: isTablet ? 50 : 40,
    paddingBottom: 60,
  },

  title: {
    fontSize: isTablet ? 28 : 24,
    fontWeight: "700",
    color: Colors.white,
    marginBottom: 8,
  },

  subtitle: {
    fontSize: isTablet ? 16 : 14,
    color: Colors.white,
    opacity: 0.85,
    lineHeight: 20,
  },

  /* ---------------- CARD ---------------- */
  card: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    paddingHorizontal: isTablet ? 40 : 24,
    paddingTop: isTablet ? 40 : 30,
    paddingBottom: 20,
    elevation: 10,
  },

  /* ---------------- LABEL ---------------- */
  label: {
    fontSize: isTablet ? 15 : 13,
    fontWeight: "600",
    color: Colors.primary,
    marginBottom: 6,
    marginLeft: 4,
  },

  /* ---------------- INPUT ---------------- */
  inputWrapper: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E6E8F0",
    marginBottom: 20,
    elevation: 3,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: isTablet ? 4 : 0,
  },
  eyeBtn: {
    paddingHorizontal: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: isTablet ? 14 : 10,
    fontSize: isTablet ? 16 : 15,
    color: Colors.black,
  },



  /* ---------------- BUTTON ---------------- */
  button: {
    backgroundColor: Colors.accent,
    paddingVertical: isTablet ? 18 : 16,
    borderRadius: 30,
    elevation: 6,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
  },

  buttonText: {
    color: Colors.white,
    textAlign: "center",
    fontSize: isTablet ? 18 : 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});