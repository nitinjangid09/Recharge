import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  ActivityIndicator,
  ScrollView,
  TextInput,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Colors from "../../../constants/Colors";
import Fonts from "../../../constants/Fonts";
import { aepsDailyLogin } from "../../../api/AuthApi";
import { AlertService } from "../../../componets/Alerts/CustomAlert";
import * as NavigationService from "../../../utils/NavigationService";
import HeaderBar from "../../../componets/HeaderBar/HeaderBar";
import { fadeIn, slideUp, buttonPress } from "../../../utils/ScreenAnimations";

const { width: SW } = Dimensions.get("window");
const S = SW / 375;

// ── DEVICE LIST ──
const DEVICE_LIST = [
  { label: "Mantra MFS100", value: "MANTRA", icon: "🖐" },
  { label: "Morpho MSO 1300", value: "MORPHO", icon: "🖐" },
  { label: "Startek FM220", value: "STARTEK", icon: "🖐" },
  { label: "SecuGen Hamster", value: "SECUGEN", icon: "🖐" },
];

const DailyLogin = () => {
  const [device, setDevice] = useState(null);
  const [authMethod, setAuthMethod] = useState(null); 
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [showDeviceList, setShowDeviceList] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20 * S)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      fadeIn(fadeAnim, 600),
      slideUp(slideAnim, 600)
    ]).start();
  }, []);

  const validate = () => {
    const e = {};
    if (!/^\d{12}$/.test(aadhaarNumber)) e.aadhaar = "Valid 12-digit Aadhaar required";
    if (!/^\d{10}$/.test(mobileNumber)) e.mobile = "Valid 10-digit Mobile required";
    if (!authMethod) e.method = "Choose verification method";
    if (authMethod === "finger" && !device) e.device = "Biometric device required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const selectedDevice = DEVICE_LIST.find(d => d.value === device);

  const handleSubmit = async () => {
    if (!validate()) return;

    buttonPress(btnScale).start();
    setLoading(true);

    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      const idempotencyKey = `DL_${Date.now()}`;

      const payload = {
        aadhaarNumber,
        mobileNumber,
        authMethod,
        device: authMethod === "finger" ? device : "FACE",
        biometricData: authMethod === "face" ? "FACERD_CAPTURE" : "FINGER_CAPTURE",
      };

      const res = await aepsDailyLogin({
        data: payload,
        headerToken,
        idempotencyKey
      });

      if (res.success || res.status === "SUCCESS") {
        AlertService.showAlert({
          type: "success",
          title: "Success",
          message: res.message || "Daily login completed.",
          onClose: () => NavigationService.goBack()
        });
      } else {
        AlertService.showAlert({
          type: "error",
          title: "Failed",
          message: res.message || "Authentication failed."
        });
      }
    } catch (err) {
      AlertService.showAlert({
        type: "error",
        title: "Error",
        message: "Network or System error."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar title="NPCI Daily Login" onBack={() => NavigationService.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          <View style={styles.hero}>
            <View style={styles.iconCircle}>
              <Icon name="shield-lock" size={34 * S} color={Colors.finance_accent} />
            </View>
            <Text style={styles.heroTitle}>Merchant Login</Text>
            <Text style={styles.heroSub}>Mandatory identity verification for today's transactions</Text>
          </View>

          <View style={styles.card}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>AADHAAR NUMBER</Text>
              <View style={[styles.inputBox, errors.aadhaar && styles.inputBoxError]}>
                <Icon name="face-recognition" size={20 * S} color={Colors.finance_accent} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="12 Digit Aadhaar Number"
                  placeholderTextColor={Colors.gray_BD}
                  keyboardType="numeric"
                  maxLength={12}
                  value={aadhaarNumber}
                  onChangeText={setAadhaarNumber}
                />
              </View>
              {errors.aadhaar && <Text style={styles.errorTxt}>{errors.aadhaar}</Text>}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>MOBILE NUMBER</Text>
              <View style={[styles.inputBox, errors.mobile && styles.inputBoxError]}>
                <Icon name="phone" size={20 * S} color={Colors.finance_accent} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="10 Digit Mobile Number"
                  placeholderTextColor={Colors.gray_BD}
                  keyboardType="numeric"
                  maxLength={10}
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                />
              </View>
              {errors.mobile && <Text style={styles.errorTxt}>{errors.mobile}</Text>}
            </View>

            <View style={styles.methodRow}>
              <TouchableOpacity
                style={[styles.methodBtn, authMethod === "finger" && styles.methodBtnActive]}
                onPress={() => {
                  setAuthMethod("finger");
                  setShowDeviceList(true);
                }}
              >
                <Icon name="fingerprint" size={24 * S} color={authMethod === "finger" ? Colors.white : Colors.gray_75} />
                <Text style={[styles.methodLabel, authMethod === "finger" && styles.methodLabelActive]}>Fingerprint</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.methodBtn, authMethod === "face" && styles.methodBtnActive]}
                onPress={() => {
                  setAuthMethod("face");
                  setShowDeviceList(false);
                }}
              >
                <Icon name="face-recognition" size={24 * S} color={authMethod === "face" ? Colors.white : Colors.gray_75} />
                <Text style={[styles.methodLabel, authMethod === "face" && styles.methodLabelActive]}>Face Search</Text>
              </TouchableOpacity>
            </View>
            {errors.method && <Text style={styles.errorTxt}>{errors.method}</Text>}

            {authMethod === "finger" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>SELECT DEVICE</Text>
                <TouchableOpacity
                  style={[styles.inputBox, errors.device && styles.inputBoxError]}
                  onPress={() => setShowDeviceList(!showDeviceList)}
                >
                  <Icon name="usb-flash-drive-outline" size={20 * S} color={Colors.finance_accent} style={styles.inputIcon} />
                  <Text style={[styles.input, !device && { color: Colors.gray_BD }]}>
                    {selectedDevice ? selectedDevice.label : "Choose scanner"}
                  </Text>
                  <Icon name={showDeviceList ? "chevron-up" : "chevron-down"} size={20 * S} color={Colors.gray_BD} />
                </TouchableOpacity>

                {showDeviceList && (
                  <View style={styles.dropdownList}>
                    {DEVICE_LIST.map((d) => (
                      <TouchableOpacity
                        key={d.value}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setDevice(d.value);
                          setShowDeviceList(false);
                        }}
                      >
                        <Text style={styles.dropdownItemTxt}>{d.label}</Text>
                        {device === d.value && <Icon name="check" size={16 * S} color={Colors.finance_accent} />}
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
                {errors.device && <Text style={styles.errorTxt}>{errors.device}</Text>}
              </View>
            )}
          </View>

          <View style={styles.infoBox}>
            <View style={styles.infoDot} />
            <Text style={styles.infoTxt}>
              {authMethod === "finger" 
                ? "Connect your Fingerprint scanner via USB." 
                : authMethod === "face" ? "Look directly at the camera for Face Auth." : "Select verification method."}
            </Text>
          </View>

          <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 24 * S }}>
            <TouchableOpacity
              style={[styles.mainBtn, loading && styles.mainBtnDisabled]}
              onPress={handleSubmit}
              activeOpacity={0.9}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color={Colors.white} />
              ) : (
                <>
                  <Icon name={authMethod === "face" ? "camera" : "fingerprint"} size={22 * S} color={Colors.white} style={{ marginRight: 10 }} />
                  <Text style={styles.mainBtnTxt}>
                    {authMethod === "face" ? "Start Face Scan" : "Capture Fingerprint"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.footerInfo}>
            NPCI • RBI COMPLIANT • SECURE GATEWAY
          </Text>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default DailyLogin;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  scroll: { padding: 20 * S },
  hero: { alignItems: "center", marginBottom: 28 * S },
  iconCircle: {
    width: 68 * S, height: 68 * S, borderRadius: 34 * S,
    backgroundColor: Colors.white, alignItems: "center", justifyContent: "center",
    marginBottom: 16 * S, elevation: 6, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 15
  },
  heroTitle: { fontFamily: Fonts.Bold, fontSize: 24 * S, color: Colors.primary, marginBottom: 4 * S },
  heroSub: { fontFamily: Fonts.Medium, fontSize: 13 * S, color: Colors.gray_9E, textAlign: "center", paddingHorizontal: 20 * S },

  card: { backgroundColor: Colors.homebg, borderRadius: 28 * S, padding: 22 * S, elevation: 2, shadowColor: "#000", shadowOpacity: 0.03, borderWidth: 1, borderColor: "rgba(0,0,0,0.02)" },
  inputGroup: { marginBottom: 20 * S },
  label: { fontFamily: Fonts.Bold, fontSize: 10 * S, color: Colors.gray_75, marginBottom: 12 * S, letterSpacing: 1, textTransform: "uppercase" },
  inputBox: {
    flexDirection: "row", alignItems: "center", height: 56 * S,
    backgroundColor: Colors.white, borderRadius: 18 * S, paddingHorizontal: 18 * S,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.05)"
  },
  inputBoxError: { borderColor: Colors.red + "70", backgroundColor: Colors.white },
  inputIcon: { marginRight: 14 * S },
  input: { flex: 1, fontFamily: Fonts.SemiBold, fontSize: 15 * S, color: Colors.primary, padding: 0 },
  
  methodRow: { flexDirection: "row", gap: 12 * S, marginBottom: 10 * S, marginTop: 5 * S },
  methodBtn: {
    flex: 1, height: 84 * S, backgroundColor: Colors.white, borderRadius: 20 * S,
    alignItems: "center", justifyContent: "center", gap: 8 * S,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.05)", elevation: 1
  },
  methodBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary, elevation: 4 },
  methodLabel: { fontFamily: Fonts.Bold, fontSize: 11.5 * S, color: Colors.gray_75 },
  methodLabelActive: { color: Colors.white },

  dropdownList: {
    marginTop: 10 * S, backgroundColor: Colors.white, borderRadius: 20 * S, 
    overflow: "hidden", borderWidth: 1, borderColor: "rgba(0,0,0,0.08)",
    elevation: 10, shadowColor: "#000", shadowOpacity: 0.12, shadowRadius: 20
  },
  dropdownItem: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20 * S, paddingVertical: 16 * S, borderBottomWidth: 1, borderBottomColor: "rgba(0,0,0,0.03)"
  },
  dropdownItemTxt: { fontFamily: Fonts.Bold, fontSize: 13.5 * S, color: Colors.primary },

  infoBox: { flexDirection: "row", alignItems: "center", gap: 10 * S, marginTop: 16 * S, paddingHorizontal: 6 * S },
  infoDot: { width: 6 * S, height: 6 * S, borderRadius: 3 * S, backgroundColor: Colors.finance_accent },
  infoTxt: { fontFamily: Fonts.Medium, fontSize: 11.5 * S, color: Colors.gray_9E, flex: 1 },

  mainBtn: {
    backgroundColor: Colors.primary, height: 60 * S, borderRadius: 22 * S,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    elevation: 8, shadowColor: Colors.primary, shadowOpacity: 0.35, shadowRadius: 20
  },
  mainBtnDisabled: { backgroundColor: Colors.gray_BD, shadowOpacity: 0 },
  mainBtnTxt: { fontFamily: Fonts.Bold, fontSize: 17 * S, color: Colors.white, letterSpacing: 0.5 },

  footerInfo: { fontFamily: Fonts.Bold, fontSize: 10 * S, color: Colors.gray_BD, textAlign: "center", marginTop: 36 * S, letterSpacing: 1.2, textTransform: "uppercase" },
  errorTxt: { fontFamily: Fonts.Light, color: Colors.red, fontSize: 10.5 * S, marginTop: 6 * S, fontWeight: "300", marginLeft: 6 * S }
});
