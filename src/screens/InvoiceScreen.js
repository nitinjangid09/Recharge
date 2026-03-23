// InvoiceScreen.js — Clean SaaS UI redesign
// Status chips height fixed. All logic, API, filters, normalizers — UNCHANGED.

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Modal, Animated, Dimensions, Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../constants/Colors';
import Fonts from '../constants/Fonts';
import { getRechargeReport } from '../api/AuthApi';
import { SafeAreaView } from 'react-native-safe-area-context';

const { height: SH, width: SW } = Dimensions.get('window');

// ─── Design tokens — clean SaaS palette ──────────────────────────────────────
const D = {
  // Backgrounds
  pageBg: '#F7F8FA',
  cardBg: '#FFFFFF',
  headerBg: '#0F172A',       // deep navy

  // Brand
  brand: Colors.finance_accent || '#D4A843',
  brandSoft: 'rgba(212,168,67,0.10)',
  brandBorder: 'rgba(212,168,67,0.30)',

  // Semantic
  green: '#059669',
  greenSoft: 'rgba(5,150,105,0.10)',
  greenBorder: 'rgba(5,150,105,0.25)',

  red: '#DC2626',
  redSoft: 'rgba(220,38,38,0.09)',
  redBorder: 'rgba(220,38,38,0.22)',

  amber: '#D97706',
  amberSoft: 'rgba(217,119,6,0.10)',
  amberBorder: 'rgba(217,119,6,0.25)',

  blue: '#2563EB',
  blueSoft: 'rgba(37,99,235,0.10)',

  // Text
  textPri: '#0F172A',
  textSec: '#475569',
  textMuted: '#94A3B8',

  // Structure
  border: '#E2E8F0',
  divider: '#F1F5F9',
  shadow: '#64748B',
};

// ─── All logic unchanged ──────────────────────────────────────────────────────
const fetchRechargeTransactions = async ({ from, to, headerToken }) => {
  const json = await getRechargeReport({ from, to, headerToken });
  if (!json.success) throw new Error(json.message || 'Failed to fetch recharge report');
  return normalizeRecharge(json.data);
};

const normalizeRecharge = (data = []) =>
  data.map((item) => ({
    id: item.referenceId || item._id,
    amount: String(item.amount ?? 0),
    category: 'Recharge',
    status: titleCase(item.status),
    date: isoToDisplay(item.createdAt),
    isoDate: item.createdAt,
    desc: [item.operatorName, item.mobileNumber].filter(Boolean).join(' • ') || 'Recharge',
    operatorName: item.operatorName || '',
    extra: {
      commission: item.commission ?? 0,
      tds: item.tds ?? 0,
      netCommission: item.netCommission ?? 0,
      isRefunded: item.isRefunded ?? false,
      operator: item.operatorName || '',
      mobile: item.mobileNumber || '',
    },
  }));

const TABS = [
  { label: 'Recharge', value: 'Recharge', icon: 'cellphone', fetchFn: fetchRechargeTransactions },
  { label: 'Wallet', value: 'Wallet', icon: 'wallet', fetchFn: null },
  { label: 'AEPS', value: 'Aeps', icon: 'fingerprint', fetchFn: null },
  { label: 'BBPS', value: 'BBPS', icon: 'lightning-bolt', fetchFn: null },
];

