import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  PixelRatio,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { launchImageLibrary } from "react-native-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchUserProfile } from "../../api/AuthApi";
import Colors from "../../constants/Colors";
import Fonts from "../../constants/Fonts";
import HeaderBar from "../../componets/HeaderBar/HeaderBar";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: W } = Dimensions.get("window");
const S = (n) => Math.round(PixelRatio.roundToNearestPixel(n * (W / 375)));

const InputBox = ({
  label,
  value,
  setValue,
  icon,
  keyboardType,
  placeholder,
  editable = false,
}) => {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.boxLabel}>{label}</Text>

      <View
        pointerEvents={editable ? "auto" : "none"}
        style={[
          styles.inputContainer,
          !editable && styles.disabledBox,
        ]}
      >
        <TextInput
          value={value}
          keyboardType={keyboardType || "default"}
          placeholder={placeholder}
          placeholderTextColor="#9BA3AF"
          editable={editable}
          selectTextOnFocus={editable}
          onChangeText={editable ? setValue : () => { }}
          style={[
            styles.boxInput,
            !editable && styles.disabledText,
          ]}
        />

        <MaterialCommunityIcons
          name={icon}
          size={S(18)}
          color="#9BA3AF"
          style={styles.inputIcon}
        />
      </View>
    </View>
  );
};


const EditProfileScreen = ({ navigation, route }) => {
  const profileData = route?.params?.profileData;

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [aadhar, setAadhar] = useState("");
  const [pan, setPan] = useState("");
  const [profilePic, setProfilePic] = useState("");

  const pickImage = () => {
    launchImageLibrary({ mediaType: "photo", quality: 0.7 }, (res) => {
      if (!res.didCancel && res.assets?.length) {
        setProfilePic(res.assets[0].uri);
      }
    });
  };

  const loadUserProfile = async () => {
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      if (!headerToken) return;

      const result = await fetchUserProfile({ headerToken });

      if (result?.success === true) {
        const d = result.data;
        setName(`${d.firstName || ""} ${d.lastName || ""}`.trim());
        setUsername(d.userName || "");
        setEmail(d.email || "");
        setPhone(d.phone || "");
        setAddress(d.personalAddress?.address || d.businessAddress?.address || "");
        setAadhar(d.aadharNumber || "");
        setPan(d.panNumber || "");
        setProfilePic(d.profilePic || "");
      }
    } catch (error) {
      console.log("Load profile error:", error);
    }
  };

  useEffect(() => {
    if (profileData) {
      setName(`${profileData.firstName || ""} ${profileData.lastName || ""}`.trim());
      setUsername(profileData.userName || "");
      setEmail(profileData.email || "");
      setPhone(profileData.phone || "");
    }
    loadUserProfile();
  }, [profileData]);

  const initial = name ? name.charAt(0).toUpperCase() : (username ? username.charAt(0).toUpperCase() : "U");

  return (
    <SafeAreaView style={styles.container}>
      {/* ── CUSTOM MINIMAL HEADER ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons name="chevron-left" size={S(22)} color="#111" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity style={styles.headerRightBtn}>
          <MaterialCommunityIcons name="content-save-outline" size={S(20)} color="#D4B06A" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.innerContainer}
        >
          {/* AVATAR SECTION — MATCHING SCREENSHOT */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarRingOuter}>
              <View style={styles.avatarRingInner}>
                {profilePic ? (
                  <Image source={{ uri: profilePic }} style={styles.avatarImg} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarInitial}>{initial}</Text>
                  </View>
                )}
                <TouchableOpacity style={styles.cameraBtn} onPress={pickImage}>
                  <MaterialCommunityIcons name="pencil" size={S(10)} color="#FFF" />
                </TouchableOpacity>
              </View>
            </View>
            <Text style={styles.tapToUpdate}>Tap to update photo</Text>
          </View>

          {/* FIELDS — MATCHING SCREENSHOT LOOK */}
          <View style={styles.formSection}>
            <InputBox
              label="Full Name"
              placeholder="Full name"
              value={name}
              setValue={setName}
              icon="account-outline"
              editable={true}
            />

            <InputBox
              label="Username"
              placeholder="Username"
              value={username}
              icon="lock-outline"
              editable={false}
            />

            <InputBox
              label="Email Address"
              placeholder="Email address"
              value={email}
              icon="email-outline"
              editable={true}
              setValue={setEmail}
            />

            <InputBox
              label="Phone Number"
              placeholder="Mobile number"
              value={phone}
              icon="phone-outline"
              editable={false}
            />

            <InputBox
              label="Address"
              placeholder="Address"
              value={address}
              icon="map-marker-outline"
              editable={true}
              setValue={setAddress}
            />

            <InputBox
              label="Aadhar Number"
              placeholder="Aadhar number"
              value={aadhar}
              icon="identifier"
              editable={false}
            />

            <InputBox
              label="PAN Number"
              placeholder="PAN number"
              value={pan}
              icon="file-document-outline"
              editable={false}
            />
          </View>

          <View style={{ height: S(40) }} />
        </ScrollView>

        {/* SAVE BUTTON — LARGE BLACK BUTTON */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} activeOpacity={0.85} onPress={() => navigation.goBack()}>
            <MaterialCommunityIcons name="content-save-outline" size={S(18)} color="#FFF" style={{ marginRight: S(8) }} />
            <Text style={styles.saveBtnText}>Save Changes</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

