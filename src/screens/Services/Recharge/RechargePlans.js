import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ScrollView,
  ToastAndroid,
  ActivityIndicator,
  Animated,
  Dimensions,
  Platform,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../../../constants/Colors";
import Fonts from "../../../constants/Fonts";
import HeaderBar from "../../../componets/HeaderBar/HeaderBar";
import { fetchPlans } from "../../../api/AuthApi";
import FullScreenLoader from "../../../componets/Loader/FullScreenLoader";

const { width } = Dimensions.get("window");
const S = width / 375;

// ─── Accent shorthand ────────────────────────────────────────────────────
const ACCENT = Colors.finance_accent;
const ACCENT2 = Colors.hex_B8944D;
const BG = Colors.finance_bg_1;
const TEXT = Colors.finance_text;
const WHITE = Colors.white;

// ═══════════════════════════════════════════════════════════════════════════
//  TAB ITEM — fixed text clipping with explicit line-height + padding
// ═══════════════════════════════════════════════════════════════════════════
const TabItem = ({ label, isActive, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = () => Animated.spring(scale, { toValue: 0.93, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, friction: 5, useNativeDriver: true }).start();

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      onPressIn={pressIn}
      onPressOut={pressOut}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        {isActive ? (
          <LinearGradient
            colors={[ACCENT, ACCENT2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.tabActive}
          >
            <Text style={styles.tabActiveText} numberOfLines={1}>{label}</Text>
          </LinearGradient>
        ) : (
          <View style={styles.tabInactive}>
            <Text style={styles.tabInactiveText} numberOfLines={1}>{label}</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  PLAN CARD
// ═══════════════════════════════════════════════════════════════════════════
const PlanCard = ({ item, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();

  const hasData = item.description?.toLowerCase().includes("data") || item.description?.toLowerCase().includes("gb");
  const hasSms = item.description?.toLowerCase().includes("sms");
  const isPopular = Number(item.price || item.amount) >= 199;

  return (
    <TouchableOpacity activeOpacity={1} onPress={onPress} onPressIn={pressIn} onPressOut={pressOut}>
      <Animated.View style={[styles.card, { transform: [{ scale }] }]}>

        {/* Popular badge */}
        {isPopular && (
          <View style={styles.popularBadge}>
            <Icon name="star" size={10 * S} color={WHITE} />
            <Text style={styles.popularBadgeTxt}>Popular</Text>
          </View>
        )}

        {/* Header row */}
        <View style={styles.cardHeader}>
          {/* Price */}
          <View style={styles.priceWrap}>
            <Text style={styles.priceRupee}>₹</Text>
            <Text style={styles.priceValue}>{item.price || item.amount}</Text>
          </View>

          {/* Validity badge */}
          <View style={styles.validityBadge}>
            <Icon name="clock-outline" size={12 * S} color={ACCENT} />
            <Text style={styles.validityTxt} numberOfLines={1}>{item.validity}</Text>
          </View>
        </View>

        {/* Divider */}
        <View style={styles.cardDivider} />

        {/* Description */}
        <Text style={styles.descTxt} numberOfLines={3}>{item.description}</Text>

        {/* Footer */}
        <View style={styles.cardFooter}>
          {/* Feature chips */}
          <View style={styles.chipsRow}>
            {hasData && (
              <View style={styles.chip}>
                <Icon name="wifi" size={11 * S} color={ACCENT} />
                <Text style={styles.chipTxt}>Data</Text>
              </View>
            )}
            <View style={styles.chip}>
              <Icon name="phone-outline" size={11 * S} color={ACCENT} />
              <Text style={styles.chipTxt}>Voice</Text>
            </View>
            {hasSms && (
              <View style={styles.chip}>
                <Icon name="message-text-outline" size={11 * S} color={ACCENT} />
                <Text style={styles.chipTxt}>SMS</Text>
              </View>
            )}
          </View>

          {/* Select button */}
          <LinearGradient
            colors={[ACCENT, ACCENT2]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.selectBtn}
          >
            <Text style={styles.selectBtnTxt}>Select</Text>
            <Icon name="arrow-right" size={14 * S} color={WHITE} />
          </LinearGradient>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

// ═══════════════════════════════════════════════════════════════════════════
//  EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════════
const EmptyState = () => (
  <View style={styles.emptyWrap}>
    <Icon name="sim-off-outline" size={48 * S} color={ACCENT + "60"} />
    <Text style={styles.emptyTitle}>No Plans Available</Text>
    <Text style={styles.emptySubtitle}>There are no plans in this category right now.</Text>
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════
export default function StorePlans({ navigation, route }) {
  const { mobile, operator, circle, plans } = route.params || {};

  const [allPlans, setAllPlans] = useState([]);
  const [types, setTypes] = useState([]);
  const [activeType, setActiveType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // ── Bootstrap data ────────────────────────────────────────────────────
  useEffect(() => {
    if (plans?.length > 0) {
      setAllPlans(plans);
      const cats = plans.map((p) => p.categories);
      setTypes(cats);
      setActiveType(cats[0]);
    } else if (mobile && operator && circle) {
      loadPlans();
    }
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    const res = await fetchPlans(mobile, circle, operator);
    if (res?.status === "SUCCESS") {
      const fetched = res.plans || [];
      const uniqueTypes = [...new Set(fetched.map((p) => p.type || p.categories))];
      setAllPlans(fetched);
      setTypes(uniqueTypes);
      setActiveType(uniqueTypes[0] || null);
    } else {
      ToastAndroid.show(res?.message || "Failed to load plans", ToastAndroid.SHORT);
    }
    setLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPlans();
    setRefreshing(false);
  }, [mobile, circle, operator]);

  // ── Filter plans for active tab ───────────────────────────────────────
  const filteredPlans = plans?.length > 0
    ? allPlans.find((p) => p.categories === activeType)?.plan || []
    : allPlans.filter((p) => p.type === activeType);

  // ── Navigate to topup ─────────────────────────────────────────────────
  const handleSelect = useCallback((item) => {
    navigation.navigate("TopUpScreen", {
      selectedAmount: String(item.price || item.amount),
      mobile,
      operator,
      circle,
      operatorCode: route.params?.operatorCode,
    });
  }, [mobile, operator, circle]);

  // ── Render plan card ──────────────────────────────────────────────────
  const renderPlan = useCallback(({ item }) => (
    <PlanCard item={item} onPress={() => handleSelect(item)} />
  ), [handleSelect]);

  const keyExtractor = (item, index) =>
    item.productId?.toString() || item.id?.toString() || String(index);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <HeaderBar title="Recharge Plans" onBack={() => navigation.goBack()} />

      {/* ── Sticky tab bar ───────────────────────────────────────────── */}
      <View style={styles.tabBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarContent}
          bounces={false}
        >
          {types.map((type) => (
            <TabItem
              key={type}
              label={type}
              isActive={activeType === type}
              onPress={() => setActiveType(type)}
            />
          ))}
        </ScrollView>
      </View>

      {/* ── Plans list ───────────────────────────────────────────────── */}
      <FullScreenLoader visible={loading} label="Fetching plans..." />

      <FlatList
        data={filteredPlans}
        renderItem={renderPlan}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<EmptyState />}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={10}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ACCENT}
            colors={[ACCENT]}
            progressBackgroundColor="#2C2C2C"
          />
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },

  // ── Tab bar ────────────────────────────────────────────────────────────
  tabBarWrapper: {
    backgroundColor: Colors.bg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.amberOpacity_15,
    elevation: 3,
    shadowColor: ACCENT,
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  tabBarContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14 * S,
    paddingVertical: 10 * S,
    gap: 8 * S,
  },

  // Active tab
  tabActive: {
    borderRadius: 100,
    elevation: 4,
    shadowColor: ACCENT,
    shadowOpacity: 0.35,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    // ── KEY FIX: explicit height + centred content ──────────────────
    height: 38 * S,
    paddingHorizontal: 18 * S,
    justifyContent: "center",
    alignItems: "center",
  },
  tabActiveText: {
    color: WHITE,
    fontFamily: Fonts.Bold,
    fontSize: 13 * S,
    // ── KEY FIX: stop text clipping ────────────────────────────────
    lineHeight: 18 * S,
    includeFontPadding: false,
    textAlignVertical: "center",
    letterSpacing: 0.3,
  },

  // Inactive tab
  tabInactive: {
    height: 38 * S,
    paddingHorizontal: 18 * S,
    borderRadius: 100,
    backgroundColor: Colors.white,
    justifyContent: "center",
    alignItems: "center",
    elevation: 1,
    shadowColor: Colors.black,
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
  },
  tabInactiveText: {
    color: TEXT,
    fontFamily: Fonts.Medium,
    fontSize: 13 * S,
    // ── KEY FIX: stop text clipping ────────────────────────────────
    lineHeight: 18 * S,
    includeFontPadding: false,
    textAlignVertical: "center",
    opacity: 0.65,
  },

  // ── Plan list ──────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 14 * S,
    paddingTop: 14 * S,
    paddingBottom: 100,
  },

  // ── Plan card ──────────────────────────────────────────────────────────
  card: {
    backgroundColor: Colors.homebg,
    borderRadius: 18 * S,
    padding: 16 * S,
    marginBottom: 14 * S,
    elevation: 3,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: Colors.amberOpacity_18,
    overflow: "visible",
  },

  // Popular badge (top-right corner)
  popularBadge: {
    position: "absolute",
    top: -1,
    right: 14 * S,
    flexDirection: "row",
    alignItems: "center",
    gap: 3 * S,
    backgroundColor: ACCENT,
    paddingHorizontal: 8 * S,
    paddingVertical: 3 * S,
    borderBottomLeftRadius: 8 * S,
    borderBottomRightRadius: 8 * S,
    elevation: 2,
  },
  popularBadgeTxt: {
    color: WHITE,
    fontFamily: Fonts.Bold,
    fontSize: 10 * S,
    lineHeight: 14 * S,
    includeFontPadding: false,
  },

  // Card header
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10 * S,
    marginTop: 6 * S,
  },
  priceWrap: { flexDirection: "row", alignItems: "flex-start" },
  priceRupee: {
    fontSize: 18 * S,
    fontFamily: Fonts.Bold,
    color: ACCENT,
    marginTop: 5 * S,
    marginRight: 1,
    lineHeight: 22 * S,
    includeFontPadding: false,
  },
  priceValue: {
    fontSize: 36 * S,
    fontFamily: Fonts.Bold,
    color: TEXT,
    lineHeight: 42 * S,
    includeFontPadding: false,
  },

  // Validity
  validityBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5 * S,
    paddingVertical: 6 * S,
    paddingHorizontal: 12 * S,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.finance_accent + "66",
    backgroundColor: Colors.secondary,
    maxWidth: 130 * S,
  },
  validityTxt: {
    fontSize: 12 * S,
    fontFamily: Fonts.Bold,
    color: TEXT,
    lineHeight: 16 * S,
    includeFontPadding: false,
    flexShrink: 1,
  },

  // Divider
  cardDivider: {
    height: 1,
    backgroundColor: Colors.blackOpacity_05,
    marginBottom: 10 * S,
  },

  // Description
  descTxt: {
    fontSize: 12 * S,
    fontFamily: Fonts.Medium,
    color: TEXT,
    opacity: 0.75,
    lineHeight: 18 * S,
    marginBottom: 12 * S,
    includeFontPadding: false,
  },

  // Footer
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chipsRow: { flexDirection: "row", gap: 6 * S, flexWrap: "wrap", flex: 1 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3 * S,
    backgroundColor: Colors.bg,
    paddingVertical: 4 * S,
    paddingHorizontal: 8 * S,
    borderRadius: 8 * S,
  },
  chipTxt: {
    fontSize: 11 * S,
    fontFamily: Fonts.Bold,
    color: TEXT,
    lineHeight: 14 * S,
    includeFontPadding: false,
    opacity: 0.85,
  },

  // Select button
  selectBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4 * S,
    paddingVertical: 8 * S,
    paddingHorizontal: 14 * S,
    borderRadius: 20,
    elevation: 3,
    shadowColor: ACCENT,
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  selectBtnTxt: {
    color: WHITE,
    fontFamily: Fonts.Bold,
    fontSize: 13 * S,
    lineHeight: 17 * S,
    includeFontPadding: false,
  },

  // Loader
  loaderWrap: { flex: 1, justifyContent: "center", alignItems: "center", gap: 10 * S },
  loaderTxt: {
    color: TEXT,
    fontFamily: Fonts.Medium,
    fontSize: 13 * S,
    opacity: 0.65,
  },

  // Empty
  emptyWrap: { alignItems: "center", marginTop: 60 * S, paddingHorizontal: 24 * S },
  emptyTitle: {
    color: TEXT,
    fontFamily: Fonts.Bold,
    fontSize: 16 * S,
    marginTop: 14 * S,
    marginBottom: 6 * S,
  },
  emptySubtitle: {
    color: TEXT,
    fontFamily: Fonts.Medium,
    fontSize: 13 * S,
    opacity: 0.5,
    textAlign: "center",
    lineHeight: 18 * S,
  },
});