import { StyleSheet } from "react-native";

const Styles = StyleSheet.create({
  dropdown: {
    borderBottomWidth: 1,
    borderBottomColor: "gray",
    paddingVertical: 10,
    paddingHorizontal: 5,
    marginBottom: 20,
  },
  dropdownText: {
    fontSize: 14,
    color: "#333",
  },
  dropdownList: {
    backgroundColor: "#fff",
    borderRadius: 8,
    maxHeight: 150,
    marginTop: 5,
    marginHorizontal: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  dropdownItem: {
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#333",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
});

export default Styles;