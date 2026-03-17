import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList, ScrollView,
  SafeAreaView,
  ToastAndroid,
} from "react-native";
import Colors from "../constants/Colors";
import Fonts from "../constants/Fonts";
import { ActivityIndicator } from "react-native";
import HeaderBar from "../componets/HeaderBar";
import { fetchPlans } from "../api/AuthApi";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { Animated } from "react-native";
export default function StorePlans({ navigation, route }) {
  const { mobile, operator, circle, plans } = route.params || {};

  const [allPlans, setAllPlans] = useState([]);
  const [types, setTypes] = useState([]);
  const [activeType, setActiveType] = useState(null);
  const [loading, setLoading] = useState(false);

  // 🔹 API CALL
  useEffect(() => {
    if (plans && plans.length > 0) {
      setAllPlans(plans);
      const uniqueTypes = plans.map(p => p.categories);
      setTypes(uniqueTypes);
      if (uniqueTypes.length > 0) {
        setActiveType(uniqueTypes[0]);
      }
    } else if (mobile && operator && circle) {
      loadPlans();
    }
  }, []);

  const loadPlans = async () => {
    setLoading(true);
    const res = await fetchPlans(mobile, circle, operator);

    if (res?.status === "SUCCESS") {
      const fetchedPlans = res.plans || [];
      setAllPlans(fetchedPlans);

      // 🔹 extract UNIQUE types dynamically
      const uniqueTypes = [...new Set(fetchedPlans.map(p => p.type || p.categories))];
      setTypes(uniqueTypes);

      if (uniqueTypes.length > 0) {
        setActiveType(uniqueTypes[0]);
      }
    } else {
      ToastAndroid.show(res?.message || "Failed to load plans", ToastAndroid.SHORT);
    }
    setLoading(false);
  };

  // 🔹 FILTER BY SELECTED TYPE
  const filteredPlans = plans && plans.length > 0
    ? (allPlans.find(p => p.categories === activeType)?.plan || [])
    : allPlans.filter(p => p.type === activeType);

  // 🔹 UI CARD (UNCHANGED)
  // 🔹 ANIMATED CARD COMPONENT
  const PlanCard = ({ item }) => {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.96,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
    };

    return (
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => {
          navigation.navigate("TopUpScreen", { 
            selectedAmount: String(item.price || item.amount),
            mobile,
            operator,
            circle
          });
        }}
      >
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          {/* Top Row: Price & Validity */}
          <View style={styles.cardHeader}>
            <View style={styles.priceWrapper}>
              <Text style={styles.priceSymbol}>₹</Text>
              <Text style={styles.price}>{item.price || item.amount}</Text>
            </View>
            <LinearGradient
              colors={['#fff', '#fcf9f2']}
              style={styles.validityBadge}
            >
              <Icon name="clock-outline" size={14} color={Colors.finance_accent} />
              <Text style={styles.validityText}>{item.validity}</Text>
            </LinearGradient>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Description */}
          <View style={styles.cardBody}>
            <Text style={styles.descriptionText}>{item.description}</Text>
          </View>

          {/* Footer Action */}
          <View style={styles.cardFooter}>
            <View style={styles.featureRow}>
              {item.description.toLowerCase().includes('data') && (
                <View style={styles.featureBadge}>
                  <Icon name="wifi" size={12} color={Colors.finance_accent} />
                  <Text style={styles.featureText}>Data</Text>
                </View>
              )}
              <View style={styles.featureBadge}>
                <Icon name="phone" size={12} color={Colors.finance_accent} />
                <Text style={styles.featureText}>Voice</Text>
              </View>
            </View>

            <LinearGradient
              colors={[Colors.finance_accent, '#b8944d']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.selectBtn}
            >
              <Text style={styles.selectBtnText}>Select</Text>
              <Icon name="chevron-right" size={16} color={Colors.white} />
            </LinearGradient>
          </View>
        </Animated.View>
      </TouchableOpacity>
    );
  };

  // 🔹 TAB ITEM COMPONENT
  const TabItem = ({ label, isActive, onPress }) => {
    const scaleAnim = React.useRef(new Animated.Value(1)).current;

    const handlePressIn = () => {
      Animated.timing(scaleAnim, {
        toValue: 0.92,
        duration: 100,
        useNativeDriver: true,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 5,
        tension: 100, // Snappy return
        useNativeDriver: true,
      }).start();
    };

    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{ marginHorizontal: 4 }} // spacing
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          {isActive ? (
            <LinearGradient
              colors={[Colors.finance_accent, '#b8944d']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.activeTabGradient}
            >
              <Text style={styles.activeTabText}>{label}</Text>
            </LinearGradient>
          ) : (
            <View style={styles.tab}>
              <Text style={styles.tabText}>{label}</Text>
            </View>
          )}
        </Animated.View>
      </TouchableOpacity>
    );
  };

  // 🔹 RENDER ITEM
  const renderPlan = ({ item }) => <PlanCard item={item} />;

  return (
    <SafeAreaView style={styles.container}>
      <HeaderBar title="Store Plans" onBack={() => navigation.goBack()} />

      <View style={{ marginHorizontal: 12 }}>
        {/* 🔹 DYNAMIC TABS */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabs}
        >
          {types.map(type => (
            <TabItem
              key={type}
              label={type}
              isActive={activeType === type}
              onPress={() => setActiveType(type)}
            />
          ))}
        </ScrollView>

        {loading && (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={Colors.finance_accent} />
            <Text style={{ marginTop: 8, color: Colors.finance_text }}>Loading plans...</Text>
          </View>
        )}
        {!loading && (
          <FlatList
            data={filteredPlans}
            renderItem={renderPlan}
            keyExtractor={(item, index) => item.productId?.toString() || item.id?.toString() || index.toString()}
            contentContainerStyle={{ paddingBottom: 100 }}
            ListEmptyComponent={
              <Text style={{ textAlign: "center", marginTop: 20 }}>
                No plans available
              </Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.finance_bg_1 },
  header: { fontSize: 20, fontFamily: Fonts.Bold, marginVertical: 10, color: Colors.finance_text },
  tabs: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 10,
  },
  tab: {
    paddingVertical: 12, // Increased from 10
    paddingHorizontal: 20, // Increased
    borderRadius: 25,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: 'rgba(212, 176, 106, 0.4)',
    elevation: 2,
    shadowColor: Colors.finance_accent,
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 2 },
    justifyContent: 'center',
    alignItems: 'center',
  },
  activeTabGradient: {
    paddingVertical: 12, // Increased from 10
    paddingHorizontal: 24, // Increased
    borderRadius: 25,
    elevation: 5,
    shadowColor: Colors.finance_accent,
    shadowOpacity: 0.4,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 3 },
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    color: Colors.finance_text,
    fontFamily: Fonts.Medium,
    fontSize: 14, // Slightly Larger
    opacity: 0.7,
    includeFontPadding: false, // Fix clipping
    textAlignVertical: 'center',
  },
  activeTabText: {
    color: Colors.white,
    fontFamily: Fonts.Bold,
    fontSize: 14,
    letterSpacing: 0.5,
    includeFontPadding: false, // Fix clipping
    textAlignVertical: 'center',
  },
  loader: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 30,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    elevation: 4,
    shadowColor: Colors.finance_accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 176, 106, 0.2)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6, // Reduced space
  },
  priceWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  priceSymbol: {
    fontSize: 20,
    fontFamily: Fonts.Bold,
    color: Colors.finance_accent, // Gold Symbol
    marginTop: 4,
    marginRight: 2,
  },
  price: {
    fontSize: 38, // Bigger
    fontFamily: Fonts.Bold,
    color: Colors.finance_text,
    includeFontPadding: false,
  },
  validityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: Colors.finance_accent,
    backgroundColor: '#fff',
    elevation: 1,
    shadowColor: Colors.finance_accent, // Gold shadow
    shadowOpacity: 0.1,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 }
  },
  validityText: {
    fontSize: 12,
    fontFamily: Fonts.Bold,
    color: Colors.finance_text,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(0,0,0,0.05)',
    marginBottom: 8, // Reduced space
    width: '100%'
  },
  cardBody: {
    marginBottom: 10, // Reduced space
  },
  descriptionText: {
    fontSize: 12,
    fontFamily: Fonts.Medium,
    color: Colors.finance_text,
    opacity: 0.8,
    lineHeight: 18,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featureRow: {
    flexDirection: 'row',
    gap: 8,
  },
  featureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.finance_bg_1, // Changed from #f5f5f5
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 176, 106, 0.2)', // Subtle border
  },
  featureText: {
    fontSize: 11,
    fontFamily: Fonts.Bold, // Bold
    color: Colors.finance_text,
    opacity: 0.9,
  },
  selectBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 4,
  },
  selectBtnText: {
    color: Colors.white,
    fontFamily: Fonts.Bold,
    fontSize: 13,
  },
});
