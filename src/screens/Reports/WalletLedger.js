// WalletTransactionScreen.js — UI pixel-perfect match to provided screenshots
// All logic, API calls, date handling, refs, download helpers — UNCHANGED.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Animated, Easing, StatusBar, Dimensions,
  ActivityIndicator, Share, Modal, ScrollView, Platform, TextInput,
  RefreshControl, LayoutAnimation, UIManager, PanResponder,
} from 'react-native';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../../constants/Colors';
import Fonts from '../../constants/Fonts';
import CustomAlert, { AlertService } from '../../componets/Alerts/CustomAlert';
import { getWalletReport, getWalletBalance, getDownlineUsers } from '../../api/AuthApi';
import { fadeIn, slideUp, buttonPress, FadeSlideUp } from '../../utils/ScreenAnimations';
import HeaderBar from '../../componets/HeaderBar/HeaderBar';
import ReceiptModal from '../../componets/ReceiptModal/ReceiptModal';
import CalendarModal from '../../componets/Calendar/CalendarModal';

// ─── Responsive Scaling ───────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get('window');
const BASE_W = 390;
const BASE_H = 844;
const sc = (s) => Math.round((SW / BASE_W) * s);
const vs = (s) => Math.round((SH / BASE_H) * s);
const rs = (s) => Math.round(Math.sqrt((SW * SH) / (BASE_W * BASE_H)) * s);

// ─── Calendar sizing ──────────────────────────────────────────────────────────
const CAL_H_PAD = sc(35);
const CAL_G_PAD = sc(10);
const CELL_SIZE = Math.floor((SW - CAL_H_PAD * 2 - CAL_G_PAD * 2) / 7);
const CIRCLE_SIZE = Math.max(CELL_SIZE - sc(8), sc(28));

// ─── Filter config ────────────────────────────────────────────────────────────
const DATE_OPTIONS = [
  { key: 'this_month', label: 'This Month', icon: 'calendar-today' },
  { key: 'last_month', label: 'Last Month', icon: 'calendar-month' },
  { key: 'last_3', label: 'Last 3 Months', icon: 'calendar-range' },
  { key: 'last_6', label: 'Last 6 Months', icon: 'calendar-clock' },
  { key: 'custom', label: 'Custom Range', icon: 'calendar-edit' },
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
  { key: 'user', label: 'USER', icon: 'account-circle-outline', options: [], stateKey: 'userId', defaultKey: 'all' },
  { key: 'service', label: 'SERVICE TYPE', icon: 'apps', options: SERVICE_TYPES, stateKey: 'service', defaultKey: 'all' },
  { key: 'txnType', label: 'TRANSACTION TYPE', icon: 'swap-horizontal', options: TXN_TYPES, stateKey: 'txnType', defaultKey: 'all' },
];

const DEFAULT_FILTERS = { date: 'this_month', userId: 'all', service: 'all', txnType: 'all' };

const resolvePeriod = (period, customFrom, customTo) => {
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
    case 'custom': return { from: customFrom || new Date(y, m, 1), to: customTo || new Date(y, m, d) };
    default: return { from: new Date(y, m, 1), to: new Date(y, m, d) };
  }
};

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n) => String(n).padStart(2, '0');
const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const formatDisplay = (d) => `${pad(d.getDate())} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;

const toQueryDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// "21 Mar 2026, 18:31"  — matches screenshot 1 date format
const formatApiDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso || '—';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Download receipt — LOGIC UNCHANGED
// ─────────────────────────────────────────────────────────────────────────────
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
        .title{font-size:20px;font-weight:900;color:${Colors.primary};}.subtitle{font-size:12px;color:#888;}
        .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:800;
          background:${isDebit ? Colors.amberOpacity_10 : Colors.successOpacity_10};color:${isDebit ? Colors.hex_D97706 : Colors.success};}
        .amount{font-size:36px;font-weight:900;color:${isDebit ? Colors.hex_D97706 : Colors.success};margin:12px 0;}
        table{width:100%;border-collapse:collapse;margin-top:16px;}tr{border-bottom:1px solid #f0f0f0;}
        td{padding:10px 0;font-size:13px;}td:first-child{color:#888;width:40%;}td:last-child{font-weight:700;}
        .footer{text-align:center;margin-top:32px;font-size:10px;color:#aaa;}
      </style></head><body>
        <div class="header"><div class="title">Wallet Transaction Receipt</div><div class="subtitle">${dateStr}</div></div>
        <div style="text-align:center;margin:16px 0;"><div class="badge">${typeLabel}</div><div class="amount">${amtPrefix}${item.amount?.toFixed(2)}</div></div>
        <table>
          <tr><td>Description</td><td>${item.description ?? '—'}</td></tr>
          <tr><td>Reference ID</td><td>${item.referenceId ?? '—'}</td></tr>
          <tr><td>Wallet</td><td>${item.wallet?.toUpperCase() ?? 'MAIN'}</td></tr>
          ${item.user ? `<tr><td>Account</td><td>${item.user.userName ?? '—'}</td></tr>` : ''}
          <tr><td>Date & Time</td><td>${dateStr}</td></tr>
          <tr><td>Opening Balance</td><td>₹${item.openingBalance?.toFixed(2) ?? '—'}</td></tr>
          <tr><td>Closing Balance</td><td>₹${item.closingBalance?.toFixed(2) ?? '—'}</td></tr>
        </table>
        <div class="footer">Generated by Wallet Ledger App</div>
      </body></html>`;
      const result = await RNHTMLtoPDF.convert({ html, fileName: `WalletReceipt_${item.referenceId ?? Date.now()}`, directory: 'Documents' });
      AlertService.showAlert({
        type: 'success',
        title: 'Downloaded ✓',
        message: `Receipt saved to:\n${result.filePath}`
      });
      return;
    }
    await Share.share({
      message: `====== WALLET RECEIPT ======\nType    : ${typeLabel}\nAmount  : ${amtPrefix}${item.amount?.toFixed(2)}\nRef ID  : ${item.referenceId ?? '—'}\nDate    : ${dateStr}\nDesc    : ${item.description ?? '—'}\nWallet  : ${item.wallet?.toUpperCase() ?? 'MAIN'}\nOpening : ₹${item.openingBalance?.toFixed(2) ?? '—'}\nClosing : ₹${item.closingBalance?.toFixed(2) ?? '—'}\n============================`,
      title: 'Wallet Receipt',
    });
  } catch (err) {
    AlertService.showAlert({
      type: 'error',
      title: 'Error',
      message: 'Could not download receipt. Please try again.'
    });
  }
};


