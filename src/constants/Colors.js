import { get } from "react-native/Libraries/NativeComponent/NativeComponentRegistry";

const Colors = {
  // Core Theme Colors (Gold/Black/White)
  primary: "#000000",      // Main Actions, Headings, Icons (Black)
  secondary: "#FAF3E1",    // Secondary Backgrounds (Beige)
  accent: "#000000",       // Focus states, Links, Cursors (Black)

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

};

export default Colors;
