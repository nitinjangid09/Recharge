import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Animated,
  Easing,
  Dimensions,
  Image,
  Keyboard,
  ActivityIndicator,
  ScrollView,
  Platform,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import DeviceInfo from "react-native-device-info";
import { NetworkInfo } from "react-native-network-info";

import Colors from "../../constants/Colors";
import Fonts from "../../constants/Fonts";
import { loginUser } from "../../api/AuthApi";
import CustomAlert from "../../componets/Alerts/CustomAlert";

/* ---------- RESPONSIVE SCALE ---------- */
const { width } = Dimensions.get("window");
const scale = width / 375;

// ─── AsyncStorage keys ────────────────────────────────────────────────────────
const STORAGE_KEYS = {
  REMEMBER_ME: "remember_me",
  EMAIL: "saved_email",
  USER_NAME: "saved_userName",
  PASSWORD: "saved_password",
};

export default function Login({ navigation }) {
  /* ---------- STATES ---------- */
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState(null);

  // Inline field errors
  const [errors, setErrors] = useState({ email: "", userName: "", password: "" });

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("info");

  /* ---------- ANIMATIONS ---------- */
  const pageAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  const emailFocusAnim = useRef(new Animated.Value(0)).current;
  const userFocusAnim = useRef(new Animated.Value(0)).current;
  const passFocusAnim = useRef(new Animated.Value(0)).current;

  // ── On mount: page-in animation + load saved credentials ──────────────────
  useEffect(() => {
    Animated.timing(pageAnim, {
      toValue: 1,
      duration: 1000,
      easing: Easing.out(Easing.exp),
      useNativeDriver: true,
    }).start();

    loadSavedCredentials();
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  //  REMEMBER ME — Load & Save helpers
  //  ✅ FIX: credentials load on mount; saved only after successful login.
  //          Clearing happens when rememberMe is toggled OFF.
  // ─────────────────────────────────────────────────────────────────────────────

  const loadSavedCredentials = async () => {
    try {
      const remembered = await AsyncStorage.getItem(STORAGE_KEYS.REMEMBER_ME);
      if (remembered === "1") {
        const [savedEmail, savedUser, savedPass] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEYS.EMAIL),
          AsyncStorage.getItem(STORAGE_KEYS.USER_NAME),
          AsyncStorage.getItem(STORAGE_KEYS.PASSWORD),
        ]);
        if (savedEmail) setEmail(savedEmail);
        if (savedUser) setUserName(savedUser);
        if (savedPass) setPassword(savedPass);
        setRememberMe(true);
      }
    } catch {
      // Silent fail — user simply logs in fresh
    }
  };

  const saveCredentials = async (emailVal, userVal, passVal) => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, "1"),
        AsyncStorage.setItem(STORAGE_KEYS.EMAIL, emailVal),
        AsyncStorage.setItem(STORAGE_KEYS.USER_NAME, userVal),
        AsyncStorage.setItem(STORAGE_KEYS.PASSWORD, passVal),
      ]);
    } catch {
      // Silent fail
    }
  };

  const clearSavedCredentials = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem(STORAGE_KEYS.REMEMBER_ME, "0"),
        AsyncStorage.removeItem(STORAGE_KEYS.EMAIL),
        AsyncStorage.removeItem(STORAGE_KEYS.USER_NAME),
        AsyncStorage.removeItem(STORAGE_KEYS.PASSWORD),
      ]);
    } catch {
      // Silent fail
    }
  };

  // ✅ FIX: Toggle also clears saved data when unchecked
  const handleRememberMeToggle = () => {
    const next = !rememberMe;
    setRememberMe(next);
    if (!next) clearSavedCredentials();
  };

  /* ---------- ANIMATION HELPERS ---------- */
  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const handleInputFocus = (type) => {
    setFocusedInput(type);
    const anim =
      type === "email" ? emailFocusAnim :
        type === "userName" ? userFocusAnim : passFocusAnim;
    Animated.timing(anim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };

  const handleInputBlur = (type) => {
    setFocusedInput(null);
    const anim =
      type === "email" ? emailFocusAnim :
        type === "userName" ? userFocusAnim : passFocusAnim;
    Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  /* ---------- ALERT ---------- */
  const showAlert = (title, message, type = "info") => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertVisible(true);
  };

  /* ---------- LOGIN ---------- */
  const handleLogin = async () => {
    Keyboard.dismiss();
    animateButton();

    // ── Inline validation — collect all errors before returning ───────────────
    const newErrors = { email: "", userName: "", password: "" };
    let hasError = false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim()) {
      newErrors.email = "Please enter your email address";
      hasError = true;
    } else if (!emailRegex.test(email.trim())) {
      newErrors.email = "Please enter a valid email address";
      hasError = true;
    }
    if (!userName.trim()) {
      newErrors.userName = "Please enter your user name";
      hasError = true;
    } else if (userName.trim().length > 10) {
      newErrors.userName = "Username must be at most 10 characters";
      hasError = true;
    }

    if (!password.trim()) {
      newErrors.password = "Please enter your password";
      hasError = true;
    } else if (password.trim().length > 20) {
      newErrors.password = "Password must be at most 20 characters";
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      triggerShake();
      return;
    }

    setLoading(true);

    // ── Gather IP ──────────────────────────────────────────────────────────────
    let currentIp = "";
    let currentLat = null;
    let currentLng = null;

    try {
      currentIp = await NetworkInfo.getIPV4Address();
      if (!currentIp || currentIp === "0.0.0.0") {
        currentIp = await DeviceInfo.getIpAddress();
      }
    } catch { /* ignore */ }

    try {
      const geoResponse = await fetch("https://ipapi.co/json/");
      const geoData = await geoResponse.json();
      if (geoData?.ip) {
        if (
          !currentIp ||
          currentIp === "0.0.0.0" ||
          currentIp.startsWith("10.") ||
          currentIp.startsWith("192.168.")
        ) {
          currentIp = geoData.ip;
        }
        currentLat = geoData.latitude;
        currentLng = geoData.longitude;
      }
    } catch { /* ignore */ }

    // ── Location permission + exact coords ────────────────────────────────────
    // ── Location data removed from Login ──

    // ── API call ───────────────────────────────────────────────────────────────
    try {
      const result = await loginUser({
        email: email.trim(),
        password: password.trim(),
        userName: userName.trim(),
        systemDetails: {
          location: {
            latitude: currentLat || 0,
            longitude: currentLng || 0,
          },
          ip: currentIp || "127.0.0.1",
        },
      });

      if (result?.success) {
        // ✅ FIX: Save credentials ONLY after successful login, not before validation
        if (rememberMe) {
          await saveCredentials(email.trim(), userName.trim(), password.trim());
        } else {
          await clearSavedCredentials();
        }

        navigation.navigate("Otp", {
          email,
          userName,
          password,
          systemDetails: {
            location: {
              latitude: currentLat || 0,
              longitude: currentLng || 0,
            },
            ip: currentIp || "127.0.0.1",
          }
        });
      } else {
        triggerShake();
        showAlert("Login Failed", result?.message || "Invalid Credentials", "error");
      }
    } catch {
      triggerShake();
      showAlert("Error", "Network request failed", "error");
    } finally {
      setLoading(false);
    }
  };

  /* ---------- INTERPOLATIONS ---------- */
  const pageTranslateY = pageAnim.interpolate({
    inputRange: [0, 1], outputRange: [50, 0],
  });
  const pageOpacity = pageAnim.interpolate({
    inputRange: [0, 1], outputRange: [0, 1],
  });

  const getBorderColor = (anim) =>
    anim.interpolate({
      inputRange: [0, 1],
      outputRange: [Colors.input_border, Colors.primary],
    });

  const getInputScale = (anim) =>
    anim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] });

  const getInputBg = (anim) =>
    anim.interpolate({
      inputRange: [0, 1],
      outputRange: [Colors.input_bg, Colors.white],
    });

  /* ---------- RENDER ---------- */
  return (
    <LinearGradient colors={Colors.background_gradient} style={styles.container}>
      {/* Decorative Background */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      <Animated.View
        style={[
          styles.pageWrapper,
          { opacity: pageOpacity, transform: [{ translateY: pageTranslateY }] },
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header ─────────────────────────────────────────────────────── */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>C</Text>
            </View>
            <Text style={styles.appName}>Camlenio</Text>
          </View>

          {/* ── Card ───────────────────────────────────────────────────────── */}
          <Animated.View
            style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}
          >
            <Text style={styles.welcome}>Welcome Back!</Text>
            <Text style={styles.subTitle}>
              Login to continue recharge &amp; bill payments
            </Text>

            {/* Email */}
            <Text style={styles.label}>Email Address</Text>
            <Animated.View
              style={[
                styles.inputBox,
                {
                  borderColor: getBorderColor(emailFocusAnim),
                  transform: [{ scale: getInputScale(emailFocusAnim) }],
                  backgroundColor: getInputBg(emailFocusAnim),
                },
              ]}
            >
              <MaterialCommunityIcons
                name="email" size={20}
                color={focusedInput === "email" ? Colors.black : Colors.gray}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Enter Email Address"
                placeholderTextColor={Colors.gray}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={(text) => {
                  setEmail(text);
                  if (errors.email) setErrors((prev) => ({ ...prev, email: "" }));
                }}
                onFocus={() => handleInputFocus("email")}
                onBlur={() => handleInputBlur("email")}
                style={styles.input}
                selectionColor={Colors.accent}
              />
            </Animated.View>
            {!!errors.email && (
              <Text style={styles.errorText}>
                <MaterialCommunityIcons name="alert-circle-outline" size={12} /> {errors.email}
              </Text>
            )}

            {/* User Name */}
            <Text style={styles.label}>User Name</Text>
            <Animated.View
              style={[
                styles.inputBox,
                {
                  borderColor: getBorderColor(userFocusAnim),
                  transform: [{ scale: getInputScale(userFocusAnim) }],
                  backgroundColor: getInputBg(userFocusAnim),
                },
              ]}
            >
              <MaterialCommunityIcons
                name="account" size={20}
                color={focusedInput === "userName" ? Colors.black : Colors.gray}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Enter User Name"
                placeholderTextColor={Colors.gray}
                autoCapitalize="characters"
                value={userName}
                onChangeText={(text) => {
                  setUserName(text.toUpperCase());
                  if (errors.userName) setErrors((prev) => ({ ...prev, userName: "" }));
                }}
                onFocus={() => handleInputFocus("userName")}
                onBlur={() => handleInputBlur("userName")}
                style={styles.input}
                selectionColor={Colors.accent}
                maxLength={10}
              />
            </Animated.View>
            {!!errors.userName && (
              <Text style={styles.errorText}>
                <MaterialCommunityIcons name="alert-circle-outline" size={12} /> {errors.userName}
              </Text>
            )}

            {/* Password */}
            <Text style={styles.label}>Password</Text>
            <Animated.View
              style={[
                styles.inputBox,
                {
                  borderColor: getBorderColor(passFocusAnim),
                  transform: [{ scale: getInputScale(passFocusAnim) }],
                  backgroundColor: getInputBg(passFocusAnim),
                },
              ]}
            >
              <MaterialCommunityIcons
                name="lock" size={20}
                color={focusedInput === "password" ? Colors.black : Colors.gray}
                style={styles.inputIcon}
              />
              <TextInput
                placeholder="Enter Password"
                placeholderTextColor={Colors.gray}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(text) => {
                  setPassword(text);
                  if (errors.password) setErrors((prev) => ({ ...prev, password: "" }));
                }}
                onFocus={() => handleInputFocus("password")}
                onBlur={() => handleInputBlur("password")}
                style={styles.input}
                selectionColor={Colors.accent}
                maxLength={20}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                style={styles.eyeBtn}
              >
                <MaterialCommunityIcons
                  name={showPassword ? "eye" : "eye-off"}
                  size={20}
                  color={Colors.primary}
                />
              </TouchableOpacity>
            </Animated.View>
            {!!errors.password && (
              <Text style={styles.errorText}>
                <MaterialCommunityIcons name="alert-circle-outline" size={12} /> {errors.password}
              </Text>
            )}

            {/* Remember Me / Forgot */}
            <View style={styles.rememberRow}>
              {/* ✅ FIX: onPress now calls handleRememberMeToggle which also
                         clears storage when unchecked */}
              <TouchableOpacity
                style={styles.rememberLeft}
                onPress={handleRememberMeToggle}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, rememberMe && styles.checked]}>
                  {rememberMe && (
                    <MaterialCommunityIcons name="check" size={12} color={Colors.white} />
                  )}
                </View>
                <Text style={styles.rememberText}>Remember Me</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => navigation.navigate("ForgotPasswordScreen")}>
                <Text style={styles.forgotText}>Forgot Password?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                style={[styles.loginBtn, loading && { opacity: 0.75 }]}
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.9}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.loginText}>Login</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            {/* Sign Up link */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don't have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── Social Login ────────────────────────────────────────────────── */}
          <View style={styles.socialContainer}>
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.orText}>OR LOGIN WITH</Text>
              <View style={styles.divider} />
            </View>
            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn}>
                <Image source={require("../../assets/facebook.png")} style={styles.socialIcon} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn}>
                <Image source={require("../../assets/google.webp")} style={styles.socialIcon} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn}>
                <Image source={require("../../assets/apple.png")} style={styles.socialIcon} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      {/* Alert */}
      <CustomAlert
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onClose={() => setAlertVisible(false)}
      />
    </LinearGradient>
  );
}

