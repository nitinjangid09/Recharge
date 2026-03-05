import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Animated,
  Dimensions,
  Easing
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../constants/Colors";

const { width, height } = Dimensions.get("window");
const scale = width / 375;

export default function CustomAlert({
  visible,
  title,
  message,
  onClose
}) {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 6,
          tension: 60,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      statusBarTranslucent={true}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />

        <Animated.View
          style={[
            styles.alertBox,
            {
              transform: [{ scale: scaleAnim }],
              opacity: fadeAnim
            }
          ]}
        >
          {/* Icon Circle */}
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name="alert" size={32 * scale} color="#fff" />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>

          <TouchableOpacity
            style={styles.button}
            onPress={onClose}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonText}>Okay, Got it</Text>
            <MaterialCommunityIcons name="arrow-right" size={16 * scale} color="#fff" style={{ marginLeft: 5 }} />
          </TouchableOpacity>

        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  backdrop: {
    position: 'absolute',
    width: width,
    height: height + 50, // Cover status bar
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  alertBox: {
    width: width * 0.85,
    backgroundColor: "#fff",
    borderRadius: 24 * scale,
    paddingHorizontal: 24 * scale,
    paddingVertical: 32 * scale,
    alignItems: "center",
    elevation: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
  },
  iconCircle: {
    width: 64 * scale,
    height: 64 * scale,
    borderRadius: 32 * scale,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20 * scale,
    shadowColor: Colors.accent,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8
  },
  title: {
    fontSize: 20 * scale,
    fontWeight: "800",
    marginBottom: 10 * scale,
    color: Colors.primary,
    textAlign: 'center'
  },
  message: {
    fontSize: 14 * scale,
    color: Colors.gray,
    textAlign: "center",
    marginBottom: 28 * scale,
    lineHeight: 22 * scale,
    paddingHorizontal: 10 * scale
  },
  button: {
    backgroundColor: Colors.accent,
    paddingVertical: 14 * scale,
    width: '100%',
    borderRadius: 16 * scale,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16 * scale
  }
});
