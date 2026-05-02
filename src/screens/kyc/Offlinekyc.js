import React, { useEffect, useState, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Animated, Dimensions, StatusBar,
  KeyboardAvoidingView, Platform, ActivityIndicator,
  Image, PixelRatio, useWindowDimensions, Modal,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { submitOfflineKyc, reuploadOfflineKyc, fetchStateList, fetchCityList, fetchGlobalBankList, fetchSubmittedKyc, BASE_URL } from "../../api/AuthApi";
import Fonts from "../../constants/Fonts";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "../../constants/Colors";
import CalendarModal from "../../componets/Calendar/CalendarModal";
import { launchCamera, launchImageLibrary } from "react-native-image-picker";
import CustomAlert from "../../componets/Alerts/CustomAlert";
import ImageUploadAlert from "../../componets/Alerts/Imageuploadalert";
import RNFS from "react-native-fs";

// ─── Responsive helpers ───────────────────────────────────────────────────
const BASE_WIDTH = 375;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const rs = (size) => {
  const clamped = Math.min(SCREEN_W / BASE_WIDTH, 1.35);
  return Math.round(PixelRatio.roundToNearestPixel(size * clamped));
};
const hs = (size) => Math.round(PixelRatio.roundToNearestPixel(size * (SCREEN_W / BASE_WIDTH)));
const vs = (size) => Math.round(PixelRatio.roundToNearestPixel(size * (Math.min(SCREEN_H, 900) / 812)));

// ─── Image size limits (bytes) ────────────────────────────────────────────
const MIN_SIZE_BYTES = 10 * 1024;   // 10 KB
const MAX_SIZE_BYTES = 200 * 1024;  // 200 KB
const SIZE_LABEL = "10 KB – 200 KB";


const resolveColors = () => ({
  accent: Colors.finance_accent || Colors.kyc_accent,
  success: Colors.green || Colors.kyc_success,
  error: Colors.red || Colors.kyc_error,
  text: Colors.finance_text || Colors.kyc_text,
  bg: Colors.bg || Colors.kyc_bg,
  white: Colors.white,
  amber: Colors.amber,
  primary: Colors.primary,
});

// ─── Step config ──────────────────────────────────────────────────────────
const STEPS = [
  { key: "personal", label: "Personal", icon: "account-circle-outline" },
  { key: "business", label: "Business", icon: "store-outline" },
  { key: "banking", label: "Banking", icon: "bank-outline" },
];

// ─── Field validators ─────────────────────────────────────────────────────
const RX = {
  email: /^\S+@\S+\.\S+$/,
  phone: /^[6-9]\d{9}$/,
  pincode: /^\d{6}$/,
  dob: /^(0[1-9]|[12]\d|3[01])-(0[1-9]|1[0-2])-\d{4}$/,
  pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
  aadhaar: /^\d{12}$/,
  ifsc: /^[A-Z0-9]{4,15}$/,
  gst: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
  accNum: /^[0-9]{12,20}$/,
  accountHolderName: /^[A-Za-z\s.]+$/,
  bankName: /^[A-Za-z\s.&]+$/,
};

// ═══════════════════════════════════════════════════════════════════════════
//  IMAGE VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Returns the actual file size in bytes for an image returned by
 * react-native-image-crop-picker.
 *
 * Approach:
 *   1. image.size  — accurate on iOS and Android gallery; may be 0 on
 *                    Android camera results → reject if 0/null.
 *   2. RNFS.stat() — reads from disk; reliable on all platforms.
 *   3. null        — both failed; caller should allow the file through.
 */
const getFileSizeBytes = async (image) => {
  // ── Primary: react-native-image-picker's fileSize field ───────────────
  if (typeof image.fileSize === "number" && image.fileSize > 0) {
    return image.fileSize;
  }

  // ── Fallback: RNFS disk stat ──────────────────────────────────────────
  try {
    const cleanPath = (image.uri ?? "").replace(/^file:\/\//, "");
    if (!cleanPath) throw new Error("No path");
    const stat = await RNFS.stat(cleanPath);
    if (typeof stat.size === "number" && stat.size > 0) return stat.size;
  } catch (_) {
    /* RNFS unavailable or path unreadable — fall through */
  }

  return null; // indeterminate
};

/**
 * Shows a clear, actionable message when the image is out of range.
 * Returns true → valid (or indeterminate → allow).
 * Returns false → invalid (message already shown to user).
 */
const validateImageSize = async (image) => {
  const sizeBytes = await getFileSizeBytes(image);

  if (sizeBytes === null) {
    console.warn("[KYC] Image size indeterminate — skipping size check");
    return { isValid: true };
  }

  const sizeKB = (sizeBytes / 1024).toFixed(1);

  if (sizeBytes < MIN_SIZE_BYTES) {
    return {
      isValid: false,
      title: "Image Too Small",
      error: `Image too small (${sizeKB} KB).\nMinimum allowed: 10 KB.\nPlease choose a clearer, higher-quality photo.`
    };
  }

  if (sizeBytes > MAX_SIZE_BYTES) {
    return {
      isValid: false,
      title: "Image Too Large",
      error: `Image too large (${sizeKB} KB).\nMaximum allowed: 200 KB.\nPlease select a more compressed photo.`
    };
  }

  return { isValid: true };
};

/**
 * Opens camera or gallery, validates size (10 KB – 200 KB), and returns
 * the image object or null on cancel / rejection.
 *
 * compressImageQuality: 0.75 keeps most phone photos well under 200 KB
 * while preserving enough detail for document OCR.
 */
export const pickAndValidateImage = async (sourceType) => {
  return new Promise((resolve) => {
    const options = {
      mediaType: "photo",
      quality: 0.75,
      selectionLimit: 1,
    };

    const handler = async (res) => {
      if (res.didCancel) return resolve(null);

      if (res.errorCode) {
        const msg = res.errorMessage || "Could not open image. Please try again.";
        return resolve({ error: msg, title: "Image Error" });
      }

      if (res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const result = await validateImageSize(asset);
        if (!result.isValid) return resolve(result);
        resolve({ asset });
      } else {
        resolve(null);
      }
    };

    if (sourceType === "camera") {
      launchCamera(options, handler);
    } else {
      launchImageLibrary(options, handler);
    }
  });
};

// ═══════════════════════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function Offlinekyc({ navigation, route }) {
  const C = resolveColors();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const isWide = width >= 600;
  const contentWidth = isWide ? Math.min(width - hs(32), 680) : width - hs(32);
  const colGap = hs(12);
  const halfWidth = (contentWidth - colGap) / 2;

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showAcc, setShowAcc] = useState(false);
  const [showConfirmAcc, setShowConfirmAcc] = useState(false);
  const [errors, setErrors] = useState({});
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showFailModal, setShowFailModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [failMsg, setFailMsg] = useState("");
  const [alert, setAlert] = useState({ visible: false, type: "info", title: "", message: "" });
  const [pickerSourceField, setPickerSourceField] = useState(null); // The field we are picking for
  const [showSourcePicker, setShowSourcePicker] = useState(false);
  const [pinLoading, setPinLoading] = useState(false);

  const showAlert = (type, title, message) => {
    setAlert({ visible: true, type, title, message });
  };

  const [stateList, setStateList] = useState([]);
  const [showStateModal, setShowStateModal] = useState(false);
  const [stateTarget, setStateTarget] = useState(null);
  const [stateLoading, setStateLoading] = useState(false);
  const [stateSearch, setStateSearch] = useState("");

  const [cityList, setCityList] = useState([]);
  const [showCityModal, setShowCityModal] = useState(false);
  const [cityTarget, setCityTarget] = useState(null);
  const [cityLoading, setCityLoading] = useState(false);
  const [citySearch, setCitySearch] = useState("");

  const [bankList, setBankList] = useState([]);
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankLoading, setBankLoading] = useState(false);
  const [bankSearch, setBankSearch] = useState("");

  const slideAnim = useRef(new Animated.Value(0)).current;
  const scrollViewRef = useRef(null);
  const fieldCoords = useRef({});
  const progressAnim = useRef(new Animated.Value(0)).current;

  // ── Forms ─────────────────────────────────────────────────────────────
  const [personal, setPersonal] = useState({
    firstName: "", lastName: "", fatherName: "", gender: "",
    email: "", phone: "", dob: "",
    personalAddress: "", personalCity: "", personalState: "", personalPincode: "",
  });
  const [lockedPersonal, setLockedPersonal] = useState({
    firstName: false, lastName: false, fatherName: false, gender: false,
    email: false, phone: false, dob: false,
    personalAddress: false, personalCity: false, personalState: false, personalPincode: false,
  });

  const [business, setBusiness] = useState({
    shopName: "", businessPanNumber: "", gstNumber: "",
    businessAddress: "", businessCity: "", businessState: "", businessPincode: "",
    panNumber: "", aadharNumber: "",
  });
  const [lockedBusiness, setLockedBusiness] = useState({
    shopName: false, businessPanNumber: false, gstNumber: false,
    businessAddress: false, businessCity: false, businessState: false, businessPincode: false,
    panNumber: false, aadharNumber: false,
  });

  const [files, setFiles] = useState({ aadharFile: null, panFile: null, shopImage: null, blankCheque: null });
  const [lockedFiles, setLockedFiles] = useState({ aadharFile: false, panFile: false, shopImage: false, blankCheque: false });

  const [banking, setBanking] = useState({
    accountHolderName: "", bankName: "", accountNumber: "",
    confirmAccountNumber: "", ifscCode: "",
  });
  const [lockedBanking, setLockedBanking] = useState({
    accountHolderName: false, bankName: false, accountNumber: false,
    ifscCode: false,
  });

  const [kycStatuses, setKycStatuses] = useState({
    personal: "pending",
    business: "pending",
    identity: "pending",
    bank: "pending",
  });

  // ── Account match ──────────────────────────────────────────────────────
  const accMatchStatus = (() => {
    const acc = banking.accountNumber.trim();
    const conf = banking.confirmAccountNumber.trim();
    if (!conf) return "idle";
    if (acc === conf) return "match";
    return "mismatch";
  })();
  const accMatchColor = { idle: Colors.amber, match: Colors.green, mismatch: Colors.red }[accMatchStatus];
  const accMatchIcon = { match: "check-circle", mismatch: "close-circle" }[accMatchStatus];

  // ── Pre-fill from route / AsyncStorage ────────────────────────────────
  useEffect(() => {
    const u = route?.params?.user;
    if (u) {
      const locked = {};
      setPersonal(p => {
        const next = { ...p };
        if (u.firstName) { next.firstName = u.firstName; locked.firstName = true; }
        if (u.lastName) { next.lastName = u.lastName; locked.lastName = true; }
        if (u.email) { next.email = u.email; locked.email = true; }
        if (u.phone) { next.phone = u.phone; locked.phone = true; }
        return next;
      });
      setLockedPersonal(locked);
    } else {
      (async () => {
        try {
          const uStr = await AsyncStorage.getItem("user_profile");
          if (!uStr) return;
          const u2 = JSON.parse(uStr);
          const locked = {};
          setPersonal(p => {
            const next = { ...p };
            if (u2.firstName && !next.firstName) { next.firstName = u2.firstName; locked.firstName = true; }
            if (u2.lastName && !next.lastName) { next.lastName = u2.lastName; locked.lastName = true; }
            if (u2.email && !next.email) { next.email = u2.email; locked.email = true; }
            if (u2.phone && !next.phone) { next.phone = u2.phone; locked.phone = true; }
            return next;
          });
          setLockedPersonal(locked);
        } catch (err) { console.error("Offlinekyc loadUserData error:", err); }
      })();
    }
  }, []);

  useEffect(() => { handleFetchStates(); }, []);

  // ── Pre-fill from submitted KYC (re-KYC) ─────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const headerToken = await AsyncStorage.getItem("header_token");
        if (!headerToken) return;
        const res = await fetchSubmittedKyc({ headerToken });
        if (!res?.success || !res?.data) return;
        const d = res.data;

        const dobFormatted = d.dob ? (() => {
          const dt = new Date(d.dob);
          if (isNaN(dt)) return "";
          return `${String(dt.getDate()).padStart(2, "0")}-${String(dt.getMonth() + 1).padStart(2, "0")}-${dt.getFullYear()}`;
        })() : "";

        const personalApproved = d.personalDetailStatus === "approved";
        const businessApproved = d.businessDetailStatus === "approved";
        const identityApproved = d.identityDetailStatus === "approved";
        const bankApproved = d.bankDetailStatus === "approved";

        const IMG_BASE = BASE_URL;
        const buildFile = (rel, name) =>
          rel ? { uri: `${IMG_BASE}${rel}`, name: rel.split("/").pop() || name, type: "image/jpeg" } : null;

        // 1. Personal Details Pre-fill
        setPersonal(p => ({
          ...p,
          firstName: d.firstName || p.firstName,
          lastName: d.lastName || p.lastName,
          fatherName: d.fatherName || p.fatherName,
          gender: d.gender || p.gender,
          email: d.email || p.email,
          phone: d.phone || p.phone,
          dob: dobFormatted || p.dob,
          personalAddress: d.personalAddress?.address ?? p.personalAddress,
          personalCity: d.personalAddress?.city ?? p.personalCity,
          personalState: d.personalAddress?.state ?? p.personalState,
          personalPincode: d.personalAddress?.pincode ?? p.personalPincode,
        }));
        setLockedPersonal({
          firstName: personalApproved && !!d.firstName,
          lastName: personalApproved && !!d.lastName,
          fatherName: personalApproved && !!d.fatherName,
          gender: personalApproved && !!d.gender,
          email: personalApproved && !!d.email,
          phone: personalApproved && !!d.phone,
          dob: personalApproved && !!d.dob,
          personalAddress: personalApproved && !!d.personalAddress?.address,
          personalCity: personalApproved && !!d.personalAddress?.city,
          personalState: personalApproved && !!d.personalAddress?.state,
          personalPincode: personalApproved && !!d.personalAddress?.pincode,
        });

        // 2. Business Details Pre-fill
        setBusiness(b => ({
          ...b,
          shopName: d.shopName || b.shopName,
          businessPanNumber: d.businessPanNumber || b.businessPanNumber,
          gstNumber: d.gstNumber || b.gstNumber,
          businessAddress: d.businessAddress?.address ?? b.businessAddress,
          businessCity: d.businessAddress?.city ?? b.businessCity,
          businessState: d.businessAddress?.state ?? b.businessState,
          businessPincode: d.businessAddress?.pincode ?? b.businessPincode,
          panNumber: d.panNumber || b.panNumber,
          aadharNumber: d.aadharNumber || b.aadharNumber,
        }));
        setLockedBusiness(lb => ({
          ...lb,
          shopName: businessApproved && !!d.shopName,
          businessPanNumber: businessApproved && !!d.businessPanNumber,
          gstNumber: businessApproved && !!d.gstNumber,
          businessAddress: businessApproved && !!d.businessAddress?.address,
          businessCity: businessApproved && !!d.businessAddress?.city,
          businessState: businessApproved && !!d.businessAddress?.state,
          businessPincode: businessApproved && !!d.businessAddress?.pincode,
          panNumber: identityApproved && !!d.panNumber,
          aadharNumber: identityApproved && !!d.aadharNumber,
        }));

        // 3. Document Files Pre-fill
        if (d.shopImageUrl) {
          setFiles(f => ({ ...f, shopImage: buildFile(d.shopImageUrl, "shopImage.jpg") }));
          setLockedFiles(lf => ({ ...lf, shopImage: businessApproved }));
        }
        if (d.aadharFileUrl) {
          setFiles(f => ({ ...f, aadharFile: buildFile(d.aadharFileUrl, "aadharFile.jpg") }));
          setLockedFiles(lf => ({ ...lf, aadharFile: identityApproved }));
        }
        if (d.panFileUrl) {
          setFiles(f => ({ ...f, panFile: buildFile(d.panFileUrl, "panFile.jpg") }));
          setLockedFiles(lf => ({ ...lf, panFile: identityApproved }));
        }
        if (d.blankChequeUrl) {
          setFiles(f => ({ ...f, blankCheque: buildFile(d.blankChequeUrl, "blankCheque.jpg") }));
          setLockedFiles(lf => ({ ...lf, blankCheque: bankApproved }));
        }

        // 4. Banking Details
        setBanking(bk => ({
          ...bk,
          accountHolderName: d.accountHolderName || bk.accountHolderName,
          bankName: d.bankName || bk.bankName,
          accountNumber: d.accountNumber || bk.accountNumber,
          confirmAccountNumber: d.accountNumber || bk.confirmAccountNumber,
          ifscCode: d.ifscCode || bk.ifscCode,
        }));
        setLockedBanking({
          accountHolderName: bankApproved && !!d.accountHolderName,
          bankName: bankApproved && !!d.bankName,
          accountNumber: bankApproved && !!d.accountNumber,
          ifscCode: bankApproved && !!d.ifscCode,
        });

        setKycStatuses({
          personal: d.personalDetailStatus || "pending",
          business: d.businessDetailStatus || "pending",
          identity: d.identityDetailStatus || "pending",
          bank: d.bankDetailStatus || "pending",
        });

        if (d.rejectionReason) {
          setFailMsg(`Previous Submission rejected: ${d.rejectionReason}`);
          setShowFailModal(true);
        }
      } catch (err) {
        console.log("[KYC] fetchSubmittedKyc error:", err);
      }
    })();
  }, []);

  useEffect(() => {
    Animated.spring(progressAnim, { toValue: step / 2, friction: 8, tension: 50, useNativeDriver: false }).start();
  }, [step]);

  // ─── API helpers ──────────────────────────────────────────────────────
  const handleFetchStates = async () => {
    setStateLoading(true);
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      const res = await fetchStateList({ headerToken });
      if (res?.success && res.data) setStateList(res.data);
    } catch (err) { console.log("State fetch error:", err); }
    finally { setStateLoading(false); }
  };

  const handleOpenState = (target) => {
    setStateTarget(target);
    setShowStateModal(true);
    if (stateList.length === 0) handleFetchStates();
  };

  const handleOpenCity = async (target) => {
    const stateName = target === "personal" ? personal.personalState : business.businessState;
    if (!stateName) {
      Platform.OS === "android"
        ? ToastAndroid.show("Please select a State first", ToastAndroid.SHORT)
        : Alert.alert("Action Required", "Please select a State first");
      return;
    }
    const stateObj = stateList.find(s => s.stateName === stateName);
    if (!stateObj) {
      Platform.OS === "android"
        ? ToastAndroid.show("Please select a valid State from the list", ToastAndroid.SHORT)
        : Alert.alert("Action Required", "Please select a valid State from the list");
      return;
    }
    setCityTarget(target);
    setShowCityModal(true);
    setCityLoading(true);
    setCityList([]);
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      const res = await fetchCityList({ stateCode: stateObj.stateCode, headerToken });
      if (res?.success && res.data) setCityList(res.data);
    } catch (e) { console.log("City fetch error", e); }
    finally { setCityLoading(false); }
  };

  const handleFetchBanks = async () => {
    setBankLoading(true);
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      const res = await fetchGlobalBankList({ headerToken });
      if (res?.success && res.data) setBankList(res.data);
    } catch (err) { console.log("Bank list fetch error:", err); }
    finally { setBankLoading(false); }
  };

  const handleOpenBank = () => {
    setShowBankModal(true);
    if (bankList.length === 0) handleFetchBanks();
  };

  const fetchStateFromPincode = async (pin, type) => {
    if (pin.length !== 6) return;
    setPinLoading(true);
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await response.json();
      if (data && data[0]) {
        if (data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice.length > 0) {
          const pinState = data[0].PostOffice[0].State;
          const pinDistrict = data[0].PostOffice[0].District;

          if (stateList.length === 0) {
            await handleFetchStates();
          }

          const matchedState = stateList.find(s => s.stateName?.toLowerCase() === pinState?.toLowerCase());
          if (matchedState) {
            // Fetch cities for this state to match district
            let matchedCityName = "";
            try {
              const headerToken = await AsyncStorage.getItem("header_token");
              const cityRes = await fetchCityList({ stateCode: matchedState.stateCode, headerToken });
              if (cityRes?.success && cityRes.data) {
                setCityList(cityRes.data); // Update cityList state for the modal
                const matchedCity = cityRes.data.find(c => c.cityName?.toLowerCase() === pinDistrict?.toLowerCase());
                if (matchedCity) matchedCityName = matchedCity.cityName;
              }
            } catch (e) { console.log("[KYC] City fetch error in pincode logic", e); }

            if (type === "personal") {
              setPersonal(p => ({ ...p, personalState: matchedState.stateName, personalCity: matchedCityName }));
            } else {
              setBusiness(b => ({ ...b, businessState: matchedState.stateName, businessCity: matchedCityName }));
            }
          }
        } else if (data[0].Status === "Error" || (data[0].Status === "Success" && !data[0].PostOffice)) {
          showAlert("error", "Invalid Pincode", "No such pincode found. Please enter a correct pincode.");
        }
      }
    } catch (error) {
      console.log("[KYC] Pincode API error:", error);
    } finally {
      setPinLoading(false);
    }
  };

  const scrollToError = (errs) => {
    const firstKey = Object.keys(errs)[0];
    if (firstKey && fieldCoords.current[firstKey] !== undefined)
      scrollViewRef.current?.scrollTo({ y: Math.max(0, fieldCoords.current[firstKey] - 20), animated: true });
  };

  // ─── Validators ───────────────────────────────────────────────────────
  const validatePersonal = () => {
    const e = {};
    if (!personal.gender || !["male", "female", "other"].includes(personal.gender.toLowerCase())) e.gender = "Required";

    // Name validations (Max 100 chars)
    if (!personal.firstName.trim() || personal.firstName.trim().length < 3) e.firstName = "Min 3 chars";
    else if (personal.firstName.trim().length > 100) e.firstName = "Max 100 chars";

    if (!personal.lastName.trim() || personal.lastName.trim().length < 3) e.lastName = "Min 3 chars";
    else if (personal.lastName.trim().length > 100) e.lastName = "Max 100 chars";

    if (!personal.fatherName.trim() || personal.fatherName.trim().length < 3) e.fatherName = "Min 3 chars";
    else if (personal.fatherName.trim().length > 100) e.fatherName = "Max 100 chars";

    // Email validation (Must contain @)
    if (!personal.email.trim() || !personal.email.includes("@") || !RX.email.test(personal.email.trim())) {
      e.email = "Invalid email (must contain @)";
    }

    if (!personal.phone.trim() || personal.phone.trim().length !== 10 || !RX.phone.test(personal.phone.trim())) e.phone = "Must be 10 digits";

    if (!personal.dob.trim() || !RX.dob.test(personal.dob.trim())) {
      e.dob = "DD-MM-YYYY";
    } else {
      const [dd, mm, yyyy] = personal.dob.split("-").map(Number);
      const dobDate = new Date(yyyy, mm - 1, dd);
      const today = new Date();
      const ageDiff = today.getFullYear() - dobDate.getFullYear();
      const m = today.getMonth() - dobDate.getMonth();
      const age = (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) ? ageDiff - 1 : ageDiff;
      if (dobDate > today || age < 18) e.dob = "Must be at least 18 years old";
    }

    if (!personal.personalAddress.trim() || personal.personalAddress.trim().length < 5) e.personalAddress = "Min 5 chars";
    else if (personal.personalAddress.trim().length > 500) e.personalAddress = "Max 500 chars";

    // PIN validation (6 digits)
    if (personal.personalPincode.trim().length !== 6 || !RX.pincode.test(personal.personalPincode.trim())) {
      e.personalPincode = "Must be 6 digits";
    }

    if (!personal.personalState.trim()) e.personalState = "Required";
    if (!personal.personalCity.trim()) e.personalCity = "Required";
    setErrors(e);
    return e;
  };

  const validateBusiness = () => {
    const e = {};
    if (!business.shopName.trim()) e.shopName = "Required";
    else if (business.shopName.trim().length > 200) e.shopName = "Max 200 chars";

    if (!business.businessAddress.trim() || business.businessAddress.trim().length < 5) e.businessAddress = "Min 5 chars";
    else if (business.businessAddress.trim().length > 200) e.businessAddress = "Max 200 chars";

    // Business PIN validation (6 digits)
    if (business.businessPincode.trim().length !== 6 || !RX.pincode.test(business.businessPincode.trim())) {
      e.businessPincode = "Must be 6 digits";
    }

    if (!business.businessState.trim()) e.businessState = "Required";
    if (!business.businessCity.trim()) e.businessCity = "Required";

    // PAN validation (10 characters)
    if (!business.panNumber.trim() || business.panNumber.trim().length !== 10 || !RX.pan.test(business.panNumber.trim())) {
      e.panNumber = "Must be 10 digits/chars";
    }

    // Aadhaar validation (12 digits)
    if (!business.aadharNumber.trim() || business.aadharNumber.trim().length !== 12 || !RX.aadhaar.test(business.aadharNumber.trim())) {
      e.aadharNumber = "Must be 12 digits";
    }

    // Optional fields validation
    if (business.businessPanNumber.trim() && (business.businessPanNumber.trim().length !== 10 || !RX.pan.test(business.businessPanNumber.trim()))) {
      e.businessPanNumber = "Invalid PAN (10 chars)";
    }
    if (business.gstNumber.trim() && (business.gstNumber.trim().length !== 15 || !RX.gst.test(business.gstNumber.trim()))) {
      e.gstNumber = "Invalid GST Number (15 chars)";
    }

    if (!files.aadharFile) e.aadharFile = "Aadhaar photo required";
    if (!files.panFile) e.panFile = "PAN card photo required";
    if (!files.shopImage) e.shopImage = "Shop photo required";
    setErrors(e);
    return e;
  };

  const validateBanking = () => {
    const e = {};
    if (!banking.accountHolderName.trim() || !RX.accountHolderName.test(banking.accountHolderName.trim())) e.accountHolderName = "Letters only, min 2 chars";
    else if (banking.accountHolderName.trim().length > 100) e.accountHolderName = "Max 100 chars";

    if (!banking.bankName.trim() || !RX.bankName.test(banking.bankName.trim())) e.bankName = "Required";

    // Account number validation (10-20 digits)
    const accNum = banking.accountNumber.trim();
    if (accNum.length < 10 || accNum.length > 20 || !RX.accNum.test(accNum)) {
      e.accountNumber = "Must be 10–20 digits";
    }

    if (!banking.confirmAccountNumber.trim()) e.confirmAccountNumber = "Please confirm account number";
    else if (banking.accountNumber !== banking.confirmAccountNumber) e.confirmAccountNumber = "Account numbers don't match";

    if (!banking.ifscCode.trim() || banking.ifscCode.trim().length > 15 || !RX.ifsc.test(banking.ifscCode.trim())) {
      e.ifscCode = "Invalid IFSC (max 15 chars)";
    }

    if (!files.blankCheque) e.blankCheque = "Passbook/Cheque photo required";
    setErrors(e);
    return e;
  };

  // ─── Step nav ─────────────────────────────────────────────────────────
  const slide = (dir, cb) => {
    Animated.timing(slideAnim, { toValue: dir === "fwd" ? -width : width, duration: 240, useNativeDriver: true })
      .start(() => {
        cb();
        slideAnim.setValue(dir === "fwd" ? width : -width);
        Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 65, useNativeDriver: true }).start();
      });
  };

  const handleNext = () => {
    const errs = step === 0 ? validatePersonal() : validateBusiness();
    if (Object.keys(errs).length > 0) { scrollToError(errs); return; }
    setErrors({});
    slide("fwd", () => setStep(p => p + 1));
  };
  const handlePrev = () => { setErrors({}); slide("bwd", () => setStep(p => p - 1)); };

  // ─────────────────────────────────────────────────────────────────────────
  // IMAGE PICKER  (10 KB – 200 KB enforced inside pickAndValidateImage)
  // ─────────────────────────────────────────────────────────────────────────
  const pickImage = (fileKey) => {
    setPickerSourceField(fileKey);
    setShowSourcePicker(true);
  };

  const handlePickSource = async (sourceType) => {
    setShowSourcePicker(false);
    const result = await pickAndValidateImage(sourceType);
    if (!result) return; // cancelled
    if (result.error) {
      showAlert("error", result.title || "Image Error", result.error);
      return;
    }
    const { asset } = result;
    setFiles(f => ({
      ...f,
      [pickerSourceField]: {
        uri: asset.uri,
        name: asset.fileName || asset.uri.split("/").pop() || `${pickerSourceField}_${Date.now()}.jpg`,
        type: asset.type || "image/jpeg",
      }
    }));
    setErrors(e => ({ ...e, [pickerSourceField]: undefined }));
  };


  const removeFile = (fileKey) => setFiles(f => ({ ...f, [fileKey]: null }));

  // ─── Submit ───────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const errs = validateBanking();
    if (Object.keys(errs).length > 0) { scrollToError(errs); return; }
    setLoading(true);
    const kycStatus = route?.params?.user?.kycStatus || (await AsyncStorage.getItem("kyc_status"));
    const result = kycStatus === "rekyc"
      ? await reuploadOfflineKyc({ personal, business, files, banking, kycStatuses })
      : await submitOfflineKyc({ personal, business, files, banking });
    setLoading(false);

    if (!result) { setFailMsg("No response. Please try again."); setShowFailModal(true); return; }

    const ok = result.success === true || result.status === "success" || result.status === 1 || result.statusCode === 200;
    if (ok) { setShowSuccessModal(true); return; }

    let finalErrors = {};
    let bulletErrors = "";
    if (result.errors && Array.isArray(result.errors)) {
      bulletErrors = result.errors.join("\n• ");
    } else if (result.errors && typeof result.errors === "object") {
      finalErrors = result.errors;
    } else if (result.missingFields && Array.isArray(result.missingFields)) {
      result.missingFields.forEach(f => { finalErrors[f] = "Required"; });
    }

    if (Object.keys(finalErrors).length > 0) {
      setErrors(finalErrors);
      const firstErrField = Object.keys(finalErrors)[0];
      const s0 = ["firstName", "lastName", "fatherName", "gender", "email", "phone", "dob", "personalAddress", "personalCity", "personalState", "personalPincode"];
      const s1 = ["shopName", "businessAddress", "businessPincode", "businessState", "businessCity", "panNumber", "aadharNumber", "aadharFile", "panFile", "shopImage"];
      let targetStep = 2;
      if (s0.includes(firstErrField)) targetStep = 0;
      else if (s1.includes(firstErrField)) targetStep = 1;
      if (targetStep !== step) { setStep(targetStep); setTimeout(() => scrollToError(finalErrors), 300); }
      else scrollToError(finalErrors);
    }

    let displayMsg = result.message || "Check your details and try again.";
    if (bulletErrors) displayMsg += `\n\nErrors:\n• ${bulletErrors}`;
    else if (result.missingFields?.length > 0) displayMsg += `\n\nRequired fields missing:\n• ${result.missingFields.join("\n• ")}`;
    setFailMsg(displayMsg);
    setShowFailModal(true);
  };

  // ─────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: Colors.beige }]} edges={["bottom"]}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />


      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + vs(10), paddingHorizontal: hs(16) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate("Login")} activeOpacity={0.7}>
          <Icon name="chevron-left" size={rs(22)} color={Colors.kyc_text} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { fontFamily: Fonts.Bold, fontSize: rs(16) }]}>KYC Verification</Text>
          <Text style={[styles.headerSub, { fontSize: rs(10) }]}>{(STEPS[step] || {}).label} Details — Step {step + 1} of 3</Text>
        </View>

        <View style={[styles.stepBadge, { backgroundColor: Colors.kyc_accent + "20" }]}>
          <Text style={[styles.stepBadgeText, { color: Colors.kyc_accent, fontFamily: Fonts.Bold, fontSize: rs(11) }]}>{step + 1} / 3</Text>
        </View>
      </View>

      {/* Progress */}
      <View style={[styles.progressWrap, { paddingHorizontal: hs(16) }]}>
        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, {
            width: progressAnim.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }),
            backgroundColor: Colors.kyc_accent,
          }]} />
        </View>
        <View style={styles.stepDots}>
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <View key={s.key} style={styles.stepDotItem}>
                <LinearGradient
                  colors={done ? [Colors.green, Colors.green] : active ? [Colors.primary, Colors.primary] : [Colors.amber + "30", Colors.amber + "10"]}
                  style={[styles.stepDotCircle, { width: rs(active ? 36 : 28), height: rs(active ? 36 : 28), borderRadius: rs(active ? 18 : 14) }]}
                >
                  <Icon name={done ? "check" : s.icon} size={rs(done ? 14 : active ? 16 : 13)} color={done || active ? Colors.white : Colors.kyc_textMuted} />
                </LinearGradient>
                <Text style={[styles.stepDotLabel, { fontSize: rs(9), fontFamily: active ? Fonts.Bold : Fonts.Medium },
                done && { color: Colors.kyc_success }, active && { color: Colors.kyc_accent }]}>
                  {s?.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Form */}
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <Animated.View style={[{ flex: 1, backgroundColor: Colors.beige }, { transform: [{ translateX: slideAnim }] }]}>
          <ScrollView
            ref={scrollViewRef}
            contentContainerStyle={[styles.scrollContent, { paddingHorizontal: hs(16), paddingBottom: vs(40), alignItems: isWide ? "center" : undefined }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >

            {/* ══ STEP 1 : PERSONAL ════════════════════════════════════ */}
            {step === 0 && (
              <View style={[styles.card, { width: isWide ? contentWidth : "100%" }]}>
                <SectionBanner icon="account-circle-outline" title="Personal Details" sub="Your identity & contact information" />

                <TwoCol isWide={isWide} halfWidth={halfWidth} gap={colGap}
                  onLayout={e => { const y = e.nativeEvent.layout.y; fieldCoords.current.firstName = y; fieldCoords.current.lastName = y; }}>
                  <Field label="First Name" value={personal.firstName} onChange={v => setPersonal(p => ({ ...p, firstName: v }))} error={errors.firstName} placeholder="First name" maxLength={100} locked={lockedPersonal.firstName} />
                  <Field label="Last Name" value={personal.lastName} onChange={v => setPersonal(p => ({ ...p, lastName: v }))} error={errors.lastName} placeholder="Last name" maxLength={100} locked={lockedPersonal.lastName} />
                </TwoCol>

                <TwoCol isWide={isWide} halfWidth={halfWidth} gap={colGap}
                  onLayout={e => { const y = e.nativeEvent.layout.y; fieldCoords.current.fatherName = y; fieldCoords.current.gender = y; }}>
                  <Field label="Father's Name" value={personal.fatherName} onChange={v => setPersonal(p => ({ ...p, fatherName: v }))} error={errors.fatherName} placeholder="Father's full name" maxLength={100} locked={lockedPersonal.fatherName} />
                  <GenderSelect value={personal.gender} onChange={v => setPersonal(p => ({ ...p, gender: v }))} error={errors.gender} locked={lockedPersonal.gender} />
                </TwoCol>

                <TwoCol isWide={isWide} halfWidth={halfWidth} gap={colGap}
                  onLayout={e => { const y = e.nativeEvent.layout.y; fieldCoords.current.email = y; fieldCoords.current.phone = y; }}>
                  <Field label="Email Address" value={personal.email} onChange={v => setPersonal(p => ({ ...p, email: v.toLowerCase() }))} error={errors.email} placeholder="you@email.com" keyboardType="email-address" hint="e.g. user@gmail.com" locked={lockedPersonal.email} />
                  <Field label="Mobile Number" value={personal.phone} onChange={v => { if (/^\d*$/.test(v) && v.length <= 10) setPersonal(p => ({ ...p, phone: v })); }} error={errors.phone} placeholder="10-digit number" keyboardType="number-pad" maxLength={10} hint="Starts with 6–9" locked={lockedPersonal.phone} />
                </TwoCol>

                <TwoCol isWide={isWide} halfWidth={halfWidth} gap={colGap}
                  onLayout={e => { const y = e.nativeEvent.layout.y; fieldCoords.current.dob = y; fieldCoords.current.personalPincode = y; }}>
                  <View>
                    <TouchableOpacity onPress={() => { if (!lockedPersonal.dob) setShowDatePicker(true); }} activeOpacity={lockedPersonal.dob ? 1 : 0.8}>
                      <View pointerEvents="none">
                        <Field label="Date of Birth" value={personal.dob} onChange={() => { }} error={errors.dob} placeholder="DD-MM-YYYY" hint="Min age: 18 years" locked={lockedPersonal.dob} />
                      </View>
                    </TouchableOpacity>
                    <CalendarModal
                      visible={showDatePicker}
                      title="Select Date of Birth"
                      initialDate={personal.dob && RX.dob.test(personal.dob)
                        ? (() => { const [d, m, y] = personal.dob.split("-"); return new Date(y, m - 1, d); })()
                        : new Date()}
                      maxDate={new Date()}
                      onCancel={() => setShowDatePicker(false)}
                      onConfirm={(sel) => {
                        setShowDatePicker(false);
                        if (sel) {
                          const d = String(sel.getDate()).padStart(2, "0");
                          const m = String(sel.getMonth() + 1).padStart(2, "0");
                          const y = sel.getFullYear();
                          setPersonal(p => ({ ...p, dob: `${d}-${m}-${y}` }));
                        }
                      }}
                    />
                  </View>
                  <Field label="Pincode" value={personal.personalPincode} onChange={v => {
                    if (/^\d*$/.test(v) && v.length <= 6) {
                      setPersonal(p => ({ ...p, personalPincode: v }));
                      if (v.length === 6) fetchStateFromPincode(v, "personal");
                    }
                  }} error={errors.personalPincode} placeholder="6-digit pincode" keyboardType="number-pad" maxLength={6} locked={lockedPersonal.personalPincode} loading={pinLoading && personal.personalPincode.length === 6} />
                </TwoCol>

                <TwoCol isWide={isWide} halfWidth={halfWidth} gap={colGap}
                  onLayout={e => { const y = e.nativeEvent.layout.y; fieldCoords.current.personalState = y; fieldCoords.current.personalCity = y; }}>
                  <View>
                    <TouchableOpacity onPress={() => { if (!lockedPersonal.personalState) handleOpenState("personal"); }} activeOpacity={lockedPersonal.personalState ? 1 : 0.8}>
                      <View pointerEvents="none">
                        <Field label="State" value={personal.personalState} onChange={() => { }} error={errors.personalState} placeholder="Select State" locked={lockedPersonal.personalState} />
                      </View>
                    </TouchableOpacity>
                  </View>
                  <View>
                    <TouchableOpacity onPress={() => { if (!lockedPersonal.personalCity) handleOpenCity("personal"); }} activeOpacity={lockedPersonal.personalCity ? 1 : 0.8}>
                      <View pointerEvents="none">
                        <Field label="City" value={personal.personalCity} onChange={() => { }} error={errors.personalCity} placeholder="Select City" locked={lockedPersonal.personalCity} />
                      </View>
                    </TouchableOpacity>
                  </View>
                </TwoCol>

                <Field onLayout={e => fieldCoords.current.personalAddress = e.nativeEvent.layout.y}
                  label="Full Address" value={personal.personalAddress} onChange={v => setPersonal(p => ({ ...p, personalAddress: v }))}
                  error={errors.personalAddress} multiline placeholder="House no., Street, Area, Landmark" hint="Minimum 10 characters" maxLength={500} locked={lockedPersonal.personalAddress} />
              </View>
            )}

            {/* ══ STEP 2 : BUSINESS ════════════════════════════════════ */}
            {step === 1 && (
              <View style={[styles.card, { width: isWide ? contentWidth : "100%" }]}>
                <SectionBanner icon="store-outline" title="Business Information" sub="Shop details & owner identification" />

                <Field onLayout={e => fieldCoords.current.shopName = e.nativeEvent.layout.y} label="Shop / Business Name" value={business.shopName} onChange={v => setBusiness(b => ({ ...b, shopName: v }))} error={errors.shopName} placeholder="Your shop name" maxLength={200} locked={lockedBusiness.shopName} />

                <TwoCol isWide={isWide} halfWidth={halfWidth} gap={colGap}
                  onLayout={e => { const y = e.nativeEvent.layout.y; fieldCoords.current.businessPanNumber = y; fieldCoords.current.gstNumber = y; }}>
                  <Field label="Business PAN" value={business.businessPanNumber} onChange={v => setBusiness(b => ({ ...b, businessPanNumber: v.toUpperCase() }))} placeholder="ABCDE1234F" maxLength={10} error={errors.businessPanNumber} hint="Optional" required={false} locked={lockedBusiness.businessPanNumber} />
                  <Field label="GST Number" value={business.gstNumber} onChange={v => setBusiness(b => ({ ...b, gstNumber: v.toUpperCase() }))} placeholder="22AAAAA0000A1Z5" maxLength={15} error={errors.gstNumber} required={false} locked={lockedBusiness.gstNumber} />
                </TwoCol>

                <Field onLayout={e => fieldCoords.current.businessAddress = e.nativeEvent.layout.y} label="Shop Address" value={business.businessAddress} onChange={v => setBusiness(b => ({ ...b, businessAddress: v }))} error={errors.businessAddress} multiline placeholder="Full shop address with landmark" hint="Minimum 10 characters" maxLength={200} locked={lockedBusiness.businessAddress} />

                <TwoCol isWide={isWide} halfWidth={halfWidth} gap={colGap}
                  onLayout={e => { const y = e.nativeEvent.layout.y; fieldCoords.current.businessPincode = y; fieldCoords.current.businessState = y; }}>
                  <Field label="Pincode" value={business.businessPincode} onChange={v => {
                    if (/^\d*$/.test(v) && v.length <= 6) {
                      setBusiness(b => ({ ...b, businessPincode: v }));
                      if (v.length === 6) fetchStateFromPincode(v, "business");
                    }
                  }} error={errors.businessPincode} placeholder="6-digit pincode" keyboardType="number-pad" maxLength={6} locked={lockedBusiness.businessPincode} loading={pinLoading && business.businessPincode.length === 6} />
                  <View>
                    <TouchableOpacity onPress={() => { if (!lockedBusiness.businessState) handleOpenState("business"); }} activeOpacity={lockedBusiness.businessState ? 1 : 0.8}>
                      <View pointerEvents="none">
                        <Field label="State" value={business.businessState} onChange={() => { }} error={errors.businessState} placeholder="Select State" locked={lockedBusiness.businessState} />
                      </View>
                    </TouchableOpacity>
                  </View>
                </TwoCol>

                <View onLayout={e => fieldCoords.current.businessCity = e.nativeEvent.layout.y}>
                  <TouchableOpacity onPress={() => { if (!lockedBusiness.businessCity) handleOpenCity("business"); }} activeOpacity={lockedBusiness.businessCity ? 1 : 0.8}>
                    <View pointerEvents="none">
                      <Field label="City" value={business.businessCity} onChange={() => { }} error={errors.businessCity} placeholder="Select City" locked={lockedBusiness.businessCity} />
                    </View>
                  </TouchableOpacity>
                </View>

                <Divider label="OWNER IDENTIFICATION" />

                <TwoCol isWide={isWide} halfWidth={halfWidth} gap={colGap}
                  onLayout={e => { const y = e.nativeEvent.layout.y; fieldCoords.current.panNumber = y; fieldCoords.current.aadharNumber = y; }}>
                  <Field label="Personal PAN" value={business.panNumber} onChange={v => setBusiness(b => ({ ...b, panNumber: v.toUpperCase() }))} error={errors.panNumber} placeholder="ABCDE1234F" maxLength={10} hint="Format: AAAAA9999A" locked={lockedBusiness.panNumber} />
                  <Field label="Aadhaar Number" value={business.aadharNumber} onChange={v => { if (/^\d*$/.test(v) && v.length <= 12) setBusiness(b => ({ ...b, aadharNumber: v })); }} error={errors.aadharNumber} placeholder="12-digit number" keyboardType="number-pad" maxLength={12} locked={lockedBusiness.aadharNumber} />
                </TwoCol>

                <Divider label="UPLOAD DOCUMENTS" />

                {/* ── Size hint ───────────────────────────────────────── */}
                <View style={styles.sizeHintBanner}>
                  <Icon name="information-outline" size={rs(13)} color={Colors.kyc_accent} />
                  <Text style={[styles.sizeHintText, { fontSize: rs(11) }]}>
                    Image must be between{" "}
                    <Text style={{ fontFamily: Fonts.Bold, color: Colors.kyc_text }}>10 KB</Text>
                    {" "}and{" "}
                    <Text style={{ fontFamily: Fonts.Bold, color: Colors.kyc_text }}>200 KB</Text>.
                    {" "}Clear, well-lit JPG or PNG only.
                  </Text>
                </View>

                {/* ── Document slots ──────────────────────────────────── */}
                <View style={[styles.docGrid, isWide && { flexDirection: "row", flexWrap: "wrap", gap: colGap }]}
                  onLayout={e => { const y = e.nativeEvent.layout.y; fieldCoords.current.aadharFile = y; fieldCoords.current.panFile = y; fieldCoords.current.shopImage = y; }}>
                  {[
                    { key: "aadharFile", label: "Aadhaar Card", sub: "Front side", icon: "card-account-details", color: Colors.info_dark },
                    { key: "panFile", label: "PAN Card", sub: "Clear photo", icon: "card-account-details-outline", color: Colors.primary },
                    { key: "shopImage", label: "Shop Photo", sub: "Front view", icon: "store-outline", color: Colors.amber },
                  ].map((slot) => {
                    const img = files[slot.key];
                    const hasErr = !!errors[slot.key];
                    return (
                      <View key={slot.key} style={[styles.docSlotWrap, isWide && { width: halfWidth }]}>
                        <TouchableOpacity
                          style={[
                            styles.docBox,
                            img && { borderStyle: "solid", borderColor: Colors.kyc_success, backgroundColor: Colors.kyc_success + "08" },
                            hasErr && { borderStyle: "solid", borderColor: Colors.kyc_error, backgroundColor: Colors.kyc_error + "06" },
                          ]}
                          onPress={() => { if (!lockedFiles[slot.key]) pickImage(slot.key); }}
                          activeOpacity={lockedFiles[slot.key] ? 1 : 0.75}
                        >
                          {img ? (
                            <>
                              <Image source={{ uri: img.uri }} style={styles.docThumb} resizeMode="cover" />
                              <LinearGradient colors={["transparent", "rgba(0,0,0,0.72)"]} style={styles.docOverlay}>
                                <Icon name="check-circle" size={rs(13)} color={Colors.white} />
                                <Text style={[styles.docDoneLabel, { fontSize: rs(9) }]}>UPLOADED</Text>
                                <Text style={styles.docFileName} numberOfLines={1}>{img.name}</Text>
                              </LinearGradient>
                              {!lockedFiles[slot.key] && (
                                <TouchableOpacity
                                  style={[styles.docCornerBtn, { backgroundColor: Colors.kyc_error, top: -8, right: -8, width: rs(24), height: rs(24), borderRadius: rs(12), borderWidth: 1, borderColor: Colors.white, elevation: 4 }]}
                                  onPress={() => removeFile(slot.key)}
                                  activeOpacity={0.8}
                                >
                                  <Icon name="close" size={rs(12)} color={Colors.white} />
                                </TouchableOpacity>
                              )}
                            </>
                          ) : (
                            <View style={styles.docEmptyContent}>
                              <View style={[styles.docIconCircle, { backgroundColor: slot.color + "1C" }]}>
                                <Icon name={slot.icon} size={rs(22)} color={slot.color} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.docSlotLabel, { fontFamily: Fonts.Bold, fontSize: rs(12) }]}>{slot.label}</Text>
                                <Text style={[styles.docSlotSub, { fontSize: rs(10) }]}>{slot.sub}</Text>
                                <Text style={[styles.docSizeLabel, { fontSize: rs(9) }]}>{SIZE_LABEL}</Text>
                              </View>
                              <View style={[styles.docUploadTag, { backgroundColor: Colors.kyc_accent + "18", borderColor: Colors.kyc_accent + "40" }]}>
                                <Icon name="camera-plus-outline" size={rs(11)} color={Colors.kyc_accent} />
                                <Text style={[styles.docUploadTagText, { color: Colors.kyc_accent, fontFamily: Fonts.Bold, fontSize: rs(9) }]}>Upload</Text>
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

            {/* ══ STEP 3 : BANKING ═════════════════════════════════════ */}
            {step === 2 && (
              <View style={[styles.card, { width: isWide ? contentWidth : "100%" }]}>
                <SectionBanner icon="bank-outline" title="Banking Details" sub="For settlements and commissions" />

                <TouchableOpacity onPress={() => { if (!lockedBanking.bankName) handleOpenBank(); }} activeOpacity={lockedBanking.bankName ? 1 : 0.8}>
                  <View pointerEvents="none">
                    <Field onLayout={e => fieldCoords.current.bankName = e.nativeEvent.layout.y} label="Bank Name" value={banking.bankName} error={errors.bankName} placeholder="Select your Bank" locked={lockedBanking.bankName} />
                  </View>
                </TouchableOpacity>

                <FieldWrap onLayout={e => fieldCoords.current.ifscCode = e.nativeEvent.layout.y} label="IFSC Code" required error={errors.ifscCode}>
                  <View style={[styles.inputRow, errors.ifscCode && { borderColor: Colors.kyc_error, backgroundColor: Colors.kyc_error + "06" }, lockedBanking.ifscCode && styles.inputRowLocked]}>
                    <TextInput style={[styles.input, { letterSpacing: 1 }, lockedBanking.ifscCode && styles.inputLocked]}
                      value={banking.ifscCode}
                      onChangeText={lockedBanking.ifscCode ? undefined : (v => setBanking(b => ({ ...b, ifscCode: v.toUpperCase().replace(/[^A-Z0-9]/g, "") })))}
                      editable={!lockedBanking.ifscCode}
                      placeholder="SBIN0001234" placeholderTextColor={Colors.kyc_textMuted} maxLength={15} autoCapitalize="characters" />
                  </View>
                </FieldWrap>

                <FieldWrap onLayout={e => fieldCoords.current.accountNumber = e.nativeEvent.layout.y} label="Account Number" required error={errors.accountNumber}>
                  <View style={[styles.inputRow, errors.accountNumber && { borderColor: Colors.kyc_error, backgroundColor: Colors.kyc_error + "06" }, lockedBanking.accountNumber && styles.inputRowLocked]}>
                    <TextInput
                      style={[styles.input, { paddingRight: hs(44) }, lockedBanking.accountNumber && styles.inputLocked]}
                      value={banking.accountNumber} editable={!lockedBanking.accountNumber}
                      onChangeText={lockedBanking.accountNumber ? undefined : (v => {
                        if (/^\d*$/.test(v) && v.length <= 20)
                          setBanking(b => ({ ...b, accountNumber: v, confirmAccountNumber: "" }));
                      })}
                      placeholder="Enter account number" placeholderTextColor={Colors.kyc_textMuted}
                      keyboardType="number-pad" secureTextEntry={!showAcc} maxLength={20}
                    />
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowAcc(p => !p)}>
                      <Icon name={showAcc ? "eye-off-outline" : "eye-outline"} size={rs(18)} color={Colors.kyc_textMuted} />
                    </TouchableOpacity>
                  </View>
                </FieldWrap>

                <FieldWrap
                  onLayout={e => fieldCoords.current.confirmAccountNumber = e.nativeEvent.layout.y}
                  label="Confirm Account Number" required
                  error={accMatchStatus === "mismatch" && banking.confirmAccountNumber.length > 0 ? "Account numbers don't match" : errors.confirmAccountNumber}
                >
                  <View style={[styles.inputRow, accMatchStatus !== "idle" && { borderColor: accMatchColor, borderWidth: 1.5 }]}>
                    <TextInput
                      style={[styles.input, { paddingRight: hs(44) }, lockedBanking.accountNumber && styles.inputLocked]}
                      value={banking.confirmAccountNumber} editable={!lockedBanking.accountNumber}
                      onChangeText={lockedBanking.accountNumber ? undefined : (v => {
                        if (/^\d*$/.test(v) && v.length <= 20)
                          setBanking(b => ({ ...b, confirmAccountNumber: v }));
                      })}
                      placeholder="Re-enter account number" placeholderTextColor={Colors.kyc_textMuted}
                      keyboardType="number-pad" secureTextEntry={!showConfirmAcc} maxLength={20}
                    />
                    <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirmAcc(p => !p)}>
                      <Icon name={showConfirmAcc ? "eye-off-outline" : "eye-outline"} size={rs(18)} color={Colors.kyc_textMuted} />
                    </TouchableOpacity>
                  </View>
                  {accMatchStatus !== "idle" && (
                    <View style={[styles.accMatchStrip, { backgroundColor: accMatchColor + "12", borderColor: accMatchColor + "35" }]}>
                      <Icon name={accMatchIcon} size={rs(13)} color={accMatchColor} />
                      <Text style={[styles.accMatchTxt, { color: accMatchColor }]}>
                        {accMatchStatus === "match" ? "Account numbers match ✓" : "Account numbers do not match"}
                      </Text>
                    </View>
                  )}
                </FieldWrap>

                <TwoCol isWide={isWide} halfWidth={halfWidth} gap={colGap}
                  onLayout={e => { const y = e.nativeEvent.layout.y; fieldCoords.current.accountHolderName = y; }}>
                  <Field label="Account Holder Name" value={banking.accountHolderName} onChange={v => setBanking(b => ({ ...b, accountHolderName: v }))} error={errors.accountHolderName} placeholder="As per bank records" maxLength={100} locked={lockedBanking.accountHolderName} />
                </TwoCol>

                <Divider label="DOCUMENTS" />
                <View style={{ marginBottom: vs(10) }}>
                  {[
                    { key: "blankCheque", label: "Bank Passbook / Cancelled Cheque", sub: "Must show your name and account number", icon: "bank-transfer", color: Colors.kyc_accent },
                  ].map((slot) => {
                    const img = files[slot.key];
                    const hasErr = !!errors[slot.key];
                    return (
                      <View key={slot.key} style={styles.docSlotWrap} onLayout={e => fieldCoords.current[slot.key] = e.nativeEvent.layout.y}>
                        <TouchableOpacity
                          style={[styles.docBox, hasErr && { borderColor: Colors.kyc_error, backgroundColor: Colors.kyc_error + "08" }, lockedFiles[slot.key] && { opacity: 0.8, borderStyle: "solid", backgroundColor: Colors.kyc_lockedBg }]}
                          activeOpacity={lockedFiles[slot.key] ? 1 : 0.75}
                          onPress={() => { if (!lockedFiles[slot.key]) pickImage(slot.key); }}
                        >
                          {img ? (
                            <>
                              <Image source={{ uri: img.uri }} style={styles.docThumb} />
                              <LinearGradient colors={["transparent", "rgba(0,0,0,0.85)"]} style={styles.docOverlay}>
                                <Icon name="check-decagram" size={rs(13)} color={Colors.kyc_success} />
                                <Text style={[styles.docDoneLabel, { fontSize: rs(9) }]}>UPLOADED</Text>
                                <Text style={styles.docFileName} numberOfLines={1}>{img.name}</Text>
                              </LinearGradient>
                              {!lockedFiles[slot.key] && (
                                <TouchableOpacity
                                  style={[styles.docCornerBtn, { backgroundColor: Colors.kyc_error, right: vs(8), width: rs(28), height: rs(28), borderRadius: rs(14) }]}
                                  onPress={() => removeFile(slot.key)}
                                  activeOpacity={0.8}
                                >
                                  <Icon name="close" size={rs(16)} color={Colors.white} />
                                </TouchableOpacity>
                              )}
                            </>
                          ) : (
                            <View style={styles.docEmptyContent}>
                              <View style={[styles.docIconCircle, { backgroundColor: slot.color + "1C" }]}>
                                <Icon name={slot.icon} size={rs(22)} color={slot.color} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <Text style={[styles.docSlotLabel, { fontFamily: Fonts.Bold, fontSize: rs(12) }]}>{slot.label}</Text>
                                <Text style={[styles.docSlotSub, { fontSize: rs(10) }]}>{slot.sub}</Text>
                                <Text style={[styles.docSizeLabel, { fontSize: rs(9) }]}>{SIZE_LABEL}</Text>
                              </View>
                              <View style={[styles.docUploadTag, { backgroundColor: Colors.kyc_accent + "18", borderColor: Colors.kyc_accent + "40" }]}>
                                <Icon name="camera-plus-outline" size={rs(11)} color={Colors.kyc_accent} />
                                <Text style={[styles.docUploadTagText, { color: Colors.kyc_accent, fontFamily: Fonts.Bold, fontSize: rs(9) }]}>Upload</Text>
                              </View>
                            </View>
                          )}
                        </TouchableOpacity>
                        {hasErr && <ErrLabel msg={errors[slot.key]} />}
                      </View>
                    );
                  })}
                </View>

                <LinearGradient colors={[Colors.kyc_accent + "1A", Colors.kyc_accent + "08"]} style={styles.securityBanner}>
                  <View style={[styles.securityIcon, { backgroundColor: Colors.kyc_accent + "25" }]}>
                    <Icon name="shield-lock-outline" size={rs(20)} color={Colors.kyc_accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.securityTitle, { color: Colors.kyc_accent, fontFamily: Fonts.Bold, fontSize: rs(12) }]}>256-bit Encrypted</Text>
                    <Text style={[styles.securityBody, { fontSize: rs(11), fontFamily: Fonts.Regular }]}>Banking details are encrypted and used only for payouts.</Text>
                  </View>
                </LinearGradient>

                <View style={styles.reviewBanner}>
                  <Icon name="information-outline" size={rs(13)} color={Colors.info_dark} />
                  <Text style={[styles.reviewText, { fontSize: rs(11), fontFamily: Fonts.Regular }]}>Review all details before submitting. Changes after submission may delay approval.</Text>
                </View>
              </View>
            )}

            {/* Nav buttons */}
            <View style={[styles.actionRow, { width: isWide ? contentWidth : "100%" }]}>
              {step > 0
                ? <TouchableOpacity style={styles.prevBtn} onPress={handlePrev} activeOpacity={0.75}>
                  <Icon name="arrow-left" size={rs(17)} color={Colors.kyc_text} />
                  <Text style={[styles.prevBtnText, { fontFamily: Fonts.Medium, fontSize: rs(14) }]}>Back</Text>
                </TouchableOpacity>
                : <View style={{ flex: 1 }} />
              }
              <TouchableOpacity
                style={[styles.nextBtnOuter, { opacity: loading ? 0.7 : 1 }]}
                onPress={step < 2 ? handleNext : handleSubmit}
                activeOpacity={0.85}
                disabled={loading}
              >
                <LinearGradient
                  colors={loading ? [Colors.amber, Colors.amber] : [Colors.primary, Colors.primary]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.nextBtnGrad}
                >
                  {loading
                    ? <ActivityIndicator color={Colors.white} size="small" />
                    : <>
                      <Text style={[styles.nextBtnText, { color: Colors.white, fontFamily: Fonts.Bold, fontSize: rs(14) }]}>
                        {step < 2 ? "Next" : "Submit KYC"}
                      </Text>
                      <Icon name={step < 2 ? "arrow-right" : "check-circle-outline"} size={rs(17)} color={Colors.white} style={{ marginLeft: hs(6) }} />
                    </>
                  }
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </Animated.View>
      </KeyboardAvoidingView>

      {/* Success modal */}
      <Modal transparent visible={showSuccessModal} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconWrap}>
              <Icon name="check-decagram" size={rs(44)} color={Colors.kyc_success} />
            </View>
            <Text style={styles.modalTitle}>KYC Submitted Successfully</Text>
            <Text style={styles.modalSub}>Your KYC details are under review. We'll notify you once approved!</Text>
            <TouchableOpacity style={styles.modalBtn} activeOpacity={0.8} onPress={() => { setShowSuccessModal(false); navigation.replace("KycSubmitted"); }}>
              <LinearGradient colors={[Colors.kyc_accent, Colors.kyc_accentDark]} style={styles.modalBtnGrad}>
                <Text style={styles.modalBtnText}>Continue to Home</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Fail modal */}
      <Modal transparent visible={showFailModal} animationType="fade" onRequestClose={() => setShowFailModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={[styles.modalIconWrap, { backgroundColor: Colors.kyc_error + "15" }]}>
              <Icon name="alert-circle-outline" size={rs(44)} color={Colors.kyc_error} />
            </View>
            <Text style={styles.modalTitle}>Submission Failed</Text>
            <Text style={styles.modalSub}>{failMsg || "Something went wrong. Please check your details and try again."}</Text>
            <TouchableOpacity style={styles.modalBtn} activeOpacity={0.8} onPress={() => setShowFailModal(false)}>
              <LinearGradient colors={[Colors.kyc_error, Colors.error_dark]} style={styles.modalBtnGrad}>
                <Text style={styles.modalBtnText}>Try Again</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Search modals */}
      <SearchModal visible={showCityModal} title="Select City" loading={cityLoading} search={citySearch} setSearch={setCitySearch}
        items={cityList.filter(c => c.cityName?.toLowerCase().includes(citySearch.trim().toLowerCase()))} getLabel={c => c.cityName}
        onSelect={ct => { if (cityTarget === "personal") setPersonal(p => ({ ...p, personalCity: ct.cityName })); if (cityTarget === "business") setBusiness(b => ({ ...b, businessCity: ct.cityName })); setShowCityModal(false); setCitySearch(""); }}
        onClose={() => { setShowCityModal(false); setCitySearch(""); }} onRefresh={() => handleOpenCity(cityTarget)} />

      <SearchModal visible={showStateModal} title="Select State" loading={stateLoading} search={stateSearch} setSearch={setStateSearch}
        items={stateList.filter(s => s.stateName?.toLowerCase().includes(stateSearch.trim().toLowerCase()))} getLabel={s => s.stateName}
        onSelect={st => { if (stateTarget === "personal") setPersonal(p => ({ ...p, personalState: st.stateName, personalCity: "" })); if (stateTarget === "business") setBusiness(b => ({ ...b, businessState: st.stateName, businessCity: "" })); setShowStateModal(false); setStateSearch(""); }}
        onClose={() => { setShowStateModal(false); setStateSearch(""); }} onRefresh={handleFetchStates} />

      <SearchModal visible={showBankModal} title="Select Bank" loading={bankLoading} search={bankSearch} setSearch={setBankSearch}
        items={bankList.filter(b => b.bankName?.toLowerCase().includes(bankSearch.trim().toLowerCase()))} getLabel={b => b.bankName}
        onSelect={bn => { setBanking(b => ({ ...b, bankName: bn.bankName })); setShowBankModal(false); setBankSearch(""); }}
        onClose={() => { setShowBankModal(false); setBankSearch(""); }} onRefresh={handleFetchBanks} />
      <ImageUploadAlert
        visible={showSourcePicker}
        onCamera={() => handlePickSource("camera")}
        onGallery={() => handlePickSource("gallery")}
        onClose={() => setShowSourcePicker(false)}
      />

      <CustomAlert
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert({ ...alert, visible: false })}
      />
    </SafeAreaView>
  );
}


