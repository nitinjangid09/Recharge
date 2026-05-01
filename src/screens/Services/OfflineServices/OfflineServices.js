import React, { useRef, useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    Dimensions,
    Animated,
    TextInput,
    ActivityIndicator,
    Image,
    RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HeaderBar from '../../../componets/HeaderBar/HeaderBar';
import Colors from '../../../constants/Colors';
import Fonts from '../../../constants/Fonts';
import { getAllOfflineServices, BASE_URL } from '../../../api/AuthApi';
import FullScreenLoader from '../../../componets/Loader/FullScreenLoader';

const { width } = Dimensions.get('window');

// ─── Constants ───────────────────────────────────────────────────────────────
const STATS = [
    { id: '1', label: 'TOTAL\nSUBMISSIONS', value: '5' },
    { id: '2', label: 'IN PROCESSING', value: '2' },
    { id: '3', label: 'FINALISED', value: '2' },
];

const PROTOCOLS_MOCK = [
    {
        id: '1',
        no: '#1',
        date: '10/3/26, 01:09 PM',
        title: 'OFFLINE ITR FILE',
        ref: 'REF2468962F',
        user: 'Admin User',
        userId: 'USER101',
        amount: '₹0',
        status: 'PROCESSING',
    },
    {
        id: '2',
        no: '#2',
        date: '9/3/26, 12:17 PM',
        title: 'OFFLINE ITR FILE',
        ref: 'REF7925AA5F',
        user: 'Admin User',
        userId: 'USER101',
        amount: '₹0',
        status: 'COMPLETED',
    },
];

const STATUS_CONFIG = {
    PROCESSING: { bg: Colors.warning_light, dot: Colors.amber, text: Colors.warning_dark },
    COMPLETED: { bg: Colors.success_light, dot: Colors.green, text: Colors.success_dark },
    PENDING: { bg: Colors.bg_F8, dot: Colors.gray, text: Colors.slate_500 },
};

// ─── Components ───────────────────────────────────────────────────────────────

const StatusBadge = ({ status }) => {
    const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
    return (
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
            <View style={[styles.badgeDot, { backgroundColor: cfg.dot }]} />
            <Text style={[styles.badgeText, { color: cfg.text }]}>{status}</Text>
        </View>
    );
};

const SectionDivider = ({ label, badge }) => (
    <View style={styles.sectionLabelRow}>
        <View style={styles.sectionLabelLine} />
        <Text style={styles.sectionLabel}>{label}</Text>
        {badge != null && (
            <View style={styles.sectionBadge}>
                <Text style={styles.sectionBadgeText}>{badge}</Text>
            </View>
        )}
        <View style={styles.sectionLabelLine} />
    </View>
);

const ProtocolCard = ({ item, onPress }) => (
    <TouchableOpacity
        style={styles.protocolCard}
        activeOpacity={0.82}
        onPress={() => onPress?.(item)}
    >
        <View style={styles.pcHeader}>
            <View style={styles.pcNoBox}>
                <Text style={styles.pcNo}>{item.no}</Text>
            </View>
            <Text style={styles.pcDate}>{item.date}</Text>
        </View>
        <Text style={styles.pcTitle}>{item.title}</Text>
        <Text style={styles.pcRef}>{item.ref}</Text>
        <View style={styles.pcDivider} />
        <View style={styles.pcFooter}>
            <View style={styles.pcUser}>
                <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>{item.user.charAt(0)}</Text>
                </View>
                <Text style={styles.userName}>{item.user}</Text>
                <Text style={styles.userId}> ({item.userId})</Text>
            </View>
            <View style={styles.pcRight}>
                <Text style={styles.pcAmount}>{item.amount}</Text>
                <StatusBadge status={item.status} />
            </View>
        </View>
    </TouchableOpacity>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function OfflineServices({ navigation }) {
    const scrollY = useRef(new Animated.Value(0)).current;
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [services, setServices] = useState([]);

    useEffect(() => {
        fetchServices(true);
    }, []);

    const fetchServices = async (isInitial = false) => {
        if (isInitial) setLoading(true);
        else setRefreshing(true);
        try {
            const headerToken = await AsyncStorage.getItem('header_token');
            const res = await getAllOfflineServices({ headerToken });
            if (res?.success && res.data) {
                setServices(res.data);
            }
        } catch (err) {
            console.log("[OfflineServices] Fetch API Error:", err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        fetchServices(false);
    };

    const headerOpacity = scrollY.interpolate({
        inputRange: [0, 80],
        outputRange: [1, 0.92],
        extrapolate: 'clamp',
    });

    const filteredHistory = PROTOCOLS_MOCK.filter(
        (p) =>
            p.title.toLowerCase().includes(search.toLowerCase()) ||
            p.ref.toLowerCase().includes(search.toLowerCase()) ||
            p.status.toLowerCase().includes(search.toLowerCase()),
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <HeaderBar
                title="Offline Services"
                onBack={() => navigation.goBack()}
            />

            <Animated.ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true },
                )}
                scrollEventThrottle={16}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[Colors.finance_accent]}
                        tintColor={Colors.finance_accent}
                    />
                }
            >
                {/* Hero Section */}
                <Animated.View style={[styles.heroSection, { opacity: headerOpacity }]}>
                    <Text style={styles.heroTitle}>Offline Service Hub</Text>
                    <Text style={styles.heroSubtitle}>
                        Direct submission gateway for complex administrative protocols
                    </Text>
                </Animated.View>

                {/* Stats Row */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.statsRow}
                >
                    {STATS.map((s) => (
                        <View key={s.id} style={styles.statCard}>
                            <Text style={styles.statValue}>{s.value}</Text>
                            <Text style={styles.statLabel}>{s.label}</Text>
                        </View>
                    ))}
                </ScrollView>

                {/* Available Services Section */}
                <SectionDivider label="AVAILABLE SERVICES" />

                {services.length === 0 && !loading ? (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyText}>No services available</Text>
                    </View>
                ) : (
                    services.map((svc) => (
                        <View key={svc._id} style={styles.itrCard}>
                            <View style={styles.itrMainRow}>
                                {svc.serviceImageUrl ? (
                                    <Image
                                        source={{ uri: `${BASE_URL}${svc.serviceImageUrl}` }}
                                        style={styles.svcImage}
                                        resizeMode="cover"
                                    />
                                ) : (
                                    <View style={styles.itrIconWrap}>
                                        <Text style={styles.itrIconEmoji}>📄</Text>
                                    </View>
                                )}
                                <View style={styles.itrInfo}>
                                    <Text style={styles.itrTitle}>{svc.serviceName?.toUpperCase() || "SERVICE"}</Text>
                                    <Text style={styles.itrDesc} numberOfLines={2}>
                                        {svc.description}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.itrFooter}>
                                <View>
                                    <Text style={styles.itrFeeLabel}>PROCESS FEE</Text>
                                    <Text style={styles.itrFee}>₹{svc.amount}</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.proceedBtn}
                                    activeOpacity={0.8}
                                    onPress={() => navigation.navigate('OfflineServiceForm', { service: svc })}
                                >
                                    <Text style={styles.proceedBtnText}>PROCEED →</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))
                )}

                {/* Handled Protocols Section */}
                <SectionDivider label="HANDLED PROTOCOLS" badge={PROTOCOLS_MOCK.length} />

                {/* Search */}
                <View style={styles.searchWrap}>
                    <Text style={styles.searchIconText}>🔍</Text>
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search protocols..."
                        placeholderTextColor={Colors.gray}
                        value={search}
                        onChangeText={setSearch}
                    />
                    {search.length > 0 && (
                        <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                            <Text style={styles.clearIcon}>✕</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Protocol Cards */}
                <View style={styles.protocolList}>
                    {filteredHistory.length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>No protocols found</Text>
                        </View>
                    ) : (
                        filteredHistory.map((item) => (
                            <ProtocolCard
                                key={item.id}
                                item={item}
                                onPress={() => navigation.navigate('ProtocolDetail', { item })}
                            />
                        ))
                    )}
                </View>

                <View style={{ height: 60 }} />
            </Animated.ScrollView>

            <FullScreenLoader visible={loading} label="Fetching Offline Services..." />
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.white,
    },
    scrollView: { flex: 1 },

    // ── Hero ──
    heroSection: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 4,
    },
    heroTitle: {
        fontSize: 26,
        fontWeight: '900',
        color: Colors.primary,
        letterSpacing: -0.5,
        fontFamily: Fonts.Bold,
    },
    heroSubtitle: {
        fontSize: 13,
        color: Colors.text_secondary,
        marginTop: 5,
        lineHeight: 19,
        fontFamily: Fonts.Medium,
    },

    // ── Stats ──
    statsRow: {
        paddingHorizontal: 20,
        paddingVertical: 18,
        gap: 12,
    },
    statCard: {
        width: width * 0.40,
        borderRadius: 18,
        padding: 18,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.input_border,
    },
    statValue: {
        fontSize: 34,
        color: Colors.primary,
        fontFamily: Fonts.Bold,
    },
    statLabel: {
        fontSize: 9,
        color: Colors.text_secondary,
        letterSpacing: 0.9,
        marginTop: 5,
        lineHeight: 13,
        fontFamily: Fonts.Bold,
    },

    // ── Section Divider ──
    sectionLabelRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginVertical: 12,
        gap: 10,
    },
    sectionLabelLine: {
        flex: 1,
        height: 1,
        backgroundColor: Colors.input_border,
    },
    sectionLabel: {
        fontSize: 10,
        color: Colors.finance_accent,
        letterSpacing: 1.8,
        fontFamily: Fonts.Bold,
    },
    sectionBadge: {
        backgroundColor: Colors.primary,
        borderRadius: 10,
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    sectionBadgeText: {
        fontSize: 10,
        color: Colors.white,
        fontFamily: Fonts.Bold,
    },

    // ── ITR Card (Service Card) ──
    itrCard: {

        marginHorizontal: 20,
        marginBottom: 16,
        backgroundColor: Colors.white,
        borderRadius: 22,
        padding: 22,
        borderWidth: 1,
        borderColor: Colors.input_border,
    },
    itrMainRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    svcImage: {
        width: 70,
        height: 70,
        borderRadius: 14,
    },
    itrIconWrap: {
        width: 60,
        height: 60,
        borderRadius: 14,
        backgroundColor: Colors.gold,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.input_border,
    },
    itrIconEmoji: { fontSize: 26 },
    itrInfo: {
        flex: 1,
        marginLeft: 18,
    },
    itrTitle: {
        paddingTop: 12,
        fontSize: 18,
        color: Colors.primary,
        letterSpacing: 0.5,
        marginBottom: 4,
        fontFamily: Fonts.Bold,
    },
    itrDesc: {
        fontSize: 12,
        color: Colors.text_secondary,
        lineHeight: 18,
        fontFamily: Fonts.Regular,
    },
    itrFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    itrFeeLabel: {
        fontSize: 9,
        color: Colors.finance_accent,
        letterSpacing: 1.4,
        fontFamily: Fonts.Bold,
    },
    itrFee: {
        fontSize: 26,
        color: Colors.primary,
        marginTop: 3,
        fontFamily: Fonts.Bold,
    },
    proceedBtn: {
        backgroundColor: Colors.primary,
        paddingHorizontal: 22,
        paddingVertical: 14,
        borderRadius: 32,
    },
    proceedBtnText: {
        fontSize: 12,
        color: Colors.white,
        letterSpacing: 0.8,
        fontFamily: Fonts.Bold,
    },

    // ── Search ──
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 12,
        backgroundColor: Colors.white,
        borderRadius: 14,
        paddingHorizontal: 14,
        paddingVertical: 11,
        borderWidth: 1,
        borderColor: Colors.input_border,
    },
    searchIconText: { fontSize: 14, marginRight: 8 },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: Colors.black,
        fontFamily: Fonts.Regular,
        paddingVertical: 0,
    },
    clearIcon: {
        fontSize: 12,
        color: Colors.text_secondary,
        paddingHorizontal: 4,
    },

    // ── Protocol List ──
    protocolList: {
        paddingHorizontal: 20,
        gap: 10,
    },

    // ── Protocol Card ──
    protocolCard: {
        backgroundColor: Colors.white,
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: Colors.input_border,
        marginBottom: 2,
    },
    pcHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 10,
    },
    pcNoBox: {
        backgroundColor: Colors.primary,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
    },
    pcNo: {
        fontSize: 11,
        color: Colors.white,
        fontFamily: Fonts.Bold,
    },
    pcDate: {
        fontSize: 11,
        color: Colors.text_secondary,
        fontFamily: Fonts.Regular,
    },
    pcTitle: {
        fontSize: 13,
        color: Colors.primary,
        letterSpacing: 0.3,
        marginBottom: 3,
        fontFamily: Fonts.Bold,
    },
    pcRef: {
        fontSize: 11,
        color: Colors.finance_accent,
        letterSpacing: 0.6,
        fontFamily: Fonts.Medium,
    },
    pcDivider: {
        height: 1,
        backgroundColor: Colors.input_border,
        marginVertical: 10,
    },
    pcFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    pcUser: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    userAvatar: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 7,
    },
    userAvatarText: {
        fontSize: 10,
        color: Colors.white,
        fontFamily: Fonts.Bold,
    },
    userName: {
        fontSize: 11,
        color: Colors.primary,
        fontFamily: Fonts.Medium,
    },
    userId: {
        fontSize: 11,
        color: Colors.text_secondary,
        fontFamily: Fonts.Regular,
    },
    pcRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    pcAmount: {
        fontSize: 12,
        color: Colors.primary,
        fontFamily: Fonts.Bold,
    },

    // ── Status Badge ──
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 9,
        paddingVertical: 4,
        borderRadius: 20,
        gap: 5,
    },
    badgeDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
    },
    badgeText: {
        fontSize: 9,
        letterSpacing: 0.4,
        fontFamily: Fonts.Bold,
    },

    // ── Empty State ──
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyText: {
        fontSize: 14,
        color: Colors.text_secondary,
        fontFamily: Fonts.Medium,
    },
});
