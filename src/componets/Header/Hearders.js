import React from "react";
import { View, StyleSheet, Text, TouchableOpacity, Image } from "react-native";
import { useNavigation } from "@react-navigation/native";

const Header = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* Back Button */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.iconWrapper}>
        <Image source={require("../../assets/back.png")} style={styles.icon} />
      </TouchableOpacity>

      {/* Header Text */}
      <Text style={styles.headerText}>Recharge</Text>
    </View>
  );
};

export default Header;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    height: 60,
    backgroundColor:"white"
    
  },
  headerText: {
    fontSize: 18,
    fontWeight: "bold",
    left:"29%"
  },
  iconWrapper: {
    padding: 10,
  },
  icon: {
    height: 20,
    width: 20,
    resizeMode: "contain",
  },
});