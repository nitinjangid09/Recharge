import React, { useState } from 'react';
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
import { fetchAepsBanks, fetchStateList, fetchCityList } from '../../../api/AuthApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RDService from '../AEPS1/RDService';
import { AlertService } from '../../../componets/Alerts/CustomAlert';

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
      onChangeText={(v) => updateForm(`${prefix}Addr`, v)}
      error={errors[`${prefix}Addr`]}
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
        <DropdownField
          label="City"
          placeholder="Select City"
          value={form[`${prefix}City`]}
          onPress={() => openSelector('Select City', `${prefix}City`)}
          error={errors[`${prefix}City`]}
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
const SelectorModal = ({ visible, title, items, onSelect, onClose }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <TouchableOpacity style={selStyles.overlay} activeOpacity={1} onPress={onClose} />
    <View style={selStyles.sheet}>
      <View style={selStyles.header}>
        <Text style={selStyles.title}>{title}</Text>
        <TouchableOpacity onPress={onClose}><Text style={selStyles.close}>✕</Text></TouchableOpacity>
      </View>
      <ScrollView style={selStyles.list} showsVerticalScrollIndicator={false}>
        {items.map((item, idx) => (
          <TouchableOpacity key={idx} style={selStyles.item} onPress={() => onSelect(item)}>
            <Text style={selStyles.itemText}>{item.label || item}</Text>
          </TouchableOpacity>
        ))}
        {items.length === 0 && <Text style={selStyles.empty}>Loading items...</Text>}
      </ScrollView>
    </View>
  </Modal>
);

const selStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: Colors.white, borderTopLeftRadius: rs(25), borderTopRightRadius: rs(25), maxHeight: '75%', paddingBottom: rs(30) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: rs(20), borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title: { fontSize: rs(16), fontWeight: '800', color: Colors.black },
  close: { fontSize: rs(18), color: '#94A3B8' },
  item: { padding: rs(18), borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  itemText: { fontSize: rs(14), color: '#334155', fontWeight: '500' },
  empty: { textAlign: 'center', padding: rs(40), color: '#94A3B8' }
});

