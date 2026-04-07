import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Picker } from "@react-native-picker/picker";
import Colors from "../../constants/Colors";

const AddBeneficiary = () => {
  const [relation, setRelation] = useState("");

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >

        {/* HEADER */}
        <View style={styles.header}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>SECURE DMT</Text>
          </View>

          <Text style={styles.title}>
            <Text style={styles.titleAccent}>Add</Text> Beneficiary
          </Text>

          <Text style={styles.subtitle}>
            Secure Domestic Money Transfer
          </Text>
        </View>

        {/* FORM CARD */}
        <View style={styles.card}>

          <SectionTitle title="BANK DETAILS" />

          <FormInput label="Bank Name" placeholder="Enter Bank Name" required />

          <FormInput
            label="Account Number"
            placeholder="Enter Account Number"
            keyboardType="numeric"
            required
          />

          <FormInput
            label="IFSC Code"
            placeholder="E.g. SBIN0001234"
            required
          />

          <SectionTitle title="ACCOUNT HOLDER" />

          <FormInput
            label="Account Holder Name"
            placeholder="Enter Name"
            required
          />

          {/* PIN + RELATION */}
          <View style={styles.row}>

            <View style={styles.half}>
              <FormInput
                label="Pin Code"
                placeholder="6-digit"
                keyboardType="numeric"
                optional
              />
            </View>

            <View style={styles.half}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Relation</Text>
                <Text style={styles.optional}>Optional</Text>
              </View>

              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={relation}
                  onValueChange={setRelation}
                >
                  <Picker.Item label="Select" value="" />
                  <Picker.Item label="Father" value="Father" />
                  <Picker.Item label="Mother" value="Mother" />
                  <Picker.Item label="Brother" value="Brother" />
                  <Picker.Item label="Sister" value="Sister" />
                </Picker>
              </View>
            </View>

          </View>

          <SectionTitle title="DATE OF BIRTH" />

          <Text style={styles.label}>Date of Birth</Text>

          {/* DOB INPUTS */}
          <View style={styles.dobRow}>
            <TextInput placeholder="DD" style={styles.dobInput} keyboardType="numeric" />
            <TextInput placeholder="MM" style={styles.dobInput} keyboardType="numeric" />
            <TextInput placeholder="YYYY" style={styles.dobInput} keyboardType="numeric" />
          </View>

          {/* BUTTON */}
          <TouchableOpacity style={styles.button}>
            <Text style={styles.buttonText}>Add Beneficiary</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default AddBeneficiary;

/* ---------- SECTION TITLE ---------- */

const SectionTitle = ({ title }) => (
  <View style={styles.section}>
    <Text style={styles.sectionText}>{title}</Text>
  </View>
);

/* ---------- INPUT COMPONENT ---------- */

const FormInput = ({
  label,
  placeholder,
  keyboardType = "default",
  required,
  optional,
}) => (
  <View style={styles.inputContainer}>

    <View style={styles.labelRow}>
      <Text style={styles.label}>{label}</Text>
      {required && <Text style={styles.required}>Required</Text>}
      {optional && <Text style={styles.optional}>Optional</Text>}
    </View>

    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor={Colors.text_placeholder}
      keyboardType={keyboardType}
    />
  </View>
);

/* ---------- STYLES ---------- */

const styles = StyleSheet.create({

  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary,
  },

  scrollContainer: {
    paddingBottom: 40,
  },

  /* HEADER */

  header: {
    padding: 20,
  },

  badge: {
    backgroundColor: Colors.accent + "18",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },

  badgeText: {
    color: Colors.accent,
    fontSize: 12,
    fontWeight: "600",
  },

  title: {
    color: Colors.white,
    fontSize: 26,
    fontWeight: "700",
  },

  titleAccent: {
    color: Colors.accent,
  },

  subtitle: {
    color: Colors.whiteOpacity_80,
    marginTop: 4,
    fontSize: 13,
  },

  /* CARD */

  card: {
    backgroundColor: Colors.bg,
    padding: 20,
  },

  /* SECTION */

  section: {
    marginTop: 20,
    marginBottom: 10,
  },

  sectionText: {
    fontSize: 12,
    color: Colors.text_placeholder,
    fontWeight: "700",
    letterSpacing: 1,
  },

  /* INPUT */

  inputContainer: {
    marginBottom: 16,
  },

  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },

  label: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.text_primary,
  },

  required: {
    fontSize: 11,
    color: Colors.accent,
  },

  optional: {
    fontSize: 11,
    color: Colors.text_placeholder,
  },

  input: {
    height: 50,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 15,
    fontSize: 14,
    elevation: 2,
  },

  /* PICKER */

  pickerContainer: {
    height: 50,
    backgroundColor: Colors.white,
    borderRadius: 14,
    justifyContent: "center",
    elevation: 2,
  },

  /* ROW */

  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  half: {
    width: "48%",
  },

  /* DOB */

  dobRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,   // gap added here
  },

  dobInput: {
    width: "30%",
    height: 50,
    backgroundColor: Colors.white,
    borderRadius: 14,
    textAlign: "center",
    fontSize: 14,
    elevation: 2,
  },

  /* BUTTON */

  button: {
    marginTop: 30,
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: "center",
  },

  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },

});