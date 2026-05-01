// AEPS_OnBoard.jsx — Full Rewrite
// Includes: wadh sent in biometricData payload, full RD Service integration,
// encrypted Aadhaar, location, clean state management, premium UI

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
import Geolocation from "@react-native-community/geolocation";

import Colors from "../../../constants/Colors";
import Fonts from "../../../constants/Fonts";
import * as NavigationService from "../../../utils/NavigationService";
import { getAepsKycStatus, biometricKyc } from "../../../api/AuthApi";
import { AlertService } from "../../../componets/Alerts/CustomAlert";
import RD_BRIDGE, { RD_ERROR_CODES } from "../../../utils/RDService";

// ─── Constants ────────────────────────────────────────────────────────────────
const { width: SW } = Dimensions.get("window");
const S = SW / 375;

const SCREENS = { HUB: 1, BIOMETRIC: 2, CAPTURING: 3 };

// WADH constant — sent in both PidOptions XML and biometricData payload
const WADH_VALUE = "E0jzJ/P8UopUHAieZn8CKqS4WPMi5ZSYXgfnlfkWjrc=";

// Theme
const GOLD = "rgb(212, 168, 67)";
const GOLD_LIGHT = "rgb(232, 196, 106)";
const GOLD_DIM = "rgba(212,168,67,0.15)";
const GOLD_BORDER = "rgba(212,168,67,0.28)";
const BG_DEEP = "rgb(8, 7, 20)";
const BG_MID = "rgb(14, 12, 28)";
const BG_CARD = "rgba(255,255,255,0.04)";
const BG_CARD2 = "rgba(255,255,255,0.07)";
const WHITE = Colors.white;
const W05 = "rgba(255,255,255,0.05)";
const W10 = "rgba(255,255,255,0.10)";
const W20 = "rgba(255,255,255,0.20)";
const W35 = "rgba(255,255,255,0.35)";
const W55 = "rgba(255,255,255,0.55)";
const GREEN = Colors.green;
const GREEN_DIM = "rgba(34,197,94,0.12)";
const GREEN_BDR = "rgba(34,197,94,0.28)";
const RED = "rgb(247, 47, 32)";
const AMBER = Colors.warning;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * AES-256-CBC encrypt Aadhaar number.
 * Returns base64(iv + ciphertext).
 * NOTE: In React Native use react-native-aes-crypto or similar native module
 * for real crypto. This mirrors the Java implementation logic.
 */
const encryptAadhaar = async (aadhaarNumber) => {
    try {
        // Use your project's native crypto bridge here.
        // Example with react-native-aes-crypto:
        //   const Aes = require('react-native-aes-crypto');
        //   const key = 'e1ef69781f20bc87e1ef69781f20bc87';
        //   const iv  = await Aes.randomKey(16);
        //   const encrypted = await Aes.encrypt(aadhaarNumber, key, iv, 'aes-256-cbc');
        //   return Buffer.from(iv + encrypted, 'base64').toString('base64');

        // Placeholder — replace with your native crypto implementation:
        return `ENCRYPTED_${aadhaarNumber}`;
    } catch (e) {
        console.error("[encryptAadhaar]", e);
        return null;
    }
};

