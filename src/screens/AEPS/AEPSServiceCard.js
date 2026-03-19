import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Colors from "../../constants/Colors";
import { FadeSlideUp } from "../../utils/ScreenAnimations";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

export default function AEPSServiceCard() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <FadeSlideUp>
        <View style={styles.container}>
          <Text style={styles.title}>AEPS Services</Text>
          <Text style={styles.subtitle}>
            Select a service to continue
          </Text>

          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("BalanceEnquiry")}
          >
            <Text style={styles.cardText}>Balance Enquiry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("CashWithdraw")}
          >
            <Text style={styles.cardText}>Cash Withdraw</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.card}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("MiniStatement")}
          >
            <Text style={styles.cardText}>Mini Statement</Text>
          </TouchableOpacity>
        </View>
      </FadeSlideUp>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  container: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },

  title: {
    fontSize: isTablet ? 28 : 24,
    fontWeight: "bold",
    color: Colors.primary,
    textAlign: "center",
  },

  subtitle: {
    fontSize: isTablet ? 16 : 14,
    color: Colors.gray,
    textAlign: "center",
    marginBottom: 40,
    marginTop: 6,
  },

  card: {
    backgroundColor: Colors.secondary,
    paddingVertical: isTablet ? 20 : 18,
    borderRadius: 16,
    marginBottom: 18,
    alignItems: "center",
    elevation: 4,
    borderWidth: 1,
    borderColor: "#EAEAEA",
  },

  cardText: {
    fontSize: isTablet ? 18 : 16,
    fontWeight: "600",
    color: Colors.primary,
  },
});