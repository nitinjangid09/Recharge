import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../constants/Colors";
import HeaderBar from "../componets/HeaderBar";

export default function BbbpsServices({navigation}) {
  const GridItem = ({ icon, label }) => (
    <TouchableOpacity style={styles.gridItem}>
      <Icon name={icon} size={24} color={Colors.primary} />
      <Text style={styles.gridText}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
       <HeaderBar
        title="Bill Payments"
        onBack={() => navigation.goBack()} />

      {/* Banner */}
     <View style={{padding:15}}> <View style={styles.banner}>
        <View>
          <Text style={styles.bannerText}>
            pay your recharge,{"\n"}electricity, credit card &
            {"\n"}other bills using
          </Text>
          <Text style={styles.postpe}>postpe...</Text>
        </View>

        <Image
          source={{ uri: "https://i.imgur.com/JyKJ4xM.png" }}
          style={styles.bannerImage}
        />
      </View>

      {/* Recharges */}
      <Text style={styles.sectionTitle}>Recharges & Bills</Text>
      <View style={styles.row}>
        <GridItem icon="cellphone" label="prepaid" />
        <GridItem icon="cellphone-wireless" label="postpaid" />
        <GridItem icon="router-wireless" label="broadband" />
      </View>

      {/* Utilities */}
      <Text style={styles.sectionTitle}>Utilities Bills</Text>
      <View style={styles.grid}>
        <GridItem icon="water" label="water" />
        <GridItem icon="gas-cylinder" label="cylinder" />
        <GridItem icon="gas-station" label="piped gas" />
        <GridItem icon="satellite-variant" label="dth" />
        <GridItem icon="flash" label="electricity" />
        <GridItem icon="television" label="cable tv" />
      </View>

      {/* House */}
      <Text style={styles.sectionTitle}>House Bills</Text>
      <View style={styles.row}>
        <GridItem icon="home" label="rent payment" />
        <GridItem icon="office-building" label="apartments" />
        <GridItem icon="bank" label="municipal taxes" />
      </View></View>
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg,
    
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 6,
  },
  banner: {
    backgroundColor: Colors.secndory,
    borderRadius: 16,
    borderWidth:1,
    borderColor:Colors.white,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  bannerText: {
    fontSize: 13,
    color: "#444",
  },
  postpe: {
    fontSize: 24,
    fontWeight: "bold",
    color:Colors.accent,
    marginTop: 6,
  },
  bannerImage: {
    width: 80,
    height: 80,
    resizeMode: "contain",
   
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "500",
    color:Colors.accent,
    marginTop: 10,
    marginBottom:5
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  grid: {
    flexDirection: "row",
    
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  gridItem: {
    width: "31%",
    height:68,
    backgroundColor: Colors.secndory,
    paddingTop: 10,
    paddingBottom:5,
    borderRadius: 14,
    borderWidth:1,
    borderColor:Colors.white,
    alignItems: "center",
    marginBottom: 12,
    elevation: 2,
  },
  gridText: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
  },
});
