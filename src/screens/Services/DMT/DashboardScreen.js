import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../../constants/Colors';
import Fonts from '../../../constants/Fonts';
import HeaderBar from '../../../componets/HeaderBar/HeaderBar';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// ─── Responsive  Scaling ──────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get("window");
const scale = (n) => Math.round((SW / 375) * n);
const rs = (n, lo = n * 0.8, hi = n * 1.2) => Math.min(Math.max(scale(n), lo), hi);

// ─── Theme Constants ─────────────────────────────────────────────────────────
const Spacing = { xl: rs(20), lg: rs(16), md: rs(12), sm: rs(8) };
const Radius = { xl: rs(24), lg: rs(16), md: rs(12), sm: rs(8) };
const FontSize = { title: rs(22), lg: rs(18), md: rs(16), base: rs(14), sm: rs(12) };

// ─── UI Components ───────────────────────────────────────────────────────────
const StatCard = ({ label, amount, txnCount, amountColor }) => (
  <View style={{
    flex: 1,
    backgroundColor: Colors.cardbg,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.30)',
  }}>
    <Text style={{ fontSize: rs(10), fontWeight: '700', color: Colors.slate_500, textTransform: 'uppercase', marginBottom: 4 }}>{label}</Text>
    <Text style={{ fontSize: rs(16), fontWeight: '800', color: amountColor || Colors.primary }}>{amount}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
      <Text style={{ fontSize: rs(9), color: Colors.slate_500 }}>TXNS:</Text>
      <Text style={{ fontSize: rs(9), fontWeight: '700', color: Colors.primary, marginLeft: 3 }}>{txnCount}</Text>
    </View>
  </View>
);

const Badge = ({ label, type }) => (
  <View style={{
    backgroundColor: type === 'success' ? 'rgb(220, 252, 231)' : 'rgb(254, 243, 199)',
    paddingHorizontal: rs(8),
    paddingVertical: rs(3),
    borderRadius: Radius.sm,
  }}>
    <Text style={{
      fontSize: rs(9),
      fontWeight: '700',
      color: type === 'success' ? 'rgb(22, 101, 52)' : 'rgb(146, 64, 14)',
      textTransform: 'uppercase'
    }}>
      {label}
    </Text>
  </View>
);

const ActionButton = ({ title, variant, onPress }) => (
  <TouchableOpacity
    activeOpacity={0.7}
    onPress={onPress}
    style={{
      backgroundColor: variant === 'dark' ? Colors.primary : Colors.white,
      paddingHorizontal: rs(10),
      paddingVertical: rs(6),
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: variant === 'dark' ? Colors.primary : 'rgba(245,158,11,0.30)',
    }}
  >
    <Text style={{
      fontSize: rs(10),
      fontWeight: '700',
      color: variant === 'dark' ? Colors.white : Colors.primary
    }}>
      {title}
    </Text>
  </TouchableOpacity>
);

const ExportChip = ({ label, icon }) => (
  <TouchableOpacity style={{
    paddingVertical: rs(7),
    paddingHorizontal: rs(14),
    borderRadius: Radius.xl,
    backgroundColor: Colors.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.30)'
  }}>
    {icon && <Icon name={icon} size={14} color={Colors.primary} />}
    <Text style={{ fontSize: rs(10), fontWeight: '700', color: Colors.primary }}>{label}</Text>
  </TouchableOpacity>
);

const beneficiaries = [
  {
    id: '1',
    bank: 'Axis Bank',
    icon: 'bank',
    name: 'ABHISHEK SHARMA',
    ifsc: 'UTIB0002878',
    account: '9220100...978',
    mobile: '7851819044',
    status: 'verified',
  },
  {
    id: '2',
    bank: 'HDFC Bank',
    icon: 'office-building',
    name: 'ROHIT KUMAR',
    ifsc: 'HDFC0001234',
    account: '4560120...234',
    mobile: '9876543210',
    status: 'pending',
  },
  {
    id: '3',
    bank: 'SBI',
    icon: 'atm',
    name: 'PRIYA SHARMA',
    ifsc: 'SBIN0005678',
    account: '3310240...567',
    mobile: '9812345678',
    status: 'verified',
  },
];

const BeneficiaryRow = ({ item, onTransfer, onView }) => (
  <View style={[styles.tableRow, item.status === 'pending' && { opacity: 0.5 }]}>
    <View style={styles.bankIcon}>
      <Icon name={item.icon} size={18} color={Colors.finance_accent} />
    </View>
    <View style={styles.rowContent}>
      <Text style={styles.rowTitle}>{item.bank}</Text>
      <Text style={styles.rowSub}>{item.name} · {item.ifsc}</Text>
      <Text style={[styles.rowSub, { color: Colors.primary, fontWeight: '600', marginTop: 2 }]}>
        {item.account}
      </Text>
    </View>
    <View style={styles.rowActions}>
      <Badge
        label={item.status === 'verified' ? 'Verified' : 'Pending'}
        type={item.status === 'verified' ? 'success' : 'pending'}
      />
      <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
        <ActionButton title="View" variant="light" onPress={() => onView(item)} />
        <ActionButton
          title="Transfer"
          variant={item.status === 'verified' ? 'dark' : 'light'}
          onPress={() => item.status === 'verified' && onTransfer(item)}
        />
      </View>
    </View>
  </View>
);