// ─── Filter Sheet Component ───────────────────────────────────────────────────
const FilterSheet = ({ visible, onClose, onApply, activeFilters, startDate, endDate, onOpenCal, userOptions }) => {
  const slideA = useRef(new Animated.Value(SH)).current;
  const backdropA = useRef(new Animated.Value(0)).current;
  const [activeSection, setActiveSection] = useState('date');
  const [local, setLocal] = useState(activeFilters);

  const sections = FILTER_SECTIONS.map(s => s.key === 'user' ? { ...s, options: userOptions } : s);

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
        {/* Header */}
        <View style={FST.header}>
          <Text style={FST.title}>Filters</Text>
          <TouchableOpacity onPress={() => setLocal(DEFAULT_FILTERS)} style={FST.resetBtn}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="refresh" size={rs(12)} color={Colors.finance_accent} style={{ marginRight: sc(4) }} />
            <Text style={FST.resetTxt}>Reset all</Text>
          </TouchableOpacity>
        </View>
        {/* Body */}
        <View style={FST.body}>
          {/* Nav sidebar */}
          <View style={FST.navCol}>
            {sections.map(sec => {
              const isActive = activeSection === sec.key;
              const changed = local[sec.stateKey] !== DEFAULT_FILTERS[sec.stateKey];
              return (
                <TouchableOpacity key={sec.key}
                  style={[FST.navItem, isActive && FST.navItemActive]}
                  onPress={() => setActiveSection(sec.key)}
                  activeOpacity={0.7}>
                  <View style={[FST.navIconBox, isActive && { backgroundColor: Colors.amberOpacity_15 }]}>
                    <Icon name={sec.icon} size={rs(15)} color={isActive ? Colors.finance_accent : (Colors.text_placeholder || "#999")} />
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

            {activeSection === 'date' && isCustomDate && (
              <View style={FST.customDateRow}>
                <DateFilterBtn label="From" date={startDate} onPress={() => onOpenCal('start')} />
                <View style={{ width: sc(8) }} />
                <DateFilterBtn label="To" date={endDate} onPress={() => onOpenCal('end')} />
              </View>
            )}

            {currentSection?.options.map((opt, i) => {
              const isSel = local[currentSection.stateKey] === opt.key;
              return (
                <TouchableOpacity key={opt.key}
                  style={[FST.optRow, isSel && FST.optRowActive]}
                  onPress={() => setLocal(p => ({ ...p, [currentSection.stateKey]: opt.key }))}
                  activeOpacity={0.7}>
                  <View style={[FST.optIconBox, isSel && { backgroundColor: Colors.goldDim }]}>
                    {opt.icon ? (
                      <Icon name={opt.icon} size={rs(14)} color={isSel ? Colors.finance_accent : (Colors.text_placeholder || "#999")} />
                    ) : (
                      <View style={{ width: rs(14), height: rs(14), borderRadius: rs(7), backgroundColor: isSel ? Colors.finance_accent : Colors.text_placeholder, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: rs(8), color: Colors.white, fontFamily: Fonts.Bold }}>{String(opt.label).charAt(0)}</Text>
                      </View>
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[FST.optTxt, isSel && FST.optTxtActive]}>{String(opt.label)}</Text>
                    {opt.subLabel && <Text style={{ fontSize: rs(10), color: Colors.text_secondary, marginTop: vs(1) }}>{String(opt.subLabel)}</Text>}
                  </View>
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
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.blackOpacity_55 },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: sc(24), borderTopRightRadius: sc(24),
    maxHeight: SH * 0.78, elevation: 24, shadowColor: Colors.black, shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.14, shadowRadius: 16,
  },
  handle: { width: sc(32), height: vs(4), backgroundColor: Colors.blackOpacity_12, borderRadius: 2, alignSelf: 'center', marginTop: vs(10), marginBottom: vs(2) },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: sc(20), paddingVertical: vs(14), borderBottomWidth: 1, borderBottomColor: Colors.border },
  title: { fontSize: rs(17), fontFamily: Fonts.Bold, color: Colors.text_primary },
  resetBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sc(12), paddingVertical: vs(6), borderRadius: sc(8), backgroundColor: Colors.amberOpacity_15 },
  resetTxt: { fontSize: rs(12), fontFamily: Fonts.Bold, color: Colors.kyc_accent },
  body: { flexDirection: 'row', flex: 1, maxHeight: SH * 0.52 },
  navCol: { width: sc(82), borderRightWidth: 1, borderRightColor: Colors.border, paddingTop: vs(10) },
  navItem: { paddingVertical: vs(18), alignItems: 'center', paddingHorizontal: sc(6) },
  navItemActive: { backgroundColor: Colors.cardBg },
  navIconBox: { width: sc(34), height: sc(34), borderRadius: sc(10), backgroundColor: Colors.surfaceMid, alignItems: 'center', justifyContent: 'center', marginBottom: vs(5) },
  navTxt: { fontSize: rs(9), fontFamily: Fonts.Medium, color: Colors.textMuted, textAlign: 'center', letterSpacing: 0.3 },
  navTxtActive: { color: Colors.kyc_accent, fontFamily: Fonts.Bold },
  navDot: { position: 'absolute', top: vs(12), right: sc(10), width: sc(6), height: sc(6), borderRadius: sc(3), backgroundColor: Colors.gold },
  optCol: { flex: 1, paddingHorizontal: sc(14) },
  optSectionLabel: { fontSize: rs(9), fontFamily: Fonts.Bold, color: Colors.textMuted, letterSpacing: 1.2, marginBottom: vs(10), textTransform: 'uppercase' },
  optRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: vs(12), gap: sc(10), borderRadius: sc(10), paddingHorizontal: sc(4) },
  optRowActive: { backgroundColor: Colors.goldDim, marginHorizontal: -sc(4), paddingHorizontal: sc(8) },
  optIconBox: { width: sc(32), height: sc(32), borderRadius: sc(9), backgroundColor: Colors.surfaceMid, alignItems: 'center', justifyContent: 'center' },
  optTxt: { flex: 1, fontSize: rs(13), fontFamily: Fonts.Medium, color: Colors.textSec },
  optTxtActive: { color: Colors.kyc_accent, fontFamily: Fonts.Bold },
  radioOff: { width: sc(18), height: sc(18), borderRadius: sc(9), borderWidth: 1.5, borderColor: Colors.border },
  radioOn: { width: sc(18), height: sc(18), borderRadius: sc(9), borderWidth: 2, borderColor: Colors.gold, alignItems: 'center', justifyContent: 'center' },
  radioInner: { width: sc(8), height: sc(8), borderRadius: sc(4), backgroundColor: Colors.gold },
  customDateRow: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(16), paddingHorizontal: sc(4) },
  footer: { paddingHorizontal: sc(20), paddingTop: vs(12), paddingBottom: Platform.OS === 'ios' ? vs(34) : vs(16), borderTopWidth: 1, borderTopColor: Colors.border },
  applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.headerBg, borderRadius: sc(14), paddingVertical: vs(15) },
  applyTxt: { color: Colors.white, fontSize: rs(14), fontFamily: Fonts.Bold },
  badge: { marginLeft: sc(8), backgroundColor: Colors.gold, minWidth: sc(20), height: sc(20), borderRadius: sc(10), alignItems: 'center', justifyContent: 'center', paddingHorizontal: sc(4) },
  badgeTxt: { color: Colors.white, fontSize: rs(9), fontFamily: Fonts.Bold },
});

const DateFilterBtn = ({ label, date, onPress }) => {
  const sa = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: sa }] }}>
      <TouchableOpacity style={S.datePill} activeOpacity={0.9}
        onPress={() => { buttonPress(sa).start(); onPress(); }}>
        <Icon name="calendar-month" size={rs(18)} color={Colors.finance_accent} style={{ marginRight: sc(8) }} />
        <View style={{ flex: 1 }}>
          <Text style={S.datePillLabel}>{label}</Text>
          <Text style={S.datePillValue}>{formatDisplay(date)}</Text>
        </View>
        <Icon name="chevron-down" size={rs(13)} color={Colors.text_placeholder} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Filter Pills Component ──────────────────────────────────────────────────