// ─── Main Screen Component ────────────────────────────────────────
export default function AEPSServiceActivationScreen({ navigation }) {
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeDoc, setActiveDoc] = useState(null);

  const [form, setForm] = useState({
    model: '', modelLabel: '', deviceNo: '', aadhaar: '', bank: '', bankLabel: '', accNo: '', ifsc: '',
    officeAddr: '', officeState: '', officeStateCode: '', officeCity: '', officePincode: '',
    aadhaarAddr: '', aadhaarState: '', aadhaarStateCode: '', aadhaarCity: '', aadhaarPincode: '',
    panFile: null, aadhaarFront: null, aadhaarBack: null, shopImg: null
  });

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
        const res = await fetchAepsBanks({ headerToken: hToken });
        if (res.success || Array.isArray(res.data)) {
          const mapped = (res.data || []).map(b => ({ label: b.name || b.bankName, value: b._id || b.bankId }));
          setLists(prev => ({ ...prev, banks: mapped }));
          items = mapped;
        }
      } else items = lists.banks;
    } else if (key.includes('State')) {
      if (lists.states.length === 0) {
        const hToken = await AsyncStorage.getItem("header_token");
        const res = await fetchStateList({ headerToken: hToken });
        if (res.success && res.data) {
          const mapped = res.data.map(s => ({ label: s.stateName, value: s.stateCode }));
          setLists(prev => ({ ...prev, states: mapped }));
          items = mapped;
        }
      } else items = lists.states;
    } else if (key.includes('City')) {
      const stateCode = key === 'officeCity' ? form.officeStateCode : form.aadhaarStateCode;
      if (!stateCode) {
        AlertService.showAlert({ type: 'error', title: 'State Required', message: 'Please select a state first' });
        return;
      }
      const hToken = await AsyncStorage.getItem("header_token");
      const res = await fetchCityList({ stateCode, headerToken: hToken });
      if (res.success && res.data) {
        items = res.data.map(c => ({ label: c.cityName, value: c.cityCode }));
      }
    } else if (key === 'model') {
      items = lists.models;
    }
    setSel({ visible: true, title, items, key });
  };

  const handleSelect = (item) => {
    if (sel.key === 'model') { updateForm('model', item.value); updateForm('modelLabel', item.label); }
    else if (sel.key === 'bank') { updateForm('bank', item.value); updateForm('bankLabel', item.label); }
    else if (sel.key === 'officeState') { updateForm('officeState', item.label); updateForm('officeStateCode', item.value); updateForm('officeCity', ''); }
    else if (sel.key === 'aadhaarState') { updateForm('aadhaarState', item.label); updateForm('aadhaarStateCode', item.value); updateForm('aadhaarCity', ''); }
    else if (sel.key === 'officeCity') updateForm('officeCity', item.label);
    else if (sel.key === 'aadhaarCity') updateForm('aadhaarCity', item.label);
    setSel(s => ({ ...s, visible: false }));
  };

  const handleCapture = async (method) => {
    setModalVisible(false);
    try {
      const options = { width: 800, height: 600, cropping: true, compressImageQuality: 0.7 };
      const image = method === 'camera' ? await ImagePicker.openCamera(options) : await ImagePicker.openPicker(options);
      if (image) updateForm(activeDoc, image.path);
    } catch (e) { console.log("Picker Error:", e); }
  };

  const validateAll = () => {
    const e = {};
    // Section 1: Device & Bank
    if (!form.model) e.model = 'Select device model';
    if (!form.deviceNo) e.deviceNo = 'Enter device serial no';
    if (!form.aadhaar) e.aadhaar = 'Enter Aadhaar number';
    else if (form.aadhaar.length !== 12) e.aadhaar = 'Aadhaar must be 12 digits';
    if (!form.bank) e.bank = 'Select bank name';
    if (!form.accNo) e.accNo = 'Enter account number';
    if (!form.ifsc) e.ifsc = 'Enter IFSC code';

    // Section 2: Office
    if (!form.officeAddr) e.officeAddr = 'Enter office address';
    if (!form.officeState) e.officeState = 'Select state';
    if (!form.officeCity) e.officeCity = 'Select city';
    if (!form.officePincode) e.officePincode = 'Enter pincode';
    else if (form.officePincode.length !== 6) e.officePincode = 'Invalid pincode';

    // Section 3: Aadhaar Addr
    if (!form.aadhaarAddr) e.aadhaarAddr = 'Enter Aadhaar address';
    if (!form.aadhaarState) e.aadhaarState = 'Select state';
    if (!form.aadhaarCity) e.aadhaarCity = 'Select city';
    if (!form.aadhaarPincode) e.aadhaarPincode = 'Enter pincode';
    else if (form.aadhaarPincode.length !== 6) e.aadhaarPincode = 'Invalid pincode';

    // Section 4: Docs
    if (!form.panFile) e.panFile = 'PAN file required';
    if (!form.aadhaarFront) e.aadhaarFront = 'Aadhaar Front required';
    if (!form.aadhaarBack) e.aadhaarBack = 'Aadhaar Back required';
    if (!form.shopImg) e.shopImg = 'Shop image required';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateAll()) return;
    
    setLoading(true);
    // Simulate API process
    setTimeout(() => {
      setLoading(false);
      AlertService.showAlert({ 
        type: 'success', 
        title: 'Request Submitted', 
        message: 'Your activation request has been captured successfully. Redirecting to verification.',
        onClose: () => navigation.navigate('AEPSAadhaarOTP')
      });
    }, 1500);
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

        {/* Section 1: Device & Bank */}
        <SectionCard>
          <StepCardHeader step="1" variant="dark" title="Device & Bank Information" subtitle="Personal & Device Details" />
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
            onChangeText={(v) => updateForm('accNo', v)}
            error={errors.accNo}
          />
          <FormField
            label="Bank IFSC Code"
            placeholder="SBIN000XXXX"
            icon="🔒"
            value={form.ifsc}
            onChangeText={(v) => updateForm('ifsc', v)}
            error={errors.ifsc}
          />
        </SectionCard>

        {/* Section 2: Office Address */}
        <SectionCard>
          <StepCardHeader step="2" variant="gold" title="Office Address Details" subtitle="Permanent Business Location" />
          <AddressSection prefix="office" form={form} updateForm={updateForm} openSelector={openSelector} errors={errors} />
        </SectionCard>

        {/* Section 3: Aadhaar Address */}
        <SectionCard>
          <StepCardHeader step="3" variant="dark" title="Address As Per Aadhaar" subtitle="Identity Document Address" />
          <AddressSection prefix="aadhaar" form={form} updateForm={updateForm} openSelector={openSelector} errors={errors} />
        </SectionCard>

        {/* Section 4: Documents */}
        <SectionCard>
          <StepCardHeader step="4" variant="gold" title="KYC Documents" subtitle="Upload Required Identities" />
          <View style={screenStyles.row}>
            <DocUploadCard label="PAN Card" uri={form.panFile} onPress={() => { setActiveDoc('panFile'); setModalVisible(true); }} />
            <DocUploadCard label="Aadhaar Front" uri={form.aadhaarFront} onPress={() => { setActiveDoc('aadhaarFront'); setModalVisible(true); }} />
          </View>
          <View style={screenStyles.row}>
            <DocUploadCard label="Aadhaar Back" uri={form.aadhaarBack} onPress={() => { setActiveDoc('aadhaarBack'); setModalVisible(true); }} />
            <DocUploadCard label="Shop Image" uri={form.shopImg} onPress={() => { setActiveDoc('shopImg'); setModalVisible(true); }} />
          </View>
          {errors.panFile || errors.aadhaarFront || errors.aadhaarBack || errors.shopImg ? (
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
    </SafeAreaView>
  );
}

const screenStyles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: rs(16), paddingBottom: rs(30) },
  row: { flexDirection: 'row', gap: rs(10) },
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
