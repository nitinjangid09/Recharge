// WalletTransactionScreen.js — UI pixel-perfect match to provided screenshots
// All logic, API calls, date handling, refs, download helpers — UNCHANGED.

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Animated, Easing, StatusBar, Alert, Dimensions,
  ActivityIndicator, Share, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../constants/Colors';
import Fonts from '../constants/Fonts';
import { getWalletReport, getWalletBalance } from '../api/AuthApi';
import { fadeIn, slideUp, buttonPress, FadeSlideUp } from '../utils/ScreenAnimations';

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

// ─── Design tokens — exact match to screenshots ───────────────────────────────
const D = {
  // Page / structural
  pageBg: '#F2EDE4',          // warm cream bg  (all 3 screenshots)
  headerBg: '#1C1C1E',          // very dark header bar
  cardBg: '#FFFFFF',          // white cards
  heroBg: '#1C1C1E',          // dark balance hero card (screenshot 2)

  // Brand accent — gold/amber
  gold: Colors.finance_accent || '#D4A843',
  goldDim: 'rgba(212,168,67,0.14)',

  // Type colours
  // CREDIT → green left bar + green badge (screenshot 3)
  green: '#16A34A',
  greenLight: '#22C55E',
  greenDim: 'rgba(22,163,74,0.13)',
  greenBg: '#F0FDF4',

  // DEBIT → amber/gold left bar + amber badge (screenshot 3)
  debit: '#D97706',          // amber for debit badge
  debitDim: 'rgba(217,119,6,0.13)',
  debitBg: '#FFFBEB',

  // Detail sheet amount colour
  amountCredit: '#16A34A',        // +₹0.95 in green  (screenshot 1)

  // Text
  textPri: '#1C1C1E',
  textSec: '#6B7280',
  textMuted: '#9CA3AF',
  border: 'rgba(0,0,0,0.07)',
};

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n) => String(n).padStart(2, '0');
const formatDisplay = (d) => `${pad(d.getDate())} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const getFirstDay = (y, m) => new Date(y, m, 1).getDay();
const toQueryDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// "21 Mar 2026, 18:31"  — matches screenshot 1 date format
const formatApiDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
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
        .title{font-size:20px;font-weight:900;color:#002E6E;}.subtitle{font-size:12px;color:#888;}
        .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:800;
          background:${isDebit ? '#FFFBEB' : '#F0FDF4'};color:${isDebit ? '#D97706' : '#16A34A'};}
        .amount{font-size:36px;font-weight:900;color:${isDebit ? '#D97706' : '#16A34A'};margin:12px 0;}
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
      Alert.alert('Downloaded ✓', `Receipt saved to:\n${result.filePath}`);
      return;
    }
    await Share.share({
      message: `====== WALLET RECEIPT ======\nType    : ${typeLabel}\nAmount  : ${amtPrefix}${item.amount?.toFixed(2)}\nRef ID  : ${item.referenceId ?? '—'}\nDate    : ${dateStr}\nDesc    : ${item.description ?? '—'}\nWallet  : ${item.wallet?.toUpperCase() ?? 'MAIN'}\nOpening : ₹${item.openingBalance?.toFixed(2) ?? '—'}\nClosing : ₹${item.closingBalance?.toFixed(2) ?? '—'}\n============================`,
      title: 'Wallet Receipt',
    });
  } catch (err) { Alert.alert('Error', 'Could not download receipt. Please try again.'); }
};

// ══════════════════════════════════════════════════════════════════════════════
//  CALENDAR MODAL — logic unchanged
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

  const scaleAnim = useRef(new Animated.Value(0.92)).current;
  const opacAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, { toValue: 1, friction: 7, tension: 90, useNativeDriver: true }),
        Animated.timing(opacAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    } else { scaleAnim.setValue(0.92); opacAnim.setValue(0); }
  }, [visible]);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDay(viewYear, viewMonth);
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const isToday = (d) => today.getFullYear() === viewYear && today.getMonth() === viewMonth && today.getDate() === d;
  const dayOfWeek = (d) => (firstDay + d - 1) % 7;
  const isWeekend = (d) => dayOfWeek(d) === 0 || dayOfWeek(d) === 6;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel}>
      <View style={cal.backdrop}>
        <Animated.View style={[cal.sheet, { opacity: opacAnim, transform: [{ scale: scaleAnim }] }]}>
          <View style={cal.header}>
            <View style={cal.headerRow1}>
              <Text style={cal.headerLabel}>{title}</Text>
              <TouchableOpacity onPress={onCancel} style={cal.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={rs(13)} color={D.textSec} />
              </TouchableOpacity>
            </View>
            <Text style={cal.selectedDateText}>{formatDisplay(new Date(viewYear, viewMonth, selDay))}</Text>
            <View style={cal.monthNavRow}>
              <TouchableOpacity onPress={prevMonth} style={cal.navBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Icon name="chevron-left" size={rs(18)} color={D.textPri} />
              </TouchableOpacity>
              <Text style={cal.monthYearTxt}>{MONTHS_FULL[viewMonth]}  {viewYear}</Text>
              <TouchableOpacity onPress={nextMonth} style={cal.navBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Icon name="chevron-right" size={rs(18)} color={D.textPri} />
              </TouchableOpacity>
            </View>
          </View>
          <View style={cal.weekRow}>
            {WEEK_DAYS.map((d, i) => (
              <View key={d} style={cal.weekCell}>
                <Text style={[cal.weekTxt, (i === 0 || i === 6) && { color: D.gold }]}>{d}</Text>
              </View>
            ))}
          </View>
          <View style={cal.grid}>
            {Array.from({ length: totalCells }).map((_, i) => {
              const day = i - firstDay + 1; const valid = day >= 1 && day <= daysInMonth;
              const sel = valid && day === selDay; const tod = valid && isToday(day);
              const isWE = valid && isWeekend(day);
              const cellDate = new Date(viewYear, viewMonth, day);
              const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const isFuture = valid && cellDate > todayDate; const selectable = valid && !isFuture;
              return (
                <View key={i} style={cal.cellOuter}>
                  <TouchableOpacity style={cal.cellInner} onPress={() => selectable && setSelDay(day)} activeOpacity={selectable ? 0.7 : 1} disabled={!selectable}>
                    {sel && <View style={cal.selCircle} />}
                    {tod && !sel && <View style={cal.todayRing} />}
                    <Text style={[cal.dayTxt, !valid && { color: 'transparent' }, isFuture && { color: '#D1D5DB' }, isWE && !sel && !isFuture && { color: D.gold }, sel && { color: '#fff', fontFamily: Fonts.Bold }, tod && !sel && { color: D.gold, fontFamily: Fonts.Bold }]}>
                      {valid ? day : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
          <View style={cal.footer}>
            <TouchableOpacity style={cal.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
              <Text style={cal.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={cal.confirmBtn} onPress={() => onConfirm(new Date(viewYear, viewMonth, selDay))} activeOpacity={0.85}>
              <Icon name="check" size={rs(14)} color="#fff" style={{ marginRight: sc(5) }} />
              <Text style={cal.confirmTxt}>Apply Date</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  TRANSACTION DETAIL BOTTOM SHEET — pixel-perfect to screenshot 1
//  • White sheet slides up
//  • Title "Recharge Commission" + "21 Mar 2026, 18:31"
//  • 💰 emoji + big green amount + sub description
//  • 5 detail rows: Status / Reference ID / Date & Time / Transaction Type / Amount
//  • Receipt (gold tinted) + Close (black) buttons
// ══════════════════════════════════════════════════════════════════════════════
const TxnDetailSheet = ({ visible, item, onClose }) => {
  const slideAnim = useRef(new Animated.Value(SH)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, bounciness: 4, speed: 14, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: SH, duration: 240, useNativeDriver: true }),
        Animated.timing(backdropAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  if (!item) return null;

  const isDebit = item.type === 'debit';
  const amtColor = isDebit ? D.debit : D.amountCredit; // green for credit (screenshot 1)
  const amtPrefix = isDebit ? '−₹' : '+₹';
  const typeLabel = isDebit ? 'Debit' : 'Credit';
  const statusTxt = isDebit ? 'Debited' : '✓ Credited';
  const statusColor = isDebit ? D.debit : D.green;
  const dateStr = formatApiDate(item.createdAt);

  // Matches screenshot 1 row order exactly
  const rows = [
    { label: 'Status', val: statusTxt, valColor: statusColor },
    { label: 'Reference ID', val: item.referenceId ?? '—', mono: true },
    { label: 'Date & Time', val: dateStr },
    { label: 'Transaction Type', val: typeLabel, bold: true },
    { label: 'Amount', val: `₹${item.amount?.toFixed(2) ?? '—'}`, valColor: amtColor, bold: true },
  ];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      {/* Dim backdrop */}
      <Animated.View style={[ds.backdrop, { opacity: backdropAnim }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
      </Animated.View>

      {/* Sheet */}
      <Animated.View style={[ds.sheet, { transform: [{ translateY: slideAnim }] }]}>
        {/* Drag handle */}
        <View style={ds.handle} />

        {/* Title + date */}
        <View style={ds.titleSection}>
          <Text style={ds.title}>{item.description}</Text>
          <Text style={ds.titleDate}>{dateStr}</Text>
        </View>
        <View style={ds.sep} />

        {/* Amount hero — 💰 emoji + big coloured amount + sub text */}
        <View style={ds.amountHero}>
          <Text style={{ fontSize: 40, marginBottom: vs(6) }}>💰</Text>
          <Text style={[ds.amountBig, { color: amtColor }]}>
            {amtPrefix}{item.amount?.toFixed(2)}
          </Text>
          <Text style={ds.amountSub}>{item.description}</Text>
        </View>

        {/* Detail rows */}
        <View style={ds.rowsWrap}>
          {rows.map((row, i) => (
            <View key={i} style={[ds.row, i === rows.length - 1 && { borderBottomWidth: 0 }]}>
              <Text style={ds.rowLabel}>{row.label}</Text>
              <Text style={[
                ds.rowVal,
                row.mono && ds.rowValMono,
                row.bold && { fontFamily: Fonts.Bold },
                row.valColor && { color: row.valColor },
              ]}>
                {row.val}
              </Text>
            </View>
          ))}
        </View>

        {/* Buttons — Receipt (gold) + Close (black) — matches screenshot 1 exactly */}
        <View style={ds.btnRow}>
          <TouchableOpacity
            style={ds.receiptBtn}
            onPress={() => downloadReceipt(item)}
            activeOpacity={0.8}
          >
            <Icon name="receipt" size={rs(15)} color={D.gold} style={{ marginRight: sc(6) }} />
            <Text style={ds.receiptTxt}>Receipt</Text>
          </TouchableOpacity>

          <TouchableOpacity style={ds.closeBtn} onPress={onClose} activeOpacity={0.85}>
            <Icon name="check" size={rs(14)} color="#fff" style={{ marginRight: sc(5) }} />
            <Text style={ds.closeTxt}>Close</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
};

// Detail sheet styles
const ds = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: D.cardBg,
    borderTopLeftRadius: sc(24), borderTopRightRadius: sc(24),
    paddingBottom: vs(36),
    elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.14, shadowRadius: 16,
  },
  handle: { width: sc(36), height: vs(4), backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 2, alignSelf: 'center', marginTop: vs(10), marginBottom: vs(14) },
  titleSection: { paddingHorizontal: sc(20), paddingBottom: vs(14) },
  title: { fontSize: rs(18), fontFamily: Fonts.Bold, color: D.textPri, marginBottom: vs(3) },
  titleDate: { fontSize: rs(12), color: D.textMuted, fontFamily: Fonts.Medium },
  sep: { height: 1, backgroundColor: D.border },
  amountHero: { alignItems: 'center', paddingVertical: vs(20) },
  amountBig: { fontSize: rs(30), fontFamily: Fonts.Bold, letterSpacing: -0.5, marginBottom: vs(4) },
  amountSub: { fontSize: rs(12), color: D.textMuted, fontFamily: Fonts.Medium, textAlign: 'center', paddingHorizontal: sc(30) },
  rowsWrap: { paddingHorizontal: sc(20) },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: vs(12), borderBottomWidth: 1, borderBottomColor: D.border,
  },
  rowLabel: { fontSize: rs(13), color: D.textMuted, fontFamily: Fonts.Regular || Fonts.Medium },
  rowVal: { fontSize: rs(13), fontFamily: Fonts.Medium, color: D.textPri, maxWidth: '58%', textAlign: 'right' },
  rowValMono: { fontFamily: Fonts.Medium, fontSize: rs(12), letterSpacing: 0.2 },
  btnRow: { flexDirection: 'row', paddingHorizontal: sc(20), paddingTop: vs(18), gap: sc(12) },
  receiptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: vs(14), borderRadius: sc(14),
    backgroundColor: D.goldDim, borderWidth: 1.5, borderColor: `${D.gold}50`,
  },
  receiptTxt: { color: D.gold, fontFamily: Fonts.Bold, fontSize: rs(14) },
  closeBtn: {
    flex: 1.6, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: vs(14), borderRadius: sc(14), backgroundColor: D.heroBg,
  },
  closeTxt: { color: '#fff', fontFamily: Fonts.Bold, fontSize: rs(14) },
});

// ══════════════════════════════════════════════════════════════════════════════
//  DATE FILTER BUTTON — matches screenshot 2
//  Calendar icon + "From" label + date value (2 lines) + chevron
// ══════════════════════════════════════════════════════════════════════════════
const DateFilterBtn = ({ label, date, onPress }) => {
  const sa = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: sa }] }}>
      <TouchableOpacity style={S.datePill} activeOpacity={0.9}
        onPress={() => { buttonPress(sa).start(); onPress(); }}>
        <Icon name="calendar-month" size={rs(18)} color={D.gold} style={{ marginRight: sc(8) }} />
        <View style={{ flex: 1 }}>
          <Text style={S.datePillLabel}>{label}</Text>
          <Text style={S.datePillValue}>{formatDisplay(date)}</Text>
        </View>
        <Icon name="chevron-down" size={rs(13)} color={D.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  QUICK ACTIONS — matches screenshot 2 exactly
//  4 white cards: Add Money · Withdraw · Transfer · Statement
//  Each has a small coloured icon box + label
// ══════════════════════════════════════════════════════════════════════════════

const QA = StyleSheet.create({
  row: { flexDirection: 'row', paddingHorizontal: sc(14), gap: sc(10), marginBottom: vs(16) },
  card: { flex: 1, alignItems: 'center', backgroundColor: D.cardBg, borderRadius: sc(14), paddingVertical: vs(12), elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  iconBox: { width: sc(40), height: sc(40), borderRadius: sc(12), backgroundColor: D.goldDim, alignItems: 'center', justifyContent: 'center', marginBottom: vs(6) },
  label: { fontSize: rs(11), fontFamily: Fonts.Bold, color: D.textPri, textAlign: 'center' },
});

// ══════════════════════════════════════════════════════════════════════════════
//  SUMMARY STRIP — matches screenshots 2 & 3 exactly
//  Date range row above  |  3 stat columns with icon+value+label
//  DEBIT uses blue up-arrow icon; CREDIT uses blue down-arrow icon; COUNT uses swap icon
// ══════════════════════════════════════════════════════════════════════════════
const SummaryStrip = ({ data, fromDate, toDate }) => {
  const totalDebit = data.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
  const totalCredit = data.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);

  return (
    <View style={SS.wrap}>
      {/* Range tag — "📅 01 Mar 2026 → 23 Mar 2026" */}
      <View style={SS.rangeRow}>
        <Icon name="calendar" size={rs(14)} color={D.gold} style={{ marginRight: sc(7) }} />
        <Text style={SS.rangeTxt}>{formatDisplay(fromDate)}  →  {formatDisplay(toDate)}</Text>
      </View>

      {/* Stats */}
      <View style={SS.statsRow}>
        {/* Total Debit */}
        <View style={SS.statItem}>
          <View style={[SS.statIcon, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
            <Icon name="arrow-up" size={rs(14)} color="#3B82F6" />
          </View>
          <Text style={[SS.statVal, { color: D.gold }]}>₹{totalDebit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <Text style={SS.statLbl}>TOTAL DEBIT</Text>
        </View>

        <View style={SS.divider} />

        {/* Total Credit */}
        <View style={SS.statItem}>
          <View style={[SS.statIcon, { backgroundColor: 'rgba(59,130,246,0.12)' }]}>
            <Icon name="arrow-down" size={rs(14)} color="#3B82F6" />
          </View>
          <Text style={[SS.statVal, { color: D.green }]}>₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <Text style={SS.statLbl}>TOTAL CREDIT</Text>
        </View>

        <View style={SS.divider} />

        {/* Count */}
        <View style={SS.statItem}>
          <View style={[SS.statIcon, { backgroundColor: 'rgba(0,0,0,0.05)' }]}>
            <Icon name="swap-horizontal" size={rs(14)} color={D.textSec} />
          </View>
          <Text style={[SS.statVal, { color: D.textPri }]}>{data.length}</Text>
          <Text style={SS.statLbl}>TRANSACTIONS</Text>
        </View>
      </View>
    </View>
  );
};
const SS = StyleSheet.create({
  wrap: { marginHorizontal: sc(14), marginBottom: vs(10), backgroundColor: D.cardBg, borderRadius: sc(16), overflow: 'hidden', elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  rangeRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sc(16), paddingVertical: vs(10), borderBottomWidth: 1, borderBottomColor: D.border },
  rangeTxt: { fontSize: rs(13), fontFamily: Fonts.Bold, color: D.textPri },
  statsRow: { flexDirection: 'row', paddingVertical: vs(14) },
  statItem: { flex: 1, alignItems: 'center', gap: vs(4) },
  statIcon: { width: sc(30), height: sc(30), borderRadius: sc(9), alignItems: 'center', justifyContent: 'center' },
  statVal: { fontSize: rs(14), fontFamily: Fonts.Bold },
  statLbl: { fontSize: rs(8), fontFamily: Fonts.Bold, color: D.textMuted, letterSpacing: 0.5, textTransform: 'uppercase' },
  divider: { width: 1, backgroundColor: D.border },
});

// ══════════════════════════════════════════════════════════════════════════════
//  EXPAND CONTENT — inside the card after "View Details"
// ══════════════════════════════════════════════════════════════════════════════
const ExpandContent = ({ item, isDebit }) => {
  const typeColor = isDebit ? D.debit : D.green;
  const [downloading, setDownloading] = useState(false);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Wallet ${isDebit ? 'DEBIT' : 'CREDIT'}: ${isDebit ? '−' : '+'} ₹${item.amount?.toFixed(2)}\nRef: ${item.referenceId}\nDate: ${formatApiDate(item.createdAt)}\nDesc: ${item.description}`,
      });
    } catch (_) { }
  };

  const handleDownload = async () => { setDownloading(true); await downloadReceipt(item); setDownloading(false); };

  return (
    <View style={EC.wrap}>
      {/* Balance row */}
      <View style={EC.balanceCard}>
        <View style={EC.half}>
          <Text style={EC.balLbl}>Opening</Text>
          <Text style={EC.balAmt}>₹{item.openingBalance?.toFixed(2) ?? '—'}</Text>
        </View>
        <View style={EC.balSep}>
          <Icon name="arrow-right" size={rs(14)} color={typeColor} />
        </View>
        <View style={[EC.half, { alignItems: 'flex-end' }]}>
          <Text style={EC.balLbl}>Closing</Text>
          <Text style={[EC.balAmt, { color: typeColor }]}>₹{item.closingBalance?.toFixed(2) ?? '—'}</Text>
        </View>
      </View>
      {/* Wallet + account */}
      <View style={EC.infoRow}>
        <View style={EC.infoHalf}>
          <Text style={EC.infoLbl}>WALLET</Text>
          <View style={[EC.chip, { backgroundColor: D.goldDim }]}>
            <Icon name="wallet-outline" size={rs(10)} color={D.gold} style={{ marginRight: sc(4) }} />
            <Text style={[EC.chipTxt, { color: D.gold }]}>{item.wallet?.toUpperCase() ?? 'MAIN'}</Text>
          </View>
        </View>
        {item.user && (
          <View style={[EC.infoHalf, { alignItems: 'flex-end' }]}>
            <Text style={EC.infoLbl}>ACCOUNT</Text>
            <Text style={EC.infoVal} numberOfLines={1}>{item.user.userName ?? '—'}</Text>
          </View>
        )}
      </View>

    </View>
  );
};
const EC = StyleSheet.create({
  wrap: { paddingTop: vs(10) },
  balanceCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: sc(12), paddingHorizontal: sc(14), paddingVertical: vs(12), marginBottom: vs(12) },
  half: { flex: 1 },
  balLbl: { fontSize: rs(9), color: D.textMuted, marginBottom: vs(3), fontFamily: Fonts.Medium },
  balAmt: { fontSize: rs(15), fontFamily: Fonts.Bold, color: D.textPri },
  balSep: { width: sc(28), height: sc(28), borderRadius: sc(14), alignItems: 'center', justifyContent: 'center', marginHorizontal: sc(8), backgroundColor: 'rgba(0,0,0,0.04)' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: vs(12) },
  infoHalf: { flex: 1 },
  infoLbl: { fontSize: rs(8), fontFamily: Fonts.Bold, color: D.textMuted, letterSpacing: 0.8, marginBottom: vs(4), textTransform: 'uppercase' },
  infoVal: { fontSize: rs(12), fontFamily: Fonts.Medium, color: D.textPri },
  chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: sc(8), paddingVertical: vs(3), borderRadius: sc(8) },
  chipTxt: { fontSize: rs(11), fontFamily: Fonts.Bold, letterSpacing: 0.4 },

});

