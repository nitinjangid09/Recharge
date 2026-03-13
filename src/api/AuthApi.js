import axios from "axios";
import { ToastAndroid } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "http://192.168.1.19:8000";


// OrderHistoryScreen
// RechargeScreen
// Transaction
export const loginUser = async ({
  email,
  password,
  userName,
  systemDetails
}) => {
  try {
    const payload = {
      email,
      password,
      userName,
      systemDetails
    };

    const response = await axios.post(
      `${BASE_URL}/user-login`,
      payload,
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    return response.data;

  } catch (error) {
    console.log("Login API Error:", error?.response?.data || error);

    // ✅ RETURN API MESSAGE IF AVAILABLE
    if (error?.response?.data) {
      return error.response.data;
    }

    // ⚠️ Only for network / no-response errors
    return {
      success: false,
      message: "Network error. Please try again"
    };
  }
};



export const verifyOtp = async ({ log_key, otp }) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/login-verify`,
      null,
      {
        params: {
          log_key: String(log_key).trim(),
          otp: String(otp).trim()
        }
      }
    );

    return response.data;

  } catch (error) {
    console.log("OTP Verify Error:", error?.response?.data || error);

    return error?.response?.data || {
      status: "ERROR",
      message: "Network Error.  Please try again"
    };
  }
};


export const verifyUserOtp = async ({ email, otp }) => {
  try {
    const payload = {
      email,
      otp
    };

    const response = await axios.post(
      `${BASE_URL}/verify-user-otp`,
      payload,
      {
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

    return response.data;

  } catch (error) {
    console.log("Verify User OTP Error:", error?.response?.data || error);

    if (error?.response?.data) {
      return error.response.data;
    }

    return {
      success: false,
      message: "Network Error. Please try again"
    };
  }
};


export const fetchUserWallet = async ({ headerToken, headerKey }) => {
  try {
    const response = await axios.post(
      `${BASE_URL}/user_wallet`,
      null,
      {
        headers: {
          headerToken: headerToken,
          headerKey: headerKey
        }
      }
    );

    return response.data;

  } catch (error) {
    console.log("Wallet API Error:", error?.response?.data || error);

    return error?.response?.data || {
      status: "ERROR",
      message: "Network Error.  Please try again"
    };
  }
};
export const fetchUserProfile = async ({ headerToken, headerKey }) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/user-profile`,

      {
        headers: {
          headerToken: headerToken,
          headerKey: headerKey
        }
      }
    );

    return response.data;

  } catch (error) {
    console.log("Profile API Error:", error?.response?.data || error);

    return error?.response?.data || {
      status: "ERROR",
      message: "Unable to fetch profile"
    };
  }
};


export const fetchServices = async ({ headerToken, headerKey }) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/get-services`,

      {
        headers: {
          headerToken: headerToken,
          headerKey: headerKey,
        },
      }
    );

    return response.data;

  } catch (error) {
    console.log("Get Services API Error:", error?.response?.data || error);

    return error?.response?.data || {
      status: "ERROR",
      message: "Unable to fetch services",
    };
  }
};


export const getOperatorCircle = async (mobile) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/get-operator-circles`,
      {
        params: { mobile }
      }
    );

    return response.data;

  } catch (error) {
    console.log("Operator API error:", error?.response?.data || error);

    return {
      status: "ERROR",
      message: "Failed to fetch operator details"
    };
  }
};


export const fetchOperatorByMobile = async (mobile) => {
  try {
    const headerToken = await AsyncStorage.getItem("header_token");
    const headerKey = await AsyncStorage.getItem("header_key");

    if (!headerToken || !headerKey) {
      return {
        status: "ERROR",
        message: "Session expired",
      };
    }

    const response = await axios.post(
      `${BASE_URL}/fetch-operator`,
      null, // no body
      {
        headers: {
          headerToken: headerToken,
          headerKey: headerKey,
        },
        params: {
          mobile: mobile, // sent as query param
        },
      }
    );

    return response.data;

  } catch (error) {
    console.log(
      "Fetch operator API error:",
      error?.response?.data || error
    );

    return error?.response?.data || {
      status: "ERROR",
      message: "Unable to fetch operator",
    };
  }
};


export const fetchPlans = async (mobile, circle, operator) => {
  try {
    const headerToken = await AsyncStorage.getItem("header_token");
    const headerKey = await AsyncStorage.getItem("header_key");

    if (!headerToken || !headerKey) {
      return {
        status: "ERROR",
        message: "Session expired",
      };
    }

    const response = await axios.post(
      `${BASE_URL}/fetch-plans`,
      null, // no body
      {
        headers: {
          headerToken: headerToken,
          headerKey: headerKey,
        },
        params: {
          mobile: mobile,
          circle: circle,
          operator: operator,
        },
      }
    );

    return response.data;

  } catch (error) {
    console.log(
      "Fetch plans API error:",
      error?.response?.data || error
    );

    return error?.response?.data || {
      status: "ERROR",
      message: "Unable to fetch plans",
    };
  }
};



export const logoutUser = async ({ headerToken, headerKey }) => {
  try {
    const response = await axios.get(
      `${BASE_URL}/user-logout`,

      {
        headers: {
          headerToken: headerToken,
          headerKey: headerKey,
        },
      }
    );

    return response.data;

  } catch (error) {
    console.log("Logout API Error:", error?.response?.data || error);

    return error?.response?.data || {
      status: "ERROR",
      message: "Logout failed",
    };
  }
};

export const getRoleList = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/user/role/get-role-list`);
    return response.data;
  } catch (error) {
    console.log("Get Role List API Error:", error?.response?.data || error);
    return error?.response?.data || {
      success: false,
      message: "Unable to fetch roles",
    };
  }
};

export const registerUser = async (userData) => {
  try {
    const response = await axios.post(`${BASE_URL}/user-register`, userData);
    return response.data;
  } catch (error) {
    console.log("Register API Error:", error?.response?.data || error);
    return error?.response?.data || {
      success: false,
      message: "Registration failed. Please try again.",
    };
  }
};
