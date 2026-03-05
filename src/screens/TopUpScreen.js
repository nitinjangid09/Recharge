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
  ToastAndroid
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../constants/Colors";
import Fonts from "../constants/Fonts";
import HeaderBar from "../componets/HeaderBar";
import { getOperatorCircle, fetchOperatorByMobile } from "../api/AuthApi";

const { width } = Dimensions.get("window");

export default function TopUpScreen({ navigation }) {
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

  /* ---------- Animation ---------- */
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const showToast = (message) => {
    if (Platform.OS === "android") {
      ToastAndroid.show(message, ToastAndroid.SHORT);
    } else {
      Alert.alert("Info", message);
    }
  };

  /* ---------- Slide to Pay Logic ---------- */
  const pan = useRef(new Animated.Value(0)).current;
  const trackWidthRef = useRef(0);
  const [completed, setCompleted] = useState(false);
  const THUMB_WIDTH = 50;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset(0);
        pan.setValue(0);
      },
      onPanResponderMove: (_, gestureState) => {
        const width = trackWidthRef.current;
        if (width > 0 && gestureState.dx >= 0 && gestureState.dx <= width - THUMB_WIDTH) {
          pan.setValue(gestureState.dx);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        const width = trackWidthRef.current;
        if (width > 0 && gestureState.dx >= (width - THUMB_WIDTH) * 0.8) {
          Animated.timing(pan, {
            toValue: width - THUMB_WIDTH,
            duration: 200,
            useNativeDriver: false
          }).start(() => {
            setCompleted(true);
            showToast("Processing Payment...");

            // Reset after delay (Mocking API)
            setTimeout(() => {
              setCompleted(false);
              pan.setValue(0);
            }, 3000);
          });
        } else {
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: false
          }).start();
        }
      }
    })
  ).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
        easing: Easing.out(Easing.exp)
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  useEffect(() => {
    fetchOperatorCircle();
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (showOperatorModal) {
        setShowOperatorModal(false);
        return true;
      }
      if (showCircleModal) {
        setShowCircleModal(false);
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );
    return () => backHandler.remove();
  }, [showOperatorModal, showCircleModal]);


  const fetchOperatorCircle = async () => {
    try {
      setLoading(true);
      const result = await getOperatorCircle("");
      if (result?.status === "SUCCESS") {
        setOperators(result.data?.operators || []);
        setCircles(result.data?.circle || []);
      }
    } catch (e) {
      console.log("Operator/Circle API error", e);
    } finally {
      setLoading(false);
    }
  };


  const handleMobileChange = async (value) => {
    const numericValue = value.replace(/\D/g, "");
    setMobile(numericValue);

    if (numericValue.length < 10) {
      setOperator("");
      setCircle("");
      return;
    }

    if (numericValue.length === 10) {
      try {
        setLoading(true);
        const result = await fetchOperatorByMobile(numericValue);

        if (result?.status === "SUCCESS") {
          const matchedOperator = operators.find(
            (op) => op.code === result.operator
          );

          const matchedCircle = circles.find(
            (c) => String(c.circlecode) === String(result.circle)
          );

          setOperator(matchedOperator?.name || "");
          setCircle(matchedCircle?.circlename || "");

          navigation.navigate("StorePlans", {
            mobile: numericValue,
            operator: matchedOperator?.name || "",
            circle: matchedCircle?.circlename || ""
          });

        } else {
          setOperator("");
          setCircle("");
          showToast(result?.message || "Unable to detect operator");
        }
      } catch (error) {
        console.log("Fetch operator error:", error);
        setOperator("");
        setCircle("");
        showToast("Something went wrong");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: Colors.finance_bg_1 }}>
      <HeaderBar
        title="Mobile Recharge"
        onBack={() => navigation.goBack()}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              styles.mainContent,
              {
                transform: [{ translateY: slideAnim }],
                opacity: fadeAnim
              }
            ]}
          >

            {/* === SECTION 1: MOBILE === */}
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

            {/* === SECTION 2: CONNECTION === */}
            <View style={styles.modernCard}>
              <Text style={styles.modernCardTitle}>Connection Details</Text>

              <View style={styles.connectionContainer}>
                {/* Operator */}
                <TouchableOpacity
                  style={styles.connectionRow}
                  onPress={() => operators.length && setShowOperatorModal(true)}
                >
                  <View style={styles.iconBox}>
                    <Icon name="sim" size={18} color={Colors.finance_accent} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.connectionLabel}>Operator</Text>
                    <Text style={styles.connectionValues}>
                      {operator || "Select Provider"}
                    </Text>
                  </View>
                  <Icon name="chevron-down" size={20} color={Colors.finance_text} />
                </TouchableOpacity>

                <View style={styles.dividerLine} />

                {/* Circle */}
                <TouchableOpacity
                  style={styles.connectionRow}
                  onPress={() => circles.length && setShowCircleModal(true)}
                >
                  <View style={styles.iconBox}>
                    <Icon name="map-marker-radius" size={18} color={Colors.finance_accent} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.connectionLabel}>Circle</Text>
                    <Text style={styles.connectionValues}>
                      {circle || "Select Circle"}
                    </Text>
                  </View>
                  <Icon name="chevron-down" size={20} color={Colors.finance_text} />
                </TouchableOpacity>
              </View>
            </View>

            {/* === PREMIUM AMOUNT SECTION === */}
            <View style={styles.premiumAmountCard}>

              {/* Type Selection */}
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[styles.typeBtn, type === "airtime" && styles.typeBtnActive]}
                  onPress={() => setType("airtime")}
                >
                  <Text style={[styles.typeText, type === "airtime" && styles.typeTextActive]}>Topup</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.typeBtn, type === "special" && styles.typeBtnActive]}
                  onPress={() => setType("special")}
                >
                  <Text style={[styles.typeText, type === "special" && styles.typeTextActive]}>Special Plans</Text>
                </TouchableOpacity>
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

              {/* Suggestions */}
              <View style={styles.suggestionsWrapper}>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.suggestionsContainer}
                >
                  {['199', '299', '499', '666', '849'].map((val) => (
                    <TouchableOpacity
                      key={val}
                      style={[styles.suggestionChip, amount === val && styles.suggestionChipActive]}
                      onPress={() => setAmount(val)}
                    >
                      <Text style={[styles.suggestionText, amount === val && styles.suggestionTextActive]}>₹{val}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              <TouchableOpacity
                style={styles.viewPlansBtn}
                onPress={() => showToast("Loading available plans...")}
              >
                <LinearGradient
                  colors={[Colors.finance_accent, '#E0C38C']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={styles.viewPlansGradient}
                >
                  <Text style={styles.viewPlansText}>Explore All Plans</Text>
                  <Icon name="notebook-outline" size={18} color={Colors.black} />
                </LinearGradient>
              </TouchableOpacity>
            </View>


            {/* === SLIDER ACTION === */}
            <View style={styles.actionContainer}>
              {!completed ? (
                <View
                  style={styles.sliderWrapper}
                  onLayout={(e) => { trackWidthRef.current = e.nativeEvent.layout.width; }}
                >
                  <Animated.View style={[styles.sliderBackground, {
                    opacity: pan.interpolate({
                      inputRange: [0, 100],
                      outputRange: [1, 0.5],
                      extrapolate: 'clamp'
                    })
                  }]}>
                    <Text style={styles.swipeText}>SWIPE TO RECHARGE</Text>
                  </Animated.View>
                  <Animated.View
                    style={[
                      styles.sliderThumb,
                      { transform: [{ translateX: pan }] }
                    ]}
                    {...panResponder.panHandlers}
                  >
                    <LinearGradient
                      colors={[Colors.finance_accent, '#b8944d']}
                      style={styles.thumbGrad}
                    >
                      <Icon name="chevron-right" size={28} color={Colors.white} />
                    </LinearGradient>
                  </Animated.View>
                </View>
              ) : (
                <LinearGradient
                  colors={[Colors.finance_accent, '#b8944d']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.processingBtn}
                >
                  <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: 10 }} />
                  <Text style={styles.processingText}>PROCESSING...</Text>
                </LinearGradient>
              )}
            </View>

          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* OPERATOR MODAL */}
      <Modal visible={showOperatorModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <LinearGradient colors={[Colors.finance_accent, '#b8944d']} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Provider</Text>
              <TouchableOpacity onPress={() => setShowOperatorModal(false)}>
                <Icon name="close" size={24} color={Colors.white} />
              </TouchableOpacity>
            </LinearGradient>
            <View style={styles.modalInner}>
              <View style={styles.searchBar}>
                <Icon name="magnify" size={20} color={Colors.finance_accent} />
                <TextInput
                  placeholder="Search Operator"
                  placeholderTextColor={Colors.finance_accent}
                  style={styles.searchField}
                  value={searchText}
                  onChangeText={setSearchText}
                />
              </View>
              <ScrollView>
                {operators
                  .filter(op => op.name.toLowerCase().includes(searchText.toLowerCase()))
                  .map((op, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.listItem}
                      onPress={() => { setOperator(op.name); setShowOperatorModal(false); setSearchText(""); }}
                    >
                      <View style={styles.listIcon}>
                        <Icon name="sim" size={18} color={Colors.finance_accent} />
                      </View>
                      <Text style={styles.listLabel}>{op.name}</Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* CIRCLE MODAL */}
      <Modal visible={showCircleModal} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <LinearGradient colors={[Colors.finance_accent, '#b8944d']} style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Circle</Text>
              <TouchableOpacity onPress={() => setShowCircleModal(false)}>
                <Icon name="close" size={24} color={Colors.white} />
              </TouchableOpacity>
            </LinearGradient>
            <View style={styles.modalInner}>
              <View style={styles.searchBar}>
                <Icon name="magnify" size={20} color={Colors.finance_accent} />
                <TextInput
                  placeholder="Search Circle"
                  placeholderTextColor={Colors.finance_accent}
                  style={styles.searchField}
                  value={searchText}
                  onChangeText={setSearchText}
                />
              </View>
              <ScrollView>
                {circles
                  .filter(c => c.circlename.toLowerCase().includes(searchText.toLowerCase()))
                  .map((c, idx) => (
                    <TouchableOpacity
                      key={idx}
                      style={styles.listItem}
                      onPress={() => { setCircle(c.circlename); setShowCircleModal(false); setSearchText(""); }}
                    >
                      <View style={styles.listIcon}>
                        <Icon name="map-marker-radius" size={18} color={Colors.finance_accent} />
                      </View>
                      <Text style={styles.listLabel}>{c.circlename}</Text>
                    </TouchableOpacity>
                  ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {loading && (
        <View style={styles.fullLoader}>
          <ActivityIndicator size="large" color={Colors.finance_accent} />
        </View>
      )}

    </View>
  );
}

const styles = StyleSheet.create({
  mainContent: {
    paddingHorizontal: 12,
    paddingBottom: 14,
  },
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
    borderColor: 'rgba(212, 176, 106, 0.1)',
  },
  modernCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  modernCardTitle: {
    fontSize: 12,
    fontFamily: Fonts.Bold,
    color: "#333",
  },
  badge: {
    backgroundColor: Colors.finance_bg_2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.finance_accent,
  },
  badgeText: {
    fontSize: 9,
    fontFamily: Fonts.Bold,
    color: Colors.finance_accent,
  },
  modernInputWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    paddingBottom: 4,
  },
  floatingLabel: {
    fontSize: 10,
    color: "#999",
    fontFamily: Fonts.Medium,
    marginBottom: 2,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prefixText: {
    fontSize: 16,
    fontFamily: Fonts.Medium,
    color: "#AAA",
    marginRight: 8,
  },
  bigInput: {
    flex: 1,
    fontSize: 18,
    fontFamily: Fonts.Bold,
    color: Colors.finance_text,
    padding: 0,
    height: 34,
  },
  contactBtnRound: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: Colors.finance_accent,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  connectionContainer: {
    backgroundColor: "#F9F9F9",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#EEE",
    overflow: 'hidden',
  },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  iconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  connectionLabel: {
    fontSize: 9,
    fontFamily: Fonts.Bold,
    color: "#777",
    textTransform: 'uppercase',
  },
  connectionValues: {
    fontSize: 12,
    fontFamily: Fonts.Medium,
    color: "#000",
    marginTop: 2,
  },
  dividerLine: {
    height: 1,
    backgroundColor: "#EEE",
    marginHorizontal: 14,
  },

  /* PREMIUM AMOUNT STYLES */
  premiumAmountCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    elevation: 8,
    shadowColor: Colors.finance_accent,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    borderWidth: 1.5,
    borderColor: 'rgba(212, 176, 106, 0.4)',
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 12,
    padding: 3,
    marginBottom: 12,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  typeBtnActive: {
    backgroundColor: 'rgba(212, 176, 106, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(212, 176, 106, 0.5)',
  },
  typeText: {
    fontSize: 11,
    fontFamily: Fonts.Medium,
    color: 'rgba(255,255,255,0.4)',
  },
  typeTextActive: {
    color: Colors.finance_accent,
    fontFamily: Fonts.Bold,
  },
  amountHeader: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.6)',
    fontFamily: Fonts.Medium,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
    marginBottom: 8,
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  currencySymbol: {
    fontSize: 20,
    fontFamily: Fonts.Bold,
    color: Colors.finance_accent,
    marginRight: 8,
  },
  hugeInput: {
    flex: 1,
    fontSize: 28,
    fontFamily: Fonts.Bold,
    color: "#FFFFFF",
    minWidth: 80,
    textAlign: 'left',
    padding: 0,
  },
  suggestionsWrapper: {
    marginBottom: 12,
  },
  suggestionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  suggestionChip: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  suggestionChipActive: {
    backgroundColor: 'rgba(212, 176, 106, 0.2)',
    borderColor: Colors.finance_accent,
  },
  suggestionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontFamily: Fonts.Medium,
  },
  suggestionTextActive: {
    color: Colors.finance_accent,
    fontFamily: Fonts.Bold,
  },
  viewPlansBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  viewPlansGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 10,
  },
  viewPlansText: {
    color: Colors.black,
    fontFamily: Fonts.Bold,
    fontSize: 14,
  },

  /* SLIDER STYLES */
  actionContainer: {
    marginTop: 10,
  },
  sliderWrapper: {
    height: 60,
    backgroundColor: Colors.white,
    borderRadius: 30,
    borderWidth: 1.5,
    borderColor: Colors.finance_accent,
    justifyContent: 'center',
    elevation: 4,
    overflow: 'hidden',
  },
  sliderBackground: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  swipeText: {
    color: Colors.finance_accent,
    fontSize: 14,
    fontFamily: Fonts.Bold,
    letterSpacing: 2,
  },
  sliderThumb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    position: 'absolute',
    left: 4,
    elevation: 5,
  },
  thumbGrad: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingBtn: {
    height: 60,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    color: Colors.white,
    fontFamily: Fonts.Bold,
    fontSize: 14,
    letterSpacing: 1,
  },

  /* MODAL STYLES */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    height: '60%',
    backgroundColor: Colors.white,
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  modalTitle: {
    color: Colors.white,
    fontSize: 18,
    fontFamily: Fonts.Bold,
  },
  modalInner: {
    padding: 16,
    flex: 1,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginBottom: 16,
  },
  searchField: {
    flex: 1,
    marginLeft: 10,
    fontFamily: Fonts.Medium,
    color: Colors.finance_accent,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  listIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.finance_bg_1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listLabel: {
    fontSize: 15,
    fontFamily: Fonts.Medium,
    color: '#333',
  },
  fullLoader: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
});
