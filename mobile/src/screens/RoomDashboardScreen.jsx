import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, } from 'react-native';
import { colors, borderRadius, typography, spacing } from '../theme';
import { Header } from '../components/common/Header';
import { NowPlaying } from '../components/room/NowPlaying';
import { MusicControls } from '../components/room/MusicControls';
import { DeviceList } from '../components/room/DeviceList';
import { SyncOverview } from '../components/sync/SyncOverview';
import { Button } from '../components/common/Button';
import { useRoomStore } from '../store/useRoomStore';
import { useSessionStore } from '../store/useSessionStore';
import { usePlaybackStore } from '../store/usePlaybackStore';
import { useSyncStore } from '../store/useSyncStore';
import { useSocket } from '../hooks/useSocket';
import { usePlayback } from '../hooks/usePlayback';
import { roomsApi } from '../api/rooms';
import { formatRoomCode } from '../utils/formatters';

// Conditionally import QRCode — if the native module is missing, fall back gracefully
let QRCode = null;
try {
    QRCode = require('react-native-qrcode-svg').default;
} catch (e) {
    console.warn('[RoomDashboard] react-native-qrcode-svg not available');
}

export const RoomDashboardScreen = ({ navigation, route, }) => {
    const { roomId } = route?.params || {};
    // Initialize socket lifecycle
    useSocket(roomId);
    const currentRoom = useRoomStore((s) => s.currentRoom);
    const members = useRoomStore((s) => s.members);
    const isHost = useRoomStore((s) => s.isHost);
    const setRoom = useRoomStore((s) => s.setRoom);
    const currentTrack = usePlaybackStore((s) => s.currentTrack);
    const isPlaying = usePlaybackStore((s) => s.isPlaying);
    const positionMs = usePlaybackStore((s) => s.positionMs);
    const durationMs = usePlaybackStore((s) => s.durationMs);
    const clockOffsetMs = useSyncStore((s) => s.clockOffsetMs);
    const roundTripTimeMs = useSyncStore((s) => s.roundTripTimeMs);
    const playbackDriftMs = useSyncStore((s) => s.playbackDriftMs);
    const syncHealth = useSyncStore((s) => s.health);
    const session = useSessionStore((s) => s.session);
    const playbackControls = usePlayback();
    const [qrModalVisible, setQrModalVisible] = useState(false);
    useEffect(() => {
        // Fetch latest room info — fully defensive
        if (!roomId) return;
        roomsApi.getById(roomId).then((res) => {
            try {
                const data = res?.data || res;
                if (data && data.id) {
                    setRoom(data, data.hostSessionId, session?.id || '');
                }
            } catch (e) { console.warn('[RoomDashboard] setRoom error:', e); }
        }).catch(() => {});
    }, [roomId, setRoom, session?.id]);
    const handleLeave = () => {
        Alert.alert(isHost ? 'Close Room' : 'Leave Room', isHost ? 'Are you sure you want to close this room for all speakers?' : 'Disconnect from this session?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: isHost ? 'Close' : 'Leave',
                style: 'destructive',
                onPress: () => navigation.replace('Home'),
            },
        ]);
    };
    return (<View style={styles.container}>
      {/* Room Header */}
      <Header title={currentRoom?.name || 'RoomBeat Session'} subtitle={`Code: ${formatRoomCode(currentRoom?.code || '')}`} onBack={handleLeave} rightAction={<View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setQrModalVisible(true)} style={styles.qrHeaderBtn} activeOpacity={0.7}>
              <Text style={styles.qrIcon}>QR Code</Text>
            </TouchableOpacity>
          </View>}/>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Sync Status Banner */}
        <TouchableOpacity onPress={() => navigation.navigate('SyncDashboard', { roomId })} activeOpacity={0.8}>
          <SyncOverview clockOffsetMs={clockOffsetMs} roundTripTimeMs={roundTripTimeMs} playbackDriftMs={playbackDriftMs} health={syncHealth}/>
        </TouchableOpacity>

        {/* Now Playing Widget */}
        <NowPlaying track={currentTrack} positionMs={positionMs} durationMs={durationMs} isPlaying={isPlaying}/>

        {/* Music Controls (Host Enabled) */}
        <MusicControls isPlaying={isPlaying} isHost={isHost} onPlay={playbackControls.play} onPause={playbackControls.pause} onPrevious={playbackControls.previous} onNext={playbackControls.next}/>

        {/* Navigation Action Pills */}
        <View style={styles.pillsRow}>
          <TouchableOpacity style={styles.actionPill} onPress={() => navigation.navigate('MusicLibrary', { roomId })}>
            <Text style={styles.pillLabel}>Library</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionPill} onPress={() => navigation.navigate('Queue', { roomId })}>
            <Text style={styles.pillLabel}>Queue</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionPill} onPress={() => navigation.navigate('DeviceCalibration', { roomId })}>
            <Text style={styles.pillLabel}>Calibrate</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionPill} onPress={() => navigation.navigate('SyncDashboard', { roomId })}>
            <Text style={styles.pillLabel}>Sync Metrics</Text>
          </TouchableOpacity>
        </View>

        {/* Connected Speakers */}
        <DeviceList members={members} maxDevices={currentRoom?.maxDevices || 10}/>
      </ScrollView>

      {/* QR Code Share Modal */}
      <Modal visible={qrModalVisible} transparent animationType="fade" onRequestClose={() => setQrModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Join with QR</Text>
            <Text style={styles.modalSubtitle}>
              Scan with the RoomBeat app on any phone to join this audio room.
            </Text>

            <View style={styles.qrWrapper}>
              {QRCode ? (
                <QRCode value={`roombeat://join?code=${currentRoom?.code || ''}`} size={200} backgroundColor="transparent" color={colors.primary}/>
              ) : (
                <Text style={styles.roomCodeDisplay}>{formatRoomCode(currentRoom?.code || '')}</Text>
              )}
            </View>

            <Text style={styles.roomCodeDisplay}>
              {formatRoomCode(currentRoom?.code || '')}
            </Text>

            <Button title="Close" variant="secondary" onPress={() => setQrModalVisible(false)} style={styles.modalCloseBtn}/>
          </View>
        </View>
      </Modal>
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
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing.sm,
    },
    qrHeaderBtn: {
        backgroundColor: colors.surfaceLight,
        paddingHorizontal: spacing.sm,
        paddingVertical: 6,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    qrIcon: {
        ...typography.small,
        color: colors.primary,
        fontWeight: '700',
    },
    pillsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: spacing.md,
        paddingHorizontal: spacing.sm,
    },
    actionPill: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        borderRadius: borderRadius.md,
        paddingVertical: 10,
        paddingHorizontal: 14,
        alignItems: 'center',
        flex: 1,
        marginHorizontal: 4,
    },
    pillIcon: {
        fontSize: 18,
        marginBottom: 2,
    },
    pillLabel: {
        ...typography.small,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    modalContent: {
        backgroundColor: colors.surface,
        borderRadius: borderRadius.xl,
        padding: spacing.xl,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    modalTitle: {
        ...typography.h2,
        marginBottom: 4,
    },
    modalSubtitle: {
        ...typography.caption,
        textAlign: 'center',
        color: colors.textSecondary,
        marginBottom: spacing.lg,
    },
    qrWrapper: {
        padding: spacing.md,
        backgroundColor: colors.surfaceLight,
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        marginBottom: spacing.md,
    },
    roomCodeDisplay: {
        ...typography.h1,
        fontFamily: 'Courier',
        letterSpacing: 2,
        color: colors.primary,
        marginBottom: spacing.lg,
    },
    modalCloseBtn: {
        width: '100%',
    },
});
