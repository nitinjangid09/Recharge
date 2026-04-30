import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Modal,
  Image,
  Animated,
  Dimensions,
  PixelRatio,
  PermissionsAndroid,
  Alert,
  RefreshControl,
  PanResponder,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { launchImageLibrary, launchCamera } from "react-native-image-picker";
import Colors from "../constants/Colors";
import Fonts from "../constants/Fonts";
import HeaderBar from "../componets/HeaderBar/HeaderBar";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAllTopupBanks, addOfflineTopupRequest, getAllOfflineTopupRequests, getOfflineTopupStats } from "../api/AuthApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CustomAlert from "../componets/Alerts/CustomAlert";
import ImageUploadAlert from "../componets/Alerts/Imageuploadalert";
import ReceiptModal from "../componets/ReceiptModal/ReceiptModal";
import CalendarModal from "../componets/Calendar/CalendarModal";
import FullScreenLoader from "../componets/Loader/FullScreenLoader";
import { buttonPress } from "../utils/ScreenAnimations";
import UpiIconSVG from "../assets/ServicesIcons/Upi.svg";

// ─── Filter config ────────────────────────────────────────────────────────────
const DATE_OPTIONS = [
  { key: 'this_month', label: 'This Month', icon: 'calendar-today' },
  { key: 'last_month', label: 'Last Month', icon: 'calendar-month' },
  { key: 'last_3', label: 'Last 3 Months', icon: 'calendar-range' },
  { key: 'last_6', label: 'Last 6 Months', icon: 'calendar-clock' },
  { key: 'custom', label: 'Custom Range', icon: 'calendar-edit' },
];

const FILTER_SECTIONS = [
  { key: 'date', label: 'DATE RANGE', icon: 'calendar-month-outline', options: DATE_OPTIONS, stateKey: 'date', defaultKey: 'this_month' },
];

const DEFAULT_FILTERS = { date: 'this_month' };

