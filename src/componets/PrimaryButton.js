import React from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import Colors from "../constants/Colors";

export default function PrimaryButton({ title, onPress }) {
  return (
   <TouchableOpacity style={styles.saveBtn} onPress={() => navigation.goBack()}>
                               <Text style={styles.saveText}>Save</Text>
                           </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
   saveBtn: {     
        paddingVertical: 12,
        borderRadius: 35,
        marginRight: 10,
        borderWidth:.5,
        elevation: 5, borderColor: Colors.white,
        shadowOpacity: 0.25,
        shadowRadius: 6,
        backgroundColor: Colors.accent,
        alignItems: "center",
    },
    saveText: {
        color: Colors.white,
        fontWeight: "700",
        fontSize: 16,
    },
});
