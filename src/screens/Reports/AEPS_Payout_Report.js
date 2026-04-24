import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../constants/Colors';
import Fonts from '../../constants/Fonts';
import { getAepsPayoutReport } from '../../api/AuthApi';
import HeaderBar from '../../componets/HeaderBar/HeaderBar';
import FullScreenLoader from '../../componets/Loader/FullScreenLoader';

const { width: SW } = Dimensions.get('window');

const STATUS_CONFIG = {
  SUCCESS: { color: '#2ECC71', bg: '#EAFAF1', icon: 'check-circle' },
  PENDING: { color: '#F1C40F', bg: '#FEF9E7', icon: 'clock' },
  FAILED: { color: '#E74C3C', bg: '#FDEDEC', icon: 'close-circle' },
  REVERSED: { color: '#9B59B6', bg: '#F5EEF8', icon: 'undo-variant' },
};

const TxnCard = ({ txn, onPress }) => {
  const status = txn.status?.toUpperCase() || 'PENDING';
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardRow}>
        <View style={[styles.iconBox, { backgroundColor: cfg.bg }]}>
          <Icon name="bank-transfer" size={24} color={cfg.color} />
        </View>
        <View style={styles.cardCenter}>
          <Text style={styles.beneficiaryName}>{txn.beneficiaryName}</Text>
          <Text style={styles.refId}>REF: {txn.referenceId}</Text>
          <Text style={styles.bankInfo}>{txn.bankAccount} • {txn.ifsc}</Text>
        </View>
        <View style={styles.cardRight}>
          <Text style={styles.amount}>₹{txn.amount}</Text>
          <View style={[styles.statusBadge, { backgroundColor: cfg.bg }]}>
            <Icon name={cfg.icon} size={12} color={cfg.color} style={{ marginRight: 4 }} />
            <Text style={[styles.statusText, { color: cfg.color }]}>{status}</Text>
          </View>
        </View>
      </View>
      <View style={styles.cardFooter}>
        <Text style={styles.dateText}>
          {new Date(txn.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })} • {new Date(txn.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
        </Text>
        <Icon name="chevron-right" size={18} color={Colors.text_placeholder} />
      </View>
    </TouchableOpacity>
  );
};

export default function AEPS_Payout_Report({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [summary, setSummary] = useState({ total: 0, amount: 0, success: 0 });

  const fetchData = useCallback(async (pageNum = 1, isRefresh = false) => {
    try {
      const token = await AsyncStorage.getItem('header_token');
      // Simple date range for now: last 30 days
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 30);

      const fromStr = fromDate.toISOString().split('T')[0];
      const toStr = toDate.toISOString().split('T')[0];

      const response = await getAepsPayoutReport({ 
        from: fromStr, 
        to: toStr, 
        headerToken: token, 
        page: pageNum, 
        limit: 20 
      });

      if (response.success) {
        if (isRefresh || pageNum === 1) {
          setData(response.data);
        } else {
          setData(prev => [...prev, ...response.data]);
        }
        setTotalPages(response.pagination?.totalPages || 1);
        
        // Calculate summary for current view
        const list = response.data || [];
        setSummary({
          total: response.pagination?.total || list.length,
          amount: list.reduce((acc, curr) => acc + (curr.amount || 0), 0),
          success: list.filter(t => t.status === 'SUCCESS').length,
        });
      }
    } catch (error) {
      console.log('Error fetching payout report:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchData(1, true);
  };

  const handleLoadMore = () => {
    if (page < totalPages && !loading) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchData(nextPage);
    }
  };

  const renderItem = ({ item }) => (
    <TxnCard 
      txn={item} 
      onPress={() => navigation.navigate('AEPS_Payout_Receipt', { txn: item })} 
    />
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar title="AEPS Payout Report" onBack={() => navigation.goBack()} />
      
      <View style={styles.summaryContainer}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryVal}>{summary.total}</Text>
          <Text style={styles.summaryLbl}>TOTAL</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: '#2ECC71' }]}>₹{summary.amount.toLocaleString('en-IN')}</Text>
          <Text style={styles.summaryLbl}>AMOUNT</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryVal, { color: Colors.primary }]}>{summary.success}</Text>
          <Text style={styles.summaryLbl}>SUCCESS</Text>
        </View>
      </View>

      {loading && page === 1 ? (
        <FullScreenLoader visible={true} />
      ) : (
        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.primary]} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="file-search-outline" size={64} color={Colors.text_placeholder} />
              <Text style={styles.emptyText}>No payout records found</Text>
            </View>
          }
          ListFooterComponent={
            page < totalPages ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginVertical: 20 }} />
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },
  summaryContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    margin: 16,
    borderRadius: 16,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryVal: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
    color: Colors.text_primary,
  },
  summaryLbl: {
    fontSize: 10,
    fontFamily: Fonts.Bold,
    color: Colors.text_secondary,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  summaryDivider: {
    width: 1,
    height: '60%',
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    marginBottom: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCenter: {
    flex: 1,
    marginLeft: 12,
  },
  beneficiaryName: {
    fontSize: 14,
    fontFamily: Fonts.Bold,
    color: Colors.text_primary,
  },
  refId: {
    fontSize: 10,
    fontFamily: Fonts.Medium,
    color: Colors.text_secondary,
    marginTop: 2,
  },
  bankInfo: {
    fontSize: 10,
    fontFamily: Fonts.Medium,
    color: Colors.text_placeholder,
    marginTop: 2,
  },
  cardRight: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
    color: Colors.text_primary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
  },
  statusText: {
    fontSize: 10,
    fontFamily: Fonts.Bold,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dateText: {
    fontSize: 10,
    fontFamily: Fonts.Medium,
    color: Colors.text_placeholder,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: Fonts.Medium,
    color: Colors.text_placeholder,
    marginTop: 16,
  },
});
