import { useEffect, useRef } from 'react';
import { socketService } from '../services/socketService';
import { useSessionStore } from '../store/useSessionStore';
import { useRoomStore } from '../store/useRoomStore';
import { usePlaybackStore } from '../store/usePlaybackStore';
import { useSyncStore } from '../store/useSyncStore';
import { audioManager } from '../audio/AudioManager';
import { clockSync } from '../sync/ClockSync';
import { syncManager } from '../sync/SyncManager';

export const useSocket = (roomId) => {
    const token = useSessionStore((s) => s.token);
    const session = useSessionStore((s) => s.session);
    const addMember = useRoomStore((s) => s.addMember);
    const removeMember = useRoomStore((s) => s.removeMember);
    const updateMember = useRoomStore((s) => s.updateMember);
    const setPlaybackState = usePlaybackStore((s) => s.setPlaybackState);
    const setIsPlaying = usePlaybackStore((s) => s.setIsPlaying);
    const setIsPrepared = usePlaybackStore((s) => s.setIsPrepared);
    const setPosition = usePlaybackStore((s) => s.setPosition);
    const setDuration = usePlaybackStore((s) => s.setDuration);
    const setDownloadProgress = usePlaybackStore((s) => s.setDownloadProgress);
    const updateDeviceReport = useSyncStore((s) => s.updateDeviceReport);
    const setLocalMetrics = useSyncStore((s) => s.setLocalMetrics);
    // Keep a ref to the interval so we can clear it on cleanup
    const reportIntervalRef = useRef(null);

    useEffect(() => {
        if (!token) return;

        let isMounted = true;
        let reportInterval = null;

        const registerListeners = (sock) => {
            // Clean up any previous listeners first to avoid duplicates
            sock.off('room:device:joined');
            sock.off('room:device:left');
            sock.off('room:device:updated');
            sock.off('playback:prepare');
            sock.off('playback:scheduled');
            sock.off('playback:pause');
            sock.off('playback:seek');
            sock.off('playback:stop');
            sock.off('sync:updated');
            sock.off('connect');

            sock.on('connect', () => {
                if (roomId) sock.emit('room:join', { roomId });
            });

            // Room events
            sock.on('room:device:joined', (data) => {
                addMember({
                    id: data.sessionId,
                    roomId: roomId || '',
                    sessionId: data.sessionId,
                    role: data.role,
                    joinedAt: new Date().toISOString(),
                    isActive: true,
                    session: {
                        id: data.sessionId,
                        displayName: data.displayName,
                        deviceName: data.deviceName,
                        connectionStatus: 'online',
                    },
                });
            });

            sock.on('room:device:left', (data) => {
                removeMember(data.sessionId);
            });

            sock.on('room:device:updated', (data) => {
                updateMember(data.sessionId, {
                    connectionStatus: data.status,
                    batteryLevel: data.batteryLevel,
                    volume: data.volume,
                });
            });

            // Playback events
            sock.on('playback:prepare', async (data) => {
                if (!isMounted) return;
                console.log('[Socket] playback:prepare received:', data);
                setIsPrepared(false);
                setIsPlaying(false);
                setPlaybackState({
                    currentTrackId: data.trackId,
                    status: 'preparing',
                    sequenceNumber: data.sequenceNumber,
                });
                if (data.durationMs) setDuration(data.durationMs);
                try {
                    await audioManager.prepareTrack(
                        data.trackId,
                        `${data.trackId}.mp3`,
                        data.checksum,
                        (progress) => setDownloadProgress(progress)
                    );
                    if (isMounted) {
                        setIsPrepared(true);
                        sock.emit('device:ready', { roomId: roomId || '' });
                    }
                } catch (err) {
                    console.error('[Socket] Failed to prepare track:', err);
                }
            });

            // CRITICAL: Scheduled playback event — do NOT modify NTP math
            sock.on('playback:scheduled', async (data) => {
                if (!isMounted) return;
                console.log('[Socket] playback:scheduled received:', data);
                const targetMonotonicMs = await clockSync.serverEpochToLocalMonotonic(
                    data.startAtServerEpochMs
                );
                setPlaybackState({
                    positionMs: data.positionMs,
                    status: 'playing',
                    serverStartAt: data.startAtServerEpochMs.toString(),
                    sequenceNumber: data.sequenceNumber,
                });
                setIsPlaying(true);
                await audioManager.schedulePlay(data.positionMs, targetMonotonicMs);
            });

            sock.on('playback:pause', async (data) => {
                if (!isMounted) return;
                await audioManager.pause();
                setIsPlaying(false);
                setPlaybackState({
                    status: 'paused',
                    positionMs: data.positionMs,
                    sequenceNumber: data.sequenceNumber,
                });
            });

            sock.on('playback:seek', async (data) => {
                if (!isMounted) return;
                await audioManager.seek(data.positionMs);
                setPosition(data.positionMs);
                setPlaybackState({
                    positionMs: data.positionMs,
                    sequenceNumber: data.sequenceNumber,
                });
            });

            sock.on('playback:stop', async () => {
                if (!isMounted) return;
                await audioManager.stop();
                setIsPlaying(false);
                setIsPrepared(false);
                setPosition(0);
                setPlaybackState({ status: 'stopped', positionMs: 0 });
            });

            // Sync monitoring events
            sock.on('sync:updated', (data) => {
                if (!isMounted) return;
                updateDeviceReport(data.sessionId, {
                    roomId: roomId || '',
                    sessionId: data.sessionId,
                    clockOffsetMs: data.clockOffsetMs || 0,
                    roundTripTimeMs: data.roundTripTimeMs || 0,
                    playbackDriftMs: data.playbackDriftMs,
                    positionMs: data.positionMs,
                    session: {
                        id: data.sessionId,
                        displayName: data.displayName,
                        deviceName: '',
                    },
                });
            });

            // Periodic heartbeat and sync reporting interval
            if (reportInterval) clearInterval(reportInterval);
            reportInterval = setInterval(async () => {
                if (!isMounted) return;
                if (sock.connected && roomId) {
                    sock.emit('device:heartbeat', { roomId });
                    const diagnostics = await syncManager.getDiagnostics();
                    setLocalMetrics({
                        clockOffsetMs: diagnostics.clockOffsetMs,
                        roundTripTimeMs: diagnostics.roundTripTimeMs,
                        playbackDriftMs: diagnostics.playbackDriftMs,
                        health: diagnostics.health,
                    });
                    sock.emit('device:playback:report', {
                        roomId,
                        positionMs: diagnostics.positionMs,
                        clockOffsetMs: diagnostics.clockOffsetMs,
                        roundTripTimeMs: diagnostics.roundTripTimeMs,
                        playbackDriftMs: diagnostics.playbackDriftMs,
                    });
                }
            }, 2500);
        };

        // Async connect then register listeners
        const connectAndSetup = async () => {
            try {
                const sock = await socketService.connect(token);
                if (!isMounted) return;
                registerListeners(sock);
                if (roomId) {
                    sock.emit('room:join', { roomId });
                }
            } catch (err) {
                console.error('[useSocket] connect error:', err);
            }
        };

        connectAndSetup();

        return () => {
            isMounted = false;
            if (reportInterval) clearInterval(reportInterval);
            const sock = socketService.getSocket();
            if (sock && roomId) {
                sock.emit('room:leave', { roomId });
            }
        };
    }, [roomId, token]);
};
