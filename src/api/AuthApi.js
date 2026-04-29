import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as NavigationService from "../utils/NavigationService";
import { AlertService } from "../componets/Alerts/CustomAlert";

export const BASE_URL = "http://192.168.1.16:8000";

// ─── Auto Logout Helper ───────────────────────────────────────────────────────
const performAutoLogout = async (reason = "Session expired. Please login again.") => {
  try {
    console.log("[AUTH] performAutoLogout triggered. Reason:", reason);

    // 1. Clear sensitive storage
    await AsyncStorage.multiRemove([
      "header_token", "header_key", "kyc_status",
      "is_payment_done", "id_payment_status", "token"
    ]);

    // 2. Show alert and reset navigation when closed
    AlertService.showAlert({
      type: "error",
      title: "Session Expired",
      message: reason,
      onClose: () => {
        NavigationService.reset("Login");
      }
    });

  } catch (err) {
    console.log("[AUTH] Logout error:", err);
    NavigationService.reset("Login");
  }
};

// ─── Axios Global Interceptor ─────────────────────────────────────────────────
axios.interceptors.response.use(
  (response) => {
    // Some APIs return 200 but with success: false and a specific message
    const data = response.data;
    const isError = data?.success === false || data?.status === "ERROR" || data?.status === "FAILED";
    const msg = data?.message?.toLowerCase() || "";

    if (data && isError && (
      msg.includes("token expired") ||
      msg.includes("invalid token") ||
      msg.includes("session expired") ||
      msg.includes("unauthorized")
    )) {
      performAutoLogout(data.message || "Session expired");
    }
    return response;
  },

  (error) => {
    if (error.response) {
      const { status, data } = error.response;

      // Standard 401 Unauthorized
      if (status === 401) {
        performAutoLogout(data?.message || "Session expired. Please login again.");
      }
    }
    return Promise.reject(error);
  }
);



const safeTransform = (raw) => {
  if (typeof raw !== "string") return raw;
  if (raw.trimStart().startsWith("<")) {
    console.log("[API] HTML response received — check endpoint / server logs.");
    console.log("[API] Preview:", raw.slice(0, 300));
    return { success: false, message: "Server error. Please try again later." };
  }
  try {
    return JSON.parse(raw);
  } catch (_) {
    console.log("[API] JSON parse failed:", raw.slice(0, 200));
    return { success: false, message: "Unexpected server response." };
  }
};

/**
 * handleFetchResponse
 * Standard wrapper for manual fetch calls to handle session expiry (401)
 * since axios interceptors don't catch native fetch calls.
 */
const handleFetchResponse = async (response) => {
  if (response.status === 401) {
    const data = await response.json().catch(() => ({}));
    performAutoLogout(data?.message || "Session expired. Please login again.");
    return { success: false, message: "Unauthorized" };
  }
  return response;
};

/**
 * getAuthHeaders — reads BOTH header_token and header_key from AsyncStorage.
 * Matches the same two keys used by every other authenticated endpoint
 * (fetchUserWallet, fetchUserProfile, logoutUser, etc.)
 *
 * Returns { headerToken, headerKey } or null if either is missing.
 */
export const getAuthHeaders = async () => {
  try {
    const [headerToken, headerKey] = await AsyncStorage.multiGet([
      "header_token",
      "header_key",
    ]).then((pairs) => pairs.map(([, v]) => v));

    if (!headerToken) {
      console.log(
        "[AUTH] Missing credentials → headerToken: ✗"
      );
      return null;
    }
    return { headerToken, headerKey };
  } catch (err) {
    console.log("[AUTH] AsyncStorage read error:", err);
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// ─────────────────────────────────────────────────────────────────────────────

export const loginUser = async ({ email, password, userName, systemDetails }) => {
  try {
    const payload = { email, password, userName, systemDetails };
    const response = await axios.post(`${BASE_URL}/user-login`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.log("Login API Error:", error?.response?.data || error);
    if (error?.response?.data) return error.response.data;
    return { success: false, message: "Network error. Please try again" };
  }
};

export const verifyOtp = async ({ log_key, otp }) => {
  try {
    const response = await axios.post(`${BASE_URL}/login-verify`, null, {
      params: { log_key: String(log_key).trim(), otp: String(otp).trim() },
    });
    return response.data;
  } catch (error) {
    console.log("OTP Verify Error:", error?.response?.data || error);
    return (
      error?.response?.data || {
        status: "ERROR",
        message: "Network Error. Please try again",
      }
    );
  }
};

export const verifyUserOtp = async ({ email, otp }) => {
  try {
    const payload = { email, otp };
    const response = await axios.post(`${BASE_URL}/verify-user-otp`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.log("Verify User OTP Error:", error?.response?.data || error);
    if (error?.response?.data) return error.response.data;
    return { success: false, message: "Network Error. Please try again" };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────────────────────────────────────

export const fetchUserWallet = async ({ headerToken, headerKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user_wallet`, null, {
      headers: { headerToken, headerKey },
    });
    return response.data;
  } catch (error) {
    console.log("Wallet API Error:", error?.response?.data || error);
    return (
      error?.response?.data || {
        status: "ERROR",
        message: "Network Error. Please try again",
      }
    );
  }
};

export const fetchUserProfile = async ({ headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/fetch-user-profile`, {
      headers: { "Authorization": `Bearer ${headerToken}` },
    });
    return response.data;
  } catch (error) {
    console.log("Profile API Error:", error?.response?.data || error);
    if (error?.response?.data) return error.response.data;
    return (
      error?.response?.data || {
        status: "ERROR",
        message: "Unable to fetch profile",
      }
    );
  }
};

export const logoutUser = async ({ headerToken, headerKey }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user-logout`, {
      headers: { headerToken, headerKey },
    });
    return response.data;
  } catch (error) {
    console.log("Logout API Error:", error?.response?.data || error);
    return (
      error?.response?.data || { status: "ERROR", message: "Logout failed" }
    );
  }
};

export const changeUserPassword = async ({ currentPassword, newPassword, headerToken, headerKey }) => {
  try {
    const payload = {
      currentPassword: String(currentPassword).trim(),
      newPassword: String(newPassword).trim()
    };
    const response = await axios.patch(`${BASE_URL}/change-user-password`, payload, {
      headers: {
        headerToken,
        headerKey,
        Authorization: `Bearer ${headerToken}`,
        "Content-Type": "application/json"
      },
    });
    return response.data;
  } catch (error) {
    console.log("Change Password API Error:", error?.response?.data || error);
    if (error?.response?.data) return error.response.data;
    return { success: false, message: "Network error. Please check your connection." };
  }
};

export const forgotPassword = async ({ email }) => {
  try {
    const payload = { email: String(email).trim() };
    const response = await axios.patch(`${BASE_URL}/forgot-password`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.log("Forgot Password API Error:", error?.response?.data || error);
    if (error?.response?.data) return error.response.data;
    return { success: false, message: "Network error. Unable to send OTP." };
  }
};

export const resetPassword = async ({ email, otp, newPassword }) => {
  try {
    const payload = {
      email: String(email).trim(),
      otp: String(otp).trim(),
      newPassword: String(newPassword).trim()
    };
    const response = await axios.patch(`${BASE_URL}/reset-password`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return response.data;
  } catch (error) {
    console.log("Reset Password API Error:", error?.response?.data || error);
    if (error?.response?.data) return error.response.data;
    return { success: false, message: "Network error. Unable to reset password." };
  }
};

export const getRoleList = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/user/role/get-role-list`);
    return response.data;
  } catch (error) {
    console.log("Get Role List API Error:", error?.response?.data || error);
    return (
      error?.response?.data || {
        success: false,
        message: "Unable to fetch roles",
      }
    );
  }
};

export const registerUser = async (userData) => {
  try {
    const response = await axios.post(`${BASE_URL}/user-register`, userData);
    return response.data;
  } catch (error) {
    console.log("Register API Error:", error?.response?.data || error);
    return (
      error?.response?.data || {
        success: false,
        message: "Registration failed. Please try again.",
      }
    );
  }
};

export const createNewUser = async (userData, headerToken) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/user/create-user`, userData, {
      headers: { Authorization: `Bearer ${headerToken}` },
    });
    return response.data;
  } catch (error) {
    console.log("Create User API Error:", error?.response?.data || error);
    return (
      error?.response?.data || {
        success: false,
        message: "User creation failed. Please try again.",
      }
    );
  }
};

export const getDownlineUsers = async ({ headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/user/get-downline-users`, {
      headers: { Authorization: `Bearer ${headerToken}` },
    });
    return response.data;
  } catch (error) {
    console.log("Get Downline Users API Error:", error?.response?.data || error);
    return (
      error?.response?.data || {
        success: false,
        message: "Unable to fetch downline users",
      }
    );
  }
};

