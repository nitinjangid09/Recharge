import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Animated,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect, useRoute } from "@react-navigation/native";
import Colors from "../../../constants/Colors";
import Fonts from "../../../constants/Fonts";
import { fadeIn, slideUp } from "../../../utils/ScreenAnimations";
import { getDmtBeneficiaries, checkDmtLimit } from "../../../api/AuthApi";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_ALLOWED_LIMIT = 25000; // Fixed per customer usually

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
  const route = useRoute();
  const senderMobile = route.params?.mobileNumber || "";

  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [limitData, setLimitData] = useState({ total: 0, used: 0 });

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

  useFocusEffect(
    React.useCallback(() => {
      fetchBeneficiaries();
      fetchLimit();
    }, [])
  );

  const fetchLimit = async () => {
    try {
      const token = await AsyncStorage.getItem("header_token");
      const res = await checkDmtLimit({
        data: { mobileNumber: senderMobile },
        headerToken: token,
        idempotencyKey: `LIMIT_CHECK_${senderMobile}_${Date.now()}`
      });
      if (res.success || res.status === "SUCCESS") {
        const total = res.data?.CustomerLimit || 0;
        setLimitData({ total, used: MAX_ALLOWED_LIMIT - total });
      }
    } catch (err) {
      console.log("Fetch Limit Error:", err);
    }
  };

  const fetchBeneficiaries = async () => {
    try {
      const token = await AsyncStorage.getItem("header_token");
      const res = await getDmtBeneficiaries({ headerToken: token });
      if (res.success || res.status === "SUCCESS") {
        const rawList = Array.isArray(res.data) ? res.data : [];
        const mapped = rawList.map((b) => ({
          id: b._id || b.id,
          name: b.holderName || b.name,
          bank: b.bankName || b.bank,
          accountNumber: b.accountNumber,
          ifsc: b.ifscCode || b.ifsc,
        }));
        setAccounts(mapped);
      }
    } catch (err) {
      console.log("Fetch Beneficiaries Error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBeneficiaries();
  };

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
          onPress={() => navigation.navigate("AddBenificial", { senderMobile })}
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
            <Text style={styles.budgetLabel}>REMAINING LIMIT</Text>
            <Text style={styles.budgetAmount}>
              ₹{limitData.total.toLocaleString("en-IN")}
            </Text>
          </View>
          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.budgetLabel}>User Mobile</Text>
            <Text style={styles.userId}>{senderMobile}</Text>
          </View>
        </View>

        {/* Remaining pill + amount */}
        <View style={styles.remainingRow}>
          <View style={styles.remainingPill}>
            <View style={styles.remainingDot} />
            <Text style={styles.remainingLabel}>TOTAL BENEFICIARIES</Text>
          </View>
          <Text style={styles.remainingAmt}>
            {accounts.length}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View
            style={[
              styles.progressFill,
              { width: `${limitData.total > 0 ? (limitData.used / MAX_ALLOWED_LIMIT) * 100 : 0}%` }
            ]}
          />
        </View>

        {/* Progress info */}
        <View style={styles.progressInfoRow}>
          <Text style={styles.progressInfoTxt}>
            Used ₹{limitData.used.toLocaleString("en-IN")}
          </Text>
          <Text style={styles.progressInfoTxt}>Max ₹{MAX_ALLOWED_LIMIT.toLocaleString("en-IN")}</Text>
        </View>
      </Animated.View>

      {/* ══ BODY ══ */}
      <View style={styles.body}>
        {loading && !refreshing ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingTxt}>Fetching beneficiaries...</Text>
          </View>
        ) : (
          <FlatList
            data={accounts}
            keyExtractor={(item) => item.id}
            renderItem={({ item, index }) => (
              <AccountCard item={item} index={index} onTransfer={handleTransfer} />
            )}
            ListHeaderComponent={ListHeader}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />
            }
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyTxt}>No beneficiaries found.</Text>
                <Text style={styles.emptySub}>Add your first beneficiary to get started.</Text>
              </View>
            }
          />
        )}
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
  remainingDot: { width: scale(7), height: scale(7), borderRadius: scale(4), backgroundColor: Colors.kyc_accent },
  remainingLabel: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(9), letterSpacing: 0.8 },
  remainingAmt: { fontFamily: Fonts.Bold, color: Colors.kyc_accent, fontSize: rs(20) },

  progressTrack: {
    height: vs(5), backgroundColor: Colors.whiteOpacity_18,
    borderRadius: scale(4), overflow: "hidden", marginBottom: vs(6),
  },
  progressFill: { height: "100%", backgroundColor: Colors.kyc_accent, borderRadius: scale(4) },
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
  // Add Beneficiary — primary color
  actionBtnAdd: {
    backgroundColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6,
    borderWidth: 1, borderColor: Colors.whiteOpacity_15,
  },
  // Fetch Beneficiary — primary dark color
  actionBtnFetch: {
    backgroundColor: Colors.kyc_accent,
    shadowColor: Colors.kyc_accent,
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
  sectionTitle: { fontFamily: Fonts.Bold, fontSize: rs(16), color: Colors.kyc_accent },
  countBadge: {
    backgroundColor: Colors.kyc_accent + "18",
    borderRadius: scale(20), paddingHorizontal: scale(10), paddingVertical: vs(4),
    borderWidth: 1, borderColor: Colors.kyc_accent + "30",
  },
  countTxt: { fontFamily: Fonts.Bold, color: Colors.primary, fontSize: rs(10) },

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
  tagIfsc: { backgroundColor: Colors.kyc_accent },
  tagIfscTxt: { fontFamily: Fonts.Medium, color: Colors.white },

  // ── Send button — text only ──
  sendBtn: {
    backgroundColor: Colors.kyc_accent,
    borderRadius: scale(12),
    paddingVertical: vs(9), paddingHorizontal: scale(16),
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
  },
  sendTxt: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(12) },

  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bg },
  loadingTxt: { fontFamily: Fonts.Medium, color: Colors.gray_9E, marginTop: vs(10), fontSize: rs(13) },
  emptyWrap: { alignItems: "center", justifyContent: "center", marginTop: vs(60) },
  emptyTxt: { fontFamily: Fonts.Bold, color: Colors.primary, fontSize: rs(16) },
  emptySub: { fontFamily: Fonts.Medium, color: Colors.gray_9E, fontSize: rs(13), marginTop: vs(4) },
});