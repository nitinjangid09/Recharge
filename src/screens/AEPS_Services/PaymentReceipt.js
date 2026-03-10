import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import Colors from "../../utils/Color";

const ReceiptRow = ({ label, value }) => {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
};

export default function PaymentReceiptScreen() {
  const [downloadFormat, setDownloadFormat] = React.useState("pdf");

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Receipt</Text>
        </View>

        {/* Success Banner */}
        <View style={styles.successBanner}>
          <Text style={styles.successText}>Payment Successful!</Text>
          <Text style={styles.successSub}>
            Transaction completed · Mar 06, 2026 · 3:49 PM
          </Text>
        </View>

        {/* Amount Card */}
        <View style={styles.amountCard}>
          <View style={styles.amountTop}>
            <Text style={styles.amountLabel}>AMOUNT PAID</Text>

            <View style={styles.successBadge}>
              <Text style={styles.successBadgeText}>SUCCESS</Text>
            </View>
          </View>

          <Text style={styles.amount}>₹500.00</Text>

          <Text style={styles.txn}>TXN · 06 Mar 2026 · 15:49:22 IST</Text>
        </View>

        {/* Receipt Card */}
        <View style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <Text style={styles.receiptTitle}>Payment Receipt</Text>
            <Text style={styles.txnId}>TXN123456789</Text>
          </View>

          <ReceiptRow label="Aadhaar No" value="XXXX XXXX 1234" />
          <ReceiptRow label="Transaction ID" value="TXN123456789" />
          <ReceiptRow label="Bank" value="State Bank of India" />
          <ReceiptRow label="Bank Ref No" value="BRN987654" />
          <ReceiptRow label="Mobile" value="9876543210" />
        </View>

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.shareBtn}>
            <Text style={styles.shareText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.doneBtn}>
            <Text style={styles.doneText}>Done</Text>
          </TouchableOpacity>
        </View>

        {/* Download */}
        <Text style={styles.download}>
          Want a copy?
        </Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={downloadFormat}
            onValueChange={(itemValue, itemIndex) =>
              setDownloadFormat(itemValue)
            }
            style={styles.picker}
            dropdownIconColor="#FF6A00"
          >
            <Picker.Item label="Download PDF" value="pdf" color="#222" />
            <Picker.Item label="Download Image" value="image" color="#222" />
          </Picker>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3EBDD",
  },

  header: {
    alignItems: "center",
    paddingVertical: 20,
  },

  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
  },

  successBanner: {
    alignItems: "center",
    marginBottom: 10,
  },

  successText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2ECC71",
  },

  successSub: {
    color: "#777",
    marginTop: 4,
    fontSize: 13,
  },

  amountCard: {
    backgroundColor: "#1E1E1E",
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 18,
    padding: 20,
  },

  amountTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  amountLabel: {
    color: "#aaa",
    fontSize: 12,
    letterSpacing: 1,
  },

  successBadge: {
    backgroundColor: "#2ECC71",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },

  successBadgeText: {
    color: Colors.white,
    fontSize: 11,
    fontWeight: "600",
  },

  amount: {
    color: "#fff",
    fontSize: 36,
    fontWeight: "bold",
    marginTop: 10,
  },

  txn: {
    color: "#aaa",
    marginTop: 8,
    fontSize: 12,
  },

  receiptCard: {
    backgroundColor: "#fff",
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 18,
    padding: 18,
  },

  receiptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },

  receiptTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },

  txnId: {
    color: "#FF6A00",
    fontWeight: "600",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderColor: "#eee",
  },

  rowLabel: {
    color: "#666",
    fontSize: 14,
  },

  rowValue: {
    fontWeight: "500",
    color: "#222",
  },

  buttonRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 25,
  },

  shareBtn: {
    flex: 1,
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    marginRight: 10,
  },

  doneBtn: {
    flex: 1,
    backgroundColor: "#FF6A00",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  shareText: {
    fontWeight: "600",
    color: Colors.white,
  },

  doneText: {
    color: "#fff",
    fontWeight: "600",
  },

  download: {
    textAlign: "center",
    marginTop: 20,
    color: "#777",
  },

  pickerContainer: {
    marginHorizontal: 40,
    marginTop: 5,
    marginBottom: 30,
    backgroundColor: '#fff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },

  picker: {
    height: 50,
    width: "100%",
  },

});