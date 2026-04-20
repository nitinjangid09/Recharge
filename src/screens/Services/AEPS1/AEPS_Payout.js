

import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  StatusBar,
  Platform,
  SafeAreaView,
} from 'react-native';

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  gold: '#D4B06A',
  goldLight: '#FAF3E1',
  goldMid: '#F5E7C6',
  goldDeep: '#fde4a8',
  inputBg: '#fcecc8',
  black: '#1A1A1A',
  white: '#FFFFFF',
  ink: '#222222',
  gray1: '#888888',
  gray2: '#F4F4F4',
  gray3: '#E0E0E0',
  gray4: '#BDBDBD',
  success: '#22C55E',
  error: '#EF4444',
  warn: '#F59E0B',
  accent: '#FF6D1F',
  border: 'rgba(0,0,0,0.08)',
};

// ─── Small reusable primitives ─────────────────────────────────────────────────

const Row = ({ style, children }) => (
  <View style={[{ flexDirection: 'row' }, style]}>{children}</View>
);

const Spacer = ({ h = 0, w = 0 }) => <View style={{ height: h, width: w }} />;

// ─── SVG-free icons (emoji / unicode stand-ins) ───────────────────────────────
// Replace with <Ionicons /> from @expo/vector-icons in a real project.
const Icon = {
  home: '⌂',
  accounts: '👤',
  transfer: '→',
  history: '🕐',
  settings: '⚙',
  addPerson: '+',
  card: '▤',
  clipboard: '📋',
  arrow: '→',
  lock: '🔒',
  phone: '📱',
  money: '💸',
  camera: '📷',
  chevron: '⌄',
  check: '✓',
  user: '👤',
  account: '▤',
  ifsc: '▥',
};

// ═════════════════════════════════════════════════════════════════════════════
// DASHBOARD SCREEN
// ═════════════════════════════════════════════════════════════════════════════

