import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  TextInput,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  Modal,
  Image,
  Animated,
  Easing,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "../../../constants/Colors";
import Fonts from "../../../constants/Fonts";
import {
  fetchBbpsBill,
  validateBbpsBill,
  payBbpsBill,
  fetchParticularCategoryBillers,
  fetchBillerInfo,
} from "../../../api/AuthApi";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** Dynamic emoji icon map by category keyword */
const getCategoryIcon = (name = "") => {
  const n = name.toLowerCase();
  if (n.includes("electric")) return "⚡";
  if (n.includes("water")) return "💧";
  if (n.includes("gas")) return "🔥";
  if (n.includes("mobile") || n.includes("prepaid")) return "📱";
  if (n.includes("dth")) return "📺";
  if (n.includes("cable")) return "📡";
  if (n.includes("broadband") || n.includes("internet")) return "🌐";
  if (n.includes("landline")) return "☎️";
  if (n.includes("insurance")) return "🛡️";
  if (n.includes("credit")) return "💳";
  if (n.includes("loan")) return "🏦";
  if (n.includes("tax")) return "🧾";
  if (n.includes("education") || n.includes("school")) return "🎓";
  if (n.includes("hospital") || n.includes("health")) return "🏥";
  if (n.includes("fastag") || n.includes("toll")) return "🚗";
  if (n.includes("card")) return "💳";
  return "📁";
};

const isDobField = (field) => {
  const n = (field.name || "").toLowerCase();
  const l = (field.label || "").toLowerCase();
  const t = (field.type || "").toLowerCase();
  return (
    t === "date" ||
    n.includes("dob") || n.includes("date") || n.includes("birth") ||
    l.includes("dob") || l.includes("date") || l.includes("birth")
  );
};

