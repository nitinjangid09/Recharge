import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "../../constants/Colors";
import { fetchBbpsBill, validateBbpsBill, payBbpsBill, fetchParticularCategoryBillers, fetchBillerInfo } from "../../api/AuthApi";
/*
import {
  getServices,
  getBillersByCategory,
  getBillerDetails,
  normaliseFields,
} from "../../api/bbpsApi";
*/

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const BANNER_ICONS = {
  "Electricity": "⚡",
  "Water": "💧",
  "Gas": "🔥",
  "Mobile Prepaid": "📱",
  "DTH": "📺",
  "Cable TV": "📺",
  "Broadband Postpaid": "🌐",
  "Landline Postpaid": "☎️",
  "Insurance": "🛡️",
  "Credit Card": "💳",
};

/** Returns true if the field should show a date/calendar picker */
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

/** Format a Date object → "DD/MM/YYYY" */
const formatDate = (d) => {
  if (!d) return "";
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
};

/** Validate a DD/MM/YYYY string — returns error string or null */
const validateDob = (str) => {
  if (!str) return "Date of Birth is required";
  const parts = str.split("/");
  if (parts.length !== 3) return "Enter date as DD/MM/YYYY";
  const [dd, mm, yyyy] = parts.map(Number);
  if (isNaN(dd) || isNaN(mm) || isNaN(yyyy)) return "Invalid date";
  if (mm < 1 || mm > 12) return "Month must be 01–12";
  if (dd < 1 || dd > 31) return "Day must be 01–31";
  const date = new Date(yyyy, mm - 1, dd);
  if (
    date.getFullYear() !== yyyy ||
    date.getMonth() !== mm - 1 ||
    date.getDate() !== dd
  ) return "Invalid date";
  const now = new Date();
  const age = now.getFullYear() - yyyy;
  if (yyyy < 1900 || age > 120) return "Enter a valid birth year";
  if (date > now) return "Date cannot be in the future";
  return null;
};

/** Days in a given month/year */
const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();

// ─────────────────────────────────────────────────────────────────────────────
//  Calendar Picker Modal
// ─────────────────────────────────────────────────────────────────────────────

