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
import Fonts from "../../constants/Fonts";
import Colors from "../../constants/Colors";
import {
  fetchUserProfile,
  createSupportRequest,
  getMySupportRequests,
} from "../../api/AuthApi";

/* ─────────────────────────────────────────────
   Helpers
─────────────────────────────────────────────*/

/** Retrieve the saved auth token from AsyncStorage */
const getToken = async () => {
  let token = await AsyncStorage.getItem("header_token");
  if (!token) {
    const raw = await AsyncStorage.getItem("token");
    if (raw) {
      try {
        token = JSON.parse(raw)?.token ?? null;
      } catch {
        token = raw;
      }
    }
  }
  return token;
};

/**
 * Normalise an assignedService object coming from the profile API:
 *   { _id: "6993147e...", name: "bbps" }
 * into a consistent shape used throughout the UI.
 */
const normaliseService = (item, index) => {
  const key =
    item._id || item.id || item.name || item.type || item.cat_key || String(index);
  const rawLabel =
    item.name || item.label || item.serviceName || item.type || `Service ${index + 1}`;

  return {
    key,
    label: typeof rawLabel === "string" ? rawLabel.toUpperCase() : String(rawLabel),
    raw: item,
  };
};

/* ─────────────────────────────────────────────
   Service Picker Modal  (UI unchanged)
─────────────────────────────────────────────*/

