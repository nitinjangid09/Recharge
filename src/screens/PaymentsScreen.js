import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView } from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../constants/Colors";
import { Animated } from "react-native";


export default function PaymentsScreen({ navigation }) {
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);
  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>

        {/* -------- HEADER -------- */}
        <View style={styles.header}>
          <Icon name="menu" size={26} color={Colors.black} />

          <View style={{ alignItems: "center" }}>
            <Text style={styles.headerTitle}>pay with thanks</Text>
            <Text style={styles.subTitle}>UPI, bills, recharges & utilities</Text>
          </View>

          <View style={styles.qrCircle}>
            <Icon name="qrcode-scan" size={18} color={Colors.secndory} />
          </View>
        </View>
      
        <View style={styles.card}>
          <View>
            <Text style={styles.smallText}>PREPAID • 6350580877</Text>
            <Text style={styles.mainText}>₹299 pack expiring in 3 days</Text>
          </View>

          <TouchableOpacity>
            <Text style={styles.rechargeBtn}>Recharge</Text>
          </TouchableOpacity>
        </View>
          <Animated.View style={{ transform: [{ translateY: slideAnim }] }}>
        <View style={styles.banner}>
          <View>
            <Text style={styles.bannerText}>
              pay your recharge,{"\n"}electricity, credit card &
              {"\n"}other bills using
            </Text>
            <Text style={styles.postpe}>postpe...</Text>
          </View>

          <Image
            source={require("../assets/bbps.png")}
            style={styles.bannerImage}
          />
        </View>


        {/* -------- MAIN PAY CARD -------- */}
       
          <View style={styles.bigCard}>
            <Text style={styles.sectionTitle}>Airtel UPI</Text>

            {/* ICON GRID */}
            <View style={styles.iconGrid}>
              <TouchableOpacity onPress={() => navigation.navigate("TopUpScreen")}>
                <Feature icon="phone" text="Recharge" /></TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate("Electricity")}>
                <Feature icon="flash" text="Electricity" /></TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate("BbbpsServices")}>
                <Feature icon="account-cash" text="BBPS" /></TouchableOpacity>
              <Feature icon="bank" text="pay bank" />
              <Feature icon="account-arrow-right" text="self" />
              <Feature icon="cash" text="check" />
              <Feature icon="cog" text="settings" />
              <Feature icon="history" text="history" />
              <Feature icon="cellphone" text="Recharge" />
              <Feature icon="flash" text="Electricity" />
              <Feature icon="car" text="Fastag" />
              <Feature icon="gas-cylinder" text="Cylinder" />
               <Feature icon="cellphone" text="Recharge" />
              <Feature icon="flash" text="Electricity" />
              <Feature icon="car" text="Fastag" />
              <Feature icon="gas-cylinder" text="Cylinder" />
               <Feature icon="cellphone" text="Recharge" />
              <Feature icon="flash" text="Electricity" />
              <Feature icon="car" text="Fastag" />
              <Feature icon="gas-cylinder" text="Cylinder" />
               <Feature icon="cellphone" text="Recharge" />
              <Feature icon="flash" text="Electricity" />
              <Feature icon="car" text="Fastag" />
              <Feature icon="gas-cylinder" text="Cylinder" />
              
            </View>
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
      </ScrollView>

      {/* -------- FLOATING SCAN BUTTON -------- */}
      <TouchableOpacity style={styles.scanBtn}>
        <Icon name="qrcode-scan" color={Colors.white} size={22} />
        <Text style={styles.scanText}>Scan Any QR</Text>
      </TouchableOpacity>
    </View>
  );
}

const Feature = ({ icon, text }) => (
  <View style={{ alignItems: "center" }}>
    <View style={styles.iconCircle}>
      <Icon name={icon} size={24} color={Colors.black} />
    </View>
    <Text style={styles.iconLabel}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, paddingHorizontal: 12 },

  header: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: { fontSize: 18, fontWeight: "700", color: Colors.black },
  subTitle: { fontSize: 12, color: Colors.gray },

  qrCircle: {
    width: 38,
    height: 38,
    backgroundColor: Colors.black,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
  },

  card: {
    marginTop: 18,
    backgroundColor: Colors.secndory,
    borderRadius: 12,
    padding: 15,
    flexDirection: "row",
    borderColor: Colors.white,
    borderWidth: 1,
    justifyContent: "space-between",
  },

  smallText: { color: Colors.gray, fontSize: 12 },
  mainText: { color: Colors.black, fontSize: 15, fontWeight: "700", marginTop: 3 },

  rechargeBtn: { color: Colors.accent, fontWeight: "700", fontSize: 13 },

  bigCard: {
    marginTop: 10,
    marginBottom:80,
    backgroundColor: Colors.secndory,
    borderRadius: 18, borderColor: Colors.white,
    borderWidth: 1,
    padding: 15,
  },

  sectionTitle: { fontWeight: "500", fontSize: 14, color: Colors.black },
  link: { color: Colors.accent, fontWeight: "600", fontSize: 12 },

  iconGrid: {
    marginTop: 15,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  iconCircle: {
    width: 48,
    height: 48,
    elevation: 5,
    borderColor: Colors.bg,
    borderWidth: .5,
    backgroundColor: Colors.bg,
    borderRadius: 45,
    justifyContent: "center",
    alignItems: "center",
  },

  iconLabel: {
    width: 70,
    textAlign: "center",
    fontSize: 12,
    fontWeight: '400',
    color: Colors.primary,
    marginTop: 2,
    marginBottom: 15
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  scanBtn: {
    position: "absolute",
    bottom: 15,
    alignSelf: "center",
    backgroundColor: Colors.accent,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  banner: {
    backgroundColor: Colors.accent,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.white,
    padding: 16,
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",

  },

  postpe: {
    fontSize: 24,
    fontWeight: "bold",
    color: Colors.white,
    marginTop: 6,
  },
  bannerImage: {
    width: 80,
    height: 80,
    resizeMode: "contain",
  },
  bannerText: {
    fontSize: 13,
    color: Colors.white,
  },
  scanText: { color: Colors.white, fontWeight: "700", fontSize: 14 },
});
