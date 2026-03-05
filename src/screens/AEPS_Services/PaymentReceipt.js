import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../utils/Color";

const { width } = Dimensions.get("window");

const ReceiptScreen = () => {
  return (
    <SafeAreaView style={styles.safeArea}>
      {/* SCREEN HEADER */}
      <View style={styles.screenHeader}>
        <Text style={styles.screenTitle}>Receipt</Text>
      </View>

      {/* CONTENT */}
      <View style={styles.container}>
        <View style={styles.card}>
          {/* CARD HEADER */}
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Payment Receipt</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>SUCCESS</Text>
            </View>
          </View>

          {/* AMOUNT */}
          <View style={styles.amountBox}>
            <Text style={styles.amountLabel}>Amount Paid</Text>
            <Text style={styles.amountValue}>₹ 500.00</Text>
          </View>

          {/* DETAILS */}
          <DetailRow label="Aadhaar No" value="XXXX XXXX 1234" />
          <DetailRow label="Transaction ID" value="TXN123456789" />
          <DetailRow label="Bank" value="State Bank of India" />
          <DetailRow label="Bank Ref No" value="BRN987654" />
          <DetailRow label="Mobile" value="9876543210" />

          {/* ACTION BUTTONS */}
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.outlineButton}>
              <Text style={styles.outlineText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.primaryButton}>
              <Text style={styles.primaryText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default ReceiptScreen;

/* ---------- REUSABLE DETAIL ROW ---------- */

const DetailRow = ({ label, value }) => (
  <View style={styles.detailRow}>
    <Text style={styles.label}>{label}</Text>
    <Text style={styles.value}>{value}</Text>
  </View>
);

/* ---------------- STYLES ---------------- */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary,
  },

  screenHeader: {
    paddingVertical: 16,
    alignItems: "center",
    backgroundColor: Colors.primary,
  },

  screenTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.white,
  },

  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    width: width * 0.92,
    backgroundColor: Colors.white,
    borderRadius: 18,
    padding: 20,
    elevation: 6,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.text,
  },

  statusBadge: {
    backgroundColor: Colors.success + "20",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },

  statusText: {
    color: "green",
    fontSize: 22,
    fontWeight: "900",
  },

  amountBox: {
    backgroundColor: Colors.primary + "10",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
  },

  amountLabel: {
    fontSize: 13,
    color: Colors.subText,
    marginBottom: 4,
  },

  amountValue: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.primary,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.lightGray,
  },

  label: {
    fontSize: 14,
    color: Colors.subText,
  },

  value: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },

  buttonRow: {
    flexDirection: "row",
    marginTop: 24,
  },

  outlineButton: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginRight: 10,
  },

  outlineText: {
    color: Colors.primary,
    fontWeight: "700",
  },

  primaryButton: {
    flex: 1,
    backgroundColor: Colors.accent,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginLeft: 10,
  },

  primaryText: {
    color: Colors.white,
    fontWeight: "700",
  },
});
