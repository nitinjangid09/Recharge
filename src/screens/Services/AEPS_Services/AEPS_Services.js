import React from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../../../constants/Colors";
import Fonts from "../../../constants/Fonts";
import * as NavigationService from "../../../utils/NavigationService";

const { width: SW } = Dimensions.get("window");
const S = SW / 375;

const AEPS_Services = () => {
    const TxnRow = ({ name, date, amount, type }) => (
        <View style={styles.txnRow}>
            <View style={[styles.txnIcon, { backgroundColor: type === 'cr' ? '#22C55E15' : type === 'dr' ? '#EF444415' : '#64748B15' }]}>
                <Icon
                    name={type === 'cr' ? 'arrow-down-left' : type === 'dr' ? 'arrow-up-right' : 'magnify'}
                    size={18}
                    color={type === 'cr' ? '#22C55E' : type === 'dr' ? '#EF4444' : '#64748B'}
                />
            </View>
            <View style={{ flex: 1 }}>
                <Text style={styles.txnName}>{name}</Text>
                <Text style={styles.txnDate}>{date}</Text>
            </View>
            <Text style={[styles.txnAmt, { color: type === 'cr' ? '#22C55E' : type === 'dr' ? '#EF4444' : '#64748B' }]}>{amount}</Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={["top"]}>
            <StatusBar barStyle="light-content" backgroundColor="#1A1A2E" />
            <View style={styles.hubHeader}>
                <View style={styles.hubTop}>
                    <TouchableOpacity onPress={() => NavigationService.goBack()} style={styles.glassBtn}>
                        <Icon name="chevron-left" size={24} color={Colors.white} />
                    </TouchableOpacity>
                    <View style={{ alignItems: 'center', flex: 1 }}>
                        <Text style={styles.hubGreeting}>AEPS Dashboard</Text>
                        <Text style={styles.hubUser}>Merchant Agent</Text>
                    </View>
                    <TouchableOpacity style={styles.glassBtn}>
                        <Icon name="bell-outline" size={22} color={Colors.white} />
                    </TouchableOpacity>
                </View>

                <View style={styles.balCard}>
                    <View>
                        <Text style={styles.balLabel}>WALLET BALANCE</Text>
                        <Text style={styles.balAmt}>₹42,850.25</Text>
                    </View>
                    <View style={styles.balIcon}>
                        <Icon name="wallet-outline" size={24} color={Colors.finance_accent} />
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>SERVICES HUD</Text>
                </View>

                <View style={styles.serviceRow}>
                    {[
                        { name: "Withdraw", icon: "cash-plus", color: "#6366F1" },
                        { name: "Enquiry", icon: "bank-outline", color: "#F59E0B" },
                        { name: "Statement", icon: "file-document-outline", color: "#10B981" },
                        { name: "Aadhaar Pay", icon: "fingerprint", color: "#EF4444" },
                    ].map((item, idx) => (
                        <TouchableOpacity key={idx} style={styles.serviceItem} activeOpacity={0.7}>
                            <View style={[styles.sIconBox, { backgroundColor: item.color + "15" }]}>
                                <Icon name={item.icon} size={24} color={item.color} />
                            </View>
                            <Text style={styles.sLabel}>{item.name}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionLabel}>RECENT ACTIVITY</Text>
                </View>

                <View style={styles.card}>
                    <TxnRow name="Cash Withdrawal" date="Apr 10, 2:30 PM" amount="-₹500.00" type="dr" />
                    <TxnRow name="Wallet Topup" date="Apr 09, 11:15 AM" amount="+₹2,000.00" type="cr" />
                    <TxnRow name="Balance Enquiry" date="Apr 09, 10:05 AM" amount="₹0.00" type="enq" />
                </View>
                
                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: Colors.bg },
    scrollContent: { padding: 20 * S },
    hubHeader: { backgroundColor: "#1A1A2E", padding: 20, paddingBottom: 30, borderBottomLeftRadius: 40, borderBottomRightRadius: 40 },
    hubTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 25 },
    hubGreeting: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: Fonts.Medium },
    hubUser: { color: Colors.white, fontSize: 16, fontFamily: Fonts.Bold, marginTop: 2 },
    balCard: { backgroundColor: "rgba(212,168,67,0.15)", borderRadius: 24, padding: 22, flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "rgba(212,168,67,0.2)" },
    balLabel: { color: "rgba(255,255,255,0.5)", fontSize: 10, fontFamily: Fonts.Bold, letterSpacing: 1 },
    balAmt: { color: Colors.white, fontSize: 26 * S, fontFamily: Fonts.Bold, marginTop: 5 },
    balIcon: { width: 50, height: 50, borderRadius: 16, backgroundColor: "rgba(184,148,77,0.2)", alignItems: "center", justifyContent: "center" },
    glassBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
    sectionHeader: { marginTop: 25, marginBottom: 15 },
    sectionLabel: { fontSize: 11, fontFamily: Fonts.Bold, color: Colors.slate_500, letterSpacing: 1.5 },
    serviceRow: { flexDirection: "row", flexWrap: "wrap", gap: 12, justifyContent: 'space-between' },
    serviceItem: { width: (SW - 64) / 4, alignItems: "center", gap: 8 },
    sIconBox: { width: 60 * S, height: 60 * S, borderRadius: 20, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(0,0,0,0.04)" },
    sLabel: { fontSize: 10, fontFamily: Fonts.Bold, color: Colors.slate_700, textAlign: "center" },
    card: { backgroundColor: Colors.white, borderRadius: 24, padding: 10, elevation: 4, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 15 },
    txnRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 10, paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: "#F1F5F9" },
    txnIcon: { width: 42, height: 42, borderRadius: 14, alignItems: "center", justifyContent: "center" },
    txnName: { fontSize: 14, fontFamily: Fonts.Bold, color: Colors.slate_900 },
    txnDate: { fontSize: 11, color: Colors.slate_400, marginTop: 2 },
    txnAmt: { fontSize: 15, fontFamily: Fonts.Bold },
});

export default AEPS_Services;