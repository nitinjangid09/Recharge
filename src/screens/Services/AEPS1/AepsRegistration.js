import React, { useState, useEffect, useRef } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    ActivityIndicator,
    Dimensions,
    Modal,
    Animated,
    PanResponder,
    FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Colors from "../../../constants/Colors";
import Fonts from "../../../constants/Fonts";
import { registerOutlet, fetchAepsBanks } from "../../../api/AuthApi";
import { AlertService } from "../../../componets/Alerts/CustomAlert";
import * as NavigationService from "../../../utils/NavigationService";
import HeaderBar from "../../../componets/HeaderBar/HeaderBar";
import CalendarModal from "../../../componets/Calendar/CalendarModal";

const { width, height: SCREEN_HEIGHT } = Dimensions.get("window");
const S = width / 375;

// ─── BottomSheetModal Component (from Recharge screen) ───
function BottomSheetModal({
    visible, onClose, title,
    searchText, onSearch, searchPlaceholder,
    items, selectedValue, iconName, getLabel, onSelect,
}) {
    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const swipePan = useRef(new Animated.Value(0)).current;
    const isClosing = useRef(false);

    useEffect(() => {
        if (visible) {
            isClosing.current = false;
            swipePan.setValue(0);
            translateY.setValue(SCREEN_HEIGHT);
            Animated.parallel([
                Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14 }),
                Animated.timing(backdropOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 260, useNativeDriver: true }),
                Animated.timing(backdropOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    const swipeResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
            onPanResponderMove: (_, g) => { if (g.dy > 0) swipePan.setValue(g.dy); },
            onPanResponderRelease: (_, g) => {
                if ((g.dy > 80 || g.vy > 0.5) && !isClosing.current) {
                    isClosing.current = true;
                    Animated.parallel([
                        Animated.timing(swipePan, { toValue: SCREEN_HEIGHT, duration: 240, useNativeDriver: true }),
                        Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
                    ]).start(() => { swipePan.setValue(0); onClose(); });
                } else {
                    Animated.spring(swipePan, { toValue: 0, useNativeDriver: true, bounciness: 6, speed: 14 }).start();
                }
            },
        })
    ).current;

    const combinedY = Animated.add(translateY, swipePan);

    return (
        <Modal visible={visible} transparent onRequestClose={onClose} animationType="none">
            <View style={StyleSheet.absoluteFill}>
                <Animated.View style={[bs.sheetBackdrop, { opacity: backdropOpacity }]}>
                    <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
                </Animated.View>

                <Animated.View style={[bs.bottomSheet, { transform: [{ translateY: combinedY }] }]}>
                    <View style={bs.sheetHeader} {...swipeResponder.panHandlers}>
                        <View style={bs.handleBar} />
                        <View style={bs.sheetTitleRow}>
                            <Text style={bs.sheetTitle}>{title}</Text>
                            <TouchableOpacity onPress={onClose} style={bs.closeBtn}>
                                <Icon name="close" size={18} color={Colors.gray_66} />
                            </TouchableOpacity>
                        </View>
                        <View style={bs.sheetSearchRow}>
                            <Icon name="magnify" size={20} color={Colors.gray_66} style={{ marginRight: 8 }} />
                            <TextInput
                                style={bs.sheetSearchInput}
                                placeholder={searchPlaceholder}
                                placeholderTextColor={Colors.text_placeholder}
                                value={searchText}
                                onChangeText={onSearch}
                            />
                            {searchText.length > 0 && (
                                <TouchableOpacity onPress={() => onSearch("")}>
                                    <Icon name="close-circle" size={18} color={Colors.text_placeholder} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    <FlatList
                        data={items}
                        keyExtractor={(item, index) => item.value || index.toString()}
                        contentContainerStyle={{ paddingBottom: 20 }}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                        initialNumToRender={15}
                        maxToRenderPerBatch={10}
                        windowSize={5}
                        removeClippedSubviews={Platform.OS === "android"}
                        renderItem={({ item }) => {
                            const label = getLabel(item);
                            const isSel = selectedValue === (item.value || label || item._id);
                            return (
                                <TouchableOpacity
                                    style={[bs.sheetListItem, isSel && bs.sheetListItemSel]}
                                    onPress={() => onSelect(item)}
                                    activeOpacity={0.75}
                                >
                                    <View style={[bs.sheetListIconBox, isSel && bs.sheetListIconBoxSel]}>
                                        <Icon name={iconName} size={20} color={isSel ? Colors.white : Colors.finance_accent} />
                                    </View>
                                    <Text style={[bs.sheetListTxt, isSel && bs.sheetListTxtSel]}>{label}</Text>
                                    {isSel && (
                                        <View style={bs.checkCircle}>
                                            <Icon name="check" size={14} color={Colors.white} />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                        ListEmptyComponent={
                            <View style={bs.emptyWrap}>
                                <Text style={bs.emptyTxt}>No results found</Text>
                            </View>
                        }
                    />
                </Animated.View>
            </View>
        </Modal>
    );
}

const AepsRegistration = () => {
    const [loading, setLoading] = useState(false);
    const [banksLoading, setBanksLoading] = useState(true);
    const [showCalendar, setShowCalendar] = useState(false);

    const [genderModal, setGenderModal] = useState(false);
    const [bankModal, setBankModal] = useState(false);
    const [searchText, setSearchText] = useState("");

    const genderItems = [
        { label: "Male", value: "M" },
        { label: "Female", value: "F" },
        { label: "Other", value: "O" },
    ];

    const [bankItems, setBankItems] = useState([]);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        mobile: "",
        aadhaar: "",
        pan: "",
        dateOfBirth: "",
        gender: "",
        bankCode: "",
        latitude: 26.9124,
        longitude: 75.7873,
        address: {
            full: "",
            city: "",
            pincode: "",
        },
    });

    const [errors, setErrors] = useState({});

    useEffect(() => {
        loadBanks();
    }, []);

    const loadBanks = async () => {
        try {
            const headerToken = await AsyncStorage.getItem("header_token");
            const headerKey = await AsyncStorage.getItem("header_key");
            if (!headerToken) return;

            const response = await fetchAepsBanks({ headerToken, headerKey });
            if (response && (response.success || response.status === "SUCCESS" || Array.isArray(response.data))) {
                // Try to find the array in common fields
                const rawList = Array.isArray(response.data) ? response.data : (response.banks || response.bankList || []);
                const list = rawList.map((b) => ({
                    name: b.name || b.bankName || "Unknown Bank",
                    _id: b._id || b.bankId || b.id || b.bankCode,
                }));
                setBankItems(list);
            }
        } catch (err) {
            console.log("Load Banks Error:", err);
        } finally {
            setBanksLoading(false);
        }
    };

    const updateNestedField = (parent, field, value) => {
        setFormData((prev) => ({
            ...prev,
            [parent]: {
                ...prev[parent],
                [field]: value,
            },
        }));
    };

    const validate = () => {
        let e = {};
        if (!formData.name.trim()) {
            e.name = "Name is required";
        } else if (formData.name.length > 100) {
            e.name = "Maximum 100 characters allowed";
        } else if (!/^[A-Za-z\s]+$/.test(formData.name)) {
            e.name = "Only alphabets are allowed";
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email.trim()) {
            e.email = "Email is required";
        } else if (!emailRegex.test(formData.email)) {
            e.email = "Please enter a valid email address";
        }
        if (!/^\d{10}$/.test(formData.mobile)) e.mobile = "10-digit mobile number required";
        if (!/^\d{12}$/.test(formData.aadhaar)) e.aadhaar = "12-digit Aadhaar required";
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan.toUpperCase())) e.pan = "Valid PAN required";
        if (!formData.dateOfBirth.trim()) {
            e.dob = "DOB is required";
        } else {
            const birthDate = new Date(formData.dateOfBirth);
            const today = new Date();
            let age = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                age--;
            }
            if (age < 18) {
                e.dob = "Age must be at least 18 years";
            }
        }
        if (!formData.gender) e.gender = "Gender is required";
        if (!formData.bankCode) e.bank = "Please select a bank";

        if (!formData.address.full.trim()) e.addrFull = "Full address is required";
        else if (formData.address.full.length > 200) e.addrFull = "Maximum 200 characters allowed";
        if (!formData.address.city.trim()) {
            e.city = "City is required";
        } else if (!/^[A-Za-z\s]+$/.test(formData.address.city)) {
            e.city = "Only alphabets are allowed";
        }
        if (!/^\d{6}$/.test(formData.address.pincode)) e.pincode = "6-digit Pincode required";

        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const handleSubmit = async () => {
        if (!validate()) return;

        setLoading(true);
        try {
            const headerToken = await AsyncStorage.getItem("header_token");
            if (!headerToken) {
                throw new Error("Session expired. Please login again.");
            }

            const idempotencyKey = `REGOUTLET_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;
            const response = await registerOutlet({ data: formData, headerToken, idempotencyKey });

            if (response.success || response.status === "SUCCESS") {
                AlertService.showAlert({
                    type: "success",
                    title: "Registration Successful",
                    message: response.message || "Your AEPS outlet has been registered successfully.",
                    onClose: () => NavigationService.goBack(),
                });
            } else {
                AlertService.showAlert({
                    type: "error",
                    title: "Registration Failed",
                    message: response.message || "Something went wrong. Please try again.",
                });
            }
        } catch (error) {
            console.log("Submit Error:", error);
            AlertService.showAlert({
                type: "error",
                title: "Error",
                message: error.message || "Failed to register outlet. Check your connection.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDateConfirm = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const formatted = `${year}-${month}-${day}`;
        setFormData({ ...formData, dateOfBirth: formatted });
        setShowCalendar(false);
    };

    const renderInput = (label, value, onChangeText, placeholder, icon, error, keyboardType = "default", maxLength) => (
        <View style={styles.inputContainer}>
            <Text style={styles.label}>{label}</Text>
            <View style={[styles.inputWrapper, error && styles.inputError]}>
                <Icon name={icon} size={20 * S} color={Colors.primary} style={styles.inputIcon} />
                <TextInput
                    style={styles.input}
                    value={value}
                    onChangeText={onChangeText}
                    placeholder={placeholder}
                    placeholderTextColor={Colors.gray_BD}
                    keyboardType={keyboardType}
                    maxLength={maxLength}
                />
                {error && <Icon name="alert-circle" size={18 * S} color={Colors.red} />}
            </View>
            {error && <Text style={styles.errorText}>{error}</Text>}
        </View>
    );

    const selectedGender = genderItems.find(g => g.value === formData.gender);
    const selectedBank = bankItems.find(b => b._id === formData.bankCode);

    return (
        <SafeAreaView style={styles.container}>
            <HeaderBar
                title="AEPS Registration"
                onBack={() => NavigationService.goBack()}
            />

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* ── Hero Title ── */}
                    <View style={styles.heroWrap}>
                        <View style={styles.heroBadge}>
                            <View style={styles.heroBadgeDot} />
                            <Text style={styles.heroBadgeTxt}>LIVE · AEPS Registration</Text>
                        </View>
                        <Text style={styles.heroTitle}>{"Aadhaar Enabled\nPayment System"}</Text>
                        <Text style={styles.heroSub}>Modernized Biometric Authentication Gateway</Text>
                    </View>
                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Personal Details</Text>

                        {renderInput("FULL NAME", formData.name, (t) => {
                            const filtered = t.replace(/[^A-Za-z\s]/g, "");
                            setFormData({ ...formData, name: filtered });
                        }, "Enter your full name", "account-outline", errors.name, "default", 100)}

                        {renderInput("EMAIL ADDRESS", formData.email, (t) => setFormData({ ...formData, email: t }), "example@mail.com", "email-outline", errors.email, "email-address")}

                        {renderInput("MOBILE NUMBER", formData.mobile, (t) => {
                            const filtered = t.replace(/[^0-9]/g, "");
                            setFormData({ ...formData, mobile: filtered });
                        }, "9876543210", "phone-outline", errors.mobile, "phone-pad", 10)}

                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.label}>GENDER</Text>
                                <TouchableOpacity
                                    style={[styles.inputWrapper, errors.gender && styles.inputError]}
                                    onPress={() => setGenderModal(true)}
                                >
                                    <Icon name="account-group-outline" size={18 * S} color={Colors.primary} style={styles.inputIcon} />
                                    <Text style={[styles.input, !formData.gender && { color: Colors.gray_BD }]} numberOfLines={1} ellipsizeMode="tail">
                                        {selectedGender ? selectedGender.label : "Select Gender"}
                                    </Text>
                                    <Icon name="chevron-down" size={16} color={Colors.gray_BD} />
                                </TouchableOpacity>
                                {errors.gender && <Text style={styles.errorText}>{errors.gender}</Text>}
                            </View>
                            <View style={{ flex: 1, marginLeft: 16 * S }}>
                                <Text style={styles.label}>DATE OF BIRTH</Text>
                                <TouchableOpacity
                                    style={[styles.inputWrapper, errors.dob && styles.inputError]}
                                    onPress={() => setShowCalendar(true)}
                                >
                                    <Icon name="calendar-outline" size={18 * S} color={Colors.primary} style={styles.inputIcon} />
                                    <Text style={[styles.input, !formData.dateOfBirth && { color: Colors.gray_BD }]} numberOfLines={1} ellipsizeMode="tail">
                                        {formData.dateOfBirth || "YYYY-MM-DD"}
                                    </Text>
                                </TouchableOpacity>
                                {errors.dob && <Text style={styles.errorText}>{errors.dob}</Text>}
                            </View>
                        </View>
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Verification Details</Text>

                        <View style={{ marginBottom: 15 * S }}>
                            <Text style={styles.label}>SELECT BANK</Text>
                            <TouchableOpacity
                                style={[styles.inputWrapper, errors.bank && styles.inputError]}
                                onPress={() => setBankModal(true)}
                            >
                                <Icon name="bank-outline" size={20 * S} color={Colors.primary} style={styles.inputIcon} />
                                <Text style={[styles.input, !formData.bankCode && { color: Colors.gray_BD }]} numberOfLines={1}>
                                    {selectedBank ? selectedBank.name : "Choose your bank"}
                                </Text>
                                <Icon name="chevron-down" size={20} color={Colors.gray_BD} />
                            </TouchableOpacity>
                            {errors.bank && <Text style={styles.errorText}>{errors.bank}</Text>}
                        </View>

                        {renderInput("AADHAAR NUMBER", formData.aadhaar, (t) => {
                            const filtered = t.replace(/[^0-9]/g, "");
                            setFormData({ ...formData, aadhaar: filtered });
                        }, "1234 5678 9012", "card-account-details-outline", errors.aadhaar, "number-pad", 12)}

                        {renderInput("PAN CARD NUMBER", formData.pan, (t) => {
                            const filtered = t.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
                            setFormData({ ...formData, pan: filtered });
                        }, "ABCDE1234F", "card-text-outline", errors.pan, "default", 10)}
                    </View>

                    <View style={styles.card}>
                        <Text style={styles.sectionTitle}>Address Details</Text>

                        {renderInput("FULL ADDRESS", formData.address.full, (t) => updateNestedField("address", "full", t), "Shop No, Street, Area", "map-marker-outline", errors.addrFull, "default", 200)}

                        <View style={styles.row}>
                            <View style={{ flex: 1 }}>
                                {renderInput("CITY", formData.address.city, (t) => {
                                    const filtered = t.replace(/[^A-Za-z\s]/g, "");
                                    updateNestedField("address", "city", filtered);
                                }, "Jaipur", "city-variant-outline", errors.city)}
                            </View>
                            <View style={{ flex: 1, marginLeft: 16 * S }}>
                                {renderInput("PINCODE", formData.address.pincode, (t) => {
                                    const filtered = t.replace(/[^0-9]/g, "");
                                    updateNestedField("address", "pincode", filtered);
                                }, "302001", "mailbox-outline", errors.pincode, "number-pad", 6)}
                            </View>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.submitBtn}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color={Colors.white} />
                        ) : (
                            <>
                                <Text style={styles.submitBtnTxt}>Register To AEPS</Text>
                                <Icon name="arrow-right" size={20 * S} color={Colors.white} style={{ marginLeft: 8 * S }} />
                            </>
                        )}
                    </TouchableOpacity>

                    <View style={{ height: 40 * S }} />
                </ScrollView>
            </KeyboardAvoidingView>

            <CalendarModal
                visible={showCalendar}
                title="Select Birth Date"
                onConfirm={handleDateConfirm}
                onCancel={() => setShowCalendar(false)}
                maxDate={(() => {
                    const d = new Date();
                    d.setFullYear(d.getFullYear() - 18);
                    return d;
                })()}
            />

            {/* GENDER PICKER */}
            <BottomSheetModal
                visible={genderModal}
                onClose={() => { setGenderModal(false); setSearchText(""); }}
                title="Select Gender"
                searchText={searchText}
                onSearch={setSearchText}
                searchPlaceholder="Search..."
                items={genderItems.filter(i => i.label.toLowerCase().includes(searchText.toLowerCase()))}
                selectedValue={formData.gender}
                iconName="account"
                getLabel={(i) => i.label}
                onSelect={(i) => {
                    setFormData({ ...formData, gender: i.value });
                    setGenderModal(false);
                    setSearchText("");
                }}
            />

            {/* BANK PICKER */}
            <BottomSheetModal
                visible={bankModal}
                onClose={() => { setBankModal(false); setSearchText(""); }}
                title="Select Your Bank"
                searchText={searchText}
                onSearch={setSearchText}
                searchPlaceholder="Search Bank..."
                items={bankItems.filter(i => i.name.toLowerCase().includes(searchText.toLowerCase()))}
                selectedValue={formData.bankCode}
                iconName="bank"
                getLabel={(i) => i.name}
                onSelect={(i) => {
                    setFormData({ ...formData, bankCode: i._id });
                    setBankModal(false);
                    setSearchText("");
                }}
            />
        </SafeAreaView>
    );
};

export default AepsRegistration;

const bs = StyleSheet.create({
    sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.blackOpacity_45 },
    bottomSheet: {
        position: "absolute", bottom: 0, left: 0, right: 0,
        backgroundColor: Colors.white,
        borderTopLeftRadius: 30, borderTopRightRadius: 30,
        maxHeight: "85%",
        elevation: 25, shadowColor: Colors.black, shadowOpacity: 0.15, shadowRadius: 20,
    },
    sheetHeader: {
        paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: Colors.slate_100,
        paddingTop: 8, paddingBottom: 16,
    },
    handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.slate_100, alignSelf: "center", marginTop: 8, marginBottom: 12 },
    sheetTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
    sheetTitle: { fontSize: 18, fontFamily: Fonts.Bold, color: Colors.slate_900, letterSpacing: -0.2 },
    closeBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.slate_50, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: Colors.slate_100 },
    sheetSearchRow: {
        flexDirection: "row", alignItems: "center",
        backgroundColor: Colors.slate_50,
        borderRadius: 12, paddingHorizontal: 12,
        marginBottom: 4, height: 48,
        borderWidth: 1, borderColor: Colors.slate_100,
    },
    sheetSearchInput: { flex: 1, fontSize: 14, fontFamily: Fonts.Medium, color: Colors.slate_900, padding: 0 },
    sheetListItem: {
        flexDirection: "row", alignItems: "center",
        paddingHorizontal: 20, paddingVertical: 15,
        borderBottomWidth: 1, borderBottomColor: Colors.slate_50,
    },
    sheetListItemSel: { backgroundColor: Colors.slate_50 },
    sheetListIconBox: {
        width: 40, height: 40, borderRadius: 12,
        backgroundColor: Colors.slate_50,
        alignItems: "center", justifyContent: "center", marginRight: 16,
        borderWidth: 1, borderColor: Colors.slate_100,
    },
    sheetListIconBoxSel: { backgroundColor: Colors.primary, borderColor: Colors.primary },
    sheetListTxt: { flex: 1, fontSize: 15, fontFamily: Fonts.Medium, color: Colors.slate_700 },
    sheetListTxtSel: { color: Colors.primary, fontFamily: Fonts.Bold },
    checkCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.finance_accent, alignItems: "center", justifyContent: "center" },
    emptyWrap: { alignItems: "center", paddingVertical: 40 },
    emptyTxt: { color: Colors.slate_400, fontSize: 14, fontFamily: Fonts.Medium, textAlign: "center" },
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
    },
    scrollContent: {
        padding: 20 * S,
    },
    // Hero
    heroWrap: {
        marginBottom: 20 * S,
    },
    heroBadge: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "flex-start",
        backgroundColor: Colors.homebg,
        borderRadius: 999,
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: "rgba(212,168,67,0.2)",
        marginBottom: 12,
    },
    heroBadgeDot: {
        width: 6, height: 6, borderRadius: 3,
        backgroundColor: Colors.success,
        marginRight: 8,
    },
    heroBadgeTxt: {
        fontSize: 11,
        fontFamily: Fonts.Bold,
        color: Colors.finance_accent,
        letterSpacing: 0.06,
        textTransform: "uppercase",
    },
    heroTitle: {
        fontSize: 26 * S,
        fontFamily: Fonts.Bold,
        color: Colors.slate_900,
        letterSpacing: -0.5,
        lineHeight: 30 * S,
        marginBottom: 6,
    },
    heroSub: {
        fontSize: 13,
        color: Colors.text_secondary,
        fontFamily: Fonts.Regular,
        lineHeight: 18,
    },
    card: {
        backgroundColor: Colors.homebg,
        borderRadius: 20 * S,
        padding: 18 * S,
        marginBottom: 20 * S,
        elevation: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    sectionTitle: {
        fontFamily: Fonts.Bold,
        fontSize: 16 * S,
        color: Colors.primary,
        marginBottom: 15 * S,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    inputContainer: {
        marginBottom: 15 * S,
    },
    label: {
        fontFamily: Fonts.Bold,
        fontSize: 11 * S,
        color: Colors.gray_75,
        marginBottom: 6 * S,
        marginLeft: 4 * S,
    },
    inputWrapper: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: Colors.white,
        borderRadius: 15 * S,
        borderWidth: 0.5,
        borderColor: Colors.finance_accent,
        paddingHorizontal: 12 * S,
        height: 48 * S,
    },
    inputError: {
        borderColor: Colors.red,
    },
    inputIcon: {
        marginRight: 10 * S,
    },
    input: {
        flex: 1,
        fontFamily: Fonts.SemiBold,
        fontSize: 14 * S,
        color: Colors.primary,
    },
    errorText: {
        fontFamily: Fonts.Medium,
        fontSize: 10 * S,
        color: Colors.red,
        marginTop: 4 * S,
        marginLeft: 4 * S,
    },
    row: {
        flexDirection: "row",
        alignItems: "flex-start",
    },
    submitBtn: {
        backgroundColor: Colors.primary,
        borderRadius: 16 * S,
        height: 58 * S,
        flexDirection: "row",
        justifyContent: "center",
        alignItems: "center",
        elevation: 8,
        shadowColor: Colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    submitBtnTxt: {
        fontFamily: Fonts.Bold,
        fontSize: 17 * S,
        color: Colors.white,
        letterSpacing: 0.5,
    },
});

