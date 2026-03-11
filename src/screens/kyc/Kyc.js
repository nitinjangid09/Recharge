/**
 * KYCScreen.jsx
 *
 * Multi-step KYC flow:
 *   Step 1 — Personal Details
 *   Step 2 — Business Information  (with document upload)
 *   Step 3 — Banking Details       (submit)
 *
 * Dependencies:
 *   react-native-linear-gradient
 *   react-native-vector-icons/MaterialCommunityIcons
 *   react-native-document-picker          ← for PDF upload
 *   react-native-safe-area-context
 *   @react-native-async-storage/async-storage
 *
 * Usage in navigator:
 *   <Stack.Screen name="KYCScreen" component={KYCScreen} />
 */

import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Animated, Dimensions, StatusBar,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
// import DocumentPicker from "react-native-document-picker"; // uncomment when installed

const { width } = Dimensions.get("window");

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  bg:         "#F7F8FA",
  card:       "#FFFFFF",
  primary:    "#E55A2B",        // orange accent
  primary_lt: "#FFF0EB",
  success:    "#22C55E",
  success_lt: "#EDFDF4",
  text:       "#1A1A2E",
  sub:        "#6B7280",
  border:     "#E5E7EB",
  input_bg:   "#F9FAFB",
  label:      "#9CA3AF",
  error:      "#EF4444",
  step_done:  "#22C55E",
  step_act:   "#E55A2B",
  step_idle:  "#D1D5DB",
  white:      "#FFFFFF",
};

// ── Steps config ──────────────────────────────────────────────────────────────
const STEPS = [
  { key: "personal", label: "PERSONAL", icon: "account-outline"   },
  { key: "business", label: "BUSINESS", icon: "store-outline"     },
  { key: "banking",  label: "BANKING",  icon: "bank-outline"      },
];

// ── KYC API endpoint ──────────────────────────────────────────────────────────
const BASE_URL = "https://your-api-domain.com/api"; // ← update