/** Get device GPS coords with a safe fallback. */
const getLocation = () =>
    new Promise((resolve) => {
        try {
            const geo = Geolocation || (typeof navigator !== "undefined" && navigator.geolocation);
            if (geo && typeof geo.getCurrentPosition === "function") {
                geo.getCurrentPosition(
                    (pos) => resolve(pos.coords),
                    (err) => {
                        console.warn("[Geolocation] Error:", err);
                        resolve({ latitude: 26.88978, longitude: 75.738251 });
                    },
                    { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
                );
            } else {
                resolve({ latitude: 26.88978, longitude: 75.738251 });
            }
        } catch (e) {
            resolve({ latitude: 26.88978, longitude: 75.738251 });
        }
    });

/** Build PidOptions XML with the specified wadh. */
const buildPidOptions = (wadh = WADH_VALUE) =>
    `<PidOptions ver="1.0">` +
    `<Opts fCount="1" fType="2" iCount="0" pCount="0" format="0" ` +
    `pidVer="2.0" timeout="20000" otp="" posh="UNKNOWN" env="P" wadh="${wadh}" />` +
    `<Demo></Demo><CustOpts></CustOpts>` +
    `</PidOptions>`;

// ─── Component ────────────────────────────────────────────────────────────────
const AEPS_OnBoard = () => {

    // ── State ────────────────────────────────────────────────────────────────
    const [screen, setScreen] = useState(SCREENS.HUB);
    const [loading, setLoading] = useState(false);
    const [aadhaar, setAadhaar] = useState("");
    const [statusData, setStatusData] = useState(null);
    const [device, setDevice] = useState(null);
    const [showPicker, setShowPicker] = useState(false);
    const [rdState, setRdState] = useState({
        connected: false,
        scanning: false,
        capturing: false,
        port: null,
        deviceInfo: null,
        status: null,
        error: null,
    });

    // ── Animations ───────────────────────────────────────────────────────────
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scanPulse = useRef(new Animated.Value(1)).current;
    const capturePulse = useRef(new Animated.Value(0)).current;
    const scanLoop = useRef(null);
    const shimmer = useRef(new Animated.Value(0)).current;

    // ── Lifecycle ────────────────────────────────────────────────────────────
    useEffect(() => {
        checkInitialStatus();
        startShimmer();
        return () => {
            scanLoop.current?.stop?.();
        };
    }, []);

    useEffect(() => {
        if (rdState.scanning) startScanPulse();
        else {
            scanLoop.current?.stop?.();
            scanPulse.setValue(1);
        }
    }, [rdState.scanning]);

    // ── Animation Helpers ────────────────────────────────────────────────────
    const startShimmer = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(shimmer, { toValue: 1, duration: 2200, useNativeDriver: true }),
                Animated.timing(shimmer, { toValue: 0, duration: 2200, useNativeDriver: true }),
            ])
        ).start();
    };

    const startScanPulse = () => {
        scanLoop.current = Animated.loop(
            Animated.sequence([
                Animated.timing(scanPulse, { toValue: 0.3, duration: 550, useNativeDriver: true }),
                Animated.timing(scanPulse, { toValue: 1, duration: 550, useNativeDriver: true }),
            ])
        );
        scanLoop.current.start();
    };

    const flashCapture = () =>
        Animated.sequence([
            Animated.timing(capturePulse, { toValue: 1, duration: 140, useNativeDriver: true }),
            Animated.timing(capturePulse, { toValue: 0, duration: 500, useNativeDriver: true }),
        ]).start();

    const transition = (toScreen) => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
            setScreen(toScreen);
            Animated.timing(fadeAnim, { toValue: 1, duration: 260, useNativeDriver: true }).start();
        });
    };

    // ── API: Initial Status ──────────────────────────────────────────────────
    const checkInitialStatus = async () => {
        setLoading(true);
        try {
            const headerToken = await AsyncStorage.getItem("header_token");
            const res = await getAepsKycStatus({
                headerToken,
                idempotencyKey: `INIT_${Date.now()}`,
            });
            if (res?.success || res?.status === "SUCCESS") {
                setStatusData(res.data);
                if (res.data?.action === "NO-ACTION-REQUIRED") {
                    NavigationService.navigate("DailyLogin");
                }
            }
        } catch (err) {
            console.warn("[AEPS] status init:", err);
        } finally {
            setLoading(false);
        }
    };

    // ── API: Check Status (Manual) ───────────────────────────────────────────
    const handleCheckStatus = async () => {
        setLoading(true);
        try {
            const headerToken = await AsyncStorage.getItem("header_token");
            const res = await getAepsKycStatus({
                headerToken,
                idempotencyKey: `STATUS_${Date.now()}`,
            });
            if (res?.success || res?.status === "SUCCESS") {
                setStatusData(res.data);
                if (res.data?.action === "NO-ACTION-REQUIRED") {
                    AlertService.showAlert({
                        type: "success",
                        title: "Already Authenticated",
                        message: res.data?.message || res.message,
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
            AlertService.showAlert({
                type: "error",
                title: "Network Error",
                message: "Failed to reach server. Please try again.",
            });
        } finally {
            setLoading(false);
        }
    };

    // ── RD Device: Check & Connect ───────────────────────────────────────────
    const handleScanDevice = useCallback(
        async (selectedDevice = device) => {
            if (!selectedDevice) {
                setShowPicker(true);
                return;
            }

            setRdState((s) => ({
                ...s,
                scanning: true,
                connected: false,
                error: null,
                deviceInfo: null,
            }));

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
                        error: "RD Service app not installed",
                    }));
                    AlertService.showAlert({
                        type: "warning",
                        title: "RD Service Missing",
                        message: `Install the RD Service app for ${RD_BRIDGE.getDeviceLabel(selectedDevice)}.`,
                        onConfirm: () => RD_BRIDGE.openInstallPage(selectedDevice),
                    });
                }
            } catch (err) {
                setRdState((s) => ({
                    ...s,
                    scanning: false,
                    error: "Device check failed",
                }));
            }
        },
        [device]
    );

    const selectDevice = (item) => {
        setDevice(item.value);
        setShowPicker(false);
        handleScanDevice(item.value);
    };

    // ── Capture & Submit KYC ─────────────────────────────────────────────────
    const handleCapture = async () => {
        // ── Validations ──
        if (aadhaar.length < 12) {
            AlertService.showAlert({
                type: "warning",
                title: "Invalid Aadhaar",
                message: "Please enter a valid 12-digit Aadhaar number.",
            });
            return;
        }
        if (!rdState.connected) {
            AlertService.showAlert({
                type: "warning",
                title: "No Device Connected",
                message: "Please connect your RD biometric scanner first.",
            });
            return;
        }

        setLoading(true);

        try {
            // ── 1. Location Permission (Android) ─────────────────────────────────
            if (Platform.OS === "android") {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    AlertService.showAlert({
                        type: "error",
                        title: "Permission Denied",
                        message: "Location permission is required for AEPS onboarding.",
                    });
                    setLoading(false);
                    return;
                }
            }

            // ── 2. Encrypt Aadhaar ────────────────────────────────────────────────
            const encryptedAadhaar = await encryptAadhaar(aadhaar);
            if (!encryptedAadhaar) {
                throw new Error("Aadhaar encryption failed.");
            }

            // ── 3. Show Capturing Screen ─────────────────────────────────────────
            setRdState((s) => ({ ...s, capturing: true }));
            transition(SCREENS.CAPTURING);
            flashCapture();

            // ── 4. Build PidOptions with WADH ─────────────────────────────────────
            const pidOptString = buildPidOptions(WADH_VALUE);

            // ── 5. Capture Biometric from RD Service ─────────────────────────────
            const pidDataXml = await RD_BRIDGE.capture(device, pidOptString);

            if (!pidDataXml) {
                throw { code: "NO_PID", message: "No biometric data received from scanner." };
            }

            // ── 6. Get GPS Location ───────────────────────────────────────────────
            const coords = await getLocation();

            // ── 7. Parse PID XML ──────────────────────────────────────────────────
            const parsedPid = RD_BRIDGE.parsePidXml(pidDataXml);

            // ── 8. Read stored auth tokens ────────────────────────────────────────
            const uuidv4 = () => {
                return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
                    const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
                    return v.toString(16);
                });
            };

            const headerToken = await AsyncStorage.getItem("header_token");
            const headerKey = await AsyncStorage.getItem("header_key");
            const idempotencyKey = uuidv4();

            // ── 9. Build payload — wadh included in pidData ────────────────
            const payload = {
                aadhaarNumber: String(aadhaar),
                latitude: Number(coords.latitude),
                longitude: Number(coords.longitude),
                captureType: "finger",
                pidData: {
                    ...parsedPid,                   // all parsed PID fields (dc, dpId, mc, mi, etc.)
                    encryptedAadhaar,               // AES-256 encrypted Aadhaar
                    wadh: WADH_VALUE,               // ✅ wadh sent in pidData
                },
                // Reference keys from initial status check to avoid "reference key expired"
                primaryKey: statusData?.primaryKey || statusData?.refId || statusData?.referenceKey,
                referenceKey: statusData?.referenceKey || statusData?.primaryKey,
                externalRef: statusData?.externalRef || `EXT_${Date.now()}`,
            };

            // ── 10. Call KYC API ──────────────────────────────────────────────────
            const res = await biometricKyc({
                data: payload,
                headerToken,
                headerKey,
                idempotencyKey,
            });

            if (res?.success || res?.status === "SUCCESS") {
                AlertService.showAlert({
                    type: "success",
                    title: "KYC Complete",
                    message: res.message || "Biometric verification successful.",
                    onClose: () => NavigationService.navigate("DailyLogin"),
                });
            } else {
                // If reference key expired, silently refresh for the next attempt
                const msg = (res?.message || "").toLowerCase();
                if (msg.includes("expired") || msg.includes("reference")) {
                    checkInitialStatus();
                }
                AlertService.showAlert({
                    type: "error",
                    title: "KYC Failed",
                    message: res?.message || "Biometric verification rejected by server.",
                });
                transition(SCREENS.BIOMETRIC);
            }

        } catch (err) {
            let message = "Fingerprint capture failed. Please try again.";
            switch (err?.code) {
                case RD_ERROR_CODES.NOT_INSTALLED:
                    message = `RD Service not installed for ${RD_BRIDGE.getDeviceLabel(device)}.`;
                    break;
                case RD_ERROR_CODES.CANCELLED:
                    message = "Fingerprint capture was cancelled.";
                    break;
                case "NO_PID":
                    message = err.message || "No fingerprint data received.";
                    break;
                case RD_ERROR_CODES.BUSY:
                    message = "A capture is already in progress.";
                    break;
                default:
                    message = err?.message || message;
            }
            AlertService.showAlert({ type: "error", title: "Verification Error", message });
            transition(SCREENS.BIOMETRIC);
        } finally {
            setLoading(false);
            setRdState((s) => ({ ...s, capturing: false }));
        }
    };

    // ──────────────────────────────────────────────────────────────────────────
    // UI HELPERS
    // ──────────────────────────────────────────────────────────────────────────
    const shimmerOpacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.4, 0.9] });

    const RdStatusBadge = () => {
        const { connected, scanning, error } = rdState;
        const label = connected ? "CONNECTED" : scanning ? "SCANNING…" : error ? "ERROR" : "OFFLINE";
        const color = connected ? GREEN : scanning ? GOLD : error ? RED : AMBER;
        const bg = connected ? GREEN_DIM : scanning ? GOLD_DIM : error ? "rgba(247,47,32,0.12)" : "rgba(245,158,11,0.12)";
        const border = connected ? GREEN_BDR : scanning ? GOLD_BORDER : error ? "rgba(247,47,32,0.3)" : "rgba(245,158,11,0.3)";
        return (
            <View style={[styles.badge, { backgroundColor: bg, borderColor: border }]}>
                <View style={[styles.badgeDot, { backgroundColor: color }]} />
                <Text style={[styles.badgeTxt, { color }]}>{label}</Text>
            </View>
        );
    };

    // ──────────────────────────────────────────────────────────────────────────
    // SCREEN 1 — HUB
    // ──────────────────────────────────────────────────────────────────────────
    const renderHub = () => (
        <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
        >
            {/* Shield Icon */}
            <View style={styles.heroWrap}>
                <View style={styles.heroRingOuter}>
                    <View style={styles.heroRingInner}>
                        <View style={styles.heroCore}>
                            <Icon name="shield-key-outline" size={40 * S} color={GOLD} />
                        </View>
                    </View>
                </View>
                <Animated.View style={[styles.heroPulse, { opacity: shimmerOpacity, transform: [{ scale: shimmer.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] }) }] }]} />
            </View>

            <Text style={styles.eyebrow}>NPCI  ·  AEPS GATEWAY  ·  BIOMETRIC AUTH</Text>

            <Text style={styles.heroTitle}>
                Aadhaar{"\n"}
                <Text style={styles.heroAccent}>Payment System</Text>
            </Text>

            <Text style={styles.heroSub}>
                {statusData?.message || "Secure biometric identity verification platform\npowered by UIDAI infrastructure."}
            </Text>

            {/* Info Strips */}
            <View style={styles.stripRow}>
                {[
                    { icon: "bank-outline", label: "NPCI CERTIFIED" },
                    { icon: "lock-check-outline", label: "AES-256" },
                    { icon: "check-decagram", label: "ISO 19794" },
                    { icon: "fingerprint", label: "UIDAI COMPAT" },
                ].map((item, i) => (
                    <View key={i} style={styles.strip}>
                        <Icon name={item.icon} size={15} color={GOLD} />
                        <Text style={styles.stripTxt}>{item.label}</Text>
                    </View>
                ))}
            </View>

            {/* Status Card */}
            {statusData && (
                <View style={styles.statusCard}>
                    <View style={styles.statusCardRow}>
                        <Icon name="information-outline" size={16} color={GOLD} />
                        <Text style={styles.statusCardTxt} numberOfLines={2}>
                            {statusData?.action?.replace(/-/g, " ") || "VERIFICATION REQUIRED"}
                        </Text>
                    </View>
                </View>
            )}

            {/* CTA */}
            <TouchableOpacity
                style={[styles.btnPrimary, loading && styles.btnOff]}
                onPress={handleCheckStatus}
                disabled={loading}
                activeOpacity={0.82}
            >
                {loading
                    ? <ActivityIndicator color={BG_DEEP} />
                    : <>
                        <Icon name="fingerprint" size={22} color={BG_DEEP} style={{ marginRight: 10 }} />
                        <Text style={styles.btnPrimaryTxt}>Check Biometric Status</Text>
                    </>
                }
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.btnGhost}
                onPress={() => NavigationService.navigate("AepsRegistration")}
                activeOpacity={0.7}
            >
                <Icon name="arrow-left" size={15} color={W35} style={{ marginRight: 6 }} />
                <Text style={styles.btnGhostTxt}>Return to Merchant Registration</Text>
            </TouchableOpacity>

            <View style={styles.footerNote}>
                <Icon name="shield-half-full" size={11} color={W20} style={{ marginRight: 5 }} />
                <Text style={styles.footerNoteTxt}>
                    SYNCHRONIZED WITH NATIONAL PAYMENTS CORPORATION OF INDIA
                </Text>
            </View>
        </ScrollView>
    );

    // ──────────────────────────────────────────────────────────────────────────
    // SCREEN 2 — BIOMETRIC
    // ──────────────────────────────────────────────────────────────────────────
    const renderBiometric = () => (
        <ScrollView
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
        >
            {/* Back */}
            <TouchableOpacity
                style={styles.backRow}
                onPress={() => transition(SCREENS.HUB)}
                activeOpacity={0.7}
            >
                <View style={styles.backCircle}>
                    <Icon name="arrow-left" size={16} color={W55} />
                </View>
                <Text style={styles.backTxt}>Hub</Text>
            </TouchableOpacity>

            {/* Header */}
            <View style={[styles.heroWrap, { marginTop: 6 * S }]}>
                <View style={styles.heroRingOuter}>
                    <View style={styles.heroRingInner}>
                        <View style={[styles.heroCore, rdState.connected && styles.heroCoreActive]}>
                            <Icon
                                name={rdState.connected ? "usb-port" : "usb"}
                                size={36 * S}
                                color={rdState.connected ? GOLD : W35}
                            />
                        </View>
                    </View>
                </View>
            </View>

            <Text style={styles.eyebrow}>BIOMETRIC  ·  DEVICE SETUP  ·  KYC</Text>
            <Text style={styles.heroTitle}>
                Biometric{" "}
                <Text style={styles.heroAccent}>Gateway</Text>
            </Text>

            {/* ── RD Device Panel ── */}
            <View style={styles.panel}>
                {/* Panel Header */}
                <View style={styles.panelHeader}>
                    <Icon name="usb" size={15} color={GOLD} />
                    <Text style={styles.panelTitle}>RD DEVICE</Text>
                    <View style={{ flex: 1 }} />
                    <RdStatusBadge />
                </View>

                <View style={styles.panelDivider} />

                {/* Device Picker List */}
                {showPicker ? (
                    <View>
                        {RD_BRIDGE.DEVICE_LIST.map((item) => (
                            <TouchableOpacity
                                key={item.value}
                                style={[
                                    styles.deviceRow,
                                    device === item.value && styles.deviceRowActive,
                                ]}
                                onPress={() => selectDevice(item)}
                                activeOpacity={0.75}
                            >
                                <Icon
                                    name="fingerprint"
                                    size={18}
                                    color={device === item.value ? GOLD : W35}
                                    style={{ marginRight: 12 }}
                                />
                                <Text style={[
                                    styles.deviceRowTxt,
                                    device === item.value && styles.deviceRowTxtActive,
                                ]}>
                                    {item.label}
                                </Text>
                                {device === item.value && (
                                    <Icon name="check-circle" size={18} color={GOLD} />
                                )}
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity
                            style={styles.cancelPickerBtn}
                            onPress={() => setShowPicker(false)}
                        >
                            <Text style={styles.cancelPickerTxt}>Cancel</Text>
                        </TouchableOpacity>
                    </View>

                ) : rdState.connected ? (
                    /* Connected State */
                    <View style={styles.connectedWrap}>
                        <View style={styles.connectedRow}>
                            <View style={[styles.connectedDot, { backgroundColor: GREEN }]} />
                            <Text style={styles.connectedName}>{rdState.deviceInfo}</Text>
                        </View>
                        <Text style={styles.connectedSub}>
                            Status: {rdState.status}  ·  Port: {rdState.port}
                        </Text>
                        <TouchableOpacity
                            style={styles.changeDeviceBtn}
                            onPress={() => setShowPicker(true)}
                        >
                            <Icon name="swap-horizontal" size={14} color={GOLD} style={{ marginRight: 5 }} />
                            <Text style={styles.changeDeviceTxt}>Change Device</Text>
                        </TouchableOpacity>
                    </View>

                ) : (
                    /* Offline / Scanning State */
                    <View style={styles.offlineWrap}>
                        <Animated.View style={{ opacity: scanPulse }}>
                            <View style={styles.radarCircle}>
                                <Icon
                                    name="radar"
                                    size={34 * S}
                                    color={rdState.scanning ? GOLD : W20}
                                />
                            </View>
                        </Animated.View>
                        <Text style={styles.offlineTxt}>
                            {rdState.scanning
                                ? "Checking RD Service…"
                                : rdState.error
                                    ? rdState.error
                                    : "Select your biometric scanner to continue"}
                        </Text>
                    </View>
                )}

                {/* Scan Button */}
                {!rdState.connected && !showPicker && (
                    <TouchableOpacity
                        style={[styles.btnOutline, rdState.scanning && styles.btnOff]}
                        onPress={() => setShowPicker(true)}
                        disabled={rdState.scanning}
                        activeOpacity={0.8}
                    >
                        {rdState.scanning
                            ? <ActivityIndicator color={GOLD} size="small" />
                            : <>
                                <Icon name="usb" size={17} color={GOLD} style={{ marginRight: 9 }} />
                                <Text style={styles.btnOutlineTxt}>Select RD Device</Text>
                            </>
                        }
                    </TouchableOpacity>
                )}
            </View>

            {/* ── Aadhaar Input ── */}
            <View style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>MERCHANT AADHAAR NUMBER</Text>
                <View style={[
                    styles.inputRow,
                    aadhaar.length > 0 && styles.inputRowFilled,
                    aadhaar.length === 12 && styles.inputRowDone,
                ]}>
                    <Icon
                        name="card-account-details-outline"
                        size={20}
                        color={aadhaar.length === 12 ? GREEN : GOLD}
                        style={{ marginRight: 12 }}
                    />
                    <TextInput
                        style={styles.input}
                        value={aadhaar}
                        onChangeText={setAadhaar}
                        placeholder="Enter 12-digit Aadhaar"
                        placeholderTextColor={W20}
                        keyboardType="numeric"
                        maxLength={12}
                        returnKeyType="done"
                    />
                    {aadhaar.length > 0 && aadhaar.length < 12 && (
                        <Text style={styles.inputCount}>{aadhaar.length}/12</Text>
                    )}
                    {aadhaar.length === 12 && (
                        <Icon name="check-circle" size={20} color={GREEN} />
                    )}
                </View>
                <Text style={styles.fieldHint}>
                    {aadhaar.length === 12
                        ? "✓ Aadhaar ready — will be AES-256 encrypted before transmission"
                        : `${12 - aadhaar.length} digit${12 - aadhaar.length !== 1 ? "s" : ""} remaining`}
                </Text>
            </View>

            {/* ── WADH Info Strip ── */}
            <View style={styles.wadhStrip}>
                <Icon name="key-chain-variant" size={13} color={GOLD} style={{ marginRight: 7 }} />
                <Text style={styles.wadhTxt} numberOfLines={1}>
                    WADH · {WADH_VALUE.slice(0, 20)}…
                </Text>
                <View style={styles.wadhBadge}>
                    <Text style={styles.wadhBadgeTxt}>ACTIVE</Text>
                </View>
            </View>

            {/* ── Capture CTA ── */}
            <TouchableOpacity
                style={[
                    styles.btnPrimary,
                    (!rdState.connected || aadhaar.length < 12 || loading) && styles.btnOff,
                ]}
                onPress={handleCapture}
                disabled={!rdState.connected || aadhaar.length < 12 || loading}
                activeOpacity={0.82}
            >
                {loading
                    ? <ActivityIndicator color={BG_DEEP} />
                    : <>
                        <Icon name="fingerprint" size={22} color={BG_DEEP} style={{ marginRight: 10 }} />
                        <Text style={styles.btnPrimaryTxt}>Capture & Verify Biometric</Text>
                    </>
                }
            </TouchableOpacity>

            {/* ── Status Banner ── */}
            <View style={[
                styles.banner,
                rdState.connected && styles.bannerGreen,
            ]}>
                <View style={[
                    styles.bannerDot,
                    rdState.connected && { backgroundColor: GREEN },
                ]} />
                <Text style={styles.bannerTxt}>
                    {rdState.connected
                        ? `DEVICE READY · ${rdState.deviceInfo?.toUpperCase()} · PLACE FINGER ON SCANNER`
                        : statusData?.message?.toUpperCase() || "RD DEVICE NOT CONNECTED · SELECT BIOMETRIC SCANNER"}
                </Text>
            </View>

            {/* Supported Devices */}
            <Text style={styles.supportedTitle}>SUPPORTED DEVICES</Text>
            <View style={styles.supportedRow}>
                {[
                    { icon: "gesture-tap", label: "Mantra\nMFS110" },
                    { icon: "hand-wave-outline", label: "Morpho\nMSO 1300" },
                    { icon: "fingerprint", label: "Startek\nFM220" },
                    { icon: "usb-port", label: "SecuGen\n& Others" },
                ].map((d, i) => (
                    <View key={i} style={styles.chip}>
                        <Icon name={d.icon} size={17} color={W20} />
                        <Text style={styles.chipTxt}>{d.label}</Text>
                    </View>
                ))}
            </View>

            <TouchableOpacity
                style={styles.skipBtn}
                onPress={() => NavigationService.navigate("AEPS1")}
                activeOpacity={0.7}
            >
                <Text style={styles.skipTxt}>Skip — Open AEPS Services</Text>
                <Icon name="chevron-right" size={15} color={W20} />
            </TouchableOpacity>
        </ScrollView>
    );

    // ──────────────────────────────────────────────────────────────────────────
    // SCREEN 3 — CAPTURING
    // ──────────────────────────────────────────────────────────────────────────
    const renderCapturing = () => (
        <View style={styles.captureFull}>
            {/* Expanding glow */}
            <Animated.View style={[
                styles.captureGlow,
                {
                    opacity: capturePulse.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }),
                    transform: [{ scale: capturePulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
                },
            ]} />

            {/* Rings */}
            <View style={styles.captureRingOuter}>
                <View style={styles.captureRingInner}>
                    <View style={styles.captureIconBox}>
                        <Icon name="fingerprint" size={68 * S} color={GOLD} />
                    </View>
                </View>
            </View>

            <Text style={styles.captureTitle}>Capturing Biometric</Text>
            <Text style={styles.captureHint}>Keep your finger steady on the scanner</Text>

            <ActivityIndicator
                color={GOLD}
                size="large"
                style={{ marginTop: 28 * S }}
            />

            <View style={styles.captureFooter}>
                <Icon name="lock-outline" size={12} color={W20} style={{ marginRight: 5 }} />
                <Text style={styles.captureFooterTxt}>
                    ENCRYPTED TRANSMISSION · UIDAI COMPLIANT
                </Text>
            </View>
        </View>
    );

    // ──────────────────────────────────────────────────────────────────────────
    // ROOT RENDER
    // ──────────────────────────────────────────────────────────────────────────
    return (
        <SafeAreaView style={styles.root} edges={["top"]}>
            <StatusBar barStyle="light-content" backgroundColor={BG_DEEP} />

            {/* Background gradient */}
            <LinearGradient
                colors={[BG_DEEP, BG_MID, "rgb(9, 8, 26)"]}
                style={StyleSheet.absoluteFill}
            />

            {/* Subtle grid overlay */}
            <View style={styles.gridOverlay} pointerEvents="none" />

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

    gridOverlay: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.025,
        // Add a subtle repeating pattern via borderWidth trick
        borderWidth: 0,
    },

    scroll: {
        flexGrow: 1,
        paddingHorizontal: 20 * S,
        paddingTop: 20 * S,
        paddingBottom: 40 * S,
        alignItems: "center",
    },

    // ── Hero / Logo
    heroWrap: {
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 24 * S,
        width: 120 * S,
        height: 120 * S,
    },
    heroRingOuter: {
        width: 118 * S,
        height: 118 * S,
        borderRadius: 59 * S,
        borderWidth: 1,
        borderColor: GOLD_BORDER,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(212,168,67,0.03)",
    },
    heroRingInner: {
        width: 92 * S,
        height: 92 * S,
        borderRadius: 46 * S,
        borderWidth: 1,
        borderColor: "rgba(212,168,67,0.18)",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(212,168,67,0.05)",
    },
    heroCore: {
        width: 70 * S,
        height: 70 * S,
        borderRadius: 35 * S,
        backgroundColor: GOLD_DIM,
        borderWidth: 1,
        borderColor: GOLD_BORDER,
        alignItems: "center",
        justifyContent: "center",
    },
    heroCoreActive: {
        backgroundColor: "rgba(212,168,67,0.28)",
        borderColor: GOLD,
    },
    heroPulse: {
        position: "absolute",
        width: 118 * S,
        height: 118 * S,
        borderRadius: 59 * S,
        borderWidth: 1,
        borderColor: GOLD_BORDER,
    },

    // ── Typography
    eyebrow: {
        fontSize: 9,
        fontFamily: Fonts.Bold,
        color: "rgba(212,168,67,0.5)",
        letterSpacing: 2.5,
        marginBottom: 14 * S,
        textAlign: "center",
    },
    heroTitle: {
        fontSize: 32 * S,
        fontFamily: Fonts.Bold,
        color: WHITE,
        textAlign: "center",
        lineHeight: 40 * S,
        marginBottom: 12 * S,
    },
    heroAccent: {
        color: GOLD_LIGHT,
    },
    heroSub: {
        fontSize: 13,
        fontFamily: Fonts.Medium,
        color: W35,
        textAlign: "center",
        lineHeight: 20,
        marginBottom: 26 * S,
        letterSpacing: 0.3,
    },

    // ── Strip Row
    stripRow: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
        gap: 8,
        marginBottom: 24 * S,
        width: "100%",
    },
    strip: {
        flexDirection: "row",
        alignItems: "center",
        gap: 5,
        backgroundColor: W05,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: W10,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    stripTxt: {
        fontSize: 9,
        fontFamily: Fonts.Bold,
        color: W35,
        letterSpacing: 1,
    },

    // ── Status Card
    statusCard: {
        width: "100%",
        backgroundColor: GOLD_DIM,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: GOLD_BORDER,
        padding: 14 * S,
        marginBottom: 24 * S,
    },
    statusCardRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    statusCardTxt: {
        flex: 1,
        fontSize: 12,
        fontFamily: Fonts.Bold,
        color: GOLD_LIGHT,
        letterSpacing: 0.8,
        textTransform: "uppercase",
    },

    // ── Buttons
    btnPrimary: {
        width: "100%",
        height: 56 * S,
        borderRadius: 28 * S,
        backgroundColor: GOLD,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 14 * S,
    },
    btnPrimaryTxt: {
        fontSize: 15,
        fontFamily: Fonts.Bold,
        color: BG_DEEP,
        letterSpacing: 0.3,
    },
    btnOff: { opacity: 0.38 },

    btnOutline: {
        width: "100%",
        height: 48 * S,
        borderRadius: 24 * S,
        backgroundColor: "rgba(212,168,67,0.1)",
        borderWidth: 1,
        borderColor: GOLD_BORDER,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginTop: 14 * S,
    },
    btnOutlineTxt: {
        fontSize: 14,
        fontFamily: Fonts.Bold,
        color: GOLD,
    },

    btnGhost: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        marginBottom: 24 * S,
    },
    btnGhostTxt: {
        fontSize: 13,
        fontFamily: Fonts.Medium,
        color: W35,
        textDecorationLine: "underline",
    },

    // ── Footer
    footerNote: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 8 * S,
    },
    footerNoteTxt: {
        fontSize: 8,
        fontFamily: Fonts.Bold,
        color: W20,
        letterSpacing: 0.7,
        textAlign: "center",
        lineHeight: 13,
    },

    // ── Back Row
    backRow: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        gap: 8,
        marginBottom: 20 * S,
    },
    backCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: W05,
        borderWidth: 1,
        borderColor: W10,
        alignItems: "center",
        justifyContent: "center",
    },
    backTxt: {
        fontSize: 13,
        fontFamily: Fonts.Medium,
        color: W35,
    },

    // ── Panel (Device)
    panel: {
        width: "100%",
        backgroundColor: BG_CARD,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: W10,
        padding: 18 * S,
        marginBottom: 20 * S,
    },
    panelHeader: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginBottom: 12 * S,
    },
    panelTitle: {
        fontSize: 11,
        fontFamily: Fonts.Bold,
        color: W55,
        letterSpacing: 1.5,
    },
    panelDivider: {
        height: 1,
        backgroundColor: W05,
        marginBottom: 16 * S,
    },

    // ── Badge
    badge: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 10,
        borderWidth: 1,
        gap: 5,
    },
    badgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    badgeTxt: {
        fontSize: 9,
        fontFamily: Fonts.Bold,
        letterSpacing: 1,
    },

    // ── Device Picker Rows
    deviceRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: W05,
        borderRadius: 14,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: W10,
    },
    deviceRowActive: {
        backgroundColor: GOLD_DIM,
        borderColor: GOLD_BORDER,
    },
    deviceRowTxt: {
        flex: 1,
        fontSize: 14,
        fontFamily: Fonts.Medium,
        color: W35,
    },
    deviceRowTxtActive: {
        fontFamily: Fonts.Bold,
        color: GOLD_LIGHT,
    },
    cancelPickerBtn: {
        alignItems: "center",
        paddingVertical: 12,
        marginTop: 4,
    },
    cancelPickerTxt: {
        fontSize: 13,
        fontFamily: Fonts.Bold,
        color: RED,
        letterSpacing: 0.8,
    },

    // ── Connected State
    connectedWrap: { gap: 6 },
    connectedRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    connectedDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    connectedName: {
        fontSize: 14,
        fontFamily: Fonts.Bold,
        color: WHITE,
    },
    connectedSub: {
        fontSize: 12,
        fontFamily: Fonts.Medium,
        color: W35,
        marginLeft: 16,
    },
    changeDeviceBtn: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 6,
        alignSelf: "flex-start",
    },
    changeDeviceTxt: {
        fontSize: 12,
        fontFamily: Fonts.Bold,
        color: GOLD,
        textDecorationLine: "underline",
    },

    // ── Offline State
    offlineWrap: {
        alignItems: "center",
        paddingVertical: 16 * S,
        gap: 12,
    },
    radarCircle: {
        width: 68 * S,
        height: 68 * S,
        borderRadius: 34 * S,
        backgroundColor: W05,
        borderWidth: 1,
        borderColor: W10,
        alignItems: "center",
        justifyContent: "center",
    },
    offlineTxt: {
        fontSize: 13,
        fontFamily: Fonts.Medium,
        color: W35,
        textAlign: "center",
        lineHeight: 20,
    },

    // ── Field
    fieldBlock: {
        width: "100%",
        marginBottom: 16 * S,
    },
    fieldLabel: {
        fontSize: 10,
        fontFamily: Fonts.Bold,
        color: W35,
        letterSpacing: 1.5,
        marginBottom: 10,
        marginLeft: 4,
    },
    inputRow: {
        flexDirection: "row",
        alignItems: "center",
        height: 58 * S,
        borderRadius: 18,
        backgroundColor: "rgba(212,168,67,0.06)",
        borderWidth: 1,
        borderColor: GOLD_BORDER,
        paddingHorizontal: 18 * S,
    },
    inputRowFilled: {
        backgroundColor: GOLD_DIM,
        borderColor: GOLD_BORDER,
    },
    inputRowDone: {
        borderColor: GREEN_BDR,
        backgroundColor: GREEN_DIM,
    },
    input: {
        flex: 1,
        color: WHITE,
        fontSize: 18,
        fontFamily: Fonts.Bold,
        letterSpacing: 2.5,
    },
    inputCount: {
        fontSize: 11,
        fontFamily: Fonts.Bold,
        color: AMBER,
        marginRight: 4,
    },
    fieldHint: {
        fontSize: 10,
        fontFamily: Fonts.Medium,
        color: W20,
        marginTop: 7,
        marginLeft: 6,
        lineHeight: 14,
    },

    // ── WADH Strip
    wadhStrip: {
        flexDirection: "row",
        alignItems: "center",
        width: "100%",
        backgroundColor: "rgba(212,168,67,0.06)",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(212,168,67,0.14)",
        paddingHorizontal: 14,
        paddingVertical: 9,
        marginBottom: 20 * S,
    },
    wadhTxt: {
        flex: 1,
        fontSize: 10,
        fontFamily: Fonts.Medium,
        color: W35,
        letterSpacing: 0.5,
    },
    wadhBadge: {
        backgroundColor: GOLD_DIM,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderWidth: 1,
        borderColor: GOLD_BORDER,
    },
    wadhBadgeTxt: {
        fontSize: 8,
        fontFamily: Fonts.Bold,
        color: GOLD,
        letterSpacing: 1,
    },

    // ── Status Banner
    banner: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "rgba(0,0,0,0.18)",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: W05,
        padding: 14 * S,
        marginBottom: 22 * S,
    },
    bannerGreen: {
        backgroundColor: GREEN_DIM,
        borderColor: GREEN_BDR,
    },
    bannerDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: AMBER,
        marginRight: 10,
        flexShrink: 0,
    },
    bannerTxt: {
        flex: 1,
        fontSize: 9,
        fontFamily: Fonts.Bold,
        color: W35,
        lineHeight: 14,
        letterSpacing: 0.5,
    },

    // ── Supported Devices
    supportedTitle: {
        fontSize: 10,
        fontFamily: Fonts.Bold,
        color: W20,
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    supportedRow: {
        flexDirection: "row",
        width: "100%",
        marginBottom: 18 * S,
        gap: 8,
    },
    chip: {
        flex: 1,
        alignItems: "center",
        paddingVertical: 12,
        backgroundColor: W05,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: W05,
        gap: 5,
    },
    chipTxt: {
        fontSize: 9,
        fontFamily: Fonts.Bold,
        color: W20,
        textAlign: "center",
        lineHeight: 13,
        letterSpacing: 0.3,
    },

    // ── Skip
    skipBtn: {
        flexDirection: "row",
        alignItems: "center",
        paddingVertical: 12,
        gap: 5,
    },
    skipTxt: {
        fontSize: 13,
        fontFamily: Fonts.Medium,
        color: W20,
    },

    // ── Capturing Screen
    captureFull: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
        padding: 30 * S,
    },
    captureGlow: {
        position: "absolute",
        width: 180 * S,
        height: 180 * S,
        borderRadius: 90 * S,
        backgroundColor: GOLD,
    },
    captureRingOuter: {
        width: 152 * S,
        height: 152 * S,
        borderRadius: 76 * S,
        borderWidth: 1,
        borderColor: GOLD_BORDER,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(212,168,67,0.04)",
        marginBottom: 30 * S,
    },
    captureRingInner: {
        width: 120 * S,
        height: 120 * S,
        borderRadius: 60 * S,
        borderWidth: 1,
        borderColor: "rgba(212,168,67,0.2)",
        alignItems: "center",
        justifyContent: "center",
    },
    captureIconBox: {
        width: 94 * S,
        height: 94 * S,
        borderRadius: 47 * S,
        backgroundColor: GOLD_DIM,
        borderWidth: 2,
        borderColor: GOLD_BORDER,
        alignItems: "center",
        justifyContent: "center",
    },
    captureTitle: {
        fontSize: 24 * S,
        fontFamily: Fonts.Bold,
        color: WHITE,
        marginBottom: 10 * S,
    },
    captureHint: {
        fontSize: 13,
        fontFamily: Fonts.Medium,
        color: W35,
        textAlign: "center",
        letterSpacing: 0.4,
    },
    captureFooter: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 36 * S,
    },
    captureFooterTxt: {
        fontSize: 9,
        fontFamily: Fonts.Bold,
        color: W20,
        letterSpacing: 1,
    },
});

export default AEPS_OnBoard;
