import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';
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
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                {/* Icon Wrapper */}
                <View style={styles.iconCircle}>
                    <Text style={{ fontSize: 40, color: Colors.hub_hubIndigo }}>🕒</Text>
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
                    <Text style={styles.estTime}>EST. TIME: 2-4 HOURS</Text>
                </View>

                {/* Footer Action */}
                <TouchableOpacity 
                    style={[styles.refreshBtn, refreshing && { opacity: 0.7 }]} 
                    onPress={handleRefresh}
                    disabled={refreshing}
                >
                    {refreshing ? (
                        <ActivityIndicator color={Colors.white} size="small" />
                    ) : (
                        <Text style={styles.refreshText}>Check Status Now ↻</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                    <Text style={styles.logoutText}>Logout from Session</Text>
                </TouchableOpacity>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.slate_50, justifyContent: 'center', alignItems: 'center', padding: 20 },
    card: {
        width: '100%',
        backgroundColor: Colors.white,
        borderRadius: 32,
        padding: 40,
        alignItems: 'center',
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.08,
        shadowRadius: 30,
        elevation: 10,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: Colors.hub_hubIndigoGlow,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    title: { fontSize: 26, fontWeight: '900', color: Colors.slate_900, marginBottom: 12, textAlign: 'center' },
    desc: { fontSize: 13, color: Colors.slate_500, textAlign: 'center', lineHeight: 22, maxWidth: 280, marginBottom: 40 },
    statusBox: {
        width: '100%',
        backgroundColor: Colors.slate_50,
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: Colors.slate_100,
        marginBottom: 40,
    },
    statusDotRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.amber },
    statusSubtitle: { fontSize: 10, fontWeight: '800', color: Colors.slate_400, letterSpacing: 1 },
    statusMain: { fontSize: 18, fontWeight: '800', color: Colors.slate_900, marginBottom: 4 },
    estTime: { fontSize: 11, fontWeight: '700', color: Colors.slate_400 },
    logoutBtn: { paddingVertical: 10 },
    logoutText: { fontSize: 14, fontWeight: '700', color: Colors.slate_400 },
    refreshBtn: { 
        width: '100%', 
        height: 54, 
        backgroundColor: Colors.hub_hubIndigo, 
        borderRadius: 18, 
        justifyContent: 'center', 
        alignItems: 'center',
        marginBottom: 16,
        shadowColor: Colors.hub_hubIndigo,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4
    },
    refreshText: { fontSize: 15, fontWeight: '800', color: Colors.white },
});
