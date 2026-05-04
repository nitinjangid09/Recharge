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
import LinearGradient from 'react-native-linear-gradient';
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
            <View style={[styles.inputBox, errors.bankId && { borderColor: Colors.red }]}>
              <Icon name="bank" size={rs(18)} color={errors.bankId ? Colors.red : Colors.text_secondary} />
              <Text
                style={[
                  styles.field,
                  { color: form.bankName ? Colors.black : Colors.gray }
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
            <TouchableOpacity
              style={[
                styles.docBox,
                passbookImage && { borderStyle: "solid", borderColor: Colors.kyc_success, backgroundColor: Colors.kyc_success + "08" },
                errors.passbookImage && { borderStyle: "solid", borderColor: Colors.red, backgroundColor: Colors.red + "06" },
              ]}
              onPress={() => {
                setErrors({ ...errors, passbookImage: null });
                setIsImageModalVisible(true);
              }}
              activeOpacity={0.75}
            >
              {passbookImage ? (
                <View style={{ width: '100%', height: '100%' }}>
                  <Image source={{ uri: passbookImage.uri }} style={styles.docThumb} resizeMode="cover" />
                  <LinearGradient colors={["transparent", "rgba(0,0,0,0.72)"]} style={styles.docOverlay} start={{ x: 0, y: 0.5 }} end={{ x: 0, y: 1 }}>
                    <Icon name="check-circle" size={rs(13)} color={Colors.white} />
                    <Text style={styles.docDoneLabel}>UPLOADED</Text>
                    <Text style={styles.docFileName} numberOfLines={1}>Passbook_Proof.jpg</Text>
                  </LinearGradient>
                  <TouchableOpacity
                    style={styles.cornerDelete}
                    onPress={() => setPassbookImage(null)}
                  >
                    <Icon name="close" size={rs(12)} color={Colors.white} />
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.docEmptyContent}>
                  <View style={[styles.docIconCircle, { backgroundColor: (Colors.finance_accent || Colors.gold) + "1C" }]}>
                    <Icon name="bank-transfer" size={rs(22)} color={Colors.finance_accent || Colors.gold} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.docSlotLabel}>Bank Proof</Text>
                    <Text style={styles.docSlotSub}>Passbook or Cancelled Cheque</Text>
                    <Text style={styles.docSizeLabel}>JPG/PNG · Max 200KB</Text>
                  </View>
                  <View style={styles.docUploadTag}>
                    <Icon name="camera-plus-outline" size={rs(11)} color={Colors.finance_accent || Colors.gold} />
                    <Text style={styles.docUploadTagText}>Upload</Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
            {!!errors.passbookImage && <Text style={styles.errorText}>{errors.passbookImage}</Text>}
          </View>

          {(() => {
            const isReady = !!form.bankId && !!form.accountHolderName && !!form.accountNumber && !!form.ifscCode && !!passbookImage && !loading;
            return (
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: isReady ? Colors.primary : Colors.gold }]}
                onPress={handleSubmit}
                disabled={!isReady}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <>
                    <Text style={[styles.submitBtnText, { color: isReady ? Colors.white : Colors.slate_500 }]}>Submit Request</Text>
                    <Icon name="check-circle" size={rs(18)} color={isReady ? Colors.white : Colors.slate_500} />
                  </>
                )}
              </TouchableOpacity>
            );
          })()}
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
                placeholderTextColor={Colors.gray}
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
                    <Icon name="chevron-right" size={rs(18)} color={Colors.input_border} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyWrap}>
                    <Icon name="bank-off-outline" size={rs(48)} color={Colors.input_border} />
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
      <View style={[styles.inputBox, error && { borderColor: Colors.red }]}>
        <Icon name={icon} size={rs(18)} color={error ? Colors.red : Colors.text_secondary} />
        <TextInput
          style={styles.field}
          placeholder={placeholder}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor={Colors.gray}
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
    backgroundColor: Colors.beige,
  },
  scrollContent: {
    paddingHorizontal: rs(16),
    paddingTop: rs(16),
  },
  formCard: {
    backgroundColor: Colors.beige,
    borderRadius: rs(28),
    padding: rs(28),
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.30)",
  },
  formTitle: {
    fontSize: rs(20),
    fontFamily: Fonts.Bold,
    color: Colors.black,
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
    color: Colors.black,
    marginBottom: rs(6),
    marginLeft: rs(4),
  },
  imageHint: {
    fontSize: rs(10),
    fontFamily: Fonts.Medium,
    color: Colors.gray,
    marginTop: rs(-4),
    marginBottom: rs(10),
    marginLeft: rs(4),
  },
  // ── Document Slot Styles (Sync with KYC) ──
  docBox: {
    height: rs(90),
    borderRadius: rs(14),
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "rgba(0,0,0,0.12)",
    backgroundColor: "#FAFAFA",
  },
  docThumb: { width: "100%", height: "100%", borderRadius: rs(12) },
  docOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rs(10),
    paddingVertical: rs(6),
    gap: rs(6),
    borderBottomLeftRadius: rs(12),
    borderBottomRightRadius: rs(12),
  },
  docDoneLabel: { color: Colors.finance_accent || Colors.gold, fontFamily: Fonts.Bold, fontSize: rs(9), letterSpacing: 0.4 },
  docFileName: { flex: 1, color: "rgba(255,255,255,0.8)", fontFamily: Fonts.Regular, fontSize: rs(8) },
  docEmptyContent: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: rs(14), gap: rs(12) },
  docIconCircle: { width: rs(42), height: rs(42), borderRadius: rs(12), alignItems: "center", justifyContent: "center" },
  docSlotLabel: { color: Colors.black, fontFamily: Fonts.Bold, fontSize: rs(13) },
  docSlotSub: { color: "rgb(153, 153, 153)", marginTop: rs(1), fontFamily: Fonts.Regular, fontSize: rs(10) },
  docSizeLabel: { color: "rgb(196, 196, 196)", marginTop: rs(2), fontFamily: Fonts.Regular, fontSize: rs(9) },
  docUploadTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rs(8),
    paddingVertical: rs(4),
    borderRadius: rs(10),
    borderWidth: 1,
    backgroundColor: (Colors.finance_accent || Colors.gold) + "12",
    borderColor: (Colors.finance_accent || Colors.gold) + "40",
    gap: rs(4),
  },
  docUploadTagText: { color: Colors.finance_accent || Colors.gold, fontFamily: Fonts.Bold, fontSize: rs(9) },

  cornerDelete: {
    position: 'absolute',
    top: -rs(8),
    right: -rs(8),
    width: rs(24),
    height: rs(24),
    borderRadius: rs(12),
    backgroundColor: Colors.red,
    borderWidth: 1,
    borderColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    zIndex: 10,
  },
  errorText: {
    color: Colors.red,
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
    borderColor: Colors.input_border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: rs(16),
    gap: rs(12),
  },
  field: {
    flex: 1,
    fontSize: rs(14),
    fontFamily: Fonts.Medium,
    color: Colors.black,
    padding: 0,
  },
  submitBtn: {
    height: rs(60),
    borderRadius: rs(20),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(10),
    marginTop: rs(12),
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
    color: Colors.black,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: rs(15),
    paddingHorizontal: rs(15),
    height: rs(50),
    borderWidth: 1,
    borderColor: Colors.input_border,
    marginBottom: rs(20),
    gap: rs(10),
  },
  searchInput: {
    flex: 1,
    fontSize: rs(14),
    fontFamily: Fonts.Medium,
    color: Colors.black,
    padding: 0,
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
    flex: 1,
    fontSize: rs(14),
    fontFamily: Fonts.Medium,
    color: Colors.black,
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
