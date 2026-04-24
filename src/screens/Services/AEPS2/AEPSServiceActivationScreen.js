import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Image,
  TextInput,
  Dimensions,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ImagePicker from 'react-native-image-crop-picker';
import Colors from '../../../constants/Colors';
import HeaderBar from '../../../componets/HeaderBar/HeaderBar';
import { fetchEBankList, fetchEStateList, fetchCityList, onboardAepsUser, fetchUserProfile, activateAepsService } from '../../../api/AuthApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RDService from '../../../utils/RDService';
import { AlertService } from '../../../componets/Alerts/CustomAlert';
import CalendarModal from '../../../componets/Calendar/CalendarModal';
import Geolocation from '@react-native-community/geolocation';

const { width: SW, height: SH } = Dimensions.get("window");
const scale = (n) => Math.round((SW / 375) * n);
const rs = (n, lo = n * 0.82, hi = n * 1.28) =>
  Math.min(Math.max(scale(n), lo), hi);

// ─── Section Card ─────────────────────────────────────────────────
const SectionCard = ({ children, style }) => (
  <View style={[cardStyles.card, style]}>{children}</View>
);

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: rs(20),
    padding: rs(18),
    marginBottom: rs(14),
    borderWidth: 0.5,
    borderColor: Colors.border,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: rs(8) },
      android: { elevation: 2 },
    }),
  },
});

// ─── Field Input ──────────────────────────────────────────────────
const FormField = ({ label, placeholder, value, onChangeText, keyboardType, icon, editable = true, error, maxLength, autoCapitalize }) => (
  <View style={fieldStyles.wrap}>
    <Text style={fieldStyles.label}>{label}</Text>
    <View style={[fieldStyles.inputRow, error && { borderColor: '#ef4444' }]}>
      {icon ? <Text style={fieldStyles.icon}>{icon}</Text> : null}
      <TextInput
        style={[fieldStyles.input, !editable && fieldStyles.disabled]}
        placeholder={placeholder}
        placeholderTextColor={'#9BA5B8'}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || 'default'}
        editable={editable}
        maxLength={maxLength}
        autoCapitalize={autoCapitalize}
      />
    </View>
    {error ? <Text style={screenStyles.errorText}>{error}</Text> : null}
  </View>
);

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: rs(12) },
  label: { fontSize: rs(10), fontWeight: '700', color: Colors.text_secondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: rs(5) },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: rs(14),
    borderWidth: 1,
    borderColor: 'rgba(212,176,106,0.32)',
    paddingHorizontal: rs(14),
    paddingVertical: rs(13),
    gap: rs(10),
  },
  icon: { fontSize: rs(14), opacity: 0.55 },
  input: { flex: 1, fontSize: rs(14), color: '#0B0F1A', padding: 0 },
  disabled: { opacity: 0.5 },
});

// ─── Dropdown Field ───────────────────────────────────────────────
const DropdownField = ({ label, placeholder, value, onPress, error }) => (
  <View style={fieldStyles.wrap}>
    <Text style={fieldStyles.label}>{label}</Text>
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[dropStyles.row, error && { borderColor: '#ef4444' }]}
    >
      <Text style={[dropStyles.text, value && { color: '#0B0F1A' }]}>
        {value || placeholder}
      </Text>
      <Text style={dropStyles.arrow}>▾</Text>
    </TouchableOpacity>
    {error ? <Text style={screenStyles.errorText}>{error}</Text> : null}
  </View>
);

const dropStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderRadius: rs(14),
    borderWidth: 1,
    borderColor: 'rgba(212,176,106,0.32)',
    paddingHorizontal: rs(14),
    paddingVertical: rs(13),
  },
  text: { fontSize: rs(14), color: '#9BA5B8' },
  arrow: { fontSize: rs(12), color: Colors.text_secondary },
});

