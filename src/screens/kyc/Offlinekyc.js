import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Animated, Dimensions, StatusBar,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { launchImageLibrary, launchCamera } from "react-native-image-picker";

import Colors from "../../constants/Colors";
import Fonts from "../../constants/Fonts";

// ✅ Import from apiService — submitOfflineKyc handles the full API call + AsyncStorage write
import { submitOfflineKyc } from "../../api/AuthApi";

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────

// Free public IFSC APIs — tried in order, first success wins (no API key needed)
const IFSC_APIS = [
  (ifsc) => `https://bank-apis.in/api/ifsc/${ifsc}`,    // { bank, branch, address, city, state }
  (ifsc) => `https://api.techm.in/bank/v1/${ifsc}`,     // { BANK, BRANCH, ADDRESS, CITY, STATE }
  (ifsc) => `https://ifscapi.com/${ifsc}`,              // { bank_name, branch, address }
];

const { width } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────────────────────
// COLORS — resolved at render time (never at module load — prevents crash)
// ─────────────────────────────────────────────────────────────────────────────
const sc = (val, fb) => (typeof val === "string" && val.length > 2 ? val : fb);

const resolveColors = () => ({
  accent: sc(Colors.finance_accent, "#D4B06A"),
  success: sc(Colors.finance_success, "#22C55E"),
  error: sc(Colors.finance_error, "#EF4444"),
  text: sc(Colors.finance_text, "#1A1A2E"),
  bg: sc(Colors.finance_bg_1, "#F7F8FA"),
  white: sc(Colors.white, "#FFFFFF"),
});

// Plain hex literals for module-level atoms — never Colors.*
const F = {
  accent: "#D4B06A", success: "#22C55E", error: "#EF4444",
  text: "#1A1A2E", bg: "#F7F8FA", white: "#FFFFFF",
};

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const STEPS = [
  { key: "personal", label: "PERSONAL", icon: "account-outline" },
  { key: "business", label: "BUSINESS", icon: "store-outline" },
  { key: "banking", label: "BANKING", icon: "bank-outline" },
];

