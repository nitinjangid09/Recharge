import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Animated,
    Dimensions,
    Platform,
    StatusBar,
    Alert,
    Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { redeemCoupon } from '../api/AuthApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../constants/Colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Colours ────────────────────────────────────────────────────
const C = {
    orange: '#F4722B',
    orangeGlow: 'rgba(244,114,43,0.18)',
    orangeSoft: '#FFF1E8',
    orangeBorder: 'rgba(244,114,43,0.25)',
    green: '#22C55E',
    greenSoft: '#F0FDF4',
    greenGlow: 'rgba(34,197,94,0.15)',
    bg: '#FAF8F4',
    white: '#FFFFFF',
    dark: '#141414',
    border: '#E8EDF2',
    muted: '#F1F5F9',
    slate: '#64748B',
    slateLight: '#94A3B8',
    lightText: '#CBD5E1',
    red: '#EF4444',
    redSoft: '#FFF5F5',
    heroFrom: '#1a0a02',
    heroTo: '#2d1000',
    hdfcBlue: '#004C97',
    iciciOrange: '#F05A28',
};

const BANKS = {
    hdfc: {
        name: 'HDFC Bank',
        acc: '•••• •••• 0365',
        accountNo: '50200108120365',
        ifsc: 'HDFC0007731',
        payee: 'CAMLENIO SOFTWARE PVT LTD',
        color: C.hdfcBlue,
    },
    icici: {
        name: 'ICICI Bank',
        acc: '•••• •••• 9012',
        accountNo: '123456789012',
        ifsc: 'ICIC0001234',
        payee: 'CAMLENIO SOFTWARE PVT LTD',
        color: C.iciciOrange,
    },
};

// ─── Float animation hook ────────────────────────────────────────
function useFloat() {
    const anim = useRef(new Animated.Value(0)).current;
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(anim, { toValue: -6, duration: 1600, useNativeDriver: true }),
                Animated.timing(anim, { toValue: 0, duration: 1600, useNativeDriver: true }),
            ])
        ).start();
    }, []);
    return anim;
}

