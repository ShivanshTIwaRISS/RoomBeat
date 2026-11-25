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
import { tracksApi } from '../api/tracks';
import { playbackApi } from '../api/playback';
import { formatRoomCode } from '../utils/formatters';
import { nativeAudio } from '../audio/NativeAudioModule';
import { audioManager } from '../audio/AudioManager';
import { getActiveBaseUrl } from '../api/client';
import { storage } from '../utils/storage';
import { clockSync } from '../sync/ClockSync';
import { syncManager } from '../sync/SyncManager';

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
    const setCurrentTrack = usePlaybackStore((s) => s.setCurrentTrack);
    const setDuration = usePlaybackStore((s) => s.setDuration);
    const setIsPrepared = usePlaybackStore((s) => s.setIsPrepared);
    const clockOffsetMs = useSyncStore((s) => s.clockOffsetMs);
    const roundTripTimeMs = useSyncStore((s) => s.roundTripTimeMs);
    const playbackDriftMs = useSyncStore((s) => s.playbackDriftMs);
    const syncHealth = useSyncStore((s) => s.health);
    const session = useSessionStore((s) => s.session);
    const playbackControls = usePlayback();
    const [qrModalVisible, setQrModalVisible] = useState(false);

    useEffect(() => {
        if (!roomId) return;
        // Fetch tracks or initialize default demo track for instant synchronized playback
        tracksApi.getRoomTracks(roomId).then(async (res) => {
            const list = res?.data || res || [];
            if (Array.isArray(list) && list.length > 0) {
                const first = list[0];
                setCurrentTrack(first);
                setDuration(first.durationMs || 30000);
                try {
                    const baseUrl = await getActiveBaseUrl();
                    const audioUri = `${baseUrl}/tracks/${first.id}/audio`;
                    await audioManager.prepareUrl(audioUri, first.id);
                    setIsPrepared(true);
                } catch (e) { }
            } else {
                // Default synchronized demo beat
                setCurrentTrack({
                    id: 'preset-demo',
                    title: 'RoomBeat Synchronized Beat',
                    artist: 'RoomBeat Engine',
                    durationMs: 30000,
                });
                setDuration(30000);
                try {
                    const baseUrl = await getActiveBaseUrl();
                    const serverRoot = baseUrl.replace('/api/v1', '');
                    await nativeAudio.prepare(`${serverRoot}/demo.wav`);
                    setIsPrepared(true);
                } catch (e) { }
            }
        }).catch(async () => {
            setCurrentTrack({
                id: 'preset-demo',
                title: 'RoomBeat Synchronized Beat',
                artist: 'RoomBeat Engine',
                durationMs: 30000,
            });
            setDuration(30000);
            try {
                const baseUrl = await getActiveBaseUrl();
                const serverRoot = baseUrl.replace('/api/v1', '');
                await nativeAudio.prepare(`${serverRoot}/demo.wav`);
                setIsPrepared(true);
            } catch (e) { }
        });
    }, [roomId, setCurrentTrack, setDuration, setIsPrepared]);
    useEffect(() => {
        // Fetch latest room info — resolve session from storage if Zustand isn't populated yet
        if (!roomId) return;
        Promise.all([
            roomsApi.getById(roomId),
            session?.id ? Promise.resolve(session) : storage.getSession().catch(() => null),
        ]).then(([res, activeSession]) => {
            try {
                const data = res?.data || res;
                if (data && data.id) {
                    const currentSid = activeSession?.id || session?.id || data.hostSessionId;
                    setRoom(data, data.hostSessionId, currentSid);
                }
            } catch (e) { console.warn('[RoomDashboard] setRoom error:', e); }
        }).catch(() => { });
    }, [roomId, setRoom, session]);

    // Backup sync & drift-correction poller: guarantees second phone plays & stays in sync
    // even if a Socket.IO event was missed or delayed on mobile networks.
    useEffect(() => {
        if (!roomId) return;
        let cancelled = false;
        let lastSeekAt = 0;
        const syncStateFromServer = async () => {
            try {
                const res = await playbackApi.getState(roomId);
                if (cancelled) return;
                const ps = res?.data || res;
                if (!ps || !ps.status) return;

                const baseUrl = await getActiveBaseUrl();
                const serverRoot = baseUrl.replace('/api/v1', '');
                const trackId = ps.currentTrackId;
                const isPreset = !trackId || String(trackId).startsWith('preset-');
                const audioUri = isPreset ? `${serverRoot}/demo.wav` : `${baseUrl}/tracks/${trackId}/audio`;

                // Update track info if track changed on server
                const storeTrack = usePlaybackStore.getState().currentTrack;
                if (trackId && storeTrack?.id !== trackId) {
                    try {
                        const tRes = await tracksApi.getTrack(trackId);
                        const tData = tRes?.data || tRes;
                        if (tData?.id) {
                            setCurrentTrack(tData);
                            setDuration(tData.durationMs || 180000);
                        }
                    } catch (e) { }
                    await nativeAudio.prepare(audioUri);
                    setIsPrepared(true);
                }

                const tBeforeDiag = Date.now();
                const diag = await nativeAudio.getPlaybackDiagnostics();
                const tAfterDiag = Date.now();
                const localNowMid = Math.round((tBeforeDiag + tAfterDiag) / 2);

                if (ps.status === 'playing' && ps.serverStartAt) {
                    // Don't interfere while a scheduled play is still counting down (within 2.5s)
                    const schedLocal = usePlaybackStore.getState().playbackState?.scheduledAtLocalMs || 0;
                    if (!diag?.isPlaying && Date.now() - schedLocal < 2600) {
                        return;
                    }

                    const serverStartMs = Number(ps.serverStartAt);
                    const serverNow = localNowMid + (clockSync.clockOffset || 0);
                    const rawElapsed = serverNow - serverStartMs;
                    const basePos = Number(ps.positionMs) || 0;

                    if (rawElapsed < 0) {
                        // Scheduled in the near future
                        if (!diag?.isPlaying) {
                            await audioManager.prepareUrl(audioUri, isPreset ? 'demo' : trackId);
                            const targetMono = await clockSync.serverEpochToLocalMonotonic(serverStartMs);
                            await nativeAudio.schedulePlay(basePos, targetMono);
                            usePlaybackStore.getState().setIsPlaying(true);
                        }
                    } else {
                        const compMs = syncManager.latencyCompensationMs || 0;
                        // Include +80ms Android AudioTrack output latency compensation
                        let expectedPos = basePos + rawElapsed + compMs + 80;
                        if (diag?.durationMs > 0 && expectedPos >= diag.durationMs) {
                            // Never silently abort playback due to clock skew or track wrap
                            expectedPos = expectedPos % diag.durationMs;
                        }
                        if (!diag?.isPlaying) {
                            await audioManager.prepareUrl(audioUri, isPreset ? 'demo' : trackId);
                            if (expectedPos > 150 && diag?.playbackState !== 'buffering') {
                                await nativeAudio.seek(expectedPos + 30);
                            }
                            await nativeAudio.play();
                            lastSeekAt = Date.now();
                            usePlaybackStore.getState().setIsPlaying(true);
                            usePlaybackStore.getState().setPosition(expectedPos);
                        } else if (diag?.playbackState === 'ready') {
                            // Precision phase-locked sync on local cached file:
                            // - |drift| > 180ms -> instant seek snap (5s cooldown)
                            // - 45ms < |drift| <= 180ms -> smooth 1.03x / 0.97x speed nudge (zero audio glitch!)
                            // - |drift| <= 45ms -> lock at 1.00x
                            const signedDrift = (diag.positionMs || 0) - expectedPos;
                            const absDrift = Math.abs(signedDrift);
                            if (absDrift > 180 && Date.now() - lastSeekAt > 5000) {
                                lastSeekAt = Date.now();
                                await nativeAudio.setPlaybackSpeed(1.0);
                                await nativeAudio.seek(expectedPos + 20);
                            } else if (absDrift > 45 && absDrift <= 180) {
                                // Ahead (+drift) -> slow slightly (0.97); Behind (-drift) -> speed slightly (1.03)
                                const nudge = signedDrift > 0 ? 0.97 : 1.03;
                                await nativeAudio.setPlaybackSpeed(nudge);
                            } else if ((diag.playbackSpeed || 1.0) !== 1.0) {
                                await nativeAudio.setPlaybackSpeed(1.0);
                            }
                        }
                    }
                } else if (ps.status === 'paused' || ps.status === 'idle') {
                    if (diag?.isPlaying) {
                        await nativeAudio.pause();
                        usePlaybackStore.getState().setIsPlaying(false);
                    }
                }
            } catch (e) { }
        };

        const interval = setInterval(syncStateFromServer, 2500);
        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [roomId, setCurrentTrack, setDuration, setIsPrepared]);
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
        </View>} />

        <ScrollView contentContainerStyle={styles.content}>
            {/* Sync Status Banner */}
            <TouchableOpacity onPress={() => navigation.navigate('SyncDashboard', { roomId })} activeOpacity={0.8}>
                <SyncOverview clockOffsetMs={clockOffsetMs} roundTripTimeMs={roundTripTimeMs} playbackDriftMs={playbackDriftMs} health={syncHealth} />
            </TouchableOpacity>

            {/* Now Playing Widget */}
            <NowPlaying track={currentTrack} positionMs={positionMs} durationMs={durationMs} isPlaying={isPlaying} />

            {/* Music Controls (Host Enabled) */}
            <MusicControls isPlaying={isPlaying} isHost={isHost} onPlay={playbackControls.play} onPause={playbackControls.pause} onPrevious={playbackControls.previous} onNext={playbackControls.next} />

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
            <DeviceList members={members} maxDevices={currentRoom?.maxDevices || 10} />
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
                            <QRCode value={`roombeat://join?code=${currentRoom?.code || ''}`} size={200} backgroundColor="transparent" color={colors.primary} />
                        ) : (
                            <Text style={styles.roomCodeDisplay}>{formatRoomCode(currentRoom?.code || '')}</Text>
                        )}
                    </View>

                    <Text style={styles.roomCodeDisplay}>
                        {formatRoomCode(currentRoom?.code || '')}
                    </Text>

                    <Button title="Close" variant="secondary" onPress={() => setQrModalVisible(false)} style={styles.modalCloseBtn} />
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
