import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Platform,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../../../constants/Colors';
import Fonts from '../../../constants/Fonts';
import HeaderBar from '../../../componets/HeaderBar/HeaderBar';
import { requestAepsPayoutBank, getXpressPayoutBanks, getWalletBalance, deleteXpressPayoutBank } from '../../../api/AuthApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlertService } from '../../../componets/Alerts/CustomAlert';
import { ActivityIndicator, RefreshControl } from 'react-native';
import FullScreenLoader from '../../../componets/Loader/FullScreenLoader';

const { width: SW, height: SH } = Dimensions.get("window");
const scale = (n) => (SW / 375) * n;
const rs = (n) => Math.round(scale(n));

export default function Xpress_Payout({ navigation }) {
  const [approvedBanks, setApprovedBanks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [walletBalance, setWalletBalance] = useState('0.00');

  useEffect(() => {
    loadAllData(true);
  }, []);

  const loadAllData = async (isInitial = false) => {
    if (isInitial) setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const headerToken = await AsyncStorage.getItem('header_token');

      const [bankRes, balanceRes] = await Promise.all([
        getXpressPayoutBanks({ headerToken }),
        getWalletBalance({ headerToken })
      ]);

      if (bankRes?.success) setApprovedBanks(bankRes.data || []);
      if (balanceRes?.success && balanceRes?.data) {
        setWalletBalance(balanceRes.data.aepsWallet || '0.00');
      }
    } catch (e) {
      console.log('Error loading payout data:', e);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleDeleteBank = async (bankId) => {
    setIsLoading(true);
    try {
      const headerToken = await AsyncStorage.getItem('header_token');
      const res = await deleteXpressPayoutBank({ bankId, headerToken });

      if (res?.success) {
        AlertService.showAlert({
          type: 'success',
          title: 'Success',
          message: res.message || 'Beneficiary removed successfully'
        });
        loadAllData(); // Refresh list
      } else {
        AlertService.showAlert({
          type: 'error',
          title: 'Error',
          message: res.message || 'Failed to remove beneficiary'
        });
      }
    } catch (e) {
      console.log('Delete Bank Error:', e);
      AlertService.showAlert({ type: 'error', title: 'Error', message: 'Something went wrong while deleting bank' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <HeaderBar
        title="Xpress Payout"
        onBack={() => navigation.goBack()}
      />

      <View style={styles.container}>
        <DashboardContent
          onTransfer={() => navigation.navigate("XpressTransfer", { banks: approvedBanks })}
          onAddBank={() => navigation.navigate("AddXpressPayoutBank")}
          onHistory={() => navigation.navigate("XpressPayoutReport")}
          banks={approvedBanks}
          loading={isRefreshing}
          balance={walletBalance}
          onRefresh={() => loadAllData(false)}
          onDeleteBank={handleDeleteBank}
        />
      </View>
      <FullScreenLoader visible={isLoading} label="Loading Payout Hub..." />
    </SafeAreaView>
  );
}

function DashboardContent({ onTransfer, onAddBank, onHistory, banks, loading, onRefresh, balance, onDeleteBank }) {
  const displayBanks = banks;
  const [main, decimal] = (balance?.toString() || '0.00').split('.');

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={onRefresh} colors={[Colors.primary]} />
      }
    >
      {/* ── Balance Card ── */}
      <View style={styles.balanceCard}>
        <View style={styles.bcTop}>
          <View>
            <Text style={styles.bcLabel}>XPRESS BALANCE</Text>
            <Text style={styles.bcAmount}>₹{Number(main).toLocaleString('en-IN')}<Text style={styles.bcDecimal}>.{decimal || '00'}</Text></Text>
          </View>
          <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} disabled={loading}>
            <ActivityIndicator size="small" color={Colors.whiteOpacity_60} animating={loading} style={{ position: 'absolute' }} />
            {!loading && <Icon name="refresh" size={rs(20)} color={Colors.whiteOpacity_60} />}
          </TouchableOpacity>
        </View>

        <View style={styles.bcDivider} />

        <View style={styles.bcStats}>
          <View style={styles.bcStatItem}>
            <Text style={styles.bcStatLabel}>Limit</Text>
            <Text style={styles.bcStatValue}>₹5.0 L</Text>
          </View>
          <View style={styles.bcStatDivider} />
          <View style={styles.bcStatItem}>
            <Text style={styles.bcStatLabel}>Used</Text>
            <Text style={styles.bcStatValue}>₹0.00</Text>
          </View>
          <View style={styles.bcStatDivider} />
          <TouchableOpacity style={styles.topupBtn} onPress={onTransfer}>
            <Text style={styles.topupText}>TRANSFER</Text>
            <Icon name="arrow-right-circle" size={rs(16)} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Management Row ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Management</Text>
      </View>

      <View style={styles.managementCard}>
        <View style={styles.manageGrid}>
          <FeatureCard icon="account-plus" label="Add Bank" color="#10B981" onPress={onAddBank} />
          <FeatureCard icon="history" label="Txn History" color="#6366F1" onPress={onHistory} />
          <FeatureCard icon="shield-check" label="Verification" color="#F59E0B" />
          <FeatureCard icon="bank-transfer" label="Bulk Payout" color="#E11D48" />
        </View>
      </View>

      {/* ── Beneficiaries ── */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Fast Access</Text>
        <TouchableOpacity><Text style={styles.viewMore}>View All</Text></TouchableOpacity>
      </View>

      {displayBanks.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="bank-off-outline" size={rs(40)} color={Colors.border} />
          <Text style={styles.emptyText}>No beneficiaries found</Text>
        </View>
      ) : displayBanks.slice(0, 5).map(bene => (
        <TouchableOpacity key={bene._id} style={styles.beneCard} activeOpacity={0.7}>
          <View style={[styles.beneIcon, { backgroundColor: (bene.color || Colors.accent) + '15' }]}>
            <Text style={{ color: bene.color || Colors.accent, fontWeight: '800', fontSize: rs(14) }}>
              {(bene.accountHolderName || 'U')[0]}
            </Text>
          </View>
          <View style={styles.beneInfo}>
            <Text style={styles.beneName}>{bene?.accountHolderName}</Text>
            <Text style={styles.beneDetail}>{bene?.bankName} • {bene?.accountNumber}</Text>
          </View>
          <View style={styles.beneRightRow}>

            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => AlertService.showAlert({
                type: 'warning',
                title: 'Confirm Delete',
                message: `Are you sure you want to remove ${bene.accountHolderName}?`,
                onConfirm: () => onDeleteBank(bene._id)
              })}
            >
              <Icon name="delete-outline" size={rs(18)} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      ))}

      <View style={{ height: rs(100) }} />
    </ScrollView>
  );
}

const FeatureCard = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={styles.fCard} activeOpacity={0.7} onPress={onPress}>
    <View style={[styles.fIconBox, { backgroundColor: color + '12' }]}>
      <Icon name={icon} size={rs(22)} color={color} />
    </View>
    <Text style={styles.fLabel}>{label}</Text>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: rs(16), paddingTop: rs(16) },
  balanceCard: {
    backgroundColor: Colors.primary,
    borderRadius: rs(24),
    padding: rs(24),
    marginBottom: rs(24),
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.2, shadowRadius: 12 },
      android: { elevation: 8 },
    }),
  },
  bcTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  bcLabel: { fontSize: rs(11), fontFamily: Fonts.Bold, color: Colors.whiteOpacity_60, letterSpacing: 1.5 },
  bcAmount: { fontSize: rs(28), fontFamily: Fonts.Bold, color: Colors.white, marginTop: rs(4) },
  bcDecimal: { fontSize: rs(16), color: Colors.whiteOpacity_45 },
  refreshBtn: { padding: rs(8), backgroundColor: Colors.whiteOpacity_10, borderRadius: rs(12) },
  bcDivider: { height: 1, backgroundColor: Colors.whiteOpacity_10, marginVertical: rs(20) },
  bcStats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bcStatItem: { flex: 1 },
  bcStatLabel: { fontSize: rs(10), fontFamily: Fonts.Medium, color: Colors.whiteOpacity_45 },
  bcStatValue: { fontSize: rs(14), fontFamily: Fonts.Bold, color: Colors.white, marginTop: rs(2) },
  bcStatDivider: { width: 1, height: rs(24), backgroundColor: Colors.whiteOpacity_10, marginHorizontal: rs(10) },
  topupBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.gold, paddingVertical: rs(8), paddingHorizontal: rs(12), borderRadius: rs(12), gap: rs(6) },
  topupText: { fontSize: rs(11), fontFamily: Fonts.Bold, color: Colors.primary },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(16) },
  sectionTitle: { fontSize: rs(16), fontFamily: Fonts.Bold, color: Colors.text_primary },
  viewMore: { fontSize: rs(13), color: Colors.text_secondary, fontFamily: Fonts.Medium },
  managementCard: {
    backgroundColor: Colors.white,
    borderRadius: rs(20),
    paddingVertical: rs(16),
    paddingHorizontal: rs(10),
    marginBottom: rs(28),
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 8 },
      android: { elevation: 3 },
    }),
  },
  manageGrid: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fCard: { flex: 1, alignItems: 'center', gap: rs(6) },
  fIconBox: { width: rs(48), height: rs(48), borderRadius: rs(14), alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(0,0,0,0.02)' },
  fLabel: { fontSize: rs(9), fontFamily: Fonts.Bold, color: Colors.text_secondary, textAlign: 'center', letterSpacing: 0.2 },
  beneCard: { backgroundColor: Colors.white, borderRadius: rs(20), padding: rs(12), flexDirection: 'row', alignItems: 'center', marginBottom: rs(12), borderWidth: 1, borderColor: Colors.border },
  beneIcon: { width: rs(44), height: rs(44), borderRadius: rs(15), alignItems: 'center', justifyContent: 'center' },
  beneInfo: { flex: 1, paddingHorizontal: rs(12) },
  beneName: { fontSize: rs(14), fontFamily: Fonts.Bold, color: Colors.text_primary },
  beneDetail: { fontSize: rs(11), fontFamily: Fonts.Medium, color: Colors.text_secondary, marginTop: rs(2) },
  statusBadge: { paddingHorizontal: rs(10), paddingVertical: rs(6), borderRadius: rs(10) },
  statusText: { fontSize: rs(10), fontFamily: Fonts.Bold },
  beneRightRow: { flexDirection: 'row', alignItems: 'center' },
  deleteBtn: { width: rs(32), height: rs(32), borderRadius: rs(8), alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: rs(40), backgroundColor: Colors.white, borderRadius: rs(20), borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', marginBottom: rs(20) },
  emptyText: { fontSize: rs(14), fontFamily: Fonts.Medium, color: Colors.text_secondary, marginTop: rs(10) },
});