export default EditProfileScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: S(18),
    height: S(56),
    backgroundColor: "#FFF",
  },
  backBtn: {
    width: S(36),
    height: S(36),
    borderRadius: S(10),
    backgroundColor: "#F7F8F9",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: S(16),
    fontFamily: Fonts.Bold,
    color: "#111",
  },
  headerRightBtn: {
    width: S(36),
    height: S(36),
    borderRadius: S(10),
    backgroundColor: "#FFF9F0",
    alignItems: "center",
    justifyContent: "center",
  },
  innerContainer: {
    paddingBottom: S(20),
  },
  avatarSection: {
    alignItems: "center",
    marginTop: S(15),
    marginBottom: S(25),
  },
  avatarRingOuter: {
    width: S(96),
    height: S(96),
    borderRadius: S(48),
    borderWidth: 1.5,
    borderColor: "#D4B06A",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarRingInner: {
    width: S(84),
    height: S(84),
    borderRadius: S(42),
    backgroundColor: "#F7F8F9",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: S(42),
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: S(42),
    backgroundColor: "#FFF9F0",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: S(28),
    fontFamily: Fonts.Bold,
    color: "#D4B06A",
  },
  cameraBtn: {
    position: "absolute",
    bottom: S(0),
    right: S(-4),
    backgroundColor: "#D4B06A",
    width: S(20),
    height: S(20),
    borderRadius: S(10),
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  tapToUpdate: {
    fontSize: S(10),
    color: "#9CA3AF",
    marginTop: S(12),
    fontFamily: Fonts.Medium,
    letterSpacing: 0.2,
  },
  formSection: {
    width: "100%",
    paddingHorizontal: S(20),
  },
  fieldWrapper: {
    marginBottom: S(18),
  },
  boxLabel: {
    color: "#D4B06A",
    fontSize: S(10),
    fontFamily: Fonts.Bold,
    marginBottom: S(6),
    marginLeft: S(2),
    letterSpacing: 0.3,
  },
  inputContainer: {
    backgroundColor: "#F7F8F9",
    borderRadius: S(12),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: S(14),
    height: S(52),
  },
  boxInput: {
    flex: 1,
    fontSize: S(14),
    color: "#111827",
    fontFamily: Fonts.Bold,
  },
  inputIcon: {
    marginLeft: S(10),
    opacity: 0.5,
  },
  disabledBox: {
    opacity: 0.7,
  },
  disabledText: {
    color: "#6B7280",
  },
  footer: {
    paddingHorizontal: S(20),
    paddingBottom: Platform.OS === 'ios' ? S(30) : S(20),
    backgroundColor: "#FFFFFF",
  },
  saveBtn: {
    backgroundColor: "#111827",
    height: S(56),
    borderRadius: S(16),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: S(15),
    fontFamily: Fonts.Bold,
    letterSpacing: 0.3,
  },
});