const FilterPills = ({ filters, onRemove }) => {
  const pills = [];
  const dateOpt = DATE_OPTIONS.find(o => o.key === filters.date);
  const serviceOpt = SERVICE_TYPES.find(o => o.key === filters.service);
  const txnOpt = TXN_TYPES.find(o => o.key === filters.txnType);
  if (filters.date !== 'this_month' && dateOpt) pills.push({ key: 'date', label: dateOpt.label, icon: 'calendar-range', color: Colors.gold });
  if (filters.userId !== 'all') pills.push({ key: 'userId', label: 'Specified User', icon: 'account-outline', color: Colors.amber });
  if (filters.service !== 'all' && serviceOpt) pills.push({ key: 'service', label: serviceOpt.label, icon: serviceOpt.icon, color: Colors.indigo });
  if (filters.txnType !== 'all' && txnOpt) pills.push({
    key: 'txnType', label: txnOpt.label, icon: txnOpt.icon,
    color: filters.txnType === 'credit' ? Colors.green : filters.txnType === 'debit' ? Colors.debit : Colors.gold
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
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: sc(6), paddingHorizontal: sc(16), marginBottom: vs(8), marginTop: vs(4) },
  pill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sc(10), paddingVertical: vs(5), borderRadius: sc(20), borderWidth: 1 },
  txt: { fontSize: rs(11), fontFamily: Fonts.Bold },
});