const ServicePicker = ({ visible, services, selected, onSelect, onClose }) => {
  const normalised = (services || []).map(normaliseService);

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
        <TouchableOpacity activeOpacity={1} style={pickerStyles.sheet} onPress={() => { }}>
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
   Ticket Card (expandable)  (UI unchanged)
─────────────────────────────────────────────*/

const STATUS_COLORS = {
  RESOLVED: { bg: "#D1FAE5", text: "#059669" },
  PENDING: { bg: "#FEF3C7", text: "#B45309" },
  OPEN: { bg: "#DBEAFE", text: "#1D4ED8" },
  CLOSED: { bg: "#F3F4F6", text: "#6B7280" },
};

const TicketCard = ({ ticket }) => {
  const [open, setOpen] = useState(false);
  const colors =
    STATUS_COLORS[ticket.status?.toUpperCase()] || { bg: "#F3F4F6", text: "#6B7280" };

  const ticketId = ticket.ticketId || ticket._id || "N/A";
  const serviceName = ticket.serviceName || ticket.serviceId?.name || "N/A";
  const details = ticket.supportDetails || ticket.message || "No details provided";
  const adminReply = ticket.adminRemark || "No reply yet";
  const transactionId = ticket.transactionId || ticket.txnid || "";
  const createdAt = ticket.createdAt
    ? new Date(ticket.createdAt).toLocaleDateString()
    : "N/A";

  return (
    <TouchableOpacity
      style={styles.historyCard}
      activeOpacity={0.85}
      onPress={() => setOpen((v) => !v)}
    >
      <View style={styles.historyTop}>
        <Text style={styles.ticketId}>#{ticketId.slice(-8).toUpperCase()}</Text>
        <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
          <Text style={[styles.statusText, { color: colors.text }]}>{ticket.status}</Text>
        </View>
      </View>

      <Text style={styles.rowText}>
        <Text style={styles.rowLabel}>Service: </Text>
        {serviceName.toUpperCase()}
      </Text>
      <Text style={styles.rowText}>
        <Text style={styles.rowLabel}>Subject / Details: </Text>
        {details}
      </Text>
      {transactionId ? (
        <Text style={styles.rowText}>
          <Text style={styles.rowLabel}>Txn ID: </Text>
          {transactionId}
        </Text>
      ) : null}

      {open && (
        <View style={styles.expandedWrap}>
          <View style={styles.divider} />
          <Text style={styles.rowText}>
            <Text style={styles.rowLabel}>Details: </Text>
            {details}
          </Text>
          <Text style={styles.rowText}>
            <Text style={styles.rowLabel}>Admin Reply: </Text>
            {adminReply}
          </Text>
          <Text style={styles.rowText}>
            <Text style={styles.rowLabel}>Date: </Text>
            {createdAt}
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
  const [transactionId, setTransactionId] = useState("");
  const [supportDetails, setSupportDetails] = useState("");

  // Populated from fetchUserProfile → data.assignedServices
  const [assignedServices, setAssignedServices] = useState([]);
  const [tickets, setTickets] = useState([]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    loadData();
  }, []);

  /* ── Load profile + tickets ──────────────── */
  const loadData = async (pageNum = 1) => {
    setLoading(true);
    setPage(pageNum);
    try {
      const headerToken = await getToken();

      const [ticketsResult, profileResult] = await Promise.allSettled([
        headerToken
          ? getMySupportRequests({ headerToken, page: pageNum, limit: 5 })
          : Promise.resolve(null),
        headerToken
          ? fetchUserProfile({ headerToken })
          : Promise.resolve(null),
      ]);

      /* Tickets */
      if (
        ticketsResult.status === "fulfilled" &&
        ticketsResult.value?.success
      ) {
        setTickets(
          Array.isArray(ticketsResult.value.data) ? ticketsResult.value.data : []
        );
        // Set total pages from API pagination metadata
        setTotalPages(ticketsResult.value.pagination?.totalPages || 1);
      }

      /*
       * Profile → assignedServices
       *
       * API: {{base_url}}/fetch-user-profile
       * Response shape:
       * {
       *   success: true,
       *   data: {
       *     assignedServices: [
       *       { _id: "6993147e71936d89b7185e36", name: "bbps"     },
       *       { _id: "699314b271936d89b7185e48", name: "recharge" }
       *     ],
       *     ...
       *   }
       * }
       *
       * Each item is normalised to { key: _id, label: "BBPS", raw: originalItem }
       * and fed into the ServicePicker modal list.
       */
      if (
        profileResult.status === "fulfilled" &&
        profileResult.value?.success &&
        profileResult.value?.data?.assignedServices
      ) {
        const services = Array.isArray(profileResult.value.data.assignedServices)
          ? profileResult.value.data.assignedServices
          : [];
        setAssignedServices(services);
      }
    } catch (err) {
      console.log("[Support] Error loading data:", err);
    } finally {
      setLoading(false);
    }
  };

  /* ── Submit ───────────────────────────────── */
  const handleSubmit = async () => {
    if (!selectedService)
      return Alert.alert("Validation", "Please select a service type.");

    // Validate support details as required field
    if (!supportDetails.trim())
      return Alert.alert("Validation", "Error: Missing required field - support details.");

    setSubmitting(true);
    try {
      const headerToken = await getToken();

      const result = await createSupportRequest({
        serviceId: selectedService.key, // sends the _id of the selected assignedService
        supportDetails: supportDetails.trim(),
        transactionId: transactionId.trim(),
        headerToken,
      });

      if (result.success) {
        Alert.alert("Success ✓", result.message || "Ticket raised successfully.");
        setSelectedService(null);
        setTransactionId("");
        setSupportDetails("");
        loadData(1); // Refresh back to page 1
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

          <Text style={styles.fieldLabel}>TRANSACTION ID (OPTIONAL)</Text>
          <TextInput
            style={[styles.inputBox, styles.inputText]}
            value={transactionId}
            onChangeText={setTransactionId}
            placeholder="e.g. TXN123456789"
            placeholderTextColor="#9CA3AF"
            autoCapitalize="characters"
            autoCorrect={false}
          />

          <Text style={styles.fieldLabel}>SUPPORT DETAILS *</Text>
          <TextInput
            style={[
              styles.inputBox,
              styles.inputText,
              { height: 110, textAlignVertical: "top", alignItems: "flex-start" },
            ]}
            multiline
            value={supportDetails}
            onChangeText={setSupportDetails}
            placeholder="E.g. AEPS service not working..."
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

        {/* Support History Directly on Screen */}
        <View style={historyStyles.header}>
          <Text style={historyStyles.title}>My Support Tickets</Text>
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
          tickets.map((item, index) => (
            <TicketCard key={item._id || String(index)} ticket={item} />
          ))
        )}

        {/* Pagination Card */}
        {tickets.length > 0 && totalPages > 1 && (
          <View style={paginationStyles.card}>
            <TouchableOpacity
              style={[
                paginationStyles.btn,
                (page <= 1 || loading) && paginationStyles.btnDisabled,
              ]}
              onPress={() => loadData(page - 1)}
              disabled={page <= 1 || loading}
              activeOpacity={0.7}
            >
              <Text style={paginationStyles.btnText}>◀ PREV</Text>
            </TouchableOpacity>

            <View style={paginationStyles.infoContainer}>
              <Text style={paginationStyles.infoText}>
                {page} / {totalPages}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                paginationStyles.btn,
                (page >= totalPages || loading) && paginationStyles.btnDisabled,
              ]}
              onPress={() => loadData(page + 1)}
              disabled={page >= totalPages || loading}
              activeOpacity={0.7}
            >
              <Text style={paginationStyles.btnText}>NEXT ▶</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Service Picker — list comes from assignedServices via fetchUserProfile */}
      <ServicePicker
        visible={pickerOpen}
        services={assignedServices}
        selected={selectedService}
        onSelect={setSelectedService}
        onClose={() => setPickerOpen(false)}
      />

    </SafeAreaView>
  );
};

export default FaqSupportScreen;

/* ─────────────────────────────────────────────
   STYLES  (identical to original)
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
  supportPillTxt: { color: "#fff", fontFamily: Fonts.Bold, fontSize: 11, letterSpacing: 1 },
  headingBlack: { fontSize: 34, fontFamily: Fonts.Bold, color: "#111827", lineHeight: 40 },
  headingRed: { fontSize: 34, fontFamily: Fonts.Bold, color: "#D71920", lineHeight: 40 },
  subheading: { fontSize: 13, fontFamily: Fonts.Medium, color: "#6B7280", marginTop: 6, marginBottom: 4 },

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
  cardTitle: { fontSize: 16, fontFamily: Fonts.Bold, color: "#111827", marginBottom: 4 },

  fieldLabel: {
    fontSize: 11,
    fontFamily: Fonts.Bold,
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
  inputText: { flex: 1, color: "#111827", fontSize: 14, fontFamily: Fonts.Medium },
  placeholderText: { flex: 1, color: "#9CA3AF", fontSize: 14, fontFamily: Fonts.Medium },
  dropArrow: { color: "#9CA3AF", fontSize: 16, fontFamily: Fonts.Medium },

  submitButton: {
    backgroundColor: "#D71920",
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 22,
  },
  submitButtonDisabled: { opacity: 0.65 },
  submitText: { color: "#fff", fontFamily: Fonts.Bold, fontSize: 14, letterSpacing: 1 },

  refreshBtn: { fontSize: 14, color: "#D71920", fontFamily: Fonts.Bold },

  emptyWrap: { alignItems: "center", marginTop: 30 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: "#9CA3AF", fontSize: 14, fontFamily: Fonts.Medium },

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
  ticketId: { fontFamily: Fonts.Bold, fontSize: 14, color: "#111827" },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: Fonts.Bold, letterSpacing: 0.5 },
  rowLabel: { fontFamily: Fonts.Bold, color: "#374151" },
  rowText: { fontSize: 13, color: "#6B7280", marginTop: 3, fontFamily: Fonts.Medium },
  expandedWrap: { marginTop: 8 },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginVertical: 10 },
  caret: { fontSize: 11, color: "#D71920", fontFamily: Fonts.SemiBold, marginTop: 10, textAlign: "right" },

  actionRow: { paddingHorizontal: 20, marginTop: 10 },
  historyBtn: {
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#D71920",
  },
  historyBtnTxt: { color: "#D71920", fontFamily: Fonts.Bold, fontSize: 13, letterSpacing: 1 },
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
  title: { fontSize: 17, fontFamily: Fonts.Bold, color: "#111827", marginBottom: 14 },
  emptyText: { color: "#9CA3AF", fontSize: 14, textAlign: "center", marginVertical: 30, fontFamily: Fonts.Medium },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  rowText: { fontSize: 15, color: "#374151", fontFamily: Fonts.Medium },
  activeRow: { backgroundColor: "#FEF2F2", borderRadius: 12, paddingHorizontal: 10 },
  activeText: { color: "#D71920", fontFamily: Fonts.Bold },
  checkmark: { color: "#D71920", fontFamily: Fonts.Bold, fontSize: 16 },
  closeBtn: {
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: "#F3F4F6",
    borderRadius: 14,
    alignItems: "center",
  },
  closeTxt: { color: "#374151", fontFamily: Fonts.Bold, fontSize: 14 },
});

const historyStyles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 12,
  },
  title: { fontSize: 18, fontFamily: Fonts.Bold, color: "#111827" },
});

const paginationStyles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 5,
    marginBottom: 20,
    padding: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  btn: {
    backgroundColor: "#D71920",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 80,
    alignItems: "center",
  },
  btnDisabled: {
    backgroundColor: "#E5E7EB",
    opacity: 0.8,
  },
  btnText: {
    color: "#fff",
    fontSize: 12,
    fontFamily: Fonts.Bold,
    letterSpacing: 0.5,
  },
  infoContainer: {
    paddingHorizontal: 12,
  },
  infoText: {
    fontSize: 14,
    fontFamily: Fonts.Bold,
    color: "#374151",
  },
});

