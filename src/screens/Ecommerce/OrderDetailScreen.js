import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import Colors from "../../constants/Colors";
import Fonts from "../../constants/Fonts";
import { getOrderDetail } from "../../api/AuthApi";
import HeaderBar from '../../componets/HeaderBar/HeaderBar';
import FullScreenLoader from "../../componets/Loader/FullScreenLoader";

const { width } = Dimensions.get('window');

export default function OrderDetailScreen({ route, navigation }) {
  const { orderId } = route.params;
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchOrderDetail();
  }, [orderId]);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('header_token');
      const res = await getOrderDetail({ headerToken: token, orderId });

      if (res?.success) {
        setOrder(res.data);
        setError(null);
      } else {
        setError(res?.message || 'Failed to fetch order details');
      }
    } catch (err) {
      setError('Network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) return <FullScreenLoader visible={true} label="Loading Order Details..." />;

  if (error || !order) {
    return (
      <SafeAreaView style={s.root}>
        <HeaderBar title="Order Details" onBack={() => navigation.goBack()} />
        <View style={s.center}>
          <Icon name="alert-circle-outline" size={64} color={Colors.red} />
          <Text style={s.errorTxt}>{error || 'Something went wrong'}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={fetchOrderDetail}>
            <Text style={s.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return Colors.green;
      case 'processing': return Colors.amber;
      case 'cancelled': return Colors.red;
      default: return Colors.gray;
    }
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.beige} />
      <HeaderBar title="Order Details" onBack={() => navigation.goBack()} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>
        {/* Status Section */}
        <View style={s.statusCard}>
          <View style={s.statusHeader}>
            <View>
              <Text style={s.orderIdLabel}>Order ID</Text>
              <Text style={s.orderIdValue}>#{order._id?.toUpperCase()}</Text>
            </View>
            <View style={[s.statusBadge, { backgroundColor: getStatusColor(order.orderStatus) + '20' }]}>
              <Text style={[s.statusText, { color: getStatusColor(order.orderStatus) }]}>
                {order.orderStatus?.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={s.orderDate}>{formatDate(order.createdAt)}</Text>
        </View>

        {/* Product Details */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Icon name="package-variant" size={20} color={Colors.finance_accent} />
            <Text style={s.sectionTitle}>Items in this order</Text>
          </View>
          <View style={s.productItem}>
            <View style={s.productInfo}>
              <Text style={s.productName}>{order.productName}</Text>
              <Text style={s.productSpecs}>Unit Price: ₹{order.unitPrice} | Quantity: {order.quantity}</Text>
            </View>
            <Text style={s.itemTotal}>₹{order.subTotal}</Text>
          </View>
        </View>

        {/* Shipping Address */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Icon name="map-marker-outline" size={20} color={Colors.finance_accent} />
            <Text style={s.sectionTitle}>Shipping Address</Text>
          </View>
          <View style={s.addressContent}>
            <Text style={s.addressName}>{order.shippingAddress?.name}</Text>
            <Text style={s.addressText}>{order.shippingAddress?.address}</Text>
            <Text style={s.addressText}>{order.shippingAddress?.city}, {order.shippingAddress?.state}</Text>
            <Text style={s.addressText}>PIN: {order.shippingAddress?.pincode}</Text>
          </View>
        </View>

        {/* Payment & Summary */}
        <View style={s.section}>
          <View style={s.sectionHeader}>
            <Icon name="credit-card-outline" size={20} color={Colors.finance_accent} />
            <Text style={s.sectionTitle}>Payment Summary</Text>
          </View>
          
          <View style={s.paymentMethodRow}>
            <Text style={s.paymentLabel}>Payment Method</Text>
            <Text style={s.paymentValue}>{order.paymentMethod?.toUpperCase()}</Text>
          </View>
          <View style={s.paymentMethodRow}>
            <Text style={s.paymentLabel}>Payment Status</Text>
            <Text style={[s.paymentValue, { color: getStatusColor(order.paymentStatus) }]}>
              {order.paymentStatus?.toUpperCase()}
            </Text>
          </View>

          <View style={s.priceDivider} />

          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Subtotal</Text>
            <Text style={s.summaryValue}>₹{order.subTotal}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>Shipping Charges</Text>
            <Text style={s.summaryValue}>₹{order.shippingCharge}</Text>
          </View>
          <View style={s.summaryRow}>
            <Text style={s.summaryLabel}>GST (18%)</Text>
            <Text style={s.summaryValue}>₹{order.gst}</Text>
          </View>

          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Grand Total</Text>
            <Text style={s.totalValue}>₹{order.grandTotal}</Text>
          </View>
        </View>

        <TouchableOpacity style={s.supportBtn}>
          <Icon name="help-circle-outline" size={20} color={Colors.slate_400} />
          <Text style={s.supportBtnTxt}>Need help with this order?</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.beige },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  statusCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  orderIdLabel: { color: Colors.slate_400, fontSize: 10, fontFamily: Fonts.Medium, marginBottom: 2 },
  orderIdValue: { color: Colors.white, fontSize: 14, fontFamily: Fonts.Bold },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  statusText: { fontSize: 10, fontFamily: Fonts.Bold, letterSpacing: 0.5 },
  orderDate: { color: Colors.slate_400, fontSize: 11, fontFamily: Fonts.Medium },

  section: {
    backgroundColor: Colors.beige,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.kyc_accent + "40",
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.kyc_accent + "30",
  },
  sectionTitle: { fontSize: 14, fontFamily: Fonts.Bold, color: Colors.kyc_text },

  productItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productInfo: { flex: 1 },
  productName: { fontSize: 16, fontFamily: Fonts.Bold, color: Colors.kyc_text, marginBottom: 4 },
  productSpecs: { fontSize: 12, fontFamily: Fonts.Medium, color: Colors.slate_400 },
  itemTotal: { fontSize: 16, fontFamily: Fonts.Bold, color: Colors.finance_accent },

  addressContent: { gap: 4 },
  addressName: { fontSize: 15, fontFamily: Fonts.Bold, color: Colors.kyc_text, marginBottom: 2 },
  addressText: { fontSize: 13, fontFamily: Fonts.Medium, color: Colors.slate_500 },

  paymentMethodRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  paymentLabel: { fontSize: 13, fontFamily: Fonts.Medium, color: Colors.slate_500 },
  paymentValue: { fontSize: 13, fontFamily: Fonts.Bold, color: Colors.kyc_text },
  priceDivider: { height: 1, backgroundColor: Colors.kyc_accent + "30", marginVertical: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  summaryLabel: { fontSize: 13, fontFamily: Fonts.Medium, color: Colors.slate_500 },
  summaryValue: { fontSize: 13, fontFamily: Fonts.Bold, color: Colors.kyc_text },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.kyc_accent + "30" },
  totalLabel: { fontSize: 16, fontFamily: Fonts.Bold, color: Colors.kyc_text },
  totalValue: { fontSize: 20, fontFamily: Fonts.Bold, color: Colors.finance_accent },

  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    padding: 12,
  },
  supportBtnTxt: { fontSize: 13, fontFamily: Fonts.Medium, color: Colors.slate_400 },

  errorTxt: { fontFamily: Fonts.Medium, fontSize: 14, color: Colors.kyc_textSub, marginTop: 12, textAlign: 'center' },
  retryBtn: { marginTop: 20, backgroundColor: Colors.finance_accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  retryTxt: { fontFamily: Fonts.Bold, color: Colors.black, fontSize: 14 },
});