const STATUS_CONFIG = {
  Success: { color: D.green, bg: D.greenSoft, border: D.greenBorder, icon: 'check-circle-outline', label: 'Success' },
  Pending: { color: D.amber, bg: D.amberSoft, border: D.amberBorder, icon: 'clock-outline', label: 'Pending' },
  Failed: { color: D.red, bg: D.redSoft, border: D.redBorder, icon: 'close-circle-outline', label: 'Failed' },
};

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const titleCase = (s = '') => (!s ? 'Pending' : s.charAt(0).toUpperCase() + s.slice(1).toLowerCase());
const isoToDisplay = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};
const isoToReadable = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
};
const pad = (n) => String(n).padStart(2, '0');
const toQueryDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseDisplayDate = (str) => {
  if (!str) return null;
  const [dd, mm, yyyy] = str.split('/').map(Number);
  return new Date(yyyy, mm - 1, dd);
};
const dateRangeStart = (f) => {
  const n = new Date(); n.setHours(0, 0, 0, 0);
  if (f === 'Last 7 Days') { const d = new Date(n); d.setDate(d.getDate() - 6); return d; }
  if (f === 'Last 30 Days') { const d = new Date(n); d.setDate(d.getDate() - 29); return d; }
  if (f === 'Last 3 Months') { const d = new Date(n); d.setMonth(d.getMonth() - 3); return d; }
  if (f === 'Last 6 Months') { const d = new Date(n); d.setMonth(d.getMonth() - 6); return d; }
  return null;
};

