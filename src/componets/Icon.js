import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import Colors from "../constants/Colors";

export default function Icon({ title, onPress }) {
  return (
  <TouchableOpacity>
  <LinearGradient
    colors={["#2563eb", "#9333ea"]}
    style={styles.gradientBtn}
  >
    <Icon name="swap-horizontal" size={26} color="#fff" />
  </LinearGradient>
</TouchableOpacity>
  );
}
const styles = StyleSheet.create({
  gradientBtn:{
    height:55,
    width:55,
    borderRadius:14,
    alignItems:"center",
    justifyContent:"center",
  }
});