// ─────────────────────────────────────────────────────────────────────────────
// ATOMS
// ─────────────────────────────────────────────────────────────────────────────
function SearchModal({ visible, title, loading, search, setSearch, items, getLabel, onSelect, onClose, onRefresh }) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={onClose}>
        <View style={[styles.modalCard, { height: "70%", paddingTop: vs(16), paddingBottom: 0, justifyContent: "flex-start", alignItems: "flex-start" }]}>
          <View style={{ width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: vs(12) }}>
            <Text style={[styles.modalTitle, { marginBottom: 0 }]}>{title}</Text>
            <TouchableOpacity onPress={onRefresh} disabled={loading}>
              <Icon name="refresh" size={rs(22)} color={loading ? Colors.kyc_textMuted : Colors.kyc_accent} />
            </TouchableOpacity>
          </View>
          <View style={{ width: "100%", paddingBottom: vs(12), borderBottomWidth: 1, borderBottomColor: Colors.kyc_border, marginBottom: vs(8) }}>
            <TextInput
              style={{ borderWidth: 1, borderColor: Colors.kyc_border, borderRadius: hs(8), paddingHorizontal: hs(12), paddingVertical: Platform.OS === "ios" ? vs(12) : Math.max(8, vs(8)), color: Colors.kyc_text, fontSize: rs(13), fontFamily: Fonts.Regular }}
              placeholder={`Search ${title.split(" ")[1]?.toLowerCase() || ""}…`}
              placeholderTextColor={Colors.kyc_textMuted} value={search} onChangeText={setSearch}
            />
          </View>
          <ScrollView style={{ width: "100%" }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {loading && items.length === 0 && <Text style={styles.modalEmpty}>Loading…</Text>}
            {!loading && items.length === 0 && <Text style={styles.modalEmpty}>No results found.</Text>}
            {items.map((item, i) => (
              <TouchableOpacity key={i} style={styles.modalListItem} onPress={() => onSelect(item)}>
                <Text style={{ fontSize: rs(13), color: Colors.kyc_text, fontFamily: Fonts.Medium }}>{getLabel(item)}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

function TwoCol({ children, isWide, halfWidth, gap, onLayout }) {
  const kids = React.Children.toArray(children);
  if (!isWide) return <View onLayout={onLayout} style={{ flex: 1 }}>{kids}</View>;
  return (
    <View style={{ flexDirection: "row", gap, marginBottom: 0 }} onLayout={onLayout}>
      {kids.map((child, i) => <View key={i} style={{ width: halfWidth }}>{child}</View>)}
    </View>
  );
}

function FieldWrap({ label, required = true, error, hint, children, onLayout }) {
  return (
    <View style={styles.fieldWrap} onLayout={onLayout}>
      <Text style={[styles.fieldLabel, { fontSize: rs(10) }]}>
        {label}
        {required
          ? <Text style={{ color: Colors.kyc_error }}> *</Text>
          : <Text style={{ color: Colors.kyc_textMuted, fontSize: rs(9) }}> (Optional)</Text>
        }
      </Text>
      {children}
      {!!hint && !error && <Text style={[styles.fieldHint, { fontSize: rs(9) }]}>{hint}</Text>}
      {!!error && <ErrLabel msg={error} />}
    </View>
  );
}

function Field({ label, value, onChange, placeholder, error, keyboardType, multiline, required = true, maxLength, hint, secureTextEntry, onLayout, locked = false, loading = false }) {
  return (
    <FieldWrap label={label} required={required} error={error} hint={locked ? undefined : hint} onLayout={onLayout}>
      <View style={[
        styles.inputRow,
        error && !locked && { borderColor: Colors.kyc_error, backgroundColor: Colors.kyc_error + "06" },
        locked && styles.inputRowLocked,
        multiline && { alignItems: "flex-start" },
      ]}>
        <TextInput
          style={[styles.input, { fontSize: rs(13) }, multiline && { height: vs(72), textAlignVertical: "top", paddingTop: vs(10) }, locked && styles.inputLocked]}
          value={value} onChangeText={locked ? undefined : onChange} editable={!locked}
          placeholder={placeholder ?? ""} placeholderTextColor={Colors.kyc_textMuted}
          keyboardType={keyboardType ?? "default"} multiline={multiline} maxLength={maxLength}
          secureTextEntry={secureTextEntry} autoCapitalize="none" pointerEvents={locked ? "none" : "auto"}
        />
        {loading && <ActivityIndicator size="small" color={Colors.kyc_accent} style={{ marginRight: hs(8) }} />}
        {locked && (
          <View style={styles.lockedBadge}>
            <Icon name="lock-outline" size={rs(10)} color={Colors.kyc_accent} />
            <Text style={[styles.lockedBadgeTxt, { fontSize: rs(9) }]}>Auto-filled</Text>
          </View>
        )}
      </View>
      {locked && (
        <View style={styles.lockedHintRow}>
          <Icon name="shield-check-outline" size={rs(10)} color={Colors.kyc_success} />
          <Text style={[styles.lockedHintTxt, { fontSize: rs(9) }]}>Verified from your account — cannot be changed</Text>
        </View>
      )}
    </FieldWrap>
  );
}

function GenderSelect({ value, onChange, error, onLayout, locked = false }) {
  return (
    <View style={styles.fieldWrap} onLayout={onLayout}>
      <Text style={[styles.fieldLabel, { fontSize: rs(10) }]}>Gender <Text style={{ color: Colors.kyc_error }}>*</Text></Text>
      <View style={styles.genderRow}>
        {[{ label: "Male", icon: "gender-male" }, { label: "Female", icon: "gender-female" }, { label: "Other", icon: "gender-non-binary" }].map(opt => (
          <TouchableOpacity key={opt.label} onPress={() => { if (!locked) onChange(opt.label); }} activeOpacity={locked ? 1 : 0.8}
            style={[styles.genderBtn, value === opt.label && { backgroundColor: Colors.kyc_accent + "1C", borderColor: Colors.kyc_accent }, locked && value === opt.label && { borderStyle: "dashed", backgroundColor: Colors.kyc_lockedBg, borderColor: Colors.kyc_lockedBorder }]}>
            <Icon name={opt.icon} size={rs(12)} color={value === opt.label ? (locked ? Colors.kyc_textMuted : Colors.kyc_accent) : Colors.kyc_textMuted} />
            <Text style={[styles.genderBtnText, { fontSize: rs(10), fontFamily: Fonts.Medium }, value === opt.label && { color: locked ? Colors.kyc_textMuted : Colors.kyc_accent, fontFamily: Fonts.Bold }]}>{opt.label}</Text>
            {locked && value === opt.label && <Icon name="lock-outline" size={rs(9)} color={Colors.kyc_accent} style={{ marginLeft: hs(2) }} />}
          </TouchableOpacity>
        ))}
      </View>
      {locked && (
        <View style={styles.lockedHintRow}>
          <Icon name="shield-check-outline" size={rs(10)} color={Colors.kyc_success} />
          <Text style={[styles.lockedHintTxt, { fontSize: rs(9) }]}>Verified from your account — cannot be changed</Text>
        </View>
      )}
      {!!error && <ErrLabel msg={error} />}
    </View>
  );
}

function SectionBanner({ icon, title, sub }) {
  return (
    <View style={styles.sectionBanner}>
      <LinearGradient colors={[Colors.kyc_accent + "30", Colors.kyc_accent + "10"]} style={styles.sectionBannerIcon}>
        <Icon name={icon} size={rs(20)} color={Colors.kyc_accent} />
      </LinearGradient>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionBannerTitle, { fontFamily: Fonts.Bold, fontSize: rs(16) }]}>{title}</Text>
        <Text style={[styles.sectionBannerSub, { fontSize: rs(11) }]}>{sub}</Text>
      </View>
    </View>
  );
}

function Divider({ label }) {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={[styles.dividerLabel, { fontFamily: Fonts.Bold, fontSize: rs(9) }]}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

function ErrLabel({ msg }) {
  return (
    <View style={styles.errRow}>
      <Icon name="alert-circle-outline" size={rs(11)} color={Colors.kyc_error} />
      <Text style={[styles.errText, { color: Colors.kyc_error, fontSize: rs(10) }]}> {msg}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.beige },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingBottom: vs(12), backgroundColor: Colors.beige },
  backBtn: { width: hs(36), height: hs(36), borderRadius: hs(12), backgroundColor: Colors.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.kyc_border },
  headerCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  headerTitle: { color: Colors.kyc_text, textAlign: "center" },
  headerSub: { color: Colors.kyc_textSub, marginTop: 1, textAlign: "center" },
  stepBadge: { paddingHorizontal: hs(10), paddingVertical: vs(4), borderRadius: hs(10) },
  stepBadgeText: { letterSpacing: 0.4 },
  progressWrap: { paddingBottom: vs(12), backgroundColor: Colors.beige },
  progressTrack: { height: 2.5, backgroundColor: "rgba(201, 168, 76, 0.15)", borderRadius: 2, marginBottom: vs(10), overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  stepDots: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  stepDotItem: { alignItems: "center", flex: 1 },
  stepDotCircle: { alignItems: "center", justifyContent: "center", marginBottom: vs(4) },
  stepDotLabel: { color: Colors.kyc_textMuted, textAlign: "center", letterSpacing: 0.4 },
  scrollContent: { paddingTop: vs(2), backgroundColor: Colors.beige },
  card: {
    backgroundColor: Colors.beige,
    borderRadius: hs(16),
    padding: hs(18),
    marginBottom: vs(16),
    borderWidth: 1,
    borderColor: "rgba(201, 168, 76, 0.25)",
    elevation: 0,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0,
    shadowRadius: 10
  },
  sectionBanner: { flexDirection: "row", alignItems: "center", gap: hs(12), marginBottom: vs(18), padding: hs(12), backgroundColor: "rgba(201, 168, 76, 0.12)", borderRadius: hs(14), borderLeftWidth: 3, borderLeftColor: Colors.amber },
  sectionBannerIcon: { width: hs(42), height: hs(42), borderRadius: hs(12), alignItems: "center", justifyContent: "center" },
  sectionBannerTitle: { color: Colors.kyc_text },
  sectionBannerSub: { color: Colors.kyc_textSub, marginTop: 2 },
  fieldWrap: { marginBottom: vs(12) },
  fieldLabel: { color: Colors.kyc_textSub, fontFamily: Fonts.Bold, letterSpacing: 0.7, marginBottom: vs(5), textTransform: "uppercase" },
  inputRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#FAFAFA", borderWidth: 1.2, borderColor: Colors.kyc_border, borderRadius: hs(10), paddingHorizontal: hs(12) },
  input: { flex: 1, paddingVertical: vs(10), color: Colors.kyc_text, fontFamily: Fonts.Medium },
  fieldHint: { color: Colors.kyc_textMuted, marginTop: vs(3), fontFamily: Fonts.Regular },
  errRow: { flexDirection: "row", alignItems: "center", marginTop: vs(3) },
  errText: { fontFamily: Fonts.Medium },
  inputRowLocked: { backgroundColor: "#FAFAFA", borderColor: Colors.kyc_border },
  inputLocked: { color: Colors.kyc_text },
  lockedBadge: { flexDirection: "row", alignItems: "center", gap: 3, backgroundColor: Colors.kyc_accent + "18", borderRadius: hs(6), paddingHorizontal: hs(6), paddingVertical: vs(3), marginRight: hs(2) },
  lockedBadgeTxt: { color: Colors.kyc_accent, fontFamily: Fonts.Bold, letterSpacing: 0.2 },
  lockedHintRow: { flexDirection: "row", alignItems: "center", gap: hs(4), marginTop: vs(3) },
  lockedHintTxt: { color: Colors.kyc_success, fontFamily: Fonts.Regular, flex: 1 },
  eyeBtn: { padding: hs(4) },
  accMatchStrip: { flexDirection: "row", alignItems: "center", gap: hs(6), marginTop: vs(5), paddingHorizontal: hs(10), paddingVertical: vs(6), borderRadius: hs(8), borderWidth: 1 },
  accMatchTxt: { fontSize: rs(10), fontFamily: Fonts.Bold, flex: 1, letterSpacing: 0.2, includeFontPadding: false, lineHeight: rs(14) },
  genderRow: { flexDirection: "row", gap: hs(5) },
  genderBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: vs(9), borderRadius: hs(8), backgroundColor: "#FAFAFA", borderWidth: 1.2, borderColor: Colors.kyc_border, gap: hs(4) },
  genderBtnText: { color: Colors.kyc_textMuted },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: vs(14), gap: hs(8) },
  dividerLine: { flex: 1, height: 1.2, backgroundColor: "rgba(201, 168, 76, 0.15)" },
  dividerLabel: { color: Colors.kyc_textMuted, letterSpacing: 1 },
  sizeHintBanner: { flexDirection: "row", alignItems: "flex-start", gap: hs(7), backgroundColor: "rgba(201, 168, 76, 0.10)", borderRadius: hs(8), borderLeftWidth: 3, borderLeftColor: Colors.amber, paddingHorizontal: hs(10), paddingVertical: vs(7), marginBottom: vs(10) },
  sizeHintText: { flex: 1, color: Colors.kyc_textSub, fontFamily: Fonts.Regular, lineHeight: rs(16) },
  docGrid: {},
  docSlotWrap: { marginBottom: vs(10) },
  docBox: { height: vs(90), borderRadius: hs(14), borderWidth: 1.5, borderStyle: "dashed", borderColor: Colors.kyc_border, backgroundColor: "#FAFAFA" },
  docThumb: { width: "100%", height: "100%", borderRadius: hs(12) },
  docOverlay: { position: "absolute", bottom: 0, left: 0, right: 0, flexDirection: "row", alignItems: "center", paddingHorizontal: hs(10), paddingVertical: vs(6), gap: hs(6) },
  docDoneLabel: { color: Colors.white, fontFamily: Fonts.Bold, letterSpacing: 0.4 },
  docFileName: { flex: 1, color: Colors.white, fontFamily: Fonts.Regular, fontSize: rs(9) },
  docCornerBtn: { position: "absolute", top: vs(6), width: hs(22), height: hs(22), borderRadius: hs(11), alignItems: "center", justifyContent: "center" },
  docEmptyContent: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: hs(14), gap: hs(12) },
  docIconCircle: { width: hs(42), height: hs(42), borderRadius: hs(12), alignItems: "center", justifyContent: "center" },
  docSlotLabel: { color: Colors.kyc_text },
  docSlotSub: { color: Colors.kyc_textMuted, marginTop: 2, fontFamily: Fonts.Regular },
  docSizeLabel: { color: Colors.kyc_textMuted, marginTop: vs(2), fontFamily: Fonts.Regular },
  docUploadTag: { flexDirection: "row", alignItems: "center", paddingHorizontal: hs(8), paddingVertical: vs(4), borderRadius: hs(10), borderWidth: 1, gap: hs(4) },
  docUploadTagText: {},
  securityBanner: { flexDirection: "row", alignItems: "flex-start", borderRadius: hs(12), padding: hs(12), marginTop: vs(12), gap: hs(10) },
  securityIcon: { width: hs(36), height: hs(36), borderRadius: hs(10), alignItems: "center", justifyContent: "center" },
  securityTitle: { marginBottom: vs(2) },
  securityBody: { color: Colors.kyc_textSub, lineHeight: rs(16) },
  reviewBanner: { flexDirection: "row", alignItems: "flex-start", backgroundColor: Colors.info_light, borderRadius: hs(10), borderLeftWidth: 3, borderLeftColor: Colors.info_dark, padding: hs(10), marginTop: vs(10), gap: hs(8) },
  reviewText: { flex: 1, color: Colors.info_dark, lineHeight: rs(16) },
  actionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: vs(4), marginBottom: vs(8), gap: hs(12) },
  prevBtn: { flexDirection: "row", alignItems: "center", paddingVertical: vs(12), paddingHorizontal: hs(18), borderRadius: hs(12), borderWidth: 1.2, borderColor: Colors.kyc_border, backgroundColor: Colors.white, gap: hs(6), elevation: 1 },
  prevBtnText: { color: Colors.kyc_text },
  nextBtnOuter: { borderRadius: hs(14), overflow: "hidden", elevation: 5, shadowColor: Colors.kyc_accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 },
  nextBtnGrad: { flexDirection: "row", alignItems: "center", paddingVertical: vs(14), paddingHorizontal: hs(26) },
  nextBtnText: {},
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", paddingHorizontal: hs(24) },
  modalCard: { backgroundColor: Colors.white, width: "100%", borderRadius: hs(24), padding: hs(24), alignItems: "center", elevation: 10, shadowColor: Colors.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  modalIconWrap: { width: rs(72), height: rs(72), borderRadius: rs(36), backgroundColor: Colors.kyc_success + "15", justifyContent: "center", alignItems: "center", marginBottom: vs(16) },
  modalTitle: { color: Colors.kyc_text, fontSize: rs(18), fontFamily: Fonts.Bold, textAlign: "center", marginBottom: vs(8) },
  modalSub: { color: Colors.kyc_textSub, fontSize: rs(12), fontFamily: Fonts.Regular, textAlign: "center", lineHeight: rs(18), marginBottom: vs(24) },
  modalBtn: { width: "100%", borderRadius: hs(12), overflow: "hidden" },
  modalBtnGrad: { paddingVertical: vs(14), alignItems: "center", justifyContent: "center" },
  modalBtnText: { color: Colors.white, fontFamily: Fonts.Bold, fontSize: rs(14) },
  modalListItem: { paddingVertical: vs(14), borderBottomWidth: 1, borderBottomColor: Colors.kyc_border },
});
