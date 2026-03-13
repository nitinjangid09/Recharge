import React, { useState, useRef } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Animated, Dimensions, StatusBar,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
  Image,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { launchImageLibrary } from "react-native-image-picker";

import Colors from "../../constants/Colors";
import Fonts from "../../constants/Fonts";

const { width } = Dimensions.get("window");

// ── Steps config ──────────────────────────────────────────────────────────────
const STEPS = [
  { key: "personal", label: "PERSONAL", icon: "account-outline" },
  { key: "business", label: "BUSINESS", icon: "store-outline" },
  { key: "banking", label: "BANKING", icon: "bank-outline" },
];

const BASE_URL = "https://your-api-domain.com/api"; // ← update

// ── Validation Regex ──────────────────────────────────────────────────────────
const REGEX = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[6-9]\d{9}$/,
  pincode: /^\d{6}$/,
  dob: /^(0[1-9]|[12]\d|3[01])-(0[1-9]|1[0-2])-\d{4}$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  aadhaar: /^\d{12}$/,
  ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
  gst: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  name: /^[a-zA-Z\s]{2,50}$/,
  accNum: /^\d{9,18}$/,
};

// ─────────────────────────────────────────────────────────────────────────────
export default function Offlinekyc({ navigation }) {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const animateNext = (cb) => {
    Animated.timing(slideAnim, { toValue: -width, duration: 210, useNativeDriver: true }).start(() => {
      cb();
      slideAnim.setValue(width);
      Animated.timing(slideAnim, { toValue: 0, duration: 210, useNativeDriver: true }).start();
    });
  };

  // ── Form States ───────────────────────────────────────────────────────────
  const [personal, setPersonal] = useState({
    firstName: "", lastName: "", fatherName: "",
    gender: "Male", email: "", phone: "",
    dob: "", address: "", pincode: "", state: "", city: "",
  });
  const [business, setBusiness] = useState({
    shopName: "", panCard: "", gstNumber: "",
    shopAddress: "", pincode: "", state: "", city: "",
    personalPan: "", aadhaar: "",
  });
  const [docImages, setDocImages] = useState([null, null, null]);
  const [banking, setBanking] = useState({
    accountHolder: "", bankName: "",
    accountNumber: "", confirmAccountNumber: "", branchName: "", ifsc: "",
  });
  const [errors, setErrors] = useState({});

  // ── Validators ────────────────────────────────────────────────────────────
  const validatePersonal = () => {
    const e = {};
    if (!personal.firstName.trim()) e.firstName = "First name is required";
    else if (!REGEX.name.test(personal.firstName.trim())) e.firstName = "Only letters allowed (2–50 chars)";
    if (!personal.lastName.trim()) e.lastName = "Last name is required";
    else if (!REGEX.name.test(personal.lastName.trim())) e.lastName = "Only letters allowed (2–50 chars)";
    if (!personal.fatherName.trim()) e.fatherName = "Father's name is required";
    else if (!REGEX.name.test(personal.fatherName.trim())) e.fatherName = "Only letters allowed";
    if (!personal.email.trim()) e.email = "Email address is required";
    else if (!REGEX.email.test(personal.email.trim())) e.email = "Enter a valid email (e.g. user@gmail.com)";
    if (!personal.phone.trim()) e.phone = "Mobile number is required";
    else if (!REGEX.phone.test(personal.phone.trim())) e.phone = "Enter a valid 10-digit Indian mobile number";
    if (!personal.dob.trim()) e.dob = "Date of birth is required";
    else if (!REGEX.dob.test(personal.dob.trim())) e.dob = "Use format DD-MM-YYYY";
    else {
      const [dd, mm, yyyy] = personal.dob.split("-").map(Number);
      const birth = new Date(yyyy, mm - 1, dd);
      const today = new Date();
      const age = today.getFullYear() - birth.getFullYear() -
        (today < new Date(today.getFullYear(), birth.getMonth(), birth.getDate()) ? 1 : 0);
      if (age < 18) e.dob = "You must be at least 18 years old";
    }
    if (!personal.address.trim()) e.address = "Address is required";
    else if (personal.address.trim().length < 10) e.address = "Address must be at least 10 characters";
    if (!personal.pincode.trim()) e.pincode = "Pincode is required";
    else if (!REGEX.pincode.test(personal.pincode.trim())) e.pincode = "Enter a valid 6-digit pincode";
    if (!personal.state.trim()) e.state = "State is required";
    if (!personal.city.trim()) e.city = "City is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateBusiness = () => {
    const e = {};
    if (!business.shopName.trim()) e.shopName = "Shop name is required";
    if (!business.shopAddress.trim()) e.shopAddress = "Shop address is required";
    else if (business.shopAddress.trim().length < 10) e.shopAddress = "Address must be at least 10 characters";
    if (!business.pincode.trim()) e.pincode = "Pincode is required";
    else if (!REGEX.pincode.test(business.pincode.trim())) e.pincode = "Enter a valid 6-digit pincode";
    if (!business.state.trim()) e.state = "State is required";
    if (!business.city.trim()) e.city = "City is required";
    if (!business.personalPan.trim()) e.personalPan = "Personal PAN is required";
    else if (!REGEX.pan.test(business.personalPan.trim())) e.personalPan = "Enter a valid PAN (e.g. ABCDE1234F)";
    if (!business.aadhaar.trim()) e.aadhaar = "Aadhaar number is required";
    else if (!REGEX.aadhaar.test(business.aadhaar.trim())) e.aadhaar = "Enter a valid 12-digit Aadhaar number";
    if (business.panCard.trim() && !REGEX.pan.test(business.panCard.trim()))
      e.panCard = "Enter a valid Business PAN";
    if (business.gstNumber.trim() && !REGEX.gst.test(business.gstNumber.trim()))
      e.gstNumber = "Enter a valid GST number";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateBanking = () => {
    const e = {};
    if (!banking.accountHolder.trim()) e.accountHolder = "Account holder name is required";
    else if (!REGEX.name.test(banking.accountHolder.trim())) e.accountHolder = "Only letters allowed";
    if (!banking.bankName.trim()) e.bankName = "Bank name is required";
    if (!banking.accountNumber.trim()) e.accountNumber = "Account number is required";
    else if (!REGEX.accNum.test(banking.accountNumber.trim())) e.accountNumber = "Enter a valid account number (9–18 digits)";
    if (!banking.confirmAccountNumber.trim()) e.confirmAccountNumber = "Please confirm your account number";
    else if (banking.accountNumber !== banking.confirmAccountNumber)
      e.confirmAccountNumber = "Account numbers do not match";
    if (!banking.branchName.trim()) e.branchName = "Branch name is required";
    if (!banking.ifsc.trim()) e.ifsc = "IFSC code is required";
    else if (!REGEX.ifsc.test(banking.ifsc.trim())) e.ifsc = "Enter a valid IFSC code (e.g. HDFC0001234)";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 0 && !validatePersonal()) return;
    if (step === 1 && !validateBusiness()) return;
    if (step < 2) {
      setErrors({});
      animateNext(() => setStep(p => p + 1));
    }
  };

  const handlePrev = () => {
    setErrors({});
    animateNext(() => setStep(p => p - 1));
  };

  // ── Image Picker ──────────────────────────────────────────────────────────
  const handlePickImage = (index) => {
    Alert.alert("Upload Document", "Choose source", [
      {
        text: "Camera / Gallery",
        onPress: () =>
          launchImageLibrary({ mediaType: "photo", quality: 0.85 }, (response) => {
            if (response.didCancel || response.errorCode) return;
            const asset = response.assets?.[0];
            if (asset) {
              const updated = [...docImages];
              updated[index] = {
                uri: asset.uri,
                name: asset.fileName || `doc_${index + 1}.jpg`,
                type: asset.type || "image/jpeg",
              };
              setDocImages(updated);
            }
          }),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const handleRemoveImage = (index) => {
    const updated = [...docImages];
    updated[index] = null;
    setDocImages(updated);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validateBanking()) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("header_token");
      const hasImages = docImages.some(Boolean);
      let body, headers;

      if (hasImages) {
        const form = new FormData();
        form.append("personal", JSON.stringify(personal));
        form.append("business", JSON.stringify(business));
        form.append("banking", JSON.stringify({ ...banking, confirmAccountNumber: undefined }));
        docImages.forEach((img, i) => {
          if (img) form.append(`document_${i}`, { uri: img.uri, name: img.name, type: img.type });
        });
        body = form;
        headers = { "Authorization": `Bearer ${token}`, "Content-Type": "multipart/form-data" };
      } else {
        body = JSON.stringify({ personal, business, banking: { ...banking, confirmAccountNumber: undefined } });
        headers = { "Content-Type": "application/json", "Authorization": `Bearer ${token}` };
      }

      const res = await fetch(`${BASE_URL}/kyc/submit`, { method: "POST", headers, body });
      const data = await res.json();

      if (data.success) {
        await AsyncStorage.setItem("kyc_status", "pending");
        Alert.alert(
          "KYC Submitted ✓",
          "Your KYC is under review. We'll notify you shortly.",
          [{ text: "OK", onPress: () => navigation.replace("FinanceHome") }]
        );
      } else {
        Alert.alert("Submission Failed", data.message || "Please try again.");
      }
    } catch (err) {
      console.error("KYC submit error:", err);
      Alert.alert("Network Error", "Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.finance_bg_1} />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={22} color={Colors.finance_text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <LinearGradient colors={[Colors.finance_accent, "#8B6914"]} style={styles.headerLogo}>
            <Icon name="shield-account-outline" size={18} color={Colors.white} />
          </LinearGradient>
          <Text style={styles.headerTitle}>Complete Your KYC</Text>
        </View>
        <View style={styles.stepCountBadge}>
          <Text style={styles.stepCount}>{step + 1} / 3</Text>
        </View>
      </View>

      {/* ── Stepper ── */}
      <Stepper current={step} />

      {/* ── Form ── */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Animated.View style={[{ flex: 1 }, { transform: [{ translateX: slideAnim }] }]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {step === 0 && (
              <PersonalForm data={personal} onChange={p => setPersonal(v => ({ ...v, ...p }))} errors={errors} />
            )}
            {step === 1 && (
              <BusinessForm
                data={business} onChange={p => setBusiness(v => ({ ...v, ...p }))}
                errors={errors} docImages={docImages}
                onPickImage={handlePickImage} onRemoveImage={handleRemoveImage}
              />
            )}
            {step === 2 && (
              <BankingForm data={banking} onChange={p => setBanking(v => ({ ...v, ...p }))} errors={errors} />
            )}

            {/* ── Nav Buttons ── */}
            <View style={styles.actionRow}>
              {step > 0 && (
                <TouchableOpacity style={styles.prevBtn} onPress={handlePrev}>
                  <Icon name="arrow-left" size={18} color={Colors.finance_text} />
                  <Text style={styles.prevBtnText}>Back</Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }} />
              {step < 2 ? (
                <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
                  <LinearGradient colors={[Colors.finance_accent, "#8B6914"]} style={styles.nextBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={styles.nextBtnText}>Next Step</Text>
                    <Icon name="arrow-right" size={18} color={Colors.white} style={{ marginLeft: 6 }} />
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.nextBtn} onPress={handleSubmit} activeOpacity={0.85} disabled={loading}>
                  <LinearGradient colors={[Colors.finance_accent, "#8B6914"]} style={styles.nextBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {loading
                      ? <ActivityIndicator color={Colors.white} size="small" />
                      : <>
                        <Text style={styles.nextBtnText}>Submit KYC</Text>
                        <Icon name="check-circle-outline" size={18} color={Colors.white} style={{ marginLeft: 6 }} />
                      </>
                    }
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEPPER
// ─────────────────────────────────────────────────────────────────────────────
function Stepper({ current }) {
  return (
    <View style={styles.stepperWrap}>
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <React.Fragment key={s.key}>
            {i > 0 && <View style={[styles.stepLine, done && styles.stepLineDone]} />}
            <View style={styles.stepItem}>
              <LinearGradient
                colors={
                  done ? [Colors.finance_success, "#16A34A"] :
                    active ? [Colors.finance_accent, "#8B6914"] :
                      ["#D1D5DB", "#D1D5DB"]
                }
                style={styles.stepCircle}
              >
                <Icon
                  name={done ? "check" : s.icon}
                  size={16}
                  color={done || active ? Colors.white : "#9CA3AF"}
                />
              </LinearGradient>
              <Text style={[
                styles.stepLabel,
                done && { color: Colors.finance_success },
                active && { color: Colors.finance_accent, fontFamily: Fonts.Bold },
              ]}>{s.label}</Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED INPUTS
// ─────────────────────────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, error, keyboardType, half, multiline, required = true, maxLength, hint, secureTextEntry, rightElement }) {
  return (
    <View style={[styles.fieldWrap, half && styles.fieldHalf]}>
      <Text style={styles.fieldLabel}>
        {label}
        {required
          ? <Text style={{ color: Colors.finance_error }}> *</Text>
          : <Text style={{ color: "#9CA3AF", fontSize: 9 }}> (Optional)</Text>
        }
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
            rightElement && { paddingRight: 38 },
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
        {rightElement && <View style={styles.fieldRight}>{rightElement}</View>}
      </View>
      {!!hint && !error && <Text style={styles.fieldHint}>{hint}</Text>}
      {!!error && (
        <View style={styles.errorRow}>
          <Icon name="alert-circle-outline" size={11} color={Colors.finance_error} />
          <Text style={styles.fieldError}> {error}</Text>
        </View>
      )}
    </View>
  );
}

function GenderPicker({ value, onChange }) {
  return (
    <View style={[styles.fieldWrap, styles.fieldHalf]}>
      <Text style={styles.fieldLabel}>GENDER <Text style={{ color: Colors.finance_error }}>*</Text></Text>
      <View style={styles.genderRow}>
        {[
          { label: "Male", icon: "gender-male" },
          { label: "Female", icon: "gender-female" },
          { label: "Other", icon: "gender-non-binary" },
        ].map(opt => (
          <TouchableOpacity
            key={opt.label}
            onPress={() => onChange(opt.label)}
            style={[styles.genderBtn, value === opt.label && styles.genderBtnActive]}
          >
            <Icon name={opt.icon} size={13} color={value === opt.label ? Colors.finance_accent : "#9CA3AF"} />
            <Text style={[styles.genderBtnText, value === opt.label && styles.genderBtnTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Personal
// ─────────────────────────────────────────────────────────────────────────────
function PersonalForm({ data, onChange, errors }) {
  return (
    <View style={styles.card}>
      <CardHeader icon="account-outline" title="Personal Details" sub="Your basic identity information" />

      <View style={styles.row}>
        <Field label="FIRST NAME" value={data.firstName} onChange={v => onChange({ firstName: v })} error={errors.firstName} half placeholder="First name" maxLength={50} />
        <Field label="LAST NAME" value={data.lastName} onChange={v => onChange({ lastName: v })} error={errors.lastName} half placeholder="Last name" maxLength={50} />
      </View>
      <View style={styles.row}>
        <Field label="FATHER'S NAME" value={data.fatherName} onChange={v => onChange({ fatherName: v })} error={errors.fatherName} half placeholder="Father's full name" maxLength={50} />
        <GenderPicker value={data.gender} onChange={v => onChange({ gender: v })} />
      </View>
      <View style={styles.row}>
        <Field
          label="EMAIL ADDRESS" value={data.email}
          onChange={v => onChange({ email: v.toLowerCase() })}
          error={errors.email} half placeholder="you@email.com"
          keyboardType="email-address" hint="e.g. user@gmail.com"
        />
        <Field
          label="MOBILE NUMBER" value={data.phone}
          onChange={v => { if (/^\d*$/.test(v) && v.length <= 10) onChange({ phone: v }); }}
          error={errors.phone} half placeholder="10-digit number"
          keyboardType="number-pad" maxLength={10} hint="Starts with 6–9"
        />
      </View>
      <View style={styles.row}>
        <Field
          label="DATE OF BIRTH" value={data.dob}
          onChange={v => {
            let clean = v.replace(/[^0-9]/g, "");
            if (clean.length > 2) clean = clean.slice(0, 2) + "-" + clean.slice(2);
            if (clean.length > 5) clean = clean.slice(0, 5) + "-" + clean.slice(5);
            onChange({ dob: clean.slice(0, 10) });
          }}
          error={errors.dob} half placeholder="DD-MM-YYYY"
          keyboardType="number-pad" maxLength={10} hint="Min age: 18 years"
        />
        <Field label="STATE" value={data.state} onChange={v => onChange({ state: v })} error={errors.state} half placeholder="e.g. Rajasthan" />
      </View>
      <View style={styles.row}>
        <Field
          label="PINCODE" value={data.pincode}
          onChange={v => { if (/^\d*$/.test(v) && v.length <= 6) onChange({ pincode: v }); }}
          error={errors.pincode} half placeholder="6-digit pincode"
          keyboardType="number-pad" maxLength={6}
        />
        <Field label="CITY" value={data.city} onChange={v => onChange({ city: v })} error={errors.city} half placeholder="e.g. Jaipur" />
      </View>
      <Field
        label="FULL ADDRESS" value={data.address}
        onChange={v => onChange({ address: v })}
        error={errors.address} placeholder="House no., Street, Area, Landmark"
        multiline hint="Minimum 10 characters"
      />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Business
// ─────────────────────────────────────────────────────────────────────────────
const DOC_CONFIG = [
  { label: "PAN Card", sub: "Clear photo of PAN", icon: "card-account-details-outline" },
  { label: "Aadhaar Front", sub: "Front side of Aadhaar", icon: "card-account-details" },
  { label: "Aadhaar Back", sub: "Back side of Aadhaar", icon: "card-account-details-outline" },
];

function BusinessForm({ data, onChange, errors, docImages, onPickImage, onRemoveImage }) {
  return (
    <View style={styles.card}>
      <CardHeader icon="store-outline" title="Business Information" sub="Shop details & owner identification" />

      <Field label="SHOP / BUSINESS NAME" value={data.shopName} onChange={v => onChange({ shopName: v })} error={errors.shopName} placeholder="Your shop name" maxLength={100} />
      <View style={styles.row}>
        <Field
          label="BUSINESS PAN" value={data.panCard}
          onChange={v => onChange({ panCard: v.toUpperCase() })}
          placeholder="ABCDE1234F" half maxLength={10} error={errors.panCard}
          hint="10-char PAN format" required={false}
        />
        <Field
          label="GST NUMBER" value={data.gstNumber}
          onChange={v => onChange({ gstNumber: v.toUpperCase() })}
          placeholder="22AAAAA0000A1Z5" half maxLength={15} error={errors.gstNumber}
          required={false}
        />
      </View>
      <Field
        label="SHOP ADDRESS" value={data.shopAddress}
        onChange={v => onChange({ shopAddress: v })}
        error={errors.shopAddress} placeholder="Full shop address with landmark"
        multiline hint="Minimum 10 characters"
      />
      <View style={styles.row}>
        <Field
          label="PINCODE" value={data.pincode}
          onChange={v => { if (/^\d*$/.test(v) && v.length <= 6) onChange({ pincode: v }); }}
          error={errors.pincode} half placeholder="6-digit pincode"
          keyboardType="number-pad" maxLength={6}
        />
        <Field label="STATE" value={data.state} onChange={v => onChange({ state: v })} error={errors.state} half placeholder="e.g. Rajasthan" />
      </View>
      <Field label="CITY" value={data.city} onChange={v => onChange({ city: v })} error={errors.city} placeholder="e.g. Jaipur" />

      <SectionDivider label="OWNER IDENTIFICATION" />
      <View style={styles.row}>
        <Field
          label="PERSONAL PAN" value={data.personalPan}
          onChange={v => onChange({ personalPan: v.toUpperCase() })}
          error={errors.personalPan} half placeholder="ACDFD3434D" maxLength={10}
          hint="Format: AAAAA9999A"
        />
        <Field
          label="AADHAAR NUMBER" value={data.aadhaar}
          onChange={v => { if (/^\d*$/.test(v) && v.length <= 12) onChange({ aadhaar: v }); }}
          error={errors.aadhaar} half placeholder="12-digit number"
          keyboardType="number-pad" maxLength={12}
        />
      </View>

      <SectionDivider label="UPLOAD DOCUMENTS (PHOTO / IMAGE)" />
      <Text style={styles.docHint}>
        Take a clear, well-lit photo of each document. Supported: JPG, PNG.
      </Text>
      <View style={styles.docGrid}>
        {DOC_CONFIG.map((doc, i) => {
          const img = docImages[i];
          return (
            <View key={i} style={styles.docBoxWrap}>
              <TouchableOpacity
                style={[styles.docBox, img && styles.docBoxDone]}
                onPress={() => onPickImage(i)}
                activeOpacity={0.8}
              >
                {img ? (
                  <>
                    <Image source={{ uri: img.uri }} style={styles.docPreviewImage} resizeMode="cover" />
                    <LinearGradient
                      colors={["transparent", "rgba(0,0,0,0.72)"]}
                      style={styles.docOverlay}
                    >
                      <Icon name="check-circle" size={16} color={Colors.finance_success} />
                      <Text style={styles.docUploadedLabel}>DONE</Text>
                    </LinearGradient>
                    <TouchableOpacity
                      style={styles.docEditBtn}
                      onPress={() => onPickImage(i)}
                    >
                      <Icon name="pencil" size={10} color={Colors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.docEditBtn, { right: 26, backgroundColor: Colors.finance_error }]}
                      onPress={() => onRemoveImage(i)}
                    >
                      <Icon name="close" size={10} color={Colors.white} />
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <LinearGradient
                      colors={[Colors.finance_accent + "20", Colors.finance_accent + "08"]}
                      style={styles.docIconCircle}
                    >
                      <Icon name={doc.icon} size={24} color={Colors.finance_accent} />
                    </LinearGradient>
                    <Text style={styles.docLabel}>{doc.label}</Text>
                    <Text style={styles.docSub}>{doc.sub}</Text>
                    <View style={styles.docUploadChip}>
                      <Icon name="camera-plus-outline" size={11} color={Colors.finance_accent} />
                      <Text style={styles.docUploadChipText}>Upload</Text>
                    </View>
                  </>
                )}
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Banking
// ─────────────────────────────────────────────────────────────────────────────
function BankingForm({ data, onChange, errors }) {
  const [showAcc, setShowAcc] = useState(false);
  return (
    <View style={styles.card}>
      <CardHeader icon="bank-outline" title="Banking Details" sub="For settlements and commissions" />

      <View style={styles.row}>
        <Field
          label="ACCOUNT HOLDER NAME" value={data.accountHolder}
          onChange={v => onChange({ accountHolder: v })}
          error={errors.accountHolder} half placeholder="As per bank records" maxLength={50}
        />
        <Field
          label="BANK NAME" value={data.bankName}
          onChange={v => onChange({ bankName: v })}
          error={errors.bankName} half placeholder="e.g. HDFC Bank"
        />
      </View>

      {/* Account number with eye toggle */}
      <Field
        label="ACCOUNT NUMBER" value={data.accountNumber}
        onChange={v => { if (/^\d*$/.test(v) && v.length <= 18) onChange({ accountNumber: v }); }}
        error={errors.accountNumber} placeholder="Enter account number"
        keyboardType="number-pad" maxLength={18}
        secureTextEntry={!showAcc}
        rightElement={
          <TouchableOpacity onPress={() => setShowAcc(p => !p)} style={{ padding: 4 }}>
            <Icon name={showAcc ? "eye-off-outline" : "eye-outline"} size={18} color="#9CA3AF" />
          </TouchableOpacity>
        }
      />
      <Field
        label="CONFIRM ACCOUNT NUMBER" value={data.confirmAccountNumber}
        onChange={v => { if (/^\d*$/.test(v) && v.length <= 18) onChange({ confirmAccountNumber: v }); }}
        error={errors.confirmAccountNumber} placeholder="Re-enter account number"
        keyboardType="number-pad" maxLength={18} hint="Both numbers must match exactly"
      />

      <View style={styles.row}>
        <Field
          label="BRANCH NAME" value={data.branchName}
          onChange={v => onChange({ branchName: v })}
          error={errors.branchName} half placeholder="Branch name"
        />
        <Field
          label="IFSC CODE" value={data.ifsc}
          onChange={v => onChange({ ifsc: v.toUpperCase() })}
          error={errors.ifsc} half placeholder="HDFC0001234" maxLength={11}
          hint="Format: AAAA0XXXXXX"
        />
      </View>

      <LinearGradient colors={[Colors.finance_accent + "18", Colors.finance_accent + "0A"]} style={styles.infoBanner}>
        <View style={styles.infoBannerIcon}>
          <Icon name="shield-lock-outline" size={20} color={Colors.finance_accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.infoBannerTitle}>256-bit Encrypted</Text>
          <Text style={styles.infoBannerText}>
            Banking details are encrypted and used only for payouts and settlements.
          </Text>
        </View>
      </LinearGradient>

      <View style={styles.reviewBanner}>
        <Icon name="information-outline" size={15} color="#3B82F6" />
        <Text style={styles.reviewText}>
          Review all details carefully. Changes after submission may delay KYC approval.
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function CardHeader({ icon, title, sub }) {
  return (
    <View style={styles.cardTitleRow}>
      <LinearGradient colors={[Colors.finance_accent + "28", Colors.finance_accent + "10"]} style={styles.cardTitleIcon}>
        <Icon name={icon} size={20} color={Colors.finance_accent} />
      </LinearGradient>
      <View>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardSub}>{sub}</Text>
      </View>
    </View>
  );
}

function SectionDivider({ label }) {
  return (
    <View style={styles.sectionDivider}>
      <View style={styles.sectionDividerLine} />
      <Text style={styles.sectionDividerText}>{label}</Text>
      <View style={styles.sectionDividerLine} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.finance_bg_1 },

  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingBottom: 10, backgroundColor: Colors.finance_bg_1 },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.white, alignItems: "center", justifyContent: "center", marginRight: 10, elevation: 2, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  headerCenter: { flex: 1, flexDirection: "row", alignItems: "center" },
  headerLogo: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 10 },
  headerTitle: { fontSize: 16, fontFamily: Fonts.Bold, color: Colors.finance_text },
  stepCountBadge: { backgroundColor: Colors.finance_accent + "22", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  stepCount: { fontSize: 11, fontFamily: Fonts.Bold, color: Colors.finance_accent, letterSpacing: 0.5 },

  stepperWrap: { flexDirection: "row", alignItems: "center", paddingHorizontal: 20, paddingBottom: 14, backgroundColor: Colors.finance_bg_1 },
  stepItem: { alignItems: "center" },
  stepCircle: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  stepLabel: { fontSize: 9, fontFamily: Fonts.Medium, color: "#9CA3AF", letterSpacing: 0.5 },
  stepLine: { flex: 1, height: 2, backgroundColor: "#D1D5DB", marginBottom: 20, marginHorizontal: 2 },
  stepLineDone: { backgroundColor: Colors.finance_success },

  scrollContent: { paddingHorizontal: 16, paddingBottom: 44 },

  card: { backgroundColor: Colors.white, borderRadius: 20, padding: 18, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3, marginBottom: 14 },
  cardTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: 18 },
  cardTitleIcon: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 12 },
  cardTitle: { fontSize: 17, fontFamily: Fonts.Bold, color: Colors.finance_text },
  cardSub: { fontSize: 12, fontFamily: Fonts.Regular, color: "#6B7280", marginTop: 1 },

  row: { flexDirection: "row", gap: 10 },
  fieldWrap: { marginBottom: 12, flex: 1 },
  fieldHalf: { flex: 1 },
  fieldLabel: { fontSize: 10, fontFamily: Fonts.Bold, color: "#6B7280", letterSpacing: 0.8, marginBottom: 5 },
  fieldInputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", borderRadius: 10, paddingHorizontal: 12 },
  fieldInput: { flex: 1, paddingVertical: 10, fontSize: 13, color: Colors.finance_text, fontFamily: Fonts.Medium },
  fieldRight: { position: "absolute", right: 10 },
  fieldInputError: { borderColor: Colors.finance_error, backgroundColor: "#FFF5F5" },
  errorRow: { flexDirection: "row", alignItems: "center", marginTop: 3 },
  fieldError: { color: Colors.finance_error, fontSize: 10, fontFamily: Fonts.Medium },
  fieldHint: { color: "#9CA3AF", fontSize: 9, marginTop: 3, fontFamily: Fonts.Regular },

  genderRow: { flexDirection: "row", gap: 5 },
  genderBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 9, borderRadius: 8, backgroundColor: "#F9FAFB", borderWidth: 1, borderColor: "#E5E7EB", gap: 3 },
  genderBtnActive: { backgroundColor: Colors.finance_accent + "18", borderColor: Colors.finance_accent },
  genderBtnText: { fontSize: 10, fontFamily: Fonts.Medium, color: "#9CA3AF" },
  genderBtnTextActive: { color: Colors.finance_accent },

  sectionDivider: { flexDirection: "row", alignItems: "center", marginVertical: 14, gap: 8 },
  sectionDividerLine: { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  sectionDividerText: { fontSize: 9, fontFamily: Fonts.Bold, color: "#9CA3AF", letterSpacing: 1 },

  docHint: { fontSize: 11, color: "#6B7280", marginBottom: 10, fontFamily: Fonts.Regular },
  docGrid: { flexDirection: "row", gap: 8 },
  docBoxWrap: { flex: 1 },
  docBox: { flex: 1, aspectRatio: 0.72, backgroundColor: "#F9FAFB", borderRadius: 14, borderWidth: 1.5, borderColor: "#E5E7EB", borderStyle: "dashed", alignItems: "center", justifyContent: "center", padding: 8, overflow: "hidden" },
  docBoxDone: { borderStyle: "solid", borderColor: Colors.finance_success, padding: 0 },
  docPreviewImage: { width: "100%", height: "100%", borderRadius: 12 },
  docOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "center", paddingVertical: 6, borderBottomLeftRadius: 12, borderBottomRightRadius: 12 },
  docUploadedLabel: { fontSize: 8, fontFamily: Fonts.Bold, color: Colors.finance_success, letterSpacing: 0.5, marginTop: 2 },
  docEditBtn: { position: "absolute", top: 5, right: 5, width: 18, height: 18, borderRadius: 9, backgroundColor: Colors.finance_accent, alignItems: "center", justifyContent: "center" },
  docIconCircle: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  docLabel: { fontSize: 10, fontFamily: Fonts.Bold, color: Colors.finance_text, textAlign: "center" },
  docSub: { fontSize: 8, color: "#9CA3AF", textAlign: "center", marginTop: 2, lineHeight: 11 },
  docUploadChip: { flexDirection: "row", alignItems: "center", marginTop: 7, backgroundColor: Colors.finance_accent + "18", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, gap: 3 },
  docUploadChipText: { fontSize: 9, color: Colors.finance_accent, fontFamily: Fonts.Bold },

  infoBanner: { flexDirection: "row", alignItems: "flex-start", borderRadius: 12, padding: 12, marginTop: 12, gap: 10 },
  infoBannerIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: Colors.finance_accent + "22", alignItems: "center", justifyContent: "center" },
  infoBannerTitle: { fontSize: 12, fontFamily: Fonts.Bold, color: Colors.finance_accent, marginBottom: 2 },
  infoBannerText: { fontSize: 11, color: "#6B7280", lineHeight: 16, fontFamily: Fonts.Regular },

  reviewBanner: { flexDirection: "row", alignItems: "flex-start", backgroundColor: "#EFF6FF", borderRadius: 10, borderLeftWidth: 3, borderLeftColor: "#3B82F6", padding: 10, marginTop: 10, gap: 8 },
  reviewText: { flex: 1, fontSize: 11, color: "#1D4ED8", lineHeight: 16, fontFamily: Fonts.Regular },

  actionRow: { flexDirection: "row", alignItems: "center", marginTop: 4, marginBottom: 8 },
  prevBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1, borderColor: "#E5E7EB", backgroundColor: Colors.white, gap: 6, elevation: 1 },
  prevBtnText: { fontSize: 14, fontFamily: Fonts.SemiBold, color: Colors.finance_text },
  nextBtn: { borderRadius: 14, overflow: "hidden", elevation: 4 },
  nextBtnGrad: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 26 },
  nextBtnText: { fontSize: 14, fontFamily: Fonts.Bold, color: Colors.white },
});