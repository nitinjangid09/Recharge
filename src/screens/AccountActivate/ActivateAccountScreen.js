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
    Modal,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { SafeAreaView } from 'react-native-safe-area-context';
import CalendarModal from '../../componets/Calendar/CalendarModal';
import ImagePicker from 'react-native-image-crop-picker';
import { redeemCoupon, getAllTopupBanks, BASE_URL, addIdChargeRequest } from '../../api/AuthApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../constants/Colors';
import Fonts from '../../constants/Fonts';
import { Image } from 'react-native';
import RNFS from 'react-native-fs';

const MIN_SIZE_BYTES = 10 * 1024;   // 10 KB
const MAX_SIZE_BYTES = 200 * 1024;  // 200 KB

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

    const bg = type === 'success' ? Colors.green : Colors.red;
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
                        backgroundColor: 'transparent',
                        borderWidth: 0,
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
                    placeholder="e.g. FREE24"
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
                        <Text style={{ color: Colors.slate_500, fontSize: 13, fontFamily: Fonts.Bold }}>✕</Text>
                    </TouchableOpacity>
                )}
            </View>
            {!!err && <Text style={styles.errText}>{err}</Text>}

            <TouchableOpacity
                style={[styles.ctaBtn, { backgroundColor: Colors.green }, loading && styles.ctaLoading]}
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
                        backgroundColor: 'transparent',
                        borderWidth: 0,
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
                style={[styles.ctaBtn, { backgroundColor: Colors.primary }, loading && styles.ctaLoading]}
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
    const [uploadModalVisible, setUploadModalVisible] = useState(false);

    const methods = ['UPI', 'IMPS', 'bank', 'NEFT'];

    // Remove auto-select to allow "Choose Bank" placeholder
    const bank = banks.find(b => b._id === selectedId);



    const copy = (val, label) => {
        Clipboard.setString(val);
        onSuccess(`${label} copied!`);
    };

    const getFileSizeBytes = async (image) => {
        if (image.size && image.size > 0) return image.size;
        try {
            const cleanPath = (image.path ?? "").replace(/^file:\/\//, "");
            const stat = await RNFS.stat(cleanPath);
            return stat.size;
        } catch (_) { return null; }
    };

    const validateImageSize = async (image) => {
        const sizeBytes = await getFileSizeBytes(image);
        if (sizeBytes === null) return true;
        if (sizeBytes < MIN_SIZE_BYTES) {
            onError(`Image too small (${(sizeBytes / 1024).toFixed(1)} KB). Min: 10 KB`);
            return false;
        }
        if (sizeBytes > MAX_SIZE_BYTES) {
            onError(`Image too large (${(sizeBytes / 1024).toFixed(1)} KB). Max: 200 KB`);
            return false;
        }
        return true;
    };

    const handleCapture = async (method) => {
        setUploadModalVisible(false);
        try {
            const options = {
                width: 1000,
                height: 1000,
                cropping: true,
                mediaType: 'photo',
                compressImageQuality: 0.8,
            };
            const image = method === 'camera' ? await ImagePicker.openCamera(options) : await ImagePicker.openPicker(options);
            if (image) {
                const isValid = await validateImageSize(image);
                if (isValid) setReceiptImage(image.path);
            }
        } catch (err) {
            console.log("Image picker err:", err);
        }
    };

    const onDateConfirm = (selectedDate) => {
        setShowDatePicker(false);
        if (selectedDate) setDate(selectedDate);
    };

    const submit = async () => {
        if (!bank) {
            onError('Please select a bank account first');
            return;
        }
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
                            onPress={() => {
                                setShowSelectors(!showSelectors);
                                setShowMethodPicker(false);
                            }}
                        >
                            <Text style={[styles.hubDropdownText, !bank && { color: 'rgba(255,255,255,0.4)' }]}>
                                {bank ? bank.bankName : 'CHOOSE BANK'}
                            </Text>
                            <Text style={styles.hubDropdownArrow}>▼</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {showSelectors && (
                    <View style={styles.bankPickerList}>
                        <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', backgroundColor: Colors.primary, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
                            <Text style={{ fontSize: 10, fontFamily: Fonts.Bold, color: Colors.white, letterSpacing: 1 }}>CHOOSE BANK</Text>
                        </View>
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
                {bank && (
                    <View style={styles.qrCardMain}>
                        <View style={styles.hubSectionHeader}>
                            <Text style={styles.hubSectionTitle}>Scan & Pay</Text>
                            <Text style={styles.hubSectionSub}>Use any UPI app to scan and pay instantly</Text>
                        </View>
                        
                        <View style={styles.qrStage}>
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
                                        <Text style={{ fontSize: 12, color: Colors.slate_500, textAlign: 'center', padding: 10 }}>
                                            No QR Code
                                        </Text>
                                    )}
                                    <View style={styles.qrScanLine} />
                                </View>
                                <View style={styles.qrFooter}>
                                    <Text style={styles.qrVpa}>{bank.upiId || 'No UPI ID'}</Text>
                                </View>
                            </View>
                            
                            <View style={styles.qrStatusBadge}>
                                <Text style={styles.qrStatusText}>✓ VERIFIED SECURE QR</Text>
                            </View>
                        </View>
                    </View>
                )}

                {bank && (
                    <View style={styles.bankDetailGroup}>
                        <View style={styles.hubSectionHeader}>
                            <Text style={styles.hubSectionTitle}>Bank Transfer Details</Text>
                            <Text style={styles.hubSectionSub}>Pay via IMPS/NEFT using details below</Text>
                        </View>
                        
                        <View style={styles.bankDetailList}>
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
                    </View>
                )}

                {/* Payment Form - Only show after bank selection */}
                {bank && (
                    <View style={styles.hubFormCard}>
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

                                    <CalendarModal
                                        visible={showDatePicker}
                                        title="Select Transfer Date"
                                        initialDate={date}
                                        maxDate={new Date()}
                                        onCancel={() => setShowDatePicker(false)}
                                        onConfirm={onDateConfirm}
                                    />
                                </View>
                            </View>

                            <View style={styles.hubFormField}>
                                <Text style={styles.hubFieldLabel}>Payment Method</Text>
                                <TouchableOpacity
                                    style={styles.hubFieldInputWrap}
                                    onPress={() => {
                                        setShowMethodPicker(!showMethodPicker);
                                        setShowSelectors(false);
                                    }}
                                >
                                    <Text style={styles.hubFieldPlaceholder}>
                                        {payMode || 'Select Method'}
                                    </Text>
                                    <Text style={styles.hubFieldIcon}>▼</Text>
                                </TouchableOpacity>

                                {showMethodPicker && (
                                    <View style={styles.methodPickerList}>
                                        <View style={{ padding: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)', backgroundColor: Colors.primary, borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
                                            <Text style={{ fontSize: 10, fontFamily: Fonts.Bold, color: Colors.white, letterSpacing: 1 }}>CHOOSE METHOD</Text>
                                        </View>
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
                                        placeholderTextColor={Colors.slate_500}
                                        value={utr}
                                        onChangeText={t => setUtr(t.toUpperCase())}
                                        autoCapitalize="characters"
                                        maxLength={20}
                                    />
                                </View>
                            </View>

                            <View style={styles.hubFormField}>
                                <Text style={styles.hubFieldLabel}>Payment Screenshot</Text>
                                <View style={styles.hubUploadBox}>
                                    {receiptImage ? (
                                        <View style={{ width: '100%', height: '100%', position: 'relative' }}>
                                            <Image
                                                source={{ uri: receiptImage }}
                                                style={{ width: '100%', height: '100%', borderRadius: 14 }}
                                            />
                                            <View style={styles.uploadOverlay}>
                                                <TouchableOpacity style={styles.deleteCircle} onPress={() => setReceiptImage(null)}>
                                                    <Text style={styles.deleteIconText}>✕</Text>
                                                </TouchableOpacity>
                                            </View>
                                        </View>
                                    ) : (
                                        <TouchableOpacity 
                                            style={{ flex: 1, width: '100%', alignItems: 'center', justifyContent: 'center' }} 
                                            onPress={() => setUploadModalVisible(true)}
                                        >
                                            <View style={styles.hubUploadIcon}>
                                                <Text style={{ fontSize: 24 }}>📤</Text>
                                            </View>
                                            <Text style={styles.hubUploadTitle}>Drop your receipt here</Text>
                                            <Text style={styles.hubUploadSub}>JPEG/JPG ONLY · MAX 200KB</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
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

                        </View>
                    </View>
                )}

                <Modal visible={uploadModalVisible} transparent animationType="fade" onRequestClose={() => setUploadModalVisible(false)}>
                    <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setUploadModalVisible(false)}>
                        <View style={styles.uploadModalContent}>
                            <View style={styles.modalIndicator} />
                            <Text style={styles.modalTitle}>Upload Receipt</Text>
                            <Text style={styles.modalSub}>Select a source to upload your payment screenshot</Text>
                            
                            <View style={styles.modalActionRow}>
                                <TouchableOpacity style={styles.modalActionBtn} onPress={() => handleCapture('camera')}>
                                    <View style={[styles.modalActionIcon, { backgroundColor: 'rgba(212,176,106,0.1)' }]}>
                                        <Text style={{ fontSize: 24 }}>📸</Text>
                                    </View>
                                    <Text style={styles.modalActionLabel}>Camera</Text>
                                </TouchableOpacity>

                                <TouchableOpacity style={styles.modalActionBtn} onPress={() => handleCapture('gallery')}>
                                    <View style={[styles.modalActionIcon, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
                                        <Text style={{ fontSize: 24 }}>🖼️</Text>
                                    </View>
                                    <Text style={styles.modalActionLabel}>Gallery</Text>
                                </TouchableOpacity>
                            </View>

                            <TouchableOpacity style={styles.modalCancelBtn} onPress={() => setUploadModalVisible(false)}>
                                <Text style={styles.modalCancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
<<<<<<< HEAD

                    <View style={{ height: 1, backgroundColor: Colors.input_border, marginVertical: 10, width: '40%', alignSelf: 'center' }} />
                    <View style={styles.hubTrustRow}>
                        <Text style={styles.hubTrustText}>• PCI COMPLIANT</Text>
                        <Text style={styles.hubTrustText}>• SSL SECURED</Text>
                        <Text style={styles.hubTrustText}>• ENCRYPTED</Text>
                    </View>
                </View>
=======
                </Modal>
>>>>>>> 08713db290d1491e15134a4c3b58b499d674bcfc
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
        { key: 'bank', label: 'Bank', icon: '🏛️' },
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
            <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

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
                            <Text style={[styles.heroPillText, { color: Colors.success_light }]}>✓ No Hidden Fees</Text>
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

                {/* ── Login Link ── */}
                <TouchableOpacity
                    style={styles.loginLinkWrap}
                    onPress={() => navigation.navigate('Login')}
                >
                    <Text style={styles.loginLinkText}>
                        Already have an account? <Text style={styles.loginLinkBold}>Login</Text>
                    </Text>
                </TouchableOpacity>
            </ScrollView>

            {/* ── Toast ── */}
            <Toast visible={toast.visible} message={toast.message} type={toast.type} />
        </SafeAreaView>
    );
}

// ─── Styles ──────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safe: { flex: 1, backgroundColor: Colors.beige },
    scroll: { flex: 1 },
    scrollContent: { paddingBottom: 60 },

    // Hero
    hero: { margin: 16, borderRadius: 28, padding: 24, backgroundColor: Colors.primary, overflow: 'hidden', position: 'relative' },
    heroGlowTop: { position: 'absolute', top: -60, right: -30, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(37,99,235,0.3)', opacity: 0.6 },
    heroGlowBottom: { position: 'absolute', bottom: -80, left: -30, width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(59,130,246,0.2)', opacity: 0.5 },
    heroBadge: { fontSize: 9, fontFamily: Fonts.Bold, letterSpacing: 1.8, color: 'rgba(255,255,255,0.45)', marginBottom: 12 },
    heroAmount: { fontSize: 48, fontFamily: Fonts.Bold, color: Colors.white, lineHeight: 52 },
    heroCurrency: { fontSize: 24, fontFamily: Fonts.Medium, color: 'rgba(255,255,255,0.55)' },
    heroSub: { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontFamily: Fonts.Medium, marginBottom: 16, marginTop: 2 },
    heroPills: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    heroPill: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 100, paddingVertical: 5, paddingHorizontal: 10 },
    heroPillGreen: { backgroundColor: 'rgba(34,197,94,0.15)', borderColor: 'rgba(34,197,94,0.25)' },
    heroPillText: { fontSize: 11, fontFamily: Fonts.SemiBold, color: 'rgba(255,255,255,0.6)' },

    // Section label
    sectionLabel: { fontSize: 9, fontFamily: Fonts.Bold, letterSpacing: 1.8, color: Colors.slate_500, paddingHorizontal: 20, marginBottom: 10, textTransform: 'uppercase' },

    // Tabs
    tabsContainer: { marginHorizontal: 16, marginBottom: 20, backgroundColor: Colors.beige, borderRadius: 18, padding: 5, flexDirection: 'row', borderWidth: 1.5, borderColor: Colors.kyc_accent + "30", position: 'relative', height: 64 },
    tabIndicator: { position: 'absolute', top: 5, bottom: 5, width: '30%', backgroundColor: Colors.primary, borderRadius: 13, elevation: 0 },
    tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 3, zIndex: 1 },
    tabIcon: { fontSize: 16 },
    tabLabel: { fontSize: 11, fontFamily: Fonts.SemiBold, color: Colors.slate_500 },
    tabLabelActive: { color: Colors.white, fontFamily: Fonts.Bold },

    // Hub Container (Bank logic)
    hubContainer: { backgroundColor: 'transparent', marginHorizontal: 16 },
    hubSidebar: { backgroundColor: Colors.primary, padding: 24, borderRadius: 32, marginBottom: 16, borderWidth: 1, borderColor: Colors.kyc_accent + "40" },
    hubHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
    hubIconCircle: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
    hubBrand: { fontSize: 12, fontFamily: Fonts.Bold, color: 'rgba(255,255,255,0.6)', letterSpacing: 1.5 },
    hubTitle: { fontSize: 24, fontFamily: Fonts.Bold, color: Colors.white, marginBottom: 8 },
    hubSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontFamily: Fonts.Regular, lineHeight: 20, marginBottom: 24 },
    hubSteps: { gap: 16, marginBottom: 20 },
    hubStepItem: { gap: 8 },
    hubStepLabel: { fontSize: 9, fontFamily: Fonts.Bold, color: 'rgba(255,255,255,0.4)', letterSpacing: 1 },
    hubDropdown: { height: 50, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    hubDropdownText: { fontSize: 14, fontFamily: Fonts.SemiBold, color: Colors.white },
    hubDropdownArrow: { fontSize: 10, color: 'rgba(255,255,255,0.3)' },
    bankPickerList: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 12, padding: 8, marginBottom: 16 },
    bankPickerItem: { padding: 12, borderRadius: 8 },
    bankPickerItemActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
    bankPickerText: { color: 'rgba(255,255,255,0.6)', fontSize: 13, fontFamily: Fonts.SemiBold },
    bankPickerTextActive: { color: Colors.white },
    hubFeatureList: { gap: 12, marginTop: 20 },
    hubFeature: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    hubFeatureIcon: { fontSize: 12, color: Colors.green },
    hubFeatureText: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontFamily: Fonts.Medium },

    hubContent: { padding: 0 },
    qrStage: { alignItems: 'center', paddingVertical: 10, gap: 16 },
    qrCardMain: { backgroundColor: Colors.beige, borderRadius: 32, padding: 24, borderWidth: 1, borderColor: Colors.kyc_accent + "40", marginBottom: 16 },
    qrBorder: { borderWidth: 1.5, borderColor: Colors.finance_accent, borderRadius: 18, borderStyle: 'solid', padding: 12, width: 220, height: 220, alignItems: 'center', justifyContent: 'space-between' },
    qrHeader: { flexDirection: 'row', gap: 4 },
    qrBrand: { fontSize: 14, fontFamily: Fonts.Bold, color: Colors.finance_accent },
    qrCodePlaceholder: { width: 140, height: 140, backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', borderRadius: 8, position: 'relative' },
    qrScanLine: { position: 'absolute', top: '50%', left: 0, right: 0, height: 2, backgroundColor: Colors.finance_accent, opacity: 0.5 },
    qrFooter: { alignItems: 'center' },
    qrVpa: { fontSize: 12, fontFamily: Fonts.Bold, color: Colors.kyc_text },
    qrStatusBadge: { backgroundColor: Colors.greenSoft, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 100, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', marginTop: 10 },
    qrStatusText: { fontSize: 10, fontFamily: Fonts.Bold, color: Colors.green, letterSpacing: 1 },

    bankDetailGroup: { marginBottom: 24, backgroundColor: Colors.beige, borderRadius: 32, padding: 24, borderWidth: 1, borderColor: Colors.kyc_accent + "40" },
    bankDetailItem: { gap: 6 },
    bankDetailLabel: { fontSize: 9, fontFamily: Fonts.Bold, color: Colors.slate_500, letterSpacing: 1 },
    bankDetailRow: { height: 50, borderRadius: 12, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.kyc_accent + "20", flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16 },
    bankDetailValue: { fontSize: 14, fontFamily: Fonts.Bold, color: Colors.hub_dark },
    copyIconText: { fontSize: 16, color: Colors.finance_accent },

    confirmPaymentHeading: { marginBottom: 24 },
    headingBadge: { alignSelf: 'flex-start', backgroundColor: 'rgba(212,176,106,0.15)', paddingVertical: 4, paddingHorizontal: 8, borderRadius: 6, marginBottom: 8 },
    headingBadgeText: { fontSize: 9, fontFamily: Fonts.Bold, color: Colors.kyc_accentDark, letterSpacing: 1 },
    confirmSubtitle: { fontSize: 13, color: Colors.slate_500, fontFamily: Fonts.Regular, lineHeight: 20 },

    hubSectionHeader: { marginBottom: 4 },
    hubSectionTitle: { fontSize: 18, fontFamily: Fonts.Bold, color: Colors.hub_dark },
    hubSectionSub: { fontSize: 12, color: Colors.slate_500, fontFamily: Fonts.Regular },

    hubFormCard: { backgroundColor: Colors.beige, borderRadius: 32, padding: 24, borderWidth: 1, borderColor: Colors.kyc_accent + "40" },
    hubForm: { gap: 20 },
    hubFormRow: { flexDirection: 'row', gap: 16 },
    hubFormField: { flex: 1, gap: 8 },
    hubFieldLabel: { fontSize: 10, fontFamily: Fonts.Bold, color: Colors.hub_dark, textTransform: 'uppercase' },
    hubFieldInputWrap: { height: 50, borderRadius: 12, borderWidth: 1, borderColor: Colors.kyc_accent + "20", backgroundColor: Colors.white, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 10 },
    hubFieldCurrency: { fontSize: 14, fontFamily: Fonts.Bold, color: Colors.primary },
    hubFieldInput: { flex: 1, fontSize: 14, fontFamily: Fonts.Bold, color: Colors.hub_dark },
    hubFieldPlaceholder: { flex: 1, fontSize: 13, fontFamily: Fonts.SemiBold, color: Colors.slate_500 },
    hubFieldIcon: { fontSize: 12, color: Colors.slate_500 },
    hubFieldHint: { fontSize: 9, fontFamily: Fonts.SemiBold, color: Colors.slate_500, fontStyle: 'italic' },

    hubUploadBox: { height: 140, borderRadius: 16, borderStyle: 'dashed', borderWidth: 2, borderColor: Colors.kyc_accent + "40", backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', gap: 8 },
    hubUploadIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.beige, alignItems: 'center', justifyContent: 'center' },
    hubUploadTitle: { fontSize: 14, fontFamily: Fonts.Bold, color: Colors.hub_dark },
    hubUploadSub: { fontSize: 10, fontFamily: Fonts.SemiBold, color: Colors.slate_500 },

    hubSubmitBtn: { height: 56, borderRadius: 28, backgroundColor: Colors.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
    hubSubmitText: { fontSize: 16, fontFamily: Fonts.Bold, color: Colors.white },
    hubSubmitArrow: { fontSize: 18, color: Colors.white, fontFamily: Fonts.Bold },
    hubTrustRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginTop: 8 },
<<<<<<< HEAD
    hubTrustText: { fontSize: 8, fontFamily: Fonts.Bold, color: Colors.slate_500, letterSpacing: 1 },
=======
    hubTrustText: { fontSize: 8, fontFamily: Fonts.Bold, color: Colors.kyc_accent, letterSpacing: 1 },
>>>>>>> 08713db290d1491e15134a4c3b58b499d674bcfc

    // Form Picker lists
    methodPickerList: { position: 'absolute', top: 52, left: 0, right: 0, backgroundColor: Colors.white, borderRadius: 12, borderWidth: 1, borderColor: Colors.hub_border, zIndex: 10 },
    methodPickerItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.hub_bg },
    methodPickerText: { fontSize: 13, fontFamily: Fonts.Bold, color: Colors.hub_dark },

    // Panel card (shared by coupon + online)
    panelCard: { backgroundColor: Colors.beige, borderRadius: 32, borderWidth: 1, borderColor: Colors.kyc_accent + "40", padding: 24, alignItems: 'center', gap: 14 },
    iconBox: { width: 72, height: 72, alignItems: 'center', justifyContent: 'center' },
    panelTitle: { fontSize: 22, fontFamily: Fonts.Bold, color: Colors.hub_dark, textAlign: 'center' },
    panelDesc: { fontSize: 13, color: Colors.slate_500, fontFamily: Fonts.Regular, textAlign: 'center', lineHeight: 20, maxWidth: 270 },

    // Coupon input
    couponWrap: { width: '100%', position: 'relative' },
    couponInput: { width: '100%', height: 54, borderRadius: 18, borderWidth: 2, borderColor: Colors.hub_border, backgroundColor: Colors.bg_F8, paddingLeft: 20, paddingRight: 48, fontFamily: Fonts.Bold, fontSize: 18, letterSpacing: 2, textAlign: 'left', color: Colors.success_dark },
    couponClear: { position: 'absolute', right: 14, top: '50%', marginTop: -14, width: 28, height: 28, borderRadius: 10, backgroundColor: Colors.slate_100, alignItems: 'center', justifyContent: 'center' },
    inputErr: { borderColor: Colors.red, backgroundColor: Colors.error_light },
    errText: { fontSize: 10, fontFamily: Fonts.Bold, color: Colors.red, textTransform: 'uppercase', letterSpacing: 0.8, alignSelf: 'flex-start', paddingHorizontal: 2 },

    // Method pills (online)
    methodPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    methodPill: { backgroundColor: Colors.bg_F8, borderWidth: 1.5, borderColor: Colors.hub_border, borderRadius: 10, paddingVertical: 6, paddingHorizontal: 12 },
    methodPillText: { fontSize: 11, fontFamily: Fonts.SemiBold, color: Colors.slate_500 },

    // CTA button
    ctaBtn: { width: '100%', height: 56, borderRadius: 26, alignItems: 'center', justifyContent: 'center', flexDirection: 'row' },
    ctaLoading: { opacity: 0.75 },
    ctaBtnLabel: { color: Colors.white, fontSize: 16, fontFamily: Fonts.Bold, letterSpacing: 0.2 },
    ctaArrow: { color: Colors.white, fontSize: 18, fontFamily: Fonts.Bold },

    // Toast
    toast: { position: 'absolute', bottom: 32, alignSelf: 'center', borderRadius: 18, paddingVertical: 12, paddingHorizontal: 20, shadowColor: Colors.black, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.15, shadowRadius: 24, elevation: 10 },
    toastText: { color: Colors.white, fontSize: 13, fontFamily: Fonts.SemiBold },

    // Panel wrap
    panelWrap: { paddingHorizontal: 16 },

    // Trust Bar (Enterprise Grade)
    trustBar: { marginTop: 32, paddingHorizontal: 20, alignItems: 'center' },
    trustBarHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
<<<<<<< HEAD
    trustBarLine: { flex: 1, height: 1, backgroundColor: Colors.primary, opacity: 0.15 },
    trustBarTitle: { fontSize: 9, fontFamily: Fonts.Bold, color: Colors.slate_500, letterSpacing: 1.5, textTransform: 'uppercase' },
=======
    trustBarLine: { flex: 1, height: 1.5, backgroundColor: Colors.kyc_accent },
    trustBarTitle: { fontSize: 9, fontFamily: Fonts.Bold, color: Colors.kyc_accentDark, letterSpacing: 1.5, textTransform: 'uppercase' },
>>>>>>> 08713db290d1491e15134a4c3b58b499d674bcfc
    trustFooter: { flexDirection: 'row', justifyContent: 'center', gap: 10, flexWrap: 'wrap' },
    trustPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.beige,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: Colors.kyc_accent + "30",
    },
    trustPillIcon: { fontSize: 12, marginRight: 6 },
    trustItem: { fontSize: 9, fontFamily: Fonts.Bold, color: Colors.slate_500, textTransform: 'uppercase', letterSpacing: 0.5 },

    // Login Link
    loginLinkWrap: {
        marginTop: 32,
        marginBottom: 20,
        alignItems: 'center',
    },
    loginLinkText: {
        fontSize: 14,
        color: Colors.slate_500,
        fontFamily: Fonts.Medium,
    },
    loginLinkBold: {
        color: Colors.finance_accent,
        fontFamily: Fonts.Bold,
        textDecorationLine: 'underline',
    },

    // Modal Styles
    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    uploadModalContent: { backgroundColor: Colors.beige, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40, alignItems: 'center' },
    modalIndicator: { width: 40, height: 4, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 2, marginBottom: 20 },
    modalTitle: { fontSize: 20, fontFamily: Fonts.Bold, color: Colors.hub_dark, marginBottom: 4 },
    modalSub: { fontSize: 13, color: Colors.slate_500, fontFamily: Fonts.Regular, marginBottom: 24, textAlign: 'center' },
    modalActionRow: { flexDirection: 'row', gap: 20, marginBottom: 30 },
    modalActionBtn: { alignItems: 'center', gap: 10 },
    modalActionIcon: { width: 80, height: 80, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
    modalActionLabel: { fontSize: 14, fontFamily: Fonts.Bold, color: Colors.hub_dark },
    modalCancelBtn: { width: '100%', height: 56, borderRadius: 28, backgroundColor: Colors.white, borderWidth: 1, borderColor: Colors.kyc_accent + "20", alignItems: 'center', justifyContent: 'center' },
    modalCancelText: { fontSize: 16, fontFamily: Fonts.Bold, color: Colors.slate_500 },

    // Upload Overlay
    // Upload Overlay (Small icons top-right)
    uploadOverlay: { position: 'absolute', top: -10, right: -10, zIndex: 10 },
    deleteCircle: { width: 28, height: 28, borderRadius: 14, backgroundColor: Colors.red, alignItems: 'center', justifyContent: 'center', elevation: 6, shadowColor: Colors.black, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5, borderWidth: 2, borderColor: Colors.white },
    deleteIconText: { fontSize: 14, color: Colors.white, fontFamily: Fonts.Bold, lineHeight: 16 },
});
