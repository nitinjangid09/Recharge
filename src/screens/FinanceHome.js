import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity,
  ScrollView, Animated, Image, Easing,
  Dimensions, ActivityIndicator, StatusBar, Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Fonts from "../constants/Fonts";
import Colors from "../constants/Colors";

const { width } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────────────────────
// QUICK ACCESS — 4 large shortcut buttons shown ABOVE the AEPS service list
// ─────────────────────────────────────────────────────────────────────────────
const QUICK_ACCESS = [
  { key: "aeps", label: "AEPS", icon: "fingerprint", color: Colors.finance_accent, screen: "CashWithdraw" },
  { key: "bbps", label: "BBPS", icon: "lightning-bolt", color: Colors.finance_accent, screen: "PaymentsScreen" },
  { key: "dmt", label: "DMT", icon: "bank-transfer", color: Colors.finance_accent, screen: "DmtLogin" },
  { key: "recharge", label: "Recharge", icon: "cellphone-wireless", color: Colors.finance_accent, screen: "TopUpScreen" },
];

const SERVICES = {
  aeps: [
    { type: "cw", name: "Cash\nWithdraw" },
    { type: "be", name: "Balance\nEnquiry" },
    { type: "ms", name: "Mini\nStatement" },
    { type: "ap", name: "Aadhaar\nPay" },
  ],
  money_transfer: [{ type: "dmt", name: "DMT" }],
  recharge_bills: [
    { type: "rech", name: "Mobile" },
    { type: "C03", name: "DTH" },
    { type: "C04", name: "Electricity" },
    { type: "C05", name: "Broadband" },
    { type: "C06", name: "Cable TV" },
    { type: "C09", name: "Education" },
    { type: "C14", name: "Gas" },
    { type: "C22", name: "Insurance" },
  ],
};

const ICON_MAP = {
  cw: "cash", be: "bank", ms: "file-document-outline", ap: "fingerprint",
  dmt: "bank-transfer", rech: "cellphone", C03: "satellite-variant",
  C04: "flash", C05: "wifi", C06: "television", C09: "school",
  C14: "gas-cylinder", C22: "account-group-outline", default: "apps",
};

const KYC_COLOR = { approved: "#22C55E", rejected: "#EF4444", pending: "#F97316" };

const SESSION_KEYS = [
  "header_token", "user_name", "user_first", "user_last",
  "user_username", "user_phone", "user_email",
  "kyc_status", "user_level", "is_kyc_online", "user_profile",
];

// ─────────────────────────────────────────────────────────────────────────────
// API HELPERS — replace BASE_URL with your actual backend
// ─────────────────────────────────────────────────────────────────────────────
const BASE_URL = "https://your-api-domain.com/api"; // ← update this

