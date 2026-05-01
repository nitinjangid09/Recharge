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
  TextInput,
  FlatList,
  Keyboard,
  RefreshControl,
  ToastAndroid,
  Platform,
  Alert,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Fonts from "../../constants/Fonts";
import Colors from "../../constants/Colors";
import { getWalletBalance, fetchUserProfile, getAllBanners, getWalletReport, getAepsStatus, BASE_URL, getAllNotifications, getAllServices, requestService } from "../../api/AuthApi";
import FullScreenLoader from "../../componets/Loader/FullScreenLoader";
import CustomAlert from "../../componets/Alerts/CustomAlert";

import BBPSIconSVG from "../../assets/ServicesIcons/BBPS.svg";
import RechargeIconSVG from "../../assets/ServicesIcons/Recharge.svg";
import AEPSIconSVG from "../../assets/ServicesIcons/AEPS.svg";
import OfflineServicesIconSVG from "../../assets/ServicesIcons/ofline service.svg";
import MoneyTransferIconSVG from "../../assets/ServicesIcons/Money Transfer.svg";
import XpressIconSVG from "../../assets/ServicesIcons/xpress.svg";
import UpiIconSVG from "../../assets/ServicesIcons/Upi.svg";
import OnlineServicesIconSVG from "../../assets/ServicesIcons/online service.svg";
import ElectricityIcon from "../../assets/BBPSIcon/Electricity.svg";
import GasIcon from "../../assets/BBPSIcon/Gas.svg";
import WaterIcon from "../../assets/BBPSIcon/Water.svg";
import FastagIcon from "../../assets/BBPSIcon/Fastag.svg";
import DTHIcon from "../../assets/BBPSIcon/DTH.svg";
import CreditCardIcon from "../../assets/BBPSIcon/Credit Card.svg";
import MobilePostpaidIcon from "../../assets/BBPSIcon/Mobile Postpaid.svg";
import LPGIcon from "../../assets/BBPSIcon/LPG Gas.svg";


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
  if (h >= 5 && h < 12) return { text: "Good Morning,", icon: "weather-sunny", color: Colors.amber };
  if (h >= 12 && h < 17) return { text: "Good Afternoon,", icon: "weather-partly-cloudy", color: Colors.finance_accent };
  if (h >= 17 && h < 21) return { text: "Good Evening,", icon: "weather-sunset", color: '#FF5722' };
  return { text: "Good Night,", icon: "weather-night", color: Colors.primary };
};

// ─────────────────────────────────────────────────────────────────────────────
// SEARCH ITEMS
// ─────────────────────────────────────────────────────────────────────────────
const ALL_ITEMS = [

  { id: "1", label: "DMT Transfer", icon: "bank-transfer", screen: "DmtLogin" },
  { id: "2", label: "Mobile Recharge", icon: "cellphone", screen: "TopUpScreen" },
  { id: "3", label: "DTH Recharge", icon: "satellite-variant", screen: "TopUpScreen" },
  { id: "4", label: "Electricity", icon: "flash", screen: "Electricity" },
  { id: "5", label: "Broadband", icon: "wifi", screen: "TopUpScreen" },
  { id: "6", label: "Cable TV", icon: "television", screen: "PaymentsScreen" },
  { id: "7", label: "Gas", icon: "gas-cylinder", screen: "PaymentsScreen" },
  { id: "8", label: "Insurance", icon: "account-group-outline", screen: "PaymentsScreen" },
  { id: "9", label: "Add Balance", icon: "plus-circle", screen: "OfflineTopup" },
  { id: "10", label: "BBPS Payments", icon: "lightning-bolt", screen: "PaymentsScreen" },
  { id: "11", label: "Profile", icon: "account-circle", screen: "ProfileScreen" },
  { id: "12", label: "Transaction History", icon: "history", screen: "InvoiceScreen" },
  { id: "14", label: "KYC Verification", icon: "shield-check", screen: "Offlinekyc" },
  { id: "15", label: "Offline Services", icon: "clipboard-list-outline", screen: "OfflineServices" },
  { id: "16", label: "Online Services", icon: "web", screen: "OnlineServices" },
  { id: "17", label: "AEPS 2", icon: "bank-plus", screen: "AEPSPortalAccess" },
  { id: "18", label: "Xpress Payout", icon: "bank-transfer", screen: "XpressPayout" },
];

