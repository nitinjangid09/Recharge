import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../constants/Colors";

const HeaderBar = ({ title, onBack, rightIcon, onRightPress }) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.container}>

        {/* Back Button */}
        <TouchableOpacity onPress={onBack} style={styles.iconBtn}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={26}
            color={Colors.finance_text}
          />
        </TouchableOpacity>

        {/* Title */}
        <Text style={styles.title}>{title}</Text>

        {/* Right Icon */}
        {rightIcon ? (
          <TouchableOpacity onPress={onRightPress} style={styles.iconBtn}>
            <MaterialCommunityIcons
              name={rightIcon}
              size={22}
              color={Colors.finance_text}
            />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 36 }} />   // keeps title centered
        )}

      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    width: "100%",
    alignItems: "center",

  },

  container: {
    width: "100%",
    backgroundColor: Colors.black, // Gold Background
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",

    elevation: 6,
    shadowColor: Colors.finance_accent,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },

  iconBtn: {
    width: 33,
    height: 33,
    borderRadius: 18,
    backgroundColor: Colors.finance_chip, // Light Beige
    alignItems: "center",
    justifyContent: "center",
    borderWidth: .5,
    elevation: 5,
    borderColor: Colors.finance_accent
  },

  title: {
    color: Colors.finance_text, // Dark Text
    fontSize: 16,
    fontWeight: "500",
    color: Colors.white,
  },
});

export default HeaderBar;
