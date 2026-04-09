import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Animated,
  Modal, Dimensions, Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../../constants/Colors';
import Fonts from '../../constants/Fonts';

// ─── Responsive Scaling ───────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get('window');
const BASE_W = 390;
const BASE_H = 844;
const sc = (s) => Math.round((SW / BASE_W) * s);
const vs = (s) => Math.round((SH / BASE_H) * s);
const rs = (s) => Math.round(Math.sqrt((SW * SH) / (BASE_W * BASE_H)) * s);

const CAL_H_PAD = sc(35);
const CAL_G_PAD = sc(10);
const CELL_SIZE = Math.floor((SW - CAL_H_PAD * 2 - CAL_G_PAD * 2) / 7);
const CIRCLE_SIZE = Math.max(CELL_SIZE - sc(8), sc(28));

const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const getFirstDay = (y, m) => new Date(y, m, 1).getDay();
const pad = (n) => String(n).padStart(2, '0');
const formatDisplay = (d) => `${pad(d.getDate())} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;

// ─── Design tokens — local aliasing ───────────────────────────────
const D = {
  cardBg: Colors.white,
  surfaceMid: Colors.slate_50 || '#F8FAFC',
  textPri: Colors.text_primary || '#000000',
  textSec: Colors.text_secondary || '#777777',
  textMuted: Colors.text_placeholder || '#888888',
  gold: Colors.finance_accent || '#C96A00',
  border: Colors.border || 'rgba(0,0,0,0.1)',
  heroBg: Colors.slate_900 || '#0F172A',
};

const CalendarModal = ({ visible, initialDate, title, onConfirm, onCancel, minDate, maxDate }) => {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selDay, setSelDay] = useState(today.getDate());

  const prevVisible = useRef(false);
  useEffect(() => {
    if (visible && !prevVisible.current) {
      const d = initialDate instanceof Date ? initialDate : new Date(initialDate || today);
      if (!isNaN(d)) {
        setViewYear(d.getFullYear()); setViewMonth(d.getMonth()); setSelDay(d.getDate());
      }
    }
    prevVisible.current = visible;
  }, [visible, initialDate]);

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

  // Normalize date for comparison (ignore time)
  const norm = (d) => {
    if (!d) return null;
    const date = new Date(d);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const minD = norm(minDate);
  const maxD = norm(maxDate);
  const tD = norm(today);

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
              
              const currentCellDate = valid ? new Date(viewYear, viewMonth, day) : null;
              const isFuture = valid && currentCellDate > tD;
              
              let selectable = valid;
              if (valid) {
                if (minD && currentCellDate < minD) selectable = false;
                if (maxD && currentCellDate > maxD) selectable = false;
                // Keep the default logic of not allowing future dates if maxDate is not provided
                if (!maxD && currentCellDate > tD) selectable = false;
              }

              return (
                <View key={i} style={cal.cellOuter}>
                  <TouchableOpacity 
                    style={cal.cellInner} 
                    onPress={() => selectable && setSelDay(day)} 
                    activeOpacity={selectable ? 0.7 : 1} 
                    disabled={!selectable}
                  >
                    {sel && <View style={cal.selCircle} />}
                    {tod && !sel && <View style={cal.todayRing} />}
                    <Text style={[
                      cal.dayTxt, 
                      !valid && { color: 'transparent' }, 
                      !selectable && valid && { color: Colors.ink4 || '#B5AFA7', opacity: 0.4 }, 
                      isWE && !sel && selectable && { color: D.gold }, 
                      sel && { color: Colors.white, fontFamily: Fonts.Bold }, 
                      tod && !sel && { color: D.gold, fontFamily: Fonts.Bold }
                    ]}>
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
              <Icon name="check" size={rs(14)} color={Colors.white} style={{ marginRight: sc(5) }} />
              <Text style={cal.confirmTxt}>Apply Date</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default CalendarModal;

// Calendar styles
const cal = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: Colors.blackOpacity_60, justifyContent: 'center', alignItems: 'center', paddingHorizontal: CAL_H_PAD },
  sheet: { backgroundColor: D.cardBg, borderRadius: sc(24), width: '100%', overflow: 'hidden', elevation: 14, shadowColor: Colors.black, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.22, shadowRadius: 18 },
  header: { backgroundColor: D.cardBg, paddingHorizontal: sc(16), paddingTop: vs(18), paddingBottom: vs(14), borderBottomWidth: 1, borderBottomColor: D.border },
  headerRow1: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: vs(6) },
  headerLabel: { color: D.textMuted, fontSize: rs(10), fontFamily: Fonts.Bold, letterSpacing: 0.6, textTransform: 'uppercase' },
  closeBtn: { width: sc(26), height: sc(26), borderRadius: sc(13), backgroundColor: D.surfaceMid, alignItems: 'center', justifyContent: 'center' },
  selectedDateText: { color: D.textPri, fontSize: rs(20), fontFamily: Fonts.Bold, letterSpacing: 0.2, marginBottom: vs(12) },
  monthNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: sc(32), height: sc(32), borderRadius: sc(16), backgroundColor: D.surfaceMid, alignItems: 'center', justifyContent: 'center' },
  monthYearTxt: { color: D.textPri, fontSize: rs(14), fontFamily: Fonts.Bold, letterSpacing: 0.3 },
  weekRow: { flexDirection: 'row', backgroundColor: D.surfaceMid, paddingVertical: vs(8) },
  weekCell: { width: `${100 / 7}%`, alignItems: 'center' },
  weekTxt: { color: D.textMuted, fontSize: rs(10), fontFamily: Fonts.Bold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: CAL_G_PAD, paddingTop: vs(8), paddingBottom: vs(8) },
  cellOuter: { width: `${100 / 7}%`, height: CELL_SIZE + vs(4), alignItems: 'center', justifyContent: 'center', marginVertical: vs(2) },
  cellInner: { width: CIRCLE_SIZE, height: CIRCLE_SIZE, borderRadius: CIRCLE_SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  selCircle: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: CIRCLE_SIZE / 2, backgroundColor: D.gold },
  todayRing: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: CIRCLE_SIZE / 2, borderWidth: 2, borderColor: D.gold },
  dayTxt: { fontSize: rs(13), fontFamily: Fonts.Medium, color: D.textPri, zIndex: 1 },
  footer: { flexDirection: 'row', padding: sc(12), gap: sc(8), borderTopWidth: 1, borderTopColor: D.border },
  cancelBtn: { flex: 1, paddingVertical: vs(12), borderRadius: sc(12), backgroundColor: D.surfaceMid, alignItems: 'center' },
  cancelTxt: { color: D.textSec, fontSize: rs(13), fontFamily: Fonts.Medium },
  confirmBtn: { flex: 2, flexDirection: 'row', paddingVertical: vs(12), borderRadius: sc(12), backgroundColor: D.heroBg, alignItems: 'center', justifyContent: 'center' },
  confirmTxt: { color: Colors.white, fontSize: rs(13), fontFamily: Fonts.Bold, letterSpacing: 0.3 },
});
