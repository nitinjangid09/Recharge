import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, ActivityIndicator } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../constants/Colors";
import { Animated } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import LinearGradient from "react-native-linear-gradient";
import Fonts from "../constants/Fonts";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchBbpsCategories } from "../api/AuthApi";

import BroadbandPostpaidIcon from "../assets/BBPSIcon/Broadband Postpaid.svg";
import CableTVIcon from "../assets/BBPSIcon/Cable TV.svg";
import ClubsAndAssociationsIcon from "../assets/BBPSIcon/Clubs and Associations.svg";
import CreditCardIcon from "../assets/BBPSIcon/Credit Card.svg";
import DTHIconSVG from "../assets/BBPSIcon/DTH.svg";
import DonationIconSVG from "../assets/BBPSIcon/Donation.svg";
import AgentCollectionIcon from "../assets/BBPSIcon/agent collection.svg";
import ChallanIcon from "../assets/BBPSIcon/Challan.svg";
import EducationFeesIcon from "../assets/BBPSIcon/Education Fees.svg";
import ElectricityIcon from "../assets/BBPSIcon/Electricity.svg";
import FastagIcon from "../assets/BBPSIcon/Fastag.svg";
import GasIcon from "../assets/BBPSIcon/Gas.svg";
import HospitalAndPathologyIcon from "../assets/BBPSIcon/Hospital and Pathology.svg";
import HospitalIcon from "../assets/BBPSIcon/Hospital.svg";
import HousingSocietyIcon from "../assets/BBPSIcon/Housing Society.svg";
import InsuranceIcon from "../assets/BBPSIcon/Insurance.svg";
import LPGGasIcon from "../assets/BBPSIcon/LPG Gas.svg";
import LandlinePostpaidIcon from "../assets/BBPSIcon/Landline Postpaid.svg";
import LoanRepaymentIcon from "../assets/BBPSIcon/Loan Repayment.svg";
import MobilePostpaidIcon from "../assets/BBPSIcon/Mobile Postpaid.svg";
import MobilePrepaidIcon from "../assets/BBPSIcon/Mobile Prepaid.svg";
import MunicipalServicesIcon from "../assets/BBPSIcon/Municipal Services.svg";
import MunicipalTaxesIcon from "../assets/BBPSIcon/Municipal Taxes.svg";
import NCMCRechargeIcon from "../assets/BBPSIcon/NCMC Recharge.svg";
import NationalPensionSystemIcon from "../assets/BBPSIcon/National Pension System.svg";
import PrepaidMeterIcon from "../assets/BBPSIcon/Prepaid Meter.svg";
import RecurringDepositIcon from "../assets/BBPSIcon/Recurring Deposit.svg";
import RentalIcon from "../assets/BBPSIcon/Rental.svg";
import SubscriptionIcon from "../assets/BBPSIcon/Subscription.svg";
import WaterIcon from "../assets/BBPSIcon/Water.svg";


const SVG_MAP = {
  "Broadband Postpaid": BroadbandPostpaidIcon,
  "Cable TV": CableTVIcon,
  "Clubs and Associations": ClubsAndAssociationsIcon,
  "Credit Card": CreditCardIcon,
  "DTH": DTHIconSVG,
  "Donation": DonationIconSVG,
  "Agent Collection": AgentCollectionIcon,
  "eChallan": ChallanIcon,
  "Education Fees": EducationFeesIcon,
  " Education Fees": EducationFeesIcon,
  "Electricity": ElectricityIcon,
  "Fastag": FastagIcon,
  "Gas": GasIcon,
  "Hospital and Pathology": HospitalAndPathologyIcon,
  "Hospital": HospitalIcon,
  "Housing Society": HousingSocietyIcon,
  "Insurance": InsuranceIcon,
  "LPG Gas": LPGGasIcon,
  "Landline Postpaid": LandlinePostpaidIcon,
  "Loan Repayment": LoanRepaymentIcon,
  "Mobile Postpaid": MobilePostpaidIcon,
  "Mobile Prepaid": MobilePrepaidIcon,
  "Municipal Services": MunicipalServicesIcon,
  "Munic~ipal Services": MunicipalServicesIcon,
  "Municipal Taxes": MunicipalTaxesIcon,
  "NCMC Recharge": NCMCRechargeIcon,
  "National Pension System": NationalPensionSystemIcon,
  "Prepaid Meter": PrepaidMeterIcon,
  "Recurring Deposit": RecurringDepositIcon,
  "Rental": RentalIcon,
  "Subscription": SubscriptionIcon,
  "Water": WaterIcon,
};


