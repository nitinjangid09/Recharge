import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Modal,
  FlatList,
  Dimensions,
  Platform,
  ActivityIndicator,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import { fetchGlobalBankList, addDmtBeneficiary } from "../../../api/AuthApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation, useRoute } from "@react-navigation/native";
import { AlertService } from "../../../componets/Alerts/CustomAlert";
import Colors from "../../../constants/Colors";
import Fonts from "../../../constants/Fonts";


// ─── Responsive Scaling ───────────────────────────────────────────────────────
const { width: SW, height: SH } = Dimensions.get("window");
const BASE_W = 390;
const BASE_H = 844;
const scale = (s) => Math.round((SW / BASE_W) * s);
const vs = (s) => Math.round((SH / BASE_H) * s);
const rs = (s) => Math.round(Math.sqrt((SW * SH) / (BASE_W * BASE_H)) * s);

// ══════════════════════════════════════════════════════════════════════════════
//  CUSTOM SELECT PICKER  (Modal bottom-sheet)
// ══════════════════════════════════════════════════════════════════════════════
const SelectPicker = ({
  label, required, placeholder, items, value, onChange,
  error, searchable = false,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = items.find((i) => i.value === value);
  const filtered = searchable
    ? items.filter((i) => i.label.toLowerCase().includes(search.toLowerCase()))
    : items;

  const handleOpen = () => { setSearch(""); setOpen(true); };
  const handleClose = () => setOpen(false);
  const handleSelect = (item) => { onChange(item.value); handleClose(); };

  return (
    <View style={sp.wrap}>
      {/* Label */}
      <Text style={sp.labelText}>
        {required && <Text style={sp.required}>* </Text>}
        {label}
      </Text>

      {/* Trigger */}
      <TouchableOpacity
        style={[sp.trigger, error && sp.triggerError]}
        onPress={handleOpen}
        activeOpacity={0.8}
      >
        <View style={sp.triggerLeft}>
          {selected ? (
            <>
              <Text style={sp.triggerIcon}>{selected.icon}</Text>
              <Text style={sp.triggerValue}>{selected.label}</Text>
            </>
          ) : (
            <Text style={sp.triggerPlaceholder}>{placeholder}</Text>
          )}
        </View>

        <Icon
          name={open ? "chevron-up" : "chevron-down"}
          size={rs(20)}
          color={open ? Colors.kyc_accent : Colors.gray}
        />
      </TouchableOpacity>

      {/* Error */}
      {error && <Text style={sp.errorTxt}>{error}</Text>}

      {/* Bottom-sheet modal */}
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={handleClose}
      >
        <TouchableOpacity
          style={sp.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={sp.sheet}>
          <View style={sp.sheetHeader}>
            <View style={sp.handleBar} />
            <View style={sp.sheetTitleRow}>
              <Text style={sp.sheetTitle}>{label}</Text>
              <TouchableOpacity onPress={handleClose} style={sp.closeBtn}>
                <Text style={sp.closeBtnTxt}>✕</Text>
              </TouchableOpacity>
            </View>

            {searchable && (
              <View style={sp.searchRow}>
                <Text style={sp.searchIcon}>🔍</Text>
                <TextInput
                  style={sp.searchInput}
                  placeholder={`Search ${label.toLowerCase()}...`}
                  placeholderTextColor={Colors.gray}
                  value={search}
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <Text style={sp.searchClear}>✕</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item, index) => index.toString()}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: vs(20) }}
            renderItem={({ item }) => {
              const isSel = item.value === value;
              return (
                <TouchableOpacity
                  style={[sp.listItem, isSel && sp.listItemSel]}
                  onPress={() => handleSelect(item)}
                  activeOpacity={0.75}
                >
                  <View style={[sp.listIconBox, isSel && sp.listIconBoxSel]}>
                    <Text style={sp.listIcon}>{item.icon}</Text>
                  </View>
                  <Text style={[sp.listTxt, isSel && sp.listTxtSel]}>
                    {item.label}
                  </Text>
                  {isSel && (
                    <View style={sp.checkCircle}>
                      <Text style={sp.checkMark}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
            ListEmptyComponent={
              <View style={sp.emptyWrap}>
                <Text style={sp.emptyTxt}>No results found</Text>
              </View>
            }
          />
        </View>
      </Modal>
    </View>
  );
};

const AddBeneficiary = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const senderMobile = route.params?.senderMobile || "";

  const [formData, setFormData] = useState({
    bankName: "",
    accountNumber: "",
    ifscCode: "",
    holderName: "",
    mobileNumber: "",
  });

  const [banks, setBanks] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    getBankList();
  }, []);

  const getBankList = async () => {
    setLoadingBanks(true);
    try {
      const token = await AsyncStorage.getItem("header_token");
      const res = await fetchGlobalBankList({ headerToken: token });
      if (res?.success && Array.isArray(res?.data)) {
        const mapped = res.data.map((b) => ({
          label: b.bankName,
          value: b.bankName,
          icon: "🏦",
        }));
        setBanks(mapped.sort((a, b) => a.label.localeCompare(b.label)));
      }
    } catch (err) {
      console.log("Error fetching banks:", err);
    } finally {
      setLoadingBanks(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
  };

  const validate = () => {
    let newErrors = {};

    if (!formData.bankName.trim()) newErrors.bankName = "Bank Name is required";
    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = "Account Number is required";
    } else if (formData.accountNumber.length < 9 || formData.accountNumber.length > 18) {
      newErrors.accountNumber = "Account Number must be 9-18 digits";
    }

    if (!formData.ifscCode.trim()) {
      newErrors.ifscCode = "IFSC Code is required";
    } else if (formData.ifscCode.length !== 11) {
      newErrors.ifscCode = "IFSC Code must be 11 characters";
    } else if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(formData.ifscCode)) {
      newErrors.ifscCode = "Invalid IFSC Code (e.g. SBIN0001234)";
    }

    if (!formData.holderName.trim()) {
      newErrors.holderName = "Account Holder Name is required";
    }
    const mobileRegex = /^[6-9][0-9]{9}$/;
    if (!formData.mobileNumber.trim()) {
      newErrors.mobileNumber = "Mobile Number is required";
    } else if (!mobileRegex.test(formData.mobileNumber)) {
      newErrors.mobileNumber = "Enter a valid 10-digit mobile number";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAddBeneficiary = async () => {
    if (!validate()) return;

    setSubmitting(true);
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      let activeSenderMobile = senderMobile;
      if (!activeSenderMobile) {
        activeSenderMobile = await AsyncStorage.getItem("sender_mobile");
      }

      if (!activeSenderMobile) {
        setSubmitting(false);
        AlertService.showAlert({
          type: "error",
          title: "Session Expired",
          message: "Unable to identify sender mobile. Please login again."
        });
        return;
      }

      const idempotencyKey = `ADD_BEN_${Date.now()}`;

      const res = await addDmtBeneficiary({
        data: {
          accountHolderName: formData.holderName,
          accountNumber: formData.accountNumber,
          ifsc: formData.ifscCode,
          bankName: formData.bankName,
          mobile: activeSenderMobile,
          beneficiaryMobile: formData.mobileNumber,
        },
        headerToken,
        idempotencyKey
      });

      if (
        res.success ||
        res.status === "SUCCESS" ||
        res.message?.toLowerCase().includes("added")
      ) {
        AlertService.showAlert({
          type: "success",
          title: "Success",
          message: res.message || "Beneficiary added successfully",
          onClose: () => navigation.goBack()
        });
      } else {
        AlertService.showAlert({
          type: "error",
          title: "Failed",
          message: res.message || "Unable to add beneficiary"
        });
      }
    } catch (err) {
      console.log("Add Beneficiary Error:", err);
      AlertService.showAlert({
        type: "error",
        title: "Error",
        message: "Something went wrong. Please try again."
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>SECURE DMT</Text>
        </View>

        <Text style={styles.title}>
          <Text style={styles.titleAccent}>Add</Text> Beneficiary
        </Text>

        <Text style={styles.subtitle}>Secure Domestic Money Transfer</Text>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollBody}
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >


        {/* FORM CARD */}
        <View style={styles.card}>
          <SectionTitle title="BANK DETAILS" />

          <SelectPicker
            label="Bank Name"
            placeholder={loadingBanks ? "Loading Banks..." : "Select Bank"}
            required
            items={banks}
            value={formData.bankName}
            onChange={(v) => handleInputChange("bankName", v)}
            error={errors.bankName}
            searchable
          />

          <FormInput
            label="Account Number"
            placeholder="Enter Account Number"
            keyboardType="numeric"
            maxLength={18}
            required
            value={formData.accountNumber}
            onChangeText={(t) => handleInputChange("accountNumber", t.replace(/\D/g, ""))}
            error={errors.accountNumber}
          />

          <FormInput
            label="IFSC Code"
            placeholder="E.g. SBIN0001234"
            autoCapitalize="characters"
            maxLength={11}
            required
            value={formData.ifscCode}
            onChangeText={(t) => handleInputChange("ifscCode", t.toUpperCase())}
            error={errors.ifscCode}
          />

          <SectionTitle title="ACCOUNT HOLDER" />

          <FormInput
            label="Account Holder Name"
            placeholder="Enter Name"
            required
            value={formData.holderName}
            onChangeText={(t) => handleInputChange("holderName", t)}
            error={errors.holderName}
          />

          <FormInput
            label="Mobile Number"
            placeholder="Enter 10-digit mobile"
            keyboardType="numeric"
            maxLength={10}
            required
            value={formData.mobileNumber}
            onChangeText={(t) => handleInputChange("mobileNumber", t.replace(/\D/g, ""))}
            error={errors.mobileNumber}
          />

          {/* BUTTON */}
          {(() => {
            const allFilled = !!formData.bankName && !!formData.accountNumber && !!formData.ifscCode && !!formData.holderName && !!formData.mobileNumber && !submitting;
            return (
              <TouchableOpacity
                style={[styles.button, { backgroundColor: allFilled ? Colors.primary : Colors.gold }]}
                onPress={handleAddBeneficiary}
                disabled={!allFilled}
              >
                {submitting ? (
                  <ActivityIndicator color={Colors.white} />
                ) : (
                  <Text style={[styles.buttonText, { color: allFilled ? Colors.white : Colors.slate_500 }]}>Add Beneficiary</Text>
                )}
              </TouchableOpacity>
            );
          })()}
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
  value,
  onChangeText,
  error,
  ...props
}) => (
  <View style={styles.inputContainer}>
    <View style={styles.labelRow}>
      <Text style={styles.label}>{label}</Text>
      {required && <Text style={styles.required}>Required</Text>}
      {optional && <Text style={styles.optional}>Optional</Text>}
    </View>

    <TextInput
      style={[styles.input, error && styles.inputError]}
      placeholder={placeholder}
      placeholderTextColor={Colors.gray}
      keyboardType={keyboardType}
      value={value}
      onChangeText={onChangeText}
      {...props}
    />
    {error && <Text style={styles.errorText}>{error}</Text>}
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
    flexGrow: 1,
  },

  scrollBody: {
    flex: 1,
    backgroundColor: Colors.beige,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: "hidden",
  },

  /* HEADER */

  header: {
    padding: 20,
  },

  badge: {
    backgroundColor: Colors.kyc_accent + "18",
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 10,
  },

  badgeText: {
    color: Colors.kyc_accent,
    fontSize: 12,
    fontWeight: "600",
  },

  title: {
    color: Colors.white,
    fontSize: 26,
    fontWeight: "700",
  },

  titleAccent: {
    color: Colors.kyc_accent,
  },

  subtitle: {
    color: "rgba(255,255,255,0.80)",
    marginTop: 4,
    fontSize: 13,
  },

  /* CARD */

  card: {
    backgroundColor: Colors.beige,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(245,158,11,0.30)",
    borderRadius: 20,
    margin: 16,
  },

  /* SECTION */

  section: {
    marginTop: 20,
    marginBottom: 10,
  },

  sectionText: {
    fontSize: 12,
    color: Colors.gray,
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
    color: Colors.black,
  },

  required: {
    fontSize: 11,
    color: Colors.kyc_accent,
  },

  optional: {
    fontSize: 11,
    color: Colors.gray,
  },

  input: {
    height: 50,
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingHorizontal: 15,
    fontSize: 14,
    borderWidth: 1,
    borderColor: "transparent",
  },

  inputError: {
    borderColor: Colors.red,
    borderWidth: 1,
  },

  errorText: {
    color: Colors.red,
    fontSize: 11,
    marginTop: 4,
    fontWeight: "600",
  },

  /* PICKER */
  pickerContainer: {
    height: 50,
    backgroundColor: Colors.white,
    borderRadius: 14,
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  /* BUTTON */

  button: {
    marginTop: 30,
    borderRadius: 30,
    paddingVertical: 16,
    alignItems: "center",
  },
  buttonDisabled: {
    backgroundColor: Colors.gold,
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },
});

// ══════════════════════════════════════════════════════════════════════════════
//  SELECT PICKER STYLES
// ══════════════════════════════════════════════════════════════════════════════
const sp = StyleSheet.create({
  wrap: { marginBottom: vs(16) },

  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  labelText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.black,
    marginBottom: vs(6),
  },
  required: { color: Colors.kyc_accent },

  // Trigger
  trigger: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: Colors.white,
    borderRadius: scale(14),
    borderWidth: 1, borderColor: "transparent",
    paddingHorizontal: scale(15),
    minHeight: vs(50),
  },
  triggerError: { borderColor: Colors.red, borderWidth: 1 },
  triggerLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  triggerIcon: { fontSize: rs(18), marginRight: scale(8) },
  triggerValue: { fontFamily: Fonts.Bold, fontSize: rs(14), color: Colors.heroEnd, fontWeight: "600" },
  triggerPlaceholder: { fontFamily: Fonts.Medium, fontSize: rs(14), color: Colors.gray },

  errorTxt: { fontFamily: Fonts.Light, color: Colors.red, fontSize: rs(10.5), marginTop: vs(4), fontWeight: "300" },

  // Backdrop
  backdrop: {
    position: "absolute", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
  },

  // Sheet
  sheet: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.white,
    borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24),
    maxHeight: SH * 0.68,
  },

  sheetHeader: {
    paddingHorizontal: scale(16),
    paddingBottom: vs(10),
    borderBottomWidth: 1, borderBottomColor: "rgb(240, 240, 240)",
  },
  handleBar: {
    width: scale(40), height: vs(4), borderRadius: scale(2),
    backgroundColor: Colors.kyc_border, alignSelf: "center",
    marginTop: vs(10), marginBottom: vs(14),
  },
  sheetTitleRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: vs(12),
  },
  sheetTitle: { fontFamily: Fonts.Bold, fontSize: rs(16), fontWeight: "800", color: Colors.primary },
  closeBtn: {
    width: scale(28), height: scale(28), borderRadius: scale(14),
    backgroundColor: "rgb(244, 244, 244)", alignItems: "center", justifyContent: "center",
  },
  closeBtnTxt: { fontFamily: Fonts.Bold, color: "rgb(102, 102, 102)", fontSize: rs(12), fontWeight: "800" },

  // Search
  searchRow: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: Colors.bg_F8, borderRadius: scale(10),
    paddingHorizontal: scale(10), marginBottom: vs(4),
    minHeight: vs(42),
  },
  searchIcon: { fontSize: rs(15), marginRight: scale(6) },
  searchInput: { fontFamily: Fonts.Medium, flex: 1, fontSize: rs(14), color: Colors.heroEnd, padding: 0 },
  searchClear: { fontFamily: Fonts.Bold, color: Colors.gray, fontSize: rs(14), fontWeight: "700" },

  // List
  listItem: {
    flexDirection: "row", alignItems: "center",
    paddingHorizontal: scale(16), paddingVertical: vs(13),
    borderBottomWidth: 1, borderBottomColor: Colors.bg_F8,
    gap: scale(12),
  },
  listItemSel: { backgroundColor: Colors.kyc_accent + "08" },

  listIconBox: {
    width: scale(36), height: scale(36), borderRadius: scale(10),
    backgroundColor: Colors.bg_F8, alignItems: "center", justifyContent: "center",
  },
  listIconBoxSel: { backgroundColor: Colors.kyc_accent + "18" },
  listIcon: { fontSize: rs(18) },

  listTxt: { fontFamily: Fonts.Medium, flex: 1, fontSize: rs(14), color: Colors.heroEnd, fontWeight: "500" },
  listTxtSel: { fontFamily: Fonts.Bold, color: Colors.kyc_accent, fontWeight: "700" },

  checkCircle: {
    width: scale(22), height: scale(22), borderRadius: scale(11),
    backgroundColor: Colors.kyc_accent, alignItems: "center", justifyContent: "center",
  },
  checkMark: { fontFamily: Fonts.Bold, color: Colors.white, fontSize: rs(12), fontWeight: "900" },

  emptyWrap: { alignItems: "center", paddingVertical: vs(30) },
  emptyTxt: { fontFamily: Fonts.Regular, color: Colors.gray, fontSize: rs(14) },
});
