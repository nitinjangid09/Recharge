import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Image,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialCommunityIcons";

const ordersData = [
  {
    id: "1",
    title: "Nike Zoom Vomero 5",
    subtitle: "EU 41.5  •  Black",
    price: "$160",
    status: "On Delivery",
    date: "Mar 15, 2024",
    image:
      "https://static.nike.com/a/images/t_prod/w_640,c_limit,f_auto/bf8d.jpg",
  },
  {
    id: "2",
    title: "Nike Air Force 1 '07 LV8",
    subtitle: "EU 40  •  White",
    price: "$125",
    status: "On Delivery",
    date: "Jan 23, 2024",
    image:
      "https://static.nike.com/a/images/t_prod/w_640,c_limit,f_auto/af1.jpg",
  },
  {
    id: "3",
    title: "Nike Club",
    subtitle: "L  •  Black",
    price: "$72",
    status: "Completed",
    date: "Dec 23, 2023",
    image:
      "https://static.nike.com/a/images/t_prod/w_640,c_limit,f_auto/hoodie.jpg",
  },
];

export default function OrderHistoryScreen() {
  const [activeTab, setActiveTab] = useState("All");

  const tabs = ["All", "On Delivery", "Completed", "Failed"];

  const renderOrder = ({ item }) => (
    <View style={styles.card}>
      <Image source={{ uri: item.image }} style={styles.image} />

      <View style={styles.info}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>

        <View style={styles.bottomRow}>
          <View
            style={[
              styles.statusBadge,
              item.status === "Completed"
                ? styles.completed
                : styles.onDelivery,
            ]}
          >
            <Text
              style={[
                styles.statusText,
                item.status === "Completed"
                  ? styles.completedText
                  : styles.deliveryText,
              ]}
            >
              {item.status}
            </Text>
          </View>

          <Text style={styles.date}>{item.date}</Text>
        </View>
      </View>

      <Text style={styles.price}>{item.price}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity>
          <Icon name="arrow-left" size={26} />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Order History</Text>

        <TouchableOpacity>
          <Icon name="tune" size={26} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={styles.tab}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab && styles.activeTabText,
              ]}
            >
              {tab}
            </Text>

            {activeTab === tab && <View style={styles.activeLine} />}
          </TouchableOpacity>
        ))}
      </View>

      {/* List */}
      <FlatList
        data={ordersData}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={{ paddingBottom: 20 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 15,
  },

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    marginBottom: 10,
  },

  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },

  tabs: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#ddd",
    paddingHorizontal: 10,
  },

  tab: {
    marginRight: 18,
    alignItems: "center",
  },

  tabText: {
    fontSize: 14,
    color: "#777",
    paddingBottom: 6,
  },

  activeTabText: {
    color: "black",
    fontWeight: "600",
  },

  activeLine: {
    width: "100%",
    height: 3,
    backgroundColor: "black",
    borderRadius: 10,
  },

  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 15,
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
    elevation: 3,
  },

  image: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },

  info: {
    flex: 1,
    marginLeft: 12,
  },

  title: {
    fontSize: 15,
    fontWeight: "600",
  },

  subtitle: {
    fontSize: 12,
    color: "#777",
    marginTop: 3,
  },

  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    alignItems: "center",
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },

  onDelivery: {
    backgroundColor: "#ffece3",
  },

  completed: {
    backgroundColor: "#e7f7ec",
  },

  statusText: {
    fontSize: 12,
  },

  deliveryText: {
    color: "#ff8a4c",
  },

  completedText: {
    color: "#36a36a",
  },

  date: {
    fontSize: 12,
    color: "#777",
  },

  price: {
    alignSelf: "flex-start",
    fontWeight: "700",
    fontSize: 15,
  },
});
