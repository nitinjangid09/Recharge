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
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',  }}>
    <Text style={{ fontSize: rs(10), fontWeight: '700', color: '#64748B', textTransform: 'uppercase', marginBottom: 4 }}>{label}</Text>
    <Text style={{ fontSize: rs(16), fontWeight: '800', color: amountColor || Colors.black }}>{amount}</Text>
    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
      <Text style={{ fontSize: rs(9), color: '#64748B' }}>TXNS:</Text>
      <Text style={{ fontSize: rs(9), fontWeight: '700', color: Colors.black, marginLeft: 3 }}>{txnCount}</Text>
    </View>
  </View>
);

const Badge = ({ label, type }) => (
  <View style={{
    backgroundColor: type === 'success' ? '#DCFCE7' : '#FEF3C7',
    paddingHorizontal: rs(8),
    paddingVertical: rs(3),
    borderRadius: Radius.sm,
  }}>
    <Text style={{
      fontSize: rs(9),
      fontWeight: '700',
      color: type === 'success' ? '#166534' : '#92400E',
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
      backgroundColor: variant === 'dark' ? Colors.black : '#F1F5F9',
      paddingHorizontal: rs(10),
      paddingVertical: rs(6),
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: variant === 'dark' ? Colors.black : '#E2E8F0',
    }}
  >
    <Text style={{
      fontSize: rs(10),
      fontWeight: '700',
      color: variant === 'dark' ? Colors.white : '#475569'
    }}>
      {title}
    </Text>
  </TouchableOpacity>
);

const ExportChip = ({ label }) => (
  <TouchableOpacity style={{
    paddingVertical: rs(7),
    paddingHorizontal: rs(14),
    borderRadius: Radius.xl,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: '#E2E8F0'
  }}>
    <Text style={{ fontSize: rs(10), fontWeight: '700', color: '#475569' }}>{label}</Text>
  </TouchableOpacity>
);

const beneficiaries = [
  {
    id: '1',
    bank: 'Axis Bank',
    icon: '🏛',
    name: 'ABHISHEK SHARMA',
    ifsc: 'UTIB0002878',
    account: '9220100...978',
    mobile: '7851819044',
    status: 'verified',
  },
  {
    id: '2',
    bank: 'HDFC Bank',
    icon: '🏦',
    name: 'ROHIT KUMAR',
    ifsc: 'HDFC0001234',
    account: '4560120...234',
    mobile: '9876543210',
    status: 'pending',
  },
  {
    id: '3',
    bank: 'SBI',
    icon: '🏧',
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
      <Text style={{ fontSize: 16 }}>{item.icon}</Text>
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
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg || '#F1F5F9' }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.pageTitle}>DMT Dashboard</Text>
            <Text style={styles.pageSub}>Institutional Money Transfer</Text>
          </View>
          <TouchableOpacity
            style={styles.addBtn}
            activeOpacity={0.85}
            onPress={() => navigation?.navigate('DMTRegister')}
          >
            <Text style={styles.addBtnIcon}>＋</Text>
            <Text style={styles.addBtnText}>Add Account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statRow}>
          <StatCard label="Total Limit" amount="₹25k" txnCount={0} amountColor="#22C55E" />
          <StatCard label="Available" amount="₹25k" txnCount={0} amountColor={Colors.error || '#EF4444'} />
          <StatCard label="Per Txn" amount="₹5k" txnCount={0} amountColor={Colors.black} />
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionBar} />
            <Text style={styles.sectionTitle}>Account Details</Text>
          </View>

          <View style={styles.searchWrap}>
            <Text style={styles.searchIcon}>🔍</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Search beneficiary by name..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          <View style={styles.exportRow}>
            <ExportChip label="📋 Copy" />
            <ExportChip label="📊 Excel" />
            <ExportChip label="📄 PDF" />
            <TouchableOpacity style={styles.colChip} activeOpacity={0.8}>
              <Text style={styles.colChipText}>Columns ▾</Text>
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
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg || '#F1F5F9' },
  content: { paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: 4,
    gap: 10,
  },
  pageTitle: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.black,
    lineHeight: 26,
  },
  pageSub: {
    fontSize: FontSize.base,
    color: '#64748B',
    marginTop: 3,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.black,
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 24,
    gap: 5,
    marginTop: 4,
  },
  addBtnIcon: { color: Colors.white, fontSize: 14, fontWeight: '400' },
  addBtnText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statRow: { flexDirection: 'row', gap: 8, paddingHorizontal: Spacing.xl, marginTop: 14 },
  section: { paddingHorizontal: Spacing.xl, marginTop: 20 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionBar: { width: 3, height: 12, backgroundColor: Colors.primary, borderRadius: 2 },
  sectionTitle: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    marginBottom: 12,
    gap: 8,
  },
  searchIcon: { fontSize: 14 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: FontSize.base, color: Colors.black },
  exportRow: { flexDirection: 'row', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  colChip: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: Colors.black,
  },
  colChipText: { fontSize: 10, fontWeight: '700', color: Colors.white },
  tableCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 13,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  bankIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  rowContent: { flex: 1, minWidth: 0 },
  rowTitle: { fontSize: 12, fontWeight: '800', color: Colors.black },
  rowSub: { fontSize: 10, color: '#64748B', marginTop: 1 },
  rowActions: { alignItems: 'flex-end' },
  emptyState: { padding: 24, alignItems: 'center' },
  emptyText: { fontSize: FontSize.base, color: '#64748B' },
});

export default DashboardScreen;
