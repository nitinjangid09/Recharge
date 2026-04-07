import { get } from "react-native/Libraries/NativeComponent/NativeComponentRegistry";

const Colors = {
  // Core Theme Colors (Gold/Black/White)
  primary: "#000000",      // Main Actions, Headings, Icons (Black)
  secondary: "#FAF3E1",    // Secondary Backgrounds (Beige)
  accent: "#FF6D1F",       // Focus states, Links, Cursors (Black)

  // Backgrounds
  background_gradient: ["#F5E7C6", "#F5E7C6"], // Main Screen Background (Solid Gold)


  // Cards, Sheets
  white: "#FFFFFF",

  get black() { return this.primary; },
  get surface() { return this.secondary; },
  homebg: "#F5E7C6",
  homeSecondry: "#ffebbcf6",
  // Typography
  text_primary: "#000000",
  get text_primary() { return this.primary; },
  text_secondary: "#777777",
  text_placeholder: "#888888",

  get text_white() { return this.white; },
  get text_link() { return this.primary; },

  // Buttons & Inputs
  get button_bg() { return this.primary; },
  get button_text() { return this.white; },

  input_bg: "#fcecc8ff", // Clean white input
  input_border: "rgba(0,0,0,0.1)",
  input_border_focus: "#000000",

  // Elements
  icon_primary: "#000000",
  icon_secondary: "#777777",
  divider: "rgba(0,0,0,0.1)",
  border: "rgba(0,0,0,0.1)",
  shadow: "rgba(0,0,0,0.1)",
  circle_bg: "rgba(255, 255, 255, 0.29)", // Decorative circles

  // Finance Specific (Gradients)
  finance_card_1: ["#fde4a8ff", "#FAF3E1", "#fde4a8ff"],
  finance_card_2: ["#fde4a8ff", "#faeac6ff", "#fde4a8ff"],
  finance_chip: "#FAF3E1",

  // Finance Home Specific
  finance_bg_1: "#FAF3E1",
  finance_bg_2: "#F5E7C6",
  finance_accent: "#d4b06a", // Gold
  finance_text: "#222222",   // Dark Grey/Black

  gray_9E: "#9E9E9E",
  gray_F0: "#F0F0F0",
  gray_FA: "#FAFAFA",
  gray_EB: "#EBEBEB",
  gray_E0: "#E0E0E0",
  gray_21: "#212121",
  gray_75: "#757575",
  gray_BD: "#BDBDBD",
  gray_F4: "#F4F4F4",
  gray_66: "#666",
  gray_F5: "#F5F5F5",

  red_E5: "#E53935",

  bg_F8: "#F8F9FC",

  blackOpacity_45: "rgba(0,0,0,0.45)",
  whiteOpacity_65: "rgba(255,255,255,0.65)",
  whiteOpacity_10: "rgba(255,255,255,0.1)",
  whiteOpacity_18: "rgba(255,255,255,0.18)",
  whiteOpacity_80: "rgba(255,255,255,0.8)",

  bg: "#FAF3E1",

  gray: "#888888",
  lightGray: "#e6e6e6",

  lightPrimary: "#4682B4",

  // constants/Colors.js — verify these keys exist:
  finance_accent: "#D4B06A",  // ← must not be undefined
  finance_success: "#22C55E",
  finance_error: "#EF4444",
  finance_text: "#1A1A2E",
  finance_bg_1: "#F7F8FA",
  finance_chip: "#FFF3D6",
  primary: "#1A1A2E",
  white: "#FFFFFF",
  black: "#000000",
  // --- Account & Profile (Camlenio Premium) ---
  ink: "#0F0E0D",
  ink2: "#3A3835",
  ink3: "#7A756E",
  ink4: "#B5AFA7",
  ink5: "#E2DDD8",
  surface2: "#F4F2EE",
  surface3: "#EDE9E3",
  amber: "#C96A00",
  amber2: "#E07A00",
  amberBg: "rgba(201,106,0,0.07)",
  amberRing: "rgba(201,106,0,0.18)",
  redBg: "rgba(193,59,59,0.07)",
  greenBg: "rgba(26,127,90,0.07)",
  heroStart: "#0F0E0D",
  heroEnd: "#211F1C",

  // --- Activate Account / Hub ---
  hub_orange: '#F4722B',
  hub_orangeGlow: 'rgba(244,114,43,0.18)',
  hub_orangeSoft: '#FFF1E8',
  hub_orangeBorder: 'rgba(244,114,43,0.25)',
  hub_green: '#22C55E',
  hub_greenSoft: '#F0FDF4',
  hub_greenGlow: 'rgba(34,197,94,0.15)',
  hub_bg: '#FAF8F4',
  hub_white: '#FFFFFF',
  hub_dark: '#141414',
  hub_border: '#E8EDF2',
  hub_muted: '#F1F5F9',
  hub_slate: '#64748B',
  hub_slateLight: '#94A3B8',
  hub_lightText: '#CBD5E1',
  hub_red: '#EF4444',
  hub_redSoft: '#FFF5F5',
  hub_heroFrom: '#1a0a02',
  hub_heroTo: '#2d1000',
  hub_hubDark: '#0F172A',
  hub_hubIndigo: '#4F46E5',
  hub_hubIndigoGlow: 'rgba(79, 70, 229, 0.15)',
  hub_hubSky: '#0EA5E9',
  hub_hubSkyGlow: 'rgba(14, 165, 233, 0.15)',

  // --- Offline KYC ---
  kyc_accent: "#C9A84C",
  kyc_accentLight: "#F5E7C6",
  kyc_accentDark: "#7A6020",
  kyc_success: "#16A34A",
  kyc_error: "#DC2626",
  kyc_warning: "#D97706",
  kyc_text: "#111827",
  kyc_textSub: "#6B7280",
  kyc_textMuted: "#9CA3AF",
  kyc_bg: "#F4F5F7",
  kyc_surface: "#FFFFFF",
  kyc_border: "#E5E7EB",
  kyc_inputBg: "#FAFAFA",
  kyc_lockedBg: "#F3F4F6",
  kyc_lockedBorder: "#D1D5DB",
  kyc_lockedText: "#6B7280",
};

export default Colors;
