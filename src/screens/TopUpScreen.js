import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Modal,
  Animated,
  Easing,
  Dimensions,
  PanResponder,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  BackHandler,
  Alert,
  ToastAndroid,
  StatusBar,
  PermissionsAndroid,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import RNShare from "react-native-share"; // npm install react-native-share
import Colors from "../constants/Colors";
import Fonts from "../constants/Fonts";
import HeaderBar from "../componets/HeaderBar";
import {
  getRechargeOperatorList,
  getRechargeCircleList,
  verifyRechargeMobile,
  processRecharge,
} from "../api/AuthApi";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import RNHTMLtoPDF from "react-native-html-to-pdf";
import ViewShot from "react-native-view-shot";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────────────────────
//  RECEIPT MODAL
//
//  Layout (top → bottom):
//  ┌─────────────────────────────────────────────┐
//  │  ViewShot ← receiptCardRef                  │  ← CAPTURED (banner + amount + rows + note)
//  │    Gradient banner                          │
//  │    Amount card                              │
//  │    Detail rows card                         │
//  │    Note strip                               │
//  │    14 px spacer                             │
//  └─────────────────────────────────────────────┘
//  ── ACTIONS divider ──                           ← NOT captured
//  [ Download ]  [ Share ]                         ← NOT captured
//  [ Raise Complaint ]                             ← NOT captured
//
//  Share  → capture tmpfile → RNShare.open({ url, message })
//           message = "Hey, I paid ₹X to recharge OP on +91NUM using B2B App"
//  Download → capture base64 → embed in HTML → RNHTMLtoPDF → save PDF
// ─────────────────────────────────────────────────────────────────────────────

