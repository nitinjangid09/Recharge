import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Image,
  ScrollView, ActivityIndicator, Dimensions, Animated,
  RefreshControl,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "../../../constants/Colors";
import Fonts from "../../../constants/Fonts";
import { fetchBbpsCategories } from "../../../api/AuthApi";
import FullScreenLoader from "../../../componets/Loader/FullScreenLoader";

// ─── SVG icon imports ─────────────────────────────────────────────────────
import BroadbandPostpaidIcon from "../../../assets/BBPSIcon/Broadband Postpaid.svg";
import CableTVIcon from "../../../assets/BBPSIcon/Cable TV.svg";
import ClubsAndAssociationsIcon from "../../../assets/BBPSIcon/Clubs and Associations.svg";
import CreditCardIcon from "../../../assets/BBPSIcon/Credit Card.svg";
import DTHIconSVG from "../../../assets/BBPSIcon/DTH.svg";
import DonationIconSVG from "../../../assets/BBPSIcon/Donation.svg";
import AgentCollectionIcon from "../../../assets/BBPSIcon/agent collection.svg";
import ChallanIcon from "../../../assets/BBPSIcon/Challan.svg";
import EducationFeesIcon from "../../../assets/BBPSIcon/Education Fees.svg";
import ElectricityIcon from "../../../assets/BBPSIcon/Electricity.svg";
import FastagIcon from "../../../assets/BBPSIcon/Fastag.svg";
import GasIcon from "../../../assets/BBPSIcon/Gas.svg";
import HospitalAndPathologyIcon from "../../../assets/BBPSIcon/Hospital and Pathology.svg";
import HospitalIcon from "../../../assets/BBPSIcon/Hospital.svg";
import HousingSocietyIcon from "../../../assets/BBPSIcon/Housing Society.svg";
import InsuranceIcon from "../../../assets/BBPSIcon/Insurance.svg";
import LPGGasIcon from "../../../assets/BBPSIcon/LPG Gas.svg";
import LandlinePostpaidIcon from "../../../assets/BBPSIcon/Landline Postpaid.svg";
import LoanRepaymentIcon from "../../../assets/BBPSIcon/Loan Repayment.svg";
import MobilePostpaidIcon from "../../../assets/BBPSIcon/Mobile Postpaid.svg";
import MobilePrepaidIcon from "../../../assets/BBPSIcon/Mobile Prepaid.svg";
import MunicipalServicesIcon from "../../../assets/BBPSIcon/Municipal Services.svg";
import MunicipalTaxesIcon from "../../../assets/BBPSIcon/Municipal Taxes.svg";
import NCMCRechargeIcon from "../../../assets/BBPSIcon/NCMC Recharge.svg";
import NationalPensionSystemIcon from "../../../assets/BBPSIcon/National Pension System.svg";
import PrepaidMeterIcon from "../../../assets/BBPSIcon/Prepaid Meter.svg";
import RecurringDepositIcon from "../../../assets/BBPSIcon/Recurring Deposit.svg";
import RentalIcon from "../../../assets/BBPSIcon/Rental.svg";
import SubscriptionIcon from "../../../assets/BBPSIcon/Subscription.svg";
import WaterIcon from "../../../assets/BBPSIcon/Water.svg";
import UpiIconSVG from "../../../assets/ServicesIcons/Upi.svg";

const SVG_MAP = {
  "Broadband Postpaid": BroadbandPostpaidIcon,
  "Cable TV": CableTVIcon,
  "Clubs and Associations": ClubsAndAssociationsIcon,
  "Credit Card": CreditCardIcon,
  "DTH": DTHIconSVG,
  "Donation": DonationIconSVG,
  "Agent Collection": AgentCollectionIcon,
  "eChallan": ChallanIcon,
  "Education Fees": EducationFeesIcon,
  " Education Fees": EducationFeesIcon,
  "Electricity": ElectricityIcon,
  "Fastag": FastagIcon,
  "Gas": GasIcon,
  "Hospital and Pathology": HospitalAndPathologyIcon,
  "Hospital": HospitalIcon,
  "Housing Society": HousingSocietyIcon,
  "Insurance": InsuranceIcon,
  "LPG Gas": LPGGasIcon,
  "Landline Postpaid": LandlinePostpaidIcon,
  "Loan Repayment": LoanRepaymentIcon,
  "Mobile Postpaid": MobilePostpaidIcon,
  "Mobile Prepaid": MobilePrepaidIcon,
  "Municipal Services": MunicipalServicesIcon,
  "Munic~ipal Services": MunicipalServicesIcon,
  "Municipal Taxes": MunicipalTaxesIcon,
  "NCMC Recharge": NCMCRechargeIcon,
  "National Pension System": NationalPensionSystemIcon,
  "Prepaid Meter": PrepaidMeterIcon,
  "Recurring Deposit": RecurringDepositIcon,
  "Rental": RentalIcon,
  "Subscription": SubscriptionIcon,
  "Water": WaterIcon,
};

