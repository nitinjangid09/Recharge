import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Colors from "../constants/Colors";
import Fonts from "../constants/Fonts";
import HeaderBar from "../componets/HeaderBar";
import { SafeAreaView } from "react-native-safe-area-context";

// ─────────────────────────────────────────────────────────────────────────────
//  Mock Data  — replace with real API data
// ─────────────────────────────────────────────────────────────────────────────

const ALL_TRANSACTIONS = [
  { id: "TXN1004321", amount: "6300", category: "Recharge", status: "Success", date: "14/07/2026", desc: "Airtel Prepaid" },
  { id: "TXN1004222", amount: "3600", category: "Aeps", status: "Success", date: "13/07/2026", desc: "Balance Enquiry" },
  { id: "TXN1005333", amount: "7800", category: "Wallet", status: "Failed", date: "13/07/2026", desc: "DMT Payout" },
  { id: "TXN1002224", amount: "9600", category: "Wallet", status: "Success", date: "12/07/2026", desc: "Cash Withdraw" },
  { id: "TXN1007890", amount: "1200", category: "BBPS", status: "Pending", date: "12/07/2026", desc: "Electricity Bill" },
  { id: "TXN1003345", amount: "4500", category: "Recharge", status: "Failed", date: "11/07/2026", desc: "Jio Postpaid" },
  { id: "TXN1008901", amount: "2200", category: "BBPS", status: "Success", date: "10/07/2026", desc: "Water Bill" },
  { id: "TXN1009123", amount: "5000", category: "Aeps", status: "Pending", date: "09/07/2026", desc: "Cash Deposit" },
  { id: "TXN1001456", amount: "8000", category: "Wallet", status: "Success", date: "08/07/2026", desc: "Fund Transfer" },
  { id: "TXN1006789", amount: "3300", category: "Recharge", status: "Success", date: "07/07/2026", desc: "Vi Prepaid" },
];

// ─────────────────────────────────────────────────────────────────────────────
//  Tab config
//  ─────────────────────────────────────────────────────────────────────────────
//  ✅ "All" is always shown.
//  The service-specific tabs (Recharge / Wallet / Aeps / BBPS) are commented
//  out because they are not needed at present. Uncomment any tab whenever the
//  corresponding service is ready.
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  //{ label: "All", value: "All" },
  { label: "Recharge", value: "Recharge" },
  { label: "Wallet", value: "Wallet" },
  { label: "Aeps", value: "Aeps" },
  { label: "BBPS", value: "BBPS" },
];


const STATUS_CONFIG = {
  Success: { color: "#16A34A", bg: "#f7fffaff", border: "#e8fff0ff", icon: "check-circle", label: "Success" },
  Pending: { color: "#D97706", bg: "#FFFBEB", border: "#fef3e6ff", icon: "clock-outline", label: "Pending" },
  Failed: { color: "#DC2626", bg: "#FEF2F2", border: "#fce6e6ff", icon: "close-circle", label: "Failed" },
};

const CATEGORY_ICON = {
  Recharge: "cellphone",
  Wallet: "wallet",
  Aeps: "fingerprint",
  BBPS: "lightning-bolt",
};

const DATE_LABEL_SHORT = {
  "All Time": "All Time",
  "Last 7 Days": "Last 7D",
  "Last 30 Days": "Last 30D",
  "Last 3 Months": "Last 3M",
  "Last 6 Months": "Last 6M",
  "Custom": "Custom",
};

const parseDate = (str) => {
  // "DD/MM/YYYY" → Date
  const [d, m, y] = str.split("/").map(Number);
  return new Date(y, m - 1, d);
};

const dateRangeStart = (filter) => {
  const now = new Date(); now.setHours(0, 0, 0, 0);
  if (filter === "Last 7 Days") { const d = new Date(now); d.setDate(d.getDate() - 6); return d; }
  if (filter === "Last 30 Days") { const d = new Date(now); d.setDate(d.getDate() - 29); return d; }
  if (filter === "Last 3 Months") { const d = new Date(now); d.setMonth(d.getMonth() - 3); return d; }
  if (filter === "Last 6 Months") { const d = new Date(now); d.setMonth(d.getMonth() - 6); return d; }
  return null;
};

