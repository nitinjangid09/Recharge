import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    Platform,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import HeaderBar from '../componets/HeaderBar/HeaderBar';
import FullScreenLoader from '../componets/Loader/FullScreenLoader';
import Colors from '../constants/Colors';
import Fonts from '../constants/Fonts';

// Derived / local constants
const GOLD_DEEP = Colors.finance_accent;
const GOLD_LIGHT = Colors.homebg;
const GOLD_MID = Colors.secondary;
const CARD_BG = '#FFF8EC';
const BLACK_2 = Colors.black;
const SUCCESS_COLOR = Colors.finance_success;
const GRAY_TEXT = Colors.text_secondary;

// ─── Data ─────────────────────────────────────────────────────────────────────
const TABS = ['All', 'Updates', 'Alerts', 'Promos'];

const TODAY_NOTIFICATIONS = [
    {
        id: '1',
        iconBg: 'gold',
        icon: '🏦',
        title: 'Commission Update',
        time: '2m ago',
        body: 'New commission structures introduced for ',
        bodyBold: 'DMT services',
        bodyEnd: '. Check the latest rates effective today.',
        badge: { type: 'warning', label: '⚡ Action required' },
        unread: true,
    },
    {
        id: '2',
        iconBg: 'green',
        icon: '✅',
        title: 'Protocol Finalized',
        time: '1h ago',
        body: 'Your ',
        bodyBold: 'BBPS Utility',
        bodyEnd: ' submission has been finalized. Ref: REF2468962F',
        badge: { type: 'success', label: '✓ Completed' },
        unread: true,
    },
    {
        id: '3',
        iconBg: 'orange',
        icon: '🔄',
        title: 'ITR Processing',
        time: '3h ago',
        body: 'Your ',
        bodyBold: 'Offline ITR File',
        bodyEnd: ' submission is under review. Expected completion in 2–3 business days.',
        badge: { type: 'info', label: '⏳ In progress' },
        unread: true,
    },
];

const YESTERDAY_NOTIFICATIONS = [
    {
        id: '4',
        iconBg: 'blue',
        icon: '💳',
        title: 'Wallet Credited',
        time: 'Yesterday',
        body: 'Main wallet credited with ',
        bodyBold: '₹462.94',
        bodyEnd: '. Balance updated successfully.',
        badge: null,
        unread: false,
    },
    {
        id: '5',
        iconBg: 'red',
        icon: '🛡️',
        title: 'Security Alert',
        time: 'Yesterday',
        body: 'New login detected from ',
        bodyBold: 'Jaipur, Rajasthan',
        bodyEnd: ". If this wasn't you, secure your account.",
        badge: { type: 'error', label: '⚠ Review login' },
        unread: false,
    },
    {
        id: '6',
        iconBg: 'gold',
        icon: '📋',
        title: 'New Protocol Added',
        time: '2d ago',
        body: '',
        bodyBold: 'PAN Card Application',
        bodyEnd: ' service is now available in Offline Services. Process fee ₹299.',
        badge: null,
        unread: false,
    },
];

// ─── Sub-components ────────────────────────────────────────────────────────────

const NotifIconWrap = ({ bg, icon }) => {
    const bgStyle = {
        gold: { backgroundColor: '#F5E7C6' },
        green: { backgroundColor: '#D1FAE5' },
        orange: { backgroundColor: '#FFEDD5' },
        blue: { backgroundColor: '#DBEAFE' },
        red: { backgroundColor: '#FEE2E2' },
    }[bg] || { backgroundColor: GOLD_LIGHT };

    return (
        <View style={[styles.notifIconWrap, bgStyle]}>
            <Text style={styles.notifIconEmoji}>{icon}</Text>
        </View>
    );
};

const BadgeChip = ({ type, label }) => {
    const badgeStyles = {
        success: { bg: '#D1FAE5', color: '#065F46' },
        warning: { bg: '#FEF3C7', color: '#92400E' },
        info: { bg: '#DBEAFE', color: '#1E40AF' },
        error: { bg: '#FEE2E2', color: '#991B1B' },
    }[type] || { bg: GOLD_LIGHT, color: Colors.text_primary };

    return (
        <View style={[styles.badge, { backgroundColor: badgeStyles.bg }]}>
            <Text style={[styles.badgeText, { color: badgeStyles.color }]}>{label}</Text>
        </View>
    );
};

const NotifCard = ({ item }) => (
    <TouchableOpacity
        activeOpacity={0.85}
        style={[styles.notifCard, item.unread && styles.notifCardUnread]}
    >
        {item.unread && <View style={styles.unreadBar} />}
        <NotifIconWrap bg={item.iconBg} icon={item.icon} />
        <View style={styles.notifContent}>
            <View style={styles.notifContentTop}>
                <Text style={styles.notifTitle}>{item.title}</Text>
                <Text style={styles.notifTime}>{item.time}</Text>
            </View>
            <Text style={styles.notifBody} numberOfLines={2}>
                {item.body}
                <Text style={styles.notifBodyBold}>{item.bodyBold}</Text>
                {item.bodyEnd}
            </Text>
            {item.badge && <BadgeChip type={item.badge.type} label={item.badge.label} />}
        </View>
        {item.unread && <View style={styles.unreadDot} />}
    </TouchableOpacity>
);

