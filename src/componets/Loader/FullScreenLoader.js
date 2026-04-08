import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Easing,
} from "react-native";
import Colors from "../constants/Colors";

const FullScreenLoader = ({ visible, label = "Loading..." }) => {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.loop(
        Animated.timing(spin, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    } else {
      spin.stopAnimation();
      spin.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  return (
    <View style={styles.overlay} pointerEvents="box-only">
      <View style={styles.card}>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <View style={styles.ring}>
            <View style={styles.innerRing} />
          </View>
        </Animated.View>
        <Text style={styles.label}>{label}</Text>
      </View>
    </View>
  );
};

export default FullScreenLoader;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.blackOpacity_45 || "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 9999,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    paddingVertical: 36,
    paddingHorizontal: 44,
    alignItems: "center",
    elevation: 24,
    shadowColor: Colors.black,
    shadowOpacity: 0.18,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    gap: 16,
  },
  ring: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 4,
    borderColor: Colors.primary,
    borderTopColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  innerRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: Colors.finance_accent + "88",
    borderBottomColor: "transparent",
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.slate_700 || "#334155",
    letterSpacing: 0.3,
  },
});
