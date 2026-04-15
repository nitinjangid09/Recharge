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
    Clipboard,
    ToastAndroid,
    Alert,
    Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── COLOR TOKENS ─────────────────────────────────────────────────────────────
const COLORS = {
    gold: '#D4B06A',
    goldLight: '#F0C97A',
    goldPale: '#fde4a8',
    cream: '#F5E7C6',
    cream2: '#FAF3E1',
    cream3: '#ffebc0',
    black: '#000000',
    blackSoft: '#1A1A1A',
    textPrimary: '#111111',
    textSecondary: '#777777',
    textMuted: '#999999',
    white: '#FFFFFF',
    inputBg: '#fcecc8',
    border: 'rgba(0,0,0,0.08)',
    borderGold: 'rgba(212,176,106,0.35)',
    success: '#22C55E',
    error: '#EF4444',
    shadowGold: 'rgba(212,176,106,0.25)',
    shadowBlack: 'rgba(0,0,0,0.12)',
};

// ─── COPY HELPER ──────────────────────────────────────────────────────────────
function copyToClipboard(text) {
    Clipboard.setString(text);
    if (Platform.OS === 'android') {
        ToastAndroid.show('Copied to clipboard', ToastAndroid.SHORT);
    } else {
        Alert.alert('Copied', 'Copied to clipboard');
    }
}

// ─── BACK ICON ────────────────────────────────────────────────────────────────
function BackIcon() {
    return (
        <View style={styles.topbarBack}>
            <Text style={{ fontSize: 16, color: COLORS.black, fontWeight: '700' }}>‹</Text>
        </View>
    );
}

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
                <Text style={{ fontSize: 11, color: COLORS.gold }}>⧉</Text>
            </Animated.View>
        </TouchableOpacity>
    );
}

