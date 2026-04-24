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
    Easing
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Geolocation from '@react-native-community/geolocation';

import Colors from "../../../constants/Colors";
import Fonts from "../../../constants/Fonts";
import * as NavigationService from "../../../utils/NavigationService";
import { aepsEkycBiometric } from "../../../api/AuthApi";
import { AlertService } from "../../../componets/Alerts/CustomAlert";
import HeaderBar from "../../../componets/HeaderBar/HeaderBar";
import RD_BRIDGE, { RD_ERROR_CODES } from "../../../utils/RDService";

const { width: SW, height: SH } = Dimensions.get("window");
const scale = (n) => Math.round((SW / 375) * n);
const rs = (n, lo = n * 0.82, hi = n * 1.28) =>
    Math.min(Math.max(scale(n), lo), hi);

const SCREENS = { BIOMETRIC: 1, CAPTURING: 2 };

// ─── Refined Premium Palette ──────────────────────────────────────────
const PRIMARY = Colors.primary;    // #1A1A2E (Ink)
const ACCENT = "#D4A843";         // Gold
const BG_START = "#FAF3E1";       // Beige
const BG_END = "#F5E7C6";         // Gold Soft
const WHITE = "#FFFFFF";

const AEPS2BiometricKYCScreen = ({ navigation, route }) => {
    const passedAadhaar = route?.params?.aadhaar || "";
    const [screen, setScreen] = useState(SCREENS.BIOMETRIC);
    const [loading, setLoading] = useState(false);
    const [aadhaar, setAadhaar] = useState(passedAadhaar);
    const [device, setDevice] = useState("MANTRA");

    const [rdState, setRdState] = useState({
        connected: false,
        scanning: false,
        capturing: false,
        deviceInfo: null,
        error: null,
    });

    const fadeAnim = useRef(new Animated.Value(1)).current;
    const scanPulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        if (rdState.scanning) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scanPulse, { toValue: 0.6, duration: 600, useNativeDriver: true }),
                    Animated.timing(scanPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
                ])
            ).start();
        } else {
            scanPulse.setValue(1);
        }
    }, [rdState.scanning]);

    const transition = (toScreen) => {
        Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }).start(() => {
            setScreen(toScreen);
            Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }).start();
        });
    };

    const handleScanDevice = useCallback(async (selectedDevice = device) => {
        setRdState((s) => ({ ...s, scanning: true, connected: false, error: null }));
        try {
            const isInstalled = await RD_BRIDGE.isInstalled(selectedDevice);
            if (isInstalled) {
                setRdState({
                    connected: true,
                    scanning: false,
                    capturing: false,
                    deviceInfo: RD_BRIDGE.getDeviceLabel(selectedDevice),
                    error: null,
                });
            } else {
                setRdState((s) => ({ ...s, scanning: false, connected: false, error: "RD Service app not found" }));
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
            if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    AlertService.showAlert({ type: "error", title: "Permission Denied", message: "Location permission is required." });
                    setLoading(false);
                    return;
                }
            }

            transition(SCREENS.CAPTURING);

            const wadhValue = "E0jzJ/P8UopUHAieZn8CKqS4WPMi5ZSYXgfnlfkWjrc=";
            const pidOptString = '<PidOptions ver="1.0">'
                + `<Opts fCount="1" fType="2" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="20000" otp="" posh="UNKNOWN" env="P" wadh="${wadhValue}" />`
                + '<Demo></Demo>'
                + '<CustOpts></CustOpts>'
                + '</PidOptions>';

            const pidDataXml = await RD_BRIDGE.capture(device, pidOptString);
            if (!pidDataXml) throw { code: 'NO_PID', message: "No biometric data received." };

            const coords = await new Promise((resolve) => {
                Geolocation.getCurrentPosition(
                    (pos) => resolve(pos.coords),
                    () => resolve({ latitude: "26.889811", longitude: "75.738343" }),
                    { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
                );
            });

            const headerToken = await AsyncStorage.getItem("header_token");
            const idempotencyKey = `EKYC_BIO_${Date.now()}`;

            const payload = {
                aadhaar: String(aadhaar),
                latitude: String(coords.latitude),
                longitude: String(coords.longitude),
                wadh: wadhValue,
                pidData: pidDataXml.startsWith('<?xml') ? pidDataXml : `<?xml version="1.0"?>${pidDataXml}`
            };

            const res = await aepsEkycBiometric({ data: payload, headerToken, idempotencyKey });

            if (res.success || res.status === "SUCCESS") {
                AlertService.showAlert({
                    type: "success",
                    title: "KYC Complete",
                    message: res.message || "Biometric verification successful.",
                    onClose: () => NavigationService.navigate("AEPSPortalAccess"),
                });
            } else {
                AlertService.showAlert({ type: "error", title: "KYC Failed", message: res.message || "Verification failed." });
                transition(SCREENS.BIOMETRIC);
            }
        } catch (err) {
            AlertService.showAlert({ type: "error", title: "Error", message: err?.message || "Something went wrong." });
            transition(SCREENS.BIOMETRIC);
        } finally {
            setLoading(false);
        }
    };

    const renderBiometric = () => (
        <View style={{ flex: 1 }}>
            <HeaderBar
                title="Biometric KYC"
                onBack={() => navigation.navigate('AEPSAadhaarOTP')}
            />
            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.glassCard}>
                    {/* Hero Content now inside card */}
                    <View style={{ alignItems: 'center', marginBottom: rs(24) }}>
                        <Icon name="fingerprint" size={rs(72)} color={ACCENT} />
                        <Text style={styles.title}>Biometric Verification</Text>
                        <Text style={styles.subtitle}>Finalize your AEPS2 registration securely</Text>
                    </View>

                    <Text style={styles.label}>AADHAAR NUMBER</Text>
                    <View style={styles.inputWrap}>
                        <Icon name="card-account-details-outline" size={rs(20)} color={ACCENT} />
                        <TextInput
                            style={styles.input}
                            value={aadhaar}
                            onChangeText={(t) => setAadhaar(t.replace(/\D/g, '').slice(0, 12))}
                            placeholder="0000 0000 0000"
                            placeholderTextColor="#94A3B8"
                            keyboardType="numeric"
                            maxLength={12}
                        />
                        {aadhaar.length === 12 && <Icon name="check-circle" size={rs(18)} color={Colors.success} />}
                    </View>

                    <Text style={[styles.label, { marginTop: rs(24) }]}>RD SERVICE DEVICE</Text>
                    <View style={styles.deviceGrid}>
                        {['MANTRA', 'MORPHO', 'STARTEK'].map((d) => (
                            <TouchableOpacity
                                key={d}
                                onPress={() => { setDevice(d); handleScanDevice(d); }}
                                style={[styles.chip, device === d && styles.chipActive]}
                            >
                                <Text style={[styles.chipText, device === d && styles.chipTextActive]}>{d}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <View style={[styles.statusStrip, rdState.connected ? styles.stripSuccess : styles.stripInfo]}>
                        <Icon name={rdState.connected ? "check-decagram" : "radar"} size={rs(16)} color={rdState.connected ? Colors.success : ACCENT} />
                        <Text style={[styles.statusText, { color: rdState.connected ? Colors.success : "#64748B" }]}>
                            {rdState.connected ? `${rdState.deviceInfo} Active` : rdState.scanning ? "Detecting device..." : rdState.error || "Connect your scanner"}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={[styles.btnAction, (aadhaar.length < 12 || !rdState.connected) && styles.btnActionDisabled]}
                        onPress={handleCapture}
                        disabled={aadhaar.length < 12 || !rdState.connected || loading}
                    >
                        {loading ? <ActivityIndicator color={WHITE} /> : (
                            <>
                                <Text style={styles.btnActionText}>VERIFY & CONTINUE</Text>
                                <Icon name="chevron-right" size={rs(20)} color={WHITE} style={{ marginLeft: 8 }} />
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.securityBox}>
                    <Icon name="shield-lock-outline" size={rs(14)} color="#94A3B8" />
                    <Text style={styles.securityText}>AES-256 Encrypted NPCI Protocol</Text>
                </View>
            </ScrollView>
        </View>
    );

    const renderCapturing = () => (
        <View style={styles.fullCenter}>
            <Animated.View style={[styles.pulseRing, { transform: [{ scale: scanPulse }] }]}>
                <Icon name="fingerprint" size={rs(100)} color={ACCENT} />
            </Animated.View>
            <Text style={styles.capTitle}>Capturing...</Text>
            <Text style={styles.capSub}>Place your finger steady on the scanner</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

            <LinearGradient colors={[BG_START, BG_END]} style={StyleSheet.absoluteFill} />

            <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
                {screen === SCREENS.BIOMETRIC ? renderBiometric() : renderCapturing()}
            </Animated.View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safe: { flex: 1 },
    scrollContent: { paddingHorizontal: rs(16), paddingBottom: rs(40), paddingTop: rs(16) },
    title: {
        fontSize: rs(24),
        fontWeight: '800',
        color: PRIMARY,
        textAlign: 'center',
        marginBottom: rs(8),
        letterSpacing: -0.5
    },
    subtitle: {
        fontSize: rs(14),
        color: '#64748B',
        textAlign: 'center',
        lineHeight: rs(20)
    },

    glassCard: {
        backgroundColor: Colors.homebg,
        borderRadius: rs(30),
        padding: rs(24),
        elevation: 10,
        shadowColor: ACCENT,
        shadowOpacity: 0.25,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 }
    },
    label: {
        fontSize: rs(10),
        fontWeight: '800',
        color: PRIMARY,
        letterSpacing: 1.5,
        marginBottom: rs(12),
        opacity: 0.5
    },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: WHITE,
        borderRadius: rs(18),
        paddingHorizontal: rs(16),
        height: rs(60),
        borderWidth: 1.5,
        borderColor: 'rgba(212,168,67,0.2)'
    },
    input: {
        flex: 1,
        marginLeft: rs(12),
        fontSize: rs(18),
        color: PRIMARY,
        fontWeight: '700',
        letterSpacing: 1
    },

    deviceGrid: { flexDirection: 'row', gap: rs(10) },
    chip: {
        flex: 1,
        height: rs(48),
        borderRadius: rs(16),
        backgroundColor: WHITE,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(0,0,0,0.05)'
    },
    chipActive: {
        backgroundColor: PRIMARY,
        borderColor: PRIMARY,
        elevation: 4,
        shadowColor: PRIMARY,
        shadowOpacity: 0.3
    },
    chipText: {
        fontSize: rs(11),
        fontWeight: '800',
        color: '#64748B'
    },
    chipTextActive: { color: WHITE },

    statusStrip: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: rs(24),
        padding: rs(14),
        borderRadius: rs(16),
        gap: rs(10)
    },
    stripSuccess: { backgroundColor: 'rgba(34,197,94,0.08)' },
    stripInfo: { backgroundColor: 'rgba(212,168,67,0.08)' },
    statusText: { fontSize: rs(12), fontWeight: '700' },

    btnAction: {
        height: rs(64),
        borderRadius: rs(20),
        backgroundColor: PRIMARY,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: rs(32),
        elevation: 10,
        shadowColor: PRIMARY,
        shadowOpacity: 0.35,
        shadowRadius: 15,
        shadowOffset: { width: 0, height: 8 }
    },
    btnActionDisabled: {
        backgroundColor: '#CBD5E1',
        elevation: 0,
        shadowOpacity: 0
    },
    btnActionText: {
        fontSize: rs(15),
        fontWeight: '900',
        color: WHITE,
        letterSpacing: 1
    },

    securityBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: rs(24),
        gap: rs(6)
    },
    securityText: {
        fontSize: rs(11),
        color: '#94A3B8',
        fontWeight: '600'
    },

    fullCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: rs(40) },
    pulseRing: {
        width: rs(200),
        height: rs(200),
        borderRadius: rs(100),
        backgroundColor: WHITE,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 20,
        shadowColor: ACCENT,
        shadowOpacity: 0.2
    },
    capTitle: {
        fontSize: rs(28),
        fontWeight: '900',
        color: PRIMARY,
        marginTop: rs(48),
        letterSpacing: -1
    },
    capSub: {
        fontSize: rs(16),
        color: '#64748B',
        marginTop: rs(12),
        textAlign: 'center',
        fontWeight: '500'
    }
});

export default AEPS2BiometricKYCScreen;
