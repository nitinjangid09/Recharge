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
import Colors from '../../constants/Colors';

const { width } = Dimensions.get('window');

// ─── SVG-style icons as unicode / emoji fallback ───────────────────────────
const Icon = ({ name, size = 28, color = 'rgb(255, 255, 255)' }) => {
    const icons = {
        camera: '📷',
        gallery: '🖼️',
        file: '📁',
        close: '✕',
        check: '✓',
    };
    return (
        <Text style={{ fontSize: size, color, lineHeight: size + 4 }}>
            {icons[name]}
        </Text>
    );
};

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
                <View style={[styles.iconWrap, { backgroundColor: accentColor + '20' }]}>
                    <Icon name={icon} size={24} color={accentColor} />
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

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <View>
                            <Text style={styles.title}>Upload Image</Text>
                            <Text style={styles.subtitle}>Choose a source to continue</Text>
                        </View>
                    </View>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <Text style={styles.closeTxt}>✕</Text>
                    </TouchableOpacity>
                </View>

                {/* Divider */}
                <View style={styles.divider} />

                {/* Options Row */}
                <View style={styles.optionsRow}>
                    <OptionButton
                        icon="camera"
                        label="Camera"
                        accentColor={Colors.kyc_accent}
                        delay={60}
                        onPress={() => handleOption(onCamera)}
                    />
                    <OptionButton
                        icon="gallery"
                        label="Gallery"
                        accentColor={Colors.primary}
                        delay={120}
                        onPress={() => handleOption(onGallery)}
                    />
                    <OptionButton
                        icon="file"
                        label="Files"
                        accentColor={Colors.slate_500}
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
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: 'rgb(255, 255, 255)',
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        paddingHorizontal: 24, paddingTop: 12,
        paddingBottom: 20,
    },
    handle: {
        alignSelf: 'center', width: 36, height: 4,
        backgroundColor: 'rgb(229, 231, 235)', borderRadius: 2, marginBottom: 20,
    },
    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 24,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    uploadIconBg: {
        width: 48, height: 48, borderRadius: 14,
        backgroundColor: 'rgb(243, 244, 246)',
        alignItems: 'center', justifyContent: 'center',
    },
    title: { color: 'rgb(17, 24, 39)', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
    subtitle: { color: 'rgb(107, 114, 128)', fontSize: 13, marginTop: 2 },
    closeBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: 'rgb(243, 244, 246)', alignItems: 'center', justifyContent: 'center',
    },
    closeTxt: { color: Colors.black, fontSize: 12, fontWeight: 'bold' },
    divider: { height: 1.5, backgroundColor: 'rgb(243, 244, 246)', marginBottom: 24 },

    // Options Row Layout
    optionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
        gap: 12,
    },
    optionContainer: {
        flex: 1,
    },
    optionBtn: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        paddingHorizontal: 10,

    },
    iconWrap: {
        width: 56, height: 56, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 12,
    },
    optionLabel: {
        color: 'rgb(55, 65, 81)',
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
    },

    cancelBtn: {
        alignItems: 'center', paddingVertical: 15,
        borderRadius: 16, backgroundColor: Colors.black,
    },
    cancelTxt: {
        color: 'rgb(255, 255, 255)',
        fontWeight: '700',
        fontSize: 15,
    },
});
