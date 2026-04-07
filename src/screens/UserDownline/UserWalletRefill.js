/**
 * B2B Dashboard Screen — React Native
 * Camlenio · Wallet Refill, Services & Alerts
 * Color system: Gold / Black / Beige
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Platform,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Colors from '../../constants/Colors';
import Fonts from '../../constants/Fonts';
import HeaderBar from '../../componets/Utils/HeaderBar';
import { getDownlineUsers, getUserWalletRefillProfile, refillUserWallet, getUserWalletRefillHistory } from '../../api/AuthApi';
import CustomAlert from '../../componets/Utils/CustomAlert';

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Recursively flatten the downline tree (including self) into a flat array */
function flattenUsers(node) {
    if (!node) return [];
    const result = [{
        id: node._id,
        name: node.fullName || '',
        code: node.userName || '',
        mobile: node.phone || '',
        email: node.email || '',
        avatar: (node.fullName || 'U')[0].toUpperCase(),
        role: node.role?.name || '',
    }];
    if (Array.isArray(node.children)) {
        node.children.forEach((child) => {
            result.push(...flattenUsers(child));
        });
    }
    return result;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(isoString) {
    if (!isoString) return '';
    const date = new Date(isoString);
    const options = { day: '2-digit', month: 'short', year: 'numeric' };
    const datePart = date.toLocaleDateString('en-GB', options);
    const timePart = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return `${datePart} · ${timePart}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Decorative circle for card backgrounds */
function DecorCircle({ size, top, right, opacity = 0.18 }) {
    return (
        <View
            style={{
                position: 'absolute', top, right,
                width: size, height: size, borderRadius: size / 2,
                backgroundColor: `rgba(255,255,255,${opacity})`,
            }}
        />
    );
}

/** Pill chip */
function Chip({ label, bg, color }) {
    return (
        <View style={[styles.chip, { backgroundColor: bg }]}>
            <Text style={[styles.chipText, { color }]}>{label}</Text>
        </View>
    );
}

/** Section header */
function SectionRow({ title, action, onAction }) {
    return (
        <View style={styles.sectionRow}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <TouchableOpacity onPress={onAction}>
                <Text style={styles.seeAll}>{action}</Text>
            </TouchableOpacity>
        </View>
    );
}

// ─── WALLET SCREEN ────────────────────────────────────────────────────────────
function WalletScreen({ navigation }) {
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(true);
    const [selectedUser, setSelectedUser] = useState(null);
    const [amount, setAmount] = useState('');
    const [selectedQuick, setSelectedQuick] = useState(null);
    const [userPickerOpen, setUserPickerOpen] = useState(false);

    const [userProfile, setUserProfile] = useState(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [submittingRefill, setSubmittingRefill] = useState(false);
    const [history, setHistory] = useState([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [alert, setAlert] = useState({ visible: false, type: 'info', title: '', message: '' });

    const quickAmounts = ['500', '1000', '2000', '5000'];
    const labels = ['₹500', '₹1K', '₹2K', '₹5K'];

    // ── Fetch user profile when selectedUser changes or after refill ──────────
    const fetchUsers = async () => {
        try {
            setLoadingUsers(true);
            const headerToken = await AsyncStorage.getItem('header_token');
            if (!headerToken) {
                Alert.alert('Session Expired', 'Please login again.');
                setLoadingUsers(false);
                return;
            }
            const res = await getDownlineUsers({ headerToken });
            if (res?.success && res?.data) {
                // Start flattening from children to exclude the root/parent user (self)
                const children = res.data.children || [];
                const flat = children.flatMap(child => flattenUsers(child));
                setUsers(flat);
                if (flat.length > 0) setSelectedUser(flat[0]);
            } else {
                showAlert('error', 'Error', res?.message || 'Unable to fetch users.');
            }
        } catch (err) {
            console.log('[UserWalletRefill] fetchUsers error:', err);
            showAlert('error', 'Error', 'Network error. Unable to fetch users.');
        } finally {
            setLoadingUsers(false);
        }
    };

    // ── Fetch history on mount ────────────────────────────────────────────────
    const fetchHistory = async () => {
        try {
            setLoadingHistory(true);
            const headerToken = await AsyncStorage.getItem('header_token');
            if (!headerToken) return;
            const res = await getUserWalletRefillHistory({ headerToken });
            if (res?.success && Array.isArray(res.data)) {
                setHistory(res.data);
            }
        } catch (err) {
            console.log('[UserWalletRefill] fetchHistory error:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        fetchUsers();
        fetchHistory();
    }, []);

    // ── Fetch user profile when selectedUser changes or after refill ──────────
    const fetchProfile = async () => {
        if (!selectedUser?.id) {
            setUserProfile(null);
            return;
        }
        try {
            setLoadingProfile(true);
            const headerToken = await AsyncStorage.getItem('header_token');
            if (!headerToken) return;

            const res = await getUserWalletRefillProfile(selectedUser.id, { headerToken });
            if (res?.success && res?.data) {
                setUserProfile(res.data);
            } else {
                setUserProfile(null);
            }
        } catch (err) {
            console.log('[UserWalletRefill] fetchProfile error:', err);
            setUserProfile(null);
        } finally {
            setLoadingProfile(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, [selectedUser]);

    const handleQuick = (val) => {
        setSelectedQuick(val);
        setAmount(val);
    };

    const showAlert = (type, title, message) => {
        setAlert({ visible: true, type, title, message });
    };

    const handleRefill = async () => {
        if (!selectedUser) {
            showAlert('warning', 'No User', 'Please select a user to refill.');
            return;
        }
        if (!amount || isNaN(amount) || Number(amount) <= 0) {
            showAlert('warning', 'Invalid Amount', 'Please enter a valid amount to refill.');
            return;
        }

        try {
            const headerToken = await AsyncStorage.getItem('header_token');
            if (!headerToken) {
                showAlert('error', 'Session Expired', 'Please login again.');
                return;
            }

            setSubmittingRefill(true);
            const idempotencyKey = `REFILL_${Date.now()}_${Math.random().toString(36).substring(7).toUpperCase()}`;

            const res = await refillUserWallet({
                userId: selectedUser.id,
                amount: Number(amount),
                idempotencyKey,
                headerToken
            });

            if (res?.success) {
                showAlert('success', 'Refill Success', res.message || `Wallet of ${selectedUser.name} refilled successfully!`);
                setAmount('');
                setSelectedQuick(null);
                // Refresh balance immediately
                fetchProfile();
            } else {
                showAlert('error', 'Refill Failed', res?.message || 'Wallet refill failed.');
            }
        } catch (err) {
            console.log('[UserWalletRefill] handleRefill error:', err);
            showAlert('error', 'Error', 'Network error. Please try again.');
        } finally {
            setSubmittingRefill(false);
        }
    };

    return (
        <View style={{ flex: 1, backgroundColor: Colors.homebg }}>
            <HeaderBar
                title="User Wallet Refill"
                onBack={() => navigation.goBack()}
            />
            <ScrollView showsVerticalScrollIndicator={false} style={styles.screenScroll}>
                <View style={{ height: 16 }} />

                {/* Wallet Hero Card */}
                <View style={styles.walletHero}>
                    <DecorCircle size={150} top={-50} right={-40} opacity={0.08} />
                    <DecorCircle size={80} top={40} right={80} opacity={0.04} />

                    <View style={styles.walletHeroHeader}>
                        <Text style={styles.walletHeroLabel}>
                            {userProfile ? `${userProfile.name} · ${userProfile.userName}` : selectedUser ? `${selectedUser.name} · ${selectedUser.code}` : 'Select a user'}
                        </Text>
                    </View>

                    <View style={styles.walletBalances}>
                        <View style={styles.walletStatItem}>
                            <Text style={styles.walletBalanceLabel}>Main Balance</Text>
                            <Text style={styles.walletBalanceAmount}>
                                <Text style={styles.walletRupee}>₹ </Text>
                                {loadingProfile ? '...' : (userProfile?.mainWallet !== undefined ? parseFloat(userProfile.mainWallet).toFixed(2) : '0.00')}
                            </Text>
                        </View>
                        <View style={styles.walletDivider} />
                        <View style={styles.walletStatItem}>
                            <Text style={styles.walletBalanceLabel}>AEPS Wallet</Text>
                            <Text style={styles.walletBalanceAmount}>
                                <Text style={styles.walletRupee}>₹ </Text>
                                {loadingProfile ? '...' : (userProfile?.aepsWallet !== undefined ? parseFloat(userProfile.aepsWallet).toFixed(2) : '0.00')}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Refill Form Card */}
                <View style={styles.refillCard}>
                    {/* User Picker */}
                    <Text style={styles.fieldLabel}>SELECT USER</Text>

                    {loadingUsers ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color={Colors.primary} />
                            <Text style={styles.loadingText}>Fetching users…</Text>
                        </View>
                    ) : (
                        <>
                            <View style={{ zIndex: 10 }}>
                                <TouchableOpacity
                                    style={styles.selectField}
                                    onPress={() => setUserPickerOpen(!userPickerOpen)}
                                    activeOpacity={0.8}
                                >
                                    <View style={{ flex: 1 }}>
                                        {selectedUser ? (
                                            <>
                                                <Text style={styles.selectText}>{userProfile?.name || selectedUser.name}</Text>
                                                <Text style={styles.selectSubText}>{userProfile?.userName || selectedUser.code}</Text>
                                            </>
                                        ) : (
                                            <Text style={[styles.selectText, { color: Colors.text_placeholder }]}>
                                                Select a user
                                            </Text>
                                        )}
                                    </View>
                                    <Text style={styles.selectChevron}>{userPickerOpen ? '▲' : '▼'}</Text>
                                </TouchableOpacity>

                                {userPickerOpen && (
                                    <View style={styles.dropdownList}>
                                        {users.map((u) => (
                                            <TouchableOpacity
                                                key={u.id}
                                                style={[
                                                    styles.dropdownItem,
                                                    selectedUser?.id === u.id && styles.dropdownItemActive,
                                                ]}
                                                onPress={() => { setSelectedUser(u); setUserPickerOpen(false); }}
                                            >
                                                <Text style={[
                                                    styles.dropdownItemText,
                                                    selectedUser?.id === u.id && styles.dropdownItemTextActive,
                                                ]}>
                                                    {u.name}
                                                </Text>
                                                <Text style={[
                                                    styles.dropdownItemSubText,
                                                    selectedUser?.id === u.id && styles.dropdownItemSubTextActive,
                                                ]}>
                                                    {u.code}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                )}
                            </View>
                        </>
                    )}

                    {/* Amount */}
                    <Text style={[styles.fieldLabel, { marginTop: 16 }]}>REFILL AMOUNT (₹)</Text>
                    <TextInput
                        style={styles.inputField}
                        value={amount}
                        onChangeText={(t) => { setAmount(t); setSelectedQuick(null); }}
                        placeholder="Enter amount"
                        placeholderTextColor={Colors.text_placeholder}
                        keyboardType="numeric"
                    />

                    {/* Quick Amount Buttons */}
                    <View style={styles.quickAmounts}>
                        {quickAmounts.map((val, idx) => (
                            <TouchableOpacity
                                key={val}
                                style={[styles.quickBtn, selectedQuick === val && styles.quickBtnActive]}
                                onPress={() => handleQuick(val)}
                                activeOpacity={0.8}
                            >
                                <Text style={[styles.quickBtnText, selectedQuick === val && styles.quickBtnTextActive]}>
                                    {labels[idx]}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Refill Button */}
                    <TouchableOpacity
                        style={[styles.primaryBtn, submittingRefill && { opacity: 0.7 }]}
                        onPress={handleRefill}
                        activeOpacity={0.85}
                        disabled={submittingRefill}
                    >
                        {submittingRefill ? (
                            <ActivityIndicator size="small" color={Colors.white} />
                        ) : (
                            <Text style={styles.primaryBtnText}>Wallet Refill</Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Profile Card */}
                {selectedUser && (
                    <View style={styles.profileCard}>
                        <View style={styles.profileHeader}>
                            <View style={styles.avatarContainer}>
                                <View style={styles.avatarRing} />
                                <View style={styles.avatar}>
                                    <Text style={styles.avatarText}>{selectedUser.avatar}</Text>
                                </View>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.profileName}>{userProfile?.name || selectedUser.name}</Text>
                                <Text style={styles.profileUid}>{userProfile?.userName || selectedUser.code}</Text>
                            </View>
                            {userProfile?.isActive && (
                                <Chip label="Verified" bg={Colors.finance_accent + '20'} color={Colors.finance_accent} />
                            )}
                        </View>
                        <View style={styles.profileMeta}>
                            <View>
                                <Text style={styles.fieldLabel}>MOBILE</Text>
                                <Text style={styles.profileMetaValue}>{userProfile?.phone || selectedUser.mobile || '—'}</Text>
                            </View>
                            <View>
                                <Text style={styles.fieldLabel}>EMAIL</Text>
                                <Text style={styles.profileMetaValue}>{userProfile?.email || selectedUser.email || '—'}</Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* Refill History */}
                <SectionRow title="Refill History" action="See all →" onAction={() => { }} />

                {loadingHistory ? (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                        <ActivityIndicator size="small" color={Colors.primary} />
                    </View>
                ) : history.length === 0 ? (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                        <Text style={{ color: Colors.text_secondary, fontSize: 13 }}>No refill history found.</Text>
                    </View>
                ) : (
                    history.map((txn, idx) => (
                        <TouchableOpacity key={txn.referenceId || idx} style={styles.txnRow} activeOpacity={0.85}>
                            <View style={styles.txnIcon}><Text style={styles.txnIconText}>💳</Text></View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.txnName}>{txn.name || 'Unknown User'}</Text>
                                <Text style={styles.txnMeta}>{formatDate(txn.createdAt)}</Text>
                            </View>
                            <Text style={styles.txnAmount}>+₹{txn.amount}</Text>
                        </TouchableOpacity>
                    ))
                )}

                <View style={{ height: 24 }} />
            </ScrollView>

            <CustomAlert
                visible={alert.visible}
                type={alert.type}
                title={alert.title}
                message={alert.message}
                onClose={() => setAlert({ ...alert, visible: false })}
            />
        </View>
    );
}



// ─── MAIN SCREEN ──────────────────────────────────────────────────────────────
export default function UserWalletRefillScreen({ navigation }) {
    return (
        <SafeAreaView style={styles.safeArea}>
            {/* Screen Content */}
            <View style={styles.screenContainer}>
                <WalletScreen navigation={navigation} />
            </View>
        </SafeAreaView>
    );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: Colors.homebg,
    },

    // Screen
    screenContainer: {
        flex: 1,
        backgroundColor: Colors.homebg,
    },
    screenScroll: {
        flex: 1,
        backgroundColor: Colors.homebg,
    },

    // Loading
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        height: 50,
        paddingHorizontal: 12,
    },
    loadingText: {
        fontSize: 13,
        color: Colors.text_secondary,
        fontWeight: '500',
    },

    // Wallet Hero
    walletHero: {
        backgroundColor: Colors.primary,
        borderRadius: 24,
        padding: 24,
        marginHorizontal: 20,
        marginBottom: 16,
        elevation: 12,
        shadowColor: Colors.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 15,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.08)',
    },
    walletHeroHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 20,
    },

    walletHeroLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    walletBalances: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    walletDivider: {
        width: 1,
        height: 35,
        backgroundColor: 'rgba(255,255,255,0.15)',
        marginHorizontal: 20,
    },
    walletStatItem: {
        flex: 1,
    },

    walletBalanceAmount: {
        fontSize: 28,
        fontWeight: '700',
        color: Colors.white,
        marginTop: 10,
    },
    walletRupee: {
        fontSize: 16,
        fontWeight: '900',
        color: Colors.finance_accent,
    },
    walletBalanceLabel: {
        fontSize: 10,
        color: Colors.finance_accent,
        fontWeight: '800',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
        marginBottom: 6,
    },

    // Card
    refillCard: {
        backgroundColor: Colors.secondary,
        borderRadius: 20,
        padding: 24,
        marginHorizontal: 20,
        marginBottom: 16,

    },
    profileCard: {
        backgroundColor: Colors.secondary,
        borderRadius: 20,
        padding: 24,
        marginHorizontal: 20,
        marginBottom: 16,

    },

    // Select / Input
    fieldLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: Colors.text_primary,
        letterSpacing: 1.2,
        marginBottom: 7,
        textTransform: 'uppercase',
    },
    selectField: {
        minHeight: 56,
        backgroundColor: Colors.white,
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        marginBottom: 4,
        elevation: 2,
    },
    selectText: {
        fontSize: 14,
        fontWeight: '600',
        color: Colors.text_primary,
    },
    selectSubText: {
        fontSize: 11,
        fontWeight: '500',
        color: Colors.text_secondary,
        marginTop: 2,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    selectChevron: {
        fontSize: 11,
        color: Colors.text_secondary,
        marginLeft: 8,
    },
    dropdownList: {
        position: 'absolute',
        top: 60, // height of selectField (56) + small gap
        left: 0,
        right: 0,
        backgroundColor: Colors.white,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: Colors.input_border,
        overflow: 'hidden',
        zIndex: 999,
        elevation: 5,
        maxHeight: 250,
    },
    dropdownItem: {
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: Colors.divider,
    },
    dropdownItemActive: {
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    dropdownItemText: {
        fontSize: 14,
        color: Colors.text_primary,
        fontWeight: '600',
    },
    dropdownItemTextActive: {
        color: Colors.primary,
        fontWeight: '700',
    },
    dropdownItemSubText: {
        fontSize: 11,
        color: Colors.text_secondary,
        fontWeight: '500',
        marginTop: 2,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    dropdownItemSubTextActive: {
        color: Colors.primary,
        opacity: 0.7,
    },
    inputField: {
        height: 50,
        backgroundColor: Colors.white,
        borderRadius: 12,
        paddingHorizontal: 16,
        fontSize: 14,
        fontFamily: Fonts.Medium,
        color: Colors.text_primary,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        elevation: 2,
    },

    // Quick Amounts
    quickAmounts: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    quickBtn: {
        flex: 1,
        height: 44,
        backgroundColor: Colors.white,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: Colors.secondary,
        elevation: 2,
    },
    quickBtnActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.finance_accent,
        elevation: 6,
        shadowColor: Colors.finance_accent,
        shadowOpacity: 0.4,
        shadowRadius: 8,
    },
    quickBtnText: {
        fontSize: 13,
        fontWeight: '800',
        color: Colors.text_primary,
    },
    quickBtnTextActive: {
        color: Colors.finance_accent,
    },

    // Primary Button
    primaryBtn: {
        height: 52,
        backgroundColor: Colors.primary,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 10,
        elevation: 5,
    },
    primaryBtnText: {
        fontSize: 14,
        fontWeight: '800',
        color: Colors.white,
        letterSpacing: 0.3,
    },

    // Profile
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    avatarContainer: {
        width: 56,
        height: 56,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarRing: {
        position: 'absolute',
        width: 56,
        height: 56,
        borderRadius: 28,
        borderWidth: 2,
        borderColor: Colors.finance_accent,
        borderStyle: 'dashed',
        opacity: 0.5,
    },
    avatar: {
        width: 46,
        height: 46,
        borderRadius: 23,
        backgroundColor: Colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        fontSize: 18,
        fontWeight: '800',
        color: Colors.white,
    },
    profileName: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.text_primary,
        letterSpacing: -0.2,
    },
    profileUid: {
        fontSize: 11,
        color: Colors.text_secondary,
        marginTop: 2,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    profileMeta: {
        flexDirection: 'row',
        gap: 24,
    },
    profileMetaValue: {
        fontSize: 13,
        color: Colors.text_primary,
        fontWeight: '500',
    },

    // Chip
    chip: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 100,
    },
    chipText: {
        fontSize: 10,
        fontWeight: '700',
    },

    // Section Row
    sectionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 10,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: Colors.text_primary,
    },
    seeAll: {
        fontSize: 12,
        fontWeight: '600',
        color: Colors.finance_accent,
    },

    // Transaction Row
    txnRow: {
        backgroundColor: Colors.secondary,
        borderRadius: 20,
        padding: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        marginHorizontal: 20,
        marginBottom: 12,

    },
    txnIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        backgroundColor: Colors.white,
        alignItems: 'center',
        justifyContent: 'center',
        elevation: 2,

    },
    txnIconText: {
        fontSize: 20,
    },
    txnName: {
        fontSize: 15,
        fontWeight: '800',
        color: Colors.text_primary,
        letterSpacing: -0.2,
    },
    txnMeta: {
        fontSize: 11,
        color: Colors.text_secondary,
        marginTop: 3,
        fontWeight: '500',
    },
    txnAmount: {
        fontSize: 16,
        fontWeight: '900',
        color: Colors.finance_accent,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
});