const formatDate = (d) => {
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}/${mm}/${d.getFullYear()}`;
};

const validateDob = (str) => {
  if (!str) return "Date of Birth is required";
  const parts = str.split("/");
  if (parts.length !== 3) return "Enter date as DD/MM/YYYY";
  const [dd, mm, yyyy] = parts.map(Number);
  if (isNaN(dd) || isNaN(mm) || isNaN(yyyy)) return "Invalid date";
  if (mm < 1 || mm > 12) return "Month must be 01–12";
  if (dd < 1 || dd > 31) return "Day must be 01–31";
  const date = new Date(yyyy, mm - 1, dd);
  if (date.getFullYear() !== yyyy || date.getMonth() !== mm - 1 || date.getDate() !== dd) return "Invalid date";
  const now = new Date();
  if (yyyy < 1900 || (now.getFullYear() - yyyy) > 120) return "Enter a valid birth year";
  if (date > now) return "Date cannot be in the future";
  return null;
};

const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

// ─────────────────────────────────────────────────────────────────────────────
//  Full-Screen Loader Overlay
// ─────────────────────────────────────────────────────────────────────────────
const FullScreenLoader = ({ visible, label = "Loading..." }) => {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spin.stopAnimation();
      spin.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={loaderStyles.overlay} pointerEvents="box-only">
      <View style={loaderStyles.card}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <View style={loaderStyles.ring}>
            <View style={loaderStyles.innerRing} />
          </View>
        </Animated.View>
        <Text style={loaderStyles.label}>{label}</Text>
      </View>
    </View>
  );
};

const loaderStyles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.blackOpacity_45,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 44,
    alignItems: "center",
    elevation: 24,
    shadowColor: Colors.black,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    gap: 16,
  },
  ring: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 4,
    borderColor: Colors.primary,
    borderTopColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  innerRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: Colors.finance_accent + "88",
    borderBottomColor: "transparent",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.slate_700,
    letterSpacing: 0.3,
  },
});

// ─────────────────────────────────────────────────────────────────────────────
//  Calendar Picker Modal
// ─────────────────────────────────────────────────────────────────────────────
const CalendarPicker = ({ visible, onClose, onSelect, initialDate }) => {
  const today = new Date();
  const init = initialDate || today;
  const [viewYear, setViewYear] = useState(init.getFullYear());
  const [viewMonth, setViewMonth] = useState(init.getMonth());
  const [selected, setSelected] = useState(initialDate || null);
  const [yearMode, setYearMode] = useState(false);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay();
  const totalDays = daysInMonth(viewYear, viewMonth);
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: totalDays }, (_, i) => i + 1)];

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const handleDay = (day) => {
    if (!day) return;
    const d = new Date(viewYear, viewMonth, day);
    if (d > today) return;
    setSelected(d); onSelect(d); onClose();
  };

  const isSelected = (day) => selected && selected.getDate() === day && selected.getMonth() === viewMonth && selected.getFullYear() === viewYear;
  const isToday = (day) => today.getDate() === day && today.getMonth() === viewMonth && today.getFullYear() === viewYear;
  const isFuture = (day) => new Date(viewYear, viewMonth, day) > today;

  const yearList = Array.from({ length: today.getFullYear() - 1919 }, (_, i) => today.getFullYear() - i);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={calStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />
        <View style={calStyles.card}>
          <View style={calStyles.header}>
            <TouchableOpacity onPress={prevMonth} style={calStyles.navBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={calStyles.navTxt}>‹</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setYearMode(v => !v)} style={calStyles.monthYearBtn}>
              <Text style={calStyles.monthYearTxt}>{MONTHS[viewMonth]} {viewYear}</Text>
              <Text style={calStyles.dropArrow}>{yearMode ? " ▲" : " ▼"}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={nextMonth} style={calStyles.navBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={calStyles.navTxt}>›</Text>
            </TouchableOpacity>
          </View>

          {yearMode ? (
            <FlatList
              data={yearList} keyExtractor={(y) => String(y)} style={calStyles.yearList}
              showsVerticalScrollIndicator={false} initialScrollIndex={0}
              getItemLayout={(_, i) => ({ length: 44, offset: 44 * i, index: i })}
              renderItem={({ item: yr }) => (
                <TouchableOpacity
                  style={[calStyles.yearItem, yr === viewYear && calStyles.yearItemSelected]}
                  onPress={() => { setViewYear(yr); setYearMode(false); }}
                >
                  <Text style={[calStyles.yearItemTxt, yr === viewYear && calStyles.yearItemTxtSelected]}>{yr}</Text>
                </TouchableOpacity>
              )}
            />
          ) : (
            <>
              <View style={calStyles.dayRow}>
                {DAYS_SHORT.map((d) => <Text key={d} style={calStyles.dayHeader}>{d}</Text>)}
              </View>
              <View style={calStyles.grid}>
                {cells.map((day, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[calStyles.cell, isSelected(day) && calStyles.cellSelected, isToday(day) && !isSelected(day) && calStyles.cellToday, (!day || isFuture(day)) && calStyles.cellDisabled]}
                    onPress={() => handleDay(day)} disabled={!day || isFuture(day)} activeOpacity={day ? 0.7 : 1}
                  >
                    {day ? <Text style={[calStyles.cellTxt, isSelected(day) && calStyles.cellTxtSelected, isToday(day) && !isSelected(day) && calStyles.cellTxtToday, isFuture(day) && calStyles.cellTxtDisabled]}>{day}</Text> : null}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <View style={calStyles.footer}>
            <TouchableOpacity onPress={onClose} style={calStyles.cancelBtn}>
              <Text style={calStyles.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { handleDay(today.getDate()); setViewMonth(today.getMonth()); setViewYear(today.getFullYear()); }}
              style={calStyles.todayBtn}
            >
              <Text style={calStyles.todayTxt}>Today</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Custom Alert Modal
// ─────────────────────────────────────────────────────────────────────────────
const CustomAlert = ({ visible, title, message, type = "error", onClose }) => {
  const isSuccess = type === "success";
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={alertStyles.overlay}>
        <View style={alertStyles.card}>
          <View style={[alertStyles.iconWrap, isSuccess && alertStyles.iconWrapSuccess]}>
            <Text style={alertStyles.icon}>{isSuccess ? "✅" : "⚠"}</Text>
          </View>
          <Text style={alertStyles.title}>{title}</Text>
          <Text style={alertStyles.message}>{message}</Text>
          <TouchableOpacity style={alertStyles.btn} onPress={onClose}>
            <Text style={alertStyles.btnTxt}>OK</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Dropdown — opens a bottom sheet from the SCREEN BOTTOM
// ─────────────────────────────────────────────────────────────────────────────
const Dropdown = ({
  label, value, placeholder, items, keyExtractor, renderLabel,
  onSelect, loading, disabled, searchable, searchPlaceholder,
  emptyLabel = "No results found",
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const anim = useRef(new Animated.Value(0)).current;

  const filtered = useMemo(() => {
    if (!searchable || !search.trim()) return items;
    return items.filter(item => (renderLabel(item) || "").toLowerCase().includes(search.toLowerCase()));
  }, [items, search, searchable]);

  const openDrop = () => {
    if (disabled || loading) return;
    setOpen(true);
    setSearch("");
    Animated.timing(anim, { toValue: 1, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.back(0.5)) }).start();
  };

  const closeDrop = () => {
    Animated.timing(anim, { toValue: 0, duration: 250, useNativeDriver: true, easing: Easing.in(Easing.ease) }).start(() => setOpen(false));
  };

  const handleSelect = (item) => { closeDrop(); onSelect(item); };

  const translateY = anim.interpolate({ inputRange: [0, 1], outputRange: [600, 0] });
  const overlayOpacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <View style={ddStyles.wrap}>
      {!!label && <Text style={ddStyles.label}>{label}</Text>}

      {/* Trigger */}
      <TouchableOpacity
        style={[ddStyles.trigger, disabled && ddStyles.triggerDisabled, open && ddStyles.triggerOpen]}
        onPress={openDrop}
        activeOpacity={disabled ? 1 : 0.78}
      >
        {loading ? (
          <View style={ddStyles.row}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={ddStyles.loadingTxt}>  Loading…</Text>
          </View>
        ) : (
          <View style={ddStyles.row}>
            <Text style={[ddStyles.triggerTxt, !value && ddStyles.placeholder]} numberOfLines={1}>
              {value || placeholder}
            </Text>
            <Text style={[ddStyles.chevron, open && ddStyles.chevronOpen]}>›</Text>
          </View>
        )}
      </TouchableOpacity>

      {/* Dropdown Portal via Modal as a Bottom Sheet */}
      <Modal visible={open} transparent animationType="none" onRequestClose={closeDrop}>
        <View style={ddStyles.modalOverlay}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.blackOpacity_50, opacity: overlayOpacity }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={closeDrop} />
          </Animated.View>

          <Animated.View
            style={[
              ddStyles.dropdown,
              {
                transform: [{ translateY }],
              },
            ]}
          >
            <View style={ddStyles.handle} />
            <Text style={ddStyles.sheetTitle}>{label || "Select Option"}</Text>
            {searchable && (
              <View style={ddStyles.searchWrap}>
                <Text style={ddStyles.searchIcon}>🔍</Text>
                <TextInput
                  style={ddStyles.searchInput}
                  placeholder={searchPlaceholder || "Search…"}
                  placeholderTextColor="#B0B8CC"
                  value={search}
                  onChangeText={setSearch}
                  autoFocus
                />
                {!!search && (
                  <TouchableOpacity onPress={() => setSearch("")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Text style={ddStyles.clearBtn}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            <FlatList
              data={filtered}
              keyExtractor={(item, i) => keyExtractor ? keyExtractor(item, i) : String(i)}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              renderItem={({ item, index }) => {
                const itemLabel = renderLabel(item);
                const icon = getCategoryIcon(itemLabel);
                const isSelected = value === itemLabel;
                return (
                  <TouchableOpacity
                    style={[ddStyles.item, isSelected && ddStyles.itemSelected]}
                    onPress={() => handleSelect(item)}
                    activeOpacity={0.7}
                  >
                    <View style={[ddStyles.itemIconBox, isSelected && ddStyles.itemIconBoxSelected]}>
                      <Text style={ddStyles.itemIcon}>{icon}</Text>
                    </View>
                    <Text style={[ddStyles.itemTxt, isSelected && ddStyles.itemTxtSelected]} numberOfLines={1}>
                      {itemLabel}
                    </Text>
                    {isSelected && <Text style={ddStyles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
              ListEmptyComponent={
                <View style={ddStyles.emptyWrap}>
                  <Text style={ddStyles.emptyTxt}>{emptyLabel}</Text>
                </View>
              }
            />
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  DynamicField
// ─────────────────────────────────────────────────────────────────────────────
const DynamicField = ({ field, value, onChangeText, totalFields, index, onOpenCalendar, dobError }) => {
  const isDate = isDobField(field);
  return (
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel}>
        {field.label}
        {field.mandatory && <Text style={styles.req}> *</Text>}
      </Text>
      {isDate ? (
        <>
          <TouchableOpacity
            style={[styles.textInput, styles.dobInput, dobError && styles.inputError]}
            onPress={onOpenCalendar} activeOpacity={0.75}
          >
            <Text style={[styles.dobTxt, !value && styles.placeholder]}>{value || "DD/MM/YYYY"}</Text>
            <Text style={styles.calIcon}>📅</Text>
          </TouchableOpacity>
          {dobError && <Text style={styles.errorInline}>⚠ {dobError}</Text>}
          <Text style={styles.hint}>Format: DD/MM/YYYY</Text>
        </>
      ) : (
        <>
          <TextInput
            style={styles.textInput}
            placeholder={`Enter ${field.label}`}
            placeholderTextColor="#B0B8CC"
            keyboardType={field.type === "NUMERIC" || field.type === "NUM" ? "numeric" : field.type === "EMAIL" ? "email-address" : "default"}
            maxLength={field.maxLength > 0 ? field.maxLength : undefined}
            value={value}
            onChangeText={onChangeText}
            returnKeyType={index < totalFields - 1 ? "next" : "done"}
            autoCorrect={false}
            autoCapitalize="none"
            blurOnSubmit={index === totalFields - 1}
          />
          {(field.minLength > 1 || field.maxLength > 0) && (
            <Text style={styles.hint}>
              {field.minLength > 1 ? `Min ${field.minLength}` : ""}
              {field.minLength > 1 && field.maxLength > 0 ? " · " : ""}
              {field.maxLength > 0 ? `Max ${field.maxLength} chars` : ""}
            </Text>
          )}
        </>
      )}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  Main Screen
// ─────────────────────────────────────────────────────────────────────────────
const BbpsDynamicServiceScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { serviceType } = route.params || {};

  const [services, setServices] = useState([]);
  const [billers, setBillers] = useState([]);
  const [dynamicFields, setDynamicFields] = useState([]);
  const [billerDetail, setBillerDetail] = useState(null);

  const [selectedService, setSelectedService] = useState(
    serviceType ? { name: serviceType, cat_key: serviceType } : null
  );
  const [selectedBiller, setSelectedBiller] = useState(null);

  const [formData, setFormData] = useState({});
  const [dobErrors, setDobErrors] = useState({});

  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activeCalField, setActiveCalField] = useState(null);

  const [servicesLoading, setServicesLoading] = useState(false);
  const [billersLoading, setBillersLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  const [alert, setAlert] = useState({ visible: false, title: "", message: "", type: "error" });
  const showAlert = (title, message, type = "error") => setAlert({ visible: true, title, message, type });
  const hideAlert = () => setAlert(prev => ({ ...prev, visible: false }));

  const [fetchedBill, setFetchedBill] = useState(null);
  const [selectedPayAmount, setSelectedPayAmount] = useState(null);
  const [isCustomAmount, setIsCustomAmount] = useState(false);
  const [customAmountStr, setCustomAmountStr] = useState("");

  // Combined loader state for the full-screen spinner
  const isGlobalLoading = servicesLoading || billersLoading || detailsLoading;

  useEffect(() => {
    if (serviceType) loadBillers(serviceType);
    else loadServices();
  }, [serviceType]);

  // ─── loaders ──────────────────────────────────────────────────────────────
  const loadServices = async () => {
    setServicesLoading(true);
    await new Promise(r => setTimeout(r, 600));
    setServices([
      { id: 1, name: "Electricity", cat_key: "ELECTRICITY" },
      { id: 2, name: "Water", cat_key: "WATER" },
      { id: 3, name: "Gas", cat_key: "GAS" },
      { id: 4, name: "Mobile Prepaid", cat_key: "MOBILE_PREPAID" },
      { id: 5, name: "DTH", cat_key: "DTH" },
      { id: 6, name: "Broadband Postpaid", cat_key: "BROADBAND" },
    ]);
    setServicesLoading(false);
  };

  const loadBillers = async (cat_key) => {
    setBillersLoading(true);
    setBillers([]); setSelectedBiller(null); setDynamicFields([]);
    setBillerDetail(null); setDetailsError(null);
    setFormData({}); setDobErrors({});
    setFetchedBill(null); setSelectedPayAmount(null);
    setIsCustomAmount(false); setCustomAmountStr("");
    try {
      const token = await AsyncStorage.getItem("header_token");
      const res = await fetchParticularCategoryBillers({ category: cat_key, headerToken: token });
      if (res?.success && res.data) setBillers(res.data);
      else setDetailsError(res?.message || "Failed to load billers");
    } catch (err) {
      setDetailsError("Network error. Please try again.");
    } finally {
      setBillersLoading(false);
    }
  };

  const loadBillerDetails = async (biller) => {
    setDetailsLoading(true); setDetailsError(null);
    setDynamicFields([]); setBillerDetail(null);
    setFormData({}); setDobErrors({});
    setFetchedBill(null); setSelectedPayAmount(null);
    setIsCustomAmount(false); setCustomAmountStr("");

    const bId = biller.billerId || biller.biller_id || biller.id;
    if (!bId) { setDetailsError("Biller ID is missing."); setDetailsLoading(false); return; }

    try {
      const token = await AsyncStorage.getItem("header_token");
      const res = await fetchBillerInfo({ billerId: bId, headerToken: token });
      if (res?.success && res.data?.biller) {
        setBillerDetail(res.data.biller);
        const paramsRaw = res.data.biller.billerInputParams?.paramInfo;
        const params = Array.isArray(paramsRaw) ? paramsRaw : paramsRaw ? [paramsRaw] : [];
        setDynamicFields(params.map(p => ({
          name: p.paramName, label: p.paramName,
          type: p.dataType === "NUMERIC" ? "NUMERIC" : "TEXT",
          mandatory: p.isOptional === "false",
          minLength: p.minLength ? Number(p.minLength) : undefined,
          maxLength: p.maxLength ? Number(p.maxLength) : undefined,
          regEx: p.regEx,
        })));
      } else {
        setDetailsError(res?.message || "Failed to load biller details");
      }
    } catch (err) {
      setDetailsError("Network error. Please try again.");
    } finally {
      setDetailsLoading(false);
    }
  };

  // ─── handlers ─────────────────────────────────────────────────────────────
  const handleFieldChange = useCallback((name, text) => {
    setFormData(prev => ({ ...prev, [name]: text }));
    setFetchedBill(null); setSelectedPayAmount(null);
    setIsCustomAmount(false); setCustomAmountStr("");
  }, []);

  const handleOpenCalendar = useCallback((field) => { setActiveCalField(field); setCalendarOpen(true); }, []);

  const handleDateSelect = useCallback((date) => {
    if (!activeCalField) return;
    setFormData(prev => ({ ...prev, [activeCalField.name]: formatDate(date) }));
    setDobErrors(prev => ({ ...prev, [activeCalField.name]: null }));
  }, [activeCalField]);

  const handleSelectService = (item) => {
    setSelectedService(item);
    loadBillers(item.cat_key);
  };

  const handleSelectBiller = (biller) => {
    setSelectedBiller(biller);
    loadBillerDetails(biller);
  };

  const handleSubmit = () => {
    if (fetchedBill) { performPayBill(); return; }
    if (!selectedService || !selectedBiller) return;

    const newDobErrors = {};
    for (const field of dynamicFields) {
      const val = (formData[field.name] || "").trim();
      if (isDobField(field)) {
        if (field.mandatory && !val) { newDobErrors[field.name] = "Date of Birth is required"; continue; }
        if (val) { const err = validateDob(val); if (err) { newDobErrors[field.name] = err; continue; } }
      } else {
        if (field.mandatory && !val) { showAlert("Required", `Please enter ${field.label}`); return; }
        if (val && field.minLength > 0 && val.length < field.minLength) { showAlert("Invalid", `${field.label} must be at least ${field.minLength} characters`); return; }
      }
    }
    if (Object.values(newDobErrors).some(Boolean)) { setDobErrors(newDobErrors); return; }
    setDobErrors({});

    if (buttonLabel === "Fetch Bill") performFetchBill();
    else performValidateBill();
  };

  const performValidateBill = async () => {
    setDetailsLoading(true);
    try {
      const token = await AsyncStorage.getItem("header_token");
      const bId = selectedBiller.billerId || selectedBiller.biller_id || selectedBiller.id;
      const res = await validateBbpsBill({ billerId: bId, customerParams: formData, headerToken: token });
      if (res?.success) showAlert("Success", res?.message || "Bill Validated", "success");
      else showAlert("Validation Failed", res?.message || "Could not validate bill.", "error");
    } catch { showAlert("Error", "Network error while validating bill.", "error"); }
    finally { setDetailsLoading(false); }
  };

  const performPayBill = async () => {
    const payAmtNum = Number(selectedPayAmount);
    if (isNaN(payAmtNum) || payAmtNum <= 0) {
      showAlert("Invalid Amount", "Please enter a valid amount to pay.");
      return;
    }
    setDetailsLoading(true);
    try {
      const token = await AsyncStorage.getItem("header_token");
      const bId = selectedBiller.billerId || selectedBiller.biller_id || selectedBiller.id;
      const billerData = fetchedBill.data?.billerResponse || fetchedBill;
      const fetchedInputs = fetchedBill.data?.inputParams?.input || [];

      let cMobile = "9999999999", pName = "", pVal = "";
      if (fetchedInputs.length > 0) {
        pName = fetchedInputs[0].paramName || ""; pVal = fetchedInputs[0].paramValue || "";
        for (const input of fetchedInputs) {
          const n = (input.paramName || "").toLowerCase();
          if (n.includes("mobile") || n.includes("phone")) { cMobile = input.paramValue; break; }
        }
      }
      if (!pName) { const pk = Object.keys(formData); pName = dynamicFields.length > 0 ? dynamicFields[0].label : (pk.length > 0 ? pk[0] : ""); pVal = pk.length > 0 ? formData[pk[0]] : ""; }
      if (cMobile === "9999999999") { for (const k of Object.keys(formData)) { if (k.toLowerCase().includes("mobile") || k.toLowerCase().includes("phone")) { cMobile = formData[k]; break; } } }

      const payload = {
        billerId: String(bId), customerMobile: cMobile, placeholderValue: pName, paramValue: pVal,
        ...billerData,
        refid: fetchedBill.refid || fetchedBill.data?.refid || "",
        refId: fetchedBill.refid || fetchedBill.data?.refid || "",
        billAmount: selectedPayAmount, billamount: selectedPayAmount,
        billNumber: billerData.billNumber || "0",
        billPeriod: billerData.billPeriod || billerData.billDate || "NA",
        billperiod: billerData.billPeriod || billerData.billDate || "NA",
        headerToken: token,
      };
      const res = await payBbpsBill(payload);
      if (res?.success) navigateToReceipt(fetchedBill, res);
      else showAlert("Failed", res?.message, "error");
    } catch { showAlert("Error", "Network error while processing payment.", "error"); }
    finally { setDetailsLoading(false); }
  };

  const performFetchBill = async () => {
    setDetailsLoading(true);
    try {
      const token = await AsyncStorage.getItem("header_token");
      const bId = selectedBiller.billerId || selectedBiller.biller_id || selectedBiller.id;
      const res = await fetchBbpsBill({ billerId: bId, customerParams: formData, headerToken: token });
      if (res?.success) {
        setFetchedBill(res.data);
        const amt = (Number((res.data.data?.billerResponse?.billAmount || res.data.billAmount) || 0) / 100).toFixed(2);
        setSelectedPayAmount(amt);
        setIsCustomAmount(false);
        setCustomAmountStr("");
      } else {
        const msg = res?.message || "";
        if (msg.toLowerCase().includes("no bill due")) showAlert("No Bill Due", msg, "success");
        else showAlert("Fetch Failed", msg || "Could not fetch bill details.");
      }
    } catch { showAlert("Error", "Network error while fetching bill."); }
    finally { setDetailsLoading(false); }
  };

  const navigateToReceipt = (fetchedData = null, paymentRes = null) => {
    navigation.navigate("BBPSReceipt", {
      serviceName: selectedService.name,
      billerName: selectedBiller.biller_name || selectedBiller.billerName || selectedBiller.name,
      billerId: selectedBiller.biller_id || selectedBiller.billerId || selectedBiller.id,
      billerDetail, formData, fetchedData,
      transactionId: paymentRes?.data?.transactionId || paymentRes?.transactionId || "TXN" + Date.now(),
      amount: selectedPayAmount,
    });
  };

  // ─── computed ──────────────────────────────────────────────────────────────
  const { buttonLabel, buttonSub } = useMemo(() => {
    const svc = selectedService?.name || "";
    if (fetchedBill) return { buttonLabel: "Proceed to Pay", buttonSub: svc ? `Pay for ${svc}` : "" };
    if (billerDetail?.billerSupportBillValidation === "MANDATORY") return { buttonLabel: "Validate", buttonSub: svc };
    return { buttonLabel: "Fetch Bill", buttonSub: svc ? `Fetch bill for ${svc}` : "" };
  }, [selectedService, billerDetail, fetchedBill]);

  const billerDisplayName = selectedBiller?.biller_name || selectedBiller?.billerName || selectedBiller?.name || "";
  const serviceDisplayName = selectedService?.name || "";

  const activeCalInitialDate = useMemo(() => {
    if (!activeCalField) return null;
    const str = formData[activeCalField.name];
    if (!str) return null;
    const [dd, mm, yyyy] = str.split("/").map(Number);
    if (!dd || !mm || !yyyy) return null;
    return new Date(yyyy, mm - 1, dd);
  }, [activeCalField, formData]);

  // ─── render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Full-screen loader — shows in center of screen */}
      <FullScreenLoader
        visible={isGlobalLoading}
        label={
          servicesLoading ? "Loading services…"
            : billersLoading ? "Loading billers…"
              : "Fetching details…"
        }
      />

      <CalendarPicker
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        onSelect={handleDateSelect}
        initialDate={activeCalInitialDate}
      />

      <CustomAlert
        visible={alert.visible} title={alert.title}
        message={alert.message} type={alert.type} onClose={hideAlert}
      />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>BBPS Services</Text>
        <Text style={styles.headerSub}>Bharat Bill Payment System</Text>
      </View>

      {/* Body */}
      <View style={styles.body}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 80 }}
        >
          {/* Service banner */}
          {selectedService && (
            <View style={styles.serviceBanner}>
              <View style={styles.serviceIconCircle}>
                <Text style={styles.serviceIcon}>{getCategoryIcon(selectedService.name)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.serviceBannerText}>{selectedService.name}</Text>
                <Text style={styles.serviceBannerSubText}>
                  Select your provider below to fetch and pay your bill securely.
                </Text>
              </View>
              <Image source={require('../../../assets/bbps.png')} style={styles.bannerBbpsLogo} />
            </View>
          )}

          {/* Service selector (only shown if no serviceType passed via route) */}
          {!serviceType && (
            <Dropdown
              label="SELECT SERVICE"
              value={serviceDisplayName}
              placeholder="Choose a service"
              items={services}
              keyExtractor={(item) => String(item.id || item.cat_key)}
              renderLabel={(item) => item.name}
              onSelect={handleSelectService}
              loading={servicesLoading}
              disabled={servicesLoading}
              searchable
              searchPlaceholder="Search services…"
              emptyLabel="No services found"
            />
          )}

          {/* Biller selector */}
          {selectedService && (
            <Dropdown
              label="SELECT BILLER"
              value={billerDisplayName}
              placeholder="Choose a biller"
              items={billers}
              keyExtractor={(item, i) => String(item.biller_id || item.billerId || item.id || i)}
              renderLabel={(item) => item.biller_name || item.billerName || item.name || ""}
              onSelect={handleSelectBiller}
              loading={billersLoading}
              disabled={billersLoading || billers.length === 0}
              searchable
              searchPlaceholder="Search billers…"
              emptyLabel="No billers found"
            />
          )}

          {selectedService && !billersLoading && billers.length === 0 && (
            <Text style={styles.infoTxt}>No billers found for "{selectedService.name}".</Text>
          )}

          {/* Error state */}
          {!detailsLoading && detailsError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorTxt}>⚠  {detailsError}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => selectedBiller && loadBillerDetails(selectedBiller)}>
                <Text style={styles.retryTxt}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Dynamic fields */}
          {!detailsLoading && !detailsError && dynamicFields.length > 0 && (
            <View style={styles.fieldsWrap}>
              <Text style={styles.sectionTitle}>ENTER DETAILS</Text>
              {dynamicFields.map((field, idx) => (
                <DynamicField
                  key={`${field.name}_${idx}`}
                  field={field}
                  value={formData[field.name] || ""}
                  onChangeText={(text) => handleFieldChange(field.name, text)}
                  index={idx}
                  totalFields={dynamicFields.length}
                  onOpenCalendar={() => handleOpenCalendar(field)}
                  dobError={dobErrors[field.name] || null}
                />
              ))}
            </View>
          )}

          {!detailsLoading && !detailsError && selectedBiller && dynamicFields.length === 0 && !detailsError && (
            <Text style={styles.infoTxt}>No input fields required for this biller.</Text>
          )}

          {/* Bill summary */}
          {!detailsLoading && !detailsError && fetchedBill && (
            <View style={styles.billDetailsCard}>
              <Text style={styles.billTitle}>Bill Summary</Text>
              {[
                ["Customer Name", fetchedBill.data?.billerResponse?.customerName || fetchedBill.customerName || "N/A"],
                ["Bill Date", fetchedBill.data?.billerResponse?.billDate || fetchedBill.billDate || "N/A"],
                ["Due Date", fetchedBill.data?.billerResponse?.dueDate || fetchedBill.dueDate || "N/A"],
                ["Ref ID", fetchedBill.refid || "N/A"],
              ].map(([lbl, val]) => (
                <View key={lbl} style={styles.billRow}>
                  <Text style={styles.billLabel}>{lbl}</Text>
                  <Text style={[styles.billValue, lbl === "Ref ID" && { fontSize: 11, color: "#6B7280" }]} numberOfLines={1}>{val}</Text>
                </View>
              ))}

              <Text style={[styles.billTitle, { marginTop: 12, borderBottomWidth: 0, paddingBottom: 0 }]}>Select Amount to Pay</Text>

              {(() => {
                const defaultAmt = (Number((fetchedBill.data?.billerResponse?.billAmount || fetchedBill.billAmount) || 0) / 100).toFixed(2);
                const isSel = !isCustomAmount && selectedPayAmount === defaultAmt;
                return (
                  <TouchableOpacity style={[styles.payOption, isSel && styles.payOptionSelected]} onPress={() => { setIsCustomAmount(false); setSelectedPayAmount(defaultAmt); }} activeOpacity={0.8}>
                    <View style={[styles.radioOut, isSel && styles.radioOutSelected]}>{isSel && <View style={styles.radioIn} />}</View>
                    <View style={styles.payOptionContent}>
                      <Text style={[styles.payOptionLabel, isSel && styles.payOptionLabelSelected]}>Total Bill Amount</Text>
                      <Text style={[styles.payOptionValue, isSel && styles.payOptionValueSelected]}>₹ {defaultAmt}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })()}

              {(fetchedBill.data?.additionalInfo?.info || fetchedBill.additionalInfo?.info || []).map((info, idx) => {
                const isNum = !isNaN(Number(info.infoValue)) && info.infoValue.trim() !== "";
                if (!isNum) return (
                  <View key={`info_${idx}`} style={[styles.billRow, { paddingHorizontal: 14 }]}>
                    <Text style={styles.billLabel}>{info.infoName}</Text>
                    <Text style={styles.billValue}>{info.infoValue}</Text>
                  </View>
                );
                const amt = Number(info.infoValue).toFixed(2);
                const isSel = !isCustomAmount && selectedPayAmount === amt;
                return (
                  <TouchableOpacity key={`info_${idx}`} style={[styles.payOption, isSel && styles.payOptionSelected]} onPress={() => { setIsCustomAmount(false); setSelectedPayAmount(amt); }} activeOpacity={0.8}>
                    <View style={[styles.radioOut, isSel && styles.radioOutSelected]}>{isSel && <View style={styles.radioIn} />}</View>
                    <View style={styles.payOptionContent}>
                      <Text style={[styles.payOptionLabel, isSel && styles.payOptionLabelSelected]}>{info.infoName}</Text>
                      <Text style={[styles.payOptionValue, isSel && styles.payOptionValueSelected]}>₹ {amt}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity style={[styles.payOption, isCustomAmount && styles.payOptionSelected, { borderBottomWidth: isCustomAmount ? 0 : 1 }]} onPress={() => { setIsCustomAmount(true); setSelectedPayAmount(customAmountStr || "0"); }} activeOpacity={0.8}>
                <View style={[styles.radioOut, isCustomAmount && styles.radioOutSelected]}>{isCustomAmount && <View style={styles.radioIn} />}</View>
                <View style={styles.payOptionContent}>
                  <Text style={[styles.payOptionLabel, isCustomAmount && styles.payOptionLabelSelected]}>Custom Amount</Text>
                </View>
              </TouchableOpacity>

              {isCustomAmount && (
                <View style={styles.customAmountContainer}>
                  <Text style={styles.rsPrefix}>₹</Text>
                  <TextInput
                    style={styles.customAmountInput}
                    placeholder="Enter amount"
                    placeholderTextColor="#9CA3AF"
                    keyboardType="numeric"
                    value={customAmountStr}
                    onChangeText={(txt) => {
                      const cleaned = txt.replace(/[^0-9.]/g, '');
                      setCustomAmountStr(cleaned);
                      setSelectedPayAmount(cleaned || "0");
                    }}
                  />
                </View>
              )}

              <View style={[styles.billRow, styles.billAmountRow]}>
                <Text style={styles.billAmountLabel}>Payable Amount</Text>
                <Text style={styles.billAmountValue}>₹ {selectedPayAmount || "0.00"}</Text>
              </View>
            </View>
          )}

          {/* Submit button */}
          {selectedBiller && !detailsLoading && !detailsError && (
            <TouchableOpacity style={styles.payBtn} onPress={handleSubmit} activeOpacity={0.85}>
              <Text style={styles.payBtnTxt}>{buttonLabel}</Text>
              {!!buttonSub && <Text style={styles.payBtnSub}>{buttonSub}</Text>}
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default BbpsDynamicServiceScreen;

// ─────────────────────────────────────────────────────────────────────────────
//  Dropdown Styles
// ─────────────────────────────────────────────────────────────────────────────
const ddStyles = StyleSheet.create({
  wrap: { marginBottom: 18 },
  label: { fontSize: 11, fontWeight: "700", color: Colors.primary, letterSpacing: 0.8, marginBottom: 8 },
  trigger: {
    borderWidth: 1, borderColor: Colors.lightGray,
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15,
    backgroundColor: Colors.white, elevation: 2,
    minHeight: 54, justifyContent: "center",
  },
  triggerOpen: { borderColor: Colors.primary, borderWidth: 1.5 },
  triggerDisabled: { opacity: 0.4 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  triggerTxt: { fontSize: 15, color: Colors.black, flex: 1 },
  placeholder: { color: Colors.text_placeholder },
  chevron: { fontSize: 20, color: Colors.slate_400, marginLeft: 10, transform: [{ rotate: "90deg" }] },
  chevronOpen: { transform: [{ rotate: "-90deg" }] },
  loadingTxt: { fontSize: 14, color: Colors.slate_400 },

  dropdown: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    width: "100%",
    maxHeight: SCREEN_H * 0.7,
    paddingBottom: 20,
    elevation: 24,
    shadowColor: Colors.black,
    shadowOpacity: 0.25,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: -4 },
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  sheetTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.primary,
    textAlign: "center",
    letterSpacing: 1,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.slate_50,
  },
  searchWrap: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: Colors.slate_50,
    marginHorizontal: 14,
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  searchIcon: { fontSize: 14, marginRight: 8, color: Colors.slate_400 },
  searchInput: { flex: 1, fontSize: 15, color: Colors.black, paddingVertical: 0, height: 20 },
  clearBtn: { fontSize: 14, color: Colors.slate_400, paddingLeft: 8 },

  item: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F0F2F8",
  },
  itemSelected: { backgroundColor: Colors.primary + "0D" },
  itemIconBox: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: Colors.slate_50,
    justifyContent: "center", alignItems: "center", marginRight: 12,
  },
  itemIconBoxSelected: { backgroundColor: Colors.primary + "1A" },
  itemIcon: { fontSize: 16 },
  itemTxt: { flex: 1, fontSize: 14, color: Colors.black, fontWeight: "500" },
  itemTxtSelected: { color: Colors.primary, fontWeight: "700" },
  checkmark: { fontSize: 14, color: Colors.primary, marginLeft: 8, fontWeight: "700" },
  emptyWrap: { paddingVertical: 24, alignItems: "center" },
  emptyTxt: { fontSize: 13, color: Colors.text_placeholder },
});

// ─────────────────────────────────────────────────────────────────────────────
//  Calendar Styles
// ─────────────────────────────────────────────────────────────────────────────
const calStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.blackOpacity_50, justifyContent: "center", alignItems: "center", paddingHorizontal: 20 },
  card: { width: "100%", backgroundColor: Colors.white, borderRadius: 22, overflow: "hidden", elevation: 20 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: Colors.primary, paddingVertical: 16, paddingHorizontal: 18 },
  navBtn: { padding: 4 },
  navTxt: { fontSize: 26, color: Colors.white, fontWeight: "300", lineHeight: 30 },
  monthYearBtn: { flexDirection: "row", alignItems: "center" },
  monthYearTxt: { fontSize: 17, fontWeight: "700", color: Colors.white },
  dropArrow: { fontSize: 12, color: Colors.whiteOpacity_80 },
  dayRow: { flexDirection: "row", paddingHorizontal: 12, paddingTop: 14, paddingBottom: 6 },
  dayHeader: { flex: 1, textAlign: "center", fontSize: 12, fontWeight: "700", color: Colors.primary, letterSpacing: 0.3 },
  grid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 12, paddingBottom: 10 },
  cell: { width: "14.28%", aspectRatio: 1, alignItems: "center", justifyContent: "center", borderRadius: 100 },
  cellSelected: { backgroundColor: Colors.primary },
  cellToday: { borderWidth: 1.5, borderColor: Colors.primary },
  cellDisabled: { opacity: 0.25 },
  cellTxt: { fontSize: 14, color: Colors.slate_900 },
  cellTxtSelected: { color: Colors.white, fontFamily: Fonts.Bold },
  cellTxtToday: { color: Colors.primary, fontFamily: Fonts.Bold },
  cellTxtDisabled: { color: Colors.slate_400 },
  yearList: { maxHeight: 250 },
  yearItem: { height: 44, justifyContent: "center", alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.divider },
  yearItemSelected: { backgroundColor: Colors.primary + "15" },
  yearItemTxt: { fontSize: 16, color: Colors.slate_900 },
  yearItemTxtSelected: { color: Colors.primary, fontFamily: Fonts.Bold },
  footer: { flexDirection: "row", justifyContent: "flex-end", paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.divider, gap: 12 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  cancelTxt: { fontSize: 14, color: Colors.slate_500, fontFamily: Fonts.SemiBold },
  todayBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.primary + "15", borderRadius: 8 },
  todayTxt: { fontSize: 14, color: Colors.primary, fontFamily: Fonts.Bold },
});

// ─────────────────────────────────────────────────────────────────────────────
//  Main Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.primary },
  header: { paddingVertical: 22, alignItems: "center" },
  headerTitle: { fontSize: 22, fontFamily: Fonts.Bold, color: Colors.white, letterSpacing: 0.3 },
  headerSub: { fontSize: 12, fontFamily: Fonts.Regular, color: Colors.whiteOpacity_60, marginTop: 3 },
  body: { flex: 1, backgroundColor: Colors.bg || "#F4F6FB", paddingHorizontal: 20, paddingTop: 22, borderTopLeftRadius: 26, borderTopRightRadius: 26 },

  serviceBanner: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.white,
    paddingHorizontal: 16, paddingVertical: 14,
    borderRadius: 16, marginBottom: 20,
    elevation: 3, shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4,
    borderWidth: 1, borderColor: "rgba(0,0,0,0.02)",
  },
  bannerBbpsLogo: { width: 70, height: 60, resizeMode: "contain", marginLeft: 10 },
  serviceIconCircle: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: Colors.slate_50,
    justifyContent: "center", alignItems: "center", marginRight: 14,
  },
  serviceIcon: { fontSize: 22 },
  serviceBannerText: { fontSize: 18, fontFamily: Fonts.Bold, color: Colors.black },
  serviceBannerSubText: { fontSize: 11, fontFamily: Fonts.Regular, color: Colors.slate_500, marginTop: 4, lineHeight: 16 },

  fieldsWrap: { marginTop: 6 },
  sectionTitle: { fontSize: 11, fontFamily: Fonts.Bold, color: Colors.primary, letterSpacing: 0.8, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.divider, paddingBottom: 8 },
  inputBlock: { marginBottom: 18 },
  inputLabel: { fontSize: 13, fontFamily: Fonts.SemiBold, color: Colors.black, marginBottom: 7 },
  req: { color: Colors.error },
  textInput: { borderWidth: 1, borderColor: Colors.divider, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.white, fontSize: 15, color: Colors.black, elevation: 2 },
  dobInput: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 },
  dobTxt: { fontSize: 15, color: Colors.black, flex: 1 },
  calIcon: { fontSize: 20 },
  inputError: { borderColor: Colors.error, backgroundColor: Colors.error_light },
  errorInline: { fontSize: 12, color: Colors.error, marginTop: 4, marginLeft: 2 },
  hint: { fontSize: 11, color: Colors.slate_400, marginTop: 4, marginLeft: 2 },

  infoTxt: { textAlign: "center", color: Colors.slate_400, fontSize: 13, marginVertical: 18 },
  errorBox: { marginVertical: 18, padding: 16, backgroundColor: Colors.error_light, borderRadius: 12, borderWidth: 1, borderColor: Colors.divider, alignItems: "center" },
  errorTxt: { fontSize: 13, color: Colors.error_dark, textAlign: "center", lineHeight: 20 },
  retryBtn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 8, backgroundColor: Colors.primary, borderRadius: 8 },
  retryTxt: { color: Colors.white, fontSize: 13, fontFamily: Fonts.SemiBold },
  payBtn: { marginTop: 8, backgroundColor: Colors.finance_accent || Colors.primary, paddingVertical: 12, borderRadius: 16, alignItems: "center", elevation: 5 },
  payBtnTxt: { color: Colors.white, fontSize: 16, fontFamily: Fonts.Bold, letterSpacing: 0.3 },
  payBtnSub: { color: Colors.whiteOpacity_70, fontSize: 11, marginTop: 3 },

  billDetailsCard: { backgroundColor: Colors.white, padding: 18, borderRadius: 16, borderWidth: 1, borderColor: Colors.divider, marginTop: 18, elevation: 3, shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 },
  billTitle: { fontSize: 16, fontFamily: Fonts.Bold, color: Colors.black, marginBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.slate_50, paddingBottom: 8 },
  billRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 7 },
  billLabel: { fontSize: 13, fontFamily: Fonts.Regular, color: Colors.slate_500 },
  billValue: { fontSize: 14, fontFamily: Fonts.SemiBold, color: Colors.slate_900, flex: 1, textAlign: "right", marginLeft: 10 },
  billAmountRow: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.slate_50 },
  billAmountLabel: { fontSize: 14, fontFamily: Fonts.Bold, color: Colors.slate_900 },
  billAmountValue: { fontSize: 18, fontFamily: Fonts.Bold, color: Colors.success_dark },

  payOption: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.slate_50, marginBottom: 4 },
  payOptionSelected: { backgroundColor: "transparent" },
  radioOut: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: Colors.divider, justifyContent: "center", alignItems: "center", marginRight: 12 },
  radioOutSelected: { borderColor: Colors.primary },
  radioIn: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary },
  payOptionContent: { flex: 1, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  payOptionLabel: { fontSize: 14, fontFamily: Fonts.SemiBold, color: Colors.slate_500, flex: 1, paddingRight: 8 },
  payOptionLabelSelected: { color: Colors.primary },
  payOptionValue: { fontSize: 15, fontFamily: Fonts.Bold, color: Colors.slate_900 },
  payOptionValueSelected: { color: Colors.primary },

  customAmountContainer: {
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: Colors.secondary, borderBottomWidth: 1, borderBottomColor: Colors.slate_50,
    flexDirection: "row", alignItems: "center"
  },
  rsPrefix: { fontSize: 16, fontFamily: Fonts.Bold, color: Colors.slate_900, marginRight: 8 },
  customAmountInput: {
    flex: 1, fontSize: 16, fontFamily: Fonts.SemiBold, color: Colors.slate_900, paddingVertical: 4
  },
});

const alertStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: Colors.blackOpacity_50, justifyContent: "center", alignItems: "center", padding: 30 },
  card: { backgroundColor: Colors.white, borderRadius: 24, padding: 25, width: "100%", alignItems: "center", elevation: 20, shadowColor: Colors.black, shadowOpacity: 0.2, shadowRadius: 15 },
  iconWrap: { width: 60, height: 60, borderRadius: 30, backgroundColor: Colors.error_light, alignItems: "center", justifyContent: "center", marginBottom: 15 },
  iconWrapSuccess: { backgroundColor: Colors.success_light },
  icon: { fontSize: 30 },
  title: { fontSize: 18, fontFamily: Fonts.Bold, color: Colors.slate_900, marginBottom: 8, textAlign: "center" },
  message: { fontSize: 14, fontFamily: Fonts.Regular, color: Colors.slate_700, textAlign: "center", lineHeight: 20, marginBottom: 20 },
  btn: { backgroundColor: Colors.finance_accent, paddingVertical: 12, paddingHorizontal: 35, borderRadius: 14, elevation: 4 },
  btnTxt: { color: Colors.white, fontSize: 15, fontFamily: Fonts.Bold },
});