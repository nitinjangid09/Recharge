import React, { useEffect, useRef, useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    Animated,
    Easing,
    Dimensions,
    Keyboard,
    ActivityIndicator,
    ScrollView,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Colors from "../../constants/Colors";
import Fonts from "../../constants/Fonts";
import CustomAlert from "../../componets/Alerts/CustomAlert";
import { getRoleList, createNewUser } from "../../api/AuthApi";
import FullScreenLoader from "../../componets/Loader/FullScreenLoader";

/* ---------- RESPONSIVE SCALE ---------- */
const { width } = Dimensions.get("window");
const scale = width / 375;

export default function CreateUser({ navigation }) {
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [phone, setPhone] = useState("");
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("");
    const [rolesList, setRolesList] = useState([]);
    const [roleOpen, setRoleOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [focusedInput, setFocusedInput] = useState(null);
    const [errors, setErrors] = useState({});

    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState("");
    const [alertMessage, setAlertMessage] = useState("");

    const pageAnim = useRef(new Animated.Value(0)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;
    const btnScale = useRef(new Animated.Value(1)).current;

    // Simplified Focus Animations
    const getBorderColor = (isFocused) => isFocused ? Colors.primary : Colors.input_border;
    const getScale = (isFocused) => isFocused ? 1.02 : 1;
    const getBgColor = (isFocused) => isFocused ? Colors.white : Colors.input_bg;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(pageAnim, {
                toValue: 1,
                duration: 800,
                easing: Easing.out(Easing.exp),
                useNativeDriver: true,
            })
        ]).start();

        fetchRoles();
    }, [pageAnim]);

    const fetchRoles = async () => {
        const result = await getRoleList();
        if (result?.success && result?.data) {
            let roles = result.data;

            try {
                const profileStr = await AsyncStorage.getItem("profile_data");
                if (profileStr) {
                    const profile = JSON.parse(profileStr);
                    const currentRoleId = profile?.roleId?._id || profile?.roleId;

                    if (currentRoleId === "698ef04e14f23da91959cf45") { // MASTER DISTRIBUTOR
                        roles = roles.filter(r =>
                            r._id === "698ef05714f23da91959cf48" || // DISTRIBUTOR
                            r._id === "698ef06914f23da91959cf4b"    // RETAILER
                        );
                    } else if (currentRoleId === "698ef05714f23da91959cf48") { // DISTRIBUTOR
                        roles = roles.filter(r => r._id === "698ef06914f23da91959cf4b"); // RETAILER
                    } else if (currentRoleId === "698ef03714f23da91959cf41") { // STATE HEAD
                        roles = roles.filter(r =>
                            r._id === "698ef04e14f23da91959cf45" || // MASTER DISTRIBUTOR
                            r._id === "698ef05714f23da91959cf48" || // DISTRIBUTOR
                            r._id === "698ef06914f23da91959cf4b"    // RETAILER
                        );
                    } else {
                        // For any other unexpected role, show no assignable roles
                        roles = [];
                    }
                }
            } catch (e) {
                console.log("Error filtering roles:", e);
            }

            setRolesList(
                roles.map((r) => ({ label: r.name, value: r._id }))
            );
        }
    };

    const triggerShake = () => {
        shakeAnim.setValue(0);
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
        ]).start();
    };

    const animateButton = () => {
        Animated.sequence([
            Animated.timing(btnScale, { toValue: 0.95, duration: 100, useNativeDriver: true }),
            Animated.timing(btnScale, { toValue: 1, duration: 100, useNativeDriver: true })
        ]).start();
    };

    const showAlert = (title, message) => {
        setAlertTitle(title);
        setAlertMessage(message);
        setAlertVisible(true);
    };

    const handleCreateUser = async () => {
        Keyboard.dismiss();
        animateButton();

        let newErrors = {};
        if (!firstName.trim()) newErrors.firstName = "First name is required";
        if (!lastName.trim()) newErrors.lastName = "Last name is required";
        if (!phone) newErrors.phone = "Mobile number is required";
        else if (phone.length !== 10) newErrors.phone = "Mobile number must be exactly 10 digits";
        else if (!/^[6-9]/.test(phone)) newErrors.phone = "Mobile number must start with 6, 7, 8 or 9";

        const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
        if (!email) newErrors.email = "Email address is required";
        else if (!emailRegex.test(email.trim().toLowerCase())) newErrors.email = "Please enter a valid email address";

        if (firstName.trim().length > 100) newErrors.firstName = "First name cannot exceed 100 characters";
        if (lastName.trim().length > 100) newErrors.lastName = "Last name cannot exceed 100 characters";

        if (!role) newErrors.role = "Role is required";

        if (Object.keys(newErrors).length > 0) {
            triggerShake();
            setErrors(newErrors);
            return;
        }

        const payload = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            phone: phone.trim(),
            email: email.trim().toLowerCase(),
            role: role
        };

        setLoading(true);
        try {
            const headerToken = await AsyncStorage.getItem("header_token");
            const result = await createNewUser(payload, headerToken);
            setLoading(false);

            if (result?.success) {
                showAlert("Success", result?.message || "User created successfully");
                // Clear fields on success
                setFirstName("");
                setLastName("");
                setPhone("");
                setEmail("");
                setRole("");
                // Auto navigate back after a brief delay
                setTimeout(() => {
                    setAlertVisible(false);
                    navigation.goBack();
                }, 1500);
            } else {
                triggerShake();
                showAlert("Failed", result?.message || "User already exists");
            }
        } catch (error) {
            setLoading(false);
            triggerShake();
            showAlert("Error", "An unexpected error occurred");
        }
    };

    const pageTranslateY = pageAnim.interpolate({ inputRange: [0, 1], outputRange: [50, 0] });
    const pageOpacity = pageAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

    const renderInput = (label, icon, value, setValue, keyName, keyboardType = 'default', extraProps = {}) => {
        const isFocused = focusedInput === keyName;
        const error = errors[keyName];
        return (
            <View style={styles.inputContainer}>
                <Text style={styles.label}>{label}</Text>
                <Animated.View
                    style={[
                        styles.inputBox,
                        {
                            borderColor: error ? Colors.red : getBorderColor(isFocused),
                            transform: [{ scale: getScale(isFocused) }],
                            backgroundColor: getBgColor(isFocused)
                        }
                    ]}
                >
                    <MaterialCommunityIcons name={icon} size={20} color={error ? Colors.red : isFocused ? Colors.black : Colors.gray} style={styles.inputIcon} />
                    <TextInput
                        placeholder={`Enter ${label}`}
                        placeholderTextColor={Colors.gray}
                        keyboardType={keyboardType}
                        value={value}
                        onChangeText={(val) => {
                            setValue(val);
                            if (errors[keyName]) setErrors(prev => ({ ...prev, [keyName]: null }));
                        }}
                        onFocus={() => setFocusedInput(keyName)}
                        onBlur={() => setFocusedInput(null)}
                        style={styles.input}
                        selectionColor={Colors.accent}
                        {...extraProps}
                    />
                </Animated.View>
                {!!error && (
                    <Text style={styles.errorText}>
                        <MaterialCommunityIcons name="alert-circle-outline" size={12} /> {error}
                    </Text>
                )}
            </View>
        );
    };

    return (
        <LinearGradient colors={Colors.background_gradient} style={styles.container}>
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.circle1} />
                <View style={styles.circle2} />

                <Animated.View
                    style={[
                        styles.pageWrapper,
                        {
                            opacity: pageOpacity,
                            transform: [{ translateY: pageTranslateY }]
                        }
                    ]}
                >
                    <ScrollView
                        nestedScrollEnabled={true}
                        contentContainerStyle={styles.scrollContent}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                    >
                        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                            <MaterialCommunityIcons name="arrow-left" size={24} color={Colors.primary} />
                        </TouchableOpacity>

                        <View style={styles.header}>
                            <View style={styles.logoContainer}>
                                <Text style={styles.logoText}>U</Text>
                            </View>
                        </View>

                        <Animated.View style={[styles.card, { transform: [{ translateX: shakeAnim }] }]}>
                            <Text style={styles.welcome}>Add New User</Text>
                            <Text style={styles.subTitle}>Fill details to add a new member</Text>

                            {renderInput("First Name", "account", firstName, (t) => setFirstName(t.replace(/[^a-zA-Z\s]/g, "")), "firstName", 'default', { maxLength: 100 })}
                            {renderInput("Last Name", "account-outline", lastName, (t) => setLastName(t.replace(/[^a-zA-Z\s]/g, "")), "lastName", 'default', { maxLength: 100 })}
                            {renderInput("Mobile Number", "phone", phone, (text) => setPhone(text.replace(/[^0-9]/g, "")), "phone", "phone-pad", { maxLength: 10 })}
                            {renderInput("Email Address", "email", email, (t) => setEmail(t.replace(/\s/g, "")), "email", "email-address")}

                            <View style={[styles.inputContainer, { zIndex: 10 }]}>
                                <Text style={styles.label}>Select Role</Text>
                                <TouchableOpacity
                                    style={[
                                        styles.inputBox,
                                        {
                                            height: 50 * scale,
                                            justifyContent: 'space-between',
                                            paddingHorizontal: 16 * scale,
                                            backgroundColor: roleOpen ? Colors.white : Colors.input_bg,
                                            borderColor: errors.role ? Colors.red : roleOpen ? Colors.primary : Colors.input_border
                                        }
                                    ]}
                                    onPress={() => { setRoleOpen(!roleOpen); if (errors.role) setErrors(prev => ({ ...prev, role: null })); }}
                                    activeOpacity={0.85}
                                >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                        <MaterialCommunityIcons name="account-group-outline" size={20} color={errors.role ? Colors.red : role ? Colors.black : Colors.gray} style={styles.inputIcon} />
                                        <Text style={[styles.input, { color: role ? Colors.black : Colors.gray }]}>
                                            {rolesList.find(r => r.value === role)?.label || "Select Role..."}
                                        </Text>
                                    </View>
                                    <MaterialCommunityIcons name="chevron-down" size={20} color={Colors.gray} />
                                </TouchableOpacity>
                                {!!errors.role && (
                                    <Text style={styles.errorText}>
                                        <MaterialCommunityIcons name="alert-circle-outline" size={12} /> {errors.role}
                                    </Text>
                                )}

                                {roleOpen && (
                                    <View style={styles.customDropContainer}>
                                        <ScrollView nestedScrollEnabled style={{ maxHeight: 180 * scale }}>
                                            {rolesList.map((r, index) => (
                                                <TouchableOpacity
                                                    key={r.value}
                                                    style={[
                                                        styles.customDropItem,
                                                        index === rolesList.length - 1 && { borderBottomWidth: 0 },
                                                        role === r.value && { backgroundColor: "rgba(255,255,255,0.12)" }
                                                    ]}
                                                    onPress={() => {
                                                        setRole(r.value);
                                                        setRoleOpen(false);
                                                    }}
                                                >
                                                    <Text style={[styles.customDropText, role === r.value && { color: Colors.accent }]}>{r.label}</Text>
                                                    {role === r.value && <MaterialCommunityIcons name="check" size={16} color={Colors.accent} />}
                                                </TouchableOpacity>
                                            ))}
                                        </ScrollView>
                                    </View>
                                )}
                            </View>

                            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                                <TouchableOpacity
                                    style={styles.loginBtn}
                                    onPress={handleCreateUser}
                                    disabled={loading}
                                    activeOpacity={0.9}
                                >
                                    {loading ? (
                                        <ActivityIndicator size="small" color={Colors.white} />
                                    ) : (
                                        <Text style={styles.loginText}>Create User</Text>
                                    )}
                                </TouchableOpacity>
                            </Animated.View>
                        </Animated.View>
                    </ScrollView>
                </Animated.View>

                <CustomAlert
                    visible={alertVisible}
                    title={alertTitle}
                    message={alertMessage}
                    onClose={() => setAlertVisible(false)}
                />
                <FullScreenLoader visible={loading} label="Creating User..." />
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    pageWrapper: { flex: 1 },
    scrollContent: { flexGrow: 1, justifyContent: 'center', paddingVertical: 20 * scale },
    header: { 
        width: '100%',
        flexDirection: 'row',
        alignItems: "center", 
        justifyContent: 'center',
        marginBottom: 20 * scale, 
        marginTop: 10 * scale,
        minHeight: 64 * scale,
    },
    backBtn: { 
        position: 'absolute',
        left: 10 * scale,
        top: 10 * scale,
        zIndex: 99,
        padding: 10 * scale,
    },
    logoContainer: {
        width: 64 * scale, height: 64 * scale, borderRadius: 18 * scale,
        backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    },
    logoText: { fontSize: 32 * scale, fontFamily: Fonts.Bold, color: Colors.white },
    appName: { fontSize: 24 * scale, fontFamily: Fonts.Bold, color: Colors.primary, letterSpacing: 0.5 },
    card: {
        marginHorizontal: 16 * scale, backgroundColor: Colors.beige, borderRadius: 24 * scale,
        padding: 16 * scale,
    },
    welcome: { fontSize: 22 * scale, fontFamily: Fonts.Bold, textAlign: "center", color: Colors.primary },
    subTitle: { fontSize: 13 * scale, fontFamily: Fonts.Medium, color: Colors.text_secondary, textAlign: "center", marginTop: 6 * scale, marginBottom: 20 * scale },
    inputContainer: { marginBottom: 16 * scale },
    label: { fontSize: 13 * scale, fontFamily: Fonts.Bold, color: Colors.black, marginBottom: 6 * scale, marginLeft: 4 * scale },
    errorText: {
        fontSize: 12 * scale,
        fontFamily: Fonts.Medium,
        color: Colors.red,
        marginLeft: 12 * scale,
        marginTop: 4 * scale,
    },
    inputBox: {
        flexDirection: "row", alignItems: "center", borderRadius: 30 * scale, height: 50 * scale,
        paddingHorizontal: 16 * scale, borderWidth: 1
    },
    inputIcon: { marginRight: 10 * scale },
    input: { flex: 1, fontSize: 15 * scale, color: Colors.black, fontFamily: Fonts.Medium, padding: 0 },
    loginBtn: {
        backgroundColor: Colors.primary, borderRadius: 25 * scale, height: 50 * scale,
        justifyContent: "center", alignItems: "center",
    },
    loginText: { color: Colors.white, fontSize: 16 * scale, fontFamily: Fonts.Bold, letterSpacing: 0.5 },
    circle1: {
        position: 'absolute', width: 250 * scale, height: 250 * scale, borderRadius: 125 * scale,
        backgroundColor: Colors.circle_bg, top: -70 * scale, right: -70 * scale,
    },
    circle2: {
        position: 'absolute', width: 200 * scale, height: 200 * scale, borderRadius: 100 * scale,
        backgroundColor: Colors.circle_bg, bottom: -40 * scale, left: -40 * scale,
    },
    customDropContainer: {
        backgroundColor: Colors.primary,
        borderRadius: 16 * scale,
        marginTop: 6 * scale,
        overflow: 'hidden',
    },
    customDropItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 14 * scale,
        paddingHorizontal: 16 * scale,
        borderBottomWidth: 1,
        borderBottomColor: "rgba(255,255,255,0.12)",
    },
    customDropText: {
        fontSize: 14 * scale,
        fontFamily: Fonts.Medium,
        color: Colors.white,
    },
});
