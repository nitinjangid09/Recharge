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
  ScrollView,
  Animated,
  Modal,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Fonts from "../../../constants/Fonts";
import { fadeIn, slideUp, buttonPress } from "../../../utils/ScreenAnimations";
import Colors from "../../../constants/Colors";
import { fetchAepsBanks, aepsMiniStatement } from "../../../api/AuthApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AlertService } from "../../../componets/Alerts/CustomAlert";
import * as NavigationService from "../../../utils/NavigationService";
import { ActivityIndicator } from "react-native";
import RDService, { RD_ERROR_CODES } from "../../../utils/RDService";
import Geolocation from '@react-native-community/geolocation';
import { PermissionsAndroid, Alert } from "react-native";

// ─── Responsive Scaling ───────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get("window");
const BASE_W = 390;
const BASE_H = 844;
const scale = (s) => Math.round((SW / BASE_W) * s);
const vs = (s) => Math.round((SH / BASE_H) * s);
const rs = (s) => Math.round(Math.sqrt((SW * SH) / (BASE_W * BASE_H)) * s * 1.2);

// Removed local parseBiometric, now using centralized RDService.parsePidXml

// ── Data ──────────────────────────────────────────────────────────────────────
// Removed hardcoded BANK_LIST

// ─── Device list comes from RDService.js ─────────────────────────────────────
const DEVICE_LIST = RDService.DEVICE_LIST;

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
const MiniStatement = () => {
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

  const [mobileNumber, setMobileNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [bank, setBank] = useState(null);
  const [device, setDevice] = useState(null);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    const mob = mobileNumber.trim();
    const aadh = aadhaarNumber.trim();

    if (!mob) e.mobile = "Please enter mobile number";
    else if (!/^[6-9]\d{9}$/.test(mob)) e.mobile = "Please enter a valid 10-digit mobile number";

    if (!aadh) e.aadhaar = "Please enter Aadhaar number";
    else if (!/^\d{12}$/.test(aadh)) e.aadhaar = "Aadhaar number must be exactly 12 digits";

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
      const idempotencyKey = `MS_${Date.now()}`;

      const selectedBank = bankList.find(b => b.value === bank);
      const bankName = selectedBank ? selectedBank.label : "Unknown Bank";

      const payload = {
        aadhaar: String(aadhaarNumber),
        mobile: String(mobileNumber),
        bankId: bank,
        latitude: Number(coords.latitude),
        longitude: Number(coords.longitude),
        captureType: 'finger',
        biometricData: RDService.parsePidXml(pidData),
      };

      const res = await aepsMiniStatement({
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
          title: "Request Failed",
          message: res.message || "Unable to fetch mini statement."
        });
      }
    } catch (err) {
      console.log("Mini Statement error:", err);
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
            <Text style={styles.titleWhite}>Mini</Text>
            <Text style={styles.titleAccent}>Statement</Text>
          </View>
          <Text style={styles.headerSub}>
            Check customer statement{"\n"}safe &amp; securely
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
          {/* ─── CONTAINER 1: Customer Information ─── */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconWrap, { backgroundColor: Colors.accent + "18" }]}>
                <Text style={styles.cardIcon}>📋</Text>
              </View>
              <View>
                <Text style={styles.cardTitle}>Customer Information</Text>
                <Text style={styles.cardSub}>Primary identity details</Text>
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

          {/* ─── INFO STRIP ─── */}
          <View style={styles.infoStrip}>
            <Text style={styles.infoIcon}>📄</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.infoTitle}>What is Mini Statement?</Text>
              <Text style={styles.infoDesc}>
                Displays your last 5 transactions from your Aadhaar-linked bank account instantly via biometric authentication.
              </Text>
            </View>
          </View>

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
                <Text style={styles.buttonText}>Fetch Statement  →</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.bottomNote}>
            By proceeding, you consent to biometric verification as per NPCI guidelines
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ─── CUSTOM MINI STATEMENT MODAL ─── */}
      <Modal
        visible={receiptVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReceiptVisible(false)}
      >
        <View style={rm.overlay}>
          <View style={rm.card}>
            {/* Success Header */}
            <View style={rm.iconBadge}>
              <Text style={rm.checkIcon}>✓</Text>
            </View>

            <Text style={rm.statusTitle}>
              {(receiptData?.data?.message || receiptData?.message || "Transaction Successful").toUpperCase()}
            </Text>
            
            <View style={rm.amtBox}>
              <Text style={rm.amtLabel}>AVAILABLE BALANCE</Text>
              <Text style={rm.amtValue}>
                ₹{Number(
                  (receiptData?.data?.data?.bankAccountBalance || 
                   receiptData?.data?.data?.balance || 
                   receiptData?.data?.response?.data?.bankAccountBalance || 
                   receiptData?.data?.response?.data?.closingBalance || 
                   receiptData?.data?.balance || "0.00")
                ).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </Text>
            </View>

            {/* Scrollable Statement Area */}
            <View style={{ width: '100%', flexShrink: 1, maxHeight: SH * 0.45 }}>
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={rm.divider} />
                
                {/* Details Section */}
                <View style={rm.list}>
                  <View style={rm.row}>
                    <Text style={rm.rowLabel}>Transaction ID</Text>
                    <Text style={rm.rowValue}>{receiptData?.data?.transactionId || receiptData?.data?.response?.data?.externalRef || "N/A"}</Text>
                  </View>
                  <View style={rm.row}>
                    <Text style={rm.rowLabel}>Bank Name</Text>
                    <Text style={rm.rowValue}>{receiptData?.data?.data?.bankName || receiptData?.data?.response?.data?.bankName || txnDetails?.bankName || "N/A"}</Text>
                  </View>
                  <View style={rm.row}>
                    <Text style={rm.rowLabel}>Aadhaar Number</Text>
                    <Text style={rm.rowValue}>{receiptData?.data?.data?.aadhaarNumber || txnDetails?.aadhaar || "N/A"}</Text>
                  </View>
                </View>

                <View style={rm.divider} />

                {/* Statement List */}
                <Text style={rm.stTitle}>RECENT TRANSACTIONS</Text>
                {(receiptData?.data?.data?.miniStatement || receiptData?.data?.response?.data?.miniStatement)?.length > 0 ? (
                  (receiptData?.data?.data?.miniStatement || receiptData?.data?.response?.data?.miniStatement).map((item, idx) => {
                    const isCredit = item.txnType === 'C' || item.txnType === 'c' || item.narration?.toUpperCase().includes(' C ');
                    return (
                      <View key={idx} style={rm.stRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={rm.stDate}>{item.date || 'N/A'}</Text>
                          <Text style={rm.stNarration} numberOfLines={1}>{item.narration || item.txnType}</Text>
                        </View>
                        <Text style={[rm.stAmt, isCredit ? rm.cr : rm.dr]}>
                          {isCredit ? '+' : '-'}₹{item.amount}
                        </Text>
                      </View>
                    );
                  })
                ) : (
                  <Text style={rm.emptyTxt}>No recent transactions found</Text>
                )}
              </ScrollView>
            </View>

            <TouchableOpacity 
              style={rm.closeBtn} 
              onPress={() => {
                setReceiptVisible(false);
                setReceiptData(null);
                setTxnDetails(null);
              }}
              activeOpacity={0.8}
            >
              <Text style={rm.closeBtnTxt}>Close Statement</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default MiniStatement;

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
  titleWhite: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(30), letterSpacing: 0.4 },
  titleAccent: { fontFamily: Fonts.Bold, color: Colors.kyc_accent, fontSize: rs(30), letterSpacing: 0.4 },
  headerSub: {
    fontFamily: Fonts.Medium,
    color: Colors.whiteOpacity_65, fontSize: rs(12),
    lineHeight: rs(19), marginBottom: vs(16),
  },
  trustRow: { flexDirection: "row", gap: scale(8) },
  trustPill: {
    flexDirection: "row", alignItems: "center", gap: scale(5),
    backgroundColor: Colors.whiteOpacity_10,
    borderWidth: 1, borderColor: Colors.whiteOpacity_18,
    borderRadius: scale(20),
    paddingHorizontal: scale(10), paddingVertical: vs(5),
  },
  trustIcon: { fontSize: rs(10) },
  trustTxt: { fontFamily: Fonts.Bold, color: Colors.whiteOpacity_80, fontSize: rs(9), fontWeight: "700", letterSpacing: 0.8 },

  // ── Cards ──
  card: {
    backgroundColor: Colors.homebg, borderRadius: scale(18), padding: scale(16),
    elevation: 3, shadowColor: Colors.primary,
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
  cardIcon: { fontSize: rs(18) },
  cardTitle: { fontFamily: Fonts.Bold, fontSize: rs(14), color: Colors.primary },
  cardSub: { fontFamily: Fonts.Medium, fontSize: rs(11), color: Colors.gray_9E, marginTop: 1 },
  divider: { height: 1, backgroundColor: Colors.blackOpacity_05, marginBottom: vs(14) },

  // ── Inputs ──
  fieldWrap: { marginBottom: vs(14) },
  label: {
    fontFamily: Fonts.Bold, fontSize: rs(9), fontWeight: "700", color: Colors.gray_9E,
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
  prefix: { fontFamily: Fonts.Bold, color: Colors.primary, fontSize: rs(13), fontWeight: "700", marginRight: scale(4) },
  inputDivider: { width: 1, height: vs(18), backgroundColor: Colors.gray_E0, marginRight: scale(10) },
  input: { fontFamily: Fonts.Medium, flex: 1, fontSize: rs(13), color: Colors.gray_21, padding: 0 },
  inputSuffix: { fontSize: rs(16), marginLeft: scale(6) },
  errorTxt: { fontFamily: Fonts.Light, color: Colors.red, fontSize: rs(10.5), marginTop: vs(3), fontWeight: "300" },

  // ── Device info ──
  deviceInfo: {
    marginTop: vs(12), backgroundColor: Colors.bg_F8,
    borderRadius: scale(10), padding: scale(10),
  },
  deviceInfoTxt: { fontFamily: Fonts.Medium, color: Colors.gray_9E, fontSize: rs(10), fontWeight: "500", lineHeight: rs(16) },

  // ── Info strip ──
  infoStrip: {
    marginTop: vs(14), flexDirection: "row", gap: scale(10),
    backgroundColor: Colors.primary + "08",
    borderRadius: scale(14), padding: scale(14),
    borderWidth: 1, borderColor: Colors.primary + "14",
    alignItems: "flex-start",
  },
  infoIcon: { fontSize: rs(20), marginTop: vs(2) },
  infoTitle: { fontFamily: Fonts.Bold, fontSize: rs(12), color: Colors.primary, marginBottom: vs(4) },
  infoDesc: { fontFamily: Fonts.Medium, fontSize: rs(11), color: Colors.gray_75, lineHeight: rs(17) },

  // ── Button ──
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
  buttonText: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(14), letterSpacing: 0.3 },

  bottomNote: {
    fontFamily: Fonts.Regular, textAlign: "center", color: Colors.gray_BD, fontSize: rs(10),
    marginTop: vs(14), lineHeight: rs(16), paddingHorizontal: scale(10),
  },
});

