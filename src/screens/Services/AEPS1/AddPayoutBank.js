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
import { addAepsPayoutBank, getPayoutBankList } from '../../../api/AuthApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AlertService } from '../../../componets/Alerts/CustomAlert';
import ImageUploadAlert from '../../../componets/Alerts/Imageuploadalert';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';

const { width: SW } = Dimensions.get("window");
const scale = (n) => (SW / 375) * n;
const rs = (n) => Math.round(scale(n));

export default function AddPayoutBank({ navigation }) {
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
  const [passbookImage, setPassbookImage] = useState(null);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [errors, setErrors] = useState({});

  React.useEffect(() => {
    fetchBanks();
  }, []);

  const fetchBanks = async () => {
    setBanksLoading(true);
    try {
      const headerToken = await AsyncStorage.getItem('header_token');
      const res = await getPayoutBankList({ headerToken });
      if (res?.success) {
        setBankList(res.data || []);
        setFilteredBanks(res.data || []);
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

  const handleCamera = () => {
    launchCamera({ mediaType: 'photo', quality: 0.5 }, (res) => {
      if (res.assets && res.assets[0]) {
        const file = res.assets[0];
        if (file.fileSize > 200 * 1024) {
          AlertService.showAlert({ type: 'error', title: 'File Too Large', message: 'Image size must be below 200 KB' });
          return;
        }
        setPassbookImage(file);
      }
    });
  };

  const handleGallery = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.5 }, (res) => {
      if (res.assets && res.assets[0]) {
        const file = res.assets[0];
        if (file.fileSize > 200 * 1024) {
          AlertService.showAlert({ type: 'error', title: 'File Too Large', message: 'Image size must be below 200 KB' });
          return;
        }
        setPassbookImage(file);
      }
    });
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
    if (!passbookImage) newErrors.passbookImage = 'Please upload cheque or passbook image';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    setErrors({});

    if (passbookImage.fileSize > 200 * 1024) {
      AlertService.showAlert({ type: 'error', title: 'File Too Large', message: 'Uploaded image exceeds 200 KB' });
      return;
    }

    setLoading(true);
    try {
      const headerToken = await AsyncStorage.getItem('header_token');

      const formData = new FormData();
      formData.append('bankId', bankId);
      formData.append('accountHolderName', accountHolderName);
      formData.append('accountNumber', accountNumber);
      formData.append('ifscCode', ifscCode);

      formData.append('cheque', {
        uri: passbookImage.uri,
        type: passbookImage.type || 'image/jpeg',
        name: passbookImage.fileName || `cheque_${Date.now()}.jpg`,
      });

      const res = await addAepsPayoutBank({ data: formData, headerToken });
      if (res?.success) {
        AlertService.showAlert({
          type: 'success',
          title: 'Success',
          message: res.message || 'Bank request submitted successfully',
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
        title="Add Payout Bank"
        onBack={() => navigation.goBack()}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.formCard}>
          <Text style={styles.formTitle}>Register Bank</Text>
          <Text style={styles.formSub}>Add a new account for instant settlements.</Text>

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

          <View style={styles.inputWrapper}>
            <Text style={styles.inputLabel}>Bank Proof (Passbook / Cheque)</Text>
            <Text style={styles.imageHint}>JPG, JPEG, PNG (Max 200KB)</Text>
            {passbookImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: passbookImage.uri }} style={styles.previewImg} />
                <View style={styles.imageActions}>
                  <TouchableOpacity
                    style={styles.imageActionBtn}
                    onPress={() => setIsImageModalVisible(true)}
                  >
                    <Icon name="pencil" size={rs(16)} color={Colors.primary} />
                    <Text style={styles.imageActionTxt}>Change</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.imageActionBtn, { borderColor: Colors.error }]}
                    onPress={() => setPassbookImage(null)}
                  >
                    <Icon name="trash-can-outline" size={rs(16)} color={Colors.error} />
                    <Text style={[styles.imageActionTxt, { color: Colors.error }]}>Remove</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.uploadArea, errors.passbookImage && { borderColor: Colors.error }]}
                onPress={() => {
                  setIsImageModalVisible(true);
                  setErrors({ ...errors, passbookImage: null });
                }}
              >
                <Icon name="cloud-upload-outline" size={rs(32)} color={errors.passbookImage ? Colors.error : Colors.primary} />
                <Text style={[styles.uploadTxt, errors.passbookImage && { color: Colors.error }]}>
                  {errors.passbookImage || "Click to upload image"}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Text style={styles.submitBtnText}>Submit Request</Text>
                <Icon name="check-circle" size={rs(18)} color={Colors.white} />
              </>
            )}
          </TouchableOpacity>
        </View>
        <View style={{ height: rs(40) }} />
      </ScrollView>

      {/* ── Bank Selection Modal ── */}
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

      <ImageUploadAlert
        visible={isImageModalVisible}
        onClose={() => setIsImageModalVisible(false)}
        onCamera={handleCamera}
        onGallery={handleGallery}
      />
      <FullScreenLoader visible={loading} label="Submitting Request..." />
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
  safe: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  scrollContent: {
    paddingHorizontal: rs(16),
    paddingTop: rs(16),
  },
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
  formTitle: {
    fontSize: rs(20),
    fontFamily: Fonts.Bold,
    color: Colors.text_primary,
  },
  formSub: {
    fontSize: rs(13),
    fontFamily: Fonts.Medium,
    color: Colors.text_secondary,
    marginTop: rs(4),
    marginBottom: rs(28),
  },
  inputWrapper: {
    marginBottom: rs(20),
  },
  inputLabel: {
    fontSize: rs(12),
    fontFamily: Fonts.Bold,
    color: Colors.text_primary,
    marginBottom: rs(6),
    marginLeft: rs(4),
  },
  imageHint: {
    fontSize: rs(10),
    fontFamily: Fonts.Medium,
    color: Colors.gray_BD,
    marginTop: rs(-4),
    marginBottom: rs(10),
    marginLeft: rs(4),
  },
  uploadArea: {
    height: rs(70),
    backgroundColor: Colors.white,
    borderRadius: rs(20),
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(8),
  },
  uploadAreaActive: {
    borderColor: Colors.primary,
    borderStyle: 'solid',
    overflow: 'hidden',
  },
  uploadTxt: {
    fontSize: rs(13),
    fontFamily: Fonts.Medium,
    color: Colors.text_secondary,
  },
  previewImg: {
    width: '100%',
    height: rs(120),
    borderRadius: rs(14),
    resizeMode: 'cover',
  },
  imagePreviewContainer: {
    backgroundColor: Colors.white,
    borderRadius: rs(20),
    borderWidth: 1,
    borderColor: Colors.border,
    padding: rs(10),
  },
  imageActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: rs(12),
    marginTop: rs(10),
  },
  imageActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(12),
    paddingVertical: rs(6),
    borderRadius: rs(8),
    borderWidth: 1,
    borderColor: Colors.primary,
    gap: rs(6),
  },
  imageActionTxt: {
    fontSize: rs(12),
    fontFamily: Fonts.Bold,
    color: Colors.primary,
  },
  errorText: {
    color: Colors.error,
    fontSize: rs(10),
    fontFamily: Fonts.Medium,
    marginTop: rs(4),
    marginLeft: rs(4),
  },
  inputBox: {
    height: rs(58),
    backgroundColor: Colors.white,
    borderRadius: rs(18),
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(16),
    gap: rs(12),
  },
  field: {
    flex: 1,
    fontSize: rs(14),
    fontFamily: Fonts.Medium,
    color: Colors.text_primary,
    padding: 0,
  },
  submitBtn: {
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
  submitBtnText: {
    fontSize: rs(16),
    fontFamily: Fonts.Bold,
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: rs(30),
    borderTopRightRadius: rs(30),
    height: '80%',
    padding: rs(20),
    elevation: 0,
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: rs(20),
    paddingHorizontal: rs(5),
  },
  modalTitle: {
    fontSize: rs(20),
    fontFamily: Fonts.Bold,
    color: Colors.text_primary,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: rs(15),
    paddingHorizontal: rs(15),
    height: rs(50),
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: rs(20),
    gap: rs(10),
  },
  searchInput: {
    flex: 1,
    fontSize: rs(14),
    fontFamily: Fonts.Medium,
    color: Colors.text_primary,
    padding: 0,
  },
  bankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: rs(16),
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: rs(15),
  },
  bankIconWrap: {
    width: rs(40),
    height: rs(40),
    backgroundColor: Colors.primaryOpacity_10,
    borderRadius: rs(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bankItemName: {
    flex: 1,
    fontSize: rs(14),
    fontFamily: Fonts.Medium,
    color: Colors.text_primary,
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
