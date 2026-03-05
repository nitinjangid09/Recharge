// src/screens/AuthChoice.js
import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

export default function AuthChoice({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>B2B APP</Text>
      <Text style={styles.subtitle}>
        Fast • Secure • Reliable
      </Text>

      {/* LOGIN */}
      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate("Login")}
      >
        <Text style={styles.primaryText}>LOGIN</Text>
      </TouchableOpacity>

      {/* SIGNUP */}
      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => navigation.navigate("Signup")}
      >
        <Text style={styles.secondaryText}>CREATE NEW ACCOUNT</Text>
      </TouchableOpacity>

      
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    padding: 24,
  },
  logo: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#1e88e5",
  },
  subtitle: {
    textAlign: "center",
    color: "#777",
    marginBottom: 40,
    fontSize: 14,
  },
  primaryButton: {
    backgroundColor: "#1e88e5",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 15,
  },
  primaryText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: "#1e88e5",
    paddingVertical: 16,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 25,
  },
  secondaryText: {
    color: "#1e88e5",
    fontSize: 16,
    fontWeight: "bold",
  },
  linkText: {
    textAlign: "center",
    color: "#444",
    fontSize: 14,
    textDecorationLine: "underline",
  },
});