// ─────────────────────────────────────────────────────────────────────────────
export default function KYCScreen({ navigation }) {
  const insets  = useSafeAreaInsets();
  const [step,  setStep]    = useState(0);   // 0=personal, 1=business, 2=banking
  const [loading, setLoading] = useState(false);

  // Slide animation
  const slideAnim = useRef(new Animated.Value(0)).current;

  const goNext = () => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: -width, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      setStep(p => p + 1);
      slideAnim.setValue(width);
      Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    });
  };

  const goPrev = () => {
    Animated.sequence([
      Animated.timing(slideAnim, { toValue: width, duration: 220, useNativeDriver: true }),
    ]).start(() => {
      setStep(p => p - 1);
      slideAnim.setValue(-width);
      Animated.timing(slideAnim, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    });
  };

  // ── Personal form state ───────────────────────────────────────────────────
  const [personal, setPersonal] = useState({
    firstName: "", lastName: "", fatherName: "",
    gender: "Male", email: "", phone: "",
    dob: "", address: "", pincode: "", state: "", city: "",
  });

  // ── Business form state ───────────────────────────────────────────────────
  const [business, setBusiness] = useState({
    shopName: "", panCard: "", gstNumber: "",
    shopAddress: "", pincode: "", state: "", city: "",
    personalPan: "", aadhaar: "",
  });
  const [docs, setDocs] = useState([null, null, null]); // 3 PDF slots

  // ── Banking form state ────────────────────────────────────────────────────
  const [banking, setBanking] = useState({
    accountHolder: "", bankName: "",
    accountNumber: "", branchName: "", ifsc: "",
  });

  // ── Errors ────────────────────────────────────────────────────────────────
  const [errors, setErrors] = useState({});

  const validatePersonal = () => {
    const e = {};
    if (!personal.firstName.trim())  e.firstName  = "Required";
    if (!personal.lastName.trim())   e.lastName   = "Required";
    if (!personal.fatherName.trim()) e.fatherName = "Required";
    if (!personal.email.trim())      e.email      = "Required";
    if (!personal.phone.trim())      e.phone      = "Required";
    if (!personal.dob.trim())        e.dob        = "Required";
    if (!personal.address.trim())    e.address    = "Required";
    if (!personal.pincode.trim())    e.pincode    = "Required";
    if (!personal.state.trim())      e.state      = "Required";
    if (!personal.city.trim())       e.city       = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateBusiness = () => {
    const e = {};
    if (!business.shopName.trim())    e.shopName    = "Required";
    if (!business.shopAddress.trim()) e.shopAddress = "Required";
    if (!business.pincode.trim())     e.pincode     = "Required";
    if (!business.state.trim())       e.state       = "Required";
    if (!business.city.trim())        e.city        = "Required";
    if (!business.personalPan.trim()) e.personalPan = "Required";
    if (!business.aadhaar.trim())     e.aadhaar     = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateBanking = () => {
    const e = {};
    if (!banking.accountHolder.trim()) e.accountHolder = "Required";
    if (!banking.bankName.trim())      e.bankName      = "Required";
    if (!banking.accountNumber.trim()) e.accountNumber = "Required";
    if (!banking.branchName.trim())    e.branchName    = "Required";
    if (!banking.ifsc.trim())          e.ifsc          = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (step === 0 && !validatePersonal()) return;
    if (step === 1 && !validateBusiness()) return;
    if (step < 2) { setErrors({}); goNext(); }
  };

  const handlePickDoc = async (index) => {
    // Uncomment when react-native-document-picker is installed:
    // try {
    //   const result = await DocumentPicker.pickSingle({ type: [DocumentPicker.types.pdf] });
    //   const newDocs = [...docs];
    //   newDocs[index] = result;
    //   setDocs(newDocs);
    // } catch (e) {
    //   if (!DocumentPicker.isCancel(e)) Alert.alert("Error", "Could not pick document.");
    // }

    // Placeholder — simulate upload
    const newDocs = [...docs];
    newDocs[index] = { name: `document_${index + 1}.pdf` };
    setDocs(newDocs);
  };

  const handleSubmit = async () => {
    if (!validateBanking()) return;
    setLoading(true);
    try {
      const token = await AsyncStorage.getItem("header_token");
      const payload = { personal, business, banking };

      const res = await fetch(`${BASE_URL}/kyc/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        await AsyncStorage.setItem("kyc_status", "pending");
        Alert.alert("KYC Submitted", "Your KYC is under review. We'll notify you shortly.", [
          { text: "OK", onPress: () => navigation.replace("FinanceHome") },
        ]);
      } else {
        Alert.alert("Submission Failed", data.message || "Please try again.");
      }
    } catch (err) {
      console.error("KYC submit error:", err);
      Alert.alert("Error", "Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={["bottom"]}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <View style={styles.headerLeft}>
          <View style={styles.headerLogo}>
            <Text style={styles.headerLogoText}>K</Text>
          </View>
          <Text style={styles.headerTitle}>Complete Your KYC</Text>
        </View>
        <Text style={styles.stepCount}>STEP {step + 1} OF 3</Text>
      </View>

      {/* ── Progress stepper ── */}
      <Stepper current={step} />

      {/* ── Form content ── */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Animated.View style={[{ flex: 1 }, { transform: [{ translateX: slideAnim }] }]}>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {step === 0 && (
              <PersonalForm
                data={personal} onChange={p => setPersonal(prev => ({ ...prev, ...p }))}
                errors={errors}
              />
            )}
            {step === 1 && (
              <BusinessForm
                data={business} onChange={p => setBusiness(prev => ({ ...prev, ...p }))}
                errors={errors} docs={docs} onPickDoc={handlePickDoc}
              />
            )}
            {step === 2 && (
              <BankingForm
                data={banking} onChange={p => setBanking(prev => ({ ...prev, ...p }))}
                errors={errors}
              />
            )}

            {/* ── Action buttons ── */}
            <View style={styles.actionRow}>
              {step > 0 && (
                <TouchableOpacity style={styles.prevBtn} onPress={goPrev}>
                  <Icon name="arrow-left" size={18} color={C.text} />
                  <Text style={styles.prevBtnText}>Previous</Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }} />
              {step < 2 ? (
                <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
                  <LinearGradient colors={[C.primary, "#C94A1F"]} style={styles.nextBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    <Text style={styles.nextBtnText}>Next Step</Text>
                    <Icon name="arrow-right" size={18} color="#FFF" style={{ marginLeft: 6 }} />
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.nextBtn} onPress={handleSubmit} activeOpacity={0.85} disabled={loading}>
                  <LinearGradient colors={[C.primary, "#C94A1F"]} style={styles.nextBtnGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                    {loading
                      ? <ActivityIndicator color="#FFF" size="small" />
                      : <>
                          <Text style={styles.nextBtnText}>Submit KYC</Text>
                          <Icon name="check" size={18} color="#FFF" style={{ marginLeft: 6 }} />
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
        const done   = i < current;
        const active = i === current;
        return (
          <React.Fragment key={s.key}>
            {/* connector line before each step except first */}
            {i > 0 && (
              <View style={[styles.stepLine, done && styles.stepLineDone]} />
            )}
            <View style={styles.stepItem}>
              <View style={[
                styles.stepCircle,
                done   && styles.stepCircleDone,
                active && styles.stepCircleActive,
              ]}>
                {done
                  ? <Icon name="check" size={16} color="#FFF" />
                  : <Icon name={s.icon} size={16} color={active ? "#FFF" : C.sub} />
                }
              </View>
              <Text style={[
                styles.stepLabel,
                done   && { color: C.success },
                active && { color: C.primary, fontWeight: "700" },
              ]}>
                {s.label}
              </Text>
            </View>
          </React.Fragment>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SHARED INPUT
// ─────────────────────────────────────────────────────────────────────────────
function Field({ label, value, onChange, placeholder, error, keyboardType, half, multiline, editable = true }) {
  return (
    <View style={[styles.fieldWrap, half && styles.fieldHalf]}>
      <Text style={styles.fieldLabel}>{label} <Text style={{ color: C.error }}>*</Text></Text>
      <TextInput
        style={[
          styles.fieldInput,
          error         && styles.fieldInputError,
          multiline     && { height: 72, textAlignVertical: "top", paddingTop: 10 },
          !editable     && { backgroundColor: "#F0F0F0", color: C.sub },
        ]}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? ""}
        placeholderTextColor={C.label}
        keyboardType={keyboardType ?? "default"}
        multiline={multiline}
        editable={editable}
        autoCapitalize="none"
      />
      {!!error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

function OptionalField({ label, value, onChange, placeholder, keyboardType, half }) {
  return (
    <View style={[styles.fieldWrap, half && styles.fieldHalf]}>
      <Text style={styles.fieldLabel}>{label} <Text style={{ color: C.label, fontSize: 10 }}>(Optional)</Text></Text>
      <TextInput
        style={styles.fieldInput}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder ?? ""}
        placeholderTextColor={C.label}
        keyboardType={keyboardType ?? "default"}
        autoCapitalize="characters"
      />
    </View>
  );
}

function GenderPicker({ value, onChange }) {
  const options = ["Male", "Female", "Other"];
  return (
    <View style={[styles.fieldWrap, styles.fieldHalf]}>
      <Text style={styles.fieldLabel}>GENDER <Text style={{ color: C.error }}>*</Text></Text>
      <View style={styles.genderRow}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt}
            onPress={() => onChange(opt)}
            style={[styles.genderBtn, value === opt && styles.genderBtnActive]}
          >
            <Text style={[styles.genderBtnText, value === opt && styles.genderBtnTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 1 — Personal Details
// ─────────────────────────────────────────────────────────────────────────────
function PersonalForm({ data, onChange, errors }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Personal Details</Text>
      <Text style={styles.cardSub}>Please enter your basic personal information.</Text>
      <View style={styles.row}>
        <Field label="FIRST NAME"  value={data.firstName}  onChange={v => onChange({ firstName: v })}  error={errors.firstName}  half placeholder="e.g. Shyam" />
        <Field label="LAST NAME"   value={data.lastName}   onChange={v => onChange({ lastName: v })}   error={errors.lastName}   half placeholder="e.g. Swami" />
      </View>
      <View style={styles.row}>
        <Field label="FATHER'S NAME" value={data.fatherName} onChange={v => onChange({ fatherName: v })} error={errors.fatherName} half placeholder="Father's name" />
        <GenderPicker value={data.gender} onChange={v => onChange({ gender: v })} />
      </View>
      <View style={styles.row}>
        <Field label="EMAIL ADDRESS" value={data.email} onChange={v => onChange({ email: v })} error={errors.email} half placeholder="you@email.com" keyboardType="email-address" />
        <Field label="PHONE NUMBER"  value={data.phone} onChange={v => onChange({ phone: v })} error={errors.phone} half placeholder="10-digit mobile" keyboardType="phone-pad" />
      </View>
      <View style={styles.row}>
        <Field label="DATE OF BIRTH" value={data.dob}     onChange={v => onChange({ dob: v })}     error={errors.dob}     half placeholder="DD-MM-YYYY" keyboardType="numbers-and-punctuation" />
        <Field label="ADDRESS"       value={data.address} onChange={v => onChange({ address: v })} error={errors.address} half placeholder="House/Street" />
      </View>
      <View style={styles.row}>
        <Field label="PINCODE" value={data.pincode} onChange={v => onChange({ pincode: v })} error={errors.pincode} half placeholder="6-digit code" keyboardType="number-pad" />
        <Field label="STATE"   value={data.state}   onChange={v => onChange({ state: v })}   error={errors.state}   half placeholder="e.g. Rajasthan" />
      </View>
      <Field label="CITY" value={data.city} onChange={v => onChange({ city: v })} error={errors.city} placeholder="e.g. Jaipur" />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 2 — Business Information
// ─────────────────────────────────────────────────────────────────────────────
function BusinessForm({ data, onChange, errors, docs, onPickDoc }) {
  const DOC_LABELS = ["PAN Card (PDF)", "Aadhaar Front (PDF)", "Aadhaar Back (PDF)"];
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Business Information</Text>
      <Text style={styles.cardSub}>Tell us about your shop or business.</Text>

      <Field label="SHOP/BUSINESS NAME" value={data.shopName} onChange={v => onChange({ shopName: v })} error={errors.shopName} placeholder="Your shop name" />
      <View style={styles.row}>
        <OptionalField label="BUSINESS PAN CARD" value={data.panCard}    onChange={v => onChange({ panCard: v })}    placeholder="ABCDE1234F" half />
        <OptionalField label="GST NUMBER"        value={data.gstNumber}  onChange={v => onChange({ gstNumber: v })}  placeholder="22AAAAA0000A1Z5" half />
      </View>
      <Field label="SHOP ADDRESS" value={data.shopAddress} onChange={v => onChange({ shopAddress: v })} error={errors.shopAddress} placeholder="Full shop address" />
      <View style={styles.row}>
        <Field label="PINCODE" value={data.pincode} onChange={v => onChange({ pincode: v })} error={errors.pincode} half placeholder="6-digit" keyboardType="number-pad" />
        <Field label="STATE"   value={data.state}   onChange={v => onChange({ state: v })}   error={errors.state}   half placeholder="e.g. Rajasthan" />
      </View>
      <Field label="CITY" value={data.city} onChange={v => onChange({ city: v })} error={errors.city} placeholder="e.g. Jaipur" />

      {/* Owner ID section */}
      <View style={styles.sectionDivider}>
        <Text style={styles.sectionDividerText}>OWNER IDENTIFICATION</Text>
      </View>
      <View style={styles.row}>
        <Field label="PERSONAL PAN NUMBER" value={data.personalPan} onChange={v => onChange({ personalPan: v.toUpperCase() })} error={errors.personalPan} half placeholder="ACDFD3434D" />
        <Field label="AADHAAR NUMBER"      value={data.aadhaar}     onChange={v => onChange({ aadhaar: v })}                   error={errors.aadhaar}     half placeholder="12-digit" keyboardType="number-pad" />
      </View>

      {/* Document upload */}
      <View style={styles.sectionDivider}>
        <Text style={styles.sectionDividerText}>UPLOAD DOCUMENTS (PDF ONLY)</Text>
      </View>
      <View style={styles.docGrid}>
        {DOC_LABELS.map((label, i) => (
          <TouchableOpacity key={i} style={[styles.docBox, docs[i] && styles.docBoxDone]} onPress={() => onPickDoc(i)} activeOpacity={0.8}>
            {docs[i]
              ? <>
                  <View style={styles.docCheckCircle}>
                    <Icon name="check" size={18} color="#FFF" />
                  </View>
                  <Text style={styles.docUploadedText}>UPLOADED</Text>
                  <Text style={styles.docFileName} numberOfLines={1}>{docs[i].name}</Text>
                </>
              : <>
                  <Icon name="file-pdf-box" size={32} color={C.label} />
                  <Text style={styles.docLabel}>{label}</Text>
                  <Text style={styles.docTapText}>Tap to upload</Text>
                </>
            }
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STEP 3 — Banking Details
// ─────────────────────────────────────────────────────────────────────────────
function BankingForm({ data, onChange, errors }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Banking Details</Text>
      <Text style={styles.cardSub}>For settlements and commissions.</Text>

      <View style={styles.row}>
        <Field label="ACCOUNT HOLDER NAME" value={data.accountHolder} onChange={v => onChange({ accountHolder: v })} error={errors.accountHolder} half placeholder="Same as bank records" />
        <Field label="BANK NAME"           value={data.bankName}      onChange={v => onChange({ bankName: v })}      error={errors.bankName}      half placeholder="e.g. HDFC Bank" />
      </View>
      <View style={styles.row}>
        <Field label="ACCOUNT NUMBER" value={data.accountNumber} onChange={v => onChange({ accountNumber: v })} error={errors.accountNumber} half placeholder="0000000000" keyboardType="number-pad" />
        <Field label="BRANCH NAME"    value={data.branchName}    onChange={v => onChange({ branchName: v })}    error={errors.branchName}    half placeholder="Branch name" />
      </View>
      <Field label="IFSC CODE" value={data.ifsc} onChange={v => onChange({ ifsc: v.toUpperCase() })} error={errors.ifsc} placeholder="HDFC0001234" />

      {/* Info banner */}
      <View style={styles.infoBanner}>
        <Icon name="information-outline" size={18} color={C.primary} />
        <Text style={styles.infoBannerText}>
          Your banking details are encrypted and used only for settlements and commission payouts.
        </Text>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: C.bg },

  // ── Header ────────────────────────────────────────────────────────────────
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 12,
    backgroundColor: C.bg,
  },
  headerLeft:     { flexDirection: "row", alignItems: "center" },
  headerLogo:     { width: 32, height: 32, borderRadius: 10, backgroundColor: C.text, alignItems: "center", justifyContent: "center", marginRight: 10 },
  headerLogoText: { color: "#FFF", fontWeight: "800", fontSize: 14 },
  headerTitle:    { fontSize: 16, fontWeight: "700", color: C.text },
  stepCount:      { fontSize: 11, fontWeight: "700", color: C.sub, letterSpacing: 1 },

  // ── Stepper ───────────────────────────────────────────────────────────────
  stepperWrap: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 20, paddingBottom: 16,
    backgroundColor: C.bg,
  },
  stepItem:   { alignItems: "center" },
  stepCircle: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: C.step_idle,
    alignItems: "center", justifyContent: "center",
    marginBottom: 4,
  },
  stepCircleDone:   { backgroundColor: C.step_done },
  stepCircleActive: { backgroundColor: C.step_act },
  stepLabel: { fontSize: 9, fontWeight: "600", color: C.sub, letterSpacing: 0.5 },
  stepLine:     { flex: 1, height: 2, backgroundColor: C.step_idle, marginBottom: 20, marginHorizontal: 2 },
  stepLineDone: { backgroundColor: C.step_done },

  // ── Scroll ────────────────────────────────────────────────────────────────
  scrollContent: { paddingHorizontal: 16, paddingBottom: 40 },

  // ── Card ──────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: C.card, borderRadius: 20, padding: 20,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
    marginBottom: 16,
  },
  cardTitle: { fontSize: 20, fontWeight: "800", color: C.text, marginBottom: 4 },
  cardSub:   { fontSize: 13, color: C.sub, marginBottom: 20 },

  // ── Fields ────────────────────────────────────────────────────────────────
  row:        { flexDirection: "row", gap: 12 },
  fieldWrap:  { marginBottom: 14, flex: 1 },
  fieldHalf:  { flex: 1 },
  fieldLabel: { fontSize: 10, fontWeight: "700", color: C.label, letterSpacing: 0.8, marginBottom: 6 },
  fieldInput: {
    backgroundColor: C.input_bg,
    borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: C.text, fontWeight: "500",
  },
  fieldInputError: { borderColor: C.error, backgroundColor: "#FFF5F5" },
  fieldError:      { color: C.error, fontSize: 10, marginTop: 3 },

  // ── Gender picker ─────────────────────────────────────────────────────────
  genderRow:          { flexDirection: "row", gap: 6, marginTop: 0 },
  genderBtn:          { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: C.input_bg, borderWidth: 1, borderColor: C.border, alignItems: "center" },
  genderBtnActive:    { backgroundColor: C.primary_lt, borderColor: C.primary },
  genderBtnText:      { fontSize: 11, fontWeight: "600", color: C.sub },
  genderBtnTextActive:{ color: C.primary },

  // ── Section divider ───────────────────────────────────────────────────────
  sectionDivider: {
    borderTopWidth: 1, borderTopColor: C.border,
    marginVertical: 16, paddingTop: 14,
  },
  sectionDividerText: { fontSize: 10, fontWeight: "700", color: C.sub, letterSpacing: 1 },

  // ── Document grid ─────────────────────────────────────────────────────────
  docGrid:        { flexDirection: "row", gap: 10 },
  docBox: {
    flex: 1, aspectRatio: 0.75,
    backgroundColor: C.input_bg, borderRadius: 12,
    borderWidth: 1.5, borderColor: C.border, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", padding: 8,
  },
  docBoxDone:        { backgroundColor: C.success_lt, borderColor: C.success, borderStyle: "solid" },
  docCheckCircle:    { width: 30, height: 30, borderRadius: 15, backgroundColor: C.success, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  docUploadedText:   { fontSize: 9, fontWeight: "700", color: C.success, letterSpacing: 0.5 },
  docFileName:       { fontSize: 9, color: C.sub, textAlign: "center", marginTop: 2 },
  docLabel:          { fontSize: 10, fontWeight: "600", color: C.sub, textAlign: "center", marginTop: 6, lineHeight: 14 },
  docTapText:        { fontSize: 9, color: C.label, marginTop: 2 },

  // ── Info banner ───────────────────────────────────────────────────────────
  infoBanner: {
    flexDirection: "row", alignItems: "flex-start",
    backgroundColor: "#FFF6F3", borderRadius: 10,
    borderLeftWidth: 3, borderLeftColor: C.primary,
    padding: 12, marginTop: 8, gap: 8,
  },
  infoBannerText: { flex: 1, fontSize: 12, color: C.sub, lineHeight: 18 },

  // ── Action buttons ────────────────────────────────────────────────────────
  actionRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  prevBtn:   {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 12, paddingHorizontal: 18,
    borderRadius: 12, borderWidth: 1, borderColor: C.border,
    backgroundColor: C.card, gap: 6,
  },
  prevBtnText: { fontSize: 14, fontWeight: "600", color: C.text },
  nextBtn:     { borderRadius: 12, overflow: "hidden" },
  nextBtnGrad: { flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 24 },
  nextBtnText: { fontSize: 14, fontWeight: "700", color: "#FFF" },
});