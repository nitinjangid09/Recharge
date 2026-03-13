import axios from "axios";
import { ToastAndroid } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://192.168.1.19:8000";

// ─────────────────────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * safeTransform — attach via transformResponse: [safeTransform]
 * Prevents JSON.parse crash when server returns an HTML error page.
 */
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
 * getToken — reads header_token from AsyncStorage.
 * Confirmed single-token auth — no header_key in this app.
 */
const getToken = async () => {
  try {
    return await AsyncStorage.getItem("header_token");
  } catch (_) {
    return null;
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// AUTH
// OrderHistoryScreen · RechargeScreen · Transaction
// ─────────────────────────────────────────────────────────────────────────────

export const loginUser = async ({ email, password, userName, systemDetails }) => {
  try {
    const payload = { email, password, userName, systemDetails };
    const response = await axios.post(
      `${BASE_URL}/user-login`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );
    return response.data;
  } catch (error) {
    console.log("Login API Error:", error?.response?.data || error);
    if (error?.response?.data) return error.response.data;
    return { success: false, message: "Network error. Please try again" };
  }
};

export const verifyOtp = async ({ log_key, otp }) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/login-verify`,
      null,
      { params: { log_key: String(log_key).trim(), otp: String(otp).trim() } }
    );
    return response.data;
  } catch (error) {
    console.log("OTP Verify Error:", error?.response?.data || error);
    return error?.response?.data || { status: "ERROR", message: "Network Error. Please try again" };
  }
};

export const verifyUserOtp = async ({ email, otp }) => {
  try {
    const payload = { email, otp };
    const response = await axios.post(
      `${BASE_URL}/verify-user-otp`,
      payload,
      { headers: { "Content-Type": "application/json" } }
    );
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
    const response = await axios.post(
      `${BASE_URL}/user_wallet`,
      null,
      { headers: { headerToken, headerKey } }
    );
    return response.data;
  } catch (error) {
    console.log("Wallet API Error:", error?.response?.data || error);
    return error?.response?.data || { status: "ERROR", message: "Network Error. Please try again" };
  }
};

export const fetchUserProfile = async ({ headerToken, headerKey }) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/user-profile`,
      { headers: { headerToken, headerKey } }
    );
    return response.data;
  } catch (error) {
    console.log("Profile API Error:", error?.response?.data || error);
    return error?.response?.data || { status: "ERROR", message: "Unable to fetch profile" };
  }
};

export const logoutUser = async ({ headerToken, headerKey }) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/user-logout`,
      { headers: { headerToken, headerKey } }
    );
    return response.data;
  } catch (error) {
    console.log("Logout API Error:", error?.response?.data || error);
    return error?.response?.data || { status: "ERROR", message: "Logout failed" };
  }
};

export const getRoleList = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/user/role/get-role-list`);
    return response.data;
  } catch (error) {
    console.log("Get Role List API Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Unable to fetch roles" };
  }
};

export const registerUser = async (userData) => {
  try {
    const response = await axios.post(`${BASE_URL}/user-register`, userData);
    return response.data;
  } catch (error) {
    console.log("Register API Error:", error?.response?.data || error);
    return error?.response?.data || { success: false, message: "Registration failed. Please try again." };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// SERVICES
// ─────────────────────────────────────────────────────────────────────────────

export const fetchServices = async ({ headerToken, headerKey }) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/get-services`,
      { headers: { headerToken, headerKey } }
    );
    return response.data;
  } catch (error) {
    console.log("Get Services API Error:", error?.response?.data || error);
    return error?.response?.data || { status: "ERROR", message: "Unable to fetch services" };
  }
};

export const getOperatorCircle = async (mobile) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/get-operator-circles`,
      { params: { mobile } }
    );
    return response.data;
  } catch (error) {
    console.log("Operator API error:", error?.response?.data || error);
    return { status: "ERROR", message: "Failed to fetch operator details" };
  }
};

export const fetchOperatorByMobile = async (mobile) => {
  try {
    const headerToken = await AsyncStorage.getItem("header_token");
    const headerKey = await AsyncStorage.getItem("header_key");
    if (!headerToken || !headerKey) {
      return { status: "ERROR", message: "Session expired" };
    }
    const response = await axios.post(
      `${BASE_URL}/fetch-operator`,
      null,
      { headers: { headerToken, headerKey }, params: { mobile } }
    );
    return response.data;
  } catch (error) {
    console.log("Fetch operator API error:", error?.response?.data || error);
    return error?.response?.data || { status: "ERROR", message: "Unable to fetch operator" };
  }
};