export function DashboardScreen({ navigation }) {
  const beneficiaries = [
    { initials: 'MC', name: 'Monika Choudhary', detail: '001201641748 · ICIC0000012', status: 'PENDING', color: C.goldMid, textColor: C.ink },
    { initials: 'RJ', name: 'Rahul Jangid', detail: '9876****1012 · HDFC0001234', status: 'ACTIVE', color: '#EFF6FF', textColor: '#1D4ED8' },
    { initials: 'AS', name: 'Amit Sharma', detail: '1234****9012 · SBIN0001234', status: 'ACTIVE', color: '#F0FDF4', textColor: '#15803D' },
  ];

  const transactions = [
    { mode: 'IMPS', name: 'Rahul Jangid', txnId: 'TXN1001 · 2024-02-16', amount: '₹5,000', status: 'SUCCESS', bg: '#EFF6FF', color: '#1D4ED8' },
    { mode: 'NEFT', name: 'Amit Sharma', txnId: 'TXN1002 · 2024-02-15', amount: '₹12,000', status: 'PROCESSING', bg: '#F0FDF4', color: '#15803D' },
    { mode: 'IMPS', name: 'Suresh Kumar', txnId: 'TXN1003 · 2024-02-14', amount: '₹2,500', status: 'FAILED', bg: '#EFF6FF', color: '#1D4ED8' },
  ];

  const statusBadge = (s) => {
    if (s === 'SUCCESS') return { bg: '#DCFCE7', text: '#15803D' };
    if (s === 'PROCESSING') return { bg: '#FEF3C7', text: '#B45309' };
    if (s === 'FAILED') return { bg: '#FEE2E2', text: '#B91C1C' };
    return {};
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.goldMid} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <Row style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>AEPS Payout Hub</Text>
            <Text style={styles.headerSub}>Instant settlement engine</Text>
          </View>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>RJ</Text>
          </View>
        </Row>

        {/* ── Balance Card ── */}
        <View style={styles.balanceCard}>
          {/* decorative circles */}
          <View style={styles.bcCircle1} />
          <View style={styles.bcCircle2} />

          <View style={styles.bcBadge}>
            <Text style={styles.bcBadgeText}>VERIFIED</Text>
          </View>

          <Text style={styles.bcLabel}>Available Balance</Text>
          <Row style={{ alignItems: 'flex-end', marginTop: 4, marginBottom: 18 }}>
            <Text style={styles.bcCurrency}>₹</Text>
            <Text style={styles.bcAmount}>2,48,500</Text>
            <Text style={styles.bcDecimal}>.00</Text>
          </Row>

          <Row style={{ gap: 10 }}>
            {[
              { label: "Today's Settled", value: '₹18,500', color: C.success },
              { label: 'Pending', value: '₹12,000', color: C.gold },
              { label: 'Failed', value: '₹2,500', color: C.error },
            ].map((c) => (
              <View key={c.label} style={styles.bcChip}>
                <Text style={styles.bcChipLabel}>{c.label}</Text>
                <Text style={[styles.bcChipVal, { color: c.color }]}>{c.value}</Text>
              </View>
            ))}
          </Row>
        </View>

        {/* ── Stats ── */}
        <Row style={{ gap: 10 }}>
          {[
            { val: '₹33K', label: 'Monthly Volume', badge: '↑ 12.4%', up: true },
            { val: '98.2%', label: 'Success Rate', badge: '↑ 1.2%', up: true },
            { val: '24', label: 'Beneficiaries', badge: '1 Pending', up: false },
          ].map((s) => (
            <View key={s.label} style={styles.statMini}>
              <Text style={styles.statVal}>{s.val}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
              <View style={[styles.statBadge, { backgroundColor: s.up ? '#DCFCE7' : '#FEE2E2' }]}>
                <Text style={[styles.statBadgeText, { color: s.up ? '#15803D' : '#B91C1C' }]}>{s.badge}</Text>
              </View>
            </View>
          ))}
        </Row>

        {/* ── Quick Actions ── */}
        <SectionHeader title="Quick Actions" />
        <Row style={{ gap: 10 }}>
          {[
            { icon: '+', label: 'Add\nBeneficiary', dark: true },
            { icon: '→', label: 'Transfer', dark: false },
            { icon: '▤', label: 'Bank Account', dark: false },
            { icon: '📋', label: 'History', dark: false },
          ].map((a) => (
            <TouchableOpacity
              key={a.label}
              style={styles.qaBtn}
              activeOpacity={0.7}
            >
              <View style={[styles.qaIcon, a.dark && styles.qaIconDark]}>
                <Text style={{ fontSize: 18, color: a.dark ? C.gold : C.ink }}>{a.icon}</Text>
              </View>
              <Text style={styles.qaLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </Row>

        {/* ── Beneficiaries ── */}
        <SectionHeader title="Active Beneficiaries" link="See all" />
        {beneficiaries.map((b) => (
          <View key={b.name} style={styles.beneCard}>
            <View style={[styles.beneAvatar, { backgroundColor: b.color }]}>
              <Text style={[styles.beneAvatarText, { color: b.textColor }]}>{b.initials}</Text>
            </View>
            <View style={styles.beneInfo}>
              <Text style={styles.beneName} numberOfLines={1}>{b.name}</Text>
              <Text style={styles.beneDetail}>{b.detail}</Text>
            </View>
            <View style={[
              styles.beneStatus,
              { backgroundColor: b.status === 'PENDING' ? '#FFF3D6' : '#DCFCE7' },
            ]}>
              <Text style={[
                styles.beneStatusText,
                { color: b.status === 'PENDING' ? '#B07D00' : '#15803D' },
              ]}>
                {b.status}
              </Text>
            </View>
          </View>
        ))}

        {/* ── Recent Transactions ── */}
        <SectionHeader title="Recent Transactions" link="See all" />
        {transactions.map((t) => {
          const sb = statusBadge(t.status);
          return (
            <View key={t.txnId} style={styles.txnCard}>
              <View style={[styles.txnIcon, { backgroundColor: t.bg }]}>
                <Text style={[styles.txnIconText, { color: t.color }]}>{t.mode}</Text>
              </View>
              <View style={styles.txnInfo}>
                <Text style={styles.txnName}>{t.name}</Text>
                <Text style={styles.txnId}>{t.txnId}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.txnAmount}>{t.amount}</Text>
                <View style={[styles.txnBadge, { backgroundColor: sb.bg }]}>
                  <Text style={[styles.txnBadgeText, { color: sb.text }]}>{t.status}</Text>
                </View>
              </View>
            </View>
          );
        })}

        <Spacer h={20} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// TRANSFER SCREEN
// ═════════════════════════════════════════════════════════════════════════════

export function TransferScreen() {
  const [mode, setMode] = useState('IMPS');
  const MODES = ['IMPS', 'NEFT', 'RTGS'];

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor={C.goldMid} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.page}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <Row style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Quick Transfer</Text>
            <Text style={styles.headerSub}>End-to-end encrypted</Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: C.success, borderRadius: 12 }]}>
            <Text style={{ color: C.white, fontSize: 18, fontWeight: '700' }}>✓</Text>
          </View>
        </Row>

        {/* ── Transfer Form ── */}
        <View style={styles.formCard}>
          <FormLabel>Customer Mobile</FormLabel>
          <View style={styles.formInput}>
            <Text style={styles.formInputIcon}>📱</Text>
            <Text style={styles.formPlaceholder}>98XX XXXXX</Text>
          </View>

          <FormLabel>Verified Account</FormLabel>
          <View style={styles.selectInput}>
            <Text style={styles.formPlaceholder}>Select Destination</Text>
            <Text style={styles.chevron}>⌄</Text>
          </View>

          <FormLabel>Payout Amount</FormLabel>
          <View style={styles.formInput}>
            <Text style={styles.formInputIcon}>💸</Text>
            <Text style={styles.formPlaceholder}>0.00</Text>
          </View>

          <FormLabel>Transfer Mode</FormLabel>
          <Row style={{ gap: 8, marginVertical: 10 }}>
            {MODES.map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => setMode(m)}
                style={[styles.tab, mode === m ? styles.tabActive : styles.tabInactive]}
                activeOpacity={0.75}
              >
                <Text style={[styles.tabText, { color: mode === m ? C.white : C.gray1 }]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </Row>

          <TouchableOpacity style={styles.ctaBtn} activeOpacity={0.8}>
            <Text style={{ color: C.gold, fontSize: 16 }}>→</Text>
            <Text style={styles.ctaBtnText}>Transfer Funds</Text>
          </TouchableOpacity>
          <Text style={styles.ctaSub}>🔒  End-to-end encrypted transaction</Text>
        </View>

        {/* ── Add Bank Account ── */}
        <SectionHeader title="Add Bank Account" />
        <View style={styles.formCard}>
          <FormLabel>Bank Name</FormLabel>
          <View style={styles.selectInput}>
            <Text style={styles.formPlaceholder}>Select Bank</Text>
            <Text style={styles.chevron}>⌄</Text>
          </View>

          <FormLabel>Account Holder Name</FormLabel>
          <View style={styles.formInput}>
            <Text style={styles.formInputIcon}>👤</Text>
            <Text style={styles.formPlaceholder}>Enter Account Holder Name</Text>
          </View>

          <FormLabel>Account Number</FormLabel>
          <View style={styles.formInput}>
            <Text style={styles.formInputIcon}>▤</Text>
            <Text style={styles.formPlaceholder}>Enter Account Number</Text>
          </View>

          <FormLabel>IFSC Code</FormLabel>
          <View style={styles.formInput}>
            <Text style={styles.formInputIcon}>▥</Text>
            <Text style={styles.formPlaceholder}>Enter IFSC Code</Text>
          </View>

          <FormLabel>Cheque Image</FormLabel>
          <TouchableOpacity style={styles.uploadBox} activeOpacity={0.7}>
            <Text style={{ fontSize: 22, marginBottom: 4 }}>📷</Text>
            <Text style={styles.uploadText}>
              Choose File <Text style={{ color: C.ink }}>or drag & drop</Text>
            </Text>
            <Text style={styles.uploadSub}>PNG, JPG up to 5MB</Text>
          </TouchableOpacity>

          <Row style={{ gap: 10, marginTop: 4 }}>
            <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.7}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.ctaBtn, { flex: 2, borderRadius: 14, paddingVertical: 14 }]} activeOpacity={0.8}>
              <Text style={styles.ctaBtnText}>Add Account</Text>
            </TouchableOpacity>
          </Row>
        </View>

        <Spacer h={20} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═════════════════════════════════════════════════════════════════════════════

