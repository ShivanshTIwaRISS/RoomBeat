import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, typography, spacing } from '../../theme';
import { Badge } from '../common/Badge';
import { formatMs } from '../../utils/formatters';
export const SyncOverview = ({ clockOffsetMs, roundTripTimeMs, playbackDriftMs, health, }) => {
    const getHealthBadge = () => {
        switch (health) {
            case 'excellent':
                return { label: 'Excellent Sync (<15ms)', variant: 'success' };
            case 'good':
                return { label: 'Good Sync (<40ms)', variant: 'info' };
            case 'attention':
                return { label: 'Needs Attention', variant: 'warning' };
            case 'critical':
            default:
                return { label: 'Sync Drift High (>100ms)', variant: 'error' };
        }
    };
    const badgeInfo = getHealthBadge();
    return (<View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.title}>Sync Status</Text>
        <Badge label={badgeInfo.label} variant={badgeInfo.variant}/>
      </View>

      <View style={styles.metricsGrid}>
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Clock Offset</Text>
          <Text style={styles.metricValue}>{formatMs(clockOffsetMs)}</Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Round-Trip Time</Text>
          <Text style={styles.metricValue}>{formatMs(roundTripTimeMs)}</Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Playback Drift</Text>
          <Text style={[styles.metricValue, { color: health === 'excellent' ? colors.success : colors.warning }]}>
            {formatMs(playbackDriftMs)}
          </Text>
        </View>
      </View>
    </View>);
};
const styles = StyleSheet.create({
    card: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        padding: spacing.md,
        marginBottom: spacing.md,
    },
    topRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    title: {
        ...typography.h3,
    },
    metricsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    metricItem: {
        flex: 1,
        alignItems: 'center',
    },
    metricLabel: {
        ...typography.small,
        marginBottom: 4,
    },
    metricValue: {
        ...typography.bodyBold,
        fontFamily: 'Courier',
        fontSize: 16,
    },
});