export const fetchPlans = async (mobile, circle, operator) => {
  try {
    const headerToken = await AsyncStorage.getItem("header_token");
    const headerKey = await AsyncStorage.getItem("header_key");
    if (!headerToken || !headerKey) {
      return { status: "ERROR", message: "Session expired" };
    }
    const response = await axios.post(
      `${BASE_URL}/fetch-plans`,
      null,
      { headers: { headerToken, headerKey }, params: { mobile, circle, operator } }
    );
    return response.data;
  } catch (error) {
    console.log("Fetch plans API error:", error?.response?.data || error);
    return error?.response?.data || { status: "ERROR", message: "Unable to fetch plans" };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// KYC — OFFLINE SUBMISSION
// ─────────────────────────────────────────────────────────────────────────────
//
//  Endpoint  :  POST  http://192.168.1.19:8000/user/kyc/offline-kyc-submission
//  Auth      :  headerToken only (single-token — confirmed from AsyncStorage debug)
//  Body type :  multipart/form-data  (DO NOT set Content-Type manually)
//
//  req.body  (exact backend field names):
//   Personal  → firstName, lastName, fatherName, gender, email, phone, dob
//               personalAddress, personalCity, personalState, personalPincode
//   Business  → shopName, businessAddress, businessCity, businessState, businessPincode
//               panNumber, aadharNumber
//               businessPanNumber (optional), gstNumber (optional)
//   Banking   → accountHolderName, bankName, accountNumber, branchName, ifscCode
//               ⚠ confirmAccountNumber CLIENT-SIDE ONLY — never sent
//
//  req.files (exact multer field names):
//    aadharFile · panFile · shopImage
//
//  AsyncStorage written on success:
//    kyc_status = "pending" | is_kyc_online = "false" | kyc_submitted_at = ISO
// ─────────────────────────────────────────────────────────────────────────────

export const submitOfflineKyc = async ({ personal, business, files, banking }) => {

  // ── STEP 1: Auth token ────────────────────────────────────────────────────
  const headerToken = await getToken();

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("[KYC] Starting submitOfflineKyc");
  console.log("[KYC] Token:", headerToken ? `${headerToken.slice(0, 20)}...` : "MISSING ❌");
  console.log("[KYC] Endpoint:", `${BASE_URL}/user/kyc/offline-kyc-submission`);

  if (!headerToken) {
    console.log("[KYC] ❌ No token — aborting");
    return { success: false, message: "Session expired. Please login again." };
  }

  // ── STEP 2: Build FormData ────────────────────────────────────────────────
  const form = new FormData();

  // Personal
  form.append("firstName", personal.firstName.trim());
  form.append("lastName", personal.lastName.trim());
  form.append("fatherName", personal.fatherName.trim());
  form.append("gender", personal.gender);
  form.append("email", personal.email.trim());
  form.append("phone", personal.phone.trim());
  form.append("dob", personal.dob.trim());
  form.append("personalAddress", personal.personalAddress.trim());
  form.append("personalCity", personal.personalCity.trim());
  form.append("personalState", personal.personalState.trim());
  form.append("personalPincode", personal.personalPincode.trim());

  // Business
  form.append("shopName", business.shopName.trim());
  form.append("businessAddress", business.businessAddress.trim());
  form.append("businessCity", business.businessCity.trim());
  form.append("businessState", business.businessState.trim());
  form.append("businessPincode", business.businessPincode.trim());
  form.append("panNumber", business.panNumber.trim());
  form.append("aadharNumber", business.aadharNumber.trim());

  if (business.businessPanNumber?.trim())
    form.append("businessPanNumber", business.businessPanNumber.trim());
  if (business.gstNumber?.trim())
    form.append("gstNumber", business.gstNumber.trim());

  // Banking — confirmAccountNumber CLIENT-SIDE ONLY, never sent
  form.append("accountHolderName", banking.accountHolderName.trim());
  form.append("bankName", banking.bankName.trim());
  form.append("accountNumber", banking.accountNumber.trim());
  form.append("branchName", banking.branchName.trim());
  form.append("ifscCode", banking.ifscCode.trim());

  // Files
  if (files.aadharFile) {
    form.append("aadharFile", {
      uri: files.aadharFile.uri,
      name: files.aadharFile.name || "aadharFile.jpg",
      type: files.aadharFile.type || "image/jpeg",
    });
    console.log("[KYC] aadharFile:", files.aadharFile.name, files.aadharFile.type);
  } else {
    console.log("[KYC] ⚠ aadharFile is null");
  }

  if (files.panFile) {
    form.append("panFile", {
      uri: files.panFile.uri,
      name: files.panFile.name || "panFile.jpg",
      type: files.panFile.type || "image/jpeg",
    });
    console.log("[KYC] panFile:", files.panFile.name, files.panFile.type);
  } else {
    console.log("[KYC] ⚠ panFile is null");
  }

  if (files.shopImage) {
    form.append("shopImage", {
      uri: files.shopImage.uri,
      name: files.shopImage.name || "shopImage.jpg",
      type: files.shopImage.type || "image/jpeg",
    });
    console.log("[KYC] shopImage:", files.shopImage.name, files.shopImage.type);
  } else {
    console.log("[KYC] ⚠ shopImage is null");
  }

  // Log all text fields being sent
  console.log("[KYC] Form fields →", JSON.stringify({
    firstName: personal.firstName.trim(),
    lastName: personal.lastName.trim(),
    fatherName: personal.fatherName.trim(),
    gender: personal.gender,
    email: personal.email.trim(),
    phone: personal.phone.trim(),
    dob: personal.dob.trim(),
    personalAddress: personal.personalAddress.trim(),
    personalCity: personal.personalCity.trim(),
    personalState: personal.personalState.trim(),
    personalPincode: personal.personalPincode.trim(),
    shopName: business.shopName.trim(),
    businessAddress: business.businessAddress.trim(),
    businessCity: business.businessCity.trim(),
    businessState: business.businessState.trim(),
    businessPincode: business.businessPincode.trim(),
    panNumber: business.panNumber.trim(),
    aadharNumber: business.aadharNumber.trim(),
    businessPanNumber: business.businessPanNumber?.trim() || "(not sent)",
    gstNumber: business.gstNumber?.trim() || "(not sent)",
    accountHolderName: banking.accountHolderName.trim(),
    bankName: banking.bankName.trim(),
    accountNumber: banking.accountNumber.trim(),
    branchName: banking.branchName.trim(),
    ifscCode: banking.ifscCode.trim(),
  }));

  // ── STEP 3: POST ──────────────────────────────────────────────────────────
  // Use fetch() instead of axios to get the raw response text first,
  // so we can log the EXACT server response before any parsing.
  try {
    console.log("[KYC] Sending request...");

    const fetchResponse = await fetch(
      `${BASE_URL}/user/kyc/offline-kyc-submission`,
      {
        method: "POST",
        headers: {
          headerToken: headerToken,
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
      console.log("[KYC] ❌ Server returned HTML page (not JSON)");
      data = { success: false, message: `Server error (${fetchResponse.status}). Check backend logs.` };
    } else {
      try {
        data = JSON.parse(rawText);
        console.log("[KYC] Parsed JSON →", JSON.stringify(data));
      } catch (_) {
        console.log("[KYC] ❌ Could not parse response as JSON");
        data = { success: false, message: "Unexpected server response. Please try again." };
      }
    }

    // ── STEP 4: Check success ─────────────────────────────────────────────
    // Log every field so we can see what the backend actually returns
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

    // Not a success — return whatever the server said
    return {
      success: false,
      message: data?.message || `Server returned status ${fetchResponse.status}. Please try again.`,
      errors: data?.errors || null,
    };

  } catch (err) {
    // Network-level error (no response at all)
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("[KYC] ❌ Network/fetch error");
    console.log("[KYC] error.name   :", err?.name);
    console.log("[KYC] error.message:", err?.message);
    console.log("[KYC] error.code   :", err?.code);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    let message = "Submission failed. Please try again.";
    if (err?.message?.includes("Network request failed")) message = "Network error. Check WiFi — phone and server must be on the same network.";
    else if (err?.message?.includes("ECONNREFUSED")) message = `Cannot reach server at ${BASE_URL}.\nCheck the server is running.`;
    else if (err?.message?.includes("timeout")) message = "Request timed out. Check your WiFi.";
    else if (err?.message) message = err.message;

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
    const headerToken = await getToken();
    if (!headerToken) {
      return { success: false, message: "Session expired. Please login again." };
    }
    const response = await axios.get(
      `${BASE_URL}/user/kyc/status`,
      { headers: { headerToken }, transformResponse: [safeTransform] }
    );
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
    return error?.response?.data || { status: "ERROR", message: "Unable to fetch KYC status." };
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
    await AsyncStorage.multiRemove(["kyc_status", "is_kyc_online", "kyc_submitted_at"]);
  } catch (error) {
    console.log("[KYC] clearKycStorage error:", error);
  }
};