// WalletTransactionScreen.js
// Clean SaaS UI — all colors sourced from Colors.js — responsive — API-wired

import React, {
  useState, useRef, useEffect, useCallback, useMemo,
} from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Animated, StatusBar, Alert, Dimensions,
  ActivityIndicator, Share, Modal, ScrollView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../constants/Colors';
import Fonts from '../constants/Fonts';
import { getWalletReport } from '../api/AuthApi';

// ─── Responsive helpers ───────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get('window');
const BASE_W = 390;
const BASE_H = 844;
const sc = (s) => Math.round((SW / BASE_W) * s);
const vs = (s) => Math.round((SH / BASE_H) * s);
const rs = (s) => Math.round(Math.sqrt((SW * SH) / (BASE_W * BASE_H)) * s);

// ─── Design tokens — sourced entirely from Colors.js ────────────────────────
const T = {
  // Backgrounds
  pageBg: Colors.background || '#F0F4F8',
  cardBg: Colors.card_background || '#FFFFFF',
  headerBg: Colors.primary_dark || '#0F172A',
  surfaceMid: Colors.surface || '#F8FAFC',

  // Brand
  brand: Colors.primary || '#6366F1',
  brandLight: Colors.primary_light || '#EEF2FF',
  brandBorder: Colors.primary_border || '#C7D2FE',

  // Semantic
  success: Colors.success || '#10B981',
  successLight: Colors.success_light || '#D1FAE5',
  danger: Colors.danger || '#EF4444',
  dangerLight: Colors.danger_light || '#FEE2E2',
  warning: Colors.warning || '#F59E0B',
  warningLight: Colors.warning_light || '#FEF3C7',

  // Finance
  debit: Colors.debit || '#EF4444',
  debitLight: Colors.debit_light || '#FEF2F2',
  credit: Colors.credit || '#10B981',
  creditLight: Colors.credit_light || '#F0FDF4',
  accent: Colors.finance_accent || '#D97706',

  // Text
  textPri: Colors.text_primary || '#0F172A',
  textSec: Colors.text_secondary || '#334155',
  textMuted: Colors.text_muted || '#64748B',
  textHint: Colors.text_hint || '#94A3B8',

  // Borders & dividers
  border: Colors.border || '#E2E8F0',
  divider: Colors.divider || '#F1F5F9',
};

// ─── Shadow presets (cross-platform) ─────────────────────────────────────────
const shadow = {
  card: Platform.select({
    ios: {
      shadowColor: '#64748B',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 2 },
  }),
  modal: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
    },
    android: { elevation: 24 },
  }),
  header: Platform.select({
    ios: {
      shadowColor: '#0F172A',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 8,
    },
    android: { elevation: 6 },
  }),
  strip: Platform.select({
    ios: {
      shadowColor: '#64748B',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    android: { elevation: 1 },
  }),
};

