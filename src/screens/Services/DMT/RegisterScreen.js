import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../../constants/Colors';

// ─── Responsive Scaling ──────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get("window");
const scale = (n) => Math.round((SW / 375) * n);
const rs = (n, lo = n * 0.8, hi = n * 1.2) => Math.min(Math.max(scale(n), lo), hi);

// ─── Theme Constants ─────────────────────────────────────────────────────────
const Spacing = { xl: rs(20), lg: rs(16), md: rs(12), sm: rs(8) };
const Radius = { xl: rs(24), lg: rs(16), md: rs(12), sm: rs(8) };
const FontSize = { title: rs(22), lg: rs(18), md: rs(16), base: rs(14), sm: rs(12) };

// ─── UI Components ───────────────────────────────────────────────────────────
const SectionTitle = ({ title }) => (
  <Text style={{
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: '#64748B', 
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    marginBottom: rs(12),
    marginTop: rs(8)
  }}>
    {title}
  </Text>
);

const Divider = () => (
  <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: rs(16) }} />
);

const BackButton = ({ onPress }) => (
  <TouchableOpacity onPress={onPress} style={{ padding: rs(4) }}>
    <Text style={{ fontSize: rs(20), color: Colors.black }}>←</Text>
  </TouchableOpacity>
);

const FieldInput = ({ label, placeholder, value, onChangeText, keyboardType, error, maxLength }) => (
  <View style={{ marginBottom: rs(16) }}>
    <Text style={{ fontSize: rs(12), fontWeight: '700', color: error ? Colors.red : '#64748B', marginBottom: rs(6), textTransform: 'uppercase' }}>{label}</Text>
    <View style={{ 
      backgroundColor: '#F8FAFC', 
      borderRadius: Radius.md, 
      borderWidth: 1, 
      borderColor: error ? Colors.red : '#E2E8F0', 
      paddingHorizontal: rs(16), 
      paddingVertical: rs(12) 
    }}>
      <TextInput
        style={{ fontSize: rs(16), color: '#0F172A', padding: 0 }}
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        maxLength={maxLength}
      />
    </View>
    {error ? <Text style={{ fontSize: rs(10), color: Colors.red, marginTop: rs(4), fontWeight: '600' }}>{error}</Text> : null}
  </View>
);

const PrimaryButton = ({ title, onPress, loading, icon, style }) => (
  <TouchableOpacity
    activeOpacity={0.8}
    onPress={onPress}
    disabled={loading}
    style={[{
      backgroundColor: Colors.primary,
      borderRadius: Radius.lg,
      paddingVertical: rs(16),
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: rs(10)
    }, style]}
  >
    <Text style={{ fontSize: rs(16), fontWeight: '800', color: Colors.white }}>
      {loading ? 'PROCESSING...' : title}
    </Text>
    {!loading && icon && <Text style={{ color: Colors.white, fontSize: rs(16) }}>{icon}</Text>}
  </TouchableOpacity>
);

const GhostButton = ({ title, onPress, style }) => (
  <TouchableOpacity
    activeOpacity={0.6}
    onPress={onPress}
    style={[{ paddingVertical: rs(12), alignItems: 'center' }, style]}
  >
    <Text style={{ fontSize: rs(15), fontWeight: '600', color: '#64748B' }}>{title}</Text>
  </TouchableOpacity>
);

import { TextInput } from 'react-native';

const BANKS = ['Select Bank', 'Axis Bank', 'HDFC Bank', 'SBI', 'ICICI Bank', 'Kotak Mahindra', 'Punjab National Bank'];

