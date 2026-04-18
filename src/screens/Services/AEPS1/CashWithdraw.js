import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  ScrollView,
  Animated,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Colors from "../../../constants/Colors";
import Fonts from "../../../constants/Fonts";
import { fadeIn, slideUp, buttonPress } from "../../../utils/ScreenAnimations";
import { fetchAepsBanks, aepsCashWithdraw } from "../../../api/AuthApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AlertService } from "../../../componets/Alerts/CustomAlert";
import * as NavigationService from "../../../utils/NavigationService";
import { ActivityIndicator } from "react-native";
import RDService, { RD_ERROR_CODES } from "./RDService";
import PaymentReceipt from "./PaymentReceipt";
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid } from "react-native";


// ─── Responsive Scaling ───────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get("window");
const BASE_W = 390;
const BASE_H = 844;
const scale = (s) => Math.round((SW / BASE_W) * s);
const vs = (s) => Math.round((SH / BASE_H) * s);
const rs = (s) => Math.round(Math.sqrt((SW * SH) / (BASE_W * BASE_H)) * s);

// Removed local parseBiometric, now using centralized RDService.parsePidXml

// ── Data ──────────────────────────────────────────────────────────────────────
// Removed hardcoded BANK_LIST

// ─── Device list comes from RDService.js ─────────────────────────────────────
const DEVICE_LIST = RDService.DEVICE_LIST;

// Quick amount chips
const QUICK_AMOUNTS = ["500", "1000", "2000", "5000", "10000"];

