import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from 'react-native-linear-gradient';
import Colors from '../../constants/Colors';
import Fonts from '../../constants/Fonts';
import { createOrder, fetchStateList, fetchCityList } from '../../api/AuthApi';
import { AlertService } from '../../componets/Alerts/CustomAlert';
import HeaderBar from '../../componets/HeaderBar/HeaderBar';
import FullScreenLoader from '../../componets/Loader/FullScreenLoader';

const { width } = Dimensions.get('window');

export default function CheckoutScreen({ navigation, route }) {
  const { product } = route.params;
  const [loading, setLoading] = useState(false);
  const [stateList, setStateList] = useState([]);
  const [pinLoading, setPinLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const shakeAnim = useRef(new Animated.Value(0)).current;

  // States will be loaded lazily when pincode is entered
  const loadStates = async () => {
    if (stateList.length > 0) return stateList;
    try {
      const token = await AsyncStorage.getItem('header_token');
      const res = await fetchStateList({ headerToken: token });
      if (res?.success && res.data) {
        setStateList(res.data);
        return res.data;
      }
    } catch (err) {
      console.log("State fetch error:", err);
    }
    return [];
  };

  const triggerShake = () => {
    shakeAnim.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true })
    ]).start();
  };

  const fetchAddressFromPincode = async (pin) => {
    if (pin.length !== 6) return;
    setPinLoading(true);
    try {
      // Lazy load states if not already loaded
      const currentStates = await loadStates();

      const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await response.json();
      if (data && data[0] && data[0].Status === "Success") {
        const pinState = data[0].PostOffice[0].State;
        const pinDistrict = data[0].PostOffice[0].District;

        const matchedState = currentStates.find(
          s => s.stateName?.toLowerCase() === pinState?.toLowerCase()
        );

        if (matchedState) {
          let matchedCityName = "";
          const token = await AsyncStorage.getItem('header_token');
          const cityRes = await fetchCityList({ stateCode: matchedState.stateCode, headerToken: token });

          if (cityRes?.success && cityRes.data) {
            const matchedCity = cityRes.data.find(
              c => c.cityName?.toLowerCase() === pinDistrict?.toLowerCase()
            );
            if (matchedCity) matchedCityName = matchedCity.cityName;
          }

          setAddress(prev => ({
            ...prev,
            state: matchedState.stateName,
            city: matchedCityName || pinDistrict,
          }));

          // Clear any auto-filled field errors
          setErrors(prev => ({ ...prev, city: null, state: null }));
        }
      }
    } catch (error) {
      console.log("Pincode API error:", error);
    } finally {
      setPinLoading(false);
    }
  };

  const handlePincodeChange = (val) => {
    const cleanVal = val.replace(/[^0-9]/g, '').slice(0, 6);
    setAddress(prev => ({ ...prev, pincode: cleanVal }));
    setErrors(prev => ({ ...prev, pincode: null }));
    if (cleanVal.length === 6) {
      fetchAddressFromPincode(cleanVal);
    }
  };

  const handleNameChange = (val) => {
    const cleanVal = val.replace(/[^a-zA-Z ]/g, '').slice(0, 40);
    setAddress(prev => ({ ...prev, name: cleanVal }));
    setErrors(prev => ({ ...prev, name: null }));
  };

  const handleCityChange = (val) => {
    const cleanVal = val.replace(/[^a-zA-Z ]/g, '').slice(0, 40);
    setAddress(prev => ({ ...prev, city: cleanVal }));
    setErrors(prev => ({ ...prev, city: null }));
  };

  const handleStateChange = (val) => {
    const cleanVal = val.replace(/[^a-zA-Z ]/g, '').slice(0, 40);
    setAddress(prev => ({ ...prev, state: cleanVal }));
    setErrors(prev => ({ ...prev, state: null }));
  };

  const handleAddressChange = (val) => {
    setAddress(prev => ({ ...prev, address: val.slice(0, 200) }));
    setErrors(prev => ({ ...prev, address: null }));
  };

  const handleCountryChange = (val) => {
    const cleanVal = val.replace(/[^a-zA-Z ]/g, '').slice(0, 40);
    setAddress(prev => ({ ...prev, country: cleanVal }));
    setErrors(prev => ({ ...prev, country: null }));
  };

  // Shipping Address State
  const [address, setAddress] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: '',
  });

  const subTotal = product.price * product.quantity;
  const shippingCharge = 100;
  const gstRate = 18;
  const gstAmount = (subTotal * gstRate) / 100;
  const grandTotal = subTotal + shippingCharge + gstAmount;

  const handlePlaceOrder = async () => {
    // Advanced Validation
    let newErrors = {};
    if (!address.name) newErrors.name = "Full name is required";
    if (!address.pincode) newErrors.pincode = "Pincode is required";
    else if (address.pincode.length !== 6) newErrors.pincode = "Pincode must be 6 digits";

    if (!address.city) newErrors.city = "City is required";
    if (!address.state) newErrors.state = "State is required";
    if (!address.country) newErrors.country = "Country is required";
    if (!address.address) newErrors.address = "Street address is required";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      triggerShake();
      return;
    }

    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('header_token');

      const res = await createOrder({
        headerToken: token,
        product: {
          productId: product.productId,
          quantity: product.quantity,
        },
        shippingAddress: address,
        shippingCharge: shippingCharge,
        gst: gstRate,
      });

      setLoading(false); // Close loader before alert

      if (res?.success) {
        AlertService.showAlert({
          type: "success",
          title: "Order Placed!",
          message: "Your order has been created successfully.",
          onConfirm: () => {
            AlertService.hideAlert();
            navigation.navigate('MyOrdersScreen');
          },
          confirmText: "View Orders",
          cancelText: "Close"
        });
      } else {
        AlertService.showAlert({
          type: "error",
          title: "Order Failed",
          message: res?.message || "Unable to place order at this time."
        });
      }
    } catch (err) {
      setLoading(false);
      AlertService.showAlert({
        type: "error",
        title: "Network Error",
        message: "A network error occurred. Please try again."
      });
    }
  };

  const renderInput = (label, key, placeholder, keyboardType = 'default', customOnChange = null) => {
    const error = errors[key];
    return (
      <Animated.View style={[s.inputGroup, { transform: [{ translateX: shakeAnim }] }]}>
        <Text style={s.label}>{label}</Text>
        <View style={[
          s.inputWrapper,
          { borderColor: error ? Colors.red || '#EF4444' : '#E2E8F0' }
        ]}>
          <TextInput
            style={[s.input, { flex: 1 }]}
            placeholder={placeholder}
            placeholderTextColor="#94A3B8"
            value={address[key]}
            onChangeText={customOnChange ? customOnChange : (val) => {
              setAddress({ ...address, [key]: val });
              if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
            }}
            keyboardType={keyboardType}
          />
          {key === 'pincode' && pinLoading && (
            <ActivityIndicator size="small" color={Colors.finance_accent} style={{ marginLeft: 8 }} />
          )}
        </View>
        {!!error && (
          <Text style={s.errorText}>{error}</Text>
        )}
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.headerBg} />
      <HeaderBar title="Checkout" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scrollContent}>

          {/* Order Summary Card */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Icon name="basket-outline" size={20} color={Colors.finance_accent} />
              <Text style={s.sectionTitle}>Order Summary</Text>
            </View>
            <View style={s.productRow}>
              <View style={s.productInfo}>
                <Text style={s.productName}>{product.name}</Text>
                <Text style={s.productQty}>Quantity: {product.quantity}</Text>
              </View>
              <Text style={s.productPrice}>₹{product.price * product.quantity}</Text>
            </View>
          </View>

          {/* Shipping Address Form */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Icon name="truck-delivery-outline" size={20} color={Colors.finance_accent} />
              <Text style={s.sectionTitle}>Shipping Details</Text>
            </View>

            {renderInput("Full Name", "name", "Enter your name", "default", handleNameChange)}
            <View style={s.row}>
              <View style={{ flex: 1 }}>{renderInput("Pincode", "pincode", "302020", "number-pad", handlePincodeChange)}</View>
              <View style={{ flex: 1 }}>{renderInput("Country", "country", "India", "default", handleCountryChange)}</View>
            </View>
            <View style={s.row}>
              <View style={{ flex: 1 }}>{renderInput("City", "city", "Jaipur", "default", handleCityChange)}</View>
              <View style={{ flex: 1 }}>{renderInput("State", "state", "Rajasthan", "default", handleStateChange)}</View>
            </View>
            {renderInput("Street Address", "address", "House No, Street, Area", "default", handleAddressChange)}
          </View>

          {/* Price Breakdown */}
          <View style={s.section}>
            <View style={s.sectionHeader}>
              <Icon name="file-document-outline" size={20} color={Colors.finance_accent} />
              <Text style={s.sectionTitle}>Bill Details</Text>
            </View>

            <View style={s.billRow}>
              <Text style={s.billLabel}>Items Subtotal</Text>
              <Text style={s.billVal}>₹{subTotal}</Text>
            </View>
            <View style={s.billRow}>
              <Text style={s.billLabel}>Shipping Fee</Text>
              <Text style={s.billVal}>₹{shippingCharge}</Text>
            </View>
            <View style={s.billRow}>
              <Text style={s.billLabel}>GST ({gstRate}%)</Text>
              <Text style={s.billVal}>₹{gstAmount.toFixed(2)}</Text>
            </View>

            <View style={s.totalRow}>
              <Text style={s.totalLabel}>Grand Total</Text>
              <Text style={s.totalVal}>₹{grandTotal.toFixed(2)}</Text>
            </View>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Place Order Button */}
      <SafeAreaView style={s.footer} edges={['bottom']}>
        <TouchableOpacity
          style={s.placeOrderBtn}
          onPress={handlePlaceOrder}
          disabled={loading}
        >
          <LinearGradient
            colors={['#161616', '#2A2A2A']}
            style={s.grad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            {loading ? (
              <ActivityIndicator color={Colors.finance_accent} />
            ) : (
              <Text style={s.btnTxt}>Place Order • ₹{grandTotal.toFixed(2)}</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>

      {loading && <FullScreenLoader visible={true} label="Processing Order..." />}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F8FAFC' },
  scrollContent: { padding: 20, paddingBottom: 100 },

  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(212,176,106,0.1)',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16, borderBottomWidth: 1, borderBottomColor: '#F1F5F9', paddingBottom: 10 },
  sectionTitle: { fontFamily: Fonts.Bold, fontSize: 14, color: '#1E293B' },

  productRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  productInfo: { flex: 1 },
  productName: { fontFamily: Fonts.Bold, fontSize: 15, color: '#1E293B' },
  productQty: { fontFamily: Fonts.Medium, fontSize: 12, color: '#94A3B8', marginTop: 2 },
  productPrice: { fontFamily: Fonts.Bold, fontSize: 16, color: Colors.finance_accent },

  inputGroup: { marginBottom: 15 },
  label: { fontFamily: Fonts.Bold, fontSize: 12, color: '#64748B', marginBottom: 6 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    minHeight: 52,
    paddingHorizontal: 12,
  },
  input: {
    fontFamily: Fonts.Medium,
    fontSize: 14,
    color: '#1E293B',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  errorText: {
    fontFamily: Fonts.Medium,
    fontSize: 11,
    color: '#EF4444',
    marginTop: 4,
    marginLeft: 4,
  },
  row: { flexDirection: 'row', gap: 12 },

  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  billLabel: { fontFamily: Fonts.Medium, fontSize: 13, color: '#64748B' },
  billVal: { fontFamily: Fonts.Bold, fontSize: 13, color: '#1E293B' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  totalLabel: { fontFamily: Fonts.Bold, fontSize: 16, color: '#0F172A' },
  totalVal: { fontFamily: Fonts.Bold, fontSize: 20, color: Colors.finance_accent },

  footer: { position: 'absolute', bottom: 0, width: width, backgroundColor: '#FFFFFF', padding: 20, borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  placeOrderBtn: { height: 55, borderRadius: 15, overflow: 'hidden' },
  grad: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  btnTxt: { fontFamily: Fonts.Bold, color: Colors.finance_accent, fontSize: 16 },
});
