import React, { useState } from 'react';
import { View, Text, TextInput, SectionList, Image,StyleSheet, TouchableOpacity } from 'react-native';

const transactions = [
  {
    id: '1',
    operator: 'Airtel',
    txnId: 'RECL-6778395',
    mobileNumber: '6350580877',
    date: '6 June 2019',
    time: '8:58 pm',
    amount: '₹399',
    status: 'Success',
  },
  {
    id: '2',
    operator: 'Airtel',
    txnId: 'RECL-6778395',
    mobileNumber: '6350580877',
    date: '6 June 2019',
    time: '8:48 pm',
    amount: '₹245',
    status: 'Failed',
  },
  {
    id: '3',
    operator: 'Airtel',
    txnId: 'RECL-6778395',
    mobileNumber: '6350580877',
    date: '4 May 2019',
    time: '6:58 pm',
    amount: '₹399',
    status: 'Success',
  },
  {
    id: '4',
    operator: 'Airtel',
    txnId: 'RECL-6778395',
    mobileNumber: '6350580877',
    date: '4 May 2019',
    time: '6:58 pm',
    amount: '₹399',
    status: 'Success',
  },
  {
    id: '5',
    operator: 'Airtel',
    txnId: 'RECL-6778395',
    mobileNumber: '6350580877',
    date: '4 May 2019',
    time: '6:58 pm',
    amount: '₹399',
    status: 'Success',
  },
  {
    id: '6',
    operator: 'Airtel',
    txnId: 'RECL-6778395',
    mobileNumber: '6350580877',
    date: '4 May 2019',
    time: '6:58 pm',
    amount: '₹399',
    status: 'Success',
  },
  {
    id: '7',
    operator: 'Airtel',
    txnId: 'RECL-6778395',
    mobileNumber: '6350580877',
    date: '4 May 2019',
    time: '6:58 pm',
    amount: '₹399',
    status: 'Success',
  },
  {
    id: '8',
    operator: 'Airtel',
    txnId: 'RECL-6778395',
    mobileNumber: '6350580877',
    date: '4 May 2019',
    time: '6:58 pm',
    amount: '₹399',
    status: 'Success',
  },
  {
    id: '9',
    operator: 'Airtel',
    txnId: 'RECL-6778395',
    mobileNumber: '6350580877',
    date: '4 May 2019',
    time: '6:58 pm',
    amount: '₹399',
    status: 'Success',
  },
  {
    id: '10',
    operator: 'Airtel',
    txnId: 'RECL-6778395',
    mobileNumber: '6350580877',
    date: '4 May 2019',
    time: '6:58 pm',
    amount: '₹399',
    status: 'Success',
  },
];

const groupTransactionsByDate = (transactions) => {
  const grouped = transactions.reduce((acc, transaction) => {
    const dateGroup = acc.find((group) => group.title === transaction.date);
    if (dateGroup) {
      dateGroup.data.push(transaction);
    } else {
      acc.push({
        title: transaction.date,
        data: [transaction],
      });
    }
    return acc;
  }, []);
  return grouped;
};

const Transaction = () => {
  const [searchDate, setSearchDate] = useState('');

  const filteredTransactions = groupTransactionsByDate(
    transactions.filter((transaction) => transaction.date.includes(searchDate))
  );

  const renderTransaction = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.details}>
        <Text style={styles.title}>{item.operator}</Text>
        <Text style={styles.account}>{item.txnId}</Text>
        <Text style={styles.account}>{item.mobileNumber}</Text>
        <Text style={styles.dateTime}>{item.time}</Text>
      </View>
      <View style={styles.amountContainer}>
        <Text style={styles.amount}>{item.amount}</Text>
        <Text
          style={[
            styles.status,
            { color: item.status === 'Success' ? 'green' : 'red' },
          ]}
        >
          {item.status}
        </Text>
      </View>
    </View>
  );

  const renderHeader = ({ section: { title } }) => (
    <Text style={styles.dateHeader}>{title}</Text>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <View style={styles.searchInputWrapper}>
          <Image
            style={styles.searchIcon}
            source={require('../assets/search.png')}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search by Date"
            value={searchDate}
            onChangeText={setSearchDate}
          />
        </View>
        <TouchableOpacity>
          <Image
            style={styles.icon}
            source={require('../assets/search.png')}
          />
        </TouchableOpacity>
        <TouchableOpacity>
          <Image
            style={styles.icon}
            source={require('../assets/download.png')}
          />
        </TouchableOpacity>
      </View>
      <SectionList
        sections={filteredTransactions}
        keyExtractor={(item) => item.id}
        renderItem={renderTransaction}
        renderSectionHeader={renderHeader}
      />
    </View>
  );
};

export default Transaction;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    paddingHorizontal: 15,
    paddingTop: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    borderColor: '#ccc',
    borderWidth: 1,
  },
  searchIcon: {
    width: 20,
    height: 20,
    marginRight: 10,
    tintColor: '#666',
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 14,
  },
  icon: {
    width: 30,
    height: 30,
    marginLeft: 15,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  details: {
    flex: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  account: {
    fontSize: 14,
    color: '#666',
    marginBottom: 3,
  },
  dateTime: {
    fontSize: 12,
    color: '#999',
  },
  amountContainer: {
    flex: 1,
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  status: {
    fontSize: 14,
    marginTop: 5,
  },
  dateHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#555',
    marginVertical: 10,
    paddingHorizontal: 5,
    
  },
});
