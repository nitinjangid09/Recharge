import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated, Image,
  Easing,
  Dimensions,
} from "react-native";

const { width } = Dimensions.get("window");
import Fonts from "../constants/Fonts";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../constants/Colors";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchUserWallet, fetchUserProfile, fetchServices } from "../api/AuthApi";
import { ToastAndroid } from "react-native";
import CustomAlert from "../screens/CustomAlert";

import { ActivityIndicator } from "react-native";
export default function FinanceHome({ navigation }) {

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertAction, setAlertAction] = useState(null);

  const showAlert = (title, message, action = null) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertAction(() => action);
    setAlertVisible(true);
  };

  const scrollY = useRef(new Animated.Value(0)).current;

  // Header Animation Interpolations
  const HEADER_MAX_HEIGHT = 260; // Reduced height
  const HEADER_MIN_HEIGHT = 80; // Collapsed height (Name only)
  const SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

  const headerHeight = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE],
    outputRange: [HEADER_MAX_HEIGHT, HEADER_MIN_HEIGHT],
    extrapolate: 'clamp',
  });

  const cardOpacity = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE / 2], // Fade out halfway
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const cardTranslateY = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE],
    outputRange: [0, -50], // Slide up slightly
    extrapolate: 'clamp',
  });

  const cardScale = scrollY.interpolate({
    inputRange: [0, SCROLL_DISTANCE],
    outputRange: [1, 0.8],
    extrapolate: 'clamp'
  });

  const slideAnim = useRef(new Animated.Value(-80)).current;
  const fadeAnim = useRef(new Animated.Value(10)).current;
  const leftAnim = useRef(new Animated.Value(-80)).current;
  const leftFade = useRef(new Animated.Value(10)).current;
  const [showBalance, setShowBalance] = useState(true);
  const [isAeps, setIsAeps] = useState(true);
  const [loading, setLoading] = useState(false);
  const [services, setServices] = useState(null);
  // const AEPS_AMOUNT = "₹ 32,680.20";
  // const BALANCE_AMOUNT = "₹ 12,450.00";
  const [aepsBalance, setAepsBalance] = useState("0.00");
  const [mainBalance, setMainBalance] = useState("0.00");
  const [profileData, setProfileData] = useState(null);

  // Animation Refs for Toggle
  const contentOpacity = useRef(new Animated.Value(1)).current;
  const contentTranslateY = useRef(new Animated.Value(0)).current;

  const toggleWallet = () => {
    // 1. Slide Out
    Animated.parallel([
      Animated.timing(contentOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(contentTranslateY, {
        toValue: -15,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // 2. Toggle State
      setIsAeps((prev) => !prev);
      contentTranslateY.setValue(15); // Reset to bottom position

      // 3. Slide In
      Animated.parallel([
        Animated.timing(contentOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(contentTranslateY, {
          toValue: 0,
          duration: 200,
          easing: Easing.out(Easing.back(1.5)), // Bouncy effect
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const SERVICE_ICON_MAP = {
    // AEPS
    cw: "cash",
    be: "bank",
    ms: "file-document-outline",
    ap: "fingerprint",
    py: "cash-fast",

    // Money Transfer
    dmt: "bank-transfer",

    // Recharge & Bills
    rech: "cellphone",
    C03: "satellite-variant",      // DTH
    C04: "flash",                  // Electricity
    C05: "wifi",                   // Broadband
    C06: "television",             // Cable TV
    C09: "school",
    C14: "gas-cylinder",
    C22: "account-group-outline",

    // fallback
    default: "apps",
  };


  useEffect(() => {
    let timer;

    // when balance is visible, auto-hide after 5 sec
    if (!showBalance) {
      timer = setTimeout(() => {
        setShowBalance(true);
      }, 7000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showBalance]);

  useEffect(() => {
    startAnimation();
    initLoad();
  }, []);

  const initLoad = async () => {
    setLoading(true);
    await Promise.all([
      loadWalletBalance(),
      loadUserProfile(),
      loadServices(),
    ]);
    setLoading(false);
  };
  const loadServices = async () => {
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      const headerKey = await AsyncStorage.getItem("header_key");

      if (!headerToken || !headerKey) {
        showAlert("Session expired", "Please login again");
        return;
      }

      const result = await fetchServices({ headerToken, headerKey });

      if (result?.status === "SUCCESS") {
        setServices(result.data);
      } else {
        showAlert("Error", result?.message || "Failed to load services");
      }

    } catch (e) {
      showAlert("Error", "Something went wrong");
    }
  };
  const loadWalletBalance = async () => {
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      const headerKey = await AsyncStorage.getItem("header_key");

      if (!headerToken || !headerKey) {
        showAlert("Session expired. Please login again.", "Error");
        navigation.replace("Login");
        return;
      }

      const result = await fetchUserWallet({ headerToken, headerKey });

      if (result?.status === "SUCCESS") {
        setMainBalance(result.walletBalance || "0.00");
        setAepsBalance(result.aepswallet || "0.00");
      } else {
        showAlert(result?.message || "Wallet fetch failed", "Error");
      }

    } catch (e) {
      showAlert("Something went wrong", "Error");
    }
  };

  const loadUserProfile = async () => {
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      const headerKey = await AsyncStorage.getItem("header_key");

      if (!headerToken || !headerKey) {
        showAlert("Session expired", "Please login again");
        navigation.replace("Login");
        return;
      }

      const result = await fetchUserProfile({
        headerToken,
        headerKey
      });

      if (result?.status === "SUCCESS") {
        setProfileData(result.data);

        // ✅ SAVE FULL RESPONSE
        await AsyncStorage.setItem(
          "profile_data",
          JSON.stringify(result.data)
        );
      } else {
        showAlertt("Error", result?.message || "Profile fetch failed");
      }

    } catch (e) {
      showAlert("Error", "Something went wrong");
    }
  };
  const startAnimation = () => {
    Animated.parallel([
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.out(Easing.exp),
          useNativeDriver: false,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
      ]),
      Animated.parallel([
        Animated.timing(leftAnim, {
          toValue: 0,
          duration: 1600,
          easing: Easing.out(Easing.exp),
          useNativeDriver: false,
        }),
        Animated.timing(leftFade, {
          toValue: 1,
          duration: 1600,
          useNativeDriver: false,
        }),
      ]),
    ]).start();
  };

  const dealTextAnim = useRef(new Animated.Value(0)).current;

  // Banner Auto Scroll Logic
  const bannerScrollX = useRef(new Animated.Value(0)).current;
  const scrollRef = useRef(null);
  const [activeBanner, setActiveBanner] = useState(0);

  useEffect(() => {
    // Item width + spacing
    // Item width + spacing
    const ITEM_WIDTH = width - 36 + 10;

    let scrolled = 0;
    let scrollValue = 0;

    const interval = setInterval(() => {
      scrolled++;
      if (scrolled >= 3) {
        // Move to the clone (last item)
        scrollValue = scrolled * ITEM_WIDTH;
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ x: scrollValue, animated: true });
        }

        // Reset to real first item instantly after animation
        setTimeout(() => {
          scrolled = 0;
          if (scrollRef.current) {
            scrollRef.current.scrollTo({ x: 0, animated: false });
          }
        }, 500); // Wait for slide animation
      } else {
        scrollValue = scrolled * ITEM_WIDTH;
        if (scrollRef.current) {
          scrollRef.current.scrollTo({ x: scrollValue, animated: true });
        }
      }
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(dealTextAnim, {
          toValue: 10,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(dealTextAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: false,
        })
      ])
    ).start();
  }, []);



  const CARD_WIDTH = width * 0.8;
  const SPACING = 15;
  const SNAP_INTERVAL = CARD_WIDTH + SPACING;

  // Plan Carousel Logic (Infinite Clockwise)
  const planScrollRef = useRef(null);
  useEffect(() => {
    let scrolled = 0;
    const interval = setInterval(() => {
      scrolled++;
      if (scrolled >= 2) { // 2 items + 1 clone. Index 2 is the clone.
        if (planScrollRef.current) {
          planScrollRef.current.scrollTo({ x: scrolled * SNAP_INTERVAL, animated: true });
        }
        // Reset to 0 instantly after animation
        setTimeout(() => {
          scrolled = 0;
          if (planScrollRef.current) {
            planScrollRef.current.scrollTo({ x: 0, animated: false });
          }
        }, 500);
      } else {
        if (planScrollRef.current) {
          planScrollRef.current.scrollTo({ x: scrolled * SNAP_INTERVAL, animated: true });
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  // Header Text Animations (Staggered Entrance)
  const greetingOpacity = useRef(new Animated.Value(0)).current;
  const greetingSlide = useRef(new Animated.Value(-20)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const nameScale = useRef(new Animated.Value(0.9)).current;
  const namePulse = useRef(new Animated.Value(1)).current; // Continuous Pulse
  const nameShimmer = useRef(new Animated.Value(0)).current; // Color Shimmer

  useEffect(() => {
    Animated.stagger(300, [
      Animated.parallel([
        Animated.timing(greetingOpacity, { toValue: 1, duration: 800, useNativeDriver: false }), // Force JS for safety
        Animated.spring(greetingSlide, { toValue: 0, friction: 8, useNativeDriver: false }) // Force JS for safety
      ]),
      Animated.parallel([
        Animated.timing(nameOpacity, { toValue: 1, duration: 800, useNativeDriver: false }), // Force JS for safety
        Animated.spring(nameScale, { toValue: 1, friction: 6, useNativeDriver: false }) // Force JS for safety
      ])
    ]).start();

    // Start Continuous Pulse & Shimmer after a delay
    setTimeout(() => {
      Animated.parallel([
        Animated.loop(
          Animated.sequence([
            Animated.timing(namePulse, { toValue: 1.03, duration: 1500, useNativeDriver: false }), // Native false for color compat
            Animated.timing(namePulse, { toValue: 1, duration: 1500, useNativeDriver: false }) // Native false for color compat
          ])
        ),
        Animated.loop(
          Animated.sequence([
            Animated.timing(nameShimmer, { toValue: 1, duration: 2500, useNativeDriver: false }), // Color needs useNativeDriver: false
            Animated.timing(nameShimmer, { toValue: 0, duration: 2500, useNativeDriver: false })
          ])
        )
      ]).start();
    }, 1200);
  }, []);

  return (
    <View style={styles.container}>
      {/* ANIMATED COLLAPSIBLE HEADER */}
      <Animated.View
        style={[
          styles.headerContainer,
          { height: headerHeight }
        ]}
      >
        <LinearGradient
          colors={["#161616", "#000000"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1, paddingHorizontal: 20, paddingTop: 15, paddingBottom: 5 }}
        >
          {/* Advanced Header: Avatar & Actions (Always Visible) */}
          <View style={styles.headerTopUser}>
            <View style={styles.userSection}>
              {/* Profile Avatar */}
              <View style={styles.avatarContainer}>
                <LinearGradient
                  colors={[Colors.finance_accent, '#8B6914']}
                  style={styles.avatarGradient}
                >
                  <Text style={styles.avatarText}>
                    {profileData?.profile?.name ? profileData.profile.name.charAt(0).toUpperCase() : "U"}
                  </Text>
                </LinearGradient>
              </View>

              {/* Greeting Text */}
              <View style={styles.userDetails}>
                <Animated.Text style={[styles.welcomeText, { opacity: greetingOpacity, transform: [{ translateX: greetingSlide }] }]}>
                  Good Morning,
                </Animated.Text>
                <Animated.Text style={[styles.userNameTitle, { opacity: nameOpacity }]}>
                  {profileData?.profile?.name || "Guest User"}
                </Animated.Text>
              </View>
            </View>

            {/* Glassy Action Buttons */}
            <View style={styles.headerActions}>
              <TouchableOpacity style={styles.glassBtn}>
                <Icon name="magnify" size={20} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.glassBtn}>
                <View style={styles.notificationBadge} />
                <Icon name="bell-ring-outline" size={20} color="#FFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Modern Wallet Card (Collapses on Scroll) */}
          <Animated.View
            style={{
              opacity: cardOpacity,
              transform: [
                { translateY: cardTranslateY },
                { scale: cardScale }
              ]
            }}
          >
            <LinearGradient
              colors={['#2C2C2C', '#000000']}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.walletCard}
            >
              {/* Decorative Elements */}
              <View style={styles.cardCircle1} />
              <View style={styles.cardCircle2} />

              {/* Top Row: Wallet Label & Switch */}
              <View style={styles.rowBetween}>
                <View style={styles.walletTag}>
                  <Icon name="wallet-outline" size={14} color="#d4b06a" />
                  <Animated.Text style={[styles.walletTagText, { opacity: contentOpacity }]}>
                    {isAeps ? "AEPS Wallet" : "Main Wallet"}
                  </Animated.Text>
                </View>

                <TouchableOpacity onPress={toggleWallet} style={styles.switchBtn}>
                  <Icon name="swap-horizontal" size={20} color="#d4b06a" />
                </TouchableOpacity>
              </View>

              {/* Middle: Balance */}
              <View style={{ marginTop: 10 }}>
                <Text style={styles.cardLabel}>Total Balance</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <Animated.View style={{ opacity: contentOpacity, transform: [{ translateY: contentTranslateY }] }}>
                    <Text style={styles.cardBalance}>
                      {showBalance ? "••••••" : isAeps ? aepsBalance : mainBalance}
                    </Text>
                  </Animated.View>
                  <TouchableOpacity onPress={() => setShowBalance(!showBalance)} style={{ marginLeft: 10 }}>
                    <Icon name={showBalance ? "eye-off" : "eye"} size={20} color="rgba(255,255,255,0.5)" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Bottom: Action Hints */}
              <View style={styles.cardFooter}>
                <Text style={styles.cardFooterText}>tap switch to change wallet</Text>
              </View>
            </LinearGradient>
          </Animated.View>

        </LinearGradient>
      </Animated.View>

      {/* BODY - Converts to Animated.ScrollView */}
      <Animated.ScrollView
        contentContainerStyle={{ paddingTop: 260, paddingBottom: 110 }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.body}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIndicator} />
            <Text style={styles.sectionTitle}>Aeps Services</Text>
          </View>
          <Animated.View
            style={{
              transform: [{ translateX: leftAnim }],
              opacity: leftFade,
            }}
          >
            <View style={styles.grid}>
              {services?.aeps?.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.categoryBox}
                  onPress={() => {
                    // navigation based on type if needed
                    // example:
                    // if (item.type === "cw") navigation.navigate("CashWithdraw");
                  }}
                >
                  <Icon
                    name={SERVICE_ICON_MAP[item.type] || SERVICE_ICON_MAP.default}
                    size={22}
                    color={Colors.finance_text}
                  />
                  <Text style={styles.categoryText}>
                    {item.name.replace("\n", " ")}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

          </Animated.View>

          <View style={styles.sectionHeader}>
            <View style={styles.sectionIndicator} />
            <Text style={styles.sectionTitle}>Money Transfer</Text>
          </View>
          <Animated.View
            style={{
              transform: [{ translateX: leftAnim }],
              opacity: leftFade,
            }}
          >
            <View style={styles.grid}>
              {services?.money_transfer?.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.categoryBox}
                  onPress={() => {
                    if (item.type === "dmt") {
                      navigation.navigate("MoneyTransfer");
                    }
                  }}
                >
                  <Icon
                    name={SERVICE_ICON_MAP[item.type] || SERVICE_ICON_MAP.default}
                    size={22}
                    color={Colors.finance_text}
                  />
                  <Text style={styles.categoryText}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

          </Animated.View>

          <View style={{ height: 80, marginTop: 8 }}>
            <ScrollView
              ref={planScrollRef}
              horizontal
              pagingEnabled={false}
              snapToInterval={SNAP_INTERVAL}
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 0 }}
            >
              {/* PLAN 1 */}
              <View style={[styles.planCard, { width: CARD_WIDTH, marginTop: 0, marginRight: SPACING }]}>
                <View style={styles.planRow}>
                  <View style={styles.planIconBg}>
                    <Icon name="cellphone" size={24} color={Colors.white} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.planTitle}>9876543210</Text>
                    <Text style={styles.planSubtitle}>Your plan expires in <Text style={{ color: '#FF3B30', fontWeight: 'bold' }}>4 days</Text></Text>
                  </View>
                  <TouchableOpacity style={styles.rechargeBtn}>
                    <Text style={styles.rechargeBtnText}>Recharge</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* PLAN 2 */}
              <View style={[styles.planCard, { width: CARD_WIDTH, marginTop: 0, borderLeftColor: '#FF9500', marginRight: SPACING }]}>
                <View style={styles.planRow}>
                  <View style={[styles.planIconBg, { backgroundColor: '#FF9500' }]}>
                    <Icon name="router-wireless" size={20} color={Colors.white} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.planTitle}>JioFiber</Text>
                    <Text style={styles.planSubtitle}>Bill Due: <Text style={{ color: '#FF9500', fontWeight: 'bold' }}>Tomorrow</Text></Text>
                  </View>
                  <TouchableOpacity style={[styles.rechargeBtn, { backgroundColor: '#FF9500' }]}>
                    <Text style={styles.rechargeBtnText}>Pay Bill</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* PLAN 1 CLONE */}
              <View style={[styles.planCard, { width: CARD_WIDTH, marginTop: 0, marginRight: SPACING }]}>
                <View style={styles.planRow}>
                  <View style={styles.planIconBg}>
                    <Icon name="cellphone" size={24} color={Colors.white} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.planTitle}>9876543210</Text>
                    <Text style={styles.planSubtitle}>Your plan expires in <Text style={{ color: '#FF3B30', fontWeight: 'bold' }}>4 days</Text></Text>
                  </View>
                  <TouchableOpacity style={styles.rechargeBtn}>
                    <Text style={styles.rechargeBtnText}>Recharge</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </View>
          <View style={[styles.sectionHeader, { justifyContent: 'space-between', marginBottom: 10 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.sectionIndicator} />
              <Text style={styles.sectionTitle}>Recharge & Bills</Text>
            </View>
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => navigation.navigate("PaymentsScreen")}
            >
              <Text style={styles.viewText}>View All</Text>
              <Icon name="arrow-right" size={18} color={Colors.finance_accent} />
            </TouchableOpacity>
          </View>
          <Animated.View
            style={{
              transform: [{ translateX: leftAnim }],
              opacity: leftFade,
            }}
          >
            <View style={styles.grid}>
              {services?.recharge_bills?.map((item, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.categoryBox}
                  onPress={() => {
                    if (item.type === "rech") {
                      navigation.navigate("TopUpScreen");
                    } else if (item.type === "C04") {
                      navigation.navigate("Electricity");
                    }
                  }}
                >
                  <Icon
                    name={SERVICE_ICON_MAP[item.type] || SERVICE_ICON_MAP.default}
                    size={22}
                    color={Colors.finance_text}
                  />
                  <Text style={styles.categoryText}>{item.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

          </Animated.View>



          {/* PROMOTIONAL BANNER */}
          <View style={styles.bannerContainer}>
            <ScrollView
              ref={scrollRef}
              horizontal
              pagingEnabled={false} // Disabled for custom spacing
              snapToInterval={width - 36 + 10} // Width + Margin
              decelerationRate="fast"
              showsHorizontalScrollIndicator={false}
              scrollEventThrottle={16}
              contentContainerStyle={{ paddingRight: 20 }} // End padding
              onScroll={Animated.event(
                [{ nativeEvent: { contentOffset: { x: bannerScrollX } } }],
                { useNativeDriver: false }
              )}
            >
              {[
                require('../assets/banner_a.png'),
                require('../assets/banner_b.png'),
                require('../assets/banner_c.png'),
                // CLONE of first image for loop
              ].map((img, index) => (
                <Image
                  key={index}
                  source={img}
                  style={styles.bannerImage}
                />
              ))}
            </ScrollView>

            {/* Pagination Dots */}
            <View style={styles.paginationContainer}>
              {[0, 1, 2].map((_, i) => {
                const inputRange = [(i - 1) * width, i * width, (i + 1) * width];
                const dotWidth = bannerScrollX.interpolate({
                  inputRange,
                  outputRange: [8, 20, 8],
                  extrapolate: 'clamp',
                });
                const opacity = bannerScrollX.interpolate({
                  inputRange,
                  outputRange: [0.3, 1, 0.3],
                  extrapolate: 'clamp',
                });
                return (
                  <Animated.View
                    key={i}
                    style={[styles.paginationDot, { width: dotWidth, opacity }]}
                  />
                );
              })}
            </View>
          </View>


          {/* Great Deals Header (Separated) */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 10,
            marginTop: 10,
            paddingVertical: 12,
            paddingHorizontal: 16,
            backgroundColor: Colors.white,
            borderRadius: 16,
            elevation: 2,
            shadowColor: Colors.finance_accent,
            shadowOpacity: 0.1,
            shadowRadius: 4,
            shadowOffset: { width: 0, height: 2 }
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={[styles.dealIconBoxLight, { backgroundColor: Colors.finance_chip }]}>
                <Icon name="fire" size={18} color={Colors.finance_accent} />
              </View>
              <Text style={[styles.dealHeaderTitleWhite, { color: Colors.finance_text }]}>Great Deals</Text>
            </View>
            <View style={[styles.hotTagWhite, { backgroundColor: Colors.finance_accent }]}>
              <Text style={[styles.hotTagTextGold, { color: Colors.white }]}>LIMITED</Text>
            </View>
          </View>

          <LinearGradient
            colors={[Colors.primary, '#000000']}
            style={styles.billPayCard}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            {/* Background Decor */}
            <View style={styles.billPayDecorCircle} />

            <View style={styles.rowBetween}>
              <View>
                <Text style={styles.billPayTitle}>Recharge & Bills</Text>
                <Text style={styles.billPaySubtitle}>Fast, Secure & Rewarding</Text>
              </View>
              <View style={styles.billPayIconBox}>
                <Icon name="cellphone-nfc" size={28} color={Colors.finance_accent} />
              </View>
            </View>

            {/* Quick Actions Row */}
            <View style={styles.billPayActions}>
              <View style={styles.billPayActionItem}>
                <Icon name="cellphone" size={20} color="#FFF" />
                <Text style={styles.billPayActionText}>Mobile</Text>
              </View>
              <View style={styles.billPayActionItem}>
                <Icon name="television-classic" size={20} color="#FFF" />
                <Text style={styles.billPayActionText}>DTH</Text>
              </View>
              <View style={styles.billPayActionItem}>
                <Icon name="lightbulb-on-outline" size={20} color="#FFF" />
                <Text style={styles.billPayActionText}>Elec</Text>
              </View>
              <View style={styles.billPayActionItem}>
                <Icon name="water-outline" size={20} color="#FFF" />
                <Text style={styles.billPayActionText}>Water</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.billPayButton}>
              <Text style={styles.billPayButtonText}>Pay Now</Text>
              <Icon name="arrow-right" size={16} color="#000" />
            </TouchableOpacity>

          </LinearGradient>
        </View>
      </Animated.ScrollView>

      {/* BOTTOM NAV */}
      {/* BOTTOM NAV */}
      <View style={styles.bottomNavContainer}>
        <View style={styles.bottomNav}>

          {/* Home (Active - Gradient & Glow) */}
          <TouchableOpacity
            style={styles.tabItem}
            activeOpacity={0.8}
            onPress={() => { }}
          >
            <View style={{ alignItems: 'center' }}>
              <LinearGradient
                colors={['#F5E7C6', '#d4b06a']} // Gold Gradient
                style={styles.activeTabGradient}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Icon name="home" size={24} color={Colors.black} />
              </LinearGradient>
              <Text style={styles.navLabelActive}>Home</Text>
            </View>
          </TouchableOpacity>

          {/* Report */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigation.navigate("OrderHistoryScreen")}
          >
            <View style={{ alignItems: 'center' }}>
              <Icon name="file-document-outline" size={24} color={"#888"} />
              <Text style={styles.navLabel}>Report</Text>
            </View>
          </TouchableOpacity>


          {/* History */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigation.navigate("InvoiceScreen")}
          >
            <View style={{ alignItems: 'center' }}>
              <View>
                <Icon name="history" size={24} color={"#888"} />
                <View style={styles.badgeDot} />
              </View>
              <Text style={styles.navLabel}>History</Text>
            </View>
          </TouchableOpacity>

          {/* Profile */}
          <TouchableOpacity
            style={styles.tabItem}
            onPress={() => navigation.navigate("ProfileScreen")}
          >
            <View style={{ alignItems: 'center' }}>
              <Icon name="account-outline" size={24} color={"#888"} />
              <Text style={styles.navLabel}>Profile</Text>
            </View>
          </TouchableOpacity>

        </View>
      </View>
      {loading && (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color={Colors.accent} />
          <Text style={styles.loaderText}>Loading...</Text>
        </View>
      )}<CustomAlert
        visible={alertVisible}
        title={alertTitle}
        message={alertMessage}
        onClose={() => {
          setAlertVisible(false);
          alertAction && alertAction();
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.finance_bg_1 },


  tabView: {
    alignItems: 'center',
    justifyContent: 'center',

  }, loaderContainer: {
    position: "absolute",
    top: 0,
    bottom: 0,

    left: 0,
    right: 0,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },
  loaderText: {
    marginTop: 10,
    color: Colors.white,
    fontSize: 14,
    fontWeight: "600",
  },
  gradientBtn: {
    height: 55,
    width: 55,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
    zIndex: 100,
    backgroundColor: '#161616', // Fallback
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    elevation: 10,
  },

  /* Advanced Header Styles */
  headerTopUser: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: 12,
  },
  avatarGradient: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  avatarText: {
    color: '#000',
    fontSize: 18,
    fontFamily: Fonts.Bold,
  },

  userDetails: {
    flex: 1,
  },
  welcomeText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontFamily: Fonts.Medium,
    marginBottom: 2,
  },
  userNameTitle: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: Fonts.Bold,
    letterSpacing: 0.5,
  },
  headerActions: {
    flexDirection: 'row',
  },
  glassBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
  },
  notificationBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    zIndex: 1,
    borderWidth: 1.5,
    borderColor: '#333',
  },





  walletCard: {
    marginTop: 15,
    borderRadius: 24,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    position: 'relative', // for circles
  },
  cardCircle1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(212, 176, 106, 0.1)', // Gold tint
  },
  cardCircle2: {
    position: 'absolute',
    bottom: -40,
    left: -20,
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  walletTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(212, 176, 106, 0.3)',
  },
  walletTagText: {
    color: '#d4b06a',
    fontSize: 12,
    fontFamily: Fonts.Bold,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  switchBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  cardLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontFamily: Fonts.Medium,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  currencySymbol: {
    color: '#d4b06a',
    fontSize: 24,
    fontFamily: Fonts.Light,
    marginRight: 4,
    marginTop: 4,
  },
  cardBalance: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: Fonts.Bold,
    letterSpacing: 1,
  },
  cardFooter: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  cardFooterText: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 10,
    fontStyle: 'italic',
  },

  actionText: { display: 'none' }, // Legacy cleanup
  requestBtn: { display: 'none' }, // Legacy cleanup
  currencyBtn: { display: 'none' }, // Legacy cleanup

  actionText: { color: Colors.finance_bg_2, marginLeft: 4, fontFamily: Fonts.Bold },

  body: { padding: 18 },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 4,
    paddingHorizontal: 0,
  },
  sectionIndicator: {
    width: 3,
    height: 16,
    backgroundColor: Colors.finance_accent,
    borderRadius: 4,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: Fonts.Bold,
    color: "#333",
    letterSpacing: 0.5,
    textTransform: 'capitalize',
  },

  sectionTitle1: {
    fontSize: 15,
    fontFamily: Fonts.Bold,
    color: "#333",
    letterSpacing: 0.5,
    marginTop: 12,
    textTransform: 'capitalize',
  },
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffcf5', // Very light background
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(212, 176, 106, 0.4)', // Accent with opacity
    elevation: 1,
    shadowColor: Colors.finance_accent,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  viewText: {
    fontSize: 12,
    fontFamily: Fonts.Bold,
    color: Colors.finance_accent,
    marginRight: 4,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  categoryBox: {
    width: "23%",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 12,
    paddingHorizontal: 8,
    // Subtle Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    marginVertical: 4,
    borderWidth: 0.5,
    borderColor: "rgba(0,0,0,0.05)",
  },

  categoryText: {
    color: "#444",
    fontSize: 10,
    textAlign: 'center',
    marginTop: 4,
    fontFamily: Fonts.Medium,
    lineHeight: 12,
  },
  dealCard: {
    padding: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)', // Subtle highlight border

    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },

  dealTitle: {
    fontSize: 15,
    width: '100%',
    fontFamily: Fonts.Bold,
    color: Colors.finance_accent,
    letterSpacing: 0.5,
  },
  dealSub: {
    color: "#999",
    marginTop: 2,
    fontSize: 11,
    fontFamily: Fonts.Medium
  },

  dealBadge: {
    backgroundColor: 'rgba(255, 109, 31, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FF6D1F',
  },
  dealBadgeText: {
    color: '#FF6D1F',
    fontSize: 9,
    fontFamily: Fonts.Bold,
  },

  dealGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
    marginBottom: 8,
  },

  dealLabel: { color: "#777", fontSize: 11, fontFamily: Fonts.Regular, marginBottom: 2 },
  dealValue: { color: Colors.white, fontSize: 13, fontFamily: Fonts.Bold },

  progressBar: {
    width: "100%",
    height: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    marginVertical: 12,
    overflow: 'hidden',
  },

  progressFill: {
    width: "70%",
    height: "100%",
    borderRadius: 10,
  },

  feeTagContainer: {
    backgroundColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  feeTagText: {
    color: "#ccc",
    fontSize: 11,
    fontFamily: Fonts.Medium,
  },

  dateText: { color: "#666", fontSize: 11 },

  bottomNavContainer: {
    position: "absolute",
    bottom: 12,
    width: "100%",
    alignItems: "center",
  },
  bottomNav: {
    backgroundColor: '#1A1A1A', // Jet Black
    width: "92%", // Slightly wider to fit labels
    height: 64, // Increased height
    borderRadius: 32,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 8,

    // Smooth Shadow
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 15,
    elevation: 10,

    borderWidth: 1,
    borderColor: '#333',
  },

  tabItem: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  activeTabGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    borderRadius: 18,

    // Glow Effect
    shadowColor: "#F5E7C6",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 5,
  },



  centerBtnContainer: {
    top: -22, // Float above bar
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,

    // Strong Glow for Center
    shadowColor: "#FF6D1F",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  centerBtnGradient: {
    flex: 1,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1A1A1A', // Cutout effect (match rounded cont bg)
  },

  badgeDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF3B30',
    borderWidth: 1,
    borderColor: '#1A1A1A',
  },

  // Banner Styles
  // Banner Styles
  bannerContainer: {
    marginTop: 20,
    marginBottom: 4,
    height: 130,
    borderRadius: 12,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerImage: {
    width: width - 36,
    height: 130,
    resizeMode: 'cover',
    borderRadius: 12,
    backgroundColor: '#fff',
    marginRight: 10,
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 8,
    flexDirection: 'row',
    alignSelf: 'center',
  },
  /* Bill Pay Card Styles */
  billPayCard: {
    marginHorizontal: 4,
    marginTop: 15,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
  },
  billPayDecorCircle: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(212, 176, 106, 0.1)',
  },
  billPayTitle: {
    color: '#FFF',
    fontSize: 18,
    fontFamily: Fonts.Bold,
  },
  billPaySubtitle: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontFamily: Fonts.Medium,
    marginTop: 2,
  },
  billPayIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  billPayActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 20,
  },
  billPayActionItem: {
    alignItems: 'center',
  },
  billPayActionText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 11,
    marginTop: 6,
    fontFamily: Fonts.Medium,
  },
  billPayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.finance_accent,
    paddingVertical: 10,
    borderRadius: 12,
  },
  billPayButtonText: {
    color: '#000',
    fontWeight: 'bold',
    marginRight: 6,
  },
  paginationDot: {
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.finance_accent,
    marginHorizontal: 3,
  },

  // Plan Card Styles
  planCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 12,
    marginVertical: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderLeftWidth: 3,
    borderLeftColor: '#FF3B30', // Warning accent
  },
  planRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planIconBg: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.finance_text, // Dark bg for icon
    justifyContent: 'center',
    alignItems: 'center',
  },
  planTitle: {
    fontSize: 14,
    fontFamily: Fonts.Bold,
    color: '#333',
  },
  planSubtitle: {
    fontSize: 10,
    color: '#666',
    marginTop: 1,
    fontFamily: Fonts.Medium,
  },
  rechargeBtn: {
    backgroundColor: Colors.finance_accent,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    elevation: 1,
  },
  rechargeBtnText: {
    color: '#000',
    fontSize: 12,
    fontFamily: Fonts.Bold,
  },

  // New Deal Header Styles
  dealHeader: {
    width: '100%', // Full Width
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
    backgroundColor: '#fff',
    paddingVertical: 10, // Increased vertical padding slightly
    paddingHorizontal: 16,
    borderRadius: 16,
    elevation: 2,
    shadowColor: Colors.finance_accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dealIconBox: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(212, 176, 106, 0.15)', // Light Gold
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  dealHeaderTitle: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
    color: '#333',
    marginRight: 8,
  },
  dealIconBoxDark: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(212, 176, 106, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 176, 106, 0.3)',
  },
  dealHeaderTitleDark: {
    fontSize: 16,
    fontFamily: Fonts.Bold,
    color: '#FFF',
    letterSpacing: 0.5,
  },
  hotTag: {
    backgroundColor: Colors.finance_accent,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  navLabel: {
    color: '#888',
    fontSize: 10,
    fontFamily: Fonts.Medium,
    marginTop: 4,
  },
  navLabelActive: {
    color: Colors.finance_accent,
    fontSize: 10,
    fontFamily: Fonts.Bold,
    marginTop: 4,
  },
  /* Updated Modern Deal Card Styles */
  dealIconBoxLight: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  dealHeaderTitleWhite: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: Fonts.Bold,
  },
  hotTagWhite: {
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  hotTagTextGold: {
    color: Colors.finance_accent,
    fontSize: 10,
    fontFamily: Fonts.Bold,
  },
  dealTitleDark: {
    color: '#1A1A1A',
    fontSize: 20,
    fontFamily: Fonts.Bold,
    marginBottom: 4,
  },
  dealSubDark: {
    color: '#444',
    fontSize: 12,
    marginTop: 0,
    fontFamily: Fonts.Medium,
    marginBottom: 16,
  },
  dealLabelDark: {
    color: '#555',
    fontSize: 11,
    fontFamily: Fonts.Medium,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dealValueDark: {
    color: '#000',
    fontSize: 15,
    fontFamily: Fonts.Bold,
  },
  progressBarDark: {
    height: 8,
    backgroundColor: 'rgba(0,0,0,0.08)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 15,
    marginTop: 5,
  },
  feeTagContainerDark: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 30, // Modern Pill Shape
    borderWidth: 0, // Removed border for cleaner look

    // Dark Brown Shadow
    shadowColor: "#3E2723",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  feeTagTextDark: {
    color: '#FFFFFF', // White Text for Contrast
    fontSize: 12,
    fontFamily: Fonts.Bold,
    letterSpacing: 0.5,
  },
  dateTextDark: {
    color: '#000000', // Deep Black for visibility
    fontSize: 12,
    fontFamily: Fonts.Bold,
    marginTop: 2,
    opacity: 0.7,
  },
});
