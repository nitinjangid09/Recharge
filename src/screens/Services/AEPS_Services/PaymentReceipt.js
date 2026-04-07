import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import Colors from "../../../constants/Colors";
import Fonts from "../../../constants/Fonts";

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
            dropdownIconColor={Colors.primary}
          >
            <Picker.Item label="Download PDF" value="pdf" color={Colors.gray_21} />
            <Picker.Item label="Download Image" value="image" color={Colors.gray_21} />
          </Picker>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  header: {
    alignItems: "center",
    paddingVertical: 20,
  },

  title: {
    fontFamily: Fonts.Medium,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.gray_21,
  },

  successBanner: {
    alignItems: "center",
    marginBottom: 10,
  },

  successText: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    fontWeight: "700",
    color: "#2ECC71",
  },

  successSub: {
    fontFamily: Fonts.Regular,
    color: Colors.gray_75,
    marginTop: 4,
    fontSize: 13,
  },

  amountCard: {
    backgroundColor: Colors.primary,
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
    fontFamily: Fonts.Medium,
    color: Colors.gray_BD,
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
    fontFamily: Fonts.Medium,
    color: Colors.white,
    fontSize: 11,
    fontWeight: "600",
  },

  amount: {
    fontFamily: Fonts.Bold,
    color: Colors.white,
    fontSize: 36,
    fontWeight: "bold",
    marginTop: 10,
  },

  txn: {
    fontFamily: Fonts.Regular,
    color: Colors.gray_BD,
    marginTop: 8,
    fontSize: 12,
  },

  receiptCard: {
    backgroundColor: Colors.white,
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
    fontFamily: Fonts.Medium,
    fontSize: 16,
    fontWeight: "600",
    color: Colors.gray_21,
  },

  txnId: {
    fontFamily: Fonts.Medium,
    color: Colors.primary,
    fontWeight: "600",
  },

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderColor: Colors.gray_E0,
  },

  rowLabel: {
    fontFamily: Fonts.Regular,
    color: Colors.gray_66,
    fontSize: 14,
  },

  rowValue: {
    fontFamily: Fonts.Medium,
    fontWeight: "500",
    color: Colors.gray_21,
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
    backgroundColor: Colors.primary,
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
  },

  shareText: {
    fontFamily: Fonts.Medium,
    fontWeight: "600",
    color: Colors.white,
  },

  doneText: {
    fontFamily: Fonts.Medium,
    color: Colors.white,
    fontWeight: "600",
  },

  download: {
    fontFamily: Fonts.Regular,
    textAlign: "center",
    marginTop: 20,
    color: Colors.gray_75,
  },

  pickerContainer: {
    marginHorizontal: 40,
    marginTop: 5,
    marginBottom: 30,
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.gray_E0,
    overflow: 'hidden',
  },

  picker: {
    height: 50,
    width: "100%",
  },

});