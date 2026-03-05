import React from "react";
import { TouchableOpacity, View, Text } from "react-native";
import styles from "./styles";

const Button = () => {
    return (
        <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.button}>
                <Text style={styles.buttonText}>Add</Text>
            </TouchableOpacity>
        </View>
    );
};

export default Button;