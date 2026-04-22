// AEPS_OnBoard.jsx — Rewritten with full RD Service device integration
// Reference: NewTwoFactorAepsActivity.java + RdService.js

import React, { useState, useRef, useEffect, useCallback } from "react";
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
    ScrollView,
    Platform,
    PermissionsAndroid,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Geolocation from '@react-native-community/geolocation';

import Colors from "../../../constants/Colors";
import Fonts from "../../../constants/Fonts";
import * as NavigationService from "../../../utils/NavigationService";
import { getAepsKycStatus, biometricKyc } from "../../../api/AuthApi";
import { AlertService } from "../../../componets/Alerts/CustomAlert";

import RD_BRIDGE, { RD_ERROR_CODES } from "./RDService";

// ─── Constants ────────────────────────────────────────────────────────────────
const { width: SW } = Dimensions.get("window");
const S = SW / 375;

const SCREENS = { HUB: 1, BIOMETRIC: 2, CAPTURING: 3 };

const GOLD = "#D4A843";
const GOLD_DIM = "rgba(212,168,67,0.15)";
const GOLD_BORDER = "rgba(212,168,67,0.25)";
const WHITE = "#FFFFFF";
const WHITE_05 = "rgba(255,255,255,0.05)";
const WHITE_10 = "rgba(255,255,255,0.10)";
const WHITE_30 = "rgba(255,255,255,0.30)";
const WHITE_50 = "rgba(255,255,255,0.50)";
const RED = "#F72F20";

