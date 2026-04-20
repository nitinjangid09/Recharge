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
import { getDmtBeneficiaries, checkDmtLimit, deleteDmtBeneficiary } from "../../../api/AuthApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Alert } from "react-native";
import { AlertService } from "../../../componets/Alerts/CustomAlert";

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

const getAvatarColor = (name = "U") => {
  const safeName = name && name.length > 0 ? name : "U";
  const idx = (safeName.charCodeAt(0) + (safeName.charCodeAt(1) || 0)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
};

const getInitials = (name = "U") => {
  const safeName = name && name.length > 0 ? name : "U";
  return safeName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

// ─── Constants ────────────────────────────────────────────────────────────────
const MAX_ALLOWED_LIMIT = 25000; // Fixed per customer usually

// ══════════════════════════════════════════════════════════════════════════════
//  ACCOUNT CARD
// ══════════════════════════════════════════════════════════════════════════════
const AccountCard = ({ item, index, onTransfer, onDelete }) => {
  const cardOp = useRef(new Animated.Value(0)).current;
  const cardTY = useRef(new Animated.Value(vs(16))).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([fadeIn(cardOp, 300), slideUp(cardTY, 300)]).start();
    }, index * 80);
  }, []);

  return (
    <Animated.View style={[styles.card, { opacity: cardOp, transform: [{ translateY: cardTY }] }]}>


      <View style={styles.cardMain}>
        {/* Avatar Section */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: Colors.kyc_accent }]}>
            <Text style={styles.avatarTxt}>{getInitials(item.name)}</Text>
          </View>
          <View style={styles.avatarDecoration} />
        </View>

        {/* Info Section */}
        <View style={styles.cardContent}>
          <View style={styles.nameRow}>
            <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
            <View style={styles.verifiedBadge}>
              <Icon name="check-decagram" size={rs(12)} color={Colors.kyc_accent} />
            </View>
          </View>

          <Text style={styles.cardBank} numberOfLines={1}>{item.bank}</Text>

          <View style={styles.detailsGrid}>
            <View style={styles.detailItem}>
              <Text style={styles.detailLabel}>ACCOUNT</Text>
              <Text style={styles.detailValue}>{item.accountNumber}</Text>
            </View>
            <View style={[styles.detailItem, { borderLeftWidth: 1, borderLeftColor: Colors.gray_F0 }]}>
              <Text style={styles.detailLabel}>IFSC</Text>
              <Text style={styles.detailValue}>{item.ifsc}</Text>
            </View>
          </View>
        </View>

        {/* Actions Section */}
        <View style={styles.actionRowInline}>
          <TouchableOpacity
            style={styles.transferBtn}
            onPress={() => onTransfer(item)}
            activeOpacity={0.8}
          >
            <Icon name="send" size={rs(14)} color={Colors.white} />
            <Text style={styles.transferBtnTxt}>Transfer</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => onDelete && onDelete(item)}
            activeOpacity={0.7}
          >
            <Icon name="delete-outline" size={rs(20)} color={Colors.error_dark} />
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
const DmtHome = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const [senderMobile, setSenderMobile] = useState(route.params?.mobileNumber || "");
  const [senderName, setSenderName] = useState(route.params?.customerName || "");

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
    loadSenderInfo();
  }, []);

  const loadSenderInfo = async () => {
    if (!senderMobile) {
      const mob = await AsyncStorage.getItem("sender_mobile");
      if (mob) setSenderMobile(mob);
    }
    if (!senderName) {
      const name = await AsyncStorage.getItem("sender_name");
      if (name) setSenderName(name);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      fetchBeneficiaries();
      fetchLimit();
    }, [])
  );

  const fetchLimit = async () => {
    try {
      const mobile = senderMobile || await AsyncStorage.getItem("sender_mobile");
      if (!mobile) return;

      const token = await AsyncStorage.getItem("header_token");
      const res = await checkDmtLimit({
        data: { mobileNumber: mobile },
        headerToken: token,
        idempotencyKey: `LIMIT_CHECK_${mobile}_${Date.now()}`
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
      const savedMobile = await AsyncStorage.getItem("sender_mobile");
      const mobile = senderMobile || savedMobile || "GUEST";

      const idempotencyKey = `GET_BENES_${mobile}_${Date.now()}`;
      const res = await getDmtBeneficiaries({
        data: { mobile },
        headerToken: token,
        idempotencyKey
      });

      const isSuccess = res.success || res.status === "SUCCESS" || res.status === true || res.statusCode === 200;

      if (isSuccess) {
        // Handle both direct array and nested data.data array
        let rawList = [];
        if (Array.isArray(res.data)) {
          rawList = res.data;
        } else if (res.data && Array.isArray(res.data.beneficiaries)) {
          rawList = res.data.beneficiaries;
        } else if (res.data && Array.isArray(res.data.data)) {
          rawList = res.data.data;
        }

        const mapped = rawList.map((b, idx) => ({
          id: b._id || b.id || `bene_${idx}_${Date.now()}`,
          name: b.account_name || b.accountHolderName || b.holderName || b.name || "Unknown Name",
          bank: b.bank || b.bankName || "Unknown Bank",
          accountNumber: b.account_no || b.accountNumber || "N/A",
          ifsc: b.ifsc || b.ifscCode || b.ifsc_code || "N/A",
          bene_mobile: b.bene_mobile || b.mobile || "",
          // Store raw fields for deletion
          raw: {
            accountHolderName: b.account_name || b.accountHolderName || b.holderName || b.name,
            accountNumber: b.account_no || b.accountNumber,
            ifsc: b.ifsc || b.ifscCode || b.ifsc_code,
            bankName: b.bank || b.bankName,
          }
        }));
        setAccounts(mapped);
      } else {
        console.log("Beneficiary fetch not successful:", res.message);
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

  const handleDelete = (account) => {
    AlertService.showAlert({
      type: "warning",
      title: "Confirm Delete",
      message: `Are you sure you want to delete ${account.name}? This action cannot be undone.`,
      confirmText: "Delete Now",
      cancelText: "Keep it",
      onConfirm: async () => {
        AlertService.hideAlert();
        try {
          const token = await AsyncStorage.getItem("header_token");
          const savedMobile = await AsyncStorage.getItem("sender_mobile");
          const mobile = senderMobile || savedMobile;

          const payload = {
            ...account.raw,
            mobile: mobile
          };

          const res = await deleteDmtBeneficiary({
            data: payload,
            headerToken: token,
            idempotencyKey: `DEL_BEN_${account.accountNumber}_${Date.now()}`
          });

          if (res.success || res.status === "SUCCESS") {
            AlertService.showAlert({
              type: "success",
              title: "Deleted",
              message: res.message || "Beneficiary removed successfully"
            });
            fetchBeneficiaries(); // Refresh list
          } else {
            AlertService.showAlert({
              type: "error",
              title: "Delete Failed",
              message: res.message || "Unable to delete beneficiary"
            });
          }
        } catch (err) {
          console.log("Delete Error:", err);
        }
      }
    });
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
          onPress={fetchBeneficiaries}
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
            <Text style={styles.budgetLabel} />
            {senderName ? <Text style={styles.senderNameTxt}>{senderName}</Text> : null}
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
              <AccountCard
                item={item}
                index={index}
                onTransfer={handleTransfer}
                onDelete={handleDelete}
              />
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
  userId: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(15), marginTop: vs(2) },
  senderNameTxt: { fontFamily: Fonts.Medium, color: Colors.kyc_accent, fontSize: rs(12), marginTop: vs(2) },

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

  // ── Account Card Redesign ──
  card: {
    backgroundColor: Colors.white,
    borderRadius: scale(20),
    marginBottom: vs(16),
    elevation: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(212,176,106,0.12)',
    overflow: 'hidden',
  },
  cardMain: {
    flexDirection: "row",
    padding: scale(14),
    alignItems: "center",
  },
  avatarSection: {
    marginRight: scale(12),
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(16),
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
    elevation: 3,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  avatarTxt: {
    fontFamily: Fonts.Bold,
    color: Colors.white,
    fontSize: rs(16),
  },
  avatarDecoration: {
    position: 'absolute',
    bottom: -scale(4),
    right: -scale(4),
    width: scale(20),
    height: scale(20),
    borderRadius: scale(8),
    backgroundColor: 'rgba(212,176,106,0.1)',
    zIndex: 1,
  },
  cardContent: {
    flex: 1,
    justifyContent: "center",
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: vs(2),
  },
  cardName: {
    fontFamily: Fonts.Bold,
    fontSize: rs(14),
    color: "#1E293B",
    marginRight: scale(4),
  },
  cardBank: {
    fontFamily: Fonts.Medium,
    fontSize: rs(11),
    color: "#64748B",
    marginBottom: vs(8),
  },
  detailsGrid: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: scale(10),
    paddingVertical: vs(6),
    paddingHorizontal: scale(8),
    gap: scale(12),
  },
  detailItem: {
    flex: 1,
    paddingLeft: scale(4),
  },
  detailLabel: {
    fontSize: rs(7),
    fontFamily: Fonts.Bold,
    color: "#94A3B8",
    letterSpacing: 0.5,
    marginBottom: vs(1),
  },
  detailValue: {
    fontSize: rs(10),
    fontFamily: Fonts.Medium,
    color: "#334155",
  },
  actionRowInline: {
    flexDirection: "row",
    alignItems: "center",
  },

  transferBtn: {
    backgroundColor: Colors.primary,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: vs(8),
    paddingHorizontal: scale(12),
    borderRadius: scale(10),
    gap: scale(4),
    elevation: 2,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4, marginRight: scale(2),
  },
  transferBtnTxt: {
    fontFamily: Fonts.Bold,
    color: Colors.white,
    fontSize: rs(10),
  },

  verifiedBadge: {
    backgroundColor: 'rgba(212,176,106,0.1)',
    borderRadius: scale(6),
    width: scale(18),
    height: scale(18),
    alignItems: "center",
    justifyContent: "center",
  },

  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.bg },
  loadingTxt: { fontFamily: Fonts.Medium, color: Colors.gray_9E, marginTop: vs(10), fontSize: rs(13) },
  emptyWrap: { alignItems: "center", justifyContent: "center", marginTop: vs(60) },
  emptyTxt: { fontFamily: Fonts.Bold, color: Colors.primary, fontSize: rs(16) },
  emptySub: { fontFamily: Fonts.Medium, color: Colors.gray_9E, fontSize: rs(13), marginTop: vs(4) },
});