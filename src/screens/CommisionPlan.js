/**
 * CommissionPlanScreen.jsx
 * React Native — Commission Plan Screen for Camlenio
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    ActivityIndicator,
    TextInput,
    Modal,
    RefreshControl,
    Animated,
    PanResponder,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { getMyCommissionPlan, fetchBbpsCategories } from '../api/AuthApi';
import Colors from '../constants/Colors';
import HeaderBar from '../componets/HeaderBar/HeaderBar';
import FullScreenLoader from '../componets/Loader/FullScreenLoader';
import Fonts from '../constants/Fonts';

// ─── Sub-components ───────────────────────────────────────────────────────────

const Badge = ({ type }) =>
    type === '%' ? (
        <View style={[s.badge, s.badgePercent]}>
            <Text style={[s.badgeTxt, { color: Colors.finance_accent }]}>Percent</Text>
        </View>
    ) : (
        <View style={[s.badge, s.badgeFlat]}>
            <Text style={[s.badgeTxt, { color: Colors.finance_accent }]}>Flat</Text>
        </View>
    );

const CommTable = ({ data, accentColor }) => (
    <View style={s.table}>
        <View style={s.tableHead}>
            {['Operator', 'Range', 'Comm.', 'Type'].map((h) => (
                <Text key={h} style={s.th}>{h}</Text>
            ))}
        </View>
        <View style={{ maxHeight: 215 }}>
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true}>
                {data.map((row, i) => (
                    <View key={i} style={[s.tableRow, i === data.length - 1 && { borderBottomWidth: 0 }]}>
                        <Text style={s.tdName} numberOfLines={1}>{row.name}</Text>
                        <Text style={s.tdRange}>{row.range}</Text>
                        <Text style={[s.tdComm, { color: accentColor }]}>{row.comm}</Text>
                        <Badge type={row.type} />
                    </View>
                ))}
                {data.length === 0 && (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                        <MaterialCommunityIcons name="table-off" size={28} color={Colors.gray_BD} />
                        <Text style={{ fontSize: 12, color: Colors.text_secondary, marginTop: 8, fontFamily: Fonts.Medium }}>
                            No data found for this category
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    </View>
);

const SegControl = ({ tabs, activeKey, onChange }) => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.segScroll}>
        <View style={s.seg}>
            {tabs.map((tab) => (
                <TouchableOpacity
                    key={tab.key}
                    onPress={() => onChange(tab.key)}
                    style={[s.segBtn, activeKey === tab.key && s.segBtnOn]}
                >
                    <Text style={[s.segBtnTxt, activeKey === tab.key && s.segBtnTxtOn]}>
                        {tab.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    </ScrollView>
);

const SectionHeader = ({ title, tag, color, }) => (
    <View style={s.sh}>
        <View style={s.shLeft}>
            <View style={[s.shPip, { backgroundColor: Colors.finance_accent }]} />
            <Text style={s.shTitle}>{title}</Text>
        </View>
        <View style={[s.shTag, { backgroundColor: color?.tagBg, borderColor: color?.tagBorder }]}>
            <Text style={[s.shTagTxt, { color: color?.tagText }]}>{tag}</Text>
        </View>
    </View>
);

const { height: SH } = Dimensions.get('window');

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CommissionPlanScreen({ navigation }) {
    const [rechargeTab, setRechargeTab] = useState('mob');
    const [bbpsTab, setBbpsTab] = useState('all');
    const [bbpsSearch, setBbpsSearch] = useState('');
    const [bbpsCategories, setBbpsCategories] = useState([]);
    const [isFilterVisible, setIsFilterVisible] = useState(false);
    const [fetchingCats, setFetchingCats] = useState(false);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState(null);
    const [planData, setPlanData] = useState([]);

    useEffect(() => {
        fetchPlan();
    }, []);

    const fetchPlan = async () => {
        try {
            setLoading(true);
            const headerToken = await AsyncStorage.getItem('header_token');
            const res = await getMyCommissionPlan({ headerToken });
            if (res?.success) {
                setPlanData(res.data || []);
            } else {
                setError(res?.message || 'Failed to fetch plan');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchPlan();
    }, []);

    const handleFilterPress = async () => {
        setIsFilterVisible(true);
        if (bbpsCategories.length === 0) {
            try {
                setFetchingCats(true);
                const headerToken = await AsyncStorage.getItem('header_token');
                const res = await fetchBbpsCategories({ headerToken });
                if (res?.success) setBbpsCategories(res.data || []);
            } catch (err) {
                console.log('Category fetch error');
            } finally {
                setFetchingCats(false);
            }
        }
    };

    const getServiceRows = (serviceName) => {
        const service = planData.find(s => s.serviceName === serviceName);
        return service?.rows || [];
    };

    const rechargeRows = getServiceRows('recharge');
    const bbpsRows = getServiceRows('bbps');

    const mapRows = (rows) => rows.map(r => ({
        name: r.name,
        range: `₹${r.fromAmount}–${r.toAmount}`,
        comm: r.commissionType === 'flat' ? `₹${r.commission}` : `${r.commission}%`,
        type: r.commissionType === 'flat' ? 'Flat' : '%',
    }));

    const mappedRecharge = mapRows(rechargeRows.filter(r => {
        const name = (r.name || '').toUpperCase();
        if (rechargeTab === 'mob') return !name.includes('DTH');
        if (rechargeTab === 'jio') return name.includes('JIO');
        if (rechargeTab === 'airtel') return name.includes('AIRTEL');
        if (rechargeTab === 'vi') return name.includes('VI');
        if (rechargeTab === 'bsnl') return name.includes('BSNL');
        return true;
    }));

    const mappedBbps = mapRows(bbpsRows.filter(r => {
        const name = (r.name || '').toLowerCase();
        const category = (r.category || '').toLowerCase();
        const search = (bbpsSearch || '').toLowerCase();
        const tab = (bbpsTab || '').toLowerCase();
        const matchesSearch = name.includes(search) || category.includes(search);
        if (!matchesSearch) return false;
        if (bbpsTab === 'all') return true;
        return name.includes(tab) || category.includes(tab);
    }));

    const slideA = useRef(new Animated.Value(SH)).current;
    const backdropA = useRef(new Animated.Value(0)).current;

    // ── Swipe to close logic ──────────────────────────────────────────────────
    const panResponder = useRef(
        PanResponder.create({
            onMoveShouldSetPanResponder: (_, { dy }) => dy > 10,
            onPanResponderMove: (_, { dy }) => {
                if (dy > 0) slideA.setValue(dy);
            },
            onPanResponderRelease: (_, { dy }) => {
                if (dy > 120) {
                    setIsFilterVisible(false);
                } else {
                    Animated.spring(slideA, { toValue: 0, bounciness: 5, useNativeDriver: true }).start();
                }
            },
        })
    ).current;

    useEffect(() => {
        if (isFilterVisible) {
            Animated.parallel([
                Animated.spring(slideA, { toValue: 0, friction: 8, tension: 70, useNativeDriver: true }),
                Animated.timing(backdropA, { toValue: 1, duration: 250, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideA, { toValue: SH, duration: 250, useNativeDriver: true }),
                Animated.timing(backdropA, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]).start();
        }
    }, [isFilterVisible]);

    return (
        <SafeAreaView style={s.root} edges={['top', 'bottom']}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

            <HeaderBar
                title="Commission Plan"
                onBack={() => navigation?.goBack?.()}
            />

            <FullScreenLoader visible={loading} />

            {loading ? null : error ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <Text style={{ color: Colors.finance_error, textAlign: 'center' }}>{error}</Text>
                    <TouchableOpacity onPress={() => fetchPlan()} style={{ marginTop: 12, paddingHorizontal: 20, paddingVertical: 10, backgroundColor: Colors.primary, borderRadius: 8 }}>
                        <Text style={{ color: Colors.white, fontWeight: '700', fontFamily: Fonts.Bold }}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    style={s.scroll}
                    contentContainerStyle={s.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={() => onRefresh()}
                            tintColor={Colors.finance_accent}
                            colors={[Colors.finance_accent]}
                        />
                    }
                >
                    <View style={s.planCard}>
                        <View style={s.planGradBar} />
                        <View style={s.planTop}>

                            <View style={s.planInfo}>
                                <Text style={s.planName}>My Commission Plan</Text>
                                <Text style={s.planOrg}>Fetched successfully</Text>
                            </View>
                            <View style={s.activeBadge}>
                                <View style={s.activeDot} />
                                <Text style={s.activeTxt}>Active</Text>
                            </View>
                        </View>
                    </View>

                    <SectionHeader
                        title="RECHARGE"
                        tag="Mobile"
                        pipColor={Colors.primary}
                        color={{
                            tagBg: Colors.finance_chip,
                            tagBorder: Colors.finance_accent,
                            tagText: Colors.primary,
                        }}
                    />

                    <View style={s.segWrapper}>
                        <SegControl
                            tabs={[
                                { key: 'mob', label: 'Mobile' },
                                { key: 'airtel', label: 'AIRTEL' },
                                { key: 'jio', label: 'JIO' },
                                { key: 'vi', label: 'VI' },
                                { key: 'bsnl', label: 'BSNL' },
                            ]}
                            activeKey={rechargeTab}
                            onChange={setRechargeTab}
                        />
                    </View>

                    <CommTable data={mappedRecharge} accentColor={Colors.primary} />

                    <SectionHeader
                        title="BBPS"
                        tag="Bills · Utilities"
                        pipColor={Colors.black}
                        color={{
                            tagBg: Colors.finance_chip,
                            tagBorder: Colors.finance_accent,
                            tagText: Colors.black,
                        }}
                    />

                    <View style={s.bbpsBarRow}>
                        <View style={{ flex: 1 }}>
                            <SegControl
                                tabs={[
                                    { key: 'all', label: 'All' },
                                    { key: 'Electricity', label: 'Electricity' },
                                    { key: 'Water', label: 'Water' },
                                    { key: 'LPG Gas', label: 'Gas' },
                                ]}
                                activeKey={bbpsTab}
                                onChange={setBbpsTab}
                            />
                        </View>
                        <TouchableOpacity
                            onPress={handleFilterPress}
                            style={s.filterBtn}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons
                                name="filter-variant"
                                size={20}
                                color={Colors.finance_accent}
                            />
                        </TouchableOpacity>
                    </View>

                    <Modal
                        visible={isFilterVisible}
                        transparent
                        animationType="none"
                        onRequestClose={() => setIsFilterVisible(false)}
                    >
                        <Animated.View
                            style={[s.modalOverlay, { opacity: backdropA }]}
                        >
                            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => setIsFilterVisible(false)} />
                        </Animated.View>
                        <Animated.View style={[s.modalContent, { transform: [{ translateY: slideA }] }]} {...panResponder.panHandlers}>
                                <View style={s.modalHeader}>
                                    <Text style={s.modalTitle}>Choose Service Filter</Text>
                                    <TouchableOpacity onPress={() => setIsFilterVisible(false)}>
                                        <MaterialCommunityIcons name="close" size={24} color={Colors.white} />
                                    </TouchableOpacity>
                                </View>

                                {fetchingCats ? (
                                    <ActivityIndicator size="small" color={Colors.finance_accent} style={{ margin: 20 }} />
                                ) : (
                                    <ScrollView style={s.catList}>
                                        <TouchableOpacity
                                            style={[s.catItem, bbpsTab === 'all' && s.catItemOn]}
                                            onPress={() => { setBbpsTab('all'); setIsFilterVisible(false); }}
                                        >
                                            <Text style={[s.catItemTxt, bbpsTab === 'all' && s.catItemTxtOn]}>View All Services</Text>
                                        </TouchableOpacity>
                                        {bbpsCategories.map((cat, idx) => {
                                            const catName = cat?.categoryName || cat?.name || (typeof cat === 'string' ? cat : '');
                                            if (!catName) return null;

                                            return (
                                                <TouchableOpacity
                                                    key={idx}
                                                    style={[s.catItem, bbpsTab === catName && s.catItemOn]}
                                                    onPress={() => {
                                                        setBbpsTab(catName);
                                                        setIsFilterVisible(false);
                                                    }}
                                                >
                                                    <Text style={[s.catItemTxt, bbpsTab === catName && s.catItemTxtOn]}>
                                                        {catName}
                                                    </Text>
                                                    <MaterialCommunityIcons name="chevron-right" size={16} color={Colors.text_secondary} />
                                                </TouchableOpacity>
                                            );
                                        })}
                                    </ScrollView>
                                )}
                            </Animated.View>
                    </Modal>

                    <View style={s.searchWrap}>
                        <TextInput
                            style={s.searchInput}
                            placeholder="Search service structure..."
                            placeholderTextColor={Colors.text_placeholder}
                            value={bbpsSearch}
                            onChangeText={setBbpsSearch}
                        />
                    </View>

                    <CommTable data={mappedBbps} accentColor={Colors.finance_accent} />

                    <View style={{ height: 20 }} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: Colors.bg,
    },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },
    planCard: {
        backgroundColor: Colors.homebg,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: Colors.homebg,
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 10,
        elevation: 2,
    },
    planGradBar: {
        height: 4,
        backgroundColor: Colors.finance_accent,
    },
    planTop: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 14,
    },
    planIcon: {
        width: 44,
        height: 44,
        backgroundColor: Colors.finance_chip,
        borderWidth: 1,
        borderColor: Colors.finance_accent,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    planInfo: { flex: 1 },
    planName: {
        fontSize: 13.5,
        color: Colors.black,
        letterSpacing: 0.5,
        fontFamily: Fonts.Bold,
    },
    planOrg: {
        fontSize: 11.5,
        color: Colors.text_secondary,
        marginTop: 2,
        fontFamily: Fonts.Medium,
    },
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: Colors.finance_success,
        borderRadius: 100,
    },
    activeDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: Colors.finance_success,
    },
    activeTxt: {
        fontSize: 10,
        color: Colors.finance_success,
        letterSpacing: 0.7,
        fontFamily: Fonts.Bold,
        textTransform: 'uppercase',
    },
    sh: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 20,
        paddingBottom: 0,
    },
    shLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    shPip: { width: 3, height: 17, borderRadius: 2 },
    shTitle: {
        fontSize: 13.5,
        color: Colors.finance_text,
        letterSpacing: 0.7,
        fontFamily: Fonts.Bold,
        textTransform: 'uppercase',
    },
    shTag: {
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 100,
        borderWidth: 1,
    },
    shTagTxt: {
        fontSize: 9.5,
        letterSpacing: 0.8,
        fontFamily: Fonts.Bold,
        textTransform: 'uppercase',
    },
    segWrapper: { paddingTop: 10, paddingBottom: 12 },
    segScroll: {},
    seg: {
        flexDirection: 'row',
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
        padding: 3,
        gap: 2,
    },
    segBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 7,
    },
    segBtnOn: {
        backgroundColor: Colors.primary,
        shadowColor: Colors.primary,
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
        elevation: 2,
    },
    segBtnTxt: {
        fontSize: 11,
        color: Colors.text_secondary,
        letterSpacing: 0.5,
        fontFamily: Fonts.Bold,
        textTransform: 'uppercase',
    },
    segBtnTxtOn: { color: Colors.white },
    table: {
        backgroundColor: Colors.white,
        borderWidth: 0.5,
        borderColor: Colors.finance_accent,
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 4,
        shadowColor: Colors.homebg,
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
        elevation: 1,
    },
    tableHead: {
        flexDirection: 'row',
        paddingHorizontal: 14,
        paddingVertical: 9,
        backgroundColor: Colors.homeSecondry,
        borderBottomWidth: 1,
        borderBottomColor: Colors.finance_accent,
    },
    th: {
        flex: 1,
        fontSize: 9.5,
        color: Colors.primary,
        letterSpacing: 1,
        fontFamily: Fonts.Bold,
        textTransform: 'uppercase',
        textAlign: 'center',
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: Colors.gray_EB,
    },
    tdName: {
        flex: 1,
        fontSize: 12.5,
        color: Colors.finance_text,
        fontFamily: Fonts.Bold,
        textAlign: 'left',
    },
    tdRange: {
        flex: 1,
        fontSize: 11.5,
        color: Colors.text_secondary,
        fontFamily: Fonts.Medium,
        textAlign: 'center',
    },
    tdComm: {
        flex: 1,
        fontSize: 13,
        fontFamily: Fonts.Bold,
        textAlign: 'center',
    },
    badge: {
        flex: 1,
        alignSelf: 'center',
        justifyContent: 'center',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 5,
        borderWidth: 1,
    },
    badgePercent: {
        backgroundColor: Colors.finance_chip,
        borderColor: Colors.finance_accent,
    },
    badgeFlat: {
        backgroundColor: Colors.finance_chip,
        borderColor: Colors.finance_accent,
    },
    badgeTxt: {
        fontSize: 9,
        letterSpacing: 0.6,
        fontFamily: Fonts.Bold,
        textTransform: 'uppercase',
        textAlign: 'center',
    },
    searchWrap: {
        marginBottom: 10,
    },
    searchInput: {
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 8,
        fontSize: 13,
        color: Colors.finance_text,
        fontFamily: Fonts.Medium,
    },
    bbpsBarRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingTop: 12,
        paddingBottom: 12,
    },
    filterBtn: {
        width: 38,
        height: 38,
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.finance_accent,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: Colors.shadow,
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        elevation: 2,
    },

    // ── Search ──
    searchWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: Colors.white,
        borderWidth: 1,
        borderColor: Colors.border,
        borderRadius: 12,
        paddingHorizontal: 12,
        marginBottom: 10,
        shadowColor: Colors.shadow,
        shadowOpacity: 0.05,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
        elevation: 1,
    },
    searchIcon: { marginRight: 8 },
    searchInput: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 14,
        color: Colors.text_primary,
        fontFamily: Fonts.Medium,
    },
    searchClear: { padding: 4 },

    // ── Modal ──
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Colors.white,
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
        maxHeight: '72%',
        paddingBottom: 20,
    },
    modalHandle: {
        width: 40,
        height: 4,
        backgroundColor: Colors.gray_E0,
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 4,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        backgroundColor: Colors.primary,
        borderTopLeftRadius: 26,
        borderTopRightRadius: 26,
    },
    modalTitle: {
        fontSize: 17,
        color: Colors.white,
        fontFamily: Fonts.Bold,
        letterSpacing: 0.2,
    },
    modalCloseBtn: {
        width: 30,
        height: 30,
        backgroundColor: Colors.gray_F0,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    catList: {
        padding: 16,
    },
    catItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        marginBottom: 4,
        backgroundColor: Colors.white,
    },
    catItemOn: {
        backgroundColor: Colors.finance_chip,
    },
    catItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    catItemTxt: {
        fontSize: 15,
        color: Colors.black,
        fontFamily: Fonts.Medium,
    },
    catItemTxtOn: {
        color: Colors.black,
        fontFamily: Fonts.Bold,
    },

    // ── Retry ──
    retryBtn: {
        marginTop: 16,
        paddingHorizontal: 24,
        paddingVertical: 10,
        backgroundColor: Colors.primary,
        borderRadius: 10,
    },
    retryTxt: {
        color: Colors.finance_accent,
        fontSize: 15,
        fontFamily: Fonts.Bold,
        letterSpacing: 0.3,
    },
});