const base = {
  white: "#FFFFFF",
  black: "#000000",
  beige: "#FAF3E1",
  gold: "#F5E7C6",
  gray: "#888888",
  red: "#EF4444",
  green: "#22C55E",
  amber: "#C96A00",
  warning: "#F59E0B",
  indigo: "#6366F1",
  blue: "#2563EB",
  orange: "#F97316",
  emerald: "#10B981",
  slate: "#4B5563",
  ink_main: "#0F0E0D",

  // Standard Shades
  slate_900: "#0F172A",
  slate_700: "#334155",
  slate_500: "#64748B",
  slate_400: "#94A3B8",
  slate_100: "#F1F5F9",
  slate_50: "#F8FAFC",

  gray_77: "#777777",
  gray_FA: "#FAFAFA",
  gray_F4: "#F4F4F4",
  gray_F3: "#F3F4F6",
  gray_6B: "#6B7280",
  gray_11: "#111827",
  gray_E5: "#E5E7EB",
  gray_D1: "#D1D5DB",

  red_FE: "#FEF2F2",
  red_DC: "#DC2626",
  green_05: "#059669",
  amber_D9: "#D97706",
  amber_F5: "#F59E0B",
  amber_FE: "#FEF3C7",
  transparent_black_10: "rgba(0,0,0,0.1)",
  successOpacity_10: "rgba(5, 150, 105, 0.1)",
  warningOpacity_10: "rgba(245, 158, 11, 0.1)",
  redOpacity_10: "rgba(220, 38, 38, 0.1)",
  blackOpacity_05: "rgba(0,0,0,0.05)",
  blackOpacity_50: "rgba(0,0,0,0.5)",
  text_placeholder: "#94A3B8",
};

const Colors = {
  ...base,

  // ─── Theme Foundations ────────────────────────────────────────────────────
  primary: "#1A1A2E",
  accent: "#FF6D1F",

  // ─── Backgrounds ──────────────────────────────────────────────────────────
  background_gradient: [base.gold, base.gold],
  homebg: base.gold,
  homeSecondary: "#FFEBBC",
  bg: base.beige,
  bg_F8: base.slate_50,
  surface: base.white,
  pageBg: "#F2EDE4",

  // ─── Typography ───────────────────────────────────────────────────────────
  text_secondary: base.gray_77,

  // ─── Buttons & Inputs ─────────────────────────────────────────────────────
  input_bg: "#FCECC8",
  input_border: base.transparent_black_10,

  // ─── Elements ─────────────────────────────────────────────────────────────
  circle_bg: "rgba(255,255,255,0.29)",

  // ─── Finance Specific ─────────────────────────────────────────────────────
  finance_card_1: ["#FDE4A8", "#FAF3E1", "#FDE4A8"],
  finance_card_2: ["#FDE4A8", "#FAEAC6", "#FDE4A8"],
  finance_accent: "#D4B06A",
  finance_text: "#222222",

  // ─── Status ───────────────────────────────────────────────────────────────
  success_light: "#D1FAE5",
  success_dark: base.green_05,
  success_ring: "#BBF7D0",
  warning_light: base.amber_FE,
  warning_dark: "#B45309",
  info_light: "#DBEAFE",
  info_dark: "#1D4ED8",
  error_light: base.red_FE,
  error_dark: base.red_DC,
  error_ring: "#FECACA",

  // ─── Account & Profile ────────────────────────────────────────────────────
  ink: base.ink_main,
  ink2: "#3A3835",
  ink3: "#7A756E",
  surface2: "#F4F2EE",
  surface3: "#EDE9E3",
  amber2: "#E07A00",
  red_profile: "#C13B3B",
  green_profile: "#1A7F5A",
  heroEnd: "#211F1C",

  // ─── Hub / Activation ─────────────────────────────────────────────────────
  hub_orange: base.orange,
  hub_orangeSoft: "#FFF1E8",
  hub_orangeBorder: "rgba(244,114,43,0.25)",
  hub_greenSoft: "#F0FDF4",
  hub_bg: "#FAF8F4",
  hub_dark: "#141414",
  hub_border: "#E8EDF2",
  hub_lightText: "#CBD5E1",
  hub_redSoft: "#FFF5F5",
  hub_heroFrom: "#1A0A02",
  hub_heroTo: "#2D1000",
  hub_hubIndigo: base.indigo,
  hub_hubSky: "#0EA5E9",

  // ─── Offline KYC ──────────────────────────────────────────────────────────
  kyc_accent: "#C9A84C",
  kyc_accentDark: "#7A6020",
  kyc_success: base.green_05,
  kyc_error: base.red_DC,
  kyc_warning: base.amber_D9,
  kyc_text: base.gray_11,
  kyc_textSub: base.gray_6B,
  kyc_textMuted: "#9CA3AF",
  kyc_bg: "#F4F5F7",
  kyc_border: base.gray_E5,
  kyc_lockedBg: base.gray_F3,
  kyc_lockedBorder: base.gray_D1,

  // ─── Direct Hex Mapping for Consistency ────────────────────────────────────
  hex_E53935: "#E53935",
  hex_10B981: base.emerald,
  hex_F59E0B: base.amber_F5,
  hex_6366F1: base.indigo,
  hex_4B5563: base.slate,
  hex_059669: base.green_05,
  hex_D4A843: "#D4A843",
  hex_B8944D: "#B8944D",
  hex_2E2E2E: "#2E2E2E",
  hex_232323: "#232323",
  hex_3A3A3A: "#3A3A3A",
  hex_F8F9FA: "#F8F9FA",
  hex_F8F9FC: base.slate_50,
  hex_EDF0F5: "#EDF0F5",
  hex_E2E8F0: "#E2E8F0",
  hex_FEF3C7: base.amber_FE,
  hex_D97706: base.amber_D9,
  hex_F2F2F2: "#F2F2F2",
  hex_F8F8F8: "#F8F8F8",
  hex_F4F4F4: base.gray_F4,
  hex_E0C38C: "#E0C38C",
  hex_1A1A1A: "#1A1A1A",
  hex_F3F4F6: base.gray_F3,
  hex_6B7280: base.gray_6B,
  hex_111827: base.gray_11,
  hex_E5E7EB: base.gray_E5,
  hex_FAFAFA: base.gray_FA,
  hex_374151: "#374151",
  hex_D1D5DB: base.gray_D1,
  hex_FEF2F2: base.red_FE,
  hex_E5C37A: "#E5C37A",
  hex_C79A3F: "#C79A3F",

  // ─── Transaction History specific aliases ────────────────────────────────
  headerBg: base.ink_main,
  surfaceMid: base.slate_50,
  goldDim: "rgba(212,168,67,0.14)",
  redSoft: base.red_FE,
  redDim: "rgba(220, 38, 38, 0.13)",
  amberDim: "rgba(217, 119, 6, 0.13)",
  amberSoft: "#FFFBEB",
  amber_dark: base.amber_D9,
};

export default Colors;