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
import { fetchUserProfile, fetchEStateList, fetchCityList, onboardAepsUser, fetchEBankList } from '../../../api/AuthApi';
import { AlertService } from '../../../componets/Alerts/CustomAlert';
import { Modal, ActivityIndicator } from 'react-native';
import CalendarModal from '../../../componets/Calendar/CalendarModal';

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
    backgroundColor: Colors.beige,
    borderRadius: rs(20),
    padding: rs(18),
    marginBottom: rs(14),
    borderWidth: 0.5,
    borderColor: 'rgba(212,176,106,0.3)',

  },
  header: { flexDirection: 'row', alignItems: 'center', gap: rs(12), marginBottom: rs(16) },
  iconWrap: {
    width: rs(36),
    height: rs(36),
    borderRadius: rs(12),
    backgroundColor: 'rgb(245, 246, 247)',
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
    <View style={[fieldStyles.inputRow, error && { borderColor: 'rgb(239, 68, 68)' }]}>
      {icon ? <Text style={fieldStyles.icon}>{icon}</Text> : null}
      <TextInput
        style={[
          fieldStyles.input,
          (!editable && !value) && fieldStyles.disabled,
          (!editable && value) && { opacity: 1 }
        ]}
        placeholder={placeholder}
        placeholderTextColor={'rgb(155, 165, 184)'}
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
    backgroundColor: Colors.cardbg,
    borderRadius: rs(14),
    borderWidth: 1,
    borderColor: 'rgba(212,176,106,0.32)',
    paddingHorizontal: rs(14),
    paddingVertical: rs(13),
    gap: rs(10),
  },
  icon: { fontSize: rs(14), opacity: 0.55 },
  input: { flex: 1, fontSize: rs(14), color: 'rgb(11, 15, 26)', padding: 0 },
  disabled: { opacity: 0.5 },
});

// ─── Dropdown Field ───────────────────────────────────────────────
const DropdownField = ({ label, placeholder, value, onPress, error }) => (
  <View style={fieldStyles.wrap}>
    <Text style={fieldStyles.label}>{label}</Text>
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[dropStyles.row, error && { borderColor: 'rgb(239, 68, 68)' }]}
    >
      <Text style={[dropStyles.text, value && { color: 'rgb(11, 15, 26)' }]}>
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
    backgroundColor: Colors.cardbg,
    borderRadius: rs(14),
    borderWidth: 1,
    borderColor: 'rgba(212,176,106,0.32)',
    paddingHorizontal: rs(14),
    paddingVertical: rs(13),
  },
  text: { fontSize: rs(14), color: 'rgb(155, 165, 184)' },
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
  dot: { width: rs(6), height: rs(6), borderRadius: rs(3), backgroundColor: Colors.green },
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
const SelectorModal = ({ visible, title, items, onSelect, onClose }) => {
  const [search, setSearch] = React.useState('');

  React.useEffect(() => {
    if (!visible) setSearch('');
  }, [visible]);

  const filteredItems = (items || []).filter(item => {
    const lbl = typeof item === 'object' ? (item?.label || '') : String(item || '');
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
            placeholderTextColor={Colors.gray}
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
            <Text style={selStyles.empty}>{(items || []).length === 0 ? 'Loading items...' : 'No results found'}</Text>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const selStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: Colors.cardbg, borderTopLeftRadius: rs(25), borderTopRightRadius: rs(25), maxHeight: '70%', paddingBottom: rs(30) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: rs(20), borderBottomWidth: 1, borderBottomColor: 'rgb(241, 245, 249)' },
  title: { fontSize: rs(16), fontWeight: '800', color: Colors.black },
  close: { fontSize: rs(18), color: 'rgb(148, 163, 184)' },
  searchWrap: { paddingHorizontal: rs(20), paddingVertical: rs(10), borderBottomWidth: 1, borderBottomColor: 'rgb(241, 245, 249)' },
  searchInput: { backgroundColor: 'rgb(248, 250, 252)', borderRadius: rs(10), paddingHorizontal: rs(16), paddingVertical: rs(12), fontSize: rs(14), color: Colors.black },
  item: { padding: rs(18), borderBottomWidth: 1, borderBottomColor: 'rgb(248, 250, 252)' },
  itemText: { fontSize: rs(14), color: 'rgb(51, 65, 85)', fontWeight: '500' },
  empty: { textAlign: 'center', padding: rs(40), color: 'rgb(148, 163, 184)' }
});

