// theme.js
import { Dimensions } from "react-native";


const { width, height } = Dimensions.get("window");  // Get screen dimensions


export const container = {
  flex: 1,
  backgroundColor: "#EEEEEE",
  paddingTop: 10,
  padding: 10,
  paddingHorizontal: width * 0.05,  // 5% of screen width for padding
};

export const backArrow = {
  height: 24,
  width: 24,
};

export const header = {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 30,

};

export const headerText = {
  flex: 1,
  fontSize: 22,
  fontWeight: "bold",
  color: "#333",
  textAlign:"center",
  right:10



};
export const form = {
  backgroundColor: "#FFFFFF",
  borderRadius: 16,
  margin: 15,
  padding: 20,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 5,
  elevation: 5,
  marginBottom: 20,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",

};

export const inputContainer = {
  marginBottom: 20,
  borderBottomWidth: 1,
  borderBottomColor: '#EAEAEA',
  backgroundColor: "#FFFFFF",
  borderRadius: 12,
  padding: 20,
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.2,
  shadowRadius: 5,
  elevation: 5,
};
export const label = {
  fontSize: 16,
  fontWeight: "500",
  color: "#333",
  marginBottom: 5,
};
export const input = {
  borderBottomWidth: 1,
  borderBottomColor: "#CCC",
  fontSize: 16,
  padding: 10,
  color: "#333",
  height: 40,
  paddingHorizontal: 10,
  paddingVertical: 20,
  marginBottom: 10,
  
};


export const colors = {
  backgroundColor: '#EEEEEE', // Example background color
  textColor: '#333333',       // Example text color
  buttonColor: '#38ACEC',     // Example button color
  buttonTextColor: '#FFFFFF', // Button text color
};

export const HeaderFont = {
  fontSize: 22,
  fontWeight: "bold",
  color: "#333",
};


