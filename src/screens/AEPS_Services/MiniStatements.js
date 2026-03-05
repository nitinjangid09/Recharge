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
import DropDownPicker from "react-native-dropdown-picker";
import Colors from "../../utils/Color";
import { fadeIn, slideUp, buttonPress } from "../../utils/ScreenAnimations";

const { width } = Dimensions.get("window");
const isTablet = width >= 768;

const MiniStatement = () => {
  const [mobileNumber, setMobileNumber] = useState("");
  const [aadhaarNumber, setAadhaarNumber] = useState("");

  /* BANK */
  const [bankOpen, setBankOpen] = useState(false);
  const [bank, setBank] = useState(null);
  const [bankItems, setBankItems] = useState([
    { label: "State Bank of India", value: "SBI" },
    { label: "HDFC Bank", value: "HDFC" },
    { label: "ICICI Bank", value: "ICICI" },
    { label: "Axis Bank", value: "AXIS" },
    { label: "Punjab National Bank", value: "PNB" },
  ]);

  /* DEVICE */
  const [deviceOpen, setDeviceOpen] = useState(false);
  const [device, setDevice] = useState(null);
  const [deviceItems, setDeviceItems] = useState([
    { label: "Mantra MFS100", value: "MANTRA" },
    { label: "Morpho MSO 1300", value: "MORPHO" },
    { label: "Startek FM220", value: "STARTEK" },
  ]);

  const onBankOpen = () => setDeviceOpen(false);
  const onDeviceOpen = () => setBankOpen(false);

  /* ANIMATIONS */
  // 6 animated fields: mobile, aadhaar, bank, device, submit button, and header
  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(40)).current;

  const fieldOpacity = useMemo(
    () => Array.from({ length: 5 }, () => new Animated.Value(0)),
    []
  );
  const fieldTranslate = useMemo(
    () => Array.from({ length: 5 }, () => new Animated.Value(25)),
    []
  );

  const buttonScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Animate header first
    Animated.parallel([fadeIn(headerOpacity, 600), slideUp(headerTranslate, 600)]).start();

    // Animate fields staggered after header animation
    Animated.stagger(
      120,
      fieldOpacity.map((_, i) =>
        Animated.parallel([fadeIn(fieldOpacity[i], 500), slideUp(fieldTranslate[i], 500)])
      )
    ).start();
  }, []);

  const handleSubmit = () => {
    if (mobileNumber.length !== 10) {
      return Alert.alert("Error", "Enter valid mobile number");
    }
    if (aadhaarNumber.length !== 12) {
      return Alert.alert("Error", "Enter valid Aadhaar number");
    }
    if (!bank || !device) {
      return Alert.alert("Error", "Please select bank and device");
    }

    buttonPress(buttonScale).start(() => {
      console.log({ mobileNumber, aadhaarNumber, bank, device });
      // Add navigation or API call here after animation if needed
    });
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* HEADER */}
        <Animated.View
          style={[
            styles.header,
            {
              opacity: headerOpacity,
              transform: [{ translateY: headerTranslate }],
            },
          ]}
        >
          <Text style={styles.headerTitle}>Mini Statement</Text>
          <Text style={styles.headerSub}>Check customer statement safe & securely</Text>
        </Animated.View>

        {/* Using FlatList as scroll container */}
        <FlatList
          data={[]}
          keyExtractor={() => "key"}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
          renderItem={null}
          ListHeaderComponent={
            <>
              {/* Mobile Number */}
              <Animated.View
                style={{
                  opacity: fieldOpacity[0],
                  transform: [{ translateY: fieldTranslate[0] }],
                  zIndex: 6,
                }}
              >
                <Text style={styles.label}>Mobile Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Mobile Number"
                  keyboardType="number-pad"
                  maxLength={10}
                  placeholderTextColor={"#000000"}

                  value={mobileNumber}
                  onChangeText={setMobileNumber}
                />
              </Animated.View>

              {/* Aadhaar Number */}
              <Animated.View
                style={{
                  opacity: fieldOpacity[1],
                  transform: [{ translateY: fieldTranslate[1] }],
                  zIndex: 5,
                }}
              >
                <Text style={styles.label}>Aadhaar Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Aadhaar Number"
                  keyboardType="number-pad"
                  maxLength={12}
                  placeholderTextColor={"#000000"}

                  value={aadhaarNumber}
                  onChangeText={setAadhaarNumber}
                />
              </Animated.View>

              {/* Bank Dropdown */}
              <Animated.View
                style={{
                  opacity: fieldOpacity[2],
                  transform: [{ translateY: fieldTranslate[2] }],
                  zIndex: 3000,
                }}
              >
                <Text style={styles.label}>Bank</Text>
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
                  searchTextInputStyle={{
                    borderWidth: 1,
                    borderColor: Colors.lightGray,
                    borderRadius: 10,
                  }}
                  style={styles.dropdown}
                  dropDownContainerStyle={styles.dropdownContainer}
                  zIndex={3000}
                  zIndexInverse={1000}
                />
              </Animated.View>

              {/* Device Dropdown */}
              <Animated.View
                style={{
                  opacity: fieldOpacity[3],
                  transform: [{ translateY: fieldTranslate[3] }],
                  zIndex: 2000,
                }}
              >
                <Text style={styles.label}>Device</Text>
                <DropDownPicker
                  open={deviceOpen}
                  value={device}
                  items={deviceItems}
                  setOpen={setDeviceOpen}
                  setValue={setDevice}
                  setItems={setDeviceItems}
                  onOpen={onDeviceOpen}
                  placeholder="Select Device"
                  style={styles.dropdown}
                  dropDownContainerStyle={styles.dropdownContainer}
                  zIndex={2000}
                  zIndexInverse={2000}
                />
              </Animated.View>

              {/* Submit Button */}
              <Animated.View
                style={{
                  opacity: fieldOpacity[4],
                  transform: [{ translateY: fieldTranslate[4] }, { scale: buttonScale }],
                  zIndex: 1,
                }}
              >
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

export default MiniStatement;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

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
    height: isTablet ? 220 : 120,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    borderBottomLeftRadius: 22,
    borderBottomRightRadius: 22,
  },

  headerTitle: {
    color: Colors.white,
    fontSize: isTablet ? 28 : 24,
    fontWeight: "700",
  },

  headerSub: {
    marginTop: 8,
    color: Colors.secondary,
    fontSize: 14,
    textAlign: "center",
  },

  /* CONTENT */
  content: {
    padding: 20,
    paddingTop: 28,
    paddingBottom: 40,
    backgroundColor: Colors.bg,
    flexGrow: 1,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
    marginBottom: 6,
    marginLeft: 4,
  },

  /* INPUT */
  input: {
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 14,
    color: Colors.black,
    marginBottom: 18,
    backgroundColor: Colors.white,
  },

  /* DROPDOWN */
  dropdown: {
    borderWidth: 1,
    borderColor: Colors.lightGray,
    borderRadius: 14,
    marginBottom: 18,
    backgroundColor: Colors.white,
    minHeight: 50,
  },

  dropdownContainer: {
    borderColor: Colors.lightGray,
    borderRadius: 14,
  },

  /* BUTTON */
  button: {
    backgroundColor: Colors.accent,
    paddingVertical: isTablet ? 18 : 14,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 14,
    elevation: 2,
  },

  buttonText: {
    color: Colors.white,
    fontSize: isTablet ? 18 : 16,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
});