import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import DateTimePicker from "@react-native-community/datetimepicker";
import Colors from "../constants/Colors";
import Fonts from "../constants/Fonts";
import HeaderBar from "../componets/HeaderBar";

export default function InvoiceScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState("All");
  const tabs = ["All", "Recharge", "Wallet", "Aeps", "BBPS"];

  const [statusOpen, setStatusOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);

  const [statusFilter, setStatusFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("Last 30 Days");

  const [showCustom, setShowCustom] = useState(false);
  const [fromDate, setFromDate] = useState(null);
  const [toDate, setToDate] = useState(null);

  const [pickerMode, setPickerMode] = useState("");
  const [openPicker, setOpenPicker] = useState(false);

  return (
    <View style={styles.container}>
      <HeaderBar title="History" onBack={() => navigation.goBack()} />

      {/* ---------- Tabs ---------- */}
      <View style={styles.tabs}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={styles.tab}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>
            {activeTab === tab && <View style={styles.activeLine} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* ---------- Filters ---------- */}
      <View style={styles.filterRow}>
        {/* STATUS */}
        <View>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => {
              setStatusOpen(!statusOpen);
              setDateOpen(false);
            }}
          >
            <Text style={styles.filterText}>Status: {statusFilter}</Text>
            <Icon name="chevron-down" size={18} color={Colors.finance_text} />
          </TouchableOpacity>

          {statusOpen && (
            <View style={styles.dropdown}>
              {["All", "Success", "Pending", "Fail"].map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => {
                    setStatusFilter(item);
                    setStatusOpen(false);
                  }}
                  style={styles.option}
                >
                  <Text style={styles.optionText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* DATE */}
        <View>
          <TouchableOpacity
            style={styles.filterBtn}
            onPress={() => {
              setDateOpen(!dateOpen);
              setStatusOpen(false);
            }}
          >
            <Text style={styles.filterText}>{dateFilter}</Text>
            <Icon name="chevron-down" size={18} color={Colors.finance_text} />
          </TouchableOpacity>

          {dateOpen && (
            <View style={styles.dropdown}>
              {[
                "Last 7 Days",
                "Last 30 Days",
                "Last 3 Months",
                "Last 6 Months",
                "Custom",
              ].map((item) => (
                <TouchableOpacity
                  key={item}
                  onPress={() => {
                    if (item === "Custom") {
                      setShowCustom(true);
                      setDateOpen(false);
                      setDateFilter("Custom");
                    } else {
                      setDateFilter(item);
                      setShowCustom(false);
                      setDateOpen(false);
                    }
                  }}
                  style={styles.option}
                >
                  <Text style={styles.optionText}>{item}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </View>

      {/* ---------- CUSTOM DATE RANGE ---------- */}
      {showCustom && (
        <View style={styles.customRow}>
          <TouchableOpacity
            style={styles.customBtn}
            onPress={() => {
              setPickerMode("from");
              setOpenPicker(true);
            }}
          >
            <Text style={styles.customText}>
              From: {fromDate ? fromDate : "Select"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.customBtn}
            onPress={() => {
              setPickerMode("to");
              setOpenPicker(true);
            }}
          >
            <Text style={styles.customText}>
              To: {toDate ? toDate : "Select"}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ---------- Date Picker ---------- */}
      {openPicker && (
        <DateTimePicker
          value={new Date()}
          mode="date"
          display="calendar"
          onChange={(event, selected) => {
            setOpenPicker(false);
            if (!selected) return;

            let d =
              selected.getDate() +
              "/" +
              (selected.getMonth() + 1) +
              "/" +
              selected.getFullYear();

            if (pickerMode === "from") setFromDate(d);
            else setToDate(d);
          }}
        />
      )}

      {/* ---------- LIST ---------- */}
      <ScrollView >
        <InvoiceCard
          id="1004321"
          amount="6300"
          company="Recharge"
          status="Success"
          date="14/07/2026"
          statusColor="#0BBF7A"
        />

        <InvoiceCard
          id="1004222"
          amount="3600"
          company="Balance Enquiry"
          status="Success"
          date="14/07/2026"
          statusColor="#0BBF7A"
        />

        <InvoiceCard
          id="1005333"
          amount="7800"
          company="DMT Payout"
          status="Fail"
          date="14/07/2026"
          statusColor="#EB3A2E"
        />

        <InvoiceCard
          id="1002224"
          amount="9600"
          company="Cash Withdraw"
          status="Success"
          date="14/07/2026"
          statusColor="#0BBF7A"
        />

        <InvoiceCard
          id="1002224"
          amount="9600"
          company="Cash Withdraw"
          status="Success"
          date="14/07/2026"
          statusColor="#0BBF7A"
        />

        <InvoiceCard
          id="1002224"
          amount="9600"
          company="Cash Withdraw"
          status="Success"
          date="14/07/2026"
          statusColor="#0BBF7A"
        />

        <InvoiceCard
          id="1002224"
          amount="9600"
          company="Cash Withdraw"
          status="Success"
          date="14/07/2026"
          statusColor="#0BBF7A"
        />

        <InvoiceCard
          id="1002224"
          amount="9600"
          company="Cash Withdraw"
          status="Success"
          date="14/07/2026"
          statusColor="#0BBF7A"
        />

        <InvoiceCard
          id="1002224"
          amount="9600"
          company="Cash Withdraw"
          status="Success"
          date="14/07/2026"
          statusColor="#0BBF7A"
        />
      </ScrollView>
    </View>
  );
}

/* ---------- CARD ---------- */
const InvoiceCard = ({ id, amount, company, status, date, statusColor }) => (
  <View style={styles.card}>
    <View style={styles.topRow}>
      <Icon name="wallet" size={28} color={Colors.finance_text} />

      <View style={{ marginLeft: 50, width: "35%", justifyContent: 'center' }}>
        <Text style={styles.invId}>ID: {id}</Text>
        <Text style={styles.company}>{company}</Text>
        <Text style={styles.amount}>₹{amount}</Text>
      </View>

      <View style={styles.bottomRow}>
        <Text style={[styles.status, { color: statusColor }]}>{status}</Text>
        <Text style={styles.date}>{date}</Text>
      </View>
    </View>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.finance_bg_1 },

  /* Tabs */
  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: 'rgba(212, 176, 106, 0.3)', // finance_accent light
    paddingHorizontal: 10,
    marginTop: 16,
  },
  tab: { marginHorizontal: 10, alignItems: "center" },
  tabText: { fontSize: 16, color: Colors.finance_text, paddingBottom: 6, fontFamily: Fonts.Medium },
  activeTabText: { color: Colors.finance_accent, fontFamily: Fonts.Bold },
  activeLine: { width: "100%", height: 3, backgroundColor: Colors.finance_accent },

  /* Filters */
  filterRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 20,
    marginBottom: 16,
  },
  filterBtn: {
    flexDirection: "row",
    backgroundColor: Colors.finance_accent, // Gold
    paddingVertical: 8,
    paddingHorizontal: 10,
    width: 150,
    borderColor: Colors.finance_text,
    borderWidth: 0,
    elevation: 3,
    borderRadius: 10,
    alignItems: "center",
    gap: 6,
  },
  filterText: { fontSize: 14, color: Colors.finance_text, fontFamily: Fonts.Bold },

  dropdown: {
    position: "absolute",
    top: 45,
    left: 0,
    backgroundColor: Colors.finance_bg_2,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.finance_accent,
    elevation: 10,
    zIndex: 999,
    width: 160,
  },
  option: { paddingVertical: 8, paddingHorizontal: 10, },
  optionText: { fontSize: 14, color: Colors.finance_text, fontFamily: Fonts.Medium },

  /* Custom Date */
  customRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 10,
  },
  customBtn: {
    backgroundColor: Colors.finance_bg_2,
    paddingVertical: 8,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12, width: 145,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.finance_accent,
  },
  customText: { color: Colors.finance_text, fontSize: 13, fontFamily: Fonts.Medium },

  /* Card */
  card: {
    backgroundColor: Colors.finance_bg_2, // Gold Light
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 14,
    borderRadius: 14,
    borderWidth: 0,
    borderColor: Colors.finance_accent,
    elevation: 3,
  },
  topRow: {
    width: "100%",
    paddingRight: 5,
    flexDirection: "row",
    alignItems: "center",
  },
  bottomRow: {
    flexDirection: "column",
    alignItems: "flex-end",
    marginTop: 22,
    width: "35%",
  },

  invId: { fontSize: 12, color: Colors.finance_text, fontFamily: Fonts.Regular, opacity: 0.7 },
  status: { fontSize: 12, marginBottom: 4, fontFamily: Fonts.Bold },
  amount: { fontSize: 14, marginTop: 4, fontFamily: Fonts.Bold, color: Colors.finance_text },
  company: { fontSize: 14, color: Colors.finance_text, fontFamily: Fonts.Bold },
  date: { fontSize: 12, color: Colors.finance_text, fontFamily: Fonts.Medium, opacity: 0.6 },
});