// ─── Toast ──────────────────────────────────────────────────────
function Toast({ visible, message, type }) {
    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(20)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 0, duration: 280, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(opacity, { toValue: 0, duration: 220, useNativeDriver: true }),
                Animated.timing(translateY, { toValue: 20, duration: 220, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    const bg = type === 'success' ? '#1aa748' : C.red;
    return (
        <Animated.View style={[styles.toast, { backgroundColor: bg, opacity, transform: [{ translateY }] }]}>
            <Text style={styles.toastText}>{type === 'success' ? '✓' : '✗'}  {message}</Text>
        </Animated.View>
    );
}

// ─── Coupon Panel ────────────────────────────────────────────────
function CouponPanel({ onSuccess }) {
    const [code, setCode] = useState('');
    const [err, setErr] = useState('');
    const [loading, setLoad] = useState(false);
    const float = useFloat();

    const apply = async () => {
        if (!code.trim()) {
            setErr('Coupon code is required');
            return;
        }
        setErr('');
        setLoad(true);
        try {
            const headerToken = await AsyncStorage.getItem("header_token");
            const res = await redeemCoupon({ couponCode: code.trim(), headerToken });
            setLoad(false);
            if (res && res.success) {
                onSuccess(res.message || 'Account activated! 🎉');
            } else {
                setErr(res.message || 'Coupon not applicable, contact admin');
            }
        } catch (e) {
            setLoad(false);
            setErr('Something went wrong. Please try again.');
        }
    };

    return (
        <View style={styles.panelCard}>
            <Animated.View
                style={[
                    styles.iconBox,
                    {
                        backgroundColor: C.greenSoft,
                        borderColor: 'rgba(34,197,94,0.18)',
                        transform: [{ translateY: float }],
                    },
                ]}
            >
                <Text style={{ fontSize: 30 }}>🎟️</Text>
            </Animated.View>

            <Text style={styles.panelTitle}>Got a Coupon?</Text>
            <Text style={styles.panelDesc}>
                Enter your exclusive code to instantly waive the onboarding charges and activate your account.
            </Text>

            <View style={styles.couponWrap}>
                <TextInput
                    style={[styles.couponInput, err ? styles.inputErr : null]}
                    placeholder="e.g. FREE24, VIPPRO"
                    placeholderTextColor={C.lightText}
                    value={code}
                    onChangeText={t => {
                        setCode(t.toUpperCase());
                        if (t) setErr('');
                    }}
                    autoCapitalize="characters"
                    maxLength={20}
                />
                {code.length > 0 && (
                    <TouchableOpacity style={styles.couponClear} onPress={() => setCode('')}>
                        <Text style={{ color: C.slate, fontSize: 13, fontWeight: '700' }}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>
            {!!err && <Text style={styles.errText}>{err}</Text>}

            <TouchableOpacity
                style={[styles.ctaBtn, { backgroundColor: C.green }, loading && styles.ctaLoading]}
                onPress={apply}
                activeOpacity={0.88}
            >
                {loading ? (
                    <Text style={styles.ctaBtnLabel}>Activating…</Text>
                ) : (
                    <>
                        <Text style={styles.ctaBtnLabel}>Apply Code &amp; Activate</Text>
                        <Text style={styles.ctaArrow}> →</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
}

// ─── Online Panel ────────────────────────────────────────────────
function OnlinePanel({ onSuccess, feeAmount }) {
    const [loading, setLoad] = useState(false);
    const float = useFloat();
    const methods = ['UPI', 'Credit Card', 'Debit Card', 'Netbanking'];

    const pay = () => {
        setLoad(true);
        setTimeout(() => {
            setLoad(false);
            onSuccess('Payment successful! 🎉');
        }, 1800);
    };

    return (
        <View style={styles.panelCard}>
            <Animated.View
                style={[
                    styles.iconBox,
                    {
                        backgroundColor: C.orangeSoft,
                        borderColor: C.orangeBorder,
                        transform: [{ translateY: float }],
                    },
                ]}
            >
                <Text style={{ fontSize: 30 }}>💳</Text>
            </Animated.View>

            <Text style={styles.panelTitle}>Online Payment</Text>
            <Text style={styles.panelDesc}>
                Pay instantly via UPI, Credit Card, Debit Card, or Netbanking. Your account activates automatically.
            </Text>

            <View style={styles.methodPills}>
                {methods.map(m => (
                    <View key={m} style={styles.methodPill}>
                        <Text style={styles.methodPillText}>{m}</Text>
                    </View>
                ))}
            </View>

            <TouchableOpacity
                style={[styles.ctaBtn, { backgroundColor: C.orange }, loading && styles.ctaLoading]}
                onPress={pay}
                activeOpacity={0.88}
            >
                {loading ? (
                    <Text style={styles.ctaBtnLabel}>Processing…</Text>
                ) : (
                    <>
                        <Text style={styles.ctaBtnLabel}>Pay ₹{feeAmount || '999'} Securely</Text>
                        <Text style={styles.ctaArrow}> →</Text>
                    </>
                )}
            </TouchableOpacity>
        </View>
    );
}

// ─── Bank Panel ──────────────────────────────────────────────────
function BankPanel({ onSuccess, onError, feeAmount }) {
    const [selected, setSelected] = useState(null);
    const [showQR, setShowQR] = useState(false);
    const [payMode, setPayMode] = useState('');
    const [utr, setUtr] = useState('');
    const [utrErr, setUtrErr] = useState('');
    const [modeErr, setModeErr] = useState('');
    const [loading, setLoad] = useState(false);
    const qrAnim = useRef(new Animated.Value(0)).current;

    const selectBank = key => {
        setSelected(key);
        setShowQR(true);
        Animated.timing(qrAnim, { toValue: 1, duration: 420, useNativeDriver: true }).start();
    };

    const copy = (val, label) => {
        Clipboard.setString(val);
        onSuccess(`${label} copied!`);
    };

    const submit = () => {
        let ok = true;
        if (!selected) {
            onError('Please select a bank account');
            return;
        }
        if (!payMode) {
            setModeErr('Payment method required');
            ok = false;
        }
        if (!utr.trim()) {
            setUtrErr('UTR number is required');
            ok = false;
        }
        if (!ok) return;
        setLoad(true);
        setTimeout(() => {
            setLoad(false);
            onSuccess('Account activated! 🎉');
            setSelected(null);
            setShowQR(false);
            setUtr('');
            setPayMode('');
            qrAnim.setValue(0);
        }, 1800);
    };

    const bank = selected ? BANKS[selected] : null;

    const payModes = [
        { label: 'UPI Transfer', value: 'upi' },
        { label: 'IMPS', value: 'imps' },
        { label: 'NEFT / RTGS', value: 'neft' },
    ];

    return (
        <View style={{ gap: 14 }}>
            <Text style={styles.bankLabel}>Step 1 — Select Bank Account</Text>

            {/* Bank Cards */}
            {Object.entries(BANKS).map(([key, b]) => (
                <TouchableOpacity
                    key={key}
                    style={[styles.bankCard, selected === key && styles.bankCardSelected]}
                    onPress={() => selectBank(key)}
                    activeOpacity={0.9}
                >
                    <View style={[styles.bankLogo, { borderColor: b.color + '33' }]}>
                        <Text style={[styles.bankLogoText, { color: b.color }]}>{key.toUpperCase()}</Text>
                    </View>
                    <View style={styles.bankInfo}>
                        <Text style={styles.bankName}>{b.name}</Text>
                        <Text style={styles.bankAcc}>{b.acc}</Text>
                    </View>
                    <View style={[styles.radio, selected === key && styles.radioSelected]}>
                        {selected === key && <View style={styles.radioDot} />}
                    </View>
                </TouchableOpacity>
            ))}

            {/* QR + Details */}
            {showQR && bank && (
                <Animated.View
                    style={[
                        styles.qrCard,
                        {
                            opacity: qrAnim,
                            transform: [
                                {
                                    translateY: qrAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [-12, 0],
                                    }),
                                },
                            ],
                        },
                    ]}
                >
                    <View style={styles.qrHeader}>
                        <Text style={styles.qrTitle}>Account Details</Text>
                        <View style={styles.qrBadge}>
                            <Text style={styles.qrBadgeText}>✓ Verified</Text>
                        </View>
                    </View>

                    {[
                        { label: 'Account Number', value: bank.accountNo },
                        { label: 'IFSC Code', value: bank.ifsc },
                        { label: 'Payee Name', value: bank.payee },
                    ].map(row => (
                        <TouchableOpacity
                            key={row.label}
                            style={styles.detailRow}
                            onPress={() => copy(row.value, row.label)}
                            activeOpacity={0.8}
                        >
                            <View>
                                <Text style={styles.detailLabel}>{row.label}</Text>
                                <Text style={styles.detailValue}>{row.value}</Text>
                            </View>
                            <View style={styles.copyBtn}>
                                <Text style={{ fontSize: 14 }}>⧉</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </Animated.View>
            )}

            {/* Transfer Form */}
            {showQR && (
                <Animated.View style={{ opacity: qrAnim }}>
                    <Text style={styles.formHeading}>Confirm Your Transfer</Text>
                    <View style={styles.formCard}>

                        {/* Fee + Date row */}
                        <View style={styles.formRow}>
                            <View style={[styles.formField, { flex: 1 }]}>
                                <Text style={styles.fieldLabel}>FEE AMOUNT</Text>
                                <View style={[styles.fieldWrap, { backgroundColor: C.orangeSoft, borderColor: C.orangeBorder }]}>
                                    <Text style={[styles.fieldInput, { color: C.orange, fontWeight: '800' }]}>₹ {feeAmount || '999'}</Text>
                                </View>
                            </View>
                            <View style={[styles.formField, { flex: 1 }]}>
                                <Text style={styles.fieldLabel}>PAYMENT DATE</Text>
                                <View style={styles.fieldWrap}>
                                    <Text style={[styles.fieldInput, { color: C.slateLight }]}>Today</Text>
                                </View>
                            </View>
                        </View>

                        {/* Pay Mode */}
                        <View style={styles.formField}>
                            <Text style={styles.fieldLabel}>PAYMENT METHOD *</Text>
                            <View style={[styles.fieldWrap, modeErr ? styles.fieldErr : null, { height: 'auto', paddingVertical: 8 }]}>
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                >
                                    <View style={{ flexDirection: 'row', gap: 8 }}>
                                        {payModes.map(m => (
                                            <TouchableOpacity
                                                key={m.value}
                                                style={[
                                                    styles.modePill,
                                                    payMode === m.value && styles.modePillActive,
                                                ]}
                                                onPress={() => {
                                                    setPayMode(m.value);
                                                    setModeErr('');
                                                }}
                                            >
                                                <Text
                                                    style={[
                                                        styles.modePillText,
                                                        payMode === m.value && styles.modePillTextActive,
                                                    ]}
                                                >
                                                    {m.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </ScrollView>
                            </View>
                            {!!modeErr && <Text style={styles.errText}>{modeErr}</Text>}
                        </View>

                        {/* UTR */}
                        <View style={styles.formField}>
                            <Text style={styles.fieldLabel}>UTR / REFERENCE NUMBER *</Text>
                            <TextInput
                                style={[styles.textField, utrErr ? styles.inputErr : null]}
                                placeholder="Enter UTR number"
                                placeholderTextColor={C.lightText}
                                value={utr}
                                onChangeText={t => {
                                    setUtr(t);
                                    if (t) setUtrErr('');
                                }}
                                keyboardType="default"
                                autoCapitalize="characters"
                            />
                            {!!utrErr && <Text style={styles.errText}>{utrErr}</Text>}
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[
                            styles.ctaBtn,
                            { backgroundColor: C.orange, marginTop: 16 },
                            loading && styles.ctaLoading,
                        ]}
                        onPress={submit}
                        activeOpacity={0.88}
                    >
                        {loading ? (
                            <Text style={styles.ctaBtnLabel}>Confirming…</Text>
                        ) : (
                            <>
                                <Text style={styles.ctaBtnLabel}>Confirm &amp; Activate Account</Text>
                                <Text style={styles.ctaArrow}> →</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </Animated.View>
            )}
        </View>
    );
}

// ─── Main Screen ─────────────────────────────────────────────────
export default function ActivateAccountScreen({ navigation }) {
    const [activeTab, setActiveTab] = useState('coupon');
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    const [feeAmount, setFeeAmount] = useState('999');
    const tabAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const fetchFeeAmount = async () => {
            try {
                const amount = await AsyncStorage.getItem("on_board_charge");
                if (amount) {
                    setFeeAmount(amount);
                }
            } catch (error) {
                console.log("Error fetching on_board_charge:", error);
            }
        };
        fetchFeeAmount();
    }, []);

    const showToast = (msg, type = 'success') => {
        setToast({ visible: true, message: msg, type });
        setTimeout(() => setToast(t => ({ ...t, visible: false })), 2800);
    };

    const handleSuccess = (msg) => {
        showToast(msg, 'success');
        setTimeout(() => {
            navigation.reset({
                index: 0,
                routes: [{ name: 'Offlinekyc' }],
            });
        }, 1500);
    };

    const TABS = [
        { key: 'coupon', label: 'Coupon', icon: '🎟️' },
        { key: 'online', label: 'Online', icon: '💳' },
        { key: 'bank', label: 'Bank', icon: '🏦' },
    ];

    const switchTab = key => {
        setActiveTab(key);
        const idx = TABS.findIndex(t => t.key === key);
        Animated.spring(tabAnim, {
            toValue: idx,
            useNativeDriver: false,
            tension: 80,
            friction: 14,
        }).start();
    };

    const indicatorLeft = tabAnim.interpolate({
        inputRange: [0, 1, 2],
        outputRange: ['2%', '35%', '68%'],
    });

    return (
        <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
            <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* ── Hero Card ── */}
                <View style={styles.hero}>
                    <View style={styles.heroGlowTop} />
                    <View style={styles.heroGlowBottom} />
                    <Text style={styles.heroBadge}>⬤  ONBOARDING CHARGES</Text>
                    <Text style={styles.heroAmount}>
                        <Text style={styles.heroCurrency}>₹</Text>{feeAmount}
                    </Text>
                    <Text style={styles.heroSub}>One-time account activation fee</Text>
                    <View style={styles.heroPills}>
                        <View style={styles.heroPill}>
                            <Text style={styles.heroPillText}>🔒 Secure</Text>
                        </View>
                        <View style={styles.heroPill}>
                            <Text style={styles.heroPillText}>⚡ Instant</Text>
                        </View>
                        <View style={[styles.heroPill, styles.heroPillGreen]}>
                            <Text style={[styles.heroPillText, { color: '#86efac' }]}>✓ No Hidden Fees</Text>
                        </View>
                    </View>
                </View>

                {/* ── Section label ── */}
                <Text style={styles.sectionLabel}>CHOOSE PAYMENT METHOD</Text>

                {/* ── Tabs ── */}
                <View style={styles.tabsContainer}>
                    <Animated.View style={[styles.tabIndicator, { left: indicatorLeft }]} />
                    {TABS.map(tab => {
                        const active = activeTab === tab.key;
                        return (
                            <TouchableOpacity
                                key={tab.key}
                                style={styles.tab}
                                onPress={() => switchTab(tab.key)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.tabIcon}>{tab.icon}</Text>
                                <Text style={[styles.tabLabel, active && styles.tabLabelActive]}>
                                    {tab.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* ── Panel Content ── */}
                <View style={styles.panelWrap}>
                    {activeTab === 'coupon' && (
                        <CouponPanel onSuccess={handleSuccess} />
                    )}
                    {activeTab === 'online' && (
                        <OnlinePanel onSuccess={handleSuccess} feeAmount={feeAmount} />
                    )}
                    {activeTab === 'bank' && (
                        <BankPanel
                            onSuccess={handleSuccess}
                            onError={msg => showToast(msg, 'error')}
                            feeAmount={feeAmount}
                        />
                    )}
                </View>

                {/* ── Trust Footer ── */}
                <View style={styles.trustFooter}>
                    {['🔐 SSL Secured', '🔒 PCI Compliant', '🛡️ 256-bit Enc'].map(t => (
                        <Text key={t} style={styles.trustItem}>{t}</Text>
                    ))}
                </View>
            </ScrollView>

            {/* ── Toast ── */}
            <Toast visible={toast.visible} message={toast.message} type={toast.type} />
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.bg },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 60 },

    // Hero
    hero: { margin: 16, borderRadius: 28, padding: 24, backgroundColor: C.heroFrom, overflow: 'hidden', position: 'relative' },
    heroGlowTop: { position: 'absolute', top: -60, right: -30, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(244,114,43,0.4)', opacity: 0.6 },
    heroGlowBottom: { position: 'absolute', bottom: -80, left: -30, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(59,130,246,0.2)', opacity: 0.5 },
    heroBadge: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8, color: 'rgba(255,255,255,0.45)', marginBottom: 12 },
    heroAmount: { fontSize: 48, fontWeight: '800', color: '#fff', lineHeight: 52 },
    heroCurrency: { fontSize: 24, fontWeight: '500', color: 'rgba(255,255,255,0.55)' },
    heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '500', marginBottom: 16, marginTop: 2 },
    heroPills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    heroPill: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 100, paddingVertical: 5, paddingHorizontal: 10 },
    heroPillGreen: { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.25)' },
    heroPillText: { fontSize: 11, fontWeight: '600', color: 'rgba(255,255,255,0.6)' },

    // Section label
    sectionLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8, color: C.slate, paddingHorizontal: 20, marginBottom: 10, textTransform: 'uppercase' },

    // Tabs
    tabsContainer: { marginHorizontal: 16, marginBottom: 20, backgroundColor: C.white, borderRadius: 18, padding: 5, flexDirection: 'row', borderWidth: 1.5, borderColor: C.border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, position: 'relative', height: 64 },
    tabIndicator: { position: 'absolute', top: 5, bottom: 5, width: '30%', backgroundColor: C.orange, borderRadius: 13, shadowColor: C.orange, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 12, elevation: 6 },
    tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, zIndex: 1 },
    tabIcon: { fontSize: 16 },
    tabLabel: { fontSize: 11, fontWeight: '600', color: C.slate },
    tabLabelActive: { color: C.white, fontWeight: '700' },

    // Panel wrap
    panelWrap: { paddingHorizontal: 16 },

    // Panel card (shared by coupon + online)
    panelCard: { backgroundColor: Colors.white, borderRadius: 24, borderWidth: 1.5, borderColor: C.border, padding: 24, alignItems: 'center', gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
    iconBox: { width: 72, height: 72, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    panelTitle: { fontSize: 22, fontWeight: '700', color: C.dark, textAlign: 'center' },
    panelDesc: { fontSize: 13, color: C.slate, textAlign: 'center', lineHeight: 20, maxWidth: 270 },

    // Coupon input
    couponWrap: { width: '100%', position: 'relative' },
    couponInput: { width: '100%', height: 54, borderRadius: 18, borderWidth: 2, borderColor: C.border, backgroundColor: C.muted, paddingHorizontal: 48, fontWeight: '700', fontSize: 18, letterSpacing: 2, textAlign: 'center', color: '#16a34a' },
    couponClear: { position: 'absolute', right: 14, top: '50%', marginTop: -14, width: 28, height: 28, borderRadius: 10, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
    inputErr: { borderColor: C.red, backgroundColor: C.redSoft },
    errText: { fontSize: 10, fontWeight: '700', color: C.red, textTransform: 'uppercase', letterSpacing: 0.8, alignSelf: 'flex-start', paddingHorizontal: 2 },

    // Method pills (online)
    methodPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    methodPill: { backgroundColor: C.muted, borderWidth: 1.5, borderColor: C.border, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
    methodPillText: { fontSize: 11, fontWeight: '600', color: C.slate },

    // CTA button
    ctaBtn: { width: '100%', height: 56, borderRadius: 26, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', shadowColor: C.orange, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 6 },
    ctaLoading: { opacity: 0.75 },
    ctaBtnLabel: { color: C.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.2 },
    ctaArrow: { color: C.white, fontSize: 18, fontWeight: '700' },

    // Bank panel
    bankLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.8, color: C.slate, textTransform: 'uppercase' },
    bankCard: { backgroundColor: C.white, borderRadius: 22, borderWidth: 1.5, borderColor: C.border, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    bankCardSelected: { borderColor: C.orange, backgroundColor: C.orangeSoft, shadowColor: C.orange, shadowOpacity: 0.18, shadowRadius: 16, elevation: 6 },
    bankLogo: { width: 46, height: 46, borderRadius: 14, backgroundColor: C.white, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },
    bankLogoText: { fontSize: 10, fontWeight: '800', letterSpacing: -0.3 },
    bankInfo: { flex: 1 },
    bankName: { fontSize: 13, fontWeight: '700', color: C.dark },
    bankAcc: { fontSize: 12, color: C.slate, fontWeight: '500', marginTop: 2 },
    radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center' },
    radioSelected: { borderColor: C.orange },
    radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.orange },

    // QR Card
    qrCard: { backgroundColor: C.white, borderRadius: 24, borderWidth: 1.5, borderColor: C.border, padding: 18, gap: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    qrHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    qrTitle: { fontSize: 14, fontWeight: '700', color: C.dark },
    qrBadge: { backgroundColor: C.greenSoft, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', borderRadius: 100, paddingVertical: 4, paddingHorizontal: 10 },
    qrBadgeText: { fontSize: 10, fontWeight: '700', color: C.green, textTransform: 'uppercase', letterSpacing: 1 },
    detailRow: { backgroundColor: C.muted, borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1.5, borderColor: 'transparent' },
    detailLabel: { fontSize: 8, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: C.slateLight, marginBottom: 3 },
    detailValue: { fontSize: 13, fontWeight: '700', color: C.dark },
    copyBtn: { width: 30, height: 30, borderRadius: 10, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2 },

    // Transfer form
    formHeading: { fontSize: 16, fontWeight: '700', color: C.dark, paddingHorizontal: 2, marginBottom: 2 },
    formCard: { backgroundColor: C.white, borderRadius: 24, borderWidth: 1.5, borderColor: C.border, padding: 18, gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 2 },
    formRow: { flexDirection: 'row', gap: 12 },
    formField: { gap: 6 },
    fieldLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', color: C.slate, paddingHorizontal: 2 },
    fieldWrap: { height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.muted, justifyContent: 'center', paddingHorizontal: 12 },
    fieldInput: { fontSize: 13, fontWeight: '600', color: C.dark },
    fieldErr: { borderColor: C.red },
    textField: { height: 46, borderRadius: 12, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.muted, paddingHorizontal: 12, fontSize: 13, fontWeight: '600', color: C.dark },
    modePill: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.muted },
    modePillActive: { backgroundColor: C.orangeSoft, borderColor: C.orange },
    modePillText: { fontSize: 11, fontWeight: '600', color: C.slate },
    modePillTextActive: { color: C.orange, fontWeight: '700' },

    // Trust footer
    trustFooter: { flexDirection: 'row', justifyContent: 'center', gap: 14, marginTop: 22, flexWrap: 'wrap', paddingHorizontal: 16 },
    trustItem: { fontSize: 10, fontWeight: '600', color: C.slateLight, textTransform: 'uppercase', letterSpacing: 0.8 },

    // Toast
    toast: { position: 'absolute', bottom: 32, alignSelf: 'center', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10 },
    toastText: { color: '#fff', fontSize: 13, fontWeight: '600' },
});