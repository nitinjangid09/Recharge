import React from "react";
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

export default function AEPS2Receipt({
  route,
  navigation,
  // Allow passing directly as props for Modal use
  response: propsResponse,
  details: propsDetails,
  type: propsType,
  onClose
}) {
  const [downloadFormat, setDownloadFormat] = React.useState("pdf");

  // Destructure from route or props
  const response = propsResponse || route?.params?.response;
  const details = propsDetails || route?.params?.details;
  const type = propsType || route?.params?.type || "Transaction";

  const handleDone = () => {
    if (onClose) {
      onClose();
    } else if (navigation) {
      navigation.navigate("FinanceHome");
    }
  };

  // Handle ultra-deep nesting: data -> response -> data
  const l1 = response?.data || response || {};
  const l2 = l1.response || response?.response || response || {};
  const l3 = l2.data || l1.data || response?.data || response || {};

  const nestedData = l3;
  const nestedRoot = l2;

  // Statement data
  const statements = nestedData.miniStatement || response?.miniStatement || [];

  // Balance checking: prioritize bankAccountBalance
  const rawBalance = (type === 'Balance Enquiry' || type === 'Mini Statement')
    ? (nestedData.bankAccountBalance || nestedData.closingBalance || nestedData.customerBalance || response?.balance)
    : (nestedData.transactionValue || details?.amount);


  const balance = (rawBalance !== undefined && rawBalance !== null && rawBalance !== "") ? rawBalance : "0.00";

  // Transaction IDs from user sample mapping:
  // Bank RRN should use externalRef
  const rrn = nestedData.externalRef || nestedRoot.externalRef || nestedData.referenceId || response?.externalRef || "N/A";
  const ackno = nestedRoot.orderid || response?.orderid || nestedRoot.ipayId || nestedData.referenceId || "N/A";

  // Bank and User details
  const bankName = nestedData.bankName || details?.bankName || "Aadhaar Bank";
  const mobile = details?.mobile || details?.mobileNumber || "N/A";
  const aadhaar = details?.aadhaar || details?.aadhaarNumber || "XXXX XXXX XXXX";
  const accountNo = nestedData.accountNumber || "N/A";
  const txnValue = nestedData.transactionValue || details?.amount || "0.00";
  const statusMsg = l1.message || l2.status || nestedData.message || response?.message || "Transaction Successful";

  // Date and Time from API timestamp "2026-04-16 18:28:52" or "24-04-26 15:53:36"
  const apiTimestamp = l2.timestamp || nestedData.date || response?.timestamp;

  let dateStr, timeStr;

  if (apiTimestamp && typeof apiTimestamp === 'string') {
    try {
      const [d, t] = apiTimestamp.split(' ');
      dateStr = d || "N/A";
      timeStr = t || "N/A";
    } catch (e) {
      const now = new Date();
      dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
      timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
  } else {
    const now = new Date();
    dateStr = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>AEPS 2.0 Receipt</Text>
        </View>

        {/* Success Banner */}
        <View style={styles.successBanner}>
          <Text style={styles.successText}>{statusMsg}</Text>
          <Text style={styles.successSub}>
            Completed on {dateStr} at {timeStr}
          </Text>
        </View>

        {/* Amount Card */}
        <View style={styles.amountCard}>
          <View style={styles.amountTop}>
            <Text style={styles.amountLabel}>
              {(type === 'Balance Enquiry' || type === 'Mini Statement') ? 'AVAILABLE BALANCE' : 'AMOUNT PAID'}
            </Text>

            <View style={styles.successBadge}>
              <Text style={styles.successBadgeText}>SUCCESS</Text>
            </View>
          </View>

          <Text style={styles.amount}>₹{Number(balance).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>

          <Text style={styles.txn}>REF · {ackno}</Text>
        </View>

        {/* Receipt Card */}
        <View style={styles.receiptCard}>
          <View style={styles.receiptHeader}>
            <Text style={styles.receiptTitle}>Details</Text>
            <Text style={styles.txnId}>{type.toUpperCase()}</Text>
          </View>

          <ReceiptRow label="Aadhaar No" value={aadhaar.toString().replace(/.(?=.{4})/g, 'X')} />
          {accountNo !== "N/A" && <ReceiptRow label="Account No" value={accountNo} />}
          <ReceiptRow label="Bank RRN" value={rrn} />
          <ReceiptRow label="Bank" value={bankName} />
          {type === 'Cash Withdrawal' && <ReceiptRow label="Withdrawn Amount" value={`₹${txnValue}`} />}
          <ReceiptRow label="Mobile" value={mobile} />
          <ReceiptRow label="Status" value={statusMsg} />
        </View>

        {/* Mini Statement List */}
        {type === 'Mini Statement' && statements.length > 0 && (
          <View style={styles.statementCard}>
            <Text style={styles.statementTitle}>Recent Transactions</Text>
            <View style={styles.statementHeader}>
              <Text style={[styles.shTxt, { flex: 1 }]}>Date</Text>
              <Text style={[styles.shTxt, { flex: 1, textAlign: 'center' }]}>Type</Text>
              <Text style={[styles.shTxt, { flex: 1, textAlign: 'right' }]}>Amount</Text>
            </View>
            {statements.map((item, idx) => (
              <View key={idx} style={styles.statementRow}>
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.stDate}>{item.date || 'N/A'}</Text>
                  <Text style={styles.stNarration} numberOfLines={1}>{item.narration || ''}</Text>
                </View>
                <Text style={[styles.stType, (item.txnType === 'CR' || item.txnType === 'C') ? styles.cr : styles.dr]}>
                  {item.txnType || 'N/A'}
                </Text>
                <Text style={styles.stAmount}>₹{item.amount || '0.00'}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.shareBtn}>
            <Text style={styles.shareText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.doneBtn}
            onPress={handleDone}
          >
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
            onValueChange={(itemValue) => setDownloadFormat(itemValue)}
            style={styles.picker}
            dropdownIconColor={Colors.primary}
          >
            <Picker.Item label="Download PDF" value="pdf" color={Colors.heroEnd} />
            <Picker.Item label="Download Image" value="image" color={Colors.heroEnd} />
          </Picker>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.beige,
  },

  header: {
    alignItems: "center",
    paddingVertical: 20,
  },

  title: {
    fontFamily: Fonts.Medium,
    fontSize: 18,
    fontWeight: "600",
    color: Colors.heroEnd,
  },

  successBanner: {
    alignItems: "center",
    marginBottom: 10,
  },

  successText: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    fontWeight: "700",
    color: "rgb(46, 204, 113)",
  },

  successSub: {
    fontFamily: Fonts.Regular,
    color: "rgb(117, 117, 117)",
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
    color: Colors.gray,
    fontSize: 12,
    letterSpacing: 1,
  },

  successBadge: {
    backgroundColor: "rgb(46, 204, 113)",
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
    color: Colors.gray,
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
    color: Colors.heroEnd,
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
    borderColor: Colors.kyc_border,
  },

  rowLabel: {
    fontFamily: Fonts.Regular,
    color: "rgb(102, 102, 102)",
    fontSize: 14,
  },

  rowValue: {
    fontFamily: Fonts.Medium,
    fontWeight: "500",
    color: Colors.heroEnd,
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
    color: "rgb(117, 117, 117)",
  },

  pickerContainer: {
    marginHorizontal: 40,
    marginTop: 5,
    marginBottom: 30,
    backgroundColor: Colors.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.kyc_border,
    overflow: 'hidden',
  },

  picker: {
    height: 50,
    width: "100%",
  },

  // Statement Styles
  statementCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginTop: 15,
    borderRadius: 18,
    padding: 18,
  },
  statementTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 15,
    color: Colors.primary,
    marginBottom: 15,
  },
  statementHeader: {
    flexDirection: 'row',
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgb(240, 240, 240)",
    marginBottom: 5,
  },
  shTxt: {
    fontFamily: Fonts.Bold,
    fontSize: 12,
    color: Colors.gray,
    textTransform: 'uppercase',
  },
  statementRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: Colors.bg_F8,
    alignItems: 'center',
  },
  stDate: {
    fontFamily: Fonts.Bold,
    fontSize: 12,
    color: "rgb(102, 102, 102)",
  },
  stNarration: {
    fontFamily: Fonts.Regular,
    fontSize: 10,
    color: Colors.gray,
    marginTop: 2,
  },
  stType: {
    fontFamily: Fonts.Bold,
    fontSize: 12,
    flex: 1,
    textAlign: 'center',
  },
  stAmount: {
    fontFamily: Fonts.Bold,
    fontSize: 13,
    color: Colors.heroEnd,
    flex: 1,
    textAlign: 'right',
  },
  cr: { color: 'rgb(46, 204, 113)' },
  dr: { color: 'rgb(231, 76, 60)' },
});
