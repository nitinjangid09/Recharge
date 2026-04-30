import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../../constants/Colors";
import Fonts from "../../constants/Fonts";

export default function KycSubmitted({ navigation }) {
  // Animation refs
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleRefresh = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: "Login" }],
    });
  };

  return (
    <LinearGradient colors={Colors.background_gradient} style={styles.container}>
      <Animated.View
        style={[
          styles.contentWrapper,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
        <View style={styles.circle1} />
        <View style={styles.circle2} />

        {/* Icon Container */}
        <Animated.View style={[styles.iconContainer, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.iconBackground}>
            <Icon name="check-decagram-outline" size={80} color={Colors.primary} />
          </View>
        </Animated.View>

        {/* Text Details */}
        <Text style={styles.title}>KYC Submitted</Text>
        <Text style={styles.subtitle}>
          KYC submitted successfully and is pending for review
        </Text>
        <Text style={styles.description}>
          We are verifying your documents. This usually takes 24-48 business hours. We'll notify you once your account is approved.
        </Text>

        {/* Refresh/Back action */}
        <TouchableOpacity
          style={styles.btn}
          onPress={handleRefresh}
          activeOpacity={0.85}
        >
          <Text style={styles.btnText}>Login</Text>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentWrapper: {
    flex: 1,
    paddingHorizontal: 30,
    justifyContent: "center",
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 40,  },
  iconBackground: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  title: {
    fontSize: 28,
    fontFamily: Fonts.Bold,
    color: Colors.text_primary,
    marginBottom: 15,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    fontFamily: Fonts.SemiBold,
    color: Colors.text_primary,
    textAlign: "center",
    marginBottom: 15,
    lineHeight: 22,
  },
  description: {
    fontSize: 14,
    fontFamily: Fonts.Regular,
    color: Colors.text_secondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 50,
  },
  btn: {
    backgroundColor: Colors.button_bg,
    borderRadius: 30,
    paddingVertical: 15,
    paddingHorizontal: 40,
    alignItems: "center",
    width: "100%",  },
  btnText: {
    color: Colors.button_text,
    fontSize: 16,
    fontFamily: Fonts.Bold,
  },
  circle1: {
    position: "absolute",
    top: -80,
    left: -80,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: Colors.circle_bg,
    zIndex: -1,
  },
  circle2: {
    position: "absolute",
    bottom: -60,
    right: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: Colors.circle_bg,
    zIndex: -1,
  },
});