const SectionLabel = ({ label }) => (
    <Text style={styles.sectionLabel}>{label}</Text>
);

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function NotificationsScreen({ navigation }) {
    const [activeTab, setActiveTab] = useState('All');
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        // Simulate a refresh delay since the data is currently static constants
        setTimeout(() => {
            setRefreshing(false);
        }, 1500);
    }, []);

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor={GOLD_LIGHT} />
            <FullScreenLoader visible={refreshing} label="Updating inbox..." />

            <HeaderBar
                title="NOTIFICATIONS"
                onBack={() => navigation?.goBack()}
                rightIcon="check-all"
                onRightPress={() => console.log("Mark all read")}
            />

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={Colors.finance_accent}
                        colors={[Colors.finance_accent]}
                        progressBackgroundColor={Colors.white}
                    />
                }
            >
                {/* ── Inbox Stats ── */}
                <View style={styles.statsHeader}>
                    <Text style={styles.pageTitle}>Inbox</Text>
                    <Text style={styles.pageSub}>3 unread updates</Text>
                </View>

                {/* ── Filter Tabs ── */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={styles.tabsScroll}
                    contentContainerStyle={styles.tabsContainer}
                >
                    {TABS.map((tab) => (
                        <TouchableOpacity
                            key={tab}
                            onPress={() => setActiveTab(tab)}
                            style={[styles.tab, activeTab === tab && styles.tabActive]}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                                {tab}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* ── Today ── */}
                <View style={styles.section}>
                    <SectionLabel label="TODAY" />
                    <View style={styles.notifList}>
                        {TODAY_NOTIFICATIONS.map((item) => (
                            <NotifCard key={item.id} item={item} />
                        ))}
                    </View>
                </View>

                {/* ── Yesterday ── */}
                <View style={styles.section}>
                    <SectionLabel label="YESTERDAY" />
                    <View style={styles.notifList}>
                        {YESTERDAY_NOTIFICATIONS.map((item) => (
                            <NotifCard key={item.id} item={item} />
                        ))}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: GOLD_LIGHT,
    },
    scrollView: {
        flex: 1,
        backgroundColor: GOLD_LIGHT,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    statsHeader: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 16,
    },

    // ── Header (Legacy from local header, kept if needed but HeaderBar is used)
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 16,
        backgroundColor: GOLD_LIGHT,
    },
    pageTitle: {
        fontSize: 26,
        color: Colors.text_primary,
        letterSpacing: -0.7,
        lineHeight: 30,
        marginBottom: 4,
        fontFamily: Fonts.Bold,
    },
    pageSub: {
        fontSize: 13,
        color: GRAY_TEXT,
        fontFamily: Fonts.Medium,
    },

    // ── Tabs
    tabsScroll: {
        marginBottom: 20,
    },
    tabsContainer: {
        paddingHorizontal: 20,
        gap: 8,
        flexDirection: 'row',
    },
    tab: {
        paddingVertical: 7,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: CARD_BG,
        borderWidth: 1,
        borderColor: Colors.divider,
        marginRight: 8,
    },
    tabActive: {
        backgroundColor: Colors.primary,
        borderColor: Colors.primary,
    },
    tabText: {
        fontSize: 12,
        color: GRAY_TEXT,
        fontFamily: Fonts.Medium,
    },
    tabTextActive: {
        color: GOLD_LIGHT,
    },

    // ── Section
    section: {
        paddingHorizontal: 20,
        marginBottom: 24,
    },
    sectionLabel: {
        fontSize: 10,
        color: GRAY_TEXT,
        letterSpacing: 1.2,
        marginBottom: 10,
        paddingLeft: 2,
        fontFamily: Fonts.Bold,
    },
    notifList: {
        gap: 8,
        flexDirection: 'column',
    },

    // ── Notification Card
    notifCard: {
        backgroundColor: Colors.white,
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: Colors.divider,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 8,
        position: 'relative',
        overflow: 'hidden',
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    notifCardUnread: {
        shadowOpacity: 0.08,
        elevation: 3,
    },
    unreadBar: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 3,
        backgroundColor: GOLD_DEEP,
        borderTopLeftRadius: 16,
        borderBottomLeftRadius: 16,
    },
    notifIconWrap: {
        width: 40,
        height: 40,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
    },
    notifIconEmoji: {
        fontSize: 18,
    },
    notifContent: {
        flex: 1,
        minWidth: 0,
    },
    notifContentTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 3,
    },
    notifTitle: {
        fontSize: 13,
        color: Colors.text_primary,
        letterSpacing: -0.1,
        flex: 1,
        fontFamily: Fonts.Bold,
    },
    notifTime: {
        fontSize: 10,
        color: GRAY_TEXT,
        flexShrink: 0,
        marginLeft: 8,
        fontFamily: Fonts.Medium,
    },
    notifBody: {
        fontSize: 12,
        color: GRAY_TEXT,
        lineHeight: 18,
        fontFamily: Fonts.Medium,
    },
    notifBodyBold: {
        color: BLACK_2,
        fontFamily: Fonts.Bold,
    },
    unreadDot: {
        width: 8,
        height: 8,
        backgroundColor: GOLD_DEEP,
        borderRadius: 4,
        flexShrink: 0,
        marginTop: 4,
    },

    // ── Badge Chip
    badge: {
        alignSelf: 'flex-start',
        borderRadius: 6,
        paddingVertical: 3,
        paddingHorizontal: 8,
        marginTop: 7,
    },
    badgeText: {
        fontSize: 10,
        fontFamily: Fonts.Bold,
    },
});