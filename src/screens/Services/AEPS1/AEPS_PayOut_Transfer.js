import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../../../constants/Colors';
import Fonts from '../../../constants/Fonts';
import HeaderBar from '../../../componets/HeaderBar/HeaderBar';
import { initiateAepsPayoutTransfer } from '../../../api/AuthApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import { AlertService } from '../../../componets/Alerts/CustomAlert';
import { Modal, FlatList, ActivityIndicator } from 'react-native';
import ReceiptModal from '../../../componets/ReceiptModal/ReceiptModal';

const { width: SW } = Dimensions.get("window");
const scale = (n) => (SW / 375) * n;
const rs = (n) => Math.round(scale(n));

export default function AEPS_Transfer({ navigation, route }) {
  const { banks = [] } = route.params || {};
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('IMPS'); // Can be IMPS, NEFT, RTGS
  const [selectedBank, setSelectedBank] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [errors, setErrors] = useState({});
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [receiptData, setReceiptData] = useState(null);

  const approved = banks.filter(b => b.status === 'APPROVED' || b.status === 'Active' || b.status === 'approved');

  const handleTransfer = async () => {
    let newErrors = {};
    if (!selectedBank) {
      newErrors.bank = 'Please select a beneficiary account';
    }
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    } else if (parseFloat(amount) > 1000000) {
      newErrors.amount = 'Amount cannot exceed ₹1,000,000';
    }

    if (!purpose || !purpose.trim()) {
      newErrors.purpose = 'Please enter remark / purpose';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    setLoading(true);
    try {
      Geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const headerToken = await AsyncStorage.getItem('header_token');

          const payload = {
            amount: amount,
            latitude: String(latitude),
            longitude: String(longitude),
            bankId: selectedBank._id,
            purpose: purpose
          };

          const res = await initiateAepsPayoutTransfer({ data: payload, headerToken });

          if (res?.success) {
            setReceiptData({
              status: res.message?.toLowerCase().includes("process") ? "pending" : "success",
              title: "Payout Transfer",
              amount: amount,
              date: new Date().toLocaleString("en-IN"),
              subTitle: res.message || "Transaction initiated",
              details: [
                { label: "Bank Name", value: selectedBank?.bankName || "N/A" },
                { label: "Account No", value: selectedBank?.accountNumber || "N/A" },
                { label: "Transaction ID", value: res.data?.transactionId || "N/A", small: true },
                { label: "Status", value: res.message || "Under Process", isStatusPill: true, color: res.message?.toLowerCase().includes("process") ? Colors.amber : Colors.green },
              ],
              txn_ref: res.data?.transactionId,
            });
            setReceiptVisible(true);
          } else {
            setReceiptData({
              status: "failed",
              title: "Payout Transfer Failed",
              amount: amount,
              date: new Date().toLocaleString("en-IN"),
              subTitle: res.message || "Unable to process transfer",
              details: [
                { label: "Bank Name", value: selectedBank?.bankName || "N/A" },
                { label: "Account No", value: selectedBank?.accountNumber || "N/A" },
                { label: "Error", value: res.message || "Transaction Failed", valueColor: Colors.red },
              ],
            });
            setReceiptVisible(true);
          }
          setLoading(false);
        },
        (error) => {
          console.log('Location Error:', error);
          AlertService.showAlert({ type: 'error', title: 'Location Error', message: 'Unable to get location for security verification' });
          setLoading(false);
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 10000 }
      );
    } catch (e) {
      console.log('Transfer Execution Error:', e);
      AlertService.showAlert({ type: 'error', title: 'Error', message: 'Something went wrong. Please try again.' });
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <HeaderBar
        title="Quick Transfer"
        onBack={() => navigation.goBack()}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.modernCard}>
          <View style={styles.cardHighlightHeader}>
            <Icon name="bank-transfer" size={16} color={Colors.finance_accent} />
            <Text style={styles.cardHighlightTitle}>INSTANT SETTLEMENT</Text>
          </View>

          <View style={styles.cardBody}>
            <Text style={styles.formSub}>Funds will be credited within seconds.</Text>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Select Beneficiary Account</Text>
              <TouchableOpacity
                style={[styles.selector, errors.bank && { borderColor: Colors.red }]}
                onPress={() => {
                  setIsModalVisible(true);
                  setErrors(prev => ({ ...prev, bank: null }));
                }}
              >
                <Icon name="bank" size={rs(18)} color={errors.bank ? Colors.red : Colors.finance_accent} />
                <Text style={[styles.selectorText, selectedBank && { color: Colors.black }, errors.bank && { color: Colors.red }]}>
                  {selectedBank ? `${selectedBank.bankName} (${selectedBank.accountNumber.slice(-4)})` : "Choose destination bank"}
                </Text>
                <Icon name="chevron-down" size={rs(20)} color={errors.bank ? Colors.red : Colors.text_secondary} />
              </TouchableOpacity>
              {!!errors.bank && <Text style={styles.errorText}>{errors.bank}</Text>}
              {approved.length === 0 && (
                <Text style={{ fontSize: rs(10), color: Colors.red, marginTop: rs(4), marginLeft: rs(4) }}>
                  No approved payout banks available.
                </Text>
              )}
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Payout Amount</Text>
              <View style={[styles.amountInput, errors.amount && { borderColor: Colors.red }]}>
                <Text style={[styles.currencySymbol, errors.amount && { color: Colors.red }]}>₹</Text>
                <TextInput
                  style={[styles.field, errors.amount && { color: Colors.red }]}
                  placeholder="0.00"
                  keyboardType="numeric"
                  value={amount}
                  onChangeText={(val) => {
                    let cleaned = val.replace(/[^0-9]/g, "");
                    if (cleaned.startsWith("0")) cleaned = cleaned.replace(/^0+/, "");
                    setAmount(cleaned);
                    setErrors(prev => ({ ...prev, amount: null }));
                  }}
                  placeholderTextColor={Colors.gray}
                />
              </View>
              {!!errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
            </View>

            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Remarks / Purpose</Text>
              <View style={[styles.remarkBox, errors.purpose && { borderColor: Colors.red }]}>
                <TextInput
                  style={[styles.remarkField, errors.purpose && { color: Colors.red }]}
                  placeholder="e.g. Self Transfer"
                  value={purpose}
                  onChangeText={(val) => {
                    setPurpose(val);
                    setErrors(prev => ({ ...prev, purpose: null }));
                  }}
                  placeholderTextColor={Colors.gray}
                />
              </View>
              {!!errors.purpose && <Text style={styles.errorText}>{errors.purpose}</Text>}
            </View>

            {(() => {
              const isReady = !!selectedBank && !!amount && Number(amount) > 0 && !!purpose.trim() && !loading;
              return (
                <TouchableOpacity
                  style={[styles.transferBtn, { backgroundColor: isReady ? Colors.primary : Colors.gold }]}
                  onPress={handleTransfer}
                  disabled={!isReady}
                >
                  {loading ? (
                    <ActivityIndicator color={Colors.white} />
                  ) : (
                    <>
                      <Text style={[styles.transferBtnText, { color: isReady ? Colors.white : Colors.slate_500 }]}>Transfer Now</Text>
                      <Icon name="arrow-right" size={rs(18)} color={isReady ? Colors.white : Colors.slate_500} />
                    </>
                  )}
                </TouchableOpacity>
              );
            })()}

            <View style={styles.securityNote}>
              <Icon name="lock-outline" size={rs(14)} color={Colors.text_secondary} />
              <Text style={styles.securityText}>Secured by 256-bit SSL encryption</Text>
            </View>
          </View>
        </View>
        <View style={{ height: rs(40) }} />
      </ScrollView>

      {/* ── Beneficiary Selection Modal ── */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payout Destination</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Icon name="close-circle" size={rs(24)} color={Colors.text_secondary} />
              </TouchableOpacity>
            </View>

            <FlatList
              data={approved}
              keyExtractor={(item) => item._id}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.bankItem}
                  onPress={() => {
                    setSelectedBank(item);
                    setIsModalVisible(false);
                  }}
                >
                  <View style={styles.bankIconWrap}>
                    <Icon name="bank" size={rs(18)} color={Colors.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bankItemName}>{item.bankName}</Text>
                    <Text style={styles.bankItemSub}>{item.accountHolderName} • {item.accountNumber}</Text>
                  </View>
                  <Icon name="chevron-right" size={rs(18)} color={Colors.input_border} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Icon name="bank-off-outline" size={rs(48)} color={Colors.input_border} />
                  <Text style={styles.emptyTxt}>No approved banks found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>

      <ReceiptModal
        visible={receiptVisible}
        onClose={() => {
          setReceiptVisible(false);
          navigation.goBack();
        }}
        data={receiptData}
        navigation={navigation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.beige,
  },
  scrollContent: {
    paddingHorizontal: rs(16),
    paddingTop: rs(16),
  },
  modernCard: {
    backgroundColor: Colors.cardbg,
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.30)",
  },
  cardHighlightHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgb(46, 46, 46)',
    gap: 8,
  },
  cardHighlightTitle: {
    fontSize: rs(10),
    fontFamily: Fonts.Bold,
    color: Colors.finance_accent,
    letterSpacing: 0.5,
  },
  cardBody: {
    padding: rs(20),
  },
  formSub: {
    fontSize: rs(12),
    fontFamily: Fonts.Medium,
    color: Colors.text_secondary,
    marginBottom: rs(20),
  },
  inputWrapper: {
    marginBottom: rs(20),
  },
  inputLabel: {
    fontSize: rs(12),
    fontFamily: Fonts.Bold,
    color: Colors.black,
    marginBottom: rs(10),
    marginLeft: rs(4),
  },
  selector: {
    height: rs(58),
    backgroundColor: Colors.white,
    borderRadius: rs(18),
    borderWidth: 1,
    borderColor: Colors.input_border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(16),
    gap: rs(12),
  },
  selectorText: {
    flex: 1,
    fontSize: rs(14),
    fontFamily: Fonts.Medium,
    color: Colors.text_secondary,
  },
  amountInput: {
    height: rs(64),
    backgroundColor: Colors.white,
    borderRadius: rs(18),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(20),
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.30)",
  },
  currencySymbol: {
    fontSize: rs(24),
    fontFamily: Fonts.Bold,
    color: Colors.black,
    marginRight: rs(8),
  },
  field: {
    flex: 1,
    fontSize: rs(24),
    fontFamily: Fonts.Bold,
    color: Colors.black,
    padding: 0,
  },
  modeRow: {
    flexDirection: 'row',
    gap: rs(10),
  },
  modeBtn: {
    flex: 1,
    height: rs(48),
    backgroundColor: Colors.white,
    borderRadius: rs(15),
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.input_border,
  },
  modeBtnActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  modeText: {
    fontSize: rs(13),
    fontFamily: Fonts.Bold,
    color: Colors.text_secondary,
  },
  modeTextActive: {
    color: Colors.white,
  },
  transferBtn: {
    height: rs(60),
    borderRadius: rs(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(10),
    marginTop: rs(12),
  },
  transferBtnText: {
    fontSize: rs(16),
    fontFamily: Fonts.Bold,
    color: Colors.white,
  },
  securityNote: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(6),
    marginTop: rs(20),
  },
  securityText: {
    fontSize: rs(11),
    fontFamily: Fonts.Medium,
    color: Colors.text_secondary,
  },
  errorText: {
    color: Colors.red,
    fontSize: rs(10),
    fontFamily: Fonts.Medium,
    marginTop: rs(4),
    marginLeft: rs(4),
  },
  remarkBox: {
    height: rs(54),
    backgroundColor: Colors.white,
    borderRadius: rs(15),
    borderWidth: 1,
    borderColor: Colors.input_border,
    paddingHorizontal: rs(15),
    justifyContent: 'center',
  },
  remarkField: {
    fontSize: rs(14),
    fontFamily: Fonts.Medium,
    color: Colors.black,
    padding: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: rs(30),
    borderTopRightRadius: rs(30),
    height: '60%',
    padding: rs(20),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rs(20),
  },
  modalTitle: {
    fontSize: rs(20),
    fontFamily: Fonts.Bold,
    color: Colors.black,
  },
  bankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rs(16),
    borderBottomWidth: 1,
    borderBottomColor: Colors.input_border,
    gap: rs(15),
  },
  bankIconWrap: {
    width: rs(40),
    height: rs(40),
    backgroundColor: "rgba(26,26,46,0.10)",
    borderRadius: rs(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankItemName: {
    fontSize: rs(14),
    fontFamily: Fonts.Bold,
    color: Colors.black,
  },
  bankItemSub: {
    fontSize: rs(12),
    fontFamily: Fonts.Medium,
    color: Colors.text_secondary,
    marginTop: rs(2),
  },
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: rs(50),
    gap: rs(10),
  },
  emptyTxt: {
    fontSize: rs(14),
    fontFamily: Fonts.Medium,
    color: Colors.text_secondary,
  },
});
