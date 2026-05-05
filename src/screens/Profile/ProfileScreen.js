import React, { useRef, useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaView } from "react-native-safe-area-context";
import { fetchUserProfile, logoutUser } from "../../api/AuthApi";
import CustomAlert from "../../componets/Alerts/CustomAlert";
import Colors from "../../constants/Colors";
import Fonts from "../../constants/Fonts";
import FullScreenLoader from "../../componets/Loader/FullScreenLoader";


/* ─────────────────────────────────────────────
   AVATAR INITIAL COMPONENT
───────────────────────────────────────────── */
const AvatarRing = ({ initials, size = 80, onEditPress }) => {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 6000,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const innerSize = size - 5;

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      {/* Spinning gradient ring — simulated with a rotated colored border */}
      <Animated.View
        style={{
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: 2.5,
          borderColor: Colors.amber,
          transform: [{ rotate }],
          borderStyle: "solid",
          // Conic-gradient simulation: amber top, fade bottom
          opacity: 0.9,
        }}
      />
      <View
        style={{
          width: innerSize,
          height: innerSize,
          borderRadius: innerSize / 2,
          backgroundColor: "#2E2E2E" || "#2A2825",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2.5,
          borderColor: Colors.primary,
        }}
      >
        <Text
          style={{
            fontFamily: Fonts.Bold,
            fontSize: size * 0.32,
            color: Colors.amber2,
            letterSpacing: -0.5,
          }}
        >
          {initials}
        </Text>
      </View>
      {/* Edit badge */}
      {onEditPress && (
        <TouchableOpacity
          onPress={onEditPress}
          style={styles.avEditBadge}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <MaterialCommunityIcons name="pencil" size={9} color={Colors.white} />
        </TouchableOpacity>
      )}
    </View>
  );
};

/* ─────────────────────────────────────────────
   STAT BLOCK
───────────────────────────────────────────── */
const HeroStat = ({ value, label, isAmber }) => (
  <View style={styles.hstat}>
    <Text style={[styles.hstatVal, isAmber && { color: Colors.amber2 }]}>{value}</Text>
    <Text style={styles.hstatKey}>{label}</Text>
  </View>
);

/* ─────────────────────────────────────────────
   QUICK TILE
───────────────────────────────────────────── */
const Tile = ({ icon, label, onPress }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const press = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.93, duration: 90, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 160, useNativeDriver: true }),
    ]).start();
    onPress && onPress();
  };
  return (
    <TouchableOpacity activeOpacity={0.8} onPress={press} style={{ flex: 1 }}>
      <Animated.View style={[styles.tile, { transform: [{ scale }] }]}>
        <View style={styles.tileIc}>
          <MaterialCommunityIcons name={icon} size={17} color={Colors.ink2} />
        </View>
        <Text style={styles.tileLbl} numberOfLines={1} adjustsFontSizeToFit>
          {label}
        </Text>
      </Animated.View>
    </TouchableOpacity>
  );
};