const resolvePeriod = (period, customFrom, customTo) => {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  switch (period) {
    case 'this_month': return { from: new Date(y, m, 1), to: new Date(y, m, d) };
    case 'last_month': {
      const lm = m === 0 ? 11 : m - 1, ly = m === 0 ? y - 1 : y;
      return { from: new Date(ly, lm, 1), to: new Date(ly, lm, getDaysInMonth(ly, lm)) };
    }
    case 'last_3': return { from: new Date(y, m - 3, d), to: new Date(y, m, d) };
    case 'last_6': return { from: new Date(y, m - 6, d), to: new Date(y, m, d) };
    case 'custom': return { from: customFrom || new Date(y, m, 1), to: customTo || new Date(y, m, d) };
    default: return { from: new Date(y, m, 1), to: new Date(y, m, d) };
  }
};

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');
const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const formatDisplay = (d) => `${pad(d.getDate())} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
const toQueryDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// ─── Responsive scale ─────────────────────────────────────────────────────
const { width: W, height: SH } = Dimensions.get("window");
const S = (n) => Math.round(PixelRatio.roundToNearestPixel(n * (W / 375)));

const ACCENT = Colors.finance_accent || "#D4A843";
const FG = Colors.finance_text || "#1A1A2E";
const SURFACE = Colors.white || "#FFFFFF";
const BG = Colors.bg || "#F4F5F7";
const CARD_BG = Colors.homebg || "#FFFFFF";

// ─── Payment mode config ──────────────────────────────────────────────────
const PAYMENT_MODES = [
  { key: "upi", label: "UPI", hint: "Instant transfer" },
  { key: "imps", label: "IMPS", hint: "Real-time transfer" },
  { key: "neft", label: "NEFT", hint: "2–4 hrs transfer" },
  { key: "bank", label: "Bank", hint: "Bank transfer" },
];

// ─── Compact text-only pill ───────────────────────────────────────────────
const ModePill = ({ mode, isActive, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const pressIn = () => Animated.spring(scale, { toValue: 0.93, useNativeDriver: true }).start();
  const pressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

  return (
    <Animated.View style={[pillSt.wrap, { transform: [{ scale }] }]}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={[pillSt.pill, isActive && pillSt.pillActive]}
      >
        {isActive && <View style={pillSt.dot} />}
        <Text style={[pillSt.label, isActive && pillSt.labelActive]}>
          {mode.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const pillSt = StyleSheet.create({
  wrap: { flex: 1 },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S(4),
    paddingVertical: S(9),
    paddingHorizontal: S(6),
    borderRadius: S(10),
    borderWidth: 1,
    borderColor: "rgba(212,176,106,0.28)",
    // ── KEY: always white background ──
    backgroundColor: SURFACE,
  },
  pillActive: {
    // Tinted white — very subtle gold wash on white
    backgroundColor: SURFACE,
    borderColor: ACCENT,
    borderWidth: 1.5,
  },
  dot: {
    width: S(5),
    height: S(5),
    borderRadius: S(3),
    backgroundColor: ACCENT,
  },
  label: {
    // ── matches field label: same font, same size ──
    fontSize: S(12),
    fontFamily: Fonts.Bold,
    color: "#B0B0B0",
    letterSpacing: 0.2,
    includeFontPadding: false,
    lineHeight: S(16),
  },
  labelActive: {
    color: ACCENT,
  },
});

// ─── Field label — single source of truth ────────────────────────────────
// All labels: same font (Fonts.Bold), same size (S(12)), same colour (FG)
const FieldLabel = ({ text }) => (
  <Text style={st.fieldLabel}>{text}</Text>
);

// ─── Filter Sheet Component ───────────────────────────────────────────────────
const FilterSheet = ({ visible, onClose, onApply, activeFilters, startDate, endDate, onOpenCal }) => {
  const slideA = useRef(new Animated.Value(SH)).current;
  const backdropA = useRef(new Animated.Value(0)).current;
  const [local, setLocal] = useState(activeFilters);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 10,
      onPanResponderMove: (_, { dy }) => { if (dy > 0) slideA.setValue(dy); },
      onPanResponderRelease: (_, { dy }) => {
        if (dy > 120) onClose();
        else Animated.spring(slideA, { toValue: 0, bounciness: 5, useNativeDriver: true }).start();
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      setLocal(activeFilters);
      Animated.parallel([
        Animated.spring(slideA, { toValue: 0, bounciness: 2, speed: 18, useNativeDriver: true }),
        Animated.timing(backdropA, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideA, { toValue: SH, duration: 260, useNativeDriver: true }),
        Animated.timing(backdropA, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const activeCount = local.date !== DEFAULT_FILTERS.date ? 1 : 0;
  const isCustomDate = local.date === 'custom';
  const today = new Date();
  today.setHours(23, 59, 59, 999); // allow today
  const isFuture = isCustomDate && (startDate > today || endDate > today);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[FST.backdrop, { opacity: backdropA }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>
      <Animated.View style={[FST.sheet, { transform: [{ translateY: slideA }] }]} {...panResponder.panHandlers}>
        <View style={FST.handle} />
        <View style={FST.header}>
          <Text style={FST.title}>Filters</Text>
          <TouchableOpacity onPress={() => setLocal(DEFAULT_FILTERS)} style={FST.resetBtn}>
            <Icon name="refresh" size={S(12)} color={ACCENT} style={{ marginRight: S(4) }} />
            <Text style={FST.resetTxt}>Reset all</Text>
          </TouchableOpacity>
        </View>
        <View style={FST.body}>
          <View style={FST.navCol}>
            <View style={[FST.navItem, FST.navItemActive]}>
              <View style={[FST.navIconBox, { backgroundColor: ACCENT + '15' }]}>
                <Icon name="calendar-month-outline" size={S(15)} color={ACCENT} />
              </View>
              <Text style={[FST.navTxt, FST.navTxtActive]}>DATE</Text>
            </View>
          </View>
          <ScrollView style={FST.optCol} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: S(16) }}>
            <Text style={FST.optSectionLabel}>DATE RANGE</Text>
            {isCustomDate && (
              <View style={FST.customDateRow}>
                <DateFilterBtn label="From" date={startDate} onPress={() => onOpenCal('start')} />
                <View style={{ width: S(8) }} />
                <DateFilterBtn label="To" date={endDate} onPress={() => onOpenCal('end')} />
              </View>
            )}
            {DATE_OPTIONS.map((opt) => {
              const isSel = local.date === opt.key;
              return (
                <TouchableOpacity key={opt.key} style={[FST.optRow, isSel && FST.optRowActive]} onPress={() => setLocal({ date: opt.key })} activeOpacity={0.7}>
                  <View style={[FST.optIconBox, isSel && { backgroundColor: ACCENT + '15' }]}>
                    <Icon name={opt.icon} size={S(14)} color={isSel ? ACCENT : "#999"} />
                  </View>
                  <Text style={[FST.optTxt, isSel && FST.optTxtActive]}>{opt.label}</Text>
                  <View style={isSel ? FST.radioOn : FST.radioOff}>{isSel && <View style={FST.radioInner} />}</View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        <View style={FST.footer}>
          <TouchableOpacity
            style={[FST.applyBtn, isFuture && { opacity: 0.5 }]}
            onPress={() => !isFuture && onApply(local)}
            activeOpacity={isFuture ? 1 : 0.88}
            disabled={isFuture}
          >
            <Text style={FST.applyTxt}>Apply Filters</Text>
            {activeCount > 0 && <View style={FST.badge}><Text style={FST.badgeTxt}>{activeCount}</Text></View>}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

const DateFilterBtn = ({ label, date, onPress }) => {
  const sa = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: sa }] }}>
      <TouchableOpacity style={st.datePill} activeOpacity={0.9} onPress={() => { buttonPress(sa).start(); onPress(); }}>
        <Icon name="calendar-month" size={S(18)} color={ACCENT} style={{ marginRight: S(8) }} />
        <View style={{ flex: 1 }}>
          <Text style={st.datePillLabel}>{label}</Text>
          <Text style={st.datePillValue}>{formatDisplay(date)}</Text>
        </View>
        <Icon name="chevron-down" size={S(13)} color="#C4C4C4" />
      </TouchableOpacity>
    </Animated.View>
  );
};

const FilterPills = ({ filters, onRemove }) => {
  const pills = [];
  const dateOpt = DATE_OPTIONS.find(o => o.key === filters.date);
  if (filters.date !== 'this_month' && dateOpt) pills.push({ key: 'date', label: dateOpt.label, icon: 'calendar-range', color: ACCENT });
  if (!pills.length) return null;
  return (
    <View style={PIL.row}>
      {pills.map(p => (
        <View key={p.key} style={[PIL.pill, { backgroundColor: p.color + '12', borderColor: p.color + '28' }]}>
          <Icon name={p.icon} size={S(10)} color={p.color} style={{ marginRight: S(4) }} />
          <Text style={[PIL.txt, { color: p.color }]}>{p.label}</Text>
          <TouchableOpacity onPress={() => onRemove(p.key)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={{ marginLeft: S(5) }}>
            <Icon name="close-circle" size={S(12)} color={p.color} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};

const FST = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: SURFACE, borderTopLeftRadius: S(24), borderTopRightRadius: S(24), maxHeight: SH * 0.78, elevation: 24 },
  handle: { width: S(32), height: S(4), backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 2, alignSelf: 'center', marginTop: S(10), marginBottom: S(2) },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: S(20), paddingVertical: S(14), borderBottomWidth: 1, borderBottomColor: '#EEE' },
  title: { fontSize: S(17), fontFamily: Fonts.Bold, color: FG },
  resetBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S(12), paddingVertical: S(6), borderRadius: S(8), backgroundColor: ACCENT + '15' },
  resetTxt: { fontSize: S(12), fontFamily: Fonts.Bold, color: ACCENT },
  body: { flexDirection: 'row', flex: 1, maxHeight: SH * 0.52 },
  navCol: { width: S(82), borderRightWidth: 1, borderRightColor: '#EEE', paddingTop: S(10) },
  navItem: { paddingVertical: S(18), alignItems: 'center', paddingHorizontal: S(6) },
  navItemActive: { backgroundColor: '#F8F9FA' },
  navIconBox: { width: S(34), height: S(34), borderRadius: S(10), alignItems: 'center', justifyContent: 'center', marginBottom: S(5) },
  navTxt: { fontSize: S(9), fontFamily: Fonts.Medium, color: '#999', textAlign: 'center', letterSpacing: 0.3 },
  navTxtActive: { color: ACCENT, fontFamily: Fonts.Bold },
  optCol: { flex: 1, paddingHorizontal: S(14) },
  optSectionLabel: { fontSize: S(9), fontFamily: Fonts.Bold, color: '#999', letterSpacing: 1.2, marginBottom: S(10), textTransform: 'uppercase' },
  optRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: S(12), gap: S(10), borderRadius: S(10), paddingHorizontal: S(4) },
  optRowActive: { backgroundColor: ACCENT + '10', marginHorizontal: -S(4), paddingHorizontal: S(8) },
  optIconBox: { width: S(32), height: S(32), borderRadius: S(9), backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' },
  optTxt: { flex: 1, fontSize: S(13), fontFamily: Fonts.Medium, color: FG },
  optTxtActive: { color: ACCENT, fontFamily: Fonts.Bold },
  radioOff: { width: S(18), height: S(18), borderRadius: S(9), borderWidth: 1.5, borderColor: '#EEE' },
  radioOn: { width: S(18), height: S(18), borderRadius: S(9), borderWidth: 2, borderColor: ACCENT, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: S(8), height: S(8), borderRadius: S(4), backgroundColor: ACCENT },
  customDateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: S(16), paddingHorizontal: S(4) },
  footer: { paddingHorizontal: S(20), paddingTop: S(12), paddingBottom: S(20), borderTopWidth: 1, borderTopColor: '#EEE' },
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: FG, borderRadius: S(14), paddingVertical: S(15) },
  applyTxt: { color: SURFACE, fontSize: S(14), fontFamily: Fonts.Bold },
  badge: { marginLeft: S(8), backgroundColor: ACCENT, minWidth: S(20), height: S(20), borderRadius: S(10), alignItems: 'center', justifyContent: 'center', paddingHorizontal: S(4) },
  badgeTxt: { color: '#000', fontSize: S(9), fontFamily: Fonts.Bold },
});

const PIL = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: S(6), paddingHorizontal: S(16), marginBottom: S(8), marginTop: S(4), alignSelf: 'flex-start', width: '100%' },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: S(10), paddingVertical: S(5), borderRadius: S(20), borderWidth: 1 },
  txt: { fontSize: S(11), fontFamily: Fonts.Bold },
});



// ─── Reusable text input row ──────────────────────────────────────────────
const InputBox = ({ label, value, setValue, icon, placeholder, keyboardType, error, maxLength, filter }) => (
  <View style={st.fieldWrap}>
    <FieldLabel text={label} />
    <View style={[st.inputRow, error ? st.inputRowError : null]}>
      <TextInput
        value={value}
        onChangeText={(val) => {
          let v = val;
          if (filter === "alphanumeric") {
            v = v.replace(/[^a-zA-Z0-9]/g, "");
          } else if (keyboardType === "numeric" || keyboardType === "number-pad") {
            v = v.replace(/[^0-9]/g, "");
            if (v.startsWith("0")) v = v.replace(/^0+/, "");
          }
          setValue(v);
        }}
        keyboardType={keyboardType || "default"}
        placeholder={placeholder}
        placeholderTextColor="#C4C4C4"
        style={st.inputText}
        autoCapitalize="characters"
        maxLength={maxLength}
      />
      <Icon name={icon} size={S(18)} color={error ? "#EF4444" : ACCENT + "90"} />
    </View>
    {!!error && <Text style={st.errorTxt}>{error}</Text>}
  </View>
);

// ═══════════════════════════════════════════════════════════════════════════
//  OfflineTopup
// ═══════════════════════════════════════════════════════════════════════════
export default function OfflineTopup({ navigation }) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("upi");
  const [receiverBank, setReceiverBank] = useState("");
  const [utrNumber, setUtrNumber] = useState("");
  const [paymentDate, setPaymentDate] = useState("");
  const [banks, setBanks] = useState([]);
  const [banksLoading, setBanksLoading] = useState(false);
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [paymentProof, setPaymentProof] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState("info");
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [uploadVisible, setUploadVisible] = useState(false);
  const [errors, setErrors] = useState({});
  const [requests, setRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [topupStats, setTopupStats] = useState(null);

  // ── Filter State ──
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultTo = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const [startDate, setStartDate] = useState(defaultFrom);
  const [endDate, setEndDate] = useState(defaultTo);
  const [calVisible, setCalVisible] = useState(false);
  const [calTarget, setCalTarget] = useState('start');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filterVisible, setFilterVisible] = useState(false);

  const startDateRef = useRef(defaultFrom);
  const endDateRef = useRef(defaultTo);

  const activeModeHint = PAYMENT_MODES.find(m => m.key === mode)?.hint || "";

  const showAlert = (type, title, message) => {
    setAlertType(type); setAlertTitle(title); setAlertMessage(message); setAlertVisible(true);
  };

  const onDateConfirm = (selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const d = String(selectedDate.getDate()).padStart(2, "0");
      setPaymentDate(`${y}-${m}-${d}`);
      if (errors.paymentDate) setErrors(prev => ({ ...prev, paymentDate: null }));
    }
  };

  const fetchBanks = async () => {
    setBanksLoading(true);
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      const result = await getAllTopupBanks({ headerToken });
      const ok = result?.success === true || result?.status === "success" || result?.statusCode === 200;
      if (ok) setBanks(result.data || []);
    } catch (e) {
      console.log("Fetch banks error:", e);
    } finally {
      setBanksLoading(false);
    }
  };

  const fetchRequests = async (from, to) => {
    setRequestsLoading(true);
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      const [result, statsRes] = await Promise.all([
        getAllOfflineTopupRequests({
          headerToken,
          page: 1,
          limit: 10,
          from: from ? toQueryDate(from) : undefined,
          to: to ? toQueryDate(to) : undefined
        }),
        getOfflineTopupStats({ headerToken })
      ]);

      if (result?.success) setRequests(result.data || []);
      if (statsRes?.success) setTopupStats(statsRes.data);
    } catch (e) {
      console.log("Fetch requests/stats error:", e);
    } finally {
      setRequestsLoading(false);
      setRefreshing(false); // Reset both loaders
    }
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    setAmount("");
    setMode("upi");
    setReceiverBank("");
    setUtrNumber("");
    setPaymentDate("");
    setPaymentProof("");
    setErrors({});
    await Promise.all([fetchBanks(), fetchRequests(startDateRef.current, endDateRef.current)]);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchBanks();
    const period = resolvePeriod(filters.date, startDateRef.current, endDateRef.current);
    startDateRef.current = period.from;
    endDateRef.current = period.to;
    setStartDate(period.from);
    setEndDate(period.to);
    fetchRequests(period.from, period.to);
  }, []);

  const openCal = (target) => { setCalTarget(target); setCalVisible(true); };
  const onCalConfirm = (selectedDate) => {
    if (calTarget === 'start') { startDateRef.current = selectedDate; setStartDate(selectedDate); }
    else if (calTarget === 'end') { endDateRef.current = selectedDate; setEndDate(selectedDate); }
    else if (calTarget === 'payment') {
      const y = selectedDate.getFullYear();
      const m = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const d = String(selectedDate.getDate()).padStart(2, "0");
      setPaymentDate(`${y}-${m}-${d}`);
      if (errors.paymentDate) setErrors(prev => ({ ...prev, paymentDate: null }));
    }
    setCalVisible(false);
  };
  const onApplyFilters = (newFilters) => {
    setFilters(newFilters);
    setFilterVisible(false);
    const period = resolvePeriod(newFilters.date, startDateRef.current, endDateRef.current);
    startDateRef.current = period.from;
    endDateRef.current = period.to;
    setStartDate(period.from);
    setEndDate(period.to);
    fetchRequests(period.from, period.to);
  };
  const removeFilter = (key) => {
    onApplyFilters({ ...filters, [key]: DEFAULT_FILTERS[key] });
  };

  const handleCamera = async () => {
    try {
      // ── API 33+ handles permissions differently, but for older we still need check ──
      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: "Camera Permission",
          message: "App needs camera access to capture payment proof.",
          buttonNeutral: "Ask Me Later",
          buttonNegative: "Cancel",
          buttonPositive: "OK",
        }
      );

      if (granted === PermissionsAndroid.RESULTS.GRANTED || Platform.OS === 'ios') {
        const result = await launchCamera({
          mediaType: "photo",
          quality: 0.7,
          saveToPhotos: false,
          includeBase64: false,
        });

        if (result.didCancel) {
          console.log("User cancelled camera");
        } else if (result.errorCode) {
          console.log("Camera Error: ", result.errorMessage || result.errorCode);
          showAlert("error", "Camera Error", result.errorMessage || "Unable to open camera.");
        } else if (result.assets?.length) {
          const asset = result.assets[0];
          if (asset.fileSize > 200 * 1024) {
            setErrors(prev => ({ ...prev, paymentProof: "Image size must be less than 200 KB" }));
            setPaymentProof("");
            showAlert("error", "Image Too Large", "Selected image exceeds 200 KB limit. Please upload a smaller image.");
            return;
          }
          setPaymentProof(asset.uri);
          if (errors.paymentProof) setErrors(prev => ({ ...prev, paymentProof: null }));
        }
      } else {
        showAlert("error", "Permission Denied", "Camera permission is required to use this feature.");
      }
    } catch (err) {
      console.warn("Camera Error:", err);
      showAlert("error", "Error", "Unexpected error opening camera.");
    }
  };
  const handleGallery = () => launchImageLibrary({ mediaType: "photo", quality: 0.7, includeExtra: true }, (res) => {
    if (!res.didCancel && res.assets?.length) {
      const asset = res.assets[0];
      if (asset.fileSize > 200 * 1024) {
        setErrors(prev => ({ ...prev, paymentProof: "Image size must be less than 200 KB" }));
        setPaymentProof("");
        showAlert("error", "Image Too Large", "Selected image exceeds 200 KB limit. Please upload a smaller image.");
        return;
      }
      setPaymentProof(asset.uri);
      if (errors.paymentProof) setErrors(prev => ({ ...prev, paymentProof: null }));
    }
  });
  const handleFile = () => launchImageLibrary({ mediaType: "photo", quality: 0.7, includeExtra: true }, (res) => {
    if (!res.didCancel && res.assets?.length) {
      const asset = res.assets[0];
      if (asset.fileSize > 200 * 1024) {
        setErrors(prev => ({ ...prev, paymentProof: "Image size must be less than 200 KB" }));
        setPaymentProof("");
        showAlert("error", "Image Too Large", "Selected image exceeds 200 KB limit. Please upload a smaller image.");
        return;
      }
      setPaymentProof(asset.uri);
      if (errors.paymentProof) setErrors(prev => ({ ...prev, paymentProof: null }));
    }
  });

  const handleSubmit = async () => {
    let hasError = false;
    let newErrors = {};
    if (!amount) { newErrors.amount = "Amount is required"; hasError = true; }
    else if (Number(amount) <= 0) { newErrors.amount = "Amount must be greater than 0"; hasError = true; }
    else if (Number(amount) > 1000000) { newErrors.amount = "Max amount allowed is ₹10,00,000"; hasError = true; }

    if (!receiverBank) { newErrors.receiverBank = "Please select a receiver bank"; hasError = true; }
    if (!utrNumber) { newErrors.utrNumber = "UTR / Ref number is required"; hasError = true; }
    else {
      const isDuplicate = requests.some(req => req.utrNumber?.toUpperCase() === utrNumber.toUpperCase());
      if (isDuplicate) {
        newErrors.utrNumber = "This UTR number has already been used";
        hasError = true;
      }
    }
    if (!paymentDate) { newErrors.paymentDate = "Payment date is required"; hasError = true; }
    else if (new Date(paymentDate) > new Date()) { newErrors.paymentDate = "Future dates not allowed"; hasError = true; }
    if (!paymentProof) { newErrors.paymentProof = "Payment proof screenshot is required"; hasError = true; }

    setErrors(newErrors);
    if (hasError) return;

    setSubmitting(true);
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      const result = await addOfflineTopupRequest({ amount, mode, receiverBank, utrNumber, paymentDate, paymentProof, headerToken });
      if (result?.success) {
        setAmount("");
        setMode("upi");
        setReceiverBank("");
        setUtrNumber("");
        setPaymentDate("");
        setPaymentProof("");
        setErrors({});

        setReceiptData({
          status: "success",
          title: "Request Submitted",
          amount: amount,
          date: paymentDate,
          txn_ref: utrNumber,
          details: [
            { label: "Bank", value: selectedBankName },
            { label: "Payment Mode", value: mode?.toUpperCase() },
            { label: "UTR Number", value: utrNumber },
            { label: "Amount", value: `₹${amount}` },
          ],
          note: "Your topup request has been submitted and is pending approval (usually within 2-4 hours)."
        });
        fetchRequests(); // Automatically refresh list
      } else {
        showAlert("error", "Submission Failed", result?.message || "Unable to submit. Please try again.");
      }
    } catch (e) {
      showAlert("error", "Unexpected Error", "Something went wrong. Please try again later.");
    } finally { setSubmitting(false); }
  };

  const selectedBankName = banks.find((b) => b._id === receiverBank)?.bankName;

  return (
    <SafeAreaView style={st.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.scroll}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ACCENT}
            colors={[ACCENT]}
            progressBackgroundColor="#FFF"
          />
        }
      >
        <HeaderBar title="Topup Request" onBack={() => navigation.goBack()} />

        <View style={st.card}>
          <Text style={st.cardTitle}>Submit Topup Request</Text>

          {/* ── Amount ── */}
          <InputBox
            label="Amount (₹)"
            placeholder="Enter amount"
            value={amount}
            setValue={(val) => {
              let cleaned = val.replace(/[^0-9]/g, "");
              if (cleaned.startsWith("0")) cleaned = cleaned.replace(/^0+/, "");
              
              if (cleaned !== "" && Number(cleaned) > 1000000) {
                setErrors(prev => ({ ...prev, amount: "Max amount allowed is ₹10,00,000" }));
                return;
              }
              setAmount(cleaned);
              if (errors.amount) setErrors(prev => ({ ...prev, amount: null }));
            }}
            icon="currency-inr"
            keyboardType="numeric"
            error={errors.amount}
          />

          {/* ── Payment Mode ── */}
          <View style={st.fieldWrap}>
            {/* label row: same FieldLabel + inline hint */}
            <View style={st.modeLabelRow}>
              <FieldLabel text="Payment Mode" />
              <Text style={st.modeHintTxt}>{activeModeHint}</Text>
            </View>

            <View style={st.pillRow}>
              {PAYMENT_MODES.map((m) => (
                <ModePill
                  key={m.key}
                  mode={m}
                  isActive={mode === m.key}
                  onPress={() => setMode(m.key)}
                />
              ))}
            </View>
          </View>

          {/* ── Receiver Bank ── */}
          <View style={st.fieldWrap}>
            <FieldLabel text="Receiver Bank" />
            <TouchableOpacity
              style={[st.inputRow, errors.receiverBank ? st.inputRowError : null]}
              onPress={() => {
                if (errors.receiverBank) setErrors(prev => ({ ...prev, receiverBank: null }));
                setBankModalVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[st.inputText, { color: receiverBank ? FG : "#C4C4C4", paddingVertical: S(11) }]}
                numberOfLines={1}
              >
                {selectedBankName || "Choose a Bank"}
              </Text>
              <Icon name="chevron-down" size={S(18)} color={errors.receiverBank ? "#EF4444" : ACCENT + "90"} />
            </TouchableOpacity>
            {!!errors.receiverBank && <Text style={st.errorTxt}>{errors.receiverBank}</Text>}
          </View>

          {/* ── UTR ── */}
          <InputBox
            label="UTR / Ref Number"
            placeholder="e.g., 6545654323"
            value={utrNumber}
            setValue={(val) => {
              setUtrNumber(val);
              if (errors.utrNumber) setErrors(prev => ({ ...prev, utrNumber: null }));
            }}
            icon="text-box-search-outline"
            keyboardType="default"
            maxLength={20}
            filter="alphanumeric"
            autoCapitalize="characters"
            error={errors.utrNumber}
          />

          {/* ── Payment Date ── */}
          <View style={st.fieldWrap}>
            <FieldLabel text="Payment Date" />
            <TouchableOpacity
              style={[st.inputRow, errors.paymentDate ? st.inputRowError : null]}
              onPress={() => {
                if (errors.paymentDate) setErrors(prev => ({ ...prev, paymentDate: null }));
                openCal('payment');
              }}
              activeOpacity={0.7}
            >
              <Text style={[st.inputText, { color: paymentDate ? FG : "#C4C4C4", paddingVertical: S(11) }]}>
                {paymentDate || "YYYY-MM-DD"}
              </Text>
              <Icon name="calendar" size={S(18)} color={errors.paymentDate ? "#EF4444" : ACCENT + "90"} />
            </TouchableOpacity>
            {!!errors.paymentDate && <Text style={st.errorTxt}>{errors.paymentDate}</Text>}
          </View>
          <CalendarModal
            visible={calVisible}
            title={calTarget === 'start' ? 'Select Start Date' : 'Select End Date'}
            initialDate={calTarget === 'start' ? startDate : endDate}
            minDate={calTarget === 'end' ? startDate : null}
            maxDate={new Date()}
            onConfirm={onCalConfirm}
            onCancel={() => setCalVisible(false)}
          />

          {/* ── Payment Proof ── */}
          <View style={st.fieldWrap}>
            <FieldLabel text="Payment Proof" />
            <TouchableOpacity
              style={[st.inputRow, errors.paymentProof ? st.inputRowError : paymentProof && !errors.paymentProof ? st.inputRowGreen : null]}
              onPress={() => {
                if (errors.paymentProof) setErrors(prev => ({ ...prev, paymentProof: null }));
                setUploadVisible(true);
              }}
              activeOpacity={0.7}
            >
              <Text style={[
                st.inputText,
                {
                  color: paymentProof ? "#16A34A" : "#C4C4C4",
                  fontFamily: paymentProof ? Fonts.Bold : Fonts.Medium,
                  paddingVertical: S(11),
                },
              ]}>
                {paymentProof ? "✓  Proof Attached" : "Upload Payment Screenshot"}
              </Text>
              <Icon
                name={paymentProof ? "check-circle" : "camera-plus-outline"}
                size={S(18)}
                color={errors.paymentProof ? "#EF4444" : paymentProof ? "#16A34A" : ACCENT + "90"}
              />
            </TouchableOpacity>
            {!!errors.paymentProof && <Text style={st.errorTxt}>{errors.paymentProof}</Text>}

            {!!paymentProof && (
              <View style={st.previewBox}>
                <Image source={{ uri: paymentProof }} style={st.previewImg} />
                <View style={st.chipRow}>
                  <TouchableOpacity style={st.actionChip} onPress={() => setUploadVisible(true)}>
                    <Icon name="pencil" size={S(11)} color="#fff" />
                    <Text style={st.actionChipTxt}>Change</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[st.actionChip, st.removeChipBg]} onPress={() => setPaymentProof("")}>
                    <Icon name="delete" size={S(11)} color="#fff" />
                    <Text style={st.actionChipTxt}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* ── Submit ── */}
          <TouchableOpacity onPress={handleSubmit} style={st.submitWrap} disabled={submitting} activeOpacity={0.85}>
            <LinearGradient
              colors={[ACCENT, "#C29A47"]}
              style={st.submitBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Icon name="send" size={S(15)} color="#000" />
              <Text style={st.submitTxt}>Submit Request</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ── Topup Stats ── */}
        {topupStats && (
          <View style={statsGridStyles.container}>
            <View style={statsGridStyles.row}>
              <View style={[statsGridStyles.card, { borderLeftColor: "#D97706" }]}>
                <Text style={statsGridStyles.val}>{topupStats.pending?.count || 0}</Text>
                <Text style={statsGridStyles.amt}>₹{topupStats.pending?.amount || 0}</Text>
                <Text style={statsGridStyles.lbl}>PENDING</Text>
              </View>
              <View style={[statsGridStyles.card, { borderLeftColor: "#16A34A" }]}>
                <Text style={statsGridStyles.val}>{topupStats.approved?.count || 0}</Text>
                <Text style={statsGridStyles.amt}>₹{topupStats.approved?.amount || 0}</Text>
                <Text style={statsGridStyles.lbl}>APPROVED</Text>
              </View>
            </View>
            <View style={statsGridStyles.row}>
              <View style={[statsGridStyles.card, { borderLeftColor: "#DC2626" }]}>
                <Text style={statsGridStyles.val}>{topupStats.rejected?.count || 0}</Text>
                <Text style={statsGridStyles.amt}>₹{topupStats.rejected?.amount || 0}</Text>
                <Text style={statsGridStyles.lbl}>REJECTED</Text>
              </View>
              <View style={[statsGridStyles.card, { borderLeftColor: ACCENT }]}>
                <Text style={statsGridStyles.val}>{topupStats.total?.count || 0}</Text>
                <Text style={statsGridStyles.amt}>₹{topupStats.total?.amount || 0}</Text>
                <Text style={statsGridStyles.lbl}>TOTAL</Text>
              </View>
            </View>
          </View>
        )}

        {/* ── Requests History ── */}
        <View style={st.historySection}>
          <View style={st.historyHeaderRow}>
            <View style={st.historyHeaderLeft}>
              <Icon name="clock-outline" size={S(16)} color={FG} />
              <Text style={st.historyHeaderTitle}>Recent Requests</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: S(10) }}>
              <TouchableOpacity onPress={() => setFilterVisible(true)} style={[st.filterBtn, filters.date !== 'this_month' && st.filterBtnActive]}>
                <Icon name="filter-variant" size={S(16)} color={filters.date !== 'this_month' ? SURFACE : ACCENT} />
              </TouchableOpacity>
              <View style={st.historyCountBadge}>
                <Text style={st.historyCountTxt}>{requests.length}</Text>
              </View>
            </View>
          </View>
          <FilterPills filters={filters} onRemove={removeFilter} />

          {requestsLoading ? (
            <ActivityIndicator size="small" color={ACCENT} style={{ marginVertical: S(30) }} />
          ) : requests.length > 0 ? (
            requests.map((item) => {
              const status = (item.status || "pending").toLowerCase();
              const isApproved = status === "approved";
              const isRejected = status === "rejected";
              const statusColor = isApproved ? "#16A34A" : isRejected ? "#DC2626" : "#D97706";
              const statusBg = isApproved ? "#F0FDF4" : isRejected ? "#FEF2F2" : "#FFFBEB";
              const statusIcon = isApproved ? "check-circle" : isRejected ? "close-circle" : "timer-sand";

              return (
                <View key={item._id} style={st.transactionCard}>
                  {/* Card Header: Amount & Status */}
                  <View style={st.cardHeaderTop}>
                    <View style={st.amtColumn}>
                      <Text style={st.amtSymbol}>₹<Text style={st.amtVal}>{item.amount}</Text></Text>
                      <Text style={st.dateLabel}>
                        {new Date(item.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                        })}
                      </Text>
                    </View>
                    <View style={[st.cardStatusPill, { backgroundColor: statusBg, borderColor: statusColor + "20" }]}>
                      <Icon name={statusIcon} size={S(11)} color={statusColor} style={{ marginRight: S(4) }} />
                      <Text style={[st.cardStatusTxt, { color: statusColor }]}>
                        {status.toUpperCase()}
                      </Text>
                    </View>
                  </View>

                  {/* Card Divider */}
                  <View style={st.cardInnerDivider} />

                  {/* Card Body: Details */}
                  <View style={st.cardDetailsGrid}>
                    <View style={st.detailItem}>
                      <Text style={st.detailLabel}>REFERENCE ID</Text>
                      <Text style={st.detailValue} numberOfLines={1}>{item.referenceId}</Text>
                    </View>
                    <View style={[st.detailItem, { alignItems: "flex-end" }]}>
                      <Text style={st.detailLabel}>PAYMENT MODE</Text>
                      <View style={st.modeGroup}>
                        {item.mode === "upi" ? (
                          <UpiIconSVG width={S(12)} height={S(12)} />
                        ) : (
                          <Icon name="bank-outline" size={S(10)} color={FG + "70"} />
                        )}
                        <Text style={st.detailValue}>{(item.mode || "N/A").toUpperCase()}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={[st.cardDetailsGrid, { marginTop: S(8) }]}>
                    <View style={st.detailItem}>
                      <Text style={st.detailLabel}>UTR / TRANS NO</Text>
                      <Text style={st.detailValue}>{item.utrNumber}</Text>
                    </View>
                  </View>

                  {isRejected && !!item.rejectionReason && (
                    <View style={st.rejectionBox}>
                      <Icon name="information-outline" size={S(14)} color="#DC2626" style={{ marginTop: S(2) }} />
                      <View style={{ flex: 1 }}>
                        <Text style={st.rejectionTxt}>{item.rejectionReason}</Text>
                        {!!item.rejectedAt && (
                          <Text style={st.rejectionTimeTxt}>
                            Rejected on: {new Date(item.rejectedAt).toLocaleDateString("en-IN", {
                              day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
                            })}
                          </Text>
                        )}
                      </View>
                    </View>
                  )}
                </View>
              );
            })
          ) : (
            <View style={st.emptyStateBox}>
              <View style={st.emptyIconCircle}>
                <Icon name="history" size={S(32)} color="#D1D5DB" />
              </View>
              <Text style={st.emptyTitle}>No transaction history</Text>
              <Text style={st.emptySubtitle}>Your offline topup requests will appear here</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* ─── Bank bottom sheet ─── */}
      <Modal visible={bankModalVisible} transparent animationType="slide" onRequestClose={() => setBankModalVisible(false)}>
        <View style={st.overlay}>
          <View style={st.sheetCard}>
            <View style={st.sheetHandle} />
            <Text style={st.sheetTitle}>Choose Receiver Bank</Text>

            {banksLoading && <ActivityIndicator size="small" color={ACCENT} style={{ marginBottom: S(10) }} />}
            {!banksLoading && banks.length === 0 && (
              <Text style={st.sheetEmpty}>No banks found.</Text>
            )}

            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ maxHeight: S(260), width: "100%" }}
              contentContainerStyle={{ paddingBottom: S(10) }}
            >
              {banks.map((b) => (
                <TouchableOpacity
                  key={b._id}
                  style={[st.bankRow, receiverBank === b._id && st.bankRowActive]}
                  onPress={() => { setReceiverBank(b._id); setBankModalVisible(false); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[st.bankName, receiverBank === b._id && { color: ACCENT }]} numberOfLines={1}>
                      {b.bankName}
                    </Text>
                    <Text style={st.bankSub}>{b.accountHolderName}  ·  {b.accountNumber}</Text>
                  </View>
                  {receiverBank === b._id && <Icon name="check-circle" size={S(16)} color={ACCENT} />}
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TouchableOpacity style={st.sheetCloseBtn} onPress={() => setBankModalVisible(false)}>
              <Text style={st.sheetCloseTxt}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <FullScreenLoader visible={submitting} label="Submitting Request..." />

      {/* ─── Alerts ─── */}
      <CustomAlert
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onClose={() => {
          setAlertVisible(false);
          if (alertType === "success") setTimeout(() => navigation.goBack(), 120);
        }}
      />
      <ImageUploadAlert
        visible={uploadVisible}
        onClose={() => setUploadVisible(false)}
        onCamera={handleCamera}
        onGallery={handleGallery}
        onFile={handleFile}
      />

      <ReceiptModal
        visible={!!receiptData}
        onClose={() => setReceiptData(null)}
        navigation={navigation}
        data={receiptData}
      />

      <FilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={onApplyFilters}
        activeFilters={filters}
        startDate={startDate}
        endDate={endDate}
        onOpenCal={openCal}
      />
    </SafeAreaView>
  );
}

// ─── Unified stylesheet ───────────────────────────────────────────────────
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scroll: { alignItems: "center", paddingBottom: S(40) },

  // ── Card ─────────────────────────────────────────────────────────────
  card: {
    width: "92%",
    backgroundColor: CARD_BG,
    borderRadius: S(18),
    padding: S(18),
    marginTop: S(16),
  },
  cardTitle: {
    fontSize: S(15),
    fontFamily: Fonts.Bold,
    color: FG,
    textAlign: "center",
    letterSpacing: 0.4,
    marginBottom: S(4),
  },

  // ── Field wrapper ─────────────────────────────────────────────────────
  fieldWrap: { width: "100%", marginTop: S(16) },

  // ── UNIFIED field label ───────────────────────────────────────────────
  // Amount label, Payment Mode label, Receiver Bank label, UTR label,
  // Payment Date label, Payment Proof label — all share this one style.
  fieldLabel: {
    fontSize: S(12),          // same size everywhere
    fontFamily: Fonts.Bold,   // same weight everywhere
    color: FG,                // same colour everywhere
    marginBottom: S(7),
    letterSpacing: 0.2,
    includeFontPadding: false,
    lineHeight: S(16),
  },

  // ── Payment mode ──────────────────────────────────────────────────────
  modeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: S(8),       // overrides the fieldLabel marginBottom
  },
  modeHintTxt: {
    fontSize: S(10),
    fontFamily: Fonts.Medium,
    color: ACCENT,
    includeFontPadding: false,
    lineHeight: S(14),
  },
  pillRow: {
    flexDirection: "row",
    gap: S(7),
  },

  // ── Input row ─────────────────────────────────────────────────────────
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212,176,106,0.32)",
    borderRadius: S(11),
    backgroundColor: SURFACE,  // always white
    paddingHorizontal: S(12),
  },
  inputRowGreen: {
    borderColor: "#16A34A",
    backgroundColor: "#F0FDF4",
  },
  inputText: {
    flex: 1,
    fontSize: S(13),
    color: FG,
    fontFamily: Fonts.Medium,
    paddingVertical: S(11),
    includeFontPadding: false,
  },
  inputRowError: {
    borderColor: "#EF4444",
  },
  errorTxt: {
    color: "#EF4444",
    fontSize: S(10),
    fontFamily: Fonts.Medium,
    marginTop: S(4),
  },

  // ── Proof preview ─────────────────────────────────────────────────────
  previewBox: {
    marginTop: S(10),
    borderRadius: S(12),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.07)",
  },
  previewImg: { width: "100%", height: S(170), resizeMode: "cover" },
  chipRow: {
    position: "absolute",
    top: S(10), right: S(10),
    flexDirection: "row",
    gap: S(8),
  },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: S(4),
    backgroundColor: "rgba(0,0,0,0.52)",
    borderRadius: S(20),
    paddingHorizontal: S(10),
    paddingVertical: S(5),
  },
  removeChipBg: {
    backgroundColor: "rgba(220, 38, 38, 0.85)",
  },
  actionChipTxt: { color: "#fff", fontSize: S(11), fontFamily: Fonts.Medium },

  // ── Submit ────────────────────────────────────────────────────────────
  submitWrap: { marginTop: S(22) },
  submitBtn: {
    borderRadius: S(12),
    paddingVertical: S(14),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S(7),
  },
  submitTxt: {
    color: "#000",
    fontFamily: Fonts.Bold,
    fontSize: S(14),
    letterSpacing: 0.4,
  },

  // ── Bank bottom sheet ─────────────────────────────────────────────────
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheetCard: {
    backgroundColor: SURFACE,
    borderTopLeftRadius: S(22),
    borderTopRightRadius: S(22),
    padding: S(18),
    paddingTop: S(10),
    alignItems: "center",
  },
  sheetHandle: {
    width: S(36), height: S(4),
    borderRadius: S(2),
    backgroundColor: "#E5E7EB",
    marginBottom: S(14),
  },
  sheetTitle: {
    fontSize: S(15),
    fontFamily: Fonts.Bold,
    color: FG,
    marginBottom: S(14),
    alignSelf: "flex-start",
  },
  sheetEmpty: {
    color: "#999",
    marginVertical: S(10),
    fontFamily: Fonts.Medium,
    fontSize: S(13),
  },
  bankRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: S(12),
    paddingHorizontal: S(4),
    borderBottomWidth: 1,
    borderColor: "rgba(0,0,0,0.04)",
    gap: S(8),
  },
  bankRowActive: { backgroundColor: ACCENT + "0E", borderRadius: S(8) },
  bankName: { fontSize: S(13), fontFamily: Fonts.Bold, color: FG },
  bankSub: { fontSize: S(10), fontFamily: Fonts.Medium, color: "#9CA3AF", marginTop: S(2) },
  sheetCloseBtn: {
    marginTop: S(14),
    paddingVertical: S(12),
    width: "100%",
    alignItems: "center",
    backgroundColor: "#F5F5F7",
    borderRadius: S(12),
  },
  sheetCloseTxt: { fontFamily: Fonts.Bold, color: FG, fontSize: S(13) },

  historySection: { width: "92%", marginBottom: S(10) },
  historyHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: S(15), paddingHorizontal: S(4) },
  historyHeaderLeft: { flexDirection: "row", alignItems: "center", gap: S(8) },
  historyHeaderTitle: { fontSize: S(14), fontFamily: Fonts.Bold, color: FG, letterSpacing: 0.3 },
  historyCountBadge: { backgroundColor: SURFACE, borderWidth: 1, borderColor: "rgba(0,0,0,0.06)", borderRadius: S(8), paddingHorizontal: S(8), paddingVertical: S(2) },
  historyCountTxt: { fontSize: S(11), fontFamily: Fonts.Bold, color: FG },

  transactionCard: { backgroundColor: SURFACE, borderRadius: S(16), padding: S(14), marginBottom: S(12), elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: S(6), borderWidth: 1, borderColor: "rgba(0,0,0,0.03)" },
  cardHeaderTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  amtColumn: { gap: S(2) },
  amtSymbol: { fontSize: S(13), fontFamily: Fonts.Bold, color: ACCENT },
  amtVal: { fontSize: S(19), color: FG },
  dateLabel: { fontSize: S(10), fontFamily: Fonts.Medium, color: "#9CA3AF" },
  cardStatusPill: { flexDirection: "row", alignItems: "center", paddingHorizontal: S(10), paddingVertical: S(5), borderRadius: S(100), borderWidth: 1 },
  cardStatusTxt: { fontSize: S(10), fontFamily: Fonts.Bold, letterSpacing: 0.5 },
  cardInnerDivider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: S(12), opacity: 0.8 },
  cardDetailsGrid: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  detailItem: { flex: 1 },
  detailLabel: { fontSize: S(9), fontFamily: Fonts.Bold, color: "#9CA3AF", letterSpacing: 0.8, marginBottom: S(4) },
  detailValue: { fontSize: S(12), fontFamily: Fonts.Bold, color: FG, letterSpacing: 0.2 },
  modeGroup: { flexDirection: "row", alignItems: "center", gap: S(5) },
  rejectionBox: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#FEF2F2", padding: S(10), borderRadius: S(8), marginTop: S(12), gap: S(8), borderWidth: 1, borderColor: "rgba(220,38,38,0.15)" },
  rejectionTxt: { fontSize: S(11), fontFamily: Fonts.Medium, color: "#991B1B", lineHeight: S(16) },
  rejectionTimeTxt: { fontSize: S(9), fontFamily: Fonts.Medium, color: "#DC2626", marginTop: S(4) },

  emptyStateBox: { alignItems: "center", justifyContent: "center", paddingVertical: S(50) },
  filterBtn: { width: S(32), height: S(32), borderRadius: S(8), backgroundColor: ACCENT + '15', alignItems: 'center', justifyContent: 'center' },
  filterBtnActive: { backgroundColor: ACCENT },
  datePill: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: S(12), paddingHorizontal: S(12), paddingVertical: S(8), borderWidth: 1, borderColor: '#EEE' },
  datePillLabel: { fontSize: S(8), fontFamily: Fonts.Bold, color: '#999', textTransform: 'uppercase' },
  datePillValue: { fontSize: S(11), fontFamily: Fonts.Bold, color: FG, marginTop: S(1) },
  emptyIconCircle: { width: S(64), height: S(64), borderRadius: S(32), backgroundColor: "#F3F4F6", alignItems: "center", justifyContent: "center", marginBottom: S(16) },
  emptyTitle: { fontSize: S(15), fontFamily: Fonts.Bold, color: FG, marginBottom: S(4) },
  emptySubtitle: { fontSize: S(12), fontFamily: Fonts.Medium, color: "#9CA3AF", textAlign: "center" },
});

const statsGridStyles = StyleSheet.create({
  container: {
    width: "92%",
    marginVertical: S(10),
    gap: S(8),
  },
  row: {
    flexDirection: "row",
    gap: S(8),
  },
  card: {
    flex: 1,
    backgroundColor: SURFACE,
    borderRadius: S(12),
    padding: S(10),
    borderLeftWidth: 3,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  val: {
    fontSize: S(14),
    fontFamily: Fonts.Bold,
    color: FG,
  },
  amt: {
    fontSize: S(10),
    fontFamily: Fonts.Bold,
    color: ACCENT,
    marginTop: S(1),
  },
  lbl: {
    fontSize: S(8),
    fontFamily: Fonts.Bold,
    color: "#9CA3AF",
    letterSpacing: 0.8,
    marginTop: S(1),
  },
});