function RechargeReceipt({ receiptData, onClose, navigation }) {
  if (!receiptData) return null;

  const isSuccess = receiptData.status === "success";
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);

  // ← wraps ONLY the receipt card; buttons live outside this ref
  const receiptCardRef = useRef(null);

  const dateStr = new Date().toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const opInitial = (receiptData.operator || "?")[0].toUpperCase();

  const bgColor = Colors.homebg || "#F7F8FA";
  const primaryColor = Colors.primary || "#002E6E";
  const accentColor = Colors.finance_accent || "#D4B06A";
  const cardBg = Colors.white || "#FFFFFF";
  const textMain = Colors.finance_text || "#111827";
  const textMuted = Colors.finance_text_light || "#6B7280";

  // ── SHARE: screenshot of receipt card only → share as image (Paytm-style) ─
  const handleShare = async () => {
    try {
      setSharing(true);

      // 1. Capture ONLY the receipt card (banner + amount + rows + note).
      //    result: "tmpfile" writes a real PNG to the temp dir and returns file:// URI.
      //    Buttons are OUTSIDE ViewShot so they will NOT appear in the image.
      const uri = await receiptCardRef.current.capture({
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      // 2. B2B caption — pre-fills message field in WhatsApp, Telegram, etc.
      const shareMessage =
        `Hey, I paid ₹${receiptData.amount} to recharge ${receiptData.operator}` +
        ` on +91${receiptData.mobile} using B2B App`;

      // 3. Open native share sheet with image + caption below it
      await RNShare.open({
        url: `file://${uri}`,
        type: "image/png",
        message: shareMessage,   // caption below image in WhatsApp etc.
        title: shareMessage,   // subject line for email
        failOnCancel: false,
      });

    } catch (err) {
      // User dismissed the sheet → silent.  Any real error → text-only fallback.
      if (err?.message && !err.message.includes("cancel") && !err.message.includes("dismiss")) {
        try {
          await RNShare.open({
            message:
              `Hey, I paid ₹${receiptData.amount} to recharge ${receiptData.operator}` +
              ` on +91${receiptData.mobile} using B2B App`,
            failOnCancel: false,
          });
        } catch (_) { }
      }
    } finally {
      setSharing(false);
    }
  };

  // ── DOWNLOAD: same ref, different result format → base64 → HTML → PDF ────

  const handleRaiseComplaint = () => {
    onClose();
    navigation.navigate("FaqSupportScreen", {
      txn_ref: receiptData.txn_ref || "N/A",
      mobile: receiptData.mobile,
      operator: receiptData.operator,
      amount: receiptData.amount,
      status: receiptData.status,
      message: receiptData.message,
    });
  };

  const rows = [
    { label: "Mobile Number", value: receiptData.mobile },
    { label: "Operator", value: `${receiptData.operator} (Prepaid)` },
    { label: "Payment Mode", value: "Main Wallet" },
    ...(receiptData.txn_ref && receiptData.txn_ref !== "N/A"
      ? [{ label: "Transaction ID", value: receiptData.txn_ref, small: true }]
      : []),
    {
      label: "Status",
      isStatusPill: true,
      value: isSuccess ? "Success" : "Failed",
      color: isSuccess ? "#16A34A" : "#DC2626",
    },
  ];

  return (
    <Modal visible={!!receiptData} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[rc.overlay, { backgroundColor: "rgba(0,0,0,0.52)" }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        {/* ── Outer sheet: plain View — NOT a ViewShot ── */}
        <View style={[rc.sheet, { backgroundColor: bgColor }]}>

          {/* ╔═══════════════════════════════════════════════════════════╗
              ║  ViewShot boundary starts here                            ║
              ║  Everything inside is captured when Share/Download fires  ║
              ╚═══════════════════════════════════════════════════════════╝ */}
          <ViewShot
            ref={receiptCardRef}
            options={{ format: "png", quality: 1 }}
            style={{ backgroundColor: bgColor }}
          >

            {/* ── Gradient banner ── */}
            <LinearGradient
              colors={isSuccess ? ["#16A34A", "#22A06B"] : ["#DC2626", "#E53935"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={rc.banner}
            >
              <View style={rc.blob1} />
              <View style={rc.blob2} />
              <View style={rc.iconRing}>
                <Icon
                  name={isSuccess ? "check-circle-outline" : "close-circle-outline"}
                  size={36}
                  color="#FFF"
                />
              </View>
              <Text style={rc.bannerTitle}>
                {receiptData.message || (isSuccess ? "Recharge Successful" : "Recharge Failed")}
              </Text>
              <Text style={rc.bannerDate}>{dateStr}</Text>
            </LinearGradient>

            {/* ── Amount + operator badge ── */}
            <View style={[rc.amountCard, { backgroundColor: cardBg }]}>
              <View>
                <Text style={[rc.amountLbl, { color: textMuted }]}>AMOUNT PAID</Text>
                <Text style={[rc.amountVal, { color: textMain }]}>₹{receiptData.amount}</Text>
              </View>
              <View style={[rc.opBadge, { backgroundColor: accentColor + "18", borderColor: accentColor + "45" }]}>
                <View style={[rc.opCircle, { backgroundColor: accentColor }]}>
                  <Text style={rc.opInitial}>{opInitial}</Text>
                </View>
                <Text style={[rc.opName, { color: textMain }]}>{receiptData.operator}</Text>
              </View>
            </View>

            {/* ── Detail rows ── */}
            <View style={[rc.detailCard, { backgroundColor: cardBg }]}>
              {rows.map((row, i) => (
                <View key={i} style={[rc.row, i < rows.length - 1 && rc.rowBorder]}>
                  <Text style={[rc.rowLbl, { color: textMuted }]}>{row.label}</Text>
                  {row.isStatusPill ? (
                    <View style={[rc.statusPill, { backgroundColor: row.color }]}>
                      <Text style={rc.statusPillTxt}>{row.value.toUpperCase()}</Text>
                    </View>
                  ) : (
                    <Text
                      style={[
                        rc.rowVal,
                        { color: textMain },
                        row.small && { fontSize: 11 },
                        row.valueColor && { color: row.valueColor },
                        row.bold && { fontFamily: Fonts.Bold },
                      ]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                    >
                      {row.value}
                    </Text>
                  )}
                </View>
              ))}
            </View>

            {/* ── Note strip ── */}
            <View
              style={[
                rc.note,
                isSuccess
                  ? { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" }
                  : { backgroundColor: "#FFF8F0", borderColor: "#FED7AA" },
              ]}
            >
              <View style={[rc.noteDot, { backgroundColor: isSuccess ? "#22A06B" : "#E53935" }]} />
              <Text style={[rc.noteTxt, { color: textMain }]} numberOfLines={2}>
                {isSuccess
                  ? "Plan benefits added successfully. Data and calling active."
                  : "Amount debited. Commission plan not configured. Raise a complaint for refund."}
              </Text>
            </View>

            {/* Bottom spacer — ensures note strip isn't clipped in the PNG */}
            <View style={{ height: 14, backgroundColor: bgColor }} />

          </ViewShot>
          {/* ╔═══════════════════════════════════════════════════════════╗
              ║  ViewShot boundary ends here                              ║
              ║  Everything below is NOT included in the captured image   ║
              ╚═══════════════════════════════════════════════════════════╝ */}

          <View style={{ height: 16 }} />

          {/* ── Share (Only on Success) ── */}
          {isSuccess && (
            <View style={rc.btnRow}>
              <TouchableOpacity
                style={[rc.shareBtn, { backgroundColor: accentColor }]}
                activeOpacity={0.85}
                onPress={handleShare}
                disabled={sharing}
              >
                {sharing
                  ? <ActivityIndicator size="small" color="#FFF" style={{ marginRight: 7 }} />
                  : <Icon name="share-variant" size={17} color="#FFF" style={{ marginRight: 7 }} />
                }
                <Text style={[rc.shareTxt, { color: "#FFF" }]}>
                  {sharing ? "Sharing..." : "Share Receipt"}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Raise Complaint (Only on Failure) ── */}
          {!isSuccess && (
            <TouchableOpacity
              style={[rc.complBtn, { borderColor: accentColor + "60", backgroundColor: "#FFF" }]}
              activeOpacity={0.85}
              onPress={handleRaiseComplaint}
            >
              <Icon name="message-alert-outline" size={15} color={accentColor} style={{ marginRight: 7 }} />
              <Text style={[rc.complTxt, { color: accentColor }]}>Raise Complaint</Text>
            </TouchableOpacity>
          )}

        </View>
      </View>
    </Modal>
  );
}

// Receipt StyleSheet
const rc = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden", paddingBottom: 20 },

  banner: { alignItems: "center", paddingTop: 26, paddingBottom: 22, paddingHorizontal: 20, overflow: "hidden" },
  blob1: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.07)", top: -55, right: -45 },
  blob2: { position: "absolute", width: 110, height: 110, borderRadius: 55, backgroundColor: "rgba(255,255,255,0.07)", top: 10, left: -35 },
  iconRing: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  bannerTitle: { fontSize: 16, fontFamily: Fonts.Bold, color: "#FFF", textAlign: "center", marginBottom: 3 },
  bannerDate: { fontSize: 11, fontFamily: Fonts.Medium, color: "rgba(255,255,255,0.72)", textAlign: "center" },

  amountCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 14, marginTop: 14, borderRadius: 14, padding: 14, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4 },
  amountLbl: { fontSize: 9, fontFamily: Fonts.Bold, letterSpacing: 0.8, marginBottom: 3 },
  amountVal: { fontSize: 30, fontFamily: Fonts.Bold },
  opBadge: { flexDirection: "row", alignItems: "center", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  opCircle: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 7 },
  opInitial: { fontSize: 13, fontFamily: Fonts.Bold, color: "#FFF" },
  opName: { fontSize: 12, fontFamily: Fonts.Bold },

  detailCard: { marginHorizontal: 14, marginTop: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 2, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 9 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#F3F4F6" },
  rowLbl: { fontSize: 12, fontFamily: Fonts.Medium, flex: 1 },
  rowVal: { fontSize: 13, fontFamily: Fonts.Bold, textAlign: "right", flex: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusPillTxt: { fontSize: 9, fontFamily: Fonts.Bold, color: "#FFF", letterSpacing: 0.5 },

  note: { flexDirection: "row", alignItems: "center", marginHorizontal: 14, marginTop: 10, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  noteDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8, flexShrink: 0 },
  noteTxt: { flex: 1, fontSize: 11, fontFamily: Fonts.Medium, lineHeight: 16 },

  actRow: { flexDirection: "row", alignItems: "center", marginHorizontal: 14, marginTop: 14, marginBottom: 10 },
  actLine: { flex: 1, height: 1 },
  actLbl: { fontSize: 10, fontFamily: Fonts.Bold, letterSpacing: 1.1, marginHorizontal: 10 },

  btnRow: { marginHorizontal: 14, marginBottom: 10 },
  shareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 12, paddingVertical: 14, elevation: 2, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
  shareTxt: { fontSize: 14, fontFamily: Fonts.Bold },
  complBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginHorizontal: 14, borderRadius: 12, paddingVertical: 13, borderWidth: 1 },
  complTxt: { fontSize: 13, fontFamily: Fonts.Bold },
});

// ─────────────────────────────────────────────────────────────────────────────
//  BottomSheetModal
// ─────────────────────────────────────────────────────────────────────────────

function BottomSheetModal({
  visible, onClose, title,
  searchText, onSearch, searchPlaceholder,
  items, selectedValue, iconName, getLabel, onSelect,
}) {
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const swipePan = useRef(new Animated.Value(0)).current;
  const isClosing = useRef(false);

  useEffect(() => {
    if (visible) {
      isClosing.current = false;
      swipePan.setValue(0);
      translateY.setValue(SCREEN_HEIGHT);
      Animated.parallel([
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4, speed: 14 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(translateY, { toValue: SCREEN_HEIGHT, duration: 260, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 260, useNativeDriver: true }),
      ]).start();
    }
  }, [visible]);

  const swipeResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => g.dy > 5,
      onPanResponderMove: (_, g) => { if (g.dy > 0) swipePan.setValue(g.dy); },
      onPanResponderRelease: (_, g) => {
        if ((g.dy > 80 || g.vy > 0.5) && !isClosing.current) {
          isClosing.current = true;
          Animated.parallel([
            Animated.timing(swipePan, { toValue: SCREEN_HEIGHT, duration: 240, useNativeDriver: true }),
            Animated.timing(backdropOpacity, { toValue: 0, duration: 220, useNativeDriver: true }),
          ]).start(() => { swipePan.setValue(0); onClose(); });
        } else {
          Animated.spring(swipePan, { toValue: 0, useNativeDriver: true, bounciness: 6, speed: 14 }).start();
        }
      },
    })
  ).current;

  const combinedY = Animated.add(translateY, swipePan);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? "box-none" : "none"}>
      <Animated.View
        style={[styles.sheetBackdrop, { opacity: backdropOpacity }]}
        pointerEvents={visible ? "auto" : "none"}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />
      </Animated.View>

      <Animated.View
        style={[styles.bottomSheet, { transform: [{ translateY: combinedY }] }]}
        pointerEvents="auto"
      >
        <View style={styles.sheetHeader} {...swipeResponder.panHandlers}>
          <View style={styles.handleBar} />
          <View style={styles.sheetTitleRow}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={18} color="#666" />
            </TouchableOpacity>
          </View>
          <View style={styles.sheetSearchRow}>
            <Icon name="magnify" size={20} color="#666" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.sheetSearchInput}
              placeholder={searchPlaceholder}
              placeholderTextColor="#BDBDBD"
              value={searchText}
              onChangeText={onSearch}
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={() => onSearch("")}>
                <Icon name="close-circle" size={18} color="#BDBDBD" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {items.length > 0 ? (
            items.map((item, idx) => {
              const label = getLabel(item);
              const isSel = selectedValue === label;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.sheetListItem, isSel && styles.sheetListItemSel]}
                  onPress={() => onSelect(item)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.sheetListIconBox, isSel && styles.sheetListIconBoxSel]}>
                    <Icon name={iconName} size={20} color={isSel ? Colors.finance_accent : "#666"} />
                  </View>
                  <Text style={[styles.sheetListTxt, isSel && styles.sheetListTxtSel]}>{label}</Text>
                  {isSel && (
                    <View style={styles.checkCircle}>
                      <Icon name="check" size={14} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyTxt}>No results found</Text>
            </View>
          )}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  TopUpScreen
