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
import { initiateXpressPayoutTransfer } from '../../../api/AuthApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Geolocation from '@react-native-community/geolocation';
import { AlertService } from '../../../componets/Alerts/CustomAlert';
import { Modal, FlatList, ActivityIndicator } from 'react-native';

const { width: SW } = Dimensions.get("window");
const scale = (n) => (SW / 375) * n;
const rs = (n) => Math.round(scale(n));

export default function Xpress_PayOut_Transfer({ navigation, route }) {
  const { banks = [] } = route.params || {};
  const [amount, setAmount] = useState('');
  const [mode, setMode] = useState('IMPS'); 
  const [selectedBank, setSelectedBank] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [purpose, setPurpose] = useState('');
  const [errors, setErrors] = useState({});

  const approved = banks.filter(b => b.status === 'APPROVED' || b.status === 'Active' || b.status === 'approved');

  const handleTransfer = async () => {
    let newErrors = {};
    if (!selectedBank) {
      newErrors.bank = 'Please select a beneficiary account';
    }
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      newErrors.amount = 'Please enter a valid amount';
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

          const res = await initiateXpressPayoutTransfer({ data: payload, headerToken });

          if (res?.success) {
            AlertService.showAlert({
              type: 'success',
              title: 'Transfer Successful',
              message: res.message || 'Xpress payout initiated successfully',
              onClose: () => navigation.goBack()
            });
          } else {
            AlertService.showAlert({ type: 'error', title: 'Transfer Failed', message: res.message || 'Unable to process transfer' });
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
        title="Xpress Transfer"
        onBack={() => navigation.goBack()}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Instant Settlement</Text>
          <Text style={styles.formSub}>Funds will be credited within seconds via Xpress Payout.</Text>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Select Beneficiary Account</Text>
            <TouchableOpacity
              style={[styles.selector, errors.bank && { borderColor: Colors.error }]}
              onPress={() => {
                setIsModalVisible(true);
                setErrors(prev => ({ ...prev, bank: null }));
              }}
            >
              <Icon name="bank" size={rs(18)} color={errors.bank ? Colors.error : Colors.text_secondary} />
              <Text style={[styles.selectorText, selectedBank && { color: Colors.text_primary }, errors.bank && { color: Colors.error }]}>
                {selectedBank ? `${selectedBank.bankName} (${selectedBank.accountNumber.slice(-4)})` : "Choose destination bank"}
              </Text>
              <Icon name="chevron-down" size={rs(20)} color={errors.bank ? Colors.error : Colors.text_secondary} />
            </TouchableOpacity>
            {!!errors.bank && <Text style={styles.errorText}>{errors.bank}</Text>}
            {approved.length === 0 && (
              <Text style={{ fontSize: rs(10), color: Colors.error, marginTop: rs(4), marginLeft: rs(4) }}>
                No approved payout banks available.
              </Text>
            )}
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Payout Amount</Text>
            <View style={[styles.amountInput, errors.amount && { borderColor: Colors.error }]}>
              <Text style={[styles.currencySymbol, errors.amount && { color: Colors.error }]}>₹</Text>
              <TextInput
                style={[styles.field, errors.amount && { color: Colors.error }]}
                placeholder="0.00"
                keyboardType="numeric"
                value={amount}
                onChangeText={(val) => {
                  setAmount(val);
                  setErrors(prev => ({ ...prev, amount: null }));
                }}
                placeholderTextColor={Colors.gray_BD}
              />
            </View>
            {!!errors.amount && <Text style={styles.errorText}>{errors.amount}</Text>}
          </View>

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Remarks / Purpose</Text>
            <View style={styles.remarkBox}>
              <TextInput
                style={styles.remarkField}
                placeholder="e.g. Xpress Payout"
                value={purpose}
                onChangeText={setPurpose}
                placeholderTextColor={Colors.gray_BD}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.transferBtn, loading && { opacity: 0.8 }]}
            onPress={handleTransfer}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Text style={styles.transferBtnText}>Transfer Now</Text>
                <Icon name="arrow-right" size={rs(18)} color={Colors.white} />
              </>
            )}
          </TouchableOpacity>

          <View style={styles.securityNote}>
            <Icon name="lock-outline" size={rs(14)} color={Colors.text_secondary} />
            <Text style={styles.securityText}>Secured by 256-bit SSL encryption</Text>
          </View>
        </View>
        <View style={{ height: rs(40) }} />
      </ScrollView>

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
                  <Icon name="chevron-right" size={rs(18)} color={Colors.border} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.emptyWrap}>
                  <Icon name="bank-off-outline" size={rs(48)} color={Colors.border} />
                  <Text style={styles.emptyTxt}>No approved banks found</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { paddingHorizontal: rs(16), paddingTop: rs(16) },
  formCard: {
    backgroundColor: Colors.homebg,
    borderRadius: rs(28),
    padding: rs(28),
    borderWidth: 1,
    borderColor: Colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10 },
      android: { elevation: 3 },
    }),
  },
  formTitle: { fontSize: rs(20), fontFamily: Fonts.Bold, color: Colors.text_primary },
  formSub: { fontSize: rs(13), fontFamily: Fonts.Medium, color: Colors.text_secondary, marginTop: rs(4), marginBottom: rs(28) },
  inputWrapper: { marginBottom: rs(20) },
  inputLabel: { fontSize: rs(12), fontFamily: Fonts.Bold, color: Colors.text_primary, marginBottom: rs(10), marginLeft: rs(4) },
  selector: { height: rs(58), backgroundColor: Colors.white, borderRadius: rs(18), borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(16), gap: rs(12) },
  selectorText: { flex: 1, fontSize: rs(14), fontFamily: Fonts.Medium, color: Colors.text_secondary },
  amountInput: { height: rs(64), backgroundColor: Colors.white, borderRadius: rs(18), flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(20), borderWidth: 1, borderColor: Colors.amberOpacity_30 },
  currencySymbol: { fontSize: rs(24), fontFamily: Fonts.Bold, color: Colors.text_primary, marginRight: rs(8) },
  field: { flex: 1, fontSize: rs(24), fontFamily: Fonts.Bold, color: Colors.text_primary, padding: 0 },
  transferBtn: {
    backgroundColor: Colors.primary,
    height: rs(60),
    borderRadius: rs(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(10),
    marginTop: rs(12),
    ...Platform.select({
      ios: { shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.3, shadowRadius: 10 },
      android: { elevation: 6 },
    }),
  },
  transferBtnText: { fontSize: rs(16), fontFamily: Fonts.Bold, color: Colors.white },
  securityNote: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(6), marginTop: rs(20) },
  securityText: { fontSize: rs(11), fontFamily: Fonts.Medium, color: Colors.text_secondary },
  errorText: { color: Colors.error, fontSize: rs(10), fontFamily: Fonts.Medium, marginTop: rs(4), marginLeft: rs(4) },
  remarkBox: { height: rs(54), backgroundColor: Colors.white, borderRadius: rs(15), borderWidth: 1, borderColor: Colors.border, paddingHorizontal: rs(15), justifyContent: 'center' },
  remarkField: { fontSize: rs(14), fontFamily: Fonts.Medium, color: Colors.text_primary, padding: 0 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: rs(30), borderTopRightRadius: rs(30), height: '60%', padding: rs(20) },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(20) },
  modalTitle: { fontSize: rs(20), fontFamily: Fonts.Bold, color: Colors.text_primary },
  bankItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: rs(16), borderBottomWidth: 1, borderBottomColor: Colors.border, gap: rs(15) },
  bankIconWrap: { width: rs(40), height: rs(40), backgroundColor: Colors.primaryOpacity_10, borderRadius: rs(10), alignItems: 'center', justifyContent: 'center' },
  bankItemName: { fontSize: rs(14), fontFamily: Fonts.Bold, color: Colors.text_primary },
  bankItemSub: { fontSize: rs(12), fontFamily: Fonts.Medium, color: Colors.text_secondary, marginTop: rs(2) },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: rs(50), gap: rs(10) },
  emptyTxt: { fontSize: rs(14), fontFamily: Fonts.Medium, color: Colors.text_secondary },
});
