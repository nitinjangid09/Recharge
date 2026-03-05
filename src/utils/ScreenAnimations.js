import React, { useRef, useEffect } from "react";
import { Animated, Easing } from "react-native";

/* =========================================================
   REUSABLE WRAPPER COMPONENT
========================================================= */

export const FadeSlideUp = ({ children, duration = 500 }) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [duration]);

  return (
    <Animated.View
      style={{
        flex: 1,
        opacity,
        transform: [{ translateY }],
      }}
    >
      {children}
    </Animated.View>
  );
};

/* =========================================================
   SCREEN OPEN ANIMATIONS
========================================================= */

export const fadeIn = (value, duration = 500) =>
  Animated.timing(value, {
    toValue: 1,
    duration,
    useNativeDriver: true,
  });

export const slideUp = (value, duration = 500) =>
  Animated.timing(value, {
    toValue: 0,
    duration,
    easing: Easing.out(Easing.ease),
    useNativeDriver: true,
  });

export const slideFromRight = (value, duration = 500) =>
  Animated.timing(value, {
    toValue: 0,
    duration,
    easing: Easing.out(Easing.ease),
    useNativeDriver: true,
  });

export const zoomIn = (value) =>
  Animated.spring(value, {
    toValue: 1,
    friction: 6,
    useNativeDriver: true,
  });

export const bounceIn = (value) =>
  Animated.spring(value, {
    toValue: 1,
    friction: 4,
    tension: 80,
    useNativeDriver: true,
  });

/* =========================================================
   SCREEN CLOSE
========================================================= */

export const fadeOut = (value, duration = 300) =>
  Animated.timing(value, {
    toValue: 0,
    duration,
    useNativeDriver: true,
  });

/* =========================================================
   BUTTON EFFECT
========================================================= */

export const buttonPress = (scaleValue) =>
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
  ]);

/* =========================================================
   MODAL / POPUP
========================================================= */

export const modalOpen = (opacity, scale) =>
  Animated.parallel([
    Animated.timing(opacity, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }),
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      useNativeDriver: true,
    }),
  ]);

export const modalClose = (opacity, scale) =>
  Animated.parallel([
    Animated.timing(opacity, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }),
    Animated.timing(scale, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }),
  ]);

/* =========================================================
   DROPDOWN ANIMATIONS
========================================================= */

/*
  OPTION 1: Smooth Slide + Fade Dropdown
  (Best for dropdown menus)
*/

export const dropdownOpen = (opacity, translateY, duration = 300) =>
  Animated.parallel([
    Animated.timing(opacity, {
      toValue: 1,
      duration,
      useNativeDriver: true,
    }),
    Animated.timing(translateY, {
      toValue: 0,
      duration,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }),
  ]);

export const dropdownClose = (opacity, translateY, duration = 250) =>
  Animated.parallel([
    Animated.timing(opacity, {
      toValue: 0,
      duration,
      useNativeDriver: true,
    }),
    Animated.timing(translateY, {
      toValue: -10,
      duration,
      useNativeDriver: true,
    }),
  ]);

/*
  OPTION 2: Height Expand/Collapse Dropdown
  (For accordion style dropdowns)
  ⚠ useNativeDriver must be false for height animation
*/

export const dropdownExpand = (heightValue, toHeight, duration = 300) =>
  Animated.timing(heightValue, {
    toValue: toHeight,
    duration,
    easing: Easing.out(Easing.ease),
    useNativeDriver: false,
  });

export const dropdownCollapse = (heightValue, duration = 250) =>
  Animated.timing(heightValue, {
    toValue: 0,
    duration,
    easing: Easing.in(Easing.ease),
    useNativeDriver: false,
  });