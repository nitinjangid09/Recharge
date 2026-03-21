import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  Image,
  Easing,
  Dimensions,
  ActivityIndicator,
  StatusBar,
  Alert,
  TextInput,
  FlatList,
  Keyboard,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Fonts from "../constants/Fonts";
import Colors from "../constants/Colors";
import { getWalletBalance, fetchUserProfile } from "../api/AuthApi";

import BBPSIconSVG from "../assets/Icons/BBPS.svg";
import RechargeIconSVG from "../assets/Icons/Recharge.svg";

// ─────────────────────────────────────────────────────────────────────────────
// WHY Colors.bg IS APPLIED INLINE (not in StyleSheet.create)
// ─────────────────────────────────────────────────────────────────────────────
// StyleSheet.create() is evaluated once at module load time — before the
// Colors object is imported and resolved. If you write:
//   body: { backgroundColor: Colors.bg }  ← inside StyleSheet.create()
// it will be undefined because the import hasn't settled yet.
//
// The fix: pass { backgroundColor: Colors.bg } as an inline style prop
// in JSX, where it is evaluated at render time when Colors is already loaded.
// This is why you'll see it in the JSX as style={[S.xxx, BG]} or inline.
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSIVE
// ─────────────────────────────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get("window");
const scale = (n) => Math.round((SW / 375) * n);
const vscale = (n) => Math.round((SH / 812) * n);
const rs = (n, lo = n * 0.82, hi = n * 1.28) =>
  Math.min(Math.max(scale(n), lo), hi);

// ─────────────────────────────────────────────────────────────────────────────
// GREETING
// ─────────────────────────────────────────────────────────────────────────────
const getGreeting = () => {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return { text: "Good Morning,", icon: "weather-sunny", color: "#FFC107" };
  if (h >= 12 && h < 17) return { text: "Good Afternoon,", icon: "weather-partly-cloudy", color: "#FF9800" };
  if (h >= 17 && h < 21) return { text: "Good Evening,", icon: "weather-sunset", color: "#FF5722" };
  return { text: "Good Night,", icon: "weather-night", color: "#7C4DFF" };
};

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH ITEMS
// ─────────────────────────────────────────────────────────────────────────────
const ALL_ITEMS = [
  { id: "1", label: "Cash Withdraw", icon: "cash", screen: "CashWithdraw" },
  { id: "2", label: "Balance Enquiry", icon: "bank", screen: "BalanceEnquiry" },
  { id: "3", label: "Mini Statement", icon: "file-document-outline", screen: "MiniStatement" },
  { id: "4", label: "Aadhaar Pay", icon: "fingerprint", screen: "AadhaarPay" },
  { id: "5", label: "DMT Transfer", icon: "bank-transfer", screen: "DmtLogin" },
  { id: "6", label: "Mobile Recharge", icon: "cellphone", screen: "TopUpScreen" },
  { id: "7", label: "DTH Recharge", icon: "satellite-variant", screen: "TopUpScreen" },
  { id: "8", label: "Electricity", icon: "flash", screen: "Electricity" },
  { id: "9", label: "Broadband", icon: "wifi", screen: "TopUpScreen" },
  { id: "10", label: "Cable TV", icon: "television", screen: "PaymentsScreen" },
  { id: "11", label: "Gas", icon: "gas-cylinder", screen: "PaymentsScreen" },
  { id: "12", label: "Insurance", icon: "account-group-outline", screen: "PaymentsScreen" },
  { id: "13", label: "Add Balance", icon: "plus-circle", screen: "OfflineTopup" },
  { id: "14", label: "BBPS Payments", icon: "lightning-bolt", screen: "PaymentsScreen" },
  { id: "15", label: "Profile", icon: "account-circle", screen: "ProfileScreen" },
  { id: "16", label: "Transaction History", icon: "history", screen: "InvoiceScreen" },
  { id: "17", label: "Wallet Report", icon: "file-document-outline", screen: "WalletTransactionScreen" },
  { id: "18", label: "KYC Verification", icon: "shield-check", screen: "Offlinekyc" },
];

// ─────────────────────────────────────────────────────────────────────────────
// SERVICES  — Recharge & Bills removed
// ─────────────────────────────────────────────────────────────────────────────
const SERVICES = {
  aeps: [
    { type: "cw", name: "Cash\nWithdraw" },
    { type: "be", name: "Balance\nEnquiry" },
    { type: "ms", name: "Mini\nStatement" },
    { type: "ap", name: "Aadhaar\nPay" },
  ],
  money_transfer: [{ type: "dmt", name: "DMT" }],
};

const ICON_MAP = {
  cw: "cash", be: "bank", ms: "file-document-outline", ap: "fingerprint",
  dmt: "bank-transfer", default: "apps",
};

const KYC_COLOR = { approved: "#22C55E", rejected: "#EF4444", pending: "#F97316" };

