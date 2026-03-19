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
import { FadeSlideUp } from "../../utils/ScreenAnimations";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

const ChangePasswordScreen = () => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secure, setSecure] = useState(true);

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

  const handleChangePassword = () => {
    if (!oldPassword || !newPassword || !confirmPassword) {
      showAlert("error", "Missing Fields", "All fields are required");
      return;
    }

    if (newPassword !== confirmPassword) {
      showAlert("error", "Mismatch", "Passwords do not match");
      return;
    }

    if (oldPassword === newPassword) {
      showAlert(
        "warning",
        "Same Password",
        "New password must be different from old password"
      );
      return;
    }

    showAlert("success", "Success", "Password changed successfully");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <FadeSlideUp>
        {/* Header Section */}
        <View style={styles.topSection}>
          <Text style={styles.title}>Change Password</Text>
          <Text style={styles.subtitle}>
            Secure your account by updating your password
          </Text>
        </View>

        {/* Card Section */}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <View style={styles.card}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Old Password */}
              <Text style={styles.label}>Old Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="Enter old password"
                  placeholderTextColor={Colors.gray}
                  secureTextEntry={secure}
                  style={styles.input}
                  value={oldPassword}
                  onChangeText={setOldPassword}
                />
              </View>

              {/* New Password */}
              <Text style={styles.label}>New Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="Enter new password"
                  placeholderTextColor={Colors.gray}
                  secureTextEntry={secure}
                  style={styles.input}
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
              </View>

              {/* Confirm Password */}
              <Text style={styles.label}>Confirm Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="Confirm new password"
                  placeholderTextColor={Colors.gray}
                  secureTextEntry={secure}
                  style={styles.input}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
              </View>

              {/* Toggle */}
              <TouchableOpacity
                style={styles.toggleBtn}
                onPress={() => setSecure(!secure)}
              >
                <Text style={styles.toggleText}>
                  {secure ? "Show Passwords" : "Hide Passwords"}
                </Text>
              </TouchableOpacity>

              {/* Button */}
              <TouchableOpacity
                style={styles.button}
                onPress={handleChangePassword}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>Update Password</Text>
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

export default ChangePasswordScreen;
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
  },

  input: {
    paddingHorizontal: 16,
    paddingVertical: isTablet ? 18 : 14,
    fontSize: isTablet ? 16 : 14,
    color: Colors.black,
  },

  /* ---------------- TOGGLE ---------------- */
  toggleBtn: {
    alignSelf: "flex-end",
    marginBottom: 30,
  },

  toggleText: {
    color: Colors.primary,
    fontSize: 13,
    fontWeight: "600",
  },

  /* ---------------- BUTTON ---------------- */
  button: {
    backgroundColor: Colors.accent,
    paddingVertical: isTablet ? 18 : 16,
    borderRadius: 30,
    elevation: 6,
  },

  buttonText: {
    color: Colors.white,
    textAlign: "center",
    fontSize: isTablet ? 18 : 16,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});