// ══════════════════════════════════════════════════════════════════════════════
//  CUSTOM SELECT PICKER
// ══════════════════════════════════════════════════════════════════════════════
const SelectPicker = ({
  label, required, placeholder, items, value, onChange,
  error, searchable = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = items.find((i) => i.value === value);
  const filtered = searchable
    ? items.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()))
    : items;

  const handleOpen = () => { setSearch(""); setOpen(true); };
  const handleClose = () => setOpen(false);
  const handleSelect = (item) => { onChange(item.value); handleClose(); };

  return (
    <View style={sp.wrap}>
      <Text style={sp.label}>
        {required && <Text style={sp.required}>* </Text>}
        {label}
      </Text>

      <TouchableOpacity
        style={[sp.trigger, error && sp.triggerError]}
        onPress={handleOpen}
        activeOpacity={0.8}
      >
        <View style={sp.triggerLeft}>
          {selected ? (
            <>
              <Text style={sp.triggerIcon}>{selected.icon}</Text>
              <Text style={sp.triggerValue}>{selected.label}</Text>
            </>
          ) : (
            <Text style={sp.triggerPlaceholder}>{placeholder}</Text>
          )}
        </View>
        <View style={[sp.chevronBox, open && sp.chevronBoxActive]}>
          <Text style={[sp.chevron, open && sp.chevronActive]}>›</Text>
        </View>
      </TouchableOpacity>

      {error && <Text style={sp.errorTxt}>{error}</Text>}

      {selected && (
        <View style={sp.chip}>
          <View style={sp.chipDot} />
          <Text style={sp.chipTxt}>{selected.label}</Text>
          <TouchableOpacity
            onPress={() => onChange(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={sp.chipClear}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal visible={open} transparent animationType="slide" onRequestClose={handleClose}>
        <TouchableOpacity style={sp.backdrop} activeOpacity={1} onPress={handleClose} />
        <View style={sp.sheet}>
          <View style={sp.sheetHeader}>
            <View style={sp.handleBar} />
            <View style={sp.sheetTitleRow}>
              <Text style={sp.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={handleClose} style={sp.closeBtn}>
                <Text style={sp.closeBtnTxt}>✕</Text>
              </TouchableOpacity>
            </View>
            {searchable && (
              <View style={sp.searchRow}>
                <Text style={sp.searchIcon}>🔍</Text>
                <TextInput
                  style={sp.searchInput}
                  placeholder={`Search ${label.toLowerCase()}...`}
                  placeholderTextColor={Colors.gray_BD}
                  value={search}
                  onChangeText={setSearch}
                  autoFocus
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <Text style={sp.searchClear}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.value}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: vs(20) }}
            renderItem={({ item }) => {
              const isSel = item.value === value;
              return (
                <TouchableOpacity
                  style={[sp.listItem, isSel && sp.listItemSel]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.75}
                >
                  <View style={[sp.listIconBox, isSel && sp.listIconBoxSel]}>
                    <Text style={sp.listIcon}>{item.icon}</Text>
                  </View>
                  <Text style={[sp.listTxt, isSel && sp.listTxtSel]}>{item.label}</Text>
                  {isSel && (
                    <View style={sp.checkCircle}>
                      <Text style={sp.checkMark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={sp.emptyWrap}>
                <Text style={sp.emptyTxt}>No results found</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
const CashWithdraw = () => {
  const navigation = useNavigation();

  const [mobileNumber, setMobileNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [amount, setAmount] = useState("");
  const [bank, setBank] = useState(null);
  const [device, setDevice] = useState(null);
  const [errors, setErrors] = useState({});
  const [bankList, setBankList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [banksLoading, setBanksLoading] = useState(true);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [txnDetails, setTxnDetails] = useState(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(vs(30))).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([fadeIn(fadeAnim, 500), slideUp(slideAnim, 500)]).start();
    loadBanks();
  }, []);

  const loadBanks = async () => {
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      const headerKey = await AsyncStorage.getItem("header_key");
      const res = await fetchAepsBanks({ headerToken, headerKey });

      if (res.success || res.status === "SUCCESS" || Array.isArray(res.data)) {
        // Try to find the array in common fields
        const rawList = Array.isArray(res.data) ? res.data : (res.banks || res.bankList || []);
        const mapped = rawList.map(b => ({
          label: b.name || b.bankName || "Unknown Bank",
          value: b._id || b.bankId || b.id || b.bankCode,
          icon: "🏦"
        }));
        setBankList(mapped);
      }
    } catch (err) {
      console.log("Error loading banks:", err);
    } finally {
      setBanksLoading(false);
    }
  };

  const validate = () => {
    const e = {};
    const mob = mobileNumber.trim();
    const aadh = aadhaarNumber.trim();
    const amt = amount.trim();

    if (!mob) e.mobile = "Please enter mobile number";
    else if (!/^[6-9]\d{9}$/.test(mob)) e.mobile = "Please enter a valid 10-digit mobile number";

    if (!aadh) e.aadhaar = "Please enter Aadhaar number";
    else if (!/^\d{12}$/.test(aadh)) e.aadhaar = "Aadhaar number must be exactly 12 digits";

    if (!amt || Number(amt) <= 0) e.amount = "Please enter a valid withdrawal amount";
    else if (Number(amt) < 100) e.amount = "Minimum withdrawal amount is ₹100";
    else if (Number(amt) > 10000) e.amount = "Maximum withdrawal amount is ₹10,000";

    if (!bank) e.bank = "Please select a bank from the list";
    if (!device) e.device = "Please select your biometric device";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const getLocation = () =>
    new Promise((resolve) => {
      Geolocation.getCurrentPosition(
        (pos) => resolve(pos.coords),
        (err) => {
          console.log('[GEOLOCATION] Error:', err);
          resolve({ latitude: 26.889829, longitude: 75.738331 });
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
      );
    });

  const handleSubmit = async () => {
    if (!validate()) return;

    try {
      setLoading(true);

      // 1. Location Permission
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert('Permission Denied', 'Location permission is required for transactions.');
          setLoading(false);
          return;
        }
      }

      buttonPress(btnScale).start();

      // 2. Capture Fingerprint
      const pidData = await RDService.capture(device);
      if (!pidData) {
        throw new Error("No biometric data captured");
      }

      // 3. Get Location
      const coords = await getLocation();

      // 4. API Details
      const headerToken = await AsyncStorage.getItem("header_token");
      const headerKey = await AsyncStorage.getItem("header_key");
      const idempotencyKey = `CW_${Date.now()}`;

      const selectedBank = bankList.find(b => b.value === bank);
      const bankName = selectedBank ? selectedBank.label : "Unknown Bank";

      const payload = {
        aadhaar: String(aadhaarNumber),
        mobile: String(mobileNumber),
        amount: String(amount),
        bankId: bank,
        latitude: Number(coords.latitude),
        longitude: Number(coords.longitude),
        captureType: 'finger',
        biometricData: RDService.parsePidXml(pidData),
      };

      const res = await aepsCashWithdraw({
        data: payload,
        headerToken,
        headerKey,
        idempotencyKey
      });

      if (res.success || res.status === "SUCCESS") {
        setReceiptData(res);
        setTxnDetails({ ...payload, bankName });
        setReceiptVisible(true);
      } else {
        AlertService.showAlert({
          type: "error",
          title: "Withdrawal Failed",
          message: res.message || "Unable to process cash withdrawal."
        });
      }
    } catch (err) {
      console.log("Withdrawal error:", err);
      let message = "Something went wrong. Please try again.";
      if (err?.code) {
        switch (err.code) {
          case RD_ERROR_CODES.NOT_INSTALLED:
            message = `RD Service app is not installed. Please install it for ${RDService.getDeviceLabel(device)}.`;
            break;
          case RD_ERROR_CODES.CANCELLED:
            message = "Fingerprint capture was cancelled.";
            break;
          case RD_ERROR_CODES.NO_PID:
            message = "No fingerprint data received. Please try again.";
            break;
          case RD_ERROR_CODES.ACTIVITY_NOT_FOUND:
            message = "Could not open RD Service. Ensure the device is connected and the app is installed.";
            break;
          case RD_ERROR_CODES.BUSY:
            message = "A fingerprint capture is already in progress.";
            break;
          default:
            message = err.message || message;
        }
      } else {
        message = err.message || message;
      }

      AlertService.showAlert({
        type: "error",
        title: "Error",
        message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* ══ HEADER ══ */}
        <Animated.View
          style={[styles.header, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}
        >
          <View style={styles.titleBlock}>
            <Text style={styles.titleWhite}>Cash</Text>
            <Text style={styles.titleAccent}>Withdraw</Text>
          </View>
          <Text style={styles.headerSub}>
            Instant cash withdrawal via{"\n"}Aadhaar-linked bank account
          </Text>
          <View style={styles.trustRow}>
            <View style={styles.trustPill}>
              <Text style={styles.trustIcon}>🔒</Text>
              <Text style={styles.trustTxt}>256-BIT ENCRYPTED</Text>
            </View>
            <View style={styles.trustPill}>
              <Text style={styles.trustIcon}>✚</Text>
              <Text style={styles.trustTxt}>RBI APPROVED</Text>
            </View>
          </View>
        </Animated.View>

        {/* ══ SCROLL BODY ══ */}
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ─── CONTAINER 1: Customer & Amount ─── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: Colors.accent + "18" }]}>
                <Text style={styles.cardIcon}>💸</Text>
              </View>
              <View>
                <Text style={styles.cardTitle}>Withdrawal Details</Text>
                <Text style={styles.cardSub}>Customer & amount information</Text>
              </View>
            </View>
            <View style={styles.divider} />

            {/* Mobile */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>
                <Text style={styles.required}>* </Text>MOBILE NUMBER
              </Text>
              <View style={[styles.inputRow, errors.mobile && styles.inputRowError]}>
                <Text style={styles.prefix}>+91</Text>
                <View style={styles.inputDivider} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter 10-digit mobile number"
                  placeholderTextColor={Colors.gray_BD}
                  keyboardType="number-pad"
                  maxLength={10}
                  value={mobileNumber}
                  onChangeText={(t) => setMobileNumber(t.replace(/[^0-9]/g, ""))}
                />
                <Text style={styles.inputSuffix}>📱</Text>
              </View>
              {errors.mobile && <Text style={styles.errorTxt}>{errors.mobile}</Text>}
            </View>

            {/* Aadhaar */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>
                <Text style={styles.required}>* </Text>AADHAAR NUMBER
              </Text>
              <View style={[styles.inputRow, errors.aadhaar && styles.inputRowError]}>
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="XXXX XXXX XXXX"
                  placeholderTextColor={Colors.gray_BD}
                  keyboardType="number-pad"
                  maxLength={12}
                  value={aadhaarNumber}
                  onChangeText={(t) => setAadhaarNumber(t.replace(/[^0-9]/g, ""))}
                />
                <Text style={styles.inputSuffix}>🪪</Text>
              </View>
              {errors.aadhaar && <Text style={styles.errorTxt}>{errors.aadhaar}</Text>}
            </View>

            {/* Amount */}
            <View style={styles.fieldWrap}>
              <Text style={styles.label}>
                <Text style={styles.required}>* </Text>WITHDRAWAL AMOUNT
              </Text>
              <View style={[styles.inputRow, errors.amount && styles.inputRowError]}>
                <Text style={styles.prefix}>₹</Text>
                <View style={styles.inputDivider} />
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder="Enter amount"
                  placeholderTextColor={Colors.gray_BD}
                  keyboardType="number-pad"
                  value={amount}
                  onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ""))}
                />
                {amount.length > 0 && (
                  <TouchableOpacity onPress={() => setAmount("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={styles.clearIcon}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
              {errors.amount && <Text style={styles.errorTxt}>{errors.amount}</Text>}

              {/* Quick amount chips */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.quickRow}
                contentContainerStyle={{ gap: scale(8), paddingRight: scale(4) }}
              >
                {QUICK_AMOUNTS.map((q) => (
                  <TouchableOpacity
                    key={q}
                    style={[styles.quickChip, amount === q && styles.quickChipActive]}
                    onPress={() => setAmount(q)}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.quickChipTxt, amount === q && styles.quickChipTxtActive]}>
                      ₹{Number(q).toLocaleString("en-IN")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Bank */}
            <SelectPicker
              label="SELECT BANK"
              required
              placeholder={banksLoading ? "Loading banks..." : "Choose your bank"}
              items={bankList}
              value={bank}
              onChange={setBank}
              error={errors.bank}
              searchable
            />
          </View>

          {/* ─── CONTAINER 2: Biometric Device ─── */}
          <View style={[styles.card, { marginTop: vs(14) }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: Colors.primary + "14" }]}>
                <Text style={styles.cardIcon}>🖐</Text>
              </View>
              <View>
                <Text style={styles.cardTitle}>Biometric Device</Text>
                <Text style={styles.cardSub}>Select your fingerprint scanner</Text>
              </View>
            </View>
            <View style={styles.divider} />

            <SelectPicker
              label="SELECT DEVICE"
              required
              placeholder="Choose biometric device"
              items={DEVICE_LIST}
              value={device}
              onChange={setDevice}
              error={errors.device}
            />

            <View style={styles.deviceInfo}>
              <Text style={styles.deviceInfoTxt}>
                🔒  Biometric data is processed locally and never stored on any server
              </Text>
            </View>
          </View>

          {/* ─── Amount summary strip ─── */}
          {amount.length > 0 && Number(amount) > 0 && (
            <View style={styles.summaryStrip}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLbl}>Withdrawal Amount</Text>
                <Text style={styles.summaryVal}>₹{Number(amount).toLocaleString("en-IN")}</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLbl}>Service Charge</Text>
                <Text style={styles.summaryVal}>₹0.00</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryRow}>
                <Text style={[styles.summaryLbl, { fontWeight: "800", color: Colors.primary }]}>Total Payable</Text>
                <Text style={[styles.summaryVal, { color: Colors.accent, fontSize: rs(16), fontWeight: "900" }]}>
                  ₹{Number(amount).toLocaleString("en-IN")}
                </Text>
              </View>
            </View>
          )}

          {/* Submit */}
          <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: vs(20) }}>
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.88}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <Text style={styles.buttonText}>Proceed to Withdraw  →</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.bottomNote}>
            By proceeding, you consent to biometric verification as per NPCI guidelines
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ─── SUCCESS RECEIPT POPUP ─── */}
      <Modal
        visible={receiptVisible}
        animationType="slide"
        onRequestClose={() => setReceiptVisible(false)}
      >
        <PaymentReceipt
          response={receiptData}
          details={txnDetails}
          type="Cash Withdrawal"
          onClose={() => {
            setReceiptVisible(false);
            setReceiptData(null);
            setTxnDetails(null);
            setAmount(""); // Clear amount on success
          }}
        />
      </Modal>
    </SafeAreaView>
  );
};

export default CashWithdraw;

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN STYLES
// ══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.primary },
  scroll: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { padding: scale(16), paddingBottom: vs(40) },

  // ── Header ──
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: scale(18),
    paddingTop: vs(14),
    paddingBottom: vs(22),
  },
  titleBlock: { flexDirection: "row", alignItems: "baseline", gap: scale(6), marginBottom: vs(6) },
  titleWhite: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(32), letterSpacing: 0.4 },
  titleAccent: { fontFamily: Fonts.Bold, color: Colors.kyc_accent, fontSize: rs(32), letterSpacing: 0.4 },
  headerSub: {
    fontFamily: Fonts.Medium,
    color: Colors.whiteOpacity_65, fontSize: rs(13),
    lineHeight: rs(20), marginBottom: vs(16),
  },
  trustRow: { flexDirection: "row", gap: scale(8) },
  trustPill: {
    flexDirection: "row", alignItems: "center", gap: scale(5),
    backgroundColor: Colors.whiteOpacity_10,
    borderWidth: 1, borderColor: Colors.whiteOpacity_18,
    borderRadius: scale(20),
    paddingHorizontal: scale(10), paddingVertical: vs(5),
  },
  trustIcon: { fontSize: rs(11) },
  trustTxt: { fontFamily: Fonts.Bold, color: Colors.whiteOpacity_80, fontSize: rs(10), fontWeight: "700", letterSpacing: 0.8 },

  // ── Cards ──
  card: {
    backgroundColor: Colors.homebg, borderRadius: scale(18), padding: scale(16),
    elevation: 3, shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: "row", alignItems: "center",
    gap: scale(10), marginBottom: vs(12),
  },
  cardIconWrap: {
    width: scale(40), height: scale(40), borderRadius: scale(12),
    alignItems: "center", justifyContent: "center",
  },
  cardIcon: { fontSize: rs(20) },
  cardTitle: { fontFamily: Fonts.Bold, fontSize: rs(15), color: Colors.primary },
  cardSub: { fontFamily: Fonts.Medium, fontSize: rs(12), color: Colors.gray_9E, marginTop: 1 },
  divider: { height: 1, backgroundColor: Colors.blackOpacity_05, marginBottom: vs(14) },

  // ── Inputs ──
  fieldWrap: { marginBottom: vs(14) },
  label: {
    fontFamily: Fonts.Bold, fontSize: rs(10), fontWeight: "700", color: Colors.gray_9E,
    letterSpacing: 0.9, marginBottom: vs(6),
  },
  required: { color: Colors.accent },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.white,
    borderRadius: scale(12),
    borderWidth: 1, borderColor: Colors.gray_EB,
    paddingHorizontal: scale(12),
    minHeight: vs(50),
  },
  inputRowError: { borderColor: Colors.red, borderWidth: 1 },
  prefix: { fontFamily: Fonts.Bold, color: Colors.primary, fontSize: rs(14), fontWeight: "700", marginRight: scale(4) },
  inputDivider: { width: 1, height: vs(18), backgroundColor: Colors.gray_E0, marginRight: scale(10) },
  input: { fontFamily: Fonts.Medium, flex: 1, fontSize: rs(14), color: Colors.gray_21, padding: 0 },
  inputSuffix: { fontSize: rs(18), marginLeft: scale(6) },
  clearIcon: { fontFamily: Fonts.Bold, color: Colors.gray_BD, fontSize: rs(16), fontWeight: "700", marginLeft: scale(6) },
  errorTxt: { fontFamily: Fonts.Light, color: Colors.red, fontSize: rs(10.5), marginTop: vs(3), fontWeight: "300" },

  // Quick amount chips
  quickRow: { marginTop: vs(10) },
  quickChip: {
    paddingHorizontal: scale(12), paddingVertical: vs(6),
    borderRadius: scale(20),
    backgroundColor: Colors.gray_F0,
    borderWidth: 1, borderColor: Colors.gray_E0,
  },
  quickChipActive: { backgroundColor: Colors.accent + "18", borderColor: Colors.accent },
  quickChipTxt: { fontFamily: Fonts.Medium, fontSize: rs(12), color: Colors.gray_75, fontWeight: "600" },
  quickChipTxtActive: { fontFamily: Fonts.Bold, color: Colors.accent, fontWeight: "800" },

  // Device info
  deviceInfo: {
    marginTop: vs(12), backgroundColor: Colors.bg_F8,
    borderRadius: scale(10), padding: scale(10),
  },
  deviceInfoTxt: { fontFamily: Fonts.Medium, color: Colors.gray_9E, fontSize: rs(11), fontWeight: "500", lineHeight: rs(17) },

  // Amount summary
  summaryStrip: {
    marginTop: vs(14), backgroundColor: Colors.white,
    borderRadius: scale(14), padding: scale(14),
    elevation: 2, shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 6,
  },
  summaryRow: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", paddingVertical: vs(6),
  },
  summaryDivider: { height: 1, backgroundColor: Colors.gray_F5 },
  summaryLbl: { fontFamily: Fonts.Medium, fontSize: rs(13), color: Colors.gray_9E, fontWeight: "600" },
  summaryVal: { fontFamily: Fonts.Bold, fontSize: rs(14), color: Colors.primary, fontWeight: "700" },

  // Button
  button: {
    backgroundColor: Colors.primary, paddingVertical: vs(14),
    borderRadius: scale(14), alignItems: "center",
    elevation: 3, shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  buttonDisabled: {
    backgroundColor: Colors.gray_BD,
    shadowOpacity: 0.1,
  },
  buttonText: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(15), letterSpacing: 0.3 },

  bottomNote: {
    fontFamily: Fonts.Regular, textAlign: "center", color: Colors.gray_BD, fontSize: rs(11),
    marginTop: vs(14), lineHeight: rs(17), paddingHorizontal: scale(10),
  },
});