export const getUserWalletRefillProfile = async (userId, { headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/userWalletRefill/user-profile`, {
      params: { userId },
      headers: { Authorization: `Bearer ${headerToken}` },
    });
    return response.data;
  } catch (error) {
    console.log("Get User Wallet Refill Profile Error:", error?.response?.data || error);
    return (
      error?.response?.data || {
        success: false,
        message: "Unable to fetch profile for wallet refill",
      }
    );
  }
};

export const refillUserWallet = async ({ userId, amount, idempotencyKey, headerToken }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/userWalletRefill/refill-user-wallet`, {
      userId,
      amount
    }, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        'idempotency-key': idempotencyKey,
        'Content-Type': 'application/json'
      },
    });
    return response.data;
  } catch (error) {
    console.log("Refill User Wallet API Error:", error?.response?.data || error);
    return (
      error?.response?.data || {
        success: false,
        message: "Wallet refill failed. Please try again.",
      }
    );
  }
};

export const getUserWalletRefillHistory = async ({ headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/userWalletRefill/wallet-refill-history`, {
      headers: { Authorization: `Bearer ${headerToken}` },
    });
    return response.data;
  } catch (error) {
    console.log("Get Wallet Refill History API Error:", error?.response?.data || error);
    return (
      error?.response?.data || {
        success: false,
        message: "Unable to fetch refill history",
      }
    );
  }
};




export const getAllBanners = async ({ headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/banner/all-banners`, {
      headers: { Authorization: `Bearer ${headerToken}` },
    });
    return response.data;
  } catch (error) {
    console.log("Get All Banners API Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch banners" };
  }
};

export const getAllNotifications = async ({ headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/notification/all-notifications`, {
      headers: { Authorization: `Bearer ${headerToken}` },
    });
    return response.data;
  } catch (error) {
    console.log("Get All Notifications API Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch notifications" };
  }
};

export const getWalletStats = async ({ headerToken }) => {
  try {
    const url = `${BASE_URL}/user/walletLedger/wallet-stats`;

    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${headerToken}` },
    });
    return response.data;
  } catch (error) {
    console.log("Get Wallet Stats API Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch wallet stats" };
  }
};

export const getProductList = async ({ headerToken, page = 1, limit = 10 }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/shopping/product-list?page=${page}&limit=${limit}`, {
      headers: { Authorization: `Bearer ${headerToken}` },
    });
    return response.data;
  } catch (error) {
    console.log("Get Product List API Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch products" };
  }
};

export const getProductDetails = async ({ headerToken, productId }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/shopping/product/${productId}`, {
      headers: { Authorization: `Bearer ${headerToken}` },
    });
    return response.data;
  } catch (error) {
    console.log("Get Product Details API Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch product details" };
  }
};


// ─────────────────────────────────────────────────────────────────────────────
// SERVICES
// ─────────────────────────────────────────────────────────────────────────────

export const fetchServices = async ({ headerToken, headerKey }) => {
  try {
    const response = await axios.get(`${BASE_URL}/get-services`, {
      headers: { headerToken, headerKey },
    });
    return response.data;
  } catch (error) {
    console.log("Get Services API Error:", error?.response?.data || error);
    return (
      error?.response?.data || {
        status: "ERROR",
        message: "Unable to fetch services",
      }
    );
  }
};

export const getOperatorCircle = async (mobile) => {
  try {
    const response = await axios.get(`${BASE_URL}/get-operator-circles`, {
      params: { mobile },
    });
    return response.data;
  } catch (error) {
    console.log("Operator API error:", error?.response?.data || error);
    return { status: "ERROR", message: "Failed to fetch operator details" };
  }
};

export const getRechargeOperatorList = async ({ headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/recharge/operator-list`, {
      headers: { Authorization: `Bearer ${headerToken}` },
    });
    return response.data;
  } catch (error) {
    console.log("Get Recharge Operator List Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch operators" };
  }
};

export const getRechargeCircleList = async ({ headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/recharge/circle-list`, {
      headers: { Authorization: `Bearer ${headerToken}` },
    });
    return response.data;
  } catch (error) {
    console.log("Get Recharge Circle List Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch circles" };
  }
};

