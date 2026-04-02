/**
 * CommissionPlanScreen.jsx
 * React Native — Commission Plan Screen for Camlenio
 * Mirrors the HTML mockup design faithfully.
 *
 * Dependencies (add to your project):
 *   npm install react-native-safe-area-context
 *   npm install @react-navigation/native  (for back button if needed)
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    Animated,
    StatusBar,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMyCommissionPlan } from '../api/AuthApi';

// ─── Tokens ──────────────────────────────────────────────────────────────────
const C = {
    bg: '#EEF2FF',
    screen: '#F8FAFF',
    white: '#FFFFFF',
    s1: '#F1F5FF',
    blue: '#2563EB',
    blueD: '#1D4ED8',
    blueL: '#EFF6FF',
    blueM: '#BFDBFE',
    blueXL: '#F0F5FF',
    indigo: '#4F46E5',
    indigoBg: '#EEF2FF',
    cyan: '#0891B2',
    cyanBg: '#ECFEFF',
    cyanBr: '#A5F3FC',
    amber: '#D97706',
    amberBg: '#FFFBEB',
    green: '#059669',
    greenBg: '#ECFDF5',
    greenBr: '#A7F3D0',
    t1: '#0F172A',
    t2: '#334155',
    t3: '#64748B',
    t4: '#94A3B8',
    t5: '#CBD5E1',
    br: '#E2E8F0',
    brD: '#CBD5E1',
};


// ─── Sub-components ───────────────────────────────────────────────────────────

const Badge = ({ type }) =>
    type === '%' ? (
        <View style={[s.badge, s.badgePercent]}>
            <Text style={[s.badgeTxt, { color: C.indigo }]}>Percent</Text>
        </View>
    ) : (
        <View style={[s.badge, s.badgeFlat]}>
            <Text style={[s.badgeTxt, { color: C.cyan }]}>Flat</Text>
        </View>
    );

const CommTable = ({ data, accentColor }) => (
    <View style={s.table}>
        {/* Header (Fixed) */}
        <View style={[s.tableHead, { borderBottomColor: C.br }]}>
            {['Operator', 'Range', 'Comm.', 'Type'].map((h) => (
                <Text key={h} style={s.th}>{h}</Text>
            ))}
        </View>

        {/* Scrollable Rows */}
        <View style={{ maxHeight: 215 }}>
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={true}>
                {data.map((row, i) => (
                    <View
                        key={i}
                        style={[s.tableRow, i === data.length - 1 && { borderBottomWidth: 0 }]}
                    >
                        <Text style={s.tdName} numberOfLines={1}>{row.name}</Text>
                        <Text style={s.tdRange}>{row.range}</Text>
                        <Text style={[s.tdComm, { color: accentColor || C.blue }]}>{row.comm}</Text>
                        <Badge type={row.type} />
                    </View>
                ))}
                {data.length === 0 && (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text style={{ fontSize: 12, color: C.t4 }}>No data found for this category</Text>
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
                    activeOpacity={0.7}
                >
                    <Text style={[s.segBtnTxt, activeKey === tab.key && s.segBtnTxtOn]}>
                        {tab.label}
                    </Text>
                </TouchableOpacity>
            ))}
        </View>
    </ScrollView>
);

