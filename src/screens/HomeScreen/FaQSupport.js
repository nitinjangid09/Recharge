import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  StatusBar,
  Alert,
  Modal,
  FlatList,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { getAllTickets, registerTicket } from "../../api/bbpsApi";


const normaliseType = (item, index) => ({
  key:
    item.type ||
    item.id ||
    item.service ||
    item.cat_key ||
    String(index),
  label:
    item.name ||
    item.label ||
    item.serviceName ||
    item.type ||
    `Service ${index + 1}`,
  raw: item, // keep original in case API needs original fields
});

/* ─────────────────────────────────────────────
   Service Picker Modal
─────────────────────────────────────────────*/

const ServicePicker = ({ visible, types, selected, onSelect, onClose }) => {
  const normalised = (types || []).map(normaliseType);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={pickerStyles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity activeOpacity={1} style={pickerStyles.sheet} onPress={() => {}}>
          {/* Handle bar */}
          <View style={pickerStyles.handle} />

          <Text style={pickerStyles.title}>Select Service Type</Text>

          {normalised.length === 0 ? (
            <Text style={pickerStyles.emptyText}>No service types available.</Text>
          ) : (
            <FlatList
              data={normalised}
              keyExtractor={(item) => item.key}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => {
                const active = item.key === selected?.key;
                return (
                  <TouchableOpacity
                    style={[pickerStyles.row, active && pickerStyles.activeRow]}
                    onPress={() => {
                      onSelect(item);
                      onClose();
                    }}
                  >
                    <Text style={[pickerStyles.rowText, active && pickerStyles.activeText]}>
                      {item.label}
                    </Text>
                    {active && <Text style={pickerStyles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />
          )}

          <TouchableOpacity style={pickerStyles.closeBtn} onPress={onClose}>
            <Text style={pickerStyles.closeTxt}>Cancel</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

/* ─────────────────────────────────────────────
   Ticket Card (expandable)
─────────────────────────────────────────────*/

const STATUS_COLORS = {
  RESOLVED: { bg: "#D1FAE5", text: "#059669" },
  PENDING:  { bg: "#FEF3C7", text: "#B45309" },
  OPEN:     { bg: "#DBEAFE", text: "#1D4ED8" },
  CLOSED:   { bg: "#F3F4F6", text: "#6B7280" },
};

const TicketCard = ({ ticket }) => {
  const [open, setOpen] = useState(false);
  const colors = STATUS_COLORS[ticket.status] || { bg: "#F3F4F6", text: "#6B7280" };

  return (
    <TouchableOpacity
      style={styles.historyCard}
      activeOpacity={0.85}
      onPress={() => setOpen((v) => !v)}
    >
      <View style={styles.historyTop}>
        <Text style={styles.ticketId}>#{ticket.ticketid}</Text>
        <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.statusText, { color: colors.text }]}>
            {ticket.status}
          </Text>
        </View>
      </View>

      <Text style={styles.rowText}>
        <Text style={styles.rowLabel}>Service: </Text>
        {ticket.service}
      </Text>
      <Text style={styles.rowText}>
        <Text style={styles.rowLabel}>Txn ID: </Text>
        {ticket.txnid}
      </Text>

      {open && (
        <View style={styles.expandedWrap}>
          <View style={styles.divider} />
          <Text style={styles.rowText}>
            <Text style={styles.rowLabel}>Message: </Text>
            {ticket.message}
          </Text>
          <Text style={styles.rowText}>
            <Text style={styles.rowLabel}>Admin Reply: </Text>
            {ticket.adminmsg || "No reply yet"}
          </Text>
          <Text style={styles.rowText}>
            <Text style={styles.rowLabel}>Date: </Text>
            {ticket.date}
          </Text>
        </View>
      )}

      <Text style={styles.caret}>{open ? "▲ less" : "▼ more"}</Text>
    </TouchableOpacity>
  );
};

/* ─────────────────────────────────────────────
   MAIN SCREEN
─────────────────────────────────────────────*/

const FaqSupportScreen = () => {
  const [selectedService, setSelectedService] = useState(null); // normalised item
  const [txnId, setTxnId] = useState("");
  const [message, setMessage] = useState("");

  const [supportTypes, setSupportTypes] = useState([]);
  const [tickets, setTickets] = useState([]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  /* ── Load ─────────────────────────────────── */
  const loadData = async () => {
    setLoading(true);
    try {
      const result = await getAllTickets();
      if (result.success) {
        setSupportTypes(Array.isArray(result.supportTypes) ? result.supportTypes : []);
        setTickets(Array.isArray(result.supportTickets) ? result.supportTickets : []);
      } else {
        Alert.alert("Error", result.message || "Failed to load data.");
      }
    } catch (err) {
      Alert.alert("Error", "Unexpected error loading tickets.");
    } finally {
      setLoading(false);
    }
  };

  /* ── Submit ───────────────────────────────── */
  const handleSubmit = async () => {
    if (!selectedService)
      return Alert.alert("Validation", "Please select a service type.");
    if (!txnId.trim())
      return Alert.alert("Validation", "Please enter a Transaction ID.");
    if (!message.trim())
      return Alert.alert("Validation", "Please enter a message.");

    setSubmitting(true);
    try {
      const result = await registerTicket({
        service: selectedService.key, // normalised key sent to API
        txnid: txnId.trim(),
        message: message.trim(),
      });

      if (result.success) {
        Alert.alert("Success ✓", result.message || "Ticket raised successfully.");
        setSelectedService(null);
        setTxnId("");
        setMessage("");
        loadData();
      } else {
        Alert.alert("Error", result.message || "Something went wrong.");
      }
    } catch (err) {
      Alert.alert("Error", "Unexpected error submitting ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Render ───────────────────────────────── */
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#F3EBDD" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerWrap}>
          <View style={styles.supportPill}>
            <Text style={styles.supportPillTxt}>SUPPORT CENTER</Text>
          </View>
          <Text style={styles.headingBlack}>FAQ &</Text>
          <Text style={styles.headingRed}>Support</Text>
          <Text style={styles.subheading}>
            Raise a ticket and we'll get back to you shortly.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>New Support Ticket</Text>

          <Text style={styles.fieldLabel}>ISSUE TYPE *</Text>
          <TouchableOpacity
            style={[styles.inputBox, pickerOpen && styles.inputBoxFocused]}
            onPress={() => setPickerOpen(true)}
            activeOpacity={0.7}
          >
            <Text style={selectedService ? styles.inputText : styles.placeholderText}>
              {selectedService?.label || "Tap to select service type"}
            </Text>
            <Text style={styles.dropArrow}>▾</Text>
          </TouchableOpacity>

          <Text style={styles.fieldLabel}>TRANSACTION ID *</Text>
          <TextInput
            style={[styles.inputBox, styles.inputText]}
            value={txnId}
            onChangeText={setTxnId}
            placeholder="e.g. TXN123456789"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <Text style={styles.fieldLabel}>REMARK *</Text>
          <TextInput
            style={[
              styles.inputBox,
              styles.inputText,
              { height: 110, textAlignVertical: "top", alignItems: "flex-start" },
            ]}
            multiline
            value={message}
            onChangeText={setMessage}
            placeholder="Describe your issue in detail..."
            placeholderTextColor="#9CA3AF"
          />

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.submitText}>SUBMIT TICKET</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* History */}
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>My Tickets</Text>
          <TouchableOpacity onPress={loadData} disabled={loading}>
            <Text style={styles.refreshBtn}>{loading ? "…" : "↻ Refresh"}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#D71920" style={{ marginTop: 30 }} />
        ) : tickets.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>🎫</Text>
            <Text style={styles.emptyText}>No tickets raised yet.</Text>
          </View>
        ) : (
          tickets.map((item) => (
            <TicketCard key={String(item.ticketid)} ticket={item} />
          ))
        )}
      </ScrollView>

      <ServicePicker
        visible={pickerOpen}
        types={supportTypes}
        selected={selectedService}
        onSelect={setSelectedService}
        onClose={() => setPickerOpen(false)}
      />
    </SafeAreaView>
  );
};

export default FaqSupportScreen;

/* ─────────────────────────────────────────────
   STYLES
─────────────────────────────────────────────*/

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#F3EBDD" },

  headerWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  supportPill: {
    backgroundColor: "#D71920",
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  supportPillTxt: { color: "#fff", fontWeight: "700", fontSize: 11, letterSpacing: 1 },
  headingBlack: { fontSize: 34, fontWeight: "900", color: "#111827", lineHeight: 40 },
  headingRed: { fontSize: 34, fontWeight: "900", color: "#D71920", lineHeight: 40 },
  subheading: { fontSize: 13, color: "#6B7280", marginTop: 6, marginBottom: 4 },

  card: {
    backgroundColor: "#fff",
    margin: 20,
    padding: 20,
    borderRadius: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  cardTitle: { fontSize: 16, fontWeight: "800", color: "#111827", marginBottom: 4 },

  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#6B7280",
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    backgroundColor: "#FAFAFA",
    justifyContent: "space-between",
  },
  inputBoxFocused: { borderColor: "#D71920" },
  inputText: { flex: 1, color: "#111827", fontSize: 14 },
  placeholderText: { flex: 1, color: "#9CA3AF", fontSize: 14 },
  dropArrow: { color: "#9CA3AF", fontSize: 16 },

  submitButton: {
    backgroundColor: "#D71920",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 22,
  },
  submitButtonDisabled: { opacity: 0.65 },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 14, letterSpacing: 1 },

  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 12,
  },
  historyTitle: { fontSize: 18, fontWeight: "800", color: "#111827" },
  refreshBtn: { fontSize: 14, color: "#D71920", fontWeight: "700" },

  emptyWrap: { alignItems: "center", marginTop: 30 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: "#9CA3AF", fontSize: 14 },

  historyCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 18,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  historyTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  ticketId: { fontWeight: "800", fontSize: 14, color: "#111827" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  rowLabel: { fontWeight: "700", color: "#374151" },
  rowText: { fontSize: 13, color: "#6B7280", marginTop: 3 },
  expandedWrap: { marginTop: 8 },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 10 },
  caret: { fontSize: 11, color: "#D71920", fontWeight: "600", marginTop: 10, textAlign: "right" },
});

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 36 : 20,
    paddingTop: 12,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    maxHeight: "65%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: { fontSize: 17, fontWeight: "800", color: "#111827", marginBottom: 14 },
  emptyText: { color: "#9CA3AF", fontSize: 14, textAlign: "center", marginVertical: 30 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rowText: { fontSize: 15, color: "#374151" },
  activeRow: { backgroundColor: "#FEF2F2", borderRadius: 12, paddingHorizontal: 10 },
  activeText: { color: "#D71920", fontWeight: "700" },
  checkmark: { color: "#D71920", fontWeight: "700", fontSize: 16 },
  closeBtn: {
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    alignItems: "center",
  },
  closeTxt: { color: "#374151", fontWeight: "700", fontSize: 14 },
});