const DashboardScreen = ({ navigation }) => {
  const [search, setSearch] = useState('');
  const filtered = beneficiaries.filter(
    b => b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.bank.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.primary }}>
      <HeaderBar title="DMT Dashboard" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <View style={styles.secureBadge}>
              <Icon name="shield-check" size={12} color={Colors.finance_accent} />
              <Text style={styles.secureBadgeTxt}>SECURED DASHBOARD</Text>
            </View>
            <Text style={styles.pageSub}>Institutional Money Transfer</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            activeOpacity={0.85}
            onPress={() => navigation?.navigate('DMTRegister')}
          >
            <Icon name="plus" size={14} color={Colors.white} />
            <Text style={styles.addBtnText}>Add Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statRow}>
          <StatCard label="Total Limit" amount="₹25k" txnCount={0} amountColor={Colors.green} />
          <StatCard label="Available" amount="₹25k" txnCount={0} amountColor={Colors.red || 'rgb(239, 68, 68)'} />
          <StatCard label="Per Txn" amount="₹5k" txnCount={0} amountColor={Colors.black} />
        </View>

        <View style={styles.modernCard}>
          <View style={styles.cardHighlightHeader}>
            <Icon name="account-details" size={14} color={Colors.finance_accent} />
            <Text style={styles.cardHighlightTitle}>ACCOUNT DETAILS</Text>
          </View>
          
          <View style={styles.cardBody}>

          <View style={styles.searchWrap}>
            <Icon name="magnify" size={16} color={Colors.gray} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search beneficiary by name..."
              placeholderTextColor={Colors.gray}
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <View style={styles.exportRow}>
            <ExportChip label="Copy" icon="content-copy" />
            <ExportChip label="Excel" icon="file-excel" />
            <ExportChip label="PDF" icon="file-pdf" />
            <TouchableOpacity style={styles.colChip} activeOpacity={0.8}>
              <Text style={styles.colChipText}>Columns</Text>
              <Icon name="chevron-down" size={14} color={Colors.white} />
            </TouchableOpacity>
          </View>

            <View style={styles.tableCard}>
                {filtered.length === 0 ? (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyText}>No beneficiaries found</Text>
                </View>
                ) : (
                filtered.map((item, idx) => (
                    <BeneficiaryRow
                    key={item.id}
                    item={item}
                    onTransfer={(b) => navigation?.navigate('DMTMoneyTransfer', { beneficiary: b })}
                    onView={(b) => navigation?.navigate('DMTKYC', { beneficiary: b })}
                    />
                ))
                )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.beige },
  content: { paddingBottom: 40 },
  header: {
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  secureBadgeTxt: {
    color: Colors.white,
    fontSize: 8,
    fontFamily: Fonts.Bold,
    letterSpacing: 1,
  },
  pageSub: {
    fontSize: rs(12),
    color: Colors.slate_700,
    marginTop: 2,
    fontFamily: Fonts.Medium,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.finance_accent,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    gap: 5,
  },
  addBtnText: {
    color: Colors.white,
    fontSize: 11,
    fontFamily: Fonts.Bold,
  },
  statRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginTop: -20 },
  
  modernCard: {
    backgroundColor: Colors.cardbg,
    borderRadius: 18,
    margin: 16,
    overflow: 'hidden',
  },
  cardHighlightHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgb(46, 46, 46)',
    gap: 8,
  },
  cardHighlightTitle: {
    fontSize: 11,
    fontFamily: Fonts.Bold,
    color: Colors.finance_accent,
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: 16,
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.15)',
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 13, color: Colors.primary, fontFamily: Fonts.Medium },
  exportRow: { flexDirection: 'row', gap: 8, marginBottom: 16, flexWrap: 'wrap' },
  colChip: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  colChipText: { fontSize: 10, fontFamily: Fonts.Bold, color: Colors.white },
  labelStyle: { fontSize: rs(8), fontFamily: Fonts.Bold, color: Colors.primary, opacity: 0.6, letterSpacing: 1 },
  tableCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.08)',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.03)',
    gap: 10,
  },
  bankIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowContent: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 12, fontFamily: Fonts.Bold, color: Colors.primary },
  rowSub: { fontSize: 11, fontFamily: Fonts.Medium, color: Colors.slate_700, marginTop: 1 },
  rowActions: { alignItems: 'flex-end' },
  emptyState: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: 14, color: Colors.slate_700, fontFamily: Fonts.Medium },
});

export default DashboardScreen;
