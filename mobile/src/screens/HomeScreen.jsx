import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, borderRadius, typography, spacing } from '../theme';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { AudioWaveBackground } from '../components/home/AudioWaveBackground';
import { useSessionStore } from '../store/useSessionStore';
import { storage } from '../utils/storage';
import { formatRoomCode } from '../utils/formatters';
import { DEFAULT_DEV_HOST, resolveServerUrl } from '../constants/config';
import { requestAppPermissions } from '../utils/permissions';
import { apiClient } from '../api/client';
export const HomeScreen = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0, 16);
    const session = useSessionStore((s) => s.session);
    const createGuest = useSessionStore((s) => s.createGuest);
    const [recentRooms, setRecentRooms] = useState([]);
    const [serverDisplay, setServerDisplay] = useState('Cloud (Render)');

    useEffect(() => {
        try {
            // Request runtime permissions on Android safely
            requestAppPermissions().catch(console.warn);

            // Wake up cloud server in background
            apiClient.get('/health').catch(() => {});

            // Ensure guest session exists
            if (!session) {
                createGuest('Music Fan').catch(console.warn);
            }
            storage.getRecentRooms().then(setRecentRooms).catch(() => {});
            AsyncStorage.getItem('roombeat_server_host').then((h) => {
                const resolved = resolveServerUrl(h);
                setServerDisplay(resolved.isCloud ? 'Cloud (Render)' : resolved.display);
            }).catch(() => {});
        } catch (initErr) {
            console.warn('[HomeScreen] Init error:', initErr);
        }
    }, [session, createGuest]);
    return (<ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingTop: topInset + 8 }]}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.brandRow}>
          <Text style={styles.brandName}>RoomBeat</Text>
        </View>
        <View style={styles.topActions}>
          <TouchableOpacity onPress={() => navigation.navigate('Settings')} style={styles.iconBtn} activeOpacity={0.7}>
            <Text style={styles.btnIcon}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} style={styles.iconBtn} activeOpacity={0.7}>
            <Text style={styles.btnIcon}>Profile</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Hero Greeting */}
      <View style={styles.heroSection}>
        <Text style={styles.greetingSubtitle}>
          Welcome, {session?.displayName || 'Guest'}
        </Text>
        <Text style={styles.greetingTitle}>Synchronized Wireless Audio</Text>

        <View style={styles.waveContainer}>
          <AudioWaveBackground />
        </View>
      </View>

      {/* Server Status Pill */}
      <TouchableOpacity 
        style={styles.serverPill}
        onPress={() => navigation.navigate('Settings')}
        activeOpacity={0.8}
      >
        <View style={styles.statusDot} />
        <Text style={styles.serverPillText}>
          Server: {serverDisplay}
        </Text>
        <Text style={styles.serverPillAction}>Change</Text>
      </TouchableOpacity>

      {/* Primary Actions: Create & Join */}
      <View style={styles.actionGrid}>
        <Card style={styles.actionCard} variant="glow">
          <Text style={styles.actionTitle}>Create a Room</Text>
          <Text style={styles.actionDesc}>
            Host a new session and control music for all connected phones.
          </Text>
          <Button title="Create Room" onPress={() => navigation.navigate('CreateRoom')} size="md" style={styles.cardButton}/>
        </Card>

        <Card style={styles.actionCard}>
          <Text style={styles.actionTitle}>Join a Room</Text>
          <Text style={styles.actionDesc}>
            Scan a host's QR code or enter a 6-character room code to join.
          </Text>
          <Button title="Join Room" onPress={() => navigation.navigate('JoinRoom')} variant="secondary" size="md" style={styles.cardButton}/>
        </Card>
      </View>

      {/* Recent Rooms */}
      {recentRooms.length > 0 && (<View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Rooms</Text>
          {recentRooms.map((room) => (<TouchableOpacity key={room.id} style={styles.recentItem} onPress={() => navigation.navigate('JoinRoom', { code: room.code })} activeOpacity={0.7}>
              <View>
                <Text style={styles.recentName}>{room.name}</Text>
                <Text style={styles.recentCode}>Code: {formatRoomCode(room.code)}</Text>
              </View>
              <Text style={styles.recentArrow}>Rejoin →</Text>
            </TouchableOpacity>))}
        </View>)}

      {/* How it works */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>How RoomBeat Works</Text>
        <Card style={styles.howItWorksCard}>
          <View style={styles.stepRow}>
            <Text style={styles.stepNum}>1</Text>
            <Text style={styles.stepText}>Host creates a room and picks/uploads a track</Text>
          </View>
          <View style={styles.stepRow}>
            <Text style={styles.stepNum}>2</Text>
            <Text style={styles.stepText}>Friends join via QR code on the same Wi-Fi</Text>
          </View>
          <View style={styles.stepRow}>
            <Text style={styles.stepNum}>3</Text>
            <Text style={styles.stepText}>Press play — audio is downloaded and played in sync</Text>
          </View>
        </Card>
      </View>
    </ScrollView>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },
    topBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
    },
    brandLogo: {
        fontSize: 24,
    },
    brandName: {
        ...typography.h2,
        letterSpacing: -0.5,
    },
    topActions: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: colors.surface,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    btnIcon: {
        fontSize: 18,
    },
    heroSection: {
        marginVertical: spacing.md,
    },
    greetingSubtitle: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 4,
    },
    greetingTitle: {
        ...typography.h1,
    },
    waveContainer: {
        marginTop: spacing.md,
        marginBottom: spacing.xs,
        alignItems: 'flex-start',
    },
    actionGrid: {
        gap: spacing.md,
        marginVertical: spacing.md,
    },
    serverPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        marginBottom: spacing.xs,
        justifyContent: 'space-between',
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.success,
        marginRight: 8,
    },
    serverPillText: {
        ...typography.small,
        color: colors.textSecondary,
        fontFamily: 'Courier',
        flex: 1,
    },
    serverPillAction: {
        ...typography.small,
        color: colors.primary,
        fontWeight: '700',
    },
    actionCard: {
        padding: spacing.lg,
    },
    actionIcon: {
        fontSize: 32,
        marginBottom: spacing.xs,
    },
    actionTitle: {
        ...typography.h2,
        marginBottom: spacing.xs,
    },
    actionDesc: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.md,
        lineHeight: 18,
    },
    cardButton: {
        marginTop: spacing.xs,
    },
    section: {
        marginTop: spacing.lg,
    },
    sectionTitle: {
        ...typography.h3,
        marginBottom: spacing.sm,
    },
    recentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        marginBottom: spacing.sm,
    },
    recentName: {
        ...typography.bodyBold,
        marginBottom: 2,
    },
    recentCode: {
        ...typography.small,
        fontFamily: 'Courier',
    },
    recentArrow: {
        fontSize: 20,
        color: colors.primary,
    },
    howItWorksCard: {
        padding: spacing.md,
        gap: spacing.sm,
    },
    stepRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    stepNum: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.primaryMuted,
        color: colors.primary,
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '700',
        fontSize: 12,
    },
    stepText: {
        ...typography.caption,
        color: colors.textPrimary,
        flex: 1,
    },
});
