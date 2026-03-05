import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Colors from "../../utils/Color";

const DmtHome = () => {
  const navigation = useNavigation();

  const accounts = [
    {
      id: "1",
      name: "Rahul Sharma",
      bank: "State Bank of India",
      accountNumber: "XXXXXX4589",
      ifsc: "SBIN0004589",
    },
    {
      id: "2",
      name: "Amit Verma",
      bank: "HDFC Bank",
      accountNumber: "XXXXXX7832",
      ifsc: "HDFC0007832",
    },
    {
      id: "3",
      name: "Neha Singh",
      bank: "ICICI Bank",
      accountNumber: "XXXXXX1122",
      ifsc: "ICIC0001122",
    },
    {
      id: "4",
      name: "Rahul Sharma",
      bank: "State Bank of India",
      accountNumber: "XXXXXX4589",
      ifsc: "SBIN0004589",
    },
  ];

  const getInitials = (name) =>
    name
      .split(" ")
      .map((n) => n[0])
      .join("");

  const handleTransfer = (account) => {
    navigation.navigate("MoneyTransfer", { account });
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.leftSection}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {getInitials(item.name)}
          </Text>
        </View>

        <View style={{ marginLeft: 12 }}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.bank}>{item.bank}</Text>

          <View style={styles.tagRow}>
            <Text style={styles.tag}>{item.accountNumber}</Text>
            <Text style={styles.tag}>{item.ifsc}</Text>
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={styles.sendBtn}
        onPress={() => handleTransfer(item)}
      >
        <Text style={styles.sendText}>Transfer</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>

      {/*  TOP DARK HEADER */}
      <View style={styles.headerWrapper}>
        <View style={styles.headerTop}>
          <View>
            <Text style={styles.smallLabel}>TOTAL BUDGET</Text>
            <Text style={styles.bigAmount}>₹50,000</Text>
          </View>

          <View style={{ alignItems: "flex-end" }}>
            <Text style={styles.smallLabel}>USER ID</Text>
            <Text style={styles.userId}>465146144</Text>
          </View>
        </View>

        <View style={styles.remainingRow}>
          <View style={styles.dot} />
          <Text style={styles.remainingText}>Remaining</Text>
          <Text style={styles.remainingAmount}> ₹32,450</Text>
        </View>

        <View style={styles.progressBar}>
          <View style={styles.progressFill} />
        </View>

        <View style={styles.progressInfo}>
          <Text style={styles.spentText}>Spent ₹17,550</Text>
          <Text style={styles.spentText}>35% used</Text>
        </View>
      </View>

      {/* WHITE CONTENT SECTION */}
      <View style={styles.contentContainer}>

        {/* ACTION BUTTONS */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate("AddBenificial")}
          >
            <Text style={styles.actionBtnText}>Add Beneficiary</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => navigation.navigate("FetchBeneficiary")}
          >
            <Text style={styles.actionBtnText}>Fetch Beneficiary</Text>
          </TouchableOpacity>
        </View>

        {/* ACCOUNT HISTORY HEADER */}
        <View style={styles.historyHeader}>
          <Text style={styles.sectionTitle}>Account History</Text>
          <View style={styles.contactBadge}>
            <Text style={styles.contactText}>
              {accounts.length} contacts
            </Text>
          </View>
        </View>

        {/* SCROLLABLE LIST */}
        <FlatList
          data={accounts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
        />
      </View>
    </SafeAreaView>
  );
};

export default DmtHome;
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary, // Top dark color
  },

  /* HEADER */

  headerWrapper: {
    backgroundColor: Colors.primary,
    padding: 20,
    paddingBottom: 25,
  },

  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  smallLabel: {
    color: Colors.lightGray,
    fontSize: 12,
  },

  bigAmount: {
    color: Colors.white,
    fontSize: 28,
    fontWeight: "bold",
    marginTop: 6,
  },

  userId: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
    marginTop: 6,
  },

  remainingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
  },

  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accent,
    marginRight: 8,
  },

  remainingText: {
    color: Colors.lightGray,
    fontSize: 13,
  },

  remainingAmount: {
    color: Colors.accent,
    fontWeight: "bold",
    fontSize: 15,
  },

  progressBar: {
    height: 6,
    backgroundColor: Colors.gray,
    borderRadius: 4,
    marginTop: 12,
    overflow: "hidden",
  },

  progressFill: {
    width: "35%",
    height: "100%",
    backgroundColor: Colors.accent,
  },

  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
  },

  spentText: {
    color: Colors.lightGray,
    fontSize: 12,
  },

  /* WHITE CONTENT SECTION */

  contentContainer: {
    flex: 1,
    backgroundColor: Colors.bg,
    paddingTop: 20,
    paddingHorizontal: 20,
  },

  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  actionBtn: {
    backgroundColor: Colors.accent,
    width: "48%",
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: "center",
  },

  actionBtnText: {
    color: Colors.white,
    fontWeight: "600",
  },

  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 25,
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.black,
  },

  contactBadge: {
    backgroundColor: Colors.lightAccent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },

  contactText: {
    fontSize: 11,
    color: Colors.accent,
    fontWeight: "600",
  },

  card: {
    backgroundColor: Colors.white,
    padding: 16,
    borderRadius: 18,
    marginBottom: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    elevation: 3,
  },

  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  avatar: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  avatarText: {
    color: Colors.white,
    fontWeight: "bold",
  },

  name: {
    fontWeight: "700",
    fontSize: 14,
    color: Colors.black,
  },

  bank: {
    fontSize: 12,
    color: Colors.gray,
    marginTop: 2,
  },

  tagRow: {
    flexDirection: "row",
    marginTop: 6,
  },

  tag: {
    backgroundColor: Colors.lightGray,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    fontSize: 10,
    marginRight: 6,
    color: Colors.black,
  },

  sendBtn: {
    backgroundColor: Colors.accent,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },

  sendText: {
    color: Colors.white,
    fontWeight: "600",
  },
});