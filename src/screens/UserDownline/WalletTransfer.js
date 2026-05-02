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

import Colors from '../../constants/Colors';
import Fonts from '../../constants/Fonts';
import { getWalletBalance, transferAepsToMainWallet, getWalletHistory } from '../../api/AuthApi';
import CustomAlert from '../../componets/Alerts/CustomAlert';
import HeaderBar from '../../componets/HeaderBar/HeaderBar';
import FullScreenLoader from '../../componets/Loader/FullScreenLoader';

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
    if (!amount) {
      showAlert('Amount Required', 'Please enter the amount to transfer.');
      return;
    }
    if (isNaN(amount) || Number(amount) <= 0) {
      showAlert('Invalid Amount', 'Please enter a valid amount greater than 0.');
      return;
    }
    if (Number(amount) > Number(aepsBalance)) {
      showAlert('Insufficient Balance', 'You do not have enough balance in your AEPS wallet to complete this transfer.');
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
    const color = isCredit ? Colors.green : Colors.red;
    const bgColor = isCredit ? "rgba(34,197,94,0.08)" : "rgba(239,68,68,0.10)";

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
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* ── HEADER ── */}
      <HeaderBar
        title="Wallet Transfer"
        onBack={() => navigation.goBack()}
      />

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
          colors={["rgb(46, 46, 46)", Colors.black]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.cardWrapper}
        >
          <View style={styles.flowCardHeader}>
            <Text style={styles.cardTitle}>Transfer Flow</Text>
            <View style={styles.activeBadge}>
              <View style={[styles.activeDot, { backgroundColor: Colors.green }]} />
              <Text style={[styles.activeBadgeText, { color: Colors.green }]}>ACTIVE</Text>
            </View>
          </View>

          <View style={styles.walletsRow}>
            {/* AEPS Wallet */}
            <LinearGradient
              colors={["rgb(35, 35, 35)", Colors.black]}
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
                <Icon name="arrow-right-thick" size={14} color={Colors.finance_accent} />
              </View>
              <View style={styles.swapSeparatorLine} />
            </View>

            {/* Main Wallet */}
            <LinearGradient
              colors={["rgb(35, 35, 35)", Colors.black]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.walletBox}
            >
              <View style={[styles.walletTagPill, { backgroundColor: "rgba(245,158,11,0.15)" }]}>
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
              <View style={[styles.footerDot, { backgroundColor: Colors.green }]} />
              <Text style={styles.footerText}>ZERO CHARGES</Text>
            </View>
          </View>
        </LinearGradient>

        {/* ══════════════════════════════════════════════════════════
            CARD 2 – TRANSFER FUNDS  (unchanged)
        ══════════════════════════════════════════════════════════ */}
        <LinearGradient
          colors={["rgb(46, 46, 46)", Colors.black]}
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
                placeholderTextColor={Colors.white}
                keyboardType="numeric"
                value={amount}
                onChangeText={(val) => {
                  let cleaned = val.replace(/[^0-9]/g, "");
                  if (cleaned.startsWith("0")) cleaned = cleaned.replace(/^0+/, "");
                  setAmount(cleaned);
                }}
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
              colors={isTransferring ? [Colors.gray, Colors.kyc_textSub] : [Colors.finance_accent, Colors.finance_accent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.executeButton}
            >
              {isTransferring ? (
                <ActivityIndicator color={Colors.primary} size="small" style={styles.boltIcon} />
              ) : (
                <Icon name="lightning-bolt" size={16} color={Colors.primary} style={styles.boltIcon} />
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
              <Icon name="text-box-search-outline" size={scale(40)} color={Colors.gray} />
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
      <FullScreenLoader visible={isTransferring} label="Processing Transfer..." />
    </SafeAreaView>
  );
};

// ─── styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.beige,
  },

  // ── Scroll ────────────────────────────────────────────────────────────────
  scrollContent: {
    padding: scale(16),
    paddingBottom: scale(48),
  },
  subTitle: {
    fontSize: scale(13),
    color: Colors.kyc_textSub,
    fontFamily: Fonts.Medium,
    marginBottom: scale(20),
    lineHeight: scale(20),
  },

  // ── Shared card wrapper (unchanged visual) ────────────────────────────────
  cardWrapper: {
    borderRadius: scale(20),
    padding: scale(20),
    borderWidth: 1.5,
    borderColor: "rgba(245,158,11,0.30)",
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
    borderColor: "rgba(245,158,11,0.30)",
  },
  walletTagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'center',
    gap: 4,
  },
  walletTagPillTxt: { fontSize: 9, fontFamily: Fonts.Bold, color: Colors.kyc_border, letterSpacing: 0.5 },
  balLabel: { fontSize: 10, fontFamily: Fonts.Medium, color: Colors.gray },
  rupeeSymbol: { fontSize: scale(15), fontFamily: Fonts.Bold, color: Colors.finance_accent, marginRight: 2, marginTop: 2 },
  walletAmount: { fontSize: scale(20), fontFamily: Fonts.Bold, color: Colors.white },
  swapSeparator: { width: scale(30), alignItems: 'center', justifyContent: 'center' },
  swapSeparatorLine: { width: 1, height: 8, backgroundColor: "rgba(245,158,11,0.30)" },
  swapSeparatorIconWrap: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "rgba(245,158,11,0.15)",
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
  footerText: { fontSize: 10, fontFamily: Fonts.Bold, color: Colors.gray, letterSpacing: 0.5 },

  // ── Transfer funds card (unchanged) ──────────────────────────────────────
  cardHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: scale(20) },
  cardTitle: { fontSize: scale(17), fontFamily: Fonts.Bold, color: Colors.white, marginBottom: 4 },
  cardSubtitle: { fontSize: 10, fontFamily: Fonts.Bold, color: Colors.finance_accent, letterSpacing: 1, textTransform: 'uppercase' },
  inputSection: { marginBottom: scale(16) },
  inputLabel: { fontSize: 12, fontFamily: Fonts.Bold, color: Colors.gray, marginBottom: 8, letterSpacing: 0.5 },
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
  currencySymbol: { fontSize: scale(18), fontFamily: Fonts.Bold, color: Colors.finance_accent },
  amountInput: { flex: 1, height: '100%', paddingHorizontal: scale(16), fontSize: scale(18), fontFamily: Fonts.Bold, color: Colors.white },
  executeBtnWrap: {
    marginTop: 4, borderRadius: scale(14),
  },
  executeButton: {
    height: scale(48), borderRadius: scale(14),
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  boltIcon: { marginRight: 6 },
  executeButtonText: { color: Colors.kyc_text, fontSize: scale(12), fontFamily: Fonts.Bold, letterSpacing: 1.1 },

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
    color: Colors.kyc_text,
  },
  historyMeta: {
    fontSize: scale(11),
    fontFamily: Fonts.Medium,
    color: Colors.gray,
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
    color: Colors.gray,
  },
  emptyBox: {
    paddingVertical: scale(36),
    paddingHorizontal: scale(24),
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: scale(18),
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  emptyTitle: {
    marginTop: scale(14),
    fontSize: scale(15),
    fontFamily: Fonts.Bold,
    color: "rgb(55, 65, 81)",
  },
  emptyDesc: {
    marginTop: scale(6),
    fontSize: scale(12),
    fontFamily: Fonts.Medium,
    color: Colors.gray,
    textAlign: 'center',
  },

  // history card
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: scale(14),
    borderRadius: scale(16),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.15)",
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
    color: Colors.kyc_text,
    marginBottom: scale(2),
  },
  historyRef: {
    fontSize: scale(10),
    fontFamily: Fonts.Medium,
    color: Colors.kyc_textSub,
    marginBottom: scale(2),
  },
  historyDate: {
    fontSize: scale(10),
    fontFamily: Fonts.Medium,
    color: Colors.gray,
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
    color: Colors.gray,
  },
});

export default WalletTransfer;