export const verifyRechargeMobile = async ({ mobile, headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/recharge/mobile-verify/${mobile}`, {
      headers: { Authorization: `Bearer ${headerToken}` },
    });
    return response.data;
  } catch (error) {
    console.log("Verify Recharge Mobile Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to verify mobile" };
  }
};

export const processRecharge = async ({ amount, operatorCode, number, billerMode, headerToken }) => {
  const generateIdempotencyKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'IDES';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const idempotencyKey = generateIdempotencyKey();
  console.log("🚀 SENDING RECHARGE PAYLOAD:", { amount, operatorCode, number, billerMode });

  try {
    const response = await axios.post(`${BASE_URL}/user/recharge/mobile-prepaid-recharge`, {
      amount,
      operatorCode,
      number,
      billerMode
    }, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey
      },
    });
    return response.data;
  } catch (error) {
    console.log("Process Recharge Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Recharge failed" };
  }
};

export const fetchOperatorByMobile = async (mobile) => {
  try {
    const auth = await getAuthHeaders();
    if (!auth) return { status: "ERROR", message: "Session expired" };

    const response = await axios.post(`${BASE_URL}/fetch-operator`, null, {
      headers: auth,
      params: { mobile },
    });
    return response.data;
  } catch (error) {
    console.log("Fetch operator API error:", error?.response?.data || error);
    return (
      error?.response?.data || {
        status: "ERROR",
        message: "Unable to fetch operator",
      }
    );
  }
};

export const fetchPlans = async (mobile, circle, operator) => {
  try {
    const auth = await getAuthHeaders();
    if (!auth) return { status: "ERROR", message: "Session expired" };

    const response = await axios.post(`${BASE_URL}/fetch-plans`, null, {
      headers: auth,
      params: { mobile, circle, operator },
    });
    return response.data;
  } catch (error) {
    console.log("Fetch plans API error:", error?.response?.data || error);
    return (
      error?.response?.data || {
        status: "ERROR",
        message: "Unable to fetch plans",
      }
    );
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// KYC — OFFLINE SUBMISSION
// ─────────────────────────────────────────────────────────────────────────────
//
//  Endpoint  :  POST  /user/kyc/offline-kyc-submission
//  Auth      :  headerToken + headerKey  (same pair stored at login,
//               same pair used by every other authenticated endpoint)
//
//  Body type :  multipart/form-data  (DO NOT set Content-Type manually)
//
//  req.body field names:
//   Personal  → firstName, lastName, fatherName, gender, email, phone, dob
//               personalAddress, personalCity, personalState, personalPincode
//   Business  → shopName, businessAddress, businessCity, businessState,
//               businessPincode, panNumber, aadharNumber,
//               businessPanNumber (optional), gstNumber (optional)
//   Banking   → accountHolderName, bankName, accountNumber, branchName, ifscCode
//               ⚠ confirmAccountNumber CLIENT-SIDE ONLY — never sent
//
//  req.files  :  aadharFile · panFile · shopImage
//
//  AsyncStorage written on success:
//    kyc_status = "pending" | is_kyc_online = "false" | kyc_submitted_at = ISO
// ─────────────────────────────────────────────────────────────────────────────

export const submitOfflineKyc = async ({ personal, business, files, banking }) => {

  // ── STEP 1: Read login credentials ─
  const tokenStr = await AsyncStorage.getItem("token");
  let finalToken = await AsyncStorage.getItem("header_token");
  let userId = "";
  let headerKey = await AsyncStorage.getItem("header_key");

  if (tokenStr) {
    try {
      const parsed = JSON.parse(tokenStr);
      if (parsed.token) finalToken = parsed.token;
      if (parsed.user && parsed.user._id) userId = parsed.user._id;
    } catch (e) { }
  }

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[KYC] Starting submitOfflineKyc");
  console.log(
    "[KYC] finalToken:",
    finalToken ? `${finalToken.slice(0, 20)}...` : "MISSING ❌"
  );
  console.log("[KYC] Endpoint:", `${BASE_URL}/user/kyc/offline-kyc-submission`);

  if (!finalToken) {
    return { success: false, message: "Session expired. Please login again." };
  }

  // ── STEP 2: Build FormData ─────────────────────────────────────────────────
  const safeTrim = (str) => (str || "").toString().trim();

  const form = new FormData();

  // Personal fields
  if (userId) form.append("userId", userId);
  form.append("firstName", safeTrim(personal.firstName));
  form.append("lastName", safeTrim(personal.lastName));
  form.append("fatherName", safeTrim(personal.fatherName));
  form.append("gender", safeTrim(personal.gender));
  form.append("email", safeTrim(personal.email));
  form.append("phone", safeTrim(personal.phone));
  // Format dob to YYYY-MM-DD before sending
  let formattedDob = safeTrim(personal.dob);
  if (/^\d{2}-\d{2}-\d{4}$/.test(formattedDob)) {
    const [dd, mm, yyyy] = formattedDob.split("-");
    formattedDob = `${yyyy}-${mm}-${dd}`;
  }
  form.append("dob", formattedDob);
  form.append("personalAddress", safeTrim(personal.personalAddress));
  form.append("personalCity", safeTrim(personal.personalCity));
  form.append("personalState", safeTrim(personal.personalState));
  form.append("personalPincode", safeTrim(personal.personalPincode));

  // Business fields
  form.append("shopName", safeTrim(business.shopName));
  form.append("businessAddress", safeTrim(business.businessAddress));
  form.append("businessCity", safeTrim(business.businessCity));
  form.append("businessState", safeTrim(business.businessState));
  form.append("businessPincode", safeTrim(business.businessPincode));
  form.append("panNumber", safeTrim(business.panNumber));
  form.append("aadharNumber", safeTrim(business.aadharNumber));

  if (safeTrim(business.businessPanNumber))
    form.append("businessPanNumber", safeTrim(business.businessPanNumber));
  if (safeTrim(business.gstNumber))
    form.append("gstNumber", safeTrim(business.gstNumber));

  // Banking fields — confirmAccountNumber is CLIENT-SIDE ONLY, never sent
  form.append("accountHolderName", safeTrim(banking.accountHolderName));
  form.append("bankName", safeTrim(banking.bankName));
  form.append("accountNumber", safeTrim(banking.accountNumber));
  form.append("branchName", safeTrim(banking.branchName));
  form.append("ifscCode", safeTrim(banking.ifscCode));

  // File attachments
  const appendFile = (key, file, fallbackName) => {
    if (file) {
      form.append(key, {
        uri: file.uri,
        name: file.name || fallbackName,
        type: file.type || "image/jpeg",
      });
      console.log(`[KYC] ${key}:`, file.name, file.type);
    } else {
      console.log(`[KYC] ⚠ ${key} is null`);
    }
  };
  appendFile("aadharFile", files.aadharFile, "aadharFile.jpg");
  appendFile("panFile", files.panFile, "panFile.jpg");
  appendFile("shopImage", files.shopImage, "shopImage.jpg");
  appendFile("blankCheque", files.blankCheque, "blankCheque.jpg");

  console.log("[KYC] Form fields successfully attached.");

  // ── STEP 3: POST ───────────────────────────────────────────────────────────
  // fetch() used instead of axios so we can log raw response text before parsing.
  try {
    console.log("[KYC] Sending request...");

    const fetchResponse = await fetch(
      `${BASE_URL}/user/kyc/offline-kyc-submission`,
      {
        method: "POST",
        headers: {
          headerToken: finalToken,
          headerKey: headerKey || "",
          Authorization: `Bearer ${finalToken}`,
          // DO NOT set Content-Type — fetch sets multipart/form-data + boundary automatically
        },
        body: form,
      }
    );
    if (fetchResponse.status === 401) {
      performAutoLogout("Session expired during KYC submission.");
      return { success: false, message: "Session expired. Please login again." };
    }

    const rawText = await fetchResponse.text();

    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[KYC] HTTP status    :", fetchResponse.status);
    console.log("[KYC] HTTP statusText:", fetchResponse.statusText);
    console.log("[KYC] Raw response   :", rawText.slice(0, 600));
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Parse response
    let data;
    if (rawText.trimStart().startsWith("<")) {
      console.log("[KYC] ❌ Server returned HTML (not JSON) — check backend logs");
      data = {
        success: false,
        message: `Server error (${fetchResponse.status}). Check backend logs.`,
      };
    } else {
      try {
        data = JSON.parse(rawText);
        console.log("[KYC] Parsed JSON →", JSON.stringify(data));
      } catch (_) {
        console.log("[KYC] ❌ Could not parse response as JSON");
        data = { success: false, message: "Unexpected server response. Please try again." };
      }
    }

    // ── STEP 4: Evaluate success ───────────────────────────────────────────
    console.log("[KYC] data.success   :", data?.success);
    console.log("[KYC] data.status    :", data?.status);
    console.log("[KYC] data.statusCode:", data?.statusCode);
    console.log("[KYC] data.message   :", data?.message);

    const isSuccess =
      fetchResponse.status === 200 ||
      fetchResponse.status === 201 ||
      data?.success === true ||
      data?.success === "true" ||
      data?.status === "success" ||
      data?.status === 1 ||
      data?.statusCode === 200 ||
      data?.statusCode === 201;

    console.log("[KYC] isSuccess:", isSuccess);

    if (isSuccess) {
      try {
        await AsyncStorage.multiSet([
          ["kyc_status", "pending"],
          ["is_kyc_online", "false"],
          ["kyc_submitted_at", new Date().toISOString()],
        ]);
        console.log("[KYC] ✓ AsyncStorage updated — kyc_status = pending");
      } catch (storageErr) {
        console.log("[KYC] AsyncStorage write error (non-fatal):", storageErr);
      }

      return { success: true, message: data?.message || "KYC submitted successfully." };
    }

    return {
      success: false,
      message: data?.message || `Server returned status ${fetchResponse.status}. Please try again.`,
      errors: data?.errors || null,
    };

  } catch (err) {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[KYC] ❌ Network/fetch error");
    console.log("[KYC] error.name   :", err?.name);
    console.log("[KYC] error.message:", err?.message);
    console.log("[KYC] error.code   :", err?.code);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    let message = "Submission failed. Please try again.";
    if (err?.message?.includes("Network request failed"))
      message = "Network error. Check WiFi — phone and server must be on the same network.";
    else if (err?.message?.includes("ECONNREFUSED"))
      message = `Cannot reach server at ${BASE_URL}.\nCheck the server is running.`;
    else if (err?.message?.includes("timeout"))
      message = "Request timed out. Check your WiFi.";
    else if (err?.message)
      message = err.message;

    return { success: false, message };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// KYC — STATUS + LOCAL CACHE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * fetchKycStatus
 * Fetches latest KYC status from server and syncs to AsyncStorage.
 */
export const fetchKycStatus = async () => {
  try {
    const auth = await getAuthHeaders();
    if (!auth) {
      return { success: false, message: "Session expired. Please login again." };
    }

    const response = await axios.get(`${BASE_URL}/user/kyc/status`, {
      headers: auth,
      transformResponse: [safeTransform],
    });
    const data = response.data;

    const kycStatus = data?.kycStatus || data?.kyc_status || data?.status;
    if (kycStatus && typeof kycStatus === "string") {
      try {
        await AsyncStorage.setItem("kyc_status", kycStatus.toLowerCase());
      } catch (_) { }
    }
    return data;
  } catch (error) {
    console.log("[KYC] fetchKycStatus error:", error?.response?.data || error);
    return (
      error?.response?.data || {
        status: "ERROR",
        message: "Unable to fetch KYC status.",
      }
    );
  }
};

/**
 * fetchSubmittedKyc
 * GET /user/kyc/submitted-kyc
 * Fetches previous KYC submission data for re-KYC pre-filling.
 */
export const fetchSubmittedKyc = async ({ headerToken }) => {
  try {
    const url = `${BASE_URL}/user/kyc/submitted-kyc`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${headerToken}`, "Content-Type": "application/json" }
    });
    return response.data;
  } catch (error) {
    console.log("Fetch Submitted KYC Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch previous KYC submission" };
  }
};