const RX = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[6-9]\d{9}$/,
  pincode: /^\d{6}$/,
  dob: /^(0[1-9]|[12]\d|3[01])-(0[1-9]|1[0-2])-\d{4}$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]$/,
  aadhaar: /^\d{12}$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  gst: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
  name: /^[a-zA-Z\s]{2,50}$/,
  accNum: /^\d{9,18}$/,
};

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Offlinekyc({ navigation }) {
  const C = resolveColors();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [ifscLoad, setIfscLoad] = useState(false);
  const [ifscOk, setIfscOk] = useState(false);
  const [showAcc, setShowAcc] = useState(false);
  const [errors, setErrors] = useState({});
  const slideAnim = useRef(new Animated.Value(0)).current;

  // ── Form state — keys match exact backend req.body field names ────────────
  const [personal, setPersonal] = useState({
    firstName: "", lastName: "", fatherName: "", gender: "Male",
    email: "", phone: "", dob: "",
    personalAddress: "", personalCity: "", personalState: "", personalPincode: "",
  });

  const [business, setBusiness] = useState({
    shopName: "", businessPanNumber: "", gstNumber: "",
    businessAddress: "", businessCity: "", businessState: "", businessPincode: "",
    panNumber: "", aadharNumber: "",
  });

  // Keys match exact multer req.files names: aadharFile, panFile, shopImage
  const [files, setFiles] = useState({
    aadharFile: null,
    panFile: null,
    shopImage: null,
  });

  const [banking, setBanking] = useState({
    accountHolderName: "", bankName: "", accountNumber: "",
    confirmAccountNumber: "",  // client-side only — NOT sent to API
    branchName: "", ifscCode: "",
    _bankAddress: "", _bankCity: "", _bankState: "",  // IFSC auto-fill display only
  });

  // ── Slide animation ───────────────────────────────────────────────────────
  const slide = (dir, cb) => {
    Animated.timing(slideAnim, {
      toValue: dir === "fwd" ? -width : width,
      duration: 220, useNativeDriver: true,
    }).start(() => {
      cb();
      slideAnim.setValue(dir === "fwd" ? width : -width);
      Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    });
  };

  // ── Validators ────────────────────────────────────────────────────────────
  const validatePersonal = () => {
    const e = {};
    if (!personal.firstName.trim()) e.firstName = "First name is required";
    else if (!RX.name.test(personal.firstName.trim())) e.firstName = "Only letters, 2–50 chars";
    if (!personal.lastName.trim()) e.lastName = "Last name is required";
    else if (!RX.name.test(personal.lastName.trim())) e.lastName = "Only letters, 2–50 chars";
    if (!personal.fatherName.trim()) e.fatherName = "Father's name is required";
    else if (!RX.name.test(personal.fatherName.trim())) e.fatherName = "Only letters allowed";
    if (!personal.email.trim()) e.email = "Email is required";
    else if (!RX.email.test(personal.email.trim())) e.email = "Enter a valid email";
    if (!personal.phone.trim()) e.phone = "Mobile number is required";
    else if (!RX.phone.test(personal.phone.trim())) e.phone = "Enter valid 10-digit mobile";
    if (!personal.dob.trim()) e.dob = "Date of birth is required";
    else if (!RX.dob.test(personal.dob.trim())) e.dob = "Format: DD-MM-YYYY";
    else {
      const [dd, mm, yyyy] = personal.dob.split("-").map(Number);
      const age = new Date().getFullYear() - yyyy -
        (new Date() < new Date(new Date().getFullYear(), mm - 1, dd) ? 1 : 0);
      if (age < 18) e.dob = "Must be at least 18 years old";
    }
    if (!personal.personalAddress.trim()) e.personalAddress = "Address is required";
    else if (personal.personalAddress.trim().length < 10) e.personalAddress = "Minimum 10 characters";
    if (!personal.personalPincode.trim()) e.personalPincode = "Pincode is required";
    else if (!RX.pincode.test(personal.personalPincode.trim())) e.personalPincode = "Enter valid 6-digit pincode";
    if (!personal.personalState.trim()) e.personalState = "State is required";
    if (!personal.personalCity.trim()) e.personalCity = "City is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateBusiness = () => {
    const e = {};
    if (!business.shopName.trim()) e.shopName = "Shop name is required";
    if (!business.businessAddress.trim()) e.businessAddress = "Shop address is required";
    else if (business.businessAddress.trim().length < 10) e.businessAddress = "Minimum 10 characters";
    if (!business.businessPincode.trim()) e.businessPincode = "Pincode is required";
    else if (!RX.pincode.test(business.businessPincode.trim())) e.businessPincode = "Enter valid 6-digit pincode";
    if (!business.businessState.trim()) e.businessState = "State is required";
    if (!business.businessCity.trim()) e.businessCity = "City is required";
    if (!business.panNumber.trim()) e.panNumber = "Personal PAN is required";
    else if (!RX.pan.test(business.panNumber.trim())) e.panNumber = "Format: ABCDE1234F";
    if (!business.aadharNumber.trim()) e.aadharNumber = "Aadhaar number is required";
    else if (!RX.aadhaar.test(business.aadharNumber.trim())) e.aadharNumber = "Enter valid 12-digit Aadhaar";
    if (business.businessPanNumber?.trim() &&
      !RX.pan.test(business.businessPanNumber.trim())) e.businessPanNumber = "Format: ABCDE1234F";
    if (business.gstNumber?.trim() &&
      !RX.gst.test(business.gstNumber.trim())) e.gstNumber = "Enter valid 15-char GST";
    if (!files.aadharFile) e.aadharFile = "Aadhaar photo is required";
    if (!files.panFile) e.panFile = "PAN card photo is required";
    if (!files.shopImage) e.shopImage = "Shop photo is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateBanking = () => {
    const e = {};
    if (!banking.accountHolderName.trim()) e.accountHolderName = "Account holder name is required";
    else if (!RX.name.test(banking.accountHolderName.trim())) e.accountHolderName = "Only letters allowed";
    if (!banking.bankName.trim()) e.bankName = "Bank name is required";
    if (!banking.accountNumber.trim()) e.accountNumber = "Account number is required";
    else if (!RX.accNum.test(banking.accountNumber.trim())) e.accountNumber = "Enter 9–18 digit account number";
    if (!banking.confirmAccountNumber.trim()) e.confirmAccountNumber = "Please confirm account number";
    else if (banking.accountNumber !== banking.confirmAccountNumber) e.confirmAccountNumber = "Account numbers do not match";
    if (!banking.branchName.trim()) e.branchName = "Branch name is required";
    if (!banking.ifscCode.trim()) e.ifscCode = "IFSC code is required";
    else if (!RX.ifsc.test(banking.ifscCode.trim())) e.ifscCode = "Format: HDFC0001234";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleNext = () => {
    if (step === 0 && !validatePersonal()) return;
    if (step === 1 && !validateBusiness()) return;
    setErrors({});
    slide("fwd", () => setStep(p => p + 1));
  };
  const handlePrev = () => {
    setErrors({});
    slide("bwd", () => setStep(p => p - 1));
  };

  // ── IFSC auto-lookup (no Razorpay — 3 free public APIs) ──────────────────
  const lookupIfsc = async (ifsc) => {
    if (!RX.ifsc.test(ifsc)) return;
    setIfscLoad(true);
    setIfscOk(false);
    for (const buildUrl of IFSC_APIS) {
      try {
        const res = await fetch(buildUrl(ifsc));
        const text = await res.text();
        if (!text || text.trimStart().startsWith("<")) continue;
        const d = JSON.parse(text);
        const bankName = d.bank || d.BANK || d.bank_name || "";
        if (!bankName) continue;
        setBanking(b => ({
          ...b,
          bankName: bankName,
          branchName: d.branch || d.BRANCH || b.branchName,
          _bankAddress: d.address || d.ADDRESS || "",
          _bankCity: d.city || d.CITY || "",
          _bankState: d.state || d.STATE || "",
        }));
        setIfscOk(true);
        setIfscLoad(false);
        return;
      } catch (_) { /* try next API */ }
    }
    setIfscLoad(false);
  };

  // ── Image picker ──────────────────────────────────────────────────────────
  const pickImage = (fileKey) => {
    Alert.alert("Upload Photo", "Choose source", [
      {
        text: "📷 Camera",
        onPress: () => launchCamera({ mediaType: "photo", quality: 0.85, saveToPhotos: false }, (r) => {
          if (!r.didCancel && !r.errorCode && r.assets?.[0]) {
            const a = r.assets[0];
            setFiles(f => ({ ...f, [fileKey]: { uri: a.uri, name: a.fileName || `${fileKey}.jpg`, type: a.type || "image/jpeg" } }));
            setErrors(e => ({ ...e, [fileKey]: undefined }));
          }
        }),
      },
      {
        text: "🖼️ Gallery",
        onPress: () => launchImageLibrary({ mediaType: "photo", quality: 0.85 }, (r) => {
          if (!r.didCancel && !r.errorCode && r.assets?.[0]) {
            const a = r.assets[0];
            setFiles(f => ({ ...f, [fileKey]: { uri: a.uri, name: a.fileName || `${fileKey}.jpg`, type: a.type || "image/jpeg" } }));
            setErrors(e => ({ ...e, [fileKey]: undefined }));
          }
        }),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const removeFile = (fileKey) => setFiles(f => ({ ...f, [fileKey]: null }));

  // ── SUBMIT ────────────────────────────────────────────────────────────────
  // Delegates to submitOfflineKyc() in apiService.js which:
  //   • Reads header_token from AsyncStorage
  //   • Builds FormData with all backend field names
  //   • POSTs to POST /user/kyc/offline-kyc-submission
  //   • Writes kyc_status = "pending" to AsyncStorage on success
  // ─────────────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateBanking()) return;
    setLoading(true);

    const result = await submitOfflineKyc({ personal, business, files, banking });

    setLoading(false);

    if (!result) {
      Alert.alert("Error", "No response from server. Please try again.");
      return;
    }

    const isSuccess =
      result.success === true ||
      result.status === "success" ||
      result.status === 1 ||
      result.statusCode === 200;

    if (isSuccess) {
      Alert.alert(
        "✓ KYC Submitted",
        result.message || "Your KYC has been submitted and is under review. We'll notify you once approved.",
        [{ text: "OK", onPress: () => navigation.replace("KycSubmitted") }]
      );
    } else {
      // Surface server-side field errors inline if provided
      if (result.errors && typeof result.errors === "object") {
        setErrors(result.errors);
      }
      Alert.alert(
        "Submission Failed",
        result.message || "Please check your details and try again."
      );
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: C.bg }]} edges={["bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: C.bg }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: C.white }]}
          onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={C.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <LinearGradient colors={[C.accent, "#8B6914"]} style={styles.headerLogo}>
            <Icon name="shield-account-outline" size={18} color={C.white} />
          </LinearGradient>
          <Text style={[styles.headerTitle, { color: C.text, fontFamily: Fonts.Bold }]}>
            Offline KYC
          </Text>
        </View>
        <View style={[styles.stepBadge, { backgroundColor: C.accent + "22" }]}>
          <Text style={[styles.stepBadgeText, { color: C.accent, fontFamily: Fonts.Bold }]}>
            {step + 1} / 3
          </Text>
        </View>
      </View>

      {/* ── Stepper ── */}
      <View style={[styles.stepperWrap, { backgroundColor: C.bg }]}>
        {STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          const gc = done ? [C.success, "#16A34A"]
            : active ? [C.accent, "#8B6914"]
              : ["#D1D5DB", "#D1D5DB"];
          return (
            <React.Fragment key={s.key}>
              {i > 0 && (
                <View style={[styles.stepLine, done && { backgroundColor: C.success }]} />
              )}
              <View style={styles.stepItem}>
                <LinearGradient colors={gc} style={styles.stepCircle}>
                  <Icon name={done ? "check" : s.icon} size={16}
                    color={done || active ? C.white : "#9CA3AF"} />
                </LinearGradient>
                <Text style={[
                  styles.stepLabel,
                  done && { color: C.success },
                  active && { color: C.accent, fontFamily: Fonts.Bold },
                ]}>{s.label}</Text>
              </View>
            </React.Fragment>
          );
        })}
      </View>

      {/* ── Form ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Animated.View style={[{ flex: 1 }, { transform: [{ translateX: slideAnim }] }]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">

            {/* ════════════════ STEP 1 : PERSONAL ══════════════════════════ */}
            {step === 0 && (
              <View style={[styles.card, { backgroundColor: C.white }]}>
                <CardHeader icon="account-outline" title="Personal Details"
                  sub="Your basic identity information" C={C} />

                <FRow>
                  <FField label="FIRST NAME" value={personal.firstName}
                    onChange={v => setPersonal(p => ({ ...p, firstName: v }))}
                    error={errors.firstName} half placeholder="First name" maxLength={50} />
                  <FField label="LAST NAME" value={personal.lastName}
                    onChange={v => setPersonal(p => ({ ...p, lastName: v }))}
                    error={errors.lastName} half placeholder="Last name" maxLength={50} />
                </FRow>

                <FRow>
                  <FField label="FATHER'S NAME" value={personal.fatherName}
                    onChange={v => setPersonal(p => ({ ...p, fatherName: v }))}
                    error={errors.fatherName} half placeholder="Father's full name" maxLength={50} />
                  <GenderPick value={personal.gender}
                    onChange={v => setPersonal(p => ({ ...p, gender: v }))} C={C} />
                </FRow>

                <FRow>
                  <FField label="EMAIL" value={personal.email}
                    onChange={v => setPersonal(p => ({ ...p, email: v.toLowerCase() }))}
                    error={errors.email} half placeholder="you@email.com"
                    keyboardType="email-address" hint="e.g. user@gmail.com" />
                  <FField label="MOBILE" value={personal.phone}
                    onChange={v => { if (/^\d*$/.test(v) && v.length <= 10) setPersonal(p => ({ ...p, phone: v })); }}
                    error={errors.phone} half placeholder="10-digit number"
                    keyboardType="number-pad" maxLength={10} hint="Starts with 6–9" />
                </FRow>

                <FRow>
                  <FField label="DATE OF BIRTH" value={personal.dob}
                    onChange={v => {
                      let c = v.replace(/\D/g, "");
                      if (c.length > 2) c = c.slice(0, 2) + "-" + c.slice(2);
                      if (c.length > 5) c = c.slice(0, 5) + "-" + c.slice(5);
                      setPersonal(p => ({ ...p, dob: c.slice(0, 10) }));
                    }}
                    error={errors.dob} half placeholder="DD-MM-YYYY"
                    keyboardType="number-pad" maxLength={10} hint="Min age: 18 years" />
                  <FField label="STATE" value={personal.personalState}
                    onChange={v => setPersonal(p => ({ ...p, personalState: v }))}
                    error={errors.personalState} half placeholder="e.g. Rajasthan" />
                </FRow>

                <FRow>
                  <FField label="PINCODE" value={personal.personalPincode}
                    onChange={v => { if (/^\d*$/.test(v) && v.length <= 6) setPersonal(p => ({ ...p, personalPincode: v })); }}
                    error={errors.personalPincode} half placeholder="6-digit pincode"
                    keyboardType="number-pad" maxLength={6} />
                  <FField label="CITY" value={personal.personalCity}
                    onChange={v => setPersonal(p => ({ ...p, personalCity: v }))}
                    error={errors.personalCity} half placeholder="e.g. Jaipur" />
                </FRow>

                <FField label="FULL ADDRESS" value={personal.personalAddress}
                  onChange={v => setPersonal(p => ({ ...p, personalAddress: v }))}
                  error={errors.personalAddress} multiline
                  placeholder="House no., Street, Area, Landmark"
                  hint="Minimum 10 characters" />
              </View>
            )}

            {/* ════════════════ STEP 2 : BUSINESS ══════════════════════════ */}
            {step === 1 && (
              <View style={[styles.card, { backgroundColor: C.white }]}>
                <CardHeader icon="store-outline" title="Business Information"
                  sub="Shop details & owner identification" C={C} />

                <FField label="SHOP / BUSINESS NAME" value={business.shopName}
                  onChange={v => setBusiness(b => ({ ...b, shopName: v }))}
                  error={errors.shopName} placeholder="Your shop name" maxLength={100} />

                <FRow>
                  <FField label="BUSINESS PAN" value={business.businessPanNumber}
                    onChange={v => setBusiness(b => ({ ...b, businessPanNumber: v.toUpperCase() }))}
                    placeholder="ABCDE1234F" half maxLength={10}
                    error={errors.businessPanNumber} hint="10-char" required={false} />
                  <FField label="GST NUMBER" value={business.gstNumber}
                    onChange={v => setBusiness(b => ({ ...b, gstNumber: v.toUpperCase() }))}
                    placeholder="22AAAAA0000A1Z5" half maxLength={15}
                    error={errors.gstNumber} required={false} />
                </FRow>

                <FField label="SHOP ADDRESS" value={business.businessAddress}
                  onChange={v => setBusiness(b => ({ ...b, businessAddress: v }))}
                  error={errors.businessAddress} multiline
                  placeholder="Full shop address with landmark" hint="Minimum 10 characters" />

                <FRow>
                  <FField label="PINCODE" value={business.businessPincode}
                    onChange={v => { if (/^\d*$/.test(v) && v.length <= 6) setBusiness(b => ({ ...b, businessPincode: v })); }}
                    error={errors.businessPincode} half placeholder="6-digit pincode"
                    keyboardType="number-pad" maxLength={6} />
                  <FField label="STATE" value={business.businessState}
                    onChange={v => setBusiness(b => ({ ...b, businessState: v }))}
                    error={errors.businessState} half placeholder="e.g. Rajasthan" />
                </FRow>

                <FField label="CITY" value={business.businessCity}
                  onChange={v => setBusiness(b => ({ ...b, businessCity: v }))}
                  error={errors.businessCity} placeholder="e.g. Jaipur" />

                <Divider label="OWNER IDENTIFICATION" />

                <FRow>
                  <FField label="PERSONAL PAN" value={business.panNumber}
                    onChange={v => setBusiness(b => ({ ...b, panNumber: v.toUpperCase() }))}
                    error={errors.panNumber} half placeholder="ABCDE1234F"
                    maxLength={10} hint="Format: AAAAA9999A" />
                  <FField label="AADHAAR NUMBER" value={business.aadharNumber}
                    onChange={v => { if (/^\d*$/.test(v) && v.length <= 12) setBusiness(b => ({ ...b, aadharNumber: v })); }}
                    error={errors.aadharNumber} half placeholder="12-digit number"
                    keyboardType="number-pad" maxLength={12} />
                </FRow>

                <Divider label="UPLOAD DOCUMENTS" />
                <Text style={styles.docHint}>📸 Clear, well-lit photo. JPG or PNG only.</Text>

                {[
                  { key: "aadharFile", label: "Aadhaar Card", sub: "Front side of Aadhaar", icon: "card-account-details" },
                  { key: "panFile", label: "PAN Card", sub: "Clear photo of PAN card", icon: "card-account-details-outline" },
                  { key: "shopImage", label: "Shop Photo", sub: "Front view of your shop", icon: "store-outline" },
                ].map((slot) => {
                  const img = files[slot.key];
                  const hasErr = !!errors[slot.key];
                  return (
                    <View key={slot.key} style={{ marginBottom: 10 }}>
                      <TouchableOpacity
                        style={[
                          styles.docBox,
                          img && { borderStyle: "solid", borderColor: C.success },
                          hasErr && { borderStyle: "solid", borderColor: C.error },
                        ]}
                        onPress={() => pickImage(slot.key)}
                        activeOpacity={0.8}>
                        {img ? (
                          <>
                            <Image source={{ uri: img.uri }} style={styles.docThumb} resizeMode="cover" />
                            <LinearGradient colors={["transparent", "rgba(0,0,0,0.75)"]}
                              style={styles.docOverlay}>
                              <Icon name="check-circle" size={14} color={C.success} />
                              <Text style={[styles.docDoneText, { color: C.success }]}>UPLOADED</Text>
                              <Text style={styles.docFileName} numberOfLines={1}>{img.name}</Text>
                            </LinearGradient>
                            <TouchableOpacity
                              style={[styles.docCornerBtn, { backgroundColor: C.accent }]}
                              onPress={() => pickImage(slot.key)}>
                              <Icon name="pencil" size={10} color={C.white} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.docCornerBtn, { right: 28, backgroundColor: C.error }]}
                              onPress={() => removeFile(slot.key)}>
                              <Icon name="close" size={10} color={C.white} />
                            </TouchableOpacity>
                          </>
                        ) : (
                          <View style={styles.docEmpty}>
                            <LinearGradient colors={[C.accent + "25", C.accent + "0A"]}
                              style={styles.docIconCircle}>
                              <Icon name={slot.icon} size={22} color={C.accent} />
                            </LinearGradient>
                            <View style={{ flex: 1 }}>
                              <Text style={[styles.docLabel, { color: C.text, fontFamily: Fonts.Bold }]}>
                                {slot.label}
                              </Text>
                              <Text style={styles.docSub}>{slot.sub}</Text>
                            </View>
                            <View style={[styles.docUploadChip, { backgroundColor: C.accent + "18" }]}>
                              <Icon name="camera-plus-outline" size={11} color={C.accent} />
                              <Text style={[styles.docChipText, { color: C.accent, fontFamily: Fonts.Bold }]}>
                                Upload
                              </Text>
                            </View>
                          </View>
                        )}
                      </TouchableOpacity>
                      {hasErr && <ErrMsg msg={errors[slot.key]} />}
                    </View>
                  );
                })}
              </View>
            )}

            {/* ════════════════ STEP 3 : BANKING ═══════════════════════════ */}
            {step === 2 && (
              <View style={[styles.card, { backgroundColor: C.white }]}>
                <CardHeader icon="bank-outline" title="Banking Details"
                  sub="For settlements and commissions" C={C} />

                <FRow>
                  <FField label="ACCOUNT HOLDER NAME" value={banking.accountHolderName}
                    onChange={v => setBanking(b => ({ ...b, accountHolderName: v }))}
                    error={errors.accountHolderName} half
                    placeholder="As per bank records" maxLength={50} />
                  <FField label="BANK NAME" value={banking.bankName}
                    onChange={v => setBanking(b => ({ ...b, bankName: v }))}
                    error={errors.bankName} half placeholder="e.g. SBI" />
                </FRow>

                {/* Account number with show/hide toggle */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>
                    ACCOUNT NUMBER <Text style={{ color: F.error }}>*</Text>
                  </Text>
                  <View style={[styles.fieldInputWrap,
                  errors.accountNumber && styles.fieldInputError]}>
                    <TextInput
                      style={[styles.fieldInput, { paddingRight: 44 }]}
                      value={banking.accountNumber}
                      onChangeText={v => {
                        if (/^\d*$/.test(v) && v.length <= 18)
                          setBanking(b => ({ ...b, accountNumber: v }));
                      }}
                      placeholder="Enter account number"
                      placeholderTextColor="#9CA3AF"
                      keyboardType="number-pad"
                      secureTextEntry={!showAcc}
                      maxLength={18}
                    />
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowAcc(p => !p)}>
                      <Icon name={showAcc ? "eye-off-outline" : "eye-outline"} size={18} color="#9CA3AF" />
                    </TouchableOpacity>
                  </View>
                  {!!errors.accountNumber && <ErrMsg msg={errors.accountNumber} />}
                </View>

                <FField label="CONFIRM ACCOUNT NUMBER" value={banking.confirmAccountNumber}
                  onChange={v => {
                    if (/^\d*$/.test(v) && v.length <= 18)
                      setBanking(b => ({ ...b, confirmAccountNumber: v }));
                  }}
                  error={errors.confirmAccountNumber}
                  placeholder="Re-enter account number"
                  keyboardType="number-pad" maxLength={18}
                  hint="Both numbers must match" />

                {/* IFSC with auto-lookup */}
                <View style={styles.fieldWrap}>
                  <Text style={styles.fieldLabel}>
                    IFSC CODE <Text style={{ color: F.error }}>*</Text>
                  </Text>
                  <View style={[styles.fieldInputWrap,
                  errors.ifscCode && styles.fieldInputError]}>
                    <TextInput
                      style={[styles.fieldInput, { paddingRight: 80 }]}
                      value={banking.ifscCode}
                      onChangeText={v => {
                        const val = v.toUpperCase().replace(/[^A-Z0-9]/g, "");
                        setBanking(b => ({ ...b, ifscCode: val }));
                        setIfscOk(false);
                        if (RX.ifsc.test(val)) lookupIfsc(val);
                      }}
                      placeholder="SBIN0001234"
                      placeholderTextColor="#9CA3AF"
                      maxLength={11}
                      autoCapitalize="characters"
                    />
                    <View style={[styles.ifscBadge, {
                      backgroundColor: ifscOk ? C.success + "22" : "#F3F4F6",
                    }]}>
                      {ifscLoad
                        ? <ActivityIndicator size="small" color={C.accent} />
                        : <Text style={{
                          fontSize: 10, fontFamily: Fonts.Bold,
                          color: ifscOk ? C.success : "#9CA3AF",
                        }}>
                          {ifscOk ? "✓ OK" : "AUTO"}
                        </Text>
                      }
                    </View>
                  </View>
                  {!!errors.ifscCode && <ErrMsg msg={errors.ifscCode} />}
                  {!errors.ifscCode && (
                    <Text style={styles.fieldHint}>
                      Type 11-char IFSC to auto-fill bank &amp; branch
                    </Text>
                  )}
                </View>

                <FRow>
                  <FField label="BRANCH NAME" value={banking.branchName}
                    onChange={v => setBanking(b => ({ ...b, branchName: v }))}
                    error={errors.branchName} half placeholder="Branch name" />
                  <FField label="BANK NAME" value={banking.bankName}
                    onChange={v => setBanking(b => ({ ...b, bankName: v }))}
                    half placeholder="Auto-filled from IFSC" />
                </FRow>

                {/* IFSC auto-fill info box */}
                {(!!banking._bankAddress || !!banking._bankCity) && (
                  <View style={[styles.autoFillBox, {
                    borderColor: C.success + "55",
                    backgroundColor: C.success + "0C",
                  }]}>
                    <Icon name="check-circle-outline" size={14} color={C.success} />
                    <View style={{ flex: 1 }}>
                      {!!banking._bankAddress && (
                        <Text style={[styles.autoFillText, { color: C.success }]}>
                          {banking._bankAddress}
                        </Text>
                      )}
                      {!!banking._bankCity && (
                        <Text style={[styles.autoFillText, { color: C.success, marginTop: 2 }]}>
                          {[banking._bankCity, banking._bankState].filter(Boolean).join(", ")}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Security banner */}
                <LinearGradient colors={[C.accent + "18", C.accent + "08"]} style={styles.infoBanner}>
                  <View style={[styles.infoBannerIcon, { backgroundColor: C.accent + "22" }]}>
                    <Icon name="shield-lock-outline" size={20} color={C.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.infoBannerTitle, { color: C.accent, fontFamily: Fonts.Bold }]}>
                      256-bit Encrypted
                    </Text>
                    <Text style={[styles.infoBannerText, { fontFamily: Fonts.Regular }]}>
                      Banking details are encrypted and used only for payouts and settlements.
                    </Text>
                  </View>
                </LinearGradient>

                {/* Review notice */}
                <View style={styles.reviewBanner}>
                  <Icon name="information-outline" size={14} color="#3B82F6" />
                  <Text style={[styles.reviewText, { fontFamily: Fonts.Regular }]}>
                    Review all details before submitting. Changes after submission may delay approval.
                  </Text>
                </View>
              </View>
            )}

            {/* ── Navigation buttons ── */}
            <View style={styles.actionRow}>
              {step > 0 && (
                <TouchableOpacity
                  style={[styles.prevBtn, { backgroundColor: C.white }]}
                  onPress={handlePrev}>
                  <Icon name="arrow-left" size={18} color={C.text} />
                  <Text style={[styles.prevBtnText, { color: C.text, fontFamily: Fonts.SemiBold }]}>
                    Back
                  </Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                style={styles.nextBtnWrap}
                onPress={step < 2 ? handleNext : handleSubmit}
                activeOpacity={0.85}
                disabled={loading}>
                <LinearGradient colors={[C.accent, "#8B6914"]} style={styles.nextBtnGrad}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  {loading
                    ? <ActivityIndicator color={C.white} size="small" />
                    : <>
                      <Text style={[styles.nextBtnText, { color: C.white, fontFamily: Fonts.Bold }]}>
                        {step < 2 ? "Next Step" : "Submit KYC"}
                      </Text>
                      <Icon
                        name={step < 2 ? "arrow-right" : "check-circle-outline"}
                        size={18} color={C.white} style={{ marginLeft: 6 }}
                      />
                    </>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ATOMS — use F (plain hex literals) — never Colors.*
// ─────────────────────────────────────────────────────────────────────────────

function FRow({ children }) {
  return <View style={styles.row}>{children}</View>;
}

function FField({
  label, value, onChange, placeholder, error, keyboardType,
  half, multiline, required = true, maxLength, hint, secureTextEntry,
}) {
  return (
    <View style={[styles.fieldWrap, half && styles.fieldHalf]}>
      <Text style={styles.fieldLabel}>
        {label}
        {required
          ? <Text style={{ color: F.error }}> *</Text>
          : <Text style={{ color: "#9CA3AF", fontSize: 9 }}> (Optional)</Text>}
      </Text>
      <View style={[
        styles.fieldInputWrap,
        error && styles.fieldInputError,
        multiline && { alignItems: "flex-start" },
      ]}>
        <TextInput
          style={[
            styles.fieldInput,
            multiline && { height: 72, textAlignVertical: "top", paddingTop: 10 },
          ]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder ?? ""}
          placeholderTextColor="#9CA3AF"
          keyboardType={keyboardType ?? "default"}
          multiline={multiline}
          maxLength={maxLength}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
        />
      </View>
      {!!hint && !error && <Text style={styles.fieldHint}>{hint}</Text>}
      {!!error && <ErrMsg msg={error} />}
    </View>
  );
}

function GenderPick({ value, onChange, C }) {
  const clr = C || F;
  return (
    <View style={[styles.fieldWrap, styles.fieldHalf]}>
      <Text style={styles.fieldLabel}>
        GENDER <Text style={{ color: clr.error }}>*</Text>
      </Text>
      <View style={styles.genderRow}>
        {[
          { label: "Male", icon: "gender-male" },
          { label: "Female", icon: "gender-female" },
          { label: "Other", icon: "gender-non-binary" },
        ].map(opt => (
          <TouchableOpacity key={opt.label} onPress={() => onChange(opt.label)}
            style={[
              styles.genderBtn,
              value === opt.label && { backgroundColor: clr.accent + "18", borderColor: clr.accent },
            ]}>
            <Icon name={opt.icon} size={12} color={value === opt.label ? clr.accent : "#9CA3AF"} />
            <Text style={[styles.genderBtnText, value === opt.label && { color: clr.accent }]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function CardHeader({ icon, title, sub, C }) {
  const clr = C || F;
  return (
    <View style={styles.cardTitleRow}>
      <LinearGradient colors={[clr.accent + "28", clr.accent + "10"]} style={styles.cardTitleIcon}>
        <Icon name={icon} size={20} color={clr.accent} />
      </LinearGradient>
      <View>
        <Text style={[styles.cardTitle, { color: clr.text, fontFamily: Fonts.Bold }]}>{title}</Text>
        <Text style={[styles.cardSub, { fontFamily: Fonts.Regular }]}>{sub}</Text>
      </View>
    </View>
  );
}

function Divider({ label }) {
  return (
    <View style={styles.sectionDivider}>
      <View style={styles.sectionDividerLine} />
      <Text style={[styles.sectionDividerText, { fontFamily: Fonts.Bold }]}>{label}</Text>
      <View style={styles.sectionDividerLine} />
    </View>
  );
}

function ErrMsg({ msg }) {
  return (
    <View style={styles.errorRow}>
      <Icon name="alert-circle-outline" size={11} color={F.error} />
      <Text style={[styles.fieldError, { color: F.error }]}> {msg}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES — plain hex literals only — never Colors.*
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1 },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 10, elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center" },
  headerLogo: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 10 },
  headerTitle: { fontSize: 16 },
  stepBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  stepBadgeText: { fontSize: 11, letterSpacing: 0.5 },

  stepperWrap: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 14 },
  stepItem: { alignItems: "center" },
  stepCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  stepLabel: { fontSize: 9, fontFamily: Fonts.Medium, color: "#9CA3AF", letterSpacing: 0.5 },
  stepLine: { flex: 1, height: 2, backgroundColor: "#D1D5DB", marginBottom: 20, marginHorizontal: 2 },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 44 },

  card: { borderRadius: 20, padding: 18, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, marginBottom: 14 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  cardTitleIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
  cardTitle: { fontSize: 17 },
  cardSub: { fontSize: 12, color: "#6B7280", marginTop: 1 },

  row: { flexDirection: "row", gap: 10 },
  fieldWrap: { marginBottom: 12, flex: 1 },
  fieldHalf: { flex: 1 },
  fieldLabel: { fontSize: 10, fontFamily: Fonts.Bold, color: "#6B7280", letterSpacing: 0.8, marginBottom: 5 },
  fieldInputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 12 },
  fieldInput: { flex: 1, paddingVertical: 10, fontSize: 13, color: "#1A1A2E", fontFamily: Fonts.Medium },
  fieldInputError: { borderColor: "#EF4444", backgroundColor: "#FFF5F5" },
  eyeBtn: { padding: 4 },
  errorRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  fieldError: { fontSize: 10, fontFamily: Fonts.Medium },
  fieldHint: { color: "#9CA3AF", fontSize: 9, marginTop: 3, fontFamily: Fonts.Regular },

  ifscBadge: { position: "absolute", right: 8, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 },

  genderRow: { flexDirection: "row", gap: 5 },
  genderBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 9, borderRadius: 8, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", gap: 3 },
  genderBtnText: { fontSize: 10, fontFamily: Fonts.Medium, color: "#9CA3AF" },

  sectionDivider: { flexDirection: "row", alignItems: "center", marginVertical: 14, gap: 8 },
  sectionDividerLine: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  sectionDividerText: { fontSize: 9, color: "#9CA3AF", letterSpacing: 1 },

  docHint: { fontSize: 11, color: "#6B7280", marginBottom: 10, fontFamily: Fonts.Regular },
  docBox: { height: 90, borderRadius: 14, borderWidth: 1.5, borderColor: "#E5E7EB", borderStyle: "dashed", overflow: "hidden", backgroundColor: "#F9FAFB" },
  docThumb: { width: "100%", height: "100%", borderRadius: 12 },
  docOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", paddingHorizontal: 10, paddingVertical: 6, gap: 6 },
  docDoneText: { fontSize: 9, fontFamily: Fonts.Bold, letterSpacing: 0.5 },
  docFileName: { flex: 1, fontSize: 9, color: "#FFF" },
  docCornerBtn: { position: "absolute", top: 6, right: 6, width: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  docEmpty: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: 14, gap: 12 },
  docIconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  docLabel: { fontSize: 12 },
  docSub: { fontSize: 10, color: "#9CA3AF", marginTop: 2 },
  docUploadChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, gap: 4 },
  docChipText: { fontSize: 10 },

  autoFillBox: { flexDirection: "row", alignItems: "flex-start", borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 10, gap: 8 },
  autoFillText: { fontSize: 11, fontFamily: Fonts.Regular },

  infoBanner: { flexDirection: "row", alignItems: "flex-start", borderRadius: 12, padding: 12, marginTop: 12, gap: 10 },
  infoBannerIcon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  infoBannerTitle: { fontSize: 12, marginBottom: 2 },
  infoBannerText: { fontSize: 11, color: "#6B7280", lineHeight: 16 },

  reviewBanner: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#EFF6FF", borderRadius: 10, borderLeftWidth: 3, borderLeftColor: "#3B82F6", padding: 10, marginTop: 10, gap: 8 },
  reviewText: { flex: 1, fontSize: 11, color: "#1D4ED8", lineHeight: 16 },

  actionRow: { flexDirection: "row", alignItems: "center", marginTop: 4, marginBottom: 8 },
  prevBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", gap: 6, elevation: 1 },
  prevBtnText: { fontSize: 14 },
  nextBtnWrap: { borderRadius: 14, overflow: "hidden", elevation: 4 },
  nextBtnGrad: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 26 },
  nextBtnText: { fontSize: 14 },
});