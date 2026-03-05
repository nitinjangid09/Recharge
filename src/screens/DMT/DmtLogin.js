import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Modal,
  ScrollView,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Colors from "../../utils/Color";
import CustomAlert from "../../componets/CustomAlert";
import { fadeIn, slideUp, buttonPress } from "../../utils/ScreenAnimations";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

const DmtLogin = () => {
  const navigation = useNavigation();

  const [mobileNumber, setMobileNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1);
  const [otpVisible, setOtpVisible] = useState(false);

  /* Alert */
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertData, setAlertData] = useState({ type: "", title: "", message: "" });

  const showAlert = (type, title, message) => {
    setAlertData({ type, title, message });
    setAlertVisible(true);
  };

  /* ======================
     ANIMATION VALUES
  ======================= */

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(40)).current;

  const formOpacity = useRef(new Animated.Value(0)).current;
  const formTranslate = useRef(new Animated.Value(30)).current;

  const buttonScale = useRef(new Animated.Value(1)).current;

  const otpScale = useRef(new Animated.Value(0)).current;

  /* ======================
     INITIAL LOAD ANIMATION
  ======================= */

  useEffect(() => {
    Animated.parallel([
      fadeIn(headerOpacity, 600),
      slideUp(headerTranslate, 600),
    ]).start();

    setTimeout(() => {
      Animated.parallel([
        fadeIn(formOpacity, 600),
        slideUp(formTranslate, 600),
      ]).start();
    }, 200);
  }, []);

  /* Animate Step Change */
  useEffect(() => {
    formOpacity.setValue(0);
    formTranslate.setValue(20);

    Animated.parallel([
      fadeIn(formOpacity, 400),
      slideUp(formTranslate, 400),
    ]).start();
  }, [step]);

  /* Animate OTP Modal */
  useEffect(() => {
    if (otpVisible) {
      otpScale.setValue(0.7);
      Animated.spring(otpScale, {
        toValue: 1,
        useNativeDriver: true,
      }).start();
    }
  }, [otpVisible]);

  /* ======================
     HANDLERS
  ======================= */

  const handleMobileSubmit = () => {
    if (mobileNumber.length !== 10) {
      return showAlert("error", "Invalid Mobile", "Enter valid 10-digit mobile number");
    }

    buttonPress(buttonScale).start(() => {
      setStep(2);
    });
  };

  const handleAadhaarSubmit = () => {
    if (aadhaarNumber.length !== 12) {
      return showAlert("error", "Invalid Aadhaar", "Enter valid 12-digit Aadhaar number");
    }

    buttonPress(buttonScale).start(() => {
      setOtp("");
      setOtpVisible(true);
    });
  };

  const handleOtpVerify = () => {
    if (otp.length !== 6) {
      return showAlert("error", "Invalid OTP", "Enter valid 6-digit OTP");
    }

    setOtpVisible(false);
    navigation.navigate("DmtHome");
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.container}>
          {/* HEADER */}
          <Animated.View
            style={[
              styles.header,
              {
                opacity: headerOpacity,
                transform: [{ translateY: headerTranslate }],
              },
            ]}
          >
            <Text style={styles.headerTitle}>DMT Login</Text>
            <Text style={styles.headerSub}>Secure Domestic Money Transfer</Text>
          </Animated.View>

          {/* FORM */}
          <Animated.ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            style={{
              opacity: formOpacity,
              transform: [{ translateY: formTranslate }],
            }}
          >
            <Text style={styles.title}>
              {step === 1 ? "Enter Mobile Number" : "Enter Aadhaar Number"}
            </Text>

            {step === 1 && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Mobile Number"
                  keyboardType="number-pad"
                  maxLength={10}
                  placeholderTextColor={"#000000"}

                  value={mobileNumber}
                  onChangeText={(text) =>
                    setMobileNumber(text.replace(/[^0-9]/g, ""))
                  }
                />

                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={handleMobileSubmit}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.buttonText}>Continue</Text>
                  </TouchableOpacity>
                </Animated.View>
              </>
            )}

            {step === 2 && (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Aadhaar Number"
                  keyboardType="number-pad"
                  maxLength={12}
                  placeholderTextColor={"#000000"}

                  value={aadhaarNumber}
                  onChangeText={(text) =>
                    setAadhaarNumber(text.replace(/[^0-9]/g, ""))
                  }
                />

                <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                  <TouchableOpacity
                    style={styles.button}
                    onPress={handleAadhaarSubmit}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.buttonText}>Verify Aadhaar</Text>
                  </TouchableOpacity>
                </Animated.View>

                <TouchableOpacity
                  style={styles.linkBtn}
                  onPress={() => setStep(1)}
                >
                  <Text style={styles.linkText}>Change mobile number</Text>
                </TouchableOpacity>
              </>
            )}
          </Animated.ScrollView>
        </View>

        {/* OTP MODAL */}
        <Modal visible={otpVisible} transparent animationType="fade">
          <View style={styles.modalOverlay}>
            <Animated.View
              style={[
                styles.otpCard,
                { transform: [{ scale: otpScale }] },
              ]}
            >
              <Text style={styles.otpTitle}>Enter OTP</Text>
              <Text style={styles.otpSub}>OTP sent to {mobileNumber}</Text>

              <TextInput
                style={styles.otpInput}
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={(text) =>
                  setOtp(text.replace(/[^0-9]/g, ""))
                }
                placeholder="******"
                placeholderTextColor={Colors.gray}
              />

              <TouchableOpacity
                style={styles.otpButton}
                onPress={handleOtpVerify}
              >
                <Text style={styles.otpButtonText}>Verify OTP</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => setOtpVisible(false)}
              >
                <Text style={styles.closeText}>Cancel</Text>
              </TouchableOpacity>
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default DmtLogin;
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary,
  },

  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  /* ================= HEADER ================= */

  header: {
    height: isTablet ? 220 : 120,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },

  headerTitle: {
    color: Colors.white,
    fontSize: isTablet ? 28 : 22,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  headerSub: {
    marginTop: 6,
    color: Colors.secondary,
    fontSize: 13,
    textAlign: "center",
  },

  /* ================= CONTENT ================= */

  content: {
    padding: 20,
    paddingTop: 28,
    paddingBottom: 40,
  },

  title: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary,
    marginBottom: 18,
  },

  /* ================= INPUT ================= */

  input: {
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 14,
    color: Colors.black,
    marginBottom: 16,
    backgroundColor: Colors.white,
  },

  /* ================= BUTTON ================= */

  button: {
    backgroundColor: Colors.accent,
    paddingVertical: isTablet ? 18 : 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 8,
    elevation: 2,
  },

  buttonText: {
    color: Colors.white,
    fontSize: isTablet ? 18 : 16,
    fontWeight: "600",
    letterSpacing: 0.4,
  },

  /* ================= LINK ================= */

  linkBtn: {
    marginTop: 14,
    alignItems: "center",
  },

  linkText: {
    color: Colors.lightPrimary,
    fontSize: 13,
    fontWeight: "500",
  },

  /* ================= OTP MODAL ================= */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
  },

  otpCard: {
    width: "85%",
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingVertical: 28,
    paddingHorizontal: 22,
    alignItems: "center",
    elevation: 5,
  },

  otpTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.primary,
  },

  otpSub: {
    fontSize: 13,
    color: Colors.gray,
    marginVertical: 10,
    textAlign: "center",
  },

  otpInput: {
    width: "100%",
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 14,
    paddingVertical: 14,
    fontSize: 20,
    textAlign: "center",
    letterSpacing: 8,
    color: Colors.black,
    marginBottom: 16,
    backgroundColor: Colors.white,
  },

  otpButton: {
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    paddingHorizontal: 40,
    borderRadius: 14,
  },

  otpButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },

  closeBtn: {
    marginTop: 12,
  },

  closeText: {
    color: Colors.gray,
    fontSize: 13,
  },
});