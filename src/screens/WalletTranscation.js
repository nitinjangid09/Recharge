// WalletTransactionScreen.js
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Animated,
  Easing,
  StatusBar,
  Alert,
  Dimensions,
  ActivityIndicator,
  Share,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from "../constants/Colors";
import Fonts from "../constants/Fonts";
import { getWalletReport } from "../api/AuthApi";
import {
  fadeIn,
  slideUp,
  buttonPress,
  FadeSlideUp,
} from "../utils/ScreenAnimations";

// ─── Responsive Scaling ───────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get('window');
const BASE_W = 390;
const BASE_H = 844;
const scale = (s) => Math.round((SW / BASE_W) * s);
const vs = (s) => Math.round((SH / BASE_H) * s);
const rs = (s) => Math.round(Math.sqrt((SW * SH) / (BASE_W * BASE_H)) * s);

// ─── Calendar sizing ──────────────────────────────────────────────────────────
const CAL_H_PAD = scale(35);
const CAL_G_PAD = scale(10);
const CELL_SIZE = Math.floor((SW - CAL_H_PAD * 2 - CAL_G_PAD * 2) / 7);
const CIRCLE_SIZE = Math.max(CELL_SIZE - scale(8), scale(28));

// ─── Constants ────────────────────────────────────────────────────────────────
const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const pad = (n) => String(n).padStart(2, '0');
const formatDisplay = (d) => `${pad(d.getDate())} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const getFirstDay = (y, m) => new Date(y, m, 1).getDay();

// ── Date → "YYYY-MM-DD" using LOCAL timezone (not UTC) ───────────────────────
const toQueryDate = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// ── Format ISO string from API → readable date/time ──────────────────────────
const formatApiDate = (iso) => {
  if (!iso) return '—';
  const d = new Date(iso);
  return `${pad(d.getDate())} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}  •  ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// ─────────────────────────────────────────────────────────────────────────────
