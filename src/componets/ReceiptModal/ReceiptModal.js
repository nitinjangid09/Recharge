import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
} from "react-native";
import LinearGradient from "react-native-linear-gradient";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
import RNShare from "react-native-share";
import ViewShot from "react-native-view-shot";
import Colors from "../../constants/Colors";
import Fonts from "../../constants/Fonts";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * Generic Receipt Modal
 * 
 * Props:
 * - visible: boolean
 * - onClose: () => void
 * - navigation: react-navigation object (for help navigation)
 * - data: {
 *     status: "success" | "failed" | "pending",
 *     title: string,
 *     amount: string | number,
 *     date: string,
 *     subTitle?: string,
 *     details: Array<{ label: string, value: string, small?: boolean, isStatusPill?: boolean, color?: string }>,
 *     note?: string,
 *     operator?: string, // optional for recharge-style badge
 *     mobile?: string,   // optional for sharing caption
 *     txn_ref?: string,  // for help navigation
 *   }
 */
const ReceiptModal = ({ visible, onClose, navigation, data }) => {
  const [sharing, setSharing] = useState(false);
  const receiptCardRef = useRef(null);

  if (!visible && !data) return null;

  const isSuccess = data?.status === "success" || data?.status === "SUCCESS";
  
  const dateStr = data?.date || new Date().toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });

  const opInitial = (data?.operator || data?.title || "?")[0].toUpperCase();

  const handleShare = async () => {
    if (!data) return;
    try {
      setSharing(true);
      const uri = await receiptCardRef.current.capture({
        format: "png",
        quality: 1,
        result: "tmpfile",
      });

      const shareMessage =
        `Payment of ₹${data.amount} ${isSuccess ? 'successful' : 'failed'}` +
        (data.mobile ? ` for ${data.mobile}` : "") +
        ` using B2B App`;

      await RNShare.open({
        url: `file://${uri}`,
        type: "image/png",
        message: shareMessage,
        title: "Transaction Receipt",
        failOnCancel: false,
      });
    } catch (err) {
      if (err?.message && !err.message.includes("cancel") && !err.message.includes("dismiss")) {
        try {
          await RNShare.open({
            message: `Payment of ₹${data.amount} ${isSuccess ? 'successful' : 'failed'} using B2B App`,
            failOnCancel: false,
          });
        } catch (_) { }
      }
    } finally {
      setSharing(false);
    }
  };

  const handleHelp = () => {
    if (!data) return;
    onClose();
    if (navigation) {
      navigation.navigate("FaqSupportScreen", {
        txn_ref: data.txn_ref || "N/A",
        amount: data.amount,
        status: data.status,
        ...data
      });
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      hardwareAccelerated
    >
      {!data ? <View /> : (
      <View style={[styles.overlay, { backgroundColor: Colors.blackOpacity_52 }]}>
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onClose} />

        <View style={[styles.sheet, { backgroundColor: Colors.finance_bg_1 }]}>
          <ViewShot
            ref={receiptCardRef}
            options={{ format: "png", quality: 1 }}
            style={{ backgroundColor: Colors.finance_bg_1 }}
          >
            {/* Banner */}
            <LinearGradient
              colors={isSuccess
                ? [Colors.success || "#22C55E", Colors.success_dark || "#059669"]
                : data.status === "pending" 
                  ? [Colors.amber || "#F59E0B", Colors.amber_dark || "#D97706"]
                  : [Colors.error || "#EF4444", Colors.error_dark || "#DC2626"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.banner}
            >
              <View style={styles.blob1} />
              <View style={styles.blob2} />
              <View style={styles.iconRing}>
                <Icon
                  name={isSuccess ? "check-circle-outline" : data.status === "pending" ? "clock-outline" : "close-circle-outline"}
                  size={36}
                  color={Colors.white}
                />
              </View>
              <Text style={styles.bannerTitle}>{data.title || (isSuccess ? "Transaction Successful" : "Transaction Failed")}</Text>
              <Text style={styles.bannerDate}>{dateStr}</Text>
            </LinearGradient>

            {/* Amount Section */}
            <View style={[styles.amountCard, { backgroundColor: Colors.white }]}>
              <View>
                <Text style={[styles.amountLbl, { color: Colors.finance_text_light }]}>AMOUNT</Text>
                <Text style={[styles.amountVal, { color: Colors.finance_text }]}>₹{data.amount}</Text>
              </View>
              {data.operator && (
                <View style={[styles.opBadge, { backgroundColor: (Colors.finance_accent || "#d4b06a") + "18", borderColor: (Colors.finance_accent || "#d4b06a") + "45" }]}>
                  <View style={[styles.opCircle, { backgroundColor: Colors.finance_accent || "#d4b06a" }]}>
                    <Text style={styles.opInitial}>{opInitial}</Text>
                  </View>
                  <Text style={[styles.opName, { color: Colors.finance_text }]}>{data.operator}</Text>
                </View>
              )}
            </View>

            {/* Description / Subtitle */}
            {data.subTitle && (
                <View style={[styles.subTitleCard, { backgroundColor: Colors.white }]}>
                    <Text style={styles.subTitleTxt}>{data.subTitle}</Text>
                </View>
            )}

            {/* Detail rows */}
            <View style={[styles.detailCard, { backgroundColor: Colors.white }]}>
              {data.details && data.details.map((row, i) => (
                <View key={i} style={[styles.row, i < data.details.length - 1 && styles.rowBorder]}>
                  <Text style={[styles.rowLbl, { color: Colors.finance_text_light }]}>{row.label}</Text>
                  {row.isStatusPill ? (
                    <View style={[styles.statusPill, { backgroundColor: row.color || Colors.primary }]}>
                      <Text style={styles.statusPillTxt}>{row.value.toUpperCase()}</Text>
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.rowVal,
                        { color: Colors.finance_text },
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

            {/* Note */}
            {data?.note && (
              <View style={[styles.note, isSuccess ? { backgroundColor: Colors.successOpacity_10, borderColor: Colors.success_ring } : { backgroundColor: Colors.warningOpacity_10, borderColor: Colors.warningOpacity_30 }]}>
                <View style={[styles.noteDot, { backgroundColor: isSuccess ? Colors.success : Colors.error }]} />
                <Text style={[styles.noteTxt, { color: Colors.finance_text }]} numberOfLines={2}>{data.note}</Text>
              </View>
            )}

            <View style={{ height: 14, backgroundColor: Colors.finance_bg_1 }} />
          </ViewShot>

          <View style={{ height: 16 }} />

          {/* Share/Action Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={[styles.shareBtn, { backgroundColor: Colors.finance_accent || "#d4b06a" }]}
              activeOpacity={0.85}
              onPress={handleShare}
              disabled={sharing}
            >
              {sharing
                ? <ActivityIndicator size="small" color={Colors.white} style={{ marginRight: 7 }} />
                : <Icon name="share-variant" size={17} color={Colors.white} style={{ marginRight: 7 }} />
              }
              <Text style={[styles.shareTxt, { color: Colors.white }]}>
                {sharing ? "Sharing..." : "Share Receipt"}
              </Text>
            </TouchableOpacity>

            {!isSuccess && (
                <TouchableOpacity
                style={[styles.complBtn, { borderColor: (Colors.finance_accent || "#d4b06a") + "60", backgroundColor: Colors.white, marginTop: 10 }]}
                activeOpacity={0.85}
                onPress={handleHelp}
                >
                <Icon name="message-alert-outline" size={15} color={Colors.finance_accent || "#d4b06a"} style={{ marginRight: 7 }} />
                <Text style={[styles.complTxt, { color: Colors.finance_accent || "#d4b06a" }]}>Need Help?</Text>
                </TouchableOpacity>
            )}
          </View>
        </View>
        </View>
      )}
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, overflow: "hidden", paddingBottom: 20 },
  banner: { alignItems: "center", paddingTop: 26, paddingBottom: 22, paddingHorizontal: 20, overflow: "hidden" },
  blob1: { position: "absolute", width: 160, height: 160, borderRadius: 80, backgroundColor: "rgba(255,255,255,0.07)", top: -55, right: -45 },
  blob2: { position: "absolute", width: 110, height: 110, borderRadius: 55, backgroundColor: "rgba(255,255,255,0.07)", top: 10, left: -35 },
  iconRing: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  bannerTitle: { fontSize: 16, fontFamily: Fonts.Bold, color: Colors.white, textAlign: "center", marginBottom: 3 },
  bannerDate: { fontSize: 11, fontFamily: Fonts.Medium, color: "rgba(255,255,255,0.72)", textAlign: "center" },
  amountCard: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginHorizontal: 14, marginTop: 14, borderRadius: 14, padding: 14, elevation: 2, shadowColor: Colors.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4 },
  amountLbl: { fontSize: 9, fontFamily: Fonts.Bold, letterSpacing: 0.8, marginBottom: 3 },
  amountVal: { fontSize: 30, fontFamily: Fonts.Bold },
  opBadge: { flexDirection: "row", alignItems: "center", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, borderWidth: 1 },
  opCircle: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 7 },
  opInitial: { fontSize: 13, fontFamily: Fonts.Bold, color: Colors.white },
  opName: { fontSize: 12, fontFamily: Fonts.Bold },
  subTitleCard: { marginHorizontal: 14, marginTop: 10, padding: 12, borderRadius: 10, alignItems: 'center' },
  subTitleTxt: { fontSize: 13, fontFamily: Fonts.Medium, color: Colors.finance_text_light },
  detailCard: { marginHorizontal: 14, marginTop: 10, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 2, elevation: 2, shadowColor: Colors.black, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.07, shadowRadius: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 9 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.slate_50 },
  rowLbl: { fontSize: 12, fontFamily: Fonts.Medium, flex: 1 },
  rowVal: { fontSize: 13, fontFamily: Fonts.Bold, textAlign: "right", flex: 1 },
  statusPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
  statusPillTxt: { fontSize: 9, fontFamily: Fonts.Bold, color: Colors.white, letterSpacing: 0.5 },
  note: { flexDirection: "row", alignItems: "center", marginHorizontal: 14, marginTop: 10, borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  noteDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8, flexShrink: 0 },
  noteTxt: { flex: 1, fontSize: 11, fontFamily: Fonts.Medium, lineHeight: 16 },
  btnRow: { marginHorizontal: 14, marginBottom: 10 },
  shareBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 12, paddingVertical: 14, elevation: 2, shadowColor: Colors.black, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
  shareTxt: { fontSize: 14, fontFamily: Fonts.Bold },
  complBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", borderRadius: 12, paddingVertical: 13, borderWidth: 1 },
  complTxt: { fontSize: 13, fontFamily: Fonts.Bold },
});

export default ReceiptModal; 
