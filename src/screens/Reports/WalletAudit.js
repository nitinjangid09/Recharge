import React, { useRef } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Animated,
    Platform,
    ToastAndroid,
    Alert,
    Dimensions,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import Colors from '../../constants/Colors';
import HeaderBar from '../../componets/HeaderBar/HeaderBar';


const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── COLOR TOKENS ─────────────────────────────────────────────────────────────
// Migrated to global Colors utility


// ─── COPY HELPER ──────────────────────────────────────────────────────────────
function copyToClipboard(text) {
    Clipboard.setString(text);
    if (Platform.OS === 'android') {
        ToastAndroid.show('Copied to clipboard', ToastAndroid.SHORT);
    } else {
        Alert.alert('Copied', 'Copied to clipboard');
    }
}

// HeaderBar is used instead of custom topbar

// ─── COPY ICON BUTTON ─────────────────────────────────────────────────────────
function CopyButton({ value }) {
    const scale = useRef(new Animated.Value(1)).current;
    const press = () => {
        Animated.sequence([
            Animated.timing(scale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
            Animated.timing(scale, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]).start();
        copyToClipboard(value);
    };
    return (
        <TouchableOpacity onPress={press} activeOpacity={0.8}>
            <Animated.View style={[styles.copyBtn, { transform: [{ scale }] }]}>
                <Text style={{ fontSize: 11, color: Colors.finance_accent }}>⧉</Text>
            </Animated.View>
        </TouchableOpacity>
    );
}

// ─── BADGE ────────────────────────────────────────────────────────────────────
function Badge({ type, label }) {
    const map = {
        failed: { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'rgba(239,68,68,0.2)' },
        success: { bg: 'rgba(34,197,94,0.1)', color: '#22C55E', border: 'rgba(34,197,94,0.2)' },
        refund: { bg: 'rgba(212,176,106,0.15)', color: '#A07830', border: Colors.amberOpacity_30 },
    };
    const c = map[type];
    return (
        <View style={[styles.badge, { backgroundColor: c.bg, borderColor: c.border }]}>
            <Text style={[styles.badgeText, { color: c.color }]}>{label}</Text>
        </View>
    );
}

// ─── SECTION LABEL ────────────────────────────────────────────────────────────
function SectionLabel({ children }) {
    return <Text style={styles.sectionLabel}>{children}</Text>;
}

// ─── CARD HEADER ──────────────────────────────────────────────────────────────




// ─── INFO ROW ─────────────────────────────────────────────────────────────────
function InfoRow({
    icon,
    label,
    value,
    mono,
    color,
    copyValue,
    badge,
}) {
    return (
        <View style={styles.infoRow}>
            <View style={styles.infoRowLeft}>
                <View style={styles.infoRowIcon}>
                    <Text style={{ fontSize: 13, color: Colors.finance_accent }}>{icon}</Text>
                </View>
                <Text style={styles.infoRowLabel}>{label}</Text>
            </View>
            <View style={styles.infoRowRight}>
                {badge}
                {value ? (
                    <Text
                        style={[
                            mono ? styles.infoRowValueMono : styles.infoRowValue,
                            color ? { color } : null,
                        ]}
                        numberOfLines={2}
                    >
                        {value}
                    </Text>
                ) : null}
                {copyValue ? <CopyButton value={copyValue} /> : null}
            </View>
        </View>
    );
}

function FinGrid({ tiles }) {
    const iconBgMap = {
        cream: Colors.gold,
        green: 'rgba(34,197,94,0.1)',
        red: 'rgba(239,68,68,0.08)',
        gold: 'rgba(212,176,106,0.15)',
    };
    const iconColorMap = {
        cream: Colors.finance_accent,
        green: Colors.success,
        red: Colors.error,
        gold: Colors.gold,
    };

    return (
        <View style={styles.finGrid}>
            {tiles.map((t, i) => (
                <View
                    key={i}
                    style={[
                        styles.finTile,
                        t.dark && { backgroundColor: Colors.black, borderColor: 'transparent' },
                    ]}
                >
                    <View style={[styles.finTileIcon, { backgroundColor: iconBgMap[t.iconColor] }]}>
                        <Text style={{ fontSize: 14, color: iconColorMap[t.iconColor] }}>{t.icon}</Text>
                    </View>
                    <Text style={[styles.finTileLabel, t.dark && { color: 'rgba(255,255,255,0.4)' }]}>
                        {t.label}
                    </Text>
                    <Text
                        style={[
                            styles.finTileValue,
                            t.dark && { color: Colors.white },
                            t.valueColor ? { color: t.valueColor } : null,
                        ]}
                    >
                        {t.value}
                    </Text>
                    <Text style={[styles.finTileSub, t.dark && { color: 'rgba(255,255,255,0.3)' }]}>
                        {t.sub}
                    </Text>
                </View>
            ))}
        </View>
    );
}

// ─── BALANCE FLOW ─────────────────────────────────────────────────────────────
function BalanceFlow({ txn }) {
    return (
        <View style={styles.balanceFlow}>
            <View style={{ flex: 1 }}>
                <Text style={styles.bfLabel}>Opening Bal</Text>
                <Text style={styles.bfValue}>{txn.openingBalance || '₹0.00'}</Text>
                <Text style={styles.bfSub}>Before txn</Text>
            </View>
            <View style={styles.bfArrow}>
                <View style={styles.bfArrowLine}>
                    <Text style={{ color: Colors.finance_accent, fontSize: 14 }}>→</Text>
                </View>
                <Text style={[styles.bfDelta, { color: txn.type === 'credit' || txn.isRefunded ? Colors.success : Colors.error }]}>{txn.amountStr || `₹${txn.amount || '0'}`}</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.bfLabel}>Closing Bal</Text>
                <Text style={[styles.bfValue, { color: txn.type === 'credit' || txn.isRefunded ? Colors.success : Colors.error }]}>{txn.closingBalance || '₹0.00'}</Text>
                <Text style={styles.bfSub}>After txn</Text>
            </View>
        </View>
    );
}

// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function TransactionAuditScreen({ navigation, route }) {
    const txn = route.params?.txn || {};

    const formatCurrency = (val) => {
        const num = parseFloat(String(val).replace(/[^0-9.-]/g, '')) || 0;
        return num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const displayAmount = formatCurrency(txn.amount);
    const [amtInt, amtDec] = displayAmount.split('.');

    const finTiles = [
        { icon: '₹', iconColor: 'cream', label: 'Txn Amount', value: `₹${amtInt}`, sub: `.${amtDec}` },
        { icon: '🏛', iconColor: 'green', label: 'GST Amount', value: txn.gst || '₹0.00', valueColor: Colors.success, sub: 'Tax (CR)' },
        { icon: '✕', iconColor: 'red', label: 'Charges', value: txn.charges || '₹0.00', valueColor: Colors.error, sub: 'Processing' },
        { icon: '📉', iconColor: 'gold', label: 'TDS Deducted', value: txn.tds || '₹0.00', valueColor: Colors.finance_accent, sub: 'Govt Levy' },
    ];

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />


            {/* ── HEADER ── */}
            <HeaderBar
                title="Wallet Audit"
                onBack={() => navigation.goBack()}
            />

            {/* ── SCROLL BODY ── */}
            <ScrollView
                style={styles.scrollBody}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* HERO AMOUNT CARD */}
                <View style={styles.heroCard}>
                    <View style={styles.heroGlowTR} />
                    <View style={styles.heroGlowBL} />
                    <View style={styles.heroTop}>
                        <Text style={styles.heroType}>{txn.category || 'Recharge'} · {txn.serviceName || 'Transaction'}</Text>
                    </View>
                    <Text style={styles.heroLabel}>Transaction Amount</Text>
                    <View style={styles.heroAmount}>
                        <Text style={[styles.heroCurrency, { color: txn.type === 'credit' || txn.isRefunded ? Colors.success : Colors.error }]}>₹</Text>
                        <Text style={[styles.heroAmountNum, { color: txn.type === 'credit' || txn.isRefunded ? Colors.success : Colors.error }]}>{amtInt}</Text>
                        <Text style={styles.heroAmountDec}>.{amtDec}</Text>
                    </View>

                    {/* TRANSACTION MESSAGE BOX */}
                    <View style={styles.heroMsgBox}>
                        <Text style={{ fontSize: 18, color: Colors.finance_accent, marginRight: 10 }}>
                            {txn.category === 'Aeps' ? '☝️' : '⚡'}
                        </Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.heroMsgText}>
                                {txn.message || 'Transaction processed successfully.'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.heroMeta}>
                        <View>
                            <Text style={styles.heroStatLabel}>Status</Text>
                            <Text style={[styles.heroStatValue, { color: txn.type === 'credit' || txn.isRefunded ? Colors.success : Colors.error }]}>
                                {txn.isRefunded ? 'Refunded' : 'Success'}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.heroStatLabel}>Date</Text>
                            <Text style={styles.heroStatValue}>{txn.date || '—'}</Text>
                        </View>
                        <View>
                            <Text style={styles.heroStatLabel}>Agent</Text>
                            <Text style={[styles.heroStatValue, { color: Colors.gold }]}>{txn.userName || 'System'}</Text>
                        </View>
                    </View>
                </View>



                {/* TRANSACTION DETAILS */}
                <SectionLabel>Transaction Details</SectionLabel>
                <View style={styles.infoCard}>
                    <InfoRow icon="🔖" label="Order ID" value={txn.id || '—'} mono copyValue={txn.id} />
                    <InfoRow icon="🔗" label="Ref ID" value={txn.txnId || '—'} mono copyValue={txn.txnId} />
                    <InfoRow icon="📱" label="Mobile" value={txn.mobileNo || '—'} />
                    <InfoRow icon="📍" label="Operator" value={txn.operatorName || '—'} />
                    <InfoRow icon="💳" label="Payment Mode" value="Wallet" color={Colors.finance_accent} />
                    <InfoRow icon="🕐" label="Timestamp" value={txn.date || '—'} mono />
                </View>

                {/* BALANCE FLOW */}
                <SectionLabel>Wallet Balance Flow</SectionLabel>
                <BalanceFlow txn={txn} />

                {/* FINANCIAL GRID */}
                <SectionLabel>Financial Precision</SectionLabel>
                <FinGrid tiles={finTiles} />





                {/* ACTION BUTTONS */}
                <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]} activeOpacity={0.85}>
                        <Text style={{ fontSize: 14, color: Colors.white }}>🖨</Text>
                        <Text style={styles.actionBtnPrimaryText}>Print Receipt</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnSecondary]}
                        activeOpacity={0.85}
                        onPress={() => copyToClipboard(txn.txnId || 'N/A')}
                    >
                        <Text style={{ fontSize: 14, color: Colors.finance_accent }}>⧉</Text>
                        <Text style={styles.actionBtnSecondaryText}>Copy Ref ID</Text>
                    </TouchableOpacity>
                </View>

                {/* FOOTER */}
                <View style={styles.auditFooter}>
                    <Text style={{ fontSize: 12, color: Colors.gray }}>🛡</Text>
                    <Text style={styles.auditFooterText}>Audit Vault Protected Entry</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.bg,
    },

    // Styles for topbar removed as HeaderBar is used
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        flexShrink: 0,
    },
    badgeText: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
    },

    // SCROLL
    scrollBody: { flex: 1 },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
        gap: 14,
        flexDirection: 'column',
    },

    // HERO CARD
    heroCard: {
        backgroundColor: Colors.primary,
        borderRadius: 28,
        padding: 24,
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 0,
    },
    heroGlowTR: {
        position: 'absolute',
        top: -60,
        right: -60,
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(212,176,106,0.18)',
    },
    heroGlowBL: {
        position: 'absolute',
        bottom: -40,
        left: -40,
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(212,176,106,0.1)',
    },
    heroTop: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
    },
    heroIcon: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(212,176,106,0.15)',
        borderWidth: 1,
        borderColor: 'rgba(212,176,106,0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    heroMsgBox: {
        marginTop: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: 12,
        borderRadius: 12,
        borderLeftWidth: 3,
        borderLeftColor: Colors.finance_accent,
        flexDirection: 'row',
        alignItems: 'center',
    },
    heroMsgText: {
        fontSize: 11,
        color: 'rgba(255,255,255,0.7)',
        fontStyle: 'italic',
        lineHeight: 16,
    },
    heroType: {
        fontSize: 9,
        fontWeight: '900',
        letterSpacing: 1.6,
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.4)',
    },
    heroLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.4)',
        marginBottom: 6,
    },
    heroAmount: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 4,
    },
    heroCurrency: {
        fontSize: 22,
        fontWeight: '700',
        color: Colors.finance_accent,
        lineHeight: 44,
    },
    heroAmountNum: {
        fontSize: 40,
        fontWeight: '900',
        color: Colors.white,
        letterSpacing: -1.2,
        lineHeight: 44,
    },
    heroAmountDec: {
        fontSize: 22,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.4)',
        lineHeight: 38,
    },
    heroMeta: {
        marginTop: 20,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255,255,255,0.07)',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    heroStatLabel: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.35)',
        marginBottom: 4,
    },
    heroStatValue: {
        fontSize: 12,
        fontWeight: '800',
        color: Colors.white,
    },

    // INFO CARD
    infoCard: {
        backgroundColor: Colors.homebg,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.amberOpacity_30,
        overflow: 'hidden',
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        paddingVertical: 13,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.04)',
        gap: 12,
    },
    infoRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flexShrink: 0,
    },
    infoRowIcon: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.amberOpacity_30,
    },
    infoRowLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: Colors.gray,
        flexShrink: 0,
    },
    infoRowRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        justifyContent: 'flex-end',
    },
    infoRowValue: {
        fontSize: 12.5,
        fontWeight: '800',
        color: Colors.text_primary,
        textAlign: 'right',
        flexShrink: 1,
    },
    infoRowValueMono: {
        fontSize: 10.5,
        fontWeight: '500',
        color: Colors.text_primary,
        textAlign: 'right',
        flexShrink: 1,
        fontVariant: ['tabular-nums'],
    },
    copyBtn: {
        width: 26,
        height: 26,
        borderRadius: 8,
        backgroundColor: Colors.gold,
        borderWidth: 1,
        borderColor: Colors.amberOpacity_30,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // SECTION LABEL
    sectionLabel: {
        fontSize: 9.5,
        fontWeight: '800',
        letterSpacing: 1.6,
        textTransform: 'uppercase',
        color: Colors.gray,
        marginTop: 4,
        marginBottom: -4,
        paddingHorizontal: 2,
    },

    // BALANCE FLOW
    balanceFlow: {
        backgroundColor: Colors.bg,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.amberOpacity_30,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
    },
    bfLabel: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: Colors.gray,
        marginBottom: 4,
    },
    bfValue: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: -0.3,
        color: Colors.black,
    },
    bfSub: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.gray,
        marginTop: 2,
    },
    bfArrow: {
        alignItems: 'center',
        paddingHorizontal: 12,
        flexShrink: 0,
    },
    bfArrowLine: {
        width: 50,
        height: 1,
        backgroundColor: Colors.amberOpacity_30,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bfDelta: {
        fontSize: 10,
        fontWeight: '900',
        color: Colors.success,
        marginTop: 4,
    },

    // FINANCIAL GRID
    finGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    finTile: {
        width: (SCREEN_WIDTH - 42) / 2,
        backgroundColor: Colors.homebg,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: Colors.amberOpacity_30,
        padding: 16,
        gap: 6,
    },
    finTileFull: {
        width: '100%',
    },
    finTileIcon: {
        width: 30,
        height: 30,
        borderRadius: 10,
        backgroundColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: Colors.amberOpacity_30,
        marginBottom: 4,
    },
    finTileLabel: {
        fontSize: 9.5,
        fontWeight: '800',
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: Colors.gray,
    },
    finTileValue: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.3,
        color: Colors.text_primary,
    },
    finTileSub: {
        fontSize: 10,
        fontWeight: '600',
        color: Colors.gray,
    },

    // ACTIONS
    actionRow: {
        flexDirection: 'row',
        gap: 10,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        borderRadius: 16,
    },
    actionBtnPrimary: { backgroundColor: Colors.black },
    actionBtnPrimaryText: { fontSize: 11.5, fontWeight: '800', color: Colors.white },
    actionBtnSecondary: {
        backgroundColor: Colors.gold,
        borderWidth: 1,
        borderColor: Colors.amberOpacity_30,
    },
    actionBtnSecondaryText: { fontSize: 11.5, fontWeight: '800', color: Colors.black },

    // FOOTER
    auditFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
    },
    auditFooterText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
        color: Colors.gray,
    },
});