function SectionHeader({ title, link }) {
  return (
    <Row style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {link && <Text style={styles.sectionLink}>{link}</Text>}
    </Row>
  );
}

function FormLabel({ children }) {
  return <Text style={styles.formLabel}>{children}</Text>;
}

function BottomNav({ active }) {
  const items = [
    { key: 'home', label: 'Home', icon: '⌂' },
    { key: 'accounts', label: 'Accounts', icon: '👥' },
    { key: 'transfer', label: 'Transfer', icon: '→' },
    { key: 'history', label: 'History', icon: '🕐' },
    { key: 'settings', label: 'Settings', icon: '⚙' },
  ];

  return (
    <View style={styles.bottomNav}>
      {items.map((item) => {
        const isActive = item.key === active;
        return (
          <TouchableOpacity key={item.key} style={styles.navItem} activeOpacity={0.7}>
            <View style={[styles.navIcon, isActive && styles.navIconActive]}>
              <Text style={{ fontSize: 15, color: isActive ? C.gold : C.gray1 }}>
                {item.icon}
              </Text>
            </View>
            <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
      <View style={styles.homeIndicator} />
    </View>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
// STYLES
// ═════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: C.goldMid,
  },
  screen: {
    flex: 1,
    backgroundColor: C.goldMid,
  },
  page: {
    padding: 16,
    paddingBottom: 110,
    gap: 14,
  },

  // ── Header ──
  header: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: C.ink,
    letterSpacing: -0.5,
  },
  headerSub: {
    fontSize: 12,
    color: C.gray1,
    marginTop: 1,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: C.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.gold,
  },

  // ── Balance Card ──
  balanceCard: {
    backgroundColor: C.black,
    borderRadius: 24,
    padding: 22,
    overflow: 'hidden',
    position: 'relative',
  },
  bcCircle1: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(212,176,106,0.08)',
  },
  bcCircle2: {
    position: 'absolute',
    right: 20,
    top: 20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(212,176,106,0.06)',
  },
  bcBadge: {
    position: 'absolute',
    top: 20,
    right: 20,
    backgroundColor: 'rgba(212,176,106,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(212,176,106,0.3)',
    borderRadius: 20,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  bcBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: C.gold,
    letterSpacing: 0.5,
  },
  bcLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.45)',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  bcCurrency: {
    fontSize: 22,
    fontWeight: '400',
    color: 'rgba(255,255,255,0.5)',
    marginRight: 2,
    lineHeight: 42,
  },
  bcAmount: {
    fontSize: 36,
    fontWeight: '700',
    color: C.white,
    letterSpacing: -1,
  },
  bcDecimal: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.3)',
    alignSelf: 'flex-end',
    marginBottom: 4,
  },
  bcChip: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  bcChipLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '500',
  },
  bcChipVal: {
    fontSize: 14,
    fontWeight: '600',
    color: C.white,
    marginTop: 2,
  },

  // ── Stats ──
  statMini: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  statVal: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
  },
  statLabel: {
    fontSize: 10,
    color: C.gray1,
    fontWeight: '500',
    marginTop: 2,
  },
  statBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 20,
    marginTop: 6,
  },
  statBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },

  // ── Quick Actions ──
  qaBtn: {
    flex: 1,
    backgroundColor: C.white,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 6,
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: C.border,
  },
  qaIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: C.goldMid,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qaIconDark: {
    backgroundColor: C.black,
  },
  qaLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: C.ink,
    textAlign: 'center',
    letterSpacing: 0.2,
  },

  // ── Section header ──
  sectionHeader: {
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '600',
    color: C.black,
    opacity: 0.5,
  },

  // ── Beneficiary Card ──
  beneCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  beneAvatar: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beneAvatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  beneInfo: {
    flex: 1,
    minWidth: 0,
  },
  beneName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
  },
  beneDetail: {
    fontSize: 11,
    color: C.gray1,
    marginTop: 1,
  },
  beneStatus: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  beneStatusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ── Transaction Card ──
  txnCard: {
    backgroundColor: C.white,
    borderRadius: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  txnIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnIconText: {
    fontSize: 10,
    fontWeight: '700',
  },
  txnInfo: {
    flex: 1,
  },
  txnName: {
    fontSize: 13,
    fontWeight: '600',
    color: C.ink,
  },
  txnId: {
    fontSize: 11,
    color: C.gray1,
    marginTop: 1,
  },
  txnAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
  },
  txnBadge: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 20,
    marginTop: 4,
  },
  txnBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  // ── Form ──
  formCard: {
    backgroundColor: C.white,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: C.border,
  },
  formLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.gray1,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: C.inputBg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  formInputIcon: {
    fontSize: 14,
  },
  formPlaceholder: {
    fontSize: 14,
    fontWeight: '500',
    color: C.gray4,
    flex: 1,
  },
  selectInput: {
    backgroundColor: C.inputBg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  chevron: {
    fontSize: 16,
    color: C.gray4,
  },

  // ── Tabs ──
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 20,
  },
  tabActive: {
    backgroundColor: C.black,
  },
  tabInactive: {
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ── CTA ──
  ctaBtn: {
    backgroundColor: C.black,
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
  },
  ctaBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.white,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  ctaSub: {
    textAlign: 'center',
    fontSize: 9,
    color: C.gray1,
    marginTop: 6,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },

  // ── Upload Box ──
  uploadBox: {
    backgroundColor: C.inputBg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.15)',
    borderStyle: 'dashed',
    padding: 16,
    alignItems: 'center',
    marginBottom: 14,
  },
  uploadText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.gray1,
    marginBottom: 2,
  },
  uploadSub: {
    fontSize: 10,
    color: C.gray4,
  },

  // ── Cancel Button ──
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.gray1,
  },

  // ── Bottom Nav ──
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: Platform.OS === 'ios' ? 90 : 70,
    backgroundColor: 'rgba(245,231,198,0.97)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.06)',
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingTop: 10,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  navIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIconActive: {
    backgroundColor: C.black,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: C.gray1,
  },
  navLabelActive: {
    color: C.ink,
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    width: 130,
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 3,
  },
});

// ═════════════════════════════════════════════════════════════════════════════
// APP ENTRY 
// ═════════════════════════════════════════════════════════════════════════════

export default function App() {
  return (
    <View style={{ flex: 1, backgroundColor: C.goldMid }}>
      <DashboardScreen />
    </View>
  );
}