import React, { useRef, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  Easing,
  ScrollView,
  Dimensions,
  Keyboard,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ActivityIndicator } from "react-native";
import Colors from "../../constants/Colors";
import Fonts from "../../constants/Fonts";
import { verifyUserOtp, loginUser } from "../../api/AuthApi";
import CustomAlert from "../../componets/Alerts/CustomAlert";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import FullScreenLoader from "../../componets/Loader/FullScreenLoader";

const { width } = Dimensions.get("window");
const OTP_BOX_SIZE = width / 9;
const INPUT_COUNT = 6;

export default function OTP({ navigation, route }) {
  const routeEmail = route?.params?.email;
  const routeUserName = route?.params?.userName;
  const routePassword = route?.params?.password;
  const routeSystemDetails = route?.params?.systemDetails;

  const [timer, setTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isEditable, setIsEditable] = useState(true);

  const inputRefs = useRef([]);
  const [otp, setOtp] = useState(new Array(INPUT_COUNT).fill(""));
  const [loading, setLoading] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => {
        setTimer((prev) => prev - 1);
      }, 1000);
    } else {
      setCanResend(true);
      setIsEditable(false);
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertAction, setAlertAction] = useState(null);

  /* ── Animations ─────────────────────────────────────────────────────────── */
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const inputAnims = useRef(
    [...Array(INPUT_COUNT)].map(() => new Animated.Value(0))
  ).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.back(1.5)),
      }),
    ]).start();

    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 600);
  }, []);

  /* ── Auto-verify when all 6 digits entered ─────────────────────────────── */
  useEffect(() => {
    if (otp.join("").length === INPUT_COUNT && !otp.includes("")) {
      handleVerifyOtp();
    }
  }, [otp]);

  /* ── Helpers ────────────────────────────────────────────────────────────── */
  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const animateButtonPress = () => {
    Animated.sequence([
      Animated.timing(buttonScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(buttonScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const showAlert = (title, message, action = null) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertAction(() => action);
    setAlertVisible(true);
  };

  /* ── Save full API response to AsyncStorage ─────────────────────────────
   *
   *  Token changes on every login → always read from live API response.
   *  Keys saved:
   *    "header_token"    JWT token (used in all API headers)
   *    "user_profile"    full user object (JSON string)
   *    "user_id"         _id
   *    "user_email"      email
   *    "user_name"       "firstName lastName"
   *    "user_username"   userName  (e.g. UCAM00006)
   *    "user_phone"      phone
   *    "kyc_status"      kycStatus ("pending" | "approved" | "rejected")
   *    "user_level"      level as string
   *    "role_id"         roleId
   *    "is_kyc_online"   isKycOnline (JSON boolean string)
   *
   * ─────────────────────────────────────────────────────────────────────── */
  const saveSessionToStorage = async (result) => {
    const { token, user, isKycOnline } = result;
    const pairs = [
      ["token", JSON.stringify(result)],
      ["header_token", token],
      ["is_kyc_online", JSON.stringify(isKycOnline ?? false)],
      ["on_board_charge", String(result?.onBoardCharge ?? "")],
    ];

    if (user) {
      pairs.push(
        ["user_profile", JSON.stringify(user)],
        ["user_id", user._id ?? ""],
        ["user_email", user.email ?? ""],
        ["user_name", `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim()],
        ["user_username", user.userName ?? ""],
        ["user_phone", user.phone ?? ""],
        ["kyc_status", user.kycStatus ?? ""],
        ["user_level", String(user.level ?? "")],
        ["role_id", user.roleId ?? ""],
      );
    }

    // multiSet saves all keys in one transaction — faster & atomic
    await AsyncStorage.multiSet(pairs);
    console.log("✅ Session saved | token:", token);
  };

  /* ── Resend OTP ────────────────────────────────────────────────────────── */
  const handleResendOtp = async () => {
    if (!canResend) return;

    try {
      setLoading(true);
      const result = await loginUser({
        email: routeEmail,
        userName: routeUserName,
        password: routePassword,
        systemDetails: routeSystemDetails || {
          location: { latitude: 0, longitude: 0 },
          ip: "127.0.0.1",
        },
      });

      setLoading(false);
      if (result?.success) {
        setTimer(60);
        setCanResend(false);
        setIsEditable(true);
        setOtp(new Array(INPUT_COUNT).fill(""));
        inputRefs.current[0]?.focus();
      } else {
        showAlert("Error", result?.message || "Failed to resend OTP");
      }
    } catch (err) {
      setLoading(false);
      console.error("Resend OTP error:", err);
      showAlert("Error", "Something went wrong. Please try again.");
    }
  };

  /* ── Fade out → navigate ────────────────────────────────────────────────── */
  const navigateTo = (screenName, params = {}) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      navigation.reset({
        index: 0,
        routes: [{ name: screenName, params }],
      });
    });
  };

  /* ── Verify OTP ─────────────────────────────────────────────────────────── */
  const handleVerifyOtp = async () => {
    Keyboard.dismiss();
    animateButtonPress();

    const otpValue = otp.join("");
    if (otpValue.length < INPUT_COUNT) {
      triggerShake();
      return;
    }

    // Use email from route params first, fallback to AsyncStorage
    const email = routeEmail ?? (await AsyncStorage.getItem("user_email"));
    if (!email) {
      showAlert("Session Expired", "Please login again", () => {
        navigation.replace("Login");
      });
      return;
    }

    try {
      setLoading(true);
      const result = await verifyUserOtp({ email, otp: otpValue });
      setLoading(false);

      /*
       * API Response shape:
       * {
       *   success: true,
       *   message: "User logged in successfully",
       *   user: { _id, firstName, lastName, userName, email, phone,
       *           roleId, kycStatus, level, pin, isActive, ... },
       *   token: "eyJhbGci...",   ← fresh JWT every login
       *   isKycOnline: true
       * }
       */
      if (result?.success && result?.token) {
        // ✅ Save fresh token + full user data from this login response
        await saveSessionToStorage(result);

        const isPaymentRequired = result?.isPaymentRequired;
        const isPaymentDone = result?.user?.isPaymentDone;
        const kycStatus = result?.user?.kycStatus;
        const idPaymentStatus = result?.user?.idPaymentStatus;

        if (kycStatus === "approved") {
          navigateTo("FinanceHome");
        } else if (kycStatus === "submitted") {
          navigateTo("KycSubmitted");
        } else if (kycStatus === "rekyc") {
          navigateTo("Offlinekyc", { user: result.user });
        } else if (isPaymentDone === false) {
          if (idPaymentStatus === "complete") {
            navigateTo("PaymentVerification");
          } else if (idPaymentStatus === "reject") {
            navigateTo("ActivateAccountScreen");
          } else {
            navigateTo("ActivateAccountScreen");
          }
        } else {
          navigateTo("Offlinekyc", { user: result.user });
        }
      } else {
        triggerShake();
        showAlert(
          result?.message, "The OTP you entered is incorrect. Please try again."
        );
      }
    } catch (err) {
      setLoading(false);
      console.error("OTP verify error:", err);
      triggerShake();
      showAlert(
        "Network Error",
        "Could not connect to server. Please check your internet connection."
      );
    }
  };

  /* ── Input handlers ─────────────────────────────────────────────────────── */
  const handleChange = (text, index) => {
    if (!/^\d*$/.test(text)) return;
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);
    if (text && index < INPUT_COUNT - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = ({ nativeEvent }, index) => {
    if (nativeEvent.key === "Backspace" && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
      const newOtp = [...otp];
      newOtp[index - 1] = "";
      setOtp(newOtp);
    }
  };

  const handleFocus = (index) => {
    setFocusedIndex(index);
    Animated.spring(inputAnims[index], {
      toValue: 1,
      friction: 8,
      tension: 100,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = (index) => {
    if (index === focusedIndex) setFocusedIndex(-1);
    Animated.timing(inputAnims[index], {
      toValue: otp[index] ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  /* ── UI ─────────────────────────────────────────────────────────────────── */
  return (
    <LinearGradient colors={Colors.background_gradient} style={styles.container}>
      <Animated.View
        style={[
          styles.contentWrapper,
          {
            opacity: loading ? 0.3 : fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.circle1} />
        <View style={styles.circle2} />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerContainer}>
            <View style={styles.iconCircle}>
              <Icon name="shield-check-outline" size={60} color={Colors.icon_primary} />
            </View>
            <Text style={styles.title}>Verification Code</Text>
            <Text style={styles.subtitle}>
              Please enter the code sent to <Text style={{ color: Colors.primary, fontFamily: Fonts.Bold }}>{routeEmail}</Text> to verify your account <Text style={{ color: Colors.primary, fontFamily: Fonts.Bold }}>({routeUserName})</Text>.
            </Text>
          </View>

          {/* OTP Boxes */}
          <Animated.View
            style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}
          >
            {otp.map((v, i) => {
              const borderColor = inputAnims[i].interpolate({
                inputRange: [0, 1],
                outputRange: [Colors.input_border, Colors.primary],
              });
              const scale = inputAnims[i].interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.05],
              });
              const elevation = inputAnims[i].interpolate({
                inputRange: [0, 1],
                outputRange: [2, 8],
              });

              return (
                <Animated.View
                  key={i}
                  style={[
                    styles.otpBoxWrapper,
                    {
                      transform: [{ scale }],
                      borderColor,
                      elevation,
                      shadowOpacity: inputAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.1, 0.3],
                      }),
                    },
                  ]}
                >
                  <TextInput
                    ref={(r) => (inputRefs.current[i] = r)}
                    value={v}
                    keyboardType="number-pad"
                    maxLength={1}
                    style={styles.input}
                    onChangeText={(t) => handleChange(t, i)}
                    onKeyPress={(e) => handleKeyPress(e, i)}
                    onFocus={() => handleFocus(i)}
                    onBlur={() => handleBlur(i)}
                    textAlign="center"
                    cursorColor={Colors.accent}
                    selectTextOnFocus
                    editable={isEditable}
                  />
                </Animated.View>
              );
            })}
          </Animated.View>

          {/* Security Details */}
          <View style={styles.securityInfo}>
            <View style={styles.securityIconBox}>
              <Icon name="information-outline" size={18} color={Colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.securityText}>
                The verification code is valid for 30 seconds. For your security, <Text style={{ fontFamily: Fonts.Bold, color: Colors.text_primary }}>never share this code</Text> with anyone.
              </Text>
            </View>
          </View>

          {/* Verify Button */}
          {/* <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
            <TouchableOpacity
              style={styles.btn}
              onPress={handleVerifyOtp}
              activeOpacity={0.85}
            >
              <Text style={styles.btnText}>Verify & Proceed</Text>
            </TouchableOpacity>
          </Animated.View> */}

          {/* Resend */}
          <View style={styles.resendContainer}>
            {canResend ? (
              <>
                <Text style={styles.resendText}>Still waiting for the code? </Text>
                <TouchableOpacity onPress={handleResendOtp}>
                  <Text style={styles.resendLink}>Request New OTP</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={[styles.resendText, { color: Colors.text_placeholder }]}>
                Request again in <Text style={{ color: Colors.primary, fontFamily: Fonts.Bold }}>{timer}s</Text>
              </Text>
            )}
          </View>

          {/* Forgot PIN */}
          {/* <TouchableOpacity
            style={styles.forgotPinBtn}
            onPress={() => navigation.navigate("ForgotPin")}
          >
            <Text style={styles.forgotPinText}>Forgot PIN?</Text>
          </TouchableOpacity> */}
        </ScrollView>
      </Animated.View>

      <FullScreenLoader visible={loading} label="Verifying OTP..." />

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={() => {
          setAlertVisible(false);
          alertAction && alertAction();
        }}
      />
    </LinearGradient>
  );
}

/* ── Styles ─────────────────────────────────────────────────────────────────── */
const styles = StyleSheet.create({
  container: { flex: 1 },
  contentWrapper: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 40,
  },
  headerContainer: {
    alignItems: "center",
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.Bold,
    color: Colors.text_primary,
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: Fonts.Medium,
    color: Colors.text_secondary,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: "85%",
  },
  otpRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 40,
    paddingHorizontal: 5,
  },
  otpBoxWrapper: {
    width: OTP_BOX_SIZE,
    height: OTP_BOX_SIZE * 1.2,
    borderRadius: 12,
    backgroundColor: Colors.secondary,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 0.8,
    shadowColor: Colors.slate_500,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 3,
  },
  input: {
    fontSize: 20,
    fontFamily: Fonts.Bold,
    color: Colors.text_primary,
    width: "100%",
    height: "100%",
    textAlign: "center",
    padding: 0,
  },
  btn: {
    marginTop: 40,
    backgroundColor: Colors.button_bg,
    borderRadius: 30,
    paddingVertical: 14,
    alignItems: "center",
    width: "100%",
  },
  btnText: {
    color: Colors.button_text,
    fontSize: 16,
    fontFamily: Fonts.Bold,
  },
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 20,
  },
  resendText: {
    color: Colors.text_secondary,
    fontFamily: Fonts.Medium,
    fontSize: 16,
  },
  resendLink: {
    color: Colors.accent,
    fontFamily: Fonts.Bold,
    fontSize: 16,
  },
  forgotPinBtn: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 20,
  },
  forgotPinText: {
    color: Colors.text_primary,
    fontFamily: Fonts.Bold,
    fontSize: 14,
    textDecorationLine: "underline",
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.circle_bg,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  securityInfo: {
    flexDirection: "row",
    backgroundColor: Colors.whiteOpacity_08,
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
  },
  securityIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.secondary,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  securityText: {
    fontSize: 13,
    color: Colors.text_secondary,
    lineHeight: 18,
    fontFamily: Fonts.Medium,
  },
  circle1: {
    position: "absolute",
    top: -60, left: -60,
    width: 200, height: 200,
    borderRadius: 100,
    backgroundColor: Colors.circle_bg,
    zIndex: -1,
  },
  circle2: {
    position: "absolute",
    bottom: 100, right: -80,
    width: 280, height: 280,
    borderRadius: 140,
    backgroundColor: Colors.circle_bg,
    zIndex: -1,
  },
});