// ─── Date helpers ─────────────────────────────────────────────────────────────
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEK_DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const pad = (n) => String(n).padStart(2, '0');
const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const getFirstDay = (y, m) => new Date(y, m, 1).getDay();
const toQueryDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const formatDisplay = (d) => `${pad(d.getDate())} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
const formatApiDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ─── Filter config ────────────────────────────────────────────────────────────
const DATE_OPTIONS = [
  { key: 'this_month', label: 'This Month', icon: 'calendar-today' },
  { key: 'last_month', label: 'Last Month', icon: 'calendar-month' },
  { key: 'last_3', label: 'Last 3 Months', icon: 'calendar-range' },
  { key: 'last_6', label: 'Last 6 Months', icon: 'calendar-clock' },
];

const SERVICE_TYPES = [
  { key: 'all', label: 'All Services', icon: 'apps' },
  { key: 'recharge', label: 'Recharge', icon: 'cellphone' },
  { key: 'dmt', label: 'DMT', icon: 'bank-transfer' },
  { key: 'aeps', label: 'AEPS', icon: 'fingerprint' },
  { key: 'bbps', label: 'BBPS', icon: 'lightning-bolt' },
];

const TXN_TYPES = [
  { key: 'all', label: 'All Types', icon: 'swap-horizontal' },
  { key: 'credit', label: 'Credit', icon: 'arrow-down-circle-outline' },
  { key: 'debit', label: 'Debit', icon: 'arrow-up-circle-outline' },
  { key: 'refund', label: 'Refund', icon: 'keyboard-return' },
];

const FILTER_SECTIONS = [
  { key: 'date', label: 'DATE RANGE', icon: 'calendar-month-outline', options: DATE_OPTIONS, stateKey: 'date', defaultKey: 'this_month' },
  { key: 'service', label: 'SERVICE TYPE', icon: 'apps', options: SERVICE_TYPES, stateKey: 'service', defaultKey: 'all' },
  { key: 'txnType', label: 'TRANSACTION TYPE', icon: 'swap-horizontal', options: TXN_TYPES, stateKey: 'txnType', defaultKey: 'all' },
];

const DEFAULT_FILTERS = { date: 'this_month', service: 'all', txnType: 'all' };

const resolvePeriod = (period) => {
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth(), d = now.getDate();
  switch (period) {
    case 'this_month': return { from: new Date(y, m, 1), to: new Date(y, m, d) };
    case 'last_month': {
      const lm = m === 0 ? 11 : m - 1, ly = m === 0 ? y - 1 : y;
      return { from: new Date(ly, lm, 1), to: new Date(ly, lm, getDaysInMonth(ly, lm)) };
    }
    case 'last_3': return { from: new Date(y, m - 3, d), to: new Date(y, m, d) };
    case 'last_6': return { from: new Date(y, m - 6, d), to: new Date(y, m, d) };
    default: return { from: new Date(y, m, 1), to: new Date(y, m, d) };
  }
};

// ─── Receipt download ─────────────────────────────────────────────────────────
const downloadReceipt = async (item) => {
  try {
    const isDebit = item.type === 'debit';
    const typeLabel = isDebit ? 'DEBIT' : 'CREDIT';
    const amtPrefix = isDebit ? '- ₹' : '+ ₹';
    const dateStr = formatApiDate(item.createdAt);
    let RNHTMLtoPDF;
    try { RNHTMLtoPDF = require('react-native-html-to-pdf').default; } catch (_) { }
    if (RNHTMLtoPDF) {
      const html = `<html><head><meta charset="utf-8"/><style>
        body{font-family:Arial,sans-serif;padding:32px;color:#1a1a1a;}
        .header{text-align:center;margin-bottom:24px;border-bottom:2px solid #eee;padding-bottom:16px;}
        .title{font-size:20px;font-weight:900;color:#0F172A;}
        .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:800;
          background:${isDebit ? '#FEF2F2' : '#F0FDF4'};color:${isDebit ? '#EF4444' : '#10B981'};}
        .amount{font-size:36px;font-weight:900;color:${isDebit ? '#EF4444' : '#10B981'};margin:12px 0;}
        table{width:100%;border-collapse:collapse;margin-top:16px;}
        tr{border-bottom:1px solid #f0f0f0;}
        td{padding:10px 0;font-size:13px;}td:first-child{color:#888;width:40%;}td:last-child{font-weight:700;}
        .footer{text-align:center;margin-top:32px;font-size:10px;color:#aaa;}
      </style></head><body>
        <div class="header"><div class="title">Wallet Transaction Receipt</div><div>${dateStr}</div></div>
        <div style="text-align:center;margin:16px 0;"><div class="badge">${typeLabel}</div>
          <div class="amount">${amtPrefix}${item.amount?.toFixed(2)}</div></div>
        <table>
          <tr><td>Description</td><td>${item.description ?? '—'}</td></tr>
          <tr><td>Reference ID</td><td>${item.referenceId ?? '—'}</td></tr>
          <tr><td>Wallet</td><td>${item.wallet?.toUpperCase() ?? 'MAIN'}</td></tr>
          ${item.user ? `<tr><td>Account</td><td>${item.user.userName ?? '—'}</td></tr>` : ''}
          <tr><td>Date & Time</td><td>${dateStr}</td></tr>
          <tr><td>Opening Balance</td><td>₹${item.openingBalance?.toFixed(2) ?? '—'}</td></tr>
          <tr><td>Closing Balance</td><td>₹${item.closingBalance?.toFixed(2) ?? '—'}</td></tr>
        </table>
        <div class="footer">Generated by Wallet Ledger</div>
      </body></html>`;
      const result = await RNHTMLtoPDF.convert({
        html, fileName: `WalletReceipt_${item.referenceId ?? Date.now()}`, directory: 'Documents',
      });
      Alert.alert('Downloaded', `Saved to: ${result.filePath}`);
      return;
    }
    await Share.share({
      message: `── WALLET RECEIPT ──\nType: ${typeLabel}\nAmount: ${amtPrefix}${item.amount?.toFixed(2)}\nRef: ${item.referenceId ?? '—'}\nDate: ${dateStr}\nDesc: ${item.description ?? '—'}\nWallet: ${item.wallet?.toUpperCase() ?? 'MAIN'}\nOpening: ₹${item.openingBalance?.toFixed(2) ?? '—'}\nClosing: ₹${item.closingBalance?.toFixed(2) ?? '—'}`,
      title: 'Wallet Receipt',
    });
  } catch {
    Alert.alert('Error', 'Could not download receipt. Please try again.');
  }
};

// ══════════════════════════════════════════════════════════════════════════════
//  CALENDAR MODAL
// ══════════════════════════════════════════════════════════════════════════════
const CalendarModal = ({ visible, initialDate, title, onConfirm, onCancel }) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selDay, setSelDay] = useState(today.getDate());

  const prevVisible = useRef(false);
  useEffect(() => {
    if (visible && !prevVisible.current) {
      const d = initialDate instanceof Date ? initialDate : new Date(initialDate);
      setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); setSelDay(d.getDate());
    }
    prevVisible.current = visible;
  }, [visible]);

  const scaleA = useRef(new Animated.Value(0.96)).current;
  const opacA = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleA, { toValue: 1, friction: 9, tension: 120, useNativeDriver: true }),
        Animated.timing(opacA, { toValue: 1, duration: 200, useNativeDriver: true }),
      ]).start();
    } else { scaleA.setValue(0.96); opacA.setValue(0); }
  }, [visible]);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDay(viewYear, viewMonth);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const isToday = (d) => today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d;
  const CELL = Math.floor((SW - sc(80)) / 7);
  const CIRC = Math.max(CELL - sc(6), sc(28));

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel}>
      <View style={CAL.backdrop}>
        <Animated.View style={[CAL.sheet, { opacity: opacA, transform: [{ scale: scaleA }] }]}>
          {/* Header */}
          <View style={CAL.header}>
            <Text style={CAL.hLabel}>{title}</Text>
            <TouchableOpacity onPress={onCancel} style={CAL.closeBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Icon name="close" size={rs(13)} color={T.textMuted} />
            </TouchableOpacity>
          </View>
          {/* Month nav */}
          <View style={CAL.navRow}>
            <TouchableOpacity onPress={prevMonth} style={CAL.navBtn}>
              <Icon name="chevron-left" size={rs(18)} color={T.textPri} />
            </TouchableOpacity>
            <View style={{ alignItems: 'center' }}>
              <Text style={CAL.monthTxt}>{MONTHS_FULL[viewMonth]} {viewYear}</Text>
              <Text style={CAL.selectedTxt}>{formatDisplay(new Date(viewYear, viewMonth, selDay))}</Text>
            </View>
            <TouchableOpacity onPress={nextMonth} style={CAL.navBtn}>
              <Icon name="chevron-right" size={rs(18)} color={T.textPri} />
            </TouchableOpacity>
          </View>
          {/* Week row */}
          <View style={CAL.weekRow}>
            {WEEK_DAYS.map((d, i) => (
              <View key={d} style={[CAL.weekCell, { width: `${100 / 7}%` }]}>
                <Text style={[CAL.weekTxt, (i === 0 || i === 6) && { color: T.brand }]}>{d}</Text>
              </View>
            ))}
          </View>
          {/* Grid */}
          <View style={CAL.grid}>
            {Array.from({ length: totalCells }).map((_, i) => {
              const day = i - firstDay + 1;
              const valid = day >= 1 && day <= daysInMonth;
              const sel = valid && day === selDay;
              const tod = valid && isToday(day);
              const cellDate = new Date(viewYear, viewMonth, day);
              const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const isFuture = valid && cellDate > todayDate;
              const isWE = valid && ((firstDay + day - 1) % 7 === 0 || (firstDay + day - 1) % 7 === 6);
              return (
                <View key={i} style={{ width: `${100 / 7}%`, height: CELL + vs(4), alignItems: 'center', justifyContent: 'center', marginVertical: vs(2) }}>
                  <TouchableOpacity
                    style={{ width: CIRC, height: CIRC, borderRadius: CIRC / 2, alignItems: 'center', justifyContent: 'center' }}
                    onPress={() => valid && !isFuture && setSelDay(day)}
                    activeOpacity={valid && !isFuture ? 0.7 : 1}
                    disabled={!valid || isFuture}>
                    {sel && <View style={[CAL.selCircle, { width: CIRC, height: CIRC, borderRadius: CIRC / 2 }]} />}
                    {tod && !sel && <View style={[CAL.todayRing, { width: CIRC, height: CIRC, borderRadius: CIRC / 2 }]} />}
                    <Text style={[
                      CAL.dayTxt,
                      !valid && { color: 'transparent' },
                      isFuture && { color: T.textHint },
                      isWE && !sel && !isFuture && { color: T.brand },
                      sel && { color: '#fff', fontFamily: Fonts.Bold },
                      tod && !sel && { color: T.brand, fontFamily: Fonts.Bold },
                    ]}>
                      {valid ? day : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
          {/* Footer */}
          <View style={CAL.footer}>
            <TouchableOpacity style={CAL.cancelBtn} onPress={onCancel}>
              <Text style={CAL.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={CAL.confirmBtn}
              onPress={() => onConfirm(new Date(viewYear, viewMonth, selDay))}>
              <Icon name="check" size={rs(13)} color="#fff" style={{ marginRight: sc(6) }} />
              <Text style={CAL.confirmTxt}>Apply</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const CAL = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: sc(20) },
  sheet: { backgroundColor: T.cardBg, borderRadius: sc(20), width: '100%', overflow: 'hidden', ...shadow.modal },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: sc(18), paddingTop: vs(18), paddingBottom: vs(10) },
  hLabel: { color: T.textPri, fontSize: rs(15), fontFamily: Fonts.Bold },
  closeBtn: { width: sc(28), height: sc(28), borderRadius: sc(14), backgroundColor: T.surfaceMid, alignItems: 'center', justifyContent: 'center' },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: sc(18), paddingBottom: vs(14) },
  navBtn: { width: sc(36), height: sc(36), borderRadius: sc(10), backgroundColor: T.surfaceMid, alignItems: 'center', justifyContent: 'center' },
  monthTxt: { color: T.textPri, fontSize: rs(15), fontFamily: Fonts.Bold, textAlign: 'center' },
  selectedTxt: { color: T.textMuted, fontSize: rs(11), fontFamily: Fonts.Medium, marginTop: vs(2) },
  weekRow: { flexDirection: 'row', backgroundColor: T.surfaceMid, paddingVertical: vs(8), marginHorizontal: sc(12), borderRadius: sc(8) },
  weekCell: { alignItems: 'center' },
  weekTxt: { color: T.textMuted, fontSize: rs(10), fontFamily: Fonts.Bold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: sc(14), paddingTop: vs(8), paddingBottom: vs(4) },
  selCircle: { position: 'absolute', backgroundColor: T.brand },
  todayRing: { position: 'absolute', borderWidth: 2, borderColor: T.brand },
  dayTxt: { fontSize: rs(13), fontFamily: Fonts.Medium, color: T.textPri, zIndex: 1 },
  footer: { flexDirection: 'row', padding: sc(14), gap: sc(10), borderTopWidth: 1, borderTopColor: T.divider },
  cancelBtn: { flex: 1, paddingVertical: vs(12), borderRadius: sc(10), backgroundColor: T.surfaceMid, alignItems: 'center' },
  cancelTxt: { color: T.textSec, fontSize: rs(13), fontFamily: Fonts.Medium },
  confirmBtn: { flex: 2, flexDirection: 'row', paddingVertical: vs(12), borderRadius: sc(10), backgroundColor: T.brand, alignItems: 'center', justifyContent: 'center' },
  confirmTxt: { color: '#fff', fontSize: rs(13), fontFamily: Fonts.Bold },
});

// ══════════════════════════════════════════════════════════════════════════════
//  FILTER BOTTOM SHEET
// ══════════════════════════════════════════════════════════════════════════════
const FilterSheet = ({ visible, onClose, onApply, activeFilters }) => {
  const slideA = useRef(new Animated.Value(SH)).current;
  const backdropA = useRef(new Animated.Value(0)).current;
  const [activeSection, setActiveSection] = useState('date');
  const [local, setLocal] = useState(activeFilters);

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
  const currentSection = FILTER_SECTIONS.find(s => s.key === activeSection);

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[FST.backdrop, { opacity: backdropA }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>
      <Animated.View style={[FST.sheet, { transform: [{ translateY: slideA }] }]}>
        <View style={FST.handle} />
        {/* Header */}
        <View style={FST.header}>
          <Text style={FST.title}>Filters</Text>
          <TouchableOpacity onPress={() => setLocal(DEFAULT_FILTERS)} style={FST.resetBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="refresh" size={rs(12)} color={T.brand} style={{ marginRight: sc(4) }} />
            <Text style={FST.resetTxt}>Reset all</Text>
          </TouchableOpacity>
        </View>
        {/* Body */}
        <View style={FST.body}>
          {/* Nav sidebar */}
          <View style={FST.navCol}>
            {FILTER_SECTIONS.map(sec => {
              const isActive = activeSection === sec.key;
              const changed = local[sec.stateKey] !== DEFAULT_FILTERS[sec.stateKey];
              return (
                <TouchableOpacity key={sec.key}
                  style={[FST.navItem, isActive && FST.navItemActive]}
                  onPress={() => setActiveSection(sec.key)}
                  activeOpacity={0.7}>
                  <View style={[FST.navIconBox, isActive && { backgroundColor: T.brandLight }]}>
                    <Icon name={sec.icon} size={rs(15)} color={isActive ? T.brand : T.textMuted} />
                  </View>
                  <Text style={[FST.navTxt, isActive && FST.navTxtActive]}>
                    {sec.label.split(' ')[0]}
                  </Text>
                  {changed && <View style={FST.navDot} />}
                </TouchableOpacity>
              );
            })}
          </View>
          {/* Options panel */}
          <ScrollView style={FST.optCol} showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: vs(16) }}>
            <Text style={FST.optSectionLabel}>{currentSection?.label}</Text>
            {currentSection?.options.map((opt, i) => {
              const isSel = local[currentSection.stateKey] === opt.key;
              return (
                <TouchableOpacity key={opt.key}
                  style={[FST.optRow, isSel && FST.optRowActive,
                  i === currentSection.options.length - 1 && { borderBottomWidth: 0 }]}
                  onPress={() => setLocal(p => ({ ...p, [currentSection.stateKey]: opt.key }))}
                  activeOpacity={0.7}>
                  <View style={[FST.optIconBox, isSel && { backgroundColor: T.brandLight }]}>
                    <Icon name={opt.icon} size={rs(14)} color={isSel ? T.brand : T.textMuted} />
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
        {/* Footer */}
        <View style={FST.footer}>
          <TouchableOpacity style={FST.applyBtn} onPress={() => onApply(local)} activeOpacity={0.88}>
            <Text style={FST.applyTxt}>Apply Filters</Text>
            {activeCount > 0 && (
              <View style={FST.badge}><Text style={FST.badgeTxt}>{activeCount}</Text></View>
            )}
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

const FST = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.55)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: T.cardBg,
    borderTopLeftRadius: sc(24), borderTopRightRadius: sc(24),
    maxHeight: SH * 0.78, ...shadow.modal,
  },
  handle: { width: sc(32), height: vs(4), backgroundColor: T.border, borderRadius: 2, alignSelf: 'center', marginTop: vs(10), marginBottom: vs(2) },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: sc(20), paddingVertical: vs(14), borderBottomWidth: 1, borderBottomColor: T.divider },
  title: { fontSize: rs(17), fontFamily: Fonts.Bold, color: T.textPri },
  resetBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sc(12), paddingVertical: vs(6), borderRadius: sc(8), backgroundColor: T.brandLight },
  resetTxt: { fontSize: rs(12), fontFamily: Fonts.Bold, color: T.brand },
  body: { flexDirection: 'row', flex: 1, maxHeight: SH * 0.52 },
  // Nav sidebar
  navCol: { width: sc(82), backgroundColor: T.surfaceMid, borderRightWidth: 1, borderRightColor: T.divider, paddingTop: vs(10) },
  navItem: { paddingVertical: vs(18), alignItems: 'center', paddingHorizontal: sc(6) },
  navItemActive: { backgroundColor: T.cardBg },
  navIconBox: { width: sc(34), height: sc(34), borderRadius: sc(10), backgroundColor: T.divider, alignItems: 'center', justifyContent: 'center', marginBottom: vs(5) },
  navTxt: { fontSize: rs(9), fontFamily: Fonts.Medium, color: T.textMuted, textAlign: 'center', letterSpacing: 0.3 },
  navTxtActive: { color: T.brand, fontFamily: Fonts.Bold },
  navDot: { position: 'absolute', top: vs(12), right: sc(10), width: sc(6), height: sc(6), borderRadius: sc(3), backgroundColor: T.brand },
  // Options
  optCol: { flex: 1, paddingHorizontal: sc(14) },
  optSectionLabel: { fontSize: rs(9), fontFamily: Fonts.Bold, color: T.textMuted, letterSpacing: 1.2, marginBottom: vs(10), textTransform: 'uppercase' },
  optRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: vs(12), borderBottomWidth: 1, borderBottomColor: T.divider, gap: sc(10), borderRadius: sc(10), paddingHorizontal: sc(4) },
  optRowActive: { backgroundColor: T.brandLight, borderBottomColor: 'transparent', marginHorizontal: -sc(4), paddingHorizontal: sc(8) },
  optIconBox: { width: sc(32), height: sc(32), borderRadius: sc(9), backgroundColor: T.surfaceMid, alignItems: 'center', justifyContent: 'center' },
  optTxt: { flex: 1, fontSize: rs(13), fontFamily: Fonts.Medium, color: T.textSec },
  optTxtActive: { color: T.brand, fontFamily: Fonts.Bold },
  radioOff: { width: sc(18), height: sc(18), borderRadius: sc(9), borderWidth: 1.5, borderColor: T.border },
  radioOn: { width: sc(18), height: sc(18), borderRadius: sc(9), borderWidth: 2, borderColor: T.brand, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: sc(8), height: sc(8), borderRadius: sc(4), backgroundColor: T.brand },
  // Footer
  footer: { paddingHorizontal: sc(20), paddingTop: vs(12), paddingBottom: Platform.OS === 'ios' ? vs(34) : vs(16), borderTopWidth: 1, borderTopColor: T.divider },
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: T.headerBg, borderRadius: sc(14), paddingVertical: vs(15) },
  applyTxt: { color: '#fff', fontSize: rs(14), fontFamily: Fonts.Bold },
  badge: { marginLeft: sc(8), backgroundColor: T.brand, minWidth: sc(20), height: sc(20), borderRadius: sc(10), alignItems: 'center', justifyContent: 'center', paddingHorizontal: sc(4) },
  badgeTxt: { color: '#fff', fontSize: rs(9), fontFamily: Fonts.Bold },
});

// ══════════════════════════════════════════════════════════════════════════════
//  TRANSACTION DETAIL BOTTOM SHEET
// ══════════════════════════════════════════════════════════════════════════════
const TxnDetailSheet = ({ visible, item, onClose }) => {
  const slideA = useRef(new Animated.Value(SH)).current;
  const backdropA = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideA, { toValue: 0, bounciness: 2, speed: 14, useNativeDriver: true }),
        Animated.timing(backdropA, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideA, { toValue: SH, duration: 240, useNativeDriver: true }),
        Animated.timing(backdropA, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!item) return null;
  const isDebit = item.type === 'debit';
  const amtColor = isDebit ? T.debit : T.credit;
  const accentBg = isDebit ? T.debitLight : T.creditLight;
  const amtPrefix = isDebit ? '−₹' : '+₹';

  const rows = [
    { label: 'STATUS', val: isDebit ? 'Debited' : 'Credited', valColor: amtColor, icon: 'circle-slice-8' },
    { label: 'REFERENCE ID', val: item.referenceId ?? '—', icon: 'tag-outline' },
    { label: 'DATE & TIME', val: formatApiDate(item.createdAt), icon: 'calendar-blank' },
    { label: 'AMOUNT', val: `₹${item.amount?.toFixed(2) ?? '—'}`, valColor: amtColor, icon: 'credit-card-outline' },
    { label: 'WALLET', val: item.wallet?.toUpperCase() ?? 'MAIN', icon: 'wallet-outline' },
    { label: 'OPENING BALANCE', val: `₹${item.openingBalance?.toFixed(2) ?? '—'}`, icon: 'bank-outline' },
    { label: 'CLOSING BALANCE', val: `₹${item.closingBalance?.toFixed(2) ?? '—'}`, valColor: amtColor, icon: 'bank-check-outline' },
    ...(item.user ? [{ label: 'ACCOUNT', val: item.user.userName ?? '—', icon: 'account-outline' }] : []),
  ];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View style={[DET.backdrop, { opacity: backdropA }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>
      <Animated.View style={[DET.sheet, { transform: [{ translateY: slideA }] }]}>
        <View style={DET.handle} />
        {/* Amount hero */}
        <View style={[DET.hero, { backgroundColor: accentBg }]}>
          <View style={[DET.heroIconBox, { backgroundColor: isDebit ? T.debit + '20' : T.credit + '20' }]}>
            <Icon name={isDebit ? 'arrow-top-right' : 'arrow-bottom-left'} size={rs(22)} color={amtColor} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={DET.heroLabel} numberOfLines={1}>{item.description}</Text>
            <Text style={DET.heroRef} numberOfLines={1}>{item.referenceId}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[DET.heroAmt, { color: amtColor }]}>{amtPrefix}{item.amount?.toFixed(2)}</Text>
            <View style={[DET.heroBadge, { backgroundColor: amtColor }]}>
              <Text style={DET.heroBadgeTxt}>{isDebit ? 'DEBIT' : 'CREDIT'}</Text>
            </View>
          </View>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: vs(12) }}>
          <View style={DET.rowsContainer}>
            {rows.map((row, i) => (
              <View key={i} style={[DET.row, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
                <View style={DET.rowIconBox}>
                  <Icon name={row.icon} size={rs(13)} color={T.brand} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={DET.rowLabel}>{row.label}</Text>
                  <Text style={[DET.rowVal, row.valColor && { color: row.valColor }]} numberOfLines={1}>
                    {row.val}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <View style={DET.btnRow}>
          <TouchableOpacity style={DET.receiptBtn} onPress={() => downloadReceipt(item)} activeOpacity={0.8}>
            <Icon name="receipt" size={rs(14)} color={T.brand} style={{ marginRight: sc(6) }} />
            <Text style={DET.receiptTxt}>Download Receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={DET.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={DET.closeTxt}>Close</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

const DET = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.55)' },
  sheet: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: T.cardBg, borderTopLeftRadius: sc(24), borderTopRightRadius: sc(24), maxHeight: SH * 0.85, ...shadow.modal },
  handle: { width: sc(32), height: vs(4), backgroundColor: T.border, borderRadius: 2, alignSelf: 'center', marginTop: vs(10), marginBottom: vs(2) },
  hero: { flexDirection: 'row', alignItems: 'center', gap: sc(12), marginHorizontal: sc(16), marginVertical: vs(12), paddingHorizontal: sc(14), paddingVertical: vs(14), borderRadius: sc(16) },
  heroIconBox: { width: sc(44), height: sc(44), borderRadius: sc(13), alignItems: 'center', justifyContent: 'center' },
  heroLabel: { fontSize: rs(14), fontFamily: Fonts.Bold, color: T.textPri, marginBottom: vs(3) },
  heroRef: { fontSize: rs(10), fontFamily: Fonts.Medium, color: T.textMuted },
  heroAmt: { fontSize: rs(18), fontFamily: Fonts.Bold, letterSpacing: -0.5, marginBottom: vs(4) },
  heroBadge: { paddingHorizontal: sc(8), paddingVertical: vs(2), borderRadius: sc(6) },
  heroBadgeTxt: { fontSize: rs(8), fontFamily: Fonts.Bold, color: '#fff', letterSpacing: 0.6 },
  rowsContainer: { marginHorizontal: sc(16), marginTop: vs(4), backgroundColor: T.surfaceMid, borderRadius: sc(16), overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: vs(12), paddingHorizontal: sc(14), borderBottomWidth: 1, borderBottomColor: T.divider, gap: sc(12) },
  rowIconBox: { width: sc(30), height: sc(30), borderRadius: sc(9), backgroundColor: T.brandLight, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: rs(9), fontFamily: Fonts.Bold, color: T.textMuted, letterSpacing: 0.6, marginBottom: vs(2) },
  rowVal: { fontSize: rs(13), fontFamily: Fonts.Bold, color: T.textPri },
  btnRow: { flexDirection: 'row', paddingHorizontal: sc(16), paddingTop: vs(12), paddingBottom: Platform.OS === 'ios' ? vs(34) : vs(16), gap: sc(10) },
  receiptBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: vs(14), borderRadius: sc(13), backgroundColor: T.brandLight, borderWidth: 1.5, borderColor: T.brandBorder },
  receiptTxt: { color: T.brand, fontFamily: Fonts.Bold, fontSize: rs(13) },
  closeBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: vs(14), borderRadius: sc(13), backgroundColor: T.headerBg },
  closeTxt: { color: '#fff', fontFamily: Fonts.Bold, fontSize: rs(13) },
});

// ══════════════════════════════════════════════════════════════════════════════
//  SUMMARY STRIP
// ══════════════════════════════════════════════════════════════════════════════
const SummaryStrip = ({ data }) => {
  const totalDebit = data.filter(t => t.type === 'debit').reduce((s, t) => s + (t.amount || 0), 0);
  const totalCredit = data.filter(t => t.type === 'credit').reduce((s, t) => s + (t.amount || 0), 0);
  const cells = [
    { label: 'Transactions', value: data.length, icon: 'format-list-bulleted', color: T.brand, bg: T.brandLight },
    { label: 'Total Debits', value: `₹${totalDebit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: 'arrow-top-right', color: T.debit, bg: T.debitLight },
    { label: 'Total Credits', value: `₹${totalCredit.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`, icon: 'arrow-bottom-left', color: T.credit, bg: T.creditLight },
  ];
  return (
    <View style={SUM.wrap}>
      {cells.map((c, i) => (
        <React.Fragment key={c.label}>
          <View style={SUM.cell}>
            <View style={[SUM.iconBox, { backgroundColor: c.bg }]}>
              <Icon name={c.icon} size={rs(14)} color={c.color} />
            </View>
            <Text style={[SUM.value, { color: c.color }]}>{c.value}</Text>
            <Text style={SUM.label}>{c.label}</Text>
          </View>
          {i < cells.length - 1 && <View style={SUM.divider} />}
        </React.Fragment>
      ))}
    </View>
  );
};

const SUM = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.cardBg, marginHorizontal: sc(16), marginBottom: vs(10), borderRadius: sc(14), paddingVertical: vs(14), borderWidth: 1, borderColor: T.border, ...shadow.strip },
  cell: { flex: 1, alignItems: 'center' },
  iconBox: { width: sc(30), height: sc(30), borderRadius: sc(9), alignItems: 'center', justifyContent: 'center', marginBottom: vs(6) },
  value: { fontSize: rs(14), fontFamily: Fonts.Bold, marginBottom: vs(2) },
  label: { fontSize: rs(9), fontFamily: Fonts.Bold, color: T.textMuted, letterSpacing: 0.4 },
  divider: { width: 1, height: vs(36), backgroundColor: T.divider },
});

