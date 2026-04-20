import React, { useEffect, useState, useRef, useCallback } from "react";
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
  StatusBar,
  PermissionsAndroid,
  RefreshControl,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import RNShare from "react-native-share"; // npm install react-native-share
import Colors from "../../../constants/Colors";
import Fonts from "../../../constants/Fonts";
import HeaderBar from "../../../componets/HeaderBar/HeaderBar";
import {
  getRechargeOperatorList,
  getRechargeCircleList,
  verifyRechargeMobile,
  processRecharge,
  getMyRechargeHistory,
} from "../../../api/AuthApi";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import ViewShot from "react-native-view-shot";
import FullScreenLoader from "../../../componets/Loader/FullScreenLoader";
import ReceiptModal from "../../../componets/ReceiptModal/ReceiptModal";
import CustomAlert from "../../../componets/Alerts/CustomAlert";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");





// ─────────────────────────────────────────────────────────────────────────────
//  BottomSheetModal
// ─────────────────────────────────────────────────────────────────────────────

function BottomSheetModal({
  visible, onClose, title,
  searchText, onSearch, searchPlaceholder,
  items, selectedValue, iconName, getLabel, onSelect,
}) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const swipePan = useRef(new Animated.Value(0)).current;
  const isClosing = useRef(false);

  useEffect(() => {
    if (visible) {
      isClosing.current = false;
      swipePan.setValue(0);
      translateY.setValue(SCREEN_HEIGHT);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 260, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const swipeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderMove: (_, g) => { if (g.dy > 0) swipePan.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if ((g.dy > 80 || g.vy > 0.5) && !isClosing.current) {
          isClosing.current = true;
          Animated.parallel([
            Animated.timing(swipePan, { toValue: SCREEN_HEIGHT, duration: 240, useNativeDriver: true }),
            Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
          ]).start(() => { swipePan.setValue(0); onClose(); });
        } else {
          Animated.spring(swipePan, { toValue: 0, useNativeDriver: true, bounciness: 6, speed: 14 }).start();
        }
      },
    })
  ).current;

  const combinedY = Animated.add(translateY, swipePan);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? "box-none" : "none"}>
      <Animated.View
        style={[styles.sheetBackdrop, { opacity: backdropOpacity }]}
        pointerEvents={visible ? "auto" : "none"}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[styles.bottomSheet, { transform: [{ translateY: combinedY }] }]}
        pointerEvents="auto"
      >
        <View style={styles.sheetHeader} {...swipeResponder.panHandlers}>
          <View style={styles.handleBar} />
          <View style={styles.sheetTitleRow}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={18} color={Colors.gray_66} />
            </TouchableOpacity>
          </View>
          <View style={styles.sheetSearchRow}>
            <Icon name="magnify" size={20} color={Colors.gray_66} style={{ marginRight: 8 }} />
            <TextInput
              style={styles.sheetSearchInput}
              placeholder={searchPlaceholder}
              placeholderTextColor={Colors.text_placeholder}
              value={searchText}
              onChangeText={onSearch}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => onSearch("")}>
                <Icon name="close-circle" size={18} color={Colors.text_placeholder} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
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
                    <Icon name={iconName} size={20} color={isSel ? Colors.white : Colors.finance_accent} />
                  </View>
                  <Text style={[styles.sheetListTxt, isSel && styles.sheetListTxtSel]}>{label}</Text>
                  {isSel && (
                    <View style={styles.checkCircle}>
                      <Icon name="check" size={14} color={Colors.white} />
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
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TopUpScreen
// ─────────────────────────────────────────────────────────────────────────────

export default function TopUpScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();

  const [type, setType] = useState("airtime");
  const [mobile, setMobile] = useState("");
  const [operator, setOperator] = useState("");
  const [circle, setCircle] = useState("");
  const [operators, setOperators] = useState([]);
  const [circles, setCircles] = useState([]);
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [showCircleModal, setShowCircleModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [amount, setAmount] = useState("199");
  const [operatorCode, setOperatorCode] = useState("");
  const [receiptData, setReceiptData] = useState(null);
  const [completed, setCompleted] = useState(false);
  const [rechargeHistory, setRechargeHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [alert, setAlert] = useState({ visible: false, type: "info", title: "", message: "" });
  const toastAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.Value(0)).current;
  const trackWidthRef = useRef(0);
  const THUMB_WIDTH = 50;

  useEffect(() => {
    if (route.params?.selectedAmount) setAmount(String(route.params.selectedAmount));
    if (route.params?.mobile) setMobile(route.params.mobile);
    if (route.params?.operator) setOperator(route.params.operator);
    if (route.params?.circle) setCircle(route.params.circle);
    if (route.params?.operatorCode) setOperatorCode(route.params.operatorCode);
  }, [route.params]);

  const showAlert = (type, title, message) => {
    setAlert({ visible: true, type, title, message });
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true, easing: Easing.out(Easing.exp) }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();
    fetchOperatorCircle();
    fetchRechargeHistory();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([fetchOperatorCircle(), fetchRechargeHistory()]);
    setRefreshing(false);
  }, []);

  const fetchRechargeHistory = async () => {
    try {
      setHistoryLoading(true);
      const headerToken = await AsyncStorage.getItem("header_token");
      if (headerToken) {
        const result = await getMyRechargeHistory({ headerToken });
        if (result?.success) setRechargeHistory(result.data || []);
      }
    } catch (e) {
      console.log("Recharge history fetch error", e);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    const backAction = () => {
      if (showOperatorModal) { setShowOperatorModal(false); return true; }
      if (showCircleModal) { setShowCircleModal(false); return true; }
      navigation.navigate("FinanceHome");
      return true;
    };
    const handler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => handler.remove();
  }, [showOperatorModal, showCircleModal]);

  const fetchOperatorCircle = async () => {
    try {
      setLoading(true);
      const headerToken = await AsyncStorage.getItem("header_token");
      if (headerToken) {
        const opResult = await getRechargeOperatorList({ headerToken });
        if (opResult?.success) setOperators(opResult.data || []);
        const cirResult = await getRechargeCircleList({ headerToken });
        if (cirResult?.success) setCircles(cirResult.data || []);
      }
    } catch (e) {
      console.log("Operator/Circle API error", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async () => {
    try {
      setLoading(true);
      const headerToken = await AsyncStorage.getItem("header_token");
      const response = await processRecharge({
        amount: Number(amount), operatorCode, number: mobile,
        billerMode: "prepaidrecharge", headerToken,
      });
      const isSuccess =
        response?.success === true ||
        response?.status === "SUCCESS" ||
        response?.data?.status === "SUCCESS";
      const resData = response?.data || {};

      setReceiptData(
        isSuccess
          ? {
            status: "success",
            amount,
            txn_ref: resData.txn_ref || response.txn_ref || "",
            message: resData.message || response.message || "Recharge Successful",
            mobile,
            operator,
          }
          : {
            status: "error",
            amount,
            txn_ref: resData.txn_ref || response?.txn_ref || "N/A",
            message: resData.message || response?.message || response?.error || "Recharge Failed",
            mobile,
            operator,
          }
      );
    } catch {
      setReceiptData({
        status: "error", amount, txn_ref: "N/A",
        message: "Something went wrong during recharge", mobile, operator,
      });
    } finally {
      setLoading(false);
      setCompleted(false);
      pan.setValue(0);
    }
  };

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => { pan.setOffset(0); pan.setValue(0); },
        onPanResponderMove: (_, g) => {
          const w = trackWidthRef.current;
          if (w > 0 && g.dx >= 0 && g.dx <= w - THUMB_WIDTH) pan.setValue(g.dx);
        },
        onPanResponderRelease: (_, g) => {
          const w = trackWidthRef.current;
          const snap = () => Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
          if (w > 0 && g.dx >= (w - THUMB_WIDTH) * 0.8) {
            if (mobile.length !== 10) { showAlert("warning", "Validation", "Enter 10-digit mobile number"); snap(); return; }
            if (!operator) { showAlert("warning", "Validation", "Select Operator"); snap(); return; }
            if (!circle) { showAlert("warning", "Validation", "Select Circle"); snap(); return; }
            if (!amount || Number(amount) <= 0) { showAlert("warning", "Validation", "Enter valid amount"); snap(); return; }
            Animated.timing(pan, { toValue: w - THUMB_WIDTH, duration: 200, useNativeDriver: false })
              .start(() => { setCompleted(true); handleRecharge(); });
          } else {
            snap();
          }
        },
      }),
    [mobile, operator, circle, amount, operatorCode]
  );

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
            if (opsData?.success) { currentOps = opsData.data || []; setOperators(currentOps); }
          }
          const matchedOp = currentOps.find(
            (op) =>
              (op.label && fetchedData.operator && op.label.toLowerCase() === fetchedData.operator.toLowerCase()) ||
              (op.rechargeValue && fetchedData.operatorCode && op.rechargeValue.toLowerCase() === fetchedData.operatorCode.toLowerCase()) ||
              (op.planFetchValue && fetchedData.operatorCode && op.planFetchValue.toLowerCase() === fetchedData.operatorCode.toLowerCase())
          );
          const matchedCir = circles.find(
            (c) =>
              String(c.circleCode) === String(fetchedData.circle) ||
              String(c.circlecode) === String(fetchedData.circle)
          );
          const opName = matchedOp?.label || matchedOp?.name || fetchedData.operator || "";
          const cirName = matchedCir?.circleName || matchedCir?.circlename || fetchedData.state || "";
          const opCode = matchedOp?.rechargeValue || fetchedData.operatorCode || "";
          setOperatorCode(opCode); setOperator(opName); setCircle(cirName);
          navigation.navigate("StorePlans", {
            mobile: num, operator: opName, circle: cirName,
            plans: fetchedData.plans || [], operatorCode: opCode,
          });
        } else {
          setOperator(""); setCircle("");
          showAlert("error", "Error", result?.message || "Unable to detect operator");
        }
      } catch {
        setOperator(""); setCircle("");
        showAlert("error", "Error", "Something went wrong");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}

    >
      <StatusBar translucent={false} />
      <View style={styles.container}>

        <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
          <HeaderBar title="Mobile Recharge" onBack={() => navigation.navigate("FinanceHome")} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={insets.top + 56}
        >
          <ScrollView
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 20 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={Colors.finance_accent}
                colors={[Colors.finance_accent]}
                progressBackgroundColor="#2C2C2C"
              />
            }
          >
            <Animated.View
              style={[
                styles.mainContent,
                { transform: [{ translateY: slideAnim }], opacity: fadeAnim },
              ]}
            >

              {/* MOBILE */}
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
                      placeholderTextColor={Colors.text_placeholder}
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

              {/* CONNECTION */}
              <View style={styles.modernCard}>
                <Text style={styles.modernCardTitle}>Connection Details</Text>
                <View style={styles.connectionContainer}>
                  <TouchableOpacity
                    style={styles.connectionRow}
                    activeOpacity={1}
                    onPress={() => operators.length && setShowOperatorModal(true)}
                  >
                    <View style={styles.iconBox}>
                      <Icon name="sim" size={18} color={Colors.finance_accent} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.connectionLabel}>Operator</Text>
                      <Text style={[styles.connectionValues, showOperatorModal && { color: Colors.finance_accent }]}>
                        {operator || "Select Provider"}
                      </Text>
                    </View>
                    <Icon
                      name={showOperatorModal ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={showOperatorModal ? Colors.finance_accent : Colors.finance_text}
                    />
                  </TouchableOpacity>
                  <View style={styles.dividerLine} />
                  <TouchableOpacity
                    style={styles.connectionRow}
                    activeOpacity={1}
                    onPress={() => circles.length && setShowCircleModal(true)}
                  >
                    <View style={styles.iconBox}>
                      <Icon name="map-marker-radius" size={18} color={Colors.finance_accent} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.connectionLabel}>Circle</Text>
                      <Text style={[styles.connectionValues, showCircleModal && { color: Colors.finance_accent }]}>
                        {circle || "Select Circle"}
                      </Text>
                    </View>
                    <Icon
                      name={showCircleModal ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={showCircleModal ? Colors.finance_accent : Colors.finance_text}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* AMOUNT */}
              <View style={styles.premiumAmountCard}>
                <Text style={styles.amountHeader}>Pick or Enter Amount</Text>
                <View style={styles.amountInputRow}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    value={amount}
                    onChangeText={(val) => setAmount(val.replace(/[^0-9]/g, ""))}
                    placeholder="0"
                    placeholderTextColor={Colors.amberOpacity_30}
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
                  onPress={async () => {
                    if (mobile.length !== 10) { showAlert("warning", "Validation", "Enter 10-digit mobile number"); return; }
                    if (!operator) { showAlert("warning", "Validation", "Select Operator"); return; }
                    if (!circle) { showAlert("warning", "Validation", "Select Circle"); return; }
                    try {
                      setLoading(true);
                      const headerToken = await AsyncStorage.getItem("header_token");
                      const result = await verifyRechargeMobile({ mobile, headerToken });
                      if (result?.success) {
                        navigation.navigate("StorePlans", {
                          mobile, operator, circle,
                          plans: result.data?.plans || [], operatorCode,
                        });
                      } else {
                        showAlert("error", "Error", result?.message || "Unable to load plans");
                      }
                    } catch {
                      showAlert("error", "Error", "Something went wrong");
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <LinearGradient
                    colors={[Colors.finance_accent || "#d4b06a", Colors.hex_E0C38C || "#E0C38C"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.viewPlansGradient}
                  >
                    <Text style={styles.viewPlansText}>Explore All Plans</Text>
                    <Icon name="notebook-outline" size={18} color={Colors.black} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>


              {/* RECENT RECHARGE HISTORY */}
              {(historyLoading || rechargeHistory.length > 0) && (
                <View style={styles.historyCard_Outer}>

                  {/* ── Header banner (dark) ── */}
                  <View style={styles.historyHeaderGrad}>
                    <View style={styles.historyHeaderLeft}>
                      <View style={styles.historyHeaderIconBox}>
                        <Icon name="history" size={15} color={Colors.finance_accent} />
                      </View>
                      <Text style={styles.historySectionTitle}>Recent Recharges</Text>
                    </View>
                    {!historyLoading && rechargeHistory.length > 0 && (
                      <View style={styles.historyCountBadge}>
                        <Text style={styles.historyCountText}>{rechargeHistory.length}</Text>
                      </View>
                    )}
                  </View>

                  {/* ── Cards list (scrollable) ── */}
                  <ScrollView
                    style={styles.historyCardsList}
                    nestedScrollEnabled={true}
                    showsVerticalScrollIndicator={false}
                  >
                    {historyLoading ? (
                      <ActivityIndicator size="small" color={Colors.finance_accent} style={{ marginVertical: 18 }} />
                    ) : (
                      rechargeHistory.map((item) => {
                        const isSuccess = item.status === "SUCCESS";
                        const isFailed = item.status === "FAILED";
                        const statusColor = isSuccess ? Colors.success : isFailed ? Colors.error : Colors.warning_dark;
                        const statusBg = isSuccess ? Colors.successOpacity_10 : isFailed ? Colors.redOpacity_10 : Colors.warningOpacity_10;
                        const opInitial = (item.operatorName || "?")[0].toUpperCase();
                        const dateStr = item.createdAt
                          ? new Date(item.createdAt).toLocaleDateString("en-IN", {
                            day: "2-digit", month: "short", year: "numeric",
                          }) + "  " +
                          new Date(item.createdAt).toLocaleTimeString("en-IN", {
                            hour: "2-digit", minute: "2-digit", hour12: true,
                          })
                          : "";

                        return (
                          <View key={item._id} style={styles.historyItemRow}>
                            {/* Left — operator badge */}
                            <View style={[styles.historyOpBadge, { backgroundColor: Colors.finance_accent + "18" }]}>
                              <Text style={styles.historyOpInitial}>{opInitial}</Text>
                            </View>

                            {/* Middle — details */}
                            <View style={{ flex: 1, marginHorizontal: 10 }}>
                              <Text style={styles.historyOpName}>
                                {item.operatorName}
                                <Text style={styles.historyMobile}> · {item.mobileNumber}</Text>
                              </Text>
                              <Text style={styles.historyRefId} numberOfLines={1}>
                                {item.referenceId}
                              </Text>
                              <Text style={styles.historyDate}>{dateStr}</Text>
                            </View>

                            {/* Right — amount + status */}
                            <View style={{ alignItems: "flex-end" }}>
                              <Text style={styles.historyAmount}>₹{item.amount}</Text>
                              <View style={[styles.historyStatusPill, { backgroundColor: statusBg }]}>
                                <View style={[styles.historyStatusDot, { backgroundColor: statusColor }]} />
                                <Text style={[styles.historyStatusText, { color: statusColor }]}>
                                  {item.status}
                                </Text>
                              </View>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </ScrollView>

                </View>
              )}

            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* SWIPE TO RECHARGE */}
        {!showOperatorModal && !showCircleModal && (
          <View style={styles.actionContainer}>
            {!completed ? (
              <View
                style={styles.sliderWrapper}
                onLayout={(e) => { trackWidthRef.current = e.nativeEvent.layout.width; }}
              >
                <Animated.View
                  style={[
                    styles.sliderBackground,
                    {
                      opacity: pan.interpolate({
                        inputRange: [0, 100], outputRange: [1, 0.5], extrapolate: "clamp",
                      }),
                    },
                  ]}
                >
                  <Text style={styles.swipeText}>SWIPE TO RECHARGE</Text>
                </Animated.View>
                <Animated.View
                  style={[styles.sliderThumb, { transform: [{ translateX: pan }] }]}
                  {...panResponder.panHandlers}
                >
                  <LinearGradient colors={[Colors.finance_accent || "#d4b06a", Colors.hex_B8944D || "#B8944D"]} style={styles.thumbGrad}>
                    <Icon name="chevron-right" size={28} color={Colors.white} />
                  </LinearGradient>
                </Animated.View>
              </View>
            ) : (
              <LinearGradient
                colors={[Colors.finance_accent || "#d4b06a", Colors.hex_B8944D || "#B8944D"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.processingBtn}
              >
                <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: 10 }} />
                <Text style={styles.processingText}>PROCESSING...</Text>
              </LinearGradient>
            )}
          </View>
        )}

      </View>

      {/* OPERATOR BOTTOM SHEET */}
      <BottomSheetModal
        visible={showOperatorModal}
        onClose={() => { setShowOperatorModal(false); setSearchText(""); }}
        title="Select Provider"
        searchText={searchText}
        onSearch={setSearchText}
        searchPlaceholder="Search Operator..."
        items={operators.filter((op) =>
          (op.label || op.name || "").toLowerCase().includes(searchText.toLowerCase())
        )}
        selectedValue={operator}
        iconName="sim"
        getLabel={(op) => op.label || op.name}
        onSelect={(op) => {
          setOperator(op.label || op.name);
          setOperatorCode(op.rechargeValue || "");
          setShowOperatorModal(false);
          setSearchText("");
        }}
      />

      {/* CIRCLE BOTTOM SHEET */}
      <BottomSheetModal
        visible={showCircleModal}
        onClose={() => { setShowCircleModal(false); setSearchText(""); }}
        title="Select Circle"
        searchText={searchText}
        onSearch={setSearchText}
        searchPlaceholder="Search Circle..."
        items={circles.filter((c) =>
          (c.circleName || c.circlename || "").toLowerCase().includes(searchText.toLowerCase())
        )}
        selectedValue={circle}
        iconName="map-marker-radius"
        getLabel={(c) => c.circleName || c.circlename}
        onSelect={(c) => {
          setCircle(c.circleName || c.circlename);
          setShowCircleModal(false);
          setSearchText("");
        }}
      />

      {/* FULL SCREEN LOADER */}
      <FullScreenLoader visible={loading} label="Processing..." />

      <ReceiptModal
        visible={!!receiptData}
        onClose={() => setReceiptData(null)}
        navigation={navigation}
        data={receiptData ? {
          ...receiptData,
          title: receiptData.message || (receiptData.status === "success" ? "Recharge Successful" : "Recharge Failed"),
          details: [
            { label: "Mobile Number", value: receiptData.mobile },
            { label: "Operator", value: `${receiptData.operator} (Prepaid)` },
            { label: "Payment Mode", value: "Main Wallet" },
            ...(receiptData.txn_ref && receiptData.txn_ref !== "N/A"
              ? [{ label: "Transaction ID", value: receiptData.txn_ref, small: true }]
              : []),
            {
              label: "Status",
              isStatusPill: true,
              value: receiptData.status === "success" ? "Success" : "Failed",
              color: receiptData.status === "success" ? Colors.success : Colors.error,
            },
          ],
          note: receiptData.status === "success"
            ? "Plan benefits added successfully. Data and calling active."
            : "Amount debited. Commission plan not configured. Raise a complaint for refund."
        } : null}
      />

      <CustomAlert
        visible={alert.visible}
        type={alert.type}
        title={alert.title}
        message={alert.message}
        onClose={() => setAlert({ ...alert, visible: false })}
      />

    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.homebg },
  container: { flex: 1, backgroundColor: Colors.homebg },
  headerWrapper: { backgroundColor: Colors.homebg },
  mainContent: { paddingHorizontal: 12, paddingBottom: 14 },

  modernCard: { backgroundColor: Colors.bg, borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "rgba(212,176,106,0.15)" },
  modernCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  modernCardTitle: { fontSize: 12, fontFamily: Fonts.Bold, color: Colors.primary },
  badge: { backgroundColor: Colors.finance_bg_2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: Colors.finance_accent },
  badgeText: { fontSize: 9, fontFamily: Fonts.Bold, color: Colors.finance_accent },
  modernInputWrapper: { borderBottomWidth: 1, borderBottomColor: Colors.primary, paddingBottom: 4 },
  floatingLabel: { fontSize: 10, color: Colors.primary, fontFamily: Fonts.Medium, marginBottom: 2 },
  rowCenter: { flexDirection: "row", alignItems: "center" },
  prefixText: { fontSize: 16, fontFamily: Fonts.Medium, color: Colors.text_placeholder, marginRight: 8 },
  bigInput: { flex: 1, fontSize: 18, fontFamily: Fonts.Bold, color: Colors.finance_text, padding: 0, height: 34 },
  contactBtnRound: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.finance_accent, alignItems: "center", justifyContent: "center" },

  connectionContainer: { backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1, borderColor: Colors.lightGray, marginTop: 5, overflow: "hidden" },
  connectionRow: { flexDirection: "row", alignItems: "center", padding: 10 },
  iconBox: { width: 30, height: 30, borderRadius: 8, backgroundColor: Colors.white, alignItems: "center", justifyContent: "center" },
  connectionLabel: { fontSize: 9, fontFamily: Fonts.Bold, color: Colors.text_muted, textTransform: "uppercase" },
  connectionValues: { fontSize: 12, fontFamily: Fonts.Medium, color: Colors.black, marginTop: 2 },
  dividerLine: { height: 1, backgroundColor: Colors.ink5, marginHorizontal: 14 },

  premiumAmountCard: { backgroundColor: Colors.slate_900, borderRadius: 20, padding: 14, marginBottom: 14, borderWidth: 1.5, borderColor: Colors.finance_accent + "66" },
  amountHeader: { fontSize: 10, color: "rgba(255,255,255,0.6)", fontFamily: Fonts.Medium, textTransform: "uppercase", letterSpacing: 1, textAlign: "center", marginBottom: 8 },
  amountInputRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingVertical: 8, paddingHorizontal: 14 },
  currencySymbol: { fontSize: 20, fontFamily: Fonts.Bold, color: Colors.finance_accent, marginRight: 8 },
  hugeInput: { flex: 1, fontSize: 28, fontFamily: Fonts.Bold, color: Colors.white, padding: 0 },
  suggestionsWrapper: { marginBottom: 12 },
  suggestionsContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  suggestionChip: { backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  suggestionChipActive: { backgroundColor: "rgba(212,176,106,0.2)", borderColor: Colors.finance_accent },
  suggestionText: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: Fonts.Medium },
  suggestionTextActive: { color: Colors.finance_accent, fontFamily: Fonts.Bold },
  viewPlansBtn: { borderRadius: 10, overflow: "hidden", alignSelf: "center" },
  viewPlansGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 8, paddingHorizontal: 20, gap: 6 },
  viewPlansText: { color: Colors.black, fontFamily: Fonts.Bold, fontSize: 12 },

  actionContainer: {
    position: "absolute",
    bottom: 10,
    left: 20,
    right: 20,
    paddingBottom: 0,
    paddingHorizontal: 0,
    zIndex: 100,
  },
  sliderWrapper: { height: 60, backgroundColor: Colors.white, borderRadius: 30, borderWidth: 1.5, borderColor: Colors.finance_accent, justifyContent: "center", overflow: "hidden" },
  sliderBackground: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  swipeText: { color: Colors.finance_accent, fontSize: 14, fontFamily: Fonts.Bold, letterSpacing: 2 },
  sliderThumb: { width: 52, height: 52, borderRadius: 26, position: "absolute", left: 4 },
  thumbGrad: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  processingBtn: { height: 60, borderRadius: 30, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  processingText: { color: Colors.white, fontFamily: Fonts.Bold, fontSize: 14, letterSpacing: 1 },

  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.6)" },
  bottomSheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: "80%",
    elevation: 25, shadowColor: Colors.black, shadowOpacity: 0.2, shadowRadius: 15,
  },
  sheetHeader: {
    paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: Colors.blackOpacity_05,
    paddingTop: 6, paddingBottom: 12,
  },
  handleBar: { width: 44, height: 4, borderRadius: 2, backgroundColor: Colors.blackOpacity_12, alignSelf: "center", marginTop: 8, marginBottom: 12 },
  sheetTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14, paddingHorizontal: 4 },
  sheetTitle: { fontSize: 17, fontFamily: Fonts.Bold, color: Colors.slate_900, letterSpacing: 0.3 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.blackOpacity_05, alignItems: "center", justifyContent: "center" },
  sheetSearchRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.slate_50,
    borderRadius: 14, paddingHorizontal: 12,
    marginBottom: 4, height: 46,
    borderWidth: 1, borderColor: Colors.blackOpacity_05,
  },
  sheetSearchInput: { flex: 1, fontSize: 14, fontFamily: Fonts.Medium, color: Colors.slate_900, padding: 0 },
  sheetListItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: 18, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.blackOpacity_03,
  },
  sheetListItemSel: { backgroundColor: Colors.finance_accent + "10" },
  sheetListIconBox: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: Colors.blackOpacity_05,
    alignItems: "center", justifyContent: "center", marginRight: 14,
  },
  sheetListIconBoxSel: { backgroundColor: Colors.finance_accent + "20" },
  sheetListTxt: { flex: 1, fontSize: 14, fontFamily: Fonts.Medium, color: Colors.slate_700 },
  sheetListTxtSel: { color: Colors.finance_accent, fontFamily: Fonts.Bold },
  checkCircle: { width: 22, height: 22, borderRadius: 11, backgroundColor: Colors.finance_accent, alignItems: "center", justifyContent: "center" },
  emptyWrap: { alignItems: "center", paddingVertical: 30 },
  emptyTxt: { color: Colors.text_placeholder, fontSize: 13, fontFamily: Fonts.Medium },

  customToastBox: { position: "absolute", top: 60, left: 20, right: 20, zIndex: 9999 },
  customToastGrad: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, gap: 10 },
  customToastText: { color: Colors.white, fontFamily: Fonts.Bold, fontSize: 13, flex: 1 },
  fullLoader: { ...StyleSheet.absoluteFillObject, backgroundColor: Colors.whiteOpacity_70, justifyContent: "center", alignItems: "center", zIndex: 1000 },

  // ── Recent Recharges History ──
  historyCard_Outer: {
    backgroundColor: Colors.bg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(212,176,106,0.25)",
    overflow: "hidden",
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
  },
  historyHeaderGrad: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: Colors.hex_1A1A1A,
  },
  historyHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 8 },
  historyHeaderIconBox: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: "rgba(212,176,106,0.15)",
    alignItems: "center", justifyContent: "center",
  },
  historySectionTitle: { fontSize: 13, fontFamily: Fonts.Bold, color: Colors.finance_accent, letterSpacing: 0.3 },
  historyCountBadge: {
    backgroundColor: "rgba(212,176,106,0.2)",
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2,
    borderWidth: 1, borderColor: "rgba(212,176,106,0.4)",
  },
  historyCountText: { fontSize: 11, fontFamily: Fonts.Bold, color: Colors.finance_accent },

  // 5 items × ~62px each = 310px — first 5 visible, extras scroll
  historyCardsList: { maxHeight: 350, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 4 },

  historyItemRow: {
    flexDirection: "row", alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(212,176,106,0.15)",
  },
  historyOpBadge: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.finance_accent + "30",
  },
  historyOpInitial: { fontSize: 16, fontFamily: Fonts.Bold, color: Colors.finance_accent },
  historyOpName: { fontSize: 13, fontFamily: Fonts.Bold, color: Colors.finance_text },
  historyMobile: { fontSize: 11, fontFamily: Fonts.Medium, color: Colors.slate_500 },
  historyRefId: { fontSize: 10, fontFamily: Fonts.Medium, color: Colors.slate_500, marginTop: 1 },
  historyDate: { fontSize: 10, fontFamily: Fonts.Medium, color: Colors.text_placeholder, marginTop: 2 },
  historyAmount: { fontSize: 15, fontFamily: Fonts.Bold, color: Colors.finance_text, marginBottom: 4 },
  historyStatusPill: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 7, paddingVertical: 3, borderRadius: 6,
  },
  historyStatusDot: { width: 5, height: 5, borderRadius: 3 },
  historyStatusText: { fontSize: 9, fontFamily: Fonts.Bold, letterSpacing: 0.4 },
});