// ══════════════════════════════════════════════════════════════════════════════
//  TRANSACTION CARD — pixel-perfect match to screenshot 3
//
//  Layout:
//  ┌─ 4px left bar (green=credit, gold=debit)
//  │  ↑ CREDIT badge  (+₹0.95 right)
//  │  Recharge Commission  (bold title)
//  │  REF ID              DATE & TIME
//  │  REF-TPyn3PA2DF      21 Mar 2026 · 18:31
//  │  ↓ View Details  (centered, arrow icon)
//  └─────────────────────────────────────────
// ══════════════════════════════════════════════════════════════════════════════
const TransactionCard = ({ item, index, onPressDetail }) => {
  const [expanded, setExpanded] = useState(false);
  const [measured, setMeasured] = useState(false);
  const panelH = useRef(0);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  const isDebit = item.type === 'debit';
  const barColor = isDebit ? D.debit : D.green;    // left bar
  const badgeBg = isDebit ? D.debitDim : D.greenDim; // badge bg
  const badgeTxt = isDebit ? D.debit : D.green;    // badge text
  const typeLabel = isDebit ? '↑ DEBIT' : '↑ CREDIT'; // "↑ CREDIT" / "↑ DEBIT"
  const amtColor = isDebit ? `−₹` : `+₹`;
  const amtDisplay = `${amtColor}${item.amount?.toFixed(2)}`;
  const amtTextColor = isDebit ? D.debit : D.green;

  const onGhostLayout = (e) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0 && !measured) { panelH.current = h; setMeasured(true); }
  };

  const toggle = () => {
    if (isAnimating.current || !measured) return;
    isAnimating.current = true;
    const opening = !expanded;
    setExpanded(opening);
    Animated.timing(heightAnim, {
      toValue: opening ? panelH.current : 0,
      duration: 280,
      easing: opening ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start(() => { isAnimating.current = false; });
  };

  return (
    <View style={TC.card}>
      {/* Coloured left bar */}
      <View style={[TC.leftBar, { backgroundColor: barColor }]} />
      <View style={TC.body}>
        <View style={TC.row1}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
             <View style={[TC.iconCircle, { backgroundColor: `${barColor}12`, borderColor: `${barColor}25`, borderWidth: 1 }]}>
               <Icon name={isDebit ? "arrow-up-thin" : "arrow-down-thin"} size={rs(20)} color={barColor} />
             </View>
             <View style={{ marginLeft: sc(10) }}>
                <Text style={TC.metaKey}>{(item.category || 'Transaction').toUpperCase()}</Text>
                <View style={[TC.badge, { backgroundColor: badgeBg, marginTop: vs(2) }]}>
                  <Text style={[TC.badgeTxt, { color: badgeTxt }]}>{typeLabel}</Text>
                </View>
             </View>
          </View>
          <Text style={[TC.amount, { color: amtTextColor }]}>{amtDisplay}</Text>
        </View>

        {/* Title */}
        <Text style={TC.title} numberOfLines={1}>{item.description}</Text>

        {/* Audit Strip */}
        <View style={TC.auditStrip}>
          <View style={TC.auditCol}>
            <Icon name="identifier" size={rs(10)} color={D.textMuted} style={{ marginRight: sc(4) }} />
            <Text style={TC.metaVal} numberOfLines={1} ellipsizeMode="middle">{item.referenceId}</Text>
          </View>
          <View style={TC.auditDivider} />
          <View style={[TC.auditCol, { justifyContent: 'flex-end' }]}>
            <Icon name="calendar-clock" size={rs(10)} color={D.textMuted} style={{ marginRight: sc(4) }} />
            <Text style={TC.metaVal}>{formatApiDate(item.createdAt)}</Text>
          </View>
        </View>

        {/* Decorative BG Icon */}
        <View style={TC.bgIconWrap}>
          <Icon name={isDebit ? "bank-transfer-out" : "bank-transfer-in"} size={rs(70)} color={`${barColor}08`} />
        </View>

        <TouchableOpacity style={[TC.actionBtn, { backgroundColor: barColor }]} onPress={toggle} activeOpacity={0.85}>
          <Icon name={expanded ? "chevron-up" : "eye-outline"} size={rs(13)} color="#FFF" style={{ marginRight: sc(6) }} />
          <Text style={TC.actionTxt}>
            {expanded ? 'Hide Details' : 'View Details'}
          </Text>
        </TouchableOpacity>

        {/* Animated expand panel */}
        <Animated.View style={{ overflow: 'hidden', height: heightAnim }}>
          <ExpandContent item={item} isDebit={isDebit} />
        </Animated.View>
        {!measured && (
          <View style={{ position: 'absolute', left: 0, right: 0, opacity: 0, zIndex: -1, top: 9999 }}
            onLayout={onGhostLayout} pointerEvents="none">
            <ExpandContent item={item} isDebit={isDebit} />
          </View>
        )}
      </View>
    </View>
  );
};

const TC = StyleSheet.create({
  card: {
    marginHorizontal: sc(14), marginBottom: vs(10),
    backgroundColor: D.cardBg, borderRadius: sc(16),
    flexDirection: 'row', overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 5,
  },
  leftBar: { width: sc(4) },
  body: { flex: 1, paddingHorizontal: sc(14), paddingTop: vs(14), paddingBottom: vs(12) },

  iconCircle: { width: sc(36), height: sc(36), borderRadius: sc(12), alignItems: 'center', justifyContent: 'center' },
  row1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: vs(12) },
  badge: { paddingHorizontal: sc(6), paddingVertical: vs(2), borderRadius: sc(4), alignSelf: 'flex-start' },
  badgeTxt: { fontSize: rs(8), fontFamily: Fonts.Bold, letterSpacing: 0.6 },
  amount: { fontSize: rs(19), fontFamily: Fonts.Bold, letterSpacing: -0.5 },

  title: { fontSize: rs(13), fontFamily: Fonts.Bold, color: D.textPri, marginBottom: vs(12), opacity: 0.9 },

  auditStrip: { 
    flexDirection: 'row', alignItems: 'center', 
    backgroundColor: '#F8F9FC', paddingVertical: vs(8), paddingHorizontal: sc(10), borderRadius: sc(10),
    borderWidth: 1, borderColor: '#EDF0F5', marginBottom: vs(14) 
  },
  auditCol: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  auditDivider: { width: 1, height: vs(12), backgroundColor: '#E2E8F0', marginHorizontal: sc(10) },
  
  metaKey: { fontSize: rs(8), fontFamily: Fonts.Bold, color: D.textMuted, letterSpacing: 0.8 },
  metaVal: { fontSize: rs(10), fontFamily: Fonts.Medium, color: D.textSec, letterSpacing: 0.1 },

  bgIconWrap: { position: 'absolute', right: -10, top: -5, opacity: 0.8, zIndex: -1 },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: vs(9), borderRadius: sc(12),
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3,
  },
  actionTxt: { fontSize: rs(11), fontFamily: Fonts.Bold, letterSpacing: 0.3, color: '#FFF' },
});

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN SCREEN — all logic UNCHANGED
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
  const [loadedFrom, setLoadedFrom] = useState(defaultFrom);
  const [loadedTo, setLoadedTo] = useState(defaultTo);
  const [aepsBalance, setAepsBalance] = useState('0.00');
  const [mainBalance, setMainBalance] = useState('0.00');
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [isAeps, setIsAeps] = useState(false); // Default to Main as it's the "Wallet Ledger"

  // Detail sheet
  const [detailItem, setDetailItem] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);

  const startDateRef = useRef(defaultFrom);
  const endDateRef = useRef(defaultTo);
  useEffect(() => {
    loadBalances();
    doFetch(startDateRef.current, endDateRef.current);
  }, []);

  const loadBalances = async () => {
    setBalanceLoading(true);
    try {
      const headerToken = await AsyncStorage.getItem('header_token');
      const r = await getWalletBalance({ headerToken });
      if (r?.success && r?.data) {
        setAepsBalance(String(r.data.aepsWallet ?? '0.00'));
        setMainBalance(String(r.data.mainWallet ?? '0.00'));
      }
    } catch (e) { console.log('[WalletLedger] bal error:', e); }
    finally { setBalanceLoading(false); }
  };

  // ── CORE FETCH — logic unchanged ─────────────────────────────────────────
  const doFetch = async (from, to) => {
    const fromStr = toQueryDate(from);
    const toStr = toQueryDate(to);
    console.log(`[WalletLedger] API call → from=${fromStr} to=${toStr}`);
    setTransactions([]); // Clear list so old data doesn't flicker
    setLoading(true); setError(null); setSearched(true);
    try {
      const headerToken = await AsyncStorage.getItem('header_token');
      if (!headerToken) { setError('Session expired. Please login again.'); return; }
      const result = await getWalletReport({ from: fromStr, to: toStr, headerToken });
      console.log('[WalletLedger] result.success =', result?.success, '| count =', result?.data?.length);
      if (result?.success) {
        setTransactions(result.data || []);
        setLoadedFrom(from); setLoadedTo(to);
      } else {
        setError(result?.message || 'Failed to fetch wallet report.');
        setTransactions([]);
      }
    } catch (e) {
      console.log('[WalletLedger] network error:', e?.message);
      setError('Network error. Please check your connection.');
      setTransactions([]);
    } finally { setLoading(false); }
  };

  const handleSearch = () => doFetch(startDateRef.current, endDateRef.current);
  const openCal = (target) => { setCalTarget(target); setCalVisible(true); };
  const onCalConfirm = useCallback((selectedDate) => {
    if (calTarget === 'start') { startDateRef.current = selectedDate; setStartDate(selectedDate); }
    else { endDateRef.current = selectedDate; setEndDate(selectedDate); }
    setCalVisible(false);
  }, [calTarget]);
  const onCalCancel = useCallback(() => setCalVisible(false), []);

  const filteredTransactions = transactions.filter(item => {
    if (!item.createdAt) return false;
    const itemStr = toQueryDate(new Date(item.createdAt));
    const startStr = toQueryDate(startDate);
    const endStr = toQueryDate(endDate);
    return itemStr >= startStr && itemStr <= endStr;
  });

  const liveBalance = isAeps ? aepsBalance : mainBalance;

  const ListHeader = () => (
    <View>

      {/* ── Balance Hero Card — synced with FinanceHome balance ── */}
      <View style={S.heroCard}>
        <View style={S.heroTopRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => setIsAeps(!isAeps)}
              style={S.walletToggleBtn}
              activeOpacity={0.7}
            >
              <Text style={S.heroLabel}>{isAeps ? 'AEPS WALLET' : 'MAIN WALLET'}</Text>
              <Icon name="chevron-down" size={rs(12)} color="rgba(255,255,255,0.5)" style={{ marginLeft: sc(4) }} />
            </TouchableOpacity>
          </View>
          <View style={S.livePill}>
            <Text style={S.livePillTxt}>LIVE BALANCE</Text>
          </View>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={S.heroRupee}>₹</Text>
          {balanceLoading ? (
            <ActivityIndicator size="small" color={D.gold} style={{ marginLeft: sc(10) }} />
          ) : (
            <Text style={S.heroAmount}>
              {parseFloat(liveBalance).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          )}
        </View>

        <View style={S.heroFooter}>
          <Text style={S.heroSub}>Last sync: {formatApiDate(new Date().toISOString())}</Text>
          <TouchableOpacity onPress={loadBalances} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Icon name="refresh" size={rs(14)} color={D.gold} />
          </TouchableOpacity>
        </View>
      </View>


      {/* ── Filter card ── */}
      <View style={S.filterCard}>
        <Text style={S.filterTitle}>FILTER BY DATE RANGE</Text>
        <View style={S.filterRow}>
          <DateFilterBtn label="From" date={startDate} onPress={() => openCal('start')} />
          <Icon name="arrow-right" size={rs(14)} color={D.textMuted} style={{ paddingHorizontal: sc(8) }} />
          <DateFilterBtn label="To" date={endDate} onPress={() => openCal('end')} />
        </View>
        <TouchableOpacity style={[S.searchBtn, loading && { opacity: 0.7 }]} activeOpacity={0.85} onPress={handleSearch} disabled={loading}>
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <><Icon name="magnify" size={rs(16)} color="#fff" style={{ marginRight: sc(6) }} /><Text style={S.searchBtnTxt}>Search Transactions</Text></>
          }
        </TouchableOpacity>
      </View>

      {/* ── Summary strip ── */}
      {filteredTransactions.length > 0 && (
        <SummaryStrip data={filteredTransactions} fromDate={startDate} toDate={endDate} />
      )}

      {/* ── Section header "N TRANSACTIONS · All ▾" ── */}
      {searched && !loading && filteredTransactions.length > 0 && (
        <View style={S.sectionRow}>
          <Icon name="format-list-bulleted" size={rs(13)} color={D.textMuted} style={{ marginRight: sc(6) }} />
          <Text style={S.sectionTxt}>{filteredTransactions.length} TRANSACTIONS</Text>
          <View style={S.allPill}>
            <Text style={S.allPillTxt}>All ▾</Text>
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={S.safe} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={D.headerBg} />

      {/* ── Header ── */}
      <View style={S.header}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={S.headerIconBtn} activeOpacity={0.7} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="arrow-left" size={rs(18)} color="#fff" />
        </TouchableOpacity>

        <Text style={S.headerTitle}>Wallet Ledger</Text>

        <View style={S.headerRight}>
          <TouchableOpacity style={S.headerIconBtn} activeOpacity={0.7}>
            <Icon name="download-outline" size={rs(16)} color="rgba(255,255,255,0.75)" />
          </TouchableOpacity>
          <TouchableOpacity style={[S.headerIconBtn, { marginLeft: sc(8) }]} activeOpacity={0.7}>
            <Icon name="arrow-expand" size={rs(14)} color="rgba(255,255,255,0.75)" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Error banner */}
      {!!error && (
        <View style={S.errorBanner}>
          <Icon name="alert-circle-outline" size={rs(15)} color="#DC2626" style={{ marginRight: sc(8) }} />
          <Text style={S.errorTxt} numberOfLines={2}>{error}</Text>
          <TouchableOpacity onPress={handleSearch} style={S.retryBtn}>
            <Text style={S.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item._id}
        renderItem={({ item, index }) => (
          <TransactionCard
            item={item}
            index={index}
            onPressDetail={() => { setDetailItem(item); setDetailVisible(true); }}
          />
        )}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          searched && !loading && !error ? (
            <View style={S.emptyWrap}>
              <Icon name="file-search-outline" size={rs(52)} color={`${D.gold}55`} />
              <Text style={S.emptyTitle}>No transactions found</Text>
              <Text style={S.emptySub}>Try selecting a different date range and tap Search</Text>
            </View>
          ) : null
        }
        contentContainerStyle={{ paddingBottom: vs(40) }}
        showsVerticalScrollIndicator={false}
      />

      <CalendarModal
        visible={calVisible}
        initialDate={calTarget === 'start' ? startDate : endDate}
        title={calTarget === 'start' ? 'Select Start Date' : 'Select End Date'}
        onConfirm={onCalConfirm}
        onCancel={onCalCancel}
      />

      {/* Transaction detail bottom sheet */}
      <TxnDetailSheet
        visible={detailVisible}
        item={detailItem}
        onClose={() => setDetailVisible(false)}
      />
    </SafeAreaView>
  );
};

export default WalletTransactionScreen;

// ══════════════════════════════════════════════════════════════════════════════
//  SCREEN STYLES
// ══════════════════════════════════════════════════════════════════════════════
const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: D.pageBg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: sc(16), paddingVertical: vs(12),
    backgroundColor: D.headerBg,
    elevation: 6, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 6,
  },
  headerIconBtn: { width: sc(32), height: sc(32), borderRadius: sc(16), backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', color: '#fff', fontSize: rs(17), fontFamily: Fonts.Bold, letterSpacing: 0.2 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },

  // Balance hero card — dark card (screenshot 2)
  heroCard: {
    marginHorizontal: sc(14), marginTop: vs(14), marginBottom: vs(14),
    backgroundColor: D.heroBg, borderRadius: sc(18), padding: sc(18),
    elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 10,
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: vs(12) },
  walletToggleBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: sc(10), paddingVertical: vs(4), borderRadius: sc(12), borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  heroLabel: { color: 'rgba(255,255,255,0.7)', fontSize: rs(10), fontFamily: Fonts.Bold, letterSpacing: 0.5, textTransform: 'uppercase' },
  livePill: { backgroundColor: D.goldDim, borderWidth: 1, borderColor: `${D.gold}45`, borderRadius: sc(20), paddingHorizontal: sc(10), paddingVertical: vs(3) },
  livePillTxt: { color: D.gold, fontSize: rs(9), fontFamily: Fonts.Bold, letterSpacing: 0.4 },
  heroAmount: { color: '#fff', fontSize: rs(35), fontFamily: Fonts.Bold, letterSpacing: -0.5 },
  heroRupee: { color: D.gold, fontSize: rs(24), fontFamily: Fonts.Bold, marginRight: sc(4) },
  heroFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: vs(12), paddingTop: vs(12), borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  heroSub: { color: 'rgba(255,255,255,0.38)', fontSize: rs(10), fontFamily: Fonts.Medium },

  // Filter card
  filterCard: {
    marginHorizontal: sc(14), marginBottom: vs(12),
    backgroundColor: D.cardBg, borderRadius: sc(16), padding: sc(14),
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 5,
  },
  filterTitle: { color: D.textMuted, fontSize: rs(9), fontFamily: Fonts.Bold, letterSpacing: 1.1, marginBottom: vs(10) },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(10) },
  datePill: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8F9FC', borderRadius: sc(10),
    paddingVertical: vs(10), paddingHorizontal: sc(10),
    borderWidth: 1.5, borderColor: D.gold,
  },
  datePillLabel: { color: D.textMuted, fontSize: rs(9), fontFamily: Fonts.Medium, marginBottom: vs(1) },
  datePillValue: { color: D.textPri, fontSize: rs(12), fontFamily: Fonts.Bold },
  searchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: D.heroBg, borderRadius: sc(12),
    paddingVertical: vs(13), minHeight: vs(46),
  },
  searchBtnTxt: { color: '#fff', fontSize: rs(13), fontFamily: Fonts.Bold, letterSpacing: 0.4 },

  // Section header
  sectionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: sc(14), marginBottom: vs(8) },
  sectionTxt: { flex: 1, color: D.textMuted, fontSize: rs(9), fontFamily: Fonts.Bold, letterSpacing: 1.1 },
  allPill: { backgroundColor: D.goldDim, borderRadius: sc(20), paddingHorizontal: sc(10), paddingVertical: vs(3), borderWidth: 1, borderColor: `${D.gold}35` },
  allPillTxt: { color: D.gold, fontSize: rs(11), fontFamily: Fonts.Bold },

  // Error
  errorBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2', borderLeftWidth: 4, borderLeftColor: '#DC2626', marginHorizontal: sc(16), marginTop: vs(8), paddingHorizontal: sc(12), paddingVertical: vs(8), borderRadius: sc(10) },
  errorTxt: { flex: 1, color: '#DC2626', fontSize: rs(12), fontFamily: Fonts.Medium },
  retryBtn: { marginLeft: sc(8) },
  retryTxt: { color: D.heroBg, fontSize: rs(12), fontFamily: Fonts.Bold },

  // Empty
  emptyWrap: { alignItems: 'center', paddingTop: vs(40), paddingBottom: vs(20) },
  emptyTitle: { color: D.textPri, fontSize: rs(15), fontFamily: Fonts.Bold, marginTop: vs(12), marginBottom: vs(4) },
  emptySub: { color: D.textMuted, fontSize: rs(12), fontFamily: Fonts.Medium, textAlign: 'center', paddingHorizontal: sc(20) },
});