// ─── BADGE ────────────────────────────────────────────────────────────────────
function Badge({ type, label }) {
    const map = {
        failed: { bg: 'rgba(239,68,68,0.1)', color: '#EF4444', border: 'rgba(239,68,68,0.2)' },
        success: { bg: 'rgba(34,197,94,0.1)', color: '#22C55E', border: 'rgba(34,197,94,0.2)' },
        refund: { bg: 'rgba(212,176,106,0.15)', color: '#A07830', border: COLORS.borderGold },
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
                    <Text style={{ fontSize: 13, color: COLORS.gold }}>{icon}</Text>
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
        cream: COLORS.cream,
        green: 'rgba(34,197,94,0.1)',
        red: 'rgba(239,68,68,0.08)',
        gold: 'rgba(212,176,106,0.15)',
    };
    const iconColorMap = {
        cream: COLORS.gold,
        green: COLORS.success,
        red: COLORS.error,
        gold: COLORS.goldLight,
    };

    return (
        <View style={styles.finGrid}>
            {tiles.map((t, i) => (
                <View
                    key={i}
                    style={[
                        styles.finTile,
                        t.dark && { backgroundColor: COLORS.black, borderColor: 'transparent' },
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
                            t.dark && { color: COLORS.white },
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
                    <Text style={{ color: COLORS.gold, fontSize: 14 }}>→</Text>
                </View>
                <Text style={styles.bfDelta}>{txn.amountStr || `₹${txn.amount || '0'}`}</Text>
            </View>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
                <Text style={styles.bfLabel}>Closing Bal</Text>
                <Text style={styles.bfValue}>{txn.closingBalance || '₹0.00'}</Text>
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
        { icon: '🏛', iconColor: 'green', label: 'GST Amount', value: txn.gst || '₹0.00', valueColor: COLORS.success, sub: 'Tax (CR)' },
        { icon: '✕', iconColor: 'red', label: 'Charges', value: txn.charges || '₹0.00', valueColor: COLORS.error, sub: 'Processing' },
        { icon: '📉', iconColor: 'gold', label: 'TDS Deducted', value: txn.tds || '₹0.00', valueColor: COLORS.gold, sub: 'Govt Levy' },
    ];

    return (
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
            <StatusBar barStyle="dark-content" backgroundColor={COLORS.cream} />

            {/* ── TOPBAR ── */}
            <View style={styles.topbar}>
                <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.goBack()}>
                    <BackIcon />
                </TouchableOpacity>
                <View style={styles.topbarInfo}>
                    <Text style={styles.topbarTitle} numberOfLines={1}>
                        {txn.serviceName || txn.description || 'Transaction Audit'}
                    </Text>
                    <Text style={styles.topbarSub} numberOfLines={1}>
                        {txn.txnId || 'N/A'}
                    </Text>
                </View>
                <Badge
                    type={txn.isRefunded ? 'failed' : 'success'}
                    label={txn.isRefunded ? 'REFUNDED' : 'SUCCESS'}
                />
            </View>

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
                        <Text style={styles.heroCurrency}>₹</Text>
                        <Text style={styles.heroAmountNum}>{amtInt}</Text>
                        <Text style={styles.heroAmountDec}>.{amtDec}</Text>
                    </View>

                    {/* TRANSACTION MESSAGE BOX */}
                    <View style={styles.heroMsgBox}>
                        <Text style={{ fontSize: 18, color: COLORS.gold, marginRight: 10 }}>
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
                            <Text style={[styles.heroStatValue, { color: txn.isRefunded ? COLORS.error : COLORS.success }]}>
                                {txn.isRefunded ? 'Refunded' : 'Success'}
                            </Text>
                        </View>
                        <View>
                            <Text style={styles.heroStatLabel}>Date</Text>
                            <Text style={styles.heroStatValue}>{txn.date || '—'}</Text>
                        </View>
                        <View>
                            <Text style={styles.heroStatLabel}>Agent</Text>
                            <Text style={[styles.heroStatValue, { color: COLORS.goldLight }]}>{txn.userName || 'System'}</Text>
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
                    <InfoRow icon="💳" label="Payment Mode" value="Wallet" color={COLORS.gold} />
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
                        <Text style={{ fontSize: 14, color: COLORS.white }}>🖨</Text>
                        <Text style={styles.actionBtnPrimaryText}>Print Receipt</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.actionBtnSecondary]}
                        activeOpacity={0.85}
                        onPress={() => copyToClipboard(txn.txnId || 'N/A')}
                    >
                        <Text style={{ fontSize: 14, color: COLORS.gold }}>⧉</Text>
                        <Text style={styles.actionBtnSecondaryText}>Copy Ref ID</Text>
                    </TouchableOpacity>
                </View>

                {/* FOOTER */}
                <View style={styles.auditFooter}>
                    <Text style={{ fontSize: 12, color: COLORS.textMuted }}>🛡</Text>
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
        backgroundColor: COLORS.cream,
    },

    // TOPBAR
    topbar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: 'rgba(245,231,198,0.95)',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderGold,
    },
    topbarBack: {
        width: 38,
        height: 38,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.06)',
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
        justifyContent: 'center',
    },
    topbarInfo: {
        flex: 1,
        minWidth: 0,
    },
    topbarTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: COLORS.black,
        letterSpacing: -0.1,
    },
    topbarSub: {
        fontSize: 9.5,
        fontWeight: '500',
        color: COLORS.textMuted,
        fontVariant: ['tabular-nums'],
        marginTop: 1,
    },
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
        backgroundColor: COLORS.black,
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
        borderLeftColor: COLORS.gold,
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
        color: COLORS.gold,
        lineHeight: 44,
    },
    heroAmountNum: {
        fontSize: 40,
        fontWeight: '900',
        color: COLORS.white,
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
        color: COLORS.white,
    },

    // INFO CARD
    infoCard: {
        backgroundColor: COLORS.white,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
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
        backgroundColor: COLORS.cream,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoRowLabel: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        color: COLORS.textMuted,
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
        color: COLORS.textPrimary,
        textAlign: 'right',
        flexShrink: 1,
    },
    infoRowValueMono: {
        fontSize: 10.5,
        fontWeight: '500',
        color: COLORS.textPrimary,
        textAlign: 'right',
        flexShrink: 1,
        fontVariant: ['tabular-nums'],
    },
    copyBtn: {
        width: 26,
        height: 26,
        borderRadius: 8,
        backgroundColor: COLORS.cream,
        borderWidth: 1,
        borderColor: COLORS.borderGold,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // SECTION LABEL
    sectionLabel: {
        fontSize: 9.5,
        fontWeight: '800',
        letterSpacing: 1.6,
        textTransform: 'uppercase',
        color: COLORS.textMuted,
        marginTop: 4,
        marginBottom: -4,
        paddingHorizontal: 2,
    },

    // BALANCE FLOW
    balanceFlow: {
        backgroundColor: COLORS.cream2,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.borderGold,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
    },
    bfLabel: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1.2,
        textTransform: 'uppercase',
        color: COLORS.textMuted,
        marginBottom: 4,
    },
    bfValue: {
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: -0.3,
        color: COLORS.black,
    },
    bfSub: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.textMuted,
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
        backgroundColor: COLORS.borderGold,
        alignItems: 'center',
        justifyContent: 'center',
    },
    bfDelta: {
        fontSize: 10,
        fontWeight: '900',
        color: COLORS.success,
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
        backgroundColor: COLORS.white,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
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
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    finTileLabel: {
        fontSize: 9.5,
        fontWeight: '800',
        letterSpacing: 1,
        textTransform: 'uppercase',
        color: COLORS.textMuted,
    },
    finTileValue: {
        fontSize: 18,
        fontWeight: '900',
        letterSpacing: -0.3,
        color: COLORS.textPrimary,
    },
    finTileSub: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.textMuted,
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
    actionBtnPrimary: { backgroundColor: COLORS.black },
    actionBtnPrimaryText: { fontSize: 11.5, fontWeight: '800', color: COLORS.white },
    actionBtnSecondary: {
        backgroundColor: COLORS.cream,
        borderWidth: 1,
        borderColor: COLORS.borderGold,
    },
    actionBtnSecondaryText: { fontSize: 11.5, fontWeight: '800', color: COLORS.black },

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
        color: COLORS.textMuted,
    },
});