import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import Colors from '../constants/Colors';
import Fonts from '../constants/Fonts';
import { getWalletBalance, transferAepsToMainWallet, getWalletHistory } from '../api/AuthApi';
import CustomAlert from '../screens/CustomAlert';

// ─── helpers ────────────────────────────────────────────────────────────────
const { width: SCREEN_W } = Dimensions.get('window');
const isSmall = SCREEN_W < 360;
const scale = (n) => Math.round(n * (SCREEN_W / 390));

// ─── component ──────────────────────────────────────────────────────────────
const WalletTransfer = ({ navigation }) => {
  const [amount, setAmount] = useState('');
  const [aepsBalance, setAepsBalance] = useState('0');
  const [mainBalance, setMainBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(true);
  const [isTransferring, setIsTransferring] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertAction, setAlertAction] = useState(null);

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // ── alert helper ──────────────────────────────────────────────────────────
  const showAlert = (title, message, action = null) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertAction(() => action);
    setAlertVisible(true);
  };

  // ── data fetchers ─────────────────────────────────────────────────────────
  const fetchBalance = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem('header_token');
      if (!token) return;
      const response = await getWalletBalance({ headerToken: token });
      if (response?.success && response?.data) {
        setAepsBalance(response.data.aepsWallet?.toString() || '0');
        setMainBalance(response.data.mainWallet?.toString() || '0');
      }
    } catch (err) {
      console.log('Error fetching wallet balance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWalletHistory = async () => {
    try {
      setLoadingHistory(true);
      const token = await AsyncStorage.getItem('header_token');
      if (!token) return;
      const response = await getWalletHistory({ headerToken: token, limit: 10 });
      setHistory(response?.success && response?.data ? response.data : []);
    } catch (err) {
      console.log('Error fetching history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const refreshAll = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchBalance(), fetchWalletHistory()]);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    fetchBalance();
    fetchWalletHistory();
  }, []);

  // ── transfer ──────────────────────────────────────────────────────────────
  const handleTransfer = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      showAlert('Invalid Amount', 'Please enter a valid amount to transfer.');
      return;
    }
    try {
      setIsTransferring(true);
      const token = await AsyncStorage.getItem('header_token');
      if (!token) {
        showAlert('Error', 'Authentication token missing.');
        return;
      }
      const response = await transferAepsToMainWallet({ amount, headerToken: token });
      if (response?.success) {
        showAlert('Success', response.message || 'AEPS to main wallet transfer successful.');
        setAmount('');
        await fetchBalance();
        await fetchWalletHistory();
      } else {
        showAlert('Transfer Failed', response?.message || 'Could not complete the transfer.');
      }
    } catch {
      showAlert('Error', 'A network or server error occurred.');
    } finally {
      setIsTransferring(false);
    }
  };

  // ── history item ──────────────────────────────────────────────────────────
  const HistoryItem = ({ item, index }) => {
    const isCredit = item.type === 'credit';
    const color = isCredit ? Colors.finance_success : '#EF4444';
    const bgColor = isCredit ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)';

    return (
      <View style={styles.historyCard}>
        {/* Icon circle */}
        <View style={[styles.historyIconCircle, { backgroundColor: bgColor }]}>
          <Icon
            name={isCredit ? 'arrow-bottom-left-thick' : 'arrow-top-right-thick'}
            size={scale(16)}
            color={color}
          />
        </View>

        {/* Middle info */}
        <View style={styles.historyMid}>
          <Text style={styles.historyDesc} numberOfLines={1}>
            {item.description || 'Wallet Transfer'}
          </Text>
          <Text style={styles.historyRef} numberOfLines={1}>
            Ref: {item.referenceId}
          </Text>
          <Text style={styles.historyDate}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>

        {/* Amount + balance */}
        <View style={styles.historyRight}>
          <Text style={[styles.historyAmount, { color }]}>
            {isCredit ? '+' : '-'}₹{item.amount}
          </Text>
          <Text style={styles.historyClosingBal}>Bal: ₹{item.closingBalance}</Text>
        </View>
      </View>
    );
  };

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.black} />

      {/* ── HEADER ── */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={scale(24)} color="#f4f5f8" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Wallet Transfer</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refreshAll}
            tintColor={Colors.finance_accent}
            colors={[Colors.finance_accent]}
          />
        }
      >
        {/* ── SUBTITLE ── */}
        <Text style={styles.subTitle}>
          Seamlessly move funds from AEPS Wallet to Main Wallet
        </Text>

        {/* ══════════════════════════════════════════════════════════
            CARD 1 – TRANSFER FLOW  (unchanged)
        ══════════════════════════════════════════════════════════ */}
        <LinearGradient
          colors={['#2C2C2C', '#111111']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardWrapper}
        >
          <View style={styles.flowCardHeader}>
            <Text style={styles.cardTitle}>Transfer Flow</Text>
            <View style={styles.activeBadge}>
              <View style={[styles.activeDot, { backgroundColor: Colors.finance_success }]} />
              <Text style={[styles.activeBadgeText, { color: Colors.finance_success }]}>ACTIVE</Text>
            </View>
          </View>

          <View style={styles.walletsRow}>
            {/* AEPS Wallet */}
            <LinearGradient
              colors={['#242424', '#0A0A0A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.walletBox}
            >
              <View style={styles.walletTagPill}>
                <Icon name="fingerprint" size={12} color={Colors.finance_accent} />
                <Text style={styles.walletTagPillTxt}>AEPS WALLET</Text>
              </View>
              <View style={{ marginTop: 14 }}>
                <Text style={styles.balLabel}>Balance</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <Text style={styles.rupeeSymbol}>₹</Text>
                  <Text style={styles.walletAmount} numberOfLines={1} adjustsFontSizeToFit>
                    {isLoading ? '...' : aepsBalance}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            {/* Separator */}
            <View style={styles.swapSeparator}>
              <View style={styles.swapSeparatorLine} />
              <View style={styles.swapSeparatorIconWrap}>
                <Icon name="swap-horizontal" size={14} color={Colors.finance_accent} />
              </View>
              <View style={styles.swapSeparatorLine} />
            </View>

            {/* Main Wallet */}
            <LinearGradient
              colors={['#242424', '#0A0A0A']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.walletBox}
            >
              <View style={[styles.walletTagPill, { backgroundColor: 'rgba(212,176,106,0.15)' }]}>
                <Icon name="wallet-outline" size={12} color={Colors.finance_accent} />
                <Text style={[styles.walletTagPillTxt, { color: Colors.finance_accent }]}>MAIN WALLET</Text>
              </View>
              <View style={{ marginTop: 14 }}>
                <Text style={styles.balLabel}>Balance</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                  <Text style={styles.rupeeSymbol}>₹</Text>
                  <Text style={styles.walletAmount} numberOfLines={1} adjustsFontSizeToFit>
                    {isLoading ? '...' : mainBalance}
                  </Text>
                </View>
              </View>
            </LinearGradient>
          </View>

          <View style={styles.flowCardFooter}>
            <View style={styles.footerItem}>
              <View style={[styles.footerDot, { backgroundColor: Colors.finance_accent }]} />
              <Text style={styles.footerText}>INSTANT SETTLEMENT</Text>
            </View>
            <View style={styles.footerItem}>
              <View style={[styles.footerDot, { backgroundColor: Colors.finance_success }]} />
              <Text style={styles.footerText}>ZERO CHARGES</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ══════════════════════════════════════════════════════════
            CARD 2 – TRANSFER FUNDS  (unchanged)
        ══════════════════════════════════════════════════════════ */}
        <LinearGradient
          colors={['#2C2C2C', '#111111']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.cardWrapper, { marginTop: 20 }]}
        >
          <View style={styles.cardHeaderRow}>
            <View>
              <Text style={styles.cardTitle}>Transfer Funds</Text>
              <Text style={styles.cardSubtitle}>AEPS → MAIN WALLET</Text>
            </View>
          </View>

          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>AMOUNT (₹)</Text>
            <View style={styles.inputWrapper}>
              <View style={styles.currencyBox}>
                <Text style={styles.currencySymbol}>₹</Text>
              </View>
              <TextInput
                style={styles.amountInput}
                placeholder="0.00"
                placeholderTextColor="rgba(255,255,255,0.3)"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.executeBtnWrap}
            onPress={handleTransfer}
            disabled={isTransferring}
          >
            <LinearGradient
              colors={isTransferring ? ['#9CA3AF', '#6B7280'] : ['#E5C37A', '#C79A3F']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.executeButton}
            >
              {isTransferring ? (
                <ActivityIndicator color="#111827" size="small" style={styles.boltIcon} />
              ) : (
                <Icon name="lightning-bolt" size={16} color="#111827" style={styles.boltIcon} />
              )}
              <Text style={styles.executeButtonText}>
                {isTransferring ? 'PROCESSING...' : 'EXECUTE TRANSFER'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </LinearGradient>

        {/* ══════════════════════════════════════════════════════════
            RECENT TRANSFERS SECTION  (rewritten / responsive)
        ══════════════════════════════════════════════════════════ */}
        <View style={styles.historySection}>
          {/* Section header */}
          <View style={styles.historySectionHeader}>
            <View>
              <Text style={styles.historyTitle}>Recent Transfers</Text>
              <Text style={styles.historyMeta}>Last 10 transactions</Text>
            </View>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={fetchWalletHistory}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="refresh" size={scale(18)} color={Colors.finance_accent} />
            </TouchableOpacity>
          </View>

          {/* States */}
          {loadingHistory ? (
            <View style={styles.stateBox}>
              <ActivityIndicator color={Colors.finance_accent} size="large" />
              <Text style={styles.stateText}>Loading transactions…</Text>
            </View>
          ) : history.length === 0 ? (
            <View style={styles.emptyBox}>
              <Icon name="text-box-search-outline" size={scale(40)} color="#9CA3AF" />
              <Text style={styles.emptyTitle}>No transactions found</Text>
              <Text style={styles.emptyDesc}>Your transfer history will appear here.</Text>
            </View>
          ) : (
            history.map((item, index) => (
              <HistoryItem key={item._id || index.toString()} item={item} index={index} />
            ))
          )}
        </View>
      </ScrollView>

      <CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={() => {
          setAlertVisible(false);
          alertAction && alertAction();
        }}
      />
    </SafeAreaView>
  );
};