// Service icon mapping for assigned services
const SERVICE_ICON_MAP = {
  bbps: "lightning-bolt",
  recharge: "cellphone",
  aeps: "bank-outline",
  dmt: "bank-transfer",
  insurance: "shield-check-outline",
  offline: "clipboard-list-outline",
  "offline-service": "clipboard-list-outline",
  "online-service": "web",
  xpresspayout: "bank-transfer",
  "xpress-payout": "bank-transfer",
  "aeps-payout": "bank-transfer",
  "upi-payout": "qrcode-scan",
  upi: "qrcode-scan",
  default: "apps",
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
const NewsMarquee = ({ notifications }) => {
  const scrollAnim = useRef(new Animated.Value(SW)).current;
  const [currentIndex, setCurrentIndex] = useState(0);

  if (!notifications || notifications.length === 0) return null;

  const textToDisplay = notifications[currentIndex]?.name;

  return (
    <View style={S.newsMarqueeContainer}>
      <Icon name="bullhorn-outline" size={rs(16)} color={Colors.finance_accent} style={{ marginRight: rs(8), zIndex: 1 }} />
      <ScrollView horizontal={true} pointerEvents="none" showsHorizontalScrollIndicator={false} style={{ flex: 1, overflow: 'hidden' }}>
        <Animated.View
          key={currentIndex}
          style={{ flexDirection: 'row', transform: [{ translateX: scrollAnim }], width: 5000 }}
        >
          <Text
            onLayout={(e) => {
              const width = e.nativeEvent.layout.width;
              scrollAnim.setValue(SW);
              Animated.timing(scrollAnim, {
                toValue: -width,
                duration: (SW + width) * 15, // Speed adjustment
                easing: Easing.linear,
                useNativeDriver: true,
              }).start(({ finished }) => {
                if (finished) {
                  setCurrentIndex((prev) => (prev + 1) % notifications.length);
                }
              });
            }}
            style={S.newsMarqueeText}
            numberOfLines={1}
          >
            {textToDisplay}
          </Text>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

export default function FinanceHome({ navigation }) {
  const insets = useSafeAreaInsets();

  const TOP_ROW_H = rs(52);
  const WALLET_H = vscale(160);
  const GAP = rs(6);
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
  const [allServices, setAllServices] = useState([]);
  const [profileAssignedServices, setProfileAssignedServices] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [isMainWallet, setIsMainWallet] = useState(true);
  const [showBalance, setShowBalance] = useState(true);
  const [banners, setBanners] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");

  const [recentTransactions, setRecentTransactions] = useState([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [txnCount, setTxnCount] = useState(0);
  const [txnVolume, setTxnVolume] = useState(0);

  const [alert, setAlert] = useState({ visible: false, type: "info", title: "", message: "", onConfirm: null, confirmText: "OK", isLoading: false });

  const showAlert = (type, title, message, onConfirm = null, confirmText = "OK", isLoading = false) => {
    setAlert({ visible: true, type, title, message, onConfirm, confirmText, isLoading });
  };

  const hasService = (pipelineCode) => {
    return profileAssignedServices.some((s) =>
      s.pipelineCodes && s.pipelineCodes.some(code => code.toLowerCase() === pipelineCode.toLowerCase())
    );
  };

  const loadBanners = useCallback(async (tok) => {
    try {
      const res = await getAllBanners({ headerToken: tok });
      if (res?.success) setBanners(res.data || []);
    } catch (e) {
      setBanners([]);
    }
  }, []);

  const loadNotifications = useCallback(async (tok) => {
    try {
      const res = await getAllNotifications({ headerToken: tok });
      if (res?.success) setNotifications(res.data || []);
    } catch (e) {
      setNotifications([]);
    }
  }, []);

  const loadAllServices = useCallback(async (tok) => {
    try {
      const res = await getAllServices({ headerToken: tok });
      if (res?.success && Array.isArray(res.data)) {
        setAllServices(res.data);
      }
    } catch (e) {
      console.log("Error loading services:", e);
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
      prevDate.setDate(prevDate.getDate() - 7); // Last 7 days for home screen
      const from = prevDate.toISOString().split("T")[0];

      const res = await getWalletReport({ from, to: today, headerToken: tok });
      if (res?.success && Array.isArray(res.data)) {
        // Last 5 transactions
        const last5 = res.data.slice(0, 8).map(txn => {
          const isCredit = txn.type?.toLowerCase() === "credit";
          const amount = parseFloat(txn.txnAmount || 0);
          const isRefund = txn.isRefunded === true || txn.serviceCategory === 'REFUND';

          // Intelligent Icon & Color Mapping
          let icon = "swap-horizontal";
          let color = Colors.finance_accent;
          let bg = "rgba(212,176,106,0.12)";

          const cat = (txn.serviceCategory || "").toUpperCase();
          const srv = (txn.serviceName || "").toUpperCase();

          if (cat === "REFUND") {
            icon = "refresh";
            color = "#22C55E";
            bg = "rgba(34,197,94,0.12)";
          } else if (cat === "AEPS") {
            icon = "fingerprint";
            color = "#6366F1";
            bg = "rgba(99,102,241,0.12)";
          } else if (srv.includes("JIO") || srv.includes("AIRTEL") || srv.includes("VI") || srv.includes("BSNL")) {
            icon = "cellphone-wireless";
            color = "#3B82F6";
            bg = "rgba(59,130,246,0.12)";
          } else if (cat === "BBPS") {
            icon = "lightning-bolt";
            color = "#E8A020";
            bg = "rgba(232,160,32,0.12)";
          }

          return {
            id: txn._id,
            name: txn.serviceName || "Transaction",
            meta: txn.message || txn.serviceCategory || "Wallet Transaction",
            amount: `${isCredit ? "+" : "−"}₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`,
            credit: isCredit,
            isRefund: isRefund,
            icon: icon,
            color: color,
            bg: bg,
            time: new Date(txn.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            date: new Date(txn.date).toLocaleDateString([], { day: '2-digit', month: 'short' }),
          };
        });
        setRecentTransactions(last5);
        setTxnCount(res.data.length);
        const volume = res.data.reduce((acc, curr) => acc + parseFloat(curr.txnAmount || 0), 0);
        setTxnVolume(volume);
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
            setProfileAssignedServices(Array.isArray(p.assignedServices) ? p.assignedServices : []);
            setUserProfile(p);
            setStatusMessage(res?.message || "");
          } else {
            setUserName(s.user_name?.trim() || "User");
            setStatusMessage(res?.message || "Unable to fetch status");
          }
        } catch {
          setUserName(s.user_name?.trim() || "User");
          setStatusMessage("Connection error");
        } finally { setServicesLoading(false); }
      })();

      loadBalances(s.header_token);
      loadBanners(s.header_token);
      loadNotifications(s.header_token);
      loadAllServices(s.header_token);
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
        <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

        <FullScreenLoader visible={true} label="Initializing dashboard..." />
      </SafeAreaView>
    );
  }

  const allServiceItems = [
    ...allServices.flatMap(s => (s.pipeline || []).map(p => ({ code: p.code, service: s, isStatic: false }))),
    { code: "dth_cat", label: "DTH", base: "bbps_cat", isStatic: true, screen: "BbpsDynamicServiceScreen", params: { serviceType: "DTH" }, Svg: DTHIcon, sortOrder: 1 },
    { code: "fastag_cat", label: "Fastag", base: "bbps_cat", isStatic: true, screen: "BbpsDynamicServiceScreen", params: { serviceType: "Fastag" }, Svg: FastagIcon, sortOrder: 2 },
    { code: "electricity_cat", label: "Electricity", base: "bbps_cat", isStatic: true, screen: "BbpsDynamicServiceScreen", params: { serviceType: "Electricity" }, Svg: ElectricityIcon, sortOrder: 3 },
    { code: "credit_card_cat", label: "Credit Card", base: "bbps_cat", isStatic: true, screen: "BbpsDynamicServiceScreen", params: { serviceType: "Credit Card" }, Svg: CreditCardIcon, sortOrder: 4 },
    { code: "mobile_postpaid_cat", label: "Mobile Postpaid", base: "bbps_cat", isStatic: true, screen: "BbpsDynamicServiceScreen", params: { serviceType: "Mobile Postpaid" }, Svg: MobilePostpaidIcon, sortOrder: 5 },
    { code: "lpg_gas_cat", label: "LPG Gas", base: "bbps_cat", isStatic: true, screen: "BbpsDynamicServiceScreen", params: { serviceType: "LPG Gas" }, Svg: LPGIcon, sortOrder: 6 },
  ]
    .map(item => {
      const n = (item.code || "").toLowerCase();
      if (item.isStatic) return { ...item, n };
      const isLocked = !hasService(item.code);
      const base = n.replace(/\d+$/, "");
      let label = n.toUpperCase();
      if (n === "dmt1") label = "DMT";
      if (n === "aeps1") label = "AEPS 1";
      if (n === "aeps2") label = "AEPS 2";
      if (n === "bbps1") label = "BBPS";
      if (n === "recharge1") label = "RECHARGE";
      if (base === "xpresspayout" || base === "xpress-payout") label = "Xpress Payout";
      if (base === "aepspayout" || base === "aeps-payout" || n === "aepspayout") label = "AEPS Payout";
      if (base === "upi-payout") label = "UPI Payout";
      if (n && n.includes("offline")) label = "OFFLINE SERVICES";
      if (n && n.includes("online")) label = "ONLINE SERVICES";
      return { ...item, label, n, base, isLocked };
    });

  const aepsServices = allServiceItems.filter(i => i.base === "aeps" || (i.n && i.n.includes("aeps")));
  const rechargeServices = allServiceItems
    .filter(i => i.base === "recharge" || i.base === "bbps" || i.base === "bbps_cat" || (i.n && (i.n.includes("recharge") || i.n.includes("bbps"))))
    .map(i => {
      if (i.n === "bbps1" || i.n === "bbps") {
        return { ...i, label: "More" };
      }
      return i;
    })
    .sort((a, b) => {
      // 1. Recharge always first
      const aIsRec = a.n?.includes("recharge");
      const bIsRec = b.n?.includes("recharge");
      if (aIsRec && !bIsRec) return -1;
      if (!aIsRec && bIsRec) return 1;

      // 2. More button always last
      if (a.label === "More") return 1;
      if (b.label === "More") return -1;

      // 3. BBPS categories in their assigned order
      if (a.base === "bbps_cat" && b.base === "bbps_cat") {
        return (a.sortOrder || 99) - (b.sortOrder || 99);
      }

      return 0;
    });
  const transferServices = allServiceItems.filter(i => i.base === "dmt" || i.n.includes("dmt") || i.n.includes("xpress") || i.n.includes("upi") || i.n === "dmt1");
  const onlineOfflineServices = allServiceItems.filter(i => i.n.includes("online") || i.n.includes("offline"));

  const renderServiceGrid = (items, title, subtitle) => {
    if (!items || items.length === 0) return null;
    return (
      <View style={S.sectionCard}>
        <SectionHeader title={title || "Services"} subtitle={subtitle} />
        <View style={S.svcGrid}>
          {items.map((item, idx) => {
            const { code, service, label, n, base, isStatic, screen, Svg, isLocked } = item;
            const iconName = SERVICE_ICON_MAP[base] || SERVICE_ICON_MAP.default;

            return (
              <TouchableOpacity
                key={`${code}-${idx}`}
                style={[S.svcGridItem]}
                activeOpacity={0.78}
                onPress={async () => {
                  if (isStatic && screen) {
                    navigation.navigate(screen, item.params || {});
                    return;
                  }
                  if (isLocked) {
                    const isAlreadyRequested = userProfile?.requestedService?.some(req => req.serviceName === n && req.status === "pending");

                    if (isAlreadyRequested) {
                      showAlert("warning", "Notice", "Request already exist for this User waiting for further reviews");
                      return;
                    }

                    const rejectedService = userProfile?.requestedService?.find(req => req.serviceName === n && req.status === "rejected");

                    if (rejectedService) {
                      showAlert("error", "Request Rejected", `Reason: ${rejectedService.reason}`);
                      return;
                    }

                    showAlert(
                      "theme",
                      "Service Locked",
                      "Do you want to request this service from the admin?",
                      async () => {
                        try {
                          setAlert(p => ({ ...p, isLoading: true }));
                          const res = await requestService({
                            serviceId: service._id || service.serviceId,
                            pipeline: n,
                            headerToken: token
                          });

                          if (res?.success) {
                            try {
                              const profileRes = await fetchUserProfile({ headerToken: token });
                              if (profileRes?.success && profileRes?.data) {
                                setUserProfile(profileRes.data);
                                setProfileAssignedServices(Array.isArray(profileRes.data.assignedServices) ? profileRes.data.assignedServices : []);
                              }
                            } catch (e) {
                              console.log("Failed to refresh profile:", e);
                            }
                          }

                          setAlert(p => ({
                            ...p,
                            type: res.success ? "success" : "warning",
                            title: res.success ? "Request Sent" : "Notice",
                            message: res.message || "Your request has been sent.",
                            isLoading: false,
                            onConfirm: null,
                          }));
                        } catch (error) {
                          setAlert(p => ({
                            ...p,
                            type: "error",
                            title: "Error",
                            message: "Failed to request service. Please try again.",
                            isLoading: false,
                            onConfirm: null,
                          }));
                        }
                      },
                      "Yes, Request"
                    );
                    return;
                  }
                  if (isStatic) {
                    navigation.navigate(screen);
                    return;
                  }
                  if (n === "recharge" || n === "recharge1" || service.name === "recharge" || service.serviceId === "699314b271936d89b7185e48") {
                    navigation.navigate("TopUpScreen");
                  } else if (n === "bbps" || n === "bbps1" || service.name === "bbps" || service.serviceId === "6993147e71936d89b7185e36") {
                    navigation.navigate("PaymentsScreen");
                  } else if (n === "aeps1" || n === "aeps") {
                    const aeps1 = userProfile?.aeps1 || {};
                    if (Object.keys(aeps1).length === 0) {
                      navigation.navigate("AepsRegistration");
                    } else if (aeps1.action === "ACTION-REQUIRED") {
                      navigation.navigate("AEPS_OnBoard");
                    } else if (aeps1.action === "NO-ACTION-REQUIRED") {
                      setBalanceLoading(true);
                      try {
                        const statusRes = await getAepsStatus({ headerToken: token });
                        if (statusRes.code === "LOGIN_NOT_REQUIRED") {
                          navigation.navigate("AEPS1");
                        } else if (statusRes.code === "LOGIN_REQUIRED") {
                          navigation.navigate("DailyLogin");
                        } else {
                          navigation.navigate("DailyLogin");
                        }
                      } catch (err) {
                        showAlert("error", "Status Check Failed", "Unable to verify AEPS session. Please try again.");
                      } finally {
                        setBalanceLoading(false);
                      }
                    } else {
                      navigation.navigate("AEPSAadhaarOTP");
                    }
                  } else if (n === "aeps2") {
                    const aeps2 = userProfile?.aeps2 || {};
                    const { isActivated, isLoginRequired } = aeps2;
                    if (Object.keys(aeps2).length === 0) {
                      navigation.navigate("AEPSSecondaryRegistration");
                    } else if (isActivated === true && isLoginRequired === true) {
                      navigation.navigate("AEPSPortalAccess");
                    } else if (isActivated === false && isLoginRequired === true) {
                      navigation.navigate("AEPSServiceActivation");
                    } else if (isActivated === true && isLoginRequired === false) {
                      navigation.navigate("AePSDashboard");
                    } else {
                      navigation.navigate("AEPSAadhaarOTP");
                    }
                  } else if (n === "dmt" || n === "dmt1") {
                    navigation.navigate("DmtLogin");
                  } else if (base === "xpresspayout" || base === "xpress-payout" || base === "upi-payout" || base === "aepspayout" || base === "aeps-payout" || n === "aepspayout") {
                    navigation.navigate("XpressPayout");
                  }
                }}
              >
                <View style={[S.svcIconCircle]}>
                  {isStatic && Svg ? (
                    <Svg width={rs(30)} height={rs(30)} />
                  ) : (base === "bbps" || n === "bbps1") && typeof BBPSIconSVG === "function" ? (
                    <BBPSIconSVG width={rs(32)} height={rs(32)} />
                  ) : (base === "recharge" || n === "recharge1") && typeof RechargeIconSVG === "function" ? (
                    <RechargeIconSVG width={rs(32)} height={rs(32)} />
                  ) : (base === "aeps" || n.includes("aeps")) && typeof AEPSIconSVG === "function" ? (
                    <AEPSIconSVG width={rs(32)} height={rs(32)} />
                  ) : (base === "dmt" || n.includes("dmt")) && typeof MoneyTransferIconSVG === "function" ? (
                    <MoneyTransferIconSVG width={rs(32)} height={rs(32)} />
                  ) : (base === "xpresspayout" || base === "xpress-payout") && typeof XpressIconSVG === "function" ? (
                    <XpressIconSVG width={rs(32)} height={rs(32)} />
                  ) : (base === "upi" || base === "upi-payout") && typeof UpiIconSVG === "function" ? (
                    <UpiIconSVG width={rs(32)} height={rs(32)} />
                  ) : (n.includes("offline")) && typeof OfflineServicesIconSVG === "function" ? (
                    <OfflineServicesIconSVG width={rs(32)} height={rs(32)} />
                  ) : (n.includes("online")) && typeof OnlineServicesIconSVG === "function" ? (
                    <OnlineServicesIconSVG width={rs(32)} height={rs(32)} />
                  ) : (
                    <Icon name={iconName} size={rs(28)} color={Colors.finance_accent} />
                  )}
                </View>
                <Text style={[S.svcGridLabel]} numberOfLines={1} adjustsFontSizeToFit>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[S.safe, { backgroundColor: Colors.bg }]} edges={["bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} translucent />

      <FullScreenLoader visible={refreshing} label="Refreshing data..." />

      <View style={[S.root, { backgroundColor: Colors.bg }]}>

        {/* ══ COLLAPSING HEADER ══ */}
        <Animated.View style={[S.headerWrap, { height: headerHeight }]}>
          <LinearGradient
            colors={[Colors.hex_232323, Colors.black]}
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
                  <LinearGradient colors={[Colors.finance_accent, Colors.hex_B8944D]} style={S.avatarGrad}>
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
                    <Icon name="magnify" size={rs(20)} color={Colors.white} />
                  </TouchableOpacity>
                  <TouchableOpacity style={S.glassBtn}
                    onPress={() => navigation.navigate("Notification")}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Icon name="bell-ring-outline" size={rs(20)} color={Colors.white} />
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
                  <Icon name="magnify" size={rs(15)} color={Colors.whiteOpacity_60} style={{ marginRight: rs(6) }} />
                  <TextInput
                    ref={inputRef}
                    style={S.searchInput}
                    placeholder="Type to search…"
                    placeholderTextColor={Colors.whiteOpacity_20}
                    value={searchQuery}
                    onChangeText={onSearchChange}
                    returnKeyType="search"
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  {searchQuery.length > 0 && (
                    <TouchableOpacity onPress={() => onSearchChange("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Icon name="close-circle" size={rs(17)} color={Colors.whiteOpacity_60} />
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
                    colors={[Colors.hex_2E2E2E, Colors.black]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                    style={[S.walletCard, { borderColor: "rgba(212,176,106,0.3)" }]}
                  >
                    <View style={S.circ1} /><View style={S.circ2} />
                    <View style={S.rowBetween}>
                      <View style={[S.walletTag, { borderColor: "#d4b06a" }]}>
                        <Icon name="wallet-membership" size={rs(13)} color="#d4b06a" />
                        <Text style={[S.walletTagTxt, { color: "#d4b06a" }]}>Main Wallet</Text>
                      </View>
                      <TouchableOpacity
                        style={S.swapBtn}
                        onPress={toggleWallet}
                        activeOpacity={0.7}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Icon name="swap-horizontal" size={rs(18)} color={Colors.finance_accent} />
                      </TouchableOpacity>
                    </View>

                    <View style={{ marginTop: rs(8) }}>
                      <Text style={S.balLabel}>Main Balance</Text>
                      <View style={{ flexDirection: "row", alignItems: "center" }}>
                        {!balanceLoading && <Text style={[S.rupee, { color: "#d4b06a" }]}>₹</Text>}
                        {balanceLoading
                          ? <ActivityIndicator size="small" color={Colors.white} style={{ marginLeft: 4 }} />
                          : <Text style={S.balAmt}>{!showBalance ? "••••••" : formatBalance(mainBalance)}</Text>
                        }
                        {!balanceLoading && (
                          <TouchableOpacity
                            onPress={(e) => { e.stopPropagation(); setShowBalance((p) => !p); }}
                            style={{ marginLeft: rs(8) }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Icon name={!showBalance ? "eye-off" : "eye"} size={rs(18)} color={Colors.whiteOpacity_60} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[S.addBtn, { backgroundColor: Colors.finance_accent }]}
                      onPress={(e) => { e.stopPropagation(); navigation.navigate("OfflineTopup"); }}
                    >
                      <Icon name="plus" size={rs(12)} color={Colors.black} />
                      <Text style={[S.addBtnTxt, { color: Colors.black }]}>Top Up</Text>
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
                        <Text style={[S.kycBadgeTxt, { color: kyc }]}>KYC {(kycStatus || "pending").toUpperCase()}</Text>
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
                        <Text style={[S.kycBadgeTxt, { color: kyc }]}>KYC {(kycStatus || "pending").toUpperCase()}</Text>
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

            {/* ── NEWS MARQUEE ── */}
            <NewsMarquee notifications={notifications} />

            {/* ── OVERVIEW STATS ── */}
            <OverviewStats
              navigation={navigation}
              kycStatus={kycStatus}
              assignedServices={profileAssignedServices}
              statusMessage={statusMessage}
              txnCount={txnCount}
              txnVolume={txnVolume}
            />

            {/* ── RECHARGE AND BILL PAYMENT ── */}
            {rechargeServices.length > 0 && renderServiceGrid(rechargeServices, "Recharge & Bills")}

            {/* ── AEPS ── */}
            {aepsServices.length > 0 && renderServiceGrid(aepsServices, "AEPS")}

            {/* ── TRANSFER SERVICE ── */}
            {transferServices.length > 0 && renderServiceGrid(transferServices, "Money Transfer")}

            {/* ── ONLINE AND OFFLINE SERVICES ── */}
            {onlineOfflineServices.length > 0 && renderServiceGrid(onlineOfflineServices, "Services")}

            {/* ── PROMO BANNER ── */}
            {banners.length > 0 ? (
              <View style={{ marginTop: rs(4) }}>
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
            ) : null}

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
                    key={txn.id || i}
                    style={S.txnItem}
                  >
                    <View style={[S.txnIcon, { backgroundColor: txn.bg }]}>
                      <Icon name={txn.icon} size={rs(18)} color={txn.color} />
                    </View>
                    <View style={S.txnInfo}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: rs(2) }}>
                        <Text style={S.txnName} numberOfLines={1}>{txn.name}</Text>
                        {txn.isRefund && (
                          <View style={S.refundBadge}>
                            <Text style={S.refundBadgeTxt}>REFUND</Text>
                          </View>
                        )}
                      </View>
                      <Text style={S.txnMeta} numberOfLines={1}>{txn.meta}</Text>
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={[S.txnAmount, txn.credit ? S.txnCredit : S.txnDebit]}>
                        {txn.amount}
                      </Text>
                      <Text style={S.txnTime}>{txn.date} · {txn.time}</Text>
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

      <CustomAlert
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert(p => ({ ...p, visible: false }))}
        onConfirm={alert.onConfirm}
        confirmText={alert.confirmText}
        isLoading={alert.isLoading}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW STATS
// ─────────────────────────────────────────────────────────────────────────────
function OverviewStats({ navigation, kycStatus, assignedServices, statusMessage, txnCount, txnVolume }) {
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
            <Text style={S.statValue}>{(kycStatus || "pending").toUpperCase()}</Text>
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
        <View style={S.statCard}>
          <View style={S.statIconBox}>
            <Icon name="trending-up" size={rs(18)} color={Colors.finance_accent} />
          </View>
          <Text style={S.statValue}>₹{(txnVolume / 1000).toFixed(1)}K</Text>
          <Text style={S.statLabel}>This Week</Text>
        </View>

        <View style={S.statCard}>
          <View style={S.statIconBox}>
            <Icon name="pulse" size={rs(18)} color={Colors.finance_accent} />
          </View>
          <Text style={S.statValue}>{txnCount}</Text>
          <Text style={S.statLabel}>Transactions</Text>
        </View>
      </View>
    </View>
  );
}




// ─────────────────────────────────────────────────────────────────────────────
// SECTION HEADER
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, linkLabel = "See all", onLink }) {
  return (
    <View style={S.secHeaderRow}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={S.secTitle}>{title}</Text>
        {!!subtitle && (
          <View style={S.secSubtitleBadge}>
            <Text style={S.secSubtitleTxt}>{subtitle}</Text>
          </View>
        )}
      </View>
      <TouchableOpacity onPress={onLink} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={S.secLink}>{linkLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3F4F6" },
  root: { flex: 1, backgroundColor: "#F3F4F6" },
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
  addBtn: { position: "absolute", right: rs(14), top: rs(64), backgroundColor: Colors.finance_accent, flexDirection: "row", alignItems: "center", paddingHorizontal: rs(9), paddingVertical: rs(5), borderRadius: rs(14) },
  addBtnTxt: { color: "#000", fontSize: rs(10), fontFamily: Fonts.Bold, marginLeft: rs(3) },
  cardFooter: { marginTop: rs(9), flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kycBadge: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: rs(10), paddingHorizontal: rs(7), paddingVertical: rs(3) },
  kycDotSm: { width: rs(5), height: rs(5), borderRadius: rs(3), marginRight: rs(4) },
  kycBadgeTxt: { fontSize: rs(9), fontFamily: Fonts.Bold, letterSpacing: 0.5 },

  // ── BODY ──
  body: { paddingHorizontal: rs(10), paddingTop: rs(10), backgroundColor: "#F3F4F6" },

  loadingWrap: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: rs(32) },
  loadingTxt: { color: "#888", fontFamily: Fonts.Medium, fontSize: rs(13), marginLeft: rs(8) },

  // ── SECTION HEADER ──
  secHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: rs(16),
    marginBottom: rs(8),
  },
  secTitle: {
    fontSize: rs(15),
    fontFamily: Fonts.Bold,
    color: "#1F2937",
    letterSpacing: -0.2,
  },
  secLink: {
    fontSize: rs(13),
    fontFamily: Fonts.Bold,
    color: "#007185", // Amazon Link Color
  },

  // ── OVERVIEW STATS ──
  statsRow: { flexDirection: "row", gap: rs(12) },
  statCard: {
    flex: 1,
    backgroundColor: "#FFF",
    borderRadius: rs(16),
    padding: rs(16),
    borderWidth: 1,
    borderColor: "rgba(11,15,26,0.07)",
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
  sectionCard: {
    backgroundColor: "#FFF",
    borderRadius: rs(12),
    paddingTop: rs(8),
    paddingBottom: rs(4),
    marginBottom: rs(6),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
  },
  svcGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: rs(4),
  },
  svcGridItem: {
    width: "25%",
    alignItems: "center",
    paddingVertical: rs(4),
  },
  svcIconCircle: {
    width: rs(48),
    height: rs(48),
    borderRadius: rs(24),
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: rs(2),
  },
  svcGridLabel: {
    fontSize: rs(9),
    fontFamily: Fonts.Medium,
    color: "#374151",
    textAlign: "center",
  },

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
  },
  aepsCardLocked: { backgroundColor: "#FFF8F8", borderColor: "rgba(249,115,22,0.25)", opacity: 0.88 },
  aepsIconWrap: { position: "relative", marginBottom: rs(6) },
  aepsCardTxt: { color: "#444", fontSize: rs(9), textAlign: "center", fontFamily: Fonts.Medium, lineHeight: rs(13) },
  lockBadge: {
    position: "absolute", bottom: -2, right: -5,
    width: rs(11), height: rs(11), borderRadius: rs(6),
    backgroundColor: "#F97316", alignItems: "center", justifyContent: "center",
  },
  liveDot: {
    position: "absolute", top: rs(-1), right: rs(-1),
    width: rs(10), height: rs(10), borderRadius: rs(5),
    backgroundColor: "#22C55E",
    borderWidth: 1.5, borderColor: "#FFF",
  },
  kycNeedTxt: { color: "#F97316", fontSize: rs(7), textAlign: "center", marginTop: rs(2), fontFamily: Fonts.Medium },


  // ── NEWS MARQUEE ──
  newsMarqueeContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(212,176,106,0.1)",
    paddingVertical: rs(8),
    paddingHorizontal: rs(14),
    borderRadius: rs(8),
    borderWidth: 1,
    borderColor: "rgba(212,176,106,0.3)",
    overflow: "hidden",
    marginBottom: rs(12),
  },
  newsMarqueeText: {
    color: Colors.finance_accent,
    fontSize: rs(12),
    fontFamily: Fonts.Medium,
    flexShrink: 0,
  },

  // ── BANNERS (dynamic) ──
  bannerWrap: { height: vscale(110), borderRadius: rs(12), overflow: "hidden", justifyContent: "center", alignItems: "center" },
  bannerImg: { width: SW - rs(36), height: vscale(110), resizeMode: "cover", borderRadius: rs(12), backgroundColor: "#fff", marginRight: rs(10) },
  paginRow: { position: "absolute", bottom: rs(7), flexDirection: "row", alignSelf: "center" },
  paginDot: { height: rs(5), borderRadius: rs(3), backgroundColor: Colors.finance_accent, marginHorizontal: rs(3) },

  // ── RECENT TRANSACTIONS ──
  txnList: { gap: rs(6), marginBottom: rs(4) },
  txnItem: {
    backgroundColor: "#FFF",
    borderRadius: rs(16),
    padding: rs(14),
    flexDirection: "row", alignItems: "center", gap: rs(12),
    borderWidth: 1, borderColor: "rgba(11,15,26,0.07)",
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

  refundBadge: {
    marginLeft: rs(6),
    backgroundColor: "rgba(34,197,94,0.12)",
    paddingHorizontal: rs(6),
    paddingVertical: rs(2),
    borderRadius: rs(4),
    borderWidth: 0.5,
    borderColor: "rgba(34,197,94,0.3)",
  },
  refundBadgeTxt: {
    fontSize: rs(8),
    fontFamily: Fonts.Bold,
    color: "#22C55E",
    letterSpacing: 0.5,
  },

  // ── BOTTOM NAV — unchanged ──
  navWrap: { position: "absolute", width: "100%", alignItems: "center" },
  navBar: {
    backgroundColor: "#1A1A1A", width: "92%", height: rs(58),
    borderRadius: rs(29), flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingHorizontal: rs(7),
    borderWidth: 1, borderColor: "#333",
  },
  tabItem: { flex: 1, height: "100%", justifyContent: "center", alignItems: "center" },
  activeTab: {
    flexDirection: "row", alignItems: "center", padding: rs(6), borderRadius: rs(15),
  },
  navLabel: { color: "#888", fontSize: rs(9), fontFamily: Fonts.Medium, marginTop: rs(3) },
  navLabelActive: { color: Colors.finance_accent, fontSize: rs(9), fontFamily: Fonts.Bold, marginTop: rs(3) },
});