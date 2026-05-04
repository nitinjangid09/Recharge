import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import Colors from '../../constants/Colors';
import Fonts from '../../constants/Fonts';
import { getProductDetails, BASE_URL } from '../../api/AuthApi';
import FullScreenLoader from '../../componets/Loader/FullScreenLoader';
import HeaderBar from '../../componets/HeaderBar/HeaderBar';

const { width, height } = Dimensions.get('window');

export default function ProductDetailsScreen({ navigation, route }) {
  const { productId } = route.params || {};
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFav, setIsFav] = useState(false);
  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (productId) {
      fetchDetails();
    } else {
      setError("Product ID is missing.");
      setLoading(false);
    }
  }, [productId]);

  const fetchDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem('header_token');
      const res = await getProductDetails({ headerToken: token, productId });

      if (res?.success) {
        setProduct(res.data);
      } else {
        setError(res?.message || 'Failed to fetch product details.');
      }
    } catch (err) {
      setError('A network error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const onShare = async () => {
    try {
      await Share.share({
        message: `Check out ${product.name} at Hardware Store!`,
        url: `${BASE_URL}${product.productImageUrl}`,
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  const imgUrl = product?.productImageUrl ? `${BASE_URL}${product.productImageUrl}` : null;

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <HeaderBar title="Product Details" onBack={() => navigation.goBack()} />

      {loading ? (
        <FullScreenLoader visible={true} label="Loading Product..." />
      ) : error ? (
        <View style={s.center}>
          <Icon name="alert-circle-outline" size={60} color={Colors.red} />
          <Text style={s.errorTxt}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={fetchDetails}>
            <Text style={s.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : product ? (
        <View style={{ flex: 1 }}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

            {/* Top Image Section */}
            <View style={s.imageContainer}>
              <View style={s.productImgBox}>
                {imgUrl ? (
                  <Image source={{ uri: imgUrl }} style={s.mainImg} resizeMode="contain" />
                ) : (
                  <Icon name="chip" size={150} color="rgb(226, 232, 240)" />
                )}
              </View>

              {/* Carousel Indicators (dots from image) */}
              <View style={s.indicatorRow}>
                <View style={[s.dot, s.dotActive]} />
                <View style={s.dot} />
                <View style={s.dot} />
              </View>
            </View>

            {/* Content Section */}
            <View style={s.infoSection}>
              <View style={s.titleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.productTitle}>{product.name}</Text>
                  <Text style={s.subTitle}>{product.category || 'Hardware Peripheral'}</Text>
                </View>
                <View style={s.iconActions}>
                  <TouchableOpacity onPress={onShare} style={s.styledIconBtn}>
                    <Icon name="share-variant" size={20} color={Colors.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsFav(!isFav)} style={s.styledIconBtn}>
                    <Icon
                      name={isFav ? "heart" : "heart-outline"}
                      size={20}
                      color={isFav ? Colors.red : Colors.primary}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={s.attrRow}>
                <View style={[s.attrPill, { backgroundColor: 'rgba(79, 70, 229, 0.08)', borderColor: 'rgba(79, 70, 229, 0.15)' }]}>
                  <Icon name="barcode-scan" size={14} color="#4F46E5" />
                  <Text style={[s.attrText, { color: "#4F46E5" }]}>{product.sku || 'N/A'}</Text>
                </View>
                <View style={[s.attrPill, { backgroundColor: 'rgba(22, 163, 74, 0.08)', borderColor: 'rgba(22, 163, 74, 0.15)' }]}>
                  <Icon name="package-variant-closed" size={14} color="#16A34A" />
                  <Text style={[s.attrText, { color: "#16A34A" }]}>{product.stock || 0} Units</Text>
                </View>
                <View style={[s.attrPill, { backgroundColor: 'rgba(217, 119, 6, 0.08)', borderColor: 'rgba(217, 119, 6, 0.15)' }]}>
                  <Icon name="calendar-clock-outline" size={14} color="#D97706" />
                  <Text style={[s.attrText, { color: "#D97706" }]}>{new Date(product.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
                </View>
              </View>

              {/* Quantity & Description Group */}
              <View style={s.mainContentCard}>
                {/* Quantity Selector */}
                {/* Quantity Selector */}
                <View style={s.quantityRow}>
                  <View>
                    <Text style={s.sectionHeader}>Quantity</Text>
                    <Text style={s.qtySub}>Select units for purchase</Text>
                  </View>
                  <View style={s.stepperContainer}>
                    <TouchableOpacity
                      style={s.qtyBtn}
                      onPress={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Icon name="minus" size={18} color={Colors.finance_accent} />
                    </TouchableOpacity>
                    <View style={s.qtyValueContainer}>
                      <Text style={s.qtyText}>{quantity}</Text>
                    </View>
                    <TouchableOpacity
                      style={s.qtyBtn}
                      onPress={() => setQuantity(quantity + 1)}
                    >
                      <Icon name="plus" size={18} color={Colors.finance_accent} />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={s.divider} />

                {/* Description Section */}
                <View style={s.descSection}>
                  <Text style={s.sectionHeader}>Product Overview</Text>
                  <Text style={s.descText}>
                    {product.description || 'This premium hardware component is designed for maximum performance and durability. Precision engineered to meet industry standards.'}
                  </Text>
                </View>
              </View>

              {/* Specifications Section */}
              <Text style={[s.sectionHeader, { marginLeft: 5, marginBottom: 12 }]}>Specifications</Text>
              <View style={s.specsCard}>
                <SpecItem label="Category" value={product.category || 'Hardware'} icon="layers-outline" iconColor="#7C3AED" />
                <SpecItem label="Availability" value={product.isActive ? 'In Stock' : 'Out of Stock'} icon="check-circle-outline" iconColor={product.isActive ? Colors.green : Colors.red} color={product.isActive ? Colors.green : Colors.red} />
                <SpecItem label="SKU ID" value={product.sku || 'HW-9920-X'} icon="barcode-scan" iconColor="#4F46E5" />
                <SpecItem label="Listed On" value={new Date(product.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })} icon="calendar-month-outline" iconColor="#D97706" />
              </View>
            </View>
          </ScrollView>

          {/* Bottom Action Bar */}
          <SafeAreaView style={s.footer} edges={['bottom']}>
            <View style={s.footerInner}>
              <TouchableOpacity style={s.chatBtn}>
                <Icon name="message-text-outline" size={24} color={Colors.finance_accent} />
              </TouchableOpacity>

              <TouchableOpacity
                style={s.buyBtn}
                onPress={() => navigation.navigate('CheckoutScreen', {
                  product: {
                    productId: product._id,
                    quantity: quantity,
                    name: product.name,
                    price: product.priceAfterDiscount ?? product.price,
                    image: product.productImageUrl
                  }
                })}
              >
                <LinearGradient
                  colors={[Colors.primary, '#2A2A2A']}
                  style={s.buyBtnGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={s.buyBtnTxt}>Buy Now • ₹{(product.priceAfterDiscount ?? product.price) * quantity}</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.beige },
  scrollContent: { paddingBottom: 120 },

  // Image Section
  imageContainer: { width: width, height: height * 0.35, backgroundColor: Colors.beige, alignItems: 'center' },
  productImgBox: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  mainImg: { width: '75%', height: '75%' },
  indicatorRow: { flexDirection: 'row', gap: 5, marginBottom: 15 },
  dot: { width: 8, height: 4, borderRadius: 2, backgroundColor: Colors.kyc_border },
  dotActive: { width: 24, backgroundColor: Colors.finance_accent },

  // Info Section
  infoSection: { paddingHorizontal: 25, paddingTop: 15 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15 },
  productTitle: { fontFamily: Fonts.Bold, fontSize: 24, color: Colors.kyc_text, marginBottom: 2 },
  subTitle: { fontFamily: Fonts.Medium, fontSize: 12, color: Colors.kyc_textSub },
  iconActions: { flexDirection: 'row', gap: 10 },
  styledIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(212,176,106,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.kyc_accent + "40"
  },

  attrRow: { flexDirection: 'row', gap: 8, marginBottom: 25, flexWrap: 'wrap' },
  attrPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(201, 168, 76, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(201, 168, 76, 0.2)'
  },
  attrText: { fontFamily: Fonts.Bold, fontSize: 10, color: Colors.kyc_accentDark },

  descSection: { marginBottom: 15 },
  sectionHeader: { fontFamily: Fonts.Bold, fontSize: 16, color: Colors.kyc_text },
  descText: { fontFamily: Fonts.Medium, fontSize: 13, color: Colors.kyc_textSub, lineHeight: 20 },

  extraInfoGrid: { flexDirection: 'row', gap: 12, marginTop: 5 },
  infoBox: { flex: 1, backgroundColor: Colors.cardbg, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.kyc_accent + "40" },
  infoLabel: { fontFamily: Fonts.Medium, fontSize: 10, color: Colors.kyc_textSub, marginBottom: 2 },
  infoVal: { fontFamily: Fonts.Bold, fontSize: 13, color: Colors.kyc_text },

  quantitySection: { marginBottom: 20 },
  quantityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  qtySub: { fontFamily: Fonts.Medium, fontSize: 11, color: Colors.kyc_textSub, marginTop: 2 },
  stepperContainer: { flexDirection: 'row', alignItems: 'center' },
  qtyBtn: { width: 34, height: 34, borderRadius: 8, backgroundColor: Colors.beige, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(212,176,106,0.3)' },
  qtyValueContainer: { paddingHorizontal: 15 },
  qtyText: { fontFamily: Fonts.Bold, fontSize: 16, color: Colors.kyc_text, textAlign: 'center' },

  // Footer
  footer: { position: 'absolute', bottom: 0, width: width, backgroundColor: Colors.beige, borderTopWidth: 1, borderTopColor: Colors.kyc_accent + "40" },
  footerInner: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
  chatBtn: { width: 55, height: 55, borderRadius: 12, borderWidth: 1.5, borderColor: Colors.kyc_accent + "40", alignItems: 'center', justifyContent: 'center' },
  buyBtn: { flex: 1, height: 55, borderRadius: 12, overflow: 'hidden' },
  buyBtnGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  buyBtnTxt: { fontFamily: Fonts.Bold, color: Colors.finance_accent, fontSize: 16, letterSpacing: 0.5 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  errorTxt: { fontFamily: Fonts.Medium, fontSize: 16, color: Colors.kyc_textSub, textAlign: 'center', marginTop: 15 },
  retryBtn: { marginTop: 25, backgroundColor: Colors.finance_accent, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 12 },
  retryTxt: { fontFamily: Fonts.Bold, color: Colors.black, fontSize: 14 },

  // New UI Elements
  mainContentCard: {
    backgroundColor: Colors.cardbg,
    borderRadius: 20,
    padding: 20,
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(212,176,106,0.3)',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(212,176,106,0.1)',
    marginVertical: 20,
  },
  specsCard: {
    backgroundColor: Colors.cardbg,
    borderRadius: 20,
    padding: 15,
    borderWidth: 1.5,
    borderColor: 'rgba(212,176,106,0.3)',
  },
  specItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(212,176,106,0.1)',
  },
  specIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.cardbg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(212,176,106,0.2)',
  },
  specLabel: {
    flex: 1,
    fontFamily: Fonts.Medium,
    fontSize: 12,
    color: Colors.kyc_textSub,
  },
  specValue: {
    fontFamily: Fonts.Bold,
    fontSize: 13,
    color: Colors.kyc_text,
  },
});

const SpecItem = ({ label, value, icon, color, iconColor }) => (
  <View style={s.specItem}>
    <View style={[s.specIconBox, { backgroundColor: iconColor ? `${iconColor}10` : 'rgba(212,176,106,0.1)' }]}>
      <Icon name={icon} size={18} color={iconColor || Colors.primary} />
    </View>
    <Text style={s.specLabel}>{label}</Text>
    <Text style={[s.specValue, color ? { color } : {}]}>{value}</Text>
  </View>
);