// ══════════════════════════════════════════════════════════════════════════════
//  ACTIVE FILTER PILLS
// ══════════════════════════════════════════════════════════════════════════════
const FilterPills = ({ filters, onRemove }) => {
  const pills = [];
  const dateOpt = DATE_OPTIONS.find(o => o.key === filters.date);
  const serviceOpt = SERVICE_TYPES.find(o => o.key === filters.service);
  const txnOpt = TXN_TYPES.find(o => o.key === filters.txnType);
  if (filters.date !== 'this_month' && dateOpt) pills.push({ key: 'date', label: dateOpt.label, icon: 'calendar-range', color: T.brand });
  if (filters.service !== 'all' && serviceOpt) pills.push({ key: 'service', label: serviceOpt.label, icon: serviceOpt.icon, color: '#7C3AED' });
  if (filters.txnType !== 'all' && txnOpt) pills.push({
    key: 'txnType', label: txnOpt.label, icon: txnOpt.icon,
    color: filters.txnType === 'credit' ? T.credit : filters.txnType === 'debit' ? T.debit : T.warning
  });
  if (!pills.length) return null;
  return (
    <View style={PIL.row}>
      {pills.map(p => (
        <View key={p.key} style={[PIL.pill, { backgroundColor: p.color + '12', borderColor: p.color + '28' }]}>
          <Icon name={p.icon} size={rs(10)} color={p.color} style={{ marginRight: sc(4) }} />
          <Text style={[PIL.txt, { color: p.color }]}>{p.label}</Text>
          <TouchableOpacity onPress={() => onRemove(p.key)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }} style={{ marginLeft: sc(5) }}>
            <Icon name="close-circle" size={rs(12)} color={p.color} />
          </TouchableOpacity>
        </View>
      ))}
    </View>
  );
};
const PIL = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: sc(6), paddingHorizontal: sc(16), marginBottom: vs(8) },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sc(10), paddingVertical: vs(5), borderRadius: sc(20), borderWidth: 1 },
  txt: { fontSize: rs(11), fontFamily: Fonts.Bold },
});

