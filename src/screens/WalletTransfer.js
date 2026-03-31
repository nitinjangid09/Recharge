import React, { useState, useEffect } from 'react';
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
  Alert
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";

import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from '../constants/Colors';
import Fonts from '../constants/Fonts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getWalletBalance, transferAepsToMainWallet, getWalletHistory } from '../api/AuthApi';
import CustomAlert from '../screens/CustomAlert';

const WalletTransfer = ({ navigation }) => {
  const [amount, setAmount] = useState('');
  const [aepsBalance, setAepsBalance] = useState('0');
  const [mainBalance, setMainBalance] = useState('0');
  const [isLoading, setIsLoading] = useState(true);

  const [isTransferring, setIsTransferring] = useState(false);

  // Custom Alert State
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertAction, setAlertAction] = useState(null);

  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const showAlert = (title, message, action = null) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertAction(() => action);
    setAlertVisible(true);
  };

  const fetchBalance = async () => {
    try {
      setIsLoading(true);
      const token = await AsyncStorage.getItem("header_token");
      if (!token) return;

      const response = await getWalletBalance({ headerToken: token });
      if (response && response.success && response.data) {
        setAepsBalance(response.data.aepsWallet?.toString() || '0');
        setMainBalance(response.data.mainWallet?.toString() || '0');
      }
    } catch (error) {
      console.log("Error fetching wallet balance:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchWalletHistory = async () => {
    try {
      setLoadingHistory(true);
      const token = await AsyncStorage.getItem("header_token");
      if (!token) return;

      const response = await getWalletHistory({ headerToken: token, limit: 10 });
      if (response && response.success && response.data) {
        setHistory(response.data);
      } else {
        setHistory([]);
      }
    } catch (error) {
      console.log("Error fetching history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchBalance();
    fetchWalletHistory();
  }, []);

  const handleTransfer = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      showAlert("Invalid Amount", "Please enter a valid amount to transfer.");
      return;
    }

    try {
      setIsTransferring(true);
      const token = await AsyncStorage.getItem("header_token");
      if (!token) {
        showAlert("Error", "Authentication token missing.");
        return;
      }

      const response = await transferAepsToMainWallet({ amount, headerToken: token });

      if (response && response.success) {
        showAlert("Success", response.message || "AEPS to main wallet transfer successful.");
        setAmount('');
        // Refresh balances after successful transfer
        await fetchBalance();
        await fetchWalletHistory();
      } else {
        showAlert("Transfer Failed", response?.message || "Could not complete the transfer.");
      }
    } catch (error) {
      showAlert("Error", "A network or server error occurred.");
    } finally {
      setIsTransferring(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.bg} />

      {/* Custom Header with Back Button */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          onPress={() => navigation.goBack()}
        >
          <Icon name="arrow-left" size={28} color="#111827" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <View style={styles.titleRow}>
            <Text style={[styles.mainTitle, { color: Colors.finance_text }]}>Wallet Transfer</Text>
            {/* Minimal Date Range Picker Button (Mock) */}

          </View>
          <Text style={styles.subTitle}>
            Seamlessly move funds from AEPS Wallet to Main Wallet
          </Text>
        </View>

        {/* Responsive Content Row/Col */}
        <View style={styles.cardsContainer}>

          {/* TOP CARD: Transfer Flow */}
          <LinearGradient
            colors={["#2C2C2C", "#111111"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.cardWrapper}
          >
            <View style={styles.flowCardHeader}>
              <Text style={styles.flowCardTitle}>TRANSFER FLOW</Text>
              <View style={styles.activeBadge}>
                <View style={[styles.activeDot, { backgroundColor: Colors.finance_success }]} />
                <Text style={[styles.activeBadgeText, { color: Colors.finance_success }]}>ACTIVE</Text>
              </View>
            </View>

            <View style={styles.walletsRow}>
              {/* AEPS Wallet Box */}
              <LinearGradient
                colors={["#242424", "#0A0A0A"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
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
                    <Text style={styles.walletAmount} numberOfLines={1} adjustsFontSizeToFit>{isLoading ? '...' : aepsBalance}</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Separator / Swap */}
              <View style={styles.swapSeparator}>
                <View style={styles.swapSeparatorLine} />
                <View style={styles.swapSeparatorIconWrap}>
                  <Icon name="swap-horizontal" size={14} color={Colors.finance_accent} />
                </View>
                <View style={styles.swapSeparatorLine} />
              </View>

              {/* Main Wallet Box */}
              <LinearGradient
                colors={["#242424", "#0A0A0A"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
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
                    <Text style={styles.walletAmount} numberOfLines={1} adjustsFontSizeToFit>{isLoading ? '...' : mainBalance}</Text>
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

          {/* BOTTOM CARD: Transfer Funds */}
          <LinearGradient
            colors={["#2C2C2C", "#111111"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={styles.cardWrapper}
          >
            <View style={styles.cardHeaderRow}>
              <View>
                <Text style={styles.cardTitle}>Transfer Funds</Text>
                <Text style={styles.cardSubtitle}>AEPS → MAIN WALLET</Text>
              </View>
              <TouchableOpacity style={styles.iconCircleButton}>
                <Icon name="swap-horizontal" size={20} color={Colors.finance_accent} />
              </TouchableOpacity>
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
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.executeButton}
              >
                {isTransferring ? (
                  <ActivityIndicator color="#111827" size="small" style={styles.boltIcon} />
                ) : (
                  <Icon name="lightning-bolt" size={16} color="#111827" style={styles.boltIcon} />
                )}
                <Text style={styles.executeButtonText}>
                  {isTransferring ? "PROCESSING..." : "EXECUTE TRANSFER"}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>

          {/* RECENT TRANSFERS SECTION */}
          <View style={styles.historyContainer}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>Recent Transfers</Text>
              <TouchableOpacity onPress={fetchWalletHistory} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Icon name="refresh" size={20} color={Colors.finance_accent} />
              </TouchableOpacity>
            </View>

            {loadingHistory ? (
              <ActivityIndicator color={Colors.finance_accent} size="small" style={{ marginVertical: 20 }} />
            ) : history.length === 0 ? (
              <View style={styles.emptyHistory}>
                <Icon name="text-box-search-outline" size={32} color="#9CA3AF" />
                <Text style={styles.emptyHistoryText}>No transactions found.</Text>
              </View>
            ) : (
              history.map((item, index) => {
                const isCredit = item.type === 'credit';
                return (
                  <View key={item._id || index.toString()} style={styles.historyCard}>
                    <View style={styles.historyIconBox}>
                      <Icon
                        name={isCredit ? "arrow-bottom-left-thick" : "arrow-top-right-thick"}
                        size={16}
                        color={isCredit ? Colors.finance_success : "#EF4444"}
                      />
                    </View>
                    <View style={styles.historyDetails}>
                      <Text style={styles.historyDesc}>{item.description || 'Wallet Transfer'}</Text>
                      <Text style={styles.historyDate}>
                        {new Date(item.createdAt).toLocaleString()} • Ref: {item.referenceId}
                      </Text>
                    </View>
                    <View style={styles.historyAmountBox}>
                      <Text style={[styles.historyAmount, { color: isCredit ? Colors.finance_success : "#EF4444" }]}>
                        {isCredit ? '+' : '-'}₹{item.amount}
                      </Text>
                      <Text style={styles.historyClosingBal}>
                        Bal: ₹{item.closingBalance}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 15 : 10,
    marginBottom: 0,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    marginLeft: -8, // Optical alignment with the padding
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  titleSection: {
    marginBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  mainTitle: {
    fontSize: 28,
    fontFamily: Fonts.Bold,
  },
  datePickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    gap: 6,
  },
  datePickerText: {
    fontSize: 12,
    color: '#000',
    fontFamily: Fonts.Medium,
  },
  subTitle: {
    fontSize: 14,
    color: '#444',
    fontFamily: Fonts.Medium,
  },
  cardsContainer: {
    flexDirection: 'column',
    gap: 20,
  },

  /* --- Reusable Card Format --- */
  cardWrapper: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: 'rgba(212,176,106,0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 6,
  },

  /* --- Elements --- */
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 20,
    fontFamily: Fonts.Bold,
    color: '#FFF',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 11,
    fontFamily: Fonts.Bold,
    color: '#d4b06a',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  iconCircleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(212,176,106,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputSection: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: Fonts.Bold,
    color: '#9CA3AF',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,176,106,0.4)',
    backgroundColor: 'rgba(0,0,0,0.2)',
    overflow: 'hidden',
  },
  currencyBox: {
    width: 48,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: 'rgba(212,176,106,0.4)',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  currencySymbol: {
    fontSize: 18,
    fontFamily: Fonts.Bold,
    color: '#d4b06a',
  },
  amountInput: {
    flex: 1,
    height: '100%',
    paddingHorizontal: 16,
    fontSize: 18,
    fontFamily: Fonts.Bold,
    color: '#FFF',
  },
  executeBtnWrap: {
    marginTop: 4,
    borderRadius: 14,
    shadowColor: '#d4b06a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  executeButton: {
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  boltIcon: {
    marginRight: 6,
  },
  executeButtonText: {
    color: '#111827',
    fontSize: 13,
    fontFamily: Fonts.Bold,
    letterSpacing: 1.2,
  },

  /* --- Flow Card Specifics --- */
  flowCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  flowCardTitle: {
    fontSize: 12,
    fontFamily: Fonts.Bold,
    color: '#8B92A5',
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
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeBadgeText: {
    fontSize: 10,
    fontFamily: Fonts.Bold,
    letterSpacing: 0.5,
  },
  walletsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  walletBox: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
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
    alignSelf: 'flex-start',
    gap: 4,
  },
  walletTagPillTxt: {
    fontSize: 9,
    fontFamily: Fonts.Bold,
    color: '#E5E7EB',
    letterSpacing: 0.5,
  },
  balLabel: {
    fontSize: 10,
    fontFamily: Fonts.Medium,
    color: '#9CA3AF',
  },
  rupeeSymbol: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
    color: '#d4b06a',
    marginRight: 2,
    marginTop: 2,
  },
  walletAmount: {
    fontSize: 22,
    fontFamily: Fonts.Bold,
    color: '#FFF',
  },
  swapSeparator: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swapSeparatorLine: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(212,176,106,0.3)',
  },
  swapSeparatorIconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(212,176,106,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 4,
  },
  flowCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
    paddingTop: 16,
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  footerDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  footerText: {
    fontSize: 10,
    fontFamily: Fonts.Bold,
    color: '#8B92A5',
    letterSpacing: 0.5,
  },

  /* --- History Section --- */
  historyContainer: {
    marginTop: 10,
    marginBottom: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  historyTitle: {
    fontSize: 18,
    fontFamily: Fonts.Bold,
    color: '#111827',
  },
  emptyHistory: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.4)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  emptyHistoryText: {
    marginTop: 12,
    fontSize: 14,
    fontFamily: Fonts.Medium,
    color: '#6B7280',
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(212,176,106,0.15)',
  },
  historyIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.03)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyDetails: {
    flex: 1,
  },
  historyDesc: {
    fontSize: 14,
    fontFamily: Fonts.Bold,
    color: '#111827',
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 10,
    fontFamily: Fonts.Medium,
    color: '#6B7280',
  },
  historyAmountBox: {
    alignItems: 'flex-end',
  },
  historyAmount: {
    fontSize: 15,
    fontFamily: Fonts.Bold,
    marginBottom: 4,
  },
  historyClosingBal: {
    fontSize: 10,
    fontFamily: Fonts.Bold,
    color: '#9CA3AF',
  },
});

export default WalletTransfer;
