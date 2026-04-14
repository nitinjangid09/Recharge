import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    StatusBar,
    TextInput,
    ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";
import Colors from "../../../constants/Colors";
import Fonts from "../../../constants/Fonts";
import * as NavigationService from "../../../utils/NavigationService";
import { getAepsKycStatus, biometricKyc } from "../../../api/AuthApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AlertService } from "../../../componets/Alerts/CustomAlert";

const { width: SW } = Dimensions.get("window");
const S = SW / 375;

const AEPS_OnBoard = () => {
    const [currentScreen, setCurrentScreen] = useState(1);
    const [loading, setLoading] = useState(false);
    const [aadhaarNumber, setAadhaarNumber] = useState("");
    const [statusData, setStatusData] = useState(null);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        checkInitialStatus();
    }, []);

    const checkInitialStatus = async () => {
        setLoading(true);
        try {
            const headerToken = await AsyncStorage.getItem("header_token");
            const idempotencyKey = `INIT_${Date.now()}`;
            const res = await getAepsKycStatus({ headerToken, idempotencyKey });
            if (res.success || res.status === "SUCCESS") {
                setStatusData(res.data);
                if (res.data?.action === "NO-ACTION-REQUIRED") {
                    NavigationService.navigate("AEPS_Services");
                }
            }
        } catch (err) {
            console.log("Status Init Error:", err);
        } finally {
            setLoading(false);
        }
    };

    const goTo = (screen) => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
            setCurrentScreen(screen);
            Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
        });
    };

    const handleCheckStatus = async () => {
        setLoading(true);
        try {
            const headerToken = await AsyncStorage.getItem("header_token");
            const idempotencyKey = `STATUS_${Date.now()}`;
            const res = await getAepsKycStatus({ headerToken, idempotencyKey });

            if (res.success || res.status === "SUCCESS") {
                setStatusData(res.data);
                if (res.data?.action === "NO-ACTION-REQUIRED") {
                    AlertService.showAlert({
                        type: "success",
                        title: "Authenticated",
                        message: res.data.message || res.message,
                        onClose: () => NavigationService.navigate("AEPS_Services")
                    });
                } else {
                    goTo(2);
                }
            } else {
                AlertService.showAlert({
                    type: "info",
                    title: "Action Required",
                    message: res.data?.message || res.message,
                    onClose: () => goTo(2)
                });
            }
        } catch (error) {
            AlertService.showAlert({ type: "error", title: "Network Error", message: "Failed to connect to server." });
        } finally {
            setLoading(false);
        }
    };

    const handleDetectDevice = async () => {
        if (aadhaarNumber.length < 12) {
            AlertService.showAlert({ type: "warning", title: "Invalid Aadhaar", message: "Please enter a valid 12-digit Aadhaar number." });
            return;
        }

        setLoading(true);
        try {
            const headerToken = await AsyncStorage.getItem("header_token");
            const idempotencyKey = `KYC_${Date.now()}`;
            const res = await biometricKyc({
                data: { aadhaarNumber },
                headerToken,
                idempotencyKey
            });

            if (res.success || res.status === "SUCCESS") {
                AlertService.showAlert({
                    type: "success",
                    title: "Activation Successful",
                    message: "Biometric KYC completed. Accessing Dashboard...",
                    onClose: () => NavigationService.navigate("AEPS_Services")
                });
            } else {
                AlertService.showAlert({ type: "error", title: "Activation Failed", message: res.message || "Could not synchronize with RD service." });
            }
        } catch (error) {
            AlertService.showAlert({ type: "error", title: "System Error", message: "Verification failed. Check your scanner connection." });
        } finally {
            setLoading(false);
        }
    };

    // ── SCREEN 1: SPLASH (Match Image Data) ──
    const renderSplash = () => (
        <LinearGradient colors={["#1A1A2E", "#0F0E0D"]} style={styles.screenFull}>
            <View style={styles.splashContent}>
                <View style={[styles.logoBox, { borderRadius: 40, width: 90 * S, height: 90 * S }]}>
                    <Icon name="orbit" size={45} color={Colors.finance_accent} />
                </View>
                <Text style={styles.splashEyebrow}>NPCI DIGITAL GATEWAY</Text>
                <Text style={styles.splashTitle}>
                    Aadhaar Enabled{"\n"}
                    <Text style={{ color: Colors.finance_accent }}>Payment System</Text>
                </Text>
                <Text style={styles.splashSub}>
                    {statusData?.message || "Modernized Biometric Authentication Gateway"}
                </Text>

                <View style={styles.statusCard}>
                    <View style={styles.statusBadge}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusBadgeTxt}>
                            {statusData?.action?.replace(/-/g, " ") || "ONBOARDING HUB"}
                        </Text>
                    </View>
                    <Text style={styles.statusMsg}>
                        {statusData?.message ? "SYSTEM SYNCHRONIZED" : "HARDWARE SYNCHRONIZATION PENDING"}
                    </Text>
                </View>

                <TouchableOpacity style={styles.btnPrimary} onPress={handleCheckStatus} disabled={loading}>
                    {loading ? (
                        <ActivityIndicator color={Colors.white} />
                    ) : (
                        <>
                            <Icon name="fingerprint" size={20} color={Colors.white} style={{ marginRight: 10 }} />
                            <Text style={styles.btnTxt}>Check Biometric Status</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={{ marginTop: 25 }} onPress={() => NavigationService.navigate("AepsRegistration")}>
                    <Text style={styles.secondaryBtnTxt}>Return to Merchant Details</Text>
                </TouchableOpacity>

                <View style={styles.splashFooter}>
                    <Text style={styles.footerInfo}>
                        SYNCHRONIZING WITH NATIONAL PAYMENTS{"\n"}
                        CORPORATION OF INDIA
                    </Text>
                </View>
            </View>
        </LinearGradient>
    );

    // ── SCREEN 2: BIOMETRIC DETECTION (Match 2nd Image Data) ──
    const renderBiometricCheck = () => (
        <LinearGradient colors={["#1A1A2E", "#0F0E0D"]} style={styles.screenFull}>
            <View style={styles.splashContent}>
                <View style={[styles.logoBox, { borderRadius: 40, width: 80 * S, height: 80 * S, marginBottom: 25 }]}>
                    <Icon name="lock-outline" size={40} color={Colors.finance_accent} />
                </View>

                <Text style={styles.splashTitle}>
                    Portal{" "}
                    <Text style={{ color: Colors.finance_accent }}>Access</Text>
                </Text>
                <Text style={[styles.splashSub, { marginBottom: 30 }]}>
                    SECURE BIOMETRIC GATEWAY
                </Text>

                <View style={styles.fieldWrap}>
                    <Text style={styles.fieldLabel}>MERCHANT AADHAAR NUMBER</Text>
                    <View style={styles.aadhaarBox}>
                        <Icon name="fingerprint" size={20} color={Colors.finance_accent} style={{ marginRight: 12 }} />
                        <TextInput
                            style={styles.aadhaarInput}
                            value={aadhaarNumber}
                            onChangeText={setAadhaarNumber}
                            placeholder="Enter 12 digit Aadhaar"
                            placeholderTextColor="rgba(255,255,255,0.2)"
                            keyboardType="numeric"
                            maxLength={12}
                        />
                    </View>
                </View>

                <View style={styles.detectRow}>
                    <TouchableOpacity
                        style={[styles.btnPrimary, { flex: 1 }]}
                        onPress={handleDetectDevice}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <>
                                <Icon name="magnify" size={20} color={Colors.white} style={{ marginRight: 10 }} />
                                <Text style={styles.btnTxt}>Detect RD Device</Text>
                            </>
                        )}
                    </TouchableOpacity>
                    <View style={styles.waitBox}>
                        <Text style={styles.waitTxt}>WAITING{"\n"}SYNC</Text>
                    </View>
                </View>

                <View style={styles.alertBanner}>
                    <View style={styles.alertDot} />
                    <Text style={styles.alertTxt}>
                        {statusData?.message || "RD DEVICE NOT DETECTED · CONNECT BIOMETRIC SCANNER"}
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.btnSecondaryFull}
                    onPress={() => NavigationService.navigate("AEPS_Services")}
                >
                    <Text style={styles.btnSecondaryTxt}>Open AEPS Services</Text>
                    <Icon name="chevron-right" size={18} color="rgba(255,255,255,0.4)" />
                </TouchableOpacity>

                <TouchableOpacity style={{ marginTop: 25 }} onPress={() => goTo(1)}>
                    <Text style={styles.secondaryBtnTxt}>Back to Hub</Text>
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />
            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                {currentScreen === 1 && renderSplash()}
                {currentScreen === 2 && renderBiometricCheck()}
            </Animated.View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    screenFull: { flex: 1, justifyContent: "center" },
    splashContent: { padding: 25 * S, alignItems: "center" },
    logoBox: { width: 80 * S, height: 80 * S, borderRadius: 24, backgroundColor: "rgba(212,168,67,0.1)", alignItems: "center", justifyContent: "center", marginBottom: 30 * S, borderWidth: 1, borderColor: "rgba(212,168,67,0.3)" },
    splashEyebrow: { color: "rgba(212,168,67,0.6)", fontSize: 12, fontFamily: Fonts.Bold, letterSpacing: 2, marginBottom: 15 },
    splashTitle: { color: Colors.white, fontSize: 32 * S, fontFamily: Fonts.Bold, textAlign: "center", lineHeight: 40 * S, marginBottom: 15 },
    splashSub: { color: "rgba(255,255,255,0.45)", fontSize: 13, textAlign: "center", lineHeight: 20, marginBottom: 40 * S },
    statusCard: { backgroundColor: "rgba(255,255,255,0.03)", borderRadius: 24, padding: 20 * S, width: '100%', alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.05)", marginBottom: 40 * S },
    statusBadge: { flexDirection: "row", alignItems: "center", backgroundColor: "rgba(212,168,67,0.1)", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginBottom: 10 },
    statusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.finance_accent, marginRight: 8 },
    statusBadgeTxt: { fontSize: 11, fontFamily: Fonts.Bold, color: Colors.finance_accent, letterSpacing: 1 },
    statusMsg: { color: "rgba(255,255,255,0.5)", fontSize: 10, fontFamily: Fonts.Bold, textAlign: "center", letterSpacing: 1 },
    fieldWrap: { width: '100%', marginBottom: 30 * S },
    fieldLabel: { color: "rgba(255,255,255,0.4)", fontSize: 10, fontFamily: Fonts.Bold, letterSpacing: 1, marginBottom: 12, marginLeft: 5 },
    aadhaarBox: { backgroundColor: "rgba(212,168,67,0.1)", height: 60 * S, borderRadius: 24, flexDirection: "row", alignItems: "center", paddingHorizontal: 20 * S, borderWidth: 1, borderColor: "rgba(212,168,67,0.2)" },
    aadhaarInput: { flex: 1, color: Colors.white, fontSize: 16, fontFamily: Fonts.Bold, letterSpacing: 1 },
    detectRow: { flexDirection: "row", alignItems: "center", width: '100%', gap: 15, marginBottom: 30 * S },
    waitBox: { width: 60 * S, alignItems: "center" },
    waitTxt: { color: "rgba(255,255,255,0.3)", fontSize: 9, fontFamily: Fonts.Bold, textAlign: "center", letterSpacing: 1 },
    alertBanner: { backgroundColor: "rgba(0,0,0,0.2)", width: '100%', padding: 18 * S, borderRadius: 20, flexDirection: "row", alignItems: 'center', borderWidth: 1, borderColor: "rgba(255,255,255,0.05)" },
    alertDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#F59E0B", marginRight: 12 },
    alertTxt: { flex: 1, color: "rgba(255,255,255,0.5)", fontSize: 10 * S, fontFamily: Fonts.Bold, lineHeight: 14 },
    btnPrimary: { backgroundColor: Colors.finance_accent, height: 56 * S, borderRadius: 28, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingHorizontal: 25 * S, elevation: 10, shadowColor: Colors.finance_accent, shadowOpacity: 0.3, shadowRadius: 15 },
    btnTxt: { fontSize: 15, fontFamily: Fonts.Bold, color: Colors.white },

    btnSecondaryFull: { width: '100%', height: 50 * S, borderRadius: 20, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)", flexDirection: "row", alignItems: "center", justifyContent: "center", marginTop: 20 * S, backgroundColor: 'rgba(255,255,255,0.02)' },
    btnSecondaryTxt: { fontSize: 13, fontFamily: Fonts.Bold, color: "rgba(255,255,255,0.7)", marginRight: 5 },

    secondaryBtnTxt: { fontSize: 13, fontFamily: Fonts.Bold, color: "rgba(255,255,255,0.35)" },
    splashFooter: { marginTop: 40 * S },
    footerInfo: { fontSize: 9, fontFamily: Fonts.Bold, color: "rgba(255,255,255,0.25)", letterSpacing: 1, textAlign: 'center', lineHeight: 14 },
});

export default AEPS_OnBoard;