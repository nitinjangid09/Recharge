import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated, Easing } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function PaymentVerification({ navigation }) {
    const fadeAnim = React.useRef(new Animated.Value(0)).current;
    const slideAnim = React.useRef(new Animated.Value(30)).current;

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

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
                {/* Icon Wrapper */}
                <View style={styles.iconCircle}>
                    <Text style={{ fontSize: 40, color: '#4F46E5' }}>🕒</Text>
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
                <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                    <Text style={styles.logoutText}>Logout from Session</Text>
                </TouchableOpacity>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC', justifyContent: 'center', alignItems: 'center', padding: 20 },
    card: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 32,
        padding: 40,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.08,
        shadowRadius: 30,
        elevation: 10,
    },
    iconCircle: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F1F0FF',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
    },
    title: { fontSize: 26, fontWeight: '900', color: '#0F172A', marginBottom: 12, textAlign: 'center' },
    desc: { fontSize: 13, color: '#64748B', textAlign: 'center', lineHeight: 22, maxWidth: 280, marginBottom: 40 },
    statusBox: {
        width: '100%',
        backgroundColor: '#F8FAFC',
        borderRadius: 24,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#F1F5F9',
        marginBottom: 40,
    },
    statusDotRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
    dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#F59E0B' },
    statusSubtitle: { fontSize: 10, fontWeight: '800', color: '#94A3B8', letterSpacing: 1 },
    statusMain: { fontSize: 18, fontWeight: '800', color: '#0F172A', marginBottom: 4 },
    estTime: { fontSize: 11, fontWeight: '700', color: '#94A3B8' },
    logoutBtn: { paddingVertical: 10 },
    logoutText: { fontSize: 14, fontWeight: '700', color: '#94A3B8' },
});
