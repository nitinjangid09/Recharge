import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

export default function test() {
  return (
    <View style={styles.container}>

      {/* HEADER */}
      <LinearGradient
        colors={["#003E32", "#005F4F"]}
        style={styles.header}
      >
        <View style={styles.rowBetween}>
          <View>
            <Text style={styles.goodText}>Good Morning!</Text>
            <Text style={styles.nameText}>Ryan Sterling</Text>
          </View>

          <View style={styles.headerIcons}>
            <View style={styles.iconBox}>
              <Icon name="bell-outline" size={22} color="#fff" />
            </View>
            <View style={styles.iconBox}>
              <Icon name="shield-check-outline" size={22} color="#fff" />
            </View>
          </View>
        </View>

        <Text style={styles.balanceLabel}>Total Balance</Text>
        <View style={styles.rowBetween}>
          <Text style={styles.balance}>$32,680.20</Text>

          <TouchableOpacity style={styles.currencyBtn}>
            <Text style={{ color: "#fff" }}>USD</Text>
            <Icon name="chevron-down" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.requestBtn}>
            <Icon name="arrow-down" size={18} color="#fff" />
            <Text style={styles.actionText}>Request</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.transferBtn}>
            <Icon name="arrow-up" size={18} color="#003E32" />
            <Text style={[styles.actionText, { color: "#003E32" }]}>
              Transfer
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.moreBtn}>
            <Icon name="dots-horizontal" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* BODY */}
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={styles.body}>
          <Text style={styles.sectionTitle}>Categories</Text>

          <View style={styles.grid}>
            {[
              "Wallet",
              "Payments",
              "Journey",
              "Rosca",
              "Sanads",
              "Fatwa",
              "Donation",
              "Savings",
            ].map((name, index) => (
              <View key={index} style={styles.categoryBox}>
                <Icon
                  name="wallet-outline"
                  size={22}
                  color="#003E32"
                />
                <Text style={styles.categoryText}>{name}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.sectionTitle}>Great Deals</Text>

          {/* Deal Card */}
          <View style={styles.dealCard}>
            <View style={styles.rowBetween}>
              <Text style={styles.dealTitle}>Long-term earning</Text>
              <Icon name="heart-outline" size={20} color="#111" />
            </View>

            <Text style={styles.dealSub}>10 months • Investment</Text>

            <View style={styles.rowBetween}>
              <Text style={styles.dealLabel}>Amount</Text>
              <Text style={styles.dealLabel}>Duration</Text>
            </View>

            <View style={styles.rowBetween}>
              <Text style={styles.dealValue}>$5,000</Text>
              <Text style={styles.dealValue}>10 Month</Text>
            </View>

            <View style={styles.progressBar}>
              <View style={styles.progressFill}></View>
            </View>

            <View style={styles.rowBetween}>
              <Text style={styles.feeTag}>Fees $25</Text>
              <Text style={styles.dateText}>Since Mar 25</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* BOTTOM NAV */}
      <View style={styles.bottomNav}>
        <Icon name="home" size={26} color="#fff" />
        <Icon name="credit-card-outline" size={26} color="#9ad4c6" />
        <Icon name="qrcode-scan" size={28} color="#9ad4c6" />
        <Icon name="account" size={26} color="#9ad4c6" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#e9f6f2" },

  header: {
    height: 260,
    padding: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },

  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  goodText: { color: "#b9eadd", fontSize: 13 },
  nameText: { color: "#fff", fontSize: 18, fontWeight: "700" },

  headerIcons: { flexDirection: "row" },
  iconBox: {
    width: 35,
    height: 35,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 10,
  },

  balanceLabel: { color: "#b9eadd", marginTop: 22 },
  balance: { color: "#fff", fontSize: 32, fontWeight: "800" },

  currencyBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
  },

  actionRow: {
    flexDirection: "row",
    marginTop: 18,
    alignItems: "center",
  },

  requestBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#004c3b",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 15,
    marginRight: 10,
  },

  transferBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#c9f6e8",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 15,
  },

  moreBtn: {
    marginLeft: 10,
    backgroundColor: "rgba(255,255,255,0.2)",
    padding: 10,
    borderRadius: 12,
  },

  actionText: { color: "#fff", marginLeft: 6, fontWeight: "700" },

  body: { padding: 18 },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#003e32",
    marginVertical: 10,
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },

  categoryBox: {
    width: "23%",
    backgroundColor: "#dff7f0",
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 16,
    marginVertical: 8,
  },

  categoryText: {
    color: "#003E32",
    fontSize: 12,
    marginTop: 5,
    fontWeight: "600",
  },

  dealCard: {
    backgroundColor: "#fff",
    padding: 18,
    borderRadius: 18,
    marginTop: 8,
  },

  dealTitle: { fontSize: 16, fontWeight: "700", color: "#003E32" },
  dealSub: { color: "#777", marginTop: 2 },

  dealLabel: { color: "#777", fontSize: 12, marginTop: 10 },
  dealValue: { color: "#111", fontWeight: "700" },

  progressBar: {
    width: "100%",
    height: 7,
    backgroundColor: "#e6e6e6",
    borderRadius: 10,
    marginVertical: 8,
  },

  progressFill: {
    width: "70%",
    height: "100%",
    backgroundColor: "#9adf00",
    borderRadius: 10,
  },

  feeTag: {
    backgroundColor: "#111",
    color: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    fontSize: 12,
  },

  dateText: { color: "#555", fontSize: 12 },

  bottomNav: {
    position: "absolute",
    bottom: 15,
    alignSelf: "center",
    backgroundColor: "#003E32",
    width: "84%",
    height: 65,
    borderRadius: 40,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
});