// ══════════════════════════════════════════════════════════════════════════════
//  RECEIPT MODAL STYLES (rm)
// ══════════════════════════════════════════════════════════════════════════════
const rm = StyleSheet.create({
  overlay: {
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.6)', 
    justifyContent: 'center', 
    alignItems: 'center',
    padding: scale(20),
  },
  card: {
    backgroundColor: Colors.white,
    width: '100%',
    borderRadius: scale(24),
    padding: scale(24),
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2, shadowRadius: 15,
  },
  iconBadge: {
    width: scale(56), height: scale(56), borderRadius: scale(28),
    backgroundColor: '#2ECC71', alignItems: 'center', justifyContent: 'center',
    marginBottom: vs(12),
  },
  checkIcon: { color: Colors.white, fontSize: rs(28), fontWeight: 'bold' },
  statusTitle: {
    fontFamily: Fonts.Bold, fontSize: rs(13), color: '#2ECC71',
    letterSpacing: 1.2, marginBottom: vs(16), textAlign: 'center',
  },
  amtBox: {
    width: '100%', backgroundColor: Colors.bg_F8, borderRadius: scale(16),
    padding: scale(14), alignItems: 'center', marginBottom: vs(6),
  },
  amtLabel: {
    fontFamily: Fonts.Bold, fontSize: rs(9), color: Colors.gray_9E,
    letterSpacing: 0.8, marginBottom: vs(2),
  },
  amtValue: { fontFamily: Fonts.Bold, fontSize: rs(24), color: Colors.primary },
  divider: { width: '100%', height: 1, backgroundColor: Colors.gray_E0, marginVertical: vs(14) },
  stTitle: {
    fontFamily: Fonts.Bold, fontSize: rs(11), color: Colors.primary,
    letterSpacing: 0.5, marginBottom: vs(12),
  },
  list: { width: '100%', gap: vs(10) },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  rowLabel: { fontFamily: Fonts.Medium, fontSize: rs(11), color: Colors.gray_9E },
  rowValue: { fontFamily: Fonts.Bold, fontSize: rs(11), color: Colors.gray_21 },
  
  // Statement Row
  stRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: vs(10),
    borderBottomWidth: 0.5, borderBottomColor: Colors.gray_F0,
  },
  stDate: { fontFamily: Fonts.Bold, fontSize: rs(10), color: Colors.gray_21 },
  stNarration: { fontFamily: Fonts.Medium, fontSize: rs(9), color: Colors.gray_9E, marginTop: vs(2) },
  stAmt: { fontFamily: Fonts.Bold, fontSize: rs(11), marginLeft: scale(10) },
  cr: { color: '#2ECC71' },
  dr: { color: '#E74C3C' },
  emptyTxt: { fontFamily: Fonts.Medium, color: Colors.gray_BD, fontSize: rs(11), textAlign: 'center', marginTop: vs(10) },

  closeBtn: {
    width: '100%', backgroundColor: Colors.primary, paddingVertical: vs(14),
    borderRadius: scale(12), alignItems: 'center', marginTop: vs(20),
  },
  closeBtnTxt: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(14) },
});

