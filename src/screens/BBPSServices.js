import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";

import {
  View,
  Text,
  TouchableOpacity,
  Image,
  Modal,StyleSheet
} from "react-native";


const BBPSServices = () => {
  const navigation = useNavigation();
  const [modalVisible, setModalVisible] = useState(false);

  const closeModal = () => setModalVisible(false);

  // Main services for the grid
  const services = [
    { title: "DTH", icon: require("../assets/download.png"), screen: "CLAIM_OTTS" },
    { title: "Landline", icon: require("../assets/download.png"), screen: "ROAMING" },
    { title: "Water", icon: require("../assets/download.png"), screen: "ADD_CONNECTION" },
  
];

  // Additional services to be displayed in the modal
  const modalServices = [
    { title: "Gas", icon: require("../assets/download.png"), screen: "CHANNELS" },
    { title: "Fastag", icon: require("../assets/download.png"), screen: "UPGRADE" },
    { title: "Electricity", icon: require("../assets/download.png"), screen: "ELECTRICITY_BILL" },
    { title: "Broadband", icon: require("../assets/download.png"), screen: "BROADBAND" },
    { title: "Insurance", icon: require("../assets/download.png"), screen: "INSURANCE" },
    { title: "Subscription", icon: require("../assets/download.png"), screen: "SUBSCRIPTION" },
  ];

  const ServiceItem = ({ icon, title, screen, isMore }) => (
    <TouchableOpacity
      style={styles.itemContainer}
      onPress={() => {
        if (isMore) {
          setModalVisible(true); // Open modal for "More"
        } else if (screen) {
          navigation.navigate(screen); // Navigate to specified screen
        }
      }}
    >
      <View style={styles.iconWrapper}>
        <Image source={icon} style={styles.icon} />
      </View>
      <Text style={styles.title}>{title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Main Service Grid */}
      <View style={styles.servicesWrapper}>
        {services.map((service, index) => (
          <ServiceItem
            key={index}
            icon={service.icon}
            title={service.title}
            screen={service.screen}
          />
        ))}
        {/* "More" button */}
        <ServiceItem
          icon={require("../assets/download.png")}
          title="More"
          isMore={true}
        />
      </View>

      {/* Modal for Additional Services */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={closeModal}
      >
        <View style={styles.modalWrapper}>
          <View style={styles.modalContent}>
            {/* Close Button */}
            <TouchableOpacity style={styles.modalCloseButton} onPress={closeModal}>
              <Text style={styles.modalCloseButtonText}>X</Text>
            </TouchableOpacity>

            {/* Header Text */}
            <Text style={styles.modalHeaderText}>Additional Services</Text>

            {/* Additional Services Grid */}
            <View style={styles.servicesWrapper}>
              {modalServices.map((service, index) => (
                <ServiceItem
                  key={index}
                  icon={service.icon}
                  title={service.title}
                  screen={service.screen}
                />
              ))}
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default BBPSServices;

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F5F5F5",
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 5,
  },
  servicesWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  itemContainer: {
    width: "25%",
    marginVertical: 10,
    alignItems: "center",
  },
  iconWrapper: {
    height: 50,
    padding: 5,
  },
  icon: {
    width: 50,
    height: 50,
  },
  title: {
    fontSize: 12,
    color: "#555",
    textAlign: "center",
    marginTop: 10,
  },
  modalWrapper: {
    flex: 1,
    justifyContent:"flex-end",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "90%",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    position: "relative",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 10,
  },
  modalHeaderText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 15,
    textAlign: "center",
  },
  modalCloseButton: {
    position: "absolute",
    top: 15,
    right: 15,
    justifyContent: "center",
    alignItems: "center",
    width: 30,
    height: 30,
  },
  modalCloseButtonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
});
