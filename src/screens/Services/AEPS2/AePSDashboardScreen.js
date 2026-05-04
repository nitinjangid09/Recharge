/**
 * Screen: AePSDashboardScreen
 * Route:  /aeps/dashboard
 *
 * Main transaction interface with:
 *   - Transaction type tabs (Balance Inquiry / Mini Statement / Cash Withdrawal)
 *   - Customer data inputs (bank, mobile, Aadhaar)
 *   - Biometric scan trigger
 *   - Stats summary cards
 *   - Recent transactions list
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
  ActivityIndicator,
  Modal,
  FlatList,
  RefreshControl,
} from 'react-native';

import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../../constants/Colors';
import HeaderBar from '../../../componets/HeaderBar/HeaderBar';
import { fetchUserProfile, getWalletBalance, fetchUserWallet, fetchEBankList, initiateAepsTransaction, getAeps2Stats, getAeps2History } from '../../../api/AuthApi';
import { AlertService } from '../../../componets/Alerts/CustomAlert';
import RDService from '../../../utils/RDService';
import AEPS2Receipt from './AEPS2Receipt';
import FullScreenLoader from '../../../componets/Loader/FullScreenLoader';



const { width: SW, height: SH } = Dimensions.get("window");
const scale = (n) => Math.round((SW / 375) * n);
const rs = (n, lo = n * 0.82, hi = n * 1.28) =>
  Math.min(Math.max(scale(n), lo), hi);

// ─── Section Card ─────────────────────────────────────────────────
const SectionCard = ({ children, style }) => (
  <View style={[cardStyles.card, { backgroundColor: Colors.beige }, style]}>{children}</View>
);

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: Colors.beige,
    borderRadius: rs(20),
    padding: rs(18),
    marginBottom: rs(14),
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.30)",
  },
});

// ─── Field Input ──────────────────────────────────────────────────
const FormField = ({ label, placeholder, value, onChangeText, keyboardType, icon, editable = true, error, maxLength }) => (
  <View style={fieldStyles.wrap}>
    <Text style={fieldStyles.label}>{label}</Text>
    <View style={[fieldStyles.inputWrap, error && { borderColor: Colors.red }]}>
      {icon ? <Text style={fieldStyles.icon}>{icon}</Text> : null}
      <TextInput
        style={[fieldStyles.input, !editable && fieldStyles.disabled]}
        placeholder={placeholder}
        placeholderTextColor={Colors.gray}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType || 'default'}
        editable={editable}
        maxLength={maxLength}
      />
    </View>
    {error ? <Text style={styles.errorText}>{error}</Text> : null}
  </View>
);

const fieldStyles = StyleSheet.create({
  wrap: { marginBottom: rs(12) },
  label: { fontSize: rs(10), fontWeight: '700', color: Colors.text_secondary, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: rs(5) },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.cardbg,
    borderRadius: rs(18),
    borderWidth: 1,
    borderColor: Colors.finance_accent + "40",
    paddingHorizontal: rs(18),
    paddingVertical: rs(14),
    gap: rs(12),
  },
  icon: { fontSize: rs(14), opacity: 0.55 },
  input: { flex: 1, fontSize: rs(14), color: Colors.ink1, padding: 0 },
  disabled: { opacity: 0.5 },
});

// ─── Dropdown Field ───────────────────────────────────────────────
const DropdownField = ({ label, placeholder, value, onPress, error }) => (
  <View style={fieldStyles.wrap}>
    <Text style={fieldStyles.label}>{label}</Text>
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[dropStyles.row, error && { borderColor: Colors.red }]}
    >
      <Text style={[dropStyles.text, value && { color: Colors.ink1 }]}>
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
    borderRadius: rs(18),
    borderWidth: 1,
    borderColor: Colors.finance_accent + "40",
    paddingHorizontal: rs(18),
    paddingVertical: rs(14),
  },
  text: { fontSize: rs(14), color: Colors.slate_400 },
  arrow: { fontSize: rs(12), color: Colors.text_secondary },
});

// ─── Transaction Type Tabs ────────────────────────────────────────
const TXN_TYPES = [
  { key: 'balance', label: 'Balance Enquiry', icon: 'wallet-outline' },
  { key: 'mini', label: 'Mini Statement', icon: 'history' },
  { key: 'cash', label: 'Cash Withdrawal', icon: 'cash-minus' },
];

const TxnTypeTabs = ({ active, onChange }) => (
  <View style={tabStyles.row}>
    {TXN_TYPES.map((t) => (
      <TouchableOpacity
        key={t.key}
        activeOpacity={0.75}
        onPress={() => onChange(t.key)}
        style={[tabStyles.tab, active === t.key && tabStyles.activeTab]}
      >
        <Icon name={t.icon} size={rs(16)} color={active === t.key ? Colors.white : Colors.text_secondary} />
        <Text
          style={[tabStyles.label, active === t.key && tabStyles.activeLabel]}
          numberOfLines={2}
          textAlign="center"
        >
          {t.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const tabStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: rs(4), marginBottom: rs(18) },
  tab: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(4),
    backgroundColor: Colors.cardbg,
    borderRadius: rs(14),
    paddingVertical: rs(10),
    paddingHorizontal: rs(6),
    minHeight: rs(64),
    borderWidth: 1,
    borderColor: 'rgba(212,176,106,0.15)',
  },
  activeTab: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  label: { fontSize: rs(10), fontWeight: '700', color: Colors.text_secondary, textAlign: 'center', lineHeight: rs(13) },
  activeLabel: { color: Colors.white },
});

// ─── Recent Transaction Row ───────────────────────────────────────
const RECENT_TXNS = [
  { id: 1, type: 'Balance Inquiry', bank: 'SBI', mobile: '98XXXXXX12', amount: null, time: '2 min ago', status: 'success' },
  { id: 2, type: 'Cash Withdrawal', bank: 'PNB', mobile: '97XXXXXX88', amount: '₹2,000', time: '18 min ago', status: 'success' },
  { id: 3, type: 'Mini Statement', bank: 'BOI', mobile: '87XXXXXX45', amount: null, time: '45 min ago', status: 'success' },
  { id: 4, type: 'Cash Withdrawal', bank: 'HDFC', mobile: '99XXXXXX01', amount: '₹500', time: '1 hr ago', status: 'failed' },
];

const TxnRow = ({ item }) => (
  <View style={txnStyles.row}>
    <View style={[txnStyles.dot, { backgroundColor: item.status === 'success' ? Colors.green : Colors.red }]} />
    <View style={txnStyles.info}>
      <Text style={txnStyles.type}>{item.type}</Text>
      <Text style={txnStyles.meta}>{item.bank}  ·  {item.mobile}  ·  {item.time}</Text>
    </View>
    <View style={{ alignItems: 'flex-end' }}>
      {item.amount ? <Text style={txnStyles.amount}>{item.amount}</Text> : null}
      <View style={[txnStyles.badge, { backgroundColor: item.status === 'success' ? Colors.green + "15" : Colors.red + "15" }]}>
        <Text style={[txnStyles.badgeText, { color: item.status === 'success' ? Colors.green : Colors.red }]}>
          {item.status === 'success' ? 'Success' : 'Failed'}
        </Text>
      </View>
    </View>
  </View>
);

const txnStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: rs(12), paddingVertical: rs(10), borderBottomWidth: 0.5, borderBottomColor: Colors.input_border },
  dot: { width: rs(8), height: rs(8), borderRadius: rs(4), marginTop: rs(2) },
  info: { flex: 1 },
  type: { fontSize: rs(13), fontWeight: '600', color: Colors.black },
  meta: { fontSize: rs(11), color: Colors.text_secondary, marginTop: rs(2) },
  amount: { fontSize: rs(14), fontWeight: '700', color: Colors.black },
  badge: { borderRadius: rs(8), paddingHorizontal: rs(8), paddingVertical: rs(2), marginTop: rs(2) },
  badgeText: { fontSize: rs(10), fontWeight: '700' },
});

// ─── Item Selector Modal ──────────────────────────────────────────
const SelectorModal = ({ visible, title, items, onSelect, onClose }) => {
  const [search, setSearch] = useState('');

  useEffect(() => {
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
          <TouchableOpacity onPress={onClose}><Icon name="close" size={rs(20)} color={Colors.gray} /></TouchableOpacity>
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
        <FlatList
          style={selStyles.list}
          data={filteredItems}
          keyExtractor={(_, idx) => String(idx)}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={20}
          maxToRenderPerBatch={20}
          windowSize={10}
          renderItem={({ item }) => {
            const textLabel = typeof item === 'object' ? (item.label || JSON.stringify(item)) : String(item);
            return (
              <TouchableOpacity style={selStyles.item} onPress={() => onSelect(item)}>
                <Text style={selStyles.itemText}>{textLabel}</Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <Text style={selStyles.empty}>{items.length === 0 ? 'Loading items...' : 'No results found'}</Text>
          }
        />

      </View>
    </Modal>
  );
};

const selStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { position: 'absolute', bottom: 0, width: '100%', backgroundColor: Colors.cardbg, borderTopLeftRadius: rs(25), borderTopRightRadius: rs(25), maxHeight: '80%', paddingBottom: rs(30) },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: rs(20), borderBottomWidth: 1, borderBottomColor: Colors.input_border },
  title: { fontSize: rs(16), fontWeight: '800', color: Colors.black },
  searchWrap: { paddingHorizontal: rs(20), paddingVertical: rs(10), borderBottomWidth: 1, borderBottomColor: Colors.input_border },
  searchInput: { backgroundColor: Colors.bg_F8, borderRadius: rs(10), paddingHorizontal: rs(16), paddingVertical: rs(12), fontSize: rs(14), color: Colors.black },
  item: { padding: rs(18), borderBottomWidth: 1, borderBottomColor: 'rgb(248, 250, 252)' },
  itemText: { fontSize: rs(14), color: 'rgb(51, 65, 85)', fontWeight: '500' },
  empty: { textAlign: 'center', padding: rs(40), color: 'rgb(148, 163, 184)' }
});

// ─── Screen Component ─────────────────────────────────────────────
export default function AePSDashboardScreen({ navigation }) {
  const [txnType, setTxnType] = useState('balance');
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ volume: "0.00", count: "0", successRate: "0%", avgAmt: "0" });
  const [recentTxns, setRecentTxns] = useState([]);
  const [user, setUser] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Form State
  const [form, setForm] = useState({ mobile: '', aadhaar: '', bank: '', bankLabel: '', amount: '' });
  const [errors, setErrors] = useState({});
  const [banks, setBanks] = useState([]);
  const [selVisible, setSelVisible] = useState(false);
  const [device, setDevice] = useState('MANTRA');
  const [submitting, setSubmitting] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [txnDetails, setTxnDetails] = useState(null);
  const [reportStats, setReportStats] = useState(null);


  useEffect(() => {
    loadData(true);
    loadBanks();
  }, []);

  const onRefresh = () => {
    loadData(false);
    loadBanks();
  };

  const updateForm = (key, val) => {
    let sanitized = val;
    if (key === 'amount') {
      sanitized = val.replace(/[^0-9]/g, '');
      if (sanitized.startsWith("0")) sanitized = sanitized.replace(/^0+/, "");
    }
    setForm(f => ({ ...f, [key]: sanitized }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  const loadData = async (isInitial = false) => {
    if (isInitial) setLoading(true);
    else setRefreshing(true);
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      const headerKey = await AsyncStorage.getItem("header_key");

      const [profRes, balRes, statsRes, histRes] = await Promise.all([
        fetchUserProfile({ headerToken }),
        getWalletBalance({ headerToken, headerKey }),
        getAeps2Stats({ headerToken }),
        getAeps2History({ headerToken })
      ]);

      if (profRes?.success) setUser(profRes.data);
      if (balRes?.success) {
        setStats({
          volume: `₹${balRes.data?.todayAepsVolume || "0"}`,
          count: String(balRes.data?.todayAepsCount || "0"),
          successRate: balRes.data?.successRate || "100%",
          avgAmt: `₹${balRes.data?.avgTxnAmount || "0"}`
        });
      }
      if (statsRes?.success && statsRes.data) {
        setReportStats(statsRes.data);
      }

      if (histRes?.success && Array.isArray(histRes.data)) {
        const mapped = histRes.data.slice(0, 8).map(t => ({
          id: t._id,
          type: t.serviceType || "AEPS Transaction",
          bank: t.bankName || "AEPS 2",
          mobile: t.referenceId?.slice(-10) || "---",
          time: new Date(t.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          amount: t.amount > 0 ? `₹${t.amount}` : null,
          status: (t.status || 'FAILED').toLowerCase()
        }));
        setRecentTxns(mapped);
      } else {
        setRecentTxns([]);
      }
    } catch (error) {
      console.log("Load AEPS Data Error:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadBanks = async () => {
    try {
      const hToken = await AsyncStorage.getItem("header_token");
      // Switching to fetchEBankList (AEPS2/ECO) to get correct bankIds for transactions
      const res = await fetchEBankList({ headerToken: hToken });
      if (res.success || Array.isArray(res.data)) {
        const mapped = (res.data || []).map(b => ({
          label: b.name || b.bankName,
          value: b.bankId || b._id || b.id
        }));
        setBanks(mapped);
      }
    } catch (e) {
      console.log("Load Banks error:", e);
    }
  };

  const validate = () => {
    const e = {};
    if (!form.mobile) e.mobile = 'Please enter mobile number';
    else if (form.mobile.length !== 10) e.mobile = 'Mobile must be 10 digits';

    if (!form.aadhaar) e.aadhaar = 'Please enter Aadhaar number';
    else if (form.aadhaar.replace(/\s/g, '').length !== 12) e.aadhaar = 'Aadhaar must be 12 digits';

    if (!form.bank) e.bank = 'Please select a bank';

    if (txnType === 'cash') {
      if (!form.amount) e.amount = 'Please enter amount';
      else if (parseInt(form.amount) < 100) e.amount = 'Min withdrawal ₹100';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleProceed = async () => {
    console.log("🚀 [AEPS2] handleProceed pressed", { txnType, form });
    if (!validate()) return;


    setSubmitting(true);
    try {
      // 1. Check if RD Service is installed
      const isInstalled = await RDService.isInstalled(device);
      if (!isInstalled) {
        AlertService.showAlert({
          type: "warning",
          title: "RD Service Missing",
          message: `Please install the RD Service app for ${RDService.getDeviceLabel(device)}.`,
          onConfirm: () => RDService.openInstallPage(device),
        });
        setSubmitting(false);
        return;
      }

      // 1.1 Check Device Connection
      const conn = await RDService.checkConnection(device);
      if (!conn.success) {
        AlertService.showAlert({
          type: "warning",
          title: "Device Not Ready",
          message: `${conn.message || "The device is not connected or not ready"}. Please check your OTG connection and ensure the RD service is running.`
        });
        setSubmitting(false);
        return;
      }

      // 2. Capture Biometric
      const pidOptString = '<PidOptions ver="1.0">'
        + '<Opts fCount="1" fType="2" iCount="0" pCount="0" format="0" pidVer="2.0" timeout="20000" otp="" posh="UNKNOWN" env="P" />'
        + '<Demo></Demo>'
        + '<CustOpts></CustOpts>'
        + '</PidOptions>';

      const pidDataXml = await RDService.capture(device, pidOptString);
      if (!pidDataXml) {
        throw new Error("No biometric data received from scanner.");
      }

      // 3. Prepare Payload
      const headerToken = await AsyncStorage.getItem("header_token");
      const idempotencyKey = `TXN_${Date.now()}`;

      const payload = {
        serviceType: txnType === 'balance' ? 'inquiry' : txnType === 'mini' ? 'statement' : 'withdraw',
        latitude: "26.889925350441352", // Using requested static coords or dynamic if available
        longitude: "75.73839758240074",
        sourceIp: "122.167.10.217", // Usually fetched from server or public API
        aadhaar: form.aadhaar.replace(/\s/g, ''),
        bankId: form.bank,
        amount: txnType === 'cash' ? parseInt(form.amount) : 0,
        pidData: pidDataXml.startsWith('<?xml') ? pidDataXml : `<?xml version="1.0"?>${pidDataXml}`
      };

      // 4. Submit Transaction
      const res = await initiateAepsTransaction({ data: payload, headerToken, idempotencyKey });
      console.log("✅ [AEPS2] Transaction Response:", res);


      if (res.success || res.status === "SUCCESS") {
        setReceiptData(res);
        setTxnDetails({
          mobile: form.mobile,
          aadhaar: form.aadhaar,
          bankName: form.bankLabel,
          amount: form.amount
        });
        setReceiptVisible(true);

        // Clear amount if it was cash withdrawal
        if (txnType === 'cash') updateForm('amount', '');
        loadData(); // Refresh stats
      } else {
        AlertService.showAlert({
          type: 'error',
          title: 'Transaction Failed',
          message: res.message || 'Transaction could not be completed.'
        });
      }


    } catch (error) {
      console.log("AEPS Transaction Error:", error);
      AlertService.showAlert({
        type: 'error',
        title: 'Error',
        message: error.message || 'Something went wrong during the transaction.'
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <HeaderBar
        title="AePS Services Dashboard"
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors.primary]}
            tintColor={Colors.primary}
          />
        }
      >
        {/* ── Terminal Card ── */}
        <SectionCard>
          <View style={styles.terminalHeader}>
            <View>
              <View style={styles.terminalTitleRow}>
                <Text style={styles.terminalTitle}>AEPS TERMINAL</Text>
              </View>
              <Text style={styles.terminalSub}>SECURE TRANSACTION ENGINE</Text>
            </View>
          </View>

          <TxnTypeTabs active={txnType} onChange={setTxnType} />

          {reportStats && (
            <View style={styles.statsStrip}>
              <View style={[styles.statBox, { borderLeftColor: Colors.primary }]}>
                <Text style={styles.statVal}>{reportStats.total?.count || 0}</Text>
                <Text style={styles.statLbl}>TOTAL</Text>
              </View>
              <View style={[styles.statBox, { borderLeftColor: Colors.green }]}>
                <Text style={styles.statVal}>{reportStats.success?.count || 0}</Text>
                <Text style={styles.statLbl}>SUCCESS</Text>
              </View>
              <View style={[styles.statBox, { borderLeftColor: Colors.gold }]}>
                <Text style={styles.statVal}>{reportStats.pending?.count || 0}</Text>
                <Text style={styles.statLbl}>PENDING</Text>
              </View>
              <View style={[styles.statBox, { borderLeftColor: Colors.red }]}>
                <Text style={styles.statVal}>{reportStats.failed?.count || 0}</Text>
                <Text style={styles.statLbl}>FAILED</Text>
              </View>
            </View>
          )}

          <DropdownField
            label="Select Bank"
            placeholder="Choose customer's bank"
            value={form.bankLabel}
            onPress={() => setSelVisible(true)}
            error={errors.bank}
          />
          <View style={{ gap: rs(12) }}>
            <View style={{ flex: 1.2 }}>
              <FormField
                label="Mobile Number"
                placeholder="Customer Mobile"
                keyboardType="numeric"
                icon="📱"
                value={form.mobile}
                onChangeText={(v) => updateForm('mobile', v.replace(/\D/g, '').slice(0, 10))}
                error={errors.mobile}
                maxLength={10}
              />
            </View>
            <View style={{ flex: 1.8 }}>
              <FormField
                label="Aadhaar Number"
                placeholder="XXXX XXXX XXXX"
                keyboardType="numeric"
                icon="🪪"
                value={form.aadhaar}
                onChangeText={(v) => updateForm('aadhaar', v.replace(/\D/g, '').slice(0, 12))}
                error={errors.aadhaar}
                maxLength={12}
              />
            </View>
          </View>

          {txnType === 'cash' && (
            <FormField
              label="Withdrawal Amount"
              placeholder="Min. ₹100 - Max ₹10,000"
              keyboardType="numeric"
              icon="₹"
              value={form.amount}
              onChangeText={(v) => updateForm('amount', v.replace(/\D/g, ''))}
              error={errors.amount}
            />
          )}

          <Text style={fieldStyles.label}>RD SERVICE DEVICE</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: rs(18) }}>
            <View style={styles.deviceGrid}>
              {RDService.DEVICE_LIST.map((d) => (
                <TouchableOpacity
                  key={d.value}
                  onPress={() => setDevice(d.value)}
                  style={[styles.chip, device === d.value && styles.chipActive]}
                >
                  <Text style={[styles.chipText, device === d.value && styles.chipTextActive]}>{d.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          <TouchableOpacity
            activeOpacity={0.88}
            onPress={handleProceed}
            style={[styles.scanBtn, (submitting || !form.bank || !form.aadhaar || !form.mobile) && styles.disabledBtn]}
            disabled={submitting || !form.bank || !form.aadhaar || !form.mobile}
          >
            {submitting ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <>
                <Icon name="fingerprint" size={rs(20)} color={(submitting || !form.bank || !form.aadhaar || !form.mobile) ? Colors.slate_500 : Colors.white} />
                <Text style={[styles.scanBtnText, (submitting || !form.bank || !form.aadhaar || !form.mobile) && { color: Colors.slate_500 }]}>PROCEED TO SCAN</Text>
              </>
            )}
          </TouchableOpacity>
        </SectionCard>

        {/* ── Recent Transactions ── */}
        <SectionCard style={{ marginTop: 4 }}>
          <View style={styles.recentHeader}>
            <Text style={styles.recentTitle}>Recent Transactions</Text>
            <TouchableOpacity>
              <Text style={styles.viewAll}>View All →</Text>
            </TouchableOpacity>
          </View>
          {recentTxns.length > 0 ? (
            recentTxns.map((t) => <TxnRow key={t.id} item={t} />)
          ) : (
            <View style={{ paddingVertical: 20, alignItems: 'center' }}>
              <Text style={{ fontSize: rs(12), color: Colors.text_secondary }}>No recent transactions found</Text>
            </View>
          )}
        </SectionCard>

        <View style={{ height: rs(30) }} />
      </ScrollView>

      <FullScreenLoader visible={loading} label="Loading AEPS Services..." />

      <SelectorModal
        visible={selVisible}
        title="Select Bank"
        items={banks}
        onSelect={(item) => {
          updateForm('bank', item.value);
          updateForm('bankLabel', item.label);
          setSelVisible(false);
        }}
        onClose={() => setSelVisible(false)}
      />

      {/* ─── SUCCESS RECEIPT MODAL ─── */}
      <Modal
        visible={receiptVisible}
        animationType="slide"
        onRequestClose={() => setReceiptVisible(false)}
      >
        <AEPS2Receipt
          response={receiptData}

          details={txnDetails}
          type={txnType === 'balance' ? 'Balance Enquiry' : txnType === 'mini' ? 'Mini Statement' : 'Cash Withdrawal'}
          onClose={() => {
            setReceiptVisible(false);
            setReceiptData(null);
            setTxnDetails(null);
          }}
        />
      </Modal>
    </SafeAreaView>

  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.beige },
  scroll: { flex: 1 },
  content: { paddingHorizontal: rs(16), paddingBottom: rs(10), paddingTop: rs(12) },

  terminalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: rs(16) },
  terminalTitleRow: { flexDirection: 'row', alignItems: 'center', gap: rs(8) },
  terminalTitle: { fontSize: rs(16), fontWeight: '700', color: Colors.black },
  terminalSub: { fontSize: rs(10), color: Colors.text_secondary, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: rs(2) },

  scanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: rs(10),
    backgroundColor: Colors.primary,
    borderRadius: rs(18),
    paddingVertical: rs(16),
    marginTop: rs(8),
  },
  scanBtnText: { fontSize: rs(14), fontWeight: '800', color: Colors.white, letterSpacing: 0.5 },

  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: rs(10) },
  recentTitle: { fontSize: rs(15), fontWeight: '700', color: Colors.black },
  viewAll: { fontSize: rs(12), color: Colors.kyc_accent, fontWeight: '600' },

  errorText: {
    fontSize: rs(10),
    color: 'rgb(239, 68, 68)',
    marginTop: rs(4),
    marginBottom: rs(4),
    marginLeft: rs(2),
    fontWeight: '600'
  },
  deviceGrid: { flexDirection: 'row', gap: rs(8), marginTop: rs(4) },
  chip: {
    flex: 1,
    minHeight: rs(42),
    borderRadius: rs(12),
    backgroundColor: Colors.cardbg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: rs(4),
    paddingHorizontal: rs(4),
    borderWidth: 1,
    borderColor: 'rgba(212,176,106,0.2)',
    minWidth: rs(80),
  },
  chipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary
  },
  chipText: {
    fontSize: rs(10),
    fontWeight: '400',
    color: Colors.text_secondary,
    textAlign: 'center',
    lineHeight: rs(13),
  },
  chipTextActive: { color: Colors.white },
  disabledBtn: { backgroundColor: Colors.gold },

  statsStrip: {
    flexDirection: 'row',
    gap: rs(6),
    marginBottom: rs(18),
  },
  statBox: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: rs(10),
    paddingVertical: rs(8),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212,176,106,0.15)',
    borderLeftWidth: 3,
  },
  statVal: {
    fontSize: rs(13),
    fontWeight: '800',
    color: Colors.black,
  },
  statLbl: {
    fontSize: rs(7),
    fontWeight: '700',
    color: Colors.text_secondary,
    marginTop: rs(2),
  },
});