// ══════════════════════════════════════════════════════════════════════════════
//  SELECT PICKER STYLES
// ══════════════════════════════════════════════════════════════════════════════
const sp = StyleSheet.create({
  wrap: { marginBottom: vs(4) },
  label: {
    fontFamily: Fonts.Bold, fontSize: rs(9), fontWeight: "700", color: Colors.gray_9E,
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
  triggerIcon: { fontSize: rs(16), marginRight: scale(8) },
  triggerValue: { fontFamily: Fonts.Bold, fontSize: rs(13), color: Colors.gray_21, fontWeight: "600" },
  triggerPlaceholder: { fontFamily: Fonts.Medium, fontSize: rs(13), color: Colors.gray_BD },

  chevronBox: {
    width: scale(28), height: scale(28), borderRadius: scale(8),
    backgroundColor: Colors.gray_F0, alignItems: "center", justifyContent: "center",
  },
  chevronBoxActive: { backgroundColor: Colors.accent + "18" },
  chevron: { fontFamily: Fonts.Medium, color: Colors.gray_9E, fontSize: rs(20), fontWeight: "500", marginTop: vs(-2) },
  chevronActive: { color: Colors.accent, transform: [{ rotate: "90deg" }] },

  chip: {
    flexDirection: "row", alignItems: "center",
    marginTop: vs(7), backgroundColor: Colors.accent + "12",
    borderRadius: scale(20), paddingHorizontal: scale(10), paddingVertical: vs(4),
    alignSelf: "flex-start", gap: scale(5),
    borderWidth: 1, borderColor: Colors.accent + "30",
  },
  chipDot: { width: scale(6), height: scale(6), borderRadius: scale(3), backgroundColor: Colors.accent },
  chipTxt: { fontFamily: Fonts.Bold, color: Colors.accent, fontSize: rs(11), fontWeight: "700" },
  chipClear: { fontFamily: Fonts.Bold, color: Colors.accent, fontSize: rs(12), fontWeight: "800", marginLeft: scale(2) },

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
    paddingHorizontal: scale(16), paddingBottom: vs(10),
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
  sheetTitle: { fontFamily: Fonts.Bold, fontSize: rs(15), fontWeight: "800", color: Colors.primary },
  closeBtn: {
    width: scale(28), height: scale(28), borderRadius: scale(14),
    backgroundColor: Colors.gray_F4, alignItems: "center", justifyContent: "center",
  },
  closeBtnTxt: { fontFamily: Fonts.Bold, color: Colors.gray_66, fontSize: rs(11), fontWeight: "800" },

  searchRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.gray_F5, borderRadius: scale(10),
    paddingHorizontal: scale(10), marginBottom: vs(4),
    minHeight: vs(42),
  },
  searchIcon: { fontSize: rs(14), marginRight: scale(6) },
  searchInput: { fontFamily: Fonts.Medium, flex: 1, fontSize: rs(13), color: Colors.gray_21, padding: 0 },
  searchClear: { fontFamily: Fonts.Bold, color: Colors.gray_BD, fontSize: rs(13), fontWeight: "700" },

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
  listIcon: { fontSize: rs(16) },
  listTxt: { fontFamily: Fonts.Medium, flex: 1, fontSize: rs(13), color: Colors.gray_21, fontWeight: "500" },
  listTxtSel: { fontFamily: Fonts.Bold, color: Colors.accent, fontWeight: "700" },

  checkCircle: {
    width: scale(22), height: scale(22), borderRadius: scale(11),
    backgroundColor: Colors.accent, alignItems: "center", justifyContent: "center",
  },
  checkMark: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(11), fontWeight: "900" },

  emptyWrap: { alignItems: "center", paddingVertical: vs(30) },
  emptyTxt: { fontFamily: Fonts.Regular, color: Colors.gray_BD, fontSize: rs(13) },
});