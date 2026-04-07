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
      <HeaderBar title="Edit Profile" onBack={() => navigation.goBack()} />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.innerContainer}
        >
          {/* AVATAR SECTION */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarRing}>
              {profilePic ? (
                <Image source={{ uri: profilePic }} style={styles.avatarImg} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarInitial}>{initial}</Text>
                </View>
              )}
              <TouchableOpacity style={styles.cameraBtn} onPress={pickImage}>
                <MaterialCommunityIcons name="camera" size={S(12)} color="#000" />
              </TouchableOpacity>
            </View>
            <Text style={styles.tapToUpdate}>Tap to update photo</Text>
          </View>

          {/* FIELDS */}
          <View style={styles.formSection}>
            <InputBox
              label="Full Name"
              placeholder="Enter full name"
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
            />

            <InputBox
              label="Email Address"
              placeholder="Email address"
              value={email}
              icon="email-outline"
            />

            <InputBox
              label="Phone Number"
              placeholder="Mobile number"
              value={phone}
              icon="phone-outline"
            />

            <InputBox
              label="Address"
              placeholder="Address"
              value={address}
              icon="map-marker-outline"
            />

            <InputBox
              label="Aadhar Number"
              placeholder="Enter Aadhar number"
              value={aadhar}
              setValue={setAadhar}
              icon="information-outline"
              keyboardType="number-pad"
            />

            <InputBox
              label="PAN Number"
              placeholder="PAN number"
              value={pan}
              icon="file-document-outline"
            />
          </View>

          {/* Bottom Spacer */}
          <View style={{ height: S(30) }} />
        </ScrollView>

        {/* SAVE BUTTON */}
        <View style={styles.footer}>
          <TouchableOpacity style={styles.saveBtn} activeOpacity={0.8} onPress={() => navigation.goBack()}>
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
  innerContainer: {
    paddingBottom: S(20),
  },
  avatarSection: {
    alignItems: "center",
    marginTop: S(10),
    marginBottom: S(20),
  },
  avatarRing: {
    width: S(100),
    height: S(100),
    borderRadius: S(50),
    borderWidth: 1.5,
    borderColor: "#D4B06A90", // Faint gold ring
    alignItems: "center",
    justifyContent: "center",
    padding: S(4),
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: S(50),
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: S(50),
    backgroundColor: "#FCECC8",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: S(32),
    fontFamily: Fonts.Bold,
    color: "#D4B06A",
  },
  cameraBtn: {
    position: "absolute",
    bottom: S(2),
    right: S(2),
    backgroundColor: "#FFFFFF",
    width: S(22),
    height: S(22),
    borderRadius: S(11),
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  tapToUpdate: {
    fontSize: S(11),
    color: "#999",
    marginTop: S(8),
    fontFamily: Fonts.Medium,
  },
  formSection: {
    width: "100%",
    paddingHorizontal: S(18),
  },
  fieldWrapper: {
    marginTop: S(14),
  },
  boxLabel: {
    color: "#D4B06A",
    fontSize: S(11),
    fontFamily: Fonts.Bold,
    marginBottom: S(6),
    marginLeft: S(2),
  },
  inputContainer: {
    backgroundColor: "#F6F8FA",
    borderRadius: S(16),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: S(14),
  },
  boxInput: {
    flex: 1,
    height: S(46),
    fontSize: S(14),
    color: "#1A1A2E",
    fontFamily: Fonts.Medium,
  },
  inputIcon: {
    marginLeft: S(10),
  },
  disabledBox: {
    opacity: 0.95,
  },
  disabledText: {
    color: "#4B5563",
  },
  footer: {
    paddingHorizontal: S(18),
    paddingBottom: S(15),
    backgroundColor: "#FFFFFF",
  },
  saveBtn: {
    backgroundColor: "#000000",
    height: S(50),
    borderRadius: S(25),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: S(15),
    fontFamily: Fonts.Bold,
  },
});