// ─── Screen ───────────────────────────────────────────────────────
export default function AEPSSecondaryRegistrationScreen({ navigation }) {
  const [form, setForm] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    pan: '', aadhaar: '', shopName: '',
    address: '', state: '', stateCode: '', city: '', pincode: '',
    dateOfBirth: '', district: '', area: '',
    bank: '', bankLabel: '',
  });
  const [loading, setLoading] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [errors, setErrors] = useState({});
  const [lists, setLists] = useState({ states: [], cities: [], banks: [] });
  const [sel, setSel] = useState({ visible: false, title: '', items: [], key: '' });

  const updateForm = (key, val) => {
    setForm(f => ({ ...f, [key]: val }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  const openSelector = (title, key) => {
    let items = [];
    if (key === 'state') {
      items = lists.states || [];
    } else if (key === 'bank') {
      items = lists.banks || [];
    } else if (key === 'city') {
      items = lists.cities || [];
    }
    setSel({ visible: true, title, items, key });
  };

  const validate = () => {
    const e = {};
    if (!form.firstName) e.firstName = 'Please enter first name';
    if (!form.lastName) e.lastName = 'Please enter last name';
    if (!form.phone) e.phone = 'Bank linked mobile is required';
    else if (String(form.phone || '').length !== 10) e.phone = 'Must be exactly 10 digits';

    if (!form.bank) e.bank = 'Please select linked bank';

    if (!form.email) e.email = 'Email address is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email || '')) e.email = 'Please enter a valid email address';

    if (!form.pan) e.pan = 'PAN number required';
    else if (String(form.pan || '').length !== 10) e.pan = 'Enter valid 10-digit PAN';

    if (!form.aadhaar) e.aadhaar = 'Aadhaar is required';
    else if (String(form.aadhaar || '').length !== 12) e.aadhaar = 'Must be 12 digits';

    if (!form.shopName) e.shopName = 'Please enter shop name';
    else if (String(form.shopName || '').length > 200) e.shopName = 'Shop name cannot exceed 200 characters';
    if (!form.address) e.address = 'Business address is required';
    if (!form.state) e.state = 'Please select state';
    if (!form.city) e.city = 'Please select city';

    if (!form.pincode) e.pincode = 'Pincode is required';
    else if (String(form.pincode || '').length !== 6) e.pincode = 'Enter 6-digit pin';

    if (!form.dateOfBirth) e.dateOfBirth = 'Date of birth is required';
    else {
      const birthDate = new Date(form.dateOfBirth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < 18) e.dateOfBirth = 'Minimum age must be 18 years';
    }
    if (!form.district) e.district = 'District is required';
    if (!form.area) e.area = 'Area is required';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const generateClientRefId = () => {
    const chars = '0123456789';
    let result = 'TXN';
    for (let i = 0; i < 8; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleRegister = async () => {
    if (validate()) {
      setLoading(true);
      try {
        const headerToken = await AsyncStorage.getItem("header_token");
        const payload = {
          client_ref_id: generateClientRefId(),
          mobile: form.phone,
          panNumber: form.pan,
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          dateOfBirth: form.dateOfBirth,
          shopName: form.shopName,
          address: {
            line: form.address,
            city: form.city,
            state: form.state, // Send Name as requested
            pincode: form.pincode,
            district: form.district,
            area: form.area
          },
          bank: form.bank
        };

        const res = await onboardAepsUser({
          data: payload,
          headerToken,
          idempotencyKey: payload.client_ref_id
        });

        if (res.success) {
          AlertService.showAlert({
            type: 'success',
            title: 'Onboarding Success',
            message: res.message || 'User onboarded successfully',
            onClose: () => navigation.navigate('AEPSServiceActivation')
          });
        } else {
          AlertService.showAlert({
            type: 'error',
            title: 'Onboarding Failed',
            message: res.message || 'Unable to onboard user'
          });
        }
      } catch (error) {
        console.log("Onboarding Error:", error);
        AlertService.showAlert({
          type: 'error',
          title: 'System Error',
          message: 'Something went wrong during onboarding.'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    loadUserProfile();
    prefetchLists();
  }, []);

  const prefetchLists = async () => {
    try {
      const hToken = await AsyncStorage.getItem("header_token");
      if (!hToken) return;

      // Fetch States
      fetchEStateList({ headerToken: hToken }).then(res => {
        const stateData = Array.isArray(res) ? res : (res?.data || []);
        if (stateData.length > 0 || res?.success) {
          const mapped = stateData.map(s => ({ label: s.label || s.stateName || s.name || s.title || "Unknown", id: s._id }));
          setLists(prev => ({ ...prev, states: mapped }));
        }
      });

      // Fetch Banks
      fetchEBankList({ headerToken: hToken }).then(res => {
        const bankData = Array.isArray(res) ? res : (res?.data || []);
        if (bankData.length > 0 || res?.success) {
          const mapped = bankData.map(b => ({ label: b.name || b.bankName, value: b._id || b.bankId }));
          setLists(prev => ({ ...prev, banks: mapped }));
        }
      });
    } catch (e) {
      console.log("Prefetch error:", e);
    }
  };

  const loadUserProfile = async () => {
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      const res = await fetchUserProfile({ headerToken });
      if (res?.success) {
        setForm(prev => ({
          ...prev,
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
          pincode: res.data.personalPincode || '',
          dateOfBirth: res.data.dob || '',
          district: res.data.personalDistrict || '',
          area: res.data.personalArea || ''
        }));
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
                onChangeText={v => updateForm('firstName', v.replace(/[^a-zA-Z]/g, '').slice(0, 100))}
                error={errors.firstName}
                maxLength={100}
              />
            </View>
            <View style={{ flex: 1 }}>
              <FormField
                label="Last Name"
                placeholder="Last Name"
                value={form.lastName}
                onChangeText={v => updateForm('lastName', v.replace(/[^a-zA-Z]/g, '').slice(0, 100))}
                error={errors.lastName}
                maxLength={100}
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
          <View style={{ flexDirection: 'row', gap: rs(10) }}>
            <View style={{ flex: 1 }}>
              <FormField
                label="Bank Linked Mobile"
                placeholder="10 digit mobile"
                icon="📞"
                keyboardType="numeric"
                value={form.phone}
                onChangeText={v => updateForm('phone', v.replace(/\D/g, '').slice(0, 10))}
                error={errors.phone}
                maxLength={10}
              />
            </View>
            <View style={{ flex: 1 }}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setShowDatePicker(true)}
              >
                <View pointerEvents="none">
                  <FormField
                    label="Date of Birth"
                    placeholder="YYYY-MM-DD"
                    icon="📅"
                    value={form.dateOfBirth}
                    onChangeText={() => { }}
                    error={errors.dateOfBirth}
                    editable={false}
                  />
                </View>
              </TouchableOpacity>
            </View>
          </View>
          <DropdownField
            label="Linked Bank"
            placeholder="Select Bank"
            value={form.bankLabel}
            onPress={() => openSelector('Select Bank', 'bank')}
            error={errors.bank}
          />
        </SectionCard>

        <SectionCard>
          <CardHeader icon="🏪" title="Business & Identity" subtitle="KYC Verification Data" />
          <FormField
            label="Shop Name"
            placeholder="Official Business Name"
            icon="🏠"
            value={form.shopName}
            onChangeText={v => updateForm('shopName', v.slice(0, 200))}
            error={errors.shopName}
            maxLength={200}
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
              <FormField
                label="City"
                placeholder="Enter City"
                value={form.city}
                onChangeText={v => updateForm('city', v.replace(/[^a-zA-Z\s]/g, ''))}
                error={errors.city}
              />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: rs(10) }}>
            <View style={{ flex: 1 }}>
              <FormField
                label="District"
                placeholder="District Name"
                value={form.district}
                onChangeText={v => updateForm('district', v)}
                error={errors.district}
              />
            </View>
            <View style={{ flex: 1 }}>
              <FormField
                label="Area"
                placeholder="Area/Locality"
                value={form.area}
                onChangeText={v => updateForm('area', v)}
                error={errors.area}
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
          label={loading ? "PROCESSNG..." : "REGISTER & CONTINUE"}
          onPress={handleRegister}
        />
        {loading && <ActivityIndicator color={Colors.primary} style={{ marginTop: 10 }} />}
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
            updateForm('stateCode', item.id);
            updateForm('city', '');
          } else if (sel.key === 'bank') {
            updateForm('bank', item.value);
            updateForm('bankLabel', item.label);
          } else updateForm('city', item.label);
          setSel(s => ({ ...s, visible: false }));
        }}
        onClose={() => setSel(s => ({ ...s, visible: false }))}
      />

      <CalendarModal
        visible={showDatePicker}
        title="Select Date of Birth"
        initialDate={form.dateOfBirth ? new Date(form.dateOfBirth) : new Date()}
        onCancel={() => setShowDatePicker(false)}
        onConfirm={(date) => {
          if (date) {
            const yyyy = date.getFullYear();
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const dd = String(date.getDate()).padStart(2, '0');
            const dob = `${yyyy}-${mm}-${dd}`;
            updateForm('dateOfBirth', dob);

            // Immediate age validation
            const today = new Date();
            let age = today.getFullYear() - date.getFullYear();
            const m = today.getMonth() - date.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < date.getDate())) {
              age--;
            }
            if (age < 18) {
              setErrors(prev => ({ ...prev, dateOfBirth: 'Minimum age must be 18 years' }));
            } else {
              setErrors(prev => ({ ...prev, dateOfBirth: null }));
            }
          }
          setShowDatePicker(false);
        }}
        maxDate={new Date()}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.beige,
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
    backgroundColor: Colors.green,
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
    color: 'rgb(239, 68, 68)',
    marginTop: rs(4),
    marginBottom: rs(4),
    marginLeft: rs(2),
    fontWeight: '600'
  }
});
