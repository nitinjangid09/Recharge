import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Easing, Platform } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';
import Fonts from '../../constants/Fonts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchUserProfile } from '../../api/AuthApi';
import { ActivityIndicator } from 'react-native';

const { width } = Dimensions.get('window');

export default function PaymentVerification({ navigation }) {
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(30)).current;
    const [refreshing, setRefreshing] = React.useState(false);

    React.useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
            Animated.timing(slideAnim, { toValue: 0, duration: 800, easing: Easing.out(Easing.back(1.5)), useNativeDriver: true })
        ]).start();
    }, []);

    const logout = async () => {
        await AsyncStorage.clear();
        navigation.reset({
            index: 0,
            routes: [{ name: 'Login' }],
        });
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        try {
            const headerToken = await AsyncStorage.getItem("header_token");
            if (!headerToken) {
                logout();
                return;
            }

            const res = await fetchUserProfile({ headerToken });
            if (res && res.success && res.data) {
                const u = res.data;
                // Update local storage with fresh user data
                await AsyncStorage.setItem("user_profile", JSON.stringify(u));
                if (u.kycStatus) await AsyncStorage.setItem("kyc_status", u.kycStatus);

                // If account is now active or payment is confirmed, navigate away
                // Note: The logic for redirection depends on the backend's status field names.
                // Here we assume 'approved' or 'active' means they can go to Home.
                if (u.id_payment_status === 'success' || u.id_payment_status === 'approved' || u.kycStatus === 'approved') {
                    navigation.reset({
                        index: 0,
                        routes: [{ name: 'Home' }],
                    });
                }
            }
        } catch (error) {
            console.log("Refresh error:", error);
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <LinearGradient colors={Colors.background_gradient} style={styles.container}>
            <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                    {/* Icon Wrapper */}
                    <View style={styles.iconCircle}>
                        <Text style={{ fontSize: 44 }}>⏳</Text>
                    </View>
    
                    {/* Title & Description */}
                    <Text style={styles.title}>Payment Verification</Text>
                    <Text style={styles.desc}>
                        Your payment request has been submitted. Our compliance team is currently verifying the transaction details.
                    </Text>
    
                    {/* Status Box */}
                    <View style={styles.statusBox}>
                        <View style={styles.statusDotRow}>
                            <View style={styles.dot} />
                            <Text style={styles.statusSubtitle}>CURRENT STATUS</Text>
                        </View>
                        <Text style={styles.statusMain}>AUDIT IN PROGRESS</Text>
                        <Text style={styles.estTime}>Estimated time: 2-4 hours</Text>
                    </View>
    
                    {/* Footer Action */}
                    <TouchableOpacity
                        style={[styles.refreshBtn, refreshing && { opacity: 0.7 }]}
                        onPress={handleRefresh}
                        disabled={refreshing}
                        activeOpacity={0.8}
                    >
                        {refreshing ? (
                            <ActivityIndicator color={Colors.white} size="small" />
                        ) : (
                            <Text style={styles.refreshText}>Check Status Now</Text>
                        )}
                    </TouchableOpacity>
    
                    <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.6}>
                        <Text style={styles.logoutText}>Logout from Session</Text>
                    </TouchableOpacity>
                </Animated.View>
            </SafeAreaView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    card: {
        width: width * 0.9,
        backgroundColor: Colors.beige,
        borderRadius: 32,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.input_border,
    },
    iconCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: Colors.warning_light,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    title: { 
        fontSize: 24, 
        fontFamily: Fonts.Bold, 
        color: Colors.primary, 
        marginBottom: 10, 
        textAlign: 'center' 
    },
    desc: { 
        fontSize: 14, 
        color: Colors.text_secondary, 
        textAlign: 'center', 
        lineHeight: 22, 
        maxWidth: '90%', 
        marginBottom: 32,
        fontFamily: Fonts.Medium,
    },
    statusBox: {
        width: '100%',
        backgroundColor: Colors.white,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.input_border,
        marginBottom: 32,
    },
    statusDotRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, gap: 8 },
    dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.warning },
    statusSubtitle: { 
        fontSize: 11, 
        fontFamily: Fonts.Bold, 
        color: Colors.warning_dark, 
        letterSpacing: 1.2 
    },
    statusMain: { 
        fontSize: 18, 
        fontFamily: Fonts.Bold, 
        color: Colors.primary, 
        marginBottom: 4 
    },
    estTime: { 
        fontSize: 12, 
        fontFamily: Fonts.Medium, 
        color: Colors.slate_500 
    },
    logoutBtn: { 
        paddingVertical: 12,
        marginTop: 8,
    },
    logoutText: { 
        fontSize: 14, 
        fontFamily: Fonts.SemiBold, 
        color: Colors.slate_500,
        textDecorationLine: 'underline'
    },
    refreshBtn: {
        width: '100%',
        height: 56,
        backgroundColor: Colors.primary,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    refreshText: { 
        fontSize: 16, 
        fontFamily: Fonts.Bold, 
        color: Colors.white,
        letterSpacing: 0.5
    },
});
