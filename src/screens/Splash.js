import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
} from "react-native";

const Splash = () => {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>

        {/* TITLE */}
        <Text style={styles.title}>About Kalbeliya</Text>


        {/* POINTS */}
        <Feature
          title="Traditional Craftsmanship"
          description="Every piece is handcrafted by skilled artisans using techniques perfected over centuries."
        />


        {/* OUR COMMITMENT */}
        <Text style={styles.sectionTitle}>Our Commitment</Text>

        <Text style={styles.paragraph}>
          At Kalbeliya, we believe in creating a sustainable future while honoring our
          past. Every purchase supports artisan communities and helps preserve
          centuries-old traditions for generations to come.
        </Text>

        <Feature
          title="Handcrafted Excellence"
          description="Each creation reflects the dedication, skill, and artistry of master craftsmen."
        />


        {/* KALBELIYA EXPERIENCE BOX */}
        <View style={styles.experienceBox}>
          <Text style={styles.experienceTitle}>The Kalbeliya Experience</Text>

          <View style={styles.experienceDivider} />

          <Text style={styles.experienceText}>
            When you choose Kalbeliya, you're not just purchasing a product — you're
            becoming part of a living cultural legacy. Each item in our collection
            carries the spirit of Rajasthan's desert landscapes and the passion of the
            Kalbeliya people.
          </Text>

        </View>


      </ScrollView>
    </SafeAreaView>
  );
};

/* FEATURE ITEM COMPONENT */
const Feature = ({ title, description }) => (
  <View style={styles.featureBox}>
    <Text style={styles.bullet}>✦</Text>
    <View style={{ flex: 1 }}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={styles.featureText}>{description}</Text>
    </View>
  </View>
);

export default Splash;

/* STYLES */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  commitmentText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#444",
    fontWeight: "500",
    marginBottom: 14,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },

  title: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 12,
    color: "#000",
  },

  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: "#555",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginVertical: 16,
    color: "#000",
  },

  featureBox: {
    flexDirection: "row",
    marginBottom: 14,
  },

  bullet: {
    fontSize: 16,
    marginRight: 10,
    color: "#000",
  },

  featureTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#000",
    marginBottom: 4,
  },

  featureText: {
    fontSize: 13,
    lineHeight: 20,
    color: "#555",
  },
  experienceBox: {
    backgroundColor: "#f9f5f0",
    padding: 18,
    borderRadius: 10,
    marginVertical: 20,
    borderLeftWidth: 4,
    borderLeftColor: "#c28f2c",
  },

  experienceTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#000",
    marginBottom: 8,
  },

  experienceDivider: {
    width: 50,
    height: 2,
    backgroundColor: "#c28f2c",
    marginBottom: 12,
  },

  experienceText: {
    fontSize: 14,
    lineHeight: 22,
    color: "#555",
    marginBottom: 10,
  },

  experienceHighlight: {
    fontSize: 14,
    lineHeight: 22,
    color: "#333",
    fontWeight: "600",
    marginTop: 8,
  },

  experienceFooter: {
    fontSize: 14,
    fontStyle: "italic",
    color: "#000",
    marginTop: 12,
    fontWeight: "600",
  },

});