const apiGet = async (endpoint, token) => {
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const fetchAepsBalance = async (token) => { const d = await apiGet("/aeps/balance", token); return d?.balance ?? d?.aepsBalance ?? "0.00"; };
const fetchMainBalance = async (token) => { const d = await apiGet("/wallet/balance", token); return d?.balance ?? d?.mainBalance ?? "0.00"; };
const fetchBbpsCategories = async (token) => { const d = await apiGet("/bbps/categories", token); return d?.categories ?? []; };
const fetchDmtOperators = async (token) => { const d = await apiGet("/dmt/operators", token); return d?.operators ?? []; };
const fetchRechargePlans = async (token, mobile) => { const d = await apiGet(`/recharge/plans?mobile=${mobile}`, token); return d?.plans ?? []; };

// ─────────────────────────────────────────────────────────────────────────────
export default function FinanceHome({ navigation }) {

  const insets = useSafeAreaInsets();
  const HEADER_MAX = 260 + insets.top;
  const HEADER_MIN = 80 + insets.top;
  const SCROLL_D = HEADER_MAX - HEADER_MIN;

  // ── Session ───────────────────────────────────────────────────────────────
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userUsername, setUserUsername] = useState("");
  const [kycStatus, setKycStatus] = useState("pending");
  const [token, setToken] = useState("");

  // ── Wallet balances ───────────────────────────────────────────────────────
  const [aepsBalance, setAepsBalance] = useState("...");
  const [mainBalance, setMainBalance] = useState("...");
  const [balanceLoading, setBalanceLoading] = useState(false);

  // ── Quick button loading states ───────────────────────────────────────────
  const [quickLoading, setQuickLoading] = useState({
    aeps: false, bbps: false, dmt: false, recharge: false,
  });

  // ── Wallet UI ─────────────────────────────────────────────────────────────
  const [isAeps, setIsAeps] = useState(true);
  const [showBalance, setShowBalance] = useState(true);

  // ── Header collapse ────────────────────────────────────────────────────────
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = scrollY.interpolate({ inputRange: [0, SCROLL_D], outputRange: [HEADER_MAX, HEADER_MIN], extrapolate: "clamp" });
  const cardOpacity = scrollY.interpolate({ inputRange: [0, SCROLL_D / 2], outputRange: [1, 0], extrapolate: "clamp" });
  const cardTranslateY = scrollY.interpolate({ inputRange: [0, SCROLL_D], outputRange: [0, -50], extrapolate: "clamp" });
  const cardScale = scrollY.interpolate({ inputRange: [0, SCROLL_D], outputRange: [1, 0.8], extrapolate: "clamp" });

  // ── Wallet toggle ─────────────────────────────────────────────────────────
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateY = useRef(new Animated.Value(0)).current;

  const toggleWallet = () => {
    Animated.parallel([
      Animated.timing(contentOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(contentTranslateY, { toValue: -15, duration: 150, useNativeDriver: true }),
    ]).start(() => {
      setIsAeps(p => !p);
      contentTranslateY.setValue(15);
      Animated.parallel([
        Animated.timing(contentOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.timing(contentTranslateY, { toValue: 0, duration: 200, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true }),
      ]).start();
    });
  };

  useEffect(() => {
    if (!showBalance) {
      const t = setTimeout(() => setShowBalance(true), 7000);
      return () => clearTimeout(t);
    }
  }, [showBalance]);

  // ── Load balances from API ────────────────────────────────────────────────
  const loadBalances = useCallback(async (authToken) => {
    setBalanceLoading(true);
    try {
      const [aeps, main] = await Promise.allSettled([
        fetchAepsBalance(authToken),
        fetchMainBalance(authToken),
      ]);
      setAepsBalance(aeps.status === "fulfilled" ? aeps.value : "0.00");
      setMainBalance(main.status === "fulfilled" ? main.value : "0.00");
    } catch (_) {
      setAepsBalance("0.00");
      setMainBalance("0.00");
    } finally {
      setBalanceLoading(false);
    }
  }, []);

  // ── Load session ──────────────────────────────────────────────────────────
  const loadSession = useCallback(async () => {
    try {
      const pairs = await AsyncStorage.multiGet(SESSION_KEYS);
      const s = Object.fromEntries(pairs.map(([k, v]) => [k, v ?? ""]));

      if (!s.header_token || s.header_token.trim() === "") {
        navigation.replace("Login");
        return;
      }

      setToken(s.header_token);
      console.log("🔑 [DEBUG] Full Token:", s.header_token);
      setUserPhone(s.user_phone);
      setUserUsername(s.user_username);
      setKycStatus(s.kyc_status || "pending");

      if (s.user_name?.trim()) {
        setUserName(s.user_name.trim());
      } else if (s.user_profile) {
        try {
          const p = JSON.parse(s.user_profile);
          setUserName(`${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || "User");
        } catch (_) { setUserName("User"); }
      } else {
        setUserName("User");
      }

      loadBalances(s.header_token);

    } catch (err) {
      console.error("loadSession error:", err);
      setUserName("User");
    } finally {
      setReady(true);
    }
  }, [navigation, loadBalances]);

  // ── AEPS service press handler ────────────────────────────────────────────
  // Aadhaar Pay (type "ap") navigates to Offlinekyc when KYC is not approved,
  // otherwise proceeds to AadhaarPay screen.
  const handleAepsService = (item) => {
    switch (item.type) {
      case "cw":
        navigation.navigate("CashWithdraw");
        break;
      case "be":
        navigation.navigate("BalanceEnquiry");
        break;
      case "ms":
        navigation.navigate("MiniStatement");
        break;
      case "ap":
        if (kycStatus !== "approved") {
          // KYC not done — redirect user to complete KYC first
          Alert.alert(
            "KYC Required",
            "Please complete your KYC verification to use Aadhaar Pay.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Complete KYC",
                onPress: () => navigation.navigate("Offlinekyc"),
              },
            ]
          );
        } else {
          navigation.navigate("AadhaarPay");
        }
        break;
      default:
        break;
    }
  };

  // ── Quick access handler — pre-fetches data, then navigates ──────────────
  const handleQuickAccess = async (item) => {
    setQuickLoading(p => ({ ...p, [item.key]: true }));
    try {
      switch (item.key) {
        case "aeps":
          await loadBalances(token);
          navigation.navigate(item.screen);
          break;
        case "bbps":
          try {
            const categories = await fetchBbpsCategories(token);
            navigation.navigate(item.screen, { bbpsCategories: categories });
          } catch (_) {
            navigation.navigate(item.screen);
          }
          break;
        case "dmt":
          try {
            const operators = await fetchDmtOperators(token);
            navigation.navigate(item.screen, { operators });
          } catch (_) {
            navigation.navigate(item.screen);
          }
          break;
        case "recharge":
          try {
            const plans = await fetchRechargePlans(token, userPhone);
            navigation.navigate(item.screen, { plans, mobile: userPhone });
          } catch (_) {
            navigation.navigate(item.screen, { mobile: userPhone });
          }
          break;
        default:
          navigation.navigate(item.screen);
      }
    } catch (err) {
      console.error(`Quick access [${item.key}] error:`, err);
      Alert.alert("Error", "Something went wrong. Please try again.");
    } finally {
      setQuickLoading(p => ({ ...p, [item.key]: false }));
    }
  };

  // ── Entry animations ──────────────────────────────────────────────────────
  const leftAnim = useRef(new Animated.Value(-80)).current;
  const leftFade = useRef(new Animated.Value(0)).current;
  const greetingOpacity = useRef(new Animated.Value(0)).current;
  const greetingSlide = useRef(new Animated.Value(-20)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSession();
    Animated.parallel([
      Animated.timing(leftAnim, { toValue: 0, duration: 1400, easing: Easing.out(Easing.exp), useNativeDriver: false }),
      Animated.timing(leftFade, { toValue: 1, duration: 1400, useNativeDriver: false }),
    ]).start();
    Animated.stagger(250, [
      Animated.parallel([
        Animated.timing(greetingOpacity, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.spring(greetingSlide, { toValue: 0, friction: 8, useNativeDriver: false }),
      ]),
      Animated.timing(nameOpacity, { toValue: 1, duration: 700, useNativeDriver: false }),
    ]).start();
  }, []);

  // ── Banner auto-scroll ────────────────────────────────────────────────────
  const bannerScrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);
  const ITEM_W = width - 36 + 10;

  useEffect(() => {
    let idx = 0;
    const iv = setInterval(() => {
      idx = (idx + 1) % 3;
      scrollRef.current?.scrollTo({ x: idx * ITEM_W, animated: true });
    }, 3000);
    return () => clearInterval(iv);
  }, []);

  // ── Plan carousel ─────────────────────────────────────────────────────────
  const CARD_WIDTH = width * 0.8;
  const SPACING = 15;
  const SNAP_INTERVAL = CARD_WIDTH + SPACING;
  const planRef = useRef(null);

  useEffect(() => {
    let idx = 0;
    const iv = setInterval(() => {
      idx = (idx + 1) % 2;
      planRef.current?.scrollTo({ x: idx * SNAP_INTERVAL, animated: true });
    }, 4000);
    return () => clearInterval(iv);
  }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const kyc = KYC_COLOR[kycStatus] || KYC_COLOR.pending;
  const balance = isAeps ? aepsBalance : mainBalance;
  const avatar = userName ? userName.charAt(0).toUpperCase() : "U";

  if (!ready) {
    return (
      <SafeAreaView style={styles.safeArea} edges={["top", "bottom"]}>
        <StatusBar barStyle="light-content" backgroundColor="#161616" />
        <View style={styles.splash}>
          <ActivityIndicator size="large" color={Colors.finance_accent} />
          <Text style={styles.splashText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#161616" translucent />

      <View style={styles.container}>

        {/* ══ COLLAPSIBLE HEADER ══ */}
        <Animated.View style={[styles.headerContainer, { height: headerHeight }]}>
          <LinearGradient
            colors={["#161616", "#000000"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.headerGradient, { paddingTop: insets.top + 15 }]}
          >
            <View style={styles.headerTopUser}>
              <View style={styles.userSection}>
                <View style={styles.avatarContainer}>
                  <LinearGradient colors={[Colors.finance_accent, "#8B6914"]} style={styles.avatarGradient}>
                    <Text style={styles.avatarText}>{avatar}</Text>
                  </LinearGradient>
                  <View style={[styles.kycDot, { backgroundColor: kyc }]} />
                </View>
                <View style={styles.userDetails}>
                  <Animated.Text style={[styles.welcomeText, { opacity: greetingOpacity, transform: [{ translateX: greetingSlide }] }]}>
                    Good Morning,
                  </Animated.Text>
                  <Animated.Text style={[styles.userNameTitle, { opacity: nameOpacity }]}>
                    {userName}
                  </Animated.Text>
                  {!!userUsername && <Text style={styles.usernameTag}>{userUsername}</Text>}
                </View>
              </View>
              <View style={styles.headerActions}>
                <TouchableOpacity style={styles.glassBtn}>
                  <Icon name="magnify" size={20} color="#FFF" />
                </TouchableOpacity>
                <TouchableOpacity style={styles.glassBtn}>
                  <View style={styles.notificationBadge} />
                  <Icon name="bell-ring-outline" size={20} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Wallet card */}
            <Animated.View style={{ opacity: cardOpacity, transform: [{ translateY: cardTranslateY }, { scale: cardScale }] }}>
              <LinearGradient colors={["#2C2C2C", "#000000"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.walletCard}>
                <View style={styles.cardCircle1} />
                <View style={styles.cardCircle2} />
                <View style={styles.rowBetween}>
                  <View style={styles.walletTag}>
                    <Icon name="wallet-outline" size={14} color="#d4b06a" />
                    <Animated.Text style={[styles.walletTagText, { opacity: contentOpacity }]}>
                      {isAeps ? "AEPS Wallet" : "Main Wallet"}
                    </Animated.Text>
                  </View>
                  <TouchableOpacity onPress={toggleWallet} style={styles.switchBtn}>
                    <Icon name="swap-horizontal" size={20} color="#d4b06a" />
                  </TouchableOpacity>
                </View>
                <View style={{ marginTop: 10 }}>
                  <Text style={styles.cardLabel}>Total Balance</Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }}>
                      {balanceLoading
                        ? <ActivityIndicator size="small" color="#FFF" style={{ marginLeft: 4 }} />
                        : <Text style={styles.cardBalance}>{showBalance ? "••••••" : balance}</Text>
                      }
                    </Animated.View>
                    <TouchableOpacity onPress={() => setShowBalance(p => !p)} style={{ marginLeft: 10 }}>
                      <Icon name={showBalance ? "eye-off" : "eye"} size={20} color="rgba(255,255,255,0.5)" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.cardFooter}>
                  {/* ── KYC badge now navigates to Offlinekyc ── */}
                  <TouchableOpacity
                    // onPress={() => navigation.navigate("Offlinekyc")}
                    activeOpacity={0.75}
                    style={[styles.kycBadge, { borderColor: kyc }]}
                  >
                    <View style={[styles.kycDotSmall, { backgroundColor: kyc }]} />
                    <Text style={[styles.kycBadgeText, { color: kyc }]}>KYC {kycStatus.toUpperCase()}</Text>
                    <Icon name="chevron-right" size={10} color={kyc} style={{ marginLeft: 2 }} />
                  </TouchableOpacity>
                  <Text style={styles.cardFooterText}>tap switch to change wallet</Text>
                </View>
              </LinearGradient>
            </Animated.View>
          </LinearGradient>
        </Animated.View>

        {/* ══ BODY ══ */}
        <Animated.ScrollView
          contentContainerStyle={{ paddingTop: HEADER_MAX, paddingBottom: 110 }}
          onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.body}>

            {/* ══ QUICK ACCESS: AEPS · BBPS · DMT · Recharge ══ */}
            <View style={styles.quickRow}>
              {QUICK_ACCESS.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.quickBtn}
                  activeOpacity={0.8}
                  onPress={() => handleQuickAccess(item)}
                  disabled={quickLoading[item.key]}
                >
                  <View style={[styles.quickIconBg, { backgroundColor: item.color + "22" }]}>
                    {quickLoading[item.key]
                      ? <ActivityIndicator size="small" color={item.color} />
                      : <Icon name={item.icon} size={26} color={item.color} />
                    }
                  </View>
                  <Text style={styles.quickLabel}>{item.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ── AEPS Services ── */}
            <SectionHeader title="Aeps Services" />
            <Animated.View style={{ transform: [{ translateX: leftAnim }], opacity: leftFade }}>
              <View style={styles.grid}>
                {SERVICES.aeps.map((item, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[
                      styles.categoryBox,
                      // Visually hint that Aadhaar Pay needs KYC when not approved
                      item.type === "ap" && kycStatus !== "approved" && styles.categoryBoxLocked,
                    ]}
                    onPress={() => handleAepsService(item)}
                  >
                    <View style={{ position: "relative" }}>
                      <Icon name={ICON_MAP[item.type] || ICON_MAP.default} size={22} color={Colors.finance_text} />
                      {/* Lock overlay badge for Aadhaar Pay when KYC pending/rejected */}
                      {item.type === "ap" && kycStatus !== "approved" && (
                        <View style={styles.lockBadge}>
                          <Icon name="lock" size={8} color="#FFF" />
                        </View>
                      )}
                    </View>
                    <Text style={styles.categoryText}>{item.name.replace("\n", " ")}</Text>
                    {item.type === "ap" && kycStatus !== "approved" && (
                      <Text style={styles.kycRequiredText}>KYC needed</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>

            {/* ── Money Transfer ── */}
            <SectionHeader title="Money Transfer" />
            <Animated.View style={{ transform: [{ translateX: leftAnim }], opacity: leftFade }}>
              <View style={styles.grid}>
                {SERVICES.money_transfer.map((item, i) => (
                  <TouchableOpacity key={i} style={styles.categoryBox}
                    onPress={() => item.type === "dmt" && navigation.navigate("DmtLogin")}
                  >
                    <Icon name={ICON_MAP[item.type] || ICON_MAP.default} size={22} color={Colors.finance_text} />
                    <Text style={styles.categoryText}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>

            {/* ── Plan Carousel ── */}
            <View style={{ height: 80, marginTop: 8 }}>
              <ScrollView ref={planRef} horizontal snapToInterval={SNAP_INTERVAL} decelerationRate="fast" showsHorizontalScrollIndicator={false}>
                {[
                  { title: userPhone || "9876543210", sub: "Your plan expires in", highlight: "4 days", hColor: "#FF3B30", icon: "cellphone", btnText: "Recharge", btnColor: Colors.finance_accent, borderColor: "#FF3B30" },
                  { title: "JioFiber", sub: "Bill Due:", highlight: "Tomorrow", hColor: "#FF9500", icon: "router-wireless", btnText: "Pay Bill", btnColor: "#FF9500", borderColor: "#FF9500" },
                  { title: userPhone || "9876543210", sub: "Your plan expires in", highlight: "4 days", hColor: "#FF3B30", icon: "cellphone", btnText: "Recharge", btnColor: Colors.finance_accent, borderColor: "#FF3B30" },
                ].map((p, i) => (
                  <View key={i} style={[styles.planCard, { width: CARD_WIDTH, marginRight: SPACING, borderLeftColor: p.borderColor }]}>
                    <View style={styles.planRow}>
                      <View style={[styles.planIconBg, { backgroundColor: p.btnColor }]}>
                        <Icon name={p.icon} size={22} color="#FFF" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.planTitle}>{p.title}</Text>
                        <Text style={styles.planSubtitle}>{p.sub} <Text style={{ color: p.hColor, fontWeight: "bold" }}>{p.highlight}</Text></Text>
                      </View>
                      <TouchableOpacity style={[styles.rechargeBtn, { backgroundColor: p.btnColor }]}>
                        <Text style={styles.rechargeBtnText}>{p.btnText}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>

            {/* ── Recharge & Bills ── */}
            <View style={[styles.sectionHeader, { justifyContent: "space-between", marginBottom: 10 }]}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={styles.sectionIndicator} />
                <Text style={styles.sectionTitle}>Recharge & Bills</Text>
              </View>
              <TouchableOpacity style={styles.viewAllBtn} onPress={() => navigation.navigate("PaymentsScreen")}>
                <Text style={styles.viewText}>View All</Text>
                <Icon name="arrow-right" size={18} color={Colors.finance_accent} />
              </TouchableOpacity>
            </View>
            <Animated.View style={{ transform: [{ translateX: leftAnim }], opacity: leftFade }}>
              <View style={styles.grid}>
                {SERVICES.recharge_bills.map((item, i) => (
                  <TouchableOpacity key={i} style={styles.categoryBox}
                    onPress={() => {
                      if (item.type === "rech") navigation.navigate("TopUpScreen");
                      else if (item.type === "C04") navigation.navigate("Electricity");
                    }}
                  >
                    <Icon name={ICON_MAP[item.type] || ICON_MAP.default} size={22} color={Colors.finance_text} />
                    <Text style={styles.categoryText}>{item.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>

            {/* ── Banner ── */}
            <View style={styles.bannerContainer}>
              <ScrollView
                ref={scrollRef} horizontal snapToInterval={ITEM_W}
                decelerationRate="fast" showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16} contentContainerStyle={{ paddingRight: 20 }}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: bannerScrollX } } }], { useNativeDriver: false })}
              >
                {[require("../assets/banner_a.png"), require("../assets/banner_b.png"), require("../assets/banner_c.png")].map((img, i) => (
                  <Image key={i} source={img} style={styles.bannerImage} />
                ))}
              </ScrollView>
              <View style={styles.paginationContainer}>
                {[0, 1, 2].map((_, i) => {
                  const r = [(i - 1) * width, i * width, (i + 1) * width];
                  return (
                    <Animated.View key={i} style={[styles.paginationDot, {
                      width: bannerScrollX.interpolate({ inputRange: r, outputRange: [8, 20, 8], extrapolate: "clamp" }),
                      opacity: bannerScrollX.interpolate({ inputRange: r, outputRange: [0.3, 1, 0.3], extrapolate: "clamp" }),
                    }]} />
                  );
                })}
              </View>
            </View>

            {/* ── Great Deals ── */}
            <View style={styles.dealHeaderRow}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={[styles.dealIconBox, { backgroundColor: Colors.finance_chip }]}>
                  <Icon name="fire" size={18} color={Colors.finance_accent} />
                </View>
                <Text style={[styles.dealHeaderTitle, { color: Colors.finance_text }]}>Great Deals</Text>
              </View>
              <View style={[styles.hotTag, { backgroundColor: Colors.finance_accent }]}>
                <Text style={styles.hotTagText}>LIMITED</Text>
              </View>
            </View>

            {/* ── Bill Pay Card ── */}
            <LinearGradient colors={[Colors.primary, "#000000"]} style={styles.billPayCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={styles.billPayDecorCircle} />
              <View style={styles.rowBetween}>
                <View>
                  <Text style={styles.billPayTitle}>Recharge & Bills</Text>
                  <Text style={styles.billPaySubtitle}>Fast, Secure & Rewarding</Text>
                </View>
                <View style={styles.billPayIconBox}>
                  <Icon name="cellphone-nfc" size={28} color={Colors.finance_accent} />
                </View>
              </View>
              <View style={styles.billPayActions}>
                {[
                  { icon: "cellphone", label: "Mobile" },
                  { icon: "television-classic", label: "DTH" },
                  { icon: "lightbulb-on-outline", label: "Elec" },
                  { icon: "water-outline", label: "Water" },
                ].map((a, i) => (
                  <View key={i} style={styles.billPayActionItem}>
                    <Icon name={a.icon} size={20} color="#FFF" />
                    <Text style={styles.billPayActionText}>{a.label}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={styles.billPayButton}>
                <Text style={styles.billPayButtonText}>Pay Now</Text>
                <Icon name="arrow-right" size={16} color="#000" />
              </TouchableOpacity>
            </LinearGradient>

          </View>
        </Animated.ScrollView>

        {/* ══ BOTTOM NAV ══ */}
        <View style={styles.bottomNavContainer}>
          <View style={styles.bottomNav}>
            <TouchableOpacity style={styles.tabItem} activeOpacity={0.8}>
              <View style={{ alignItems: "center" }}>
                <LinearGradient colors={["#F5E7C6", "#d4b06a"]} style={styles.activeTabGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Icon name="home" size={24} color={Colors.black} />
                </LinearGradient>
                <Text style={styles.navLabelActive}>Home</Text>
              </View>
            </TouchableOpacity>
            {[
              { icon: "file-document-outline", label: "Report", screen: "WalletTransactionScreen" },
              { icon: "history", label: "History", screen: "InvoiceScreen", badge: true },
              { icon: "account-outline", label: "Profile", screen: "ProfileScreen" },
            ].map((tab, i) => (
              <TouchableOpacity key={i} style={styles.tabItem} onPress={() => navigation.navigate(tab.screen)}>
                <View style={{ alignItems: "center" }}>
                  <View>
                    <Icon name={tab.icon} size={24} color="#888" />
                    {tab.badge && <View style={styles.badgeDot} />}
                  </View>
                  <Text style={styles.navLabel}>{tab.label}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}

function SectionHeader({ title }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionIndicator} />
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: "#161616" },
  container: { flex: 1, backgroundColor: Colors.finance_bg_1 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  splash: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#161616" },
  splashText: { marginTop: 12, color: "#888", fontFamily: Fonts.Medium, fontSize: 14 },

  headerContainer: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 100, overflow: "hidden", backgroundColor: "#161616", borderBottomLeftRadius: 30, borderBottomRightRadius: 30, elevation: 10 },
  headerGradient: { flex: 1, paddingHorizontal: 20, paddingBottom: 5 },
  headerTopUser: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  userSection: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatarContainer: { position: "relative", marginRight: 12 },
  avatarGradient: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)" },
  avatarText: { color: "#000", fontSize: 18, fontFamily: Fonts.Bold },
  kycDot: { position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: "#161616" },
  userDetails: { flex: 1 },
  welcomeText: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: Fonts.Medium, marginBottom: 2 },
  userNameTitle: { color: "#FFF", fontSize: 18, fontFamily: Fonts.Bold, letterSpacing: 0.5 },
  usernameTag: { color: Colors.finance_accent, fontSize: 10, fontFamily: Fonts.Medium, marginTop: 1 },
  headerActions: { flexDirection: "row" },
  glassBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", marginLeft: 10, borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  notificationBadge: { position: "absolute", top: 10, right: 10, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF3B30", zIndex: 1, borderWidth: 1.5, borderColor: "#333" },

  walletCard: { marginTop: 12, borderRadius: 24, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  cardCircle1: { position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(212,176,106,0.1)" },
  cardCircle2: { position: "absolute", bottom: -40, left: -20, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.05)" },
  walletTag: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.3)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "rgba(212,176,106,0.3)" },
  walletTagText: { color: "#d4b06a", fontSize: 12, fontFamily: Fonts.Bold, marginLeft: 6, letterSpacing: 0.5 },
  switchBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  cardLabel: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontFamily: Fonts.Medium, letterSpacing: 1, textTransform: "uppercase" },
  currencySymbol: { color: "#d4b06a", fontSize: 24, fontFamily: Fonts.Light, marginRight: 4, marginTop: 4 },
  cardBalance: { color: "#FFFFFF", fontSize: 28, fontFamily: Fonts.Bold, letterSpacing: 1 },
  cardFooter: { marginTop: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardFooterText: { color: "rgba(255,255,255,0.3)", fontSize: 10, fontStyle: "italic" },
  kycBadge: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  kycDotSmall: { width: 6, height: 6, borderRadius: 3, marginRight: 5 },
  kycBadgeText: { fontSize: 9, fontFamily: Fonts.Bold, letterSpacing: 0.5 },

  // ── Quick Access Row ──────────────────────────────────────────────────────
  quickRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 18,
    marginTop: 4,
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  quickBtn: { flex: 1, alignItems: "center" },
  quickIconBg: { width: 52, height: 52, borderRadius: 16, justifyContent: "center", alignItems: "center", marginBottom: 6 },
  quickLabel: { fontSize: 11, fontFamily: Fonts.Bold, color: "#333", textAlign: "center" },

  body: { padding: 18 },
  sectionHeader: { flexDirection: "row", alignItems: "center", marginTop: 2, marginBottom: 4 },
  sectionIndicator: { width: 3, height: 16, backgroundColor: Colors.finance_accent, borderRadius: 4, marginRight: 8 },
  sectionTitle: { fontSize: 15, fontFamily: Fonts.Bold, color: "#333", letterSpacing: 0.5, textTransform: "capitalize" },
  viewAllBtn: { flexDirection: "row", alignItems: "center", backgroundColor: "#fffcf5", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 16, borderWidth: 1, borderColor: "rgba(212,176,106,0.4)", elevation: 1 },
  viewText: { fontSize: 12, fontFamily: Fonts.Bold, color: Colors.finance_accent, marginRight: 4 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  categoryBox: { width: "23%", backgroundColor: "#FFF", alignItems: "center", paddingVertical: 6, borderRadius: 12, paddingHorizontal: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2, marginVertical: 4, borderWidth: 0.5, borderColor: "rgba(0,0,0,0.05)" },
  // Locked state for Aadhaar Pay when KYC not approved
  categoryBoxLocked: { backgroundColor: "#FFF8F8", borderColor: "#F9736640", opacity: 0.85 },
  categoryText: { color: "#444", fontSize: 10, textAlign: "center", marginTop: 4, fontFamily: Fonts.Medium, lineHeight: 12 },
  kycRequiredText: { color: "#F97316", fontSize: 8, textAlign: "center", marginTop: 2, fontFamily: Fonts.Medium },
  lockBadge: { position: "absolute", bottom: -2, right: -6, width: 12, height: 12, borderRadius: 6, backgroundColor: "#F97316", alignItems: "center", justifyContent: "center" },

  planCard: { backgroundColor: "#fff", borderRadius: 14, padding: 12, marginVertical: 10, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3, borderLeftWidth: 3 },
  planRow: { flexDirection: "row", alignItems: "center" },
  planIconBg: { width: 34, height: 34, borderRadius: 17, justifyContent: "center", alignItems: "center" },
  planTitle: { fontSize: 14, fontFamily: Fonts.Bold, color: "#333" },
  planSubtitle: { fontSize: 10, color: "#666", marginTop: 1, fontFamily: Fonts.Medium },
  rechargeBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 16, elevation: 1 },
  rechargeBtnText: { color: "#000", fontSize: 12, fontFamily: Fonts.Bold },

  bannerContainer: { marginTop: 20, marginBottom: 4, height: 130, borderRadius: 12, overflow: "hidden", justifyContent: "center", alignItems: "center" },
  bannerImage: { width: width - 36, height: 130, resizeMode: "cover", borderRadius: 12, backgroundColor: "#fff", marginRight: 10 },
  paginationContainer: { position: "absolute", bottom: 8, flexDirection: "row", alignSelf: "center" },
  paginationDot: { height: 6, borderRadius: 3, backgroundColor: Colors.finance_accent, marginHorizontal: 3 },

  dealHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10, marginTop: 10, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: Colors.white, borderRadius: 16, elevation: 2 },
  dealIconBox: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", marginRight: 10 },
  dealHeaderTitle: { fontSize: 14, fontFamily: Fonts.Bold },
  hotTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  hotTagText: { color: Colors.white, fontSize: 10, fontFamily: Fonts.Bold },

  billPayCard: { marginHorizontal: 4, marginTop: 15, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  billPayDecorCircle: { position: "absolute", top: -30, right: -30, width: 100, height: 100, borderRadius: 50, backgroundColor: "rgba(212,176,106,0.1)" },
  billPayTitle: { color: "#FFF", fontSize: 18, fontFamily: Fonts.Bold },
  billPaySubtitle: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontFamily: Fonts.Medium, marginTop: 2 },
  billPayIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  billPayActions: { flexDirection: "row", justifyContent: "space-between", marginTop: 20, marginBottom: 20 },
  billPayActionItem: { alignItems: "center" },
  billPayActionText: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 6, fontFamily: Fonts.Medium },
  billPayButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: Colors.finance_accent, paddingVertical: 10, borderRadius: 12 },
  billPayButtonText: { color: "#000", fontWeight: "bold", marginRight: 6 },

  bottomNavContainer: { position: "absolute", bottom: 12, width: "100%", alignItems: "center" },
  bottomNav: { backgroundColor: "#1A1A1A", width: "92%", height: 64, borderRadius: 32, flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.25, shadowRadius: 15, elevation: 10, borderWidth: 1, borderColor: "#333" },
  tabItem: { flex: 1, height: "100%", justifyContent: "center", alignItems: "center" },
  activeTabGradient: { flexDirection: "row", alignItems: "center", padding: 6, borderRadius: 18, shadowColor: "#F5E7C6", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.6, shadowRadius: 8, elevation: 5 },
  navLabel: { color: "#888", fontSize: 10, fontFamily: Fonts.Medium, marginTop: 4 },
  navLabelActive: { color: Colors.finance_accent, fontSize: 10, fontFamily: Fonts.Bold, marginTop: 4 },
  badgeDot: { position: "absolute", top: -2, right: -2, width: 8, height: 8, borderRadius: 4, backgroundColor: "#FF3B30", borderWidth: 1, borderColor: "#1A1A1A" },
});