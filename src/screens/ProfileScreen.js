import React, { useRef, useEffect, useState } from "react";
import {
  View,
  Alert,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  Animated,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "../constants/Colors";
import Fonts from "../constants/Fonts"; // Import Fonts
import HeaderBar from "../componets/HeaderBar";
import { fetchUserProfile, logoutUser } from "../api/AuthApi";
import CustomAlert from "../screens/CustomAlert";
import { ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ProfileScreen({ navigation }) {
  /* -------------------- Animation -------------------- */
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  /* -------------------- State -------------------- */
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertAction, setAlertAction] = useState(null);

  /* -------------------- Alert Helper -------------------- */
  const showAlert = (title, message, action = null) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertAction(() => action);
    setAlertVisible(true);
  };

  /* -------------------- Lifecycle -------------------- */
  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      })
    ]).start();

    loadUserProfile();
  }, []);

  /* -------------------- Load Profile (NO LOGOUT HERE) -------------------- */
  const loadUserProfile = async () => {
    try {
      setLoading(true); // 👈 start loader

      const headerToken = await AsyncStorage.getItem("header_token");

      if (!headerToken) {
        setLoading(false);
        Alert.alert("Error", "Unable to load profile");
        return;
      }

      const result = await fetchUserProfile({ headerToken });

      if (result?.success === true) {
        setProfileData(result.data);

        await AsyncStorage.setItem(
          "profile_data",
          JSON.stringify(result.data)
        );
      } else {
        Alert.alert("Error", result?.message || "Profile fetch failed");
      }

    } catch (error) {
      Alert.alert("Error", "Network or server issue");
    } finally {
      setLoading(false); // 👈 stop loader
    }
  };


  /* -------------------- Logout (USER ACTION ONLY) -------------------- */
  const handleLogout = async () => {
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      const headerKey = await AsyncStorage.getItem("header_key");

      // Even if token missing, user intent = logout
      if (!headerToken || !headerKey) {
        forceLogout();
        return;
      }

      const result = await logoutUser({ headerToken, headerKey });

      if (result?.status === "SUCCESS") {
        forceLogout();
      } else {
        showAlert("Logout", result?.message || "Logged out", forceLogout);
      }

    } catch (error) {
      // API failed but user clicked logout
      forceLogout();
    }
  };

  /* -------------------- Force Logout -------------------- */
  const forceLogout = async () => {
    await AsyncStorage.multiRemove([
      "token",
      "header_token",
      "header_key",
      "profile_data",
    ]);

    navigation.reset({
      index: 0,
      routes: [{ name: "FinanceIntro" }],
    });
  };

  /* -------------------- UI -------------------- */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: Colors.finance_bg_2 }}>
      <ScrollView style={styles.container}>
        <Animated.View
          style={[
            styles.profileCard,
            {
              transform: [{ translateY: slideAnim }],
              opacity: fadeAnim
            }
          ]}
        >
          <HeaderBar title="Profile" onBack={() => navigation.goBack()} />

          <Image
            style={styles.avatar}
            source={{ uri: "https://randomuser.me/api/portraits/women/44.jpg" }}
          />

          <Text style={styles.name}>
            {profileData ? `${profileData.firstName || ""} ${profileData.lastName || ""}`.trim() : "—"}
          </Text>

          <Text style={styles.email}>
            {profileData?.email || "—"}
          </Text>

          {profileData?.userName && (
            <View style={styles.userIdBadge}>
              <MaterialCommunityIcons name="identifier" size={14} color={Colors.finance_accent} />
              <Text style={styles.userIdTxt}>{profileData.userName}</Text>
            </View>
          )}

          <View style={styles.rowMenu}>
            <View style={styles.rowItem}>
              <MaterialCommunityIcons name="bell-outline" size={22} color={Colors.finance_accent} />
              <Text style={styles.rowText}>Notification</Text>
            </View>

            <View style={styles.rowItem}>
              <MaterialCommunityIcons name="ticket-percent-outline" size={22} color={Colors.finance_accent} />
              <Text style={styles.rowText}>Voucher</Text>
            </View>

            <TouchableOpacity onPress={() => navigation.navigate("InvoiceScreen")}>
              <View style={styles.rowItem}>
                <MaterialCommunityIcons name="history" size={22} color={Colors.finance_accent} />
                <Text style={styles.rowText}>History</Text>
              </View>
            </TouchableOpacity>
          </View>
        </Animated.View>

        <View style={styles.listBox}>
          <Item
            icon="account-edit"
            text="Edit Profile"
            onPress={() =>
              navigation.navigate("EditProfileScreen", { profileData })
            }
          />

          <Item
            icon="map-marker-outline"
            text="Address Management"
            onPress={() => navigation.navigate("Address")}
          />

          <Item
            icon="lock-reset"
            text="Change Password"
            onPress={() => navigation.navigate("ChangePassword")}
          />

          <Item
            icon="dialpad"
            text="Change PIN"
            onPress={() => navigation.navigate("ChangePin")}
          />

          <Item
            icon="help-circle-outline"
            text="Help & Support"
            onPress={() => navigation.navigate("SupportScreen")}
          />

          <Item
            icon="ticket-outline"
            text="Raise Ticket"
            onPress={() => navigation.navigate("FaqSupportScreen")}
          />

          <Item
            icon="cog-outline"
            text="Settings"
          />

          <Item
            icon="logout"
            text="Log Out"
            isLogout
            onPress={handleLogout}
          />
        </View>

        <CustomAlert
          visible={alertVisible}
          title={alertTitle}
          message={alertMessage}
          onClose={() => {
            setAlertVisible(false);
            alertAction && alertAction();
          }}
        />

        {loading && (
          <View style={styles.loaderOverlay}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loaderText}>Please wait...</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* -------------------- Reusable Item -------------------- */
const Item = ({ icon, text, isLogout, onPress }) => (
  <TouchableOpacity style={styles.item} onPress={onPress}>
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <MaterialCommunityIcons
        name={icon}
        size={22}
        color={isLogout ? "red" : Colors.finance_accent}
      />
      <Text style={[styles.itemText, isLogout && { color: "red" }]}>
        {text}
      </Text>
    </View>
    <MaterialCommunityIcons name="chevron-right" size={26} color={Colors.black} />
  </TouchableOpacity>
);

/* -------------------- Styles -------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.finance_bg_1,
  },
  profileCard: {
    backgroundColor: Colors.finance_bg_2,
    alignItems: "center",
    paddingBottom: 35,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatar: {
    height: 90,
    width: 90,
    borderRadius: 50,
    borderWidth: 2,
    marginTop: 20,
    borderColor: Colors.finance_accent,
    marginBottom: 10,
  }, loaderOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 999,
  },

  loaderText: {
    marginTop: 10,
    color: "#fff",
    fontSize: 14,
    fontFamily: Fonts.Medium,
  },

  name: {
    color: Colors.finance_text,
    fontSize: 20,
    fontFamily: Fonts.Bold, // Lufga Bold
  },
  email: {
    color: Colors.finance_text,
    marginBottom: 15,
    fontFamily: Fonts.Medium, // Lufga Medium
  },
  rowMenu: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "90%",
    marginTop: 20,
  },
  rowItem: {
    width: 100,
    height: 65,
    alignItems: "center",
    borderWidth: 0,
    borderRadius: 10,
    backgroundColor: Colors.finance_text,
    padding: 10,
    elevation: 3,
  },
  rowText: {
    color: Colors.finance_bg_1,
    fontSize: 12,
    marginTop: 5,
    fontFamily: Fonts.Medium, // Lufga Medium
  },
  listBox: {
    backgroundColor: Colors.white,
    marginTop: 25,
    marginHorizontal: 20,
    marginBottom: 40,
    borderRadius: 20,
    borderWidth: 0.2,
    borderColor: Colors.primary,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 15,
    marginHorizontal: 15,
    borderBottomWidth: 0.6,
    borderColor: Colors.secndory,
  },
  itemText: {
    fontSize: 15,
    marginLeft: 12,
    color: Colors.finance_text,
    fontFamily: Fonts.Medium, // Lufga Medium
  },
  userIdBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(212,176,106,0.1)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 5,
    borderWidth: 1,
    borderColor: "rgba(212,176,106,0.2)",
  },
  userIdTxt: {
    color: Colors.finance_accent,
    fontSize: 12,
    fontFamily: Fonts.Bold,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
});