/* ---------- STYLES ---------- */
const styles = StyleSheet.create({
  container: { flex: 1 },
  pageWrapper: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingVertical: 20 * scale,
  },

  // Header
  header: { alignItems: "center", marginBottom: 20 * scale, marginTop: 60 * scale },
  logoContainer: {
    width: 64 * scale, height: 64 * scale, borderRadius: 18 * scale,
    backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center",
  },
  logoText: { fontSize: 32 * scale, fontFamily: Fonts.Bold, color: Colors.white },
  appName: {
    fontSize: 24 * scale, fontFamily: Fonts.Bold,
    color: Colors.black, letterSpacing: 0.5,
  },

  // Card
  card: {
    marginHorizontal: 16 * scale, backgroundColor: Colors.beige,
    borderRadius: 24 * scale, padding: 16 * scale,
  },
  welcome: {
    fontSize: 22 * scale, fontFamily: Fonts.Bold,
    textAlign: "center", color: Colors.primary,
  },
  subTitle: {
    fontSize: 13 * scale, fontFamily: Fonts.Medium, color: Colors.text_secondary,
    textAlign: "center", marginTop: 6 * scale, marginBottom: 20 * scale,
  },

  // Inputs
  label: {
    fontSize: 13 * scale, fontFamily: Fonts.Bold,
    color: Colors.black, marginBottom: 6 * scale, marginLeft: 4 * scale,
  },
  inputBox: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 30 * scale, height: 50 * scale,
    paddingHorizontal: 16 * scale, borderWidth: 1,
    marginBottom: 4 * scale,
  },
  errorText: {
    fontSize: 12 * scale,
    fontFamily: Fonts.Medium,
    color: Colors.red,
    marginLeft: 12 * scale,
    marginBottom: 10 * scale,
    marginTop: 2 * scale,
  },
  inputIcon: { marginRight: 10 * scale },
  input: {
    flex: 1, fontSize: 15 * scale, color: Colors.black,
    height: "100%", fontFamily: Fonts.Medium, padding: 0,
  },
  eyeBtn: { padding: 8 * scale },

  // Remember Me
  rememberRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 24 * scale,
  },
  rememberLeft: { flexDirection: "row", alignItems: "center" },
  checkbox: {
    width: 20 * scale, height: 20 * scale, borderRadius: 6 * scale,
    borderWidth: 1.5, borderColor: Colors.primary,
    justifyContent: "center", alignItems: "center", marginRight: 8 * scale,
  },
  checked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  rememberText: { fontSize: 13 * scale, fontFamily: Fonts.Medium, color: Colors.black },
  forgotText: { fontSize: 13 * scale, fontFamily: Fonts.Bold, color: Colors.black },

  // Button
  loginBtn: {
    backgroundColor: Colors.primary, borderRadius: 25 * scale,
    height: 50 * scale, justifyContent: "center", alignItems: "center",
  },
  loginText: {
    color: Colors.white, fontSize: 16 * scale,
    fontFamily: Fonts.Bold, letterSpacing: 0.5,
  },

  // Sign up
  signupContainer: {
    flexDirection: "row", justifyContent: "center", marginTop: 20 * scale,
  },
  signupText: { fontSize: 13 * scale, color: Colors.black, fontFamily: Fonts.Medium },
  signupLink: { color: Colors.primary, fontFamily: Fonts.Bold, fontSize: 13 * scale },

  // Social
  socialContainer: {
    marginTop: 30 * scale, paddingHorizontal: 30 * scale, marginBottom: 10 * scale,
  },
  dividerRow: { flexDirection: "row", alignItems: "center", marginBottom: 16 * scale },
  divider: { flex: 1, height: 1, backgroundColor: Colors.input_border },
  orText: {
    marginHorizontal: 10 * scale, fontSize: 11 * scale,
    fontFamily: Fonts.Bold, color: Colors.black,
  },
  socialRow: { flexDirection: "row", justifyContent: "center" },
  socialBtn: {
    width: 46 * scale, height: 46 * scale, borderRadius: 14 * scale,
    backgroundColor: Colors.beige, justifyContent: "center", alignItems: "center",
    marginHorizontal: 10 * scale,
  },
  socialIcon: { width: 22 * scale, height: 22 * scale },

  // Decorative
  circle1: {
    position: "absolute", width: 250 * scale, height: 250 * scale,
    borderRadius: 125 * scale, backgroundColor: Colors.circle_bg,
    top: -70 * scale, right: -70 * scale,
  },
  circle2: {
    position: "absolute", width: 200 * scale, height: 200 * scale,
    borderRadius: 100 * scale, backgroundColor: Colors.circle_bg,
    bottom: -40 * scale, left: -40 * scale,
  },
});