// ─────────────────────────────────────────────────────────────────────────────

export default function TopUpScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();

  const [type, setType] = useState("airtime");
  const [mobile, setMobile] = useState("");
  const [operator, setOperator] = useState("");
  const [circle, setCircle] = useState("");
  const [operators, setOperators] = useState([]);
  const [circles, setCircles] = useState([]);
  const [showOperatorModal, setShowOperatorModal] = useState(false);
  const [showCircleModal, setShowCircleModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [amount, setAmount] = useState("199");
  const [operatorCode, setOperatorCode] = useState("");
  const [receiptData, setReceiptData] = useState(null);
  const [completed, setCompleted] = useState(false);

  const [customToast, setCustomToast] = useState({ visible: false, message: "", type: "success" });
  const toastAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const pan = useRef(new Animated.Value(0)).current;
  const trackWidthRef = useRef(0);
  const THUMB_WIDTH = 50;

  useEffect(() => {
    if (route.params?.selectedAmount) setAmount(String(route.params.selectedAmount));
    if (route.params?.mobile) setMobile(route.params.mobile);
    if (route.params?.operator) setOperator(route.params.operator);
    if (route.params?.circle) setCircle(route.params.circle);
    if (route.params?.operatorCode) setOperatorCode(route.params.operatorCode);
  }, [route.params]);

  const showCustomToast = (msg, type = "success") => {
    setCustomToast({ visible: true, message: msg, type });
    Animated.timing(toastAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start(() => {
      setTimeout(() => {
        Animated.timing(toastAnim, { toValue: 0, duration: 300, useNativeDriver: true }).start(() =>
          setCustomToast({ visible: false, message: "", type: "success" })
        );
      }, 2500);
    });
  };

  const showToast = (msg) => {
    if (Platform.OS === "android") ToastAndroid.show(msg, ToastAndroid.SHORT);
    else Alert.alert("Info", msg);
  };

  useEffect(() => {
    Animated.parallel([
      Animated.timing(slideAnim, { toValue: 0, duration: 800, useNativeDriver: true, easing: Easing.out(Easing.exp) }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
    ]).start();
    fetchOperatorCircle();
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (showOperatorModal) { setShowOperatorModal(false); return true; }
      if (showCircleModal) { setShowCircleModal(false); return true; }
      navigation.navigate("FinanceHome");
      return true;
    };
    const handler = BackHandler.addEventListener("hardwareBackPress", backAction);
    return () => handler.remove();
  }, [showOperatorModal, showCircleModal]);

  const fetchOperatorCircle = async () => {
    try {
      setLoading(true);
      const headerToken = await AsyncStorage.getItem("header_token");
      if (headerToken) {
        const opResult = await getRechargeOperatorList({ headerToken });
        if (opResult?.success) setOperators(opResult.data || []);
        const cirResult = await getRechargeCircleList({ headerToken });
        if (cirResult?.success) setCircles(cirResult.data || []);
      }
    } catch (e) {
      console.log("Operator/Circle API error", e);
    } finally {
      setLoading(false);
    }
  };

  const handleRecharge = async () => {
    try {
      setLoading(true);
      const headerToken = await AsyncStorage.getItem("header_token");
      const response = await processRecharge({
        amount: Number(amount), operatorCode, number: mobile,
        billerMode: "prepaidrecharge", headerToken,
      });
      const isSuccess =
        response?.success === true ||
        response?.status === "SUCCESS" ||
        response?.data?.status === "SUCCESS";
      const resData = response?.data || {};

      setReceiptData(
        isSuccess
          ? {
            status: "success",
            amount,
            txn_ref: resData.txn_ref || response.txn_ref || "",
            message: resData.message || response.message || "Recharge Successful",
            mobile,
            operator,
          }
          : {
            status: "error",
            amount,
            txn_ref: resData.txn_ref || response?.txn_ref || "N/A",
            message: resData.message || response?.message || response?.error || "Recharge Failed",
            mobile,
            operator,
          }
      );
    } catch {
      setReceiptData({
        status: "error", amount, txn_ref: "N/A",
        message: "Something went wrong during recharge", mobile, operator,
      });
    } finally {
      setLoading(false);
      setCompleted(false);
      pan.setValue(0);
    }
  };

  const panResponder = React.useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => { pan.setOffset(0); pan.setValue(0); },
        onPanResponderMove: (_, g) => {
          const w = trackWidthRef.current;
          if (w > 0 && g.dx >= 0 && g.dx <= w - THUMB_WIDTH) pan.setValue(g.dx);
        },
        onPanResponderRelease: (_, g) => {
          const w = trackWidthRef.current;
          const snap = () => Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
          if (w > 0 && g.dx >= (w - THUMB_WIDTH) * 0.8) {
            if (mobile.length !== 10) { showCustomToast("Enter 10-digit mobile number", "error"); snap(); return; }
            if (!operator) { showCustomToast("Select Operator", "error"); snap(); return; }
            if (!circle) { showCustomToast("Select Circle", "error"); snap(); return; }
            if (!amount || Number(amount) <= 0) { showCustomToast("Enter valid amount", "error"); snap(); return; }
            Animated.timing(pan, { toValue: w - THUMB_WIDTH, duration: 200, useNativeDriver: false })
              .start(() => { setCompleted(true); handleRecharge(); });
          } else {
            snap();
          }
        },
      }),
    [mobile, operator, circle, amount, operatorCode]
  );

  const handleMobileChange = async (value) => {
    const num = value.replace(/\D/g, "");
    setMobile(num);
    if (num.length < 10) { setOperator(""); setCircle(""); return; }
    if (num.length === 10) {
      try {
        setLoading(true);
        const headerToken = await AsyncStorage.getItem("header_token");
        const result = await verifyRechargeMobile({ mobile: num, headerToken });
        if (result?.success) {
          const fetchedData = result.data || {};
          let currentOps = operators;
          if (currentOps.length === 0) {
            const opsData = await getRechargeOperatorList({ headerToken });
            if (opsData?.success) { currentOps = opsData.data || []; setOperators(currentOps); }
          }
          const matchedOp = currentOps.find(
            (op) =>
              (op.label && fetchedData.operator && op.label.toLowerCase() === fetchedData.operator.toLowerCase()) ||
              (op.rechargeValue && fetchedData.operatorCode && op.rechargeValue.toLowerCase() === fetchedData.operatorCode.toLowerCase()) ||
              (op.planFetchValue && fetchedData.operatorCode && op.planFetchValue.toLowerCase() === fetchedData.operatorCode.toLowerCase())
          );
          const matchedCir = circles.find(
            (c) =>
              String(c.circleCode) === String(fetchedData.circle) ||
              String(c.circlecode) === String(fetchedData.circle)
          );
          const opName = matchedOp?.label || matchedOp?.name || fetchedData.operator || "";
          const cirName = matchedCir?.circleName || matchedCir?.circlename || fetchedData.state || "";
          const opCode = matchedOp?.rechargeValue || fetchedData.operatorCode || "";
          setOperatorCode(opCode); setOperator(opName); setCircle(cirName);
          navigation.navigate("StorePlans", {
            mobile: num, operator: opName, circle: cirName,
            plans: fetchedData.plans || [], operatorCode: opCode,
          });
        } else {
          setOperator(""); setCircle("");
          showCustomToast(result?.message || "Unable to detect operator", "error");
        }
      } catch {
        setOperator(""); setCircle("");
        showToast("Something went wrong");
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <SafeAreaView
      style={[styles.safeArea, { backgroundColor: Colors.finance_bg_1 }]}
      edges={["bottom"]}
    >
      <StatusBar barStyle="dark-content" backgroundColor={Colors.finance_bg_1} translucent={false} />
      <View style={styles.container}>

        <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
          <HeaderBar title="Mobile Recharge" onBack={() => navigation.navigate("FinanceHome")} />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={insets.top + 56}
        >
          <ScrollView
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 20 }}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              style={[
                styles.mainContent,
                { transform: [{ translateY: slideAnim }], opacity: fadeAnim },
              ]}
            >

              {/* MOBILE */}
              <View style={styles.modernCard}>
                <View style={styles.modernCardHeader}>
                  <Text style={styles.modernCardTitle}>Personal Details</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>MOBILE</Text>
                  </View>
                </View>
                <View style={styles.modernInputWrapper}>
                  <Text style={styles.floatingLabel}>Mobile Number</Text>
                  <View style={styles.rowCenter}>
                    <Text style={styles.prefixText}>+91</Text>
                    <TextInput
                      value={mobile}
                      onChangeText={handleMobileChange}
                      placeholder="00000 00000"
                      placeholderTextColor="#AAA"
                      keyboardType="number-pad"
                      maxLength={10}
                      style={styles.bigInput}
                    />
                    <TouchableOpacity style={styles.contactBtnRound}>
                      <Icon name="account-search-outline" size={18} color={Colors.white} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* CONNECTION */}
              <View style={styles.modernCard}>
                <Text style={styles.modernCardTitle}>Connection Details</Text>
                <View style={styles.connectionContainer}>
                  <TouchableOpacity
                    style={styles.connectionRow}
                    activeOpacity={1}
                    onPress={() => operators.length && setShowOperatorModal(true)}
                  >
                    <View style={styles.iconBox}>
                      <Icon name="sim" size={18} color={Colors.finance_accent} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.connectionLabel}>Operator</Text>
                      <Text style={[styles.connectionValues, showOperatorModal && { color: Colors.finance_accent }]}>
                        {operator || "Select Provider"}
                      </Text>
                    </View>
                    <Icon
                      name={showOperatorModal ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={showOperatorModal ? Colors.finance_accent : Colors.finance_text}
                    />
                  </TouchableOpacity>
                  <View style={styles.dividerLine} />
                  <TouchableOpacity
                    style={styles.connectionRow}
                    activeOpacity={1}
                    onPress={() => circles.length && setShowCircleModal(true)}
                  >
                    <View style={styles.iconBox}>
                      <Icon name="map-marker-radius" size={18} color={Colors.finance_accent} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.connectionLabel}>Circle</Text>
                      <Text style={[styles.connectionValues, showCircleModal && { color: Colors.finance_accent }]}>
                        {circle || "Select Circle"}
                      </Text>
                    </View>
                    <Icon
                      name={showCircleModal ? "chevron-up" : "chevron-down"}
                      size={20}
                      color={showCircleModal ? Colors.finance_accent : Colors.finance_text}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* AMOUNT */}
              <View style={styles.premiumAmountCard}>
                <View style={styles.typeSelector}>
                  {["airtime", "special"].map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.typeBtn, type === t && styles.typeBtnActive]}
                      onPress={() => setType(t)}
                    >
                      <Text style={[styles.typeText, type === t && styles.typeTextActive]}>
                        {t === "airtime" ? "Topup" : "Special Plans"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.amountHeader}>Pick or Enter Amount</Text>
                <View style={styles.amountInputRow}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    value={amount}
                    onChangeText={(val) => setAmount(val.replace(/[^0-9]/g, ""))}
                    placeholder="0"
                    placeholderTextColor="rgba(212,176,106,0.3)"
                    keyboardType="numeric"
                    style={styles.hugeInput}
                  />
                </View>
                <View style={styles.suggestionsWrapper}>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.suggestionsContainer}
                  >
                    {["199", "299", "499", "666", "849"].map((val) => (
                      <TouchableOpacity
                        key={val}
                        style={[styles.suggestionChip, amount === val && styles.suggestionChipActive]}
                        onPress={() => setAmount(val)}
                      >
                        <Text style={[styles.suggestionText, amount === val && styles.suggestionTextActive]}>
                          ₹{val}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
                <TouchableOpacity
                  style={styles.viewPlansBtn}
                  onPress={async () => {
                    if (mobile.length !== 10) { showCustomToast("Enter 10-digit mobile number", "error"); return; }
                    if (!operator) { showCustomToast("Select Operator", "error"); return; }
                    if (!circle) { showCustomToast("Select Circle", "error"); return; }
                    try {
                      setLoading(true);
                      const headerToken = await AsyncStorage.getItem("header_token");
                      const result = await verifyRechargeMobile({ mobile, headerToken });
                      if (result?.success) {
                        navigation.navigate("StorePlans", {
                          mobile, operator, circle,
                          plans: result.data?.plans || [], operatorCode,
                        });
                      } else {
                        showCustomToast(result?.message || "Unable to load plans", "error");
                      }
                    } catch {
                      showCustomToast("Something went wrong", "error");
                    } finally {
                      setLoading(false);
                    }
                  }}
                >
                  <LinearGradient
                    colors={[Colors.finance_accent, "#E0C38C"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.viewPlansGradient}
                  >
                    <Text style={styles.viewPlansText}>Explore All Plans</Text>
                    <Icon name="notebook-outline" size={18} color={Colors.black} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>

            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* SWIPE TO RECHARGE */}
        <View style={styles.actionContainer}>
          {!completed ? (
            <View
              style={styles.sliderWrapper}
              onLayout={(e) => { trackWidthRef.current = e.nativeEvent.layout.width; }}
            >
              <Animated.View
                style={[
                  styles.sliderBackground,
                  {
                    opacity: pan.interpolate({
                      inputRange: [0, 100], outputRange: [1, 0.5], extrapolate: "clamp",
                    }),
                  },
                ]}
              >
                <Text style={styles.swipeText}>SWIPE TO RECHARGE</Text>
              </Animated.View>
              <Animated.View
                style={[styles.sliderThumb, { transform: [{ translateX: pan }] }]}
                {...panResponder.panHandlers}
              >
                <LinearGradient colors={[Colors.finance_accent, "#b8944d"]} style={styles.thumbGrad}>
                  <Icon name="chevron-right" size={28} color={Colors.white} />
                </LinearGradient>
              </Animated.View>
            </View>
          ) : (
            <LinearGradient
              colors={[Colors.finance_accent, "#b8944d"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.processingBtn}
            >
              <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: 10 }} />
              <Text style={styles.processingText}>PROCESSING...</Text>
            </LinearGradient>
          )}
        </View>

      </View>

      {/* OPERATOR BOTTOM SHEET */}
      <BottomSheetModal
        visible={showOperatorModal}
        onClose={() => { setShowOperatorModal(false); setSearchText(""); }}
        title="Select Provider"
        searchText={searchText}
        onSearch={setSearchText}
        searchPlaceholder="Search Operator..."
        items={operators.filter((op) =>
          (op.label || op.name || "").toLowerCase().includes(searchText.toLowerCase())
        )}
        selectedValue={operator}
        iconName="sim"
        getLabel={(op) => op.label || op.name}
        onSelect={(op) => {
          setOperator(op.label || op.name);
          setOperatorCode(op.rechargeValue || "");
          setShowOperatorModal(false);
          setSearchText("");
        }}
      />

      {/* CIRCLE BOTTOM SHEET */}
      <BottomSheetModal
        visible={showCircleModal}
        onClose={() => { setShowCircleModal(false); setSearchText(""); }}
        title="Select Circle"
        searchText={searchText}
        onSearch={setSearchText}
        searchPlaceholder="Search Circle..."
        items={circles.filter((c) =>
          (c.circleName || c.circlename || "").toLowerCase().includes(searchText.toLowerCase())
        )}
        selectedValue={circle}
        iconName="map-marker-radius"
        getLabel={(c) => c.circleName || c.circlename}
        onSelect={(c) => {
          setCircle(c.circleName || c.circlename);
          setShowCircleModal(false);
          setSearchText("");
        }}
      />

      {/* FULL SCREEN LOADER */}
      {loading && (
        <View style={styles.fullLoader}>
          <ActivityIndicator size="large" color={Colors.finance_accent} />
        </View>
      )}

      {/* CUSTOM TOAST */}
      {customToast.visible && (
        <Animated.View
          style={[
            styles.customToastBox,
            {
              opacity: toastAnim,
              transform: [
                {
                  translateY: toastAnim.interpolate({
                    inputRange: [0, 1], outputRange: [-40, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={
              customToast.type === "success" ? ["#4CAF50", "#2E7D32"] : ["#F44336", "#C62828"]
            }
            style={styles.customToastGrad}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Icon
              name={customToast.type === "success" ? "check-circle" : "alert-circle"}
              size={20}
              color={Colors.white}
            />
            <Text style={styles.customToastText}>{customToast.message}</Text>
          </LinearGradient>
        </Animated.View>
      )}

      {/* RECEIPT MODAL */}
      <RechargeReceipt
        receiptData={receiptData}
        onClose={() => setReceiptData(null)}
        navigation={navigation}
      />

    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  STYLES
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.homebg },
  container: { flex: 1, backgroundColor: Colors.homebg },
  headerWrapper: { backgroundColor: Colors.homebg },
  mainContent: { paddingHorizontal: 12, paddingBottom: 14 },

  modernCard: { backgroundColor: Colors.bg, borderRadius: 16, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "rgba(212,176,106,0.15)" },
  modernCardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  modernCardTitle: { fontSize: 12, fontFamily: Fonts.Bold, color: Colors.primary },
  badge: { backgroundColor: Colors.finance_bg_2, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: Colors.finance_accent },
  badgeText: { fontSize: 9, fontFamily: Fonts.Bold, color: Colors.finance_accent },
  modernInputWrapper: { borderBottomWidth: 1, borderBottomColor: Colors.primary, paddingBottom: 4 },
  floatingLabel: { fontSize: 10, color: Colors.primary, fontFamily: Fonts.Medium, marginBottom: 2 },
  rowCenter: { flexDirection: "row", alignItems: "center" },
  prefixText: { fontSize: 16, fontFamily: Fonts.Medium, color: "#AAA", marginRight: 8 },
  bigInput: { flex: 1, fontSize: 18, fontFamily: Fonts.Bold, color: Colors.finance_text, padding: 0, height: 34 },
  contactBtnRound: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.finance_accent, alignItems: "center", justifyContent: "center" },

  connectionContainer: { backgroundColor: Colors.white, borderRadius: 14, borderWidth: 1, borderColor: Colors.lightGray, marginTop: 5, overflow: "hidden" },
  connectionRow: { flexDirection: "row", alignItems: "center", padding: 10 },
  iconBox: { width: 30, height: 30, borderRadius: 8, backgroundColor: Colors.white, alignItems: "center", justifyContent: "center" },
  connectionLabel: { fontSize: 9, fontFamily: Fonts.Bold, color: "#777", textTransform: "uppercase" },
  connectionValues: { fontSize: 12, fontFamily: Fonts.Medium, color: "#000", marginTop: 2 },
  dividerLine: { height: 1, backgroundColor: "#EEE", marginHorizontal: 14 },

  premiumAmountCard: { backgroundColor: "#1A1A1A", borderRadius: 20, padding: 14, marginBottom: 14, borderWidth: 1.5, borderColor: "rgba(212,176,106,0.4)" },
  typeSelector: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 12, padding: 3, marginBottom: 12 },
  typeBtn: { flex: 1, paddingVertical: 8, alignItems: "center", borderRadius: 10 },
  typeBtnActive: { backgroundColor: "rgba(212,176,106,0.2)", borderWidth: 1, borderColor: "rgba(212,176,106,0.5)" },
  typeText: { fontSize: 11, fontFamily: Fonts.Medium, color: "rgba(255,255,255,0.4)" },
  typeTextActive: { color: Colors.finance_accent, fontFamily: Fonts.Bold },
  amountHeader: { fontSize: 10, color: "rgba(255,255,255,0.6)", fontFamily: Fonts.Medium, textTransform: "uppercase", letterSpacing: 1, textAlign: "center", marginBottom: 8 },
  amountInputRow: { flexDirection: "row", alignItems: "center", marginBottom: 12, backgroundColor: "rgba(255,255,255,0.05)", borderRadius: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", paddingVertical: 8, paddingHorizontal: 14 },
  currencySymbol: { fontSize: 20, fontFamily: Fonts.Bold, color: Colors.finance_accent, marginRight: 8 },
  hugeInput: { flex: 1, fontSize: 28, fontFamily: Fonts.Bold, color: "#FFFFFF", padding: 0 },
  suggestionsWrapper: { marginBottom: 12 },
  suggestionsContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  suggestionChip: { backgroundColor: "rgba(255,255,255,0.05)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  suggestionChipActive: { backgroundColor: "rgba(212,176,106,0.2)", borderColor: Colors.finance_accent },
  suggestionText: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontFamily: Fonts.Medium },
  suggestionTextActive: { color: Colors.finance_accent, fontFamily: Fonts.Bold },
  viewPlansBtn: { borderRadius: 14, overflow: "hidden" },
  viewPlansGradient: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 10 },
  viewPlansText: { color: Colors.black, fontFamily: Fonts.Bold, fontSize: 14 },

  actionContainer: { padding: 12, backgroundColor: Colors.homebg, borderTopWidth: 1, borderTopColor: "rgba(212,176,106,0.1)" },
  sliderWrapper: { height: 60, backgroundColor: Colors.white, borderRadius: 30, borderWidth: 1.5, borderColor: Colors.finance_accent, justifyContent: "center", overflow: "hidden" },
  sliderBackground: { ...StyleSheet.absoluteFillObject, justifyContent: "center", alignItems: "center" },
  swipeText: { color: Colors.finance_accent, fontSize: 14, fontFamily: Fonts.Bold, letterSpacing: 2 },
  sliderThumb: { width: 52, height: 52, borderRadius: 26, position: "absolute", left: 4 },
  thumbGrad: { width: 52, height: 52, borderRadius: 26, alignItems: "center", justifyContent: "center" },
  processingBtn: { height: 60, borderRadius: 30, flexDirection: "row", alignItems: "center", justifyContent: "center" },
  processingText: { color: Colors.white, fontFamily: Fonts.Bold, fontSize: 14, letterSpacing: 1 },

  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.48)" },
  bottomSheet: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: "75%", borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: "rgba(0,0,0,0.08)", overflow: "hidden" },
  sheetHeader: { paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: "#F0F0F0", paddingTop: 4 },
  handleBar: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#E0E0E0", alignSelf: "center", marginTop: 10, marginBottom: 10 },
  sheetTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sheetTitle: { fontSize: 15, fontFamily: Fonts.Bold, color: "#333" },
  closeBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: "#F4F4F4", alignItems: "center", justifyContent: "center" },
  sheetSearchRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#F5F5F5", borderRadius: 10, paddingHorizontal: 10, marginBottom: 4, height: 40 },
  sheetSearchInput: { flex: 1, fontSize: 13, fontFamily: Fonts.Medium, color: "#212121", padding: 0 },
  sheetListItem: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#F5F5F5" },
  sheetListItemSel: { backgroundColor: Colors.finance_accent + "15" },
  sheetListIconBox: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#F5F5F5", alignItems: "center", justifyContent: "center", marginRight: 10 },
  sheetListIconBoxSel: { backgroundColor: Colors.finance_accent + "25" },
  sheetListTxt: { flex: 1, fontSize: 13, fontFamily: Fonts.Medium, color: "#212121" },
  sheetListTxtSel: { color: Colors.finance_accent, fontFamily: Fonts.Bold },
  checkCircle: { width: 20, height: 20, borderRadius: 10, backgroundColor: Colors.finance_accent, alignItems: "center", justifyContent: "center" },
  emptyWrap: { alignItems: "center", paddingVertical: 30 },
  emptyTxt: { color: "#BDBDBD", fontSize: 13, fontFamily: Fonts.Medium },

  customToastBox: { position: "absolute", top: 60, left: 20, right: 20, zIndex: 9999 },
  customToastGrad: { flexDirection: "row", alignItems: "center", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, gap: 10 },
  customToastText: { color: "#FFF", fontFamily: Fonts.Bold, fontSize: 13, flex: 1 },
  fullLoader: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.7)", justifyContent: "center", alignItems: "center", zIndex: 1000 },
});
