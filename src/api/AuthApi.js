import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as NavigationService from "../utils/NavigationService";
import { Alert } from "react-native";

export const BASE_URL = "http://192.168.1.16:8000";

// ─── Auto Logout Helper ───────────────────────────────────────────────────────
const performAutoLogout = async (reason = "Session expired. Please login again.") => {
  try {
    console.log("[AUTH] performAutoLogout triggered. Reason:", reason);

    // Clear all sensitive storage
    await AsyncStorage.multiRemove([
      "header_token",
      "header_key",
      "kyc_status",
      "is_payment_done",
      "id_payment_status",
      "token"
    ]);

    // Show alert and redirect
    Alert.alert("Session Expired", reason, [
      {
        text: "Login Again",
        onPress: () => {
          NavigationService.reset("FinanceIntro");
        }
      }
    ]);
  } catch (err) {
    console.log("[AUTH] Logout error:", err);
    NavigationService.reset("FinanceIntro");
  }
};

// ─── Axios Global Interceptor ─────────────────────────────────────────────────
axios.interceptors.response.use(
  (response) => {
    // Some APIs return 200 but with success: false and a specific message
    const data = response.data;
    if (data && data.success === false && (
      data.message?.toLowerCase().includes("token expired") ||
      data.message?.toLowerCase().includes("invalid token") ||
      data.message?.toLowerCase().includes("session expired")
    )) {
      performAutoLogout(data.message);
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
 * getAuthHeaders — reads BOTH header_token and header_key from AsyncStorage.
 * Matches the same two keys used by every other authenticated endpoint
 * (fetchUserWallet, fetchUserProfile, logoutUser, etc.)
 *
 * Returns { headerToken, headerKey } or null if either is missing.
 */
const getAuthHeaders = async () => {
  try {
    const [headerToken, headerKey] = await AsyncStorage.multiGet([
      "header_token",
      "header_key",
    ]).then((pairs) => pairs.map(([, v]) => v));

    if (!headerToken || !headerKey) {
      console.log(
        "[AUTH] Missing credentials →",
        `headerToken: ${headerToken ? "✓" : "✗"}`,
        `headerKey: ${headerKey ? "✓" : "✗"}`
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
        'idempotency-key': idempotencyKey
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

export const getAllOfflineTopupRequests = async ({ headerToken, page = 1, limit = 10 }) => {
  try {
    const url = `${BASE_URL}/user/offlineTopup/get-all-offline-topup-requests?page=${page}&limit=${limit}`;
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
    const json = await response.json();
    return json; // { success, message, data: [...] }
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

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey
      },
      body: JSON.stringify(bodyObj),
    });
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

    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${headerToken}`,
        "idempotency-key": idempotencyKey
      },
      body: JSON.stringify({ amount: Number(amount) }),
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
