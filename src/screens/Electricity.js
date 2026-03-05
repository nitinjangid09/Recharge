import { View, Text, TouchableOpacity, StyleSheet, Button } from 'react-native'
import React, { useState } from 'react'
import HeaderBar from '../componets/HeaderBar'
import { ScrollView, TextInput } from 'react-native-gesture-handler'
import Colors from '../constants/Colors'
import { input } from '../componets/Utils/theme'
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

export default function Electricity({ navigation }) {
    const [selected, setSelected] = useState(null);

    const addresses = [
        { id: 1, title: "Jaipur, Rajsthan", lat: 10.7797, lng: 106.6992 },
        { id: 2, title: "Jaipur, Rajsthan", lat: 10.7829, lng: 106.7030 },
    ];
    return (
        <ScrollView style={styles.container}>
            <HeaderBar title={"Electricity"} onBack={() => navigation.goBack()} />
         <View style={styles.card}>   <Text style={styles.title}>Enter Details</Text>
            <View style={styles.border}>
                <Text style={styles.txt_biller}>Select Biller
                </Text>

                <View style={{ flexDirection: 'row', marginRight: 10, }}>
                    <TextInput
                        placeholder="JVVNL"
                        placeholderTextColor={Colors.gray}
                        style={styles.input} />
                    <Text style={styles.edit}>Edit
                    </Text>
                </View>
            </View>

            <View style={styles.border}>
                <View style={{ flexDirection: 'row', marginRight: 10 }}>
                    <TextInput
                        placeholder="K Number"
                        placeholderTextColor={Colors.gray}
                        style={styles.input} />
                </View>
            </View>
            <Text style={styles.sample}>View Sample</Text>
            <TouchableOpacity
                style={styles.addressItem}
                onPress={() => setSelected(prev => (prev === 0 ? null : 0))}
            >
                <MaterialCommunityIcons
                    name={selected === 0 ? "checkbox-marked" : "checkbox-blank-outline"}
                    size={22}
                    color={Colors.primary}
                />
                <Text style={styles.addressText}>
                    Remind me when Electricity balance is low
                </Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.saveText}>Save and Continue</Text>
            </TouchableOpacity>

            <Text style={styles.addressText}>The Payment will reflect at biller's
                end after 2-3 working days.
            </Text>
</View> 
            <View style={{ backgroundColor: Colors.secndory, marginVertical: 10, padding: 10 }}>
                <View style={{
                    backgroundColor: Colors.gray, borderRadius: 10, flexDirection: 'row', justifyContent: 'space-around',
                    borderColor: Colors.primary, borderWidth: 1, height: 80, backgroundColor: Colors.white
                }}>
                    <View style={{ backgroundColor: Colors.bg,borderTopLeftRadius:10, borderBottomLeftRadius:10,justifyContent: 'center', alignItems: 'center' }}>
                        <MaterialCommunityIcons
                            name={"lightbulb-on-outline"}
                            size={24}
                            marginTop={25}
                            color={Colors.primary}
                        />
                        <Text style={styles.title1}>Electricity</Text>   </View><View style={{ flex: 1, marginTop: 10, justifyContent: 'flex-start', alignItems: 'flex-start' }}>
                        <Text style={styles.text1}>Earn 100% back upto
                        </Text>
                        <Text style={styles.text1}>Using Camlenio Pay UPI
                        </Text>
                        <Text style={styles.text2}>Min Order:
                        </Text>
                    </View>
                </View>
            </View>
        </ScrollView>
    )
}
const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: Colors.bg
    },
    title: {
        fontSize: 16,
        marginLeft: 10,
        marginTop: 10,
        marginBottom:5,
        fontWeight: "700",
        color: Colors.primary
    },
        sample: {
        fontSize: 14,
        marginLeft: 15,
        marginBottom: 10,
     
        fontWeight: "800",
        color: Colors.accent
    },  card: {
    backgroundColor: Colors.secndory,
    margin: 15,
    borderRadius: 12,
    padding: 18,
    borderWidth: .5,
    borderColor: Colors.primary,
    elevation: 4,
  },

    title1: {
        fontSize: 12,
        backgroundColor: Colors.primary,
        fontWeight: "500",
        marginTop: 8,
        paddingBottom:5,
        borderBottomLeftRadius: 10,
        paddingHorizontal: 10,
       
        color: Colors.white
    },
    saveBtn: {
        flex: 1,
        backgroundColor: Colors.primary,
        borderWidth: .5,
        borderColor: Colors.white,
        justifyContent: 'center', alignItems: 'center',
        padding: 10,
        marginTop:10,        
        marginHorizontal: 20,
        borderRadius: 15,
    },
    saveText: {
        fontSize: 16,
        color: Colors.white,
        fontWeight: "600"
    },
    txt_biller: {
        fontSize: 14,
       
        marginLeft: 5,
        fontWeight: "500",
        color: Colors.primary
    },

    addressItem: {
        flexDirection: "row",
        alignItems: "center",
        textAlign: 'center',
        marginHorizontal:15,
        borderRadius: 12
    },

    addressText: {
        color: Colors.primary,
        textAlign: 'center',
        
        marginVertical:10,
        fontSize: 12,
        flex: 1
    },
    text: {
        color: Colors.primary,
        textAlign: 'center',
        marginLeft: 10,
        fontSize: 12,
        fontWeight: "600"

    },

    text1: {
        color: Colors.primary,
        textAlign: 'center',
        marginLeft: 10,
        fontSize: 12,
      



    },
    text2: {
        color: Colors.accent,
        textAlign: 'center',
        marginLeft: 10,
        marginTop: 10,
        fontSize: 12,

    },
    edit: {
        fontSize: 14,
        marginTop: 5,
        marginLeft: 5,
        fontWeight: "700",
        color: Colors.accent
    },
    border: {
        borderWidth: 1,
        padding: 5,
        borderColor: Colors.primary,
        backgroundColor:Colors.bg,
        borderRadius: 10,      
        marginVertical: 5
    },

    input: {
        flex: 1,
        height: 35,
        fontSize: 14,
        marginLeft: 10,
        color: Colors.primary
    }
})