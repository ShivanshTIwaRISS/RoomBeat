import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { colors, borderRadius, typography, spacing } from '../theme';
import { Header } from '../components/common/Header';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useSessionStore } from '../store/useSessionStore';
export const ProfileScreen = ({ navigation }) => {
    const session = useSessionStore((s) => s.session);
    const clearSession = useSessionStore((s) => s.clearSession);
    return (<View style={styles.container}>
      <Header title="User Profile" onBack={() => navigation.goBack()} rightAction={<TouchableOpacity onPress={() => navigation.navigate('Settings')}>
            <Text style={styles.settingsIcon}>⚙️</Text>
          </TouchableOpacity>}/>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Profile Card */}
        <Card style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>🎧</Text>
          </View>
          <Text style={styles.name}>{session?.displayName || 'Guest User'}</Text>
          <Text style={styles.badge}>Guest Account</Text>

          <View style={styles.infoGrid}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Device Name</Text>
              <Text style={styles.infoVal}>{session?.deviceName || 'Android Device'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Platform</Text>
              <Text style={styles.infoVal}>{session?.platform || 'Android'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Device ID</Text>
              <Text style={styles.infoVal} numberOfLines={1}>
                {session?.deviceId ? `${session.deviceId.slice(0, 16)}...` : 'N/A'}
              </Text>
            </View>
          </View>
        </Card>

        <Button title="Reset Guest Profile" variant="danger" onPress={async () => {
            await clearSession();
            navigation.replace('Splash');
        }} style={styles.resetBtn}/>
      </ScrollView>
    </View>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: spacing.md,
    },
    settingsIcon: {
        fontSize: 22,
    },
    profileCard: {
        alignItems: 'center',
        padding: spacing.xl,
        marginBottom: spacing.lg,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: colors.surfaceLight,
        borderWidth: 2,
        borderColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
    },
    avatarText: {
        fontSize: 36,
    },
    name: {
        ...typography.h2,
        marginBottom: 4,
    },
    badge: {
        ...typography.small,
        color: colors.primary,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.lg,
    },
    infoGrid: {
        width: '100%',
        backgroundColor: colors.surfaceLight,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        gap: spacing.sm,
    },
    infoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    infoLabel: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    infoVal: {
        ...typography.bodyBold,
        fontFamily: 'Courier',
        fontSize: 13,
    },
    resetBtn: {
        marginTop: spacing.md,
    },
});