// ─── Primary Button ───────────────────────────────────────────────
const PrimaryButton = ({ label, onPress, gold, icon }) => (
  <TouchableOpacity
    onPress={onPress}
    activeOpacity={0.85}
    style={[btnStyles.btn, gold ? btnStyles.gold : btnStyles.dark]}
  >
    {icon ? <Text style={btnStyles.icon}>{icon}</Text> : null}
    <Text style={[btnStyles.label, gold ? btnStyles.goldLabel : btnStyles.darkLabel]}>{label}</Text>
  </TouchableOpacity>
);

const btnStyles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: rs(18), paddingVertical: rs(16), gap: rs(8), marginTop: rs(6) },
  dark: { backgroundColor: Colors.primary },
  gold: { backgroundColor: Colors.primary },
  icon: { fontSize: rs(16) },
  label: { fontSize: rs(14), fontWeight: '700', letterSpacing: 1 },
  darkLabel: { color: Colors.white },
  goldLabel: { color: Colors.white },
});

// ─── Step Card Header ─────────────────────────────────────────────
const StepBadge = ({ number, variant = 'dark' }) => {
  const bg = variant === 'dark' ? Colors.black : variant === 'gold' ? Colors.kyc_accent : Colors.kyc_bg;
  const tc = variant === 'dark' ? Colors.kyc_accent : variant === 'gold' ? Colors.white : Colors.black;
  return (
    <View style={[stepStyles.badge, { backgroundColor: bg }]}>
      <Text style={[stepStyles.num, { color: tc }]}>{number}</Text>
    </View>
  );
};

const StepCardHeader = ({ step, variant, title, subtitle }) => (
  <View style={stepStyles.header}>
    <StepBadge number={step} variant={variant} />
    <View>
      <Text style={stepStyles.title}>{title}</Text>
      <Text style={stepStyles.subtitle}>{subtitle}</Text>
    </View>
  </View>
);

const stepStyles = StyleSheet.create({
  badge: { width: rs(30), height: rs(30), borderRadius: rs(15), alignItems: 'center', justifyContent: 'center' },
  num: { fontSize: rs(13), fontWeight: '800' },
  header: { flexDirection: 'row', alignItems: 'center', gap: rs(12), marginBottom: rs(16) },
  title: { fontSize: rs(15), fontWeight: '700', color: Colors.black },
  subtitle: { fontSize: rs(10), color: Colors.text_secondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: rs(1) },
});

// ─── Document Upload Card ─────────────────────────────────────────
const DocUploadCard = ({ label, onPress, uri }) => (
  <TouchableOpacity activeOpacity={0.75} style={docStyles.card} onPress={onPress}>
    {uri ? (
      <Image source={{ uri }} style={docStyles.preview} resizeMode="cover" />
    ) : (
      <View style={docStyles.placeholder}>
        <Text style={docStyles.plus}>+</Text>
      </View>
    )}
    <Text style={docStyles.label}>{label}</Text>
    <Text style={docStyles.hint}>JPG, JPEG, PNG (Max 200KB)</Text>
  </TouchableOpacity>
);

const docStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: rs(16),
    padding: rs(16),
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(0,0,0,0.12)',
    borderStyle: 'dashed',
    minHeight: rs(120),
    justifyContent: 'center',
    marginHorizontal: 4
  },
  placeholder: { marginBottom: rs(8) },
  plus: { fontSize: rs(28), color: Colors.text_secondary, lineHeight: rs(32) },
  label: { fontSize: rs(10), fontWeight: '700', color: Colors.text_secondary, textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'center' },
  hint: { fontSize: rs(9), color: Colors.gray_BD, marginTop: rs(2), textAlign: 'center' },
  preview: { width: '100%', height: rs(80), borderRadius: rs(10), marginBottom: rs(6) },
});