// ══════════════════════════════════════════════════════════════════════════════
//  DATE QUICK-CHIPS
// ══════════════════════════════════════════════════════════════════════════════
const DateChips = ({ value, onChange }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false}
    contentContainerStyle={DCH.row} style={DCH.container}>
    {DATE_OPTIONS.map(opt => {
      const active = value === opt.key;
      return (
        <TouchableOpacity key={opt.key} onPress={() => onChange(opt.key)} activeOpacity={0.75}
          style={[DCH.chip, active && DCH.chipActive]}>
          <Icon name={opt.icon} size={rs(11)} color={active ? '#fff' : T.textMuted} style={{ marginRight: sc(5) }} />
          <Text style={[DCH.txt, { color: active ? '#fff' : T.textSec }]}>{opt.label}</Text>
        </TouchableOpacity>
      );
    })}
  </ScrollView>
);
const DCH = StyleSheet.create({
  container: { marginVertical: vs(8) },
  row: { paddingHorizontal: sc(16), paddingVertical: vs(2), gap: sc(8), alignItems: 'center' },
  chip: { height: sc(32), flexDirection: 'row', alignItems: 'center', paddingHorizontal: sc(13), borderRadius: sc(16), borderWidth: 1, borderColor: T.border, backgroundColor: T.cardBg },
  chipActive: { backgroundColor: T.headerBg, borderColor: 'transparent' },
  txt: { fontSize: rs(12), fontFamily: Fonts.Bold },
});

