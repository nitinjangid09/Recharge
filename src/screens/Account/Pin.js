// src/screens/PinScreen.js
import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { loginUser } from "../../api/authService";

export default function PinScreen({ route, navigation }) {
  const { phone, password, log_key } = route.params;

  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const scaleBtn = useRef(new Animated.Value(1)).current;
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

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  }, [focused]);

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["#ddd", "#43a047"],
  });

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

  const handleVerify = async () => {
    if (!pin || pin.length !== 6) {
      alert("Enter valid 6-digit PIN");
      return;
    }

    animateButton();
    setLoading(true);

    try {
      const res = await loginUser({
        phone,
        password,
        pin,
        imei: "ANDROID_IMEI",
        device: "Android",
        ltype: "pin",
        log_key,
      });

      if (res.status === "SUCCESS") {
        await AsyncStorage.setItem("log_key", res.log_key);
        navigation.replace("Home");
      } else {
        alert(res.message || "PIN verification failed");
      }
    } catch (err) {
      alert("Something went wrong");
    }

    setLoading(false);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1 }}
    >
      <Animated.View
        style={[
          styles.container,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Text style={styles.title}>Enter PIN</Text>

        <Animated.View style={[styles.inputWrapper, { borderColor }]}>
          <TextInput
            placeholder="● ● ● ● ● ●"
            secureTextEntry
            keyboardType="number-pad"
            maxLength={6}
            value={pin}
            onChangeText={setPin}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={styles.pinInput}
          />
        </Animated.View>

        <Animated.View style={{ transform: [{ scale: scaleBtn }] }}>
          <TouchableOpacity
            style={styles.button}
            onPress={handleVerify}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>VERIFY & LOGIN</Text>
            )}
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 40,
    textAlign: "center",
    color: "#222",
  },
  inputWrapper: {
    borderWidth: 2,
    borderRadius: 14,
    marginBottom: 30,
  },
  pinInput: {
    padding: 18,
    fontSize: 22,
    letterSpacing: 12,
    textAlign: "center",
  },
  button: {
    backgroundColor: "#43a047",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    elevation: 4,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 1,
  },
});