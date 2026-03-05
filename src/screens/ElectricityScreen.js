import React from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
// import { useNavigation } from "@react-navigation/native";


// Dummy Data
const electricityBillers = [
  {
    state: 'Andhra Pradesh',
    billers: [
      {
        name: 'Andhra Pradesh Central Power Distribution Corporation Limited',
      },
      {
        name: 'Eastern Power Distribution Co Ltd (APEPDCL)',
      },
      {
        name: 'Southern Power Distribution Co Ltd (APSPDCL)',
      },
      {
        name: 'TTD Electricity',
      },
    ],
  },
  {
    state: 'Arunachal Pradesh',
    billers: [
      {
        name: 'Department of Power, Government of Arunachal Pradesh',
      },
      {
        name: 'Department of Power, Government of Arunachal Pradesh - Prepaid',
      },
    ],
  },
  {
    state: 'Assam',
    billers: [],
  },
];

export default function ElectricityScreen({navigation}) {
  // const navigation = useNavigation();

  const renderBillerItem = ({ item }) => (
    <TouchableOpacity 
    onPress={() => navigation.goBack()}
    style={styles.billerItem}>
      <Image source={require("../assets/download.png")} style={styles.billerLogo} />
      <Text style={styles.billerText}>{item.name}</Text>
    </TouchableOpacity>
  );

  const renderStateSection = ({ item }) => (
    <View style={styles.sectionContainer}>
      <Text style={styles.stateText}>{item.state}</Text>
      {item.billers.length > 0 ? (
        <FlatList
          data={item.billers}
          renderItem={renderBillerItem}
          keyExtractor={(biller) => biller.name}
        />
      ) : (
        <Text />
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity >
        <Image source={require("../assets/download.png")}  style={{height:20,width:20}} />
        </TouchableOpacity>
        <Text style={styles.headerText}>Electricity</Text>
      </View>

      {/* Search Bar */}
      <TextInput
        style={styles.searchBar}
        placeholder="Search by biller or state/union territory"
      />

      {/* State and Billers */}
      <FlatList
        data={electricityBillers}
        renderItem={renderStateSection}
        keyExtractor={(item) => item.state}
      />
    </View>
  );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'EEEEEE',
      },
      header: {
        backgroundColor: 'white',
        paddingVertical: 15,
        alignItems: 'center',
        flexDirection:"row"
      },
      headerText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
        left:"30%"
      },
      searchBar: {
        margin: 10,
        padding: 10,
        borderWidth: 1,
        borderColor: '#CCC',
        borderRadius: 5,
        backgroundColor: '#FFF',
      },
      sectionContainer: {
        marginHorizontal: 10,
        marginVertical: 5,
      },
      stateText: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 5,
      },
      billerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 15,
        backgroundColor: '#FFF',
        marginBottom: 5,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#EEE',
      },
      billerLogo: {
        width: 40,
        height: 40,
        marginRight: 10,
      },
      billerText: {
        fontSize: 14,
        color: '#333',
      },
      
    });