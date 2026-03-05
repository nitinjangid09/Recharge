import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Colors from "../../constants/Colors";
import {
  fadeIn,
  slideUp,
  buttonPress,
} from "../../utils/ScreenAnimations";

export default function Home() {
  const navigation = useNavigation();

  /* ================= Animations ================= */

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  const card1 = useRef(new Animated.Value(0)).current;
  const card2 = useRef(new Animated.Value(0)).current;
  const card3 = useRef(new Animated.Value(0)).current;
  const card4 = useRef(new Animated.Value(0)).current;

  const scale1 = useRef(new Animated.Value(1)).current;
  const scale2 = useRef(new Animated.Value(1)).current;
  const scale3 = useRef(new Animated.Value(1)).current;
  const scale4 = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      fadeIn(fadeAnim),
      slideUp(slideAnim),
    ]).start();

    Animated.stagger(150, [
      fadeIn(card1),
      fadeIn(card2),
      fadeIn(card3),
      fadeIn(card4),
    ]).start();
  }, []);

  const renderCard = (title, screen, scale, opacityAnim) => (
    <Animated.View
      style={{
        opacity: opacityAnim,
        transform: [{ scale }],
        width: "100%",
      }}
    >
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.8}
        onPress={() => {
          buttonPress(scale).start();
          navigation.navigate(screen);
        }}
      >
        <Text style={styles.cardText}>{title}</Text>
      </TouchableOpacity>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
          alignItems: "center",
        }}
      >
        <Text style={styles.title}>Welcome 🎉</Text>
        <Text style={styles.subtitle}>
          Select a service to continue
        </Text>
      </Animated.View>

      {renderCard("Login Activity", "LoginActivity", scale1, card1)}
      {renderCard("AEPS Service", "AEPSServiceCard", scale2, card2)}
      {renderCard("BBPS Service", "PaymentsScreen", scale3, card3)}
      {renderCard("DMT Login", "DmtLogin", scale4, card4)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  title: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },

  subtitle: {
    fontSize: 14,
    color: Colors.gray,
    marginBottom: 35,
  },

  card: {
    width: "100%",
    backgroundColor: Colors.homebg,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.lightGray,
    marginBottom: 16,
    shadowColor: Colors.black,
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 8,
    elevation: 4,
  },

  cardText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary,
  },
});