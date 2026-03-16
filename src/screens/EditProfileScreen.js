import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,

} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { launchImageLibrary } from "react-native-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetchUserProfile } from "../api/AuthApi";
import Colors from "../constants/Colors";
import Fonts from "../constants/Fonts";
import HeaderBar from "../componets/HeaderBar";
import { SafeAreaView } from "react-native-safe-area-context";

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
        pointerEvents={editable ? "auto" : "none"}   // 🔒 fully disables touch
        style={[
          styles.inputContainer,
          !editable && styles.disabledBox,
        ]}
      >
        <TextInput
          value={value}
          keyboardType={keyboardType || "default"}
          placeholder={placeholder}
          placeholderTextColor="#9E9E9E"
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
          size={22}
          color={editable ? Colors.finance_accent : "#9E9E9E"}
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
        setProfilePic(d.profilePic || "https://i.pravatar.cc/150?img=32");
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={styles.innerContainer}
      >
        <HeaderBar title="Edit Profile" onBack={() => navigation.goBack()} />

        <View style={styles.profileContainer}>
          <Image source={{ uri: profilePic }} style={styles.profileImage} />
          <TouchableOpacity style={styles.addBtn} onPress={pickImage}>
            <MaterialCommunityIcons name="plus" size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Editable */}
        <InputBox
          label="Full Name"
          placeholder="Enter full name"
          value={name}
          setValue={setName}
          icon="account-outline"

        />

        {/* Non editable */}
        <InputBox
          label="Username"
          placeholder="Username"
          value={username}
          icon="account-circle-outline"
        />

        <InputBox
          label="Email"
          placeholder="Email address"
          value={email}
          icon="email-outline"
        />

        <InputBox
          label="Phone"
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

        {/* Editable */}
        <InputBox
          label="Aadhar"
          placeholder="Enter Aadhar number"
          value={aadhar}
          setValue={setAadhar}
          icon="account-card-outline"
          keyboardType="number-pad"

        />

        <InputBox
          label="PAN Number"
          placeholder="PAN number"
          value={pan}
          icon="file-document-outline"

        />


      </ScrollView>
    </SafeAreaView>
  );
};

export default EditProfileScreen;

/* ================= STYLES ================= */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.finance_bg_1 },

  innerContainer: {
    alignItems: "center",
    paddingBottom: 40,
  },

  profileContainer: {
    alignItems: "center",
    marginVertical: 10, // Reduced Vertical Space
  },

  profileImage: {
    width: 110,
    height: 110,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: Colors.finance_accent,
    backgroundColor: '#fff',
  },

  addBtn: {
    position: "absolute",
    right: -5,
    bottom: -5,
    backgroundColor: Colors.finance_accent,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
  },

  fieldWrapper: {
    width: "95%",
    marginTop: 10, // Reduced Vertical Space
  },

  boxLabel: {
    color: Colors.finance_text,
    fontSize: 13,
    fontFamily: Fonts.Bold, // Use Lufga Bold
    marginBottom: 4, // Reduced margin
    marginLeft: 6,
  },

  inputContainer: {
    borderWidth: 1,
    borderColor: 'rgba(212, 176, 106, 0.5)', // finance_accent with opacity
    borderRadius: 12,
    backgroundColor: "#fff",
    marginHorizontal: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },

  boxInput: {
    flex: 1,
    height: 38,
    fontSize: 15,
    color: Colors.finance_text,
    fontFamily: Fonts.Medium, // Use Lufga Medium
  },



  disabledText: {
    color: Colors.finance_text,
    opacity: 0.7,
  },


});