const fmt = (d) => {
  if (!d) return "";
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

// ─────────────────────────────────────────────────────────────────────────────
//  SCREEN
// ─────────────────────────────────────────────────────────────────────────────

export default function InvoiceScreen({ navigation }) {
  const STATUSES = ["All", "Success", "Pending", "Failed"];
  const DATES = ["All Time", "Last 7 Days", "Last 30 Days", "Last 3 Months", "Last 6 Months", "Custom"];

  const [activeTab, setActiveTab] = useState("All");
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

  const closeDD = () => { setStatusOpen(false); setDateOpen(false); };

  // ── Filtered list ───────────────────────────────────────────────────────────
  // ✅ FIX: category comparison uses trimmed, case-insensitive exact match
  //    so "Aeps" === "aeps" or "BBPS" === "BBps" edge-cases never break it.
  const filtered = useMemo(() => {
    let list = [...ALL_TRANSACTIONS];

    // ── Tab / category filter ───────────────────────────────────────────────
    if (activeTab !== "All") {
      const tabLower = activeTab.trim().toLowerCase();
      list = list.filter(t => t.category.trim().toLowerCase() === tabLower);
    }

    // ── Status filter ───────────────────────────────────────────────────────
    if (statusFilter !== "All") {
      const sfLower = statusFilter.trim().toLowerCase();
      list = list.filter(t => t.status.trim().toLowerCase() === sfLower);
    }

    // ── Date filter ─────────────────────────────────────────────────────────
    if (dateFilter === "Custom" && (fromDate || toDate)) {
      list = list.filter(t => {
        const d = parseDate(t.date);
        if (fromDate && d < fromDate) return false;
        if (toDate) {
          const end = new Date(toDate); end.setHours(23, 59, 59, 999);
          if (d > end) return false;
        }
        return true;
      });
    } else if (dateFilter !== "All Time") {
      const start = dateRangeStart(dateFilter);
      if (start) list = list.filter(t => parseDate(t.date) >= start);
    }

    // ── Search filter ───────────────────────────────────────────────────────
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
  }, [activeTab, statusFilter, dateFilter, fromDate, toDate, search]);

  // ── Summary counts ──────────────────────────────────────────────────────────
  const summary = useMemo(() => ({
    total: filtered.length,
    success: filtered.filter(t => t.status === "Success").length,
    pending: filtered.filter(t => t.status === "Pending").length,
    failed: filtered.filter(t => t.status === "Failed").length,
    amount: filtered.reduce((s, t) => s + Number(t.amount), 0),
  }), [filtered]);

  // ── Date button label — always single line ──────────────────────────────────
  const dateBtnLabel = useMemo(() => {
    if (dateFilter === "Custom" && fromDate) return fmt(fromDate) + (toDate ? `→${fmt(toDate)}` : "→?");
    return DATE_LABEL_SHORT[dateFilter] || dateFilter;
  }, [dateFilter, fromDate, toDate]);

  const isDateActive = dateFilter !== "Last 30 Days";
  const isStatusActive = statusFilter !== "All";
  const hasReset = isStatusActive || isDateActive || !!search;

  return (
    <SafeAreaView style={S.safe}>
      <HeaderBar title="Transaction History" onBack={() => navigation.goBack()} />

      {/* ── Tab Bar ─────────────────────────────────────────────────────────── */}
      {/*
        Only renders tabs defined in the TABS array above.
        Currently only "All" is uncommented. Uncomment additional tabs in the
        TABS array at the top of the file to re-enable them.
      */}
      <View style={S.tabBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.tabScroll}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.value}
              onPress={() => { setActiveTab(tab.value); closeDD(); }}
              style={[S.tabItem, activeTab === tab.value && S.tabItemActive]}
            >
              <Text style={[S.tabTxt, activeTab === tab.value && S.tabTxtActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* ── Search ───────────────────────────────────────────────────────────── */}
      <View style={S.searchWrap}>
        <Icon name="magnify" size={18} color={Colors.finance_accent} style={{ marginRight: 8 }} />
        <TextInput
          style={S.searchInput}
          placeholder="Search ID, type, amount..."
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
            <Icon name={statusOpen ? "chevron-up" : "chevron-down"} size={13}
              color={isStatusActive ? "#FFF" : Colors.finance_accent} />
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
            <Icon name={dateOpen ? "chevron-up" : "chevron-down"} size={13}
              color={isDateActive ? "#FFF" : Colors.finance_accent} />
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
              setStatusFilter("All"); setDateFilter("Last 30 Days");
              setFromDate(null); setToDate(null);
              setShowCustom(false); setSearch(""); closeDD();
            }}
          >
            <Icon name="refresh" size={15} color={Colors.finance_accent} />
          </TouchableOpacity>
        )}
      </View>

      {/* ── Custom Date Range ────────────────────────────────────────────────── */}
      {showCustom && (
        <View style={S.customRow}>
          <TouchableOpacity
            style={[S.customBtn, fromDate && S.customBtnOn]}
            onPress={() => { setPickerMode("from"); setPickerVisible(true); }}
          >
            <Icon name="calendar-start" size={13} color={fromDate ? Colors.finance_accent : "#9CA3AF"} style={{ marginRight: 4 }} />
            <Text style={[S.customTxt, fromDate && S.customTxtOn]} numberOfLines={1}>
              {fromDate ? `From: ${fmt(fromDate)}` : "From Date"}
            </Text>
          </TouchableOpacity>
          <Icon name="arrow-right" size={14} color="#9CA3AF" />
          <TouchableOpacity
            style={[S.customBtn, toDate && S.customBtnOn]}
            onPress={() => { setPickerMode("to"); setPickerVisible(true); }}
          >
            <Icon name="calendar-end" size={13} color={toDate ? Colors.finance_accent : "#9CA3AF"} style={{ marginRight: 4 }} />
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

      {/* ── Summary Strip ────────────────────────────────────────────────────── */}
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

      {/* ── Transaction List ─────────────────────────────────────────────────── */}
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
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TRANSACTION CARD
// ─────────────────────────────────────────────────────────────────────────────

const TxnCard = ({ txn }) => {
  // ✅ Normalised lookup — handles any case variation in status
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

  return (
    <View style={C.wrap}>
      {/* Icon */}
      <View style={[C.iconBox, { backgroundColor: Colors.bg }]}>
        <Icon name={catIcon} size={22} color={Colors.finance_accent} />
      </View>

      {/* Middle */}
      <View style={C.mid}>
        <Text style={C.desc} numberOfLines={1}>{txn.desc}</Text>
        <Text style={C.id}>#{txn.id}</Text>
        <View style={C.meta}>
          <View style={C.chip}>
            <Text style={C.chipTxt}>{txn.category}</Text>
          </View>
          <Text style={C.date}>{txn.date}</Text>
        </View>
      </View>

      {/* Right */}
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
    width: 40, height: 40, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    marginRight: 12, flexShrink: 0,
  },
  mid: { flex: 1, marginRight: 10 },
  desc: { fontSize: 14, fontFamily: Fonts.Bold, color: Colors.finance_text || "#111827", marginBottom: 2 },
  id: { fontSize: 11, fontFamily: Fonts.Regular, color: "#6B7280", marginBottom: 5 },
  meta: { flexDirection: "row", alignItems: "center", gap: 8 },
  chip: { backgroundColor: Colors.bg, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  chipTxt: { fontSize: 10, fontFamily: Fonts.Bold, color: Colors.finance_accent, letterSpacing: 0.3 },
  date: { fontSize: 10, fontFamily: Fonts.Medium, color: "#6B7280" },
  right: { alignItems: "flex-end", flexShrink: 0 },
  amount: { fontSize: 15, fontFamily: Fonts.Bold, color: "#16A34A", marginBottom: 6 },
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
  safe: { flex: 1, backgroundColor: Colors.bg || Colors.finance_bg_1 || "#F7F8FA" },

  tabBar: { borderBottomWidth: 1, borderBottomColor: "rgba(212,176,106,0.25)", marginTop: 4 },
  tabScroll: { paddingHorizontal: 14 },
  tabItem: { paddingHorizontal: 14, paddingVertical: 10, marginRight: 4 },
  tabItemActive: { borderBottomWidth: 2.5, borderBottomColor: Colors.finance_accent },
  tabTxt: { fontSize: 13, fontFamily: Fonts.Medium, color: "#6B7280" },
  tabTxtActive: { fontSize: 13, fontFamily: Fonts.Bold, color: Colors.finance_accent },

  searchWrap: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.white || "#FFF",
    borderRadius: 12, marginHorizontal: 14, marginTop: 14,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: "rgba(212,176,106,0.2)",
    elevation: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3,
  },
  searchInput: {
    flex: 1, fontSize: 13, fontFamily: Fonts.Medium,
    color: Colors.finance_text || "#111827", padding: 0,
  },

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
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#F3F4F6", gap: 8,
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
  stripLbl: { fontSize: 9, fontFamily: Fonts.Medium, color: "#6B7280", letterSpacing: 0.4, textTransform: "uppercase" },
  stripDiv: { width: 1, height: 28, backgroundColor: "rgba(212,176,106,0.2)" },

  empty: { alignItems: "center", paddingTop: 60, paddingBottom: 40 },
  emptyTitle: { fontSize: 16, fontFamily: Fonts.Bold, color: Colors.finance_text || "#111827", marginTop: 14, marginBottom: 6 },
  emptySub: { fontSize: 13, fontFamily: Fonts.Medium, color: "#6B7280", textAlign: "center" },
});