/**
 * getLocalKycStatus
 * Reads cached KYC status from AsyncStorage instantly — no network call.
 * @returns "pending" | "approved" | "rejected" | "not_submitted"
 */
export const getLocalKycStatus = async () => {
  try {
    const status = await AsyncStorage.getItem("kyc_status");
    return status || "not_submitted";
  } catch (_) {
    return "not_submitted";
  }
};

/**
 * clearKycStorage — call on logout.
 */
export const clearKycStorage = async () => {
  try {
    await AsyncStorage.multiRemove([
      "kyc_status",
      "is_kyc_online",
      "kyc_submitted_at",
    ]);
  } catch (error) {
    console.log("[KYC] clearKycStorage error:", error);
  }
};
// ─────────────────────────────────────────────────────────────────────────────
// TOPUP BANKS
// ─────────────────────────────────────────────────────────────────────────────
export const getAllTopupBanks = async ({ headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/topupBank/get-all-topup-banks`, {
      headers: { Authorization: `Bearer ${headerToken}` },
    });
    return response.data;
  } catch (error) {
    console.log("Get Topup Banks error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch banks" };
  }
};

export const addOfflineTopupRequest = async ({ amount, mode, receiverBank, utrNumber, paymentDate, paymentProof, headerToken }) => {
  const generateIdempotencyKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'IDES';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const idempotencyKey = generateIdempotencyKey();

  try {
    let formData = new FormData();
    formData.append("amount", amount);
    formData.append("mode", mode);
    formData.append("receiverBank", receiverBank);
    formData.append("utrNumber", utrNumber);
    formData.append("paymentDate", paymentDate);

    if (paymentProof) {
      const filename = paymentProof.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;
      formData.append("paymentProof", {
        uri: paymentProof,
        name: filename,
        type: type,
      });
    }

    const response = await axios.post(`${BASE_URL}/user/offlineTopup/add-offline-topup-request`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        "Authorization": `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey
      },
    });
    return response.data;
  } catch (error) {
    console.log("Add Offline Topup Request Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Request submission failed" };
  }
};

export const getAllOfflineTopupRequests = async ({ headerToken, page = 1, limit = 10, from, to }) => {
  try {
    let url = `${BASE_URL}/user/offlineTopup/get-all-offline-topup-requests?page=${page}&limit=${limit}`;
    if (from) url += `&from=${from}`;
    if (to) url += `&to=${to}`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${headerToken}` }
    });
    return response.data;
  } catch (error) {
    console.log("Get All Offline Topup Requests Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch topup requests" };
  }
};

export const getWalletBalance = async ({ headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/wallet/get-wallet-balance`, {
      headers: { Authorization: `Bearer ${headerToken}` },
    });
    return response.data;
  } catch (error) {
    console.log("Get Wallet Balance Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch balance" };
  }
};

export const fetchBbpsCategories = async ({ headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/bbps/fetch-bbps-categories`, {
      headers: { Authorization: `Bearer ${headerToken}` },
    });
    return response.data;
  } catch (error) {
    console.log("Fetch BBPS Categories Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch categories" };
  }
};

/**
 * fetchParticularCategoryBillers
 * Fetches the list of billers for a specific BBPS category (e.g. "Electricity", "Credit Card").
 *
 * Expected API response structure:
 * {
 *   "success": true,
 *   "data": [
 *     { "billerId": "...", "billerName": "...", "billerCategory": "..." },
 *     ...
 *   ]
 * }
 */
export const fetchParticularCategoryBillers = async ({ category, headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/bbps/fetch-particular-category-billers`, {
      params: { category },
      headers: { Authorization: `Bearer ${headerToken}` },
    });
    return response.data;
  } catch (error) {
    console.log("Fetch Particular Category Billers Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch billers" };
  }
};