// ─── Summary Strip Component ──────────────────────────────────────────────────
const SummaryStrip = ({ data, fromDate, toDate }) => {
  const totalDebit = data.filter(t => t.type === 'debit').reduce((s, t) => s + (t.amount || 0), 0);
  const totalCredit = data.filter(t => t.type === 'credit').reduce((s, t) => s + (t.amount || 0), 0);

  return (
    <View style={SS.wrap}>
      {/* Range tag */}
      <View style={SS.rangeRow}>
        <Icon name="calendar" size={rs(14)} color={Colors.finance_accent} style={{ marginRight: sc(7) }} />
        <Text style={SS.rangeTxt}>{formatDisplay(fromDate)}  →  {formatDisplay(toDate)}</Text>
      </View>

      {/* Stats */}
      <View style={SS.statsRow}>
        <View style={SS.statItem}>
          <View style={[SS.statIcon, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
            <Icon name="arrow-up" size={rs(14)} color={Colors.blue} />
          </View>
          <Text style={[SS.statVal, { color: Colors.hex_C79A3F }]}>₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <Text style={SS.statLbl}>TOTAL DEBIT</Text>
        </View>

        <View style={SS.divider} />

        <View style={SS.statItem}>
          <View style={[SS.statIcon, { backgroundColor: 'rgba(16,185,129,0.12)' }]}>
            <Icon name="arrow-down" size={rs(14)} color={Colors.finance_success} />
          </View>
          <Text style={[SS.statVal, { color: Colors.green }]}>₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <Text style={SS.statLbl}>TOTAL CREDIT</Text>
        </View>

        <View style={SS.divider} />

        <View style={SS.statItem}>
          <View style={[SS.statIcon, { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
            <Icon name="swap-horizontal" size={rs(14)} color={Colors.text_secondary} />
          </View>
          <Text style={[SS.statVal, { color: Colors.text_primary }]}>{data.length}</Text>
          <Text style={SS.statLbl}>TRANSACTIONS</Text>
        </View>
      </View>
    </View>
  );
};
const SS = StyleSheet.create({
  wrap: { marginHorizontal: sc(14), marginBottom: vs(10), backgroundColor: Colors.white, borderRadius: sc(16), overflow: 'hidden', elevation: 2, shadowColor: Colors.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sc(16), paddingVertical: vs(10), borderBottomWidth: 1, borderBottomColor: Colors.border },
  rangeTxt: { fontSize: rs(13), fontFamily: Fonts.Bold, color: Colors.text_primary },
  statsRow: { flexDirection: 'row', paddingVertical: vs(14) },
  statItem: { flex: 1, alignItems: 'center', gap: vs(4) },
  statIcon: { width: sc(30), height: sc(30), borderRadius: sc(9), alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: rs(14), fontFamily: Fonts.Bold },
  statLbl: { fontSize: rs(8), fontFamily: Fonts.Bold, color: Colors.text_placeholder, letterSpacing: 0.5, textTransform: 'uppercase' },
  divider: { width: 1, backgroundColor: Colors.border },
});


// ─── Field ────────────────────────────────────────────────────────────────────
function Field({ label, value, mono, valueStyle }) {
  const styles = CARD_S;
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text
        style={[styles.fieldValue, mono && styles.fieldMono, valueStyle]}
        numberOfLines={1}
      >
        {String(value || '—')}
      </Text>
    </View>
  );
}

// ─── Category badge ────────────────────────────────────────────────────────────
function CategoryBadge({ label, isCredit }) {
  const styles = CARD_S;
  return (
    <View style={[styles.badge, isCredit ? styles.badgeCredit : styles.badgeDebit]}>
      <Text style={[styles.badgeText, isCredit ? styles.badgeCreditText : styles.badgeDebitText]}>
        {label}
      </Text>
    </View>
  );
}



// ─── Transaction card ─────────────────────────────────────────────────────────
function TransactionCard({ txn, onPressReceipt }) {
  const isCredit = txn.type === 'credit';
  const styles = CARD_S;

  return (
    <View style={styles.card}>

      {/* ── Dark header ── */}
      <View style={styles.cardHeader}>

        <View style={styles.headerRow}>
          <View style={styles.logoPill}>
            <Text style={styles.logoText}>{txn.logoLabel || (isCredit ? 'CR' : 'DB')}</Text>
          </View>

          <View style={styles.typeCol}>
            <Text style={[styles.typeLabel, isCredit ? styles.typeLabelCredit : styles.typeLabelDebit]}>
              {isCredit ? 'CREDIT' : 'DEBIT'}
            </Text>
            <Text style={styles.txnRef}>{txn.txnId}</Text>
          </View>

          <View style={styles.amountCol}>
            <Text style={[styles.amountVal, isCredit ? styles.amountCredit : styles.amountDebit]}>
              {txn.amountStr}
            </Text>
            <Text style={styles.amountDate}>{txn.date}</Text>
          </View>
        </View>
      </View>

      {/* ── Info body ── */}
      <View style={styles.body}>

        {/* Service + Category + Service ID */}
        <View style={[styles.section, styles.sectionRow]}>
          <View style={styles.infoCell}>
            <Field label="Service" value={txn.serviceName} />
          </View>
          <View style={styles.infoCell}>
            <Text style={styles.fieldLabel}>Category</Text>
            <CategoryBadge label={txn.serviceCategory} isCredit={isCredit} />
          </View>
          <View style={styles.infoCell}>
            <Field label="Service ID" value={txn.serviceId} mono />
          </View>
        </View>

        {/* Mobile + Operator */}
        <View style={[styles.section, styles.sectionRow]}>
          <View style={styles.infoCell}>
            <Field label="Mobile" value={txn.mobileNo} mono />
          </View>
          <View style={styles.infoCell}>
            <Field label="Operator" value={txn.operatorName || '—'} />
          </View>
        </View>

        {/* User ID + Name */}
        <View style={[styles.section, styles.sectionRow]}>
          <View style={styles.infoCell}>
            <Field label="User ID" value={txn.userId || '—'} mono />
          </View>
          <View style={styles.infoCell}>
            <Field label="User name" value={txn.userName || '—'} />
          </View>
        </View>
      </View>

      {/* ── Balance strip ── */}
      <View style={styles.statStrip}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Opening balance</Text>
          <Text style={styles.statValue}>{txn.openingBalance}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Closing balance</Text>
          <Text style={[styles.statValue, isCredit ? styles.greenText : styles.redText]}>
            {txn.closingBalance}
          </Text>
        </View>
      </View>

      {/* ── Buttons ── */}
      <View style={styles.actionRow}>
        <TouchableOpacity style={styles.btnView} activeOpacity={0.8} onPress={onPressReceipt}>
          <Icon name="eye-outline" size={16} color={Colors.white} style={{ marginRight: 8 }} />
          <Text style={styles.btnViewText}>View Statement</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────
const WalletTransactionScreen = ({ navigation }) => {
  const today = new Date();
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultTo = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  const [startDate, setStartDate] = useState(defaultFrom);
  const [endDate, setEndDate] = useState(defaultTo);
  const [calVisible, setCalVisible] = useState(false);
  const [calTarget, setCalTarget] = useState('start');

  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filterVisible, setFilterVisible] = useState(false);
  const [downlineUsers, setDownlineUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [detailItem, setDetailItem] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const startDateRef = useRef(defaultFrom);
  const endDateRef = useRef(defaultTo);

  useEffect(() => {
    loadDownline();
    const period = resolvePeriod(filters.date, startDateRef.current, endDateRef.current);
    startDateRef.current = period.from;
    endDateRef.current = period.to;
    setStartDate(period.from);
    setEndDate(period.to);
    doFetch(period.from, period.to);
  }, []);

  const loadDownline = async () => {
    try {
      const headerToken = await AsyncStorage.getItem('header_token');
      const res = await getDownlineUsers({ headerToken });
      if (res.success && res.data && res.data.children) {
        const opts = res.data.children.map(u => ({
          key: u.userName,
          label: u.fullName || u.userName,
          subLabel: `${u.role?.name || 'USER'} · ${u.userName}`
        }));
        setDownlineUsers(opts);
      }
    } catch (_) { }
  };

  const doFetch = async (from, to) => {
    const fromStr = toQueryDate(from);
    const toStr = toQueryDate(to);
    setLoading(true); setError(null); setSearched(true);
    try {
      const headerToken = await AsyncStorage.getItem('header_token');
      if (!headerToken) { setError('Session expired. Please login again.'); return; }
      const result = await getWalletReport({ from: fromStr, to: toStr, headerToken });
      if (result?.success) {
        const mappedData = (result.data || []).map(item => {
          const isDebit = item.type === 'debit';
          const amtStr = (isDebit ? '- ' : '+ ') + '₹' + (item.txnAmount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          return {
            ...item,
            id: item._id,
            amount: item.txnAmount ?? 0,
            amountStr: amtStr,
            createdAt: item.date,
            date: formatApiDate(item.date),
            description: item.message || item.serviceCategory,
            category: item.serviceCategory,
            wallet: item.serviceName || 'MAIN',
            user: { userName: item.userName, userId: item.userId },
            isRefunded: item.isRefunded === true || item.serviceCategory === 'REFUND',
            serviceName: item.message || item.serviceCategory || 'Transaction',
            serviceCategory: item.serviceCategory || 'Wallet',
            serviceId: item.referenceId || 'N/A',
            txnId: item.referenceId || 'N/A',
            mobileNo: item.mobileNo || 'N/A',
            operatorName: item.operatorName || 'N/A',
            userId: item.userId || 'N/A',
            userName: item.userName || 'N/A',
            openingBalance: '₹' + (item.openingBalance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            closingBalance: '₹' + (item.closingBalance ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            gst: '₹' + (item.gst ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            tds: '₹' + (item.tds ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            charges: '₹' + (item.charges ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }),
            walletType: item.serviceName || 'Main Wallet',
            message: item.message || item.description || 'Transaction successful.',
            logoLabel: (item.serviceCategory || (item.type === 'credit' ? 'CR' : 'DB')).substring(0, 4).toUpperCase()
          };
        });
        setTransactions(mappedData);
      } else {
        setError(result?.message || 'No transactions found.');
        setTransactions([]);
      }
    } catch (e) {
      setError('Network error. Please check your connection.');
      setTransactions([]);
    } finally { setLoading(false); setRefreshing(false); }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await doFetch(startDateRef.current, endDateRef.current);
    setRefreshing(false);
  }, []);

  const handleSearch = () => doFetch(startDateRef.current, endDateRef.current);
  const openCal = (target) => { setCalTarget(target); setCalVisible(true); };
  const onCalConfirm = (selectedDate) => {
    if (calTarget === 'start') { startDateRef.current = selectedDate; setStartDate(selectedDate); }
    else { endDateRef.current = selectedDate; setEndDate(selectedDate); }
    setCalVisible(false);
  };
  const onApplyFilters = (newFilters) => {
    setFilters(newFilters);
    setFilterVisible(false);
    const period = resolvePeriod(newFilters.date, startDateRef.current, endDateRef.current);
    startDateRef.current = period.from;
    endDateRef.current = period.to;
    setStartDate(period.from);
    setEndDate(period.to);
    doFetch(period.from, period.to);
  };
  const removeFilter = (key) => {
    onApplyFilters({ ...filters, [key]: DEFAULT_FILTERS[key] });
  };

  const filteredTransactions = transactions.filter(item => {
    if (filters.userId !== 'all' && item.userId !== filters.userId) return false;
    if (filters.service !== 'all') {
      const cat = String(item.category || '').toLowerCase();
      const srv = String(item.wallet || '').toLowerCase();
      if (!cat.includes(filters.service.toLowerCase()) && !srv.includes(filters.service.toLowerCase())) return false;
    }
    if (filters.txnType !== 'all') {
      const type = String(item.type || '').toLowerCase();
      if (filters.txnType === 'credit' && type !== 'credit') return false;
      if (filters.txnType === 'debit' && type !== 'debit') return false;
      if (filters.txnType === 'refund' && !item.isRefunded) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      if (!String(item.serviceName).toLowerCase().includes(q) && !String(item.userName).toLowerCase().includes(q) && !String(item.txnId).toLowerCase().includes(q)) return false;
    }
    return true;
  });



  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.headerBg} />
      <HeaderBar title="Wallet Ledger" onBack={() => navigation?.goBack()} />
      {!!error && (
        <View style={S.errorBanner}>
          <Icon name="alert-circle-outline" size={rs(15)} color="#DC2626" style={{ marginRight: sc(8) }} />
          <Text style={S.errorTxt}>{error}</Text>
          <TouchableOpacity onPress={() => handleSearch()} style={S.retryBtn}><Text style={S.retryTxt}>Retry</Text></TouchableOpacity>
        </View>
      )}
      <FlatList
        data={filteredTransactions}
        keyExtractor={(item, index) => item.id || item._id || `txn-${index}`}
        renderItem={({ item }) => (
          <TransactionCard
            txn={item}
            onPressReceipt={() => { navigation.navigate('WalletAudit', { txn: item }); }}
          />
        )}
        ListHeaderComponent={
          <ListHeader
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            setFilterVisible={setFilterVisible}
            filters={filters}
            removeFilter={removeFilter}
            filteredTransactions={filteredTransactions}
            startDate={startDate}
            endDate={endDate}
            searched={searched}
            loading={loading}
          />
        }
        ListEmptyComponent={searched && !loading && !error ? (
          <View style={S.emptyWrap}>
            <Icon name="file-search-outline" size={rs(52)} color={`${Colors.gold}55`} />
            <Text style={S.emptyTitle}>No transactions found</Text>
            <Text style={S.emptySub}>Try adjusting your filters</Text>
          </View>
        ) : null}
        contentContainerStyle={{ paddingBottom: vs(40) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.finance_accent} colors={[Colors.finance_accent]} />}
      />
      <CalendarModal visible={calVisible} initialDate={calTarget === 'start' ? startDate : endDate} title={calTarget === 'start' ? 'Select Start Date' : 'Select End Date'} minDate={calTarget === 'end' ? startDate : null} maxDate={new Date()} onConfirm={onCalConfirm} onCancel={() => setCalVisible(false)} />
      <ReceiptModal visible={detailVisible} onClose={() => setDetailVisible(false)} navigation={navigation} data={detailItem ? {
        status: detailItem.isRefunded ? "pending" : "success",
        title: detailItem.description, amount: detailItem.amount?.toFixed(2), date: detailItem.date, txn_ref: detailItem.txnId,
        details: [
          { label: "Status", value: detailItem.isRefunded ? 'Refunded' : (detailItem.type === 'debit' ? 'Debited' : 'Credited'), isStatusPill: true, color: detailItem.isRefunded ? Colors.finance_accent : (detailItem.type === 'debit' ? Colors.amber : Colors.finance_success) },
          { label: "Reference ID", value: detailItem.txnId ?? '—', small: true },
          { label: "Transaction Type", value: detailItem.type === 'debit' ? 'Debit' : 'Credit' },
          { label: "Wallet", value: detailItem.wallet?.toUpperCase() ?? 'MAIN' },
          { label: "Opening Bal.", value: detailItem.openingBalance ?? '₹0.00' },
          { label: "Closing Bal.", value: detailItem.closingBalance ?? '₹0.00' },
        ],
        note: detailItem.isRefunded ? "Amount has been refunded to your wallet." : "Transaction reflected in your wallet ledger."
      } : null}
      />
      <FilterSheet visible={filterVisible} activeFilters={filters} startDate={startDate} endDate={endDate} onOpenCal={openCal} userOptions={[{ key: 'all', label: 'All Users', icon: 'account-group' }, ...downlineUsers]} onClose={() => setFilterVisible(false)} onApply={onApplyFilters} />
    </SafeAreaView>
  );
};

export default WalletTransactionScreen;

const ListHeader = ({
  searchQuery,
  setSearchQuery,
  setFilterVisible,
  filters,
  removeFilter,
  filteredTransactions,
  startDate,
  endDate,
  searched,
  loading
}) => (
  <View>
    <View style={S.sfRow}>
      <View style={S.sfSearchBox}>
        <Icon name="magnify" size={rs(18)} color={Colors.hex_C79A3F} style={{ marginRight: sc(10) }} />
        <TextInput
          style={S.sfInput}
          placeholder="Search by user or service..."
          placeholderTextColor={Colors.text_placeholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {!!searchQuery && (
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="close-circle" size={rs(16)} color={Colors.text_placeholder} />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity style={S.sfFilterBtn} onPress={() => setFilterVisible(true)}>
        <View style={S.sfFilterIconBox}>
          <Icon name="tune-variant" size={rs(18)} color={Colors.kyc_accent} />
        </View>
      </TouchableOpacity>
    </View>
    <FilterPills filters={filters} onRemove={removeFilter} />
    {filteredTransactions.length > 0 && (
      <SummaryStrip data={filteredTransactions} fromDate={startDate} toDate={endDate} />
    )}
    {searched && !loading && filteredTransactions.length > 0 && (
      <View style={S.sectionRow}>
        <Icon name="format-list-bulleted" size={rs(13)} color={Colors.black} style={{ marginRight: sc(6) }} />
        <Text style={S.sectionTxt}>{filteredTransactions.length} TRANSACTIONS</Text>
        <View style={S.allPill}><Text style={S.allPillTxt}>All ▾</Text></View>
      </View>
    )}
  </View>
);

const MONO = Platform.select({ ios: 'Courier New', android: 'monospace' });
const CARD_S = StyleSheet.create({
  card: { backgroundColor: Colors.white, borderRadius: 18, borderWidth: 1, borderColor: Colors.blackOpacity_08, overflow: 'hidden', marginBottom: 14, marginHorizontal: 16 },
  cardHeader: { backgroundColor: Colors.primary, paddingHorizontal: 18, paddingVertical: 14, paddingBottom: 16 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoPill: { width: 40, height: 40, borderRadius: 10, backgroundColor: Colors.whiteOpacity_12, borderWidth: 1, borderColor: Colors.whiteOpacity_18, alignItems: 'center', justifyContent: 'center' },
  logoText: { fontSize: 10, fontWeight: '700', color: Colors.beige, letterSpacing: 0.5 },
  typeCol: { flexDirection: 'column', gap: 3 },
  typeLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  typeLabelCredit: { color: '#4ade80' },
  typeLabelDebit: { color: Colors.red },
  txnRef: { fontSize: 11, color: Colors.whiteOpacity_45, fontFamily: MONO },
  amountCol: { marginLeft: 'auto', alignItems: 'flex-end' },
  amountVal: { fontSize: 20, fontWeight: '700', letterSpacing: -0.5 },
  amountCredit: { color: '#4ade80' },
  amountDebit: { color: Colors.red },
  amountDate: { fontSize: 10, color: Colors.whiteOpacity_45, marginTop: 1 },
  body: { paddingHorizontal: 18 },
  section: { paddingVertical: 11 },
  sectionRow: { flexDirection: 'row', gap: 12 },
  infoCell: { flex: 1 },
  field: { gap: 3 },
  fieldLabel: { fontSize: 10, fontWeight: '500', color: Colors.gray_9E, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 },
  fieldValue: { fontSize: 12.5, fontWeight: '600', color: Colors.ink_main },
  fieldMono: { fontFamily: MONO, fontSize: 11.5, fontWeight: '500', color: Colors.hex_374151 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 2 },
  badgeCredit: { backgroundColor: Colors.success_light },
  badgeDebit: { backgroundColor: Colors.error_light },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeCreditText: { color: Colors.success_dark },
  badgeDebitText: { color: Colors.error_dark },
  statStrip: { flexDirection: 'row', gap: 8, padding: 12, paddingHorizontal: 18, borderTopWidth: 0, borderTopColor: Colors.blackOpacity_05 },
  statCard: { flex: 1, backgroundColor: Colors.surfaceMid, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: Colors.blackOpacity_05 },
  statLabel: { fontSize: 10, color: Colors.gray_9E, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 },
  statValue: { fontSize: 14, fontWeight: '700', color: Colors.ink_main },
  greenText: { color: Colors.success_dark },
  redText: { color: Colors.error_dark },
  actionRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 18, paddingBottom: 14, paddingTop: 2 },
  btnView: { flex: 1, flexDirection: 'row', paddingVertical: 12, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  btnViewText: { fontSize: 13, fontWeight: '700', color: Colors.white, letterSpacing: 0.3 },
});

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.pageBg },
  sfRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sc(14), marginTop: vs(14), marginBottom: vs(12), gap: sc(10) },
  sfSearchBox: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: sc(12), paddingHorizontal: sc(14), borderWidth: 1, borderColor: Colors.border },
  sfInput: { flex: 1, height: vs(46), fontSize: rs(13), color: Colors.text_primary, padding: 0, fontFamily: Fonts.Medium },
  sfFilterBtn: { width: sc(48), height: sc(48), alignItems: 'center', justifyContent: 'center' },
  sfFilterIconBox: { width: sc(44), height: sc(44), borderRadius: sc(12), backgroundColor: Colors.white, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, elevation: 2, shadowColor: Colors.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 3 },
  datePill: { flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: sc(10), paddingVertical: vs(10), paddingHorizontal: sc(10), borderWidth: 1.5, borderColor: Colors.hex_C79A3F },
  datePillLabel: { color: Colors.text_placeholder, fontSize: rs(9), fontFamily: Fonts.Medium, marginBottom: vs(1) },
  datePillValue: { color: Colors.text_primary, fontSize: rs(12), fontFamily: Fonts.Bold },
  sectionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sc(14), marginBottom: vs(8) },
  sectionTxt: { flex: 1, color: Colors.black, fontSize: rs(10), fontFamily: Fonts.Bold, letterSpacing: 0.2 },
  allPill: { backgroundColor: Colors.goldDim, borderRadius: sc(20), paddingHorizontal: sc(10), paddingVertical: vs(3), borderWidth: 1, borderColor: Colors.amberOpacity_15 },
  allPillTxt: { color: Colors.hex_C79A3F, fontSize: rs(11), fontFamily: Fonts.Bold },
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.redOpacity_10, borderLeftWidth: 4, borderLeftColor: '#DC2626', marginHorizontal: sc(16), marginTop: vs(8), paddingHorizontal: sc(12), paddingVertical: vs(8), borderRadius: sc(10) },
  errorTxt: { flex: 1, color: '#DC2626', fontSize: rs(12), fontFamily: Fonts.Medium },
  retryBtn: { marginLeft: sc(8) },
  retryTxt: { color: Colors.primary, fontSize: rs(12), fontFamily: Fonts.Bold },
  emptyWrap: { alignItems: 'center', paddingTop: vs(40), paddingBottom: vs(20) },
  emptyTitle: { color: Colors.textPri, fontSize: rs(15), fontFamily: Fonts.Bold, marginTop: vs(12), marginBottom: vs(4) },
  emptySub: { color: Colors.textMuted, fontSize: rs(12), fontFamily: Fonts.Medium, textAlign: 'center', paddingHorizontal: sc(20) },
});
