import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Animated,
  Easing,
  Dimensions,
  PanResponder,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  Alert,
  ToastAndroid,
  StatusBar,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../constants/Colors";
import Fonts from "../constants/Fonts";
import HeaderBar from "../componets/HeaderBar";
import { getOperatorCircle, fetchOperatorByMobile, getRechargeOperatorList, getRechargeCircleList, verifyRechargeMobile, processRecharge } from "../api/AuthApi";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

export default function TopUpScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();

  const [type, setType]                         = useState("airtime");
  const [mobile, setMobile]                     = useState("");
  const [operator, setOperator]                 = useState("");
  const [circle, setCircle]                     = useState("");
  const [operators, setOperators]               = useState([]);
  const [circles, setCircles]                   = useState([]);
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [showCircleModal, setShowCircleModal]   = useState(false);
  const [loading, setLoading]                   = useState(false);
  const [searchText, setSearchText]             = useState("");
  const [amount, setAmount]                     = useState("199");
  const [operatorCode, setOperatorCode]         = useState("");
  const [receiptData, setReceiptData]           = useState(null);

  const [customToast, setCustomToast] = useState({ visible: false, message: "", type: "success" });
  const toastAnim = useRef(new Animated.Value(0)).current;

  // 🔹 Update states from navigation params
  useEffect(() => {
    if (route.params?.selectedAmount) setAmount(String(route.params.selectedAmount));
    if (route.params?.mobile)         setMobile(route.params.mobile);
    if (route.params?.operator)       setOperator(route.params.operator);
    if (route.params?.circle)         setCircle(route.params.circle);
    if (route.params?.operatorCode)   setOperatorCode(route.params.operatorCode);
  }, [route.params]);

  const showCustomToast = (msg, type = "success") => {
    setCustomToast({ visible: true, message: msg, type });
    Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start(() => {
      setTimeout(() => {
        Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() => {
          setCustomToast({ visible: false, message: "", type: "success" });
        });
      }, 2500);
    });
  };

  /* ── Entry animations ── */
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim  = useRef(new Animated.Value(0)).current;

  const showToast = (message) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert("Info", message);
    }
  };

  /* ── Slide-to-pay ── */
  const pan           = useRef(new Animated.Value(0)).current;
  const trackWidthRef = useRef(0);
  const [completed, setCompleted] = useState(false);
  const THUMB_WIDTH = 50;

  const handleRecharge = async () => {
    try {
      setLoading(true);
      const headerToken = await AsyncStorage.getItem("header_token");
      const config = {
        amount: Number(amount),
        operatorCode: operatorCode,
        number: mobile,
        billerMode: "prepaidrecharge"
      };
      
      const response = await processRecharge({ ...config, headerToken });
      
      if (response?.status === "SUCCESS" || response?.success) {
        setReceiptData({
          status: "success",
          amount: amount,
          txn_ref: response.txn_ref || response.txnRef || "N/A",
          message: response.message || "Transaction Successful",
          mobile: mobile,
          operator: operator
        });
      } else {
        setReceiptData({
          status: "error",
          amount: amount,
          txn_ref: response?.txn_ref || response?.txnRef || "N/A",
          message: response?.message || response?.error || "Recharge Failed",
          mobile: mobile,
          operator: operator
        });
      }
    } catch (error) {
       setReceiptData({
          status: "error",
          amount: amount,
          txn_ref: "N/A",
          message: "Something went wrong during recharge",
          mobile: mobile,
          operator: operator
       });
    } finally {
      setLoading(false);
      setCompleted(false);
      pan.setValue(0);
    }
  };

  const panResponder = React.useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => {
        pan.setOffset(0);
        pan.setValue(0);
      },
      onPanResponderMove: (_, g) => {
        const w = trackWidthRef.current;
        if (w > 0 && g.dx >= 0 && g.dx <= w - THUMB_WIDTH) pan.setValue(g.dx);
      },
      onPanResponderRelease: (_, g) => {
        const w = trackWidthRef.current;
        if (w > 0 && g.dx >= (w - THUMB_WIDTH) * 0.8) {
          // 🔹 Validation checks
          if (mobile.length !== 10) { showCustomToast("Enter 10-digit mobile number", "error"); Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start(); return; }
          if (!operator) { showCustomToast("Select Operator", "error"); Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start(); return; }
          if (!circle) { showCustomToast("Select Circle", "error"); Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start(); return; }
          if (!amount || Number(amount) <= 0) { showCustomToast("Enter valid amount", "error"); Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start(); return; }

          Animated.timing(pan, { toValue: w - THUMB_WIDTH, duration: 200, useNativeDriver: false }).start(() => {
            setCompleted(true);
            handleRecharge();
          });
        } else {
          Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
        }
      },
    }),
    [mobile, operator, circle, amount, operatorCode]
  );

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true, easing: Easing.out(Easing.exp) }),
      Animated.timing(fadeAnim,  { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();
    fetchOperatorCircle();
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (showOperatorModal) { setShowOperatorModal(false); return true; }
      if (showCircleModal)   { setShowCircleModal(false);   return true; }
      return false;
    };
    const handler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => handler.remove();
  }, [showOperatorModal, showCircleModal]);

  const fetchOperatorCircle = async () => {
    try {
      setLoading(true);
      
      const headerToken = await AsyncStorage.getItem("header_token");
      if (headerToken) {
        // Fetch operators from NEW API
        const opResult = await getRechargeOperatorList({ headerToken });
        if (opResult?.success) {
          setOperators(opResult.data || []);
        }

        // Fetch circles from NEW API
        const cirResult = await getRechargeCircleList({ headerToken });
        if (cirResult?.success) {
          setCircles(cirResult.data || []);
        }
      }
    } catch (e) {
      console.log("Operator/Circle API error", e);
    } finally {
      setLoading(false);
    }
  };

  const handleMobileChange = async (value) => {
    const num = value.replace(/\D/g, "");
    setMobile(num);
    if (num.length < 10) { setOperator(""); setCircle(""); return; }
    if (num.length === 10) {
      try {
        setLoading(true);
        const headerToken = await AsyncStorage.getItem("header_token");
        const result = await verifyRechargeMobile({ mobile: num, headerToken });
        
        if (result?.success) {
          const fetchedData = result.data || {};
          let currentOps = operators;
          if (currentOps.length === 0) {
             const opsData = await getRechargeOperatorList({ headerToken });
             if (opsData?.success) {
               currentOps = opsData.data || [];
               setOperators(currentOps);
             }
          }

          const matchedOp = currentOps.find(op => 
            (op.label && fetchedData.operator && op.label.toLowerCase() === fetchedData.operator.toLowerCase()) || 
            (op.rechargeValue && fetchedData.operatorCode && op.rechargeValue.toLowerCase() === fetchedData.operatorCode.toLowerCase()) ||
            (op.planFetchValue && fetchedData.operatorCode && op.planFetchValue.toLowerCase() === fetchedData.operatorCode.toLowerCase())
          );
          console.log("🔍 fetchedData:", fetchedData);
          console.log("🔍 currentOps count:", currentOps.length);
          console.log("🔍 matchedOp:", matchedOp);

          const matchedCir = circles.find(c => 
            String(c.circleCode) === String(fetchedData.circle) || 
            String(c.circlecode) === String(fetchedData.circle)
          );
          const opName = matchedOp?.label || matchedOp?.name || fetchedData.operator || "";
          const cirName = matchedCir?.circleName || matchedCir?.circlename || fetchedData.state || "";
          
          const opCode = matchedOp?.rechargeValue || fetchedData.operatorCode || "";
          console.log("🔍 SETTING OPERATOR CODE:", opCode);
          setOperatorCode(opCode);
          setOperator(opName);
          setCircle(cirName);
          
          navigation.navigate("StorePlans", {
            mobile: num,
            operator: opName,
            circle: cirName,
            plans: fetchedData.plans || [],
            operatorCode: opCode,
          });
        } else {
          setOperator(""); setCircle("");
          showCustomToast(result?.message || "Unable to detect operator", "error");
        }
      } catch (err) {
        console.log("Fetch operator error:", err);
        setOperator(""); setCircle("");
        showToast("Something went wrong");
      } finally {
        setLoading(false);
      }
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    /*
     *  SafeAreaView strategy:
     *    • edges={["bottom"]}  → handles home-indicator / gesture bar at bottom
     *    • StatusBar translucent + backgroundColor match header so the
     *      status-bar area is visually part of the header gradient
     *    • HeaderBar's paddingTop is driven by insets.top so it never
     *      overlaps the clock/battery row
     *    • The container backgroundColor (#161616 or Colors.finance_bg_1) fills
     *      the full screen including the status-bar region
     */
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: Colors.finance_bg_1 }]}
      edges={["bottom"]}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor={Colors.finance_bg_1}
        translucent={false}
      />

      <View style={styles.container}>

        {/* Header — top padding = insets.top so it clears the status bar */}
        <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
          <HeaderBar
            title="Mobile Recharge"
            onBack={() => navigation.goBack()}
          />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={insets.top + 56}
        >
          <ScrollView
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 20 }}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.mainContent,
                { transform: [{ translateY: slideAnim }], opacity: fadeAnim },
              ]}
            >

              {/* ══ SECTION 1: MOBILE ══ */}
              <View style={styles.modernCard}>
                <View style={styles.modernCardHeader}>
                  <Text style={styles.modernCardTitle}>Personal Details</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>MOBILE</Text>
                  </View>
                </View>
                <View style={styles.modernInputWrapper}>
                  <Text style={styles.floatingLabel}>Mobile Number</Text>
                  <View style={styles.rowCenter}>
                    <Text style={styles.prefixText}>+91</Text>
                    <TextInput
                      value={mobile}
                      onChangeText={handleMobileChange}
                      placeholder="00000 00000"
                      placeholderTextColor="#AAA"
                      keyboardType="number-pad"
                      maxLength={10}
                      style={styles.bigInput}
                    />
                    <TouchableOpacity style={styles.contactBtnRound}>
                      <Icon name="account-search-outline" size={18} color={Colors.white} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* ══ SECTION 2: CONNECTION ══ */}
              <View style={styles.modernCard}>
                <Text style={styles.modernCardTitle}>Connection Details</Text>
                <View style={styles.connectionContainer}>
                  <TouchableOpacity
                    style={styles.connectionRow}
                    onPress={() => operators.length && setShowOperatorModal(true)}
                  >
                    <View style={styles.iconBox}>
                      <Icon name="sim" size={18} color={Colors.finance_accent} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.connectionLabel}>Operator</Text>
                      <Text style={styles.connectionValues}>{operator || "Select Provider"}</Text>
                    </View>
                    <Icon name="chevron-down" size={20} color={Colors.finance_text} />
                  </TouchableOpacity>

                  <View style={styles.dividerLine} />

                  <TouchableOpacity
                    style={styles.connectionRow}
                    onPress={() => circles.length && setShowCircleModal(true)}
                  >
                    <View style={styles.iconBox}>
                      <Icon name="map-marker-radius" size={18} color={Colors.finance_accent} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.connectionLabel}>Circle</Text>
                      <Text style={styles.connectionValues}>{circle || "Select Circle"}</Text>
                    </View>
                    <Icon name="chevron-down" size={20} color={Colors.finance_text} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ══ PREMIUM AMOUNT ══ */}
              <View style={styles.premiumAmountCard}>
                <View style={styles.typeSelector}>
                  {["airtime", "special"].map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                      onPress={() => setType(t)}
                    >
                      <Text style={[styles.typeText, type === t && styles.typeTextActive]}>
                        {t === "airtime" ? "Topup" : "Special Plans"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.amountHeader}>Pick or Enter Amount</Text>

                <View style={styles.amountInputRow}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    value={amount}
                    onChangeText={setAmount}
                    placeholder="0"
                    placeholderTextColor="rgba(212, 176, 106, 0.3)"
                    keyboardType="numeric"
                    style={styles.hugeInput}
                  />
                </View>

                <View style={styles.suggestionsWrapper}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.suggestionsContainer}
                  >
                    {["199", "299", "499", "666", "849"].map((val) => (
                      <TouchableOpacity
                        key={val}
                        style={[styles.suggestionChip, amount === val && styles.suggestionChipActive]}
                        onPress={() => setAmount(val)}
                      >
                        <Text style={[styles.suggestionText, amount === val && styles.suggestionTextActive]}>
                          ₹{val}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                <TouchableOpacity
                  style={styles.viewPlansBtn}
                  onPress={() => showToast("Loading available plans...")}
                >
                  <LinearGradient
                    colors={[Colors.finance_accent, "#E0C38C"]}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                    style={styles.viewPlansGradient}
                  >
                    <Text style={styles.viewPlansText}>Explore All Plans</Text>
                    <Icon name="notebook-outline" size={18} color={Colors.black} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ══ SLIDER ACTION (Fixed at Bottom) ══ */}
        <View style={styles.actionContainer}>
          {!completed ? (
            <View
              style={styles.sliderWrapper}
              onLayout={(e) => { trackWidthRef.current = e.nativeEvent.layout.width; }}
            >
              <Animated.View style={[styles.sliderBackground, {
                opacity: pan.interpolate({ inputRange: [0, 100], outputRange: [1, 0.5], extrapolate: "clamp" }),
              }]}>
                <Text style={styles.swipeText}>SWIPE TO RECHARGE</Text>
              </Animated.View>
              <Animated.View
                style={[styles.sliderThumb, { transform: [{ translateX: pan }] }]}
                {...panResponder.panHandlers}
              >
                <LinearGradient colors={[Colors.finance_accent, "#b8944d"]} style={styles.thumbGrad}>
                  <Icon name="chevron-right" size={28} color={Colors.white} />
                </LinearGradient>
              </Animated.View>
            </View>
          ) : (
            <LinearGradient
              colors={[Colors.finance_accent, "#b8944d"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.processingBtn}
            >
              <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: 10 }} />
              <Text style={styles.processingText}>PROCESSING...</Text>
            </LinearGradient>
          )}
        </View>
      </View>

      {/* ══ OPERATOR MODAL ══ */}
      <BottomSheetModal
        visible={showOperatorModal}
        onClose={() => { setShowOperatorModal(false); setSearchText(""); }}
        title="Select Provider"
        searchText={searchText}
        onSearch={setSearchText}
        searchPlaceholder="Search Operator..."
        items={operators.filter(op => (op.label || op.name || "").toLowerCase().includes(searchText.toLowerCase()))}
        selectedValue={operator}
        iconName="sim"
        getLabel={op => op.label || op.name}
        onSelect={(op) => { setOperator(op.label || op.name); setOperatorCode(op.rechargeValue || ""); setShowOperatorModal(false); setSearchText(""); }}
      />

      {/* ══ CIRCLE MODAL ══ */}
      <BottomSheetModal
        visible={showCircleModal}
        onClose={() => { setShowCircleModal(false); setSearchText(""); }}
        title="Select Circle"
        searchText={searchText}
        onSearch={setSearchText}
        searchPlaceholder="Search Circle..."
        items={circles.filter(c => (c.circleName || c.circlename || "").toLowerCase().includes(searchText.toLowerCase()))}
        selectedValue={circle}
        iconName="map-marker-radius"
        getLabel={c => c.circleName || c.circlename}
        onSelect={(c) => { setCircle(c.circleName || c.circlename); setShowCircleModal(false); setSearchText(""); }}
      />

      {/* ══ FULL SCREEN LOADER ══ */}
      {loading && (
        <View style={styles.fullLoader}>
          <ActivityIndicator size="large" color={Colors.finance_accent} />
        </View>
      )}

      {/* ══ CUSTOM TOAST ══ */}
      {customToast.visible && (
        <Animated.View style={[styles.customToastBox, { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [-40, 0] }) }] }]}>
          <LinearGradient colors={customToast.type === "success" ? ["#4CAF50", "#2E7D32"] : ["#F44336", "#C62828"]} style={styles.customToastGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Icon name={customToast.type === "success" ? "check-circle" : "alert-circle"} size={20} color={Colors.white} />
              <Text style={styles.customToastText}>{customToast.message}</Text>
          </LinearGradient>
        </Animated.View>
      )}

      {/* ══ RECHARGE RECEIPT MODAL ══ */}
      <Modal visible={!!receiptData} transparent animationType="slide" onRequestClose={() => setReceiptData(null)}>
        <View style={styles.receiptOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setReceiptData(null)} />
          <View style={styles.receiptContent}>
            <View style={styles.receiptHeader}>
              <LinearGradient 
                colors={receiptData?.status === "success" ? ["#4CAF50", "#388E3C"] : ["#E53935", "#B71C1C"]} 
                style={[styles.successBadge, receiptData?.status === "error" && { backgroundColor: '#E53935' }]}
              >
                <Icon name={receiptData?.status === "success" ? "check" : "close"} size={24} color="#FFF" />
              </LinearGradient>
              <Text style={[styles.receiptStatusText, receiptData?.status === "error" && { color: '#E53935' }]}>
                {receiptData?.message}
              </Text>
              <Text style={styles.receiptAmountText}>₹{receiptData?.amount}</Text>
              <Text style={styles.receiptInfo}>For {receiptData?.mobile} ({receiptData?.operator})</Text>
            </View>

            <View style={styles.dashedLine} />

            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Transaction ID</Text>
              <Text style={styles.detailsValue}>{receiptData?.txn_ref}</Text>
            </View>

            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Date & Time</Text>
              <Text style={styles.detailsValue}>{new Date().toLocaleString()}</Text>
            </View>

            <View style={styles.detailsRow}>
              <Text style={styles.detailsLabel}>Payment Mode</Text>
              <Text style={styles.detailsValue}>Main Wallet</Text>
            </View>

            <View style={styles.dashedLine} />

            <TouchableOpacity style={styles.doneBtn} onPress={() => setReceiptData(null)}>
              <Text style={styles.doneText}>Download Receipt</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reusable bottom sheet modal (operator + circle share same UI)