const CalendarPicker = ({ visible, onClose, onSelect, initialDate }) => {
  const today = new Date();
  const init = initialDate || today;

  const [viewYear, setViewYear] = useState(init.getFullYear());
  const [viewMonth, setViewMonth] = useState(init.getMonth());
  const [selected, setSelected] = useState(initialDate || null);

  // Year picker mode
  const [yearMode, setYearMode] = useState(false);

  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const totalDays = daysInMonth(viewYear, viewMonth);

  // Build grid cells: nulls for padding + day numbers
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const handleDay = (day) => {
    if (!day) return;
    const d = new Date(viewYear, viewMonth, day);
    if (d > today) return; // future dates disabled
    setSelected(d);
    onSelect(d);
    onClose();
  };

  const isSelected = (day) =>
    selected &&
    selected.getDate() === day &&
    selected.getMonth() === viewMonth &&
    selected.getFullYear() === viewYear;

  const isToday = (day) =>
    today.getDate() === day &&
    today.getMonth() === viewMonth &&
    today.getFullYear() === viewYear;

  const isFuture = (day) =>
    new Date(viewYear, viewMonth, day) > today;

  // Year range: 1920 to current
  const yearList = Array.from(
    { length: today.getFullYear() - 1919 },
    (_, i) => today.getFullYear() - i
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={calStyles.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} activeOpacity={1} />

        <View style={calStyles.card}>
          {/* Header */}
          <View style={calStyles.header}>
            <TouchableOpacity onPress={prevMonth} style={calStyles.navBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={calStyles.navTxt}>‹</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setYearMode(v => !v)} style={calStyles.monthYearBtn}>
              <Text style={calStyles.monthYearTxt}>
                {MONTHS[viewMonth]} {viewYear}
              </Text>
              <Text style={calStyles.dropArrow}>{yearMode ? " ▲" : " ▼"}</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={nextMonth} style={calStyles.navBtn} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={calStyles.navTxt}>›</Text>
            </TouchableOpacity>
          </View>

          {yearMode ? (
            /* Year Picker */
            <FlatList
              data={yearList}
              keyExtractor={(y) => String(y)}
              style={calStyles.yearList}
              showsVerticalScrollIndicator={false}
              initialScrollIndex={0}
              getItemLayout={(_, i) => ({ length: 44, offset: 44 * i, index: i })}
              renderItem={({ item: yr }) => (
                <TouchableOpacity
                  style={[calStyles.yearItem, yr === viewYear && calStyles.yearItemSelected]}
                  onPress={() => { setViewYear(yr); setYearMode(false); }}
                >
                  <Text style={[calStyles.yearItemTxt, yr === viewYear && calStyles.yearItemTxtSelected]}>
                    {yr}
                  </Text>
                </TouchableOpacity>
              )}
            />
          ) : (
            <>
              {/* Day headers */}
              <View style={calStyles.dayRow}>
                {DAYS_SHORT.map((d) => (
                  <Text key={d} style={calStyles.dayHeader}>{d}</Text>
                ))}
              </View>

              {/* Calendar grid */}
              <View style={calStyles.grid}>
                {cells.map((day, idx) => (
                  <TouchableOpacity
                    key={idx}
                    style={[
                      calStyles.cell,
                      isSelected(day) && calStyles.cellSelected,
                      isToday(day) && !isSelected(day) && calStyles.cellToday,
                      (!day || isFuture(day)) && calStyles.cellDisabled,
                    ]}
                    onPress={() => handleDay(day)}
                    disabled={!day || isFuture(day)}
                    activeOpacity={day ? 0.7 : 1}
                  >
                    {day ? (
                      <Text style={[
                        calStyles.cellTxt,
                        isSelected(day) && calStyles.cellTxtSelected,
                        isToday(day) && !isSelected(day) && calStyles.cellTxtToday,
                        isFuture(day) && calStyles.cellTxtDisabled,
                      ]}>
                        {day}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Footer */}
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
            <Text style={[alertStyles.icon, isSuccess && alertStyles.iconSuccess]}>
              {isSuccess ? "✅" : "⚠"}
            </Text>
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
//  SelectBox — outside parent for stable reference
// ─────────────────────────────────────────────────────────────────────────────

const SelectBox = ({ label, value, placeholder, onPress, loading, disabled, hideArrow }) => (
  <View style={styles.block}>
    <Text style={styles.blockLabel}>{label}</Text>
    <TouchableOpacity
      style={[styles.selectBox, disabled && styles.selectDisabled]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={disabled ? 1 : 0.75}
    >
      {loading ? (
        <View style={styles.row}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingTxt}>  Loading...</Text>
        </View>
      ) : (
        <View style={styles.row}>
          <Text style={[styles.selectTxt, !value && styles.placeholder]} numberOfLines={1}>
            {value || placeholder}
          </Text>
          {!hideArrow && <Text style={styles.arrow}>▼</Text>}
        </View>
      )}
    </TouchableOpacity>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
//  DynamicField — outside parent, handles both text and DOB fields
// ─────────────────────────────────────────────────────────────────────────────

const DynamicField = ({
  field, value, onChangeText, totalFields, index,
  onOpenCalendar, dobError,
}) => {
  const isDate = isDobField(field);

  return (
    <View style={styles.inputBlock}>
      <Text style={styles.inputLabel}>
        {field.label}
        {field.mandatory && <Text style={styles.req}> *</Text>}
      </Text>

      {isDate ? (
        /* DOB field → tappable display + calendar icon */
        <>
          <TouchableOpacity
            style={[styles.textInput, styles.dobInput, dobError && styles.inputError]}
            onPress={onOpenCalendar}
            activeOpacity={0.75}
          >
            <Text style={[styles.dobTxt, !value && styles.placeholder]}>
              {value || "DD/MM/YYYY"}
            </Text>
            <Text style={styles.calIcon}>📅</Text>
          </TouchableOpacity>
          {dobError && <Text style={styles.errorInline}>⚠ {dobError}</Text>}
          <Text style={styles.hint}>Format: DD/MM/YYYY</Text>
        </>
      ) : (
        /* Normal text input */
        <>
          <TextInput
            style={styles.textInput}
            placeholder={`Enter ${field.label}`}
            placeholderTextColor="#B0B8CC"
            keyboardType={
              field.type === "NUMERIC" || field.type === "NUM"
                ? "numeric"
                : field.type === "EMAIL"
                  ? "email-address"
                  : "default"
            }
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
//  Mock Data for Offline Testing
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_SERVICES = [
  { id: 1, name: "Electricity", cat_key: "ELECTRICITY", icon: "https://cdn-icons-png.flaticon.com/512/2815/2815412.png" },
  { id: 2, name: "Water", cat_key: "WATER", icon: "https://cdn-icons-png.flaticon.com/512/3100/3100554.png" },
  { id: 3, name: "Gas", cat_key: "GAS", icon: "https://cdn-icons-png.flaticon.com/512/2933/2933930.png" },
];

const MOCK_BILLERS = {
  "ELECTRICITY": [
    { id: 101, biller_name: "BSES Yamuna", cat_key: "ELECTRICITY" },
    { id: 102, biller_name: "BSES Rajdhani", cat_key: "ELECTRICITY" },
    { id: 103, biller_name: "Tata Power Delhi", cat_key: "ELECTRICITY" },
  ],
  "WATER": [
    { id: 201, biller_name: "Delhi Jal Board", cat_key: "WATER" },
    { id: 202, biller_name: "Haryana Water", cat_key: "WATER" },
  ],
  "GAS": [
    { id: 301, biller_name: "Indraprastha Gas (IGL)", cat_key: "GAS" },
    { id: 302, biller_name: "Mahanagar Gas", cat_key: "GAS" },
  ],
};

const MOCK_FIELDS = [
  { name: "account_number", label: "Consumer Number (CA Number)", mandatory: true, type: "NUMERIC", minLength: 5, maxLength: 12 },
  { name: "dob", label: "Date of Birth", mandatory: true, type: "DATE" },
  { name: "amount", label: "Amount", mandatory: true, type: "NUMERIC" },
];

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

  const [serviceModal, setServiceModal] = useState(false);
  const [billerModal, setBillerModal] = useState(false);

  const [formData, setFormData] = useState({});
  const [dobErrors, setDobErrors] = useState({}); // fieldName → error string
  const [serviceSearch, setServiceSearch] = useState("");
  const [billerSearch, setBillerSearch] = useState("");

  // Calendar state
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [activeCalField, setActiveCalField] = useState(null); // field object

  const [servicesLoading, setServicesLoading] = useState(false);
  const [billersLoading, setBillersLoading] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  // Custom Alert
  const [alert, setAlert] = useState({ visible: false, title: "", message: "", type: "error" });
  const showAlert = (title, message, type = "error") => setAlert({ visible: true, title, message, type });
  const hideAlert = () => setAlert(prev => ({ ...prev, visible: false }));

  // Fetched bill details state
  const [fetchedBill, setFetchedBill] = useState(null);
  const [selectedPayAmount, setSelectedPayAmount] = useState(null);

  useEffect(() => {
    if (serviceType) {
      loadBillers(serviceType);
    } else {
      loadServices();
    }
  }, [serviceType]);

  // ─── loaders ───────────────────────────────────────────────────────────────

  const loadServices = async () => {
    setServicesLoading(true);
    // Simulate API delay
    await new Promise(r => setTimeout(r, 600));
    setServices(MOCK_SERVICES);
    setServicesLoading(false);
  };

  const loadBillers = async (cat_key) => {
    setBillersLoading(true);
    setBillers([]);
    setSelectedBiller(null);
    setDynamicFields([]);
    setBillerDetail(null);
    setDetailsError(null);
    setFormData({});
    setDobErrors({});
    setFetchedBill(null);
    setSelectedPayAmount(null);

    try {
      const token = await AsyncStorage.getItem("header_token");
      const res = await fetchParticularCategoryBillers({ category: cat_key, headerToken: token });
      if (res?.success && res.data) {
        setBillers(res.data);
        if (res.data.length > 0) setBillerModal(true);
      } else {
        setDetailsError(res?.message || "Failed to load billers");
      }
    } catch (err) {
      console.log("Fetch billers error:", err);
      setDetailsError("Network error. Please try again.");
    } finally {
      setBillersLoading(false);
    }
  };

  const loadBillerDetails = async (biller) => {
    setDetailsLoading(true);
    setDetailsError(null);
    setDynamicFields([]);
    setBillerDetail(null);
    setFormData({});
    setDobErrors({});
    setFetchedBill(null);
    setSelectedPayAmount(null);

    const bId = biller.billerId || biller.biller_id || biller.id;
    if (!bId) {
      setDetailsError("Biller ID is missing.");
      setDetailsLoading(false);
      return;
    }

    try {
      const token = await AsyncStorage.getItem("header_token");
      const res = await fetchBillerInfo({ billerId: bId, headerToken: token });

      if (res?.success && res.data?.biller) {
        setBillerDetail(res.data.biller);
        const paramsRaw = res.data.biller.billerInputParams?.paramInfo;
        const params = Array.isArray(paramsRaw) ? paramsRaw : paramsRaw ? [paramsRaw] : [];

        // Map backend parameters into the structure the UI expects
        const mappedFields = params.map(p => ({
          name: p.paramName,
          label: p.paramName,
          type: p.dataType === "NUMERIC" ? "NUMERIC" : "TEXT",
          mandatory: p.isOptional === "false", // "false" strings equality
          minLength: p.minLength ? Number(p.minLength) : undefined,
          maxLength: p.maxLength ? Number(p.maxLength) : undefined,
          regEx: p.regEx
        }));

        setDynamicFields(mappedFields);
      } else {
        setDetailsError(res?.message || "Failed to load biller details");
      }
    } catch (err) {
      console.error("[loadBillerDetails] error:", err);
      setDetailsError("Network error. Please try again.");
    } finally {
      setDetailsLoading(false);
    }
  };

  // ─── handlers ──────────────────────────────────────────────────────────────

  const handleFieldChange = useCallback((name, text) => {
    setFormData((prev) => ({ ...prev, [name]: text }));
    setFetchedBill(null); // Reset when user types again
    setSelectedPayAmount(null);
  }, []);

  const handleOpenCalendar = useCallback((field) => {
    setActiveCalField(field);
    setCalendarOpen(true);
  }, []);

  const handleDateSelect = useCallback((date) => {
    if (!activeCalField) return;
    const formatted = formatDate(date);
    setFormData((prev) => ({ ...prev, [activeCalField.name]: formatted }));
    // Clear any previous error
    setDobErrors((prev) => ({ ...prev, [activeCalField.name]: null }));
  }, [activeCalField]);

  const handleSelectService = (item) => {
    setSelectedService(item);
    setServiceModal(false);
    setServiceSearch("");
    loadBillers(item.cat_key);
  };

  const handleSelectBiller = (biller) => {
    setSelectedBiller(biller);
    setBillerModal(false);
    setBillerSearch("");
    loadBillerDetails(biller);
  };

  const handleSubmit = () => {
    if (fetchedBill) {
      performPayBill();
      return;
    }

    if (!selectedService || !selectedBiller) return;

    const newDobErrors = {};
    for (const field of dynamicFields) {
      const val = (formData[field.name] || "").trim();

      if (isDobField(field)) {
        // DOB validation
        if (field.mandatory && !val) {
          newDobErrors[field.name] = "Date of Birth is required";
          continue;
        }
        if (val) {
          const err = validateDob(val);
          if (err) { newDobErrors[field.name] = err; continue; }
        }
      } else {
        // Regular field validation
        if (field.mandatory && !val) {
          showAlert("Required", `Please enter ${field.label}`);
          return;
        }
        if (val && field.minLength > 0 && val.length < field.minLength) {
          showAlert("Invalid", `${field.label} must be at least ${field.minLength} characters`);
          return;
        }
        if (val && field.regex) {
          try {
            if (!new RegExp(field.regex).test(val)) {
              showAlert("Invalid Format", `${field.label} format is incorrect`);
              return;
            }
          } catch (_) { }
        }
      }
    }

    // If any DOB errors, show them and stop
    if (Object.values(newDobErrors).some(Boolean)) {
      setDobErrors(newDobErrors);
      return;
    }
    setDobErrors({});

    if (buttonLabel === "Fetch Bill") {
      performFetchBill();
    } else {
      performValidateBill();
    }
  };

  const performValidateBill = async () => {
    setDetailsLoading(true);
    try {
      const token = await AsyncStorage.getItem("header_token");
      const bId = selectedBiller.billerId || selectedBiller.biller_id || selectedBiller.id;

      const res = await validateBbpsBill({
        billerId: bId,
        customerParams: formData,
        headerToken: token
      });

      if (res?.success) {
        // Show success alert
        showAlert("Success", res?.message || "Bill Validated", "success");
      } else {
        showAlert("Validation Failed", res?.message || "Could not validate bill.", "error");
      }
    } catch (err) {
      showAlert("Error", "Network error while validating bill.", "error");
    } finally {
      setDetailsLoading(false);
    }
  };

  const performPayBill = async () => {
    setDetailsLoading(true);
    try {
      const token = await AsyncStorage.getItem("header_token");
      const bId = selectedBiller.billerId || selectedBiller.biller_id || selectedBiller.id;

      const billerData = fetchedBill.data?.billerResponse || fetchedBill;
      const fetchedInputs = fetchedBill.data?.inputParams?.input || [];

      let cMobile = "9999999999";
      let pName = "";
      let pVal = "";

      // Prioritize fetching params from backend response
      if (fetchedInputs.length > 0) {
        pName = fetchedInputs[0].paramName || "";
        pVal = fetchedInputs[0].paramValue || "";

        for (const input of fetchedInputs) {
          const name = (input.paramName || "").toLowerCase();
          if (name.includes("mobile") || name.includes("phone")) {
            cMobile = input.paramValue;
            break;
          }
        }
      }

      // Fallback to local formData
      if (!pName) {
        const paramKeys = Object.keys(formData);
        pName = dynamicFields.length > 0 ? dynamicFields[0].label : (paramKeys.length > 0 ? paramKeys[0] : "");
        pVal = paramKeys.length > 0 ? formData[paramKeys[0]] : "";
      }

      if (cMobile === "9999999999") {
        for (const key of Object.keys(formData)) {
          if (key.toLowerCase().includes("mobile") || key.toLowerCase().includes("phone")) {
            cMobile = formData[key];
            break;
          }
        }
      }

      const payload = {
        billerId: String(bId),
        customerMobile: cMobile,
        placeholderValue: pName,
        paramValue: pVal,
        ...billerData,
        refid: fetchedBill.refid || fetchedBill.data?.refid || "",
        refId: fetchedBill.refid || fetchedBill.data?.refid || "",
        billAmount: selectedPayAmount,
        billamount: selectedPayAmount,
        billNumber: billerData.billNumber || "0",
        billPeriod: billerData.billPeriod || billerData.billDate || "NA",
        billperiod: billerData.billPeriod || billerData.billDate || "NA",
        headerToken: token
      };

      const res = await payBbpsBill(payload);

      if (res?.success) {
        navigateToReceipt(fetchedBill, res);
      } else {
        showAlert("Failed", res?.message, "error");
      }
    } catch (err) {
      showAlert("Error", "Network error while processing payment.", "error");
    } finally {
      setDetailsLoading(false);
    }
  };

  const performFetchBill = async () => {
    setDetailsLoading(true);
    try {
      const token = await AsyncStorage.getItem("header_token");
      const bId = selectedBiller.billerId || selectedBiller.biller_id || selectedBiller.id;

      const res = await fetchBbpsBill({
        billerId: bId,
        customerParams: formData,
        headerToken: token
      });

      if (res?.success) {
        setFetchedBill(res.data);
        const amt = (Number((res.data.data?.billerResponse?.billAmount || res.data.billAmount) || 0) / 100).toFixed(2);
        setSelectedPayAmount(amt);
      } else {
        const msg = res?.message || "";
        if (msg.toLowerCase().includes("no bill due")) {
          showAlert("No Bill Due", msg, "success");
        } else {
          showAlert("Fetch Failed", msg || "Could not fetch bill details.");
        }
      }
    } catch (err) {
      showAlert("Error", "Network error while fetching bill.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const navigateToReceipt = (fetchedData = null, paymentRes = null) => {
    navigation.navigate("BBPSReceipt", {
      serviceName: selectedService.name,
      billerName: selectedBiller.biller_name || selectedBiller.billerName || selectedBiller.name,
      billerId: selectedBiller.biller_id || selectedBiller.billerId || selectedBiller.id,
      billerDetail,
      formData,
      fetchedData,
      transactionId: paymentRes?.data?.transactionId || paymentRes?.transactionId || "TXN" + Date.now(),
      amount: selectedPayAmount,
    });
  };

  // ─── computed ───────────────────────────────────────────────────────────────

  const filteredServices = useMemo(
    () => services.filter((s) =>
      (s.name || "").toLowerCase().includes(serviceSearch.toLowerCase())
    ),
    [serviceSearch, services]
  );

  const filteredBillers = useMemo(
    () => billers.filter((b) =>
      (b.biller_name || b.billerName || b.name || "")
        .toLowerCase().includes(billerSearch.toLowerCase())
    ),
    [billerSearch, billers]
  );

  const { buttonLabel, buttonSub } = useMemo(() => {
    const svc = selectedService?.name || "";
    const validation = billerDetail?.billerSupportBillValidation;

    if (fetchedBill) {
      return { buttonLabel: "Proceed to Pay", buttonSub: svc ? `Pay for ${svc}` : "" };
    }

    if (validation === "MANDATORY") {
      return { buttonLabel: "Validate", buttonSub: svc };
    }
    return { buttonLabel: "Fetch Bill", buttonSub: svc ? `Fetch bill for ${svc}` : "" };
  }, [selectedService, billerDetail, fetchedBill]);

  const billerDisplayName =
    selectedBiller?.biller_name ||
    selectedBiller?.billerName ||
    selectedBiller?.name || "";

  // Active calendar field's current date value (for initial calendar position)
  const activeCalInitialDate = useMemo(() => {
    if (!activeCalField) return null;
    const str = formData[activeCalField.name];
    if (!str) return null;
    const [dd, mm, yyyy] = str.split("/").map(Number);
    if (!dd || !mm || !yyyy) return null;
    return new Date(yyyy, mm - 1, dd);
  }, [activeCalField, formData]);

  // ─── render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Calendar Modal */}
      <CalendarPicker
        visible={calendarOpen}
        onClose={() => setCalendarOpen(false)}
        onSelect={handleDateSelect}
        initialDate={activeCalInitialDate}
      />

      {/* Custom Alert Modal */}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onClose={hideAlert}
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
          contentContainerStyle={{ paddingBottom: 50 }}
        >
          {/* Step 1: Service Banner */}
          {selectedService && (
            <View style={styles.serviceBanner}>
              <View>
                <Text style={styles.serviceBannerText}>{selectedService.name}</Text>
                <Text style={styles.serviceBannerSubText}>
                  Proceed to select your provider below to fetch and pay your due amounts securely.
                </Text>
              </View>
            </View>
          )}

          {/* Step 2: Biller */}
          {selectedService && (
            <SelectBox
              label="SELECT BILLER"
              value={billerDisplayName}
              placeholder="Choose a biller"
              onPress={() => setBillerModal(true)}
              loading={billersLoading}
              disabled={billersLoading}
            />
          )}

          {selectedService && !billersLoading && billers.length === 0 && (
            <Text style={styles.infoTxt}>No billers found for "{selectedService.name}".</Text>
          )}

          {/* Loading */}
          {detailsLoading && (
            <View style={styles.loaderRow}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.loaderTxt}>Loading fields for {billerDisplayName}...</Text>
            </View>
          )}

          {/* Error */}
          {!detailsLoading && detailsError && (
            <View style={styles.errorBox}>
              <Text style={styles.errorTxt}>⚠  {detailsError}</Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => selectedBiller && loadBillerDetails(selectedBiller)}
              >
                <Text style={styles.retryTxt}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Dynamic Fields */}
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

          {!detailsLoading && !detailsError && selectedBiller && dynamicFields.length === 0 && (
            <Text style={styles.infoTxt}>No input fields required for this biller.</Text>
          )}

          {/* Bill Details Summary */}
          {!detailsLoading && !detailsError && fetchedBill && (
            <View style={styles.billDetailsCard}>
              <Text style={styles.billTitle}>Bill Summary</Text>

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Customer Name</Text>
                <Text style={styles.billValue}>{(fetchedBill.data?.billerResponse?.customerName || fetchedBill.customerName) || "N/A"}</Text>
              </View>

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Bill Date</Text>
                <Text style={styles.billValue}>{(fetchedBill.data?.billerResponse?.billDate || fetchedBill.billDate) || "N/A"}</Text>
              </View>

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Due Date</Text>
                <Text style={styles.billValue}>{(fetchedBill.data?.billerResponse?.dueDate || fetchedBill.dueDate) || "N/A"}</Text>
              </View>

              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Ref ID</Text>
                <Text style={[styles.billValue, { fontSize: 11, color: '#6B7280' }]} numberOfLines={1}>
                  {fetchedBill.refid || "N/A"}
                </Text>
              </View>

              {/* Select Amount to Pay */}
              <Text style={[styles.billTitle, { marginTop: 12, borderBottomWidth: 0, paddingBottom: 0 }]}>Select Amount to Pay</Text>

              {/* Option 1: Default Bill Amount */}
              {(() => {
                const defaultAmt = (Number((fetchedBill.data?.billerResponse?.billAmount || fetchedBill.billAmount) || 0) / 100).toFixed(2);
                const isSelected = selectedPayAmount === defaultAmt;
                return (
                  <TouchableOpacity
                    style={[styles.payOption, isSelected && styles.payOptionSelected]}
                    onPress={() => setSelectedPayAmount(defaultAmt)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.radioOut, isSelected && styles.radioOutSelected]}>
                      {isSelected && <View style={styles.radioIn} />}
                    </View>
                    <View style={styles.payOptionContent}>
                      <Text style={[styles.payOptionLabel, isSelected && styles.payOptionLabelSelected]}>Total Bill Amount</Text>
                      <Text style={[styles.payOptionValue, isSelected && styles.payOptionValueSelected]}>₹ {defaultAmt}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })()}

              {/* Additional Amounts */}
              {(() => {
                const infoArray = fetchedBill.data?.additionalInfo?.info || fetchedBill.additionalInfo?.info || [];
                return infoArray.map((info, idx) => {
                  const isNumberLike = !isNaN(Number(info.infoValue)) && info.infoValue.trim() !== "";

                  if (!isNumberLike) {
                    return (
                      <View key={`info_${idx}`} style={[styles.billRow, { paddingHorizontal: 14 }]}>
                        <Text style={styles.billLabel}>{info.infoName}</Text>
                        <Text style={styles.billValue}>{info.infoValue}</Text>
                      </View>
                    );
                  }

                  const amt = Number(info.infoValue).toFixed(2);
                  const isSelected = selectedPayAmount === amt;
                  return (
                    <TouchableOpacity
                      key={`info_${idx}`}
                      style={[styles.payOption, isSelected && styles.payOptionSelected]}
                      onPress={() => setSelectedPayAmount(amt)}
                      activeOpacity={0.8}
                    >
                      <View style={[styles.radioOut, isSelected && styles.radioOutSelected]}>
                        {isSelected && <View style={styles.radioIn} />}
                      </View>
                      <View style={styles.payOptionContent}>
                        <Text style={[styles.payOptionLabel, isSelected && styles.payOptionLabelSelected]}>{info.infoName}</Text>
                        <Text style={[styles.payOptionValue, isSelected && styles.payOptionValueSelected]}>₹ {amt}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                });
              })()}

              <View style={[styles.billRow, styles.billAmountRow]}>
                <Text style={styles.billAmountLabel}>Payable Amount</Text>
                <Text style={styles.billAmountValue}>₹ {selectedPayAmount || "0.00"}</Text>
              </View>
            </View>
          )}

          {/* Submit */}
          {selectedBiller && !detailsLoading && !detailsError && (
            <TouchableOpacity style={styles.payBtn} onPress={handleSubmit} activeOpacity={0.85}>
              <Text style={styles.payBtnTxt}>{buttonLabel}</Text>
              {!!buttonSub && <Text style={styles.payBtnSub}>{buttonSub}</Text>}
            </TouchableOpacity>
          )}

        </ScrollView>
      </View>

      {/* ══════════ Modal: Service ══════════ */}
      <Modal visible={serviceModal} transparent animationType="slide" onRequestClose={() => setServiceModal(false)}>
        <View style={styles.modalWrap}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setServiceModal(false)} activeOpacity={1} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHead}>
              <Text style={styles.sheetTitle}>Select Service</Text>
              <TouchableOpacity onPress={() => setServiceModal(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchBox}
              placeholder="Search services..."
              placeholderTextColor="#B0B8CC"
              value={serviceSearch}
              onChangeText={setServiceSearch}
              autoFocus
            />
            <FlatList
              data={filteredServices}
              keyExtractor={(item) => String(item.id || item.cat_key)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.listRow} onPress={() => handleSelectService(item)} activeOpacity={0.65}>
                  {item.icon
                    ? <Image source={{ uri: item.icon }} style={styles.listIcon} resizeMode="contain" />
                    : <View style={styles.listIconPH} />
                  }
                  <Text style={styles.listTxt}>{item.name}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyMsg}>No services found</Text>}
            />
          </View>
        </View>
      </Modal>

      {/* ══════════ Modal: Biller ══════════ */}
      <Modal visible={billerModal} transparent animationType="slide" onRequestClose={() => setBillerModal(false)}>
        <View style={styles.modalWrap}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setBillerModal(false)} activeOpacity={1} />
          <View style={styles.sheet}>
            <View style={styles.handle} />
            <View style={styles.sheetHead}>
              <View>
                <Text style={styles.sheetTitle}>Select Biller</Text>
                {selectedService && <Text style={styles.sheetSub}>{selectedService.name}</Text>}
              </View>
              <TouchableOpacity onPress={() => setBillerModal(false)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              style={styles.searchBox}
              placeholder="Search billers..."
              placeholderTextColor="#B0B8CC"
              value={billerSearch}
              onChangeText={setBillerSearch}
              autoFocus
            />
            <FlatList
              data={filteredBillers}
              keyExtractor={(item, i) => String(item.biller_id || item.billerId || item.id || i)}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity style={styles.listRow} onPress={() => handleSelectBiller(item)} activeOpacity={0.65}>
                  <Text style={styles.listTxt}>
                    {item.biller_name || item.billerName || item.name || "Unknown Biller"}
                  </Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={<Text style={styles.emptyMsg}>No billers found</Text>}
            />
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
};

export default BbpsDynamicServiceScreen;

// ─────────────────────────────────────────────────────────────────────────────
//  Calendar Styles
// ─────────────────────────────────────────────────────────────────────────────

const calStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 22,
    overflow: "hidden",
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  navBtn: { padding: 4 },
  navTxt: { fontSize: 26, color: "#FFF", fontWeight: "300", lineHeight: 30 },
  monthYearBtn: { flexDirection: "row", alignItems: "center" },
  monthYearTxt: { fontSize: 17, fontWeight: "700", color: "#FFF" },
  dropArrow: { fontSize: 12, color: "rgba(255,255,255,0.8)" },

  dayRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 6,
  },
  dayHeader: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
    letterSpacing: 0.3,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    paddingBottom: 10,
  },
  cell: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 100,
  },
  cellSelected: { backgroundColor: Colors.primary },
  cellToday: { borderWidth: 1.5, borderColor: Colors.primary },
  cellDisabled: { opacity: 0.25 },
  cellTxt: { fontSize: 14, color: "#1A1A2E" },
  cellTxtSelected: { color: "#FFF", fontWeight: "700" },
  cellTxtToday: { color: Colors.primary, fontWeight: "700" },
  cellTxtDisabled: { color: "#9CA3AF" },

  yearList: { maxHeight: 250 },
  yearItem: {
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  yearItemSelected: { backgroundColor: Colors.primary + "15" },
  yearItemTxt: { fontSize: 16, color: "#1A1A2E" },
  yearItemTxtSelected: { color: Colors.primary, fontWeight: "700" },

  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E7EB",
    gap: 12,
  },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 8 },
  cancelTxt: { fontSize: 14, color: "#6B7280", fontWeight: "600" },
  todayBtn: { paddingHorizontal: 16, paddingVertical: 8, backgroundColor: Colors.primary + "15", borderRadius: 8 },
  todayTxt: { fontSize: 14, color: Colors.primary, fontWeight: "700" },
});


const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.primary },
  header: { paddingVertical: 22, alignItems: "center" },
  headerTitle: { fontSize: 22, fontWeight: "700", color: Colors.white, letterSpacing: 0.3 },
  headerSub: { fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 3 },

  body: {
    flex: 1,
    backgroundColor: Colors.bg || "#F4F6FB",
    paddingHorizontal: 20,
    paddingTop: 22,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
  },

  serviceBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.white || "#FFF",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    marginBottom: 20,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.02)",
  },
  serviceIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#F3F6FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  serviceIcon: { fontSize: 20 },
  serviceBannerText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.black || "#1A1A2E",
  },
  serviceBannerSubText: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 4,
    lineHeight: 16,
  },

  block: { marginBottom: 18 },
  blockLabel: { fontSize: 11, fontWeight: "700", color: Colors.primary, letterSpacing: 0.8, marginBottom: 8 },
  selectBox: {
    borderWidth: 1, borderColor: Colors.lightGray || "#DDE1EC",
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 15,
    backgroundColor: Colors.white || "#FFF", elevation: 2,
    minHeight: 54, justifyContent: "center",
  },
  selectDisabled: { opacity: 0.4 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selectTxt: { fontSize: 15, color: Colors.black || "#1A1A2E", flex: 1 },
  placeholder: { color: "#B0B8CC" },
  arrow: { fontSize: 11, color: "#9CA3AF", marginLeft: 10 },
  loadingTxt: { fontSize: 14, color: "#9CA3AF" },

  fieldsWrap: { marginTop: 6 },
  sectionTitle: {
    fontSize: 11, fontWeight: "700", color: Colors.primary, letterSpacing: 0.8,
    marginBottom: 14, borderBottomWidth: 1, borderBottomColor: Colors.lightGray || "#E5E7EB", paddingBottom: 8,
  },
  inputBlock: { marginBottom: 18 },
  inputLabel: { fontSize: 13, fontWeight: "600", color: Colors.black || "#1A1A2E", marginBottom: 7 },
  req: { color: "#E53935" },
  textInput: {
    borderWidth: 1, borderColor: Colors.lightGray || "#DDE1EC",
    borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: Colors.white || "#FFF", fontSize: 15,
    color: Colors.black || "#1A1A2E", elevation: 2,
  },

  // DOB specific
  dobInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
  },
  dobTxt: { fontSize: 15, color: Colors.black || "#1A1A2E", flex: 1 },
  calIcon: { fontSize: 20 },
  inputError: { borderColor: "#DC2626", backgroundColor: "#FEF2F2" },
  errorInline: { fontSize: 12, color: "#DC2626", marginTop: 4, marginLeft: 2 },

  hint: { fontSize: 11, color: "#9CA3AF", marginTop: 4, marginLeft: 2 },

  loaderRow: { flexDirection: "row", alignItems: "center", marginVertical: 22 },
  loaderTxt: { fontSize: 14, color: Colors.primary, marginLeft: 10 },
  infoTxt: { textAlign: "center", color: "#9CA3AF", fontSize: 13, marginVertical: 18 },

  errorBox: {
    marginVertical: 18, padding: 16, backgroundColor: "#FFF3F3",
    borderRadius: 12, borderWidth: 1, borderColor: "#FFCDD2", alignItems: "center",
  },
  errorTxt: { fontSize: 13, color: "#C62828", textAlign: "center", lineHeight: 20 },
  retryBtn: { marginTop: 12, paddingHorizontal: 24, paddingVertical: 8, backgroundColor: Colors.primary, borderRadius: 8 },
  retryTxt: { color: "#FFF", fontSize: 13, fontWeight: "600" },

  payBtn: {
    marginTop: 8, backgroundColor: Colors.finance_accent || Colors.primary,
    paddingVertical: 12, borderRadius: 16, alignItems: "center", elevation: 5,
  },
  payBtnTxt: { color: Colors.white || "#FFF", fontSize: 16, fontWeight: "700", letterSpacing: 0.3 },
  payBtnSub: { color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 3 },

  billDetailsCard: {
    backgroundColor: Colors.white || "#FFF",
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginTop: 18,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  billTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.black || "#1A1A2E",
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    paddingBottom: 8,
  },
  billRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 7,
  },
  billLabel: {
    fontSize: 13,
    color: "#6B7280",
  },
  billValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A2E",
    flex: 1,
    textAlign: "right",
    marginLeft: 10,
  },
  billAmountRow: {
    marginTop: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  billAmountLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  billAmountValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#10B981", // Emerald green
  },

  payOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    backgroundColor: "transparent",
    marginBottom: 4,
  },
  payOptionSelected: {
    backgroundColor: "transparent",
  },
  radioOut: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  radioOutSelected: {
    borderColor: Colors.primary,
  },
  radioIn: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  payOptionContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  payOptionLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    flex: 1,
    paddingRight: 8,
  },
  payOptionLabelSelected: {
    color: Colors.primary,
  },
  payOptionValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A2E",
  },
  payOptionValueSelected: {
    color: Colors.primary,
  },

  modalWrap: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "flex-end" },
  sheet: {
    backgroundColor: Colors.white || "#FFF", borderTopLeftRadius: 26,
    borderTopRightRadius: 26, maxHeight: "80%", paddingBottom: 28, elevation: 16,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#DDE1EC", alignSelf: "center", marginTop: 10 },
  sheetHead: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 22, paddingTop: 14, paddingBottom: 6,
  },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: Colors.black || "#1A1A2E" },
  sheetSub: { fontSize: 12, color: "#9CA3AF", marginTop: 2 },
  closeX: { fontSize: 18, color: "#9CA3AF" },
  searchBox: {
    marginHorizontal: 18, marginTop: 6, marginBottom: 10,
    borderWidth: 1, borderColor: Colors.lightGray || "#DDE1EC",
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11,
    fontSize: 14, color: Colors.black || "#1A1A2E", backgroundColor: "#F9FAFB",
  },
  listRow: {
    flexDirection: "row", alignItems: "center", paddingHorizontal: 22, paddingVertical: 15,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.lightGray || "#E5E7EB",
  },
  listTxt: { fontSize: 15, color: Colors.black || "#1A1A2E", flex: 1 },
  listIcon: { width: 30, height: 30, marginRight: 14, borderRadius: 8 },
  listIconPH: { width: 30, height: 30, marginRight: 14, borderRadius: 8, backgroundColor: "#F0F2F8" },
  emptyMsg: { textAlign: "center", paddingVertical: 34, color: "#B0B8CC", fontSize: 14 },
});

const alertStyles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center", padding: 30,
  },
  card: {
    backgroundColor: "#FFF", borderRadius: 24, padding: 25,
    width: "100%", alignItems: "center",
    elevation: 20, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 15,
  },
  iconWrap: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: "#FEF2F2",
    alignItems: "center", justifyContent: "center", marginBottom: 15,
  },
  icon: { fontSize: 30, color: "#DC2626" },
  title: { fontSize: 18, fontWeight: "700", color: "#111827", marginBottom: 8, textAlign: "center" },
  message: { fontSize: 14, color: "#4B5563", textAlign: "center", lineHeight: 20, marginBottom: 20 },
  btn: {
    backgroundColor: Colors.finance_accent || Colors.primary,
    paddingVertical: 12, paddingHorizontal: 35, borderRadius: 14,
    elevation: 4,
  },
  btnTxt: { color: "#FFF", fontSize: 15, fontWeight: "700" },
});
