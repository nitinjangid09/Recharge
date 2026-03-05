import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../../utils/Color";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

const AddBeneficiary = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.headerText}>Add Beneficiary</Text>
        </View>

        {/* FORM */}
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <FormInput label="Bank Name" placeholder="Enter bank name" />
          <FormInput
            label="Account Number"
            placeholder="Enter account number"
            keyboardType="numeric"
          />
          <FormInput
            label="IFSC Code"
            placeholder="Enter IFSC code"
            autoCapitalize="characters"
          />
          <FormInput
            label="Account Holder Name"
            placeholder="Enter account holder name"
          />
          <FormInput
            label="Pin Code"
            placeholder="Enter pin code"
            keyboardType="numeric"
          />
          <FormInput
            label="Date of Birth"
            placeholder="DD / MM / YYYY"
            keyboardType="numeric"
          />

          {/* BUTTON */}
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={() => navigation.navigate("Home")}
          >
            <Text style={styles.buttonText}>Add Beneficiary</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
};

export default AddBeneficiary;

/* -------------------- */
/* REUSABLE INPUT */
/* -------------------- */

const FormInput = ({
  label,
  placeholder,
  keyboardType = "default",
  autoCapitalize = "none",
}) => {
  return (
    <View style={styles.inputContainer}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={Colors.gray}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
      />
    </View>
  );
};

/* -------------------- */
/* STYLES */
/* -------------------- */

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary,
  },

  container: {
    flex: 1,
    backgroundColor: Colors.bg,
  },

  /* HEADER */
  header: {
    height: 56,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",

  },

  headerText: {
    color: Colors.white,
    fontSize: isTablet ? 22 : 18,
    fontWeight: "600",
  },

  /* FORM */
  form: {
    padding: 20,
    paddingBottom: 40,
  },

  inputContainer: {
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    color: Colors.black,
    marginBottom: 6,
    fontWeight: "500",
  },

  input: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.lightGray,
    paddingHorizontal: 14,
    backgroundColor: Colors.white,
    fontSize: 14,
    color: Colors.black,
  },

  /* BUTTON */
  button: {
    marginTop: 30,
    backgroundColor: Colors.accent,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },

  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
});
