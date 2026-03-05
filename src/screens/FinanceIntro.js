import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, Easing } from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../constants/Colors";
import Fonts from "../constants/Fonts";

/* ---------- RESPONSIVE SCALE ---------- */
const { width } = Dimensions.get("window");
const scale = width / 375;

export default function FinanceIntro({ navigation }) {
  /* ---------- ANIMATIONS ---------- */
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const cardAnim = useRef(new Animated.Value(0)).current; // For cards sliding in
  const btnAnim = useRef(new Animated.Value(0)).current; // For button fade in

  useEffect(() => {
    Animated.stagger(200, [
      // 1. Fade in & Slide up main content
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1500, // Slowed down to 1.5s
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 1500, // Slowed down to 1.5s
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        })
      ]),
      // 2. Animate Cards in (Scale/Fade)
      Animated.spring(cardAnim, {
        toValue: 1,
        friction: 10,
        tension: 10, // Very slow spring
        useNativeDriver: true,
      }),
      // 3. Fade in Buttons
      Animated.timing(btnAnim, {
        toValue: 1,
        duration: 1500, // Slowed down button fade
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  // Interpolations
  const cardTranslateY = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] });
  const cardOpacity = cardAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });


  return (
    <LinearGradient
      colors={Colors.background_gradient}
      style={styles.container}
    >
      <Animated.View style={{ flex: 1, opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

        {/* Balance Chip */}
        <View style={styles.balanceBox}>
          <Text style={styles.balanceText}>Your balance</Text>
          <Text style={styles.balanceAmount}>     ₹4,432.90</Text>
        </View>

        {/* Card */}
        <Animated.View style={{ opacity: cardOpacity, transform: [{ translateY: cardTranslateY }] }}>
          <LinearGradient
            colors={Colors.finance_card_1}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <Text style={styles.cardTitle}>SmartWallet</Text>
            <Text style={styles.cardNumber}>1983 2858 4829 3949</Text>

            <View style={styles.cardFooter}>
              <Text style={styles.cardFooterText}>Exp Date</Text>
              <Text style={styles.cardFooterValue}>11/25</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Transactions Box */}
        <Animated.View style={{
          marginTop: -15 * scale,
          marginLeft: -5 * scale,
          opacity: cardOpacity,
          transform: [{ translateY: cardTranslateY }]
        }}>
          <LinearGradient
            colors={Colors.finance_card_2}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.transactionBox}
          >
            <Text style={styles.transactionTitle}>Transactions</Text>

            <View style={styles.transactionRow}>
              <Text style={styles.transactionName}>Netflix</Text>
              <Text style={styles.transactionAmount}>₹770</Text>
            </View>

            <Text style={styles.transactionTime}>Today • 9:30 AM</Text>
          </LinearGradient>
        </Animated.View>

        <Animated.View style={[styles.arrowButton, { opacity: cardOpacity, transform: [{ scale: cardAnim }] }]}>
          <Icon
            name="arrow-right"
            size={26 * scale}
            color={Colors.button_text}
            style={{ transform: [{ rotate: "-45deg" }] }}
          />
        </Animated.View>

        {/* Heading */}
        <Text style={styles.heading}>Easy Access To{"\n"}Modern Financial Solutions</Text>

        <Text style={styles.subtext}>
          Secure transactions and secure data storage —
          your financial well-being comes first.
        </Text>

        {/* Button */}
        <Animated.View style={{ opacity: btnAnim }}>
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Create new account</Text>
            <Icon
              name="chevron-right"
              size={26 * scale}
              color={Colors.button_text}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate("Login")}
            style={styles.loginLink}
          >
            <Text style={styles.signInText}>Sign in to account</Text>
          </TouchableOpacity>
        </Animated.View>

      </Animated.View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20 * scale,
    paddingTop: 60 * scale
  },

  balanceBox: {
    alignSelf: "flex-end",
    width: 200 * scale,
    marginTop: 50 * scale,
    flexDirection: "row",
    backgroundColor: Colors.secondary,
    paddingVertical: 10 * scale,
    paddingHorizontal: 14 * scale,
    borderRadius: 10 * scale,
    marginBottom: 5 * scale,
    borderWidth: 0.3 * scale,
    borderColor: Colors.text_primary,
  },

  balanceText: { color: Colors.text_primary, fontSize: 12 * scale, fontFamily: Fonts.Medium },
  balanceAmount: { color: Colors.text_primary, fontSize: 14 * scale, fontFamily: Fonts.Bold },

  card: {
    marginLeft: 20 * scale,
    backgroundColor: Colors.surface,
    paddingHorizontal: 20 * scale,
    paddingVertical: 25 * scale,
    width: "88%",
    borderRadius: 18 * scale,
    shadowColor: Colors.text_primary,
    elevation: 6,
  },
  cardTitle: { fontSize: 16 * scale, fontFamily: Fonts.Bold },
  cardNumber: { fontSize: 18 * scale, marginVertical: 10 * scale, letterSpacing: 2 * scale, fontFamily: Fonts.Medium },

  cardFooter: { flexDirection: "row", justifyContent: "space-between" },
  cardFooterText: { color: Colors.text_secondary, fontSize: 12 * scale, fontFamily: Fonts.Medium },
  cardFooterValue: { fontFamily: Fonts.Bold, fontSize: 12 * scale },

  transactionBox: {
    paddingHorizontal: 20 * scale,
    paddingVertical: 25 * scale,
    borderRadius: 16 * scale,
    width: "65%",
    shadowColor: Colors.text_primary,
    elevation: 5
  },
  transactionTitle: { fontFamily: Fonts.Bold, fontSize: 14 * scale },
  transactionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6 * scale,
  },
  transactionName: { fontSize: 14 * scale, fontFamily: Fonts.Medium },
  transactionAmount: { fontFamily: Fonts.Bold, fontSize: 14 * scale },
  transactionTime: { color: Colors.text_secondary, fontSize: 12 * scale, marginTop: 4 * scale, fontFamily: Fonts.Medium },

  heading: {
    fontSize: 28 * scale,
    fontFamily: Fonts.Bold,
    marginTop: 40 * scale,
    color: Colors.text_primary,
    lineHeight: 38 * scale
  },
  subtext: {
    marginTop: 10 * scale,
    fontSize: 14 * scale,
    color: Colors.text_secondary,
    width: "90%",
    lineHeight: 22 * scale,
    fontFamily: Fonts.Medium
  },

  button: {
    marginTop: 25 * scale,
    backgroundColor: Colors.button_bg,
    paddingVertical: 14 * scale,
    justifyContent: "center",
    borderRadius: 12 * scale,
    flexDirection: "row",
    alignItems: "center",
  },
  buttonText: { color: Colors.button_text, fontFamily: Fonts.Bold, fontSize: 15 * scale, marginRight: 5 * scale },

  loginLink: {
    marginTop: 18 * scale,
    alignItems: 'center'
  },
  signInText: {
    fontSize: 15 * scale,
    fontFamily: Fonts.Bold,
    color: Colors.text_link
  },

  arrowButton: {
    position: "absolute",
    top: 260 * scale,    // Adjust based on updated layout
    right: 30 * scale,
    width: 55 * scale,
    height: 55 * scale,
    borderRadius: 30 * scale,
    backgroundColor: Colors.button_bg,
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    zIndex: 10
  }
});
