// InvoiceScreen.js — Clean SaaS UI redesign
// StatusChips spacing fixed (above & below). All logic, API, filters, normalizers — UNCHANGED.

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

const D = {
  pageBg: '#F1F5F9', // Slightly darker to make card pop
  cardBg: '#FFFFFF',
  headerBg: '#0F172A',

  brand: '#6366F1', // Indigo pop
  brandSoft: '#EEF2FF',
  brandBorder: '#C7D2FE',

  green: '#10B981', // Emerald
  greenSoft: '#D1FAE5',
  greenDeep: '#065F46',

  red: '#F43F5E', // Rose-Red
  redSoft: '#FFE4E6',
  redDeep: '#9F1239',

  amber: '#F59E0B', 
  amberSoft: '#FEF3C7',
  amberDeep: '#92400E',

  blue: '#3B82F6', 
  blueSoft: '#DBEAFE',

  textPri: '#0F172A',
  textSec: '#334155',
  textMuted: '#64748B',

  border: '#CBD5E1', 
  divider: '#E2E8F0',
  shadow: '#000000',
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
  { label: 'DMT', value: 'DMT', icon: 'bank-transfer', fetchFn: null },
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
        Animated.spring(slideAnim, { toValue: 0, bounciness: 2, speed: 14, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SH, duration: 250, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!txn) return null;

  const st = STATUS_CONFIG[txn.status] || STATUS_CONFIG.Pending;
  const comm = txn.extra?.netCommission ?? 0;
  const tds = txn.extra?.tds ?? 0;

  const topCards = [
    { label: 'AMOUNT', val: `₹${txn.amount}`, sub: 'RECHARGE VALUE', color: '#000', icon: 'credit-card-outline' },
    { label: 'STATUS', val: txn.status.toUpperCase(), sub: 'CURRENT POOL', color: st.color, icon: 'pulse' },
    { label: 'COMMISSION', val: `₹${comm.toFixed(2)}`, sub: 'YIELD EARNT', color: '#3F51B5', icon: 'lightning-bolt' },
    { label: 'TDS', val: `₹${tds.toFixed(2)}`, sub: 'REGULATORY TAX', color: '#D32F2F', icon: 'shield-check-outline' },
  ];

  const auditRows = [
    { label: 'DATE', val: txn.date, icon: 'calendar-blank' },
    { label: 'USER ID', val: txn.id.slice(0, 10).toUpperCase(), icon: 'tag-outline' },
    { label: 'NAME', val: 'Agent User', icon: 'account-outline' },
    { label: 'OPERATOR / MOBILE', val: `${txn.operatorName || '---'} / ${txn.extra?.mobile || '---'}`, icon: 'cellphone' },
    { label: 'RECHARGE AMOUNT', val: `₹${txn.amount}`, icon: 'credit-card-outline' },
    { label: 'COMMISSION', val: `₹${comm.toFixed(2)}`, icon: 'lightning-bolt' },
    { label: 'TDS', val: `₹${tds.toFixed(2)}`, icon: 'shield-check-outline' },
    { label: 'STATUS', val: txn.status.toUpperCase(), icon: 'pulse', valColor: st.color },
    { label: 'DESCRIPTION', val: txn.desc || '---', icon: 'file-document-outline' },
  ];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[SH_S.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      <Animated.View style={[SH_S.sheet, { transform: [{ translateY: slideAnim }] }]}>
        <View style={SH_S.handle} />

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>

          <View style={SH_S.auditContainer}>
            <View style={SH_S.auditHeader}>
              <View style={SH_S.auditIconBox}>
                <Icon name="microscope" size={20} color="#fff" />
              </View>
              <View>
                <Text style={SH_S.auditTitle}>TRANSACTION AUDIT</Text>
                <Text style={SH_S.auditSub}>VERIFIED LOG INFORMATION</Text>
              </View>
            </View>

            <View style={SH_S.divider} />

            <View style={SH_S.grid}>
              {auditRows.map((row, i) => (
                <View key={i} style={SH_S.gridItem}>
                  <View style={SH_S.gridIconBox}>
                    <Icon name={row.icon} size={18} color="#3F51B5" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={SH_S.gridLabel}>{row.label}</Text>
                    <Text
                      style={[SH_S.gridVal, row.valColor && { color: row.valColor }]}
                      numberOfLines={1}
                    >
                      {row.val}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        <TouchableOpacity style={SH_S.doneBtn} onPress={onClose} activeOpacity={0.8}>
          <Text style={SH_S.doneTxt}>Close Details</Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
};

const SH_S = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.4)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#F8F9FB',
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    maxHeight: SH * 0.85,
    paddingTop: 12,
  },
  handle: {
    width: 36, height: 4, backgroundColor: '#DDD',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  topCardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 10,
    justifyContent: 'center',
    marginBottom: 20,
  },
  topCard: {
    width: (SW - 32 - 10) / 2, // 2 per row
    height: 70,
    borderRadius: 14,
    padding: 10,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  topCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  topCardLabel: { fontSize: 7, fontFamily: Fonts.Bold, color: 'rgba(255,255,255,0.8)', letterSpacing: 0.3 },
  topCardVal: { fontSize: 14, fontFamily: Fonts.Bold, color: '#FFF', marginBottom: 0.5 },
  topCardSub: { fontSize: 6.5, fontFamily: Fonts.Bold, color: 'rgba(255,255,255,0.6)', letterSpacing: 0.2 },
  topCardBgIcon: { position: 'absolute', right: -6, top: 2, transform: [{ scale: 0.7 }] },

  auditContainer: {
    backgroundColor: '#FFF',
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
    elevation: 2,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10,
  },
  auditHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  auditIconBox: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: '#3F51B5',
    alignItems: 'center', justifyContent: 'center',
  },
  auditTitle: { fontSize: 14, fontFamily: Fonts.Bold, color: '#1A1D2E', letterSpacing: 0.5 },
  auditSub: { fontSize: 10, fontFamily: Fonts.Bold, color: '#94A3B8', letterSpacing: 0.3 },
  divider: { height: 1, backgroundColor: '#F1F5F9', marginBottom: 16 },

  grid: { gap: 8 },
  gridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  gridIconBox: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#EFF6FF',
    alignItems: 'center', justifyContent: 'center',
  },
  gridLabel: { fontSize: 8.5, fontFamily: Fonts.Bold, color: '#64748B', letterSpacing: 0.5, marginBottom: 2 },
  gridVal: { fontSize: 12, fontFamily: Fonts.Bold, color: '#0F172A' },

  doneBtn: {
    margin: 16,
    backgroundColor: '#3F51B5',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  doneTxt: { color: '#FFF', fontFamily: Fonts.Bold, fontSize: 15 },
});

// ══════════════════════════════════════════════════════════════════════════════
//  TRANSACTION CARD
// ══════════════════════════════════════════════════════════════════════════════
const CATEGORY_ICON = {
  Recharge: 'cellphone',
  DMT: 'bank-transfer',
  Aeps: 'fingerprint',
  BBPS: 'lightning-bolt',
};

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
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={[TC.card, { borderColor: cfg.bg }]}>
        {/* Left Status Bar */}
        <View style={[TC.bar, { backgroundColor: cfg.color }]} />

        <View style={TC.inner}>
          {/* Decorative BG flourish */}
          <View style={TC.bgIcon}>
            <Icon name={catIcon} size={70} color={`${cfg.color}06`} />
          </View>

          <View style={TC.mainRow}>
            {/* Category Icon */}
            <View style={[TC.iconBox, { backgroundColor: `${cfg.color}08`, borderColor: `${cfg.color}15` }]}>
              <Icon name={catIcon} size={18} color={cfg.color} />
            </View>

            <View style={TC.centerCol}>
              <Text style={TC.title} numberOfLines={1}>{txn.desc}</Text>
              <Text style={TC.refId}>ID: {txn.id}</Text>
            </View>

            <View style={TC.rightCol}>
              <View style={[TC.statusBadge, { backgroundColor: cfg.color, borderColor: cfg.color }]}>
                 <Icon name={cfg.icon} size={10} color="#FFF" style={{ marginRight: 4 }} />
                 <Text style={[TC.statusTxt, { color: '#FFF' }]}>{cfg.label.toUpperCase()}</Text>
              </View>
              <Text style={[TC.amount, { color: amtColor }]}>
                {amtPrefix}{Number(txn.amount).toLocaleString('en-IN')}
              </Text>
              <Text style={TC.dateTxt}>{txn.date}</Text>
            </View>
          </View>

          {/* Feature Strip (Refund/Commission) — Clean Text Style (No Box) */}
          {(extra.isRefunded || (isSuccess && extra.netCommission > 0)) && (
            <View style={TC.featureRow}>
              {extra.isRefunded && (
                <View style={TC.plainItem}>
                  <Icon name="keyboard-return" size={12} color="#4338CA" style={{ marginRight: 4 }} />
                  <Text style={[TC.plainTxt, { color: '#3730A3' }]}>Refunded</Text>
                </View>
              )}
              {isSuccess && extra.netCommission > 0 && (
                <View style={TC.plainItem}>
                  <Icon name="medal-outline" size={13} color="#059669" style={{ marginRight: 4 }} />
                  <Text style={[TC.plainTxt, { color: '#065F46' }]}>
                    Earned ₹{extra.netCommission.toFixed(2)}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const TC = StyleSheet.create({
  card: {
    backgroundColor: D.cardBg,
    borderRadius: 16,
    marginBottom: 10,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1.2,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  bar: { width: 4.5 },
  inner: { flex: 1, padding: 12, position: 'relative' },
  bgIcon: { position: 'absolute', right: -6, top: -6, zIndex: 0 },
  
  mainRow: { flexDirection: 'row', alignItems: 'center', zIndex: 1 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.2 },
  centerCol: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  title: { fontSize: 13, fontFamily: Fonts.Bold, color: D.textPri, marginBottom: 3 },
  refId: { fontSize: 10, fontFamily: Fonts.Medium, color: D.textMuted },
  
  rightCol: { alignItems: 'flex-end', justifyContent: 'center' },
  statusBadge: { 
    flexDirection: 'row', alignItems: 'center', 
    paddingHorizontal: 8, paddingVertical: 4, 
    borderRadius: 8, marginBottom: 8 
  },
  statusTxt: { fontSize: 8.5, fontFamily: Fonts.Bold, letterSpacing: 0.8 },

  amount: { fontSize: 16, fontFamily: Fonts.Bold, letterSpacing: -0.4, marginBottom: 3 },
  dateTxt: { fontSize: 9.5, fontFamily: Fonts.Medium, color: D.textMuted },

  featureRow: { 
    flexDirection: 'row', marginTop: 10, paddingTop: 10, 
    borderTopWidth: 1, borderTopColor: '#F1F5F9', gap: 14
  },
  plainItem: { flexDirection: 'row', alignItems: 'center' },
  plainTxt: { fontSize: 10.5, fontFamily: Fonts.Bold, letterSpacing: -0.1 },
});

// ══════════════════════════════════════════════════════════════════════════════
//  STATUS FILTER CHIPS
//  ─ Fixed height pill style.
//  ─ Spacing above & below controlled via marginTop / marginBottom on the
//    ScrollView wrapper (CHI.container), NOT on the row itself, so the
//    horizontal ScrollView never clips the chip shadows.
// ══════════════════════════════════════════════════════════════════════════════
const CHIP_HEIGHT = 28;

const StatusChips = ({ value, onChange }) => {
  const chips = [
    { key: 'All', label: 'All', icon: 'view-list-outline' },
    { key: 'Success', label: 'Success', icon: 'check-circle-outline' },
    { key: 'Pending', label: 'Pending', icon: 'clock-outline' },
    { key: 'Failed', label: 'Failed', icon: 'close-circle-outline' },
  ];

  return (
    // ── Outer wrapper governs the vertical breathing room ──────────────────
    <View style={CHI.container}>
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
    </View>
  );
};

const CHI = StyleSheet.create({
  // ── Controls ALL vertical spacing around the chip strip ──────────────────
  container: {
    marginTop: 10,      // gap between search bar  ↑  and chips
    marginBottom: 10,   // gap between chips        ↓  and summary strip
  },
  row: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 2,   // tiny vertical inset so chip shadows aren't clipped
    gap: 7,
    alignItems: 'center',
  },
  chip: {
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
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
});

// ══════════════════════════════════════════════════════════════════════════════
//  SUMMARY STRIP
// ══════════════════════════════════════════════════════════════════════════════
const SummaryStrip = ({ summary }) => {
  const items = [
    { label: 'Total', value: summary.total, color: D.textPri },
    { label: 'Success', value: summary.success, color: D.green },
    { label: 'Pending', value: summary.pending, color: D.amber },
    { label: 'Failed', value: summary.failed, color: D.red },
    {
      label: 'Amount',
      value: `₹${summary.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`,
      color: D.brand,
    },
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
    marginHorizontal: 16,
    marginBottom: 10,
    borderRadius: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: D.border,
    elevation: 2,
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4,
  },
  cell: { flex: 1, alignItems: 'center' },
  value: { fontSize: 13, fontFamily: Fonts.Bold, includeFontPadding: false, marginBottom: 2 },
  label: {
    fontSize: 9, fontFamily: Fonts.Bold, color: D.textMuted,
    letterSpacing: 0.4, textTransform: 'uppercase', includeFontPadding: false,
  },
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
    if (!tabCfg?.fetchFn) {
      setTabData(prev => ({ ...prev, [tabValue]: [] }));
      return;
    }
    setLoadingTab(true);
    setErrorTab(null);
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
    } finally {
      setLoadingTab(false);
    }
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
        if (toDate) {
          const end = new Date(toDate);
          end.setHours(23, 59, 59, 999);
          if (d > end) return false;
        }
        return true;
      });
    } else if (dateFilter !== 'All Time') {
      const start = dateRangeStart(dateFilter);
      if (start) list = list.filter(t => { const d = parseDisplayDate(t.date); return d ? d >= start : true; });
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(t =>
        t.id.toLowerCase().includes(q) ||
        t.desc.toLowerCase().includes(q) ||
        t.amount.includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.status.toLowerCase().includes(q)
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

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={S.hBtn} activeOpacity={0.7}>
          <Icon name="arrow-left" size={18} color="#fff" />
        </TouchableOpacity>
        <Text style={S.hTitle}>Transactions</Text>
        <View style={S.hBtn} />
      </View>

      {/* ── Tab bar ────────────────────────────────────────────────────────── */}
      <View style={S.tabBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={S.tabScroll}
        >
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

      {/* ── Search ─────────────────────────────────────────────────────────── */}
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
          <TouchableOpacity
            onPress={() => setSearch('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="close-circle" size={15} color={D.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Status chips — spacing managed by CHI.container ────────────────── */}
      <StatusChips value={statusFilter} onChange={setStatusFilter} />

      {/* ── Summary strip ──────────────────────────────────────────────────── */}
      <SummaryStrip summary={summary} />

      {/* ── Body ───────────────────────────────────────────────────────────── */}
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

      {/* ── Date picker ────────────────────────────────────────────────────── */}
      {pickerVisible && (
        <DateTimePicker
          value={pickerMode === 'from' ? (fromDate || new Date()) : (toDate || new Date())}
          mode="date"
          display="calendar"
          maximumDate={new Date()}
          onChange={(_, selected) => {
            setPickerVisible(false);
            if (!selected) return;
            pickerMode === 'from' ? setFromDate(selected) : setToDate(selected);
          }}
        />
      )}

      {/* ── Transaction detail sheet ────────────────────────────────────────── */}
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
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 8,
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
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 2,
  },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: D.brand },
  tabTxt: { fontSize: 13, fontFamily: Fonts.Medium, color: D.textMuted },
  tabTxtActive: { fontFamily: Fonts.Bold, color: D.brand },
  soonDot: {
    width: 5, height: 5, borderRadius: 3,
    backgroundColor: D.amber, marginLeft: 4, marginBottom: 6,
  },

  // Search
  // marginBottom removed here — CHI.container.marginTop handles the gap below
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.cardBg,
    marginHorizontal: 16,
    marginTop: 10,
    // ↓ intentionally no marginBottom — StatusChips container handles spacing above chips
    paddingHorizontal: 12, height: 42,
    borderRadius: 10, borderWidth: 1, borderColor: D.border,
    elevation: 2,
    shadowColor: D.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4,
  },
  searchInput: {
    flex: 1, fontSize: 13,
    fontFamily: Fonts.Medium, color: D.textPri, padding: 0,
  },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 40 },

  // States
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  centerTxt: { marginTop: 12, fontSize: 13, fontFamily: Fonts.Medium, color: D.textMuted },
  errorIcon: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: D.redSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  errorTitle: { fontSize: 15, fontFamily: Fonts.Bold, color: D.textPri, marginBottom: 6 },
  errorSub: {
    fontSize: 13, fontFamily: Fonts.Medium, color: D.textMuted,
    textAlign: 'center', marginHorizontal: 32, marginBottom: 20,
  },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.headerBg,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
  },
  retryTxt: { fontSize: 13, fontFamily: Fonts.Bold, color: '#fff' },
});