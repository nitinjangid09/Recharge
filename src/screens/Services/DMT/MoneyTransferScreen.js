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

const SecureNote = ({ label }) => (
  <View style={{ flexDirection: 'row', alignItems: 'center', gap: rs(6), marginVertical: rs(8), justifyContent: 'center' }}>
    <Text style={{ fontSize: rs(10), color: '#64748B' }}>🔒 {label}</Text>
  </View>
);

const FeatureItem = ({ icon, label, sub }) => (
  <View style={styles.featureItem}>
    <View style={styles.featureIcon}>
      <Text style={{ fontSize: 16 }}>{icon}</Text>
    </View>
    <Text style={styles.featureLabel}>{label}</Text>
    <Text style={styles.featureSub}>{sub}</Text>
  </View>
);

const MoneyTransferScreen = ({ navigation }) => {
  const [mobile, setMobile] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = () => {
    if (!mobile) {
      setError('Mobile number is required');
      return;
    }
    if (mobile.length !== 10) {
      setError('Enter a valid 10-digit number');
      return;
    }
    
    setError('');
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      // Navigate to KYC or Dashboard
      navigation?.navigate('DMTKYC');
    }, 1500);
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
          <Text style={styles.pageTitle}>Money Transfer</Text>
          <Text style={styles.pageSub}>Send money securely to any bank</Text>
        </View>

        {/* Remitter Card */}
        <View style={styles.remitterCard}>
          {/* Card Header */}
          <View style={styles.cardHeader}>
            <View style={styles.cardIconWrap}>
              <Text style={{ fontSize: 18 }}>📱</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Remitter Login</Text>
              <Text style={styles.cardSub}>CUSTOMER VERIFICATION</Text>
            </View>
          </View>

          <FieldInput
            label="Customer Contact"
            placeholder="Enter Mobile Number"
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            error={error}
            maxLength={10}
          />

          <PrimaryButton
            title="Verify & Proceed"
            onPress={handleVerify}
            loading={loading}
            icon="→"
          />

          <SecureNote label="Secure Transaction Processing" />
        </View>

        {/* Feature Row */}
        <View style={styles.featureRow}>
          <FeatureItem icon="⚡" label="INSTANT" sub="Real-time settlements" />
          <FeatureItem icon="💸" label="LOW FEE" sub="Competitive rates" />
          <FeatureItem icon="🔒" label="SAFE" sub="End-to-end encrypted" />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg || '#F1F5F9' },
  content: { paddingBottom: 40 },
  header: { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xl, paddingBottom: 4 },
  pageTitle: { fontSize: FontSize.title, fontWeight: '800', color: Colors.black, lineHeight: 26 },
  pageSub: { fontSize: FontSize.base, color: '#64748B', marginTop: 3 },
  remitterCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.xl,
    padding: 20,
    marginHorizontal: Spacing.xl,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 18 },
  cardIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: { fontSize: FontSize.lg, fontWeight: '800', color: Colors.black },
  cardSub: {
    fontSize: 9,
    color: '#64748B',
    letterSpacing: 0.8,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: 1,
  },
  featureRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: Spacing.xl, marginTop: 20, gap: 6 },
  featureItem: { flex: 1, alignItems: 'center' },
  featureIcon: {
    width: 40,
    height: 40,
    borderRadius: 13,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  featureLabel: { fontSize: 9, fontWeight: '800', color: Colors.black, letterSpacing: 0.7, textTransform: 'uppercase' },
  featureSub: { fontSize: 9, color: '#64748B', marginTop: 2, textAlign: 'center', lineHeight: 13 },
});

export default MoneyTransferScreen;
