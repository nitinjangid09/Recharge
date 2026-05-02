import React, { useState, useRef, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import Colors from '../../constants/Colors';
import Fonts from '../../constants/Fonts';

const { width } = Dimensions.get('window');

// ─── SVG-style icons as unicode / emoji fallback ───────────────────────────

// ─── Individual Option Row ──────────────────────────────────────────────────
const OptionButton = ({ icon, label, subtitle, onPress, delay, accentColor }) => {
    const slide = useRef(new Animated.Value(60)).current;
    const fade = useRef(new Animated.Value(0)).current;
    const scale = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(slide, {
                toValue: 0, duration: 380,
                delay, useNativeDriver: true,
                easing: t => 1 - Math.pow(1 - t, 3),
            }),
            Animated.timing(fade, {
                toValue: 1, duration: 320,
                delay, useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const onPressIn = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true }).start();
    const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true }).start();

    return (
        <Animated.View style={[styles.optionContainer, { opacity: fade, transform: [{ translateY: slide }, { scale }] }]}>
            <TouchableOpacity
                activeOpacity={1}
                onPress={onPress}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                style={styles.optionBtn}
            >
                <View style={[styles.iconWrap, { backgroundColor: '#FFFBEB', borderColor: 'rgba(212,176,106,0.4)' }]}>
                    <Icon name={icon} size={22} color="#D4B06A" />
                </View>
                <Text style={styles.optionLabel}>{label}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

// ─── Main Alert Component ───────────────────────────────────────────────────
export const ImageUploadAlert = ({ visible, onClose, onCamera, onGallery, onFile }) => {
    const backdrop = useRef(new Animated.Value(0)).current;
    const sheetY = useRef(new Animated.Value(400)).current;

    useEffect(() => {
        if (visible) {
            Animated.parallel([
                Animated.timing(backdrop, { toValue: 1, duration: 300, useNativeDriver: true }),
                Animated.spring(sheetY, { toValue: 0, bounciness: 6, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(backdrop, { toValue: 0, duration: 220, useNativeDriver: true }),
                Animated.timing(sheetY, { toValue: 400, duration: 250, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    const handleOption = (cb) => {
        onClose();
        setTimeout(() => cb && cb(), 280);
    };

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
            {/* Backdrop */}
            <Animated.View style={[styles.backdrop, { opacity: backdrop }]}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
            </Animated.View>

            {/* Sheet */}
            <Animated.View style={[styles.sheet, { transform: [{ translateY: sheetY }] }]}>
                {/* Handle */}
                <View style={styles.handle} />

                <View style={styles.header}>
                    <View style={styles.headerCenter}>
                        <View style={styles.uploadIconBg}>
                             <Icon name="cloud-upload-outline" size={22} color={Colors.kyc_accentDark} />
                        </View>
                        <View>
                            <Text style={styles.title}>Upload Screenshot</Text>
                            <Text style={styles.subtitle}>Select a source to provide proof</Text>
                        </View>
                    </View>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Options Row */}
                <View style={styles.optionsRow}>
                    <OptionButton
                        icon="camera"
                        label="Camera"
                        accentColor={['#D4B06A', '#C9A84C']}
                        delay={60}
                        onPress={() => handleOption(onCamera)}
                    />
                    <OptionButton
                        icon="image"
                        label="Gallery"
                        accentColor={['#D4B06A', '#C9A84C']}
                        delay={120}
                        onPress={() => handleOption(onGallery)}
                    />
                    <OptionButton
                        icon="file-document"
                        label="Files"
                        accentColor={['#D4B06A', '#C9A84C']}
                        delay={180}
                        onPress={() => handleOption(onFile)}
                    />
                </View>

                {/* Cancel */}
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                    <Text style={styles.cancelTxt}>Cancel</Text>
                </TouchableOpacity>

                {/* Safe-area spacer */}
                <View style={{ height: Platform.OS === 'ios' ? 20 : 8 }} />
            </Animated.View>
        </Modal>
    );
};

export default ImageUploadAlert;

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    // Demo screen
    screen: {
        flex: 1,
        backgroundColor: 'rgb(15, 23, 42)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    bgCircle1: {
        position: 'absolute', width: 320, height: 320, borderRadius: 160,
        backgroundColor: 'rgb(109, 40, 217)20', top: -80, right: -80,
    },
    bgCircle2: {
        position: 'absolute', width: 220, height: 220, borderRadius: 110,
        backgroundColor: 'rgb(14, 165, 233)15', bottom: 40, left: -60,
    },
    appTitle: {
        fontSize: 32, fontWeight: '800', color: 'rgb(241, 245, 249)',
        letterSpacing: -0.5, marginBottom: 6,
    },
    appSub: {
        fontSize: 14, color: 'rgb(100, 116, 139)', marginBottom: 32,
    },
    resultBadge: {
        backgroundColor: 'rgb(52, 211, 153)15', borderWidth: 1, borderColor: 'rgb(52, 211, 153)40',
        borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 24,
    },
    triggerBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: 'rgb(167, 139, 250)', paddingHorizontal: 32, paddingVertical: 16,
        borderRadius: 16, shadowColor: 'rgb(167, 139, 250)', shadowOffset: { width: 0, height: 8 },
    },
    triggerTxt: {
        color: 'rgb(15, 23, 42)', fontWeight: '700', fontSize: 16, letterSpacing: 0.2,
    },

    // Alert Sheet
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
        position: 'absolute', bottom: 20, left: 16, right: 16,
        backgroundColor: Colors.beige,
        borderRadius: 32,
        paddingHorizontal: 20, paddingTop: 12,
        paddingBottom: 16,
        borderWidth: 1.5,
        borderColor: 'rgba(212,176,106,0.25)',
        elevation: 20, shadowColor: Colors.black, shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20,
    },
    handle: {
        alignSelf: 'center', width: 36, height: 4,
        backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: 10, marginBottom: 16,
    },
    header: {
        alignItems: 'center',
        justifyContent: 'center', marginBottom: 12,
    },
    headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    uploadIconBg: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: 'rgba(212,176,106,0.1)',
        alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: 'rgba(212,176,106,0.25)',
    },
    title: { color: Colors.hub_dark, fontSize: 16, fontFamily: Fonts.Bold, letterSpacing: -0.2 },
    subtitle: { color: Colors.slate_500, fontSize: 11, fontFamily: Fonts.Medium },
    closeBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center', justifyContent: 'center',
    },
    divider: { height: 1, backgroundColor: 'rgba(0,0,0,0.05)', marginBottom: 16 },

    // Options Row Layout
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
        gap: 12,
    },
    optionContainer: {
        flex: 1,
    },
    optionBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 8,
    },
    iconWrap: {
        width: 48, height: 48, borderRadius: 16,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 8,
        borderWidth: 1.2,
        elevation: 6,
        shadowColor: '#D4B06A',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
    },
    optionLabel: {
        color: Colors.hub_dark,
        fontSize: 12,
        fontFamily: Fonts.Bold,
        textAlign: 'center',
    },

    cancelBtn: {
        alignItems: 'center', paddingVertical: 12,
        borderRadius: 20, backgroundColor: Colors.finance_accent,
        marginTop: 6,
        borderWidth: 1, borderColor: 'rgba(0,0,0,0.05)',
    },
    cancelTxt: {
        color: Colors.black,
        fontFamily: Fonts.Bold,
        fontSize: 14,
    },
});