// ─── Address Sub-Section ──────────────────────────────────────────
const AddressSection = ({ prefix, form, updateForm, openSelector, errors }) => (
  <>
    <FormField
      label="Shop/Home Address"
      placeholder="Building, Street, Area"
      value={form[`${prefix}Addr`]}
      onChangeText={(v) => updateForm(`${prefix}Addr`, v.slice(0, 200))}
      error={errors[`${prefix}Addr`]}
      maxLength={200}
    />
    <View style={screenStyles.row}>
      <View style={screenStyles.half}>
        <DropdownField
          label="State"
          placeholder="Select State"
          value={form[`${prefix}State`]}
          onPress={() => openSelector('Select State', `${prefix}State`)}
          error={errors[`${prefix}State`]}
        />
      </View>
      <View style={screenStyles.half}>
        <FormField
          label="City"
          placeholder="Enter City"
          value={form[`${prefix}City`]}
          onChangeText={(v) => updateForm(`${prefix}City`, v.replace(/[^a-zA-Z\s]/g, ''))}
          error={errors[`${prefix}City`]}
        />
      </View>
    </View>
    <View style={screenStyles.row}>
      <View style={screenStyles.half}>
        <FormField
          label="District"
          placeholder="Enter District"
          value={form[`${prefix}District`]}
          onChangeText={(v) => updateForm(`${prefix}District`, v.replace(/[^a-zA-Z\s]/g, ''))}
          error={errors[`${prefix}District`]}
        />
      </View>
      <View style={screenStyles.half}>
        <FormField
          label="Area/Tehsil"
          placeholder="Enter Area"
          value={form[`${prefix}Area`]}
          onChangeText={(v) => updateForm(`${prefix}Area`, v.replace(/[^a-zA-Z\s]/g, ''))}
          error={errors[`${prefix}Area`]}
        />
      </View>
    </View>
    <View style={{ width: '48%' }}>
      <FormField
        label="Pincode"
        placeholder="6 digits"
        keyboardType="numeric"
        value={form[`${prefix}Pincode`]}
        onChangeText={(v) => updateForm(`${prefix}Pincode`, v.replace(/\D/g, '').slice(0, 6))}
        error={errors[`${prefix}Pincode`]}
        maxLength={6}
      />
    </View>
  </>
);