// ══════════════════════════════════════════════════════════════════════════════
//  TRANSACTION CARD — no left border line, clean flat design
// ══════════════════════════════════════════════════════════════════════════════
const TransactionCard = React.memo(({ item }) => {
  const isDebit = item.type === 'debit';
  const accent = isDebit ? T.debit : T.credit;
  const accentBg = isDebit ? T.debitLight : T.creditLight;
  const prefix = isDebit ? '−₹' : '+₹';
  const typeLabel = isDebit ? 'Debit' : 'Credit';
  const typeIcon = isDebit ? 'arrow-top-right' : 'arrow-bottom-left';

  return (
    <View style={TXC.card}>
      {/* Top section */}
      <View style={TXC.top}>
        {/* Icon */}
        <View style={[TXC.iconBox, { backgroundColor: accentBg }]}>
          <Icon name={typeIcon} size={rs(18)} color={accent} />
        </View>
        {/* Description + reference */}
        <View style={TXC.mid}>
          <Text style={TXC.desc} numberOfLines={1}>{item.description}</Text>
          <Text style={TXC.ref} numberOfLines={1} ellipsizeMode="middle">
            {item.referenceId}
          </Text>
        </View>
        {/* Amount + badge + date */}
        <View style={TXC.right}>
          <Text style={[TXC.amount, { color: accent }]}>{prefix}{item.amount?.toFixed(2)}</Text>
          <View style={[TXC.badge, { backgroundColor: accentBg }]}>
            <Text style={[TXC.badgeTxt, { color: accent }]}>{typeLabel}</Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={TXC.divider} />

      {/* Bottom balance row */}
      <View style={TXC.balRow}>
        <View style={TXC.balItem}>
          <Text style={TXC.balLabel}>Opening Balance</Text>
          <Text style={TXC.balVal}>₹{item.openingBalance?.toFixed(2) ?? '—'}</Text>
        </View>
        <View style={TXC.balArrow}>
          <Icon name="arrow-right-thin" size={rs(14)} color={T.textHint} />
        </View>
        <View style={[TXC.balItem, { alignItems: 'flex-end' }]}>
          <Text style={TXC.balLabel}>Closing Balance</Text>
          <Text style={[TXC.balVal, { color: accent }]}>₹{item.closingBalance?.toFixed(2) ?? '—'}</Text>
        </View>
      </View>

      {/* Footer row: date + wallet pill */}
      <View style={TXC.footRow}>
        <Icon name="clock-outline" size={rs(10)} color={T.textHint} style={{ marginRight: sc(4) }} />
        <Text style={TXC.footDate}>{formatApiDate(item.createdAt)}</Text>
        {item.wallet && (
          <View style={TXC.walletPill}>
            <Icon name="wallet-outline" size={rs(9)} color={T.brand} style={{ marginRight: sc(3) }} />
            <Text style={TXC.walletTxt}>{item.wallet.toUpperCase()}</Text>
          </View>
        )}
      </View>
    </View>
  );
});