export const fetchBillerInfo = async ({ billerId, headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/bbps/fetch-biller-info`, {
      params: { billerId },
      headers: { Authorization: `Bearer ${headerToken}` },
    });
    return response.data;
  } catch (error) {
    console.log("Fetch Biller Info Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch biller info" };
  }
};

/**
 * Fetch wallet ledger / report
 * GET /user/wallet/wallet-report?from=YYYY-MM-DD&to=YYYY-MM-DD
 *
 * @param {object} params
 * @param {string} params.from       - "YYYY-MM-DD"
 * @param {string} params.to         - "YYYY-MM-DD"
 * @param {string} params.headerToken - JWT token from AsyncStorage
 *
 * @returns {Promise<{ success: boolean, message: string, data: Array }>}
 */
export const getWalletReport = async ({ from, to, headerToken }) => {
  try {
    const url = `${BASE_URL}/user/walletLedger/wallet-report?from=${from}&to=${to}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${headerToken}`,
      },
    });
    const text = await response.text();
    if (text.trim().startsWith("<")) {
      return { success: false, message: "Server error. Please try again.", data: [] };
    }

    try {
      return JSON.parse(text);
    } catch (e) {
      console.log("getWalletReport parse error:", e, "Raw text:", text);
      return { success: false, message: "Invalid server response", data: [] };
    }
  } catch (error) {
    console.log("getWalletReport error:", error);
    return { success: false, message: error.message || "Network error", data: [] };
  }
};

/**
 * getRechargeReport
 * @param {{ from: string, to: string, headerToken: string }} params
 * @returns {Promise<{ success: boolean, message: string, data: Array }>}
 */
export const getRechargeReport = async ({ from, to, headerToken }) => {
  try {
    const url = `${BASE_URL}/user/rechargeReport/complete-recharge-report?from=${from}&to=${to}`;
    console.log("[getRechargeReport] →", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${headerToken}`,
      },
    });

    const text = await response.text();

    // Guard against HTML error pages
    if (text.trimStart().startsWith("<")) {
      console.log("[getRechargeReport] HTML response — server error");
      return { success: false, message: "Server error. Please try again.", data: [] };
    }

    const json = JSON.parse(text);
    return json; // { success, message, data: [...] }
  } catch (error) {
    console.log("[getRechargeReport] error:", error?.message || error);
    return { success: false, message: error.message || "Network error", data: [] };
  }
};

export const getAepsPayoutReport = async ({ from, to, headerToken, page = 1, limit = 10 }) => {
  try {
    const url = `${BASE_URL}/user/aepsPayoutReport/list-all?from=${from}&to=${to}&page=${page}&limit=${limit}`;
    console.log("[getAepsPayoutReport] →", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${headerToken}`,
      },
    });

    const text = await response.text();

    // Guard against HTML error pages
    if (text.trimStart().startsWith("<")) {
      console.log("[getAepsPayoutReport] HTML response — server error");
      return { success: false, message: "Server error. Please try again.", data: [] };
    }

    const json = JSON.parse(text);
    return json; // { success, message, data: [...], pagination: {...} }
  } catch (error) {
    console.log("[getAepsPayoutReport] error:", error?.message || error);
    return { success: false, message: error.message || "Network error", data: [] };
  }
};



/**
 * fetchStateList
 * Fetches all available states for KYC / Address.
 */
export const fetchStateList = async ({ headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/stateCity/all-state-list`, {
      headers: { Authorization: `Bearer ${headerToken}` }
    });
    return response.data;
  } catch (error) {
    console.log("Fetch State List Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch states" };
  }
};

/**
 * fetchCityList
 * Fetches cities for a given state code.
 */
export const fetchCityList = async ({ stateCode, headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/stateCity/state-wise-city-list/?code=${stateCode}`, {
      headers: { Authorization: `Bearer ${headerToken}` }
    });
    return response.data;
  } catch (error) {
    console.log("Fetch City List Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch cities" };
  }
};

/**
 * fetchGlobalBankList
 * Fetches the global list of banks.
 */
export const fetchGlobalBankList = async ({ headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/globalBank/global-banks-list`, {
      headers: { Authorization: `Bearer ${headerToken}` }
    });
    return response.data;
  } catch (error) {
    console.log("Fetch Global Banks Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch banks list" };
  }
};

/**
 * fetchBbpsBill
 * @param {{ billerId: string, customerParams: object, headerToken: string }} params
 */
export const fetchBbpsBill = async ({ billerId, customerParams, headerToken }) => {
  try {
    const url = `${BASE_URL}/user/bbps/fetch-bill`;

    const inputParams = Object.keys(customerParams || {}).map(key => ({
      paramName: key,
      paramValue: customerParams[key]
    }));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${headerToken}`,
      },
      body: JSON.stringify({ billerId, inputParams }),
    });
    const text = await response.text();
    if (text.trimStart().startsWith("<")) {
      return { success: false, message: "Server error. Please try again." };
    }
    const json = JSON.parse(text);
    const isSuccess = json?.success === true || json?.data?.status === 'SUCCESS';
    const message = json?.data?.message || json?.message || (isSuccess ? "Payment successful" : "Payment failed");
    return { ...json, success: isSuccess, message };
  } catch (error) {
    return { success: false, message: error.message || "Network error" };
  }
};

/**
 * validateBbpsBill
 * @param {{ billerId: string, customerParams: object, headerToken: string }} params
 */
export const validateBbpsBill = async ({ billerId, customerParams, headerToken }) => {
  try {
    const url = `${BASE_URL}/user/bbps/validate-bill`;

    const inputParams = Object.keys(customerParams || {}).map(key => ({
      paramName: key,
      paramValue: customerParams[key]
    }));

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${headerToken}`,
      },
      body: JSON.stringify({ billerId, inputParams }),
    });
    const text = await response.text();
    if (text.trimStart().startsWith("<")) {
      return { success: false, message: "Server error. Please try again." };
    }
    const json = JSON.parse(text);
    const isSuccess = json?.success === true || json?.data?.status === 'SUCCESS';
    const message = json?.data?.message || json?.message || (isSuccess ? "Payment successful" : "Payment failed");
    return { ...json, success: isSuccess, message };
  } catch (error) {
    return { success: false, message: error.message || "Network error" };
  }
};

/**
 * payBbpsBill
 * @param {object} params
 */
export const payBbpsBill = async (payload) => {
  const generateIdempotencyKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'IDES';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const idempotencyKey = generateIdempotencyKey();

  try {
    const url = `${BASE_URL}/user/bbps/bill-pay`;

    const { headerToken, ...bodyObj } = payload;

    let response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey
      },
      body: JSON.stringify(bodyObj),
    });
    response = await handleFetchResponse(response);
    if (response.status === 401) return { success: false, message: "Unauthorized" };

    const text = await response.text();
    if (text.trimStart().startsWith("<")) {
      return { success: false, message: "Server error. Please try again." };
    }
    const json = JSON.parse(text);
    const apiSuccess = json?.success === true || json?.data?.status === 'SUCCESS';
    const apiMessage = json?.data?.message || json?.message || (apiSuccess ? "Payment successful" : "Payment failed");

    // Return a unified structure that the UI can rely on
    return {
      ...json,
      success: apiSuccess,
      message: apiMessage
    };
  } catch (error) {
    return { success: false, message: error.message || "Network error" };
  }
};

/**
 * redeemCoupon
 * @param {{ couponCode: string, headerToken: string }} params
 */
export const redeemCoupon = async ({ couponCode, headerToken }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/coupon/redeem-coupon`, { couponCode }, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "Content-Type": "application/json"
      }
    });
    return response.data;
  } catch (error) {
    console.log("Redeem Coupon Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Coupon verification failed" };
  }
};

/**
 * transferAepsToMainWallet
 * Transfers amount from AEPS wallet to Main wallet (PATCH)
 */
export const transferAepsToMainWallet = async ({ amount, headerToken }) => {
  const generateIdempotencyKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'A2M_';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  try {
    const url = `${BASE_URL}/user/wallet/aeps-to-main`;
    const idempotencyKey = generateIdempotencyKey();

    let response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey
      },
      body: JSON.stringify({ amount: Number(amount) }),
    });
    response = await handleFetchResponse(response);
    if (response.status === 401) return { success: false, message: "Unauthorized" };

    const text = await response.text();
    if (text.trim().startsWith("<")) {
      return { success: false, message: "Server error. Please try again." };
    }

    return JSON.parse(text);
  } catch (error) {
    return { success: false, message: error.message || "Network error" };
  }
};

/**
 * getWalletHistory
 * Fetches the user's wallet transfer and ledger history
 */
export const getWalletHistory = async ({ headerToken, page = 1, limit = 10, search = '', from = '', to = '' }) => {
  try {
    const query = `page=${page}&limit=${limit}&search=${encodeURIComponent(search)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const url = `${BASE_URL}/user/walletLedger/wallet-history?${query}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${headerToken}`,
      },
    });

    const text = await response.text();
    if (text.trim().startsWith("<")) {
      return { success: false, message: "Server error. Please try again." };
    }

    return JSON.parse(text);
  } catch (error) {
    return { success: false, message: error.message || "Network error" };
  }
};