// ─── Item Selector Modal ──────────────────────────────────────────
const SelectorModal = ({ visible, title, items, onSelect, onClose }) => {
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    if (!visible) setSearch('');
  }, [visible]);

  const filteredItems = items.filter(item => {
    const lbl = typeof item === 'object' ? (item.label || '') : String(item);
    return lbl.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={selStyles.overlay} activeOpacity={1} onPress={onClose} />
      <View style={selStyles.sheet}>
        <View style={selStyles.header}>
          <Text style={selStyles.title}>{title}</Text>
          <TouchableOpacity onPress={onClose}><Text style={selStyles.close}>✕</Text></TouchableOpacity>
        </View>
        <View style={selStyles.searchWrap}>
          <TextInput
            style={selStyles.searchInput}
            placeholder="Search here..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <ScrollView style={selStyles.list} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {filteredItems.map((item, idx) => {
            const textLabel = typeof item === 'object' ? (item.label || JSON.stringify(item)) : String(item);
            return (
              <TouchableOpacity key={idx} style={selStyles.item} onPress={() => onSelect(item)}>
                <Text style={selStyles.itemText}>{textLabel}</Text>
              </TouchableOpacity>
            );
          })}
          {filteredItems.length === 0 && (
            <Text style={selStyles.empty}>{items.length === 0 ? 'Loading items...' : 'No results found'}</Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const selStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: Colors.white, borderTopLeftRadius: rs(25), borderTopRightRadius: rs(25), maxHeight: '75%', paddingBottom: rs(30) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: rs(20), borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title: { fontSize: rs(16), fontWeight: '800', color: Colors.black },
  close: { fontSize: rs(18), color: '#94A3B8' },
  searchWrap: { paddingHorizontal: rs(20), paddingVertical: rs(10), borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  searchInput: { backgroundColor: '#f8fafc', borderRadius: rs(10), paddingHorizontal: rs(16), paddingVertical: rs(12), fontSize: rs(14), color: Colors.black },
  item: { padding: rs(18), borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  itemText: { fontSize: rs(14), color: '#334155', fontWeight: '500' },
  empty: { textAlign: 'center', padding: rs(40), color: '#94A3B8' }
});

// ─── Main Screen Component ────────────────────────────────────────
export default function AEPSServiceActivationScreen({ navigation }) {
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [calVisible, setCalVisible] = useState(false);
  const [activeDoc, setActiveDoc] = useState(null);
  const [coords, setCoords] = useState({ lat: '26.889811', lon: '75.738343' });

  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', mobile: '', panNumber: '', dob: '', shopName: '',
    model: '', modelLabel: '', deviceNo: '', aadhaar: '', bank: '', bankLabel: '', accNo: '', ifsc: '',
    officeAddr: '', officeState: '', officeStateCode: '', officeCity: '', officePincode: '', officeDistrict: '', officeArea: '',
    aadhaarAddr: '', aadhaarState: '', aadhaarStateCode: '', aadhaarCity: '', aadhaarPincode: '', aadhaarDistrict: '', aadhaarArea: '',
    panFile: null, aadhaarFront: null, aadhaarBack: null
  });

  useEffect(() => {
    const initProfile = async () => {
      try {
        const hToken = await AsyncStorage.getItem("header_token");
        if (!hToken) return;
        const res = await fetchUserProfile({ headerToken: hToken });
        if (res.success || res.status === "SUCCESS") {
          const p = res.data;
          setForm(prev => ({
            ...prev,
            firstName: p.firstName || '',
            lastName: p.lastName || '',
            email: p.email || '',
            mobile: p.phone || p.mobile || '',
            panNumber: p.panNumber || '',
            dob: p.dob || '',
            shopName: p.shopName || '',
          }));
        }
      } catch (err) {
        console.log("Profile Fetch Error:", err);
      }
    };
    initProfile();

    // Get live location
    Geolocation.getCurrentPosition(
      (pos) => setCoords({ lat: String(pos.coords.latitude), lon: String(pos.coords.longitude) }),
      (err) => console.log("Location Error:", err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 }
    );
  }, []);

  const [sel, setSel] = useState({ visible: false, title: '', items: [], key: '' });
  const [lists, setLists] = useState({ banks: [], states: [], cities: [], models: RDService.DEVICE_LIST });

  const updateForm = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  const openSelector = async (title, key) => {
    let items = [];
    if (key === 'bank') {
      if (lists.banks.length === 0) {
        const hToken = await AsyncStorage.getItem("header_token");
        const res = await fetchEBankList({ headerToken: hToken });
        if (res.success || Array.isArray(res.data)) {
          const mapped = (res.data || []).map(b => ({ label: b.name || b.bankName, value: b._id || b.bankId }));
          setLists(prev => ({ ...prev, banks: mapped }));
          items = mapped;
        }
      } else items = lists.banks;
    } else if (key.includes('State')) {
      if (lists.states.length === 0) {
        const hToken = await AsyncStorage.getItem("header_token");
        const res = await fetchEStateList({ headerToken: hToken });
        if (res.success && res.data) {
          const mapped = res.data.map(s => ({ label: s.label || s.stateName || s.name || s.title || "Unknown", id: s._id }));
          setLists(prev => ({ ...prev, states: mapped }));
          items = mapped;
        }
      } else items = lists.states;
    } else if (key === 'model') {
      items = lists.models;
    }
    setSel({ visible: true, title, items, key });
  };

  const handleSelect = (item) => {
    if (sel.key === 'model') { updateForm('model', item.value); updateForm('modelLabel', item.label); }
    else if (sel.key === 'bank') { updateForm('bank', item.value); updateForm('bankLabel', item.label); }
    else if (sel.key === 'officeState') { updateForm('officeState', item.label); updateForm('officeStateCode', item.id); updateForm('officeCity', ''); }
    else if (sel.key === 'aadhaarState') { updateForm('aadhaarState', item.label); updateForm('aadhaarStateCode', item.id); updateForm('aadhaarCity', ''); }
    setSel(s => ({ ...s, visible: false }));
  };

  const handleCapture = async (method) => {
    setModalVisible(false);
    try {
      const options = { width: 800, height: 600, cropping: true, compressImageQuality: 0.7 };
      const image = method === 'camera' ? await ImagePicker.openCamera(options) : await ImagePicker.openPicker(options);
      if (image) {
        // Size check (200 KB = 204,800 bytes)
        if (image.size > 204800) {
          AlertService.showAlert({
            type: 'error',
            title: 'File Too Large',
            message: 'Image size must be less than 200 KB.'
          });
          return;
        }
        updateForm(activeDoc, image.path);
      }
    } catch (e) { console.log("Picker Error:", e); }
  };

  const handleDateConfirm = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const dob = `${y}-${m}-${d}`;
    updateForm('dob', dob);

    // Immediate age validation
    const today = new Date();
    let age = today.getFullYear() - date.getFullYear();
    const monthDiff = today.getMonth() - date.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
      age--;
    }
    if (age < 18) {
      setErrors(prev => ({ ...prev, dob: 'Minimum age must be 18 years' }));
    } else {
      setErrors(prev => ({ ...prev, dob: null }));
    }
    setCalVisible(false);
  };

  const validateAll = () => {
    const e = {};
    // Section 0: Merchant
    if (!form.firstName) e.firstName = 'First name required';
    if (!form.lastName) e.lastName = 'Last name required';
    if (!form.email) e.email = 'Email required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter valid email address';
    if (!form.panNumber) e.panNumber = 'PAN required';
    if (!form.dob) e.dob = 'DOB required';
    else {
      const birthDate = new Date(form.dob);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 18) e.dob = 'Minimum age must be 18 years';
    }
    if (!form.shopName) e.shopName = 'Shop name required';
    else if (String(form.shopName || '').length > 200) e.shopName = 'Shop name cannot exceed 200 characters';

    // Section 1: Device & Bank
    if (!form.model) e.model = 'Select device model';
    if (!form.deviceNo) e.deviceNo = 'Enter device serial no';
    if (!form.aadhaar) e.aadhaar = 'Enter Aadhaar number';
    else if (form.aadhaar.length !== 12) e.aadhaar = 'Aadhaar must be 12 digits';
    if (!form.bank) e.bank = 'Select bank name';
    if (!form.accNo) e.accNo = 'Enter account number';
    else if (String(form.accNo || '').length < 9) e.accNo = 'Account number must be 9-18 digits';
    if (!form.ifsc) e.ifsc = 'Enter IFSC code';
    else if (String(form.ifsc || '').length !== 11) e.ifsc = 'IFSC must be exactly 11 characters';

    // Section 2: Office
    if (!form.officeAddr) e.officeAddr = 'Enter office address';
    else if (String(form.officeAddr || '').length > 200) e.officeAddr = 'Address too long (max 200)';
    if (!form.officeState) e.officeState = 'Select state';
    if (!form.officeCity) e.officeCity = 'Select city';
    if (!form.officeDistrict) e.officeDistrict = 'Enter district';
    if (!form.officeArea) e.officeArea = 'Enter area';
    if (!form.officePincode) e.officePincode = 'Enter pincode';
    else if (form.officePincode.length !== 6) e.officePincode = 'Invalid pincode';

    // Section 3: Aadhaar Addr
    if (!form.aadhaarAddr) e.aadhaarAddr = 'Enter Aadhaar address';
    else if (String(form.aadhaarAddr || '').length > 200) e.aadhaarAddr = 'Address too long (max 200)';
    if (!form.aadhaarState) e.aadhaarState = 'Select state';
    if (!form.aadhaarCity) e.aadhaarCity = 'Select city';
    if (!form.aadhaarPincode) e.aadhaarPincode = 'Enter pincode';
    else if (form.aadhaarPincode.length !== 6) e.aadhaarPincode = 'Invalid pincode';

    // Section 4: Docs
    if (!form.panFile) e.panFile = 'PAN file required';
    if (!form.aadhaarFront) e.aadhaarFront = 'Aadhaar Front required';
    if (!form.aadhaarBack) e.aadhaarBack = 'Aadhaar Back required';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateAll()) return;

    setLoading(true);
    try {
      const hToken = await AsyncStorage.getItem("header_token");
      const client_ref_id = `ACT${Date.now()}${(Math.random() * 1000).toFixed(0)}`;

      const formD = new FormData();

      // Basic Fields
      formD.append('aadhaar', form.aadhaar);
      formD.append('accountNumber', form.accNo);
      formD.append('ifsc', form.ifsc);
      formD.append('deviceNumber', form.deviceNo);
      formD.append('modelName', form.model);
      formD.append('bank', form.bank);
      formD.append('latitude', coords.lat);
      formD.append('longitude', coords.lon);

      // Office Address (Bracketed Keys)
      formD.append('officeAddress[line]', form.officeAddr);
      formD.append('officeAddress[city]', form.officeCity);
      formD.append('officeAddress[state]', form.officeStateCode); // Send ID as requested
      formD.append('officeAddress[pincode]', form.officePincode);
      formD.append('officeAddress[district]', form.officeDistrict);
      formD.append('officeAddress[area]', form.officeArea);

      // Personal/Aadhaar Address (Bracketed Keys)
      formD.append('address[line]', form.aadhaarAddr);
      formD.append('address[city]', form.aadhaarCity);
      formD.append('address[state]', form.aadhaarStateCode); // Send ID instead of Name
      formD.append('address[pincode]', form.aadhaarPincode);
      formD.append('address[district]', form.aadhaarDistrict);
      formD.append('address[area]', form.aadhaarArea);

      // Files
      const appendFile = (key, path) => {
        if (!path) return;
        const name = path.split('/').pop() || 'upload.jpg';
        formD.append(key, {
          uri: Platform.OS === 'android' ? path : path.replace('file://', ''),
          name,
          type: 'image/jpeg'
        });
      };

      appendFile('panCard', form.panFile);
      appendFile('aadhaarFront', form.aadhaarFront);
      appendFile('aadhaarBack', form.aadhaarBack);

      const res = await activateAepsService({
        formData: formD,
        headerToken: hToken,
        idempotencyKey: `ACT_${client_ref_id}`
      });

      const isSuccess = res.success === true || res.status === "SUCCESS";
      const isAlreadyActive = res?.data?.status === "Activated";
      const rawMsg = res?.data?.message || res.message;
      const displayMsg = typeof rawMsg === 'object' ? JSON.stringify(rawMsg) : (rawMsg || (isAlreadyActive ? 'This service already exist for the user code' : 'Your service activation is processing. Please complete OTP verification.'));

      if (isSuccess || isAlreadyActive) {
        AlertService.showAlert({
          type: 'success',
          title: isAlreadyActive ? 'Service Active' : 'Activation Initiated',
          message: displayMsg,
          onClose: () => navigation.navigate('AEPSAadhaarOTP')
        });
      } else {
        AlertService.showAlert({
          type: 'error',
          title: 'Activation Failed',
          message: typeof res.message === 'object' ? JSON.stringify(res.message) : (res.message || 'Something went wrong during activation.')
        });
      }
    } catch (err) {
      console.log("Activation Error:", err);
      const errMsg = typeof err?.message === 'object' ? JSON.stringify(err.message) : (err?.message || 'Failed to reaches server.');
      AlertService.showAlert({ type: 'error', title: 'Network Error', message: errMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={screenStyles.safe}>
      <HeaderBar
        title="Service Activation"
        onBack={() => navigation?.goBack()}
      />

      <ScrollView
        style={screenStyles.scroll}
        contentContainerStyle={screenStyles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ height: rs(12) }} />

        {/* Section 0: Merchant Information */}
        <SectionCard>
          <StepCardHeader step="1" variant="gold" title="Merchant Information" subtitle="Basic Profile Details" />
          <View style={screenStyles.row}>
            <View style={screenStyles.half}>
              <FormField
                label="First Name"
                placeholder="Abhishek"
                value={form.firstName}
                onChangeText={(v) => updateForm('firstName', v.replace(/[^a-zA-Z]/g, '').slice(0, 100))}
                error={errors.firstName}
                maxLength={100}
              />
            </View>
            <View style={screenStyles.half}>
              <FormField
                label="Last Name"
                placeholder="Sharma"
                value={form.lastName}
                onChangeText={(v) => updateForm('lastName', v.replace(/[^a-zA-Z]/g, '').slice(0, 100))}
                error={errors.lastName}
                maxLength={100}
              />
            </View>
          </View>
          <FormField
            label="Email Address"
            placeholder="example@gmail.com"
            value={form.email}
            onChangeText={(v) => updateForm('email', v)}
            error={errors.email}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <View style={screenStyles.row}>
            <View style={screenStyles.half}>
              <FormField
                label="PAN Number"
                placeholder="OHXPS1792H"
                value={form.panNumber}
                onChangeText={(v) => updateForm('panNumber', v.toUpperCase())}
                error={errors.panNumber}
                maxLength={10}
                autoCapitalize="characters"
              />
            </View>
            <View style={screenStyles.half}>
              <DropdownField
                label="Date of Birth"
                placeholder="Select Date"
                value={form.dob}
                onPress={() => setCalVisible(true)}
                error={errors.dob}
              />
            </View>
          </View>
          <FormField
            label="Shop Name"
            placeholder="Tech Dost"
            value={form.shopName}
            onChangeText={(v) => updateForm('shopName', v.slice(0, 200))}
            error={errors.shopName}
            maxLength={200}
          />
        </SectionCard>

        {/* Section 1: Device & Bank */}
        <SectionCard>
          <StepCardHeader step="2" variant="dark" title="Device & Bank Information" subtitle="Personal & Device Details" />
          <View style={screenStyles.row}>
            <View style={screenStyles.half}>
              <DropdownField
                label="Model Name"
                placeholder="Select Model"
                value={form.modelLabel}
                onPress={() => openSelector('Select Device Model', 'model')}
                error={errors.model}
              />
            </View>
            <View style={screenStyles.half}>
              <FormField
                label="Device Number"
                placeholder="Serial No"
                icon="⚙️"
                value={form.deviceNo}
                onChangeText={(v) => updateForm('deviceNo', v)}
                error={errors.deviceNo}
              />
            </View>
          </View>
          <View style={screenStyles.row}>
            <View style={screenStyles.half}>
              <FormField
                label="Aadhaar Number"
                placeholder="12 Digit Aadhaar"
                keyboardType="numeric"
                value={form.aadhaar}
                onChangeText={(v) => updateForm('aadhaar', v.replace(/\D/g, '').slice(0, 12))}
                error={errors.aadhaar}
                maxLength={12}
              />
            </View>
            <View style={screenStyles.half}>
              <DropdownField
                label="Bank Name"
                placeholder="Select Bank"
                value={form.bankLabel}
                onPress={() => openSelector('Select Bank', 'bank')}
                error={errors.bank}
              />
            </View>
          </View>
          <FormField
            label="Account Number"
            placeholder="Bank Account No"
            icon="💳"
            keyboardType="numeric"
            value={form.accNo}
            onChangeText={(v) => updateForm('accNo', v.replace(/\D/g, '').slice(0, 18))}
            error={errors.accNo}
            maxLength={18}
          />
          <FormField
            label="Bank IFSC Code"
            placeholder="SBIN000XXXX"
            icon="🔒"
            value={form.ifsc}
            onChangeText={(v) => updateForm('ifsc', v.toUpperCase().slice(0, 11))}
            error={errors.ifsc}
            maxLength={11}
            autoCapitalize="characters"
          />
        </SectionCard>

        {/* Section 2: Office Address */}
        <SectionCard>
          <StepCardHeader step="3" variant="gold" title="Office Address Details" subtitle="Permanent Business Location" />
          <AddressSection prefix="office" form={form} updateForm={updateForm} openSelector={openSelector} errors={errors} />
        </SectionCard>

        {/* Section 3: Aadhaar Address */}
        <SectionCard>
          <StepCardHeader step="4" variant="dark" title="Address As Per Aadhaar" subtitle="Identity Document Address" />
          <AddressSection prefix="aadhaar" form={form} updateForm={updateForm} openSelector={openSelector} errors={errors} />
        </SectionCard>

        {/* Section 4: Documents */}
        <SectionCard>
          <StepCardHeader step="5" variant="gold" title="KYC Documents" subtitle="Upload Required Identities" />
          <View style={screenStyles.row}>
            <DocUploadCard label="PAN Card" uri={form.panFile} onPress={() => { setActiveDoc('panFile'); setModalVisible(true); }} />
            <DocUploadCard label="Aadhaar Front" uri={form.aadhaarFront} onPress={() => { setActiveDoc('aadhaarFront'); setModalVisible(true); }} />
          </View>
          <View style={screenStyles.row}>
            <DocUploadCard label="Aadhaar Back" uri={form.aadhaarBack} onPress={() => { setActiveDoc('aadhaarBack'); setModalVisible(true); }} />
          </View>
          {errors.panFile || errors.aadhaarFront || errors.aadhaarBack ? (
            <Text style={[screenStyles.errorText, { textAlign: 'center', marginBottom: rs(10) }]}>Please upload all documents</Text>
          ) : null}
        </SectionCard>

        {/* ─ Actions ─ */}
        <PrimaryButton
          label={loading ? "PROCESSING..." : "SUBMIT ACTIVATION REQUEST"}
          onPress={handleSubmit}
        />

        <Text style={screenStyles.terms}>
          By proceeding, you agree to our banking partner guidelines for AEPS.
        </Text>

        <View style={{ height: 30 }} />
      </ScrollView>

      <SelectorModal
        visible={sel.visible}
        title={sel.title}
        items={sel.items}
        onSelect={handleSelect}
        onClose={() => setSel(s => ({ ...s, visible: false }))}
      />

      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <TouchableOpacity style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }} activeOpacity={1} onPress={() => setModalVisible(false)}>
          <View style={{ width: '85%', backgroundColor: '#fff', borderRadius: 20, padding: 25 }}>
            <Text style={{ fontSize: 18, fontWeight: '800', marginBottom: 10 }}>Upload Photo</Text>
            <TouchableOpacity onPress={() => handleCapture('camera')} style={{ padding: 15, borderBottomWidth: 1, borderColor: '#eee' }}><Text>Camera</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => handleCapture('gallery')} style={{ padding: 15 }}><Text>Gallery</Text></TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <CalendarModal
        visible={calVisible}
        title="Select Date of Birth"
        onConfirm={handleDateConfirm}
        onCancel={() => setCalVisible(false)}
        initialDate={form.dob ? new Date(form.dob) : new Date(2000, 0, 1)}
        maxDate={new Date()}
      />
    </SafeAreaView>
  );
}

const screenStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: rs(16), paddingBottom: rs(30) },
  row: { flexDirection: 'row', gap: rs(10), paddingBottom: rs(10) },
  half: { flex: 1 },
  terms: {
    textAlign: 'center',
    fontSize: rs(10),
    color: Colors.text_secondary,
    marginTop: rs(10),
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  errorText: {
    fontSize: rs(9),
    color: '#ef4444',
    marginTop: rs(2),
    fontWeight: '600'
  }
});
