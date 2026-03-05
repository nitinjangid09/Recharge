import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  FlatList,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DropDownPicker from "react-native-dropdown-picker";
import Colors from "../../constants/Colors";
import { fadeIn, slideUp, buttonPress } from "../../utils/ScreenAnimations";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

const BalanceEnquiry = () => {
  const [mobileNumber, setMobileNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [errors, setErrors] = useState({});

  /* ================= Animations ================= */
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([fadeIn(fadeAnim), slideUp(slideAnim)]).start();
  }, []);

  /* ================= BANK ================= */
  const [bankOpen, setBankOpen] = useState(false);
  const [bank, setBank] = useState(null);
  const [bankItems, setBankItems] = useState([
    { label: "State Bank of India", value: "SBI" },
    { label: "HDFC Bank", value: "HDFC" },
    { label: "ICICI Bank", value: "ICICI" },
    { label: "Axis Bank", value: "AXIS" },
    { label: "Punjab National Bank", value: "PNB" },
  ]);

  /* ================= DEVICE ================= */
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [device, setDevice] = useState(null);
  const [deviceItems] = useState([
    { label: "Mantra MFS100", value: "MANTRA" },
    { label: "Morpho MSO 1300", value: "MORPHO" },
    { label: "Startek FM220", value: "STARTEK" },
  ]);

  const onBankOpen = () => setDeviceOpen(false);
  const onDeviceOpen = () => setBankOpen(false);

  /* ================= VALIDATION ================= */
  const validate = () => {
    let newErrors = {};
    if (!mobileNumber) newErrors.mobile = "Mobile number is required";
    else if (!/^[6-9]\d{9}$/.test(mobileNumber))
      newErrors.mobile = "Enter valid 10-digit mobile number starting with 6-9";

    if (!aadhaarNumber) newErrors.aadhaar = "Aadhaar number is required";
    else if (!/^\d{12}$/.test(aadhaarNumber))
      newErrors.aadhaar = "Aadhaar must be 12 digits";

    if (!bank) newErrors.bank = "Please select bank";
    if (!device) newErrors.device = "Please select device";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;
    buttonPress(buttonScale).start();
    console.log({ mobileNumber, aadhaarNumber, bank, device });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* HEADER */}
        <Animated.View
          style={[
            styles.header,
            { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Text style={styles.headerTitle}>Balance Enquiry</Text>
          <Text style={styles.headerSub}>Check customer balance securely</Text>
        </Animated.View>

        <FlatList
          data={[]}
          keyExtractor={() => "key"}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          renderItem={null}
          ListHeaderComponent={
            <>
              {/* Mobile */}
              <Text style={styles.label}>Mobile Number</Text>
              <TextInput
                style={[styles.input, errors.mobile && styles.errorInput]}
                placeholder="Enter 10-digit mobile number"
                keyboardType="number-pad"
                maxLength={10}
                placeholderTextColor={"#000000"}
                value={mobileNumber}
                onChangeText={(text) =>
                  setMobileNumber(text.replace(/[^0-9]/g, ""))
                }
              />
              {errors.mobile && (
                <Text style={styles.errorText}>{errors.mobile}</Text>
              )}

              {/* Aadhaar */}
              <Text style={styles.label}>Aadhaar Number</Text>
              <TextInput
                style={[styles.input, errors.aadhaar && styles.errorInput]}
                placeholder="Enter 12-digit Aadhaar number"
                keyboardType="number-pad"
                maxLength={12}
                placeholderTextColor={"#000000"}
                value={aadhaarNumber}
                onChangeText={(text) =>
                  setAadhaarNumber(text.replace(/[^0-9]/g, ""))
                }
              />
              {errors.aadhaar && (
                <Text style={styles.errorText}>{errors.aadhaar}</Text>
              )}

              {/* Bank */}
              <Text style={styles.label}>Select Bank</Text>
              <DropDownPicker
                open={bankOpen}
                value={bank}
                items={bankItems}
                setOpen={setBankOpen}
                setValue={setBank}
                setItems={setBankItems}
                onOpen={onBankOpen}
                placeholder="Select Bank"
                searchable
                searchPlaceholder="Search bank..."
                style={[styles.dropdown, errors.bank && styles.errorInput]}
                dropDownContainerStyle={styles.dropdownContainer}
                listItemContainerStyle={{ borderBottomColor: "#eee" }}
                textStyle={{ color: "#000" }}
                searchTextInputStyle={{
                  borderWidth: 0,
                  backgroundColor: "#fafafa",
                  color: "#000",
                }}
                searchContainerStyle={{ borderBottomWidth: 1, borderBottomColor: "#eee" }}
                zIndex={3000}
                zIndexInverse={1000}
              />
              {errors.bank && (
                <Text style={styles.errorText}>{errors.bank}</Text>
              )}

              {/* Device */}
              <Text style={styles.label}>Select Device</Text>
              <DropDownPicker
                open={deviceOpen}
                value={device}
                items={deviceItems}
                setOpen={setDeviceOpen}
                setValue={setDevice}
                onOpen={onDeviceOpen}
                placeholder="Select Device"
                style={[styles.dropdown, errors.device && styles.errorInput]}
                dropDownContainerStyle={styles.dropdownContainer}
                listItemContainerStyle={{ borderBottomColor: "#eee" }}
                textStyle={{ color: "#000" }}
                zIndex={2000}
                zIndexInverse={2000}
              />
              {errors.device && (
                <Text style={styles.errorText}>{errors.device}</Text>
              )}

              {/* Submit */}
              <Animated.View style={{ transform: [{ scale: buttonScale }] }}>
                <TouchableOpacity style={styles.button} onPress={handleSubmit}>
                  <Text style={styles.buttonText}>Submit</Text>
                </TouchableOpacity>
              </Animated.View>
            </>
          }
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default BalanceEnquiry;

/* ================= STYLES ================= */
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary
  },
  header: {
    height: isTablet ? 200 : 120,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: Colors.white,
    fontSize: isTablet ? 28 : 22,
    fontWeight: "700"
  },
  headerSub: {
    marginTop: 6,
    color: Colors.secondary,
    fontSize: 13
  },
  content: {
    flexGrow: 1,
    backgroundColor: Colors.bg,
    padding: 20,
    paddingBottom: 40
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
    marginBottom: 6
  },
  input: {
    borderWidth: 0, // No border
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: "#000",
    backgroundColor: "#fff",
    borderRadius: 14,
    marginBottom: 6,
  },
  dropdown: {
    borderWidth: 0, // Remove input border
    borderRadius: 14,
    minHeight: 50,
    marginBottom: 6,
    backgroundColor: "#fff",
  },
  dropdownContainer: {
    borderRadius: 14,
    borderWidth: 0,
    backgroundColor: "#fff",
  },
  button: {
    backgroundColor: Colors.accent,
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 20,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600"
  },
  errorText: {
    color: "#E53935",
    fontSize: 12,
    marginBottom: 12
  },
  errorInput: {
    borderColor: "#E53935"
  },
});