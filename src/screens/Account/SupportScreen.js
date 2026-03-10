import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  StatusBar,
  Image,
  Animated,
  Easing,
  Clipboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Colors from "../../utils/Color";
import CustomAlert from "../../componets/CustomAlert";

const SupportScreen = () => {
  const navigation = useNavigation();

  const contactData = {
    phone: "9876543210",
    email: "info@gmail.com",
    address: "64 Suman Pareek Enclave Near Iris College Vivek Vihar",
  };

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const heroSlide = useRef(new Animated.Value(-20)).current;

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
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(heroSlide, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleCall = () => Linking.openURL(`tel:${contactData.phone}`);
  const handleEmail = () => Linking.openURL(`mailto:${contactData.email}`);
  const handleCopy = (text) => Clipboard.setString(text);

  // Button press animation
  const scaleCallBtn = useRef(new Animated.Value(1)).current;
  const scaleEmailBtn = useRef(new Animated.Value(1)).current;

  const animateButton = (scaleValue, cb) => {
    Animated.sequence([
      Animated.timing(scaleValue, { toValue: 0.96, duration: 90, useNativeDriver: true }),
      Animated.timing(scaleValue, { toValue: 1, duration: 90, useNativeDriver: true }),
    ]).start(cb);
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.dark} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backArrow}>‹</Text>
          <Text style={styles.backText}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Contact Support</Text>
        <TouchableOpacity
          style={styles.profileBtn}
          onPress={() => navigation.navigate("ProfileScreen")}
        >
          <View style={styles.profileCircle}>
            <Text style={styles.profileIcon}>👤</Text>
          </View>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Dark Hero Section */}
        <Animated.View
          style={[
            styles.heroSection,
            { opacity: fadeAnim, transform: [{ translateY: heroSlide }] },
          ]}
        >
          {/* Support Online Badge */}
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineBadgeText}>SUPPORT ONLINE</Text>
          </View>

          {/* Hero Content Row */}
          <View style={styles.heroRow}>
            <View style={styles.heroText}>
              <Text style={styles.heroHeadline}>
                {"We're here\nto "}
                <Text style={styles.heroAccent}>help you</Text>
              </Text>
              <Text style={styles.heroSub}>
                Available 24/7 for all your DMT{"\n"}queries and issues
              </Text>
            </View>
            {/* Support Agent Illustration placeholder */}
            <View style={styles.agentIllustration}>
              <Text style={styles.agentEmoji}>🎧</Text>
            </View>
          </View>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <View style={styles.statChip}>
              <Text style={styles.statIcon}>⏱</Text>
              <Text style={styles.statText}>Avg reply: 2{"\n"}min</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statIcon}>🔒</Text>
              <Text style={styles.statText}>256-bit{"\n"}secure</Text>
            </View>
            <View style={styles.statChip}>
              <Text style={styles.statIcon}>👷</Text>
              <Text style={styles.statText}>Expert{"\n"}agents</Text>
            </View>
          </View>
        </Animated.View>

        {/* Light Content Section */}
        <Animated.View
          style={[
            styles.lightSection,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Contact Info Card */}
          <View style={styles.contactCard}>
            {/* Phone */}
            <View style={styles.contactRow}>
              <View style={[styles.contactIconWrap, { backgroundColor: "#FFF0E8" }]}>
                <Text style={styles.contactEmoji}>📞</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>PHONE NUMBER</Text>
                <Text style={styles.contactValue}>{contactData.phone}</Text>
              </View>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => handleCopy(contactData.phone)}
              >
                <Text style={styles.copyIcon}>⧉</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Email */}
            <View style={styles.contactRow}>
              <View style={[styles.contactIconWrap, { backgroundColor: "#FFF0E8" }]}>
                <Text style={styles.contactEmoji}>✉️</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>EMAIL ADDRESS</Text>
                <Text style={styles.contactValue}>{contactData.email}</Text>
              </View>
              <TouchableOpacity
                style={styles.copyBtn}
                onPress={() => handleCopy(contactData.email)}
              >
                <Text style={styles.copyIcon}>⧉</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.divider} />

            {/* Address */}
            <View style={styles.contactRow}>
              <View style={[styles.contactIconWrap, { backgroundColor: "#FFF0E8" }]}>
                <Text style={styles.contactEmoji}>📍</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactLabel}>ADDRESS</Text>
                <Text style={styles.addressValue}>{contactData.address}</Text>
              </View>
              <TouchableOpacity style={styles.copyBtn}>
                <Text style={styles.copyIcon}>➤</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Help Section */}
          <Text style={styles.sectionTitle}>QUICK HELP</Text>

          <View style={styles.quickHelpGrid}>
            {/* Live Chat */}
            <TouchableOpacity style={[styles.quickCard, styles.quickCardOrange]}>
              <View style={[styles.quickIconWrap, { backgroundColor: "#FFE8D6" }]}>
                <Text style={styles.quickEmoji}>💬</Text>
              </View>
              <Text style={styles.quickCardTitle}>Live Chat</Text>
              <Text style={styles.quickCardSub}>Chat with an agent instantly</Text>
            </TouchableOpacity>

            {/* FAQs */}
            <TouchableOpacity style={[styles.quickCard, styles.quickCardBlue]}>
              <View style={[styles.quickIconWrap, { backgroundColor: "#E0EEFF" }]}>
                <Text style={styles.quickEmoji}>❓</Text>
              </View>
              <Text style={styles.quickCardTitle}>FAQs</Text>
              <Text style={styles.quickCardSub}>Browse common questions</Text>
            </TouchableOpacity>

            {/* Raise Ticket */}
            <TouchableOpacity style={[styles.quickCard, styles.quickCardGreen]}>
              <View style={[styles.quickIconWrap, { backgroundColor: "#DCFCE7" }]}>
                <Text style={styles.quickEmoji}>🎫</Text>
              </View>
              <Text style={styles.quickCardTitle}>Raise Ticket</Text>
              <Text style={styles.quickCardSub}>Submit a support request</Text>
            </TouchableOpacity>

            {/* Callback */}
            <TouchableOpacity style={[styles.quickCard, styles.quickCardPink]}>
              <View style={[styles.quickIconWrap, { backgroundColor: "#FFE4EC" }]}>
                <Text style={styles.quickEmoji}>📲</Text>
              </View>
              <Text style={styles.quickCardTitle}>Callback</Text>
              <Text style={styles.quickCardSub}>We'll call you back soon</Text>
            </TouchableOpacity>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonGroup}>
            <Animated.View style={{ transform: [{ scale: scaleCallBtn }] }}>
              <TouchableOpacity
                style={styles.callBtn}
                onPress={() => animateButton(scaleCallBtn, handleCall)}
                activeOpacity={0.85}
              >
                <Text style={styles.callBtnIcon}>📞</Text>
                <Text style={styles.callBtnText}>Call Support</Text>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={{ transform: [{ scale: scaleEmailBtn }] }}>
              <TouchableOpacity
                style={styles.emailBtn}
                onPress={() => animateButton(scaleEmailBtn, handleEmail)}
                activeOpacity={0.85}
              >
                <Text style={styles.emailBtnIcon}>✉️</Text>
                <Text style={styles.emailBtnText}>Send Email</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>
        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SupportScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scroll: {
    flex: 1,
  },

  /* ── Header ── */
  header: {
    backgroundColor: Colors.dark,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 60,
  },
  backArrow: {
    color: Colors.primary,
    fontSize: 26,
    lineHeight: 26,
    marginRight: 2,
  },
  backText: {
    color: Colors.primary,
    fontSize: 15,
    fontWeight: "500",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.white,
    textAlign: "center",
  },
  profileBtn: {
    minWidth: 60,
    alignItems: "flex-end",
  },
  profileCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#333",
    justifyContent: "center",
    alignItems: "center",
  },
  profileIcon: {
    fontSize: 16,
  },

  /* ── Hero (Dark) Section ── */
  heroSection: {
    backgroundColor: Colors.dark,
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 28,
  },
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A2A2A",
    alignSelf: "flex-start",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 18,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.green,
    marginRight: 7,
  },
  onlineBadgeText: {
    color: Colors.green,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 20,
  },
  heroText: {
    flex: 1,
    paddingRight: 10,
  },
  heroHeadline: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.white,
    lineHeight: 34,
    marginBottom: 8,
  },
  heroAccent: {
    color: Colors.primary,
  },
  heroSub: {
    fontSize: 13,
    color: "#999",
    lineHeight: 19,
  },
  agentIllustration: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#2E2E2E",
    justifyContent: "center",
    alignItems: "center",
  },
  agentEmoji: {
    fontSize: 36,
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statChip: {
    flex: 1,
    backgroundColor: "#2A2A2A",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statIcon: {
    fontSize: 13,
  },
  statText: {
    fontSize: 10,
    color: "#BBB",
    lineHeight: 14,
    fontWeight: "500",
  },

  /* ── Light Section ── */
  lightSection: {
    backgroundColor: Colors.offWhite,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 36,
    minHeight: 500,
  },

  /* ── Contact Card ── */
  contactCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  contactIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  contactEmoji: {
    fontSize: 18,
  },
  contactInfo: {
    flex: 1,
  },
  contactLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: Colors.subText,
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  contactValue: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  addressValue: {
    fontSize: 13,
    color: Colors.text,
    lineHeight: 19,
  },
  copyBtn: {
    padding: 6,
  },
  copyIcon: {
    fontSize: 16,
    color: Colors.subText,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginLeft: 50,
  },

  /* ── Quick Help ── */
  sectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: Colors.subText,
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  quickHelpGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 28,
  },
  quickCard: {
    width: "47%",
    backgroundColor: Colors.white,
    borderRadius: 14,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  quickCardOrange: { borderTopWidth: 3, borderTopColor: "#FB923C" },
  quickCardBlue: { borderTopWidth: 3, borderTopColor: "#60A5FA" },
  quickCardGreen: { borderTopWidth: 3, borderTopColor: "#4ADE80" },
  quickCardPink: { borderTopWidth: 3, borderTopColor: "#F472B6" },
  quickIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  quickEmoji: {
    fontSize: 18,
  },
  quickCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 3,
  },
  quickCardSub: {
    fontSize: 11,
    color: Colors.subText,
    lineHeight: 15,
  },

  /* ── Buttons ── */
  buttonGroup: {
    gap: 12,
  },
  callBtn: {
    backgroundColor: Colors.dark,
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  callBtnIcon: {
    fontSize: 18,
  },
  callBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  emailBtn: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  emailBtnIcon: {
    fontSize: 18,
  },
  emailBtnText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});