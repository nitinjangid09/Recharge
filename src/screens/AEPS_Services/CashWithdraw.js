import React, { useState, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  FlatList,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import DropDownPicker from "react-native-dropdown-picker";
import Colors from "../../utils/Color";
import { fadeIn, slideUp, buttonPress } from "../../utils/ScreenAnimations";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

const CashWithdraw = () => {
  const navigation = useNavigation();

  // States for inputs
  const [mobileNumber, setMobileNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");
  const [amount, setAmount] = useState("");

  // Dropdown states: Bank
  const [bankOpen, setBankOpen] = useState(false);
  const [bank, setBank] = useState(null);
  const [bankItems, setBankItems] = useState([
    { label: "State Bank of India", value: "SBI" },
    { label: "HDFC Bank", value: "HDFC" },
    { label: "ICICI Bank", value: "ICICI" },
    { label: "Axis Bank", value: "AXIS" },
    { label: "Punjab National Bank", value: "PNB" },
  ]);

  // Dropdown states: Device
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [device, setDevice] = useState(null);
  const [deviceItems, setDeviceItems] = useState([
    { label: "Mantra MFS100", value: "MANTRA" },
    { label: "Morpho MSO 1300", value: "MORPHO" },
    { label: "Startek FM220", value: "STARTEK" },
  ]);

  // Ensure only one dropdown is open at a time
  const onBankOpen = () => setDeviceOpen(false);
  const onDeviceOpen = () => setBankOpen(false);

  // Animations refs
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(40)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;

  const fieldOpacity = useMemo(
    () => Array.from({ length: 6 }, () => new Animated.Value(0)),
    []
  );
  const fieldTranslate = useMemo(
    () => Array.from({ length: 6 }, () => new Animated.Value(25)),
    []
  );

  useEffect(() => {
    Animated.parallel([fadeIn(headerOpacity, 600), slideUp(headerTranslate, 600)]).start();
    Animated.stagger(
      120,
      fieldOpacity.map((_, i) =>
        Animated.parallel([fadeIn(fieldOpacity[i], 500), slideUp(fieldTranslate[i], 500)])
      )
    ).start();
  }, []);

  // Validation and submit handler
  const handleSubmit = () => {
    if (mobileNumber.length !== 10) return Alert.alert("Error", "Enter valid mobile number");
    if (aadhaarNumber.length !== 12) return Alert.alert("Error", "Enter valid Aadhaar number");
    if (!amount || Number(amount) <= 0) return Alert.alert("Error", "Enter valid amount");
    if (!bank || !device) return Alert.alert("Error", "Please select bank and device");

    buttonPress(buttonScale).start(() => {
      navigation.navigate("PaymentReceipt", { mobileNumber, aadhaarNumber, amount, bank, device });
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <Animated.View
          style={[styles.header, { opacity: headerOpacity, transform: [{ translateY: headerTranslate }] }]}
        >
          <Text style={styles.headerTitle}>Cash Withdraw</Text>
          <Text style={styles.headerSub}>Cash withdraw safe & securely</Text>
        </Animated.View>

        {/* Form Fields */}
        <FlatList
          data={[]}
          keyExtractor={() => "key"}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          renderItem={null}
          ListHeaderComponent={
            <>
              {/* Mobile Number */}
              <Animated.View style={{ opacity: fieldOpacity[0], transform: [{ translateY: fieldTranslate[0] }], zIndex: 6 }}>
                <Text style={styles.label}>Mobile Number</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  maxLength={10}
                  placeholderTextColor={"#000000"}
                  value={mobileNumber}
                  onChangeText={(t) => setMobileNumber(t.replace(/[^0-9]/g, ""))}
                  placeholder="Enter 10-digit mobile number"
                />
              </Animated.View>

              {/* Aadhaar Number */}
              <Animated.View style={{ opacity: fieldOpacity[1], transform: [{ translateY: fieldTranslate[1] }], zIndex: 5 }}>
                <Text style={styles.label}>Aadhaar Number</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  maxLength={12}
                  placeholderTextColor={"#000000"}

                  value={aadhaarNumber}
                  onChangeText={(t) => setAadhaarNumber(t.replace(/[^0-9]/g, ""))}
                  placeholder="Enter 12-digit Aadhaar number"
                />
              </Animated.View>

              {/* Amount */}
              <Animated.View style={{ opacity: fieldOpacity[2], transform: [{ translateY: fieldTranslate[2] }], zIndex: 4 }}>
                <Text style={styles.label}>Amount</Text>
                <TextInput
                  style={styles.input}
                  keyboardType="number-pad"
                  value={amount}
                  placeholderTextColor={"#000000"}

                  onChangeText={(t) => setAmount(t.replace(/[^0-9]/g, ""))}
                  placeholder="Enter withdrawal amount"
                />
              </Animated.View>

              {/* Bank Dropdown */}
              <View style={{ zIndex: 3000 }}>
                <Animated.View style={{ opacity: fieldOpacity[3], transform: [{ translateY: fieldTranslate[3] }] }}>
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
                    listMode="SCROLLVIEW"
                    dropDownMaxHeight={150} // scrollable height
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownContainer}
                  />
                </Animated.View>
              </View>

              {/* Device Dropdown */}
              <View style={{ zIndex: 2000 }}>
                <Animated.View style={{ opacity: fieldOpacity[4], transform: [{ translateY: fieldTranslate[4] }] }}>
                  <Text style={styles.label}>Select Device</Text>
                  <DropDownPicker
                    open={deviceOpen}
                    value={device}
                    items={deviceItems}
                    setOpen={setDeviceOpen}
                    setValue={setDevice}
                    setItems={setDeviceItems}
                    onOpen={onDeviceOpen}
                    placeholder="Select Device"
                    listMode="SCROLLVIEW"
                    dropDownMaxHeight={150} // scrollable height
                    style={styles.dropdown}
                    dropDownContainerStyle={styles.dropdownContainer}
                  />
                </Animated.View>
              </View>

              {/* Submit Button */}
              <Animated.View style={{ opacity: fieldOpacity[5], transform: [{ translateY: fieldTranslate[5] }, { scale: buttonScale }] }}>
                <TouchableOpacity style={styles.button} onPress={handleSubmit} activeOpacity={0.8}>
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primary
  },
  header: {
    height: isTablet ? 220 : 120,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20
  },
  headerTitle: {
    color: Colors.white,
    fontSize: isTablet ? 28 : 24,
    fontWeight: "700"
  },
  headerSub: {
    marginTop: 8,
    color: Colors.secondary,
    fontSize: 14,
    textAlign: "center"
  },
  content: {
    padding: 20,
    paddingTop: 28,
    paddingBottom: 40,
    backgroundColor: Colors.bg,
    flexGrow: 1
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
    marginBottom: 6,
    marginLeft: 4
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 14,
    color: Colors.black,
    marginBottom: 18,
    backgroundColor: Colors.white
  },
  dropdown: {
    borderColor: Colors.lightGray,
    borderRadius: 14,
    marginBottom: 18,
    backgroundColor: Colors.white,
    minHeight: 50
  },
  dropdownContainer: {
    borderColor: "#e6e6e6",
    borderRadius: 14
  },
  button: {
    backgroundColor: Colors.accent,
    paddingVertical: isTablet ? 18 : 14,
    borderRadius: 16, alignItems: "center",
    marginTop: 14,
    elevation: 2
  },
  buttonText: {
    color: Colors.white,
    fontSize: isTablet ? 18 : 16,
    fontWeight: "600",
    letterSpacing: 0.4
  },
});

export default CashWithdraw;