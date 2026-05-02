import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import Colors from "../../constants/Colors";
import Fonts from "../../constants/Fonts";
import { getMyOrders } from "../../api/AuthApi";
import HeaderBar from '../../componets/HeaderBar/HeaderBar';
import FullScreenLoader from "../../componets/Loader/FullScreenLoader";

const { width } = Dimensions.get('window');

const getStatusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'delivered':
      return Colors.green;
    case 'processing':
    case 'shipped':
      return Colors.amber;
    case 'cancelled':
    case 'failed':
      return Colors.red;
    default:
      return Colors.gray;
  }
};

const getStatusBg = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed':
    case 'delivered':
      return Colors.successOpacity_10;
    case 'processing':
    case 'shipped':
      return Colors.warningOpacity_10 || 'rgba(245,158,11,0.1)';
    case 'cancelled':
    case 'failed':
      return Colors.redOpacity_10;
    default:
      return Colors.blackOpacity_05;
  }
};

export default function MyOrdersScreen({ navigation }) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('header_token');
      const res = await getMyOrders({ headerToken: token });

      if (res?.success) {
        setOrders(res.data || []);
        setError(null);
      } else {
        setError(res?.message || 'Failed to fetch orders');
      }
    } catch (err) {
      setError('Network error occurred.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const renderOrder = ({ item }) => {
    const statusColor = getStatusColor(item.orderStatus);
    const statusBg = getStatusBg(item.orderStatus);

    return (
      <TouchableOpacity 
        style={s.orderCard} 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('OrderDetailScreen', { orderId: item._id })}
      >
        <View style={s.orderHeader}>
          <View style={s.orderIdRow}>
            <Icon name="package-variant-closed" size={20} color={Colors.finance_accent} />
            <Text style={s.orderIdText}>Order #{item._id?.slice(-8).toUpperCase()}</Text>
          </View>
          <View style={[s.statusBadge, { backgroundColor: statusBg }]}>
            <Text style={[s.statusText, { color: statusColor }]}>{item.orderStatus?.toUpperCase()}</Text>
          </View>
        </View>

        <View style={s.divider} />

        <View style={s.orderBody}>
          <View style={s.productInfo}>
            <Text style={s.productName} numberOfLines={1}>{item.productName}</Text>
            <Text style={s.productQty}>Qty: {item.quantity} × ₹{item.unitPrice}</Text>
          </View>
          <View style={s.priceInfo}>
            <Text style={s.totalLabel}>Total Amount</Text>
            <Text style={s.totalValue}>₹{item.grandTotal}</Text>
          </View>
        </View>

        <View style={s.orderFooter}>
          <View style={s.dateBox}>
            <Icon name="calendar-clock" size={14} color={Colors.slate_400} />
            <Text style={s.dateText}>{formatDate(item.createdAt)}</Text>
          </View>
          <View style={s.paymentBox}>
            <Icon name="credit-card-outline" size={14} color={Colors.slate_400} />
            <Text style={s.paymentText}>{item.paymentMethod?.toUpperCase()}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.headerBg} />
      <HeaderBar title="My Orders" onBack={() => navigation.navigate('FinanceHome')} />
      
      {loading && !refreshing ? (
        <FullScreenLoader visible={true} label="Fetching your orders..." />
      ) : error ? (
        <View style={s.center}>
          <Icon name="package-variant-remove" size={64} color={Colors.slate_100} />
          <Text style={s.errorTxt}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={fetchOrders}>
            <Text style={s.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : orders.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIconCircle}>
            <Icon name="shopping-outline" size={48} color={Colors.finance_accent} />
          </View>
          <Text style={s.emptyTitle}>No Orders Yet</Text>
          <Text style={s.emptySub}>Looks like you haven't made any orders yet.</Text>
          <TouchableOpacity 
            style={s.shopBtn} 
            onPress={() => navigation.navigate('ShoppingScreen')}
          >
            <Text style={s.shopBtnTxt}>Start Shopping</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item._id}
          renderItem={renderOrder}
          contentContainerStyle={s.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={[Colors.finance_accent]} 
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  listContent: { padding: 16, paddingBottom: 40 },
  
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,176,106,0.15)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderIdText: {
    fontFamily: Fonts.Bold,
    fontSize: 14,
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontFamily: Fonts.Bold,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginBottom: 12,
  },
  orderBody: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  productInfo: {
    flex: 1,
    marginRight: 10,
  },
  productName: {
    fontFamily: Fonts.Bold,
    fontSize: 15,
    color: '#1E293B',
    marginBottom: 4,
  },
  productQty: {
    fontFamily: Fonts.Medium,
    fontSize: 12,
    color: Colors.slate_400,
  },
  priceInfo: {
    alignItems: 'flex-end',
  },
  totalLabel: {
    fontFamily: Fonts.Medium,
    fontSize: 10,
    color: Colors.slate_400,
    marginBottom: 2,
  },
  totalValue: {
    fontFamily: Fonts.Bold,
    fontSize: 18,
    color: Colors.finance_accent,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dateText: {
    fontFamily: Fonts.Medium,
    fontSize: 11,
    color: Colors.slate_400,
  },
  paymentBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paymentText: {
    fontFamily: Fonts.Bold,
    fontSize: 11,
    color: Colors.slate_400,
  },
  
  errorTxt: { fontFamily: Fonts.Medium, fontSize: 14, color: '#64748B', marginTop: 16, textAlign: 'center' },
  retryBtn: { marginTop: 20, backgroundColor: Colors.finance_accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  retryTxt: { fontFamily: Fonts.Bold, color: '#000', fontSize: 14 },
  
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(212,176,106,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: '#1E293B',
    marginBottom: 8,
  },
  emptySub: {
    fontFamily: Fonts.Medium,
    fontSize: 14,
    color: Colors.slate_400,
    textAlign: 'center',
    marginBottom: 30,
  },
  shopBtn: {
    backgroundColor: '#1E293B',
    paddingHorizontal: 30,
    paddingVertical: 14,
    borderRadius: 15,
  },
  shopBtnTxt: {
    fontFamily: Fonts.Bold,
    fontSize: 14,
    color: Colors.finance_accent,
  },
});
