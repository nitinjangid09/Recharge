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
import { getWalletBalance, fetchUserProfile, getWalletReport, getAepsStats, getAeps1History } from "../../../api/AuthApi";
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
    const [reportStats, setReportStats] = React.useState(null);
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
            if (!headerToken) {
                console.log("[AEPS] No headerToken found");
                return;
            }

            const [balRes, profRes, statsRes, histRes] = await Promise.all([
                getWalletBalance({ headerToken }),
                fetchUserProfile({ headerToken }),
                getAepsStats({ headerToken }),
                getAeps1History({ headerToken })
            ]);

            console.log("[AEPS] Bal:", balRes?.success ? "OK" : "Err");
            console.log("[AEPS] Stats:", statsRes?.success ? "OK" : "Err");
            console.log("[AEPS] Hist:", histRes?.success ? "OK" : "Err");

            if (balRes?.success) {
                setAepsBalance(String(balRes.data?.aepsWallet || balRes.data?.balance || "0.00"));
            }

            if (profRes?.success) {
                const d = profRes.data;
                setUser({
                    name: `${d.firstName || ""} ${d.lastName || ""}`.trim() || d.userName,
                    mid: d.merchantId || d._id?.slice(-8)?.toUpperCase() || "MID-XXXXX"
                });
            }

            if (histRes?.success && Array.isArray(histRes.data)) {
                setRecentTxns(histRes.data.slice(0, 8).map(t => ({
                    id: t._id,
                    type: t.serviceType || "AEPS Transaction",
                    date: new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    details: t.referenceId?.slice(-10) || "---",
                    amount: t.amount > 0 ? `₹${t.amount}` : (t.accountBalance > 0 ? `Bal: ₹${t.accountBalance}` : null),
                    status: (t.status || 'FAILED').toLowerCase()
                })));
            }

            if (statsRes?.success && statsRes.data) {
                setReportStats(statsRes.data);
            }
        } catch (error) {
            console.log("Dashboard fetch error:", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const ServiceCard = ({ title, Svg, onPress }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.8}
            onPress={onPress}
        >
            <View style={styles.iconBox}>
                <Svg width={20 * S} height={20 * S} />
            </View>
            <Text style={styles.cardTitle} numberOfLines={2}>{title}</Text>
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

                    {/* Detailed Report Stats inside the same card */}
                    {reportStats && (
                        <View style={styles.innerStatsGrid}>
                            <View style={styles.innerStatBox}>
                                <Text style={styles.innerStatVal}>{reportStats.total?.count || 0}</Text>
                                <Text style={styles.innerStatLbl}>TOTAL</Text>
                            </View>
                            <View style={styles.innerStatBox}>
                                <Text style={[styles.innerStatVal, { color: Colors.green }]}>{reportStats.success?.count || 0}</Text>
                                <Text style={styles.innerStatLbl}>SUCCESS</Text>
                            </View>
                            <View style={styles.innerStatBox}>
                                <Text style={[styles.innerStatVal, { color: Colors.gold }]}>{reportStats.pending?.count || 0}</Text>
                                <Text style={styles.innerStatLbl}>PENDING</Text>
                            </View>
                            <View style={styles.innerStatBox}>
                                <Text style={[styles.innerStatVal, { color: Colors.red }]}>{reportStats.failed?.count || 0}</Text>
                                <Text style={styles.innerStatLbl}>FAILED</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* ── Agent Card ── */}
                <View style={styles.agentCard}>
                    <View style={styles.agentIconBox}>
                        <Icon name="credit-card-outline" size={18 * S} color="rgb(212, 168, 67)" />
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
                            Svg={CashWithdrawIcon}
                            onPress={() => NavigationService.navigate("CashWithdraw")}
                        />
                        <ServiceCard
                            title="Balance Enquiry"
                            Svg={BalanceEnquiryIcon}
                            onPress={() => NavigationService.navigate("BalanceEnquiry")}
                        />
                        <ServiceCard
                            title="Mini Statement"
                            Svg={MiniStatementIcon}
                            onPress={() => NavigationService.navigate("MiniStatement")}
                        />
                    </View>
                </View>

                {/* ── Recent Activity ── */}
                <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
                {recentTxns.length > 0 ? recentTxns.map(txn => (
                    <View key={txn.id} style={styles.txnItem}>
                        <View style={[styles.txnIconBox, {
                            backgroundColor: txn.status === 'success' ? 'rgb(235, 253, 245)' : (txn.status === 'pending' ? 'rgb(255, 249, 238)' : 'rgb(254, 242, 242)')
                        }]}>
                            <Icon
                                name={txn.status === 'success' ? "check-circle-outline" : (txn.status === 'pending' ? "clock-outline" : "close-circle-outline")}
                                size={16 * S}
                                color={txn.status === 'success' ? 'rgb(16, 185, 129)' : (txn.status === 'pending' ? 'rgb(212, 168, 67)' : 'rgb(239, 68, 68)')}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.txnTitle}>{txn.type}</Text>
                            <Text style={styles.txnSub}>{txn.date} · {txn.details}</Text>
                        </View>
                        <Text style={[styles.txnAmount, {
                            color: txn.status === 'success' ? 'rgb(16, 185, 129)' : (txn.status === 'pending' ? 'rgb(212, 168, 67)' : 'rgb(239, 68, 68)')
                        }]}>
                            {txn.amount || (txn.status === 'success' ? 'Completed' : 'Failed')}
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
    container: { flex: 1, backgroundColor: Colors.beige },
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
    headerTitle: { fontSize: 20 * S, fontFamily: Fonts.Bold, color: Colors.black },
    headerSub: { fontSize: 12 * S, fontFamily: Fonts.Medium, color: Colors.text_secondary, marginTop: 1 },
    profileBtn: {
        width: 38 * S, height: 38 * S,
        backgroundColor: Colors.primary, borderRadius: 12,
        alignItems: "center", justifyContent: "center",
    },
    badge: {
        position: "absolute", top: -4, right: -4,
        backgroundColor: Colors.red, borderRadius: 10,
        width: 16 * S, height: 16 * S,
        alignItems: "center", justifyContent: "center",
        borderWidth: 2, borderColor: Colors.beige,
    },
    badgeText: { color: "rgb(255, 255, 255)", fontSize: 9, fontFamily: Fonts.Bold },

    // ── Compact Wallet Card ─────────────────────────────────
    mainCard: {
        backgroundColor: Colors.primary,
        borderRadius: 24 * S,
        paddingHorizontal: 20 * S,
        paddingTop: 16 * S,
        paddingBottom: 14 * S,
        marginBottom: 14 * S,
    },
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

    // ── Agent Card ──────────────────────────────────────────
    agentCard: {
        backgroundColor: Colors.white,
        borderRadius: 20 * S,
        padding: 14 * S,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20 * S,
        borderWidth: 1,
        borderColor: "rgba(201, 168, 76, 0.40)",
    },
    innerStatsGrid: {
        flexDirection: 'row',
        marginTop: 14 * S,
        paddingTop: 14 * S,
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.1)",
        justifyContent: 'space-between'
    },
    innerStatBox: {
        alignItems: 'center',
        flex: 1,
    },
    innerStatVal: {
        fontSize: 14 * S,
        fontFamily: Fonts.Bold,
        color: Colors.white,
    },
    innerStatLbl: {
        fontSize: 7 * S,
        fontFamily: Fonts.Bold,
        color: "rgba(255,255,255,0.4)",
        marginTop: 2,
        letterSpacing: 0.5
    },
    agentIconBox: {
        width: 38 * S, height: 38 * S,
        borderRadius: 10, backgroundColor: "rgb(255, 249, 238)",
        alignItems: "center", justifyContent: "center",
        marginRight: 10 * S,
    },
    agentName: { fontSize: 13 * S, fontFamily: Fonts.Bold, color: Colors.hub_dark },
    merchantID: { fontSize: 10 * S, fontFamily: Fonts.Medium, color: Colors.gray, marginTop: 2 },
    statusBadge: {
        backgroundColor: "rgb(235, 253, 245)",
        paddingHorizontal: 8, paddingVertical: 5,
        borderRadius: 12, flexDirection: "row", alignItems: "center",
    },
    statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "rgb(16, 185, 129)", marginRight: 5 },
    statusText: { fontSize: 10 * S, fontFamily: Fonts.Bold, color: "rgb(16, 185, 129)" },

    // ── Section Label ───────────────────────────────────────
    sectionLabel: {
        fontSize: 10 * S,
        fontFamily: Fonts.Bold,
        color: Colors.kyc_accentDark,
        letterSpacing: 1.5,
        marginBottom: 10 * S,
        textTransform: "uppercase",
    },

    // ── Service Grid ────────────────────────────────────────
    grid: { gap: 10 * S, marginBottom: 20 * S },
    gridRow: { flexDirection: "row", gap: 10 * S },
    card: {
        flex: 1,
        alignItems: "center",
        justifyContent: "flex-start",
        backgroundColor: Colors.white,
        borderRadius: 16 * S,
        paddingVertical: 12 * S,
        paddingHorizontal: 4 * S,
        borderWidth: 1,
        borderColor: "rgba(201, 168, 76, 0.40)",
        minHeight: 100 * S,
    },
    iconBox: {
        width: 40 * S, height: 40 * S,
        borderRadius: 12,
        alignItems: "center", justifyContent: "center",
        backgroundColor: 'rgba(201, 168, 76, 0.12)',
        marginBottom: 8 * S,
    },
    cardTitle: { fontSize: 9.5 * S, fontFamily: Fonts.Bold, color: Colors.black, textAlign: 'center', lineHeight: 12 * S },

    // ── Transaction Items ───────────────────────────────────
    txnItem: {
        backgroundColor: Colors.white,
        borderRadius: 16 * S,
        padding: 12 * S,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 8 * S,
        borderWidth: 1,
        borderColor: "rgba(201, 168, 76, 0.40)",
    },
    txnIconBox: {
        width: 36 * S, height: 36 * S,
        borderRadius: 10,
        alignItems: "center", justifyContent: "center",
        marginRight: 10 * S,
    },
    txnTitle: { fontSize: 13 * S, fontFamily: Fonts.Bold, color: Colors.hub_dark },
    txnSub: { fontSize: 10 * S, fontFamily: Fonts.Medium, color: Colors.gray, marginTop: 2 },
    txnAmount: { fontSize: 13 * S, fontFamily: Fonts.Bold },
});

export default AEPS_Services;
