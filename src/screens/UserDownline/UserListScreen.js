import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import LinearGradient from "react-native-linear-gradient";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDownlineUsers } from '../../api/AuthApi';
import Fonts from '../../constants/Fonts';
import Colors from '../../constants/Colors';

const { width } = Dimensions.get('window');
const scale = width / 375;

const UserListScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

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
      setRefreshing(false);
    }
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    fetchUsers();
  }, []);

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
          <Icon name="arrow-left" size={24} color={Colors.white} />
        </TouchableOpacity>
        <View style={styles.logoCircle}>
          <Icon name="account-group" size={22} color={Colors.primary} />
        </View>
        <TouchableOpacity
          style={styles.addBtnSmall}
          onPress={() => navigation.navigate('CreateUser')}
        >
          <Icon name="plus" size={20} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <Text style={styles.title}>Members Directory</Text>
      <Text style={styles.subtitle}>Manage all your registered users</Text>

      <View style={styles.searchContainer}>
        <Icon name="magnify" size={20} color={Colors.icon_secondary} />
        <TextInput
          placeholder="Search by name or ID"
          placeholderTextColor={Colors.text_placeholder}
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={handleSearch}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')}>
            <Icon name="close-circle" size={18} color={Colors.icon_secondary} />
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
        <View style={styles.avatarBox}>
          <Text style={styles.avatarTxt}>
            {(item.fullName || 'U').charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.nameArea}>
          <View style={styles.nameRow}>
            <Text style={styles.userName} numberOfLines={1}>{item.fullName || 'N/A'}</Text>
            <View style={[styles.statusPoint, { backgroundColor: Colors.finance_success || '#10B981' }]} />
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
          <Icon name="email-outline" size={14} color={Colors.icon_secondary} />
          <Text style={styles.detailTxt} numberOfLines={1}>{item.email || 'no-email@example.com'}</Text>
        </View>
        <View style={[styles.detailItem, { marginTop: 6 }]}>
          <Icon name="phone-outline" size={14} color={Colors.icon_secondary} />
          <Text style={styles.detailTxt}>{item.phone || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <Text style={styles.pkgInfo}>Package: <Text style={{ color: Colors.accent, fontFamily: Fonts.Bold }}>Default</Text></Text>
        <View style={styles.activeTag}>
          <Text style={styles.activeTagTxt}>ACTIVE</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (loading && users.length === 0) {
    return (
      <LinearGradient colors={Colors.background_gradient} style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </LinearGradient>
    );
  }

  return (
    <LinearGradient colors={Colors.background_gradient} style={styles.container}>
      <View style={styles.circle1} />
      <View style={styles.circle2} />
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
        {renderHeader()}

        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item._id}
          renderItem={renderUserCard}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="account-search-outline" size={64} color={Colors.circle_bg} />
              <Text style={styles.emptyTxt}>{error || 'No members found'}</Text>
              <TouchableOpacity style={styles.refreshBtn} onPress={fetchUsers}>
                <Text style={styles.refreshBtnTxt}>Refresh</Text>
              </TouchableOpacity>
            </View>
          }
        />

        <View style={styles.mobilePagination}>
          <TouchableOpacity style={styles.pageBtn}>
            <Icon name="chevron-left" size={24} color={Colors.icon_secondary} />
          </TouchableOpacity>
          <Text style={styles.pageIndicator}>Page <Text style={{ color: Colors.primary }}>1</Text> of 1</Text>
          <TouchableOpacity style={styles.pageBtn}>
            <Icon name="chevron-right" size={24} color={Colors.icon_secondary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerContainer: {
    padding: 16 * scale,
    paddingTop: 10 * scale,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20 * scale,
  },
  backBtn: {
    width: 40 * scale,
    height: 40 * scale,
    borderRadius: 12 * scale,
    backgroundColor: 'rgba(0,0,0,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoCircle: {
    width: 44 * scale,
    height: 44 * scale,
    borderRadius: 15 * scale,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.black,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  title: {
    fontSize: 24 * scale,
    fontFamily: Fonts.Bold,
    color: Colors.primary,
    textAlign: 'center',
  },
  addBtnSmall: {
    backgroundColor: Colors.primary,
    width: 40 * scale,
    height: 40 * scale,
    borderRadius: 12 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: Colors.black,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  subtitle: {
    fontSize: 13 * scale,
    color: Colors.text_secondary,
    textAlign: 'center',
    marginTop: 4 * scale,
    marginBottom: 20 * scale,
    fontFamily: Fonts.Medium,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.input_bg,
    paddingHorizontal: 16 * scale,
    borderRadius: 30 * scale,
    height: 50 * scale,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    marginLeft: 10 * scale,
    color: Colors.black,
    fontSize: 14 * scale,
    fontFamily: Fonts.Medium,
    padding: 0,
  },
  listContainer: {
    padding: 16 * scale,
    paddingBottom: 100 * scale,
  },
  userCard: {
    backgroundColor: Colors.secondary,
    borderRadius: 20 * scale,
    padding: 16 * scale,
    marginBottom: 16 * scale,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.whiteOpacity_65,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarBox: {
    width: 48 * scale,
    height: 48 * scale,
    borderRadius: 15 * scale,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    elevation: 4,
    shadowColor: Colors.black,
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  avatarTxt: {
    fontSize: 20 * scale,
    fontFamily: Fonts.Bold,
    color: Colors.white,
  },
  nameArea: {
    flex: 1,
    marginLeft: 14 * scale,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4 * scale,
  },
  userName: {
    fontSize: 16 * scale,
    fontFamily: Fonts.Bold,
    color: Colors.primary,
  },
  statusPoint: {
    width: 6 * scale,
    height: 6 * scale,
    borderRadius: 3 * scale,
    marginLeft: 10 * scale,
  },
  userId: {
    fontSize: 12 * scale,
    color: Colors.text_secondary,
    marginTop: 2 * scale,
    fontFamily: Fonts.Medium,
  },
  rightArea: {
    alignItems: 'flex-end',
  },
  roleLabel: {
    paddingHorizontal: 10 * scale,
    paddingVertical: 5 * scale,
    borderRadius: 8 * scale,
    backgroundColor: Colors.whiteOpacity_80,
  },
  roleLabelTxt: {
    fontSize: 11 * scale,
    fontFamily: Fonts.Bold,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 14 * scale,
    opacity: 0.5,
  },
  cardDetails: {
    marginBottom: 14 * scale,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8 * scale,
  },
  detailTxt: {
    fontSize: 13 * scale,
    color: Colors.text_secondary,
    fontFamily: Fonts.Medium,
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.03)',
    padding: 10 * scale,
    borderRadius: 12 * scale,
  },
  pkgInfo: {
    fontSize: 12 * scale,
    color: Colors.text_secondary,
    fontFamily: Fonts.Medium,
  },
  activeTag: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    paddingHorizontal: 10 * scale,
    paddingVertical: 3 * scale,
    borderRadius: 6 * scale,
  },
  activeTagTxt: {
    fontSize: 11 * scale,
    color: Colors.finance_success || '#059669',
    fontFamily: Fonts.Bold,
  },
  mobilePagination: {
    position: 'absolute',
    bottom: 24 * scale,
    left: 20 * scale,
    right: 20 * scale,
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 18 * scale,
    height: 60 * scale,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12 * scale,
    elevation: 8,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  pageBtn: {
    width: 44 * scale,
    height: 44 * scale,
    borderRadius: 14 * scale,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageIndicator: {
    fontSize: 14 * scale,
    color: Colors.text_secondary,
    fontFamily: Fonts.Medium,
  },
  emptyContainer: {
    marginTop: 100 * scale,
    alignItems: 'center',
    paddingHorizontal: 40 * scale,
  },
  emptyTxt: {
    fontSize: 15 * scale,
    color: Colors.text_secondary,
    fontFamily: Fonts.Medium,
    textAlign: 'center',
    marginTop: 16 * scale,
    opacity: 0.8,
  },
  refreshBtn: {
    marginTop: 24 * scale,
    backgroundColor: Colors.whiteOpacity_18,
    paddingHorizontal: 24 * scale,
    paddingVertical: 12 * scale,
    borderRadius: 30 * scale,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  refreshBtnTxt: {
    fontSize: 14 * scale,
    color: Colors.primary,
    fontFamily: Fonts.Bold,
  },
  circle1: {
    position: 'absolute',
    width: 250 * scale,
    height: 250 * scale,
    borderRadius: 125 * scale,
    backgroundColor: Colors.circle_bg,
    top: -70 * scale,
    right: -70 * scale,
  },
  circle2: {
    position: 'absolute',
    width: 200 * scale,
    height: 200 * scale,
    borderRadius: 100 * scale,
    backgroundColor: Colors.circle_bg,
    bottom: -40 * scale,
    left: -40 * scale,
  },
});

export default UserListScreen;