// ══════════════════════════════════════════════════════════════════════════════
//  SELECT PICKER STYLES
// ══════════════════════════════════════════════════════════════════════════════
const sp = StyleSheet.create({
  wrap: { marginBottom: vs(4) },

  label: {
    fontFamily: Fonts.Bold, fontSize: rs(10), fontWeight: "700", color: Colors.gray_9E,
    letterSpacing: 0.9, marginBottom: vs(6),
  },
  required: { color: Colors.accent },

  trigger: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: Colors.gray_FA, borderRadius: scale(12),
    borderWidth: 1, borderColor: Colors.gray_EB,
    paddingHorizontal: scale(12), minHeight: vs(50),
  },
  triggerError: { borderColor: Colors.red, borderWidth: 1 },
  triggerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  triggerIcon: { fontSize: rs(18), marginRight: scale(8) },
  triggerValue: { fontFamily: Fonts.Bold, fontSize: rs(14), color: Colors.gray_21, fontWeight: "600" },
  triggerPlaceholder: { fontFamily: Fonts.Medium, fontSize: rs(14), color: Colors.gray_BD },

  chevronBox: {
    width: scale(28), height: scale(28), borderRadius: scale(8),
    backgroundColor: Colors.gray_F0, alignItems: "center", justifyContent: "center",
  },
  chevronBoxActive: { backgroundColor: Colors.accent + "18" },
  chevron: { fontFamily: Fonts.Medium, color: Colors.gray_9E, fontSize: rs(22), fontWeight: "500", marginTop: vs(-2) },
  chevronActive: { color: Colors.accent, transform: [{ rotate: "90deg" }] },

  chip: {
    flexDirection: "row", alignItems: "center",
    marginTop: vs(7),
    backgroundColor: Colors.accent + "12",
    borderRadius: scale(20),
    paddingHorizontal: scale(10), paddingVertical: vs(4),
    alignSelf: "flex-start", gap: scale(5),
    borderWidth: 1, borderColor: Colors.accent + "30",
  },
  chipDot: { width: scale(6), height: scale(6), borderRadius: scale(3), backgroundColor: Colors.accent },
  chipTxt: { fontFamily: Fonts.Bold, color: Colors.accent, fontSize: rs(12), fontWeight: "700" },
  chipClear: { fontFamily: Fonts.Bold, color: Colors.accent, fontSize: rs(13), fontWeight: "800", marginLeft: scale(2) },

  errorTxt: { fontFamily: Fonts.Light, color: Colors.red, fontSize: rs(10.5), marginTop: vs(4), fontWeight: "300" },

  backdrop: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: Colors.blackOpacity_45,
  },
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24),
    maxHeight: SH * 0.68,
    elevation: 20,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12,
  },
  sheetHeader: {
    paddingHorizontal: scale(16),
    paddingBottom: vs(10),
    borderBottomWidth: 1, borderBottomColor: Colors.gray_F0,
  },
  handleBar: {
    width: scale(40), height: vs(4), borderRadius: scale(2),
    backgroundColor: Colors.gray_E0, alignSelf: "center",
    marginTop: vs(10), marginBottom: vs(14),
  },
  sheetTitleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: vs(12),
  },
  sheetTitle: { fontFamily: Fonts.Bold, fontSize: rs(16), fontWeight: "800", color: Colors.primary },
  closeBtn: {
    width: scale(28), height: scale(28), borderRadius: scale(14),
    backgroundColor: Colors.gray_F4, alignItems: "center", justifyContent: "center",
  },
  closeBtnTxt: { fontFamily: Fonts.Bold, color: Colors.gray_66, fontSize: rs(12), fontWeight: "800" },

  searchRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.gray_F5, borderRadius: scale(10),
    paddingHorizontal: scale(10), marginBottom: vs(4),
    minHeight: vs(42),
  },
  searchIcon: { fontSize: rs(15), marginRight: scale(6) },
  searchInput: { fontFamily: Fonts.Medium, flex: 1, fontSize: rs(14), color: Colors.gray_21, padding: 0 },
  searchClear: { fontFamily: Fonts.Bold, color: Colors.gray_BD, fontSize: rs(14), fontWeight: "700" },

  listItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: scale(16), paddingVertical: vs(13),
    borderBottomWidth: 1, borderBottomColor: Colors.gray_F5,
    gap: scale(12),
  },
  listItemSel: { backgroundColor: Colors.accent + "08" },
  listIconBox: {
    width: scale(36), height: scale(36), borderRadius: scale(10),
    backgroundColor: Colors.gray_F5, alignItems: "center", justifyContent: "center",
  },
  listIconBoxSel: { backgroundColor: Colors.accent + "18" },
  listIcon: { fontSize: rs(18) },
  listTxt: { fontFamily: Fonts.Medium, flex: 1, fontSize: rs(14), color: Colors.gray_21, fontWeight: "500" },
  listTxtSel: { fontFamily: Fonts.Bold, color: Colors.accent, fontWeight: "700" },

  checkCircle: {
    width: scale(22), height: scale(22), borderRadius: scale(11),
    backgroundColor: Colors.accent, alignItems: "center", justifyContent: "center",
  },
  checkMark: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(12), fontWeight: "900" },

  emptyWrap: { alignItems: "center", paddingVertical: vs(30) },
  emptyTxt: { fontFamily: Fonts.Regular, color: Colors.gray_BD, fontSize: rs(14) },
});