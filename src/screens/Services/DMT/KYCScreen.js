import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
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

import { TextInput } from 'react-native';

// ─── UI Components ───────────────────────────────────────────────────────────
const FieldInput = ({ label, placeholder, value, onChangeText, keyboardType, error, maxLength }) => (
  <View style={{ marginBottom: rs(16) }}>
    <Text style={{ fontSize: rs(12), fontWeight: '700', color: error ? Colors.red : '#64748B', marginBottom: rs(6), textTransform: 'uppercase' }}>{label}</Text>
    <View style={{ 
      backgroundColor: '#F8FAFC', 
      borderRadius: Radius.md, 
      borderWidth: 1, 
      borderColor: error ? Colors.red : '#E2E8F0', 
      paddingHorizontal: rs(12), 
      paddingVertical: rs(10) 
    }}>
      <TextInput
        style={{ fontSize: rs(14), color: '#0F172A', padding: 0 }}
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

const SecureNote = ({ label }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(6), marginVertical: rs(8), justifyContent: 'center' }}>
    <Text style={{ fontSize: rs(10), color: '#64748B' }}>🔒 {label}</Text>
  </View>
);

const InfoChip = ({ label, value }) => (
  <View style={styles.infoChip}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue}>{value}</Text>
  </View>
);

const KYCScreen = ({ navigation }) => {
  const [mobile, setMobile] = useState('');
  const [aadhaar, setAadhaar] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    let newErrors = {};
    if (!mobile) newErrors.mobile = 'Mobile number is required';
    else if (mobile.length !== 10) newErrors.mobile = 'Enter a valid 10-digit number';

    if (!aadhaar) newErrors.aadhaar = 'Aadhaar number is required';
    else if (aadhaar.length !== 12) newErrors.aadhaar = 'Enter a valid 12-digit Aadhaar';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleValidate = () => {
    if (!validate()) return;
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      navigation?.navigate('DMTDashboard');
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
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.pageTitle}>DMT KYC</Text>
          <Text style={styles.pageSub}>Verify your identity to proceed</Text>
        </View>

        {/* KYC Form Card */}
        <View style={styles.kycCard}>
          {/* Icon */}
          <View style={styles.iconWrap}>
            <Text style={{ fontSize: 22 }}>🛡️</Text>
          </View>

          <Text style={styles.kycTitle}>Money Transfer KYC Form</Text>
          <Text style={styles.kycSub}>IDENTITY AUTHENTICATION</Text>

          <View style={styles.fieldRow}>
            <View style={{ flex: 1 }}>
              <FieldInput
                label="Mobile No"
                placeholder="Mobile Number"
                value={mobile}
                onChangeText={setMobile}
                keyboardType="phone-pad"
                error={errors.mobile}
                maxLength={10}
              />
            </View>
            <View style={{ flex: 1 }}>
              <FieldInput
                label="Aadhaar No"
                placeholder="Aadhaar Number"
                value={aadhaar}
                onChangeText={setAadhaar}
                keyboardType="numeric"
                error={errors.aadhaar}
                maxLength={12}
              />
            </View>
          </View>

          <PrimaryButton
            title="Mobile Validate"
            onPress={handleValidate}
            loading={loading}
            icon="→"
          />

          <SecureNote label="Instant Identity Verification" />

          {/* Info Chips */}
          <View style={styles.infoRow}>
            <InfoChip
              label="DOCUMENTS"
              value="Keep Physical Aadhaar card ready for validation"
            />
            <InfoChip
              label="OTP VERIFICATION"
              value="An OTP will be sent to your Aadhaar-linked number"
            />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg || '#F1F5F9' },
  content: { paddingBottom: 40 },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    paddingBottom: 4,
  },
  pageTitle: {
    fontSize: FontSize.title,
    fontWeight: '800',
    color: Colors.black,
    lineHeight: 26,
  },
  pageSub: {
    fontSize: FontSize.base,
    color: '#64748B',
    marginTop: 3,
  },
  kycCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 20,
    marginHorizontal: Spacing.xl,
    marginTop: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,176,106,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  kycTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.black,
    marginBottom: 2,
  },
  kycSub: {
    fontSize: 10,
    color: '#64748B',
    letterSpacing: 0.8,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 18,
  },
  fieldRow: { flexDirection: 'row', gap: 10 },
  infoRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  infoChip: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '600',
    lineHeight: 15,
  },
});

export default KYCScreen;
