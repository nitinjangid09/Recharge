import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import Colors from "../constants/Colors";

export default function AddressScreen({ navigation }) {

  const [selected, setSelected] = useState(null);

  const addresses = [
    { id: 1, title: "Jaipur, Rajsthan", lat: 10.7797, lng: 106.6992 },
    { id: 2, title: "Jaipur, Rajsthan", lat: 10.7829, lng: 106.7030 },
  ];

  return (
    <View style={styles.container}>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={30}
            color={Colors.secndory}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Address</Text>

        <View style={{ width: 30 }} />
      </View>

      {/* MAP */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 10.7797,
          longitude: 106.6992,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        }}
      >
        {addresses.map((item) => (
          <Marker
            key={item.id}
            coordinate={{ latitude: item.lat, longitude: item.lng }}
          >
            <View style={styles.marker}>
              <Text style={{ color: Colors.primary, fontWeight: "bold" }}>
                {item.id}
              </Text>
            </View>
          </Marker>
        ))}
      </MapView>

      {/* BOTTOM SHEET */}
      <View style={styles.bottomCard}>
        <FlatList
          data={addresses}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.addressItem}
              onPress={() => setSelected(item.id)}
            >
              <MaterialCommunityIcons
                name={selected === item.id ? "checkbox-marked" : "checkbox-blank-outline"}
                size={22}
                color={Colors.primary}
              />

              <Text style={styles.addressText}>{item.title}</Text>
            </TouchableOpacity>
          )}
        />

        {/* DONE BUTTON */}
        <TouchableOpacity style={styles.doneBtn}>
          <Text style={styles.doneText}>Done</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bg },
  header: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 20,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.secndory,
  },

  map: { flex: 1 ,backgroundColor:Colors.bg},

  marker: {
    backgroundColor: Colors.bg,
    width: 32,
    height: 32,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  bottomCard: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    backgroundColor: Colors.bg,
    padding: 20,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
  },

  addressItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.secndory,
    borderRadius: 12,
    padding: 12,
    marginVertical: 6,
  },

  addressText: {
    color: Colors.primary,
    marginLeft: 10,
    fontSize: 14,
  },

  doneBtn: {
    marginTop: 15,
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    alignItems: "center",
    borderRadius: 30,
    marginBottom:20
  },

  doneText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: "700",
  },
});
