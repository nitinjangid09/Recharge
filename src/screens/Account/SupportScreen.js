import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
  Clipboard,
  Dimensions,
  PixelRatio,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import LinearGradient from "react-native-linear-gradient";
import Colors from "../../constants/Colors";
import Fonts from "../../constants/Fonts";

// ─── Responsive scale ─────────────────────────────────────────────────────
const { width: W } = Dimensions.get("window");
const S = (n) => Math.round(PixelRatio.roundToNearestPixel(n * (W / 375)));

// ─── Colour map — all from Colors file ────────────────────────────────────
const C = {
  pageBg: Colors.finance_bg_1 || "#F4F5F7",
  heroBg: Colors.dark || "#161616",
  cardBg: Colors.white || "#FFFFFF",
  listBg: Colors.homebg || "#FFFFFF",
  heading: Colors.finance_text || "#1A1A2E",
  subText: Colors.gray || "#6B7280",
  heroText: Colors.white || "#FFFFFF",
  heroSub: Colors.lightGray || "#9CA3AF",
  accent: Colors.finance_accent || "#D4A843",
  accentDark: "#B8944D",
  online: Colors.success || "#22C55E",
  border: Colors.border || "#E5E7EB",
  chatColor: Colors.finance_accent || "#D4A843",
  faqColor: Colors.primary || "#6366F1",
  ticketColor: Colors.success || "#22C55E",
  cbColor: Colors.error || "#EF4444",
};

// ─── Static data ──────────────────────────────────────────────────────────
const CONTACT = {
  phone: "9876543210",
  email: "info@gmail.com",
  address: "64 Suman Pareek Enclave, Near Iris College, Vivek Vihar",
};

const CONTACT_ROWS = [
  { icon: "phone-outline", label: "PHONE NUMBER", value: CONTACT.phone, actionIcon: "content-copy", onAction: () => Clipboard.setString(CONTACT.phone) },
  { icon: "email-outline", label: "EMAIL ADDRESS", value: CONTACT.email, actionIcon: "content-copy", onAction: () => Clipboard.setString(CONTACT.email) },
  { icon: "map-marker-outline", label: "ADDRESS", value: CONTACT.address, actionIcon: "directions", onAction: () => { } },
];

const QUICK_CARDS = [
  { icon: "message-text-outline", title: "Live Chat", sub: "Chat with an agent instantly", accent: C.chatColor },
  { icon: "frequently-asked-questions", title: "FAQs", sub: "Browse common questions", accent: C.faqColor },
  { icon: "ticket-outline", title: "Raise Ticket", sub: "Submit a support request", accent: C.ticketColor },
  { icon: "phone-incoming-outline", title: "Callback", sub: "We'll call you back soon", accent: C.cbColor },
];

const STATS = [
  { icon: "timer-outline", text: "Avg reply\n2 min" },
  { icon: "shield-lock-outline", text: "256-bit\nsecure" },
  { icon: "headset", text: "Expert\nagents" },
];

