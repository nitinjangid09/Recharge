import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Dimensions,
  TextInput,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import Colors from "../../constants/Colors";
import Fonts from "../../constants/Fonts";
import { getProductList, BASE_URL } from "../../api/AuthApi";
import FullScreenLoader from "../../componets/Loader/FullScreenLoader";
import HeaderBar from '../../componets/HeaderBar/HeaderBar';

const { width } = Dimensions.get('window');

export default function ShoppingScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedBrand, setSelectedBrand] = useState('ALL');

  const BRANDS = ['ALL', 'LOGITECH', 'HP', 'DELL', 'RAZER', 'ASUS', 'APPLE'];

  useEffect(() => {
    fetchProducts(1);
  }, []);

  const fetchProducts = async (pageNumber = 1) => {
    try {
      if (pageNumber === 1) setLoading(true);
      const token = await AsyncStorage.getItem('header_token');
      const res = await getProductList({ headerToken: token, page: pageNumber, limit: 10 });

      if (res?.success) {
        const newProducts = res.data || [];
        if (pageNumber === 1) {
          setProducts(newProducts);
        } else {
          setProducts(prev => [...prev, ...newProducts]);
        }

        if (res.pagination) {
          setHasMore(res.pagination.page < res.pagination.totalPages);
        } else {
          setHasMore(newProducts.length >= 10);
        }
        setError(null);
      } else {
        if (pageNumber === 1) setError(res?.message || 'Failed to fetch products');
      }
    } catch (err) {
      if (pageNumber === 1) setError('Network error occurred.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    fetchProducts(1);
  };

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      fetchProducts(nextPage);
    }
  };

  const renderHeader = () => (
    <View style={s.headerContainer}>
      <LinearGradient
        colors={['rgb(22, 22, 22)', 'rgb(42, 42, 42)']}
        style={s.banner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={s.bannerInfo}>
          <Text style={s.bannerTitle}>Modern Hardware{'\n'}Collection 2026</Text>
          <Text style={s.bannerSub}>Premium tools for your workspace</Text>
          <TouchableOpacity style={s.bannerBtn}>
            <Text style={s.bannerBtnTxt}>Shop Now</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.brandScroll} contentContainerStyle={s.brandContent}>
        {BRANDS.map((brand) => (
          <TouchableOpacity
            key={brand}
            style={[s.brandTab, selectedBrand === brand && s.brandTabActive]}
            onPress={() => setSelectedBrand(brand)}
          >
            <Text style={[s.brandTxt, selectedBrand === brand && s.brandTxtActive]}>{brand}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={s.sectionHead}>
        <Text style={s.sectionTitle}>Featured Items</Text>
        <TouchableOpacity>
          <Text style={s.showAll}>View All</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderProduct = ({ item }) => {
    const imgUrl = item.productImageUrl ? `${BASE_URL}${item.productImageUrl}` : null;
    const isDiscounted = item.priceAfterDiscount && item.priceAfterDiscount < item.price;

    return (
      <TouchableOpacity
        style={s.card}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('ProductDetailsScreen', { productId: item._id })}
      >
        <LinearGradient
          colors={['rgb(252, 250, 245)', 'rgb(245, 241, 230)']}
          style={s.cardGradient}
        >
          <View style={s.cardImageWrap}>
            {imgUrl ? (
              <Image source={{ uri: imgUrl }} style={s.cardImage} resizeMode="contain" />
            ) : (
              <Icon name="cpu-64-bit" size={40} color={Colors.finance_accent} opacity={0.3} />
            )}
          </View>

          <View style={s.cardContent}>
            <Text style={s.cardName} numberOfLines={1}>{item.name}</Text>
            <Text style={s.cardCategory}>{item.category || 'Hardware'}</Text>

            <View style={s.cardBottom}>
              <View style={s.cardPriceBox}>
                <Text style={s.cardPrice}>₹{item.priceAfterDiscount ?? item.price}</Text>
                {isDiscounted && (
                  <Text style={s.cardOldPrice}>₹{item.price}</Text>
                )}
              </View>
              <TouchableOpacity style={s.addBtnSmall}>
                <Icon name="shopping-outline" size={18} color="rgb(255, 255, 255)" />
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <HeaderBar title="Hardware Store" onBack={() => navigation.goBack()} />
      {loading && page === 1 ? (
        <FullScreenLoader visible={true} label="Loading Hardware..." />
      ) : error ? (
        <View style={s.center}>
          <Icon name="alert-circle-outline" size={48} color={Colors.red} />
          <Text style={s.errorTxt}>{error}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => fetchProducts(1)}>
            <Text style={s.retryTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item._id}
          numColumns={2}
          ListHeaderComponent={renderHeader}
          renderItem={renderProduct}
          contentContainerStyle={s.listPadding}
          columnWrapperStyle={s.columnGap}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.finance_accent]} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: 'rgb(255, 255, 255)' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  headerContainer: { paddingHorizontal: 20, paddingTop: 10 },
  banner: { width: '100%', height: 180, borderRadius: 24, padding: 25, justifyContent: 'center', marginBottom: 30, overflow: 'hidden' },
  bannerIcon: { position: 'absolute', bottom: -20, right: -10 },
  bannerInfo: { zIndex: 1 },
  bannerTitle: { fontFamily: Fonts.Bold, fontSize: 18, color: Colors.finance_accent, lineHeight: 24, marginBottom: 8 },
  bannerSub: { fontFamily: Fonts.Medium, fontSize: 11, color: 'rgba(255,255,255,0.7)', marginBottom: 15 },
  bannerBtn: { alignSelf: 'flex-start', backgroundColor: Colors.finance_accent, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  bannerBtnTxt: { fontFamily: Fonts.Bold, fontSize: 12, color: 'rgb(0, 0, 0)' },
  brandScroll: { marginBottom: 30 },
  brandContent: { paddingRight: 20 },
  brandTab: { paddingHorizontal: 18, paddingVertical: 10, marginRight: 10, borderRadius: 14, backgroundColor: 'rgb(248, 250, 252)', borderWidth: 1, borderColor: 'rgba(212,176,106,0.1)' },
  brandTabActive: { backgroundColor: 'rgb(22, 22, 22)', borderColor: 'rgb(22, 22, 22)' },
  brandTxt: { fontFamily: Fonts.Bold, fontSize: 11, color: 'rgb(148, 163, 184)' },
  brandTxtActive: { color: Colors.finance_accent },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  sectionTitle: { fontFamily: Fonts.Bold, fontSize: 16, color: 'rgb(22, 22, 22)' },
  showAll: { fontFamily: Fonts.Bold, fontSize: 11, color: Colors.finance_accent },
  listPadding: { paddingBottom: 40 },
  columnGap: { paddingHorizontal: 20, justifyContent: 'space-between' },
  card: {
    width: (width - 55) / 2,
    marginBottom: 25,
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: 'rgba(212,176,106,0.35)',
  },
  cardGradient: {
    flex: 1,
    padding: 10,
  },
  cardImageWrap: {
    width: '100%',
    height: 140,
    backgroundColor: 'rgb(255, 255, 255)',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212,176,106,0.1)',
  },
  cardImage: {
    width: '85%',
    height: '85%',
  },
  cardContent: {
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 4,
  },
  cardName: {
    fontFamily: Fonts.Bold,
    fontSize: 13,
    color: 'rgb(15, 23, 42)',
    marginBottom: 4,
  },
  cardCategory: {
    fontFamily: Fonts.Bold,
    fontSize: 8,
    color: Colors.finance_accent,
    backgroundColor: 'rgba(212,176,106,0.1)',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  cardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  cardPriceBox: {
    flex: 1,
  },
  cardPrice: {
    fontFamily: Fonts.Bold,
    fontSize: 16,
    color: 'rgb(15, 23, 42)', // Dark color for price
  },
  cardOldPrice: {
    fontFamily: Fonts.Medium,
    fontSize: 10,
    color: 'rgb(148, 163, 184)',
    textDecorationLine: 'line-through',
  },
  addBtnSmall: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: Colors.finance_accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorTxt: { fontFamily: Fonts.Medium, fontSize: 14, color: 'rgb(107, 114, 128)', marginTop: 12, textAlign: 'center' },
  retryBtn: { marginTop: 20, backgroundColor: Colors.finance_accent, paddingHorizontal: 24, paddingVertical: 10, borderRadius: 12 },
  retryTxt: { fontFamily: Fonts.Bold, color: 'rgb(0, 0, 0)', fontSize: 14 },
});