/* ─────────────────────────────────────────────
   MENU ROW
───────────────────────────────────────────── */
const Row = ({ icon, label, sub, badge, isDanger, isFirst, isLast, onPress }) => {
  const bg = useRef(new Animated.Value(0)).current;
  const iconBg = bg.interpolate({ inputRange: [0, 1], outputRange: [Colors.white, isDanger ? Colors.error_light : Colors.warning_light] });
  const iconColor = bg.interpolate({ inputRange: [0, 1], outputRange: [Colors.ink2, isDanger ? Colors.red : Colors.amber] });

  const onIn = () => Animated.timing(bg, { toValue: 1, duration: 120, useNativeDriver: false }).start();
  const onOut = () => Animated.timing(bg, { toValue: 0, duration: 160, useNativeDriver: false }).start();

  const radius = {
    borderTopLeftRadius: isFirst ? 14 : 0,
    borderTopRightRadius: isFirst ? 14 : 0,
    borderBottomLeftRadius: isLast ? 14 : 0,
    borderBottomRightRadius: isLast ? 14 : 0,
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={onIn}
      onPressOut={onOut}
      onPress={onPress}
    >
      <Animated.View style={[styles.row, radius, !isFirst && styles.rowDivider]}>
        <Animated.View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
          <Animated.Text style={{ color: iconColor }}>
            <MaterialCommunityIcons name={icon} size={15} />
          </Animated.Text>
        </Animated.View>

        <View style={styles.rowBody}>
          <Text style={[styles.rowLabel, isDanger && { color: Colors.red }]}>{label}</Text>
          {sub ? <Text style={styles.rowSub}>{sub}</Text> : null}
        </View>

        <View style={styles.rowRight}>
          {badge ? (
            <View style={styles.openBadge}>
              <Text style={styles.openBadgeTxt}>{badge}</Text>
            </View>
          ) : null}
          <MaterialCommunityIcons
            name="chevron-right"
            size={14}
            color={isDanger ? Colors.red : Colors.text_secondary}
            style={{ opacity: isDanger ? 0.4 : 1 }}
          />
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

/* ─────────────────────────────────────────────
   CARD WRAPPER + SECTION LABEL
───────────────────────────────────────────── */
const Card = ({ children }) => <View style={styles.card}>{children}</View>;
const Sect = ({ label }) => <Text style={styles.sect}>{label}</Text>;

/* ─────────────────────────────────────────────
   PROFILE SCREEN
───────────────────────────────────────────── */
export default function ProfileScreen({ navigation }) {
  /* Animations */
  const heroAnim = useRef(new Animated.Value(16)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const tile1 = useRef(new Animated.Value(16)).current;
  const tile1Op = useRef(new Animated.Value(0)).current;
  const tile2 = useRef(new Animated.Value(16)).current;
  const tile2Op = useRef(new Animated.Value(0)).current;
  const tile3 = useRef(new Animated.Value(16)).current;
  const tile3Op = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(16)).current;
  const cardOp = useRef(new Animated.Value(0)).current;

  /* State */
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState("");
  const [alertMessage, setAlertMessage] = useState("");
  const [alertType, setAlertType] = useState("info");
  const [alertAction, setAlertAction] = useState(null);

  const showAlert = (title, message, type = "info", action = null) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setAlertAction(() => action);
    setAlertVisible(true);
  };

  const animIn = (y, op, delay) =>
    Animated.parallel([
      Animated.timing(y, { toValue: 0, duration: 380, delay, useNativeDriver: true }),
      Animated.timing(op, { toValue: 1, duration: 380, delay, useNativeDriver: true }),
    ]);

  useEffect(() => {
    Animated.stagger(0, [
      animIn(heroAnim, heroOpacity, 0),
      animIn(tile1, tile1Op, 80),
      animIn(tile2, tile2Op, 130),
      animIn(tile3, tile3Op, 180),
      animIn(cardAnim, cardOp, 220),
    ]).start();

    loadUserProfile();
  }, []);

  /* Load profile */
  const loadUserProfile = async () => {
    try {
      setLoading(true);
      const headerToken = await AsyncStorage.getItem("header_token");
      if (!headerToken) { setLoading(false); showAlert("Error", "Unable to load profile", "error"); return; }
      const result = await fetchUserProfile({ headerToken });
      if (result?.success === true) {
        setProfileData(result.data);
        await AsyncStorage.setItem("profile_data", JSON.stringify(result.data));
      } else {
        showAlert("Error", result?.message || "Profile fetch failed", "error");
      }
    } catch {
      showAlert("Error", "Network or server issue", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadUserProfile();
  }, []);

  /* Logout */
  const handleLogout = async () => {
    try {
      const headerToken = await AsyncStorage.getItem("header_token");
      const headerKey = await AsyncStorage.getItem("header_key");
      if (!headerToken || !headerKey) { forceLogout(); return; }
      const result = await logoutUser({ headerToken, headerKey });
      if (result?.status === "SUCCESS") forceLogout();
      else showAlert("Logout", result?.message || "Logged out", "info", forceLogout);
    } catch {
      forceLogout();
    }
  };

  const forceLogout = async () => {
    await AsyncStorage.multiRemove(["token", "header_token", "header_key", "profile_data"]);
    navigation.reset({ index: 0, routes: [{ name: "FinanceIntro" }] });
  };

  /* Helpers */
  const fullName = profileData
    ? `${profileData.firstName || ""} ${profileData.lastName || ""}`.trim()
    : "—";
  const initials = profileData
    ? `${(profileData.firstName || "")[0] || ""}${(profileData.lastName || "")[0] || ""}`.toUpperCase()
    : "—";
  const email = profileData?.email || "—";
  const userName = profileData?.userName || null;
  const roleName = profileData?.roleName || null;
  const roleId = profileData?.roleId?._id;

  const isDistributor = [
    "698ef03714f23da91959cf41",
    "698ef04e14f23da91959cf45",
    "698ef05714f23da91959cf48",
  ].includes(roleId);

  /* ─── UI ─── */
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.black} />
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        bounces={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.amber}
            colors={[Colors.amber]}
            progressBackgroundColor="#2A2825"
          />
        }
      >
        {/* Top overscroll fix: matches hero background when pulling down */}
        <View style={{ backgroundColor: Colors.black, height: 500, position: 'absolute', top: -500, left: 0, right: 0 }} />

        {/* ── HERO ZONE ── */}
        <Animated.View
          style={[
            styles.hero,
            { transform: [{ translateY: heroAnim }], opacity: heroOpacity },
          ]}
        >
          {/* Ambient glow */}
          <View style={styles.heroGlow} pointerEvents="none" />
          {/* Grid mesh */}
          <View style={styles.heroMesh} pointerEvents="none" />

          {/* Nav row */}
          <View style={styles.heroNav}>
            <Text style={styles.heroLogo}>
              cam<Text style={{ color: Colors.amber2 }}>lenio</Text>
            </Text>
          </View>

          {/* Avatar + identity */}
          <View style={styles.avWrap}>
            <AvatarRing
              initials={initials}
              size={80}
              onEditPress={() => navigation.navigate("EditProfileScreen", { profileData })}
            />
            <Text style={styles.heroName}>{fullName}</Text>
            <Text style={styles.heroEmail}>{email}</Text>
            {/* Identity Badges Row */}
            <View style={styles.badgeRow}>
              {userName && (
                <View style={styles.userBadge}>
                  <MaterialCommunityIcons name="identifier" size={9} color={Colors.amber} style={{ marginRight: 5 }} />
                  <Text style={styles.userBadgeTxt}>{userName}</Text>
                </View>
              )}
              {roleName && (
                <View style={[styles.userBadge, { backgroundColor: Colors.ink2, borderColor: "#5F5D5B" }]}>
                  <MaterialCommunityIcons name="shield-account-outline" size={9} color={Colors.white} style={{ marginRight: 5 }} />
                  <Text style={[styles.userBadgeTxt, { color: Colors.white }]}>{roleName}</Text>
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        {/* ── QUICK TILES ── */}
        <View style={styles.tiles}>
          <Animated.View style={{ flex: 1, transform: [{ translateY: tile1 }], opacity: tile1Op }}>
            <Tile icon="file-document-outline" label="Commission Plan" onPress={() => { navigation.navigate("CommisionPlan") }} />
          </Animated.View>
          <Animated.View style={{ flex: 1, transform: [{ translateY: tile2 }], opacity: tile2Op }}>
            <Tile icon="bank-transfer" label="Wallet Transfer" onPress={() => { navigation.navigate("WalletTransfer") }} />
          </Animated.View>
        </View>

        {/* ── MENU ── */}
        <Animated.View
          style={[styles.pbody, { transform: [{ translateY: cardAnim }], opacity: cardOp }]}
        >
          {/* Account */}
          <Sect label="Account" />
          <Card>
            <Row
              icon="account-outline"
              label="Edit Profile"
              sub="Name, photo, Aadhar, PAN"
              onPress={() => navigation.navigate("EditProfileScreen", { profileData })}
            />
            {[
              "698ef03714f23da91959cf41", // STATE HEAD
              "698ef04e14f23da91959cf45", // MASTER DISTRIBUTOR
              "698ef05714f23da91959cf48", // DISTRIBUTOR
            ].includes(profileData?.roleId?._id || profileData?.roleId) && (

                <>
                  <Row
                    icon="account-plus-outline"
                    label="Create User"
                    sub="Add a new sub-account"
                    onPress={() => navigation.navigate("CreateUser")}
                  />
                  <Row
                    icon="account-group-outline"
                    label="User Downline"
                    sub="Manage your network"
                    isLast
                    onPress={() => navigation.navigate("UserListScreen")}
                  />
                </>
              )}
            <Row
              icon="account-cash-register-outline"
              label="User Wallet Refill"
              sub="Add Balance to User Wallet"
              isLast
              onPress={() => navigation.navigate("UserWalletRefill")}
            />

          </Card>

          {/* Security */}
          <Sect label="Security" />
          <Card>
            <Row
              icon="lock-outline"
              label="Change Password"
              sub="Last changed 30 days ago"
              isFirst
              onPress={() => navigation.navigate("ChangePassword")}
            />
            {/* <Row
              icon="dialpad"
              label="Change PIN"
              sub="4-digit wallet PIN"
              onPress={() => navigation.navigate("ChangePin")}
            /> */}
          </Card>

          {/* Help */}
          <Sect label="Help" />
          <Card>
            <Row
              icon="help-circle-outline"
              label="Help & Support"
              isFirst
              onPress={() => navigation.navigate("SupportScreen")}
            />
            <Row
              icon="ticket-outline"
              label="Raise Ticket"
              onPress={() => navigation.navigate("FaqSupportScreen")}
            />
            <Row
              icon="logout"
              label="Log Out"
              isDanger
              isLast
              onPress={handleLogout}
            />
          </Card>
        </Animated.View>
      </ScrollView>

      {/* Custom alert */}
      <CustomAlert
        visible={alertVisible}
        type={alertType}
        title={alertTitle}
        message={alertMessage}
        onClose={() => {
          setAlertVisible(false);
          alertAction && alertAction();
        }}
      />

      <FullScreenLoader visible={loading} label="Please wait..." />
    </SafeAreaView>
  );
}

/* ─────────────────────────────────────────────
   STYLES
───────────────────────────────────────────── */
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.black,
  },
  scroll: {
    flex: 1,
    backgroundColor: Colors.beige,
  },

  /* ── Hero ── */
  hero: {
    backgroundColor: Colors.black,
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 32,
    position: "relative",
    overflow: "hidden",
  },
  heroGlow: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(245,158,11,0.18)",
    top: -60,
    right: -40,
  },
  heroMesh: {
    position: "absolute",
    inset: 0,
    top: 0, left: 0, right: 0, bottom: 0,
    // Simulated with very subtle pattern — React Native doesn't support background-image grids
    opacity: 0.03,
    backgroundColor: Colors.white,
  },
  heroNav: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    zIndex: 1,
  },
  heroLogo: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: Colors.white,
    letterSpacing: -0.36,
  },

  avWrap: {
    alignItems: "center",
    gap: 6,
    zIndex: 1,
    marginBottom: 4,
  },
  avEditBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.amber,
    borderWidth: 2.5,
    borderColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  heroName: {
    fontFamily: Fonts.Bold,
    fontSize: 22,
    color: Colors.white,
    letterSpacing: -0.66,
    marginTop: 10,
    textAlign: "center",
  },
  heroEmail: {
    fontFamily: Fonts.Regular,
    fontSize: 12,
    color: "rgba(255,255,255,0.38)",
    textAlign: "center",
    marginTop: 2,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  userBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  userBadgeTxt: {
    fontFamily: Fonts.Bold,
    fontSize: 10.5,
    color: Colors.amber2,
    letterSpacing: 0.3,
  },
  hstatVal: {
    fontFamily: Fonts.Bold,
    fontSize: 20,
    color: Colors.white,
    letterSpacing: -0.6,
  },
  hstatKey: {
    fontFamily: Fonts.Bold,
    fontSize: 9,
    color: "rgba(255,255,255,0.38)",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginTop: 2,
  },
  hstatDiv: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },

  /* ── Tiles ── */
  tiles: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 16,
    marginTop: -18,
    zIndex: 2,
  },
  tile: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    height: 82, // Fixed height to keep all tiles uniform
    borderWidth: 1,
    borderColor: Colors.input_border,
  },
  tileIc: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: Colors.white,
    alignItems: "center",
    justifyContent: "center",
  },
  tileLbl: {
    fontFamily: Fonts.Bold,
    fontSize: 9.5, // Slightly smaller to help fit
    color: "#5F5D5B",
    letterSpacing: 0.2,
    textTransform: "uppercase",
    textAlign: "center",
    width: "100%",
  },

  /* ── Menu body ── */
  pbody: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 48,
    gap: 0,
  },
  sect: {
    fontFamily: Fonts.Bold,
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
    color: Colors.black,
    marginBottom: 8,
    marginTop: 24,
    paddingHorizontal: 2,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 14,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 13,
    paddingHorizontal: 16,
    backgroundColor: Colors.white,
  },
  rowDivider: {
    borderTopWidth: 0.5,
    borderTopColor: Colors.kyc_border,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowBody: { flex: 1 },
  rowLabel: {
    fontFamily: Fonts.Medium,
    fontSize: 14,
    color: Colors.ink,
    letterSpacing: -0.14,
  },
  rowSub: {
    fontFamily: Fonts.Regular,
    fontSize: 11,
    color: "#5F5D5B",
    marginTop: 1,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  openBadge: {
    backgroundColor: Colors.warning_light,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  openBadgeTxt: {
    fontFamily: Fonts.Bold,
    fontSize: 9,
    color: Colors.amber,
    letterSpacing: 0.2,
  },

  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
});
