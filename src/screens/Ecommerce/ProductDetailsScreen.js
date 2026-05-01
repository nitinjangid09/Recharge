import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Dimensions,
  StatusBar,
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
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
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
                    <Icon name="share-variant" size={20} color={Colors.finance_accent} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setIsFav(!isFav)} style={s.styledIconBtn}>
                    <Icon
                      name={isFav ? "heart" : "heart-outline"}
                      size={20}
                      color={isFav ? Colors.red : Colors.finance_accent}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Attribute Icons Row */}
              <View style={s.attrRow}>
                <View style={s.attrItem}>
                  <Icon name="identifier" size={20} color={Colors.finance_accent} />
                  <Text style={s.attrText}>{product.sku || 'N/A'}</Text>
                </View>
                <View style={s.attrItem}>
                  <Icon name="package-variant-closed" size={20} color={Colors.finance_accent} />
                  <Text style={s.attrText}>{product.stock || 0} In Stock</Text>
                </View>
                <View style={s.attrItem}>
                  <Icon name="calendar-outline" size={20} color={Colors.finance_accent} />
                  <Text style={s.attrText}>{new Date(product.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</Text>
                </View>
              </View>

              {/* Description Section */}
              <View style={s.descSection}>
                <Text style={s.sectionHeader}>Description</Text>
                <Text style={s.descText}>
                  {product.description || 'No description available for this product.'}
                </Text>
              </View>

              {/* Extra Info Grid */}
              <View style={s.extraInfoGrid}>
                <View style={s.infoBox}>
                  <Text style={s.infoLabel}>Category</Text>
                  <Text style={s.infoVal}>{product.category || 'General'}</Text>
                </View>
                <View style={s.infoBox}>
                  <Text style={s.infoLabel}>Status</Text>
                  <Text style={[s.infoVal, { color: product.isActive ? 'rgb(16, 185, 129)' : 'rgb(239, 68, 68)' }]}>
                    {product.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Bottom Action Bar */}
          <SafeAreaView style={s.footer} edges={['bottom']}>
            <View style={s.footerInner}>
              <TouchableOpacity style={s.chatBtn}>
                <Icon name="message-text-outline" size={24} color={Colors.finance_accent} />
              </TouchableOpacity>

              <TouchableOpacity style={s.buyBtn}>
                <LinearGradient
                  colors={['rgb(22, 22, 22)', 'rgb(42, 42, 42)']}
                  style={s.buyBtnGrad}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Text style={s.buyBtnTxt}>Add to Cart • ₹{product.priceAfterDiscount ?? product.price}</Text>
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
  root: { flex: 1, backgroundColor: 'rgb(255, 255, 255)' },
  scrollContent: { paddingBottom: 120 },

  // Image Section
  imageContainer: { width: width, height: height * 0.35, backgroundColor: 'rgb(249, 250, 251)', alignItems: 'center' },
  productImgBox: { flex: 1, justifyContent: 'center', alignItems: 'center', width: '100%' },
  mainImg: { width: '75%', height: '75%' },
  indicatorRow: { flexDirection: 'row', gap: 5, marginBottom: 15 },
  dot: { width: 8, height: 4, borderRadius: 2, backgroundColor: 'rgb(203, 213, 225)' },
  dotActive: { width: 24, backgroundColor: Colors.finance_accent },

  // Info Section
  infoSection: { paddingHorizontal: 25, paddingTop: 15 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 15 },
  productTitle: { fontFamily: Fonts.Bold, fontSize: 24, color: 'rgb(22, 22, 22)', marginBottom: 2 },
  subTitle: { fontFamily: Fonts.Medium, fontSize: 12, color: 'rgb(148, 163, 184)' },
  iconActions: { flexDirection: 'row', gap: 10 },
  styledIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: 'rgba(212,176,106,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(212,176,106,0.05)'
  },

  attrRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  attrItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  attrText: { fontFamily: Fonts.Bold, fontSize: 11, color: 'rgb(71, 85, 105)' },

  descSection: { marginBottom: 15 },
  sectionHeader: { fontFamily: Fonts.Bold, fontSize: 16, color: 'rgb(22, 22, 22)' },
  descText: { fontFamily: Fonts.Medium, fontSize: 13, color: 'rgb(100, 116, 139)', lineHeight: 20 },

  extraInfoGrid: { flexDirection: 'row', gap: 12, marginTop: 5 },
  infoBox: { flex: 1, backgroundColor: 'rgb(249, 250, 251)', padding: 12, borderRadius: 10, borderWidth: 1, borderColor: 'rgb(241, 245, 249)' },
  infoLabel: { fontFamily: Fonts.Medium, fontSize: 10, color: 'rgb(148, 163, 184)', marginBottom: 2 },
  infoVal: { fontFamily: Fonts.Bold, fontSize: 13, color: 'rgb(22, 22, 22)' },

  // Footer
  footer: { position: 'absolute', bottom: 0, width: width, backgroundColor: 'rgb(255, 255, 255)', borderTopWidth: 1, borderTopColor: 'rgb(241, 245, 249)' },
  footerInner: { flexDirection: 'row', alignItems: 'center', padding: 20, gap: 15 },
  chatBtn: { width: 55, height: 55, borderRadius: 12, borderWidth: 1.5, borderColor: 'rgba(212,176,106,0.2)', alignItems: 'center', justifyContent: 'center' },
  buyBtn: { flex: 1, height: 55, borderRadius: 12, overflow: 'hidden' },
  buyBtnGrad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  buyBtnTxt: { fontFamily: Fonts.Bold, color: Colors.finance_accent, fontSize: 16, letterSpacing: 0.5 },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
  errorTxt: { fontFamily: Fonts.Medium, fontSize: 16, color: 'rgb(100, 116, 139)', textAlign: 'center', marginTop: 15 },
  retryBtn: { marginTop: 25, backgroundColor: Colors.finance_accent, paddingHorizontal: 30, paddingVertical: 12, borderRadius: 12 },
  retryTxt: { fontFamily: Fonts.Bold, color: 'rgb(0, 0, 0)', fontSize: 14 },
});
