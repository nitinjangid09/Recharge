/**
 * Screen: AEPSSecondaryRegistrationScreen
 * Route:  /aeps/secondary-registration
 *
 * Allows a retailer to provide personal, business, and address
 * details to enable additional AEPS banking features.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Platform,
  TextInput,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../../constants/Colors';
import HeaderBar from '../../../componets/HeaderBar/HeaderBar';
import { fetchUserProfile, fetchStateList, fetchCityList } from '../../../api/AuthApi';
import { AlertService } from '../../../componets/Alerts/CustomAlert';
import { Modal } from 'react-native';

const { width: SW, height: SH } = Dimensions.get("window");
const scale = (n) => Math.round((SW / 375) * n);
const vscale = (n) => Math.round((SH / 812) * n);
const rs = (n, lo = n * 0.82, hi = n * 1.28) =>
  Math.min(Math.max(scale(n), lo), hi);

// WalletBar removed


// ─── Section Card ─────────────────────────────────────────────────
const SectionCard = ({ children, style }) => (
  <View style={[cardStyles.card, style]}>{children}</View>
);

const CardHeader = ({ icon, title, subtitle }) => (
  <View style={cardStyles.header}>
    <View style={cardStyles.iconWrap}>
      <Text style={cardStyles.iconText}>{icon}</Text>
    </View>
    <View>
      <Text style={cardStyles.title}>{title}</Text>
      <Text style={cardStyles.subtitle}>{subtitle}</Text>
    </View>
  </View>
);

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.homebg,
    borderRadius: rs(20),
    padding: rs(18),
    marginBottom: rs(14),
    borderWidth: 0.5,
    borderColor: 'rgba(212,176,106,0.3)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: rs(8) },
      android: { elevation: 2 },
    }),
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: rs(12), marginBottom: rs(16) },
  iconWrap: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(12),
    backgroundColor: '#F5F6F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: rs(17) },
  title: { fontSize: rs(15), fontWeight: '700', color: Colors.black },
  subtitle: { fontSize: rs(10), color: Colors.text_secondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: rs(1) },
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
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
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
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
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

// ─── Security Note ────────────────────────────────────────────────
const SecurityNote = ({ text }) => (
  <View style={noteStyles.row}>
    <View style={noteStyles.dot} />
    <Text style={noteStyles.text}>{text}</Text>
  </View>
);

const noteStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: rs(5), marginTop: rs(10) },
  dot: { width: rs(6), height: rs(6), borderRadius: rs(3), backgroundColor: Colors.finance_success },
  text: { fontSize: rs(10), color: Colors.text_secondary, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
});

// ─── Live Ticker ──────────────────────────────────────────────────
const LiveBadge = ({ message }) => (
  <View style={styles.liveBar}>
    <View style={styles.liveDot} />
    <Text style={styles.liveText} numberOfLines={1}>{message}</Text>
  </View>
);

// ─── File Upload Slot ─────────────────────────────────────────────
const UploadSlot = ({ label }) => (
  <TouchableOpacity activeOpacity={0.75} style={styles.uploadSlot}>
    <Text style={styles.uploadPlus}>+</Text>
    <Text style={styles.uploadLabel}>CHOOSE FILE</Text>
    <Text style={styles.uploadHint}>JPG, PNG (Max 200KB)</Text>
  </TouchableOpacity>
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
  sheet: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: Colors.white, borderTopLeftRadius: rs(25), borderTopRightRadius: rs(25), maxHeight: '70%', paddingBottom: rs(30) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: rs(20), borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  title: { fontSize: rs(16), fontWeight: '800', color: Colors.black },
  close: { fontSize: rs(18), color: '#94A3B8' },
  item: { padding: rs(18), borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  itemText: { fontSize: rs(14), color: '#334155', fontWeight: '500' },
  empty: { textAlign: 'center', padding: rs(40), color: '#94A3B8' }
});

// ─── Screen ───────────────────────────────────────────────────────
export default function AEPSSecondaryRegistrationScreen({ navigation }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    pan: '', aadhaar: '', shopName: '',
    address: '', state: '', stateCode: '', city: '', pincode: '',
  });
  const [errors, setErrors] = useState({});
  const [lists, setLists] = useState({ states: [], cities: [] });
  const [sel, setSel] = useState({ visible: false, title: '', items: [], key: '' });

  const updateForm = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  const openSelector = async (title, key) => {
    let items = [];
    if (key === 'state') {
      if (lists.states.length === 0) {
        const hToken = await AsyncStorage.getItem("header_token");
        const res = await fetchStateList({ headerToken: hToken });
        if (res.success && res.data) {
          const mapped = res.data.map(s => ({ label: s.stateName, value: s.stateCode }));
          setLists(prev => ({ ...prev, states: mapped }));
          items = mapped;
        }
      } else items = lists.states;
    } else if (key === 'city') {
      if (!form.stateCode) {
        AlertService.showAlert({ type: 'error', title: 'State Required', message: 'Please select state first' });
        return;
      }
      const hToken = await AsyncStorage.getItem("header_token");
      const res = await fetchCityList({ stateCode: form.stateCode, headerToken: hToken });
      if (res.success && res.data) items = res.data.map(c => ({ label: c.cityName, value: c.cityCode }));
    }
    setSel({ visible: true, title, items, key });
  };

  const validate = () => {
    const e = {};
    if (!form.firstName) e.firstName = 'Please enter first name';
    if (!form.lastName) e.lastName = 'Please enter last name';
    if (!form.phone) e.phone = 'Mobile number is required';
    else if (form.phone.length !== 10) e.phone = 'Should be 10 digits';
    
    if (!form.email) e.email = 'Email address is required';
    else if (!form.email.includes('@')) e.email = 'Enter valid email';

    if (!form.pan) e.pan = 'PAN number required';
    else if (form.pan.length !== 10) e.pan = 'Enter valid 10-digit PAN';

    if (!form.aadhaar) e.aadhaar = 'Aadhaar is required';
    else if (form.aadhaar.length !== 12) e.aadhaar = 'Must be 12 digits';

    if (!form.shopName) e.shopName = 'Please enter shop name';
    if (!form.address) e.address = 'Business address is required';
    if (!form.state) e.state = 'Please select state';
    if (!form.city) e.city = 'Please select city';
    
    if (!form.pincode) e.pincode = 'Pincode is required';
    else if (form.pincode.length !== 6) e.pincode = 'Enter 6-digit pin';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRegister = () => {
    if (validate()) {
       AlertService.showAlert({ type: 'success', title: 'Validated', message: 'Information verified. Proceeding...' });
       navigation.navigate('AEPSServiceActivation');
    }
  };

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      const res = await fetchUserProfile({ headerToken });
      if (res?.success) {
        setForm({
          firstName: res.data.firstName || '',
          lastName: res.data.lastName || '',
          email: res.data.email || '',
          phone: res.data.phone || '',
          shopName: res.data.shopName || '',
          pan: res.data.panNumber || '',
          aadhaar: res.data.aadharNumber || '',
          address: res.data.personalAddress || '',
          state: res.data.state || '',
          city: res.data.city || '',
          pincode: res.data.personalPincode || ''
        });
      }
    } catch (e) {
      console.log("Error loading profile:", e);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <HeaderBar title="AePS Onboarding" onBack={() => navigation?.goBack()} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingHorizontal: rs(16), paddingTop: rs(16), paddingBottom: rs(40) }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SectionCard>
          <CardHeader icon="👤" title="Personal Details" subtitle="Full Legal Identity" />
          <View style={{ flexDirection: 'row', gap: rs(10) }}>
            <View style={{ flex: 1 }}>
              <FormField 
                label="First Name" 
                placeholder="First Name" 
                value={form.firstName} 
                onChangeText={v => updateForm('firstName', v)}
                error={errors.firstName}
              />
            </View>
            <View style={{ flex: 1 }}>
              <FormField 
                label="Last Name" 
                placeholder="Last Name" 
                value={form.lastName} 
                onChangeText={v => updateForm('lastName', v)}
                error={errors.lastName}
              />
            </View>
          </View>
          <FormField 
            label="Email Address" 
            placeholder="example@mail.com" 
            icon="✉️" 
            value={form.email} 
            onChangeText={v => updateForm('email', v)}
            error={errors.email}
          />
          <FormField 
            label="Phone Number" 
            placeholder="10-digit number" 
            icon="📞" 
            keyboardType="numeric" 
            value={form.phone} 
            onChangeText={v => updateForm('phone', v.replace(/\D/g, '').slice(0, 10))}
            error={errors.phone}
            maxLength={10}
          />
        </SectionCard>

        <SectionCard>
          <CardHeader icon="🏪" title="Business & Identity" subtitle="KYC Verification Data" />
          <FormField 
            label="Shop Name" 
            placeholder="Official Business Name" 
            icon="🏠" 
            value={form.shopName} 
            onChangeText={v => updateForm('shopName', v)}
            error={errors.shopName}
          />
          <View style={{ flexDirection: 'row', gap: rs(10) }}>
            <View style={{ flex: 1 }}>
              <FormField 
                label="PAN Number" 
                placeholder="ABCDE1234F" 
                value={form.pan} 
                onChangeText={v => updateForm('pan', v.toUpperCase().slice(0, 10))}
                error={errors.pan}
                maxLength={10}
                autoCapitalize="characters"
              />
            </View>
            <View style={{ flex: 1 }}>
              <FormField 
                label="Aadhaar No" 
                placeholder="12 digit number" 
                keyboardType="numeric" 
                value={form.aadhaar} 
                onChangeText={v => updateForm('aadhaar', v.replace(/\D/g, '').slice(0, 12))}
                error={errors.aadhaar}
                maxLength={12}
              />
            </View>
          </View>
        </SectionCard>

        <SectionCard>
          <CardHeader icon="📍" title="Business Address" subtitle="Operating Location" />
          <FormField 
            label="Street Address" 
            placeholder="Shop Address" 
            value={form.address} 
            onChangeText={v => updateForm('address', v)}
            error={errors.address}
          />
          <View style={{ flexDirection: 'row', gap: rs(10) }}>
            <View style={{ flex: 1 }}>
              <DropdownField 
                label="State" 
                placeholder="Select State" 
                value={form.state} 
                onPress={() => openSelector('Select State', 'state')}
                error={errors.state}
              />
            </View>
            <View style={{ flex: 1 }}>
              <DropdownField 
                label="City" 
                placeholder="Select City" 
                value={form.city} 
                onPress={() => openSelector('Select City', 'city')}
                error={errors.city}
              />
            </View>
          </View>
          <View style={{ width: '48%' }}>
            <FormField 
              label="Pincode" 
              placeholder="6 digits" 
              keyboardType="numeric" 
              value={form.pincode} 
              onChangeText={v => updateForm('pincode', v.replace(/\D/g, '').slice(0, 6))}
              error={errors.pincode}
              maxLength={6}
            />
          </View>
        </SectionCard>

        <PrimaryButton 
          label="REGISTER & CONTINUE" 
          onPress={handleRegister} 
        />
        <SecurityNote text="Secure 256-Bit Encrypted Registration" />

        <View style={{ height: rs(30) }} />
      </ScrollView>

      <SelectorModal 
        visible={sel.visible}
        title={sel.title}
        items={sel.items}
        onSelect={(item) => {
          if (sel.key === 'state') {
            updateForm('state', item.label);
            updateForm('stateCode', item.value);
            updateForm('city', '');
          } else updateForm('city', item.label);
          setSel(s => ({ ...s, visible: false }));
        }}
        onClose={() => setSel(s => ({ ...s, visible: false }))}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  liveBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: rs(8),
    marginHorizontal: rs(20),
    marginTop: rs(10),
    backgroundColor: 'rgba(0,0,0,0.05)',
    borderRadius: rs(20),
    paddingVertical: rs(7),
    paddingHorizontal: rs(14),
    alignSelf: 'flex-start',
  },
  liveDot: {
    width: rs(7),
    height: rs(7),
    borderRadius: rs(4),
    backgroundColor: Colors.finance_success,
  },
  liveText: {
    fontSize: rs(11),
    fontWeight: '700',
    color: Colors.black,
    letterSpacing: 0.5,
  },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: rs(16), paddingBottom: rs(30) },
  row: { flexDirection: 'row', gap: rs(10) },
  half: { flex: 1 },
  panNote: {
    backgroundColor: Colors.input_bg,
    borderRadius: rs(12),
    padding: rs(10),
    marginTop: rs(4),
    borderWidth: 0.5,
    borderColor: 'rgba(212,176,106,0.25)',
  },
  panNoteText: {
    fontSize: rs(11),
    color: Colors.text_secondary,
    lineHeight: rs(16),
    fontStyle: 'italic',
  },
  bottomPad: { height: rs(20) },
  errorText: {
    fontSize: rs(10),
    color: '#ef4444',
    marginTop: rs(4),
    marginBottom: rs(4),
    marginLeft: rs(2),
    fontWeight: '600'
  }
});