const TXC = StyleSheet.create({
  card: { backgroundColor: T.cardBg, borderRadius: sc(14), marginBottom: vs(10), borderWidth: 1, borderColor: T.border, ...shadow.card },
  top: { flexDirection: 'row', alignItems: 'center', padding: sc(14), gap: sc(12) },
  iconBox: { width: sc(42), height: sc(42), borderRadius: sc(12), alignItems: 'center', justifyContent: 'center' },
  mid: { flex: 1 },
  desc: { fontSize: rs(13), fontFamily: Fonts.Bold, color: T.textPri, marginBottom: vs(4) },
  ref: { fontSize: rs(10), fontFamily: Fonts.Medium, color: T.textMuted },
  right: { alignItems: 'flex-end', gap: vs(5) },
  amount: { fontSize: rs(16), fontFamily: Fonts.Bold, letterSpacing: -0.4 },
  badge: { paddingHorizontal: sc(8), paddingVertical: vs(2), borderRadius: sc(6) },
  badgeTxt: { fontSize: rs(9), fontFamily: Fonts.Bold, letterSpacing: 0.3 },
  divider: { height: 1, backgroundColor: T.divider, marginHorizontal: sc(14) },
  balRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sc(14), paddingVertical: vs(10), gap: sc(8) },
  balItem: { flex: 1 },
  balLabel: { fontSize: rs(8), fontFamily: Fonts.Medium, color: T.textHint, letterSpacing: 0.3, marginBottom: vs(2) },
  balVal: { fontSize: rs(12), fontFamily: Fonts.Bold, color: T.textPri },
  balArrow: { width: sc(24), height: sc(24), borderRadius: sc(12), backgroundColor: T.divider, alignItems: 'center', justifyContent: 'center' },
  footRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sc(14), paddingBottom: vs(10) },
  footDate: { flex: 1, fontSize: rs(10), fontFamily: Fonts.Medium, color: T.textHint },
  walletPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.brandLight, paddingHorizontal: sc(8), paddingVertical: vs(3), borderRadius: sc(8) },
  walletTxt: { fontSize: rs(9), fontFamily: Fonts.Bold, color: T.brand, letterSpacing: 0.3 },
});