// ─────────────────────────────────────────────────────────────────────────────
function BottomSheetModal({ visible, onClose, title, searchText, onSearch, searchPlaceholder, items, selectedValue, iconName, getLabel, onSelect }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={styles.bottomSheet}>
        <View style={styles.sheetHeader}>
          <View style={styles.handleBar} />
          <View style={styles.sheetTitleRow}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.sheetSearchRow}>
            <Icon name="magnify" size={20} color="#666" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.sheetSearchInput}
              placeholder={searchPlaceholder}
              placeholderTextColor="#BDBDBD"
              value={searchText}
              onChangeText={onSearch}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => onSearch("")}>
                <Icon name="close-circle" size={18} color="#BDBDBD" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
          {items.length > 0 ? (
            items.map((item, idx) => {
              const label = getLabel(item);
              const isSel = selectedValue === label;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.sheetListItem, isSel && styles.sheetListItemSel]}
                  onPress={() => onSelect(item)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.sheetListIconBox, isSel && styles.sheetListIconBoxSel]}>
                    <Icon name={iconName} size={20} color={isSel ? Colors.finance_accent : "#666"} />
                  </View>
                  <Text style={[styles.sheetListTxt, isSel && styles.sheetListTxtSel]}>{label}</Text>
                  {isSel && (
                    <View style={styles.checkCircle}>
                      <Icon name="check" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTxt}>No results found</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  // ── Root ──────────────────────────────────────────────────────────────────
  safeArea: {
    flex: 1,
    // backgroundColor is applied inline using Colors.finance_bg_1
    // so the status bar region matches the header
  },
  container: {
    flex: 1,
  },

  // ── Header wrapper ────────────────────────────────────────────────────────
  // paddingTop is set inline as insets.top
  // HeaderBar itself has no extra top padding
  headerWrapper: {
    backgroundColor: Colors.finance_bg_1 ?? "#F7F8FA",
  },

  // ── Body ──────────────────────────────────────────────────────────────────
  mainContent: {
    paddingHorizontal: 12,
    paddingBottom: 14,
  },

  // ── Cards ─────────────────────────────────────────────────────────────────
  modernCard: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(212, 176, 106, 0.1)",
  },
  modernCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  modernCardTitle: { fontSize: 12, fontFamily: Fonts.Bold, color: "#333" },
  badge: {
    backgroundColor: Colors.finance_bg_2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.finance_accent,
  },
  badgeText: { fontSize: 9, fontFamily: Fonts.Bold, color: Colors.finance_accent },

  // ── Mobile input ──────────────────────────────────────────────────────────
  modernInputWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    paddingBottom: 4,
  },
  floatingLabel:   { fontSize: 10, color: "#999", fontFamily: Fonts.Medium, marginBottom: 2 },
  rowCenter:       { flexDirection: "row", alignItems: "center" },
  prefixText:      { fontSize: 16, fontFamily: Fonts.Medium, color: "#AAA", marginRight: 8 },
  bigInput:        { flex: 1, fontSize: 18, fontFamily: Fonts.Bold, color: Colors.finance_text, padding: 0, height: 34 },
  contactBtnRound: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.finance_accent, alignItems: "center", justifyContent: "center", elevation: 4 },

  // ── Connection ────────────────────────────────────────────────────────────
  connectionContainer: { backgroundColor: "#F9F9F9", borderRadius: 14, borderWidth: 1, borderColor: "#EEE", overflow: "hidden" },
  connectionRow:       { flexDirection: "row", alignItems: "center", padding: 10 },
  iconBox:             { width: 30, height: 30, borderRadius: 8, backgroundColor: Colors.white, alignItems: "center", justifyContent: "center", elevation: 2 },
  connectionLabel:     { fontSize: 9, fontFamily: Fonts.Bold, color: "#777", textTransform: "uppercase" },
  connectionValues:    { fontSize: 12, fontFamily: Fonts.Medium, color: "#000", marginTop: 2 },
  dividerLine:         { height: 1, backgroundColor: "#EEE", marginHorizontal: 14 },

  // ── Amount card ───────────────────────────────────────────────────────────
  premiumAmountCard: {
    backgroundColor: "#1A1A1A",
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    elevation: 8,
    shadowColor: Colors.finance_accent,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    borderWidth: 1.5,
    borderColor: "rgba(212, 176, 106, 0.4)",
  },
  typeSelector:    { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 12, padding: 3, marginBottom: 12 },
  typeBtn:         { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 },
  typeBtnActive:   { backgroundColor: "rgba(212, 176, 106, 0.2)", borderWidth: 1, borderColor: "rgba(212, 176, 106, 0.5)" },
  typeText:        { fontSize: 11, fontFamily: Fonts.Medium, color: "rgba(255,255,255,0.4)" },
  typeTextActive:  { color: Colors.finance_accent, fontFamily: Fonts.Bold },
  amountHeader:    { fontSize: 10, color: "rgba(255,255,255,0.6)", fontFamily: Fonts.Medium, textTransform: "uppercase", letterSpacing: 1, textAlign: "center", marginBottom: 8 },
  amountInputRow:  { flexDirection: "row", alignItems: "center", marginBottom: 12, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingVertical: 8, paddingHorizontal: 14 },
  currencySymbol:  { fontSize: 20, fontFamily: Fonts.Bold, color: Colors.finance_accent, marginRight: 8 },
  hugeInput:       { flex: 1, fontSize: 28, fontFamily: Fonts.Bold, color: "#FFFFFF", padding: 0 },
  suggestionsWrapper:   { marginBottom: 12 },
  suggestionsContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  suggestionChip:       { backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  suggestionChipActive: { backgroundColor: "rgba(212, 176, 106, 0.2)", borderColor: Colors.finance_accent },
  suggestionText:       { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: Fonts.Medium },
  suggestionTextActive: { color: Colors.finance_accent, fontFamily: Fonts.Bold },
  viewPlansBtn:     { borderRadius: 14, overflow: "hidden" },
  viewPlansGradient:{ flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 10 },
  viewPlansText:    { color: Colors.black, fontFamily: Fonts.Bold, fontSize: 14 },

  // ── Slider ────────────────────────────────────────────────────────────────
  actionContainer: { padding: 12, backgroundColor: Colors.finance_bg_1, borderTopWidth: 1, borderTopColor: 'rgba(212, 176, 106, 0.1)' },
  sliderWrapper:   { height: 60, backgroundColor: Colors.white, borderRadius: 30, borderWidth: 1.5, borderColor: Colors.finance_accent, justifyContent: "center", elevation: 4, overflow: "hidden" },
  sliderBackground:{ ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  swipeText:       { color: Colors.finance_accent, fontSize: 14, fontFamily: Fonts.Bold, letterSpacing: 2 },
  sliderThumb:     { width: 52, height: 52, borderRadius: 26, position: "absolute", left: 4, elevation: 5 },
  thumbGrad:       { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  processingBtn:   { height: 60, borderRadius: 30, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  processingText:  { color: Colors.white, fontFamily: Fonts.Bold, fontSize: 14, letterSpacing: 1 },

  // ── Bottom sheet ──────────────────────────────────────────────────────────
  sheetBackdrop:       { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.45)" },
  bottomSheet:         { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "75%", elevation: 20, shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 12 },
  sheetHeader:         { paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#F0F0F0" },
  handleBar:           { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E0E0E0", alignSelf: "center", marginTop: 10, marginBottom: 10 },
  sheetTitleRow:       { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sheetTitle:          { fontSize: 15, fontFamily: Fonts.Bold, color: "#333" },
  closeBtn:            { width: 28, height: 28, borderRadius: 14, backgroundColor: "#F4F4F4", alignItems: "center", justifyContent: "center" },
  sheetSearchRow:      { flexDirection: "row", alignItems: "center", backgroundColor: "#F5F5F5", borderRadius: 10, paddingHorizontal: 10, marginBottom: 4, height: 40 },
  sheetSearchInput:    { flex: 1, fontSize: 13, fontFamily: Fonts.Medium, color: "#212121", padding: 0 },
  sheetListItem:       { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F5F5F5" },
  sheetListItemSel:    { backgroundColor: Colors.finance_accent + "15" },
  sheetListIconBox:    { width: 32, height: 32, borderRadius: 10, backgroundColor: "#F5F5F5", alignItems: "center", justifyContent: "center", marginRight: 10 },
  sheetListIconBoxSel: { backgroundColor: Colors.finance_accent + "25" },
  sheetListTxt:        { flex: 1, fontSize: 13, fontFamily: Fonts.Medium, color: "#212121" },
  sheetListTxtSel:     { color: Colors.finance_accent, fontFamily: Fonts.Bold },
  checkCircle:         { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.finance_accent, alignItems: "center", justifyContent: "center" },
  emptyWrap:           { alignItems: "center", paddingVertical: 30 },
  emptyTxt:            { color: "#BDBDBD", fontSize: 13, fontFamily: Fonts.Medium },

  customToastBox: { position: 'absolute', top: 60, left: 20, right: 20, zIndex: 9999 },
  customToastGrad: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, gap: 10, elevation: 6, shadowColor: "#000", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.2, shadowRadius: 5 },
  customToastText: { color: '#FFF', fontFamily: Fonts.Bold, fontSize: 13, flex: 1 },

  receiptOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  receiptContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 30 },
  receiptHeader: { alignItems: 'center', marginBottom: 15 },
  successBadge: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  receiptStatusText: { fontSize: 16, fontFamily: Fonts.Bold, color: '#2E7D32' },
  receiptAmountText: { fontSize: 32, fontFamily: Fonts.Bold, color: '#111', marginVertical: 6 },
  receiptInfo: { fontSize: 13, fontFamily: Fonts.Medium, color: '#666' },
  dashedLine: { borderWidth: 1, borderColor: '#EEE', borderStyle: 'dashed', marginVertical: 18, borderRadius: 1 },
  detailsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14, alignItems: 'center' },
  detailsLabel: { fontSize: 13, fontFamily: Fonts.Medium, color: '#777' },
  detailsValue: { fontSize: 13, fontFamily: Fonts.Bold, color: '#333', flex: 1, textAlign: 'right' },
  doneBtn: { backgroundColor: '#002E6E', paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 12 },
  doneText: { color: '#FFF', fontFamily: Fonts.Bold, fontSize: 14, letterSpacing: 1 },

  // ── Loader ────────────────────────────────────────────────────────────────
  fullLoader: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.7)", justifyContent: "center", alignItems: "center", zIndex: 1000 },
});