// Calendar styles
const cal = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: CAL_H_PAD },
  sheet: { backgroundColor: D.cardBg, borderRadius: sc(24), width: '100%', overflow: 'hidden', elevation: 14, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 18 },
  header: { backgroundColor: D.cardBg, paddingHorizontal: sc(16), paddingTop: vs(18), paddingBottom: vs(14), borderBottomWidth: 1, borderBottomColor: D.border },
  headerRow1: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: vs(6) },
  headerLabel: { color: D.textMuted, fontSize: rs(10), fontFamily: Fonts.Bold, letterSpacing: 0.6, textTransform: 'uppercase' },
  closeBtn: { width: sc(26), height: sc(26), borderRadius: sc(13), backgroundColor: '#F2F2F2', alignItems: 'center', justifyContent: 'center' },
  selectedDateText: { color: D.textPri, fontSize: rs(20), fontFamily: Fonts.Bold, letterSpacing: 0.2, marginBottom: vs(12) },
  monthNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: sc(32), height: sc(32), borderRadius: sc(16), backgroundColor: '#F2F2F2', alignItems: 'center', justifyContent: 'center' },
  monthYearTxt: { color: D.textPri, fontSize: rs(14), fontFamily: Fonts.Bold, letterSpacing: 0.3 },
  weekRow: { flexDirection: 'row', backgroundColor: '#F8F8F8', paddingVertical: vs(8) },
  weekCell: { width: `${100 / 7}%`, alignItems: 'center' },
  weekTxt: { color: D.textMuted, fontSize: rs(10), fontFamily: Fonts.Bold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: CAL_G_PAD, paddingTop: vs(8), paddingBottom: vs(8) },
  cellOuter: { width: `${100 / 7}%`, height: CELL_SIZE + vs(4), alignItems: 'center', justifyContent: 'center', marginVertical: vs(2) },
  cellInner: { width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  selCircle: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: CIRCLE_SIZE / 2, backgroundColor: D.gold },
  todayRing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: CIRCLE_SIZE / 2, borderWidth: 2, borderColor: D.gold },
  dayTxt: { fontSize: rs(13), fontFamily: Fonts.Medium, color: D.textPri, zIndex: 1 },
  footer: { flexDirection: 'row', padding: sc(12), gap: sc(8), borderTopWidth: 1, borderTopColor: D.border },
  cancelBtn: { flex: 1, paddingVertical: vs(12), borderRadius: sc(12), backgroundColor: '#F4F4F4', alignItems: 'center' },
  cancelTxt: { color: D.textSec, fontSize: rs(13), fontFamily: Fonts.Medium },
  confirmBtn: { flex: 2, flexDirection: 'row', paddingVertical: vs(12), borderRadius: sc(12), backgroundColor: D.heroBg, alignItems: 'center', justifyContent: 'center' },
  confirmTxt: { color: '#fff', fontSize: rs(13), fontFamily: Fonts.Bold, letterSpacing: 0.3 },
});