const SectionHeader = ({ title, tag, color, pipColor }) => (
    <View style={s.sh}>
        <View style={s.shLeft}>
            <View style={[s.shPip, { backgroundColor: pipColor || C.blue }]} />
            <Text style={s.shTitle}>{title}</Text>
        </View>
        <View style={[s.shTag, { backgroundColor: color?.tagBg, borderColor: color?.tagBorder }]}>
            <Text style={[s.shTagTxt, { color: color?.tagText }]}>{tag}</Text>
        </View>
    </View>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CommissionPlanScreen({ navigation }) {
    const [rechargeTab, setRechargeTab] = useState('mob');
    const [bbpsTab, setBbpsTab] = useState('all');
    const [bbpsTabExpanded, setBbpsTabExpanded] = useState(false);
    const [loading, setLoading] = useState(true);
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
        }
    };

    // Helper to get rows by service name
    const getServiceRows = (serviceName) => {
        const service = planData.find(s => s.serviceName === serviceName);
        return service?.rows || [];
    };

    // Filter logic for tabs
    const rechargeRows = getServiceRows('recharge');
    const bbpsRows = getServiceRows('bbps');

    const filteredRecharge = rechargeRows.filter(r => {
        if (rechargeTab === 'mob') return !r.name.includes('DTH') && !r.name.includes('TALKTIME') && !r.name.includes('Datacard');
        if (rechargeTab === 'dth') return r.name.includes('DTH');
        if (rechargeTab === 'dat') return r.name.includes('Datacard');
        return true;
    });

    // If the API returns everything in one list (like in user example), we might need to map it carefully.
    // In the user's example, BSNL TALKTIME is recharge, AIRTEL is recharge, etc.
    // Let's use a more robust mapping for the provided response:
    const mapRows = (rows) => rows.map(r => ({
        name: r.name,
        range: `₹${r.fromAmount} – ${r.toAmount}`,
        comm: r.commissionType === 'flat' ? `₹${r.commission}` : `${r.commission}%`,
        type: r.commissionType === 'flat' ? 'Flat' : '%'
    }));

    const mappedRecharge = mapRows(rechargeRows.filter(r => {
        const name = r.name.toUpperCase();
        if (rechargeTab === 'jio') return name.includes('JIO');
        if (rechargeTab === 'airtel') return name.includes('AIRTEL');
        if (rechargeTab === 'vi') return name.includes('VI');
        if (rechargeTab === 'bsnl') return name.includes('BSNL');
        return true;
    }));

    const mappedBbps = mapRows(bbpsRows.filter(r => {
        const name = r.name.toLowerCase();
        if (bbpsTab === 'all') return true;
        if (bbpsTab === 'elc') return name.includes('electricity');
        if (bbpsTab === 'wat') return name.includes('water');
        if (bbpsTab === 'gas') return name.includes('gas');
        if (bbpsTab === 'ins') return name.includes('insurance');
        if (bbpsTab === 'dth') return name.includes('dth');
        return true;
    }));

    return (
        <SafeAreaView style={s.root} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor={C.screen} />

            {/* ── Header ── */}
            <View style={s.hdr}>
                <TouchableOpacity
                    style={s.hdrBack}
                    onPress={() => navigation?.goBack?.()}
                    activeOpacity={0.7}
                >
                    {/* Chevron left */}
                    <Text style={s.hdrBackIcon}>‹</Text>
                </TouchableOpacity>

                <View style={s.hdrCenter}>
                    <Text style={s.hdrTitle}>Commission Plan</Text>
                    <Text style={s.hdrSub}>Active commission structures</Text>
                </View>
            </View>

            {/* ── Scroll Content ── */}
            {loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={C.blue} />
                </View>
            ) : error ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
                    <Text style={{ color: 'red', textAlign: 'center' }}>{error}</Text>
                    <TouchableOpacity onPress={fetchPlan} style={{ marginTop: 10, padding: 10, backgroundColor: C.blue, borderRadius: 5 }}>
                        <Text style={{ color: '#fff' }}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    style={s.scroll}
                    contentContainerStyle={s.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Plan Card (Mock stats for now as not in specific API response) */}
                    <View style={s.planCard}>
                        <View style={s.planGradBar} />
                        <View style={s.planTop}>
                            <View style={s.planIcon}>
                                <Text style={{ fontSize: 22 }}>🛡️</Text>
                            </View>
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

                    {/* ── Recharge Section ── */}
                    <SectionHeader
                        title="RECHARGE"
                        tag="Mobile "
                        pipColor={C.blue}
                        color={{ tagBg: C.blueL, tagBorder: C.blueM, tagText: C.blue }}
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

                    <CommTable data={mappedRecharge} accentColor={C.blue} />

                    {/* ── BBPS Section ── */}
                    <SectionHeader
                        title="BBPS"
                        tag="Bills · Utilities"
                        pipColor={C.cyan}
                        color={{ tagBg: C.cyanBg, tagBorder: C.cyanBr, tagText: C.cyan }}
                    />

                    <View style={s.segWrapper}>
                        <SegControl
                            tabs={(() => {
                                const fullTabs = [
                                    { key: 'all', label: 'All' },
                                    { key: 'elc', label: 'Electricity' },
                                    { key: 'wat', label: 'Water' },
                                    { key: 'dth', label: 'DTH' },
                                    { key: 'gas', label: 'Gas' },
                                    { key: 'ins', label: 'Insurance' },
                                ];
                                if (bbpsTabExpanded) return fullTabs;
                                return [...fullTabs.slice(0, 3), { key: 'more', label: 'More' }];
                            })()}
                            activeKey={bbpsTab}
                            onChange={(key) => {
                                if (key === 'more') {
                                    setBbpsTabExpanded(true);
                                } else {
                                    setBbpsTab(key);
                                }
                            }}
                        />
                    </View>

                    <CommTable data={mappedBbps} accentColor={C.cyan} />

                    <View style={{ height: 20 }} />
                </ScrollView>
            )}
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: C.screen,
    },

    // Header
    hdr: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: C.br,
        backgroundColor: "#1A1A2E",
    },
    hdrBack: {
        width: 34,
        height: 34,
        backgroundColor: "rgba(255, 255, 255, 0.1)",
        borderWidth: 1,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    hdrBackIcon: {
        fontSize: 30,
        color: C.t3,
        lineHeight: 26,
        marginTop: -2,
    },
    hdrCenter: { flex: 1 },
    hdrTitle: {
        fontSize: 15.5,
        fontWeight: '800',
        color: "#fff",
        letterSpacing: 0.1,
    },
    hdrSub: {
        fontSize: 10.5,
        color: "#fff",
        marginTop: 2,
    },

    // Scroll
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20 },

    // Plan Card
    planCard: {
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.br,
        borderRadius: 18,
        overflow: 'hidden',
        shadowColor: C.blue,
        shadowOpacity: 0.08,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 10,
        elevation: 2,
    },
    planGradBar: {
        height: 3,
        backgroundColor: C.blue,
        // Linear gradient would require expo-linear-gradient; using solid blue as fallback
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
        backgroundColor: C.blueL,
        borderWidth: 1,
        borderColor: C.blueM,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    planInfo: { flex: 1 },
    planName: {
        fontSize: 12.5,
        fontWeight: '800',
        color: C.t1,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    planOrg: {
        fontSize: 10.5,
        color: C.t4,
        marginTop: 2,
    },
    activeBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: C.greenBg,
        borderWidth: 1,
        borderColor: C.greenBr,
        borderRadius: 100,
    },
    activeDot: {
        width: 5,
        height: 5,
        borderRadius: 3,
        backgroundColor: C.green,
    },
    activeTxt: {
        fontSize: 9,
        fontWeight: '700',
        color: C.green,
        letterSpacing: 0.7,
        textTransform: 'uppercase',
    },
    planDivider: {
        height: 1,
        backgroundColor: C.br,
        marginHorizontal: 16,
    },
    planStats: {
        flexDirection: 'row',
        paddingVertical: 12,
    },
    stat: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    statBorder: {
        borderRightWidth: 1,
        borderRightColor: C.br,
    },
    statVal: {
        fontSize: 15,
        fontWeight: '800',
        color: C.blue,
        lineHeight: 18,
    },
    statLabel: {
        fontSize: 9,
        color: C.t4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginTop: 3,
        textAlign: 'center',
    },

    // Metrics
    metrics: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 12,
    },
    metricCard: {
        flex: 1,
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.br,
        borderRadius: 14,
        padding: 13,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
        elevation: 1,
    },
    metricBar: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 2.5,
        borderTopLeftRadius: 14,
        borderTopRightRadius: 14,
    },
    metricIcon: {
        width: 28,
        height: 28,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 9,
    },
    metricVal: {
        fontSize: 13,
        fontWeight: '800',
        color: C.t1,
        lineHeight: 16,
    },
    metricLabel: {
        fontSize: 9,
        color: C.t4,
        marginTop: 3,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Section Header
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
        fontSize: 12.5,
        fontWeight: '800',
        color: C.t1,
        letterSpacing: 0.7,
        textTransform: 'uppercase',
    },
    shTag: {
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 100,
        borderWidth: 1,
    },
    shTagTxt: {
        fontSize: 8.5,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },

    // Segmented Control
    segWrapper: { paddingTop: 10, paddingBottom: 12 },
    segScroll: {},
    seg: {
        flexDirection: 'row',
        backgroundColor: C.s1,
        borderWidth: 1,
        borderColor: C.br,
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
        backgroundColor: C.white,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
        elevation: 2,
    },
    segBtnTxt: {
        fontSize: 10,
        fontWeight: '700',
        color: C.t4,
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    segBtnTxtOn: { color: C.blue },

    // Table
    table: {
        backgroundColor: C.white,
        borderWidth: 1,
        borderColor: C.br,
        borderRadius: 14,
        overflow: 'hidden',
        marginBottom: 4,
        shadowColor: '#000',
        shadowOpacity: 0.04,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
        elevation: 1,
    },
    tableHead: {
        flexDirection: 'row',
        paddingHorizontal: 14,
        paddingVertical: 9,
        backgroundColor: C.s1,
        borderBottomWidth: 1,
        borderBottomColor: C.br,
    },
    th: {
        flex: 1,
        fontSize: 8.5,
        fontWeight: '700',
        color: C.t4,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    tableRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(226,232,240,0.65)',
    },
    tdName: {
        flex: 1,
        fontSize: 11.5,
        fontWeight: '700',
        color: C.t1,
    },
    tdRange: {
        flex: 1,
        fontSize: 10.5,
        color: C.t3,
    },
    tdComm: {
        flex: 1,
        fontSize: 12,
        fontWeight: '800',
    },
    badge: {
        flex: 1,
        alignSelf: 'flex-start',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 5,
        borderWidth: 1,
    },
    badgePercent: {
        backgroundColor: C.indigoBg,
        borderColor: 'rgba(79,70,229,0.15)',
    },
    badgeFlat: {
        backgroundColor: C.cyanBg,
        borderColor: C.cyanBr,
    },
    badgeTxt: {
        fontSize: 8,
        fontWeight: '700',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
    },
});