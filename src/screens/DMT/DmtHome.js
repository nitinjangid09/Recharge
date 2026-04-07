import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Colors from "../../constants/Colors";
import Fonts from "../../constants/Fonts";
import { fadeIn, slideUp } from "../../utils/ScreenAnimations";

// ─── Responsive Scaling ───────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get("window");
const BASE_W = 390;
const BASE_H = 844;
const scale = (s) => Math.round((SW / BASE_W) * s);
const vs = (s) => Math.round((SH / BASE_H) * s);
const rs = (s) => Math.round(Math.sqrt((SW * SH) / (BASE_W * BASE_H)) * s);

// ─── Avatar color palette ─────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "#5C6BC0", // indigo
  "#9C27B0", // purple
  "#00897B", // teal
  "#F4511E", // deep orange
  "#0288D1", // blue
  "#558B2F", // green
];

const getAvatarColor = (name) => {
  const idx = (name.charCodeAt(0) + (name.charCodeAt(1) || 0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
};

const getInitials = (name) =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

// ─── Data ─────────────────────────────────────────────────────────────────────
const accounts = [
  { id: "1", name: "Rahul Sharma", bank: "State Bank of India", accountNumber: "XXXXXX4589", ifsc: "SBIN0004589" },
  { id: "2", name: "Amit Verma", bank: "HDFC Bank", accountNumber: "XXXXXX7832", ifsc: "HDFC0007832" },
  { id: "3", name: "Neha Singh", bank: "ICICI Bank", accountNumber: "XXXXXX1122", ifsc: "ICIC0001122" },
  { id: "4", name: "Rahul Sharma", bank: "State Bank of India", accountNumber: "XXXXXX4589", ifsc: "SBIN0004589" },
  { id: "5", name: "Priya Patel", bank: "Axis Bank", accountNumber: "XXXXXX3310", ifsc: "UTIB0003310" },
];

const TOTAL_BUDGET = 50000;
const REMAINING = 32450;
const SPENT = TOTAL_BUDGET - REMAINING;
const SPENT_PERCENT = Math.round((SPENT / TOTAL_BUDGET) * 100);

// ══════════════════════════════════════════════════════════════════════════════
//  ACCOUNT CARD
// ══════════════════════════════════════════════════════════════════════════════
const AccountCard = ({ item, index, onTransfer }) => {
  const cardOp = useRef(new Animated.Value(0)).current;
  const cardTY = useRef(new Animated.Value(vs(16))).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([fadeIn(cardOp, 300), slideUp(cardTY, 300)]).start();
    }, index * 80);
  }, []);

  const avatarColor = getAvatarColor(item.name);

  return (
    <Animated.View style={[styles.card, { opacity: cardOp, transform: [{ translateY: cardTY }] }]}>
      <View style={styles.cardLeft}>

        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: avatarColor }]}>
          <Text style={styles.avatarTxt}>{getInitials(item.name)}</Text>
        </View>

        {/* Info */}
        <View style={styles.cardInfo}>
          <Text style={styles.cardName}>{item.name}</Text>
          <Text style={styles.cardBank}>{item.bank}</Text>

          {/* ── Acc no + IFSC on ONE line ── */}
          <View style={styles.tagRow}>
            <View style={styles.tag}>
              <Text style={styles.tagTxt}>{item.accountNumber}</Text>
            </View>
            <View style={[styles.tag, styles.tagIfsc]}>
              <Text style={[styles.tagTxt, styles.tagIfscTxt]}>{item.ifsc}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Send button — text only, no icon */}
      <TouchableOpacity
        style={styles.sendBtn}
        onPress={() => onTransfer(item)}
        activeOpacity={0.85}
      >
        <Text style={styles.sendTxt}>Transfer</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
