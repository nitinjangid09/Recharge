import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDownlineUsers } from '../api/AuthApi';
import Fonts from '../constants/Fonts';
import Colors from '../constants/Colors';

const { width } = Dimensions.get('window');

const UserListScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const headerToken = await AsyncStorage.getItem('header_token');
      const response = await getDownlineUsers({ headerToken });
      
      if (response && response.success) {
        const children = response.data?.children || [];
        setUsers(children);
        setFilteredUsers(children);
      } else {
        setError(response?.message || 'Failed to fetch users');
      }
    } catch (err) {
      console.error('Fetch Users Error:', err);
      setError('An error occurred while fetching users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (!text) {
      setFilteredUsers(users);
      return;
    }
    const filtered = users.filter((u) =>
      u.fullName?.toLowerCase().includes(text.toLowerCase()) ||
      u.userName?.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredUsers(filtered);
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <View style={styles.topRow}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-left" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.title}>Members Directory</Text>
        <TouchableOpacity 
          style={styles.addBtnSmall}
          onPress={() => navigation.navigate('CreateUser')}
        >
          <Icon name="plus" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>
      
      <Text style={styles.subtitle}>Manage all your registered users</Text>

      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color="#9CA3AF" />
        <TextInput
          placeholder="Search by name or ID"
          placeholderTextColor="#9CA3AF"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Icon name="close-circle" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const getRoleColor = (role) => {
    const r = (role || '').toUpperCase();
    if (r.includes('DISTRIBUTOR')) return '#6366F1';
    if (r.includes('RETAILER')) return '#F59E0B';
    return '#4B5563';
  };

  const renderUserCard = ({ item, index }) => (
    <TouchableOpacity style={styles.userCard} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <View style={[styles.avatarBox, { backgroundColor: getRoleColor(item.role?.name) + '15' }]}>
            <Text style={[styles.avatarTxt, { color: getRoleColor(item.role?.name) }]}>
                {(item.fullName || 'U').charAt(0).toUpperCase()}
            </Text>
        </View>
        
        <View style={styles.nameArea}>
            <View style={styles.nameRow}>
                <Text style={styles.userName} numberOfLines={1}>{item.fullName || 'N/A'}</Text>
                <View style={[styles.statusPoint, { backgroundColor: '#10B981' }]} />
            </View>
            <Text style={styles.userId}>{item.userName || 'N/A'}</Text>
        </View>

        <View style={styles.rightArea}>
            <View style={[styles.roleLabel, { backgroundColor: getRoleColor(item.role?.name) + '15' }]}>
                <Text style={[styles.roleLabelTxt, { color: getRoleColor(item.role?.name) }]}>
                    {item.role?.name || 'USER'}
                </Text>
            </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardDetails}>
        <View style={styles.detailItem}>
            <Icon name="email-outline" size={14} color="#9CA3AF" />
            <Text style={styles.detailTxt} numberOfLines={1}>{item.email || 'no-email@example.com'}</Text>
        </View>
        <View style={[styles.detailItem, { marginTop: 6 }]}>
            <Icon name="phone-outline" size={14} color="#9CA3AF" />
            <Text style={styles.detailTxt}>{item.phone || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.pkgInfo}>Package: <Text style={{ color: '#6366F1', fontFamily: Fonts.Bold }}>Default</Text></Text>
        <View style={styles.activeTag}>
            <Text style={styles.activeTagTxt}>ACTIVE</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && users.length === 0) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4F46E5" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
      {renderHeader()}
      
      <FlatList
        data={filteredUsers}
        keyExtractor={(item) => item._id}
        renderItem={renderUserCard}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Icon name="account-search-outline" size={64} color="#E5E7EB" />
            <Text style={styles.emptyTxt}>{error || 'No members found'}</Text>
            <TouchableOpacity style={styles.refreshBtn} onPress={fetchUsers}>
                <Text style={styles.refreshBtnTxt}>Refresh</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <View style={styles.mobilePagination}>
          <TouchableOpacity style={styles.pageBtn}>
            <Icon name="chevron-left" size={24} color="#9CA3AF" />
          </TouchableOpacity>
          <Text style={styles.pageIndicator}>Page <Text style={{ color: '#111827' }}>1</Text> of 1</Text>
          <TouchableOpacity style={styles.pageBtn}>
            <Icon name="chevron-right" size={24} color="#9CA3AF" />
          </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FB',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontFamily: Fonts.Bold || 'System',
    color: '#111827',
    flex: 1,
    textAlign: 'center',
  },
  addBtnSmall: {
    backgroundColor: '#5046e5',
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 2,
    marginBottom: 16,
    fontFamily: Fonts.Medium || 'System',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    borderRadius: 12,
    height: 48,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 8,
    color: '#111827',
    fontSize: 14,
    fontFamily: Fonts.Regular || 'System',
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  userCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarTxt: {
    fontSize: 18,
    fontFamily: Fonts.Bold || 'System',
  },
  nameArea: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userName: {
    fontSize: 15,
    fontFamily: Fonts.Bold || 'System',
    color: '#111827',
  },
  statusPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginLeft: 8,
  },
  userId: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
    fontFamily: Fonts.Medium || 'System',
  },
  rightArea: {
    alignItems: 'flex-end',
  },
  roleLabel: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleLabelTxt: {
    fontSize: 10,
    fontFamily: Fonts.Bold || 'System',
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },
  cardDetails: {
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailTxt: {
    fontSize: 12,
    color: '#6B7280',
    fontFamily: Fonts.Medium || 'System',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    padding: 8,
    borderRadius: 8,
  },
  pkgInfo: {
    fontSize: 11,
    color: '#6B7280',
    fontFamily: Fonts.Medium || 'System',
  },
  activeTag: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  activeTagTxt: {
    fontSize: 10,
    color: '#059669',
    fontFamily: Fonts.Bold || 'System',
  },
  mobilePagination: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    height: 54,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
  },
  pageBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageIndicator: {
    fontSize: 13,
    color: '#6B7280',
    fontFamily: Fonts.Medium || 'System',
  },
  emptyContainer: {
    marginTop: 80,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTxt: {
    fontSize: 14,
    color: '#9CA3AF',
    fontFamily: Fonts.Medium || 'System',
    textAlign: 'center',
    marginTop: 12,
  },
  refreshBtn: {
    marginTop: 20,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  refreshBtnTxt: {
    fontSize: 13,
    color: '#4F46E5',
    fontFamily: Fonts.Bold || 'System',
  },
});

export default UserListScreen;