// ─── styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  // ── Header ────────────────────────────────────────────────────────────────
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.black,
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    paddingTop: Platform.OS === 'android' ? scale(16) : scale(10),
  },
  backBtn: {
    width: scale(40),
    height: scale(40),
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: scale(18),
    fontFamily: Fonts.Bold,
    color: '#f4f5f8',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: scale(40), // mirrors backBtn for centering
  },

  // ── Scroll ────────────────────────────────────────────────────────────────
  scrollContent: {
    padding: scale(16),
    paddingBottom: scale(48),
  },
  subTitle: {
    fontSize: scale(13),
    color: '#6B7280',
    fontFamily: Fonts.Medium,
    marginBottom: scale(20),
    lineHeight: scale(20),
  },

  // ── Shared card wrapper (unchanged visual) ────────────────────────────────
  cardWrapper: {
    borderRadius: scale(20),
    padding: scale(20),
    borderWidth: 1.5,
    borderColor: 'rgba(212,176,106,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 6,
  },

  // ── Flow card (unchanged) ─────────────────────────────────────────────────
  flowCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(20),
  },
  flowCardTitle: {
    fontSize: scale(11),
    fontFamily: Fonts.Bold,
    color: Colors.white,
    letterSpacing: 1.5,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 6,
  },
  activeDot: { width: 5, height: 5, borderRadius: 3 },
  activeBadgeText: { fontSize: 10, fontFamily: Fonts.Bold, letterSpacing: 0.5 },
  walletsRow: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(30) },
  walletBox: {
    flex: 1,
    borderRadius: scale(16),
    padding: scale(14),
    borderWidth: 1,
    borderColor: 'rgba(212,176,106,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  walletTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
    gap: 4,
  },
  walletTagPillTxt: { fontSize: 9, fontFamily: Fonts.Bold, color: '#E5E7EB', letterSpacing: 0.5 },
  balLabel: { fontSize: 10, fontFamily: Fonts.Medium, color: '#9CA3AF' },
  rupeeSymbol: { fontSize: scale(15), fontFamily: Fonts.Bold, color: '#d4b06a', marginRight: 2, marginTop: 2 },
  walletAmount: { fontSize: scale(20), fontFamily: Fonts.Bold, color: '#FFF' },
  swapSeparator: { width: scale(30), alignItems: 'center', justifyContent: 'center' },
  swapSeparatorLine: { width: 1, height: 8, backgroundColor: 'rgba(212,176,106,0.3)' },
  swapSeparatorIconWrap: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(212,176,106,0.15)',
    justifyContent: 'center', alignItems: 'center', marginVertical: 4,
  },
  flowCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(20),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: scale(16),
    flexWrap: 'wrap',
  },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  footerDot: { width: 6, height: 6, borderRadius: 3 },
  footerText: { fontSize: 10, fontFamily: Fonts.Bold, color: '#8B92A5', letterSpacing: 0.5 },

  // ── Transfer funds card (unchanged) ──────────────────────────────────────
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: scale(20) },
  cardTitle: { fontSize: scale(17), fontFamily: Fonts.Bold, color: '#FFF', marginBottom: 4 },
  cardSubtitle: { fontSize: 10, fontFamily: Fonts.Bold, color: '#d4b06a', letterSpacing: 1, textTransform: 'uppercase' },
  inputSection: { marginBottom: scale(16) },
  inputLabel: { fontSize: 12, fontFamily: Fonts.Bold, color: '#9CA3AF', marginBottom: 8, letterSpacing: 0.5 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    height: scale(48), borderRadius: scale(12),
    borderWidth: 1, borderColor: 'rgba(212,176,106,0.4)',
    backgroundColor: 'rgba(0,0,0,0.2)', overflow: 'hidden',
  },
  currencyBox: {
    width: scale(48), height: '100%',
    justifyContent: 'center', alignItems: 'center',
    borderRightWidth: 1, borderRightColor: 'rgba(212,176,106,0.4)',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  currencySymbol: { fontSize: scale(18), fontFamily: Fonts.Bold, color: '#d4b06a' },
  amountInput: { flex: 1, height: '100%', paddingHorizontal: scale(16), fontSize: scale(18), fontFamily: Fonts.Bold, color: '#FFF' },
  executeBtnWrap: {
    marginTop: 4, borderRadius: scale(14),
    shadowColor: '#d4b06a', shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 6,
  },
  executeButton: {
    height: scale(48), borderRadius: scale(14),
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  boltIcon: { marginRight: 6 },
  executeButtonText: { color: '#111827', fontSize: scale(12), fontFamily: Fonts.Bold, letterSpacing: 1.1 },

  // ── History section (responsive rewrite) ──────────────────────────────────
  historySection: {
    marginTop: scale(28),
  },
  historySectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(16),
  },
  historyTitle: {
    fontSize: scale(17),
    fontFamily: Fonts.Bold,
    color: '#111827',
  },
  historyMeta: {
    fontSize: scale(11),
    fontFamily: Fonts.Medium,
    color: '#9CA3AF',
    marginTop: 2,
  },
  refreshBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(212,176,106,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // state boxes
  stateBox: {
    paddingVertical: scale(36),
    alignItems: 'center',
    gap: scale(12),
  },
  stateText: {
    fontSize: scale(13),
    fontFamily: Fonts.Medium,
    color: '#9CA3AF',
  },
  emptyBox: {
    paddingVertical: scale(36),
    paddingHorizontal: scale(24),
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: scale(18),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 1,
  },
  emptyTitle: {
    marginTop: scale(14),
    fontSize: scale(15),
    fontFamily: Fonts.Bold,
    color: '#374151',
  },
  emptyDesc: {
    marginTop: scale(6),
    fontSize: scale(12),
    fontFamily: Fonts.Medium,
    color: '#9CA3AF',
    textAlign: 'center',
  },

  // history card
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: scale(14),
    borderRadius: scale(16),
    marginBottom: scale(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(212,176,106,0.15)',
    minHeight: scale(72),
  },
  historyIconCircle: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
    flexShrink: 0,
  },
  historyMid: {
    flex: 1,
    paddingRight: scale(10),
  },
  historyDesc: {
    fontSize: scale(13),
    fontFamily: Fonts.Bold,
    color: '#111827',
    marginBottom: scale(2),
  },
  historyRef: {
    fontSize: scale(10),
    fontFamily: Fonts.Medium,
    color: '#6B7280',
    marginBottom: scale(2),
  },
  historyDate: {
    fontSize: scale(10),
    fontFamily: Fonts.Medium,
    color: '#9CA3AF',
  },
  historyRight: {
    alignItems: 'flex-end',
    flexShrink: 0,
  },
  historyAmount: {
    fontSize: scale(14),
    fontFamily: Fonts.Bold,
    marginBottom: scale(3),
  },
  historyClosingBal: {
    fontSize: scale(10),
    fontFamily: Fonts.Bold,
    color: '#9CA3AF',
  },
});

export default WalletTransfer;