//  Download receipt helper
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
      const html = `<html><head><meta charset="utf-8"/>
        <style>
          body{font-family:Arial,sans-serif;padding:32px;color:#1a1a1a;}
          .header{text-align:center;margin-bottom:24px;border-bottom:2px solid #eee;padding-bottom:16px;}
          .title{font-size:20px;font-weight:900;color:#002E6E;}
          .subtitle{font-size:12px;color:#888;}
          .badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:800;
            background:${isDebit ? '#FFF3EE' : '#ECFDF5'};color:${isDebit ? '#D4B06A' : '#16A34A'};}
          .amount{font-size:36px;font-weight:900;color:${isDebit ? '#D4B06A' : '#16A34A'};margin:12px 0;}
          table{width:100%;border-collapse:collapse;margin-top:16px;}
          tr{border-bottom:1px solid #f0f0f0;}
          td{padding:10px 0;font-size:13px;}
          td:first-child{color:#888;width:40%;}
          td:last-child{font-weight:700;}
          .footer{text-align:center;margin-top:32px;font-size:10px;color:#aaa;}
        </style></head>
        <body>
          <div class="header"><div class="title">Wallet Transaction Receipt</div><div class="subtitle">${dateStr}</div></div>
          <div style="text-align:center;margin:16px 0;"><div class="badge">${typeLabel}</div><div class="amount">${amtPrefix}${item.amount?.toFixed(2)}</div></div>
          <table>
            <tr><td>Description</td><td>${item.description ?? '—'}</td></tr>
            <tr><td>Reference ID</td><td>${item.referenceId ?? '—'}</td></tr>
            <tr><td>Wallet</td><td>${item.wallet?.toUpperCase() ?? 'MAIN'}</td></tr>
            ${item.user ? `<tr><td>Account</td><td>${item.user.userName ?? '—'}</td></tr>` : ''}
            <tr><td>Date & Time</td><td>${dateStr}</td></tr>
            <tr><td>Opening Balance</td><td>₹${item.openingBalance?.toFixed(2) ?? '—'}</td></tr>
            <tr><td>Closing Balance</td><td style="color:${isDebit ? '#D4B06A' : '#16A34A'}">₹${item.closingBalance?.toFixed(2) ?? '—'}</td></tr>
          </table>
          <div class="footer">Generated by Wallet Ledger App</div>
        </body></html>`;
      const result = await RNHTMLtoPDF.convert({
        html, fileName: `WalletReceipt_${item.referenceId ?? Date.now()}`, directory: 'Documents',
      });
      Alert.alert('Downloaded ✓', `Receipt saved to:\n${result.filePath}`);
      return;
    }
    // Fallback — share as plain text
    await Share.share({
      message:
        `====== WALLET RECEIPT ======\n` +
        `Type    : ${typeLabel}\nAmount  : ${amtPrefix}${item.amount?.toFixed(2)}\n` +
        `Ref ID  : ${item.referenceId ?? '—'}\nDate    : ${dateStr}\n` +
        `Desc    : ${item.description ?? '—'}\nWallet  : ${item.wallet?.toUpperCase() ?? 'MAIN'}\n` +
        `Opening : ₹${item.openingBalance?.toFixed(2) ?? '—'}\n` +
        `Closing : ₹${item.closingBalance?.toFixed(2) ?? '—'}\n============================`,
      title: 'Wallet Receipt',
    });
  } catch (err) {
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

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

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
          {/* Header */}
          <View style={cal.header}>
            <View style={cal.headerRow1}>
              <Text style={cal.headerLabel}>{title}</Text>
              <TouchableOpacity onPress={onCancel} style={cal.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={rs(14)} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={cal.selectedDateText}>{formatDisplay(new Date(viewYear, viewMonth, selDay))}</Text>
            <View style={cal.monthNavRow}>
              <TouchableOpacity onPress={prevMonth} style={cal.navBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Icon name="chevron-left" size={rs(20)} color="#fff" />
              </TouchableOpacity>
              <Text style={cal.monthYearTxt}>{MONTHS_FULL[viewMonth]}  {viewYear}</Text>
              <TouchableOpacity onPress={nextMonth} style={cal.navBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Icon name="chevron-right" size={rs(20)} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
          {/* Week labels */}
          <View style={cal.weekRow}>
            {WEEK_DAYS.map((d, i) => (
              <View key={d} style={cal.weekCell}>
                <Text style={[cal.weekTxt, (i === 0 || i === 6) && cal.weekEndTxt]}>{d}</Text>
              </View>
            ))}
          </View>
          {/* Grid */}
          <View style={cal.grid}>
            {Array.from({ length: totalCells }).map((_, i) => {
              const day = i - firstDay + 1; const valid = day >= 1 && day <= daysInMonth;
              const sel = valid && day === selDay; const tod = valid && isToday(day); const isWE = valid && isWeekend(day);
              return (
                <View key={i} style={cal.cellOuter}>
                  <TouchableOpacity style={cal.cellInner} onPress={() => valid && setSelDay(day)} activeOpacity={valid ? 0.7 : 1} disabled={!valid}>
                    {sel && <View style={cal.selCircle} />}
                    {tod && !sel && <View style={cal.todayRing} />}
                    <Text style={[cal.dayTxt, !valid && cal.dayEmpty, isWE && !sel && cal.dayWeekendTxt, sel && cal.daySelTxt, tod && !sel && cal.dayTodayTxt]}>
                      {valid ? day : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
          {/* Footer */}
          <View style={cal.footer}>
            <TouchableOpacity style={cal.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
              <Text style={cal.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={cal.confirmBtn}
              onPress={() => onConfirm(new Date(viewYear, viewMonth, selDay))}
              activeOpacity={0.85}
            >
              <Icon name="check" size={rs(14)} color="#fff" style={{ marginRight: scale(5) }} />
              <Text style={cal.confirmTxt}>Apply Date</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  DATE FILTER BUTTON
// ══════════════════════════════════════════════════════════════════════════════
const DateFilterBtn = ({ label, date, onPress }) => {
  const sa = useRef(new Animated.Value(1)).current;
  return (
    <Animated.View style={{ flex: 1, transform: [{ scale: sa }] }}>
      <TouchableOpacity style={S.datePill} activeOpacity={0.9}
        onPress={() => { buttonPress(sa).start(); onPress(); }}>
        <Icon name="calendar-month-outline" size={rs(14)} color={Colors.accent} style={{ marginRight: scale(6) }} />
        <View style={{ flex: 1 }}>
          <Text style={S.datePillLabel}>{label}</Text>
          <Text style={S.datePillValue}>{formatDisplay(date)}</Text>
        </View>
        <Icon name="chevron-down" size={rs(14)} color={Colors.accent} />
      </TouchableOpacity>
    </Animated.View>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  SUMMARY STRIP
// ══════════════════════════════════════════════════════════════════════════════
const SummaryStrip = ({ data, fromDate, toDate }) => {
  const totalDebit = data.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
  const totalCredit = data.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const items = [
    { label: 'Total Debit', val: `₹${totalDebit.toFixed(2)}`, color: Colors.accent, icon: 'arrow-up-circle' },
    { label: 'Total Credit', val: `₹${totalCredit.toFixed(2)}`, color: '#16A34A', icon: 'arrow-down-circle' },
    { label: 'Transactions', val: String(data.length), color: Colors.primary, icon: 'swap-horizontal' },
  ];
  return (
    <View style={S.summaryWrap}>
      {/* Range badge */}
      <View style={S.rangeBadge}>
        <Icon name="calendar-range" size={rs(12)} color={Colors.accent} style={{ marginRight: scale(5) }} />
        <Text style={S.rangeBadgeTxt}>{formatDisplay(fromDate)}  →  {formatDisplay(toDate)}</Text>
      </View>
      {/* Stats row */}
      <View style={S.summaryStrip}>
        {items.map((item, i) => (
          <React.Fragment key={item.label}>
            <View style={S.summaryItem}>
              <Icon name={item.icon} size={rs(16)} color={item.color} style={{ marginBottom: vs(3) }} />
              <Text style={[S.summaryVal, { color: item.color }]}>{item.val}</Text>
              <Text style={S.summaryLabel}>{item.label}</Text>
            </View>
            {i < 2 && <View style={S.summaryDivider} />}
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  EXPAND CONTENT
// ══════════════════════════════════════════════════════════════════════════════
const ExpandContent = ({ item, typeColor }) => {
  const isDebit = item.type === 'debit';
  const amtPrefix = isDebit ? '− ₹' : '+ ₹';
  const typeLabel = isDebit ? 'DEBIT' : 'CREDIT';
  const [downloading, setDownloading] = useState(false);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Wallet ${typeLabel}: ${amtPrefix}${item.amount?.toFixed(2)}\nRef: ${item.referenceId}\nDate: ${formatApiDate(item.createdAt)}\nDesc: ${item.description}`,
      });
    } catch (_) { }
  };

  const handleDownload = async () => {
    setDownloading(true);
    await downloadReceipt(item);
    setDownloading(false);
  };

  return (
    <View>
      <View style={C.expandDivider} />
      {/* Balance */}
      <View style={C.balanceCard}>
        <View style={C.balanceHalf}>
          <Text style={C.balanceLbl}>Opening Balance</Text>
          <Text style={C.balanceAmt}>₹{item.openingBalance?.toFixed(2) ?? '—'}</Text>
        </View>
        <View style={C.balanceSep}>
          <Icon name="arrow-right" size={rs(16)} color={typeColor} />
        </View>
        <View style={[C.balanceHalf, { alignItems: 'flex-end' }]}>
          <Text style={C.balanceLbl}>Closing Balance</Text>
          <Text style={[C.balanceAmt, { color: typeColor }]}>₹{item.closingBalance?.toFixed(2) ?? '—'}</Text>
        </View>
      </View>
      {/* Wallet + account */}
      <View style={C.infoRow}>
        <View style={C.infoItem}>
          <Text style={C.infoLbl}>WALLET</Text>
          <View style={[C.chip, { backgroundColor: Colors.accent + '18' }]}>
            <Icon name="wallet-outline" size={rs(10)} color={Colors.accent} style={{ marginRight: scale(4) }} />
            <Text style={[C.chipTxt, { color: Colors.accent }]}>{item.wallet?.toUpperCase() ?? 'MAIN'}</Text>
          </View>
        </View>
        {item.user && (
          <View style={[C.infoItem, { alignItems: 'flex-end' }]}>
            <Text style={C.infoLbl}>ACCOUNT</Text>
            <Text style={C.infoVal} numberOfLines={1}>{item.user.userName ?? '—'}</Text>
          </View>
        )}
      </View>
      {/* Actions */}
      <View style={C.actionRow}>
        <TouchableOpacity
          style={[C.actionBtn, { backgroundColor: Colors.primary }, downloading && { opacity: 0.7 }]}
          activeOpacity={0.85} onPress={handleDownload} disabled={downloading}
        >
          {downloading
            ? <ActivityIndicator size="small" color="#fff" style={{ marginRight: scale(6) }} />
            : <Icon name="download" size={rs(15)} color="#fff" style={{ marginRight: scale(6) }} />
          }
          <Text style={C.actionTxt}>{downloading ? 'Saving...' : 'Download'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[C.actionBtn, { backgroundColor: Colors.accent }]}
          activeOpacity={0.85} onPress={handleShare}
        >
          <Icon name="share-variant" size={rs(15)} color="#fff" style={{ marginRight: scale(6) }} />
          <Text style={C.actionTxt}>Share</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  TRANSACTION CARD
// ══════════════════════════════════════════════════════════════════════════════
const TransactionCard = ({ item, index }) => {
  const [expanded, setExpanded] = useState(false);
  const [measured, setMeasured] = useState(false);
  const panelH = useRef(0);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);

  const cardOp = useRef(new Animated.Value(0)).current;
  const cardTY = useRef(new Animated.Value(vs(18))).current;
  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([fadeIn(cardOp, 280), slideUp(cardTY, 280)]).start();
    }, index * 55);
  }, []);

  const isDebit = item.type === 'debit';
  const typeColor = isDebit ? Colors.accent : '#16A34A';
  const typeBg = isDebit ? '#FFF3EE' : '#ECFDF5';
  const amtColor = isDebit ? Colors.accent : '#16A34A';
  const amtPrefix = isDebit ? '− ₹' : '+ ₹';
  const typeLabel = isDebit ? 'DEBIT' : 'CREDIT';

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
      duration: 300,
      easing: opening ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: false,
    }).start(() => { isAnimating.current = false; });
  };

  return (
    <Animated.View style={[C.card, { opacity: cardOp, transform: [{ translateY: cardTY }] }]}>
      <View style={[C.leftBar, { backgroundColor: typeColor }]} />
      <View style={C.body}>
        <View style={C.topRow}>
          <View style={[C.typePill, { backgroundColor: typeBg }]}>
            <Icon name={isDebit ? 'arrow-up' : 'arrow-down'} size={rs(10)} color={typeColor} />
            <Text style={[C.typePillTxt, { color: typeColor }]}>{typeLabel}</Text>
          </View>
          <Text style={[C.amount, { color: amtColor }]}>{amtPrefix}{item.amount?.toFixed(2)}</Text>
        </View>
        <Text style={C.desc} numberOfLines={2}>{item.description}</Text>
        <View style={C.metaRow}>
          <View style={C.metaLeft}>
            <Text style={C.metaLbl}>REF ID</Text>
            <Text style={C.metaVal} numberOfLines={1} ellipsizeMode="tail">{item.referenceId}</Text>
          </View>
          <View style={C.metaRight}>
            <Text style={C.metaLbl}>DATE & TIME</Text>
            <Text style={C.metaVal}>{formatApiDate(item.createdAt)}</Text>
          </View>
        </View>
        <TouchableOpacity style={C.toggleRow} onPress={toggle} activeOpacity={0.7}>
          <View style={C.toggleLine} />
          <View style={[C.toggleChip, { backgroundColor: typeColor + '18', borderColor: typeColor + '40' }]}>
            <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={rs(12)} color={typeColor} style={{ marginRight: scale(4) }} />
            <Text style={[C.toggleTxt, { color: typeColor }]}>{expanded ? 'Hide Details' : 'View Details'}</Text>
          </View>
          <View style={C.toggleLine} />
        </TouchableOpacity>
        <Animated.View style={[C.expandClip, { height: heightAnim }]}>
          <ExpandContent item={item} typeColor={typeColor} />
        </Animated.View>
        {!measured && (
          <View style={C.ghost} onLayout={onGhostLayout} pointerEvents="none">
            <ExpandContent item={item} typeColor={typeColor} />
          </View>
        )}
      </View>
    </Animated.View>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
//
//  DATE FILTER BUG — FULLY FIXED
//  ─────────────────────────────
//  Problem 1 (state closure): React state is async, so `startDate`/`endDate`
//    inside handleSearch would capture stale values. Fix: use refs that are
//    updated synchronously before every fetch call.
//
//  Problem 2 (onCalConfirm bug): Previous code had:
//    const newFrom = calTarget==='start' ? date : startDateRef.current;
//    This was correct for 'start', but the ref for 'start' was set ABOVE this
//    line so it works. However, when target='end', startDateRef was fine.
//    The actual bug was that refs were set in state updates (async) not before
//    fetchTransactions was called. Fix: set both ref AND call fetch explicitly
//    with the correct (from, to) pair derived from the new date + current ref.
//
//  Problem 3 (API query string): The API at /user/wallet/wallet-report expects
//    ?from=YYYY-MM-DD&to=YYYY-MM-DD. We verify `toQueryDate` uses local
//    timezone so IST dates are not shifted to previous day (UTC offset issue).
// ══════════════════════════════════════════════════════════════════════════════
const WalletTransactionScreen = ({ navigation }) => {
  const today = new Date();

  // Default: 1st of current month → today
  const defaultFrom = new Date(today.getFullYear(), today.getMonth(), 1);
  const defaultTo = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  // ── UI state ──────────────────────────────────────────────────────────────
  const [startDate, setStartDate] = useState(defaultFrom);
  const [endDate, setEndDate] = useState(defaultTo);
  const [calVisible, setCalVisible] = useState(false);
  const [calTarget, setCalTarget] = useState('start');
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searched, setSearched] = useState(false);
  // Track the dates that are currently loaded (for summary badge)
  const [loadedFrom, setLoadedFrom] = useState(defaultFrom);
  const [loadedTo, setLoadedTo] = useState(defaultTo);

  // ── Refs: always current, updated synchronously before any fetch ──────────
  const startDateRef = useRef(defaultFrom);
  const endDateRef = useRef(defaultTo);

  const headerOp = useRef(new Animated.Value(0)).current;
  const headerTY = useRef(new Animated.Value(vs(-24))).current;

  useEffect(() => {
    Animated.parallel([fadeIn(headerOp, 400), slideUp(headerTY, 400)]).start();
    // Initial load — pass explicit dates
    doFetch(startDateRef.current, endDateRef.current);
  }, []);

  // ── CORE FETCH — receives (from, to) as Date objects, never reads state ───
  const doFetch = async (from, to) => {
    const fromStr = toQueryDate(from);
    const toStr = toQueryDate(to);

    console.log(`[WalletLedger] API call → from=${fromStr} to=${toStr}`);

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const headerToken = await AsyncStorage.getItem('header_token');

      if (!headerToken) {
        setError('Session expired. Please login again.');
        return;
      }

      const result = await getWalletReport({ from: fromStr, to: toStr, headerToken });

      console.log('[WalletLedger] result.success =', result?.success, '| count =', result?.data?.length);

      if (result?.success) {
        setTransactions(result.data || []);
        setLoadedFrom(from);
        setLoadedTo(to);
      } else {
        setError(result?.message || 'Failed to fetch wallet report.');
        setTransactions([]);
      }
    } catch (e) {
      console.log('[WalletLedger] network error:', e?.message);
      setError('Network error. Please check your connection.');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // ── Search button — uses refs (always latest) ─────────────────────────────
  const handleSearch = () => {
    doFetch(startDateRef.current, endDateRef.current);
  };

  // ── Calendar open ─────────────────────────────────────────────────────────
  const openCal = (target) => {
    setCalTarget(target);
    setCalVisible(true);
  };

  // ── Calendar confirm ──────────────────────────────────────────────────────
  // FIXED: compute (newFrom, newTo) correctly BEFORE calling doFetch.
  // Do NOT call doFetch here — user should tap "Search" to apply.
  // (Auto-search removed so user can pick BOTH dates before fetching.)
  const onCalConfirm = useCallback((selectedDate) => {
    // 1. Update ref synchronously
    if (calTarget === 'start') {
      startDateRef.current = selectedDate;
      setStartDate(selectedDate);
    } else {
      endDateRef.current = selectedDate;
      setEndDate(selectedDate);
    }
    setCalVisible(false);
  }, [calTarget]);

  const onCalCancel = useCallback(() => setCalVisible(false), []);

  // ── FILTERED LIST — derived from transactions state ─────────────────────
  const filteredTransactions = transactions.filter(item => {
    if (!item.createdAt) return false;
    const itemDate = new Date(item.createdAt);
    // Comparison using local date string "YYYY-MM-DD" for inclusive date-only filter
    const itemStr = toQueryDate(itemDate);
    const startStr = toQueryDate(startDate);
    const endStr = toQueryDate(endDate);
    return itemStr >= startStr && itemStr <= endStr;
  });

  // ── List header ───────────────────────────────────────────────────────────
  const ListHeader = () => (
    <FadeSlideUp duration={400}>
      <View style={S.filterCard}>
        <Text style={S.filterCardTitle}>FILTER BY DATE RANGE</Text>
        <View style={S.filterRow}>
          <DateFilterBtn label="From" date={startDate} onPress={() => openCal('start')} />
          <Icon name="arrow-right" size={rs(16)} color={Colors.gray} style={{ paddingHorizontal: scale(4) }} />
          <DateFilterBtn label="To" date={endDate} onPress={() => openCal('end')} />
        </View>

        <TouchableOpacity
          style={[S.searchBtn, loading && { opacity: 0.7 }]}
          activeOpacity={0.85}
          onPress={handleSearch}
          disabled={loading}
        >
          {loading
            ? <ActivityIndicator size="small" color="#fff" />
            : <>
              <Icon name="magnify" size={rs(16)} color="#fff" style={{ marginRight: scale(6) }} />
              <Text style={S.searchBtnTxt}>Search Transactions</Text>
            </>
          }
        </TouchableOpacity>
      </View>

      {/* Summary — shows range + stats of what's currently filtered */}
      {filteredTransactions.length > 0 && (
        <SummaryStrip data={filteredTransactions} fromDate={startDate} toDate={endDate} />
      )}

      {searched && !loading && (
        <View style={S.sectionRow}>
          <Icon name="format-list-bulleted" size={rs(11)} color={Colors.gray} style={{ marginRight: scale(5) }} />
          <Text style={S.sectionLabel}>
            {filteredTransactions.length > 0
              ? `${filteredTransactions.length} Transaction${filteredTransactions.length !== 1 ? 's' : ''}`
              : 'No transactions found for this range'}
          </Text>
        </View>
      )}
    </FadeSlideUp>
  );

  return (
    <SafeAreaView style={S.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <Animated.View style={[S.header, { opacity: headerOp, transform: [{ translateY: headerTY }] }]}>
        <TouchableOpacity
          onPress={() => navigation?.goBack()}
          style={S.headerBackBtn}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="arrow-left" size={rs(22)} color="#fff" />
        </TouchableOpacity>
        <Text style={S.headerTitle}>Wallet Ledger</Text>
        <View style={S.headerSpacer} />
      </Animated.View>

      {/* Error banner */}
      {!!error && (
        <View style={S.errorBanner}>
          <Icon name="alert-circle-outline" size={rs(16)} color="#DC2626" style={{ marginRight: scale(8) }} />
          <Text style={S.errorTxt} numberOfLines={2}>{error}</Text>
          <TouchableOpacity onPress={handleSearch} style={S.retryBtn}>
            <Text style={S.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        data={filteredTransactions}
        keyExtractor={(item) => item._id}
        renderItem={({ item, index }) => <TransactionCard item={item} index={index} />}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={
          searched && !loading && !error ? (
            <View style={S.emptyWrap}>
              <Icon name="file-search-outline" size={rs(48)} color={Colors.accent + '60'} />
              <Text style={S.emptyTitle}>No transactions found</Text>
              <Text style={S.emptySub}>Try selecting a different date range and tap Search</Text>
            </View>
          ) : null
        }
        contentContainerStyle={S.listContent}
        showsVerticalScrollIndicator={false}
      />

      <CalendarModal
        visible={calVisible}
        initialDate={calTarget === 'start' ? startDate : endDate}
        title={calTarget === 'start' ? 'Select Start Date' : 'Select End Date'}
        onConfirm={onCalConfirm}
        onCancel={onCalCancel}
      />
    </SafeAreaView>
  );
};

export default WalletTransactionScreen;

// ══════════════════════════════════════════════════════════════════════════════
//  CARD STYLES
// ══════════════════════════════════════════════════════════════════════════════
const C = StyleSheet.create({
  card: {
    marginHorizontal: scale(14), marginBottom: vs(10),
    backgroundColor: '#fff', borderRadius: scale(16),
    flexDirection: 'row', overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 6,
  },
  leftBar: { width: scale(5) },
  body: { flex: 1, paddingHorizontal: scale(12), paddingTop: vs(12), paddingBottom: vs(4) },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: vs(6) },
  typePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(9), paddingVertical: vs(4), borderRadius: scale(20), gap: scale(5) },
  typePillTxt: { fontSize: rs(10), fontFamily: Fonts.Bold, letterSpacing: 0.5 },
  amount: { fontSize: rs(20), fontFamily: Fonts.Bold },
  desc: { fontSize: rs(13), fontFamily: Fonts.Medium, color: Colors.primary, marginBottom: vs(10), lineHeight: rs(20) },
  metaRow: { flexDirection: 'row', gap: scale(12), marginBottom: vs(4) },
  metaLeft: { flex: 1 },
  metaRight: { flex: 1.8 },
  metaLbl: { fontSize: rs(8), fontFamily: Fonts.Bold, color: Colors.gray, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: vs(2) },
  metaVal: { fontSize: rs(11), fontFamily: Fonts.Medium, color: Colors.primary },
  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: vs(10), gap: scale(8) },
  toggleLine: { flex: 1, height: 1, backgroundColor: '#EBEBEB' },
  toggleChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(12), paddingVertical: vs(5), borderRadius: scale(16), borderWidth: 1 },
  toggleTxt: { fontSize: rs(10), fontFamily: Fonts.Bold, letterSpacing: 0.2 },
  expandClip: { overflow: 'hidden' },
  ghost: { position: 'absolute', left: 0, right: 0, opacity: 0, zIndex: -1, top: 9999 },
  expandDivider: { height: 1, backgroundColor: '#F0F0F0', marginBottom: vs(12) },
  balanceCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F5F7FA', borderRadius: scale(12),
    paddingHorizontal: scale(14), paddingVertical: vs(12), marginBottom: vs(12),
  },
  balanceHalf: { flex: 1 },
  balanceLbl: { fontSize: rs(9), fontFamily: Fonts.Regular ?? Fonts.Medium, color: Colors.gray, marginBottom: vs(3), letterSpacing: 0.3 },
  balanceAmt: { fontSize: rs(15), fontFamily: Fonts.Bold, color: Colors.primary },
  balanceSep: { width: scale(30), height: scale(30), borderRadius: scale(15), alignItems: 'center', justifyContent: 'center', marginHorizontal: scale(8), backgroundColor: 'rgba(0,0,0,0.04)' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: vs(12) },
  infoItem: { flex: 1 },
  infoLbl: { fontSize: rs(8), fontFamily: Fonts.Bold, color: Colors.gray, letterSpacing: 0.8, marginBottom: vs(4), textTransform: 'uppercase' },
  infoVal: { fontSize: rs(12), fontFamily: Fonts.Medium, color: Colors.primary },
  chip: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', paddingHorizontal: scale(10), paddingVertical: vs(3), borderRadius: scale(8) },
  chipTxt: { fontSize: rs(11), fontFamily: Fonts.Bold, letterSpacing: 0.4 },
  actionRow: { flexDirection: 'row', gap: scale(10), marginBottom: vs(6) },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: scale(10), paddingVertical: vs(10) },
  actionTxt: { color: '#fff', fontSize: rs(12), fontFamily: Fonts.Bold, letterSpacing: 0.2 },
});

// ══════════════════════════════════════════════════════════════════════════════
//  SCREEN STYLES
// ══════════════════════════════════════════════════════════════════════════════
const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  listContent: { paddingBottom: vs(40) },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scale(14), paddingVertical: vs(12),
    backgroundColor: Colors.primary,
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 5,
  },
  headerBackBtn: { width: scale(30), justifyContent: 'center', alignItems: 'flex-start' },
  headerTitle: { flex: 1, textAlign: 'center', color: '#fff', fontSize: rs(16), fontFamily: Fonts.Bold, letterSpacing: 0.4 },
  headerSpacer: { width: scale(30) },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#FEF2F2', borderLeftWidth: 4, borderLeftColor: '#DC2626',
    marginHorizontal: scale(14), marginTop: vs(10),
    paddingHorizontal: scale(12), paddingVertical: vs(8), borderRadius: scale(8),
  },
  errorTxt: { flex: 1, color: '#DC2626', fontSize: rs(12), fontFamily: Fonts.Medium },
  retryBtn: { marginLeft: scale(8) },
  retryTxt: { color: Colors.primary, fontSize: rs(12), fontFamily: Fonts.Bold },
  filterCard: {
    marginHorizontal: scale(14), marginTop: vs(14), marginBottom: vs(10),
    backgroundColor: '#fff', borderRadius: scale(14), padding: scale(12),
    elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6,
  },
  filterCardTitle: { color: Colors.gray, fontSize: rs(9), fontFamily: Fonts.Bold, letterSpacing: 1.1, marginBottom: vs(8) },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(10) },
  datePill: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8F9FC', borderRadius: scale(10),
    paddingVertical: vs(9), paddingHorizontal: scale(10),
    borderWidth: 1.5, borderColor: Colors.accent, gap: scale(4),
  },
  datePillLabel: { color: Colors.gray, fontSize: rs(9), fontFamily: Fonts.Medium, letterSpacing: 0.3, marginBottom: vs(1) },
  datePillValue: { color: Colors.primary, fontSize: rs(12), fontFamily: Fonts.Bold },
  searchBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.primary, borderRadius: scale(10),
    paddingVertical: vs(11), minHeight: vs(40),
  },
  searchBtnTxt: { color: '#fff', fontSize: rs(13), fontFamily: Fonts.Bold, letterSpacing: 0.4 },

  // Summary wrapper (range badge + stats)
  summaryWrap: {
    marginHorizontal: scale(14), marginBottom: vs(12),
    backgroundColor: '#fff', borderRadius: scale(12),
    overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  rangeBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.accent + '12',
    paddingHorizontal: scale(14), paddingVertical: vs(7),
    borderBottomWidth: 1, borderBottomColor: Colors.accent + '20',
  },
  rangeBadgeTxt: { fontSize: rs(11), fontFamily: Fonts.Medium, color: Colors.primary },
  summaryStrip: { flexDirection: 'row', paddingVertical: vs(14) },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryVal: { fontSize: rs(14), fontFamily: Fonts.Bold, marginBottom: vs(2) },
  summaryLabel: { color: Colors.gray, fontSize: rs(9), fontFamily: Fonts.Medium, marginTop: vs(1) },
  summaryDivider: { width: 1, backgroundColor: '#EBEBEB' },

  sectionRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(14), marginBottom: vs(6) },
  sectionLabel: { color: Colors.gray, fontSize: rs(9), fontFamily: Fonts.Bold, letterSpacing: 1.1, textTransform: 'uppercase' },
  emptyWrap: { alignItems: 'center', paddingTop: vs(40), paddingBottom: vs(20) },
  emptyTitle: { color: Colors.primary, fontSize: rs(15), fontFamily: Fonts.Bold, marginTop: vs(14), marginBottom: vs(4) },
  emptySub: { color: Colors.gray, fontSize: rs(12), fontFamily: Fonts.Regular ?? Fonts.Medium, textAlign: 'center', paddingHorizontal: scale(20) },
});

// ══════════════════════════════════════════════════════════════════════════════
//  CALENDAR STYLES
// ══════════════════════════════════════════════════════════════════════════════
const cal = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: CAL_H_PAD },
  sheet: { backgroundColor: '#fff', borderRadius: scale(20), width: '100%', overflow: 'hidden', elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 18 },
  header: { backgroundColor: Colors.primary, paddingHorizontal: scale(14), paddingTop: vs(16), paddingBottom: vs(12) },
  headerRow1: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: vs(6) },
  headerLabel: { color: 'rgba(255,255,255,0.75)', fontSize: rs(11), fontFamily: Fonts.Bold, letterSpacing: 0.5 },
  closeBtn: { width: scale(28), height: scale(28), borderRadius: scale(14), backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  selectedDateText: { color: '#fff', fontSize: rs(20), fontFamily: Fonts.Bold, letterSpacing: 0.2, marginBottom: vs(10) },
  monthNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  monthYearTxt: { color: '#fff', fontSize: rs(14), fontFamily: Fonts.Bold, letterSpacing: 0.3 },
  weekRow: { flexDirection: 'row', backgroundColor: Colors.secondary, paddingVertical: vs(7) },
  weekCell: { width: `${100 / 7}%`, alignItems: 'center' },
  weekTxt: { color: Colors.gray, fontSize: rs(10), fontFamily: Fonts.Bold },
  weekEndTxt: { color: Colors.accent },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: CAL_G_PAD, paddingTop: vs(8), paddingBottom: vs(8) },
  cellOuter: { width: `${100 / 7}%`, height: CELL_SIZE + vs(4), alignItems: 'center', justifyContent: 'center', marginVertical: vs(2) },
  cellInner: { width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  selCircle: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: CIRCLE_SIZE / 2, backgroundColor: Colors.accent },
  todayRing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: CIRCLE_SIZE / 2, borderWidth: 2, borderColor: Colors.accent },
  dayTxt: { fontSize: rs(13), fontFamily: Fonts.Medium, color: Colors.primary, zIndex: 1 },
  dayEmpty: { color: 'transparent' },
  dayWeekendTxt: { color: Colors.accent },
  daySelTxt: { color: '#fff', fontFamily: Fonts.Bold },
  dayTodayTxt: { color: Colors.accent, fontFamily: Fonts.Bold },
  footer: { flexDirection: 'row', padding: scale(10), gap: scale(8), borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  cancelBtn: { flex: 1, paddingVertical: vs(11), borderRadius: scale(10), backgroundColor: '#F4F4F4', alignItems: 'center' },
  cancelTxt: { color: Colors.gray, fontSize: rs(13), fontFamily: Fonts.Medium },
  confirmBtn: { flex: 2, flexDirection: 'row', paddingVertical: vs(11), borderRadius: scale(10), backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center' },
  confirmTxt: { color: '#fff', fontSize: rs(13), fontFamily: Fonts.Bold, letterSpacing: 0.3 },
});