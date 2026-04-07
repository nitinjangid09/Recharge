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
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Fonts from "../../constants/Fonts";
import Colors from "../../constants/Colors";
import { getWalletBalance, fetchUserProfile, getAllBanners, getWalletReport, BASE_URL } from "../../api/AuthApi";

import BBPSIconSVG from "../../assets/Icons/BBPS.svg";
import RechargeIconSVG from "../../assets/Icons/Recharge.svg";
import OfflineServicesIconSVG from "../../assets/Icons/ofline service.svg";


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
  { id: "19", label: "Offline Services", icon: "clipboard-list-outline", screen: "OfflineServices" },
];

// ─────────────────────────────────────────────────────────────────────────────
// SERVICES
// ─────────────────────────────────────────────────────────────────────────────
const SERVICES = {
  aeps: [
    { type: "cw", name: "Cash\nWithdraw", icon: "cash" },
    { type: "be", name: "Balance\nEnquiry", icon: "bank" },
    { type: "ms", name: "Mini\nStatement", icon: "file-document-outline" },
    { type: "ap", name: "Aadhaar\nPay", icon: "fingerprint" },
  ],
  money_transfer: [{ type: "dmt", name: "DMT", icon: "bank-transfer" }],
};

const ICON_MAP = {
  cw: "cash", be: "bank", ms: "file-document-outline", ap: "fingerprint",
  dmt: "bank-transfer", default: "apps",
};

// Service icon mapping for assigned services
const SERVICE_ICON_MAP = {
  bbps: "lightning-bolt",
  recharge: "cellphone",
  aeps: "bank-outline",
  dmt: "bank-transfer",
  insurance: "shield-check-outline",
  offline: "clipboard-list-outline",
  default: "apps",
};

const KYC_COLOR = { approved: "#22C55E", rejected: "#EF4444", pending: "#F97316" };

const SESSION_KEYS = [
  "header_token", "user_name", "user_first", "user_last",
  "user_username", "user_phone", "user_email",
  "kyc_status", "user_level", "is_kyc_online", "user_profile",
];

