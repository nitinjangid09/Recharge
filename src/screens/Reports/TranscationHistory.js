// InvoiceScreen.js — Clean SaaS UI redesign
// StatusChips spacing fixed (above & below). All logic, API, filters, normalizers — UNCHANGED.

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Modal, Animated, Dimensions, Platform,
  RefreshControl, PanResponder,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import CalendarModal from '../../componets/Calendar/CalendarModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../constants/Colors';
import Fonts from '../../constants/Fonts';
import { getRechargeReport, getDownlineUsers } from '../../api/AuthApi';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderBar from '../../componets/HeaderBar/HeaderBar';
import ReceiptModal from '../../componets/ReceiptModal/ReceiptModal';

const { height: SH, width: SW } = Dimensions.get('window');

// ─── Responsive Scaling — matching WalletLedger ───────────────────────────────
const sc = (x) => x;
const vs = (x) => x;
const rs = (x) => x;

// ─── Design Tokens — matching WalletLedger ────────────────────────────────────
const D = {
  headerBg: Colors.slate_900,
  cardBg: Colors.white,
  surfaceMid: Colors.slate_50,
  gold: Colors.finance_accent,
  goldDim: Colors.amberOpacity_15,
  textPri: Colors.text_primary,
  textSec: Colors.text_secondary,
  textMuted: Colors.text_placeholder,
  border: Colors.border,
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
    userName: item.userName || (item.user && item.user.userName) || '',
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
  Success: { color: Colors.green, bg: Colors.greenBg, border: Colors.hub_greenDim, icon: 'check-circle-outline', label: 'Success' },
  Pending: { color: Colors.amber, bg: Colors.amberSoft, border: Colors.amberDim, icon: 'clock-outline', label: 'Pending' },
  Failed: { color: Colors.red, bg: Colors.redSoft, border: Colors.redDim, icon: 'close-circle-outline', label: 'Failed' },
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

const formatDisplay = (d) => {
  if (!d) return '';
  return `${pad(d.getDate())} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
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
//  DATE FILTER BUTTON — matches WalletLedger
// ══════════════════════════════════════════════════════════════════════════════
const DateFilterBtn = ({ label, date, onPress }) => {
  const sa = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: sa }] }}>
      <TouchableOpacity style={FST.datePill} activeOpacity={0.9}
        onPress={() => {
          Animated.sequence([
            Animated.timing(sa, { toValue: 0.95, duration: 100, useNativeDriver: true }),
            Animated.timing(sa, { toValue: 1, duration: 100, useNativeDriver: true }),
          ]).start();
          onPress();
        }}>
        <Icon name="calendar-month" size={rs(18)} color={D.gold} style={{ marginRight: sc(8) }} />
        <View style={{ flex: 1 }}>
          <Text style={FST.datePillLabel}>{label}</Text>
          <Text style={FST.datePillValue}>{formatDisplay(date)}</Text>
        </View>
        <Icon name="chevron-down" size={rs(13)} color={D.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  TRANSACTION DETAIL BOTTOM SHEET
// ══════════════════════════════════════════════════════════════════════════════


const SH_S = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.blackOpacity_45 },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.surfaceMid,
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    maxHeight: SH * 0.85,
    paddingTop: 12,
  },
  handle: {
    width: 36, height: 4, backgroundColor: Colors.gray_EB,
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
  topCardLabel: { fontSize: 7, fontFamily: Fonts.Bold, color: Colors.whiteOpacity_80, letterSpacing: 0.3 },
  topCardVal: { fontSize: 14, fontFamily: Fonts.Bold, color: Colors.white, marginBottom: 0.5 },
  topCardSub: { fontSize: 6.5, fontFamily: Fonts.Bold, color: Colors.whiteOpacity_60, letterSpacing: 0.2 },
  topCardBgIcon: { position: 'absolute', right: -6, top: 2, transform: [{ scale: 0.7 }] },

  auditContainer: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.blackOpacity_03,
    elevation: 2,
    shadowColor: Colors.black, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.03, shadowRadius: 10,
  },
  auditHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  auditIconBox: {
    width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.hub_hubIndigo,
    alignItems: 'center', justifyContent: 'center',
  },
  auditTitle: { fontSize: 14, fontFamily: Fonts.Bold, color: Colors.text_primary, letterSpacing: 0.5 },
  auditSub: { fontSize: 10, fontFamily: Fonts.Bold, color: Colors.slate_400, letterSpacing: 0.3 },
  divider: { height: 1, backgroundColor: Colors.slate_100, marginBottom: 16 },

  grid: { gap: 8 },
  gridItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.slate_50,
    borderWidth: 1,
    borderColor: Colors.slate_100,
    borderRadius: 14,
    padding: 12,
    gap: 12,
  },
  gridIconBox: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: Colors.whiteOpacity_15,
    alignItems: 'center', justifyContent: 'center',
  },
  gridLabel: { fontSize: 8.5, fontFamily: Fonts.Bold, color: Colors.slate_500, letterSpacing: 0.5, marginBottom: 2 },
  gridVal: { fontSize: 12, fontFamily: Fonts.Bold, color: Colors.slate_900 },

  doneBtn: {
    margin: 16,
    backgroundColor: Colors.hub_hubIndigo,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 34 : 20,
  },
  doneTxt: { color: Colors.white, fontFamily: Fonts.Bold, fontSize: 15 },
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
  const amtColor = isFailed ? Colors.red : Colors.green;
  const amtPrefix = isFailed ? '−₹' : '+₹';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={[TC.card]}>
        {/* Left Status Bar */}


        <View style={TC.inner}>
          {/* Decorative BG flourish */}
          <View style={TC.bgIcon}>
            <Icon name={catIcon || "circle-outline"} size={70} color={(cfg?.color || Colors.amber) + "06"} />
          </View>

          <View style={TC.mainRow}>
            {/* Category Icon */}
            <View style={[TC.iconBox, { backgroundColor: `${cfg.color}08`, borderColor: `${cfg.color}15` }]}>
              <Icon name={catIcon} size={18} color={cfg.color} />
            </View>

            <View style={TC.centerCol}>
              <Text style={TC.title} numberOfLines={1}>{String(txn.desc || "Transaction")}</Text>
              <Text style={TC.refId}>ID: {String(txn.id)}</Text>
            </View>

            <View style={TC.rightCol}>
              <View style={[TC.statusBadge, { backgroundColor: cfg?.color || Colors.amber, borderColor: cfg?.color || Colors.amber }]}>
                <Icon name={cfg?.icon || "circle-outline"} size={10} color={Colors.white} style={{ marginRight: 4 }} />
                <Text style={[TC.statusTxt, { color: Colors.white }]}>{String(cfg?.label || "Pending").toUpperCase()}</Text>
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
                  <Icon name="keyboard-return" size={12} color={Colors.hub_hubIndigo} style={{ marginRight: 4 }} />
                  <Text style={[TC.plainTxt, { color: Colors.ink2 }]}>Refunded</Text>
                </View>
              )}
              {isSuccess && extra.netCommission > 0 && (
                <View style={TC.plainItem}>
                  <Icon name="medal-outline" size={13} color={Colors.kyc_success} style={{ marginRight: 4 }} />
                  <Text style={[TC.plainTxt, { color: Colors.green_profile }]}>
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
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 10,
    flexDirection: 'row',
    overflow: 'hidden',

    elevation: 3,
    shadowColor: Colors.black,
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
  title: { fontSize: 13, fontFamily: Fonts.Bold, color: Colors.text_primary, marginBottom: 3 },
  refId: { fontSize: 10, fontFamily: Fonts.Medium, color: Colors.textMuted },

  rightCol: { alignItems: 'flex-end', justifyContent: 'center' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 8, marginBottom: 8
  },
  statusTxt: { fontSize: 8.5, fontFamily: Fonts.Bold, letterSpacing: 0.8 },

  amount: { fontSize: 16, fontFamily: Fonts.Bold, letterSpacing: -0.4, marginBottom: 3 },
  dateTxt: { fontSize: 9.5, fontFamily: Fonts.Medium, color: Colors.textMuted },

  featureRow: {
    flexDirection: 'row', marginTop: 10, paddingTop: 10,
    borderTopWidth: 1, borderTopColor: Colors.slate_100, gap: 14
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
          const activeBg = chip.key === 'All' ? Colors.headerBg : cfg?.color;
          const activeIcon = isActive ? Colors.white : (cfg?.color || Colors.text_secondary);
          const activeTxt = isActive ? Colors.white : Colors.text_secondary;
          const activeBorder = isActive ? 'transparent' : Colors.border;

          return (
            <TouchableOpacity
              key={chip.key}
              onPress={() => onChange(chip.key)}
              activeOpacity={0.72}
              style={[
                CHI.chip,
                { backgroundColor: isActive ? activeBg : Colors.white, borderColor: activeBorder },
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
const SummaryStrip = ({ summary, fromDate, toDate }) => {
  return (
    <View style={ST.wrap}>
      <View style={ST.rangeRow}>
        <Icon name="calendar-range" size={rs(14)} color={D.gold} style={{ marginRight: sc(7) }} />
        <Text style={ST.rangeTxt}>{formatDisplay(fromDate)}  →  {formatDisplay(toDate)}</Text>
      </View>
      <View style={ST.statsRow}>
        <View style={ST.statItem}>
          <Text style={[ST.statVal, { color: D.gold }]}>{summary.total}</Text>
          <Text style={ST.statLbl}>TOTAL</Text>
        </View>
        <View style={ST.div} />
        <View style={ST.statItem}>
          <Text style={[ST.statVal, { color: Colors.green }]}>{summary.success}</Text>
          <Text style={ST.statLbl}>SUCCESS</Text>
        </View>
        <View style={ST.div} />
        <View style={ST.statItem}>
          <Text style={[ST.statVal, { color: D.textPri }]}>{summary.amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
          <Text style={ST.statLbl}>AMOUNT</Text>
        </View>
      </View>
    </View>
  );
};

const ST = StyleSheet.create({
  wrap: { marginHorizontal: sc(14), marginBottom: vs(10), backgroundColor: D.cardBg, borderRadius: sc(16), overflow: 'hidden', elevation: 2, shadowColor: Colors.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sc(16), paddingVertical: vs(10), borderBottomWidth: 1, borderBottomColor: D.border },
  rangeTxt: { fontSize: rs(13), fontFamily: Fonts.Bold, color: D.textPri },
  statsRow: { flexDirection: 'row', paddingVertical: vs(12) },
  statItem: { flex: 1, alignItems: 'center', gap: vs(2) },
  statVal: { fontSize: rs(14), fontFamily: Fonts.Bold },
  statLbl: { fontSize: rs(8), fontFamily: Fonts.Bold, color: D.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  div: { width: 1, backgroundColor: D.border, height: '60%', alignSelf: 'center' },
});

// ══════════════════════════════════════════════════════════════════════════════
//  FILTER SHEET
// ══════════════════════════════════════════════════════════════════════════════
const DEFAULT_FILTERS = { date: 'Last 30 Days', userId: 'All', status: 'All' };

const FILTER_SECTIONS = [
  {
    key: 'date', label: 'DATE RANGE', icon: 'calendar-month-outline', stateKey: 'date', defaultKey: 'Last 30 Days',
    options: [
      { key: 'Last 7 Days', label: 'Last 7 Days', icon: 'calendar-today' },
      { key: 'Last 30 Days', label: 'Last 30 Days', icon: 'calendar-month' },
      { key: 'Last 3 Months', label: 'Last 3 Months', icon: 'calendar-range' },
      { key: 'Last 6 Months', label: 'Last 6 Months', icon: 'calendar-clock' },
      { key: 'custom', label: 'Custom Range', icon: 'calendar-edit' },
    ]
  },
  {
    key: 'user', label: 'USER', icon: 'account-circle-outline', stateKey: 'userId', defaultKey: 'All',
    options: []
  },
  {
    key: 'status', label: 'STATUS', icon: 'list-status', stateKey: 'status', defaultKey: 'All',
    options: [
      { key: 'All', label: 'All Statuses', icon: 'view-list-outline' },
      { key: 'Success', label: 'Success', icon: 'check-circle-outline' },
      { key: 'Pending', label: 'Pending', icon: 'clock-outline' },
      { key: 'Failed', label: 'Failed', icon: 'close-circle-outline' },
    ]
  }
];

const FilterSheet = ({ visible, onClose, onApply, activeFilters, startDate, endDate, onOpenPicker, userOptions }) => {
  const sections = FILTER_SECTIONS.map(s => s.key === 'user' ? { ...s, options: userOptions || [] } : s);
  const slideA = useRef(new Animated.Value(SH)).current;
  const backdropA = useRef(new Animated.Value(0)).current;
  const [activeSection, setActiveSection] = useState('date');
  const [local, setLocal] = useState(activeFilters);

  // ── Swipe to close logic ──────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 10,
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) slideA.setValue(dy);
      },
      onPanResponderRelease: (_, { dy }) => {
        if (dy > 120) {
          onClose();
        } else {
          Animated.spring(slideA, { toValue: 0, bounciness: 5, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      setLocal(activeFilters);
      setActiveSection('date');
      Animated.parallel([
        Animated.spring(slideA, { toValue: 0, bounciness: 2, speed: 18, useNativeDriver: true }),
        Animated.timing(backdropA, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideA, { toValue: SH, duration: 260, useNativeDriver: true }),
        Animated.timing(backdropA, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const activeCount = Object.keys(DEFAULT_FILTERS).reduce(
    (sum, k) => sum + (local[k] !== DEFAULT_FILTERS[k] ? 1 : 0), 0
  );
  const currentSection = sections.find(s => s.key === activeSection);
  const isCustomDate = local.date === 'custom';

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[FST.backdrop, { opacity: backdropA }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>
      <Animated.View
        style={[FST.sheet, { transform: [{ translateY: slideA }] }]}
        {...panResponder.panHandlers}
      >
        <View style={FST.handle} />
        <View style={FST.header}>
          <Text style={FST.title}>Filters</Text>
          <TouchableOpacity onPress={() => { setLocal(DEFAULT_FILTERS); setActiveSection('date'); }} style={FST.resetBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="refresh" size={rs(12)} color={D.gold} style={{ marginRight: sc(4) }} />
            <Text style={FST.resetTxt}>Reset all</Text>
          </TouchableOpacity>
        </View>
        <View style={FST.body}>
          <View style={FST.navCol}>
            {sections.map(sec => {
              const isActive = activeSection === sec.key;
              const changed = local[sec.stateKey] !== sec.defaultKey;
              return (
                <TouchableOpacity key={sec.key} style={[FST.navItem, isActive && FST.navItemActive]} onPress={() => setActiveSection(sec.key)} activeOpacity={0.7}>
                  <View style={[FST.navIconBox, isActive && { backgroundColor: Colors.finance_accentDim }]}>
                    <Icon name={sec.icon} size={15} color={isActive ? Colors.finance_accent : Colors.textMuted} />
                  </View>
                  <Text style={[FST.navTxt, isActive && FST.navTxtActive]}>{sec.label.split(' ')[0]}</Text>
                  {changed && <View style={FST.navDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
          <ScrollView style={FST.optCol} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 16 }}>
            <Text style={FST.optSectionLabel}>{currentSection?.label}</Text>

            {activeSection === 'date' && isCustomDate && (
              <View style={FST.customDateRow}>
                <DateFilterBtn label="From" date={startDate} onPress={() => onOpenPicker('from')} />
                <View style={{ width: sc(8) }} />
                <DateFilterBtn label="To" date={endDate} onPress={() => onOpenPicker('to')} />
              </View>
            )}

            {currentSection?.options.map(opt => {
              const isSel = local[currentSection.stateKey] === opt.key;
              return (
                <TouchableOpacity key={opt.key} style={[FST.optRow, isSel && FST.optRowActive]} onPress={() => setLocal(p => ({ ...p, [currentSection.stateKey]: opt.key }))} activeOpacity={0.7}>
                  <View style={[FST.optIconBox, isSel && { backgroundColor: Colors.finance_accentDim }]}>
                    <Icon name={opt.icon} size={14} color={isSel ? Colors.finance_accent : Colors.textMuted} />
                  </View>
                  <Text style={[FST.optTxt, isSel && FST.optTxtActive]}>{opt.label}</Text>
                  <View style={isSel ? FST.radioOn : FST.radioOff}>
                    {isSel && <View style={FST.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
        <View style={FST.footer}>
          <TouchableOpacity style={FST.applyBtn} onPress={() => onApply(local)} activeOpacity={0.88}>
            <Text style={FST.applyTxt}>Apply Filters</Text>
            {activeCount > 0 && <View style={FST.badge}><Text style={FST.badgeTxt}>{activeCount}</Text></View>}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
export default function InvoiceScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState(TABS[0].value);
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('Last 30 Days');
  const [fromDate, setFromDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() - 30); return d; });
  const [toDate, setToDate] = useState(new Date());
  const [pickerMode, setPickerMode] = useState('from');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [userIdFilter, setUserIdFilter] = useState('All');
  const [downlineUsers, setDownlineUsers] = useState([]);

  const loadDownline = async () => {
    try {
      const headerToken = await AsyncStorage.getItem('header_token');
      const res = await getDownlineUsers({ headerToken });
      if (res.success && res.data && res.data.children) {
        const opts = res.data.children.map(u => ({
          key: u.userName,
          label: u.fullName || u.userName,
          icon: 'account-outline'
        }));
        setDownlineUsers(opts);
      }
    } catch (_) { }
  };

  useEffect(() => { loadDownline(); }, []);
  const [search, setSearch] = useState('');
  const [tabData, setTabData] = useState({});
  const [loadingTab, setLoadingTab] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
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
      if (dateFilter === 'custom') {
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
      setRefreshing(false);
    }
  }, [dateFilter, fromDate, toDate]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTab(activeTab);
  }, [activeTab, loadTab]);

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

    if (dateFilter === 'custom' && (fromDate || toDate)) {
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

    if (userIdFilter !== 'All') {
      list = list.filter(t => t.userName === userIdFilter);
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

      <HeaderBar
        title="Transactions"
        onBack={() => navigation?.goBack()}
      />

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
                  color={isActive ? Colors.finance_accent : Colors.textMuted}
                  style={{ marginRight: 5 }}
                />
                <Text style={[S.tabTxt, isActive && S.tabTxtActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Search & Filter Row ───────────────────────────────────────────── */}
      <View style={S.sfRow}>
        <View style={S.sfSearchBox}>
          <Icon name="magnify" size={16} color={Colors.gray} style={{ marginRight: 8 }} />
          <TextInput
            style={S.sfInput}
            placeholder="Search transactions..."
            placeholderTextColor={Colors.gray}
            value={search}
            onChangeText={setSearch}
          />
          {!!search && (
            <TouchableOpacity
              onPress={() => setSearch('')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="close-circle" size={15} color={Colors.text_primary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={S.sfFilterBtn} activeOpacity={0.7} onPress={() => setFilterVisible(true)}>
          <View style={S.sfFilterIconBox}>
            <Icon name="tune-variant" size={18} color={Colors.finance_accent} />
          </View>
        </TouchableOpacity>
      </View>

      {/* ── Status chips — spacing managed by CHI.container ────────────────── */}
      <StatusChips value={statusFilter} onChange={setStatusFilter} />

      {/* ── Summary strip ──────────────────────────────────────────────────── */}
      <SummaryStrip summary={summary} fromDate={fromDate} toDate={toDate} />

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      {loadingTab ? (
        <View style={S.center}>
          <ActivityIndicator size="large" color={Colors.finance_accent} />
          <Text style={S.centerTxt}>Fetching transactions…</Text>
        </View>
      ) : errorTab ? (
        <View style={S.center}>
          <View style={S.errorIcon}>
            <Icon name="alert-circle-outline" size={28} color={Colors.red} />
          </View>
          <Text style={S.errorTitle}>Failed to load</Text>
          <Text style={S.errorSub}>{errorTab}</Text>
          <TouchableOpacity style={S.retryBtn} onPress={retryTab} activeOpacity={0.85}>
            <Icon name="refresh" size={14} color={Colors.white} style={{ marginRight: 6 }} />
            <Text style={S.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : !tabHasApi ? (
        <View style={S.center}>
          <View style={[S.errorIcon, { backgroundColor: Colors.finance_accentDim }]}>
            <Icon name="clock-outline" size={28} color={Colors.finance_accent} />
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => onRefresh()}
              tintColor={Colors.finance_accent}
              colors={[Colors.finance_accent]}
              progressBackgroundColor={Colors.headerBg}
            />
          }
        >
          {filtered.length === 0 ? (
            <View style={S.center}>
              <View style={[S.errorIcon, { backgroundColor: Colors.finance_accentDim }]}>
                <Icon name="file-search-outline" size={28} color={Colors.finance_accent} />
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
      <CalendarModal
        visible={pickerVisible}
        initialDate={pickerMode === 'from' ? (fromDate || new Date()) : (toDate || new Date())}
        title={pickerMode === 'from' ? 'Select Start Date' : 'Select End Date'}
        minDate={pickerMode === 'to' ? fromDate : null}
        maxDate={pickerMode === 'from' ? toDate : new Date()}
        onConfirm={(selected) => {
          setPickerVisible(false);
          if (pickerMode === 'from') setFromDate(selected);
          else setToDate(selected);
          setDateFilter('custom'); // Ensure it stays on custom when date is picked
        }}
        onCancel={() => setPickerVisible(false)}
      />

      {/* ── Filter Modal ── */}
      <FilterSheet
        visible={filterVisible}
        activeFilters={{ date: dateFilter, status: statusFilter, userId: userIdFilter }}
        startDate={fromDate}
        endDate={toDate}
        userOptions={[
          { key: 'All', label: 'All Users', icon: 'account-group' },
          ...downlineUsers
        ]}
        onClose={() => setFilterVisible(false)}
        onApply={(newF) => {
          setDateFilter(newF.date);
          setStatusFilter(newF.status);
          setUserIdFilter(newF.userId);
          setFilterVisible(false);
        }}
        onOpenPicker={(mode) => {
          setPickerMode(mode);
          setPickerVisible(true);
        }}
      />

      <ReceiptModal
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        navigation={navigation}
        data={selectedTxn ? {
          status: selectedTxn.status.toLowerCase() === "success" ? "success" : selectedTxn.status.toLowerCase() === "failed" ? "failed" : "pending",
          title: `Transaction ${selectedTxn.status}`,
          amount: selectedTxn.amount,
          date: selectedTxn.date,
          operator: selectedTxn.operatorName,
          txn_ref: selectedTxn.id,
          details: [
            { label: "Category", value: selectedTxn.category },
            { label: "Operator", value: selectedTxn.operatorName || "N/A" },
            { label: "Phone", value: selectedTxn.extra?.mobile || "N/A" },
            { label: "Commission", value: `₹${(selectedTxn.extra?.netCommission ?? 0).toFixed(2)}` },
            { label: "TDS", value: `₹${(selectedTxn.extra?.tds ?? 0).toFixed(2)}` },
            { label: "Reference ID", value: selectedTxn.id, small: true },
            {
              label: "Status",
              isStatusPill: true,
              value: selectedTxn.status,
              color: STATUS_CONFIG[selectedTxn.status]?.color || Colors.amber,
            },
          ],
          note: selectedTxn.status === "Success"
            ? "Transaction completed successfully."
            : "If amount debited and status is failed, it will be refunded shortly."
        } : null}
      />
    </SafeAreaView>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
//  SCREEN STYLES
// ══════════════════════════════════════════════════════════════════════════════
const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },

  // Header
  header: {
    backgroundColor: Colors.headerBg,
    paddingHorizontal: 16, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 8,
  },
  hBtn: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.whiteOpacity_10,
    alignItems: 'center', justifyContent: 'center',
  },
  hTitle: {
    flex: 1, textAlign: 'center',
    color: Colors.white, fontSize: 16, fontFamily: Fonts.Bold, letterSpacing: 0.3,
  },

  // Tab bar
  tabBar: { backgroundColor: Colors.cardBg, borderBottomWidth: 1, borderBottomColor: Colors.border },
  tabScroll: { paddingHorizontal: 12, alignItems: 'center' },
  tabItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 2,
  },
  tabItemActive: { borderBottomWidth: 2, borderBottomColor: Colors.finance_accent },
  tabTxt: { fontSize: 13, fontFamily: Fonts.Medium, color: Colors.textMuted },
  tabTxtActive: { fontFamily: Fonts.Bold, color: Colors.finance_accent },

  // Search & Filter
  sfRow: {
    flexDirection: 'row', alignItems: 'center',
    marginHorizontal: 16, marginTop: 10, gap: 10,
  },
  sfSearchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.white, height: 42,
    borderRadius: 10, paddingHorizontal: 12,
    borderWidth: 1, borderColor: Colors.border,
    elevation: 2, shadowColor: Colors.shadow, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 4,
  },
  sfInput: {
    flex: 1, fontSize: 13,
    fontFamily: Fonts.Medium, color: Colors.primary, padding: 0,
  },
  sfFilterBtn: {
    width: 42, height: 42, alignItems: 'center', justifyContent: 'center',
  },
  sfFilterIconBox: {
    width: 42, height: 42, borderRadius: 10, backgroundColor: Colors.white,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: Colors.border,
    elevation: 2, shadowColor: Colors.black, shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1, shadowRadius: 3,
  },

  // List
  listContent: { paddingHorizontal: 16, paddingTop: 0, paddingBottom: 40 },

  // States
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 48 },
  centerTxt: { marginTop: 12, fontSize: 13, fontFamily: Fonts.Medium, color: Colors.textMuted },
  errorIcon: {
    width: 60, height: 60, borderRadius: 18,
    backgroundColor: Colors.redSoft,
    alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  errorTitle: { fontSize: 15, fontFamily: Fonts.Bold, color: Colors.text_primary, marginBottom: 6 },
  errorSub: {
    fontSize: 13, fontFamily: Fonts.Medium, color: Colors.textMuted,
    textAlign: 'center', marginHorizontal: 32, marginBottom: 20,
  },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.headerBg,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
  },
  retryTxt: { fontSize: 13, fontFamily: Fonts.Bold, color: Colors.white },
});

const FST = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.blackOpacity_55 },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: D.cardBg,
    borderTopLeftRadius: sc(24), borderTopRightRadius: sc(24),
    maxHeight: SH * 0.78, elevation: 24, shadowColor: Colors.black, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.14, shadowRadius: 16,
  },
  handle: { width: sc(32), height: vs(4), backgroundColor: Colors.blackOpacity_12, borderRadius: 2, alignSelf: 'center', marginTop: vs(10), marginBottom: vs(2) },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: sc(20), paddingVertical: vs(14), borderBottomWidth: 1, borderBottomColor: D.border },
  title: { fontSize: rs(17), fontFamily: Fonts.Bold, color: D.textPri },
  resetBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sc(12), paddingVertical: vs(6), borderRadius: sc(8), backgroundColor: D.goldDim },
  resetTxt: { fontSize: rs(12), fontFamily: Fonts.Bold, color: D.gold },
  body: { flexDirection: 'row', flex: 1, maxHeight: SH * 0.52 },
  navCol: { width: sc(82), borderRightWidth: 1, borderRightColor: D.border, paddingTop: vs(10) },
  navItem: { paddingVertical: vs(18), alignItems: 'center', paddingHorizontal: sc(6) },
  navItemActive: { backgroundColor: D.cardBg },
  navIconBox: { width: sc(34), height: sc(34), borderRadius: sc(10), backgroundColor: D.surfaceMid, alignItems: 'center', justifyContent: 'center', marginBottom: vs(5) },
  navTxt: { fontSize: rs(9), fontFamily: Fonts.Medium, color: D.textMuted, textAlign: 'center', letterSpacing: 0.3 },
  navTxtActive: { color: D.gold, fontFamily: Fonts.Bold },
  navDot: { position: 'absolute', top: vs(12), right: sc(10), width: sc(6), height: sc(6), borderRadius: sc(3), backgroundColor: D.gold },
  optCol: { flex: 1, paddingHorizontal: sc(14) },
  optSectionLabel: { fontSize: rs(9), fontFamily: Fonts.Bold, color: D.textMuted, letterSpacing: 1.2, marginBottom: vs(10), textTransform: 'uppercase' },
  optRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: vs(12), gap: sc(10), borderRadius: sc(10), paddingHorizontal: sc(4) },
  optRowActive: { backgroundColor: D.goldDim, marginHorizontal: -sc(4), paddingHorizontal: sc(8) },
  optIconBox: { width: sc(32), height: sc(32), borderRadius: sc(9), backgroundColor: D.surfaceMid, alignItems: 'center', justifyContent: 'center' },
  optTxt: { flex: 1, fontSize: rs(13), fontFamily: Fonts.Medium, color: D.textSec },
  optTxtActive: { color: D.gold, fontFamily: Fonts.Bold },
  radioOff: { width: sc(18), height: sc(18), borderRadius: sc(9), borderWidth: 1.5, borderColor: D.border },
  radioOn: { width: sc(18), height: sc(18), borderRadius: sc(9), borderWidth: 2, borderColor: D.gold, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: sc(8), height: sc(8), borderRadius: sc(4), backgroundColor: D.gold },
  customDateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(16), paddingHorizontal: sc(4) },
  datePill: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: D.surfaceMid, borderRadius: sc(10),
    paddingVertical: vs(10), paddingHorizontal: sc(10),
    borderWidth: 1.5, borderColor: D.gold,
  },
  datePillLabel: { color: D.textMuted, fontSize: rs(9), fontFamily: Fonts.Medium, marginBottom: vs(1) },
  datePillValue: { color: D.textPri, fontSize: rs(12), fontFamily: Fonts.Bold },
  footer: { paddingHorizontal: sc(20), paddingTop: vs(12), paddingBottom: Platform.OS === 'ios' ? vs(34) : vs(16), borderTopWidth: 1, borderTopColor: D.border },
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: D.headerBg, borderRadius: sc(14), paddingVertical: vs(15) },
  applyTxt: { color: Colors.white, fontSize: rs(14), fontFamily: Fonts.Bold },
  badge: { marginLeft: sc(8), backgroundColor: D.gold, minWidth: sc(20), height: sc(20), borderRadius: sc(10), alignItems: 'center', justifyContent: 'center', paddingHorizontal: sc(4) },
  badgeTxt: { color: Colors.white, fontSize: rs(9), fontFamily: Fonts.Bold },
});