const BankPicker = ({ value, onSelect, error }) => {
  const [open, setOpen] = useState(false);

  return (
    <View style={{ marginBottom: rs(16) }}>
      <Text style={{ fontSize: rs(12), fontWeight: '700', color: error ? Colors.red : '#64748B', marginBottom: rs(6), textTransform: 'uppercase' }}>Bank Name</Text>
      <TouchableOpacity
        style={[styles.pickerBtn, error && { borderColor: Colors.red }]}
        onPress={() => setOpen(!open)}
        activeOpacity={0.8}
      >
        <Text style={[styles.pickerText, value === 'Select Bank' && { color: '#94A3B8' }]}>
          {value}
        </Text>
        <Text style={styles.chevron}>{open ? '▲' : '▼'}</Text>
      </TouchableOpacity>
      {error ? <Text style={{ fontSize: rs(10), color: Colors.red, marginTop: rs(4), fontWeight: '600' }}>{error}</Text> : null}
      {open && (
        <View style={styles.dropDown}>
          {BANKS.filter(b => b !== 'Select Bank').map(bank => (
            <TouchableOpacity
              key={bank}
              style={styles.dropItem}
              onPress={() => { onSelect(bank); setOpen(false); }}
              activeOpacity={0.7}
            >
              <Text style={[styles.dropItemText, value === bank && styles.dropItemActive]}>
                {bank}
              </Text>
              {value === bank && <Text style={{ color: Colors.primary }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
};

const RegisterScreen = ({ navigation }) => {
  const [bank, setBank] = useState('Select Bank');
  const [ifsc, setIfsc] = useState('');
  const [holderName, setHolderName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    let newErrors = {};
    if (bank === 'Select Bank') newErrors.bank = 'Please select a bank';
    if (!ifsc) newErrors.ifsc = 'IFSC code is required';
    else if (ifsc.length < 11) newErrors.ifsc = 'Enter a valid 11-digit IFSC';
    
    if (!holderName) newErrors.holderName = 'Account holder name is required';
    if (!accountNumber) newErrors.accountNumber = 'Account number is required';
    
    if (!mobile) newErrors.mobile = 'Mobile number is required';
    else if (mobile.length !== 10) newErrors.mobile = 'Enter a valid 10-digit number';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleConfirm = () => {
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      Alert.alert('Success', 'Beneficiary registered successfully!', [
        { text: 'OK', onPress: () => navigation?.replace('DMTDashboard') }
      ]);
    }, 1800);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.bg || '#F1F5F9' }}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
      <View style={styles.header}>
        <BackButton onPress={() => navigation?.goBack()} />
        <View style={{ flex: 1 }}>
          <Text style={styles.pageTitle}>Beneficiary{'\n'}Registration</Text>
          <Text style={styles.pageSub}>Onboard a new bank account to your remitter profile</Text>
        </View>
      </View>

      <View style={styles.formCard}>
        <SectionTitle title="Destination Bank" />
        <BankPicker value={bank} onSelect={setBank} error={errors.bank} />

        <FieldInput
          label="IFSC Code"
          placeholder="EX: UTIB0002878"
          value={ifsc}
          onChangeText={v => setIfsc(v.toUpperCase())}
          error={errors.ifsc}
          maxLength={11}
        />

        <Divider />
        <SectionTitle title="Account Identity" />
        <FieldInput
          label="Holder Name"
          placeholder="Enter Account Name"
          value={holderName}
          onChangeText={setHolderName}
          error={errors.holderName}
        />
        <FieldInput
          label="Account Number"
          placeholder="Enter Account Number"
          value={accountNumber}
          onChangeText={setAccountNumber}
          keyboardType="numeric"
          error={errors.accountNumber}
          maxLength={18}
        />

        <Divider />
        <SectionTitle title="Verification Details" />
        <FieldInput
          label="Mobile Number"
          placeholder="Enter Contact Number"
          value={mobile}
          onChangeText={setMobile}
          keyboardType="phone-pad"
          error={errors.mobile}
          maxLength={10}
        />
      </View>

      <View style={styles.ctaWrap}>
        <PrimaryButton
          title="Confirm Registration"
          onPress={handleConfirm}
          loading={loading}
          icon="✓"
        />
        <GhostButton
          title="Cancel"
          onPress={() => navigation?.goBack()}
          style={{ marginTop: 10 }}
        />
      </View>
    </ScrollView>
  </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg || '#F1F5F9' },
  content: { paddingBottom: 50 },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: 4,
  },
  pageTitle: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.black,
    lineHeight: 28,
  },
  pageSub: {
    fontSize: FontSize.base,
    color: '#64748B',
    marginTop: 4,
  },
  formCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 16,
    marginHorizontal: Spacing.xl,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  fieldWrapper: { marginBottom: 10 },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: '800',
    color: '#64748B',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 5,
  },
  pickerBtn: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  pickerText: { fontSize: FontSize.md, color: Colors.black, flex: 1 },
  chevron: { fontSize: 10, color: '#64748B' },
  dropDown: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  dropItem: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  dropItemText: { fontSize: FontSize.md, color: Colors.black },
  dropItemActive: { fontWeight: '700', color: Colors.primary },
  ctaWrap: { paddingHorizontal: Spacing.xl, marginTop: 14 },
});

export default RegisterScreen;
