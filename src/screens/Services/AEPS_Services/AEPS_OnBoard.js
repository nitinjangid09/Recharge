import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  StatusBar,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";
import Colors from "../../../constants/Colors";
import Fonts from "../../../constants/Fonts";
import * as NavigationService from "../../../utils/NavigationService";

const { width: SW } = Dimensions.get("window");
const S = SW / 375;

// ── Shared Component: Badge ──────────────────────────────────────────
const Badge = ({ label, color = Colors.accent }) => (
  <View style={[styles.badge, { backgroundColor: color + "15", borderColor: color + "30" }]}>
    <View style={[styles.badgeDot, { backgroundColor: color }]} />
    <Text style={[styles.badgeTxt, { color }]}>{label}</Text>
  </View>
);

const AEPS_OnBoard = () => {
  const [currentScreen, setCurrentScreen] = useState(1);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Navigation Logic with Animation
  const goTo = (screen) => {
    Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
      setCurrentScreen(screen);
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    });
  };

  // ── RENDER HELPERS ──

  // SCREEN 1: SPLASH
  const renderSplash = () => (
    <LinearGradient colors={["#1A1A2E", "#0F0E0D"]} style={styles.screenFull}>
      <View style={styles.splashContent}>
        <View style={styles.logoBox}>
          <Icon name="fingerprint" size={40} color={Colors.finance_accent} />
        </View>
        <Text style={styles.splashEyebrow}>NPCI DIGITAL GATEWAY</Text>
        <Text style={styles.splashTitle}>
          Empower Your{"\n"}
          <Text style={{ color: Colors.finance_accent }}>Business Hub</Text>
        </Text>
        <Text style={styles.splashSub}>
          The future of biometric authentication and Aadhaar enabled payments at your fingertips.
        </Text>

        <View style={styles.trustRow}>
          <View style={styles.trustItem}>
            <Icon name="shield-check" size={14} color={Colors.success} />
            <Text style={styles.trustTxt}>SECURE</Text>
          </View>
          <View style={styles.trustItem}>
            <Icon name="bank" size={14} color={Colors.finance_accent} />
            <Text style={styles.trustTxt}>NPCI LINKED</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.btnPrimary} onPress={() => goTo(2)}>
          <Text style={styles.btnTxt}>Enter the Hub</Text>
          <Icon name="arrow-right" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  // SCREEN 2: KYC STATUS
  const renderKYC = () => (
    <View style={styles.screenInner}>
      <View style={styles.headerDark}>
        <TouchableOpacity onPress={() => goTo(1)} style={styles.backBtn}>
          <Icon name="chevron-left" size={24} color={Colors.white} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Merchant KYC</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.stepCard}>
          <View style={styles.stepRow}>
            <View style={[styles.stepDot, styles.stepDone]}>
              <Icon name="check" size={14} color={Colors.white} />
            </View>
            <View style={styles.stepInfo}>
              <Text style={styles.stepName}>Identity Verified</Text>
              <Text style={styles.stepDesc}>Aadhaar & PAN verification complete.</Text>
            </View>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepRow}>
            <View style={[styles.stepDot, styles.stepActive]}>
              <Text style={styles.stepNum}>2</Text>
            </View>
            <View style={styles.stepInfo}>
              <Text style={styles.stepName}>Biometric Setup</Text>
              <Text style={styles.stepDesc}>Link your fingerprint scanner.</Text>
            </View>
          </View>
          <View style={styles.stepLine} />
          <View style={styles.stepRow}>
            <View style={[styles.stepDot, styles.stepPending]}>
              <Text style={styles.stepNum}>3</Text>
            </View>
            <View style={styles.stepInfo}>
              <Text style={styles.stepName}>NPCI Activation</Text>
              <Text style={styles.stepDesc}>Ready for live transactions.</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity style={styles.btnAccent} onPress={() => goTo(3)}>
          <Text style={[styles.btnTxt, { color: Colors.white }]}>Complete Activation</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  // SCREEN 3: AEPS DASHBOARD
  const renderDashboard = () => (
    <View style={styles.screenInner}>
      <View style={styles.hubHeader}>
        <View style={styles.hubTop}>
          <View>
            <Text style={styles.hubGreeting}>Welcome back,</Text>
            <Text style={styles.hubUser}>Merchant Agent</Text>
          </View>
          <TouchableOpacity style={styles.glassBtn}>
            <Icon name="bell-outline" size={22} color={Colors.white} />
          </TouchableOpacity>
        </View>

        <View style={styles.balCard}>
          <View>
            <Text style={styles.balLabel}>WALLET BALANCE</Text>
            <Text style={styles.balAmt}>₹42,850.25</Text>
          </View>
          <View style={styles.balIcon}>
            <Icon name="wallet-outline" size={24} color={Colors.finance_accent} />
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>SERVICES HUD</Text>
        </View>

        <View style={styles.serviceRow}>
          {[
            { name: "Withdraw", icon: "cash-plus", color: "#6366F1", route: 4 },
            { name: "Enquiry", icon: "bank-outline", color: "#F59E0B", route: 4 },
            { name: "Statement", icon: "file-document-outline", color: "#10B981", route: 4 },
            { name: "Aadhaar Pay", icon: "fingerprint", color: "#EF4444", route: 4 },
          ].map((item, idx) => (
            <TouchableOpacity key={idx} style={styles.serviceItem} onPress={() => goTo(item.route)}>
              <View style={[styles.sIconBox, { backgroundColor: item.color + "15" }]}>
                <Icon name={item.icon} size={24} color={item.color} />
              </View>
              <Text style={styles.sLabel}>{item.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
        </View>
        
        <View style={styles.card}>
            <TxnRow name="Cash Withdrawal" date="Apr 10, 2:30 PM" amount="-₹500.00" type="dr" />
            <TxnRow name="Wallet Topup" date="Apr 09, 11:15 AM" amount="+₹2,000.00" type="cr" />
        </View>
      </ScrollView>
    </View>
  );

  const TxnRow = ({ name, date, amount, type }) => (
    <View style={styles.txnRow}>
        <View style={[styles.txnIcon, { backgroundColor: type === 'cr' ? '#22C55E15' : '#EF444415' }]}>
            <Icon name={type === 'cr' ? 'arrow-down-left' : 'arrow-up-right'} size={18} color={type === 'cr' ? '#22C55E' : '#EF4444'} />
        </View>
        <View style={{ flex: 1 }}>
            <Text style={styles.txnName}>{name}</Text>
            <Text style={styles.txnDate}>{date}</Text>
        </View>
        <Text style={[styles.txnAmt, { color: type === 'cr' ? '#22C55E' : '#EF4444' }]}>{amount}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
        {currentScreen === 1 && renderSplash()}
        {currentScreen === 2 && renderKYC()}
        {currentScreen === 3 && renderDashboard()}
        {currentScreen === 4 && renderDashboard()}
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  screenFull: { flex: 1, justifyContent: "center" },
  screenInner: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { padding: 20 * S },

  splashContent: { padding: 30 * S, alignItems: "center" },
  logoBox: { width: 80 * S, height: 80 * S, borderRadius: 24, backgroundColor: "rgba(212,168,67,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 30 * S, borderWidth: 1, borderColor: "rgba(212,168,67,0.3)" },
  splashEyebrow: { color: "rgba(212,168,67,0.6)", fontSize: 12, fontFamily: Fonts.Bold, letterSpacing: 2, marginBottom: 15 },
  splashTitle: { color: Colors.white, fontSize: 32 * S, fontFamily: Fonts.Bold, textAlign: "center", lineHeight: 40 * S, marginBottom: 15 },
  splashSub: { color: "rgba(255,255,255,0.5)", fontSize: 14, textAlign: "center", lineHeight: 22, marginBottom: 40 * S },
  trustRow: { flexDirection: "row", gap: 20, marginBottom: 40 * S },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  trustTxt: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: Fonts.Bold },
  btnPrimary: { backgroundColor: Colors.finance_accent, height: 56 * S, borderRadius: 28, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 30 * S, width: '100%' },

  headerDark: { backgroundColor: "#1A1A2E", padding: 20 * S, paddingTop: 10, borderBottomLeftRadius: 30, borderBottomRightRadius: 30, flexDirection: "row", alignItems: "center", gap: 15 },
  headerTitle: { color: Colors.white, fontSize: 18, fontFamily: Fonts.Bold },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },

  stepCard: { backgroundColor: Colors.white, borderRadius: 20, padding: 20, marginBottom: 20 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 15 },
  stepDot: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  stepDone: { backgroundColor: Colors.success },
  stepActive: { backgroundColor: "#1A1A2E" },
  stepPending: { backgroundColor: "#F1F5F9" },
  stepNum: { fontSize: 12, fontFamily: Fonts.Bold, color: Colors.white },
  stepInfo: { flex: 1 },
  stepName: { fontSize: 14, fontFamily: Fonts.Bold, color: "#1A1A2E" },
  stepDesc: { fontSize: 12, color: Colors.gray_BD, marginTop: 2 },
  stepLine: { width: 2, height: 20, backgroundColor: "#F1F5F9", marginLeft: 14, marginVertical: 4 },

  hubHeader: { backgroundColor: "#1A1A2E", padding: 20, paddingBottom: 30, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
  hubTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 25 },
  hubGreeting: { color: "rgba(255,255,255,0.4)", fontSize: 12 },
  hubUser: { color: Colors.white, fontSize: 18, fontFamily: Fonts.Bold, marginTop: 4 },
  balCard: { backgroundColor: "rgba(212,168,67,0.15)", borderRadius: 20, padding: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "rgba(212,168,67,0.2)" },
  balLabel: { color: "rgba(255,255,255,0.5)", fontSize: 10, fontFamily: Fonts.Bold, letterSpacing: 1 },
  balAmt: { color: Colors.white, fontSize: 28, fontFamily: Fonts.Bold, marginTop: 5 },
  balIcon: { width: 48, height: 48, borderRadius: 16, backgroundColor: "rgba(184,148,77,0.2)", alignItems: "center", justifyContent: "center" },
  glassBtn: { width: 42, height: 42, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },

  sectionHeader: { marginTop: 20, marginBottom: 15 },
  sectionLabel: { fontSize: 12, fontFamily: Fonts.Bold, color: Colors.gray_BD, letterSpacing: 1 },
  serviceRow: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  serviceItem: { width: (SW - 52) / 4, alignItems: "center", gap: 8 },
  sIconBox: { width: 56 * S, height: 56 * S, borderRadius: 18, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(0,0,0,0.05)" },
  sLabel: { fontSize: 10, fontFamily: Fonts.Bold, color: "#1A1A2E", textAlign: "center" },

  card: { backgroundColor: Colors.white, borderRadius: 20, padding: 15 },
  txnRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
  txnIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  txnName: { fontSize: 13, fontFamily: Fonts.Bold, color: "#1A1A2E" },
  txnDate: { fontSize: 11, color: Colors.gray_BD, marginTop: 2 },
  txnAmt: { fontSize: 14, fontFamily: Fonts.Bold },
  btnAccent: { backgroundColor: Colors.accent, height: 56 * S, borderRadius: 28, alignItems: "center", justifyContent: "center", marginTop: 20 },
  btnTxt: { fontSize: 16, fontFamily: Fonts.Bold, color: Colors.white },
});

export default AEPS_OnBoard;