export default function PaymentsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(50)).current;

  const [categories, setCategories] = useState([]);
  const [groups, setGroups] = useState([]);
  const [activeGroup, setActiveGroup] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
    }).start();
    loadCategories();
  }, []);

  const loadCategories = async () => {
    setLoading(true);
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      const res = await fetchBbpsCategories({ headerToken });
      if (res?.success && res.data) {
        setCategories(res.data);
        const uniqueGroups = ["ALL", ...new Set(res.data.map(c => c.group))];
        setGroups(uniqueGroups);
        setActiveGroup("ALL");
      }
    } catch (err) {
      console.log("Load categories error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* -------- HEADER -------- */}
        <LinearGradient
          colors={["#161616", "#000000"]}
          style={[styles.headerGradient, { paddingTop: insets.top + 10 }]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <View style={styles.header}>
            <Icon name="menu" size={24} color={Colors.white} />

            <View style={{ alignItems: "center" }}>
              <Text style={styles.headerTitle}>PAY WITH THANKS</Text>
              <Text style={styles.subTitle}>UPI, bills, recharges & utilities</Text>
            </View>

            <View style={styles.qrCircle}>
              <Icon name="qrcode-scan" size={18} color={Colors.finance_accent} />
            </View>
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: 14 }}>

          <View style={styles.card}>
            <View>
              <Text style={styles.smallText}>ELECTRICITY • 510984752</Text>
              <Text style={styles.mainText}>₹1,245 due on 25 March</Text>
            </View>

            <TouchableOpacity>
              <Text style={styles.rechargeBtn}>Pay Now</Text>
            </TouchableOpacity>
          </View>
          <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
            <LinearGradient
              colors={["#fde4a8", "#FFF"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              style={styles.banner}
            >
              <View>
                <Text style={styles.bannerText}>
                  Pay your recharge,{"\n"}electricity, credit card &
                  {"\n"}other bills using
                </Text>
                <Text style={styles.postpe}>Pay bill...</Text>
              </View>

              <Image
                source={require("../assets/bbps.png")}
                style={styles.bannerImage}
              />
            </LinearGradient>


            {/* -------- MAIN PAY CARD -------- */}

            <View style={styles.bigCard}>
              <Text style={styles.sectionTitle}>RECHARGE & BILL SERVICES</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsContainer}
              >
                {groups.map((group) => (
                  <TouchableOpacity
                    key={group}
                    style={[styles.groupTab, activeGroup === group && styles.groupTabActive]}
                    onPress={() => setActiveGroup(group)}
                  >
                    <Text style={[styles.groupTabText, activeGroup === group && styles.groupTabTextActive]}>
                      {group.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {loading ? (
                <View style={{ paddingVertical: 40, alignItems: "center", justifyContent: "center" }}>
                  <ActivityIndicator size="large" color={Colors.finance_accent} />
                  <Text style={{ marginTop: 10, color: "#666", fontSize: 13, fontFamily: Fonts.Medium }}>Fetching services...</Text>
                </View>
              ) : (
                <View style={styles.iconGrid}>
                  {categories
                    .filter(cat => activeGroup === "ALL" || cat.group === activeGroup)
                    .map((cat, i) => (
                      <TouchableOpacity
                        key={cat._id || i}
                        onPress={() => {
                          navigation.navigate("BbpsDynamicServiceScreen", { serviceType: cat.name });
                        }}
                      >
                        <Feature
                          SvgComponent={SVG_MAP[cat.name]}
                          text={cat.name}
                        />
                      </TouchableOpacity>
                    ))
                  }
                </View>
              )}
            </View>

            {/* <View style={styles.bigCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.sectionTitle}>RECHARGE AND PAY BILLS</Text>
              <Text style={styles.link}>View My Bills</Text>
            </View>

            <View style={styles.iconGrid}>
              

            </View>
          </View> */}

          </Animated.View>
        </View>
      </ScrollView>

      {/* Floating scan button removed */}
    </SafeAreaView>
  );
}

const Feature = ({ icon, text, SvgComponent }) => (
  <View style={{ alignItems: "center", marginBottom: 8, width: 68 }}>
    <View style={styles.iconCircle}>
      {SvgComponent ? (
        <SvgComponent width={26} height={26} fill={Colors.finance_accent} color={Colors.finance_accent} />
      ) : (
        <Icon name={icon} size={24} color={Colors.finance_accent} />
      )}
    </View>
    <Text style={styles.iconLabel}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  headerGradient: { paddingBottom: 35, borderBottomLeftRadius: 24, borderBottomRightRadius: 24, elevation: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 5 },
  header: { marginTop: 0, paddingHorizontal: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerTitle: { fontSize: 16, fontFamily: Fonts.Bold, color: Colors.white, letterSpacing: 0.5 },
  subTitle: { fontSize: 11, fontFamily: Fonts.Medium, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  qrCircle: { width: 36, height: 36, backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 18, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },

  card: { marginTop: -20, backgroundColor: Colors.homebg, borderRadius: 16, padding: 15, flexDirection: "row", justifyContent: "space-between", elevation: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, borderWidth: 1, borderColor: "rgba(0,0,0,0.02)" },
  smallText: { color: "#666", fontSize: 11, fontFamily: Fonts.Medium },
  mainText: { color: "#333", fontSize: 14, fontFamily: Fonts.Bold, marginTop: 4 },
  rechargeBtn: { color: Colors.finance_accent, fontFamily: Fonts.Bold, fontSize: 13 },

  bigCard: { marginTop: 15, marginBottom: 80, backgroundColor: Colors.homebg, borderRadius: 20, paddingVertical: 15, paddingHorizontal: 10, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, borderWidth: 1, borderColor: "rgba(0,0,0,0.03)" },
  sectionTitle: { fontSize: 14, fontFamily: Fonts.Bold, fontWeight: "bold", color: "#333", textTransform: "uppercase", letterSpacing: 0.5 },
  link: { color: Colors.finance_accent, fontFamily: Fonts.Bold, fontSize: 12 },

  iconGrid: { marginTop: 15, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-around", rowGap: 12 },
  iconCircle: { width: 44, height: 44, borderRadius: 16, backgroundColor: Colors.bg, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: "rgba(212, 176, 106, 0.2)" },
  iconLabel: { width: "100%", textAlign: "center", fontSize: 11, fontFamily: Fonts.Bold, color: "#444", marginTop: 4, marginBottom: 8 },

  rowBetween: { flexDirection: "row", justifyContent: "space-between" },

  scanBtn: { position: "absolute", bottom: 20, alignSelf: "center", backgroundColor: Colors.finance_accent, paddingHorizontal: 22, paddingVertical: 12, borderRadius: 30, flexDirection: "row", alignItems: "center", gap: 8, elevation: 4 },
  banner: { backgroundColor: Colors.white, borderRadius: 16, padding: 14, marginTop: 15, flexDirection: "row", justifyContent: "space-between", borderWidth: 1, borderColor: "rgba(212, 176, 106, 0.1)", elevation: 2 },
  postpe: { fontSize: 18, fontFamily: Fonts.Bold, color: Colors.finance_accent, marginTop: 4 },
  bannerImage: { width: 70, height: 70, resizeMode: "contain" },
  bannerText: { fontSize: 12, color: "#555", fontFamily: Fonts.Medium, lineHeight: 16 },
  scanText: { color: Colors.white, fontFamily: Fonts.Bold, fontSize: 14 },
  tabsContainer: { flexDirection: "row", gap: 10, marginTop: 12, marginBottom: 5, paddingBottom: 4 },
  groupTab: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: "#F5F5F5", borderWidth: 1, borderColor: "rgba(0,0,0,0.03)" },
  groupTabActive: { backgroundColor: "#FFFCF5", borderColor: "rgba(212, 176, 106, 0.4)", elevation: 1 },
  groupTabText: { fontSize: 12, fontFamily: Fonts.Medium, color: "#666" },
  groupTabTextActive: { fontFamily: Fonts.Bold, fontWeight: "bold", color: Colors.finance_accent },
});
