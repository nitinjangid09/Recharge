import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://192.168.1.5:8000";


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

export const fetchUserProfile = async ({ headerToken, headerKey }) => {
  try {
    const response = await axios.get(`${BASE_URL}/user-profile`, {
      headers: { headerToken, headerKey },
    });
    return response.data;
  } catch (error) {
    console.log("Profile API Error:", error?.response?.data || error);
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
    } catch (e) {}
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
  form.append("personalAddress[address]", safeTrim(personal.personalAddress));
  form.append("personalAddress[city]", safeTrim(personal.personalCity));
  form.append("personalAddress[state]", safeTrim(personal.personalState));
  form.append("personalAddress[pincode]", safeTrim(personal.personalPincode));
  form.append("personalCity", safeTrim(personal.personalCity));
  form.append("personalState", safeTrim(personal.personalState));
  form.append("personalPincode", safeTrim(personal.personalPincode));

  // Business fields
  form.append("shopName", safeTrim(business.shopName));
  form.append("businessAddress[address]", safeTrim(business.businessAddress));
  form.append("businessAddress[city]", safeTrim(business.businessCity));
  form.append("businessAddress[state]", safeTrim(business.businessState));
  form.append("businessAddress[pincode]", safeTrim(business.businessPincode));
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