// ═══════════════════════════════════════════════════════════════════════════
//  SupportScreen
// ═══════════════════════════════════════════════════════════════════════════
const SupportScreen = () => {
  const navigation = useNavigation();

  const fade = useRef(new Animated.Value(0)).current;
  const heroSlide = useRef(new Animated.Value(S(-16))).current;
  const bodySlide = useRef(new Animated.Value(S(30))).current;
  const scaleCall = useRef(new Animated.Value(1)).current;
  const scaleMail = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 550, useNativeDriver: true }),
      Animated.timing(heroSlide, { toValue: 0, duration: 580, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(bodySlide, { toValue: 0, duration: 620, delay: 80, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, []);

  const bounce = (anim, cb) =>
    Animated.sequence([
      Animated.timing(anim, { toValue: 0.95, duration: 90, useNativeDriver: true }),
      Animated.timing(anim, { toValue: 1, duration: 90, useNativeDriver: true }),
    ]).start(cb);

  const handleCall = () => bounce(scaleCall, () => Linking.openURL(`tel:${CONTACT.phone}`));
  const handleEmail = () => bounce(scaleMail, () => Linking.openURL(`mailto:${CONTACT.email}`));

  return (
    <SafeAreaView style={st.safe} edges={["top"]}>
      <StatusBar barStyle="light-content" backgroundColor={C.heroBg} />

      {/* ════════════════════════════════════════════════
          FIXED HEADER (dark, always on top)
      ════════════════════════════════════════════════ */}
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Icon name="chevron-left" size={S(22)} color={C.accent} />
          <Text style={st.backTxt}>Back</Text>
        </TouchableOpacity>

        <Text style={st.headerTitle}>Contact Support</Text>

        <TouchableOpacity
          style={st.profileBtn}
          onPress={() => navigation.navigate("ProfileScreen")}
          activeOpacity={0.7}
        >
          <View style={st.profileCircle}>
            <Icon name="account-outline" size={S(17)} color={C.heroSub} />
          </View>
        </TouchableOpacity>
      </View>

      {/* ════════════════════════════════════════════════
          SCROLLABLE BODY
          Structure:
            ① Dark hero block        ← no border-radius at bottom
            ② Curved connector strip  ← dark bg with rounded bottom corners
            ③ White/light content     ← sits flush under connector
      ════════════════════════════════════════════════ */}
      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >

        {/* ① Hero block */}
        <Animated.View style={[st.hero, { opacity: fade, transform: [{ translateY: heroSlide }] }]}>

          {/* Online badge */}
          <View style={st.onlineBadge}>
            <View style={st.onlineDot} />
            <Text style={st.onlineTxt}>SUPPORT ONLINE</Text>
          </View>

          {/* Headline + avatar */}
          <View style={st.heroRow}>
            <View style={{ flex: 1, paddingRight: S(12) }}>
              <Text style={st.heroHeading}>
                {"We're here\nto "}
                <Text style={{ color: C.accent }}>help you</Text>
              </Text>
              <Text style={st.heroSubTxt}>
                Available 24/7 for all your{"\n"}queries and issues
              </Text>
            </View>
            <LinearGradient
              colors={[C.accent + "35", C.accent + "12"]}
              style={st.agentCircle}
            >
              <Icon name="headset" size={S(34)} color={C.accent} />
            </LinearGradient>
          </View>

          {/* Stat chips */}
          <View style={st.statsRow}>
            {STATS.map((s, i) => (
              <View key={i} style={st.statChip}>
                <Icon name={s.icon} size={S(13)} color={C.accent} />
                <Text style={st.statTxt}>{s.text}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ② Curved connector — dark background with rounded bottom corners.
              This creates the "pill" curve between dark and light zones
              WITHOUT the light section sliding on top of the hero.         */}
        <View style={st.curveConnector} />

        {/* ③ Light content area — starts BELOW the connector, no overlap   */}
        <Animated.View style={[st.body, { opacity: fade, transform: [{ translateY: bodySlide }] }]}>

          {/* ── Contact card ── */}
          <View style={st.contactCard}>
            {CONTACT_ROWS.map((row, i) => (
              <View key={i}>
                <View style={st.contactRow}>
                  <View style={[st.contactIconBox, { backgroundColor: C.accent + "18", borderColor: C.accent + "30" }]}>
                    <Icon name={row.icon} size={S(17)} color={C.accent} />
                  </View>
                  <View style={st.contactInfo}>
                    <Text style={st.contactLabel}>{row.label}</Text>
                    <Text style={[
                      st.contactValue,
                      row.label === "ADDRESS" && { fontSize: S(12), lineHeight: S(18) },
                    ]}>
                      {row.value}
                    </Text>
                  </View>
                  <TouchableOpacity style={st.contactAction} onPress={row.onAction}>
                    <Icon name={row.actionIcon} size={S(15)} color={C.subText} />
                  </TouchableOpacity>
                </View>
                {i < CONTACT_ROWS.length - 1 && <View style={st.divider} />}
              </View>
            ))}
          </View>

          {/* ── Quick help ── */}
          <Text style={st.sectionTitle}>QUICK HELP</Text>

          <View style={st.quickGrid}>
            {QUICK_CARDS.map((q, i) => (
              <TouchableOpacity key={i} style={[st.quickCard, { borderTopColor: q.accent }]} activeOpacity={0.75}>
                <View style={[st.quickIconBox, { backgroundColor: q.accent + "18" }]}>
                  <Icon name={q.icon} size={S(19)} color={q.accent} />
                </View>
                <Text style={st.quickTitle}>{q.title}</Text>
                <Text style={st.quickSub}>{q.sub}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Buttons ── */}
          <View style={st.btnGroup}>
            <Animated.View style={{ transform: [{ scale: scaleCall }] }}>
              <TouchableOpacity onPress={handleCall} activeOpacity={0.85}>
                <LinearGradient
                  colors={[C.accent, C.accentDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={st.callBtn}
                >
                  <Icon name="phone" size={S(17)} color={C.heroBg} />
                  <Text style={st.callTxt}>Call Support</Text>
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={{ transform: [{ scale: scaleMail }] }}>
              <TouchableOpacity style={st.emailBtn} onPress={handleEmail} activeOpacity={0.85}>
                <Icon name="email-outline" size={S(17)} color={C.heading} />
                <Text style={st.emailTxt}>Send Email</Text>
              </TouchableOpacity>
            </Animated.View>
          </View>

        </Animated.View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default SupportScreen;

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.heroBg },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1, backgroundColor: Colors.bg },

  // ── Header ────────────────────────────────────────────────────────────
  header: {
    backgroundColor: C.heroBg,
    paddingVertical: S(11),
    paddingHorizontal: S(16),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  backBtn: { flexDirection: "row", alignItems: "center", minWidth: S(60) },
  backTxt: { color: C.accent, fontSize: S(14), fontFamily: Fonts.Medium, marginLeft: S(2) },
  headerTitle: { fontSize: S(16), fontFamily: Fonts.Bold, color: C.heroText, textAlign: "center" },
  profileBtn: { minWidth: S(60), alignItems: "flex-end" },
  profileCircle: {
    width: S(34), height: S(34), borderRadius: S(17),
    backgroundColor: "#2E2E2E",
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: "#3A3A3A",
  },

  // ── Hero ──────────────────────────────────────────────────────────────
  // NO borderRadius at bottom — the curveConnector handles the curve
  hero: {
    backgroundColor: C.heroBg,
    paddingHorizontal: S(20),
    paddingTop: S(10),
    paddingBottom: S(20),
  },
  onlineBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: C.online + "20",
    alignSelf: "flex-start",
    borderRadius: S(20),
    paddingHorizontal: S(12),
    paddingVertical: S(5),
    marginBottom: S(16),
    borderWidth: 1,
    borderColor: C.online + "40",
  },
  onlineDot: {
    width: S(7), height: S(7), borderRadius: S(4),
    backgroundColor: C.online, marginRight: S(7),
  },
  onlineTxt: {
    color: C.online, fontSize: S(10),
    fontFamily: Fonts.Bold, letterSpacing: 0.8,
    includeFontPadding: false, lineHeight: S(14),
  },
  heroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: S(18),
  },
  heroHeading: {
    fontSize: S(26), fontFamily: Fonts.Bold,
    color: C.heroText, lineHeight: S(33), marginBottom: S(8),
  },
  heroSubTxt: {
    fontSize: S(12), color: C.heroSub,
    lineHeight: S(18), fontFamily: Fonts.Medium,
  },
  agentCircle: {
    width: S(74), height: S(74), borderRadius: S(37),
    justifyContent: "center", alignItems: "center",
    borderWidth: 1, borderColor: C.accent + "30",
  },
  statsRow: { flexDirection: "row", gap: S(10) },
  statChip: {
    flex: 1,
    backgroundColor: "#232323",
    borderRadius: S(10),
    paddingVertical: S(9),
    paddingHorizontal: S(10),
    flexDirection: "row",
    alignItems: "center",
    gap: S(6),
    borderWidth: 1,
    borderColor: "#2E2E2E",
  },
  statTxt: { fontSize: S(10), color: C.heroSub, lineHeight: S(14), fontFamily: Fonts.Medium },

  // ── Curve connector ──────────────────────────────────────────────────
  // Dark background + rounded bottom corners creates the smooth arch
  // that joins the dark hero to the light body WITHOUT any overlap.
  curveConnector: {
    height: S(28),
    backgroundColor: C.heroBg,
    borderBottomLeftRadius: S(28),
    borderBottomRightRadius: S(28),
    // Shadow so it floats slightly above the light body
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: S(8),
  },

  // ── Light body ────────────────────────────────────────────────────────
  // Sits flush BELOW the curveConnector — no negative margin, no overlap
  body: {
    backgroundColor: Colors.bg,
    paddingHorizontal: S(16),
    paddingTop: S(20),
    paddingBottom: S(40),
    flex: 1,
  },

  // ── Contact card ──────────────────────────────────────────────────────
  contactCard: {
    backgroundColor: Colors.homebg,
    borderRadius: S(16),
    paddingHorizontal: S(16),
    paddingVertical: S(4),
    marginBottom: S(24),
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: S(8),
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: S(13),
  },
  contactIconBox: {
    width: S(40), height: S(40), borderRadius: S(12),
    justifyContent: "center", alignItems: "center",
    marginRight: S(12), borderWidth: 1,
  },
  contactInfo: { flex: 1 },
  contactLabel: {
    fontSize: S(9), fontFamily: Fonts.Bold,
    color: C.subText, letterSpacing: 0.8,
    marginBottom: S(3), includeFontPadding: false,
  },
  contactValue: {
    fontSize: S(14), fontFamily: Fonts.Bold,
    color: C.heading, includeFontPadding: false, lineHeight: S(20),
  },
  contactAction: { padding: S(6) },
  divider: { height: 1, backgroundColor: C.border, marginLeft: S(52) },

  // ── Quick help ────────────────────────────────────────────────────────
  sectionTitle: {
    fontSize: S(10), fontFamily: Fonts.Bold,
    color: C.subText, letterSpacing: 1.2,
    marginBottom: S(12), includeFontPadding: false,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: S(12),
    marginBottom: S(28),
  },
  quickCard: {
    width: "47%",
    backgroundColor: Colors.homebg,
    borderRadius: S(14),
    padding: S(14),
    borderTopWidth: 3,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: S(6),
  },
  quickIconBox: {
    width: S(38), height: S(38), borderRadius: S(11),
    justifyContent: "center", alignItems: "center",
    marginBottom: S(9),
  },
  quickTitle: {
    fontSize: S(13), fontFamily: Fonts.Bold,
    color: C.heading, marginBottom: S(3), includeFontPadding: false,
  },
  quickSub: {
    fontSize: S(10), color: C.subText,
    lineHeight: S(14), fontFamily: Fonts.Medium,
  },

  // ── Action buttons ────────────────────────────────────────────────────
  btnGroup: { gap: S(12) },
  callBtn: {
    paddingVertical: S(15),
    borderRadius: S(14),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S(9),
    elevation: 4,
    shadowColor: C.accent,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: S(8),
  },
  callTxt: {
    color: C.heroBg, fontSize: S(15),
    fontFamily: Fonts.Bold, letterSpacing: 0.3,
  },
  emailBtn: {
    backgroundColor: C.cardBg,
    borderWidth: 1.5, borderColor: C.border,
    paddingVertical: S(15),
    borderRadius: S(14),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S(9),
  },
  emailTxt: {
    color: C.heading, fontSize: S(15),
    fontFamily: Fonts.Bold, letterSpacing: 0.3,
  },
});