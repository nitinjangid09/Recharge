import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Share,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from "../../constants/Colors";
import Fonts from "../../constants/Fonts";
import HeaderBar from "../../componets/HeaderBar/HeaderBar";

const ReceiptRow = ({ label, value, icon }) => {
  return (
    <View style={styles.row}>
      <View style={styles.rowLabelContainer}>
        {icon && <Icon name={icon} size={16} color={Colors.text_secondary} style={{ marginRight: 8 }} />}
        <Text style={styles.rowLabel}>{label}</Text>
      </View>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
};

export default function AEPS_Payout_Receipt({ route, navigation }) {
  const { txn } = route.params;

  const handleDone = () => {
    navigation.goBack();
  };

  const handleShare = async () => {
    try {
      const message = `AEPS Payout Receipt\n\nReference ID: ${txn.referenceId}\nBeneficiary: ${txn.beneficiaryName}\nAmount: ₹${txn.amount}\nStatus: ${txn.status}\nDate: ${new Date(txn.createdAt).toLocaleString()}\nBank: ${txn.bankAccount}\nIFSC: ${txn.ifsc}`;
      await Share.share({ message });
    } catch (error) {
      console.log('Share Error:', error);
    }
  };

  const statusColor = txn.status === 'SUCCESS' ? '#2ECC71' : txn.status === 'PENDING' ? '#F1C40F' : '#E74C3C';

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar title="Payout Receipt" onBack={() => navigation.goBack()} />
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* Success Banner */}
        <View style={styles.statusSection}>
          <View style={[styles.iconCircle, { backgroundColor: statusColor + '15' }]}>
            <Icon 
              name={txn.status === 'SUCCESS' ? 'check-circle' : txn.status === 'PENDING' ? 'clock' : 'close-circle'} 
              size={60} 
              color={statusColor} 
            />
          </View>
          <Text style={[styles.statusText, { color: statusColor }]}>{txn.status}</Text>
          <Text style={styles.statusSub}>
            {new Date(txn.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} at {new Date(txn.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
          </Text>
        </View>

        {/* Amount Card */}
        <View style={styles.amountCard}>
          <Text style={styles.amountLabel}>AMOUNT PAID</Text>
          <Text style={styles.amount}>₹{Number(txn.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</Text>
          <View style={styles.divider} />
          <Text style={styles.refId}>REF: {txn.referenceId}</Text>
        </View>

        {/* Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>Beneficiary Details</Text>
          <ReceiptRow label="Name" value={txn.beneficiaryName} icon="account-outline" />
          <ReceiptRow label="Phone" value={txn.beneficiaryPhone} icon="phone-outline" />
          <ReceiptRow label="Bank Account" value={txn.bankAccount} icon="bank-outline" />
          <ReceiptRow label="IFSC Code" value={txn.ifsc} icon="badge-account-horizontal-outline" />
        </View>

        <View style={styles.detailsCard}>
          <Text style={styles.detailsTitle}>User Details</Text>
          <ReceiptRow label="Name" value={txn.user?.name} icon="account-tie-outline" />
          <ReceiptRow label="Email" value={txn.user?.email} icon="email-outline" />
        </View>

        {/* Action Buttons */}
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.actionBtn, styles.shareBtn]} onPress={handleShare}>
            <Icon name="share-variant" size={20} color={Colors.white} style={{ marginRight: 8 }} />
            <Text style={styles.btnText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtn, styles.doneBtn]} onPress={handleDone}>
            <Text style={styles.btnText}>Done</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 30 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  statusSection: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  statusText: {
    fontSize: 24,
    fontFamily: Fonts.Bold,
    letterSpacing: 1,
  },
  statusSub: {
    fontSize: 14,
    fontFamily: Fonts.Medium,
    color: Colors.text_secondary,
    marginTop: 4,
  },
  amountCard: {
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 12,
    fontFamily: Fonts.Bold,
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.5,
  },
  amount: {
    fontSize: 36,
    fontFamily: Fonts.Bold,
    color: Colors.white,
    marginTop: 8,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginVertical: 16,
  },
  refId: {
    fontSize: 12,
    fontFamily: Fonts.Medium,
    color: 'rgba(255,255,255,0.8)',
  },
  detailsCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 16,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
  },
  detailsTitle: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
    color: Colors.text_primary,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
    paddingLeft: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  rowLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: Fonts.Medium,
    color: Colors.text_secondary,
  },
  rowValue: {
    fontSize: 14,
    fontFamily: Fonts.Bold,
    color: Colors.text_primary,
  },
  buttonRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 30,
    gap: 12,
  },
  actionBtn: {
    flex: 1,
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareBtn: {
    backgroundColor: '#64748B',
  },
  doneBtn: {
    backgroundColor: Colors.primary,
  },
  btnText: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: Fonts.Bold,
  },
});