const SESSION_KEYS = [
  "header_token", "user_name", "user_first", "user_last",
  "user_username", "user_phone", "user_email",
  "kyc_status", "user_level", "is_kyc_online", "user_profile",
];

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────
const BASE_URL = "https://your-api-domain.com/api";
const apiGet = async (ep, tok) => {
  const r = await fetch(`${BASE_URL}${ep}`, {
    method: "GET",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tok}` },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function FinanceHome({ navigation }) {
  const insets = useSafeAreaInsets();

  const TOP_ROW_H = rs(56);
  const WALLET_H = vscale(175);
  const GAP = rs(10);
  const HEADER_MAX = insets.top + TOP_ROW_H + GAP + WALLET_H + rs(14);
  const HEADER_MIN = insets.top + TOP_ROW_H + rs(14);
  const SCROLL_D = HEADER_MAX - HEADER_MIN;

  // ── Greeting ───────────────────────────────────────────────────────────────
  const [greeting, setGreeting] = useState(getGreeting());
  useEffect(() => {
    const iv = setInterval(() => setGreeting(getGreeting()), 60_000);
    return () => clearInterval(iv);
  }, []);

  // ── Search — all useNativeDriver:false ─────────────────────────────────────
  const layerAOpacity = useRef(new Animated.Value(1)).current;
  const layerBOpacity = useRef(new Animated.Value(0)).current;
  const resultsFade = useRef(new Animated.Value(0)).current;

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const inputRef = useRef(null);
  const closingRef = useRef(false);

  const openSearch = useCallback(() => {
    if (searchOpen || closingRef.current) return;
    setSearchOpen(true);
    setSearchQuery("");
    setSearchResults([]);
    Animated.parallel([
      Animated.timing(layerAOpacity, { toValue: 0, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: false }),
      Animated.timing(layerBOpacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: false }),
    ]).start(() => { if (!closingRef.current) inputRef.current?.focus(); });
  }, [searchOpen]);

  const closeSearch = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    Keyboard.dismiss();
    Animated.timing(resultsFade, { toValue: 0, duration: 150, useNativeDriver: false }).start();
    Animated.parallel([
      Animated.timing(layerAOpacity, { toValue: 1, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: false }),
      Animated.timing(layerBOpacity, { toValue: 0, duration: 200, easing: Easing.out(Easing.ease), useNativeDriver: false }),
    ]).start(() => {
      setSearchOpen(false);
      setSearchQuery("");
      setSearchResults([]);
      closingRef.current = false;
    });
  }, []);

  const onSearchChange = (text) => {
    setSearchQuery(text);
    const q = text.trim().toLowerCase();
    if (!q) {
      setSearchResults([]);
      Animated.timing(resultsFade, { toValue: 0, duration: 120, useNativeDriver: false }).start();
      return;
    }
    const list = ALL_ITEMS.filter((i) => i.label.toLowerCase().includes(q));
    setSearchResults(list);
    Animated.timing(resultsFade, { toValue: 1, duration: 160, useNativeDriver: false }).start();
  };

  const onSelectResult = (item) => {
    closeSearch();
    setTimeout(() => navigation.navigate(item.screen), 300);
  };

  // ── State ──────────────────────────────────────────────────────────────────
  const [ready, setReady] = useState(false);
  const [userName, setUserName] = useState("");
  const [userPhone, setUserPhone] = useState("");
  const [userUsername, setUserUsername] = useState("");
  const [kycStatus, setKycStatus] = useState("pending");
  const [token, setToken] = useState("");

  const [aepsBalance, setAepsBalance] = useState("...");
  const [mainBalance, setMainBalance] = useState("...");
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [assignedServices, setAssignedServices] = useState([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [isAeps, setIsAeps] = useState(true);
  const [showBalance, setShowBalance] = useState(true);

  const hasService = (n) =>
    assignedServices.some((s) => s.name?.toLowerCase() === n.toLowerCase());

  // ── Header collapse ────────────────────────────────────────────────────────
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = scrollY.interpolate({ inputRange: [0, SCROLL_D], outputRange: [HEADER_MAX, HEADER_MIN], extrapolate: "clamp" });
  const cardOpacity = scrollY.interpolate({ inputRange: [0, SCROLL_D * 0.6], outputRange: [1, 0], extrapolate: "clamp" });
  const cardTranslateY = scrollY.interpolate({ inputRange: [0, SCROLL_D], outputRange: [0, -40], extrapolate: "clamp" });
  const cardScale = scrollY.interpolate({ inputRange: [0, SCROLL_D], outputRange: [1, 0.9], extrapolate: "clamp" });

  // ── Wallet toggle — native driver, isolated leaf node ─────────────────────
  const wAlpha = useRef(new Animated.Value(1)).current;
  const wSlide = useRef(new Animated.Value(0)).current;

  const toggleWallet = () => {
    Animated.parallel([
      Animated.timing(wAlpha, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(wSlide, { toValue: -10, duration: 140, useNativeDriver: true }),
    ]).start(() => {
      setIsAeps((p) => !p);
      wSlide.setValue(10);
      Animated.parallel([
        Animated.timing(wAlpha, { toValue: 1, duration: 180, useNativeDriver: true }),
        Animated.timing(wSlide, { toValue: 0, duration: 180, easing: Easing.out(Easing.back(1.4)), useNativeDriver: true }),
      ]).start();
    });
  };

  useEffect(() => {
    if (!showBalance) {
      const t = setTimeout(() => setShowBalance(true), 7000);
      return () => clearTimeout(t);
    }
  }, [showBalance]);

  // ── Load balances ──────────────────────────────────────────────────────────
  const loadBalances = useCallback(async (tok) => {
    setBalanceLoading(true);
    try {
      const r = await getWalletBalance({ headerToken: tok });
      if (r?.success && r?.data) {
        setAepsBalance(String(r.data.aepsWallet ?? "0"));
        setMainBalance(String(r.data.mainWallet ?? "0"));
      } else { setAepsBalance("0"); setMainBalance("0"); }
    } catch { setAepsBalance("0"); setMainBalance("0"); }
    finally { setBalanceLoading(false); }
  }, []);

  // ── Load session ───────────────────────────────────────────────────────────
  const loadSession = useCallback(async () => {
    try {
      const pairs = await AsyncStorage.multiGet(SESSION_KEYS);
      const s = Object.fromEntries(pairs.map(([k, v]) => [k, v ?? ""]));
      if (!s.header_token?.trim()) { navigation.replace("Login"); return; }

      setToken(s.header_token);
      setUserPhone(s.user_phone);
      setUserUsername(s.user_username);
      setKycStatus(s.kyc_status || "pending");
      setServicesLoading(true);

      (async () => {
        try {
          const res = await fetchUserProfile({ headerToken: s.header_token });
          if (res?.success && res?.data) {
            const p = res.data;
            setUserName(`${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() || s.user_name?.trim() || "User");
            setAssignedServices(Array.isArray(p.assignedServices) ? p.assignedServices : []);
          } else {
            setUserName(s.user_name?.trim() || "User");
            setAssignedServices([]);
          }
        } catch {
          setUserName(s.user_name?.trim() || "User");
          setAssignedServices([]);
        } finally { setServicesLoading(false); }
      })();

      loadBalances(s.header_token);
    } catch (e) {
      console.error("loadSession:", e);
      setUserName("User");
    } finally { setReady(true); }
  }, [navigation, loadBalances]);

  // ── AEPS press ─────────────────────────────────────────────────────────────
  const handleAepsService = (item) => {
    switch (item.type) {
      case "cw": navigation.navigate("CashWithdraw"); break;
      case "be": navigation.navigate("BalanceEnquiry"); break;
      case "ms": navigation.navigate("MiniStatement"); break;
      case "ap":
        kycStatus !== "approved"
          ? Alert.alert("KYC Required", "Complete your KYC to use Aadhaar Pay.", [
            { text: "Cancel", style: "cancel" },
            { text: "Complete KYC", onPress: () => navigation.navigate("Offlinekyc") },
          ])
          : navigation.navigate("AadhaarPay");
        break;
      default: break;
    }
  };

  // ── Entry animations ───────────────────────────────────────────────────────
  const leftAnim = useRef(new Animated.Value(-80)).current;
  const leftFade = useRef(new Animated.Value(0)).current;
  const greetAlpha = useRef(new Animated.Value(0)).current;
  const greetSlide = useRef(new Animated.Value(-20)).current;
  const nameAlpha = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSession();
    Animated.parallel([
      Animated.timing(leftAnim, { toValue: 0, duration: 1400, easing: Easing.out(Easing.exp), useNativeDriver: false }),
      Animated.timing(leftFade, { toValue: 1, duration: 1400, useNativeDriver: false }),
    ]).start();
    Animated.stagger(250, [
      Animated.parallel([
        Animated.timing(greetAlpha, { toValue: 1, duration: 700, useNativeDriver: false }),
        Animated.spring(greetSlide, { toValue: 0, friction: 8, useNativeDriver: false }),
      ]),
      Animated.timing(nameAlpha, { toValue: 1, duration: 700, useNativeDriver: false }),
    ]).start();
  }, []);

  // ── Banner ─────────────────────────────────────────────────────────────────
  const bannerX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);
  const ITEM_W = SW - rs(36) + rs(10);
  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => { i = (i + 1) % 3; scrollRef.current?.scrollTo({ x: i * ITEM_W, animated: true }); }, 3000);
    return () => clearInterval(iv);
  }, []);

  const CARD_W = SW * 0.8;
  const SPACING = rs(15);
  const SNAP_INT = CARD_W + SPACING;
  const planRef = useRef(null);
  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => { i = (i + 1) % 2; planRef.current?.scrollTo({ x: i * SNAP_INT, animated: true }); }, 4000);
    return () => clearInterval(iv);
  }, []);

  // ── Derived ────────────────────────────────────────────────────────────────
  const kyc = KYC_COLOR[kycStatus] || KYC_COLOR.pending;
  const formatBalance = (val) => {
    if (val === "...") return val;
    const num = parseFloat(val);
    if (isNaN(num) || num === 0) return "0.00";
    return num.toFixed(2);
  };
  const balance = formatBalance(isAeps ? aepsBalance : mainBalance);
  const avatar = userName ? userName.charAt(0).toUpperCase() : "U";
  const RESULTS_TOP = insets.top + rs(10) + TOP_ROW_H + rs(6);

  // ─────────────────────────────────────────────────────────────────────────
  // SPLASH
  // ─────────────────────────────────────────────────────────────────────────
  if (!ready) {
    return (
      // Colors.bg inline — safe at render time
      <SafeAreaView style={[S.safe, { backgroundColor: Colors.bg }]} edges={["top", "bottom"]}>
        <StatusBar barStyle="light-content" backgroundColor={Colors.bg} />
        <View style={[S.splash, { backgroundColor: Colors.bg }]}>
          <ActivityIndicator size="large" color={Colors.finance_accent} />
          <Text style={S.splashTxt}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    // ─── Colors.bg applied inline on every background surface ───────────
    // 1. SafeAreaView  — outermost shell, fills status-bar area
    // 2. Root View     — fills the remaining screen
    // 3. Animated.ScrollView — covers the area behind the scroll content
    // 4. Body View     — the actual scrollable content area
    // All four must match so no flash of another color appears during
    // over-scroll bounce or between the header curve and scroll content.
    // ─────────────────────────────────────────────────────────────────────────
    <SafeAreaView style={[S.safe, { backgroundColor: Colors.bg }]} edges={["bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#161616" translucent />

      <View style={[S.root, { backgroundColor: Colors.bg }]}>

        {/* ══ HEADER — bottom border radius rs(32) ══ */}
        <Animated.View style={[S.headerWrap, { height: headerHeight }]}>
          <LinearGradient
            colors={["#161616", "#000000"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[S.headerGrad, { paddingTop: insets.top + rs(10) }]}
          >
            <View style={{ height: TOP_ROW_H, marginBottom: GAP }}>

              {/* Layer A — avatar / greeting / buttons */}
              <Animated.View
                style={[S.layerA, { opacity: layerAOpacity }]}
                pointerEvents={searchOpen ? "none" : "auto"}
              >
                <TouchableOpacity
                  onPress={() => navigation.navigate("ProfileScreen")}
                  activeOpacity={0.8}
                  style={S.avatarWrap}
                >
                  <LinearGradient colors={[Colors.finance_accent, "#8B6914"]} style={S.avatarGrad}>
                    <Text style={S.avatarTxt}>{avatar}</Text>
                  </LinearGradient>
                  <View style={[S.kycDot, { backgroundColor: kyc }]} />
                </TouchableOpacity>

                <View style={S.userInfo}>
                  <Animated.View style={[S.greetRow, { opacity: greetAlpha, transform: [{ translateX: greetSlide }] }]}>
                    <Icon name={greeting.icon} size={rs(12)} color={greeting.color} style={{ marginRight: 4 }} />
                    <Text style={[S.greetTxt, { color: greeting.color }]}>{greeting.text}</Text>
                  </Animated.View>
                  <Animated.Text style={[S.nameTxt, { opacity: nameAlpha }]} numberOfLines={1} ellipsizeMode="tail">
                    {userName}
                  </Animated.Text>
                  {!!userUsername && <Text style={S.usernameTxt} numberOfLines={1}>{userUsername}</Text>}
                </View>

                <View style={S.actions}>
                  <TouchableOpacity
                    style={S.glassBtn}
                    onPress={openSearch}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Icon name="magnify" size={rs(20)} color="#FFF" />
                  </TouchableOpacity>
                  <TouchableOpacity style={S.glassBtn}>
                    <View style={S.notifDot} />
                    <Icon name="bell-ring-outline" size={rs(20)} color="#FFF" />
                  </TouchableOpacity>
                </View>
              </Animated.View>

              {/* Layer B — search bar */}
              <Animated.View
                style={[S.layerB, { opacity: layerBOpacity }]}
                pointerEvents={searchOpen ? "auto" : "none"}
              >
                <TouchableOpacity
                  onPress={closeSearch}
                  style={S.searchBack}
                  hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                  activeOpacity={0.5}
                >
                  <Icon name="arrow-left" size={rs(22)} color={Colors.finance_accent} />
                </TouchableOpacity>
                <View style={S.searchInputWrap}>
                  <Icon name="magnify" size={rs(15)} color="rgba(255,255,255,0.35)" style={{ marginRight: rs(6) }} />
                  <TextInput
                    ref={inputRef}
                    style={S.searchInput}
                    placeholder="Type to search…"
                    placeholderTextColor="rgba(255,255,255,0.3)"
                    value={searchQuery}
                    onChangeText={onSearchChange}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => onSearchChange("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Icon name="close-circle" size={rs(17)} color="rgba(255,255,255,0.4)" />
                    </TouchableOpacity>
                  )}
                </View>
              </Animated.View>
            </View>

            {/* Wallet Card */}
            <Animated.View
              pointerEvents={searchOpen ? "none" : "auto"}
              style={{ opacity: cardOpacity, transform: [{ translateY: cardTranslateY }, { scale: cardScale }] }}
            >
              <LinearGradient
                colors={["#2C2C2C", "#111111"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={S.walletCard}
              >
                <View style={S.circ1} /><View style={S.circ2} />

                <View style={S.rowBetween}>
                  <View style={S.walletTag}>
                    <Icon name="wallet-outline" size={rs(13)} color="#d4b06a" />
                    <Animated.Text style={[S.walletTagTxt, { opacity: wAlpha }]}>
                      {isAeps ? "AEPS Wallet" : "Main Wallet"}
                    </Animated.Text>
                  </View>
                  <TouchableOpacity onPress={toggleWallet} style={S.swapBtn}>
                    <Icon name="swap-horizontal" size={rs(18)} color="#d4b06a" />
                  </TouchableOpacity>
                </View>

                <View style={{ marginTop: rs(8) }}>
                  <Text style={S.balLabel}>Total Balance</Text>
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    {!balanceLoading && <Text style={S.rupee}>₹</Text>}
                    <Animated.View style={{ opacity: wAlpha, transform: [{ translateY: wSlide }] }}>
                      {balanceLoading
                        ? <ActivityIndicator size="small" color="#FFF" style={{ marginLeft: 4 }} />
                        : <Text style={S.balAmt}>{showBalance ? "••••••" : balance}</Text>
                      }
                    </Animated.View>
                    {!balanceLoading && (
                      <TouchableOpacity
                        onPress={() => setShowBalance((p) => !p)}
                        style={{ marginLeft: rs(8) }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Icon name={showBalance ? "eye-off" : "eye"} size={rs(18)} color="rgba(255,255,255,0.45)" />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                <TouchableOpacity style={S.addBtn} onPress={() => navigation.navigate("OfflineTopup")}>
                  <Icon name="plus" size={rs(12)} color="#000" />
                  <Text style={S.addBtnTxt}>Add Balance</Text>
                </TouchableOpacity>

                <View style={S.cardFooter}>
                  <TouchableOpacity
                    style={[S.kycBadge, { borderColor: kyc }]}
                    activeOpacity={0.75}
                    onPress={() => navigation.navigate("Offlinekyc")}
                  >
                    <View style={[S.kycDotSm, { backgroundColor: kyc }]} />
                    <Text style={[S.kycBadgeTxt, { color: kyc }]}>KYC {kycStatus.toUpperCase()}</Text>
                    <Icon name="chevron-right" size={rs(10)} color={kyc} style={{ marginLeft: 2 }} />
                  </TouchableOpacity>
                  <Text style={S.footerHint}>tap swap to change wallet</Text>
                </View>
              </LinearGradient>
            </Animated.View>

          </LinearGradient>
        </Animated.View>

        {/* Search results overlay */}
        {searchOpen && searchQuery.length > 0 && (
          <Animated.View
            style={[S.resultsOverlay, { top: RESULTS_TOP, opacity: resultsFade }]}
            pointerEvents="box-none"
          >
            {searchResults.length === 0 ? (
              <View style={S.emptyRow}>
                <Icon name="magnify-close" size={rs(16)} color="#666" />
                <Text style={S.emptyTxt}>No results for "{searchQuery}"</Text>
              </View>
            ) : (
              <>
                <FlatList
                  data={searchResults.slice(0, 6)}
                  keyExtractor={(item) => item.id}
                  keyboardShouldPersistTaps="handled"
                  scrollEnabled={false}
                  renderItem={({ item, index }) => (
                    <TouchableOpacity
                      style={[S.resultRow, index === Math.min(searchResults.length, 6) - 1 && { borderBottomWidth: 0 }]}
                      onPress={() => onSelectResult(item)}
                      activeOpacity={0.72}
                    >
                      <View style={S.resultIconBox}>
                        <Icon name={item.icon} size={rs(15)} color={Colors.finance_accent} />
                      </View>
                      <Text style={S.resultLabel}>{item.label}</Text>
                      <Icon name="arrow-top-left" size={rs(12)} color="#555" />
                    </TouchableOpacity>
                  )}
                />
                {searchResults.length > 6 && (
                  <Text style={S.moreHint}>+{searchResults.length - 6} more · keep typing</Text>
                )}
              </>
            )}
          </Animated.View>
        )}

        {searchOpen && (
          <TouchableOpacity style={S.searchOverlay} activeOpacity={1} onPress={closeSearch} />
        )}

        {/* ══ SCROLLABLE BODY ══
            style={{ backgroundColor: Colors.bg }} on the ScrollView
            covers the overscroll bounce area at top and bottom.
            The inner body View also gets the same color so the content
            area never shows a different background behind list items.    */}
        <Animated.ScrollView
          style={{ backgroundColor: Colors.bg }}
          contentContainerStyle={{ paddingTop: HEADER_MAX + rs(8), paddingBottom: rs(110) }}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: false }
          )}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* body View — inline backgroundColor so Colors.bg is applied
              at render time, not at StyleSheet.create() time              */}
          <View style={[S.body, { backgroundColor: Colors.bg }]}>

            {servicesLoading ? (
              <ActivityIndicator size="small" color={Colors.finance_accent} style={{ marginTop: rs(20) }} />
            ) : assignedServices.length === 0 ? (
              <View style={{ alignItems: "center", marginTop: rs(40), padding: rs(20) }}>
                <Icon name="alert-circle-outline" size={rs(40)} color="#999" />
                <Text style={S.emptyServiceTxt}>No service allowed at this moment.</Text>
              </View>
            ) : (
              <>
                {/* User Services — transparent grid, no white card */}
                <SecHeader title="Services" />
                <View style={S.svcGrid}>
                  {assignedServices.map((item) => (
                    <TouchableOpacity
                      key={item._id}
                      style={S.svcGridItem}
                      activeOpacity={0.75}
                      onPress={() => {
                        const n = item.name?.toLowerCase();
                        if (n === "recharge") navigation.navigate("TopUpScreen");
                        else if (n === "bbps") navigation.navigate("PaymentsScreen");
                        else if (n === "aeps") navigation.navigate("CashWithdraw");
                      }}
                    >
                      <View style={S.svcIconCircle}>
                        {(() => {
                          const n = item.name?.toLowerCase();
                          if (n === "bbps") return <BBPSIconSVG width={rs(32)} height={rs(32)} />;
                          if (n === "recharge") return <RechargeIconSVG width={rs(32)} height={rs(32)} />;
                          return <Icon name="apps" size={rs(26)} color={Colors.finance_accent} />;
                        })()}
                      </View>
                      <Text style={S.svcGridLabel}>{item.name.toUpperCase()}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* AEPS */}
                {hasService("aeps") && (
                  <>
                    <SecHeader title="AEPS Services" />
                    <Animated.View style={{ transform: [{ translateX: leftAnim }], opacity: leftFade }}>
                      <View style={S.grid}>
                        {SERVICES.aeps.map((item, i) => (
                          <TouchableOpacity
                            key={i}
                            style={[S.gridBox, item.type === "ap" && kycStatus !== "approved" && S.gridBoxLocked]}
                            onPress={() => handleAepsService(item)}
                          >
                            <View style={{ position: "relative" }}>
                              <Icon name={ICON_MAP[item.type] || ICON_MAP.default} size={rs(22)} color={Colors.finance_text} />
                              {item.type === "ap" && kycStatus !== "approved" && (
                                <View style={S.lockBadge}><Icon name="lock" size={rs(7)} color="#FFF" /></View>
                              )}
                            </View>
                            <Text style={S.gridTxt}>{item.name.replace("\n", " ")}</Text>
                            {item.type === "ap" && kycStatus !== "approved" && (
                              <Text style={S.kycNeedTxt}>KYC needed</Text>
                            )}
                          </TouchableOpacity>
                        ))}
                      </View>
                    </Animated.View>
                  </>
                )}

                {/* Money Transfer */}
                {hasService("dmt") && (
                  <>
                    <SecHeader title="Money Transfer" />
                    <Animated.View style={{ transform: [{ translateX: leftAnim }], opacity: leftFade }}>
                      <View style={S.grid}>
                        {SERVICES.money_transfer.map((item, i) => (
                          <TouchableOpacity key={i} style={S.gridBox}
                            onPress={() => item.type === "dmt" && navigation.navigate("DmtLogin")}
                          >
                            <Icon name={ICON_MAP[item.type] || ICON_MAP.default} size={rs(22)} color={Colors.finance_text} />
                            <Text style={S.gridTxt}>{item.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </Animated.View>
                  </>
                )}
              </>
            )}

            {/* Banner */}
            <View style={S.bannerWrap}>
              <ScrollView
                ref={scrollRef} horizontal snapToInterval={ITEM_W}
                decelerationRate="fast" showsHorizontalScrollIndicator={false}
                scrollEventThrottle={16} contentContainerStyle={{ paddingRight: rs(20) }}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: bannerX } } }], { useNativeDriver: false })}
              >
                {[require("../assets/banner_a.png"), require("../assets/banner_b.png"), require("../assets/banner_c.png")].map((img, i) => (
                  <Image key={i} source={img} style={S.bannerImg} />
                ))}
              </ScrollView>
              <View style={S.paginRow}>
                {[0, 1, 2].map((_, i) => {
                  const r = [(i - 1) * SW, i * SW, (i + 1) * SW];
                  return (
                    <Animated.View key={i} style={[S.paginDot, {
                      width: bannerX.interpolate({ inputRange: r, outputRange: [8, 20, 8], extrapolate: "clamp" }),
                      opacity: bannerX.interpolate({ inputRange: r, outputRange: [0.3, 1, 0.3], extrapolate: "clamp" }),
                    }]} />
                  );
                })}
              </View>
            </View>

            {/* Great Deals */}
            <View style={S.dealsRow}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <View style={[S.dealIconBg, { backgroundColor: Colors.finance_chip }]}>
                  <Icon name="fire" size={rs(17)} color={Colors.finance_accent} />
                </View>
                <Text style={[S.dealTitle, { color: Colors.finance_text }]}>Great Deals</Text>
              </View>
              <View style={[S.hotTag, { backgroundColor: Colors.finance_accent }]}>
                <Text style={S.hotTagTxt}>LIMITED</Text>
              </View>
            </View>

            {/* Bill Pay Card */}
            <LinearGradient colors={[Colors.primary, "#000000"]} style={S.billCard} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={S.billCircle} />
              <View style={S.rowBetween}>
                <View style={{ flex: 1, marginRight: rs(10) }}>
                  <Text style={S.billTitle}>Recharge & Bills</Text>
                  <Text style={S.billSub}>Fast, Secure & Rewarding</Text>
                </View>
                <View style={S.billIconBox}>
                  <Icon name="cellphone-nfc" size={rs(26)} color={Colors.finance_accent} />
                </View>
              </View>
              <View style={S.billActions}>
                {[
                  { icon: "cellphone", label: "Mobile" },
                  { icon: "television-classic", label: "DTH" },
                  { icon: "lightbulb-on-outline", label: "Elec" },
                  { icon: "water-outline", label: "Water" },
                ].map((a, i) => (
                  <View key={i} style={{ alignItems: "center" }}>
                    <Icon name={a.icon} size={rs(20)} color="#FFF" />
                    <Text style={S.billActionTxt}>{a.label}</Text>
                  </View>
                ))}
              </View>
              <TouchableOpacity style={S.billPayBtn} onPress={() => navigation.navigate("PaymentsScreen")}>
                <Text style={S.billPayBtnTxt}>Pay Now</Text>
                <Icon name="arrow-right" size={rs(15)} color="#000" />
              </TouchableOpacity>
            </LinearGradient>

          </View>
        </Animated.ScrollView>

        {/* Bottom Nav */}
        <View style={[S.navWrap, { bottom: insets.bottom + rs(8) }]}>
          <View style={S.navBar}>
            <TouchableOpacity style={S.tabItem} activeOpacity={0.8}>
              <View style={{ alignItems: "center" }}>
                <LinearGradient colors={["#F5E7C6", "#d4b06a"]} style={S.activeTab} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Icon name="home" size={rs(22)} color={Colors.black} />
                </LinearGradient>
                <Text style={S.navLabelActive}>Home</Text>
              </View>
            </TouchableOpacity>
            {[
              { icon: "file-document-outline", label: "Report", screen: "WalletTransactionScreen" },
              { icon: "history", label: "History", screen: "InvoiceScreen", badge: true },
              { icon: "account-outline", label: "Profile", screen: "ProfileScreen" },
            ].map((tab, i) => (
              <TouchableOpacity key={i} style={S.tabItem} onPress={() => navigation.navigate(tab.screen)}>
                <View style={{ alignItems: "center" }}>
                  <View>
                    <Icon name={tab.icon} size={rs(22)} color="#888" />
                    {tab.badge && <View style={S.badgeDot} />}
                  </View>
                  <Text style={S.navLabel}>{tab.label}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────────────────────
function SecHeader({ title }) {
  return (
    <View style={[S.secHeaderRow, { marginTop: rs(10), marginBottom: rs(8) }]}>
      <View style={S.secBar} />
      <Text style={S.secTitle}>{title}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: Colors.bg is NOT used here.
// StyleSheet.create() runs at module load time, before the Colors import
// is fully resolved. Using Colors.bg here would produce undefined.
// All background color is applied as inline style={{ backgroundColor: Colors.bg }}
// in the JSX above, where it is evaluated at render time.
// ─────────────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safe: { flex: 1 },
  root: { flex: 1 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  splash: { flex: 1, justifyContent: "center", alignItems: "center" },
  splashTxt: { marginTop: rs(12), color: "#888", fontFamily: Fonts.Medium, fontSize: rs(14) },
  emptyServiceTxt: { color: "#666", fontFamily: Fonts.Medium, marginTop: rs(10), fontSize: rs(13), textAlign: "center" },

  searchOverlay: { position: "absolute", zIndex: 90, top: 0, left: 0, right: 0, bottom: 0 },

  // Header — bottom border radius gives the curved bottom edge
  headerWrap: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 100,
    overflow: "visible",
    backgroundColor: "#161616",
    borderBottomLeftRadius: rs(32),
    borderBottomRightRadius: rs(32),
    elevation: 12,
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.32, shadowRadius: 10,
  },
  headerGrad: {
    flex: 1,
    paddingHorizontal: rs(18),
    paddingBottom: rs(14),
    borderBottomLeftRadius: rs(32),
    borderBottomRightRadius: rs(32),
    overflow: "hidden",
  },

  layerA: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
  },
  avatarWrap: { position: "relative", marginRight: rs(10) },
  avatarGrad: {
    width: rs(44), height: rs(44), borderRadius: rs(22),
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, borderColor: "rgba(255,255,255,0.2)",
  },
  avatarTxt: { color: "#000", fontSize: rs(17), fontFamily: Fonts.Bold },
  kycDot: {
    position: "absolute", bottom: 0, right: 0,
    width: rs(10), height: rs(10), borderRadius: rs(5),
    borderWidth: 1.5, borderColor: "#161616",
  },
  userInfo: { flex: 1, minWidth: 0 },
  greetRow: { flexDirection: "row", alignItems: "center", marginBottom: rs(1) },
  greetTxt: { fontSize: rs(12), fontFamily: Fonts.Medium },
  nameTxt: { color: "#FFF", fontSize: rs(16), fontFamily: Fonts.Bold, letterSpacing: 0.3, flexShrink: 1 },
  usernameTxt: { color: Colors.finance_accent, fontSize: rs(9), fontFamily: Fonts.Medium, marginTop: 1, flexShrink: 1 },
  actions: { flexDirection: "row", flexShrink: 0, marginLeft: rs(6) },
  glassBtn: {
    width: rs(38), height: rs(38), borderRadius: rs(19),
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
    marginLeft: rs(7), borderWidth: 1, borderColor: "rgba(255,255,255,0.14)",
  },
  notifDot: {
    position: "absolute", top: rs(8), right: rs(8),
    width: rs(7), height: rs(7), borderRadius: rs(4),
    backgroundColor: "#FF3B30", zIndex: 1, borderWidth: 1.5, borderColor: "#333",
  },

  layerB: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    flexDirection: "row", alignItems: "center",
  },
  searchBack: { marginRight: rs(8), padding: rs(4) },
  searchInputWrap: {
    flex: 1, flexDirection: "row", alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.09)",
    borderRadius: rs(13),
    paddingHorizontal: rs(12), paddingVertical: rs(10),
    borderWidth: 1, borderColor: "rgba(212,176,106,0.28)",
  },
  searchInput: {
    flex: 1, color: "#FFF",
    fontSize: rs(14), fontFamily: Fonts.Medium,
    paddingVertical: 0, includeFontPadding: false,
  },

  resultsOverlay: {
    position: "absolute", left: rs(16), right: rs(16),
    zIndex: 200, backgroundColor: "#1C1C1C",
    borderRadius: rs(16), borderWidth: 1,
    borderColor: "rgba(212,176,106,0.22)", overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.45, shadowRadius: 14, elevation: 20,
  },
  resultRow: {
    flexDirection: "row", alignItems: "center",
    height: rs(46), paddingHorizontal: rs(14),
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.045)",
  },
  resultIconBox: {
    width: rs(30), height: rs(30), borderRadius: rs(9),
    backgroundColor: "rgba(212,176,106,0.09)",
    alignItems: "center", justifyContent: "center",
    marginRight: rs(10), borderWidth: 1, borderColor: "rgba(212,176,106,0.12)",
  },
  resultLabel: { flex: 1, color: "#DDD", fontSize: rs(13), fontFamily: Fonts.Medium },
  moreHint: { textAlign: "center", color: "#666", fontSize: rs(10), fontFamily: Fonts.Medium, paddingVertical: rs(7) },
  emptyRow: { flexDirection: "row", alignItems: "center", height: rs(48), paddingHorizontal: rs(14) },
  emptyTxt: { color: "#666", fontFamily: Fonts.Medium, fontSize: rs(12), marginLeft: rs(8) },

  walletCard: {
    borderRadius: rs(22), padding: rs(15),
    borderWidth: 1, borderColor: "rgba(255,255,255,0.09)", overflow: "hidden",
  },
  circ1: { position: "absolute", top: -28, right: -28, width: rs(90), height: rs(90), borderRadius: rs(45), backgroundColor: "rgba(212,176,106,0.09)" },
  circ2: { position: "absolute", bottom: -36, left: -18, width: rs(110), height: rs(110), borderRadius: rs(55), backgroundColor: "rgba(255,255,255,0.04)" },
  walletTag: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(0,0,0,0.3)", paddingHorizontal: rs(10), paddingVertical: rs(5), borderRadius: rs(20), borderWidth: 1, borderColor: "rgba(212,176,106,0.3)" },
  walletTagTxt: { color: "#d4b06a", fontSize: rs(11), fontFamily: Fonts.Bold, marginLeft: rs(5), letterSpacing: 0.4 },
  swapBtn: { width: rs(34), height: rs(34), borderRadius: rs(17), backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  balLabel: { color: "rgba(255,255,255,0.55)", fontSize: rs(10), fontFamily: Fonts.Medium, letterSpacing: 1, textTransform: "uppercase" },
  rupee: { color: "#d4b06a", fontSize: rs(21), fontFamily: Fonts.Light, marginRight: rs(3), marginTop: rs(2) },
  balAmt: { color: "#FFF", fontSize: rs(25), fontFamily: Fonts.Bold, letterSpacing: 1 },
  addBtn: { position: "absolute", right: rs(14), top: rs(64), backgroundColor: Colors.finance_accent, flexDirection: "row", alignItems: "center", paddingHorizontal: rs(9), paddingVertical: rs(5), borderRadius: rs(14), elevation: 2 },
  addBtnTxt: { color: "#000", fontSize: rs(10), fontFamily: Fonts.Bold, marginLeft: rs(3) },
  cardFooter: { marginTop: rs(9), flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerHint: { color: "rgba(255,255,255,0.28)", fontSize: rs(9), fontStyle: "italic" },
  kycBadge: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: rs(10), paddingHorizontal: rs(7), paddingVertical: rs(3) },
  kycDotSm: { width: rs(5), height: rs(5), borderRadius: rs(3), marginRight: rs(4) },
  kycBadgeTxt: { fontSize: rs(9), fontFamily: Fonts.Bold, letterSpacing: 0.5 },

  // body — NO backgroundColor here; it is set inline in JSX as Colors.bg
  body: { paddingHorizontal: rs(16), paddingTop: rs(4) },

  secHeaderRow: { flexDirection: "row", alignItems: "center" },
  secBar: { width: rs(3), height: rs(15), backgroundColor: Colors.finance_accent, borderRadius: rs(4), marginRight: rs(7) },
  secTitle: { fontSize: rs(14), fontFamily: Fonts.Bold, color: Colors.finance_text, letterSpacing: 0.4, textTransform: "capitalize" },

  // User Services — plain transparent grid
  svcGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: rs(8) },
  svcGridItem: { width: "25%", alignItems: "center", paddingVertical: rs(10) },
  svcIconCircle: {
    width: rs(50), height: rs(50), borderRadius: rs(12),
    backgroundColor: Colors.white,
    justifyContent: "center", alignItems: "center",
    marginBottom: rs(6),
    borderWidth: 1.5, borderColor: "rgba(212,176,106,0.22)",
  },
  svcGridLabel: { fontSize: rs(9), fontFamily: Fonts.Bold, color: Colors.finance_text, textAlign: "center", letterSpacing: 0.3 },

  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  gridBox: {
    width: "23%", backgroundColor: Colors.white, alignItems: "center",
    paddingVertical: rs(8), borderRadius: rs(12), paddingHorizontal: rs(3),
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 3, elevation: 2,
    marginVertical: rs(4), borderWidth: 0.5, borderColor: "rgba(0,0,0,0.05)",
  },
  gridBoxLocked: { backgroundColor: "#FFF8F8", borderColor: "#F9736640", opacity: 0.85 },
  gridTxt: { color: "#444", fontSize: rs(9), textAlign: "center", marginTop: rs(4), fontFamily: Fonts.Medium, lineHeight: rs(12) },
  lockBadge: { position: "absolute", bottom: -2, right: -5, width: rs(11), height: rs(11), borderRadius: rs(6), backgroundColor: "#F97316", alignItems: "center", justifyContent: "center" },
  kycNeedTxt: { color: "#F97316", fontSize: rs(7), textAlign: "center", marginTop: rs(2), fontFamily: Fonts.Medium },

  bannerWrap: { marginTop: rs(16), marginBottom: rs(4), height: vscale(128), borderRadius: rs(12), overflow: "hidden", justifyContent: "center", alignItems: "center" },
  bannerImg: { width: SW - rs(36), height: vscale(128), resizeMode: "cover", borderRadius: rs(12), backgroundColor: "#fff", marginRight: rs(10) },
  paginRow: { position: "absolute", bottom: rs(7), flexDirection: "row", alignSelf: "center" },
  paginDot: { height: rs(5), borderRadius: rs(3), backgroundColor: Colors.finance_accent, marginHorizontal: rs(3) },

  dealsRow: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    marginBottom: rs(9), marginTop: rs(9),
    paddingVertical: rs(11), paddingHorizontal: rs(13),
    backgroundColor: Colors.white, borderRadius: rs(14), elevation: 2,
  },
  dealIconBg: { width: rs(29), height: rs(29), borderRadius: rs(14), alignItems: "center", justifyContent: "center", marginRight: rs(7) },
  dealTitle: { fontSize: rs(13), fontFamily: Fonts.Bold },
  hotTag: { paddingHorizontal: rs(8), paddingVertical: rs(3), borderRadius: rs(9) },
  hotTagTxt: { color: Colors.white, fontSize: rs(9), fontFamily: Fonts.Bold },

  billCard: { marginHorizontal: rs(1), marginTop: rs(11), borderRadius: rs(18), padding: rs(17), borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", overflow: "hidden", marginBottom: rs(6) },
  billCircle: { position: "absolute", top: -28, right: -28, width: rs(90), height: rs(90), borderRadius: rs(45), backgroundColor: "rgba(212,176,106,0.1)" },
  billTitle: { color: "#FFF", fontSize: rs(15), fontFamily: Fonts.Bold },
  billSub: { color: "rgba(255,255,255,0.6)", fontSize: rs(11), fontFamily: Fonts.Medium, marginTop: 2 },
  billIconBox: { width: rs(42), height: rs(42), borderRadius: rs(11), backgroundColor: "rgba(255,255,255,0.05)", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  billActions: { flexDirection: "row", justifyContent: "space-between", marginTop: rs(14), marginBottom: rs(14) },
  billActionTxt: { color: "rgba(255,255,255,0.7)", fontSize: rs(10), marginTop: rs(5), fontFamily: Fonts.Medium },
  billPayBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: Colors.finance_accent, paddingVertical: rs(10), borderRadius: rs(11) },
  billPayBtnTxt: { color: "#000", fontWeight: "bold", marginRight: rs(5), fontSize: rs(12) },

  navWrap: { position: "absolute", width: "100%", alignItems: "center" },
  navBar: { backgroundColor: "#1A1A1A", width: "92%", height: rs(58), borderRadius: rs(29), flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: rs(7), shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.24, shadowRadius: 14, elevation: 10, borderWidth: 1, borderColor: "#333" },
  tabItem: { flex: 1, height: "100%", justifyContent: "center", alignItems: "center" },
  activeTab: { flexDirection: "row", alignItems: "center", padding: rs(6), borderRadius: rs(15), shadowColor: "#F5E7C6", shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.55, shadowRadius: 7, elevation: 5 },
  navLabel: { color: "#888", fontSize: rs(9), fontFamily: Fonts.Medium, marginTop: rs(3) },
  navLabelActive: { color: Colors.finance_accent, fontSize: rs(9), fontFamily: Fonts.Bold, marginTop: rs(3) },
  badgeDot: { position: "absolute", top: -2, right: -2, width: rs(7), height: rs(7), borderRadius: rs(4), backgroundColor: "#FF3B30", borderWidth: 1, borderColor: "#1A1A1A" },
});