// ══════════════════════════════════════════════════════════════════════════════
//  EMPTY / LOADING STATES
// ══════════════════════════════════════════════════════════════════════════════
const EmptyState = ({ message, sub }) => (
  <View style={MISC.center}>
    <View style={MISC.emptyBox}>
      <Icon name="file-search-outline" size={rs(26)} color={T.brand} />
    </View>
    <Text style={MISC.emptyTitle}>{message}</Text>
    <Text style={MISC.emptySub}>{sub}</Text>
  </View>
);

const MISC = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: vs(48) },
  emptyBox: { width: sc(64), height: sc(64), borderRadius: sc(20), backgroundColor: T.brandLight, alignItems: 'center', justifyContent: 'center', marginBottom: vs(16) },
  emptyTitle: { fontSize: rs(15), fontFamily: Fonts.Bold, color: T.textPri, marginBottom: vs(6) },
  emptySub: { fontSize: rs(13), fontFamily: Fonts.Medium, color: T.textMuted, textAlign: 'center', paddingHorizontal: sc(32) },
});

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
const WalletTransactionScreen = ({ navigation }) => {
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultTo = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const [startDate, setStartDate] = useState(defaultFrom);
  const [endDate, setEndDate] = useState(defaultTo);
  const [calVisible, setCalVisible] = useState(false);
  const [calTarget, setCalTarget] = useState('start');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const [activeFilters, setActiveFilters] = useState({ ...DEFAULT_FILTERS });
  const [detailItem, setDetailItem] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const fromRef = useRef(defaultFrom);
  const toRef = useRef(defaultTo);

  useEffect(() => { doFetch(fromRef.current, toRef.current); }, []);

  const doFetch = async (from, to) => {
    setTransactions([]); setLoading(true); setError(null); setSearched(true);
    try {
      const headerToken = await AsyncStorage.getItem('header_token');
      if (!headerToken) { setError('Session expired. Please login again.'); return; }
      const result = await getWalletReport({ from: toQueryDate(from), to: toQueryDate(to), headerToken });
      if (result?.success) {
        setTransactions(result.data || []);
      } else {
        setError(result?.message || 'Failed to fetch wallet report.');
      }
    } catch {
      setError('Network error. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const applyDates = (from, to) => {
    fromRef.current = from; toRef.current = to;
    setStartDate(from); setEndDate(to);
    doFetch(from, to);
  };

  const handleFilterApply = (newFilters) => {
    setActiveFilters(newFilters);
    setFilterVisible(false);
    const { from, to } = resolvePeriod(newFilters.date);
    applyDates(from, to);
  };

  const handleDateChip = (dateKey) => {
    setActiveFilters(f => ({ ...f, date: dateKey }));
    const { from, to } = resolvePeriod(dateKey);
    applyDates(from, to);
  };

  const handlePillRemove = (key) => {
    const newFilters = { ...activeFilters, [key]: DEFAULT_FILTERS[key] };
    setActiveFilters(newFilters);
    if (key === 'date') {
      const { from, to } = resolvePeriod('this_month');
      applyDates(from, to);
    }
  };

  const onCalConfirm = useCallback((date) => {
    if (calTarget === 'start') { fromRef.current = date; setStartDate(date); }
    else { toRef.current = date; setEndDate(date); }
    setCalVisible(false);
  }, [calTarget]);

  const filteredTxns = useMemo(() => {
    let list = [...transactions];
    if (activeFilters.txnType !== 'all')
      list = list.filter(t => t.type === activeFilters.txnType);
    if (activeFilters.service !== 'all')
      list = list.filter(t => (t.category || t.service || '').toLowerCase() === activeFilters.service);
    return list;
  }, [transactions, activeFilters]);

  const activeFilterCount = Object.keys(DEFAULT_FILTERS).reduce(
    (sum, k) => sum + (activeFilters[k] !== DEFAULT_FILTERS[k] ? 1 : 0), 0
  );

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={T.headerBg} />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={S.hBtn}
          activeOpacity={0.7} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="arrow-left" size={rs(18)} color="#fff" />
        </TouchableOpacity>

        <View style={S.hCenter}>
          <Text style={S.hTitle}>Wallet Ledger</Text>
          <Text style={S.hSub}>
            {formatDisplay(startDate)} – {formatDisplay(endDate)}
          </Text>
        </View>

        <View style={S.hRight}>
          <TouchableOpacity
            style={[S.hBtn, activeFilterCount > 0 && S.hBtnActive]}
            onPress={() => setFilterVisible(true)}
            activeOpacity={0.7}>
            <Icon name="tune-variant" size={rs(16)} color={activeFilterCount > 0 ? T.accent : 'rgba(255,255,255,0.8)'} />
            {activeFilterCount > 0 && <View style={S.hDot} />}
          </TouchableOpacity>
          <TouchableOpacity style={S.hBtn} activeOpacity={0.7}>
            <Icon name="download-outline" size={rs(16)} color="rgba(255,255,255,0.8)" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Error banner ─────────────────────────────────────────────────────── */}
      {!!error && (
        <View style={S.errorBanner}>
          <Icon name="alert-circle-outline" size={rs(15)} color={T.danger} style={{ marginRight: sc(8) }} />
          <Text style={S.errorTxt} numberOfLines={2}>{error}</Text>
          <TouchableOpacity onPress={() => doFetch(fromRef.current, toRef.current)} style={S.retryBtn}>
            <Icon name="refresh" size={rs(12)} color="#fff" style={{ marginRight: sc(3) }} />
            <Text style={S.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Date chips ───────────────────────────────────────────────────────── */}
      <DateChips value={activeFilters.date} onChange={handleDateChip} />

      {/* ── Summary strip ────────────────────────────────────────────────────── */}
      {filteredTxns.length > 0 && <SummaryStrip data={filteredTxns} />}

      {/* ── Active filter pills ──────────────────────────────────────────────── */}
      <FilterPills filters={activeFilters} onRemove={handlePillRemove} />

      {/* ── Section label ────────────────────────────────────────────────────── */}
      {searched && !loading && filteredTxns.length > 0 && (
        <View style={S.sectionRow}>
          <Text style={S.sectionTxt}>{filteredTxns.length} Transactions</Text>
        </View>
      )}

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      {loading ? (
        <View style={MISC.center}>
          <ActivityIndicator size="large" color={T.brand} />
          <Text style={[MISC.emptySub, { marginTop: vs(12) }]}>Fetching transactions…</Text>
        </View>
      ) : (
        <FlatList
          data={filteredTxns}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity activeOpacity={0.85}
              onPress={() => { setDetailItem(item); setDetailVisible(true); }}>
              <TransactionCard item={item} />
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            searched && !error
              ? <EmptyState message="No transactions found" sub="Try a different date range or adjust your filters" />
              : null
          }
          contentContainerStyle={{ paddingHorizontal: sc(16), paddingBottom: vs(40), paddingTop: vs(4) }}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews
          initialNumToRender={15}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      )}

      {/* ── Modals ───────────────────────────────────────────────────────────── */}
      <CalendarModal
        visible={calVisible}
        initialDate={calTarget === 'start' ? startDate : endDate}
        title={calTarget === 'start' ? 'Select Start Date' : 'Select End Date'}
        onConfirm={onCalConfirm}
        onCancel={() => setCalVisible(false)}
      />
      <TxnDetailSheet
        visible={detailVisible}
        item={detailItem}
        onClose={() => setDetailVisible(false)}
      />
      <FilterSheet
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={handleFilterApply}
        activeFilters={activeFilters}
      />
    </SafeAreaView>
  );
};

export default WalletTransactionScreen;

// ══════════════════════════════════════════════════════════════════════════════
//  SCREEN STYLES
// ══════════════════════════════════════════════════════════════════════════════
const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: T.pageBg },

  // Header
  header: {
    backgroundColor: T.headerBg,
    paddingHorizontal: sc(14), paddingVertical: vs(10),
    flexDirection: 'row', alignItems: 'center', gap: sc(8),
    ...shadow.header,
  },
  hBtn: { width: sc(36), height: sc(36), borderRadius: sc(10), backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' },
  hBtnActive: { backgroundColor: 'rgba(212,168,67,0.2)' },
  hCenter: { flex: 1, alignItems: 'center' },
  hTitle: { color: '#fff', fontSize: rs(16), fontFamily: Fonts.Bold, letterSpacing: 0.2 },
  hSub: { color: 'rgba(255,255,255,0.5)', fontSize: rs(10), fontFamily: Fonts.Medium, marginTop: vs(1) },
  hRight: { flexDirection: 'row', alignItems: 'center', gap: sc(6) },
  hDot: { position: 'absolute', top: sc(7), right: sc(7), width: sc(7), height: sc(7), borderRadius: sc(4), backgroundColor: T.accent, borderWidth: 1.5, borderColor: T.headerBg },

  // Error
  errorBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: T.dangerLight,
    borderLeftWidth: 3, borderLeftColor: T.danger,
    marginHorizontal: sc(16), marginTop: vs(8),
    paddingHorizontal: sc(12), paddingVertical: vs(10),
    borderRadius: sc(10),
  },
  errorTxt: { flex: 1, color: T.danger, fontSize: rs(12), fontFamily: Fonts.Medium },
  retryBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: T.danger, paddingHorizontal: sc(10), paddingVertical: vs(5), borderRadius: sc(8), marginLeft: sc(8) },
  retryTxt: { fontSize: rs(11), fontFamily: Fonts.Bold, color: '#fff' },

  // Section
  sectionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sc(16), marginBottom: vs(8) },
  sectionTxt: { fontSize: rs(11), fontFamily: Fonts.Bold, color: T.textMuted, letterSpacing: 0.3 },
});