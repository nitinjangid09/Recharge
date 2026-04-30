import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    StatusBar,
    ActivityIndicator,
    RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../../../constants/Colors";
import Fonts from "../../../constants/Fonts";
import * as NavigationService from "../../../utils/NavigationService";
import { getWalletBalance, fetchUserProfile, getWalletReport } from "../../../api/AuthApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import FullScreenLoader from "../../../componets/Loader/FullScreenLoader";

import CashWithdrawIcon from "../../../assets/AEPSIcon/Cash Withdraw.svg";
import BalanceEnquiryIcon from "../../../assets/AEPSIcon/Balance Enquiry.svg";
import MiniStatementIcon from "../../../assets/AEPSIcon/Mini Statement.svg";
import aepsIcon from "../../../assets/ServicesIcons/AEPS.svg";

const { width: SW } = Dimensions.get("window");
const S = SW / 375;

const AEPS_Services = () => {
    const [aepsBalance, setAepsBalance] = React.useState("0.00");
    const [stats, setStats] = React.useState({ volume: "0.00", transactions: "0" });
    const [user, setUser] = React.useState({ name: "Loading...", mid: "---" });
    const [recentTxns, setRecentTxns] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [refreshing, setRefreshing] = React.useState(false);

    React.useEffect(() => {
        loadDashboard(true);
    }, []);

    const onRefresh = () => {
        loadDashboard(false);
    };

    const loadDashboard = async (isInitial = false) => {
        if (isInitial) setLoading(true);
        else setRefreshing(true);
        try {
            const headerToken = await AsyncStorage.getItem("header_token");

            const [balRes, profRes, reportRes] = await Promise.all([
                getWalletBalance({ headerToken }),
                fetchUserProfile({ headerToken }),
                getWalletReport({
                    from: new Date().toISOString().split('T')[0],
                    to: new Date().toISOString().split('T')[0],
                    headerToken
                })
            ]);

            if (balRes?.success) {
                setAepsBalance(String(balRes.data?.aepsWallet || "0.00"));
                setStats({
                    volume: String(balRes.data?.todayAepsVolume || "0.00"),
                    transactions: String(balRes.data?.todayAepsCount || "0")
                });
            }

            if (profRes?.success) {
                const d = profRes.data;
                setUser({
                    name: `${d.firstName || ""} ${d.lastName || ""}`.trim() || d.userName,
                    mid: d.merchantId || d._id?.slice(-8)?.toUpperCase() || "MID-XXXXX"
                });
            }

            if (reportRes?.success && reportRes.data) {
                setRecentTxns(reportRes.data.slice(0, 3).map(t => ({
                    id: t._id,
                    type: t.remark || "AEPS Transaction",
                    date: new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    details: t.transactionId?.slice(-8),
                    amount: `${t.type === 'credit' ? '+' : '-'}₹${t.amount}`,
                    status: t.type === 'credit' ? 'success' : 'neutral'
                })));
            }
        } catch (error) {
            console.log("Dashboard fetch error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const ServiceCard = ({ title, sub, Svg, onPress }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={onPress}
        >
            <View style={styles.iconBox}>
                <Svg width={22 * S} height={22 * S} />
            </View>
            <View style={{ marginTop: 10 }}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardSub}>{sub}</Text>
            </View>

        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />


            {/* ── Header ── */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.headerTitle}>AEPS Services</Text>
                    <Text style={styles.headerSub}>Choose a transaction type</Text>
                </View>
                <TouchableOpacity style={styles.profileBtn}>
                    <Icon name="account" size={20 * S} color={Colors.white} />
                    <View style={styles.badge}><Text style={styles.badgeText}>2</Text></View>
                </TouchableOpacity>
            </View>

            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scroll}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        colors={[Colors.primary]}
                        tintColor={Colors.primary}
                    />
                }
            >

                {/* ── Compact Wallet Card ── */}
                <View style={styles.mainCard}>
                    <View style={styles.walletTop}>
                        <View>
                            <Text style={styles.walletLabel}>WALLET BALANCE</Text>
                            <View style={styles.balanceRow}>
                                <Text style={styles.currency}>₹</Text>
                                <Text style={styles.balanceText}>
                                    {parseFloat(aepsBalance).toLocaleString('en-IN')}
                                </Text>
                            </View>
                        </View>
                    </View>

                    <View style={styles.statsRow}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.statAmount}>
                                ₹{parseFloat(stats.volume).toLocaleString('en-IN')}
                            </Text>
                            <Text style={styles.statLabel}>Today's Volume</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={{ flex: 1, paddingLeft: 16 }}>
                            <Text style={styles.statAmount}>{stats.transactions}</Text>
                            <Text style={styles.statLabel}>Transactions</Text>
                        </View>
                    </View>
                </View>

                {/* ── Agent Card ── */}
                <View style={styles.agentCard}>
                    <View style={styles.agentIconBox}>
                        <Icon name="credit-card-outline" size={18 * S} color="#D4A843" />
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.agentName}>{user.name} · BC Agent</Text>
                        <Text style={styles.merchantID}>MID: {user.mid}</Text>
                    </View>
                    <View style={styles.statusBadge}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>Active</Text>
                    </View>
                </View>

                {/* ── Quick Services ── */}
                <Text style={styles.sectionLabel}>QUICK SERVICES</Text>
                <View style={styles.grid}>
                    <View style={styles.gridRow}>
                        <ServiceCard
                            title="Cash Withdrawal"
                            sub="Instant biometric"
                            Svg={CashWithdrawIcon}
                            onPress={() => NavigationService.navigate("CashWithdraw")}
                        />
                        <ServiceCard
                            title="Balance Enquiry"
                            sub="Check account"
                            Svg={BalanceEnquiryIcon}
                            onPress={() => NavigationService.navigate("BalanceEnquiry")}
                        />
                    </View>
                    <View style={styles.gridRow}>
                        <ServiceCard
                            title="Mini Statement"
                            sub="Last 5 txns"
                            Svg={MiniStatementIcon}
                            onPress={() => NavigationService.navigate("MiniStatement")}
                        />
                        <ServiceCard
                            title="Payout Hub"
                            sub="AEPS Payout"
                            Svg={aepsIcon}
                            onPress={() => NavigationService.navigate("AEPSPayOut")}
                        />
                    </View>
                </View>

                {/* ── Recent Activity ── */}
                <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
                {recentTxns.length > 0 ? recentTxns.map(txn => (
                    <View key={txn.id} style={styles.txnItem}>
                        <View style={[styles.txnIconBox, { backgroundColor: txn.status === 'success' ? '#EBFDF5' : '#FFF9EE' }]}>
                            <Icon
                                name={txn.status === 'success' ? "arrow-right" : "history"}
                                size={16 * S}
                                color={txn.status === 'success' ? '#10B981' : '#D4A843'}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.txnTitle}>{txn.type}</Text>
                            <Text style={styles.txnSub}>{txn.date} · {txn.details}</Text>
                        </View>
                        <Text style={[styles.txnAmount, { color: txn.status === 'success' ? '#10B981' : '#1A1A1A' }]}>
                            {txn.amount}
                        </Text>
                    </View>
                )) : (
                    <View style={styles.agentCard}>
                        {loading ? (
                            <ActivityIndicator size="small" color={Colors.primary} style={{ width: '100%' }} />
                        ) : (
                            <Text style={[styles.merchantID, { textAlign: 'center', width: '100%' }]}>
                                No recent activity found
                            </Text>
                        )}
                    </View>
                )}

                <View style={{ height: 30 }} />
            </ScrollView>
            <FullScreenLoader visible={loading} label="Updating Dashboard..." />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#EBE3CC" },
    scroll: { paddingHorizontal: 16 * S, paddingBottom: 16 * S },

    // ── Header ──────────────────────────────────────────────
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16 * S,
        paddingVertical: 12 * S,
        marginTop: 4,
    },
    headerTitle: { fontSize: 20 * S, fontFamily: Fonts.Bold, color: "#1A1A1A" },
    headerSub: { fontSize: 12 * S, fontFamily: Fonts.Medium, color: "#717171", marginTop: 1 },
    profileBtn: {
        width: 38 * S, height: 38 * S,
        backgroundColor: "#000", borderRadius: 12,
        alignItems: "center", justifyContent: "center",
    },
    badge: {
        position: "absolute", top: -4, right: -4,
        backgroundColor: "#EF4444", borderRadius: 10,
        width: 16 * S, height: 16 * S,
        alignItems: "center", justifyContent: "center",
        borderWidth: 2, borderColor: "#EBE3CC",
    },
    badgeText: { color: "#FFF", fontSize: 9, fontFamily: Fonts.Bold },

    // ── Compact Wallet Card ─────────────────────────────────
    mainCard: {
        backgroundColor: "#000",
        borderRadius: 24 * S,
        paddingHorizontal: 20 * S,
        paddingTop: 16 * S,
        paddingBottom: 14 * S,
        marginBottom: 14 * S,    },
    walletTop: { marginBottom: 12 * S },
    walletLabel: {
        color: "rgba(255,255,255,0.4)",
        fontSize: 9,
        fontFamily: Fonts.Bold,
        letterSpacing: 1.5,
    },
    balanceRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 4 },
    currency: { color: Colors.white, fontSize: 16 * S, fontFamily: Fonts.Bold, marginTop: 3, marginRight: 3 },
    balanceText: { color: Colors.white, fontSize: 28 * S, fontFamily: Fonts.Bold },

    statsRow: {
        flexDirection: "row",
        alignItems: "center",
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.1)",
    },
    statAmount: { color: Colors.white, fontSize: 20 * S, fontFamily: Fonts.Bold },
    statLabel: { color: "rgba(255,255,255,0.4)", fontSize: 9, fontFamily: Fonts.Medium, marginTop: 2 },
    divider: { width: 1, height: 26, backgroundColor: "rgba(255,255,255,0.1)" },

    // ── Agent Card ──────────────────────────────────────────
    agentCard: {
        backgroundColor: Colors.white,
        borderRadius: 20 * S,
        padding: 14 * S,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20 * S,    },
    agentIconBox: {
        width: 38 * S, height: 38 * S,
        borderRadius: 10, backgroundColor: "#FFF9EE",
        alignItems: "center", justifyContent: "center",
        marginRight: 10 * S,
    },
    agentName: { fontSize: 13 * S, fontFamily: Fonts.Bold, color: "#1A1A1A" },
    merchantID: { fontSize: 10 * S, fontFamily: Fonts.Medium, color: "#9E9E9E", marginTop: 2 },
    statusBadge: {
        backgroundColor: "#EBFDF5",
        paddingHorizontal: 8, paddingVertical: 5,
        borderRadius: 12, flexDirection: "row", alignItems: "center",
    },
    statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#10B981", marginRight: 5 },
    statusText: { fontSize: 10 * S, fontFamily: Fonts.Bold, color: "#10B981" },

    // ── Section Label ───────────────────────────────────────
    sectionLabel: {
        fontSize: 10 * S,
        fontFamily: Fonts.Bold,
        color: "#D4A843",
        letterSpacing: 1.5,
        marginBottom: 10 * S,
        textTransform: "uppercase",
    },

    // ── Service Grid ────────────────────────────────────────
    grid: { gap: 10 * S, marginBottom: 20 * S },
    gridRow: { flexDirection: "row", gap: 10 * S },
    card: {
        flex: 1,
        backgroundColor: Colors.white,
        borderRadius: 20 * S,
        padding: 14 * S,
        justifyContent: "space-between",
        minHeight: 88 * S,
    },
    iconBox: {
        width: 50 * S, height: 50 * S,
        borderRadius: 10,
        alignItems: "center", justifyContent: "center",
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    cardTitle: { fontSize: 12 * S, fontFamily: Fonts.Bold, color: Colors.black, lineHeight: 17 },
    cardSub: { fontSize: 10 * S, fontFamily: Fonts.Medium, color: Colors.black, marginTop: 2, opacity: 0.5 },


    // ── Transaction Items ───────────────────────────────────
    txnItem: {
        backgroundColor: Colors.white,
        borderRadius: 16 * S,
        padding: 12 * S,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8 * S,
    },
    txnIconBox: {
        width: 36 * S, height: 36 * S,
        borderRadius: 10,
        alignItems: "center", justifyContent: "center",
        marginRight: 10 * S,
    },
    txnTitle: { fontSize: 13 * S, fontFamily: Fonts.Bold, color: "#1A1A1A" },
    txnSub: { fontSize: 10 * S, fontFamily: Fonts.Medium, color: "#9E9E9E", marginTop: 2 },
    txnAmount: { fontSize: 13 * S, fontFamily: Fonts.Bold },
});

export default AEPS_Services;