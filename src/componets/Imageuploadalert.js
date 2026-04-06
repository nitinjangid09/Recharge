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
import Colors from '../constants/Colors';

const { width } = Dimensions.get('window');

// ─── SVG-style icons as unicode / emoji fallback ───────────────────────────
const Icon = ({ name, size = 28, color = '#fff' }) => {
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
                <View style={[styles.iconWrap, { backgroundColor: accentColor + '15' }]}>
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
                        accentColor="#3B82F6"
                        delay={60}
                        onPress={() => handleOption(onCamera)}
                    />
                    <OptionButton
                        icon="gallery"
                        label="Gallery"
                        accentColor="#10B981"
                        delay={120}
                        onPress={() => handleOption(onGallery)}
                    />
                    <OptionButton
                        icon="file"
                        label="Files"
                        accentColor="#8B5CF6"
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
        backgroundColor: '#0F172A',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    bgCircle1: {
        position: 'absolute', width: 320, height: 320, borderRadius: 160,
        backgroundColor: '#6D28D920', top: -80, right: -80,
    },
    bgCircle2: {
        position: 'absolute', width: 220, height: 220, borderRadius: 110,
        backgroundColor: '#0EA5E915', bottom: 40, left: -60,
    },
    appTitle: {
        fontSize: 32, fontWeight: '800', color: '#F1F5F9',
        letterSpacing: -0.5, marginBottom: 6,
    },
    appSub: {
        fontSize: 14, color: '#64748B', marginBottom: 32,
    },
    resultBadge: {
        backgroundColor: '#34D39915', borderWidth: 1, borderColor: '#34D39940',
        borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 24,
    },
    triggerBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        backgroundColor: '#A78BFA', paddingHorizontal: 32, paddingVertical: 16,
        borderRadius: 16, shadowColor: '#A78BFA', shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45, shadowRadius: 20, elevation: 10,
    },
    triggerTxt: {
        color: '#0F172A', fontWeight: '700', fontSize: 16, letterSpacing: 0.2,
    },

    // Alert Sheet
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 32, borderTopRightRadius: 32,
        paddingHorizontal: 24, paddingTop: 12,
        paddingBottom: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.1, shadowRadius: 20, elevation: 25,
    },
    handle: {
        alignSelf: 'center', width: 36, height: 4,
        backgroundColor: '#E5E7EB', borderRadius: 2, marginBottom: 20,
    },
    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 24,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    uploadIconBg: {
        width: 48, height: 48, borderRadius: 14,
        backgroundColor: '#F3F4F6',
        alignItems: 'center', justifyContent: 'center',
    },
    title: { color: '#111827', fontSize: 20, fontWeight: '800', letterSpacing: -0.5 },
    subtitle: { color: '#6B7280', fontSize: 13, marginTop: 2 },
    closeBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
    },
    closeTxt: { color: '#9CA3AF', fontSize: 12, fontWeight: 'bold' },
    divider: { height: 1.5, backgroundColor: '#F3F4F6', marginBottom: 24 },

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
        color: '#374151',
        fontSize: 13,
        fontWeight: '700',
        textAlign: 'center',
    },

    cancelBtn: {
        alignItems: 'center', paddingVertical: 15,
        borderRadius: 16, backgroundColor: '#334155',
    },
    cancelTxt: {
        color: '#FFFFFF',
        fontWeight: '700',
        fontSize: 15,
    },
});