import React, { useState, useMemo, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "../constants/Colors";
import Fonts from "../constants/Fonts";
import HeaderBar from "../componets/HeaderBar";
import { getRechargeReport } from "../api/AuthApi";
import { SafeAreaView } from "react-native-safe-area-context";


const fetchRechargeTransactions = async ({ from, to, headerToken }) => {
  const json = await getRechargeReport({ from, to, headerToken });
  if (!json.success) throw new Error(json.message || "Failed to fetch recharge report");
  return normalizeRecharge(json.data);
};


const normalizeRecharge = (data = []) =>
  data.map((item) => ({
    id: item.referenceId || item._id,
    amount: String(item.amount ?? 0),
    category: "Recharge",
    // Title-case: "SUCCESS" → "Success"
    status: titleCase(item.status),
    // createdAt ISO → "DD/MM/YYYY"
    date: isoToDisplay(item.createdAt),
    // desc: operatorName + mobile. Fallback gracefully if fields missing.
    desc: [item.operatorName, item.mobileNumber].filter(Boolean).join(" • ") || "Recharge",
    extra: {
      commission: item.commission ?? 0,
      tds: item.tds ?? 0,
      netCommission: item.netCommission ?? 0,
      isRefunded: item.isRefunded ?? false,
      operator: item.operatorName || "",
      mobile: item.mobileNumber || "",
    },
  }));

// ── Add normalizers for future services here:
// const normalizeWallet = (data = []) => data.map(item => ({ id: ..., ... }));
// const normalizeAeps   = (data = []) => data.map(item => ({ id: ..., ... }));
// const normalizeBbps   = (data = []) => data.map(item => ({ id: ..., ... }));

// ─────────────────────────────────────────────────────────────────────────────
//  TAB → SERVICE MAP
//  value:    tab identifier
//  label:    display text
//  icon:     MaterialCommunityIcons name
//  fetchFn:  async function that returns normalised transactions array
//            → null means "coming soon" / not yet integrated
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { label: "Recharge", value: "Recharge", icon: "cellphone", fetchFn: fetchRechargeTransactions },
  { label: "Wallet", value: "Wallet", icon: "wallet", fetchFn: null },  // 🔜 replace null when ready
  { label: "AEPS", value: "Aeps", icon: "fingerprint", fetchFn: null },  // 🔜
  { label: "BBPS", value: "BBPS", icon: "lightning-bolt", fetchFn: null },  // 🔜
];

// ─────────────────────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  Success: { color: "#16A34A", bg: "#f7fffaff", border: "#e8fff0ff", icon: "check-circle", label: "Success" },
  Pending: { color: "#D97706", bg: "#FFFBEB", border: "#fef3e6ff", icon: "clock-outline", label: "Pending" },
  Failed: { color: "#DC2626", bg: "#FEF2F2", border: "#fce6e6ff", icon: "close-circle", label: "Failed" },
};

const DATE_LABEL_SHORT = {
  "All Time": "All Time",
  "Last 7 Days": "Last 7D",
  "Last 30 Days": "Last 30D",
  "Last 3 Months": "Last 3M",
  "Last 6 Months": "Last 6M",
  "Custom": "Custom",
};

// ─────────────────────────────────────────────────────────────────────────────
//  HELPERS
// ─────────────────────────────────────────────────────────────────────────────

