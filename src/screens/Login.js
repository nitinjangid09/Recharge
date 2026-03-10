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
  PermissionsAndroid,
  Platform
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import DeviceInfo from "react-native-device-info";
import Geolocation from "@react-native-community/geolocation";
import { NetworkInfo } from "react-native-network-info";

import Colors from "../constants/Colors";
import Fonts from "../constants/Fonts";
import { loginUser } from "../api/AuthApi";
import CustomAlert from "../screens/CustomAlert";

/* ---------- RESPONSIVE SCALE ---------- */
const { width } = Dimensions.get("window");
const scale = width / 375;

export default function Login({ navigation }) {
  /* ---------- STATES ---------- */
  const [email, setEmail] = useState("");
  const [userName, setUserName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  // Animation States
  const [focusedInput, setFocusedInput] = useState(null);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");

  /* ---------- ANIMATIONS ---------- */
  const pageAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  // Input Focus Animations
  const emailFocusAnim = useRef(new Animated.Value(0)).current;
  const userFocusAnim = useRef(new Animated.Value(0)).current;
  const passFocusAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(pageAnim, {
        toValue: 1,
        duration: 1000,
        easing: Easing.out(Easing.exp),
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  const triggerShake = () => {
    // Removed Vibration
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  const animateButton = () => {
    Animated.sequence([
      Animated.timing(btnScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
      Animated.timing(btnScale, { toValue: 1, duration: 100, useNativeDriver: true })
    ]).start();
  };

  const handleInputFocus = (type) => {
    setFocusedInput(type);
    const anim = type === 'email' ? emailFocusAnim : type === 'userName' ? userFocusAnim : passFocusAnim;
    Animated.timing(anim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false
    }).start();
  };

  const handleInputBlur = (type) => {
    setFocusedInput(null);
    const anim = type === 'email' ? emailFocusAnim : type === 'userName' ? userFocusAnim : passFocusAnim;
    Animated.timing(anim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false
    }).start();
  };

  /* ---------- ALERT ---------- */
  const showAlert = (title, message) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertVisible(true);
  };

  /* ---------- LOGIN ---------- */
  const handleLogin = async () => {
    Keyboard.dismiss();
    animateButton();
    await AsyncStorage.setItem("remember_me", rememberMe ? "1" : "0");

    if (!email) {
      triggerShake();
      showAlert("Error", "Please enter email");
      return;
    }

    if (!userName) {
      triggerShake();
      showAlert("Error", "Please enter user name");
      return;
    }

    if (!password) {
      triggerShake();
      showAlert("Error", "Please enter password");
      return;
    }

    setLoading(true);

    let currentIp = "";
    let currentLat = null;
    let currentLng = null;

    try {
      currentIp = await NetworkInfo.getIPV4Address();
      if (!currentIp || currentIp === "0.0.0.0") {
        currentIp = await DeviceInfo.getIpAddress();
      }
    } catch (e) { /* ignore */ }

    // Backup IP request API in case DeviceInfo fails or returns local IP
    try {
      const geoResponse = await fetch("https://ipapi.co/json/");
      const geoData = await geoResponse.json();
      if (geoData && geoData.ip) {
        if (!currentIp || currentIp === "0.0.0.0" || currentIp.startsWith("10.") || currentIp.startsWith("192.168.")) {
          currentIp = geoData.ip;
        }
        currentLat = geoData.latitude;
        currentLng = geoData.longitude;
      }
    } catch (e) {
      console.log("Failed to fetch Backup IP API:", e);
    }

    // Permission and Exact Hardware Geolocation Handling
    const requestLocationPermission = async () => {
      try {
        if (Platform.OS === "android") {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
            {
              title: "Location Permission",
              message: "App needs access to your location to login securely.",
              buttonNeutral: "Ask Me Later",
              buttonNegative: "Cancel",
              buttonPositive: "OK"
            }
          );
          return granted === PermissionsAndroid.RESULTS.GRANTED;
        }
        return true;
      } catch (err) {
        console.warn(err);
        return false;
      }
    };

    const hasPermission = await requestLocationPermission();

    if (hasPermission) {
      await new Promise((resolve) => {
        Geolocation.getCurrentPosition(
          (position) => {
            currentLat = position.coords.latitude;
            currentLng = position.coords.longitude;
            resolve();
          },
          (error) => {
            console.log("Geolocation error:", error.code, error.message);
            resolve(); // proceed even if error
          },
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 10000 }
        );
      });
    } else {
      setLoading(false);
      showAlert("Permission Denied", "Location permission is required to proceed.");
      return;
    }

    try {
      const result = await loginUser({
        email,
        password,
        userName,
        systemDetails: {
          location: {
            latitude: currentLat || 0,
            longitude: currentLng || 0
          },
          ip: currentIp || "127.0.0.1"
        }
      });

      setLoading(false);

      if (result?.success) {
        // Assume log_key might be attached to success payload if Otp requires it
        navigation.navigate("Otp", { email, userName, log_key: result?.log_key || "" });
      } else {
        triggerShake();
        showAlert("Login Failed", result?.message || "Invalid Credentials");
      }
    } catch (error) {
      setLoading(false);
      triggerShake();
      showAlert("Error", "Network request failed");
    }
  };

  // Interpolations
  const pageTranslateY = pageAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] });
  const pageOpacity = pageAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  const getBorderColor = (anim) => anim.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.input_border, Colors.input_border_focus]
  });

  const getScale = (anim) => anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.02]
  });

  return (
    <LinearGradient colors={Colors.background_gradient} style={styles.container}>
      {/* Decorative Background */}
      <View style={styles.circle1} />
      <View style={styles.circle2} />

      <Animated.View
        style={[
          styles.pageWrapper,
          {
            opacity: pageOpacity,
            transform: [{ translateY: pageTranslateY }]
          }
        ]}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ---------- HEADER ---------- */}
          <View style={styles.header}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoText}>C</Text>
            </View>
            <Text style={styles.appName}>Camlenio</Text>
          </View>

          {/* ---------- CARD ---------- */}
          <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
            <Text style={styles.welcome}>Welcome Back!</Text>
            <Text style={styles.subTitle}>
              Login to continue recharge & bill payments
            </Text>

            {/* ---------- EMAIL ---------- */}
            <Text style={styles.label}>Email Address</Text>
            <Animated.View
              style={[
                styles.inputBox,
                {
                  borderColor: getBorderColor(emailFocusAnim),
                  transform: [{ scale: getScale(emailFocusAnim) }],
                  backgroundColor: emailFocusAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [Colors.input_bg, Colors.white]
                  })
                }
              ]}
            >
              <MaterialCommunityIcons name="email" size={20} color={focusedInput === 'email' ? Colors.icon_primary : Colors.icon_secondary} style={styles.inputIcon} />
              <TextInput
                placeholder="Enter Email Address"
                placeholderTextColor={Colors.text_placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
                onFocus={() => handleInputFocus('email')}
                onBlur={() => handleInputBlur('email')}
                style={styles.input}
                selectionColor={Colors.accent}
              />
            </Animated.View>

            {/* ---------- USER NAME ---------- */}
            <Text style={styles.label}>User Name</Text>
            <Animated.View
              style={[
                styles.inputBox,
                {
                  borderColor: getBorderColor(userFocusAnim),
                  transform: [{ scale: getScale(userFocusAnim) }],
                  backgroundColor: userFocusAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [Colors.input_bg, Colors.white]
                  })
                }
              ]}
            >
              <MaterialCommunityIcons name="account" size={20} color={focusedInput === 'userName' ? Colors.icon_primary : Colors.icon_secondary} style={styles.inputIcon} />
              <TextInput
                placeholder="Enter User Name"
                placeholderTextColor={Colors.text_placeholder}
                autoCapitalize="none"
                value={userName}
                onChangeText={setUserName}
                onFocus={() => handleInputFocus('userName')}
                onBlur={() => handleInputBlur('userName')}
                style={styles.input}
                selectionColor={Colors.accent}
              />
            </Animated.View>

            {/* ---------- PASSWORD ---------- */}
            <Text style={styles.label}>Password</Text>
            <Animated.View
              style={[
                styles.inputBox,
                {
                  borderColor: getBorderColor(passFocusAnim),
                  transform: [{ scale: getScale(passFocusAnim) }],
                  backgroundColor: passFocusAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [Colors.input_bg, Colors.white]
                  })
                }
              ]}
            >
              <MaterialCommunityIcons name="lock" size={20} color={focusedInput === 'password' ? Colors.icon_primary : Colors.icon_secondary} style={styles.inputIcon} />
              <TextInput
                placeholder="Enter Password"
                placeholderTextColor={Colors.text_placeholder} // Darker grey hint
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                onFocus={() => handleInputFocus('password')}
                onBlur={() => handleInputBlur('password')}
                style={styles.input}
                selectionColor={Colors.accent}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <MaterialCommunityIcons
                  name={showPassword ? "eye" : "eye-off"}
                  size={20}
                  color={Colors.primary}
                />
              </TouchableOpacity>
            </Animated.View>

            {/* ---------- REMEMBER / FORGOT ---------- */}
            <View style={styles.rememberRow}>
              <TouchableOpacity
                style={styles.rememberLeft}
                onPress={() => setRememberMe(!rememberMe)}
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

            {/* ---------- LOGIN BUTTON ---------- */}
            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
              <TouchableOpacity
                style={styles.loginBtn}
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

            {/* ---------- SIGNUP ---------- */}
            <View style={styles.signupContainer}>
              <Text style={styles.signupText}>Don’t have an account? </Text>
              <TouchableOpacity onPress={() => navigation.navigate("Signup")}>
                <Text style={styles.signupLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ---------- SOCIAL ---------- */}
          <View style={styles.socialContainer}>
            <View style={styles.dividerRow}>
              <View style={styles.divider} />
              <Text style={styles.orText}>OR LOGIN WITH</Text>
              <View style={styles.divider} />
            </View>
            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn}>
                <Image source={require("../assets/facebook.png")} style={styles.socialIcon} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn}>
                <Image source={require("../assets/google.webp")} style={styles.socialIcon} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn}>
                <Image source={require("../assets/apple.png")} style={styles.socialIcon} />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </Animated.View>

      {/* ---------- ALERT ---------- */}
      <CustomAlert
        visible={alertVisible}
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

  pageWrapper: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingVertical: 20 * scale // Adjusted padding
  },

  header: {
    alignItems: "center",
    marginBottom: 20 * scale,
    marginTop: 60 * scale // Responsive top margin
  },
  logoContainer: {
    width: 64 * scale,
    height: 64 * scale,
    borderRadius: 18 * scale,
    backgroundColor: Colors.button_bg,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    marginBottom: 10 * scale
  },
  logoText: {
    fontSize: 32 * scale,
    fontFamily: Fonts.Bold,
    color: Colors.white
  },
  appName: {
    fontSize: 24 * scale,
    fontFamily: Fonts.Bold,
    color: Colors.text_primary,
    letterSpacing: 0.5
  },

  card: {
    marginHorizontal: 16 * scale,
    backgroundColor: Colors.secondary,
    borderRadius: 24 * scale,
    padding: 16 * scale,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2, // Reduced elevation
  },

  welcome: {
    fontSize: 22 * scale,
    fontFamily: Fonts.Bold,
    textAlign: "center",
    color: Colors.primary,
  },
  subTitle: {
    fontSize: 13 * scale,
    fontFamily: Fonts.Medium,
    color: Colors.text_secondary,
    textAlign: "center",
    marginTop: 6 * scale,
    marginBottom: 20 * scale,
  },

  label: {
    fontSize: 13 * scale,
    fontFamily: Fonts.Bold,
    color: Colors.text_primary,
    marginBottom: 6 * scale,
    marginLeft: 4 * scale,
  },

  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.input_bg, // Very light accent tint
    borderRadius: 30 * scale, // Rounded corners
    height: 50 * scale,
    paddingHorizontal: 16 * scale,
    borderWidth: 1,
    borderColor: Colors.input_border, // Light border matching Login button (Accent)
    marginBottom: 16 * scale,
  },

  inputIcon: {
    marginRight: 10 * scale
  },

  input: {
    flex: 1,
    fontSize: 15 * scale,
    color: Colors.black,
    height: '100%',
    fontFamily: Fonts.Medium,
    padding: 0
  },

  eyeBtn: {
    padding: 8 * scale
  },

  rememberRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24 * scale,
    marginTop: 0
  },

  rememberLeft: { flexDirection: "row", alignItems: "center" },
  checkbox: {
    width: 20 * scale,
    height: 20 * scale,
    borderRadius: 6 * scale,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8 * scale,
  },
  checked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary
  },

  rememberText: { fontSize: 13 * scale, fontFamily: Fonts.Medium, color: Colors.text_primary },
  forgotText: { fontSize: 13 * scale, fontFamily: Fonts.Bold, color: Colors.text_link },


  loginBtn: {
    backgroundColor: Colors.button_bg,
    borderRadius: 25 * scale,
    height: 50 * scale,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  loginText: {
    color: Colors.white,
    fontSize: 16 * scale,
    fontFamily: Fonts.Bold,
    letterSpacing: 0.5
  },

  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20 * scale,
  },
  signupText: {
    fontSize: 13 * scale,
    color: Colors.text_secondary,
    fontFamily: Fonts.Medium,
  },
  signupLink: {
    color: Colors.text_link,
    fontFamily: Fonts.Bold,
    fontSize: 13 * scale
  },

  socialContainer: {
    marginTop: 30 * scale,
    paddingHorizontal: 30 * scale,
    marginBottom: 10 * scale
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16 * scale
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.divider
  },
  orText: {
    marginHorizontal: 10 * scale,
    fontSize: 11 * scale,
    fontFamily: Fonts.Bold,
    color: Colors.text_secondary
  },

  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
  },
  socialBtn: {
    width: 46 * scale,
    height: 46 * scale,
    borderRadius: 14 * scale,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 10 * scale,
    elevation: 2,
    shadowColor: Colors.shadow,
    shadowOpacity: 0.1,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 }
  },
  socialIcon: { width: 22 * scale, height: 22 * scale },

  // Decorative
  circle1: {
    position: 'absolute',
    width: 250 * scale,
    height: 250 * scale,
    borderRadius: 125 * scale,
    backgroundColor: Colors.circle_bg,
    top: -70 * scale,
    right: -70 * scale,
  },
  circle2: {
    position: 'absolute',
    width: 200 * scale,
    height: 200 * scale,
    borderRadius: 100 * scale,
    backgroundColor: Colors.circle_bg,
    bottom: -40 * scale,
    left: -40 * scale,
  }
});
