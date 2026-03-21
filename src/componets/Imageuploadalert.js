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

const { width } = Dimensions.get('window');

// ─── SVG-style icons as unicode / emoji fallback ───────────────────────────
const Icon = ({ name, size = 28, color = '#fff' }) => {
    const icons = {
        camera: '📷',
        gallery: '🖼️',
        file: '📁',
        close: '✕',
        upload: '⬆',
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
        <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }, { scale }] }}>
            <TouchableOpacity
                activeOpacity={1}
                onPress={onPress}
                onPressIn={onPressIn}
                onPressOut={onPressOut}
                style={styles.optionBtn}
            >
                <View style={[styles.iconWrap, { backgroundColor: accentColor + '22', borderColor: accentColor + '55' }]}>
                    <Icon name={icon} size={22} color={accentColor} />
                </View>
                <View style={styles.optionText}>
                    <Text style={styles.optionLabel}>{label}</Text>
                    <Text style={styles.optionSub}>{subtitle}</Text>
                </View>
                <View style={styles.arrow}>
                    <Text style={{ color: '#555', fontSize: 18 }}>›</Text>
                </View>
            </TouchableOpacity>
        </Animated.View>
    );
};

// ─── Main Alert Component ───────────────────────────────────────────────────
const ImageUploadAlert = ({ visible, onClose, onCamera, onGallery, onFile }) => {
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
                        <View style={styles.uploadIconBg}>
                            <Icon name="upload" size={20} color="#A78BFA" />
                        </View>
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

                {/* Options */}
                <View style={styles.options}>
                    <OptionButton
                        icon="camera"
                        label="Take a Photo"
                        subtitle="Use your device camera"
                        accentColor="#60A5FA"
                        delay={60}
                        onPress={() => handleOption(onCamera)}
                    />
                    <OptionButton
                        icon="gallery"
                        label="Choose from Gallery"
                        subtitle="Pick from your photo library"
                        accentColor="#34D399"
                        delay={130}
                        onPress={() => handleOption(onGallery)}
                    />
                    <OptionButton
                        icon="file"
                        label="Browse Files"
                        subtitle="Select from file storage"
                        accentColor="#F472B6"
                        delay={200}
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

// ─── Demo Screen ────────────────────────────────────────────────────────────
export default function App() {
    const [visible, setVisible] = useState(false);
    const [result, setResult] = useState(null);
    const btnScale = useRef(new Animated.Value(1)).current;

    const pulse = () => {
        Animated.sequence([
            Animated.spring(btnScale, { toValue: 0.94, useNativeDriver: true }),
            Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }),
        ]).start(() => setVisible(true));
    };

    return (
        <View style={styles.screen}>
            {/* Background decoration */}
            <View style={styles.bgCircle1} />
            <View style={styles.bgCircle2} />

            <Text style={styles.appTitle}>Image Upload</Text>
            <Text style={styles.appSub}>Tap the button to open the alert</Text>

            {result && (
                <View style={styles.resultBadge}>
                    <Text style={{ color: '#34D399', fontSize: 13 }}>
                        ✓  {result}
                    </Text>
                </View>
            )}

            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                <TouchableOpacity style={styles.triggerBtn} onPress={pulse} activeOpacity={0.85}>
                    <Icon name="upload" size={22} color="#0F172A" />
                    <Text style={styles.triggerTxt}>Upload Image</Text>
                </TouchableOpacity>
            </Animated.View>

            <ImageUploadAlert
                visible={visible}
                onClose={() => setVisible(false)}
                onCamera={() => setResult('Camera opened')}
                onGallery={() => setResult('Gallery opened')}
                onFile={() => setResult('File browser opened')}
            />
        </View>
    );
}

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

    // Alert
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.65)',
    },
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#1E293B',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        paddingHorizontal: 20, paddingTop: 12,
        shadowColor: '#000', shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.5, shadowRadius: 24, elevation: 20,
    },
    handle: {
        alignSelf: 'center', width: 40, height: 4,
        backgroundColor: '#334155', borderRadius: 2, marginBottom: 18,
    },
    header: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 16,
    },
    headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    uploadIconBg: {
        width: 44, height: 44, borderRadius: 13,
        backgroundColor: '#A78BFA22', borderWidth: 1, borderColor: '#A78BFA44',
        alignItems: 'center', justifyContent: 'center',
    },
    title: { color: '#F1F5F9', fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
    subtitle: { color: '#64748B', fontSize: 12, marginTop: 1 },
    closeBtn: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: '#334155', alignItems: 'center', justifyContent: 'center',
    },
    closeTxt: { color: '#94A3B8', fontSize: 13, fontWeight: '600' },
    divider: { height: 1, backgroundColor: '#334155', marginBottom: 12 },

    // Options
    options: { gap: 4, marginBottom: 12 },
    optionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingVertical: 14, paddingHorizontal: 12,
        borderRadius: 16, backgroundColor: '#0F172A',
        marginBottom: 4,
    },
    iconWrap: {
        width: 46, height: 46, borderRadius: 13,
        borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    },
    optionText: { flex: 1 },
    optionLabel: { color: '#E2E8F0', fontSize: 15, fontWeight: '600' },
    optionSub: { color: '#475569', fontSize: 12, marginTop: 2 },
    arrow: { paddingLeft: 4 },

    cancelBtn: {
        alignItems: 'center', paddingVertical: 15,
        borderRadius: 16, backgroundColor: '#334155',
    },
    cancelTxt: { color: '#94A3B8', fontWeight: '600', fontSize: 15 },
});