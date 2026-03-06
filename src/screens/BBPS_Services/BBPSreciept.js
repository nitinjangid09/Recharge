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
import Colors from "../../Utils/Color";

const BbpsReceiptScreen = ({ route }) => {
  const navigation = useNavigation();

  const {
    serviceName   = "",
    billerName    = "",
    billerId      = "",
    formData      = {},
    transactionId = "",
    amount,
    status        = "success",
    failureReason = "Transaction could not be processed. Please try again.",
  } = route?.params || {};

  const isSuccess = status !== "failed";

  // ── Animations ──────────────────────────────────────────────────────────────
  const iconScale   = useRef(new Animated.Value(0)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const cardSlide   = useRef(new Animated.Value(40)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const btnOpacity  = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.spring(iconScale,   { toValue: 1, tension: 60, friction: 7, useNativeDriver: true }),
        Animated.timing(iconOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardSlide,   { toValue: 0, duration: 350, useNativeDriver: true }),
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

const SUCCESS_GREEN = "#16A34A";
const SUCCESS_BG    = "#F0FDF4";
const SUCCESS_RING  = "#BBF7D0";
const FAILED_RED    = "#DC2626";
const FAILED_BG     = "#FEF2F2";
const FAILED_RING   = "#FECACA";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },

  // Header — identical to service screen
  header: { paddingVertical: 22, alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "700", color: Colors.white || "#FFF", letterSpacing: 0.3 },
  headerSub:   { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 3 },

  // Body card — identical to service screen
  body: {
    flex: 1,
    backgroundColor: Colors.bg || "#F4F6FB",
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
    elevation: 4,
  },
  iconWrapSuccess: { backgroundColor: SUCCESS_BG,  borderColor: SUCCESS_RING  },
  iconWrapFailed:  { backgroundColor: FAILED_BG,   borderColor: FAILED_RING   },
  iconEmoji: { fontSize: 34, fontWeight: "800" },

  // Status text
  statusTitle:  { fontSize: 20, fontWeight: "700", marginBottom: 4 },
  successColor: { color: SUCCESS_GREEN },
  failedColor:  { color: FAILED_RED },
  amountText: {
    fontSize: 30, fontWeight: "800", color: Colors.black || "#1A1A2E", marginTop: 4, marginBottom: 4,
  },
  failureReason: {
    fontSize: 13, color: "#6B7280", textAlign: "center",
    marginTop: 6, marginHorizontal: 20, lineHeight: 20,
  },

  // Receipt card
  card: {
    width: "100%",
    backgroundColor: Colors.white || "#FFF",
    borderRadius: 20,
    elevation: 4,
    marginTop: 22,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 18, paddingVertical: 14,
  },
  cardHeaderSuccess: { backgroundColor: SUCCESS_BG },
  cardHeaderFailed:  { backgroundColor: FAILED_BG },
  cardHeaderTxt: { fontSize: 13, fontWeight: "700", color: Colors.black || "#1A1A2E" },
  cardHeaderSub: { fontSize: 11, color: "#9CA3AF" },

  cardBody: { paddingHorizontal: 18, paddingBottom: 10, paddingTop: 6 },

  // Detail rows
  detailRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  detailLabel: { fontSize: 13, color: "#6B7280", flex: 1 },
  detailValue: {
    fontSize: 13, fontWeight: "600", color: Colors.black || "#1A1A2E",
    flex: 1.5, textAlign: "right",
  },
  detailValueHighlight: { fontSize: 15, fontWeight: "700", color: Colors.primary },
  detailValueMono:      { fontFamily: "monospace", fontSize: 12 },

  // Status badge
  badge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6,
  },
  badgeSuccess:    { backgroundColor: SUCCESS_BG },
  badgeFailed:     { backgroundColor: FAILED_BG },
  badgeTxt:        { fontSize: 11, fontWeight: "700", letterSpacing: 0.6 },
  badgeTxtSuccess: { color: SUCCESS_GREEN },
  badgeTxtFailed:  { color: FAILED_RED },

  // Buttons
  btnGroup: { width: "100%", marginTop: 28, gap: 12 },
  retryBtn: {
    backgroundColor: Colors.white || "#FFF",
    borderWidth: 1.5, borderColor: FAILED_RED,
    paddingVertical: 16, borderRadius: 16, alignItems: "center", elevation: 1,
  },
  retryBtnTxt: { color: FAILED_RED, fontSize: 15, fontWeight: "700" },

  doneBtn: {
    paddingVertical: 16, borderRadius: 16, alignItems: "center", elevation: 5,
  },
  doneBtnSuccess: { backgroundColor: Colors.accent || Colors.primary },
  doneBtnNeutral: { backgroundColor: Colors.primary },
  doneBtnTxt: { color: Colors.white || "#FFF", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
});