import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Colors from "../../../constants/Colors";
import Fonts from "../../../constants/Fonts";

const BbpsReceiptScreen = ({ route }) => {
  const navigation = useNavigation();

  const {
    serviceName = "",
    billerName = "",
    billerId = "",
    formData = {},
    transactionId = "",
    amount,
    status = "success",
    failureReason = "Transaction could not be processed. Please try again.",
  } = route?.params || {};

  const isSuccess = status !== "failed";

  // ── Animations ──────────────────────────────────────────────────────────────
  const iconScale = useRef(new Animated.Value(0)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const cardSlide = useRef(new Animated.Value(40)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const btnOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(iconScale, { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
        Animated.timing(iconOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardSlide, { toValue: 0, duration: 350, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      Animated.timing(btnOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const formEntries = Object.entries(formData).filter(([, v]) => v !== "" && v != null);

  const formatLabel = (key) =>
    key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header — matches service screen */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Payment Receipt</Text>
        <Text style={styles.headerSub}>Bharat Bill Payment System</Text>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          {/* ── Status Icon ── */}
          <Animated.View
            style={[
              styles.iconWrap,
              isSuccess ? styles.iconWrapSuccess : styles.iconWrapFailed,
              { transform: [{ scale: iconScale }], opacity: iconOpacity },
            ]}
          >
            <Text style={styles.iconEmoji}>{isSuccess ? "✓" : "✕"}</Text>
          </Animated.View>

          {/* ── Status Text ── */}
          <Animated.View style={{ opacity: iconOpacity, alignItems: "center" }}>
            <Text style={[styles.statusTitle, isSuccess ? styles.successColor : styles.failedColor]}>
              {isSuccess ? "Payment Successful" : "Payment Failed"}
            </Text>
            {isSuccess && amount != null && (
              <Text style={styles.amountText}>₹ {amount}</Text>
            )}
            {!isSuccess && (
              <Text style={styles.failureReason}>{failureReason}</Text>
            )}
          </Animated.View>

          {/* ── Receipt Card ── */}
          <Animated.View
            style={[
              styles.card,
              { transform: [{ translateY: cardSlide }], opacity: cardOpacity },
            ]}
          >
            {/* Card header strip */}
            <View style={[styles.cardHeader, isSuccess ? styles.cardHeaderSuccess : styles.cardHeaderFailed]}>
              <Text style={styles.cardHeaderTxt}>Transaction Details</Text>
              <Text style={styles.cardHeaderSub}>
                {new Date().toLocaleDateString("en-IN", {
                  day: "2-digit", month: "short", year: "numeric",
                })}
              </Text>
            </View>

            {/* Details rows */}
            <View style={styles.cardBody}>
              {/* Service */}
              {!!serviceName && (
                <DetailRow label="Service" value={serviceName} />
              )}

              {/* Biller */}
              {!!billerName && (
                <DetailRow label="Biller" value={billerName} />
              )}

              {/* Dynamic form fields */}
              {formEntries.map(([key, val]) => (
                <DetailRow key={key} label={formatLabel(key)} value={String(val)} />
              ))}

              {/* Amount */}
              {amount != null && (
                <DetailRow
                  label="Amount"
                  value={`₹ ${amount}`}
                  highlight
                />
              )}

              {/* Transaction ID */}
              {!!transactionId && (
                <DetailRow label="Transaction ID" value={transactionId} mono />
              )}

              {/* Status badge */}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <View style={[styles.badge, isSuccess ? styles.badgeSuccess : styles.badgeFailed]}>
                  <Text style={[styles.badgeTxt, isSuccess ? styles.badgeTxtSuccess : styles.badgeTxtFailed]}>
                    {isSuccess ? "SUCCESS" : "FAILED"}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* ── Buttons ── */}
          <Animated.View style={[styles.btnGroup, { opacity: btnOpacity }]}>
            {!isSuccess && (
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => navigation.goBack()}
                activeOpacity={0.82}
              >
                <Text style={styles.retryBtnTxt}>Try Again</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.doneBtn, isSuccess ? styles.doneBtnSuccess : styles.doneBtnNeutral]}
              onPress={() => navigation.navigate("BBPSServices")}
              activeOpacity={0.82}
            >
              <Text style={styles.doneBtnTxt}>
                {isSuccess ? "Done" : "Go to Services"}
              </Text>
            </TouchableOpacity>
          </Animated.View>

        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

// ── Sub-component: Detail Row ───────────────────────────────────────────────

const DetailRow = ({ label, value, highlight = false, mono = false }) => (
  <View style={styles.detailRow}>
    <Text style={styles.detailLabel}>{label}</Text>
    <Text
      style={[
        styles.detailValue,
        highlight && styles.detailValueHighlight,
        mono && styles.detailValueMono,
      ]}
      numberOfLines={2}
    >
      {value}
    </Text>
  </View>
);

export default BbpsReceiptScreen;

// ─────────────────────────────────────────────────────────────────────────────
//  Styles
// ─────────────────────────────────────────────────────────────────────────────

const SUCCESS_GREEN = Colors.success_dark;
const SUCCESS_BG = Colors.success_light;
const SUCCESS_RING = Colors.success_ring;
const FAILED_RED = Colors.error_dark;
const FAILED_BG = Colors.error_light;
const FAILED_RING = Colors.error_ring;

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },

  // Header — identical to service screen
  header: { paddingVertical: 22, alignItems: "center" },
  headerTitle: { fontSize: 22, fontFamily: Fonts.Bold, color: Colors.white, letterSpacing: 0.3 },
  headerSub: { fontSize: 12, fontFamily: Fonts.Regular, color: "rgba(255,255,255,0.60)", marginTop: 3 },

  // Body card — identical to service screen
  body: {
    flex: 1,
    backgroundColor: Colors.beige || "rgb(244, 246, 251)",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },
  scroll: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 50,
    alignItems: "center",
  },

  // Status icon circle
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    alignItems: "center", justifyContent: "center",
    marginBottom: 16,
    borderWidth: 3,
  },
  iconWrapSuccess: { backgroundColor: SUCCESS_BG, borderColor: SUCCESS_RING },
  iconWrapFailed: { backgroundColor: FAILED_BG, borderColor: FAILED_RING },
  iconEmoji: { fontSize: 34, fontFamily: Fonts.Bold },

  // Status text
  statusTitle: { fontSize: 20, fontFamily: Fonts.Bold, marginBottom: 4 },
  successColor: { color: SUCCESS_GREEN },
  failedColor: { color: FAILED_RED },
  amountText: {
    fontSize: 30, fontFamily: Fonts.Bold, color: Colors.black, marginTop: 4, marginBottom: 4,
  },
  failureReason: {
    fontSize: 13, fontFamily: Fonts.Regular, color: Colors.slate_500, textAlign: "center",
    marginTop: 6, marginHorizontal: 20, lineHeight: 20,
  },

  // Receipt card
  card: {
    width: "100%",
    backgroundColor: Colors.cardbg || "rgb(255, 255, 255)",
    borderRadius: 20,
    marginTop: 22,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 18, paddingVertical: 14,
  },
  cardHeaderSuccess: { backgroundColor: SUCCESS_BG },
  cardHeaderFailed: { backgroundColor: FAILED_BG },
  cardHeaderTxt: { fontSize: 13, fontFamily: Fonts.Bold, color: Colors.black },
  cardHeaderSub: { fontSize: 11, fontFamily: Fonts.Regular, color: Colors.gray },

  cardBody: { paddingHorizontal: 18, paddingBottom: 10, paddingTop: 6 },

  // Detail rows
  detailRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(245,158,11,0.15)",
  },
  detailLabel: { fontSize: 13, fontFamily: Fonts.Regular, color: Colors.slate_500, flex: 1 },
  detailValue: {
    fontSize: 13, fontFamily: Fonts.SemiBold, color: Colors.black,
    flex: 1.5, textAlign: "right",
  },
  detailValueHighlight: { fontSize: 15, fontFamily: Fonts.Bold, color: Colors.primary },
  detailValueMono: { fontFamily: "monospace", fontSize: 12 },

  // Status badge
  badge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
  },
  badgeSuccess: { backgroundColor: SUCCESS_BG },
  badgeFailed: { backgroundColor: FAILED_BG },
  badgeTxt: { fontSize: 11, fontFamily: Fonts.Bold, letterSpacing: 0.6 },
  badgeTxtSuccess: { color: SUCCESS_GREEN },
  badgeTxtFailed: { color: FAILED_RED },

  // Buttons
  btnGroup: { width: "100%", marginTop: 28, gap: 12 },
  retryBtn: {
    backgroundColor: Colors.cardbg || "rgb(255, 255, 255)",
    borderWidth: 1.5, borderColor: FAILED_RED,
    paddingVertical: 16, borderRadius: 16, alignItems: "center",
  },
  retryBtnTxt: { color: FAILED_RED, fontSize: 15, fontFamily: Fonts.Bold },

  doneBtn: {
    paddingVertical: 16, borderRadius: 16, alignItems: "center",
  },
  doneBtnSuccess: { backgroundColor: Colors.accent || Colors.primary },
  doneBtnNeutral: { backgroundColor: Colors.primary },
  doneBtnTxt: { color: Colors.white || "rgb(255, 255, 255)", fontSize: 16, fontFamily: Fonts.Bold, letterSpacing: 0.3 },
});
