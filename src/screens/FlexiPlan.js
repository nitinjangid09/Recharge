import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView
} from "react-native";
import Colors from "../constants/Colors";

export default function FlexiPlan() {
  const [validity, setValidity] = useState("3 Day");
  const [internet, setInternet] = useState("5 GB");
  const [minutes, setMinutes] = useState("30");
  const [sms, setSms] = useState("100");

  const validityOptions = ["3 Day", "Weekly", "Monthly", "Yearly"];
  const internetOptions = ["1 GB", "2 GB", "5 GB", "10 GB", "20 GB", "30 GB", "40 GB", "60 GB", "70 GB", "80 GB"];
  const minutesOptions = ["10", "15", "30", "40", "50", "60", "70", "80", "100", "150", "200", "250"];
 const smsOptions = ["50", "100", "200", "300", "500"];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Flexi plan</Text>
        <Text style={styles.balance}>Balance: ₹75.00</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Text style={styles.tab}>Internet</Text>
        <Text style={styles.tab}>Devices</Text>
        <Text style={[styles.tab, styles.activeTab]}>Flexi plan</Text>
        <Text style={styles.tab}>Gifts</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Validity */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Validity</Text>
            <Text style={styles.reset}>Reset</Text>
          </View>

          <View style={styles.rowWrap}>
            {validityOptions.map(item => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.option,
                  validity === item && styles.selected
                ]}
                onPress={() => setValidity(item)}
              >
                <Text style={[
                  styles.optionText,
                  validity === item && styles.selectedText
                ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Internet */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Internet</Text>
            <Text style={styles.reset}>Reset</Text>
          </View>

          <View style={styles.rowWrap}>
            {internetOptions.map(item => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.option,
                  internet === item && styles.selected
                ]}
                onPress={() => setInternet(item)}
              >
                <Text style={[
                  styles.optionText,
                  internet === item && styles.selectedText
                ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Minutes */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>Minutes</Text>
            <Text style={styles.reset}>Reset</Text>
          </View>

          <View style={styles.rowWrap}>
            {minutesOptions.map(item => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.option,
                  minutes === item && styles.selected
                ]}
                onPress={() => setMinutes(item)}
              >
                <Text style={[
                  styles.optionText,
                  minutes === item && styles.selectedText
                ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* SMS */}
        <View style={styles.section}>
          <View style={styles.rowBetween}>
            <Text style={styles.sectionTitle}>SMS</Text>
            <Text style={styles.reset}>Reset</Text>
          </View>

          <View style={styles.rowWrap}>
            {smsOptions.map(item => (
              <TouchableOpacity
                key={item}
                style={[
                  styles.option,
                  sms === item && styles.selected
                ]}
                onPress={() => setSms(item)}
              >
                <Text style={[
                  styles.optionText,
                  sms === item && styles.selectedText
                ]}>
                  {item}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryBox}>
          <Text style={styles.summaryText}>
            Purchase Order
          </Text>
          <Text style={styles.summaryDetail}>
            {validity} • {internet} • {minutes} Min • {sms} SMS
          </Text>

          <Text style={styles.price}>₹20.00</Text>
        </View>

        {/* Button */}
        <TouchableOpacity style={styles.buyBtn}>
          <Text style={styles.buyText}>Buy Now</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg, padding: 18 },
  header: { flexDirection: "row", justifyContent: "space-between", marginBottom: 10 },
  title: { fontSize: 20, fontWeight: "700" },
  balance: { fontSize: 14, color: Colors.gray },

  tabs: { flexDirection: "row", gap: 15, marginBottom: 10 },
  tab: { color: Colors.gray },
  activeTab: { color: Colors.accent, fontWeight: "700" },

  section: { marginTop: 15 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  reset: { color: Colors.accent, fontSize: 13 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between" },
  rowWrap: { flexDirection: "row", flexWrap: "wrap",backgroundColor:Colors.secndory, padding:10, marginTop: 10, gap: 5,borderRadius:10,borderWidth:.7,borderColor:Colors.white },

  option: {
    borderWidth: 1,
    borderColor: Colors.secndory,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  selected: { backgroundColor: Colors.accent },
  optionText: { color: Colors.primary },
  selectedText: { color: Colors.white },

  summaryBox: {
    marginTop: 25,
    backgroundColor: Colors.secndory,
    padding: 15,
    borderRadius: 14
  },
  summaryText: { fontWeight: "700", marginBottom: 5 },
  summaryDetail: { color: Colors.gray, marginBottom: 10 },
  price: { fontSize: 18, fontWeight: "700" },

  buyBtn: {
    marginTop: 15,
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    borderRadius: 30, 
    
    alignItems: "center"
  },
  buyText: { color: Colors.white, fontSize: 16, fontWeight: "700" }
});
