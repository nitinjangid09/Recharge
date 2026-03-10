import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  StatusBar,
  Image,
  Animated,
  Easing,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Colors from "../../utils/Color";

const SupportScreen = () => {
  const navigation = useNavigation();

  const contactData = {
    phone: "9876543210",
    email: "info@gmail.com",
    address: "64 Suman Pareek Enclave Near Iris College Vivek Vihar",
  };

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const scaleCallBtn = useRef(new Animated.Value(1)).current;
  const scaleEmailBtn = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 700,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 700,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleCall = () => Linking.openURL(`tel:${contactData.phone}`);
  const handleEmail = () => Linking.openURL(`mailto:${contactData.email}`);

  const animateButton = (scaleValue) => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Contact Support</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate("ProfileScreen")}
        >
          <Image
            source={require("../../assets/profile.png")}
            style={styles.icon}
          />
        </TouchableOpacity>
      </View>

      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        style={{ opacity: fadeAnim }}
      >
        {/* Illustration */}
        <Animated.View
          style={[
            styles.imageContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <Image
            source={require("../../assets/support.png")}
            style={styles.image}
            resizeMode="contain"
          />
        </Animated.View>

        {/* Contact Card */}
        <Animated.View
          style={[
            styles.contactCard,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View style={styles.infoBlock}>
            <Text style={styles.label}>Phone Number</Text>
            <TouchableOpacity onPress={handleCall}>
              <Text style={styles.value}>{contactData.phone}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoBlock}>
            <Text style={styles.label}>Email Address</Text>
            <TouchableOpacity onPress={handleEmail}>
              <Text style={styles.value}>{contactData.email}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.separator} />

          <View style={styles.infoBlock}>
            <Text style={styles.label}>Address</Text>
            <Text style={styles.address}>{contactData.address}</Text>
          </View>
        </Animated.View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <Animated.View style={{ transform: [{ scale: scaleCallBtn }] }}>
            <TouchableOpacity
              style={styles.callBtn}
              onPress={() => {
                animateButton(scaleCallBtn);
                handleCall();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.callBtnText}>Call Support</Text>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View style={{ transform: [{ scale: scaleEmailBtn }] }}>
            <TouchableOpacity
              style={styles.emailBtn}
              onPress={() => {
                animateButton(scaleEmailBtn);
                handleEmail();
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.emailBtnText}>Send Email</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Animated.ScrollView>
    </SafeAreaView>
  );
};

export default SupportScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary,
  },

  header: {
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.white,
  },

  icon: {
    width: 24,
    height: 24,
    tintColor: Colors.white,
  },

  imageContainer: {
    alignItems: "center",
    marginTop: 20,
  },

  image: {
    width: 200,
    height: 200,
  },

  contactCard: {
    backgroundColor: Colors.white,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    padding: 20,
    elevation: 5,
  },

  infoBlock: {
    marginBottom: 15,
  },

  label: {
    fontSize: 13,
    color: "#888",
    marginBottom: 5,
  },

  value: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary,
  },

  address: {
    fontSize: 14,
    color: Colors.black,
    lineHeight: 20,
  },

  separator: {
    height: 1,
    backgroundColor: "#E6E6E6",
    marginVertical: 12,
  },

  buttonContainer: {
    marginHorizontal: 20,
    marginTop: 25,
    marginBottom: 40,
  },

  callBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 12,
  },

  callBtnText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "600",
  },

  emailBtn: {
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  emailBtnText: {
    color: Colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
});