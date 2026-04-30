import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  Platform,
  Modal,
  FlatList,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../../../constants/Colors';
import Fonts from '../../../constants/Fonts';
import HeaderBar from '../../../componets/HeaderBar/HeaderBar';
import FullScreenLoader from '../../../componets/Loader/FullScreenLoader';
import { addXpressPayoutBank, getPayoutBankList } from '../../../api/AuthApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlertService } from '../../../componets/Alerts/CustomAlert';

const { width: SW } = Dimensions.get("window");
const scale = (n) => (SW / 375) * n;
const rs = (n) => Math.round(scale(n));

export default function AddXpressPayoutBank({ navigation }) {
  const [loading, setLoading] = useState(false);
  const [banksLoading, setBanksLoading] = useState(false);
  const [bankList, setBankList] = useState([]);
  const [filteredBanks, setFilteredBanks] = useState([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [form, setForm] = useState({
    bankId: '',
    bankName: '',
    accountHolderName: '',
    accountNumber: '',
    ifscCode: '',
  });
  const [errors, setErrors] = useState({});

  React.useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    setBanksLoading(true);
    try {
      const headerToken = await AsyncStorage.getItem('header_token');
      const res = await getPayoutBankList({ headerToken });
      if (res) {
        const banks = Array.isArray(res) ? res : (res.data || []);
        setBankList(banks);
        setFilteredBanks(banks);
      }
    } catch (error) {
      console.log('Error fetching bank list:', error);
    } finally {
      setBanksLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (!text) {
      setFilteredBanks(bankList);
      return;
    }
    const filtered = bankList.filter(item =>
      item.bankName.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredBanks(filtered);
  };

  const selectBank = (bank) => {
    setForm({ ...form, bankName: bank.bankName, bankId: bank._id });
    setIsModalVisible(false);
    setSearchQuery('');
    setFilteredBanks(bankList);
  };


  const handleSubmit = async () => {
    const { bankId, accountHolderName, accountNumber, ifscCode } = form;
    let newErrors = {};

    if (!bankId) newErrors.bankId = 'Please select a Bank';
    if (!accountHolderName) {
      newErrors.accountHolderName = 'Please enter Account Holder Name';
    } else if (!/^[a-zA-Z\s]+$/.test(accountHolderName)) {
      newErrors.accountHolderName = 'Only alphabets and spaces allowed';
    } else if (accountHolderName.length > 100) {
      newErrors.accountHolderName = 'Name cannot exceed 100 characters';
    }
    if (!accountNumber) {
      newErrors.accountNumber = 'Please enter Account Number';
    } else if (!/^\d+$/.test(accountNumber)) {
      newErrors.accountNumber = 'Only digits are allowed';
    } else if (accountNumber.length < 9 || accountNumber.length > 20) {
      newErrors.accountNumber = 'Account number must be between 9-20 digits';
    }
    if (!ifscCode) {
      newErrors.ifscCode = 'Please enter IFSC Code';
    } else if (!/^[A-Z0-9]+$/.test(ifscCode)) {
      newErrors.ifscCode = 'Only alphabets and digits allowed';
    } else if (ifscCode.length > 15) {
      newErrors.ifscCode = 'IFSC Code cannot exceed 15 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});


    setLoading(true);
    try {
      const headerToken = await AsyncStorage.getItem('header_token');

      const bodyData = {
        bankId,
        accountHolderName,
        accountNumber,
        ifscCode
      };

      const res = await addXpressPayoutBank({ data: bodyData, headerToken });
      if (res?.success) {
        AlertService.showAlert({
          type: 'success',
          title: 'Success',
          message: res.message || 'Xpress Payout bank added successfully',
          onClose: () => navigation.goBack()
        });
      } else {
        AlertService.showAlert({ type: 'error', title: 'Failed', message: res.message || 'Submission failed' });
      }
    } catch (error) {
      console.log('Submit Error:', error);
      AlertService.showAlert({ type: 'error', title: 'Error', message: 'Network error. Try again' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <HeaderBar
        title="Add Xpress Bank"
        onBack={() => navigation.goBack()}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Xpress Bank Registration</Text>
          <Text style={styles.formSub}>Add a new account for instant Xpress Payout settlements.</Text>

          <TouchableOpacity
            style={[styles.inputWrapper, errors.bankId && styles.inputWrapperError]}
            onPress={() => {
              setSearchQuery('');
              setFilteredBanks(bankList);
              setIsModalVisible(true);
              setErrors({ ...errors, bankId: null });
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.inputLabel}>Bank Name</Text>
            <View style={[styles.inputBox, errors.bankId && { borderColor: Colors.error }]}>
              <Icon name="bank" size={rs(18)} color={errors.bankId ? Colors.error : Colors.text_secondary} />
              <Text
                style={[
                  styles.field,
                  { color: form.bankName ? Colors.text_primary : Colors.gray_BD }
                ]}
                numberOfLines={1}
              >
                {form.bankName || "Select Bank"}
              </Text>
              <Icon name={isModalVisible ? "chevron-up" : "chevron-down"} size={rs(20)} color={Colors.text_secondary} />
            </View>
            {!!errors.bankId && <Text style={styles.errorText}>{errors.bankId}</Text>}
          </TouchableOpacity>

          <FormInput
            label="Account Holder Name"
            icon="account"
            placeholder="As per bank records"
            value={form.accountHolderName}
            onChangeText={(t) => {
              const filtered = t.replace(/[^a-zA-Z\s]/g, '');
              setForm({ ...form, accountHolderName: filtered });
              setErrors({ ...errors, accountHolderName: null });
            }}
            maxLength={100}
            error={errors.accountHolderName}
          />

          <FormInput
            label="Account Number"
            icon="numeric"
            placeholder="00000000000"
            value={form.accountNumber}
            onChangeText={(t) => {
              const filtered = t.replace(/\D/g, '');
              setForm({ ...form, accountNumber: filtered });
              setErrors({ ...errors, accountNumber: null });
            }}
            keyboardType="numeric"
            maxLength={20}
            error={errors.accountNumber}
          />

          <FormInput
            label="IFSC Code"
            icon="barcode-scan"
            placeholder="SBIN0001234"
            value={form.ifscCode}
            onChangeText={(t) => {
              const filtered = t.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
              setForm({ ...form, ifscCode: filtered });
              setErrors({ ...errors, ifscCode: null });
            }}
            maxLength={15}
            error={errors.ifscCode}
          />


          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Submit Xpress Bank</Text>
                <Icon name="check-circle" size={rs(18)} color={Colors.white} />
              </>
            )}
          </TouchableOpacity>
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
              <Text style={styles.modalTitle}>Choose Bank</Text>
              <TouchableOpacity onPress={() => setIsModalVisible(false)}>
                <Icon name="close-circle" size={rs(24)} color={Colors.text_secondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchBar}>
              <Icon name="magnify" size={rs(20)} color={Colors.text_secondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search bank name..."
                placeholderTextColor={Colors.gray_BD}
                value={searchQuery}
                onChangeText={handleSearch}
              />
            </View>

            {banksLoading ? (
              <ActivityIndicator color={Colors.primary} size="large" style={{ marginTop: 50 }} />
            ) : (
              <FlatList
                data={filteredBanks}
                keyExtractor={(item) => item._id}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.bankItem} onPress={() => selectBank(item)}>
                    <View style={styles.bankIconWrap}>
                      <Icon name="bank-outline" size={rs(18)} color={Colors.primary} />
                    </View>
                    <Text style={styles.bankItemName}>{item.bankName}</Text>
                    <Icon name="chevron-right" size={rs(18)} color={Colors.border} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <Icon name="bank-off-outline" size={rs(48)} color={Colors.border} />
                    <Text style={styles.emptyTxt}>No banks found</Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>

      <FullScreenLoader visible={loading} label="Adding Xpress Bank..." />

    </SafeAreaView>
  );
}

function FormInput({ label, icon, placeholder, value, onChangeText, error, ...props }) {
  return (
    <View style={styles.inputWrapper}>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={[styles.inputBox, error && { borderColor: Colors.error }]}>
        <Icon name={icon} size={rs(18)} color={error ? Colors.error : Colors.text_secondary} />
        <TextInput
          style={styles.field}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={Colors.gray_BD}
          {...props}
        />
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scrollContent: { paddingHorizontal: rs(16), paddingTop: rs(16) },
  formCard: { backgroundColor: Colors.homebg, borderRadius: rs(28), padding: rs(28), borderWidth: 1, borderColor: Colors.border },
  formTitle: { fontSize: rs(20), fontFamily: Fonts.Bold, color: Colors.text_primary },
  formSub: { fontSize: rs(13), fontFamily: Fonts.Medium, color: Colors.text_secondary, marginTop: rs(4), marginBottom: rs(28) },
  inputWrapper: { marginBottom: rs(20) },
  inputLabel: { fontSize: rs(12), fontFamily: Fonts.Bold, color: Colors.text_primary, marginBottom: rs(6), marginLeft: rs(4) },
  imageHint: { fontSize: rs(10), fontFamily: Fonts.Medium, color: Colors.gray_BD, marginTop: rs(-4), marginBottom: rs(10), marginLeft: rs(4) },
  errorText: { color: Colors.error, fontSize: rs(10), fontFamily: Fonts.Medium, marginTop: rs(4), marginLeft: rs(4) },
  inputBox: { height: rs(58), backgroundColor: Colors.white, borderRadius: rs(18), borderWidth: 1, borderColor: Colors.border, flexDirection: 'row', alignItems: 'center', paddingHorizontal: rs(16), gap: rs(12) },
  field: { flex: 1, fontSize: rs(14), fontFamily: Fonts.Medium, color: Colors.text_primary, padding: 0 },
  uploadArea: { height: rs(80), backgroundColor: Colors.white, borderRadius: rs(18), borderWidth: 1.5, borderColor: Colors.border, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', gap: rs(5) },
  uploadTxt: { fontSize: rs(12), fontFamily: Fonts.Medium, color: Colors.text_secondary },
  imagePreviewContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: rs(18), padding: rs(12), borderWidth: 1, borderColor: Colors.border, gap: rs(15) },
  previewImg: { width: rs(60), height: rs(60), borderRadius: rs(12), backgroundColor: '#F8F9FA' },
  imageActions: { flex: 1, gap: rs(8) },
  imageActionBtn: { flexDirection: 'row', alignItems: 'center', gap: rs(6), paddingVertical: rs(4), paddingHorizontal: rs(8), borderRadius: rs(8), borderWidth: 1, borderColor: Colors.border, alignSelf: 'flex-start' },
  imageActionTxt: { fontSize: rs(11), fontFamily: Fonts.Bold, color: Colors.primary },
  submitBtn: { backgroundColor: Colors.primary, height: rs(60), borderRadius: rs(20), flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(10), marginTop: rs(12) },
  submitBtnText: { fontSize: rs(16), fontFamily: Fonts.Bold, color: Colors.white },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: Colors.white, borderTopLeftRadius: rs(30), borderTopRightRadius: rs(30), height: '80%', padding: rs(20) },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(20), paddingHorizontal: rs(5) },
  modalTitle: { fontSize: rs(20), fontFamily: Fonts.Bold, color: Colors.text_primary },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: rs(15), paddingHorizontal: rs(15), height: rs(50), borderWidth: 1, borderColor: Colors.border, marginBottom: rs(20), gap: rs(10) },
  searchInput: { flex: 1, fontSize: rs(14), fontFamily: Fonts.Medium, color: Colors.text_primary, padding: 0 },
  bankItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: rs(16), borderBottomWidth: 1, borderBottomColor: Colors.border, gap: rs(15) },
  bankIconWrap: { width: rs(40), height: rs(40), backgroundColor: Colors.primaryOpacity_10, borderRadius: rs(10), alignItems: 'center', justifyContent: 'center' },
  bankItemName: { flex: 1, fontSize: rs(14), fontFamily: Fonts.Medium, color: Colors.text_primary },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', marginTop: rs(50), gap: rs(10) },
  emptyTxt: { fontSize: rs(14), fontFamily: Fonts.Medium, color: Colors.text_secondary },
});