// ─── Layout math ─────────────────────────────────────────────────────────
// CARD_H_PAD  = horizontal padding inside the bigCard  (left + right)
// SCREEN_PAD  = horizontal padding around the bigCard  (left + right)
// COLS        = number of columns
// ITEM_GAP    = gap between columns
//
// ITEM_W = (available card inner width) / COLS
//        = (SCREEN_W - SCREEN_PAD - CARD_H_PAD - GAP*(COLS-1)) / COLS
//
const { width: SCREEN_W } = Dimensions.get("window");
const SCREEN_PAD = 28;  // 14 left + 14 right (paddingHorizontal on outer View)
const CARD_H_PAD = 24;  // 12 left + 12 right (paddingHorizontal on bigCard)
const COLS = 4;
const ITEM_GAP = 6;
const ITEM_W = Math.floor(
  (SCREEN_W - SCREEN_PAD - CARD_H_PAD - ITEM_GAP * (COLS - 1)) / COLS
);

const ACCENT = Colors.finance_accent || "#D4A843";

// ═══════════════════════════════════════════════════════════════════════════
//  Service tile — EXACT width = ITEM_W, no extra margin
// ═══════════════════════════════════════════════════════════════════════════
const ServiceTile = ({ cat, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const SvgComponent = SVG_MAP[cat.name?.trim()];

  const pressIn = () => Animated.spring(scale, { toValue: 0.88, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={[tileStyles.wrap, { width: ITEM_W, transform: [{ scale }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={tileStyles.inner}
      >
        <View style={tileStyles.circle}>
          {SvgComponent
            ? <SvgComponent width={24} height={24} fill={ACCENT} color={ACCENT} />
            : <Icon name="apps" size={22} color={ACCENT} />
          }
        </View>
        <Text style={tileStyles.label} numberOfLines={2}>{cat.name?.trim()}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const tileStyles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginBottom: 14,
    // NO extra marginHorizontal — gap is handled by the grid's columnGap
  },
  inner: { alignItems: "center", width: "100%" },
  circle: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: Colors.bg || "#F7F4EF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212,176,106,0.22)",
  },
  label: {
    width: "100%",
    textAlign: "center",
    fontSize: 10,
    fontFamily: Fonts.Bold,
    color: Colors.slate_700,
    marginTop: 5,
    lineHeight: 13,
    includeFontPadding: false,
  },
});

// ═══════════════════════════════════════════════════════════════════════════
//  Grid — uses FlatList-style row chunking for ZERO right-side gap
//         Each row is a flex row of exactly COLS tiles.
//         Last row padded with invisible spacers → tiles stay LEFT-aligned.
// ═══════════════════════════════════════════════════════════════════════════
const ServiceGrid = ({ items, navigation }) => {
  // Split items into rows of COLS
  const rows = [];
  for (let i = 0; i < items.length; i += COLS) {
    rows.push(items.slice(i, i + COLS));
  }

  return (
    <View style={{ paddingTop: 6 }}>
      {rows.map((row, rIdx) => (
        <View key={rIdx} style={gridStyles.row}>
          {row.map((cat, cIdx) => (
            <ServiceTile
              key={cat._id || `${rIdx}-${cIdx}`}
              cat={cat}
              onPress={() => navigation.navigate("BbpsDynamicServiceScreen", { serviceType: cat.name })}
            />
          ))}
          {/* Spacer tiles for the last incomplete row */}
          {row.length < COLS &&
            Array.from({ length: COLS - row.length }).map((_, i) => (
              <View key={`sp-${i}`} style={{ width: ITEM_W }} />
            ))
          }
        </View>
      ))}
    </View>
  );
};

const gridStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    // columnGap controls the ONLY horizontal spacing between tiles.
    // Because every tile is exactly ITEM_W and we have COLS tiles + (COLS-1) gaps,
    // the row fills the card perfectly → zero right-side gap.
    columnGap: ITEM_GAP,
    // Do NOT use justifyContent:"space-between" — that would spread tiles across full width.
    justifyContent: "flex-start",
  },
});

// ═══════════════════════════════════════════════════════════════════════════
//  Tab bar — animated underline indicator
// ═══════════════════════════════════════════════════════════════════════════
const TabBar = ({ groups, activeGroup, onSelect }) => {
  const scrollRef = useRef(null);
  const tabWidths = useRef({});
  const tabOffsets = useRef({});
  const indicatorX = useRef(new Animated.Value(0)).current;
  const indicatorW = useRef(new Animated.Value(40)).current;

  const moveIndicator = useCallback((group) => {
    const x = tabOffsets.current[group] ?? 0;
    const w = tabWidths.current[group] ?? 40;
    Animated.parallel([
      Animated.spring(indicatorX, { toValue: x, useNativeDriver: false, friction: 8, tension: 60 }),
      Animated.spring(indicatorW, { toValue: w, useNativeDriver: false, friction: 8, tension: 60 }),
    ]).start();
  }, []);

  const scrollToTab = useCallback((group) => {
    const x = tabOffsets.current[group];
    if (x !== undefined) scrollRef.current?.scrollTo({ x: Math.max(0, x - 16), animated: true });
  }, []);

  useEffect(() => {
    if (activeGroup) { moveIndicator(activeGroup); scrollToTab(activeGroup); }
  }, [activeGroup]);

  return (
    <View style={tabStyles.wrap}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={tabStyles.content}
        bounces={false}
      >
        {groups.map((group) => (
          <TouchableOpacity
            key={group}
            style={tabStyles.item}
            activeOpacity={0.7}
            onPress={() => onSelect(group)}
            onLayout={(e) => {
              const { x, width } = e.nativeEvent.layout;
              tabOffsets.current[group] = x;
              tabWidths.current[group] = width;
              if (group === activeGroup) moveIndicator(group);
            }}
          >
            <Text style={[tabStyles.text, activeGroup === group && tabStyles.textActive]}>
              {(group || "ALL").toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
        <Animated.View style={[tabStyles.indicator, { left: indicatorX, width: indicatorW }]} />
      </ScrollView>
    </View>
  );
};

const tabStyles = StyleSheet.create({
  wrap: {
    marginTop: 10,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  content: { flexDirection: "row" },
  item: {
    paddingHorizontal: 14,
    paddingBottom: 10,
    paddingTop: 4,
  },
  text: {
    fontSize: 12,
    fontFamily: Fonts.Medium,
    color: Colors.gray,
    letterSpacing: 0.4,
    includeFontPadding: false,
    lineHeight: 16,
  },
  textActive: { color: ACCENT, fontFamily: Fonts.Bold },
  indicator: {
    position: "absolute",
    bottom: 0,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: ACCENT,
  },
});

// ═══════════════════════════════════════════════════════════════════════════
//  Big services card
// ═══════════════════════════════════════════════════════════════════════════
const BillServicesCard = ({ navigation, categories, groups, activeGroup, setActiveGroup, loading }) => {
  const filtered = categories.filter(c => activeGroup === "ALL" || c.group === activeGroup);

  return (
    <View style={styles.bigCard}>
      {/* Header */}
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardHeaderLeft}>
          <View style={styles.cardHeaderDot} />
          <Text style={styles.sectionTitle}>RECHARGE & BILL SERVICES</Text>
        </View>
      </View>

      {/* Tabs */}
      <TabBar groups={groups} activeGroup={activeGroup} onSelect={setActiveGroup} />

      {/* Content */}
      {filtered.length === 0 && !loading ? (
        <View style={styles.emptyBox}>
          <Icon name="apps-box" size={36} color={ACCENT + "50"} />
          <Text style={styles.emptyTxt}>No services in this category</Text>
        </View>
      ) : (
        <ServiceGrid items={filtered} navigation={navigation} />
      )}
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════
export default function PaymentsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(50)).current;

  const [categories, setCategories] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }).start();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      const res = await fetchBbpsCategories({ headerToken });
      if (res?.success && res.data) {
        setCategories(res.data);
        const uniqueGroups = ["ALL", ...new Set(res.data.map(c => c.group))];
        setGroups(uniqueGroups);
        setActiveGroup("ALL");
      }
    } catch (err) {
      console.log("Load categories error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadCategories();
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <FullScreenLoader visible={loading} label="Fetching bill services..." />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ACCENT}
            colors={[ACCENT]}
            progressBackgroundColor={Colors.white}
          />
        }
      >

        {/* Header */}
        <LinearGradient
          colors={[Colors.primary, Colors.black]}
          style={[styles.headerGradient, { paddingTop: insets.top + 10 }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Icon name="arrow-left" size={24} color={Colors.white} />
            </TouchableOpacity>
            <View style={{ alignItems: "center" }}>
              <Text style={styles.headerTitle}>PAY WITH THANKS</Text>
              <Text style={styles.subTitle}>UPI, bills, recharges & utilities</Text>
            </View>
            <View style={styles.qrCircle}>
              <UpiIconSVG width={22} height={22} />
            </View>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 14 }}>

          {/* Quick-pay reminder */}
          <View style={styles.reminderCard}>
            <View>
              <Text style={styles.smallText}>ELECTRICITY • 510984752</Text>
              <Text style={styles.mainText}>₹1,245 due on 25 March</Text>
            </View>
            <TouchableOpacity style={styles.payNowBtn}>
              <Text style={styles.payNowTxt}>Pay Now</Text>
            </TouchableOpacity>
          </View>

          <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>

            {/* BBPS banner */}
            <LinearGradient
              colors={[Colors.gold, Colors.white]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.banner}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.bannerText}>
                  Pay your recharge,{"\n"}electricity, credit card &{"\n"}other bills using
                </Text>
                <Text style={styles.postpe}>Pay bill...</Text>
              </View>
              <Image source={require("../../../assets/bbps.png")} style={styles.bannerImage} />
            </LinearGradient>

            {/* Services card */}
            <BillServicesCard
              navigation={navigation}
              categories={categories}
              groups={groups}
              activeGroup={activeGroup}
              setActiveGroup={setActiveGroup}
              loading={loading}
            />

          </Animated.View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg || "#F7F4EF" },

  headerGradient: {
    paddingBottom: 35,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,  },
  header: {
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: { fontSize: 16, fontFamily: Fonts.Bold, color: Colors.white, letterSpacing: 0.5 },
  subTitle: { fontSize: 11, fontFamily: Fonts.Medium, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  qrCircle: { width: 36, height: 36, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 18, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },

  reminderCard: {
    marginTop: -20,
    backgroundColor: Colors.homebg || "#fff",
    borderRadius: 16,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.02)",
  },
  smallText: { color: Colors.gray_66, fontSize: 11, fontFamily: Fonts.Medium },
  mainText: { color: Colors.slate_900, fontSize: 14, fontFamily: Fonts.Bold, marginTop: 4 },
  payNowBtn: { backgroundColor: Colors.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: ACCENT + "40" },
  payNowTxt: { color: ACCENT, fontFamily: Fonts.Bold, fontSize: 13 },

  banner: {
    borderRadius: 16,
    padding: 14,
    marginTop: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212,176,106,0.12)",  },
  bannerText: { fontSize: 12, color: Colors.slate_700, fontFamily: Fonts.Medium, lineHeight: 18 },
  postpe: { fontSize: 18, fontFamily: Fonts.Bold, color: ACCENT, marginTop: 4 },
  bannerImage: { width: 70, height: 70, resizeMode: "contain" },

  bigCard: {
    marginTop: 15,
    marginBottom: 40,
    backgroundColor: Colors.homebg || "#fff",
    borderRadius: 20,
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 12,   // = CARD_H_PAD / 2 each side    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.03)",
  },

  cardHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
  cardHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
  cardHeaderDot: { width: 4, height: 16, borderRadius: 2, backgroundColor: ACCENT },
  sectionTitle: { fontSize: 13, fontFamily: Fonts.Bold, color: Colors.slate_900, letterSpacing: 0.6 },


  loaderBox: { paddingVertical: 40, alignItems: "center", justifyContent: "center", gap: 10 },
  loaderTxt: { color: Colors.gray_66, fontSize: 13, fontFamily: Fonts.Medium },
  emptyBox: { paddingVertical: 40, alignItems: "center", gap: 10 },
  emptyTxt: { color: Colors.gray_BD, fontSize: 13, fontFamily: Fonts.Medium },
});