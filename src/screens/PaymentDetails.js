import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';

const PaymentDetails = () => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        
        <Text style={styles.headerText}>payment details</Text>
      </View>

      {/* Payment Card */}
      <View style={styles.paymentCard}>
        <View style={styles.cardTop}>
          <Text style={styles.cardText}>Prepaid • 54653454656</Text>
          <Text style={styles.cardAmount}>₹49.00</Text>
        </View>
        <Text style={styles.cardSubText}>Unlimited data • 1 day validity</Text>
      </View>

      {/* Select Offers */}
      <TouchableOpacity style={styles.offersCard}>
        <Text style={styles.offersText}>select offers, save more</Text>
        <Text style={styles.arrow}>›</Text>
      </TouchableOpacity>

      {/* Amount Details */}
      <View style={styles.amountDetails}>
        <Text style={styles.sectionTitle}>amount details</Text>
        <View style={styles.amountRow}>
          <Text style={styles.amountText}>prepaid recharge</Text>
          <Text style={styles.amountText}>₹49.00</Text>
        </View>
        <View style={styles.amountRow}>
          <Text style={styles.totalText}>total amount</Text>
          <Text style={styles.totalText}>₹49.00</Text>
        </View>
      </View>

      {/* Footer */}
      <Text style={styles.footerText}>
        your money is always safe{'\n'}
        <Text style={styles.footerSubText}>100% secure payments</Text>
      </Text>
     
      {/* Bottom Bar */}
      <View style={styles.bottomBar}>
        <Text style={styles.bottomAmount}>₹49.00</Text>
        <TouchableOpacity style={styles.Button}>
          <Text style={styles.ButtonText}>PROCEED TO PAY</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PaymentDetails;
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#EEEEEE',
      },
      header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent:"center",
        padding: 16,
        backgroundColor: 'white',
        paddingVertical: 15,
        paddingHorizontal: 10,
      },
    
      headerText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#000',
      },
      paymentCard: {
        backgroundColor: '#FFF',
        margin: 16,
        borderRadius: 10,
        padding: 16,
        elevation: 2,
      },
      cardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
      },
      cardText: {
        fontSize: 16,
        fontWeight: 'bold',
      },
      cardAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
      },
      cardSubText: {
        fontSize: 14,
        color: 'gray',
        marginTop: 8,
      },
      offersCard: {
        backgroundColor: 'white',
        marginHorizontal: 16,
        borderRadius: 10,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
      },
      offersText: {
        fontSize: 16,
        color: '#007AFF',
      },
      arrow: {
        fontSize: 18,
        color: '#007AFF',
      },
      amountDetails: {
        backgroundColor: '#FFF',
        margin: 16,
        borderRadius: 10,
        padding: 16,
        elevation: 2,
      },
      sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 16,
      },
      amountRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
      },
      amountText: {
        fontSize: 14,
        color: 'gray',
      },
      totalText: {
        fontSize: 16,
        fontWeight: 'bold',
      },
      footerText: {
        textAlign: 'center',
        fontSize: 14,
        color: 'gray',
        marginTop: 16,
      },
      footerSubText: {
        fontWeight: 'bold',
      },
      bottomBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        top:300
      },
      bottomAmount: {
        fontSize: 16,
        fontWeight: 'bold',
      },
      Button: {
        backgroundColor: '#38ACEC',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 5,
      },
      ButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
      },
    });
    