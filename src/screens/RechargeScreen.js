import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
} from 'react-native';
import Header from '../componets/Header/Hearders';
// import { useNavigation } from "@react-navigation/native";
import styles from '../constants/styles';


const RechargeScreen = ({navigation}) => {
    const [selectedTab, setSelectedTab] = useState('recommended');
    // const navigation = useNavigation();

    const rechargePlans = [
        { id: '1', label: 'Best Value', price: '₹49', data: 'Unlimited', validity: '1 day' },
        { id: '2', label: 'Free 20+ OTTs', price: '₹181', data: '15 GB', validity: '30 days' },
        { id: '3', label: 'Best Value', price: '₹49', data: 'Unlimited', validity: '1 day' },
        { id: '4', label: 'Free 20+ OTTs', price: '₹181', data: '15 GB', validity: '30 days' },
        { id: '5', label: 'Best Value', price: '₹49', data: 'Unlimited', validity: '1 day' },
        { id: '6', label: 'Free 20+ OTTs', price: '₹181', data: '15 GB', validity: '30 days' },
    ];

    const renderPlan = ({ item }) => (
        <View style={styles.form}>
            <View style={styles.planHeader}>
                <Text style={styles.planLabel}>{item.label}</Text>
            </View>
            <View style={styles.planDetails}>
                <Text style={styles.planPrice}>{item.price}</Text>
                <Text style={styles.planData}>{item.data}</Text>
                <Text style={styles.planValidity}>{item.validity}</Text>
            </View>
            <TouchableOpacity
                        onPress={() => navigation.navigate("PaymentDetails")}
                        >
                <Text style={styles.viewDetails}>View Details</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <Header />

            {/* Input Section */}
            <View style={styles.inputContainer}>
                <Text style={styles.label}>Enter name or number</Text>
                <TextInput
                    style={styles.input}
                    placeholder="Enter name or number"
                    placeholderTextColor="#999"
                />
                <View style={styles.operatorSection}>
                    <Text style={styles.operatorInfo}>Airtel • Rajasthan</Text>
                    <TouchableOpacity>
                        <Text style={styles.changeOperator}>Change operator</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search Section */}
            <View style={styles.searchSection}>
                <Text style={styles.label}>Search for a plan</Text>
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search for a plan"
                    placeholderTextColor="#999"
                />
            </View>

            {/* Tabs */}
            <View style={styles.tabsContainer}>
                {['recommended', 'data', 'superSaver'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[
                            styles.tab,
                            selectedTab === tab && styles.activeTab,
                        ]}
                        onPress={() => setSelectedTab(tab)}
                    >
                        <Text
                            style={[
                                styles.tabText,
                                selectedTab === tab && styles.activeTabText,
                            ]}
                        >
                            {tab === 'recommended'
                                ? 'Recommended Packs'
                                : tab === 'data'
                                    ? 'Data'
                                    : 'Super Saver'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Recharge Plans */}
            <FlatList
                data={rechargePlans}
                keyExtractor={(item) => item.id}
                renderItem={renderPlan}
                contentContainerStyle={styles.listContainer}
            />
        </View>
    );
};

export default RechargeScreen;