// Mock recent transactions (replace with API data)
const RECENT_TXN = [
  { id: "t1", name: "Jio Recharge", meta: "Mobile · ₹999 Plan", amount: "−₹999", credit: false, icon: "cellphone", color: "#3B82F6", bg: "rgba(59,130,246,0.10)", time: "2h ago" },
  { id: "t2", name: "Electricity Bill", meta: "BBPS · JVVNL", amount: "−₹1,240", credit: false, icon: "flash", color: "#E8A020", bg: "rgba(232,160,32,0.10)", time: "Yesterday" },
  { id: "t3", name: "Cashback Credited", meta: "Recharge Offer", amount: "+₹50", credit: true, icon: "trending-up", color: "#22C55E", bg: "rgba(34,197,94,0.10)", time: "2 days ago" },
];

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────
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
  const WALLET_H = vscale(177);
  const GAP = rs(8);
  const HEADER_MAX = insets.top + TOP_ROW_H + GAP + WALLET_H + rs(14);
  const HEADER_MIN = insets.top + TOP_ROW_H + rs(14);
  const SCROLL_D = HEADER_MAX - HEADER_MIN;

  // ── Greeting ───────────────────────────────────────────────────────────────
  const [greeting, setGreeting] = useState(getGreeting());
  useEffect(() => {
    const iv = setInterval(() => setGreeting(getGreeting()), 60_000);
    return () => clearInterval(iv);
  }, []);

  // ── Search ─────────────────────────────────────────────────────────────────
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
  const [isMainWallet, setIsMainWallet] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [banners, setBanners] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");

  const [recentTransactions, setRecentTransactions] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);

  const hasService = (n) =>
    assignedServices.some((s) => s.name?.toLowerCase() === n.toLowerCase());

  const loadBanners = useCallback(async (tok) => {
    try {
      const res = await getAllBanners({ headerToken: tok });
      if (res?.success) setBanners(res.data || []);
    } catch (e) {
      setBanners([]);
    }
  }, []);

  // ── Header collapse ────────────────────────────────────────────────────────
  const scrollY = useRef(new Animated.Value(0)).current;
  const headerHeight = scrollY.interpolate({
    inputRange: [0, SCROLL_D],
    outputRange: [HEADER_MAX, HEADER_MIN],
    extrapolate: "clamp",
  });

  const cardOpacity = scrollY.interpolate({
    inputRange: [0, SCROLL_D * 0.4, SCROLL_D * 0.8],
    outputRange: [1, 0.5, 0],
    extrapolate: "clamp",
  });

  const cardTranslateY = scrollY.interpolate({
    inputRange: [0, SCROLL_D],
    outputRange: [0, -40],
    extrapolate: "clamp",
  });

  const cardScale = scrollY.interpolate({
    inputRange: [-100, 0, SCROLL_D],
    outputRange: [1.05, 1, 0.9],
    extrapolate: "clamp",
  });

  // ── Wallet Flip ────────────────────────────────────────────────────────────
  const flipAnim = useRef(new Animated.Value(0)).current;

  const toggleWallet = () => {
    const toValue = isMainWallet ? 1 : 0;
    Animated.timing(flipAnim, {
      toValue,
      duration: 500,
      useNativeDriver: true,
      easing: Easing.inOut(Easing.ease),
    }).start(() => {
      setIsMainWallet(!isMainWallet);
    });
  };

  const frontInterpolate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "180deg"] });
  const backInterpolate = flipAnim.interpolate({ inputRange: [0, 1], outputRange: ["180deg", "360deg"] });
  const frontOpacity = flipAnim.interpolate({ inputRange: [0, 0.5, 0.5001, 1], outputRange: [1, 1, 0, 0] });
  const backOpacity = flipAnim.interpolate({ inputRange: [0, 0.5, 0.5001, 1], outputRange: [0, 0, 1, 1] });

  useEffect(() => {
    if (!showBalance) {
      const t = setTimeout(() => setShowBalance(true), 7000);
      return () => clearTimeout(t);
    }
  }, [showBalance]);

  // ── Staggered body content entrance ───────────────────────────────────────
  const bodyFade = useRef(new Animated.Value(0)).current;
  const bodySlide = useRef(new Animated.Value(20)).current;

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

  const loadRecentTransactions = useCallback(async (tok) => {
    setRecentLoading(true);
    try {
      const today = new Date().toISOString().split("T")[0];
      const prevDate = new Date();
      prevDate.setDate(prevDate.getDate() - 30); // Last 30 days
      const from = prevDate.toISOString().split("T")[0];

      const res = await getWalletReport({ from, to: today, headerToken: tok });
      if (res?.success && Array.isArray(res.data)) {
        // Last 5 transactions
        const last5 = res.data.slice(0, 5).map(txn => {
          const isCredit = txn.type === "CREDIT";
          const amount = parseFloat(txn.amount || 0);
          return {
            id: txn._id,
            name: txn.remarks || "Transaction",
            meta: txn.transactionType || "Wallet",
            amount: `${isCredit ? "+" : "−"}₹${amount.toFixed(2)}`,
            credit: isCredit,
            icon: isCredit ? "trending-up" : "trending-down",
            color: isCredit ? "#22C55E" : "#EF4444",
            bg: isCredit ? "rgba(34,197,94,0.10)" : "rgba(239,68,68,0.10)",
            time: new Date(txn.createdAt).toLocaleDateString([], { day: '2-digit', month: 'short' })
          };
        });
        setRecentTransactions(last5);
      }
    } catch (e) {
      console.log("Error loading transactions:", e);
    } finally {
      setRecentLoading(false);
    }
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
            setStatusMessage(res?.message || "");
          } else {
            setUserName(s.user_name?.trim() || "User");
            setAssignedServices([]);
            setStatusMessage(res?.message || "Unable to fetch status");
          }
        } catch {
          setUserName(s.user_name?.trim() || "User");
          setAssignedServices([]);
          setStatusMessage("Connection error");
        } finally { setServicesLoading(false); }
      })();

      loadBalances(s.header_token);
      loadBanners(s.header_token);
      loadRecentTransactions(s.header_token);
    } catch (e) {
      setUserName("User");
    } finally { setReady(true); }
  }, [navigation, loadBalances]);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSession();
    setRefreshing(false);
  }, [loadSession]);

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
    // Body entrance
    setTimeout(() => {
      Animated.parallel([
        Animated.timing(bodyFade, { toValue: 1, duration: 500, useNativeDriver: false }),
        Animated.timing(bodySlide, { toValue: 0, duration: 500, easing: Easing.out(Easing.exp), useNativeDriver: false }),
      ]).start();
    }, 400);
  }, []);

  // ── Banner ─────────────────────────────────────────────────────────────────
  const bannerX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);
  const ITEM_W = SW - rs(36) + rs(10);
  useEffect(() => {
    if (banners.length < 2) return;
    let i = 0;
    const iv = setInterval(() => {
      i = (i + 1) % banners.length;
      scrollRef.current?.scrollTo({ x: i * ITEM_W, animated: true });
    }, 3000);
    return () => clearInterval(iv);
  }, [banners.length]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const kyc = KYC_COLOR[kycStatus] || KYC_COLOR.pending;
  const formatBalance = (val) => {
    if (val === "...") return val;
    const num = parseFloat(val);
    if (isNaN(num) || num === 0) return "0.00";
    return num.toFixed(2);
  };
  const avatar = userName ? userName.charAt(0).toUpperCase() : "U";
  const RESULTS_TOP = insets.top + rs(10) + TOP_ROW_H + rs(6);

  // ─────────────────────────────────────────────────────────────────────────
  // SPLASH
  // ─────────────────────────────────────────────────────────────────────────
  if (!ready) {
    return (
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
    <SafeAreaView style={[S.safe, { backgroundColor: Colors.bg }]} edges={["bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor="#161616" translucent />

      <View style={[S.root, { backgroundColor: Colors.bg }]}>

        {/* ══ COLLAPSING HEADER ══ */}
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
                  <TouchableOpacity style={S.glassBtn}
                    onPress={() => navigation.navigate("Notification")}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
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

            {/* ══ WALLET CARD ══ */}
            <Animated.View style={{ height: WALLET_H, opacity: cardOpacity, transform: [{ translateY: cardTranslateY }, { scale: cardScale }] }}>
              {/* FRONT SIDE (MAIN) */}
              <Animated.View
                style={[
                  S.flipCard,
                  {
                    zIndex: isMainWallet ? 2 : 1,
                    opacity: frontOpacity,
                    transform: [{ rotateY: frontInterpolate }],
                  }
                ]}
              >
                <View style={{ flex: 1 }}>
                  <LinearGradient
                    colors={["#2C2C2C", "#111111"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={[S.walletCard, { borderColor: "rgba(212,176,106,0.3)" }]}
                  >
                    <View style={S.circ1} /><View style={S.circ2} />
                    <View style={S.rowBetween}>
                      <View style={[S.walletTag, { borderColor: "#d4b06a", backgroundColor: "rgba(212,176,106,0.2)" }]}>
                        <Icon name="wallet-membership" size={rs(13)} color="#d4b06a" />
                        <Text style={[S.walletTagTxt, { color: "#d4b06a" }]}>Main Wallet</Text>
                      </View>
                      <TouchableOpacity
                        style={S.swapBtn}
                        onPress={toggleWallet}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Icon name="swap-horizontal" size={rs(18)} color="#d4b06a" />
                      </TouchableOpacity>
                    </View>

                    <View style={{ marginTop: rs(8) }}>
                      <Text style={S.balLabel}>Main Balance</Text>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        {!balanceLoading && <Text style={[S.rupee, { color: "#d4b06a" }]}>₹</Text>}
                        {balanceLoading
                          ? <ActivityIndicator size="small" color="#FFF" style={{ marginLeft: 4 }} />
                          : <Text style={S.balAmt}>{!showBalance ? "••••••" : formatBalance(mainBalance)}</Text>
                        }
                        {!balanceLoading && (
                          <TouchableOpacity
                            onPress={(e) => { e.stopPropagation(); setShowBalance((p) => !p); }}
                            style={{ marginLeft: rs(8) }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Icon name={!showBalance ? "eye-off" : "eye"} size={rs(18)} color="rgba(255,255,255,0.45)" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[S.addBtn, { backgroundColor: "#d4b06a" }]}
                      onPress={(e) => { e.stopPropagation(); navigation.navigate("OfflineTopup"); }}
                    >
                      <Icon name="plus" size={rs(12)} color="#000" />
                      <Text style={[S.addBtnTxt, { color: "#000" }]}>Top Up</Text>
                    </TouchableOpacity>

                    <View style={S.cardFooter}>
                      <TouchableOpacity
                        style={[S.kycBadge, { borderColor: kyc }]}
                        activeOpacity={0.75}
                        onPress={(e) => {
                          e.stopPropagation();
                          if (kycStatus !== "approved") navigation.navigate("Offlinekyc");
                        }}
                      >
                        <View style={[S.kycDotSm, { backgroundColor: kyc }]} />
                        <Text style={[S.kycBadgeTxt, { color: kyc }]}>KYC {kycStatus.toUpperCase()}</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              </Animated.View>

              {/* BACK SIDE (AEPS) */}
              <Animated.View
                style={[
                  S.flipCard,
                  S.flipCardBack,
                  {
                    zIndex: isMainWallet ? 1 : 2,
                    opacity: backOpacity,
                    transform: [{ rotateY: backInterpolate }],
                  }
                ]}
              >
                <View style={{ flex: 1 }}>
                  <LinearGradient
                    colors={["#2C2C2C", "#111111"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={[S.walletCard, { borderColor: "rgba(212,176,106,0.3)" }]}
                  >
                    <View style={S.circ1} /><View style={S.circ2} />
                    <View style={S.rowBetween}>
                      <View style={S.walletTag}>
                        <Icon name="wallet-outline" size={rs(13)} color="#d4b06a" />
                        <Text style={S.walletTagTxt}>AEPS Wallet</Text>
                      </View>
                      <TouchableOpacity
                        style={S.swapBtn}
                        onPress={toggleWallet}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Icon name="swap-horizontal" size={rs(18)} color="#d4b06a" />
                      </TouchableOpacity>
                    </View>

                    <View style={{ marginTop: rs(8) }}>
                      <Text style={S.balLabel}>AEPS Balance</Text>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        {!balanceLoading && <Text style={S.rupee}>₹</Text>}
                        {balanceLoading
                          ? <ActivityIndicator size="small" color="#FFF" style={{ marginLeft: 4 }} />
                          : <Text style={S.balAmt}>{!showBalance ? "••••••" : formatBalance(aepsBalance)}</Text>
                        }
                        {!balanceLoading && (
                          <TouchableOpacity
                            onPress={(e) => { e.stopPropagation(); setShowBalance((p) => !p); }}
                            style={{ marginLeft: rs(8) }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Icon name={!showBalance ? "eye-off" : "eye"} size={rs(18)} color="rgba(255,255,255,0.45)" />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <View style={S.cardFooter}>
                      <TouchableOpacity
                        style={[S.kycBadge, { borderColor: kyc }]}
                        activeOpacity={0.75}
                        onPress={(e) => {
                          e.stopPropagation();
                          if (kycStatus !== "approved") navigation.navigate("Offlinekyc");
                        }}
                      >
                        <View style={[S.kycDotSm, { backgroundColor: kyc }]} />
                        <Text style={[S.kycBadgeTxt, { color: kyc }]}>KYC {kycStatus.toUpperCase()}</Text>
                      </TouchableOpacity>
                    </View>
                  </LinearGradient>
                </View>
              </Animated.View>
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

        {/* ══ SCROLLABLE CONTENT ══ */}
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              progressViewOffset={HEADER_MAX}
              tintColor={Colors.finance_accent}
              colors={[Colors.finance_accent]}
              progressBackgroundColor="#2C2C2C"
            />
          }
        >
          <Animated.View
            style={[S.body, { backgroundColor: Colors.bg, opacity: bodyFade, transform: [{ translateY: bodySlide }] }]}
          >

            {/* ── OVERVIEW STATS ── */}
            <OverviewStats
              navigation={navigation}
              kycStatus={kycStatus}
              assignedServices={assignedServices}
              statusMessage={statusMessage}
            />

            {/* ── SERVICES GRID ── */}
            <SectionHeader title="Services" linkLabel="View All" onLink={() => { }} />
            <View style={S.svcGrid}>
              {assignedServices.map((item, idx) => {
                const n = item.name?.toLowerCase();
                const iconName = SERVICE_ICON_MAP[n] || SERVICE_ICON_MAP.default;
                const isFirst = idx === 0;
                return (
                  <TouchableOpacity
                    key={item._id}
                    style={[S.svcGridItem]}
                    activeOpacity={0.78}
                    onPress={() => {
                      if (n === "recharge") navigation.navigate("TopUpScreen");
                      else if (n === "bbps") navigation.navigate("PaymentsScreen");
                      else if (n === "aeps") navigation.navigate("CashWithdraw");
                    }}
                  >
                    <View style={[S.svcIconCircle]}>
                      {n === "bbps" && typeof BBPSIconSVG === "function" ? (
                        <BBPSIconSVG width={rs(26)} height={rs(26)} />
                      ) : n === "recharge" && typeof RechargeIconSVG === "function" ? (
                        <RechargeIconSVG width={rs(26)} height={rs(26)} />
                      ) : (
                        <Icon
                          name={iconName}
                          size={rs(22)}
                          color={Colors.finance_accent}
                        />
                      )}
                    </View>
                    <Text style={[S.svcGridLabel]} numberOfLines={1} adjustsFontSizeToFit>
                      {item.name.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              {/* Static Offline Services Item */}
              <TouchableOpacity
                style={[S.svcGridItem]}
                activeOpacity={0.78}
                onPress={() => navigation.navigate("OfflineServices")}
              >
                <View style={[S.svcIconCircle]}>
                  <OfflineServicesIconSVG
                    width={rs(24)}
                    height={rs(24)}
                  />
                </View>
                <Text style={[S.svcGridLabel]} numberOfLines={1} adjustsFontSizeToFit>
                  OFFLINE SERVICES
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── PROMO BANNER ── */}
            {banners.length > 0 ? (
              <View style={{ marginTop: rs(10) }}>
                <View style={S.bannerWrap}>
                  <ScrollView
                    ref={scrollRef}
                    horizontal
                    snapToInterval={ITEM_W}
                    decelerationRate="fast"
                    showsHorizontalScrollIndicator={false}
                    scrollEventThrottle={16}
                    contentContainerStyle={{ paddingRight: rs(20) }}
                    onScroll={Animated.event(
                      [{ nativeEvent: { contentOffset: { x: bannerX } } }],
                      { useNativeDriver: false }
                    )}
                  >
                    {banners.map((img, i) => (
                      <Image
                        key={img._id || i}
                        source={{ uri: `${BASE_URL}${img.imageUrl}` }}
                        style={S.bannerImg}
                      />
                    ))}
                  </ScrollView>
                  <View style={S.paginRow}>
                    {banners.map((_, i) => {
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
              </View>
            ) : (
              <PromoBanner onPress={() => navigation.navigate("TopUpScreen")} />
            )}

            {/* ── RECENT TRANSACTIONS ── */}
            <SectionHeader
              title="Recent Transactions"
              linkLabel="See All"
              onLink={() => navigation.navigate("WalletTransactionScreen")}
            />
            <View style={S.txnList}>
              {recentLoading ? (
                <ActivityIndicator size="small" color={Colors.finance_accent} style={{ marginVertical: rs(20) }} />
              ) : recentTransactions.length === 0 ? (
                <View style={[S.statCard, { alignItems: 'center', paddingVertical: rs(24) }]}>
                  <Icon name="history" size={rs(32)} color="rgba(0,0,0,0.1)" />
                  <Text style={{ color: '#9BA5B8', fontSize: rs(12), marginTop: rs(8), fontFamily: Fonts.Medium }}>No recent transactions</Text>
                </View>
              ) : (
                recentTransactions.map((txn, i) => (
                  <View
                    key={txn.id}
                    style={S.txnItem}
                  >
                    <View style={[S.txnIcon, { backgroundColor: txn.bg }]}>
                      <Icon name={txn.icon} size={rs(18)} color={txn.color} />
                    </View>
                    <View style={S.txnInfo}>
                      <Text style={S.txnName} numberOfLines={1}>{txn.name}</Text>
                      <Text style={S.txnMeta}>{txn.meta}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[S.txnAmount, txn.credit ? S.txnCredit : S.txnDebit]}>
                        {txn.amount}
                      </Text>
                      <Text style={S.txnTime}>{txn.time}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

          </Animated.View>
        </Animated.ScrollView>

        {/* ══ BOTTOM NAV — unchanged style ══ */}
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
              { icon: "file-document-outline", label: "Wallet Ledger", screen: "WalletTransactionScreen" },
              { icon: "history", label: "Reports", screen: "InvoiceScreen" },
              { icon: "account-outline", label: "Profile", screen: "ProfileScreen" },
            ].map((tab, i) => (
              <TouchableOpacity key={i} style={S.tabItem} onPress={() => navigation.navigate(tab.screen)}>
                <View style={{ alignItems: "center" }}>
                  <Icon name={tab.icon} size={rs(22)} color="#888" />
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
// OVERVIEW STATS
// ─────────────────────────────────────────────────────────────────────────────
function OverviewStats({ navigation, kycStatus, assignedServices, statusMessage }) {
  const kyc = KYC_COLOR[kycStatus] || KYC_COLOR.pending;

  if (kycStatus !== "approved") {
    return (
      <View style={{ marginBottom: rs(8) }}>
        <SectionHeader title="Overview" />
        <View style={S.statsRow}>
          {/* KYC Alert Card */}
          <View style={[S.statCard, { flex: 1, borderLeftWidth: 3, borderLeftColor: kyc }]}>
            <View style={[S.statIconBox, { backgroundColor: `${kyc}18` }]}>
              <Icon name="shield-lock-outline" size={rs(18)} color={kyc} />
            </View>
            <Text style={S.statValue}>{kycStatus.toUpperCase()}</Text>
            <Text style={S.statLabel}>KYC Status</Text>
          </View>
          {/* Info Card */}
          <View style={[S.statCard, { flex: 1 }]}>
            <View style={S.statIconBox}>
              <Icon name="information-outline" size={rs(18)} color={Colors.finance_accent} />
            </View>
            <Text style={[S.statValue, { fontSize: rs(13) }]} numberOfLines={2}>
              {statusMessage || "Awaiting approval"}
            </Text>
            <Text style={S.statLabel}>Account Info</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: rs(8) }}>
      <SectionHeader title="Overview" />
      <View style={S.statsRow}>
        <TouchableOpacity
          style={S.statCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("InvoiceScreen")}
        >
          <View style={S.statIconBox}>
            <Icon name="trending-up" size={rs(18)} color={Colors.finance_accent} />
          </View>
          <Text style={S.statValue}>₹4.2K</Text>
          <Text style={S.statLabel}>This Month</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={S.statCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("InvoiceScreen")}
        >
          <View style={S.statIconBox}>
            <Icon name="pulse" size={rs(18)} color={Colors.finance_accent} />
          </View>
          <Text style={S.statValue}>18</Text>
          <Text style={S.statLabel}>Transactions</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROMO BANNER (static fallback)
// ─────────────────────────────────────────────────────────────────────────────
function PromoBanner({ onPress }) {
  return (
    <View style={{ marginTop: rs(20) }}>
      <TouchableOpacity style={S.promoBanner} onPress={onPress} activeOpacity={0.9}>
        <LinearGradient
          colors={["#0B0F1A", "#1A2035", "#0F1525"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={S.promoBannerInner}
        >
          {/* Grid texture overlay */}
          <View style={S.promoGrid} />

          <View style={S.promoContent}>
            <View style={S.promoTag}>
              <View style={S.promoTagDot} />
              <Text style={S.promoTagTxt}>Banner</Text>
            </View>
            <Text style={S.promoTitle}>
              Get <Text style={S.promoHighlight}>₹10–₹100</Text>{"\n"}Cashback on{"\n"}Mobile Recharge
            </Text>
            <View style={S.promoCta}>
              <Text style={S.promoCtaTxt}>Recharge Now</Text>
              <Icon name="arrow-right" size={rs(12)} color="#000" />
            </View>
          </View>

          <View style={S.promoOperators}>
            <View style={S.opRow}>
              <View style={[S.opPill, { borderColor: "rgba(255,0,0,0.2)" }]}>
                <Text style={[S.opPillTxt, { color: "#FF0000" }]}>Airtel</Text>
              </View>
              <View style={[S.opPill, { borderColor: "rgba(255,45,85,0.2)" }]}>
                <Text style={[S.opPillTxt, { color: "#FF2D55" }]}>Vi</Text>
              </View>
            </View>
            <View style={S.opRow}>
              <View style={[S.opPill, { borderColor: "rgba(0,112,192,0.2)" }]}>
                <Text style={[S.opPillTxt, { color: "#0070C0" }]}>Jio</Text>
              </View>
              <View style={[S.opPill, { borderColor: "rgba(0,166,81,0.2)" }]}>
                <Text style={[S.opPillTxt, { color: "#00A651" }]}>BSNL</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
      {/* Carousel dots */}
      <View style={S.carouselDots}>
        <View style={S.dotActive} />
        <View style={S.dotInactive} />
        <View style={S.dotInactive} />
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeader({ title, linkLabel, onLink }) {
  return (
    <View style={S.secHeaderRow}>
      <Text style={S.secTitle}>{title}</Text>
      {!!linkLabel && (
        <TouchableOpacity onPress={onLink} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={S.secLink}>{linkLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safe: { flex: 1 },
  root: { flex: 1 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },

  splash: { flex: 1, justifyContent: "center", alignItems: "center" },
  splashTxt: { marginTop: rs(12), color: "#888", fontFamily: Fonts.Medium, fontSize: rs(14) },

  searchOverlay: { position: "absolute", zIndex: 90, top: 0, left: 0, right: 0, bottom: 0 },

  // ── HEADER — unchanged ──
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
  flipCard: {
    position: "absolute", top: 0, left: 0, width: "100%",
    backfaceVisibility: "hidden",
  },
  flipCardBack: { transform: [{ rotateY: "180deg" }] },
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

  // ── WALLET CARD — unchanged ──
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
  kycBadge: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: rs(10), paddingHorizontal: rs(7), paddingVertical: rs(3) },
  kycDotSm: { width: rs(5), height: rs(5), borderRadius: rs(3), marginRight: rs(4) },
  kycBadgeTxt: { fontSize: rs(9), fontFamily: Fonts.Bold, letterSpacing: 0.5 },

  // ── BODY ──
  body: { paddingHorizontal: rs(16), paddingTop: rs(4) },

  loadingWrap: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: rs(32) },
  loadingTxt: { color: "#888", fontFamily: Fonts.Medium, fontSize: rs(13), marginLeft: rs(8) },

  // ── SECTION HEADER ──
  secHeaderRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: rs(20), marginBottom: rs(12),
  },
  secTitle: {
    fontSize: rs(16), fontFamily: Fonts.Bold, color: "#0B0F1A",
    letterSpacing: -0.3,
    // Left accent bar via border
    borderLeftWidth: rs(3), borderLeftColor: Colors.finance_accent,
    paddingLeft: rs(8),
  },
  secLink: { fontSize: 15, fontFamily: Fonts.Bold, color: Colors.finance_accent },

  // ── OVERVIEW STATS ──
  statsRow: { flexDirection: "row", gap: rs(12) },
  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: rs(16),
    padding: rs(16),
    borderWidth: 1,
    borderColor: "rgba(11,15,26,0.07)",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  statIconBox: {
    width: rs(36), height: rs(36),
    borderRadius: rs(10),
    backgroundColor: "rgba(232,160,32,0.10)",
    alignItems: "center", justifyContent: "center",
    marginBottom: rs(10),
  },
  statValue: {
    fontFamily: Fonts.Bold, fontSize: rs(22), color: "#0B0F1A",
    letterSpacing: -0.5, lineHeight: rs(26), marginBottom: rs(3),
  },
  statLabel: {
    fontSize: rs(10), color: "#9BA5B8", fontFamily: Fonts.Medium,
    textTransform: "uppercase", letterSpacing: 0.6,
  },

  // ── SERVICES GRID ──
  svcGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: rs(4) },
  svcGridItem: { width: "25%", alignItems: "center", paddingVertical: rs(8) },
  svcIconCircle: {
    width: rs(56), height: rs(56), borderRadius: rs(16),
    backgroundColor: "#FFF",
    alignItems: "center", justifyContent: "center",
    marginBottom: rs(6),
    borderWidth: 1, borderColor: "rgba(11,15,26,0.07)",
    shadowColor: Colors.finance_accent, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  svcIconCircleActive: {
    backgroundColor: "#0B0F1A",
    borderColor: "transparent",
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22, shadowRadius: 10, elevation: 5,
  },
  svcGridLabel: {
    fontSize: rs(10), fontFamily: Fonts.Bold, color: Colors.primary,
    textAlign: "center", letterSpacing: 0.2,
  },
  svcGridLabelActive: { color: "#0B0F1A" },

  // ── AEPS CARD GRID ──
  aepsGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginBottom: rs(4) },
  aepsCard: {
    width: "23%",
    backgroundColor: "#FFF",
    alignItems: "center",
    paddingVertical: rs(12),
    paddingHorizontal: rs(4),
    borderRadius: rs(16),
    marginVertical: rs(4),
    borderWidth: 1, borderColor: "rgba(11,15,26,0.07)",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  aepsCardLocked: { backgroundColor: "#FFF8F8", borderColor: "rgba(249,115,22,0.25)", opacity: 0.88 },
  aepsIconWrap: { position: "relative", marginBottom: rs(6) },
  aepsCardTxt: { color: "#444", fontSize: rs(9), textAlign: "center", fontFamily: Fonts.Medium, lineHeight: rs(13) },
  lockBadge: {
    position: "absolute", bottom: -2, right: -5,
    width: rs(11), height: rs(11), borderRadius: rs(6),
    backgroundColor: "#F97316", alignItems: "center", justifyContent: "center",
  },
  kycNeedTxt: { color: "#F97316", fontSize: rs(7), textAlign: "center", marginTop: rs(2), fontFamily: Fonts.Medium },

  // ── PROMO BANNER ──
  promoBanner: {
    borderRadius: rs(22), overflow: "hidden",
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18, shadowRadius: 16, elevation: 6,
  },
  promoBannerInner: {
    paddingHorizontal: rs(20), paddingVertical: rs(20),
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    minHeight: rs(120),
    position: "relative",
  },
  promoGrid: {
    position: "absolute", inset: 0,
    opacity: 0.4,
  },
  promoContent: { flex: 1, zIndex: 1 },
  promoTag: {
    flexDirection: "row", alignItems: "center", gap: rs(4),
    backgroundColor: "rgba(232,160,32,0.15)",
    borderWidth: 1, borderColor: "rgba(232,160,32,0.25)",
    borderRadius: rs(99), paddingHorizontal: rs(10), paddingVertical: rs(3),
    alignSelf: "flex-start", marginBottom: rs(8),
  },
  promoTagDot: { width: rs(5), height: rs(5), borderRadius: rs(3), backgroundColor: Colors.finance_accent },
  promoTagTxt: { fontSize: rs(9), fontFamily: Fonts.Bold, color: Colors.finance_accent, letterSpacing: 0.8, textTransform: "uppercase" },
  promoTitle: { fontFamily: Fonts.Bold, fontSize: rs(17), color: "#FFF", letterSpacing: -0.4, lineHeight: rs(22), marginBottom: rs(12) },
  promoHighlight: { color: Colors.finance_accent },
  promoCta: {
    flexDirection: "row", alignItems: "center", gap: rs(6),
    backgroundColor: Colors.finance_accent,
    borderRadius: rs(99), paddingHorizontal: rs(14), paddingVertical: rs(8),
    alignSelf: "flex-start",
    shadowColor: Colors.finance_accent, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35, shadowRadius: 8, elevation: 4,
  },
  promoCtaTxt: { color: "#000", fontSize: rs(11), fontFamily: Fonts.Bold, letterSpacing: 0.2 },
  promoOperators: { flexDirection: "column", gap: rs(8), alignItems: "center", zIndex: 1 },
  opRow: { flexDirection: "row", gap: rs(6) },
  opPill: {
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderRadius: rs(99), paddingHorizontal: rs(9), paddingVertical: rs(5),
  },
  opPillTxt: { fontSize: rs(10), fontFamily: Fonts.Bold, letterSpacing: 0.2 },
  carouselDots: { flexDirection: "row", justifyContent: "center", gap: rs(4), marginTop: rs(10) },
  dotActive: { width: rs(20), height: rs(4), borderRadius: rs(2), backgroundColor: Colors.finance_accent },
  dotInactive: { width: rs(4), height: rs(4), borderRadius: rs(2), backgroundColor: "rgba(11,15,26,0.15)" },

  // ── BANNERS (dynamic) ──
  bannerWrap: { height: vscale(128), borderRadius: rs(12), overflow: "hidden", justifyContent: "center", alignItems: "center" },
  bannerImg: { width: SW - rs(36), height: vscale(128), resizeMode: "cover", borderRadius: rs(12), backgroundColor: "#fff", marginRight: rs(10) },
  paginRow: { position: "absolute", bottom: rs(7), flexDirection: "row", alignSelf: "center" },
  paginDot: { height: rs(5), borderRadius: rs(3), backgroundColor: Colors.finance_accent, marginHorizontal: rs(3) },

  // ── RECENT TRANSACTIONS ──
  txnList: { gap: rs(8), marginBottom: rs(8) },
  txnItem: {
    backgroundColor: "#FFF",
    borderRadius: rs(16),
    padding: rs(14),
    flexDirection: "row", alignItems: "center", gap: rs(12),
    borderWidth: 1, borderColor: "rgba(11,15,26,0.07)",
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  txnIcon: {
    width: rs(42), height: rs(42), borderRadius: rs(12),
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  txnInfo: { flex: 1, minWidth: 0 },
  txnName: {
    fontSize: rs(13), fontFamily: Fonts.Bold, color: "#0B0F1A",
    marginBottom: rs(3),
  },
  txnMeta: { fontSize: rs(11), color: "#9BA5B8", fontFamily: Fonts.Regular },
  txnAmount: { fontSize: rs(14), fontFamily: Fonts.Bold, textAlign: "right" },
  txnDebit: { color: "#EF4444" },
  txnCredit: { color: "#22C55E" },
  txnTime: { fontSize: rs(10), color: "#9BA5B8", textAlign: "right", marginTop: rs(3) },

  // ── BOTTOM NAV — unchanged ──
  navWrap: { position: "absolute", width: "100%", alignItems: "center" },
  navBar: {
    backgroundColor: "#1A1A1A", width: "92%", height: rs(58),
    borderRadius: rs(29), flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: rs(7),
    shadowColor: "#000", shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.24, shadowRadius: 14, elevation: 10,
    borderWidth: 1, borderColor: "#333",
  },
  tabItem: { flex: 1, height: "100%", justifyContent: "center", alignItems: "center" },
  activeTab: {
    flexDirection: "row", alignItems: "center", padding: rs(6), borderRadius: rs(15),
    shadowColor: "#F5E7C6", shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55, shadowRadius: 7, elevation: 5,
  },
  navLabel: { color: "#888", fontSize: rs(9), fontFamily: Fonts.Medium, marginTop: rs(3) },
  navLabelActive: { color: Colors.finance_accent, fontSize: rs(9), fontFamily: Fonts.Bold, marginTop: rs(3) },
});