// ══════════════════════════════════════════════════════════════════════════════
//  TRANSACTION DETAIL BOTTOM SHEET
// ══════════════════════════════════════════════════════════════════════════════
const TxnDetailSheet = ({ visible, txn, onClose }) => {
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, bounciness: 3, speed: 16, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SH, duration: 220, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!txn) return null;

  const isSuccess = txn.status?.toLowerCase() === 'success';
  const isFailed = txn.status?.toLowerCase() === 'failed';
  const amtColor = isFailed ? D.red : D.green;
  const amtPrefix = isFailed ? '−₹' : '+₹';
  const typeLabel = isSuccess ? 'Credited' : isFailed ? 'Debited' : 'Pending';
  const typeColor = isSuccess ? D.green : isFailed ? D.red : D.amber;
  const comm = txn.extra?.netCommission ?? 0;
  const tds = txn.extra?.tds ?? 0;

  const rows = [
    { label: 'Status', val: isSuccess ? 'Credited' : isFailed ? 'Failed' : 'Pending', valColor: typeColor },
    { label: 'Reference ID', val: txn.id, mono: true },
    { label: 'Date', val: isoToReadable(txn.isoDate) || txn.date },
    { label: 'Transaction Type', val: typeLabel },
    { label: 'Amount', val: `₹${Number(txn.amount).toLocaleString('en-IN')}`, valColor: amtColor },
  ];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[SH_S.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      <Animated.View style={[SH_S.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={SH_S.handle} />

        {/* Amount hero */}
        <View style={[SH_S.hero, { borderBottomColor: D.border }]}>
          <View style={[SH_S.heroIcon, { backgroundColor: isFailed ? D.redSoft : D.greenSoft }]}>
            <Icon name={isFailed ? 'arrow-up' : 'arrow-down'} size={22} color={amtColor} />
          </View>
          <Text style={[SH_S.heroAmt, { color: amtColor }]}>
            {amtPrefix}{Number(txn.amount).toLocaleString('en-IN')}
          </Text>
          <Text style={SH_S.heroDesc} numberOfLines={1}>{txn.operatorName ? `${txn.operatorName} Recharge` : txn.desc}</Text>
          {comm > 0 && (
            <View style={SH_S.commPill}>
              <Icon name="trending-up" size={10} color={D.green} style={{ marginRight: 4 }} />
              <Text style={SH_S.commTxt}>Comm ₹{comm.toFixed(2)}  ·  TDS ₹{tds.toFixed(2)}</Text>
            </View>
          )}
        </View>

        {/* Rows */}
        <View style={SH_S.rows}>
          {rows.map((row, i) => (
            <View key={i} style={[SH_S.row, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={SH_S.rowLabel}>{row.label}</Text>
              <Text style={[SH_S.rowVal, row.mono && SH_S.rowMono, row.valColor && { color: row.valColor }]}>
                {row.val || '—'}
              </Text>
            </View>
          ))}
        </View>

        {/* Close button */}
        <View style={SH_S.footer}>
          <TouchableOpacity style={SH_S.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={SH_S.closeTxt}>Done</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

const SH_S = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.5)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: D.cardBg,
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingBottom: 34,
    elevation: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: -6 }, shadowOpacity: 0.12, shadowRadius: 20,
  },
  handle: {
    width: 40, height: 4, backgroundColor: D.border,
    borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 20,
  },
  hero: {
    alignItems: 'center', paddingHorizontal: 24, paddingBottom: 24,
    borderBottomWidth: 1, borderBottomColor: D.border,
  },
  heroIcon: {
    width: 52, height: 52, borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  heroAmt: { fontSize: 34, fontFamily: Fonts.Bold, letterSpacing: -1, marginBottom: 4 },
  heroDesc: { fontSize: 13, color: D.textSec, fontFamily: Fonts.Medium },
  commPill: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 10, backgroundColor: D.greenSoft,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  commTxt: { fontSize: 11, color: D.green, fontFamily: Fonts.Bold },
  rows: { paddingHorizontal: 24, paddingTop: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: D.divider,
  },
  rowLabel: { fontSize: 13, color: D.textMuted, fontFamily: Fonts.Medium },
  rowVal: { fontSize: 13, fontFamily: Fonts.Bold, color: D.textPri, maxWidth: '58%', textAlign: 'right' },
  rowMono: { fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', fontSize: 11, letterSpacing: 0.3 },
  footer: { paddingHorizontal: 24, paddingTop: 20 },
  closeBtn: {
    backgroundColor: D.headerBg, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
  },
  closeTxt: { color: '#fff', fontFamily: Fonts.Bold, fontSize: 15, letterSpacing: 0.3 },
});

// ══════════════════════════════════════════════════════════════════════════════
//  TRANSACTION CARD — clean SaaS style
// ══════════════════════════════════════════════════════════════════════════════
const CATEGORY_ICON = { Recharge: 'cellphone', Wallet: 'wallet', Aeps: 'fingerprint', BBPS: 'lightning-bolt' };

const TxnCard = ({ txn, onPress }) => {
  const cfgKey = Object.keys(STATUS_CONFIG).find(k => k.toLowerCase() === txn.status?.trim().toLowerCase()) || 'Pending';
  const cfg = STATUS_CONFIG[cfgKey];
  const catKey = Object.keys(CATEGORY_ICON).find(k => k.toLowerCase() === txn.category?.trim().toLowerCase());
  const catIcon = catKey ? CATEGORY_ICON[catKey] : 'cash';
  const isFailed = txn.status?.toLowerCase() === 'failed';
  const isSuccess = txn.status?.toLowerCase() === 'success';
  const extra = txn.extra || {};
  const amtColor = isFailed ? D.red : D.green;
  const amtPrefix = isFailed ? '−₹' : '+₹';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.78}>
      <View style={TC.card}>
        {/* Left accent bar */}
        <View style={[TC.bar, { backgroundColor: cfg.color }]} />

        <View style={TC.inner}>
          {/* Top row */}
          <View style={TC.topRow}>
            {/* Icon */}
            <View style={[TC.iconWrap, { backgroundColor: D.brandSoft }]}>
              <Icon name={catIcon} size={18} color={D.brand} />
            </View>

            {/* Content */}
            <View style={TC.content}>
              <Text style={TC.title} numberOfLines={1}>{txn.desc}</Text>
              <Text style={TC.ref} numberOfLines={1}>Ref #{txn.id}</Text>
            </View>

            {/* Amount + badge */}
            <View style={TC.right}>
              <Text style={[TC.amount, { color: amtColor }]}>
                {amtPrefix}{Number(txn.amount).toLocaleString('en-IN')}
              </Text>
              <View style={[TC.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
                <Icon name={cfg.icon} size={9} color={cfg.color} style={{ marginRight: 3 }} />
                <Text style={[TC.badgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
              </View>
            </View>
          </View>

          {/* Footer row */}
          <View style={TC.footerRow}>
            <View style={TC.metaChip}>
              <Icon name="calendar-outline" size={9} color={D.textMuted} style={{ marginRight: 3 }} />
              <Text style={TC.metaTxt}>{txn.date}</Text>
            </View>

            <View style={TC.metaChip}>
              <Icon name="tag-outline" size={9} color={D.textMuted} style={{ marginRight: 3 }} />
              <Text style={TC.metaTxt}>{txn.category}</Text>
            </View>

            {extra.isRefunded && (
              <View style={[TC.metaChip, { backgroundColor: D.blueSoft }]}>
                <Text style={[TC.metaTxt, { color: D.blue, fontFamily: Fonts.Bold }]}>Refunded</Text>
              </View>
            )}

            {isSuccess && extra.netCommission > 0 && (
              <View style={[TC.metaChip, { backgroundColor: D.greenSoft }]}>
                <Icon name="trending-up" size={9} color={D.green} style={{ marginRight: 3 }} />
                <Text style={[TC.metaTxt, { color: D.green, fontFamily: Fonts.Bold }]}>
                  +₹{extra.netCommission.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const TC = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: D.cardBg,
    borderRadius: 14,
    marginBottom: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: D.border,
    elevation: 1,
    shadowColor: D.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
  },
  bar: { width: 3 },
  inner: { flex: 1, paddingHorizontal: 13, paddingTop: 12, paddingBottom: 10 },

  topRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 9 },
  iconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },

  content: { flex: 1 },
  title: { fontSize: 13, fontFamily: Fonts.Bold, color: D.textPri, marginBottom: 2 },
  ref: { fontSize: 10, color: D.textMuted, fontFamily: Fonts.Medium },

  right: { alignItems: 'flex-end', gap: 5, flexShrink: 0 },
  amount: { fontSize: 14, fontFamily: Fonts.Bold, letterSpacing: -0.3 },
  badge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1,
  },
  badgeTxt: { fontSize: 9, fontFamily: Fonts.Bold, letterSpacing: 0.2 },

  footerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 5 },
  metaChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.divider,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  metaTxt: { fontSize: 10, color: D.textMuted, fontFamily: Fonts.Medium },
});

// ══════════════════════════════════════════════════════════════════════════════
//  STATUS FILTER CHIPS — fixed height, pill style
//  Root cause of height bloat was lineHeight mismatch + Android font padding.
//  Fix: explicit height on chip, centered content, no lineHeight on label.
// ══════════════════════════════════════════════════════════════════════════════
const CHIP_HEIGHT = 28; // fixed, consistent across Android & iOS

const StatusChips = ({ value, onChange }) => {
  const chips = [
    { key: 'All', label: 'All', icon: 'view-list-outline' },
    { key: 'Success', label: 'Success', icon: 'check-circle-outline' },
    { key: 'Pending', label: 'Pending', icon: 'clock-outline' },
    { key: 'Failed', label: 'Failed', icon: 'close-circle-outline' },
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={CHI.row}
    >
      {chips.map(chip => {
        const isActive = value === chip.key;
        const cfg = chip.key !== 'All' ? STATUS_CONFIG[chip.key] : null;
        const activeBg = chip.key === 'All' ? D.headerBg : cfg?.color;
        const activeIcon = isActive ? '#fff' : (cfg?.color || D.textSec);
        const activeTxt = isActive ? '#fff' : D.textSec;
        const activeBorder = isActive ? 'transparent' : D.border;

        return (
          <TouchableOpacity
            key={chip.key}
            onPress={() => onChange(chip.key)}
            activeOpacity={0.72}
            style={[
              CHI.chip,
              { backgroundColor: isActive ? activeBg : D.cardBg, borderColor: activeBorder },
            ]}
          >
            <Icon name={chip.icon} size={12} color={activeIcon} style={CHI.chipIcon} />
            <Text style={[CHI.chipTxt, { color: activeTxt }]}>{chip.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const CHI = StyleSheet.create({
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 4,
    gap: 7,
    alignItems: 'center',
  },
  chip: {
    // ─── Height is FIXED — no paddingVertical, use height + alignItems ───
    height: CHIP_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    borderRadius: CHIP_HEIGHT / 2,
    borderWidth: 1,
  },
  chipIcon: { marginRight: 5 },
  chipTxt: {
    fontSize: 12,
    fontFamily: Fonts.Bold,
    // ── No lineHeight set — avoids Android cap-height inflation ──
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

// ══════════════════════════════════════════════════════════════════════════════
//  SUMMARY STRIP — 5 stats in a horizontal card
// ══════════════════════════════════════════════════════════════════════════════
const SummaryStrip = ({ summary }) => {
  const items = [
    { label: 'Total', value: summary.total, color: D.textPri },
    { label: 'Success', value: summary.success, color: D.green },
    { label: 'Pending', value: summary.pending, color: D.amber },
    { label: 'Failed', value: summary.failed, color: D.red },
    { label: 'Amount', value: `₹${summary.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, color: D.brand },
  ];

  return (
    <View style={ST.wrap}>
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          <View style={ST.cell}>
            <Text style={[ST.value, { color: item.color }]}>{item.value}</Text>
            <Text style={ST.label}>{item.label}</Text>
          </View>
          {i < items.length - 1 && <View style={ST.div} />}
        </React.Fragment>
      ))}
    </View>
  );
};

const ST = StyleSheet.create({
  wrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.cardBg,
    marginHorizontal: 16, marginBottom: 4,
    borderRadius: 12, paddingVertical: 12,
    borderWidth: 1, borderColor: D.border,
    elevation: 1, shadowColor: D.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3,
  },
  cell: { flex: 1, alignItems: 'center' },
  value: { fontSize: 13, fontFamily: Fonts.Bold, includeFontPadding: false, marginBottom: 2 },
  label: { fontSize: 9, fontFamily: Fonts.Bold, color: D.textMuted, letterSpacing: 0.4, textTransform: 'uppercase', includeFontPadding: false },
  div: { width: 1, height: 20, backgroundColor: D.border },
});

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export default function InvoiceScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState(TABS[0].value);
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('Last 30 Days');
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [pickerMode, setPickerMode] = useState('from');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState('');
  const [tabData, setTabData] = useState({});
  const [loadingTab, setLoadingTab] = useState(false);
  const [errorTab, setErrorTab] = useState(null);
  const [selectedTxn, setSelectedTxn] = useState(null);
  const [sheetVisible, setSheetVisible] = useState(false);

  const loadTab = useCallback(async (tabValue) => {
    const tabCfg = TABS.find(t => t.value === tabValue);
    if (!tabCfg?.fetchFn) { setTabData(prev => ({ ...prev, [tabValue]: [] })); return; }
    setLoadingTab(true); setErrorTab(null);
    try {
      const headerToken = await AsyncStorage.getItem('header_token');
      if (!headerToken) throw new Error('Session expired. Please login again.');
      let fromStr = '', toStr = '';
      if (dateFilter === 'Custom') {
        if (fromDate) fromStr = toQueryDate(fromDate);
        if (toDate) toStr = toQueryDate(toDate);
      } else if (dateFilter !== 'All Time') {
        const start = dateRangeStart(dateFilter);
        if (start) fromStr = toQueryDate(start);
        toStr = toQueryDate(new Date());
      }
      const data = await tabCfg.fetchFn({ from: fromStr, to: toStr, headerToken });
      setTabData(prev => ({ ...prev, [tabValue]: data }));
    } catch (err) {
      setErrorTab(err.message || 'Something went wrong');
      setTabData(prev => ({ ...prev, [tabValue]: [] }));
    } finally { setLoadingTab(false); }
  }, [dateFilter, fromDate, toDate]);

  useEffect(() => { loadTab(activeTab); }, [activeTab, dateFilter, fromDate, toDate]);

  const retryTab = () => {
    setTabData(prev => { const next = { ...prev }; delete next[activeTab]; return next; });
    setErrorTab(null);
  };

  const rawList = tabData[activeTab] ?? [];
  const filtered = useMemo(() => {
    let list = [...rawList];
    if (statusFilter !== 'All') {
      const sfLower = statusFilter.toLowerCase();
      list = list.filter(t => t.status.trim().toLowerCase() === sfLower);
    }
    if (dateFilter === 'Custom' && (fromDate || toDate)) {
      list = list.filter(t => {
        const d = parseDisplayDate(t.date);
        if (!d) return true;
        if (fromDate && d < fromDate) return false;
        if (toDate) { const end = new Date(toDate); end.setHours(23, 59, 59, 999); if (d > end) return false; }
        return true;
      });
    } else if (dateFilter !== 'All Time') {
      const start = dateRangeStart(dateFilter);
      if (start) list = list.filter(t => { const d = parseDisplayDate(t.date); return d ? d >= start : true; });
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(t =>
        t.id.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q) ||
        t.amount.includes(q) || t.category.toLowerCase().includes(q) || t.status.toLowerCase().includes(q)
      );
    }
    return list;
  }, [rawList, statusFilter, dateFilter, fromDate, toDate, search]);

  const summary = useMemo(() => ({
    total: filtered.length,
    success: filtered.filter(t => t.status.toLowerCase() === 'success').length,
    pending: filtered.filter(t => t.status.toLowerCase() === 'pending').length,
    failed: filtered.filter(t => t.status.toLowerCase() === 'failed').length,
    amount: filtered.reduce((s, t) => s + Number(t.amount), 0),
  }), [filtered]);

  const activeTabCfg = TABS.find(t => t.value === activeTab);
  const tabHasApi = !!activeTabCfg?.fetchFn;

  return (
    <SafeAreaView style={S.safe} edges={['top']}>

      {/* ── Header ── */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.hBtn} activeOpacity={0.7}>
          <Icon name="arrow-left" size={18} color="#fff" />
        </TouchableOpacity>
        <Text style={S.hTitle}>Transactions</Text>
        <View style={S.hBtn} />
      </View>

      {/* ── Tab bar ── */}
      <View style={S.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.tabScroll}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.value;
            return (
              <TouchableOpacity
                key={tab.value}
                onPress={() => setActiveTab(tab.value)}
                style={[S.tabItem, isActive && S.tabItemActive]}
                activeOpacity={0.75}
              >
                <Icon
                  name={tab.icon}
                  size={13}
                  color={isActive ? D.brand : D.textMuted}
                  style={{ marginRight: 5 }}
                />
                <Text style={[S.tabTxt, isActive && S.tabTxtActive]}>{tab.label}</Text>
                {!tab.fetchFn && <View style={S.soonDot} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Search ── */}
      <View style={S.searchWrap}>
        <Icon name="magnify" size={16} color={D.textMuted} style={{ marginRight: 8 }} />
        <TextInput
          style={S.searchInput}
          placeholder="Search transactions..."
          placeholderTextColor={D.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close-circle" size={15} color={D.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Status chips — FIXED HEIGHT ── */}
      <StatusChips value={statusFilter} onChange={setStatusFilter} />

      {/* ── Summary strip ── */}
      <SummaryStrip summary={summary} />

      {/* ── Body ── */}
      {loadingTab ? (
        <View style={S.center}>
          <ActivityIndicator size="large" color={D.brand} />
          <Text style={S.centerTxt}>Fetching transactions…</Text>
        </View>
      ) : errorTab ? (
        <View style={S.center}>
          <View style={S.errorIcon}>
            <Icon name="alert-circle-outline" size={28} color={D.red} />
          </View>
          <Text style={S.errorTitle}>Failed to load</Text>
          <Text style={S.errorSub}>{errorTab}</Text>
          <TouchableOpacity style={S.retryBtn} onPress={retryTab} activeOpacity={0.85}>
            <Icon name="refresh" size={14} color="#fff" style={{ marginRight: 6 }} />
            <Text style={S.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !tabHasApi ? (
        <View style={S.center}>
          <View style={[S.errorIcon, { backgroundColor: D.brandSoft }]}>
            <Icon name="clock-outline" size={28} color={D.brand} />
          </View>
          <Text style={S.errorTitle}>Coming Soon</Text>
          <Text style={S.errorSub}>{activeTabCfg?.label} transactions will appear here.</Text>
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={S.listContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {filtered.length === 0 ? (
            <View style={S.center}>
              <View style={[S.errorIcon, { backgroundColor: D.brandSoft }]}>
                <Icon name="file-search-outline" size={28} color={D.brand} />
              </View>
              <Text style={S.errorTitle}>No results</Text>
              <Text style={S.errorSub}>Try adjusting your filters or search term</Text>
            </View>
          ) : (
            filtered.map((txn, i) => (
              <TxnCard
                key={txn.id + i}
                txn={txn}
                onPress={() => { setSelectedTxn(txn); setSheetVisible(true); }}
              />
            ))
          )}
        </ScrollView>
      )}

      {pickerVisible && (
        <DateTimePicker
          value={pickerMode === 'from' ? (fromDate || new Date()) : (toDate || new Date())}
          mode="date" display="calendar" maximumDate={new Date()}
          onChange={(_, selected) => {
            setPickerVisible(false);
            if (!selected) return;
            pickerMode === 'from' ? setFromDate(selected) : setToDate(selected);
          }}
        />
      )}

      <TxnDetailSheet
        visible={sheetVisible}
        txn={selectedTxn}
        onClose={() => setSheetVisible(false)}
      />
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  SCREEN STYLES
// ══════════════════════════════════════════════════════════════════════════════
const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: D.pageBg },

  // Header
  header: {
    backgroundColor: D.headerBg,
    paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center',
    elevation: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8,
  },
  hBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.10)',
    alignItems: 'center', justifyContent: 'center',
  },
  hTitle: {
    flex: 1, textAlign: 'center',
    color: '#fff', fontSize: 16, fontFamily: Fonts.Bold, letterSpacing: 0.3,
  },

  // Tab bar
  tabBar: { backgroundColor: D.cardBg, borderBottomWidth: 1, borderBottomColor: D.border },
  tabScroll: { paddingHorizontal: 12, alignItems: 'center' },
  tabItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingVertical: 8, marginRight: 2,
  },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: D.brand },
  tabTxt: { fontSize: 13, fontFamily: Fonts.Medium, color: D.textMuted },
  tabTxtActive: { fontFamily: Fonts.Bold, color: D.brand },
  soonDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: D.amber, marginLeft: 4, marginBottom: 6 },

  // Search
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.cardBg,
    marginHorizontal: 16, marginTop: 8,
    paddingHorizontal: 12, height: 42,
    borderRadius: 10, borderWidth: 1, borderColor: D.border,
    elevation: 1, shadowColor: D.shadow, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3,
  },
  searchInput: { flex: 1, fontSize: 13, fontFamily: Fonts.Medium, color: D.textPri, padding: 0 },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 2, paddingBottom: 32 },

  // States
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  centerTxt: { marginTop: 12, fontSize: 13, fontFamily: Fonts.Medium, color: D.textMuted },
  errorIcon: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: D.redSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  errorTitle: { fontSize: 15, fontFamily: Fonts.Bold, color: D.textPri, marginBottom: 6 },
  errorSub: { fontSize: 13, fontFamily: Fonts.Medium, color: D.textMuted, textAlign: 'center', marginHorizontal: 32, marginBottom: 20 },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.headerBg,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
  },
  retryTxt: { fontSize: 13, fontFamily: Fonts.Bold, color: '#fff' },
});