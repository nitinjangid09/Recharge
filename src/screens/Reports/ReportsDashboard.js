import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Platform, StatusBar } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';
import Fonts from '../../constants/Fonts';
import WalletTransactionScreen from './WalletLedger';
import InvoiceScreen from './TranscationHistory';
import HeaderBar from '../../componets/HeaderBar/HeaderBar';

const { width: SW } = Dimensions.get('window');
const rs = (s) => Math.round((SW / 375) * s);

export default function ReportsDashboard({ navigation, route }) {
    const [activeTab, setActiveTab] = useState('ledger');

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <StatusBar barStyle="light-content" backgroundColor={Colors.headerBg || '#161616'} />
            
            <View style={styles.tabContainer}>
                <TouchableOpacity 
                    style={[styles.tabButton, activeTab === 'ledger' && styles.activeTabButton]}
                    onPress={() => setActiveTab('ledger')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabText, activeTab === 'ledger' && styles.activeTabText]}>
                        Wallet Ledger
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.tabButton, activeTab === 'transactions' && styles.activeTabButton]}
                    onPress={() => setActiveTab('transactions')}
                    activeOpacity={0.8}
                >
                    <Text style={[styles.tabText, activeTab === 'transactions' && styles.activeTabText]}>
                        Transactions
                    </Text>
                </TouchableOpacity>
            </View>

            <View style={styles.contentContainer}>
                {activeTab === 'ledger' ? (
                    <WalletTransactionScreen navigation={navigation} route={route} isInnerTab={true} />
                ) : (
                    <InvoiceScreen navigation={navigation} route={route} isInnerTab={true} />
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.headerBg || '#161616',
    },
    tabContainer: {
        flexDirection: 'row',
        backgroundColor: Colors.headerBg || '#161616',
        paddingHorizontal: rs(16),
        paddingTop: rs(10),
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        zIndex: 10,
    },
    tabButton: {
        flex: 1,
        paddingVertical: rs(16),
        alignItems: 'center',
        borderBottomWidth: 4,
        borderBottomColor: 'transparent',
    },
    activeTabButton: {
        borderBottomColor: Colors.finance_accent || '#d4b06a',
    },
    tabText: {
        color: Colors.whiteOpacity_60 || 'rgba(255,255,255,0.6)',
        fontFamily: Fonts.Medium,
        fontSize: rs(17),
        letterSpacing: 0.5,
    },
    activeTabText: {
        color: Colors.finance_accent || '#d4b06a',
        fontFamily: Fonts.Bold,
        fontSize: rs(18),
    },
    contentContainer: {
        flex: 1,
        backgroundColor: Colors.bg || '#F3F4F6',
    }
});
