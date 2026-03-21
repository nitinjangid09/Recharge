import React, { useState, useRef, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Animated, Dimensions, StatusBar,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Alert, Image, PixelRatio, useWindowDimensions, Modal,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { launchImageLibrary, launchCamera } from "react-native-image-picker";
import Colors from "../../constants/Colors";
import Fonts from "../../constants/Fonts";
import { submitOfflineKyc } from "../../api/AuthApi";

// ─────────────────────────────────────────────────────────────────────────────
// RESPONSIVE SCALE HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const BASE_WIDTH = 375; // iPhone SE / base design width
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// Scale font sizes relative to screen width, capped so large tablets don't blow up
const rs = (size) => {
  const scale = SCREEN_W / BASE_WIDTH;
  const clamped = Math.min(scale, 1.35); // cap at ~508px equivalent
  return Math.round(PixelRatio.roundToNearestPixel(size * clamped));
};

// Horizontal spacing scale
const hs = (size) => Math.round(PixelRatio.roundToNearestPixel(size * (SCREEN_W / BASE_WIDTH)));

// Vertical spacing scale (more conservative)
const vs = (size) => Math.round(PixelRatio.roundToNearestPixel(size * (Math.min(SCREEN_H, 900) / 812)));

// Is this a tablet-ish screen?
const isTablet = SCREEN_W >= 600;

// ─────────────────────────────────────────────────────────────────────────────
// IFSC APIs — tried in order, first success wins
// ─────────────────────────────────────────────────────────────────────────────
const IFSC_APIS = [
  (ifsc) => `https://bank-apis.in/api/ifsc/${ifsc}`,
  (ifsc) => `https://api.techm.in/bank/v1/${ifsc}`,
  (ifsc) => `https://ifscapi.com/${ifsc}`,
];

// ─────────────────────────────────────────────────────────────────────────────
// DESIGN TOKENS — plain hex only at module level
// ─────────────────────────────────────────────────────────────────────────────
const T = {
  accent:       "#C9A84C",
  accentLight:  "#F5E7C6",
  accentDark:   "#7A6020",
  success:      "#16A34A",
  error:        "#DC2626",
  warning:      "#D97706",
  text:         "#111827",
  textSub:      "#6B7280",
  textMuted:    "#9CA3AF",
  bg:           "#F4F5F7",
  surface:      "#FFFFFF",
  border:       "#E5E7EB",
  borderFocus:  "#C9A84C",
  inputBg:      "#FAFAFA",
};

const resolveColors = () => ({
  accent:      typeof Colors.finance_accent  === "string" && Colors.finance_accent.length  > 2 ? Colors.finance_accent  : T.accent,
  success:     typeof Colors.finance_success === "string" && Colors.finance_success.length > 2 ? Colors.finance_success : T.success,
  error:       typeof Colors.finance_error   === "string" && Colors.finance_error.length   > 2 ? Colors.finance_error   : T.error,
  text:        typeof Colors.finance_text    === "string" && Colors.finance_text.length    > 2 ? Colors.finance_text    : T.text,
  bg:          typeof Colors.finance_bg_1    === "string" && Colors.finance_bg_1.length    > 2 ? Colors.finance_bg_1    : T.bg,
  white:       typeof Colors.white           === "string" && Colors.white.length           > 2 ? Colors.white           : T.surface,
});

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const STEPS = [
  { key: "personal", label: "Personal", icon: "account-circle-outline" },
  { key: "business", label: "Business", icon: "store-outline" },
  { key: "banking",  label: "Banking",  icon: "bank-outline" },
];

const RX = {
  email:   /^\S+@\S+\.\S+$/,
  phone:   /^[6-9]\d{9}$/,
  pincode: /^\d{6}$/,
  dob:     /^(0[1-9]|[12]\d|3[01])-(0[1-9]|1[0-2])-\d{4}$/,
  pan:     /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  aadhaar: /^\d{12}$/,
  ifsc:    /^[A-Z]{4}0[A-Z0-9]{6}$/,
  gst:     /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  name:    /^[a-zA-Z\s]{2,50}$/,
  accNum:  /^[0-9]{9,20}$/,
  accountHolderName: /^[A-Za-z\s.]+$/,
  bankName: /^[A-Za-z\s.&]+$/,
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function Offlinekyc({ navigation, route }) {
  const C      = resolveColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions(); // reactive to orientation changes

  // Column layout on wide screens
  const isWide        = width >= 600;
  const contentWidth  = isWide ? Math.min(width - hs(32), 680) : width - hs(32);
  const colGap        = hs(12);
  const halfWidth     = (contentWidth - colGap) / 2;

  const [step,     setStep]     = useState(0);
  const [loading,  setLoading]  = useState(false);
  const [ifscLoad, setIfscLoad] = useState(false);
  const [ifscOk,   setIfscOk]   = useState(false);
  const [showAcc,  setShowAcc]  = useState(false);
  const [errors,   setErrors]   = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const slideAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const fieldCoords = useRef({});

  const scrollToError = (errs) => {
    const firstErrorKey = Object.keys(errs)[0];
    if (firstErrorKey && fieldCoords.current[firstErrorKey] !== undefined) {
      scrollViewRef.current?.scrollTo({
        y: Math.max(0, fieldCoords.current[firstErrorKey] - 20),
        animated: true,
      });
    }
  };

  // ── Form state ────────────────────────────────────────────────────────────
  const [personal, setPersonal] = useState({
    firstName: route?.params?.user?.firstName || "",
    lastName: route?.params?.user?.lastName || "",
    fatherName: "", gender: "",
    email: route?.params?.user?.email || "",
    phone: route?.params?.user?.phone || "",
    dob: "",
    personalAddress: "", personalCity: "", personalState: "", personalPincode: "",
  });

  React.useEffect(() => {
    if (!route?.params?.user) {
      const loadUserData = async () => {
        try {
          const uStr = await AsyncStorage.getItem("user_profile");
          if (uStr) {
            const u = JSON.parse(uStr);
            setPersonal(p => ({
              ...p,
              firstName: p.firstName || u.firstName || "",
              lastName: p.lastName || u.lastName || "",
              email: p.email || u.email || "",
              phone: p.phone || u.phone || "",
            }));
          }
        } catch (err) {
          console.error("Offlinekyc loadUserData error:", err);
        }
      };
      loadUserData();
    }
  }, [route?.params?.user]);

  const [business, setBusiness] = useState({
    shopName: "", businessPanNumber: "", gstNumber: "",
    businessAddress: "", businessCity: "", businessState: "", businessPincode: "",
    panNumber: "", aadharNumber: "",
  });

  const [files, setFiles] = useState({ aadharFile: null, panFile: null, shopImage: null });

  const [banking, setBanking] = useState({
    accountHolderName: "", bankName: "", accountNumber: "",
    confirmAccountNumber: "", ifscCode: "",
    _bankAddress: "", _bankCity: "", _bankState: "",
  });

  // ── Slide animation ───────────────────────────────────────────────────────
  const slide = (dir, cb) => {
    Animated.timing(slideAnim, {
      toValue: dir === "fwd" ? -width : width,
      duration: 240, useNativeDriver: true,
    }).start(() => {
      cb();
      slideAnim.setValue(dir === "fwd" ? width : -width);
      Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 65, useNativeDriver: true }).start();
    });
  };

  // ── Validators ────────────────────────────────────────────────────────────
  const validatePersonal = () => {
    const e = {};
    if (!personal.gender) e.gender = "Required";
    else if (!["male", "female", "other"].includes(personal.gender.toLowerCase())) e.gender = "Invalid gender";
    if (!personal.firstName.trim()) e.firstName = "Required";
    else if (personal.firstName.trim().length < 3 || personal.firstName.trim().length > 30) e.firstName = "Min 3, Max 30 chars";
    if (!personal.lastName.trim()) e.lastName = "Required";
    else if (personal.lastName.trim().length < 3 || personal.lastName.trim().length > 30) e.lastName = "Min 3, Max 30 chars";
    if (!personal.fatherName.trim()) e.fatherName = "Required";
    else if (personal.fatherName.trim().length < 3 || personal.fatherName.trim().length > 50) e.fatherName = "Min 3, Max 50 chars";
    if (!personal.email.trim()) e.email = "Required";
    else if (!RX.email.test(personal.email.trim())) e.email = "Invalid email format";
    if (!personal.phone.trim()) e.phone = "Required";
    else if (!RX.phone.test(personal.phone.trim())) e.phone = "Invalid Indian phone number";
    if (!personal.dob.trim()) e.dob = "Required";
    else if (!RX.dob.test(personal.dob.trim())) e.dob = "DD-MM-YYYY";
    else {
      const [dd, mm, yyyy] = personal.dob.split("-").map(Number);
      const dobDate = new Date(yyyy, mm - 1, dd);
      const today = new Date();
      if (dobDate > today) e.dob = "User must be at least 18 years old and DOB cannot be in the future";
      else {
        const ageDiff = today.getFullYear() - dobDate.getFullYear();
        const m = today.getMonth() - dobDate.getMonth();
        const age = m < 0 || (m === 0 && today.getDate() < dobDate.getDate()) ? ageDiff - 1 : ageDiff;
        if (age < 18) e.dob = "User must be at least 18 years old and DOB cannot be in the future";
      }
    }
    if (!personal.personalAddress.trim()) e.personalAddress = "Required";
    else if (personal.personalAddress.trim().length < 5 || personal.personalAddress.trim().length > 100) e.personalAddress = "Min 5, Max 100 chars";
    if (!personal.personalPincode.trim()) e.personalPincode = "Required";
    else if (!RX.pincode.test(personal.personalPincode.trim())) e.personalPincode = "Invalid pincode";
    if (!personal.personalState.trim()) e.personalState = "Required";
    if (!personal.personalCity.trim()) e.personalCity = "Required";
    setErrors(e);
    return e;
  };

  const validateBusiness = () => {
    const e = {};
    if (!business.shopName.trim()) e.shopName = "Required";
    if (!business.businessAddress.trim()) e.businessAddress = "Required";
    else if (business.businessAddress.trim().length < 5 || business.businessAddress.trim().length > 100) e.businessAddress = "Min 5, Max 100 chars";
    if (!business.businessPincode.trim()) e.businessPincode = "Required";
    else if (!RX.pincode.test(business.businessPincode.trim())) e.businessPincode = "Invalid pincode";
    if (!business.businessState.trim()) e.businessState = "Required";
    if (!business.businessCity.trim()) e.businessCity = "Required";
    if (!business.panNumber.trim()) e.panNumber = "Required";
    else if (!RX.pan.test(business.panNumber.trim())) e.panNumber = "Invalid PAN number";
    if (!business.aadharNumber.trim()) e.aadharNumber = "Required";
    else if (!RX.aadhaar.test(business.aadharNumber.trim())) e.aadharNumber = "Invalid Aadhaar number";
    if (business.businessPanNumber?.trim() && !RX.pan.test(business.businessPanNumber.trim()))
      e.businessPanNumber = "Invalid Business PAN";
    if (business.gstNumber?.trim() && !RX.gst.test(business.gstNumber.trim()))
      e.gstNumber = "Invalid GST number";
    if (!files.aadharFile) e.aadharFile = "Aadhaar photo required";
    if (!files.panFile)    e.panFile    = "PAN card photo required";
    if (!files.shopImage)  e.shopImage  = "Shop photo required";
    setErrors(e);
    return e;
  };

  const validateBanking = () => {
    const e = {};
    if (!banking.accountHolderName.trim()) e.accountHolderName = "Required";
    else if (banking.accountHolderName.trim().length < 2 || banking.accountHolderName.trim().length > 60) e.accountHolderName = "Min 2, Max 60 chars";
    else if (!RX.accountHolderName.test(banking.accountHolderName.trim())) e.accountHolderName = "Account holder name can contain only letters";
    if (!banking.bankName.trim()) e.bankName = "Required";
    else if (banking.bankName.trim().length < 2 || banking.bankName.trim().length > 80) e.bankName = "Min 2, Max 80 chars";
    else if (!RX.bankName.test(banking.bankName.trim())) e.bankName = "Invalid bank name";
    if (!banking.accountNumber.trim()) e.accountNumber = "Required";
    else if (!RX.accNum.test(banking.accountNumber.trim())) e.accountNumber = "Account number must be 9–20 digits";
    if (!banking.confirmAccountNumber.trim()) e.confirmAccountNumber = "Please confirm";
    else if (banking.accountNumber !== banking.confirmAccountNumber)
      e.confirmAccountNumber = "Numbers don't match";
    if (!banking.ifscCode.trim()) e.ifscCode = "Required";
    else if (!RX.ifsc.test(banking.ifscCode.trim())) e.ifscCode = banking.ifscCode + " is not a valid IFSC code";
    setErrors(e);
    return e;
  };

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleNext = () => {
    let errs = {};
    if (step === 0) errs = validatePersonal();
    if (step === 1) errs = validateBusiness();
    if (Object.keys(errs).length > 0) {
      scrollToError(errs);
      return;
    }
    setErrors({});
    slide("fwd", () => setStep(p => p + 1));
  };
  const handlePrev = () => { setErrors({}); slide("bwd", () => setStep(p => p - 1)); };

  // ── IFSC lookup ───────────────────────────────────────────────────────────
  const lookupIfsc = useCallback(async (ifsc) => {
    if (!RX.ifsc.test(ifsc)) return;
    setIfscLoad(true); setIfscOk(false);
    for (const buildUrl of IFSC_APIS) {
      try {
        const res  = await fetch(buildUrl(ifsc));
        const text = await res.text();
        if (!text || text.trimStart().startsWith("<")) continue;
        const d       = JSON.parse(text);
        const bankName = d.bank || d.BANK || d.bank_name || "";
        if (!bankName) continue;
        setBanking(b => ({
          ...b,
          bankName,
          _bankAddress: d.address || d.ADDRESS || "",
          _bankCity:    d.city    || d.CITY    || "",
          _bankState:   d.state   || d.STATE   || "",
        }));
        setIfscOk(true); setIfscLoad(false); return;
      } catch (_) {}
    }
    setIfscLoad(false);
  }, []);

  // ── Image picker ──────────────────────────────────────────────────────────
  const pickImage = (fileKey) => {
    Alert.alert("Upload Photo", "Choose source", [
      { text: "📷 Camera", onPress: () =>
          launchCamera({ mediaType: "photo", quality: 0.85, saveToPhotos: false }, (r) => {
            if (!r.didCancel && !r.errorCode && r.assets?.[0]) {
              const a = r.assets[0];
              setFiles(f => ({ ...f, [fileKey]: { uri: a.uri, name: a.fileName || `${fileKey}.jpg`, type: a.type || "image/jpeg" } }));
              setErrors(e => ({ ...e, [fileKey]: undefined }));
            }
          })
      },
      { text: "🖼️ Gallery", onPress: () =>
          launchImageLibrary({ mediaType: "photo", quality: 0.85 }, (r) => {
            if (!r.didCancel && !r.errorCode && r.assets?.[0]) {
              const a = r.assets[0];
              setFiles(f => ({ ...f, [fileKey]: { uri: a.uri, name: a.fileName || `${fileKey}.jpg`, type: a.type || "image/jpeg" } }));
              setErrors(e => ({ ...e, [fileKey]: undefined }));
            }
          })
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const removeFile = (fileKey) => setFiles(f => ({ ...f, [fileKey]: null }));

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs = validateBanking();
    if (Object.keys(errs).length > 0) {
      scrollToError(errs);
      return;
    }
    setLoading(true);
    const result = await submitOfflineKyc({ personal, business, files, banking });
    setLoading(false);
    if (!result) { Alert.alert("Error", "No response. Please try again."); return; }
    const ok = result.success === true || result.status === "success" ||
               result.status === 1 || result.statusCode === 200;
    if (ok) {
      setShowSuccessModal(true);
    } else {
      if (result.errors && typeof result.errors === "object") setErrors(result.errors);
      Alert.alert("Submission Failed", result.message || "Check your details and try again.");
    }
  };

  // ── Progress ──────────────────────────────────────────────────────────────
  const progressAnim = useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.spring(progressAnim, {
      toValue: (step / 2),
      friction: 8, tension: 50, useNativeDriver: false,
    }).start();
  }, [step]);

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[S.safeArea, { backgroundColor: T.bg }]} edges={["bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={T.bg} />

      {/* ── Header ── */}
      <View style={[S.header, { paddingTop: insets.top + vs(10), paddingHorizontal: hs(16) }]}>
        <TouchableOpacity style={S.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="chevron-left" size={rs(22)} color={T.text} />
        </TouchableOpacity>

        <View style={S.headerCenter}>
          <LinearGradient colors={[T.accent, T.accentDark]} style={S.headerLogo}>
            <Icon name="shield-account-outline" size={rs(17)} color={T.surface} />
          </LinearGradient>
          <View>
            <Text style={[S.headerTitle, { fontFamily: Fonts.Bold, fontSize: rs(16) }]}>
              KYC Verification
            </Text>
            <Text style={[S.headerSub, { fontSize: rs(10) }]}>
              {STEPS[step].label} Details — Step {step + 1} of 3
            </Text>
          </View>
        </View>

        <View style={[S.stepBadge, { backgroundColor: T.accent + "1A" }]}>
          <Text style={[S.stepBadgeText, { color: T.accent, fontFamily: Fonts.Bold, fontSize: rs(11) }]}>
            {step + 1} / 3
          </Text>
        </View>
      </View>

      {/* ── Progress bar + stepper ── */}
      <View style={[S.progressWrap, { paddingHorizontal: hs(16) }]}>
        {/* Track */}
        <View style={S.progressTrack}>
          <Animated.View style={[S.progressFill, {
            width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
            backgroundColor: T.accent,
          }]} />
        </View>

        {/* Step dots */}
        <View style={S.stepDots}>
          {STEPS.map((s, i) => {
            const done   = i < step;
            const active = i === step;
            return (
              <View key={s.key} style={S.stepDotItem}>
                <LinearGradient
                  colors={done ? [T.success, "#15803D"] : active ? [T.accent, T.accentDark] : [T.border, T.border]}
                  style={[S.stepDotCircle, { width: rs(active ? 36 : 28), height: rs(active ? 36 : 28), borderRadius: rs(active ? 18 : 14) }]}
                >
                  <Icon
                    name={done ? "check" : s.icon}
                    size={rs(done ? 14 : active ? 16 : 13)}
                    color={done || active ? T.surface : T.textMuted}
                  />
                </LinearGradient>
                <Text style={[
                  S.stepDotLabel,
                  { fontSize: rs(9), fontFamily: active ? Fonts.Bold : Fonts.Medium },
                  done   && { color: T.success },
                  active && { color: T.accent },
                ]}>
                  {s.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* ── Form body ── */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Animated.View style={[{ flex: 1 }, { transform: [{ translateX: slideAnim }] }]}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[S.scrollContent, {
              paddingHorizontal: hs(16),
              paddingBottom: vs(40),
              alignItems: isWide ? "center" : undefined,
            }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* ════ STEP 1 : PERSONAL ════════════════════════════════════ */}
            {step === 0 && (
              <View style={[S.card, { width: isWide ? contentWidth : "100%" }]}>
                <SectionBanner icon="account-circle-outline" title="Personal Details"
                  sub="Your identity & contact information" />

                <TwoCol isWide={isWide} halfWidth={halfWidth} gap={colGap} onLayout={e => { const y = e.nativeEvent.layout.y; fieldCoords.current.firstName = y; fieldCoords.current.lastName = y; }}>
                  <Field label="First Name" value={personal.firstName}
                    onChange={v => setPersonal(p => ({ ...p, firstName: v }))}
                    error={errors.firstName} placeholder="First name" maxLength={50} />
                  <Field label="Last Name" value={personal.lastName}
                    onChange={v => setPersonal(p => ({ ...p, lastName: v }))}
                    error={errors.lastName} placeholder="Last name" maxLength={50} />
                </TwoCol>

                <TwoCol isWide={isWide} halfWidth={halfWidth} gap={colGap} onLayout={e => { const y = e.nativeEvent.layout.y; fieldCoords.current.fatherName = y; fieldCoords.current.gender = y; }}>
                  <Field label="Father's Name" value={personal.fatherName}
                    onChange={v => setPersonal(p => ({ ...p, fatherName: v }))}
                    error={errors.fatherName} placeholder="Father's full name" maxLength={50} />
                  <GenderSelect value={personal.gender}
                    onChange={v => setPersonal(p => ({ ...p, gender: v }))}
                    error={errors.gender} />
                </TwoCol>

                <TwoCol isWide={isWide} halfWidth={halfWidth} gap={colGap} onLayout={e => { const y = e.nativeEvent.layout.y; fieldCoords.current.email = y; fieldCoords.current.phone = y; }}>
                  <Field label="Email Address" value={personal.email}
                    onChange={v => setPersonal(p => ({ ...p, email: v.toLowerCase() }))}
                    error={errors.email} placeholder="you@email.com"
                    keyboardType="email-address" hint="e.g. user@gmail.com" />
                  <Field label="Mobile Number" value={personal.phone}
                    onChange={v => { if (/^\d*$/.test(v) && v.length <= 10) setPersonal(p => ({ ...p, phone: v })); }}
                    error={errors.phone} placeholder="10-digit number"
                    keyboardType="number-pad" maxLength={10} hint="Starts with 6–9" />
                </TwoCol>

                <TwoCol isWide={isWide} halfWidth={halfWidth} gap={colGap} onLayout={e => { const y = e.nativeEvent.layout.y; fieldCoords.current.dob = y; fieldCoords.current.personalState = y; }}>
                  <View>
                    <TouchableOpacity onPress={() => setShowDatePicker(true)} activeOpacity={0.8}>
                      <View pointerEvents="none">
                        <Field label="Date of Birth" value={personal.dob}
                          onChange={() => {}}
                          error={errors.dob} placeholder="DD-MM-YYYY"
                          hint="Min age: 18 years" />
                      </View>
                    </TouchableOpacity>
                    {showDatePicker && (
                      <DateTimePicker
                        value={
                          personal.dob && RX.dob.test(personal.dob)
                            ? (() => { const [d, m, y] = personal.dob.split('-'); return new Date(y, m - 1, d); })()
                            : new Date()
                        }
                        mode="date"
                        display="default"
                        maximumDate={new Date()}
                        onChange={(event, selectedDate) => {
                          setShowDatePicker(Platform.OS === 'ios');
                          if (selectedDate) {
                            const d = String(selectedDate.getDate()).padStart(2, '0');
                            const m = String(selectedDate.getMonth() + 1).padStart(2, '0');
                            const y = selectedDate.getFullYear();
                            setPersonal(p => ({ ...p, dob: `${d}-${m}-${y}` }));
                          }
                        }}
                      />
                    )}
                  </View>
                  <Field label="State" value={personal.personalState}
                    onChange={v => setPersonal(p => ({ ...p, personalState: v }))}
                    error={errors.personalState} placeholder="e.g. Rajasthan" />
                </TwoCol>

                <TwoCol isWide={isWide} halfWidth={halfWidth} gap={colGap} onLayout={e => { const y = e.nativeEvent.layout.y; fieldCoords.current.personalPincode = y; fieldCoords.current.personalCity = y; }}>
                  <Field label="Pincode" value={personal.personalPincode}
                    onChange={v => { if (/^\d*$/.test(v) && v.length <= 6) setPersonal(p => ({ ...p, personalPincode: v })); }}
                    error={errors.personalPincode} placeholder="6-digit pincode"
                    keyboardType="number-pad" maxLength={6} />
                  <Field label="City" value={personal.personalCity}
                    onChange={v => setPersonal(p => ({ ...p, personalCity: v }))}
                    error={errors.personalCity} placeholder="e.g. Jaipur" />
                </TwoCol>

                <Field onLayout={e => fieldCoords.current.personalAddress = e.nativeEvent.layout.y} label="Full Address" value={personal.personalAddress}
                  onChange={v => setPersonal(p => ({ ...p, personalAddress: v }))}
                  error={errors.personalAddress} multiline
                  placeholder="House no., Street, Area, Landmark"
                  hint="Minimum 10 characters" />
              </View>
            )}

            {/* ════ STEP 2 : BUSINESS ════════════════════════════════════ */}
            {step === 1 && (
              <View style={[S.card, { width: isWide ? contentWidth : "100%" }]}>
                <SectionBanner icon="store-outline" title="Business Information"
                  sub="Shop details & owner identification" />

                <Field onLayout={e => fieldCoords.current.shopName = e.nativeEvent.layout.y} label="Shop / Business Name" value={business.shopName}
                  onChange={v => setBusiness(b => ({ ...b, shopName: v }))}
                  error={errors.shopName} placeholder="Your shop name" maxLength={100} />

                <TwoCol isWide={isWide} halfWidth={halfWidth} gap={colGap} onLayout={e => { const y = e.nativeEvent.layout.y; fieldCoords.current.businessPanNumber = y; fieldCoords.current.gstNumber = y; }}>
                  <Field label="Business PAN" value={business.businessPanNumber}
                    onChange={v => setBusiness(b => ({ ...b, businessPanNumber: v.toUpperCase() }))}
                    placeholder="ABCDE1234F" maxLength={10}
                    error={errors.businessPanNumber} hint="Optional" required={false} />
                  <Field label="GST Number" value={business.gstNumber}
                    onChange={v => setBusiness(b => ({ ...b, gstNumber: v.toUpperCase() }))}
                    placeholder="22AAAAA0000A1Z5" maxLength={15}
                    error={errors.gstNumber} required={false} />
                </TwoCol>

                <Field onLayout={e => fieldCoords.current.businessAddress = e.nativeEvent.layout.y} label="Shop Address" value={business.businessAddress}
                  onChange={v => setBusiness(b => ({ ...b, businessAddress: v }))}
                  error={errors.businessAddress} multiline
                  placeholder="Full shop address with landmark" hint="Minimum 10 characters" />

                <TwoCol isWide={isWide} halfWidth={halfWidth} gap={colGap} onLayout={e => { const y = e.nativeEvent.layout.y; fieldCoords.current.businessPincode = y; fieldCoords.current.businessState = y; }}>
                  <Field label="Pincode" value={business.businessPincode}
                    onChange={v => { if (/^\d*$/.test(v) && v.length <= 6) setBusiness(b => ({ ...b, businessPincode: v })); }}
                    error={errors.businessPincode} placeholder="6-digit pincode"
                    keyboardType="number-pad" maxLength={6} />
                  <Field label="State" value={business.businessState}
                    onChange={v => setBusiness(b => ({ ...b, businessState: v }))}
                    error={errors.businessState} placeholder="e.g. Rajasthan" />
                </TwoCol>

                <Field onLayout={e => fieldCoords.current.businessCity = e.nativeEvent.layout.y} label="City" value={business.businessCity}
                  onChange={v => setBusiness(b => ({ ...b, businessCity: v }))}
                  error={errors.businessCity} placeholder="e.g. Jaipur" />

                <Divider label="OWNER IDENTIFICATION" />

                <TwoCol isWide={isWide} halfWidth={halfWidth} gap={colGap} onLayout={e => { const y = e.nativeEvent.layout.y; fieldCoords.current.panNumber = y; fieldCoords.current.aadharNumber = y; }}>
                  <Field label="Personal PAN" value={business.panNumber}
                    onChange={v => setBusiness(b => ({ ...b, panNumber: v.toUpperCase() }))}
                    error={errors.panNumber} placeholder="ABCDE1234F"
                    maxLength={10} hint="Format: AAAAA9999A" />
                  <Field label="Aadhaar Number" value={business.aadharNumber}
                    onChange={v => { if (/^\d*$/.test(v) && v.length <= 12) setBusiness(b => ({ ...b, aadharNumber: v })); }}
                    error={errors.aadharNumber} placeholder="12-digit number"
                    keyboardType="number-pad" maxLength={12} />
                </TwoCol>

                <Divider label="UPLOAD DOCUMENTS" />

                <Text style={[S.docHintText, { fontSize: rs(11) }]}>
                  Clear, well-lit photos only — JPG or PNG
                </Text>

                {/* Document slots — 2-col on wide, 1-col on narrow */}
                <View style={[S.docGrid, isWide && { flexDirection: "row", flexWrap: "wrap", gap: colGap }]} onLayout={e => { const y = e.nativeEvent.layout.y; fieldCoords.current.aadharFile = y; fieldCoords.current.panFile = y; fieldCoords.current.shopImage = y; }}>
                  {[
                    { key: "aadharFile", label: "Aadhaar Card",  sub: "Front side",      icon: "card-account-details",         color: "#3B82F6" },
                    { key: "panFile",    label: "PAN Card",      sub: "Clear photo",      icon: "card-account-details-outline", color: "#8B5CF6" },
                    { key: "shopImage",  label: "Shop Photo",    sub: "Front view",       icon: "store-outline",                color: "#F59E0B" },
                  ].map((slot) => {
                    const img    = files[slot.key];
                    const hasErr = !!errors[slot.key];
                    return (
                      <View key={slot.key}
                        style={[S.docSlotWrap, isWide && { width: halfWidth }]}
                      >
                        <TouchableOpacity
                          style={[
                            S.docBox,
                            img    && { borderStyle: "solid", borderColor: T.success, backgroundColor: T.success + "08" },
                            hasErr && { borderStyle: "solid", borderColor: T.error,   backgroundColor: T.error   + "06" },
                          ]}
                          onPress={() => pickImage(slot.key)}
                          activeOpacity={0.75}
                        >
                          {img ? (
                            <>
                              <Image source={{ uri: img.uri }} style={S.docThumb} resizeMode="cover" />
                              <LinearGradient
                                colors={["transparent", "rgba(0,0,0,0.72)"]}
                                style={S.docOverlay}
                              >
                                <Icon name="check-circle" size={rs(13)} color={T.success} />
                                <Text style={[S.docDoneLabel, { fontSize: rs(9) }]}>UPLOADED</Text>
                                <Text style={S.docFileName} numberOfLines={1}>{img.name}</Text>
                              </LinearGradient>
                              {/* Edit / remove corner buttons */}
                              <TouchableOpacity
                                style={[S.docCornerBtn, { backgroundColor: T.accent, right: vs(30) }]}
                                onPress={() => pickImage(slot.key)}
                              >
                                <Icon name="pencil" size={rs(10)} color="#FFF" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[S.docCornerBtn, { backgroundColor: T.error, right: vs(6) }]}
                                onPress={() => removeFile(slot.key)}
                              >
                                <Icon name="close" size={rs(10)} color="#FFF" />
                              </TouchableOpacity>
                            </>
                          ) : (
                            <View style={S.docEmptyContent}>
                              <View style={[S.docIconCircle, { backgroundColor: slot.color + "1C" }]}>
                                <Icon name={slot.icon} size={rs(22)} color={slot.color} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[S.docSlotLabel, { fontFamily: Fonts.Bold, fontSize: rs(12) }]}>
                                  {slot.label}
                                </Text>
                                <Text style={[S.docSlotSub, { fontSize: rs(10) }]}>{slot.sub}</Text>
                              </View>
                              <View style={[S.docUploadTag, { backgroundColor: T.accent + "18", borderColor: T.accent + "40" }]}>
                                <Icon name="camera-plus-outline" size={rs(11)} color={T.accent} />
                                <Text style={[S.docUploadTagText, { color: T.accent, fontFamily: Fonts.Bold, fontSize: rs(9) }]}>
                                  Upload
                                </Text>
                              </View>
                            </View>
                          )}
                        </TouchableOpacity>
                        {hasErr && <ErrLabel msg={errors[slot.key]} />}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ════ STEP 3 : BANKING ════════════════════════════════════ */}
            {step === 2 && (
              <View style={[S.card, { width: isWide ? contentWidth : "100%" }]}>
                <SectionBanner icon="bank-outline" title="Banking Details"
                  sub="For settlements and commissions" />

                <TwoCol isWide={isWide} halfWidth={halfWidth} gap={colGap} onLayout={e => { const y = e.nativeEvent.layout.y; fieldCoords.current.accountHolderName = y; fieldCoords.current.bankName = y; }}>
                  <Field label="Account Holder Name" value={banking.accountHolderName}
                    onChange={v => setBanking(b => ({ ...b, accountHolderName: v }))}
                    error={errors.accountHolderName} placeholder="As per bank records" maxLength={50} />
                  <Field label="Bank Name" value={banking.bankName}
                    onChange={v => setBanking(b => ({ ...b, bankName: v }))}
                    error={errors.bankName} placeholder="e.g. State Bank of India" />
                </TwoCol>

                {/* Account number with eye toggle */}
                <FieldWrap onLayout={e => fieldCoords.current.accountNumber = e.nativeEvent.layout.y} label="Account Number" required error={errors.accountNumber}>
                  <View style={[S.inputRow,
                    errors.accountNumber && { borderColor: T.error, backgroundColor: T.error + "06" }
                  ]}>
                    <TextInput
                      style={[S.input, { paddingRight: hs(44) }]}
                      value={banking.accountNumber}
                      onChangeText={v => {
                        if (/^\d*$/.test(v) && v.length <= 18)
                          setBanking(b => ({ ...b, accountNumber: v }));
                      }}
                      placeholder="Enter account number"
                      placeholderTextColor={T.textMuted}
                      keyboardType="number-pad"
                      secureTextEntry={!showAcc}
                      maxLength={18}
                    />
                    <TouchableOpacity style={S.eyeBtn} onPress={() => setShowAcc(p => !p)}>
                      <Icon name={showAcc ? "eye-off-outline" : "eye-outline"} size={rs(18)} color={T.textMuted} />
                    </TouchableOpacity>
                  </View>
                </FieldWrap>

                <Field onLayout={e => fieldCoords.current.confirmAccountNumber = e.nativeEvent.layout.y} label="Confirm Account Number" value={banking.confirmAccountNumber}
                  onChange={v => {
                    if (/^\d*$/.test(v) && v.length <= 18)
                      setBanking(b => ({ ...b, confirmAccountNumber: v }));
                  }}
                  error={errors.confirmAccountNumber}
                  placeholder="Re-enter account number"
                  keyboardType="number-pad" maxLength={18}
                  hint="Both numbers must match" />

                {/* IFSC with inline badge */}
                <FieldWrap onLayout={e => fieldCoords.current.ifscCode = e.nativeEvent.layout.y} label="IFSC Code" required error={errors.ifscCode}
                  hint={!errors.ifscCode ? "Type 11-char IFSC to auto-fill bank & branch" : undefined}
                >
                  <View style={[S.inputRow,
                    errors.ifscCode && { borderColor: T.error, backgroundColor: T.error + "06" }
                  ]}>
                    <TextInput
                      style={[S.input, { paddingRight: hs(70), letterSpacing: 1 }]}
                      value={banking.ifscCode}
                      onChangeText={v => {
                        const val = v.toUpperCase().replace(/[^A-Z0-9]/g, "");
                        setBanking(b => ({ ...b, ifscCode: val }));
                        setIfscOk(false);
                        if (RX.ifsc.test(val)) lookupIfsc(val);
                      }}
                      placeholder="SBIN0001234"
                      placeholderTextColor={T.textMuted}
                      maxLength={11}
                      autoCapitalize="characters"
                    />
                    <View style={[S.ifscBadge, {
                      backgroundColor: ifscOk ? T.success + "20" : T.bg,
                    }]}>
                      {ifscLoad
                        ? <ActivityIndicator size="small" color={T.accent} />
                        : <Text style={[S.ifscBadgeText, {
                            color: ifscOk ? T.success : T.textMuted,
                            fontFamily: Fonts.Bold, fontSize: rs(10),
                          }]}>
                            {ifscOk ? "✓ OK" : "AUTO"}
                          </Text>
                      }
                    </View>
                  </View>
                </FieldWrap>

                {/* IFSC auto-fill info box */}
                {(!!banking._bankAddress || !!banking._bankCity) && (
                  <View style={[S.autofillBox, {
                    borderColor: T.success + "55",
                    backgroundColor: T.success + "0C",
                  }]}>
                    <Icon name="check-circle-outline" size={rs(14)} color={T.success} />
                    <View style={{ flex: 1 }}>
                      {!!banking._bankAddress && (
                        <Text style={[S.autofillText, { color: T.success, fontSize: rs(11) }]}>
                          {banking._bankAddress}
                        </Text>
                      )}
                      {!!banking._bankCity && (
                        <Text style={[S.autofillText, { color: T.success, fontSize: rs(11), marginTop: 2 }]}>
                          {[banking._bankCity, banking._bankState].filter(Boolean).join(", ")}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Security banner */}
                <LinearGradient colors={[T.accent + "1A", T.accent + "08"]} style={S.securityBanner}>
                  <View style={[S.securityIcon, { backgroundColor: T.accent + "25" }]}>
                    <Icon name="shield-lock-outline" size={rs(20)} color={T.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.securityTitle, { color: T.accent, fontFamily: Fonts.Bold, fontSize: rs(12) }]}>
                      256-bit Encrypted
                    </Text>
                    <Text style={[S.securityBody, { fontSize: rs(11), fontFamily: Fonts.Regular }]}>
                      Banking details are encrypted and used only for payouts and settlements.
                    </Text>
                  </View>
                </LinearGradient>

                {/* Review notice */}
                <View style={S.reviewBanner}>
                  <Icon name="information-outline" size={rs(13)} color="#3B82F6" />
                  <Text style={[S.reviewText, { fontSize: rs(11), fontFamily: Fonts.Regular }]}>
                    Review all details before submitting. Changes after submission may delay approval.
                  </Text>
                </View>
              </View>
            )}

            {/* ── Navigation buttons ── */}
            <View style={[S.actionRow, { width: isWide ? contentWidth : "100%" }]}>
              {step > 0 ? (
                <TouchableOpacity style={S.prevBtn} onPress={handlePrev} activeOpacity={0.75}>
                  <Icon name="arrow-left" size={rs(17)} color={T.text} />
                  <Text style={[S.prevBtnText, { fontFamily: Fonts.SemiBold, fontSize: rs(14) }]}>
                    Back
                  </Text>
                </TouchableOpacity>
              ) : <View style={{ flex: 1 }} />}

              <TouchableOpacity
                style={S.nextBtnOuter}
                onPress={step < 2 ? handleNext : handleSubmit}
                activeOpacity={0.85}
                disabled={loading}
              >
                <LinearGradient
                  colors={[T.accent, T.accentDark]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={S.nextBtnGrad}
                >
                  {loading
                    ? <ActivityIndicator color={T.surface} size="small" />
                    : <>
                        <Text style={[S.nextBtnText, { color: T.surface, fontFamily: Fonts.Bold, fontSize: rs(14) }]}>
                          {step < 2 ? "Next" : "Submit KYC"}
                        </Text>
                        <Icon
                          name={step < 2 ? "arrow-right" : "check-circle-outline"}
                          size={rs(17)} color={T.surface} style={{ marginLeft: hs(6) }}
                        />
                      </>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>

          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* ── Custom Success Modal ── */}
      <Modal transparent visible={showSuccessModal} animationType="fade" onRequestClose={() => {}}>
        <View style={S.modalOverlay}>
          <View style={S.modalCard}>
            <View style={S.modalIconWrap}>
              <Icon name="check-decagram" size={rs(44)} color={T.success} />
            </View>
            <Text style={S.modalTitle}>KYC Submitted Successfully</Text>
            <Text style={S.modalSub}>
              Your KYC details have been safely received and are currently under review. We'll notify you once approved!
            </Text>
            <TouchableOpacity
              style={S.modalBtn}
              activeOpacity={0.8}
              onPress={() => {
                setShowSuccessModal(false);
                navigation.replace("FinanceHome");
              }}
            >
              <LinearGradient colors={[T.accent, T.accentDark]} style={S.modalBtnGrad}>
                <Text style={S.modalBtnText}>Continue to Home</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────────────────────────────────────

/** Responsive two-column row: side-by-side on wide screens, stacked on narrow */
function TwoCol({ children, isWide, halfWidth, gap, onLayout }) {
  const kids = React.Children.toArray(children);
  if (!isWide) {
    return <View onLayout={onLayout} style={{ flex: 1 }}>{kids}</View>;
  }
  return (
    <View style={{ flexDirection: "row", gap, marginBottom: 0 }} onLayout={onLayout}>
      {kids.map((child, i) => (
        <View key={i} style={{ width: halfWidth }}>
          {child}
        </View>
      ))}
    </View>
  );
}

/** Generic field wrapper (label + slot + hint/error) */
function FieldWrap({ label, required = true, error, hint, children, onLayout }) {
  return (
    <View style={S.fieldWrap} onLayout={onLayout}>
      <Text style={[S.fieldLabel, { fontSize: rs(10) }]}>
        {label}
        {required
          ? <Text style={{ color: T.error }}> *</Text>
          : <Text style={{ color: T.textMuted, fontSize: rs(9) }}> (Optional)</Text>
        }
      </Text>
      {children}
      {!!hint  && !error && <Text style={[S.fieldHint, { fontSize: rs(9) }]}>{hint}</Text>}
      {!!error && <ErrLabel msg={error} />}
    </View>
  );
}

/** Standard text input field */
function Field({
  label, value, onChange, placeholder, error, keyboardType,
  multiline, required = true, maxLength, hint, secureTextEntry, onLayout,
}) {
  return (
    <FieldWrap label={label} required={required} error={error} hint={hint} onLayout={onLayout}>
      <View style={[
        S.inputRow,
        error    && { borderColor: T.error,        backgroundColor: T.error   + "06" },
        multiline && { alignItems: "flex-start" },
      ]}>
        <TextInput
          style={[
            S.input,
            { fontSize: rs(13) },
            multiline && { height: vs(72), textAlignVertical: "top", paddingTop: vs(10) },
          ]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder ?? ""}
          placeholderTextColor={T.textMuted}
          keyboardType={keyboardType ?? "default"}
          multiline={multiline}
          maxLength={maxLength}
          secureTextEntry={secureTextEntry}
          autoCapitalize="none"
        />
      </View>
    </FieldWrap>
  );
}

/** Gender selector */
function GenderSelect({ value, onChange, error, onLayout }) {
  return (
    <View style={S.fieldWrap} onLayout={onLayout}>
      <Text style={[S.fieldLabel, { fontSize: rs(10) }]}>
        Gender <Text style={{ color: T.error }}>*</Text>
      </Text>
      <View style={S.genderRow}>
        {[
          { label: "Male",   icon: "gender-male" },
          { label: "Female", icon: "gender-female" },
          { label: "Other",  icon: "gender-non-binary" },
        ].map(opt => (
          <TouchableOpacity
            key={opt.label}
            onPress={() => onChange(opt.label)}
            style={[
              S.genderBtn,
              value === opt.label && {
                backgroundColor: T.accent + "1C",
                borderColor: T.accent,
              },
            ]}
          >
            <Icon name={opt.icon} size={rs(12)} color={value === opt.label ? T.accent : T.textMuted} />
            <Text style={[
              S.genderBtnText,
              { fontSize: rs(10), fontFamily: Fonts.Medium },
              value === opt.label && { color: T.accent, fontFamily: Fonts.Bold },
            ]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {!!error && <ErrLabel msg={error} />}
    </View>
  );
}

/** Card section header */
function SectionBanner({ icon, title, sub }) {
  return (
    <View style={S.sectionBanner}>
      <LinearGradient colors={[T.accent + "30", T.accent + "10"]} style={S.sectionBannerIcon}>
        <Icon name={icon} size={rs(20)} color={T.accent} />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={[S.sectionBannerTitle, { fontFamily: Fonts.Bold, fontSize: rs(16) }]}>
          {title}
        </Text>
        <Text style={[S.sectionBannerSub, { fontSize: rs(11) }]}>{sub}</Text>
      </View>
    </View>
  );
}

/** Horizontal divider with centred label */
function Divider({ label }) {
  return (
    <View style={S.divider}>
      <View style={S.dividerLine} />
      <Text style={[S.dividerLabel, { fontFamily: Fonts.Bold, fontSize: rs(9) }]}>{label}</Text>
      <View style={S.dividerLine} />
    </View>
  );
}

/** Inline error message */
function ErrLabel({ msg }) {
  return (
    <View style={S.errRow}>
      <Icon name="alert-circle-outline" size={rs(11)} color={T.error} />
      <Text style={[S.errText, { color: T.error, fontSize: rs(10) }]}> {msg}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES — plain hex tokens only
// ─────────────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  safeArea: { flex: 1 },

  // Header
  header:       { flexDirection: "row", alignItems: "center", paddingBottom: vs(10) },
  backBtn:      { width: hs(38), height: hs(38), borderRadius: hs(12), backgroundColor: T.surface, alignItems: "center", justifyContent: "center", marginRight: hs(10), elevation: 2, shadowColor: "#000", shadowOpacity: 0.07, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center", gap: hs(10) },
  headerLogo:   { width: hs(34), height: hs(34), borderRadius: hs(10), alignItems: "center", justifyContent: "center" },
  headerTitle:  { color: T.text, lineHeight: rs(20) },
  headerSub:    { color: T.textSub, marginTop: 1 },
  stepBadge:    { paddingHorizontal: hs(10), paddingVertical: vs(4), borderRadius: hs(10) },
  stepBadgeText:{ letterSpacing: 0.4 },

  // Progress
  progressWrap: { paddingBottom: vs(14) },
  progressTrack:{ height: 3, backgroundColor: T.border, borderRadius: 2, marginBottom: vs(10), overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  stepDots:     { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  stepDotItem:  { alignItems: "center", flex: 1 },
  stepDotCircle:{ alignItems: "center", justifyContent: "center", marginBottom: vs(4) },
  stepDotLabel: { color: T.textMuted, textAlign: "center", letterSpacing: 0.4 },

  // Scroll
  scrollContent: { paddingTop: vs(4) },

  // Card
  card: { backgroundColor: T.surface, borderRadius: hs(20), padding: hs(18), marginBottom: vs(14), elevation: 3, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 10 },

  // Section banner inside card
  sectionBanner:     { flexDirection: "row", alignItems: "center", gap: hs(12), marginBottom: vs(18), padding: hs(12), backgroundColor: T.accent + "0C", borderRadius: hs(14), borderLeftWidth: 3, borderLeftColor: T.accent },
  sectionBannerIcon: { width: hs(42), height: hs(42), borderRadius: hs(12), alignItems: "center", justifyContent: "center" },
  sectionBannerTitle:{ color: T.text },
  sectionBannerSub:  { color: T.textSub, marginTop: 2 },

  // Field
  fieldWrap:  { marginBottom: vs(12) },
  fieldLabel: { color: T.textSub, fontFamily: Fonts.Bold, letterSpacing: 0.7, marginBottom: vs(5), textTransform: "uppercase" },
  inputRow:   { flexDirection: "row", alignItems: "center", backgroundColor: T.inputBg, borderWidth: 1.2, borderColor: T.border, borderRadius: hs(10), paddingHorizontal: hs(12) },
  input:      { flex: 1, paddingVertical: vs(10), color: T.text, fontFamily: Fonts.Medium },
  fieldHint:  { color: T.textMuted, marginTop: vs(3), fontFamily: Fonts.Regular },
  errRow:     { flexDirection: "row", alignItems: "center", marginTop: vs(3) },
  errText:    { fontFamily: Fonts.Medium },

  // Eye toggle
  eyeBtn: { padding: hs(4) },

  // IFSC badge
  ifscBadge:     { position: "absolute", right: hs(8), paddingHorizontal: hs(8), paddingVertical: vs(5), borderRadius: hs(8) },
  ifscBadgeText: { letterSpacing: 0.3 },

  // Gender
  genderRow:      { flexDirection: "row", gap: hs(5) },
  genderBtn:      { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: vs(9), borderRadius: hs(8), backgroundColor: T.inputBg, borderWidth: 1.2, borderColor: T.border, gap: hs(4) },
  genderBtnText:  { color: T.textMuted },

  // Divider
  divider:      { flexDirection: "row", alignItems: "center", marginVertical: vs(14), gap: hs(8) },
  dividerLine:  { flex: 1, height: 1.2, backgroundColor: T.border },
  dividerLabel: { color: T.textMuted, letterSpacing: 1 },

  // Documents
  docHintText:   { color: T.textSub, marginBottom: vs(10), fontFamily: Fonts.Regular },
  docGrid:       {},
  docSlotWrap:   { marginBottom: vs(10) },
  docBox:        { height: vs(90), borderRadius: hs(14), borderWidth: 1.5, borderStyle: "dashed", borderColor: T.border, overflow: "hidden", backgroundColor: T.inputBg },
  docThumb:      { width: "100%", height: "100%", borderRadius: hs(12) },
  docOverlay:    { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", paddingHorizontal: hs(10), paddingVertical: vs(6), gap: hs(6) },
  docDoneLabel:  { color: T.success, fontFamily: Fonts.Bold, letterSpacing: 0.4 },
  docFileName:   { flex: 1, color: "#FFF", fontFamily: Fonts.Regular, fontSize: rs(9) },
  docCornerBtn:  { position: "absolute", top: vs(6), width: hs(22), height: hs(22), borderRadius: hs(11), alignItems: "center", justifyContent: "center" },
  docEmptyContent:{ flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: hs(14), gap: hs(12) },
  docIconCircle: { width: hs(42), height: hs(42), borderRadius: hs(21), alignItems: "center", justifyContent: "center" },
  docSlotLabel:  { color: T.text },
  docSlotSub:    { color: T.textMuted, marginTop: 2, fontFamily: Fonts.Regular },
  docUploadTag:  { flexDirection: "row", alignItems: "center", paddingHorizontal: hs(8), paddingVertical: vs(4), borderRadius: hs(10), borderWidth: 1, gap: hs(4) },
  docUploadTagText: {},

  // IFSC autofill
  autofillBox:  { flexDirection: "row", alignItems: "flex-start", borderWidth: 1, borderRadius: hs(10), padding: hs(10), marginBottom: vs(10), gap: hs(8) },
  autofillText: { fontFamily: Fonts.Regular },

  // Security banner
  securityBanner: { flexDirection: "row", alignItems: "flex-start", borderRadius: hs(12), padding: hs(12), marginTop: vs(12), gap: hs(10) },
  securityIcon:   { width: hs(36), height: hs(36), borderRadius: hs(10), alignItems: "center", justifyContent: "center" },
  securityTitle:  { marginBottom: vs(2) },
  securityBody:   { color: T.textSub, lineHeight: rs(16) },

  // Review notice
  reviewBanner: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#EFF6FF", borderRadius: hs(10), borderLeftWidth: 3, borderLeftColor: "#3B82F6", padding: hs(10), marginTop: vs(10), gap: hs(8) },
  reviewText:   { flex: 1, color: "#1D4ED8", lineHeight: rs(16) },

  // Action row
  actionRow:   { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: vs(4), marginBottom: vs(8), gap: hs(12) },
  prevBtn:     { flexDirection: "row", alignItems: "center", paddingVertical: vs(12), paddingHorizontal: hs(18), borderRadius: hs(12), borderWidth: 1.2, borderColor: T.border, backgroundColor: T.surface, gap: hs(6), elevation: 1 },
  prevBtnText: { color: T.text },
  nextBtnOuter:{ borderRadius: hs(14), overflow: "hidden", elevation: 5, shadowColor: T.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  nextBtnGrad: { flexDirection: "row", alignItems: "center", paddingVertical: vs(14), paddingHorizontal: hs(26) },
  nextBtnText: {},

  // Modal
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", paddingHorizontal: hs(24) },
  modalCard:    { backgroundColor: T.surface, width: "100%", borderRadius: hs(24), padding: hs(24), alignItems: "center", elevation: 10, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  modalIconWrap:{ width: rs(72), height: rs(72), borderRadius: rs(36), backgroundColor: T.success + "15", justifyContent: "center", alignItems: "center", marginBottom: vs(16) },
  modalTitle:   { color: T.text, fontSize: rs(18), fontFamily: Fonts.Bold, textAlign: "center", marginBottom: vs(8) },
  modalSub:     { color: T.textSub, fontSize: rs(12), fontFamily: Fonts.Regular, textAlign: "center", lineHeight: rs(18), marginBottom: vs(24) },
  modalBtn:     { width: "100%", borderRadius: hs(12), overflow: "hidden" },
  modalBtnGrad: { paddingVertical: vs(14), alignItems: "center", justifyContent: "center" },
  modalBtnText: { color: T.surface, fontFamily: Fonts.Bold, fontSize: rs(14) },
});