/**
 * getMyRechargeHistory
 * Fetches the last recharge history for the logged-in user.
 * GET /user/rechargeReport/my-recharge-history
 *
 * Response shape:
 * {
 *   success: boolean,
 *   message: string,
 *   data: Array<{
 *     _id, mobileNumber, operatorName, amount,
 *     commission, tds, netCommission,
 *     referenceId, status, createdAt
 *   }>
 * }
 */
export const getMyRechargeHistory = async ({ headerToken }) => {
  try {
    const url = `${BASE_URL}/user/rechargeReport/my-recharge-history`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${headerToken}`,
      },
    });

    const text = await response.text();
    if (text.trim().startsWith("<")) {
      console.log("[getMyRechargeHistory] HTML response — server error");
      return { success: false, message: "Server error. Please try again.", data: [] };
    }

    const json = JSON.parse(text);
    return json; // { success, message, data: [...] }
  } catch (error) {
    console.log("[getMyRechargeHistory] error:", error?.message || error);
    return { success: false, message: error.message || "Network error", data: [] };
  }
};

export const getBbpsReport = async ({ headerToken, userId }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/bbpsReport/complete-bbps-report`, {
      params: { user: userId },
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.log("BBPS Report API Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch BBPS report" };
  }
};

/**
 * getMyCommissionPlan
 * Fetches the commission plan assigned to the logged-in user.
 * GET /user/commissionPlan/my-commission-plan
 *
 * @param {{ headerToken: string }} params
 * @returns {Promise<{ success: boolean, message: string, data: object }>}
 */
export const getMyCommissionPlan = async ({ headerToken }) => {
  try {
    const url = `${BASE_URL}/user/commissionPlan/my-commission-plan`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${headerToken}`,
      },
    });

    const text = await response.text();
    if (text.trim().startsWith("<")) {
      console.log("[getMyCommissionPlan] HTML response — server error");
      return { success: false, message: "Server error. Please try again.", data: null };
    }

    const json = JSON.parse(text);
    return json; // { success, message, data: { ... } }
  } catch (error) {
    console.log("[getMyCommissionPlan] error:", error?.message || error);
    return { success: false, message: error.message || "Network error", data: null };
  }
};

/**
 * createSupportRequest
 * @param {{ serviceId: string, supportDetails: string, transactionId: string, headerToken: string }} params
 */
export const createSupportRequest = async ({ serviceId, supportDetails, transactionId, headerToken }) => {
  try {
    const url = `${BASE_URL}/user/support/create-support-request`;
    const response = await axios.post(url, { serviceId, supportDetails, transactionId }, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "Content-Type": "application/json"
      }
    });
    return response.data;
  } catch (error) {
    console.log("Create Support Request Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Ticket creation failed" };
  }
};

/**
 * getMySupportRequests
 * @param {{ headerToken: string, page: number, limit: number }} params
 */
export const getMySupportRequests = async ({ headerToken, page = 1, limit = 5 }) => {
  try {
    const url = `${BASE_URL}/user/support/get-my-support-requests?page=${page}&limit=${limit}`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${headerToken}` }
    });
    return response.data;
  } catch (error) {
    console.log("Get Support Requests Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch support requests" };
  }
};

/**
 * getAllOnlineServices
 * GET /user/onlineService/all-online-service
 */
export const getAllOnlineServices = async ({ headerToken }) => {
  try {
    const url = `${BASE_URL}/user/onlineService/all-online-service`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${headerToken}`, "Content-Type": "application/json" }
    });
    return response.data;
  } catch (error) {
    console.log("Get All Online Services Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch online services" };
  }
};

/**
 * getAllOfflineServices
 * Returns a list of available services (e.g. ITR file).
 */
export const getAllOfflineServices = async ({ headerToken }) => {
  try {
    const url = `${BASE_URL}/user/offlineService/all-offline-service`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${headerToken}`, "Content-Type": "application/json" }
    });
    return response.data;
  } catch (error) {
    console.log("Get All Offline Services Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch available services" };
  }
};

/**
 * getOfflineServiceForm
 * GET /user/offlineService/offline-service-form
 * Fetches required fields & documents for a specific service ID.
 */
export const getOfflineServiceForm = async ({ serviceId, headerToken }) => {
  try {
    const url = `${BASE_URL}/user/offlineService/offline-service-form/${serviceId}`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${headerToken}`, "Content-Type": "application/json" }
    });
    return response.data;
  } catch (error) {
    console.log("Get Offline Service Form Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch service requirements" };
  }
};

export const addIdChargeRequest = async ({ amount, mode, receiverBank, utrNumber, paymentDate, paymentProof, headerToken }) => {
  const generateIdempotencyKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'IDCH';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const idempotencyKey = generateIdempotencyKey();

  try {
    let formData = new FormData();
    formData.append("amount", amount);
    formData.append("mode", mode);
    formData.append("receiverBank", receiverBank);
    formData.append("utrNumber", utrNumber);
    formData.append("paymentDate", paymentDate);

    if (paymentProof) {
      const filename = paymentProof.split('/').pop();
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image`;
      formData.append("paymentProof", {
        uri: paymentProof,
        name: filename,
        type: type,
      });
    }

    const response = await axios.post(`${BASE_URL}/user/charge/add-id-charge-request`, formData, {
      headers: {
        "Content-Type": "multipart/form-data",
        "Authorization": `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey
      },
    });
    return response.data;
  } catch (error) {
    console.log("Add ID Charge Request Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Request submission failed" };
  }
};

/**
 * getFAQs
 * Fetches frequently asked questions.
 */
export const getFAQs = async ({ headerToken }) => {
  try {
    const url = `${BASE_URL}/user/faq/get-all-faqs`;
    const response = await axios.get(url, {
      headers: { Authorization: `Bearer ${headerToken}`, "Content-Type": "application/json" }
    });
    return response.data;
  } catch (error) {
    console.log("Get FAQs Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch FAQs" };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// AEPS
// ─────────────────────────────────────────────────────────────────────────────

export const registerOutlet = async ({ data, headerToken, headerKey, idempotencyKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/aepsInstant/registerOutlet`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
      },
    });
    return response.data;
  } catch (error) {
    console.log("Register Outlet API Error:", error?.response?.data || error);
    return (
      error?.response?.data || {
        success: false,
        message: "Outlet registration failed",
      }
    );
  }
};

export const fetchAepsBanks = async ({ headerToken, headerKey }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/aepsbank/list-banks`, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        headerToken,
        headerKey
      },
    });
    return response.data;
  } catch (error) {
    console.log("Fetch AEPS Banks API Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch bank list" };
  }
};

export const getAepsKycStatus = async ({ headerToken, idempotencyKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/aepsInstant/biometric-kyc-status`, {}, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
      },
    });
    return response.data;
  } catch (error) {
    console.log("AEPS KYC Status API Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Failed to fetch KYC status" };
  }
};

