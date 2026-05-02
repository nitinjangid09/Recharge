import React, { useState, useEffect, useRef } from "react";
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
  Animated,
  PanResponder,
  Dimensions,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Fonts from "../../constants/Fonts";
import Colors from "../../constants/Colors";
import {
  fetchUserProfile,
  createSupportRequest,
  getMySupportRequests,
  getFAQs,
  getTicketStats,
} from "../../api/AuthApi";
import CustomAlert from "../../componets/Alerts/CustomAlert";

/* ─────────────────────────────────────────────
   Helpers
 ─────────────────────────────────────────────*/

const { width: SW, height: SH } = Dimensions.get("window");

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
    item.serviceId || item._id || item.id || item.name || item.type || item.cat_key || String(index);
  const rawLabel =
    item.name || item.label || item.serviceName || item.type || `Service ${index + 1}`;

  return {
    key,
    label: typeof rawLabel === "string" ? rawLabel.toUpperCase() : String(rawLabel),
    raw: item,
  };
};

/* ─────────────────────────────────────────────
   Service Picker Modal
 ─────────────────────────────────────────────*/

const ServicePicker = ({ visible, services, selected, onSelect, onClose }) => {
  const normalised = (services || []).map(normaliseService);
  const slideA = useRef(new Animated.Value(SH)).current;
  const backdropA = useRef(new Animated.Value(0)).current;

  // ── Swipe to close logic ──────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dy }) => dy > 10,
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) slideA.setValue(dy);
      },
      onPanResponderRelease: (_, { dy }) => {
        if (dy > 120) {
          onClose();
        } else {
          Animated.spring(slideA, { toValue: 0, bounciness: 5, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideA, { toValue: 0, friction: 8, tension: 70, useNativeDriver: true }),
        Animated.timing(backdropA, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideA, { toValue: SH, duration: 250, useNativeDriver: true }),
        Animated.timing(backdropA, { toValue: 0, duration: 200, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent onRequestClose={onClose} animationType="none">
      <View style={pickerStyles.overlay}>
        <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.blackOpacity_50, opacity: backdropA }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
        </Animated.View>

        <Animated.View
          {...panResponder.panHandlers}
          style={[pickerStyles.sheet, { transform: [{ translateY: slideA }] }]}
        >
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
        </Animated.View>
      </View>
    </Modal>
  );
};

/* ─────────────────────────────────────────────
   Ticket Card (expandable)
 ─────────────────────────────────────────────*/

const STATUS_COLORS = {
  RESOLVED: { bg: Colors.success_light, text: Colors.success_dark },
  PENDING: { bg: Colors.warning_light, text: Colors.warning_dark },
  OPEN: { bg: Colors.info_light, text: Colors.info_dark },
  CLOSED: { bg: Colors.hex_F3F4F6, text: Colors.hex_6B7280 },
};

const TicketCard = ({ ticket }) => {
  const [open, setOpen] = useState(false);
  const colors =
    STATUS_COLORS[ticket.status?.toUpperCase()] || { bg: Colors.hex_F3F4F6, text: Colors.hex_6B7280 };

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


const FAQItem = ({ item }) => {
  const [open, setOpen] = useState(false);
  return (
    <TouchableOpacity
      style={faqStyles.item}
      activeOpacity={0.8}
      onPress={() => setOpen(!open)}
    >
      <View style={faqStyles.header}>
        <Text style={faqStyles.question}>{item.question}</Text>
        <Icon name={open ? "minus" : "plus"} size={18} color={Colors.red} />
      </View>
      {open && (
        <View style={faqStyles.answer}>
          <Text style={faqStyles.answerTxt}>{item.answer}</Text>
        </View>
      )}
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
  const [ticketStats, setTicketStats] = useState({ pending: 0, resolved: 0, closed: 0, total: 0 });
  const [faqs, setFaqs] = useState([]);

  const [faqLoading, setFaqLoading] = useState(false);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Pagination states
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [alert, setAlert] = useState({ visible: false, type: "info", title: "", message: "" });

  useEffect(() => {
    loadData();
  }, []);

  /* ── Load profile + tickets ──────────────── */
  const loadData = async (pageNum = 1) => {
    setLoading(true);
    setPage(pageNum);
    try {
      const headerToken = await getToken();

      const [ticketsResult, profileResult, faqResult, statsResult] = await Promise.allSettled([
        headerToken
          ? getMySupportRequests({ headerToken, page: pageNum, limit: 5 })
          : Promise.resolve(null),
        headerToken
          ? fetchUserProfile({ headerToken })
          : Promise.resolve(null),
        headerToken
          ? getFAQs({ headerToken })
          : Promise.resolve(null),
        headerToken
          ? getTicketStats({ headerToken })
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

      /* FAQs */
      if (
        faqResult.status === "fulfilled" &&
        faqResult.value?.success
      ) {
        setFaqs(Array.isArray(faqResult.value.data) ? faqResult.value.data : []);
      }

      /* Stats */
      if (
        statsResult.status === "fulfilled" &&
        statsResult.value?.success
      ) {
        setTicketStats(statsResult.value.data || { pending: 0, resolved: 0, closed: 0, total: 0 });
      }

      /* Profile → assignedServices */
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
  const showAlert = (type, title, message) => {
    setAlert({ visible: true, type, title, message });
  };

  /* ── Submit ───────────────────────────────── */
  const handleAepsSupport = async () => {
    setSubmitting(true);
    try {
      const headerToken = await getToken();
      const result = await createSupportRequest({
        serviceId: "699313906af23c118e1fd8fa",
        supportDetails: "Aeps Not Working",
        transactionId: "",
        headerToken,
      });

      if (result.success) {
        showAlert("success", "Support Raised", "AEPS support request submitted successfully.");
        loadData(1);
      } else {
        showAlert("error", "Error", result.message || "Failed to raise support.");
      }
    } catch (err) {
      showAlert("error", "Error", "Unexpected error.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedService)
      return showAlert("warning", "Validation", "Please select a service type.");

    // Validate support details as required field
    if (!supportDetails.trim())
      return showAlert("warning", "Validation", "Error: Missing required field - support details.");

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
        showAlert("success", "Success ✓", result.message || "Ticket raised successfully.");
        setSelectedService(null);
        setTransactionId("");
        setSupportDetails("");
        loadData(1); // Refresh back to page 1
      } else {
        showAlert("error", "Error", result.message || "Something went wrong.");
      }
    } catch (err) {
      showAlert("error", "Error", "Unexpected error submitting ticket.");
    } finally {
      setSubmitting(false);
    }
  };

  /* ── Render ───────────────────────────────── */
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />


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

        {/* FAQ Section */}
        {faqs.length > 0 && (
          <View style={faqStyles.container}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={faqStyles.title}>Frequent Questions</Text>
              <TouchableOpacity 
                style={styles.quickBtn} 
                onPress={handleAepsSupport}
                disabled={submitting}
              >
                <Text style={styles.quickBtnTxt}>Report AEPS Issue</Text>
              </TouchableOpacity>
            </View>
            {faqs.map((faq, idx) => (
              <FAQItem key={faq._id || idx} item={faq} />
            ))}
          </View>
        )}


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
            placeholderTextColor={Colors.text_placeholder}
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
            placeholderTextColor={Colors.text_placeholder}
          />

          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
            activeOpacity={0.8}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.submitText}>SUBMIT TICKET</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Ticket Stats Grid */}
        <View style={statsGridStyles.container}>
          <View style={statsGridStyles.row}>
            <View style={[statsGridStyles.card, { borderLeftColor: Colors.warning_dark }]}>
              <Text style={statsGridStyles.val}>{ticketStats.pending}</Text>
              <Text style={statsGridStyles.lbl}>PENDING</Text>
            </View>
            <View style={[statsGridStyles.card, { borderLeftColor: Colors.success_dark }]}>
              <Text style={statsGridStyles.val}>{ticketStats.resolved}</Text>
              <Text style={statsGridStyles.lbl}>RESOLVED</Text>
            </View>
          </View>
          <View style={statsGridStyles.row}>
            <View style={[statsGridStyles.card, { borderLeftColor: Colors.hex_6B7280 }]}>
              <Text style={statsGridStyles.val}>{ticketStats.closed}</Text>
              <Text style={statsGridStyles.lbl}>CLOSED</Text>
            </View>
            <View style={[statsGridStyles.card, { borderLeftColor: Colors.primary }]}>
              <Text style={statsGridStyles.val}>{ticketStats.total}</Text>
              <Text style={statsGridStyles.lbl}>TOTAL</Text>
            </View>
          </View>
        </View>

        {/* Support History Directly on Screen */}
        <View style={historyStyles.header}>
          <Text style={historyStyles.title}>My Support Tickets</Text>
          <TouchableOpacity onPress={() => loadData()} disabled={loading}>
            <Text style={styles.refreshBtn}>{loading ? "…" : "↻ Refresh"}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={Colors.red} style={{ marginTop: 30 }} />
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

      <CustomAlert
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert({ ...alert, visible: false })}
      />

    </SafeAreaView>
  );
};

export default FaqSupportScreen;

/* ─────────────────────────────────────────────
   STYLES
 ─────────────────────────────────────────────*/

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F3EBDD' },

  headerWrap: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 4 },
  supportPill: {
    backgroundColor: Colors.red,
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  supportPillTxt: { color: Colors.white, fontFamily: Fonts.Bold, fontSize: 11, letterSpacing: 1 },
  headingBlack: { fontSize: 34, fontFamily: Fonts.Bold, color: Colors.hex_111827, lineHeight: 40 },
  headingRed: { fontSize: 34, fontFamily: Fonts.Bold, color: Colors.red, lineHeight: 40 },
  subheading: { fontSize: 13, fontFamily: Fonts.Medium, color: Colors.hex_6B7280, marginTop: 6, marginBottom: 4 },

  card: {
    backgroundColor: Colors.white,
    margin: 20,
    padding: 20,
    borderRadius: 22,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  cardTitle: { fontSize: 16, fontFamily: Fonts.Bold, color: Colors.hex_111827, marginBottom: 4 },

  fieldLabel: {
    fontSize: 11,
    fontFamily: Fonts.Bold,
    color: Colors.hex_6B7280,
    letterSpacing: 0.8,
    marginTop: 16,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.hex_E5E7EB,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 10,
    backgroundColor: Colors.hex_FAFAFA,
    justifyContent: "space-between",
  },
  inputBoxFocused: { borderColor: Colors.red },
  inputText: { flex: 1, color: Colors.hex_111827, fontSize: 14, fontFamily: Fonts.Medium },
  placeholderText: { flex: 1, color: Colors.text_placeholder, fontSize: 14, fontFamily: Fonts.Medium },
  dropArrow: { color: Colors.text_placeholder, fontSize: 16, fontFamily: Fonts.Medium },

  submitButton: {
    backgroundColor: Colors.red,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 22,
  },
  submitButtonDisabled: { opacity: 0.65 },
  submitText: { color: Colors.white, fontFamily: Fonts.Bold, fontSize: 14, letterSpacing: 1 },

  refreshBtn: { color: Colors.primary, fontFamily: Fonts.Bold, fontSize: 13 },
  quickBtn: {
    backgroundColor: Colors.red,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  quickBtnTxt: {
    color: Colors.white,
    fontFamily: Fonts.Bold,
    fontSize: 10,
  },
  emptyWrap: { alignItems: 'center', marginTop: 40, paddingBottom: 20 },
  emptyIcon: { fontSize: 40, marginBottom: 8 },
  emptyText: { color: Colors.text_placeholder, fontSize: 14, fontFamily: Fonts.Medium },

  historyCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 18,
    padding: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  historyTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  ticketId: { fontFamily: Fonts.Bold, fontSize: 14, color: Colors.hex_111827 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusText: { fontSize: 11, fontFamily: Fonts.Bold, letterSpacing: 0.5 },
  rowLabel: { fontFamily: Fonts.Bold, color: Colors.hex_374151 },
  rowText: { fontSize: 13, color: Colors.hex_6B7280, marginTop: 3, fontFamily: Fonts.Medium },
  expandedWrap: { marginTop: 8 },
  divider: { height: 1, backgroundColor: Colors.hex_F3F4F6, marginVertical: 10 },
  caret: { fontSize: 11, color: Colors.red, fontFamily: Fonts.SemiBold, marginTop: 10, textAlign: "right" },

  actionRow: { paddingHorizontal: 20, marginTop: 10 },
  historyBtn: {
    backgroundColor: Colors.white,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: Colors.red,
  },
  historyBtnTxt: { color: Colors.red, fontFamily: Fonts.Bold, fontSize: 13, letterSpacing: 1 },
});

const pickerStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.blackOpacity_50,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.white,
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
    backgroundColor: Colors.hex_D1D5DB,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  title: { fontSize: 17, fontFamily: Fonts.Bold, color: Colors.hex_111827, marginBottom: 14 },
  emptyText: { color: Colors.text_placeholder, fontSize: 14, textAlign: "center", marginVertical: 30, fontFamily: Fonts.Medium },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.hex_F3F4F6,
  },
  rowText: { fontSize: 15, color: Colors.hex_374151, fontFamily: Fonts.Medium },
  activeRow: { backgroundColor: Colors.hex_FEF2F2, borderRadius: 12, paddingHorizontal: 10 },
  checkmark: { color: Colors.red, fontFamily: Fonts.Bold, fontSize: 16 },
  closeBtn: {
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: Colors.hex_F3F4F6,
    borderRadius: 14,
    alignItems: "center",
  },
  closeTxt: { color: Colors.hex_374151, fontFamily: Fonts.Bold, fontSize: 14 },
});

const faqStyles = StyleSheet.create({
  container: { paddingHorizontal: 20, marginTop: 10, marginBottom: 10 },
  title: { fontSize: 18, fontFamily: Fonts.Bold, color: Colors.hex_111827, marginBottom: 14 },
  item: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: Colors.hex_F3F4F6,
    elevation: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  question: { fontSize: 14, fontFamily: Fonts.SemiBold, color: Colors.hex_111827, flex: 1, paddingRight: 10 },
  answer: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: Colors.hex_F3F4F6 },
  answerTxt: { fontSize: 13, color: Colors.hex_6B7280, fontFamily: Fonts.Medium, lineHeight: 20 },
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
  title: { fontSize: 18, fontFamily: Fonts.Bold, color: Colors.hex_111827 },
});

const paginationStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginTop: 5,
    marginBottom: 20,
    padding: 12,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  btn: {
    backgroundColor: Colors.red,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    minWidth: 80,
    alignItems: "center",
  },
  btnDisabled: {
    backgroundColor: Colors.hex_D1D5DB,
    opacity: 0.8,
  },
  btnText: {
    color: Colors.white,
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
    color: Colors.hex_374151,
  },
});

const statsGridStyles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    marginVertical: 10,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 10,
    borderLeftWidth: 3,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  val: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
    color: Colors.hex_111827,
  },
  lbl: {
    fontSize: 8,
    fontFamily: Fonts.Bold,
    color: Colors.hex_6B7280,
    letterSpacing: 0.8,
    marginTop: 1,
  },
});
