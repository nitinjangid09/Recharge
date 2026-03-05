import React from "react";
import { View, Text, TouchableOpacity, FlatList, Modal } from "react-native";
import Styles from "./styles";

const Dropdown = ({
  visible,
  options,
  selectedValue,
  onSelect,
  toggleDropdown,
}) => {
  return (
    <>
      <TouchableOpacity
        style={Styles.dropdown}
        onPress={toggleDropdown}
      >
        <Text style={Styles.dropdownText}>
          {selectedValue || "Select an Option"}
        </Text>
      </TouchableOpacity>
      {visible && (
        <Modal
          animationType="fade"
          transparent={true}
          visible={visible}
          onRequestClose={toggleDropdown}
        >
          <TouchableOpacity
            style={Styles.overlay}
            onPress={toggleDropdown}
          >
            <View style={Styles.dropdownList}>
              <FlatList
                data={options}
                keyExtractor={(item) => item.value}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={Styles.dropdownItem}
                    onPress={() => {
                      onSelect(item.value);
                      toggleDropdown();
                    }}
                  >
                    <Text style={Styles.dropdownItemText}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </>
  );
};

export default Dropdown;