export const biometricKyc = async ({ data, headerToken, headerKey, idempotencyKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/aepsInstant/biometric-kyc`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
      },
    });
    return response.data;
  } catch (error) {
    console.log("Biometric KYC API Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Biometric KYC failed" };
  }
};

export const aepsBalanceEnquiry = async ({ data, headerToken, headerKey, idempotencyKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/aepsInstant/balance-enquiry`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
        headerToken,
        headerKey,
      },
    });
    console.log("AEPS Balance Enquiry Response:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.log("AEPS Balance Enquiry API Error:", error?.response?.data || error);
    return (
      error?.response?.data || {
        success: false,
        message: "Balance enquiry failed",
      }
    );
  }
};

export const aepsMiniStatement = async ({ data, headerToken, headerKey, idempotencyKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/aepsInstant/mini-statement`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
        headerToken,
        headerKey,
      },
    });
    console.log("AEPS Mini Statement Response:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.log("AEPS Mini Statement API Error:", error?.response?.data || error);
    return (
      error?.response?.data || {
        success: false,
        message: "Mini statement request failed",
      }
    );
  }
};

export const aepsCashWithdraw = async ({ data, headerToken, headerKey, idempotencyKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/aepsInstant/cash-withdraw`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
        headerToken,
        headerKey,
      },
    });
    return response.data;
  } catch (error) {
    console.log("AEPS Cash Withdraw API Error:", error?.response?.data || error);
    return (
      error?.response?.data || {
        success: false,
        message: "Cash withdrawal request failed",
      }
    );
  }
};

export const aepsInstantDailyLogin = async ({ data, headerToken, headerKey, idempotencyKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/aepsInstant/daily-login`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
        headerToken,
        headerKey,
      },
    });
    return response.data;
  } catch (error) {
    console.log("AEPS Daily Login API Error:", error?.response?.data || error);
    return (
      error?.response?.data || {
        success: false,
        message: "Daily login request failed",
      }
    );
  }
};
export const aepsDailyLogin = async ({ data, headerToken, headerKey, idempotencyKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/aeps/daily-login`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
        headerToken,
        headerKey,
      },
    });
    return response.data;
  } catch (error) {
    console.log("AEPS Daily Login API Error:", error?.response?.data || error);
    return (
      error?.response?.data || {
        success: false,
        message: "Daily login request failed",
      }
    );
  }
};

export const aeps2DailyLogin = async ({ data, headerToken, headerKey, idempotencyKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/aeps/daily-login`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
        headerToken,
        headerKey,
      },
    });
    return response.data;
  } catch (error) {
    console.log("AEPS2 Daily Login API Error:", error?.response?.data || error);
    return (
      error?.response?.data || {
        success: false,
        message: "Daily login request failed",
      }
    );
  }
};

/**
 * onboardAepsUser
 * POST /user/aeps/onboard-user
 */
export const onboardAepsUser = async ({ data, headerToken, idempotencyKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/aeps/onboard-user`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
      },
    });
    return response.data;
  } catch (error) {
    console.log("Onboard AEPS User API Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "User onboarding failed" };
  }
};

/**
 * activateAepsService
 * POST /user/aeps/activate
 */
export const activateAepsService = async ({ formData, headerToken, idempotencyKey }) => {
  try {
    const response = await fetch(`${BASE_URL}/user/aeps/activate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
      },
      body: formData,
    });
    const data = await response.json();
    return data;
  } catch (error) {
    console.log("Activate AEPS Service API Error:", error);
    return { success: false, message: "Service activation failed. Please try again." };
  }
};

/**
 * fetchEBankList
 * GET /user/ebank/bank-list
 */
export const fetchEBankList = async ({ headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/ebank/bank-list`, {
      headers: { Authorization: `Bearer ${headerToken}` }
    });
    return response.data;
  } catch (error) {
    console.log("Fetch AEPS2 Bank List Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch banks" };
  }
};

/**
 * fetchEStateList
 * GET /user/state/state-list
 */
export const fetchEStateList = async ({ headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/state/state-list`, {
      headers: { Authorization: `Bearer ${headerToken}` }
    });
    return response.data;
  } catch (error) {
    console.log("Fetch AEPS2 State List Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch states" };
  }
};

/**
 * generateAepsEkycOtp
 * POST /user/aeps/generate-ekyc-otp
 */
export const generateAepsEkycOtp = async ({ data, headerToken, idempotencyKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/aeps/generate-ekyc-otp`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
        "Content-Type": "application/json"
      },
    });
    return response.data;
  } catch (error) {
    console.log("Generate EKYC OTP Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Request failed" };
  }
};

/**
 * verifyAepsEkycOtp
 * POST /user/aeps/verify-ekyc-otp
 */
export const verifyAepsEkycOtp = async ({ data, headerToken, idempotencyKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/aeps/verify-ekyc-otp`, data, {
      headers: {
        "Authorization": `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
        "Content-Type": "application/json"
      },
    });

    console.log("Verify EKYC OTP Response:", response.data);
    return response.data;
  } catch (error) {
    console.log("Verify EKYC OTP Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Verification failed" };
  }
};

/**
 * aepsEkycBiometric
 * POST /user/aeps/ekyc-biometric
 */
export const aepsEkycBiometric = async ({ data, headerToken, idempotencyKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/aeps/ekyc-biometric`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
        "Content-Type": "application/json"
      },
    });
    return response.data;
  } catch (error) {
    console.log("AEPS Biometric KYC Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Biometric KYC failed" };
  }
};

/**
 * initiateAepsTransaction
 * POST /user/aeps/initiate-transaction
 */
export const initiateAepsTransaction = async ({ data, headerToken, idempotencyKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/aeps/initiate-transaction`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
        "Content-Type": "application/json"
      },
    });
    console.log("AEPS Initiate Transaction Response:", JSON.stringify(response.data, null, 2));
    return response.data;
  } catch (error) {
    console.log("AEPS Transaction Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Transaction failed" };
  }
};

/**
 * addDmtBeneficiary
 * POST /user/dmt-ben/add-beneficiary
 */
export const addDmtBeneficiary = async ({ data, headerToken, idempotencyKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/dmt-ben/add-beneficiary`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
      },
    });
    return response.data;
  } catch (error) {
    console.log("Add DMT Beneficiary Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to add beneficiary" };
  }
};

/**
 * getDmtBeneficiaries
 * POST /user/dmt-ben/get-beneficiary
 */
export const getDmtBeneficiaries = async ({ data, headerToken, idempotencyKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/dmt-ben/get-beneficiary`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
      },
    });
    return response.data;
  } catch (error) {
    console.log("Get DMT Beneficiaries Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch beneficiaries" };
  }
};

/**
 * deleteDmtBeneficiary
 * POST /user/dmt-ben/delete-beneficiary
 */
export const deleteDmtBeneficiary = async ({ data, headerToken, idempotencyKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/dmt-ben/delete-beneficiary`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
      },
    });
    return response.data;
  } catch (error) {
    console.log("Delete DMT Beneficiary Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to delete beneficiary" };
  }
};

/**
 * fetchDmtCustomer
 * POST /user/dmt/get-customer
 */
export const fetchDmtCustomer = async ({ data, headerToken, idempotencyKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/dmt/get-customer`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
      },
    });
    return response.data;
  } catch (error) {
    console.log("Fetch DMT Customer Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Customer lookup failed" };
  }
};

/**
 * checkDmtLimit
 * POST /user/dmt/check-limit
 */
