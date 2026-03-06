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
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from "../utils/Color";
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

// Expand height — compact, matches actual content
const EXPAND_H = vs(100);

// ─── Sample Data ──────────────────────────────────────────────────────────────
const TRANSACTIONS = [
  { id: '1', txnId: 'WDR6411510517', date: '2026-02-27 17:17:22', amount: 2.0, type: 'DEBIT', description: 'Wallet Debit By Admin' },
  { id: '2', txnId: 'WDR1171400514', date: '2026-02-27 17:14:51', amount: 1.0, type: 'DEBIT', description: 'Wallet Debit By Admin' },
  { id: '3', txnId: 'DMT3443891226', date: '2026-02-27 15:32:20', amount: 9.44, type: 'DEBIT', description: 'DMT Transfer' },
  { id: '4', txnId: 'CRD8821004453', date: '2026-02-27 12:00:10', amount: 500.0, type: 'CREDIT', description: 'Wallet Top Up' },
  { id: '5', txnId: 'WDR9912334401', date: '2026-02-26 09:45:00', amount: 45.0, type: 'DEBIT', description: 'Service Charge' },
];

// ══════════════════════════════════════════════════════════════════════════════
//  CALENDAR MODAL
// ══════════════════════════════════════════════════════════════════════════════
const CalendarModal = ({ visible, initialDate, title, onConfirm, onCancel }) => {
  const [viewYear, setViewYear] = useState(2026);
  const [viewMonth, setViewMonth] = useState(1);
  const [selDay, setSelDay] = useState(27);

  const prevVisible = useRef(false);
  useEffect(() => {
    if (visible && !prevVisible.current) {
      const d = initialDate instanceof Date ? initialDate : new Date(initialDate);
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
      setSelDay(d.getDate());
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
    } else {
      scaleAnim.setValue(0.92);
      opacAnim.setValue(0);
    }
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
  const firstDay = getFirstDay(viewYear, viewMonth);   // 0=Sun … 6=Sat
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;

  const isToday = (day) => {
    const t = new Date();
    return t.getFullYear() === viewYear && t.getMonth() === viewMonth && t.getDate() === day;
  };

  // ── CORRECT weekend detection ──
  // For grid cell i:
  //   - cells 0..(firstDay-1) are empty prefix cells
  //   - actual day = i - firstDay + 1
  // The day-of-week for a valid cell = (firstDay + day - 1) % 7
  //   where 0=Sun, 6=Sat
  // We use this instead of `i % 7` which breaks when firstDay != 0.
  const dayOfWeek = (day) => (firstDay + day - 1) % 7;
  const isWeekend = (day) => dayOfWeek(day) === 0 || dayOfWeek(day) === 6;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onCancel}>
      <View style={cal.backdrop}>
        <Animated.View style={[cal.sheet, { opacity: opacAnim, transform: [{ scale: scaleAnim }] }]}>

          {/* ── Header ── */}
          <View style={cal.header}>
            <View style={cal.headerRow1}>
              <Text style={cal.headerLabel}>{title}</Text>
              <TouchableOpacity onPress={onCancel} style={cal.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={cal.closeText}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={cal.selectedDateText}>
              {formatDisplay(new Date(viewYear, viewMonth, selDay))}
            </Text>
            <View style={cal.monthNavRow}>
              <TouchableOpacity onPress={prevMonth} style={cal.navBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={cal.navBtnTxt}>‹</Text>
              </TouchableOpacity>
              <Text style={cal.monthYearTxt}>{MONTHS_FULL[viewMonth]}  {viewYear}</Text>
              <TouchableOpacity onPress={nextMonth} style={cal.navBtn} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                <Text style={cal.navBtnTxt}>›</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Week day labels ── */}
          <View style={cal.weekRow}>
            {WEEK_DAYS.map((d, i) => (
              <View key={d} style={cal.weekCell}>
                {/* Sun (0) and Sat (6) get accent color */}
                <Text style={[cal.weekTxt, (i === 0 || i === 6) && cal.weekEndTxt]}>{d}</Text>
              </View>
            ))}
          </View>

          {/* ── Date grid ── */}
          <View style={cal.grid}>
            {Array.from({ length: totalCells }).map((_, i) => {
              const day = i - firstDay + 1;        // 1-based date, <=0 = empty
              const valid = day >= 1 && day <= daysInMonth;
              const sel = valid && day === selDay;
              const today = valid && isToday(day);
              // ✅ Use actual day-of-week, NOT grid column index
              const isWE = valid && isWeekend(day);

              return (
                <View key={i} style={cal.cellOuter}>
                  <TouchableOpacity
                    style={cal.cellInner}
                    onPress={() => valid && setSelDay(day)}
                    activeOpacity={valid ? 0.7 : 1}
                    disabled={!valid}
                  >
                    {/* Selected circle */}
                    {sel && <View style={cal.selCircle} />}
                    {/* Today ring (only when not selected) */}
                    {today && !sel && <View style={cal.todayRing} />}

                    <Text style={[
                      cal.dayTxt,
                      !valid && cal.dayEmpty,
                      isWE && !sel && cal.dayWeekendTxt,   // orange for Sun/Sat
                      sel && cal.daySelTxt,               // white when selected
                      today && !sel && cal.dayTodayTxt,     // accent when today
                    ]}>
                      {valid ? day : ''}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* ── Footer ── */}
          <View style={cal.footer}>
            <TouchableOpacity style={cal.cancelBtn} onPress={onCancel} activeOpacity={0.8}>
              <Text style={cal.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={cal.confirmBtn}
              onPress={() => onConfirm(new Date(viewYear, viewMonth, selDay))}
              activeOpacity={0.85}
            >
              <Text style={cal.confirmTxt}>Apply Date  ✓</Text>
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
      <TouchableOpacity
        style={styles.datePill}
        activeOpacity={0.9}
        onPress={() => { buttonPress(sa).start(); onPress(); }}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.datePillLabel}>{label}</Text>
          <Text style={styles.datePillValue}>{formatDisplay(date)}</Text>
        </View>
        <Text style={styles.datePillChevron}>▼</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  SUMMARY STRIP
// ══════════════════════════════════════════════════════════════════════════════
const SummaryStrip = ({ data }) => {
  const totalDebit = data.filter(t => t.type === 'DEBIT').reduce((s, t) => s + t.amount, 0);
  const totalCredit = data.filter(t => t.type === 'CREDIT').reduce((s, t) => s + t.amount, 0);
  const items = [
    { label: 'Total Debit', val: `₹${totalDebit.toFixed(2)}`, color: Colors.accent },
    { label: 'Total Credit', val: `₹${totalCredit.toFixed(2)}`, color: '#16A34A' },
    { label: 'Transactions', val: String(data.length), color: Colors.primary },
  ];
  return (
    <View style={styles.summaryStrip}>
      {items.map((item, i) => (
        <React.Fragment key={item.label}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryLabel}>{item.label}</Text>
            <Text style={[styles.summaryVal, { color: item.color }]}>{item.val}</Text>
          </View>
          {i < 2 && <View style={styles.summaryDivider} />}
        </React.Fragment>
      ))}
    </View>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  ACTION BUTTONS
// ══════════════════════════════════════════════════════════════════════════════
const ActionButtons = ({ txnId }) => {
  const dlSc = useRef(new Animated.Value(1)).current;
  const shSc = useRef(new Animated.Value(1)).current;
  return (
    <View style={styles.actionRow}>
      <Animated.View style={[styles.actionBtnWrap, { transform: [{ scale: dlSc }] }]}>
        <TouchableOpacity
          style={styles.dlBtn}
          activeOpacity={0.88}
          onPress={() => { buttonPress(dlSc).start(); setTimeout(() => Alert.alert('Invoice', `Downloading:\n${txnId}`), 120); }}
        >
          <Text style={styles.dlBtnIcon}>⬇</Text>
          <Text style={styles.dlBtnTxt}>Download Invoice</Text>
        </TouchableOpacity>
      </Animated.View>
      <Animated.View style={[styles.actionBtnWrap, { transform: [{ scale: shSc }] }]}>
        <TouchableOpacity
          style={styles.shareBtn}
          activeOpacity={0.88}
          onPress={() => { buttonPress(shSc).start(); setTimeout(() => Alert.alert('Share', `Sharing:\n${txnId}`), 120); }}
        >
          <Text style={styles.shareBtnIcon}>↗</Text>
          <Text style={styles.shareBtnTxt}>Share Receipt</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  TRANSACTION CARD
// ══════════════════════════════════════════════════════════════════════════════
const TransactionCard = ({ item, index }) => {
  const expandedRef = useRef(false);
  const [expandedUI, setExpandedUI] = useState(false);
  const isAnim = useRef(false);

  const cardOp = useRef(new Animated.Value(0)).current;
  const cardTY = useRef(new Animated.Value(vs(20))).current;
  const heightAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setTimeout(() => {
      Animated.parallel([fadeIn(cardOp, 320), slideUp(cardTY, 320)]).start();
    }, index * 70);
  }, []);

  const isDebit = item.type === 'DEBIT';
  const typeColor = isDebit ? Colors.accent : '#16A34A';
  const typeBg = isDebit ? '#FFF3EE' : '#ECFDF5';
  const amtColor = isDebit ? Colors.accent : '#16A34A';
  const amtPrefix = isDebit ? '− ₹' : '+ ₹';

  const toggle = () => {
    if (isAnim.current) return;
    isAnim.current = true;
    if (!expandedRef.current) {
      expandedRef.current = true;
      setExpandedUI(true);
      Animated.timing(heightAnim, {
        toValue: EXPAND_H, duration: 260,
        easing: Easing.out(Easing.cubic), useNativeDriver: false,
      }).start(() => { heightAnim.setValue(EXPAND_H); isAnim.current = false; });
    } else {
      Animated.timing(heightAnim, {
        toValue: 0, duration: 200,
        easing: Easing.in(Easing.cubic), useNativeDriver: false,
      }).start(() => {
        heightAnim.setValue(0);
        expandedRef.current = false;
        setExpandedUI(false);
        isAnim.current = false;
      });
    }
  };

  return (
    <Animated.View style={[styles.card, { opacity: cardOp, transform: [{ translateY: cardTY }] }]}>
      <View style={[styles.accentBar, { backgroundColor: typeColor }]} />
      <View style={styles.cardBody}>

        {/* Row 1: TXN ID + Amount + Type */}
        <View style={styles.cardRow1}>
          <View style={styles.cardRow1Left}>
            <Text style={styles.txnIdLabel}>TXN ID</Text>
            <Text style={styles.txnIdVal} numberOfLines={1}>{item.txnId}</Text>
          </View>
          <View style={styles.cardRow1Right}>
            <Text style={[styles.amountText, { color: amtColor }]}>{amtPrefix}{item.amount.toFixed(2)}</Text>
            <View style={[styles.typePill, { backgroundColor: typeBg }]}>
              <View style={[styles.typeDot, { backgroundColor: typeColor }]} />
              <Text style={[styles.typePillTxt, { color: typeColor }]}>{item.type}</Text>
            </View>
          </View>
        </View>

        {/* Date */}
        <View style={styles.dateRow}>
          <Text style={styles.dateTxt}>🕐  {item.date}</Text>
        </View>

        {/* Animated expand */}
        <Animated.View style={{ height: heightAnim, overflow: 'hidden' }}>
          <View style={styles.expandInner}>
            <View style={styles.cardDivider} />
            <View style={styles.descRow}>
              <Text style={styles.descLabel}>Description</Text>
              <Text style={styles.descVal} numberOfLines={2}>{item.description}</Text>
            </View>
            <ActionButtons txnId={item.txnId} />
          </View>
        </Animated.View>

        {/* Toggle */}
        <TouchableOpacity style={styles.toggleRow} onPress={toggle} activeOpacity={0.7}>
          <View style={styles.toggleLine} />
          <View style={styles.toggleChip}>
            <Text style={styles.toggleTxt}>{expandedUI ? 'Close  ▲' : 'Details  ▼'}</Text>
          </View>
          <View style={styles.toggleLine} />
        </TouchableOpacity>

      </View>
    </Animated.View>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
const WalletTransactionScreen = ({ navigation }) => {
  const [startDate, setStartDate] = useState(new Date(2026, 1, 27));
  const [endDate, setEndDate] = useState(new Date(2026, 1, 27));
  const [calVisible, setCalVisible] = useState(false);
  const [calTarget, setCalTarget] = useState('start');

  const headerOp = useRef(new Animated.Value(0)).current;
  const headerTY = useRef(new Animated.Value(vs(-24))).current;

  useEffect(() => {
    Animated.parallel([fadeIn(headerOp, 400), slideUp(headerTY, 400)]).start();
  }, []);

  const openCal = (t) => { setCalTarget(t); setCalVisible(true); };
  const onCalConfirm = useCallback((date) => {
    if (calTarget === 'start') setStartDate(date); else setEndDate(date);
    setCalVisible(false);
  }, [calTarget]);
  const onCalCancel = useCallback(() => setCalVisible(false), []);

  const ListHeader = () => (
    <FadeSlideUp duration={400}>
      <View style={styles.brandRow}>
        <View style={styles.brandBadge}>
          <Text style={styles.brandBadgeTxt}>KS</Text>
        </View>
        <View>
          <Text style={styles.brandName}>KS PAY</Text>
          <Text style={styles.brandTagline}>Wallet Ledger</Text>
        </View>
      </View>

      <View style={styles.filterCard}>
        <Text style={styles.filterCardTitle}>FILTER BY DATE RANGE</Text>
        <View style={styles.filterRow}>
          <DateFilterBtn label="From" date={startDate} onPress={() => openCal('start')} />
          <Text style={styles.filterSep}>→</Text>
          <DateFilterBtn label="To" date={endDate} onPress={() => openCal('end')} />
        </View>
        <TouchableOpacity style={styles.searchBtn} activeOpacity={0.85}>
          <Text style={styles.searchBtnTxt}>Search Transactions</Text>
        </TouchableOpacity>
      </View>

      <SummaryStrip data={TRANSACTIONS} />
      <Text style={styles.sectionLabel}>Recent Transactions</Text>
    </FadeSlideUp>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      <Animated.View style={[styles.header, { opacity: headerOp, transform: [{ translateY: headerTY }] }]}>
        <TouchableOpacity onPress={() => navigation?.goBack()} style={styles.headerBtn} activeOpacity={0.7}>
          <Text style={styles.headerBtnTxt}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet Transaction</Text>
        <View style={styles.headerBtn} />
      </Animated.View>

      <FlatList
        data={TRANSACTIONS}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => <TransactionCard item={item} index={index} />}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
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
//  MAIN STYLES
// ══════════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  listContent: { paddingBottom: vs(40) },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: scale(14), paddingVertical: vs(10),
    backgroundColor: Colors.primary,
    elevation: 5, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.18, shadowRadius: 5,
  },
  headerBtn: { width: scale(36), height: scale(36), borderRadius: scale(18), backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerBtnTxt: { color: '#fff', fontSize: rs(18), fontWeight: '700' },
  headerTitle: { color: '#fff', fontSize: rs(15), fontWeight: '800', letterSpacing: 0.3 },

  brandRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(14), paddingTop: vs(14), paddingBottom: vs(10), gap: scale(10) },
  brandBadge: { width: scale(40), height: scale(40), borderRadius: scale(11), backgroundColor: Colors.accent, alignItems: 'center', justifyContent: 'center', elevation: 3, shadowColor: Colors.accent, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.3, shadowRadius: 4 },
  brandBadgeTxt: { color: '#fff', fontSize: rs(13), fontWeight: '900', letterSpacing: 0.8 },
  brandName: { color: Colors.primary, fontSize: rs(18), fontWeight: '900', letterSpacing: 1.2 },
  brandTagline: { color: Colors.gray, fontSize: rs(11), fontWeight: '500' },

  filterCard: { marginHorizontal: scale(14), marginBottom: vs(10), backgroundColor: '#fff', borderRadius: scale(14), padding: scale(12), elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6 },
  filterCardTitle: { color: Colors.gray, fontSize: rs(9), fontWeight: '700', letterSpacing: 1.1, marginBottom: vs(8) },
  filterRow: { flexDirection: 'row', alignItems: 'center', marginBottom: vs(10) },
  filterSep: { color: Colors.gray, fontSize: rs(16), fontWeight: '300', paddingHorizontal: scale(6) },

  datePill: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F8F9FC', borderRadius: scale(10),
    paddingVertical: vs(9), paddingHorizontal: scale(11),
    borderWidth: 1.5, borderColor: Colors.accent,
  },
  datePillLabel: { color: Colors.gray, fontSize: rs(9), fontWeight: '600', letterSpacing: 0.3, marginBottom: vs(1) },
  datePillValue: { color: Colors.primary, fontSize: rs(12), fontWeight: '800' },
  datePillChevron: { color: Colors.accent, fontSize: rs(9), marginLeft: scale(4) },

  searchBtn: { backgroundColor: Colors.primary, borderRadius: scale(10), paddingVertical: vs(11), alignItems: 'center' },
  searchBtnTxt: { color: '#fff', fontSize: rs(13), fontWeight: '800', letterSpacing: 0.4 },

  summaryStrip: { flexDirection: 'row', marginHorizontal: scale(14), marginBottom: vs(12), backgroundColor: '#fff', borderRadius: scale(12), paddingVertical: vs(12), elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  summaryItem: { flex: 1, alignItems: 'center' },
  summaryLabel: { color: Colors.gray, fontSize: rs(9), fontWeight: '600', marginBottom: vs(2) },
  summaryVal: { fontSize: rs(13), fontWeight: '900' },
  summaryDivider: { width: 1, backgroundColor: '#EBEBEB' },

  sectionLabel: { paddingHorizontal: scale(14), marginBottom: vs(6), color: Colors.gray, fontSize: rs(9), fontWeight: '700', letterSpacing: 1.1, textTransform: 'uppercase' },

  card: {
    marginHorizontal: scale(14), marginBottom: vs(10),
    backgroundColor: '#fff', borderRadius: scale(14),
    flexDirection: 'row', overflow: 'hidden',
    elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 5,
  },
  accentBar: { width: scale(4) },
  cardBody: { flex: 1, paddingHorizontal: scale(11), paddingTop: vs(11), paddingBottom: vs(2) },

  cardRow1: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: vs(5) },
  cardRow1Left: { flex: 1, paddingRight: scale(8) },
  txnIdLabel: { color: Colors.gray, fontSize: rs(8), fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: vs(2) },
  txnIdVal: { color: Colors.primary, fontSize: rs(12), fontWeight: '800' },
  cardRow1Right: { alignItems: 'flex-end' },
  amountText: { fontSize: rs(16), fontWeight: '900', marginBottom: vs(4) },
  typePill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(8), paddingVertical: vs(3), borderRadius: scale(16), gap: scale(4) },
  typeDot: { width: scale(5), height: scale(5), borderRadius: scale(3) },
  typePillTxt: { fontSize: rs(9), fontWeight: '800', letterSpacing: 0.4 },

  dateRow: { marginBottom: vs(3) },
  dateTxt: { color: Colors.gray, fontSize: rs(10), fontWeight: '500' },

  expandInner: { backgroundColor: '#fff' },
  cardDivider: { height: 1, backgroundColor: '#EBEBEB', marginTop: vs(6), marginBottom: vs(8) },
  descRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: vs(16) },
  descLabel: { color: Colors.gray, fontSize: rs(11), fontWeight: '700' },
  descVal: { color: Colors.primary, fontSize: rs(11), fontWeight: '600', maxWidth: '55%', textAlign: 'right' },

  actionRow: { flexDirection: 'row', justifyContent: 'center', gap: scale(16) },
  actionBtnWrap: { width: '40%' },

  dlBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: scale(5), backgroundColor: Colors.primary,
    borderRadius: scale(10), paddingVertical: vs(7), paddingHorizontal: scale(6),
  },
  dlBtnIcon: { color: '#fff', fontSize: rs(12), fontWeight: '900' },
  dlBtnTxt: { color: '#fff', fontSize: rs(11), fontWeight: '900', letterSpacing: 0.1 },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: scale(5), backgroundColor: Colors.accent,
    borderRadius: scale(10), paddingVertical: vs(7), paddingHorizontal: scale(6),
  },
  shareBtnIcon: { color: '#fff', fontSize: rs(12), fontWeight: '900' },
  shareBtnTxt: { color: '#fff', fontSize: rs(11), fontWeight: '900', letterSpacing: 0.1 },

  toggleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: vs(8), gap: scale(7) },
  toggleLine: { flex: 1, height: 1, backgroundColor: '#EBEBEB' },
  toggleChip: { paddingHorizontal: scale(9), paddingVertical: vs(3), borderRadius: scale(14), backgroundColor: Colors.accent + '15' },
  toggleTxt: { color: Colors.accent, fontSize: rs(10), fontWeight: '800', letterSpacing: 0.2 },
});

// ══════════════════════════════════════════════════════════════════════════════
//  CALENDAR STYLES
// ══════════════════════════════════════════════════════════════════════════════
const cal = StyleSheet.create({
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: CAL_H_PAD,
  },
  sheet: {
    backgroundColor: '#fff', borderRadius: scale(20), width: '100%', overflow: 'hidden',
    elevation: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 18,
  },

  // ── Header ──
  header: { backgroundColor: Colors.primary, paddingHorizontal: scale(14), paddingTop: vs(16), paddingBottom: vs(12) },
  headerRow1: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: vs(6) },
  headerLabel: { color: 'rgba(255,255,255,0.75)', fontSize: rs(11), fontWeight: '700', letterSpacing: 0.5 },
  closeBtn: { width: scale(28), height: scale(28), borderRadius: scale(14), backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' },
  closeText: { color: '#fff', fontSize: rs(12), fontWeight: '900' },
  selectedDateText: { color: '#fff', fontSize: rs(20), fontWeight: '900', letterSpacing: 0.2, marginBottom: vs(10) },
  monthNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  navBtnTxt: { color: '#fff', fontSize: rs(22), fontWeight: '300', lineHeight: scale(28) },
  monthYearTxt: { color: '#fff', fontSize: rs(14), fontWeight: '800', letterSpacing: 0.3 },

  // ── Week day labels ──
  weekRow: { flexDirection: 'row', backgroundColor: Colors.secondary, paddingVertical: vs(7) },
  weekCell: { width: `${100 / 7}%`, alignItems: 'center' },
  weekTxt: { color: Colors.gray, fontSize: rs(10), fontWeight: '700' },
  weekEndTxt: { color: Colors.accent },          // Sun & Sat column labels in accent

  // ── Date grid ──
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: CAL_G_PAD, paddingTop: vs(8), paddingBottom: vs(8) },
  cellOuter: { width: `${100 / 7}%`, height: CELL_SIZE + vs(4), alignItems: 'center', justifyContent: 'center', marginVertical: vs(2) },
  cellInner: { width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2, alignItems: 'center', justifyContent: 'center' },

  selCircle: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: CIRCLE_SIZE / 2, backgroundColor: Colors.accent },
  todayRing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: CIRCLE_SIZE / 2, borderWidth: 2, borderColor: Colors.accent },

  // Base day text — dark primary color for weekdays
  dayTxt: { fontSize: rs(13), fontWeight: '600', color: Colors.primary, zIndex: 1 },
  dayEmpty: { color: 'transparent' },
  // ✅ Only actual Sun/Sat dates get accent color — not by column position
  dayWeekendTxt: { color: Colors.accent },
  // Selected: white text over accent circle
  daySelTxt: { color: '#fff', fontWeight: '900' },
  // Today (not selected): accent color text + ring
  dayTodayTxt: { color: Colors.accent, fontWeight: '900' },

  // ── Footer ──
  footer: { flexDirection: 'row', padding: scale(10), gap: scale(8), borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  cancelBtn: { flex: 1, paddingVertical: vs(11), borderRadius: scale(10), backgroundColor: '#F4F4F4', alignItems: 'center' },
  cancelTxt: { color: Colors.gray, fontSize: rs(13), fontWeight: '700' },
  confirmBtn: { flex: 2, paddingVertical: vs(11), borderRadius: scale(10), backgroundColor: Colors.accent, alignItems: 'center' },
  confirmTxt: { color: '#fff', fontSize: rs(13), fontWeight: '900', letterSpacing: 0.3 },
});