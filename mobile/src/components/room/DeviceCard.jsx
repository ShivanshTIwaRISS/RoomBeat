import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, typography, spacing } from '../../theme';
import { Badge } from '../common/Badge';
export const DeviceCard = ({ member, isHostDevice }) => {
    const isOnline = member.session.connectionStatus === 'online';
    return (<View style={styles.card}>
      <View style={styles.left}>
        <View style={[styles.avatar, isOnline ? styles.avatarOnline : styles.avatarOffline]}>
          <Text style={styles.avatarIcon}>
            {member.session.platform === 'android' ? 'AND' : 'IOS'}
          </Text>
        </View>
        <View>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{member.session.displayName}</Text>
            {member.role === 'HOST' && <Badge label="Host" variant="primary"/>}
          </View>
          <Text style={styles.deviceModel}>
            {member.session.deviceName || 'Speaker Device'}
          </Text>
        </View>
      </View>

      <View style={styles.right}>
        <Badge label={isOnline ? 'Connected' : 'Offline'} variant={isOnline ? 'success' : 'muted'}/>
      </View>
    </View>);
};
const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.md,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
    },
    avatarOnline: {
        backgroundColor: colors.surfaceLight,
        borderColor: colors.success,
    },
    avatarOffline: {
        backgroundColor: colors.surfaceLight,
        borderColor: colors.textTertiary,
    },
    avatarIcon: {
        fontSize: 18,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.xs,
        marginBottom: 2,
    },
    name: {
        ...typography.bodyBold,
    },
    deviceModel: {
        ...typography.caption,
    },
    right: {
        alignItems: 'flex-end',
    },
});
