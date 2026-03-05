import React from "react";
import { TouchableOpacity, Text, View } from "react-native";
import styles from "./style"; // Ensure styles are defined for the button

const Button = ({ title, onPress }) => {
    return (
        <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button} onPress={onPress}>
                <Text style={styles.buttonText}>{title}</Text>
            </TouchableOpacity>
        </View>
    );
};

export default Button;