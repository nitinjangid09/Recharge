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
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Colors from "../../utils/Color";
import CustomAlert from "../../componets/CustomAlert";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

const ForgotPasswordScreen = () => {
  const navigation = useNavigation();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [otpModal, setOtpModal] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ type: "", title: "", message: "" });

  /* ================= Animations ================= */

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleBtn = useRef(new Animated.Value(1)).current;
  const modalScale = useRef(new Animated.Value(0)).current;
  const modalOpacity = useRef(new Animated.Value(0)).current;
  const borderAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const openModal = () => {
    setOtpModal(true);
    Animated.parallel([
      Animated.timing(modalOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.spring(modalScale, {
        toValue: 1,
        friction: 6,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeModal = () => {
    Animated.parallel([
      Animated.timing(modalOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(modalScale, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setOtpModal(false));
  };

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(scaleBtn, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleBtn, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const showAlert = (type, title, message) => {
    setAlertData({ type, title, message });
    setAlertVisible(true);
  };

  const isValidEmail = (value) => /^\S+@\S+\.\S+$/.test(value);

  const sendOtp = () => {
    if (!email.trim()) {
      showAlert("error", "Error", "Please enter email address");
      return;
    }

    if (!isValidEmail(email)) {
      showAlert("error", "Invalid Email", "Please enter a valid email");
      return;
    }

    animateButton();
    setOtp("");
    openModal();
  };

  const verifyOtp = () => {
    if (!otp.trim()) {
      showAlert("error", "Error", "Please enter OTP");
      return;
    }

    if (otp.length !== 6) {
      showAlert("error", "Invalid OTP", "OTP must be 6 digits");
      return;
    }

    closeModal();
    navigation.navigate("ResetPassword");
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.lightGray, Colors.primary],
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* 🔵 Top Section */}
      <Animated.View
        style={[
          styles.topSection,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Text style={styles.title}>Forgot Password</Text>
        <Text style={styles.subtitle}>
          Enter your registered email to receive OTP
        </Text>
      </Animated.View>

      {/* ⚪ Card */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Animated.View
          style={[
            styles.card,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Email Address</Text>

            <Animated.View style={[styles.inputWrapper, { borderColor }]}>
              <TextInput
                placeholder="Enter your email"
                placeholderTextColor={Colors.gray}
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                onFocus={() =>
                  Animated.timing(borderAnim, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: false,
                  }).start()
                }
                onBlur={() =>
                  Animated.timing(borderAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: false,
                  }).start()
                }
              />
            </Animated.View>

            <Animated.View style={{ transform: [{ scale: scaleBtn }] }}>
              <TouchableOpacity style={styles.button} onPress={sendOtp}>
                <Text style={styles.buttonText}>Send OTP</Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* 🔐 Animated OTP Modal */}
      <Modal transparent visible={otpModal} animationType="none">
        <Animated.View style={[styles.modalOverlay, { opacity: modalOpacity }]}>
          <Animated.View
            style={[
              styles.modalBox,
              { transform: [{ scale: modalScale }] },
            ]}
          >
            <Text style={styles.modalTitle}>Enter OTP</Text>

            <TextInput
              placeholder="******"
              placeholderTextColor={Colors.gray}
              style={styles.otpInput}
              keyboardType="number-pad"
              maxLength={6}
              value={otp}
              onChangeText={setOtp}
            />

            <TouchableOpacity style={styles.verifyBtn} onPress={verifyOtp}>
              <Text style={styles.verifyText}>Verify</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={closeModal}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
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

export default ForgotPasswordScreen;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary,
  },

  /* 🔵 Top Header Section */
  topSection: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 60,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: Colors.white,
    marginBottom: 8,
    letterSpacing: 0.5,
  },

  subtitle: {
    fontSize: 14,
    color: Colors.white,
    opacity: 0.85,
    lineHeight: 20,
  },

  /* ⚪ Card Section */
  card: {
    flex: 1,
    backgroundColor: Colors.bg,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: isTablet ? 40 : 24,
    paddingTop: 30,
    shadowColor: Colors.black,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 10,
    elevation: 8,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
    marginBottom: 8,
    marginLeft: 4,
    letterSpacing: 0.3,
  },

  inputWrapper: {
    borderWidth: 1.5,
    borderRadius: 14,
    marginBottom: 25,
    backgroundColor: Colors.white,
    borderColor: Colors.lightGray,
  },

  input: {
    paddingHorizontal: 16,
    paddingVertical: 15,
    fontSize: 15,
    color: Colors.black,
  },

  /* 🔘 Main Button */
  button: {
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.accent,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 8,
    elevation: 6,
  },

  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.5,
  },

  /* 🔐 OTP Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
  },

  modalBox: {
    width: width * 0.85,
    backgroundColor: Colors.bg,
    borderRadius: 24,
    paddingVertical: 30,
    paddingHorizontal: 25,
    alignItems: "center",
    shadowColor: Colors.black,
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 15,
    elevation: 10,
  },

  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 25,
    color: Colors.primary,
    letterSpacing: 0.4,
  },

  otpInput: {
    borderWidth: 1.5,
    borderColor: Colors.lightGray,
    borderRadius: 14,
    width: "100%",
    textAlign: "center",
    fontSize: 20,
    paddingVertical: 14,
    marginBottom: 25,
    backgroundColor: Colors.white,
    color: Colors.black,
    letterSpacing: 8,
  },

  verifyBtn: {
    backgroundColor: Colors.accent,
    width: "100%",
    paddingVertical: 15,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.accent,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 8,
    elevation: 6,
  },

  verifyText: {
    color: Colors.white,
    fontWeight: "600",
    fontSize: 15,
    letterSpacing: 0.5,
  },

  cancelText: {
    marginTop: 18,
    color: Colors.primary,
    fontWeight: "500",
    fontSize: 14,
  },
});