export const checkDmtLimit = async ({ data, headerToken, idempotencyKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/dmt/check-limit`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
      },
    });
    return response.data;
  } catch (error) {
    console.log("Check DMT Limit Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Limit check failed" };
  }
};

/**
 * dmtCustomerEkyc
 * POST /user/dmt/customer-ekyc
 */
export const dmtCustomerEkyc = async ({ data, headerToken, idempotencyKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/dmt/customer-ekyc`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
      },
    });
    return response.data;
  } catch (error) {
    console.log("DMT Customer eKYC Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "eKYC failed" };
  }
};

/**
 * generateDmtRegOtp
 * POST /user/dmt/generate-reg-otp
 */
export const generateDmtRegOtp = async ({ data, headerToken, idempotencyKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/dmt/generate-reg-otp`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
      },
    });
    return response.data;
  } catch (error) {
    console.log("Generate DMT Reg OTP Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "OTP generation failed" };
  }
};

/**
 * registerDmtCustomer
 * POST /user/dmt/register-customer
 */
export const registerDmtCustomer = async ({ data, headerToken, idempotencyKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/dmt/register-customer`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
      },
    });
    return response.data;
  } catch (error) {
    console.log("Register DMT Customer Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Customer registration failed" };
  }
};

/**
 * generateDmtTotp
 * POST /user/dmt/generate-totp
 */
export const generateDmtTotp = async ({ data, headerToken, idempotencyKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/dmt/generate-totp`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
      },
    });
    return response.data;
  } catch (error) {
    console.log("Generate DMT TOTP Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "TOTP generation failed" };
  }
};

/**
 * transferDmtFund
 * POST /user/dmt/transfer-fund
 */
export const transferDmtFund = async ({ data, headerToken, idempotencyKey }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/dmt/transfer-fund`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey,
        "Content-Type": "application/json"
      },
    });
    return response.data;
  } catch (error) {
    console.log("Transfer DMT Fund Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Fund transfer failed" };
  }
};

export const getAepsStatus = async ({ headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/aepsInstant/aeps-status`, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
      },
    });
    return response.data;
  } catch (error) {
    console.log("AEPS Status API Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Failed to fetch AEPS status" };
  }
};

export const addAepsPayoutBank = async ({ data, headerToken }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/aepsPayoutBank/add-aeps-payout-bank`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "Content-Type": "multipart/form-data",
      },
    });
    return response.data;
  } catch (error) {
    console.log("Add AEPS Payout Bank Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Failed to add payout bank" };
  }
};

export const getApprovedAepsBanks = async ({ headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/aepsPayoutBank/approved-aeps-banks`, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.log("Get Approved AEPS Banks Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Failed to fetch approved banks" };
  }
};

export const getAepsPayoutBanks = async ({ headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/aepsPayoutBank/aeps-payout-banks`, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.log("Get AEPS Payout Banks Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Failed to fetch payout banks" };
  }
};

export const getPayoutBankList = async ({ headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/payout-bank/bank-list`, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.log("Get Payout Bank List Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Failed to fetch payout bank list" };
  }
};

export const initiateAepsPayoutTransfer = async ({ data, headerToken }) => {
  const generateIdempotencyKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'PTR_';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  try {
    const idempotencyKey = generateIdempotencyKey();
    const response = await axios.post(`${BASE_URL}/user/aepsPayout/initiate-payout-transfer`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "Content-Type": "application/json",
        "idempotency-key": idempotencyKey
      },
    });
    return response.data;
  } catch (error) {
    console.log("Initiate Payout Transfer Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Failed to initiate transfer" };
  }
};

export const deleteAepsPayoutBank = async ({ bankId, headerToken }) => {
  try {
    const response = await axios.delete(`${BASE_URL}/user/aepsPayoutBank/delete-aeps-payout-bank/${bankId}`, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "Content-Type": "application/json",
      },
      data: { _id: bankId },
    });
    return response.data;
  } catch (error) {
    console.log("Delete AEPS Payout Bank Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Failed to delete payout bank" };
  }
};

/**
 * addXpressPayoutBank
 * POST /user/xpressPayoutBank/add-payout-bank
 */
export const addXpressPayoutBank = async ({ data, headerToken }) => {
  try {
    const response = await axios.post(`${BASE_URL}/user/xpressPayoutBank/add-payout-bank`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.log("Add Xpress Payout Bank Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Failed to add xpress payout bank" };
  }
};

/**
 * getXpressPayoutBanks
 * GET /user/xpressPayoutBank/bank-list
 */
export const getXpressPayoutBanks = async ({ headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/xpressPayoutBank/bank-list`, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.log("Get Xpress Payout Banks Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Failed to fetch xpress payout banks" };
  }
};

/**
 * deleteXpressPayoutBank
 * DELETE /user/xpressPayoutBank/delete-payout-bank/:bankId
 */
export const deleteXpressPayoutBank = async ({ bankId, headerToken }) => {
  try {
    const response = await axios.delete(`${BASE_URL}/user/xpressPayoutBank/delete-payout-bank/${bankId}`, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "Content-Type": "application/json",
      },
    });
    return response.data;
  } catch (error) {
    console.log("Delete Xpress Payout Bank Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Failed to delete xpress payout bank" };
  }
};

/**
 * initiateXpressPayoutTransfer
 * POST /user/xpressPayout/initiate-payout-transfer
 */
export const initiateXpressPayoutTransfer = async ({ data, headerToken }) => {
  const generateIdempotencyKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'XPTR_';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  try {
    const idempotencyKey = generateIdempotencyKey();
    const response = await axios.post(`${BASE_URL}/user/xpressPayout/initiate-payout-transfer`, data, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "Content-Type": "application/json",
        "idempotency-key": idempotencyKey
      },
    });
    return response.data;
  } catch (error) {
    console.log("Initiate Xpress Payout Transfer Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Failed to initiate transfer" };
  }
};

/**
 * getXpressPayoutReport
 * GET /user/xpressPayoutReport/list-all
 */
export const getXpressPayoutReport = async ({ from, to, headerToken, page = 1, limit = 10 }) => {
  try {
    const url = `${BASE_URL}/user/xpressPayoutReport/list-all?from=${from}&to=${to}&page=${page}&limit=${limit}`;
    console.log("[getXpressPayoutReport] →", url);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${headerToken}`,
      },
    });

    const text = await response.text();

    if (text.trimStart().startsWith("<")) {
      console.log("[getXpressPayoutReport] HTML response — server error");
      return { success: false, message: "Server error. Please try again.", data: [] };
    }

    const json = JSON.parse(text);
    return json;
  } catch (error) {
    console.log("[getXpressPayoutReport] error:", error?.message || error);
    return { success: false, message: error.message || "Network error", data: [] };
  }
};

export const getAllServices = async ({ headerToken }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user/service/list`, {
      headers: { "Authorization": `Bearer ${headerToken}` },
    });
    return response.data;
  } catch (error) {
    console.log("Get All Services API Error:", error?.response?.data || error);
    if (error?.response?.data) return error.response.data;
    return { success: false, message: "Network error. Please check your connection." };
  }
};


export const requestService = async ({ serviceId, pipeline, headerToken }) => {
  try {
    const payload = { serviceId, pipeline };
    const response = await axios.post(`${BASE_URL}/user/serviceRequest/add-service-request`, payload, {
      headers: {
        Authorization: `Bearer ${headerToken}`,
        "Content-Type": "application/json"
      },
    });
    return response.data;
  } catch (error) {
    console.log("Add Service Request Error:", error?.response?.data || error);
    if (error?.response?.data) return error.response.data;
    return { success: false, message: "Network Error. Please try again" };
  }
};

