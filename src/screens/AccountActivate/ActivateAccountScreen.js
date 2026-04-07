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
import DateTimePicker from '@react-native-community/datetimepicker';
import ImagePicker from 'react-native-image-crop-picker';
import { redeemCoupon, getAllTopupBanks, BASE_URL, addIdChargeRequest } from '../../api/AuthApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../constants/Colors';
import Fonts from '../../constants/Fonts';
import { Image } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');


// Dynamic banks will be fetched from API


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

    const bg = type === 'success' ? '#1aa748' : Colors.hub_red;
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
                        backgroundColor: Colors.hub_greenSoft,
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
                    placeholderTextColor={Colors.hub_lightText}
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
                        <Text style={{ color: Colors.hub_slate, fontSize: 13, fontFamily: Fonts.Bold }}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>
            {!!err && <Text style={styles.errText}>{err}</Text>}

            <TouchableOpacity
                style={[styles.ctaBtn, { backgroundColor: Colors.hub_green }, loading && styles.ctaLoading]}
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
                        backgroundColor: Colors.hub_orangeSoft,
                        borderColor: Colors.hub_orangeBorder,
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
                style={[styles.ctaBtn, { backgroundColor: Colors.hub_orange }, loading && styles.ctaLoading]}
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
function BankPanel({ onSuccess, onError, feeAmount, banks = [] }) {
    const [selectedId, setSelectedId] = useState(null);
    const [payMode, setPayMode] = useState('');
    const [utr, setUtr] = useState('');
    const [loading, setLoad] = useState(false);
    const [showSelectors, setShowSelectors] = useState(false);

    // New form states
    const [date, setDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [receiptImage, setReceiptImage] = useState(null);
    const [showMethodPicker, setShowMethodPicker] = useState(false);

    const methods = ['UPI Transfer', 'IMPS', 'NEFT / RTGS'];

    // Auto-select first bank if none selected
    useEffect(() => {
        if (banks.length > 0 && !selectedId) {
            setSelectedId(banks[0]._id);
        }
    }, [banks]);

    const bank = banks.find(b => b._id === selectedId) || banks[0];

    if (!bank) {
        return (
            <View style={[styles.hubContainer, { padding: 40, alignItems: 'center' }]}>
                <Text style={{ color: Colors.hub_slate }}>Loading bank details...</Text>
            </View>
        );
    }

    const copy = (val, label) => {
        Clipboard.setString(val);
        onSuccess(`${label} copied!`);
    };

    const pickImage = () => {
        ImagePicker.openPicker({
            width: 800,
            height: 800,
            cropping: true,
            mediaType: 'photo',
        }).then(image => {
            setReceiptImage(image.path);
        }).catch(err => {
            console.log("Image picker err:", err);
        });
    };

    const onDateChange = (event, selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) setDate(selectedDate);
    };

    const submit = async () => {
        if (!payMode) {
            onError('Please select a payment method');
            return;
        }
        if (!utr.trim()) {
            onError('UTR number is required');
            return;
        }
        if (!receiptImage) {
            onError('Please upload a payment screenshot');
            return;
        }

        setLoad(true);
        try {
            const headerToken = await AsyncStorage.getItem("header_token");

            // Format date to YYYY-MM-DD
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const formattedDate = `${yyyy}-${mm}-${dd}`;

            const res = await addIdChargeRequest({
                amount: feeAmount,
                mode: payMode.toLowerCase().includes('upi') ? 'upi' : payMode.toLowerCase(),
                receiverBank: bank._id,
                utrNumber: utr.trim(),
                paymentDate: formattedDate,
                paymentProof: receiptImage,
                headerToken
            });

            setLoad(false);
            if (res && res.success) {
                onSuccess(res.message || 'Activation request submitted! 🎉');
            } else {
                onError(res.message || 'Submission failed. Please try again.');
            }
        } catch (e) {
            setLoad(false);
            onError('Something went wrong. Please try again.');
        }
    };

    return (
        <View style={styles.hubContainer}>
            {/* Left Sidebar-like Header (Dark) */}
            <View style={styles.hubSidebar}>
                <View style={styles.hubHeaderRow}>
                    <View style={styles.hubIconCircle}>
                        <Text style={{ fontSize: 14 }}>🛡️</Text>
                    </View>
                    <Text style={styles.hubBrand}>ACTIVATION HUB</Text>
                </View>

                <Text style={styles.hubTitle}>Secure Account Activation</Text>
                <Text style={styles.hubSubtitle}>
                    Choose your preferred bank account below and scan the QR code to finish your setup.
                </Text>

                <View style={styles.hubSteps}>
                    <View style={styles.hubStepItem}>
                        <Text style={styles.hubStepLabel}>SELECT BANK ACCOUNT</Text>
                        <TouchableOpacity
                            style={styles.hubDropdown}
                            onPress={() => setShowSelectors(!showSelectors)}
                        >
                            <Text style={styles.hubDropdownText}>{bank.bankName}</Text>
                            <Text style={styles.hubDropdownArrow}>▼</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {showSelectors && (
                    <View style={styles.bankPickerList}>
                        {banks.map(b => (
                            <TouchableOpacity
                                key={b._id}
                                style={[styles.bankPickerItem, selectedId === b._id && styles.bankPickerItemActive]}
                                onPress={() => {
                                    setSelectedId(b._id);
                                    setShowSelectors(false);
                                }}
                            >
                                <Text style={[styles.bankPickerText, selectedId === b._id && styles.bankPickerTextActive]}>{b.bankName}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={styles.hubFeatureList}>
                    <View style={styles.hubFeature}>
                        <Text style={styles.hubFeatureIcon}>✓</Text>
                        <Text style={styles.hubFeatureText}>One-time setup fee: ₹{feeAmount}</Text>
                    </View>
                    <View style={styles.hubFeature}>
                        <Text style={styles.hubFeatureIcon}>🔓</Text>
                        <Text style={styles.hubFeatureText}>Instant account unlocking</Text>
                    </View>
                    <View style={styles.hubFeature}>
                        <Text style={styles.hubFeatureIcon}>💬</Text>
                        <Text style={styles.hubFeatureText}>Priority support (business hours)</Text>
                    </View>
                </View>
            </View>

            {/* QR Section */}
            <View style={styles.hubContent}>
                <View style={styles.qrStage}>
                    <View style={styles.qrCardMain}>
                        <View style={styles.qrBorder}>
                            <View style={styles.qrHeader}>
                                <Text style={styles.qrBrand}>paytm | UPI</Text>
                            </View>
                            <View style={styles.qrCodePlaceholder}>
                                {bank.qrCode ? (
                                    <Image
                                        source={{ uri: `${BASE_URL}${bank.qrCode}` }}
                                        style={{ width: '100%', height: '100%', borderRadius: 8 }}
                                        resizeMode="contain"
                                    />
                                ) : (
                                    <Text style={{ fontSize: 14, color: Colors.hub_slate }}>No QR Code</Text>
                                )}
                                <View style={styles.qrScanLine} />
                            </View>
                            <View style={styles.qrFooter}>
                                <Text style={styles.qrVpa}>{bank.upiId || 'No UPI ID'}</Text>
                            </View>
                        </View>
                    </View>
                    <View style={styles.qrStatusBadge}>
                        <Text style={styles.qrStatusText}>✓ VERIFIED QR</Text>
                    </View>
                </View>

                {/* Account Details */}
                <View style={styles.bankDetailGroup}>
                    {[
                        { label: 'A/C Number', value: bank.accountNumber },
                        { label: 'IFSC Code', value: bank.ifscCode },
                        { label: 'Payee Name', value: bank.accountHolderName },
                    ].map(item => (
                        <View key={item.label} style={styles.bankDetailItem}>
                            <Text style={styles.bankDetailLabel}>{item.label}</Text>
                            <View style={styles.bankDetailRow}>
                                <Text style={styles.bankDetailValue}>{item.value}</Text>
                                <TouchableOpacity onPress={() => copy(item.value, item.label)}>
                                    <Text style={styles.copyIconText}>⧉</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Payment Form */}
                <View style={styles.confirmPaymentHeading}>
                    <View style={styles.headingBadge}>
                        <Text style={styles.headingBadgeText}>SECURE CHECKOUT</Text>
                    </View>
                    <Text style={styles.confirmTitle}>Confirm Payment</Text>
                    <Text style={styles.confirmSubtitle}>Provide your transfer details for manual verification.</Text>
                </View>

                <View style={styles.hubForm}>
                    <View style={styles.hubFormRow}>
                        <View style={styles.hubFormField}>
                            <Text style={styles.hubFieldLabel}>FEE AMOUNT</Text>
                            <View style={styles.hubFieldInputWrap}>
                                <Text style={styles.hubFieldCurrency}>₹</Text>
                                <TextInput
                                    style={styles.hubFieldInput}
                                    value={feeAmount}
                                    editable={false}
                                />
                            </View>
                            <Text style={styles.hubFieldHint}>* Non-refundable activation fee</Text>
                        </View>

                        <View style={styles.hubFormField}>
                            <Text style={styles.hubFieldLabel}>TRANSFER DATE *</Text>
                            <TouchableOpacity
                                style={styles.hubFieldInputWrap}
                                onPress={() => setShowDatePicker(true)}
                            >
                                <Text style={styles.hubFieldPlaceholder}>
                                    {date.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </Text>
                                <Text style={styles.hubFieldIcon}>📅</Text>
                            </TouchableOpacity>

                            {showDatePicker && (
                                <DateTimePicker
                                    value={date}
                                    mode="date"
                                    display="default"
                                    maximumDate={new Date()}
                                    onChange={onDateChange}
                                />
                            )}
                        </View>
                    </View>

                    <View style={styles.hubFormRow}>
                        <View style={styles.hubFormField}>
                            <Text style={styles.hubFieldLabel}>Payment Method</Text>
                            <TouchableOpacity
                                style={styles.hubFieldInputWrap}
                                onPress={() => setShowMethodPicker(!showMethodPicker)}
                            >
                                <Text style={styles.hubFieldPlaceholder}>
                                    {payMode || 'Select Method'}
                                </Text>
                                <Text style={styles.hubFieldIcon}>▼</Text>
                            </TouchableOpacity>

                            {showMethodPicker && (
                                <View style={styles.methodPickerList}>
                                    {methods.map(m => (
                                        <TouchableOpacity
                                            key={m}
                                            style={styles.methodPickerItem}
                                            onPress={() => {
                                                setPayMode(m);
                                                setShowMethodPicker(false);
                                            }}
                                        >
                                            <Text style={styles.methodPickerText}>{m}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            )}
                        </View>

                        <View style={styles.hubFormField}>
                            <Text style={styles.hubFieldLabel}>UTR / REFERENCE NO</Text>
                            <View style={styles.hubFieldInputWrap}>
                                <Text style={styles.hubFieldIcon}>ℹ️</Text>
                                <TextInput
                                    style={styles.hubFieldInput}
                                    placeholder="Enter UTR No"
                                    placeholderTextColor={Colors.hub_slateLight}
                                    value={utr}
                                    onChangeText={t => setUtr(t.toUpperCase())}
                                    autoCapitalize="characters"
                                />
                            </View>
                        </View>
                    </View>

                    <View style={styles.hubFormField}>
                        <Text style={styles.hubFieldLabel}>Payment Screenshot</Text>
                        <TouchableOpacity style={styles.hubUploadBox} onPress={pickImage}>
                            {receiptImage ? (
                                <Image
                                    source={{ uri: receiptImage }}
                                    style={{ width: '100%', height: '100%', borderRadius: 16 }}
                                />
                            ) : (
                                <>
                                    <View style={styles.hubUploadIcon}>
                                        <Text style={{ fontSize: 24 }}>📤</Text>
                                    </View>
                                    <Text style={styles.hubUploadTitle}>Drop your receipt here</Text>
                                    <Text style={styles.hubUploadSub}>JPEG/JPG ONLY · MAX 100KB</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={[styles.hubSubmitBtn, loading && { opacity: 0.7 }]}
                        onPress={submit}
                        disabled={loading}
                    >
                        <Text style={styles.hubSubmitText}>
                            {loading ? 'Processing...' : 'Confirm & Activate Account'}
                        </Text>
                        <Text style={styles.hubSubmitArrow}> →</Text>
                    </TouchableOpacity>

                    <View style={styles.hubTrustRow}>
                        <Text style={styles.hubTrustText}>• PCI COMPLIANT</Text>
                        <Text style={styles.hubTrustText}>• SSL SECURED</Text>
                        <Text style={styles.hubTrustText}>• ENCRYPTED</Text>
                    </View>
                </View>
            </View>
        </View>
    );
}

// ─── Main Screen ─────────────────────────────────────────────────
export default function ActivateAccountScreen({ navigation }) {
    const [activeTab, setActiveTab] = useState('coupon');
    const [toast, setToast] = useState({ visible: false, message: '', type: 'success' });
    const [feeAmount, setFeeAmount] = useState('999');
    const [banks, setBanks] = useState([]);
    const [banksLoading, setBanksLoading] = useState(false);
    const tabAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const init = async () => {
            try {
                // 1. Fetch Fee
                const amount = await AsyncStorage.getItem("on_board_charge");
                if (amount) setFeeAmount(amount);

                // 2. Fetch Banks
                setBanksLoading(true);
                const headerToken = await AsyncStorage.getItem("header_token");
                const res = await getAllTopupBanks({ headerToken });
                setBanksLoading(false);
                if (res && res.success) {
                    setBanks(res.data || []);
                }
            } catch (error) {
                setBanksLoading(false);
                console.log("Error during initialization:", error);
            }
        };
        init();
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
                routes: [{ name: 'PaymentVerification' }],
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
                            banks={banks}
                        />
                    )}
                </View>

                {/* ── Trust Footer ── */}
                <View style={styles.trustBar}>
                    <View style={styles.trustBarHeader}>
                        <View style={styles.trustBarLine} />
                        <Text style={styles.trustBarTitle}>ENTERPRISE GRADE SECURITY</Text>
                        <View style={styles.trustBarLine} />
                    </View>
                    <View style={styles.trustFooter}>
                        {[
                            { icon: '🔐', label: 'SSL Secured' },
                            { icon: '🛡️', label: 'PCI Compliant' },
                            { icon: '🔒', label: '256-bit Enc' }
                        ].map(t => (
                            <View key={t.label} style={styles.trustPill}>
                                <Text style={styles.trustPillIcon}>{t.icon}</Text>
                                <Text style={styles.trustItem}>{t.label}</Text>
                            </View>
                        ))}
                    </View>
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
    hero: { margin: 16, borderRadius: 28, padding: 24, backgroundColor: Colors.hub_heroFrom, overflow: 'hidden', position: 'relative' },
    heroGlowTop: { position: 'absolute', top: -60, right: -30, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(244,114,43,0.4)', opacity: 0.6 },
    heroGlowBottom: { position: 'absolute', bottom: -80, left: -30, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(59,130,246,0.2)', opacity: 0.5 },
    heroBadge: { fontSize: 9, fontFamily: Fonts.Bold, letterSpacing: 1.8, color: 'rgba(255,255,255,0.45)', marginBottom: 12 },
    heroAmount: { fontSize: 48, fontFamily: Fonts.Bold, color: '#fff', lineHeight: 52 },
    heroCurrency: { fontSize: 24, fontFamily: Fonts.Medium, color: 'rgba(255,255,255,0.55)' },
    heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: Fonts.Medium, marginBottom: 16, marginTop: 2 },
    heroPills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    heroPill: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 100, paddingVertical: 5, paddingHorizontal: 10 },
    heroPillGreen: { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.25)' },
    heroPillText: { fontSize: 11, fontFamily: Fonts.SemiBold, color: 'rgba(255,255,255,0.6)' },

    // Section label
    sectionLabel: { fontSize: 9, fontFamily: Fonts.Bold, letterSpacing: 1.8, color: Colors.hub_slate, paddingHorizontal: 20, marginBottom: 10, textTransform: 'uppercase' },

    // Tabs
    tabsContainer: { marginHorizontal: 16, marginBottom: 20, backgroundColor: Colors.hub_white, borderRadius: 18, padding: 5, flexDirection: 'row', borderWidth: 1.5, borderColor: Colors.hub_border, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3, position: 'relative', height: 64 },
    tabIndicator: { position: 'absolute', top: 5, bottom: 5, width: '30%', backgroundColor: Colors.hub_orange, borderRadius: 13, shadowColor: Colors.hub_orange, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.22, shadowRadius: 12, elevation: 6 },
    tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, zIndex: 1 },
    tabIcon: { fontSize: 16 },
    tabLabel: { fontSize: 11, fontFamily: Fonts.SemiBold, color: Colors.hub_slate },
    tabLabelActive: { color: Colors.hub_white, fontFamily: Fonts.Bold },

    // Hub Container (Bank logic)
    hubContainer: { backgroundColor: Colors.hub_white, borderRadius: 32, overflow: 'hidden', borderWidth: 1, borderColor: Colors.hub_border, marginHorizontal: 1 },
    hubSidebar: { backgroundColor: Colors.hub_hubDark, padding: 24 },
    hubHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    hubIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
    hubBrand: { fontSize: 12, fontFamily: Fonts.Bold, color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5 },
    hubTitle: { fontSize: 24, fontFamily: Fonts.Bold, color: Colors.hub_white, marginBottom: 8 },
    hubSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.Regular, lineHeight: 20, marginBottom: 24 },
    hubSteps: { gap: 16, marginBottom: 20 },
    hubStepItem: { gap: 8 },
    hubStepLabel: { fontSize: 9, fontFamily: Fonts.Bold, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 },
    hubDropdown: { height: 50, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    hubDropdownText: { fontSize: 14, fontFamily: Fonts.SemiBold, color: Colors.hub_white },
    hubDropdownArrow: { fontSize: 10, color: 'rgba(255,255,255,0.3)' },
    bankPickerList: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 8, marginBottom: 16 },
    bankPickerItem: { padding: 12, borderRadius: 8 },
    bankPickerItemActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
    bankPickerText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: Fonts.SemiBold },
    bankPickerTextActive: { color: Colors.hub_white },
    hubFeatureList: { gap: 12, marginTop: 20 },
    hubFeature: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    hubFeatureIcon: { fontSize: 12, color: Colors.hub_green },
    hubFeatureText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.Medium },

    hubContent: { padding: 20 },
    qrStage: { alignItems: 'center', paddingVertical: 20, gap: 16 },
    qrCardMain: { backgroundColor: Colors.hub_white, borderRadius: 24, padding: 12, borderWidth: 1, borderColor: Colors.hub_hubSkyGlow, shadowColor: Colors.hub_hubSky, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 },
    qrBorder: { borderWidth: 4, borderColor: '#3b82f6', borderRadius: 18, borderStyle: 'solid', padding: 12, width: 220, height: 220, alignItems: 'center', justifyContent: 'space-between' },
    qrHeader: { flexDirection: 'row', gap: 4 },
    qrBrand: { fontSize: 14, fontFamily: Fonts.Bold, color: '#1d4ed8' },
    qrCodePlaceholder: { width: 140, height: 140, backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center', borderRadius: 8, position: 'relative' },
    qrScanLine: { position: 'absolute', top: '50%', left: 0, right: 0, height: 2, backgroundColor: '#3b82f6', opacity: 0.5 },
    qrFooter: { alignItems: 'center' },
    qrVpa: { fontSize: 12, fontFamily: Fonts.Bold, color: '#475569' },
    qrStatusBadge: { backgroundColor: Colors.hub_greenSoft, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
    qrStatusText: { fontSize: 10, fontFamily: Fonts.Bold, color: Colors.hub_green, letterSpacing: 1 },

    bankDetailGroup: { gap: 12, marginBottom: 32 },
    bankDetailItem: { gap: 6 },
    bankDetailLabel: { fontSize: 9, fontFamily: Fonts.Bold, color: Colors.hub_slate, letterSpacing: 1 },
    bankDetailRow: { height: 50, borderRadius: 12, backgroundColor: Colors.hub_bg, borderWidth: 1, borderColor: Colors.hub_border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    bankDetailValue: { fontSize: 14, fontFamily: Fonts.Bold, color: Colors.hub_dark },
    copyIconText: { fontSize: 16, color: Colors.hub_slateLight },

    confirmPaymentHeading: { marginBottom: 24 },
    headingBadge: { alignSelf: 'flex-start', backgroundColor: Colors.hub_hubIndigoGlow, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, marginBottom: 8 },
    headingBadgeText: { fontSize: 9, fontFamily: Fonts.Bold, color: Colors.hub_hubIndigo, letterSpacing: 1 },
    confirmTitle: { fontSize: 24, fontFamily: Fonts.Bold, color: Colors.hub_dark, marginBottom: 6 },
    confirmSubtitle: { fontSize: 13, color: Colors.hub_slate, fontFamily: Fonts.Regular, lineHeight: 20 },

    hubForm: { gap: 20 },
    hubFormRow: { flexDirection: 'row', gap: 16 },
    hubFormField: { flex: 1, gap: 8 },
    hubFieldLabel: { fontSize: 10, fontFamily: Fonts.Bold, color: Colors.hub_dark, textTransform: 'uppercase' },
    hubFieldInputWrap: { height: 50, borderRadius: 12, borderWidth: 1, borderColor: Colors.hub_border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 },
    hubFieldCurrency: { fontSize: 14, fontFamily: Fonts.Bold, color: Colors.hub_hubIndigo },
    hubFieldInput: { flex: 1, fontSize: 14, fontFamily: Fonts.Bold, color: Colors.hub_dark },
    hubFieldPlaceholder: { flex: 1, fontSize: 13, fontFamily: Fonts.SemiBold, color: Colors.hub_slateLight },
    hubFieldIcon: { fontSize: 12, color: Colors.hub_slateLight },
    hubFieldHint: { fontSize: 9, fontFamily: Fonts.SemiBold, color: Colors.hub_slate, fontStyle: 'italic' },

    hubUploadBox: { height: 140, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: Colors.hub_border, alignItems: 'center', justifyContent: 'center', gap: 8 },
    hubUploadIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.hub_bg, alignItems: 'center', justifyContent: 'center' },
    hubUploadTitle: { fontSize: 14, fontFamily: Fonts.Bold, color: Colors.hub_dark },
    hubUploadSub: { fontSize: 10, fontFamily: Fonts.SemiBold, color: Colors.hub_slateLight },

    hubSubmitBtn: { height: 56, borderRadius: 28, backgroundColor: Colors.hub_hubIndigo, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
    hubSubmitText: { fontSize: 16, fontFamily: Fonts.Bold, color: Colors.hub_white },
    hubSubmitArrow: { fontSize: 18, color: Colors.hub_white, fontFamily: Fonts.Bold },
    hubTrustRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 8 },
    hubTrustText: { fontSize: 8, fontFamily: Fonts.Bold, color: Colors.hub_slateLight, letterSpacing: 1 },

    // Form Picker lists
    methodPickerList: { position: 'absolute', top: 52, left: 0, right: 0, backgroundColor: Colors.hub_white, borderRadius: 12, borderWidth: 1, borderColor: Colors.hub_border, zIndex: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 10, elevation: 5 },
    methodPickerItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.hub_bg },
    methodPickerText: { fontSize: 13, fontFamily: Fonts.Bold, color: Colors.hub_dark },

    // Panel card (shared by coupon + online)
    panelCard: { backgroundColor: Colors.white, borderRadius: 24, borderWidth: 1.5, borderColor: Colors.hub_border, padding: 24, alignItems: 'center', gap: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10, elevation: 3 },
    iconBox: { width: 72, height: 72, borderRadius: 22, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
    panelTitle: { fontSize: 22, fontFamily: Fonts.Bold, color: Colors.hub_dark, textAlign: 'center' },
    panelDesc: { fontSize: 13, color: Colors.hub_slate, fontFamily: Fonts.Regular, textAlign: 'center', lineHeight: 20, maxWidth: 270 },

    // Coupon input
    couponWrap: { width: '100%', position: 'relative' },
    couponInput: { width: '100%', height: 54, borderRadius: 18, borderWidth: 2, borderColor: Colors.hub_border, backgroundColor: Colors.hub_muted, paddingHorizontal: 48, fontFamily: Fonts.Bold, fontSize: 18, letterSpacing: 2, textAlign: 'center', color: '#16a34a' },
    couponClear: { position: 'absolute', right: 14, top: '50%', marginTop: -14, width: 28, height: 28, borderRadius: 10, backgroundColor: '#E2E8F0', alignItems: 'center', justifyContent: 'center' },
    inputErr: { borderColor: Colors.hub_red, backgroundColor: '#FFF5F5' },
    errText: { fontSize: 10, fontFamily: Fonts.Bold, color: Colors.hub_red, textTransform: 'uppercase', letterSpacing: 0.8, alignSelf: 'flex-start', paddingHorizontal: 2 },

    // Method pills (online)
    methodPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    methodPill: { backgroundColor: Colors.hub_muted, borderWidth: 1.5, borderColor: Colors.hub_border, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
    methodPillText: { fontSize: 11, fontFamily: Fonts.SemiBold, color: Colors.hub_slate },

    // CTA button
    ctaBtn: { width: '100%', height: 56, borderRadius: 26, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', shadowColor: Colors.hub_orange, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 16, elevation: 6 },
    ctaLoading: { opacity: 0.75 },
    ctaBtnLabel: { color: Colors.hub_white, fontSize: 16, fontFamily: Fonts.Bold, letterSpacing: 0.2 },
    ctaArrow: { color: Colors.hub_white, fontSize: 18, fontFamily: Fonts.Bold },

    // Toast
    toast: { position: 'absolute', bottom: 32, alignSelf: 'center', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10 },
    toastText: { color: '#fff', fontSize: 13, fontFamily: Fonts.SemiBold },

    // Panel wrap
    panelWrap: { paddingHorizontal: 16 },

    // Trust Bar (Enterprise Grade)
    trustBar: { marginTop: 32, paddingHorizontal: 20, alignItems: 'center' },
    trustBarHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
    trustBarLine: { flex: 1, height: 1.5, backgroundColor: Colors.hub_border, opacity: 0.7 },
    trustBarTitle: { fontSize: 9, fontFamily: Fonts.Bold, color: Colors.hub_slateLight, letterSpacing: 1.5, textTransform: 'uppercase' },
    trustFooter: { flexDirection: 'row', justifyContent: 'center', gap: 10, flexWrap: 'wrap' },
    trustPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.hub_white,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: Colors.hub_border,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1
    },
    trustPillIcon: { fontSize: 12, marginRight: 6 },
    trustItem: { fontSize: 9, fontFamily: Fonts.Bold, color: Colors.hub_slate, textTransform: 'uppercase', letterSpacing: 0.5 },
});