// ─── Component ────────────────────────────────────────────────────────────────
const AEPS_OnBoard = () => {
    // ── State ──────────────────────────────────────────────────────────────
    const [screen, setScreen] = useState(SCREENS.HUB);
    const [loading, setLoading] = useState(false);
    const [aadhaar, setAadhaar] = useState("");
    const [statusData, setStatusData] = useState(null);

    // RD device state
    const [device, setDevice] = useState(null);
    const [showDeviceList, setShowDeviceList] = useState(false);
    const [rdState, setRdState] = useState({
        connected: false,
        scanning: false,
        capturing: false,
        port: null,
        deviceInfo: null,
        status: null,         // "READY" | "USED"
        error: null,
    });

    // Animations
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scanPulse = useRef(new Animated.Value(1)).current;
    const capturePulse = useRef(new Animated.Value(0)).current;
    const scanLoop = useRef(null);

    // ── Lifecycle ──────────────────────────────────────────────────────────
    useEffect(() => {
        checkInitialStatus();
        return () => scanLoop.current?.stop?.();
    }, []);

    useEffect(() => {
        if (rdState.scanning) startScanPulse();
        else scanPulse.setValue(1);
    }, [rdState.scanning]);

    // ── Animations ─────────────────────────────────────────────────────────
    const startScanPulse = () => {
        scanLoop.current = Animated.loop(
            Animated.sequence([
                Animated.timing(scanPulse, { toValue: 0.4, duration: 600, useNativeDriver: true }),
                Animated.timing(scanPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
            ])
        );
        scanLoop.current.start();
    };

    const flashCapture = () =>
        Animated.sequence([
            Animated.timing(capturePulse, { toValue: 1, duration: 120, useNativeDriver: true }),
            Animated.timing(capturePulse, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start();

    const transition = (toScreen) => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
            setScreen(toScreen);
            Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
        });
    };

    // ── API Calls ──────────────────────────────────────────────────────────
    const checkInitialStatus = async () => {
        setLoading(true);
        try {
            const headerToken = await AsyncStorage.getItem("header_token");
            const res = await getAepsKycStatus({ headerToken, idempotencyKey: `INIT_${Date.now()}` });
            if (res.success || res.status === "SUCCESS") {
                setStatusData(res.data);
                if (res.data?.action === "NO-ACTION-REQUIRED") {
                    NavigationService.navigate("DailyLogin");
                }
            }
        } catch (err) {
            console.warn("AEPS status init error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCheckStatus = async () => {
        setLoading(true);
        try {
            const headerToken = await AsyncStorage.getItem("header_token");
            const res = await getAepsKycStatus({ headerToken, idempotencyKey: `STATUS_${Date.now()}` });
            if (res.success || res.status === "SUCCESS") {
                setStatusData(res.data);
                if (res.data?.action === "NO-ACTION-REQUIRED") {
                    AlertService.showAlert({
                        type: "success",
                        title: "Authenticated",
                        message: res.data.message || res.message,
                        onClose: () => NavigationService.navigate("DailyLogin"),
                    });
                } else {
                    transition(SCREENS.BIOMETRIC);
                }
            } else {
                AlertService.showAlert({
                    type: "info",
                    title: "Action Required",
                    message: res.data?.message || res.message,
                    onClose: () => transition(SCREENS.BIOMETRIC),
                });
            }
        } catch {
            AlertService.showAlert({ type: "error", title: "Network Error", message: "Failed to reach server." });
        } finally {
            setLoading(false);
        }
    };

    // ── RD Device Discovery ────────────────────────────────────────────────
    const handleScanDevice = useCallback(async (selectedDevice = device) => {
        if (!selectedDevice) {
            setShowDeviceList(true);
            return;
        }

        setRdState((s) => ({ ...s, scanning: true, connected: false, error: null, deviceInfo: null }));

        try {
            const isInstalled = await RD_BRIDGE.isInstalled(selectedDevice);
            if (isInstalled) {
                setRdState({
                    connected: true,
                    scanning: false,
                    capturing: false,
                    port: "Native Bridge",
                    deviceInfo: RD_BRIDGE.getDeviceLabel(selectedDevice),
                    status: "READY",
                    error: null,
                });
            } else {
                setRdState((s) => ({
                    ...s,
                    scanning: false,
                    connected: false,
                    error: "RD Service app not found",
                }));
                AlertService.showAlert({
                    type: "warning",
                    title: "RD Service Missing",
                    message: `Please install the RD Service app for ${RD_BRIDGE.getDeviceLabel(selectedDevice)}.`,
                    onConfirm: () => RD_BRIDGE.openInstallPage(selectedDevice),
                });
            }
        } catch (err) {
            setRdState((s) => ({ ...s, scanning: false, error: "Native check failed" }));
        }
    }, [device]);

    const selectDevice = (item) => {
        setDevice(item.value);
        setShowDeviceList(false);
        handleScanDevice(item.value);
    };

    // ── Fingerprint Capture + KYC submit ──────────────────────────────────
    const handleCapture = async () => {
        if (aadhaar.length < 12) {
            AlertService.showAlert({ type: "warning", title: "Invalid Aadhaar", message: "Enter a valid 12-digit Aadhaar number." });
            return;
        }
        if (!rdState.connected) {
            AlertService.showAlert({ type: "warning", title: "No Device", message: "Please scan and connect your RD device first." });
            return;
        }

        try {
            setLoading(true);

            // ── 1. Request Location Permission (Android) ──
            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    AlertService.showAlert({ 
                        type: "error", 
                        title: "Permission Denied", 
                        message: "Location permission is required for AEPS onboarding." 
                    });
                    setLoading(false);
                    return;
                }
            }

            setRdState((s) => ({ ...s, capturing: true }));
            transition(SCREENS.CAPTURING);
            flashCapture();

            // ── 2. Build PidOptions XML with specific wadh ──────────────────
            const wadhValue = "E0jzJ/P8UopUHAieZn8CKqS4WPMi5ZSYXgfnlfkWjrc=";
            const pidOptString = '<PidOptions ver="1.0">'
                + `<Opts fCount="1" fType="2" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="20000" otp="" posh="UNKNOWN" env="P" wadh="${wadhValue}" />`
                + '<Demo></Demo>'
                + '<CustOpts></CustOpts>'
                + '</PidOptions>';

            // ── 3. Capture biometric PID from RD Service ────────────────────
            const pidDataXml = await RD_BRIDGE.capture(device, pidOptString);

            if (!pidDataXml) {
                throw { code: 'NO_PID', message: "No biometric data received from scanner." };
            }

            // ── 4. Get User Location ──────────────────────────────────────────
            const getLocation = () =>
                new Promise((resolve) => {
                    try {
                        const geo = Geolocation || (typeof navigator !== 'undefined' && navigator.geolocation);
                        
                        if (geo && typeof geo.getCurrentPosition === 'function') {
                            geo.getCurrentPosition(
                                (pos) => resolve(pos.coords),
                                (err) => {
                                    console.log("[GEOLOCATION] Error:", err);
                                    resolve({ latitude: 26.88978, longitude: 75.738251 });
                                },
                                { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
                            );
                        } else {
                            console.warn("[GEOLOCATION] Method not found, using fallback");
                            resolve({ latitude: 26.88978, longitude: 75.738251 });
                        }
                    } catch (e) {
                        console.warn("[GEOLOCATION] Exception:", e);
                        resolve({ latitude: 26.88978, longitude: 75.738251 });
                    }
                });
            
            const coords = await getLocation();

            // ── 5. Prepare and submit parsed PID + Aadhaar to backend KYC API ───
            const headerToken = await AsyncStorage.getItem("header_token");
            const headerKey = await AsyncStorage.getItem("header_key");
            const idempotencyKey = `KYC_${Date.now()}`;

            const payload = {
                aadhaarNumber: String(aadhaar),
                latitude: Number(coords.latitude),
                longitude: Number(coords.longitude),
                captureType: "finger",
                biometricData: RD_BRIDGE.parsePidXml(pidDataXml),
                // Include any reference from status check to prevent "reference key expired" error
                primaryKey: statusData?.primaryKey || statusData?.refId || statusData?.referenceKey,
                referenceKey: statusData?.referenceKey || statusData?.primaryKey,
            };

            const res = await biometricKyc({
                data: payload,
                headerToken,
                headerKey,
                idempotencyKey,
            });

            if (res.success || res.status === "SUCCESS") {
                AlertService.showAlert({
                    type: "success",
                    title: "KYC Complete",
                    message: res.message || "Biometric verification successful. Opening AEPS…",
                    onClose: () => NavigationService.navigate("DailyLogin"),
                });
            } else {
                // If reference key expired, refresh status in background for next attempt
                if (res.message?.toLowerCase().includes("expired") || res.message?.toLowerCase().includes("reference")) {
                    checkInitialStatus();
                }

                AlertService.showAlert({ 
                    type: "error", 
                    title: "KYC Failed", 
                    message: res.message || "Biometric verification rejected by server." 
                });
                transition(SCREENS.BIOMETRIC);
            }

        } catch (err) {
            let message = 'Fingerprint capture failed. Please try again.';

            switch (err?.code) {
                case RD_ERROR_CODES.NOT_INSTALLED:
                    message = `RD Service app is not installed for ${RD_BRIDGE.getDeviceLabel(device)}.`;
                    break;
                case RD_ERROR_CODES.CANCELLED:
                    message = 'Fingerprint capture was cancelled.';
                    break;
                case RD_ERROR_CODES.NO_PID:
                    message = err.message || 'No fingerprint data received. Please try again.';
                    break;
                case RD_ERROR_CODES.BUSY:
                    message = 'A fingerprint capture is already in progress.';
                    break;
                default:
                    message = err?.message || message;
            }

            AlertService.showAlert({ 
                type: "error", 
                title: "Verification Error", 
                message 
            });
            transition(SCREENS.BIOMETRIC);
        } finally {
            setLoading(false);
            setRdState((s) => ({ ...s, capturing: false }));
        }
    };

    // ──────────────────────────────────────────────────────────────────────
    // SCREEN 1 — Hub / Status Check
    // ──────────────────────────────────────────────────────────────────────
    const renderHub = () => (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Logo */}
            <View style={styles.logoWrap}>
                <View style={styles.logoRing}>
                    <View style={styles.logoBg}>
                        <Icon name="shield-key-outline" size={38 * S} color={GOLD} />
                    </View>
                </View>
                <View style={styles.logoDivider} />
            </View>

            <Text style={styles.eyebrow}>NPCI · DIGITAL GATEWAY</Text>
            <Text style={styles.title}>
                Aadhaar Enabled{"\n"}
                <Text style={{ color: GOLD }}>Payment System</Text>
            </Text>
            <Text style={styles.subtitle}>
                {statusData?.message || "Biometric Identity Verification Platform"}
            </Text>

            {/* Status card */}
            <View style={styles.statusCard}>
                <View style={styles.statusRow}>
                    <View style={[styles.dot, { backgroundColor: statusData ? GOLD : "#F59E0B" }]} />
                    <Text style={styles.statusLabel}>
                        {statusData?.action?.replace(/-/g, " ") || "ONBOARDING HUB"}
                    </Text>
                </View>
                <View style={styles.dividerThin} />
                <View style={styles.statusMetaRow}>
                    <View style={styles.metaItem}>
                        <Icon name="bank-outline" size={14} color={WHITE_30} />
                        <Text style={styles.metaText}>NPCI CERTIFIED</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Icon name="lock-outline" size={14} color={WHITE_30} />
                        <Text style={styles.metaText}>AES-256 SECURED</Text>
                    </View>
                    <View style={styles.metaItem}>
                        <Icon name="check-decagram-outline" size={14} color={WHITE_30} />
                        <Text style={styles.metaText}>ISO 19794</Text>
                    </View>
                </View>
            </View>

            {/* Primary CTA */}
            <TouchableOpacity
                style={[styles.btnPrimary, loading && styles.btnDisabled]}
                onPress={handleCheckStatus}
                disabled={loading}
                activeOpacity={0.85}
            >
                {loading ? (
                    <ActivityIndicator color={WHITE} />
                ) : (
                    <>
                        <Icon name="fingerprint" size={20} color={WHITE} style={styles.btnIcon} />
                        <Text style={styles.btnTxt}>Check Biometric Status</Text>
                    </>
                )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.linkBtn} onPress={() => NavigationService.navigate("AepsRegistration")}>
                <Text style={styles.linkTxt}>Return to Merchant Registration</Text>
            </TouchableOpacity>

            <View style={styles.footerBadge}>
                <Icon name="shield-check" size={12} color={WHITE_30} style={{ marginRight: 6 }} />
                <Text style={styles.footerTxt}>SYNCHRONIZED WITH NATIONAL PAYMENTS CORPORATION OF INDIA</Text>
            </View>
        </ScrollView>
    );

    // ──────────────────────────────────────────────────────────────────────
    // SCREEN 2 — Biometric / RD Device Setup
    // ──────────────────────────────────────────────────────────────────────
    const renderBiometric = () => (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Back */}
            <TouchableOpacity style={styles.backBtn} onPress={() => transition(SCREENS.HUB)}>
                <Icon name="arrow-left" size={20} color={WHITE_50} />
                <Text style={styles.backTxt}>Back to Hub</Text>
            </TouchableOpacity>

            {/* Header */}
            <View style={[styles.logoWrap, { marginTop: 10 * S }]}>
                <View style={styles.logoRing}>
                    <View style={[styles.logoBg, rdState.connected && styles.logoBgActive]}>
                        <Icon
                            name={rdState.connected ? "usb-port" : "lock-outline"}
                            size={36 * S}
                            color={rdState.connected ? GOLD : WHITE_50}
                        />
                    </View>
                </View>
            </View>

            <Text style={styles.title}>
                Biometric{" "}
                <Text style={{ color: GOLD }}>Gateway</Text>
            </Text>
            <Text style={styles.subtitle}>CONNECT · VERIFY · AUTHENTICATE</Text>

            {/* ── RD Device Panel ── */}
            <View style={styles.devicePanel}>
                <View style={styles.devicePanelHeader}>
                    <Icon name="usb" size={16} color={GOLD} />
                    <Text style={styles.devicePanelTitle}>RD DEVICE STATUS</Text>
                    <View style={[styles.statusPill, rdState.connected ? styles.pillGreen : rdState.error ? styles.pillRed : styles.pillAmber]}>
                        <Text style={styles.pillTxt}>
                            {rdState.connected ? "CONNECTED" : rdState.scanning ? "SCANNING…" : rdState.error ? "ERROR" : "OFFLINE"}
                        </Text>
                    </View>
                </View>

                {showDeviceList ? (
                    <View style={styles.devicePickerList}>
                        {RD_BRIDGE.DEVICE_LIST.map((item) => (
                            <TouchableOpacity
                                key={item.value}
                                style={[styles.deviceOption, device === item.value && styles.deviceOptionActive]}
                                onPress={() => selectDevice(item)}
                            >
                                <Text style={[styles.deviceOptionTxt, device === item.value && styles.deviceOptionTxtActive]}>
                                    {item.label}
                                </Text>
                                {device === item.value && <Icon name="check" size={18} color={GOLD} />}
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.closePickerBtn} onPress={() => setShowDeviceList(false)}>
                            <Text style={styles.closePickerTxt}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                ) : rdState.connected ? (
                    <View style={styles.deviceInfo}>
                        <View style={styles.deviceInfoRow}>
                            <Icon name="check-circle-outline" size={18} color="#22C55E" />
                            <Text style={styles.deviceInfoText}>{rdState.deviceInfo} Ready</Text>
                        </View>
                        <View style={styles.deviceInfoRow}>
                            <Icon name="usb-flash-drive-outline" size={18} color={GOLD} />
                            <Text style={styles.deviceInfoText}>Connection: {rdState.status}</Text>
                        </View>
                        <TouchableOpacity style={styles.rescanBtn} onPress={() => setShowDeviceList(true)}>
                            <Text style={styles.rescanTxt}>Change Device</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.deviceOffline}>
                        <Animated.View style={{ opacity: scanPulse }}>
                            <Icon name="radar" size={32 * S} color={rdState.scanning ? GOLD : WHITE_30} />
                        </Animated.View>
                        <Text style={styles.deviceOfflineText}>
                            {rdState.scanning
                                ? "Verifying RD Service..."
                                : rdState.error
                                    ? rdState.error
                                    : "Select your biometric scanner\nto continue"}
                        </Text>
                    </View>
                )}

                {!rdState.connected && !showDeviceList && (
                    <TouchableOpacity
                        style={[styles.btnScan, rdState.scanning && styles.btnDisabled]}
                        onPress={() => setShowDeviceList(true)}
                        disabled={rdState.scanning}
                        activeOpacity={0.85}
                    >
                        {rdState.scanning ? (
                            <ActivityIndicator color={WHITE} size="small" />
                        ) : (
                            <>
                                <Icon name="usb" size={18} color={WHITE} style={styles.btnIcon} />
                                <Text style={styles.btnTxt}>Select RD Device</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </View>

            {/* ── Aadhaar Input ── */}
            <View style={styles.fieldWrap}>
                <Text style={styles.fieldLabel}>MERCHANT AADHAAR NUMBER</Text>
                <View style={[styles.inputBox, aadhaar.length > 0 && styles.inputBoxActive]}>
                    <Icon name="card-account-details-outline" size={20} color={GOLD} style={{ marginRight: 12 }} />
                    <TextInput
                        style={styles.input}
                        value={aadhaar}
                        onChangeText={setAadhaar}
                        placeholder="Enter 12-digit Aadhaar"
                        placeholderTextColor="rgba(255,255,255,0.20)"
                        keyboardType="numeric"
                        maxLength={12}
                        returnKeyType="done"
                    />
                    {aadhaar.length === 12 && (
                        <Icon name="check-circle" size={18} color="#22C55E" />
                    )}
                </View>
                <Text style={styles.fieldHint}>
                    {aadhaar.length}/12 digits entered
                </Text>
            </View>

            {/* ── Capture CTA ── */}
            <TouchableOpacity
                style={[
                    styles.btnPrimary,
                    (!rdState.connected || aadhaar.length < 12) && styles.btnDisabled,
                ]}
                onPress={handleCapture}
                disabled={!rdState.connected || aadhaar.length < 12}
                activeOpacity={0.85}
            >
                <Icon name="fingerprint" size={22} color={WHITE} style={styles.btnIcon} />
                <Text style={styles.btnTxt}>Capture & Verify Biometric</Text>
            </TouchableOpacity>

            {/* ── Alert Banner ── */}
            <View style={[styles.alertBanner, rdState.connected && styles.alertBannerGreen]}>
                <View style={[styles.alertDot, rdState.connected && styles.alertDotGreen]} />
                <Text style={styles.alertTxt}>
                    {rdState.connected
                        ? `RD DEVICE READY · PORT ${rdState.port} · PLACE FINGER ON SCANNER TO CAPTURE`
                        : statusData?.message || "RD DEVICE NOT DETECTED · CONNECT BIOMETRIC SCANNER"}
                </Text>
            </View>

            {/* Supported devices */}
            <View style={styles.deviceSupport}>
                <Text style={styles.deviceSupportTitle}>SUPPORTED RD DEVICES</Text>
                <View style={styles.deviceSupportRow}>
                    {[
                        { icon: "gesture-tap", label: "Mantra\nMFS110" },
                        { icon: "hand-wave-outline", label: "Morpho\nMSO 1300" },
                        { icon: "fingerprint", label: "Startek\nFM220" },
                        { icon: "usb-port", label: "Other\nISO RD" },
                    ].map((d, i) => (
                        <View key={i} style={styles.deviceChip}>
                            <Icon name={d.icon} size={18} color={WHITE_30} />
                            <Text style={styles.deviceChipTxt}>{d.label}</Text>
                        </View>
                    ))}
                </View>
            </View>

            <TouchableOpacity
                style={styles.btnSecondary}
                onPress={() => NavigationService.navigate("AEPS1")}
            >
                <Text style={styles.btnSecondaryTxt}>Skip · Open AEPS Services</Text>
                <Icon name="chevron-right" size={16} color={WHITE_30} />
            </TouchableOpacity>
        </ScrollView>
    );

    // ──────────────────────────────────────────────────────────────────────
    // SCREEN 3 — Capturing (full-screen fingerprint animation)
    // ──────────────────────────────────────────────────────────────────────
    const renderCapturing = () => (
        <View style={styles.capturingFull}>
            <Animated.View
                style={[
                    styles.captureGlow,
                    {
                        opacity: capturePulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.6] }),
                        transform: [{ scale: capturePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.2] }) }],
                    },
                ]}
            />
            <View style={styles.captureIconBox}>
                <Icon name="fingerprint" size={72 * S} color={GOLD} />
            </View>
            <Text style={styles.capturingTitle}>Capturing Biometric</Text>
            <Text style={styles.capturingHint}>Keep your finger steady on the scanner</Text>
            <ActivityIndicator color={GOLD} size="large" style={{ marginTop: 30 * S }} />
        </View>
    );

    // ──────────────────────────────────────────────────────────────────────
    // Root render
    // ──────────────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.root} edges={["top"]}>
            <StatusBar barStyle="light-content" backgroundColor="#0D0C1A" />
            <LinearGradient colors={["#0D0C1A", "#13111E", "#0A0919"]} style={StyleSheet.absoluteFill} />

            <Animated.View style={[styles.flex, { opacity: fadeAnim }]}>
                {screen === SCREENS.HUB && renderHub()}
                {screen === SCREENS.BIOMETRIC && renderBiometric()}
                {screen === SCREENS.CAPTURING && renderCapturing()}
            </Animated.View>
        </SafeAreaView>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    root: { flex: 1 },
    flex: { flex: 1 },

    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 22 * S,
        paddingBottom: 36 * S,
        paddingTop: 24 * S,
        alignItems: "center",
    },

    // ── Logo
    logoWrap: { alignItems: "center", marginBottom: 22 * S },
    logoRing: {
        width: 100 * S,
        height: 100 * S,
        borderRadius: 50 * S,
        borderWidth: 1,
        borderColor: GOLD_BORDER,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(212,168,67,0.04)",
    },
    logoBg: {
        width: 76 * S,
        height: 76 * S,
        borderRadius: 38 * S,
        backgroundColor: GOLD_DIM,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: GOLD_BORDER,
    },
    logoBgActive: {
        backgroundColor: "rgba(212,168,67,0.25)",
        borderColor: GOLD,
    },
    logoDivider: {
        width: 40,
        height: 1,
        backgroundColor: GOLD_BORDER,
        marginTop: 20 * S,
    },

    // ── Typography
    eyebrow: {
        fontSize: 10,
        fontFamily: Fonts.Bold,
        color: "rgba(212,168,67,0.55)",
        letterSpacing: 3,
        marginBottom: 14 * S,
        textAlign: "center",
    },
    title: {
        fontSize: 30 * S,
        fontFamily: Fonts.Bold,
        color: WHITE,
        textAlign: "center",
        lineHeight: 38 * S,
        marginBottom: 12 * S,
    },
    subtitle: {
        fontSize: 12,
        fontFamily: Fonts.Medium,
        color: WHITE_30,
        textAlign: "center",
        letterSpacing: 1.5,
        marginBottom: 28 * S,
    },

    // ── Status Card
    statusCard: {
        width: "100%",
        backgroundColor: WHITE_05,
        borderRadius: 20,
        padding: 18 * S,
        borderWidth: 1,
        borderColor: WHITE_10,
        marginBottom: 32 * S,
    },
    statusRow: { flexDirection: "row", alignItems: "center", marginBottom: 14 * S },
    dot: { width: 7, height: 7, borderRadius: 4, marginRight: 10 },
    statusLabel: {
        fontSize: 12,
        fontFamily: Fonts.Bold,
        color: GOLD,
        letterSpacing: 1.5,
        flex: 1,
        textTransform: "uppercase",
    },
    dividerThin: { height: 1, backgroundColor: WHITE_05, marginBottom: 14 * S },
    statusMetaRow: { flexDirection: "row", justifyContent: "space-around" },
    metaItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    metaText: { fontSize: 9, fontFamily: Fonts.Bold, color: WHITE_30, letterSpacing: 1 },

    // ── Buttons
    btnPrimary: {
        width: "100%",
        height: 56 * S,
        borderRadius: 28,
        backgroundColor: GOLD,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 24 * S,
        elevation: 12,
        shadowColor: GOLD,
        shadowOpacity: 0.35,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
        marginBottom: 18 * S,
    },
    btnScan: {
        width: "100%",
        height: 48 * S,
        borderRadius: 24,
        backgroundColor: "rgba(212,168,67,0.18)",
        borderWidth: 1,
        borderColor: GOLD_BORDER,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 12 * S,
    },
    btnDisabled: { opacity: 0.4 },
    btnTxt: { fontSize: 15, fontFamily: Fonts.Bold, color: WHITE },
    btnIcon: { marginRight: 10 },

    btnSecondary: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14 * S,
        paddingHorizontal: 20 * S,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: WHITE_05,
        backgroundColor: WHITE_05,
        marginTop: 12 * S,
        gap: 8,
    },
    btnSecondaryTxt: { fontSize: 13, fontFamily: Fonts.Medium, color: WHITE_30 },

    linkBtn: { marginBottom: 28 * S },
    linkTxt: { fontSize: 13, fontFamily: Fonts.Medium, color: WHITE_30, textDecorationLine: "underline" },

    // ── Footer
    footerBadge: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 10 * S,
    },
    footerTxt: {
        fontSize: 9,
        fontFamily: Fonts.Bold,
        color: WHITE_30,
        letterSpacing: 0.8,
        textAlign: "center",
        lineHeight: 14,
    },

    // ── Back Button
    backBtn: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 6,
        marginBottom: 18 * S,
    },
    backTxt: { fontSize: 13, fontFamily: Fonts.Medium, color: WHITE_30 },

    // ── Device Panel
    devicePanel: {
        width: "100%",
        backgroundColor: WHITE_05,
        borderRadius: 20,
        padding: 18 * S,
        borderWidth: 1,
        borderColor: WHITE_10,
        marginBottom: 24 * S,
    },
    devicePanelHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 14 * S,
    },
    devicePanelTitle: {
        fontSize: 11,
        fontFamily: Fonts.Bold,
        color: WHITE_50,
        letterSpacing: 1.5,
        flex: 1,
    },
    statusPill: {
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 10,
    },
    pillGreen: { backgroundColor: "rgba(34,197,94,0.15)", borderWidth: 1, borderColor: "rgba(34,197,94,0.3)" },
    pillRed: { backgroundColor: "rgba(247,47,32,0.15)", borderWidth: 1, borderColor: "rgba(247,47,32,0.3)" },
    pillAmber: { backgroundColor: "rgba(245,158,11,0.15)", borderWidth: 1, borderColor: "rgba(245,158,11,0.3)" },
    pillTxt: { fontSize: 9, fontFamily: Fonts.Bold, color: WHITE_50, letterSpacing: 1 },

    deviceInfo: { gap: 10 },
    deviceInfoRow: { flexDirection: "row", alignItems: "center", gap: 10 },
    deviceInfoText: { fontSize: 13, fontFamily: Fonts.Medium, color: WHITE_50 },
    rescanBtn: { alignSelf: "flex-start", marginTop: 4 },
    rescanTxt: { fontSize: 12, fontFamily: Fonts.Bold, color: GOLD, textDecorationLine: "underline" },

    deviceOffline: { alignItems: "center", paddingVertical: 14 * S, gap: 10 },
    deviceOfflineText: {
        fontSize: 13,
        fontFamily: Fonts.Medium,
        color: WHITE_30,
        textAlign: "center",
        lineHeight: 20,
    },

    // ── Field
    fieldWrap: { width: "100%", marginBottom: 22 * S },
    fieldLabel: {
        fontSize: 10,
        fontFamily: Fonts.Bold,
        color: WHITE_30,
        letterSpacing: 1.5,
        marginBottom: 10,
        marginLeft: 4,
    },
    inputBox: {
        backgroundColor: "rgba(212,168,67,0.07)",
        height: 58 * S,
        borderRadius: 20,
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 18 * S,
        borderWidth: 1,
        borderColor: GOLD_BORDER,
    },
    inputBoxActive: { borderColor: GOLD, backgroundColor: GOLD_DIM },
    input: {
        flex: 1,
        color: WHITE,
        fontSize: 17,
        fontFamily: Fonts.Bold,
        letterSpacing: 2,
    },
    fieldHint: {
        fontSize: 10,
        fontFamily: Fonts.Medium,
        color: WHITE_30,
        marginTop: 6,
        marginLeft: 6,
    },

    // ── Alert Banner
    alertBanner: {
        width: "100%",
        backgroundColor: "rgba(0,0,0,0.2)",
        borderRadius: 16,
        padding: 14 * S,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: WHITE_05,
        marginBottom: 20 * S,
    },
    alertBannerGreen: { borderColor: "rgba(34,197,94,0.2)", backgroundColor: "rgba(34,197,94,0.05)" },
    alertDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#F59E0B", marginRight: 12, flexShrink: 0 },
    alertDotGreen: { backgroundColor: "#22C55E" },
    alertTxt: {
        flex: 1,
        fontSize: 10,
        fontFamily: Fonts.Bold,
        color: WHITE_30,
        lineHeight: 15,
        letterSpacing: 0.5,
    },

    // ── Device Support
    deviceSupport: { width: "100%", marginBottom: 20 * S },
    deviceSupportTitle: {
        fontSize: 10,
        fontFamily: Fonts.Bold,
        color: WHITE_30,
        letterSpacing: 1.5,
        marginBottom: 12,
        textAlign: "center",
    },
    deviceSupportRow: { flexDirection: "row", justifyContent: "space-between" },
    deviceChip: {
        flex: 1,
        alignItems: "center",
        gap: 6,
        paddingVertical: 12,
        backgroundColor: WHITE_05,
        borderRadius: 14,
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: WHITE_05,
    },
    deviceChipTxt: {
        fontSize: 9,
        fontFamily: Fonts.Bold,
        color: WHITE_30,
        textAlign: "center",
        letterSpacing: 0.5,
        lineHeight: 13,
    },

    // ── Capturing Screen
    capturingFull: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 30 * S,
    },
    captureGlow: {
        position: "absolute",
        width: 160 * S,
        height: 160 * S,
        borderRadius: 80 * S,
        backgroundColor: GOLD,
    },
    captureIconBox: {
        width: 130 * S,
        height: 130 * S,
        borderRadius: 65 * S,
        backgroundColor: GOLD_DIM,
        borderWidth: 2,
        borderColor: GOLD_BORDER,
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 28 * S,
    },
    capturingTitle: {
        fontSize: 24 * S,
        fontFamily: Fonts.Bold,
        color: WHITE,
        marginBottom: 10 * S,
    },
    capturingHint: {
        fontSize: 13,
        fontFamily: Fonts.Medium,
        color: WHITE_30,
        textAlign: "center",
        letterSpacing: 0.5,
    },

    // ── Device Picker
    devicePickerList: { width: "100%", paddingVertical: 10 },
    deviceOption: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingVertical: 14,
        paddingHorizontal: 18,
        backgroundColor: WHITE_05,
        borderRadius: 16,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: WHITE_10,
    },
    deviceOptionActive: { borderColor: GOLD, backgroundColor: GOLD_DIM },
    deviceOptionTxt: { fontSize: 14, fontFamily: Fonts.Medium, color: WHITE_30 },
    deviceOptionTxtActive: { fontFamily: Fonts.Bold, color: GOLD },
    closePickerBtn: { alignItems: "center", paddingVertical: 10, marginTop: 10 },
    closePickerTxt: { fontSize: 13, fontFamily: Fonts.Bold, color: RED, letterSpacing: 1 },
});

export default AEPS_OnBoard;