const DmtHome = () => {
  const navigation = useNavigation();

  const headerOp = useRef(new Animated.Value(0)).current;
  const headerTY = useRef(new Animated.Value(vs(20))).current;
  const bodyOp = useRef(new Animated.Value(0)).current;
  const bodyTY = useRef(new Animated.Value(vs(16))).current;

  useEffect(() => {
    Animated.parallel([fadeIn(headerOp, 500), slideUp(headerTY, 500)]).start();
    setTimeout(() => {
      Animated.parallel([fadeIn(bodyOp, 400), slideUp(bodyTY, 400)]).start();
    }, 200);
  }, []);

  const handleTransfer = (account) => {
    navigation.navigate("MoneyTransfer", { account });
  };

  const ListHeader = () => (
    <Animated.View style={{ opacity: bodyOp, transform: [{ translateY: bodyTY }] }}>

      {/* ── Action Buttons ── */}
      <View style={styles.actionRow}>
        {/* Add Beneficiary — accent / orange */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnAdd]}
          onPress={() => navigation.navigate("AddBenificial")}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnIcon}>↑</Text>
          <Text style={styles.actionBtnTxt}>Add Beneficiary</Text>
        </TouchableOpacity>

        {/* Fetch Beneficiary — different color (primary / dark) */}
        <TouchableOpacity
          style={[styles.actionBtn, styles.actionBtnFetch]}
          onPress={() => navigation.navigate("FetchBeneficiary")}
          activeOpacity={0.85}
        >
          <Text style={styles.actionBtnIcon}>↓</Text>
          <Text style={styles.actionBtnTxt}>Fetch Beneficiary</Text>
        </TouchableOpacity>
      </View>

      {/* ── Section Header ── */}
      <View style={styles.sectionRow}>
        <Text style={styles.sectionTitle}>Account History</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countTxt}>{accounts.length} contacts</Text>
        </View>
      </View>
    </Animated.View>
  );

  return (
    <SafeAreaView style={styles.safe}>

      {/* ══ DARK HEADER ══ */}
      <Animated.View
        style={[styles.header, { opacity: headerOp, transform: [{ translateY: headerTY }] }]}
      >
        {/* Budget + User ID row */}
        <View style={styles.headerTopRow}>
          <View>
            <Text style={styles.budgetLabel}>TOTAL BUDGET</Text>
            <Text style={styles.budgetAmount}>
              ₹{TOTAL_BUDGET.toLocaleString("en-IN")}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.budgetLabel}>USER ID</Text>
            <Text style={styles.userId}>465146144</Text>
          </View>
        </View>

        {/* Remaining pill + amount */}
        <View style={styles.remainingRow}>
          <View style={styles.remainingPill}>
            <View style={styles.remainingDot} />
            <Text style={styles.remainingLabel}>REMAINING</Text>
          </View>
          <Text style={styles.remainingAmt}>
            ₹{REMAINING.toLocaleString("en-IN")}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${SPENT_PERCENT}%` }]} />
        </View>

        {/* Progress info */}
        <View style={styles.progressInfoRow}>
          <Text style={styles.progressInfoTxt}>
            Spent ₹{SPENT.toLocaleString("en-IN")}
          </Text>
          <Text style={styles.progressInfoTxt}>{SPENT_PERCENT}% used</Text>
        </View>
      </Animated.View>

      {/* ══ BODY ══ */}
      <View style={styles.body}>
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <AccountCard item={item} index={index} onTransfer={handleTransfer} />
          )}
          ListHeaderComponent={ListHeader}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      </View>
    </SafeAreaView>
  );
};

export default DmtHome;

// ══════════════════════════════════════════════════════════════════════════════
//  STYLES
// ══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  body: { flex: 1, backgroundColor: Colors.bg },
  listContent: { paddingHorizontal: scale(16), paddingBottom: vs(30) },

  // ── Header ──
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: scale(20),
    paddingTop: vs(12),
    paddingBottom: vs(22),
  },
  headerTopRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    marginBottom: vs(16),
  },
  budgetLabel: {
    fontFamily: Fonts.Bold, color: Colors.whiteOpacity_65, fontSize: rs(10), letterSpacing: 0.8,
  },
  budgetAmount: {
    fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(36), letterSpacing: -0.5, marginTop: vs(2),
  },
  userId: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(16), marginTop: vs(2) },

  remainingRow: {
    flexDirection: "row", alignItems: "center", gap: scale(10), marginBottom: vs(10),
  },
  remainingPill: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.whiteOpacity_10,
    borderWidth: 1, borderColor: Colors.whiteOpacity_18,
    borderRadius: scale(20), paddingHorizontal: scale(10), paddingVertical: vs(4),
    gap: scale(5),
  },
  remainingDot: { width: scale(7), height: scale(7), borderRadius: scale(4), backgroundColor: Colors.accent },
  remainingLabel: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(9), letterSpacing: 0.8 },
  remainingAmt: { fontFamily: Fonts.Bold, color: Colors.accent, fontSize: rs(20) },

  progressTrack: {
    height: vs(5), backgroundColor: Colors.whiteOpacity_18,
    borderRadius: scale(4), overflow: "hidden", marginBottom: vs(6),
  },
  progressFill: { height: "100%", backgroundColor: Colors.accent, borderRadius: scale(4) },
  progressInfoRow: { flexDirection: "row", justifyContent: "space-between" },
  progressInfoTxt: { fontFamily: Fonts.Medium, color: Colors.whiteOpacity_65, fontSize: rs(10) },

  // ── Action buttons ──
  actionRow: {
    flexDirection: "row", gap: scale(12),
    marginTop: vs(20), marginBottom: vs(4),
  },
  actionBtn: {
    flex: 1, flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: scale(6),
    paddingVertical: vs(13), borderRadius: scale(14),
    elevation: 3,
  },
  // Add Beneficiary — accent orange
  actionBtnAdd: {
    backgroundColor: Colors.accent,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6,
  },
  // Fetch Beneficiary — primary dark color (distinct from orange)
  actionBtnFetch: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 6,
    borderWidth: 1, borderColor: Colors.whiteOpacity_10,
  },
  actionBtnIcon: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(15) },
  actionBtnTxt: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(12) },

  // ── Section header ──
  sectionRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: vs(20), marginBottom: vs(10),
  },
  sectionTitle: { fontFamily: Fonts.Bold, fontSize: rs(16), color: Colors.primary },
  countBadge: {
    backgroundColor: Colors.accent + "18",
    borderRadius: scale(20), paddingHorizontal: scale(10), paddingVertical: vs(4),
    borderWidth: 1, borderColor: Colors.accent + "30",
  },
  countTxt: { fontFamily: Fonts.Bold, color: Colors.accent, fontSize: rs(10) },

  // ── Account Card ──
  card: {
    backgroundColor: Colors.white,
    borderRadius: scale(18), padding: scale(14),
    flexDirection: "row", alignItems: "center",
    justifyContent: "space-between",
    marginBottom: vs(12),
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 6,
  },
  cardLeft: { flexDirection: "row", alignItems: "center", flex: 1 },

  avatar: {
    width: scale(46), height: scale(46), borderRadius: scale(13),
    alignItems: "center", justifyContent: "center",
    marginRight: scale(12),
    flexShrink: 0,
  },
  avatarTxt: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(14) },

  cardInfo: { flex: 1 },
  cardName: { fontFamily: Fonts.Bold, fontSize: rs(13), color: Colors.gray_21, marginBottom: vs(2) },
  cardBank: { fontFamily: Fonts.Regular, fontSize: rs(11), color: Colors.gray_9E, marginBottom: vs(6) },

  // ── ONE LINE: acc no + ifsc ──
  tagRow: { flexDirection: "row", alignItems: "center", gap: scale(6), flexWrap: "nowrap" },
  tag: {
    backgroundColor: Colors.gray_F0, borderRadius: scale(6),
    paddingHorizontal: scale(7), paddingVertical: vs(3),
  },
  tagTxt: { fontFamily: Fonts.Medium, fontSize: rs(9), color: Colors.gray_75 },
  tagIfsc: { backgroundColor: Colors.info_light },
  tagIfscTxt: { fontFamily: Fonts.Medium, color: Colors.info_dark },

  // ── Send button — text only ──
  sendBtn: {
    backgroundColor: Colors.accent,
    borderRadius: scale(12),
    paddingVertical: vs(9), paddingHorizontal: scale(16),
    elevation: 2,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
  },
  sendTxt: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(12) },
});