const titleCase = (str = "") => {
  if (!str) return "Pending";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/** ISO 8601 → "DD/MM/YYYY" */
const isoToDisplay = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const pad = (n) => String(n).padStart(2, '0');
const toQueryDate = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** "DD/MM/YYYY" → Date object */
const parseDisplayDate = (str) => {
  if (!str) return null;
  const [d, m, y] = str.split("/").map(Number);
  return new Date(y, m - 1, d);
};

/** Date → "DD/MM/YYYY" */
const fmt = (d) => {
  if (!d) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const dateRangeStart = (filter) => {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (filter === "Last 7 Days") { const d = new Date(now); d.setDate(d.getDate() - 6); return d; }
  if (filter === "Last 30 Days") { const d = new Date(now); d.setDate(d.getDate() - 29); return d; }
  if (filter === "Last 3 Months") { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d; }
  if (filter === "Last 6 Months") { const d = new Date(now); d.setMonth(d.getMonth() - 6); return d; }
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
//  SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function InvoiceScreen({ navigation }) {
  const STATUSES = ["All", "Success", "Pending", "Failed"];
  const DATES = ["All Time", "Last 7 Days", "Last 30 Days", "Last 3 Months", "Last 6 Months", "Custom"];

  // ── UI state ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState(TABS[0].value);
  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("Last 30 Days");
  const [statusOpen, setStatusOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [showCustom, setShowCustom] = useState(false);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);
  const [pickerMode, setPickerMode] = useState("from");
  const [pickerVisible, setPickerVisible] = useState(false);
  const [search, setSearch] = useState("");

  // ── Data state ──────────────────────────────────────────────────────────────
  // Per-tab cache: { Recharge: [], Wallet: [], ... }
  const [tabData, setTabData] = useState({});
  const [loadingTab, setLoadingTab] = useState(false);
  const [errorTab, setErrorTab] = useState(null);

  const closeDD = () => { setStatusOpen(false); setDateOpen(false); };

  // ── Fetch data when tab or date changes ─────────────────────────────────────
  const loadTab = useCallback(async (tabValue) => {
    const tabCfg = TABS.find(t => t.value === tabValue);
    if (!tabCfg?.fetchFn) {
      setTabData(prev => ({ ...prev, [tabValue]: [] }));
      return;
    }

    setLoadingTab(true);
    setErrorTab(null);
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      if (!headerToken) throw new Error("Session expired. Please login again.");

      // Derive range for API call
      let fromStr = "";
      let toStr = "";

      if (dateFilter === "Custom") {
        if (fromDate) fromStr = toQueryDate(fromDate);
        if (toDate) toStr = toQueryDate(toDate);
      } else if (dateFilter !== "All Time") {
        const start = dateRangeStart(dateFilter);
        if (start) fromStr = toQueryDate(start);
        toStr = toQueryDate(new Date()); // default to today
      }

      const data = await tabCfg.fetchFn({ from: fromStr, to: toStr, headerToken });
      setTabData(prev => ({ ...prev, [tabValue]: data }));
    } catch (err) {
      setErrorTab(err.message || "Something went wrong");
      setTabData(prev => ({ ...prev, [tabValue]: [] }));
    } finally {
      setLoadingTab(false);
    }
  }, [dateFilter, fromDate, toDate]);

  useEffect(() => {
    loadTab(activeTab);
  }, [activeTab, dateFilter, fromDate, toDate]);

  // ── Pull-to-refresh / manual retry ──────────────────────────────────────────
  const retryTab = () => {
    setTabData(prev => { const next = { ...prev }; delete next[activeTab]; return next; });
    setErrorTab(null);
  };

  // ── Raw list for active tab ──────────────────────────────────────────────────
  const rawList = tabData[activeTab] ?? [];

  // ── Filtered list ────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...rawList];

    // Status
    if (statusFilter !== "All") {
      const sfLower = statusFilter.toLowerCase();
      list = list.filter(t => t.status.trim().toLowerCase() === sfLower);
    }

    // Date
    if (dateFilter === "Custom" && (fromDate || toDate)) {
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
    } else if (dateFilter !== "All Time") {
      const start = dateRangeStart(dateFilter);
      if (start) list = list.filter(t => {
        const d = parseDisplayDate(t.date);
        return d ? d >= start : true;
      });
    }

    // Search
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

  // ── Summary ──────────────────────────────────────────────────────────────────
  const summary = useMemo(() => ({
    total: filtered.length,
    success: filtered.filter(t => t.status.toLowerCase() === "success").length,
    pending: filtered.filter(t => t.status.toLowerCase() === "pending").length,
    failed: filtered.filter(t => t.status.toLowerCase() === "failed").length,
    amount: filtered.reduce((s, t) => s + Number(t.amount), 0),
  }), [filtered]);

  // ── Date button label ────────────────────────────────────────────────────────
  const dateBtnLabel = useMemo(() => {
    if (dateFilter === "Custom" && fromDate)
      return fmt(fromDate) + (toDate ? `→${fmt(toDate)}` : "→?");
    return DATE_LABEL_SHORT[dateFilter] || dateFilter;
  }, [dateFilter, fromDate, toDate]);

  const isDateActive = dateFilter !== "Last 30 Days";
  const isStatusActive = statusFilter !== "All";
  const hasReset = isStatusActive || isDateActive || !!search;

  // ── Active tab config ────────────────────────────────────────────────────────
  const activeTabCfg = TABS.find(t => t.value === activeTab);
  const tabHasApi = !!activeTabCfg?.fetchFn;

  return (
    <SafeAreaView style={S.safe}>
      <HeaderBar title="Transaction History" onBack={() => navigation.goBack()} />

      {/* ── Tab Bar ──────────────────────────────────────────────────────────── */}
      <View style={S.tabBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={S.tabScroll}
        >
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.value}
              onPress={() => { setActiveTab(tab.value); closeDD(); }}
              style={[S.tabItem, activeTab === tab.value && S.tabItemActive]}
            >
              <Icon
                name={tab.icon}
                size={14}
                color={activeTab === tab.value ? Colors.finance_accent : "#9CA3AF"}
                style={{ marginRight: 5 }}
              />
              <Text style={[S.tabTxt, activeTab === tab.value && S.tabTxtActive]}>
                {tab.label}
              </Text>
              {/* Amber dot = Coming Soon (no API yet) */}
              {!tab.fetchFn && <View style={S.comingSoonDot} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Search ───────────────────────────────────────────────────────────── */}
      <View style={S.searchWrap}>
        <Icon name="magnify" size={18} color={Colors.finance_accent} style={{ marginRight: 8 }} />
        <TextInput
          style={S.searchInput}
          placeholder="Search by ID, operator, mobile, amount..."
          placeholderTextColor="#9CA3AF"
          value={search}
          onChangeText={setSearch}
          onFocus={closeDD}
        />
        {!!search && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Icon name="close-circle" size={16} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Filter Row ───────────────────────────────────────────────────────── */}
      <View style={S.filterRow}>

        {/* STATUS */}
        <View style={S.ddWrap}>
          <TouchableOpacity
            style={[S.filterBtn, isStatusActive && S.filterBtnOn]}
            onPress={() => { setStatusOpen(p => !p); setDateOpen(false); }}
          >
            <Icon name="filter-variant" size={13} color={isStatusActive ? "#FFF" : Colors.finance_accent} />
            <Text style={[S.filterBtnTxt, isStatusActive && S.filterBtnTxtOn]} numberOfLines={1}>
              {isStatusActive ? statusFilter : "Status"}
            </Text>
            <Icon
              name={statusOpen ? "chevron-up" : "chevron-down"}
              size={13}
              color={isStatusActive ? "#FFF" : Colors.finance_accent}
            />
          </TouchableOpacity>

          {statusOpen && (
            <View style={S.dropdown}>
              {STATUSES.map(s => (
                <TouchableOpacity
                  key={s}
                  style={[S.dropItem, statusFilter === s && S.dropItemOn]}
                  onPress={() => { setStatusFilter(s); setStatusOpen(false); }}
                >
                  {s !== "All" && (
                    <View style={[S.statusDot, { backgroundColor: STATUS_CONFIG[s].color }]} />
                  )}
                  <Text style={[S.dropItemTxt, statusFilter === s && S.dropItemTxtOn]}>{s}</Text>
                  {statusFilter === s && <Icon name="check" size={13} color={Colors.finance_accent} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* DATE */}
        <View style={S.ddWrap}>
          <TouchableOpacity
            style={[S.filterBtn, isDateActive && S.filterBtnOn]}
            onPress={() => { setDateOpen(p => !p); setStatusOpen(false); }}
          >
            <Icon name="calendar-range" size={13} color={isDateActive ? "#FFF" : Colors.finance_accent} />
            <Text
              style={[S.filterBtnTxt, isDateActive && S.filterBtnTxtOn]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {dateBtnLabel}
            </Text>
            <Icon
              name={dateOpen ? "chevron-up" : "chevron-down"}
              size={13}
              color={isDateActive ? "#FFF" : Colors.finance_accent}
            />
          </TouchableOpacity>

          {dateOpen && (
            <View style={[S.dropdown, { right: 0, left: "auto" }]}>
              {DATES.map(d => (
                <TouchableOpacity
                  key={d}
                  style={[S.dropItem, dateFilter === d && S.dropItemOn]}
                  onPress={() => {
                    if (d === "Custom") { setShowCustom(true); setDateFilter("Custom"); }
                    else { setShowCustom(false); setFromDate(null); setToDate(null); setDateFilter(d); }
                    setDateOpen(false);
                  }}
                >
                  <Text style={[S.dropItemTxt, dateFilter === d && S.dropItemTxtOn]}>{d}</Text>
                  {dateFilter === d && <Icon name="check" size={13} color={Colors.finance_accent} />}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* RESET */}
        {hasReset && (
          <TouchableOpacity
            style={S.resetBtn}
            onPress={() => {
              setStatusFilter("All");
              setDateFilter("Last 30 Days");
              setFromDate(null);
              setToDate(null);
              setShowCustom(false);
              setSearch("");
              closeDD();
            }}
          >
            <Icon name="refresh" size={15} color={Colors.finance_accent} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Custom Date Range ─────────────────────────────────────────────────── */}
      {showCustom && (
        <View style={S.customRow}>
          <TouchableOpacity
            style={[S.customBtn, fromDate && S.customBtnOn]}
            onPress={() => { setPickerMode("from"); setPickerVisible(true); }}
          >
            <Icon
              name="calendar-start"
              size={13}
              color={fromDate ? Colors.finance_accent : "#9CA3AF"}
              style={{ marginRight: 4 }}
            />
            <Text style={[S.customTxt, fromDate && S.customTxtOn]} numberOfLines={1}>
              {fromDate ? `From: ${fmt(fromDate)}` : "From Date"}
            </Text>
          </TouchableOpacity>
          <Icon name="arrow-right" size={14} color="#9CA3AF" />
          <TouchableOpacity
            style={[S.customBtn, toDate && S.customBtnOn]}
            onPress={() => { setPickerMode("to"); setPickerVisible(true); }}
          >
            <Icon
              name="calendar-end"
              size={13}
              color={toDate ? Colors.finance_accent : "#9CA3AF"}
              style={{ marginRight: 4 }}
            />
            <Text style={[S.customTxt, toDate && S.customTxtOn]} numberOfLines={1}>
              {toDate ? `To: ${fmt(toDate)}` : "To Date"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {pickerVisible && (
        <DateTimePicker
          value={pickerMode === "from" ? (fromDate || new Date()) : (toDate || new Date())}
          mode="date"
          display="calendar"
          maximumDate={new Date()}
          onChange={(_, selected) => {
            setPickerVisible(false);
            if (!selected) return;
            if (pickerMode === "from") setFromDate(selected);
            else setToDate(selected);
          }}
        />
      )}

      {/* ── Summary Strip ─────────────────────────────────────────────────────── */}
      <View style={S.strip}>
        {[
          { label: "Total", value: summary.total, color: Colors.finance_text || "#111" },
          { label: "Success", value: summary.success, color: "#16A34A" },
          { label: "Pending", value: summary.pending, color: "#D97706" },
          { label: "Failed", value: summary.failed, color: "#DC2626" },
          { label: "Amount", value: `₹${summary.amount.toLocaleString("en-IN")}`, color: Colors.finance_accent },
        ].map((item, i, arr) => (
          <React.Fragment key={item.label}>
            <View style={S.stripItem}>
              <Text style={[S.stripNum, { color: item.color }]}>{item.value}</Text>
              <Text style={S.stripLbl}>{item.label}</Text>
            </View>
            {i < arr.length - 1 && <View style={S.stripDiv} />}
          </React.Fragment>
        ))}
      </View>

      {/* ── Body ─────────────────────────────────────────────────────────────── */}
      {loadingTab ? (
        /* Loading */
        <View style={S.centeredBox}>
          <ActivityIndicator size="large" color={Colors.finance_accent} />
          <Text style={S.loadingTxt}>Fetching transactions...</Text>
        </View>

      ) : errorTab ? (
        /* Error */
        <View style={S.centeredBox}>
          <Icon name="alert-circle-outline" size={48} color="#DC2626aa" />
          <Text style={S.errorTitle}>Failed to load data</Text>
          <Text style={S.errorSub}>{errorTab}</Text>
          <TouchableOpacity style={S.retryBtn} onPress={retryTab}>
            <Icon name="refresh" size={15} color="#FFF" style={{ marginRight: 6 }} />
            <Text style={S.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>

      ) : !tabHasApi ? (
        /* Coming Soon */
        <View style={S.centeredBox}>
          <Icon name="clock-time-four-outline" size={48} color={Colors.finance_accent + "66"} />
          <Text style={S.emptyTitle}>Coming Soon</Text>
          <Text style={S.emptySub}>
            {activeTabCfg?.label} transactions will be available here soon.
          </Text>
        </View>

      ) : (
        /* Transaction List */
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 24, paddingTop: 6 }}
          showsVerticalScrollIndicator={false}
          onScrollBeginDrag={closeDD}
          keyboardShouldPersistTaps="handled"
        >
          {filtered.length === 0 ? (
            <View style={S.empty}>
              <Icon name="file-search-outline" size={50} color={Colors.finance_accent + "55"} />
              <Text style={S.emptyTitle}>No transactions found</Text>
              <Text style={S.emptySub}>Try changing your filters or search query</Text>
            </View>
          ) : (
            filtered.map((txn, i) => <TxnCard key={txn.id + i} txn={txn} />)
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TRANSACTION CARD
//  "extra" field se Recharge-specific info show karta hai (commission, refund).
//  Future services ke liye sirf unka normalizer "extra" populate kare —
//  card automatically show kar dega.
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORY_ICON = {
  Recharge: "cellphone",
  Wallet: "wallet",
  Aeps: "fingerprint",
  BBPS: "lightning-bolt",
};

const TxnCard = ({ txn }) => {
  const cfgKey = Object.keys(STATUS_CONFIG).find(
    k => k.toLowerCase() === txn.status?.trim().toLowerCase()
  ) || "Pending";
  const cfg = STATUS_CONFIG[cfgKey];

  const catKey = Object.keys(CATEGORY_ICON).find(
    k => k.toLowerCase() === txn.category?.trim().toLowerCase()
  );
  const catIcon = catKey ? CATEGORY_ICON[catKey] : "cash";

  const isFailed = txn.status?.trim().toLowerCase() === "failed";
  const isPending = txn.status?.trim().toLowerCase() === "pending";
  const isSuccess = txn.status?.trim().toLowerCase() === "success";

  const extra = txn.extra || {};

  return (
    <View style={C.wrap}>
      {/* ── Icon ── */}
      <View style={[C.iconBox, { backgroundColor: Colors.bg }]}>
        <Icon name={catIcon} size={22} color={Colors.finance_accent} />
      </View>

      {/* ── Middle ── */}
      <View style={C.mid}>
        <Text style={C.desc} numberOfLines={1}>{txn.desc}</Text>
        <Text style={C.id} numberOfLines={1}>#{txn.id}</Text>

        {/* Commission row — only for Recharge success with commission > 0 */}
        {txn.category === "Recharge" && isSuccess && extra.netCommission > 0 && (
          <View style={C.commRow}>
            <Icon name="trending-up" size={10} color="#16A34A" style={{ marginRight: 3 }} />
            <Text style={C.commTxt}>
              Comm: ₹{extra.netCommission.toFixed(2)}
              {extra.tds > 0 ? `  (TDS ₹${extra.tds.toFixed(2)})` : ""}
            </Text>
          </View>
        )}

        <View style={C.meta}>
          <View style={C.chip}>
            <Text style={C.chipTxt}>{txn.category}</Text>
          </View>
          <Text style={C.date}>{txn.date}</Text>
          {extra.isRefunded && (
            <View style={C.refundChip}>
              <Text style={C.refundTxt}>Refunded</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Right ── */}
      <View style={C.right}>
        <Text style={[C.amount, isFailed && C.amtFail, isPending && C.amtPend]}>
          {isFailed ? "-" : "+"}₹{Number(txn.amount).toLocaleString("en-IN")}
        </Text>
        <View style={[C.badge, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
          <Icon name={cfg.icon} size={10} color={cfg.color} style={{ marginRight: 3 }} />
          <Text style={[C.badgeTxt, { color: cfg.color }]}>{cfg.label}</Text>
        </View>
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
//  CARD STYLES
// ─────────────────────────────────────────────────────────────────────────────

const C = StyleSheet.create({
  wrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.homebg || Colors.finance_bg_2 || "#FFF",
    borderRadius: 16, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: "rgba(212,176,106,0.15)",
    elevation: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  iconBox: {
    width: 42, height: 42, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    marginRight: 12, flexShrink: 0,
  },
  mid: { flex: 1, marginRight: 10 },
  desc: {
    fontSize: 14, fontFamily: Fonts.Bold,
    color: Colors.finance_text || "#111827", marginBottom: 2,
  },
  id: {
    fontSize: 10, fontFamily: Fonts.Regular,
    color: "#9CA3AF", marginBottom: 4,
  },
  commRow: { flexDirection: "row", alignItems: "center", marginBottom: 5 },
  commTxt: { fontSize: 10, fontFamily: Fonts.Medium, color: "#16A34A" },
  meta: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  chip: {
    backgroundColor: Colors.bg,
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6,
  },
  chipTxt: {
    fontSize: 10, fontFamily: Fonts.Bold,
    color: Colors.finance_accent, letterSpacing: 0.3,
  },
  refundChip: {
    backgroundColor: "#FEF9EC",
    paddingHorizontal: 6, paddingVertical: 2,
    borderRadius: 6, borderWidth: 1, borderColor: "#F59E0B44",
  },
  refundTxt: { fontSize: 9, fontFamily: Fonts.Bold, color: "#D97706" },
  date: { fontSize: 10, fontFamily: Fonts.Medium, color: "#6B7280" },
  right: { alignItems: "flex-end", flexShrink: 0 },
  amount: {
    fontSize: 15, fontFamily: Fonts.Bold,
    color: "#16A34A", marginBottom: 6,
  },
  amtFail: { color: "#DC2626" },
  amtPend: { color: "#D97706" },
  badge: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 7, paddingVertical: 3,
    borderRadius: 20, borderWidth: 1,
  },
  badgeTxt: { fontSize: 11, fontFamily: Fonts.Bold },
});

// ─────────────────────────────────────────────────────────────────────────────
//  SCREEN STYLES
// ─────────────────────────────────────────────────────────────────────────────

const S = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg || "#F7F8FA" },

  // Tab
  tabBar: { borderBottomWidth: 1, borderBottomColor: "rgba(212,176,106,0.25)", marginTop: 4 },
  tabScroll: { paddingHorizontal: 14 },
  tabItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, paddingVertical: 10, marginRight: 4,
  },
  tabItemActive: { borderBottomWidth: 2.5, borderBottomColor: Colors.finance_accent },
  tabTxt: { fontSize: 13, fontFamily: Fonts.Medium, color: "#6B7280" },
  tabTxtActive: { fontSize: 13, fontFamily: Fonts.Bold, color: Colors.finance_accent },
  comingSoonDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: "#F59E0B", marginLeft: 4, marginBottom: 6,
  },

  // Search
  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.white || "#FFF",
    borderRadius: 12, marginHorizontal: 14, marginTop: 14,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: "rgba(212,176,106,0.2)",
    elevation: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05, shadowRadius: 3,
  },
  searchInput: {
    flex: 1, fontSize: 13, fontFamily: Fonts.Medium,
    color: Colors.finance_text || "#111827", padding: 0,
  },

  // Filters
  filterRow: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 14, marginTop: 12, marginBottom: 4, gap: 8,
  },
  ddWrap: { position: "relative" },
  filterBtn: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 11, paddingVertical: 8,
    borderRadius: 10, borderWidth: 1,
    borderColor: Colors.finance_accent + "60",
    backgroundColor: Colors.white || "#FFF",
    gap: 4, width: 120,
  },
  filterBtnOn: { backgroundColor: Colors.finance_accent, borderColor: Colors.finance_accent },
  filterBtnTxt: { flex: 1, fontSize: 12, fontFamily: Fonts.Bold, color: "#374151" },
  filterBtnTxtOn: { color: "#FFF" },
  dropdown: {
    position: "absolute", top: 42, left: 0,
    backgroundColor: Colors.white || "#FFF",
    borderRadius: 12, borderWidth: 1,
    borderColor: "rgba(212,176,106,0.3)",
    elevation: 12, zIndex: 1000, minWidth: 160,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 10, overflow: "hidden",
  },
  dropItem: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 11, paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#F3F4F6", gap: 8,
  },
  dropItemOn: { backgroundColor: Colors.finance_accent + "12" },
  dropItemTxt: { flex: 1, fontSize: 13, fontFamily: Fonts.Medium, color: "#111827" },
  dropItemTxtOn: { color: Colors.finance_accent, fontFamily: Fonts.Bold },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  resetBtn: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.finance_accent + "60",
    backgroundColor: Colors.white || "#FFF",
  },

  // Custom date
  customRow: {
    flexDirection: "row", alignItems: "center",
    justifyContent: "center", gap: 10,
    paddingHorizontal: 14, marginTop: 8, marginBottom: 4,
  },
  customBtn: {
    flex: 1, flexDirection: "row", alignItems: "center",
    paddingHorizontal: 12, paddingVertical: 9,
    borderRadius: 10, borderWidth: 1,
    borderColor: "rgba(212,176,106,0.3)",
    backgroundColor: Colors.white || "#FFF",
  },
  customBtnOn: { borderColor: Colors.finance_accent, backgroundColor: Colors.finance_accent + "10" },
  customTxt: { fontSize: 12, fontFamily: Fonts.Medium, color: "#6B7280", flex: 1 },
  customTxtOn: { color: Colors.finance_accent, fontFamily: Fonts.Bold },

  // Summary strip
  strip: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.bg,
    marginHorizontal: 14, marginTop: 12, marginBottom: 8,
    borderRadius: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: "rgba(212,176,106,0.18)",
    elevation: 2,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06, shadowRadius: 4,
  },
  stripItem: { flex: 1, alignItems: "center" },
  stripNum: { fontSize: 14, fontFamily: Fonts.Bold, marginBottom: 2 },
  stripLbl: {
    fontSize: 9, fontFamily: Fonts.Medium, color: "#6B7280",
    letterSpacing: 0.4, textTransform: "uppercase",
  },
  stripDiv: { width: 1, height: 28, backgroundColor: "rgba(212,176,106,0.2)" },

  // States
  centeredBox: {
    flex: 1, alignItems: "center", justifyContent: "center",
    paddingTop: 40, paddingBottom: 40,
  },
  loadingTxt: {
    marginTop: 14, fontSize: 13, fontFamily: Fonts.Medium, color: "#6B7280",
  },
  errorTitle: {
    fontSize: 16, fontFamily: Fonts.Bold,
    color: "#DC2626", marginTop: 14, marginBottom: 6,
  },
  errorSub: {
    fontSize: 12, fontFamily: Fonts.Medium,
    color: "#6B7280", textAlign: "center",
    marginHorizontal: 30, marginBottom: 16,
  },
  retryBtn: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.finance_accent,
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10,
  },
  retryTxt: { fontSize: 13, fontFamily: Fonts.Bold, color: "#FFF" },
  empty: { alignItems: "center", paddingTop: 60, paddingBottom: 40 },
  emptyTitle: {
    fontSize: 16, fontFamily: Fonts.Bold,
    color: Colors.finance_text || "#111827", marginTop: 14, marginBottom: 6,
  },
  emptySub: {
    fontSize: 13, fontFamily: Fonts.Medium,
    color: "#6B7280", textAlign: "center", marginHorizontal: 30,
  },
});