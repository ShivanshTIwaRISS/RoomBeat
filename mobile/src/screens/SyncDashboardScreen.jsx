import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, borderRadius, typography, spacing } from '../theme';
import { Header } from '../components/common/Header';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { SyncOverview } from '../components/sync/SyncOverview';
import { useRoomStore } from '../store/useRoomStore';
import { useSyncStore } from '../store/useSyncStore';
import { syncApi } from '../api/sync';
import { formatMs } from '../utils/formatters';
export const SyncDashboardScreen = ({ navigation, route, }) => {
    const { roomId } = route.params;
    const members = useRoomStore((s) => s.members);
    const clockOffsetMs = useSyncStore((s) => s.clockOffsetMs);
    const roundTripTimeMs = useSyncStore((s) => s.roundTripTimeMs);
    const playbackDriftMs = useSyncStore((s) => s.playbackDriftMs);
    const syncHealth = useSyncStore((s) => s.health);
    const deviceReports = useSyncStore((s) => s.deviceReports);
    const [remoteReports, setRemoteReports] = useState([]);
    useEffect(() => {
        const fetchReports = async () => {
            try {
                const res = await syncApi.getRoomReports(roomId);
                setRemoteReports(res.data || res || []);
            }
            catch (e) {
                console.warn('Sync reports fetch error:', e);
            }
        };
        fetchReports();
        const interval = setInterval(fetchReports, 3000);
        return () => clearInterval(interval);
    }, [roomId]);
    return (<View style={styles.container}>
      <Header title="Sync Dashboard" subtitle="Real-time multi-device diagnostics" onBack={() => navigation.goBack()}/>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Main Sync Status */}
        <SyncOverview clockOffsetMs={clockOffsetMs} roundTripTimeMs={roundTripTimeMs} playbackDriftMs={playbackDriftMs} health={syncHealth}/>

        {/* Disclaimer Notice */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeIcon}>ℹ️</Text>
          <Text style={styles.noticeText}>
            Metrics represent software-estimated timing and network delay, not acoustically measured sound output.
          </Text>
        </View>

        {/* Real-time Device Timing Table */}
        <Text style={styles.sectionTitle}>Connected Devices Timing</Text>

        {members.map((member) => {
            const sid = member?.sessionId || member?.id || '';
            const liveReport = deviceReports?.[sid];
            const offset = liveReport?.clockOffsetMs ?? 0;
            const rtt = liveReport?.roundTripTimeMs ?? 0;
            const drift = liveReport?.playbackDriftMs ?? 0;
            const session = member?.session || member || {};
            const isOnline = session.connectionStatus !== 'offline';
            const displayName = session.displayName || member?.displayName || 'Speaker';
            const deviceName = session.deviceName || member?.deviceName || 'Mobile Device';
            const role = member?.role || 'SPEAKER';

            return (<Card key={sid || Math.random().toString()} style={styles.deviceSyncCard}>
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.deviceName}>{displayName}</Text>
                  <Text style={styles.deviceModel}>
                    {deviceName} • {role}
                  </Text>
                </View>
                <Badge label={isOnline ? 'Active' : 'Offline'} variant={isOnline ? 'success' : 'muted'}/>
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricBox}>
                  <Text style={styles.metricKey}>Clock Offset</Text>
                  <Text style={styles.metricVal}>{formatMs(offset)}</Text>
                </View>

                <View style={styles.metricBox}>
                  <Text style={styles.metricKey}>Network RTT</Text>
                  <Text style={styles.metricVal}>{formatMs(rtt)}</Text>
                </View>

                <View style={styles.metricBox}>
                  <Text style={styles.metricKey}>Drift</Text>
                  <Text style={[styles.metricVal, { color: Math.abs(drift) > 30 ? colors.warning : colors.success }]}>
                    {formatMs(drift)}
                  </Text>
                </View>
              </View>
            </Card>);
        })}
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
        paddingBottom: spacing.xxl,
    },
    noticeBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        padding: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        marginBottom: spacing.lg,
        gap: spacing.sm,
    },
    noticeIcon: {
        fontSize: 18,
    },
    noticeText: {
        ...typography.small,
        color: colors.textSecondary,
        flex: 1,
        lineHeight: 16,
    },
    sectionTitle: {
        ...typography.h3,
        marginBottom: spacing.sm,
    },
    deviceSyncCard: {
        marginBottom: spacing.sm,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    deviceName: {
        ...typography.bodyBold,
    },
    deviceModel: {
        ...typography.small,
    },
    metricsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        backgroundColor: colors.surfaceLight,
        padding: spacing.sm,
        borderRadius: borderRadius.sm,
    },
    metricBox: {
        alignItems: 'center',
        flex: 1,
    },
    metricKey: {
        ...typography.small,
        fontSize: 10,
        marginBottom: 2,
    },
    metricVal: {
        ...typography.bodyBold,
        fontFamily: 'Courier',
        fontSize: 13,
    },
});
