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
import Fonts from "../../constants/Fonts";
import { fadeIn, slideUp, buttonPress } from "../../utils/ScreenAnimations";
import Colors from "../../constants/Colors";
// ─── Responsive Scaling ───────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get("window");
const BASE_W = 390;
const BASE_H = 844;
const scale = (s) => Math.round((SW / BASE_W) * s);
const vs = (s) => Math.round((SH / BASE_H) * s);
const rs = (s) => Math.round(Math.sqrt((SW * SH) / (BASE_W * BASE_H)) * s * 1.2);

// ── Data ──────────────────────────────────────────────────────────────────────
const BANK_LIST = [
  { label: "State Bank of India", value: "SBI", icon: "🏦" },
  { label: "HDFC Bank", value: "HDFC", icon: "🏦" },
  { label: "ICICI Bank", value: "ICICI", icon: "🏦" },
  { label: "Axis Bank", value: "AXIS", icon: "🏦" },
  { label: "Punjab National Bank", value: "PNB", icon: "🏦" },
  { label: "Bank of Baroda", value: "BOB", icon: "🏦" },
  { label: "Canara Bank", value: "CANARA", icon: "🏦" },
  { label: "Union Bank of India", value: "UNION", icon: "🏦" },
];

const DEVICE_LIST = [
  { label: "Mantra MFS100", value: "MANTRA", icon: "🖐" },
  { label: "Morpho MSO 1300", value: "MORPHO", icon: "🖐" },
  { label: "Startek FM220", value: "STARTEK", icon: "🖐" },
  { label: "SecuGen Hamster", value: "SECUGEN", icon: "🖐" },
];

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
  const [mobileNumber, setMobileNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [bank, setBank] = useState(null);
  const [device, setDevice] = useState(null);
  const [errors, setErrors] = useState({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(vs(30))).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([fadeIn(fadeAnim, 500), slideUp(slideAnim, 500)]).start();
  }, []);

  const validate = () => {
    const e = {};
    if (!mobileNumber) e.mobile = "Mobile number is required";
    else if (!/^[6-9]\d{9}$/.test(mobileNumber)) e.mobile = "Enter valid 10-digit number starting 6–9";
    if (!aadhaarNumber) e.aadhaar = "Aadhaar number is required";
    else if (!/^\d{12}$/.test(aadhaarNumber)) e.aadhaar = "Aadhaar must be 12 digits";
    if (!bank) e.bank = "Please select a bank";
    if (!device) e.device = "Please select a device";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    buttonPress(btnScale).start(() => {
      console.log({ mobileNumber, aadhaarNumber, bank, device });
    });
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
              placeholder="Choose your bank"
              items={BANK_LIST}
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
            <TouchableOpacity style={styles.button} onPress={handleSubmit} activeOpacity={0.88}>
              <Text style={styles.buttonText}>Fetch Statement  →</Text>
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.bottomNote}>
            By proceeding, you consent to biometric verification as per NPCI guidelines
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
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
  titleAccent: { fontFamily: Fonts.Bold, color: Colors.accent, fontSize: rs(30), letterSpacing: 0.4 },
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
    backgroundColor: Colors.white, borderRadius: scale(18), padding: scale(16),
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
  divider: { height: 1, backgroundColor: Colors.gray_F0, marginBottom: vs(14) },

  // ── Inputs ──
  fieldWrap: { marginBottom: vs(14) },
  label: {
    fontFamily: Fonts.Bold, fontSize: rs(9), fontWeight: "700", color: Colors.gray_9E,
    letterSpacing: 0.9, marginBottom: vs(6),
  },
  required: { color: Colors.accent },
  inputRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.gray_FA,
    borderRadius: scale(12),
    borderWidth: 1, borderColor: Colors.gray_EB,
    paddingHorizontal: scale(12),
    minHeight: vs(50),
  },
  inputRowError: { borderColor: Colors.red_E5, borderWidth: 1.5 },
  prefix: { fontFamily: Fonts.Bold, color: Colors.primary, fontSize: rs(13), fontWeight: "700", marginRight: scale(4) },
  inputDivider: { width: 1, height: vs(18), backgroundColor: Colors.gray_E0, marginRight: scale(10) },
  input: { fontFamily: Fonts.Medium, flex: 1, fontSize: rs(13), color: Colors.gray_21, padding: 0 },
  inputSuffix: { fontSize: rs(16), marginLeft: scale(6) },
  errorTxt: { fontFamily: Fonts.Medium, color: Colors.red_E5, fontSize: rs(10), marginTop: vs(3), fontWeight: "500" },

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
    backgroundColor: Colors.accent, paddingVertical: vs(14),
    borderRadius: scale(14), alignItems: "center",
    elevation: 3, shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8,
  },
  buttonText: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(14), letterSpacing: 0.3 },

  bottomNote: {
    fontFamily: Fonts.Regular, textAlign: "center", color: Colors.gray_BD, fontSize: rs(10),
    marginTop: vs(14), lineHeight: rs(16), paddingHorizontal: scale(10),
  },
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
  triggerError: { borderColor: Colors.red_E5, borderWidth: 1.5 },
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

  errorTxt: { fontFamily: Fonts.Medium, color: Colors.red_E5, fontSize: rs(10), marginTop: vs(4), fontWeight: "500" },

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