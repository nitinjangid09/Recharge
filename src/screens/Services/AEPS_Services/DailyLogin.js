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

const { width: SW, height: SH } = Dimensions.get("window");
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
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
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
    loadMerchantData();
  }, []);

  const loadMerchantData = async () => {
    try {
      const phone = await AsyncStorage.getItem("user_phone");
      if (phone) setMobileNumber(phone);
    } catch (e) { }
  };

  const validate = () => {
    const e = {};
    if (!/^\d{12}$/.test(aadhaarNumber)) e.aadhaar = "Valid 12-digit Aadhaar required";
    if (!/^\d{10}$/.test(mobileNumber)) e.mobile = "Valid 10-digit Mobile required";
    if (!device) e.device = "Please select your biometric device";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

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
        device,
        biometricData: "AUTHENTICATION_BLOB_PLACEHOLDER",
      };

      const res = await aepsDailyLogin({
        data: payload,
        headerToken,
        idempotencyKey
      });

      if (res.success || res.status === "SUCCESS") {
        AlertService.showAlert({
          type: "success",
          title: "Authentication Successful",
          message: res.message || "Daily login completed successfully. You can now use AEPS services.",
          onClose: () => NavigationService.goBack()
        });
      } else {
        AlertService.showAlert({
          type: "error",
          title: "Login Failed",
          message: res.message || "Daily biometric authentication failed."
        });
      }
    } catch (err) {
      AlertService.showAlert({
        type: "error",
        title: "Error",
        message: "Something went wrong. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar title="Daily Authentication" onBack={() => NavigationService.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>

          <View style={styles.hero}>
            <View style={styles.iconCircle}>
              <Icon name="shield-check" size={36 * S} color={Colors.finance_accent} />
            </View>
            <Text style={styles.heroTitle}>Merchant Login</Text>
            <Text style={styles.heroSub}>
              Verify your identity to proceed with AEPS transactions.
            </Text>
          </View>

          <View style={styles.card}>
            {/* Merchant Aadhaar */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>MERCHANT AADHAAR NUMBER</Text>
              <View style={[styles.inputBox, errors.aadhaar && styles.inputBoxError]}>
                <Icon name="card-account-details-outline" size={20 * S} color={Colors.finance_accent} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter 12 digit Aadhaar"
                  placeholderTextColor={Colors.gray_BD}
                  keyboardType="numeric"
                  maxLength={12}
                  value={aadhaarNumber}
                  onChangeText={setAadhaarNumber}
                />
              </View>
              {errors.aadhaar && <Text style={styles.errorTxt}>{errors.aadhaar}</Text>}
            </View>

            {/* Merchant Mobile */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>MERCHANT MOBILE NUMBER</Text>
              <View style={[styles.inputBox, errors.mobile && styles.inputBoxError]}>
                <Icon name="phone-outline" size={20 * S} color={Colors.finance_accent} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter 10 digit mobile"
                  placeholderTextColor={Colors.gray_BD}
                  keyboardType="numeric"
                  maxLength={10}
                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                />
              </View>
              {errors.mobile && <Text style={styles.errorTxt}>{errors.mobile}</Text>}
            </View>

            {/* Device Selection */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>SELECT BIOMETRIC DEVICE</Text>
              <View style={styles.deviceRow}>
                {DEVICE_LIST.map((item) => {
                  const isSelected = device === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[styles.deviceBtn, isSelected && styles.deviceBtnActive]}
                      onPress={() => setDevice(item.value)}
                    >
                      <View style={[styles.devIconBox, isSelected && styles.devIconBoxActive]}>
                        <Text style={styles.devIcon}>{item.icon}</Text>
                      </View>
                      <Text style={[styles.devLabel, isSelected && styles.devLabelActive]}>{item.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {errors.device && <Text style={styles.errorTxt}>{errors.device}</Text>}
            </View>
          </View>

          <View style={styles.infoBox}>
            <View style={styles.infoDot} />
            <Text style={styles.infoTxt}>
              RD Service must be installed and active for verification.
            </Text>
          </View>

          <Animated.View style={{ transform: [{ scale: btnScale }], marginTop: 20 * S }}>
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
                  <Icon name="fingerprint" size={22 * S} color={Colors.white} style={{ marginRight: 10 }} />
                  <Text style={styles.mainBtnTxt}>Verify & Login</Text>
                </>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.footerInfo}>
            Secured by National Payments Corporation of India (NPCI)
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
  hero: { alignItems: "center", marginBottom: 24 * S },
  iconCircle: {
    width: 72 * S, height: 72 * S, borderRadius: 36 * S,
    backgroundColor: Colors.white, alignItems: "center", justifyContent: "center",
    marginBottom: 16 * S, elevation: 4, shadowColor: "#000", shadowOpacity: 0.08, shadowRadius: 12
  },
  heroTitle: { fontFamily: Fonts.Bold, fontSize: 24 * S, color: Colors.primary, marginBottom: 4 * S },
  heroSub: { fontFamily: Fonts.Medium, fontSize: 13 * S, color: Colors.gray_9E, textAlign: "center" },

  card: { backgroundColor: Colors.white, borderRadius: 24 * S, padding: 20 * S, elevation: 2, shadowColor: "#000", shadowOpacity: 0.05 },
  inputGroup: { marginBottom: 20 * S },
  label: { fontFamily: Fonts.Bold, fontSize: 10 * S, color: Colors.gray_75, marginBottom: 10 * S, letterSpacing: 0.5 },
  inputBox: {
    flexDirection: "row", alignItems: "center", height: 52 * S,
    backgroundColor: Colors.homebg, borderRadius: 16 * S, paddingHorizontal: 16 * S,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.03)"
  },
  inputBoxError: { borderColor: Colors.red + "50", backgroundColor: Colors.red + "05" },
  inputIcon: { marginRight: 12 * S },
  input: { flex: 1, fontFamily: Fonts.SemiBold, fontSize: 15 * S, color: Colors.primary, padding: 0 },

  deviceRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 * S },
  deviceBtn: {
    width: "48%", backgroundColor: Colors.homebg, borderRadius: 16 * S,
    padding: 12 * S, alignItems: "center", borderWidth: 1, borderColor: "rgba(0,0,0,0.03)"
  },
  deviceBtnActive: { borderColor: Colors.finance_accent, backgroundColor: Colors.finance_accent + "08" },
  devIconBox: { width: 36 * S, height: 36 * S, borderRadius: 10 * S, backgroundColor: Colors.white, alignItems: "center", justifyContent: "center", marginBottom: 8 * S },
  devIconBoxActive: { backgroundColor: Colors.finance_accent },
  devIcon: { fontSize: 18 * S },
  devLabel: { fontFamily: Fonts.Bold, fontSize: 11 * S, color: Colors.gray_75, textAlign: "center" },
  devLabelActive: { color: Colors.primary },

  infoBox: { flexDirection: "row", alignItems: "center", gap: 10 * S, marginTop: 12 * S, paddingHorizontal: 4 * S },
  infoDot: { width: 6 * S, height: 6 * S, borderRadius: 3 * S, backgroundColor: Colors.finance_accent },
  infoTxt: { fontFamily: Fonts.Medium, fontSize: 11 * S, color: Colors.gray_9E, flex: 1 },

  mainBtn: {
    backgroundColor: Colors.primary, height: 58 * S, borderRadius: 20 * S,
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    elevation: 8, shadowColor: Colors.primary, shadowOpacity: 0.3, shadowRadius: 15
  },
  mainBtnDisabled: { backgroundColor: Colors.gray_BD, shadowOpacity: 0 },
  mainBtnTxt: { fontFamily: Fonts.Bold, fontSize: 17 * S, color: Colors.white, letterSpacing: 0.5 },

  footerInfo: { fontFamily: Fonts.Bold, fontSize: 10 * S, color: Colors.gray_BD, textAlign: "center", marginTop: 32 * S, letterSpacing: 0.5, textTransform: "uppercase" },
  errorTxt: { fontFamily: Fonts.Light, color: Colors.red, fontSize: 10 * S, marginTop: 6 * S, fontWeight: "300", marginLeft: 4 * S }
});
