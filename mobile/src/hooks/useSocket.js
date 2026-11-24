import { useEffect, useRef } from 'react';
import { socketService } from '../services/socketService';
import { useSessionStore } from '../store/useSessionStore';
import { useRoomStore } from '../store/useRoomStore';
import { usePlaybackStore } from '../store/usePlaybackStore';
import { useSyncStore } from '../store/useSyncStore';
import { audioManager } from '../audio/AudioManager';
import { clockSync } from '../sync/ClockSync';
import { syncManager } from '../sync/SyncManager';
import { storage } from '../utils/storage';

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

    useEffect(() => {
        let isMounted = true;
        let reportInterval = null;

        const registerListeners = (sock) => {
            sock.off('room:device:joined');
            sock.off('room:device:left');
            sock.off('room:device:updated');
            sock.off('playback:prepare');
            sock.off('playback:scheduled');
            sock.off('playback:pause');
            sock.off('playback:seek');
            sock.off('playback:stop');
            sock.off('playback:preset');
            sock.off('sync:updated');
            sock.off('connect');

            sock.on('connect', () => {
                console.log(`[useSocket] Socket connected! Joining room: ${roomId}`);
                if (roomId) sock.emit('room:join', { roomId });
            });

            sock.on('playback:preset', (data) => {
                if (!isMounted) return;
                console.log('[Socket] playback:preset received:', data);
                setPlaybackState({
                    currentTrackId: data.presetId,
                    status: 'prepared',
                });
            });

            sock.on('room:device:joined', (data) => {
                if (!isMounted) return;
                console.log('[Socket] Device joined:', data.session?.displayName);
                addMember(data);
            });

            sock.on('room:device:left', (data) => {
                if (!isMounted) return;
                console.log('[Socket] Device left:', data.sessionId);
                removeMember(data.sessionId);
            });

            sock.on('room:device:updated', (data) => {
                if (!isMounted) return;
                updateMember(data.sessionId, data);
            });

            sock.on('playback:prepare', async (data) => {
                if (!isMounted) return;
                console.log('[Socket] playback:prepare for track:', data.trackId);
                setIsPrepared(false);
                try {
                    await audioManager.loadTrack(data.track);
                    setIsPrepared(true);
                } catch (e) {
                    console.warn('[Socket] Failed to pre-cache track:', e);
                }
            });

            sock.on('playback:scheduled', (data) => {
                if (!isMounted) return;
                console.log('[Socket] playback:scheduled at server time:', data.serverStartAt);
                syncManager.schedulePlay({
                    serverStartAt: data.serverStartAt,
                    positionMs: data.positionMs || 0,
                    trackId: data.trackId,
                });
                setIsPlaying(true);
            });

            sock.on('playback:pause', (data) => {
                if (!isMounted) return;
                console.log('[Socket] playback:pause at position:', data.positionMs);
                syncManager.pause();
                setIsPlaying(false);
                if (data.positionMs !== undefined) {
                    setPosition(data.positionMs);
                }
            });

            sock.on('playback:seek', (data) => {
                if (!isMounted) return;
                console.log('[Socket] playback:seek to position:', data.positionMs);
                syncManager.seek(data.positionMs);
                setPosition(data.positionMs);
            });

            sock.on('playback:stop', () => {
                if (!isMounted) return;
                console.log('[Socket] playback:stop');
                syncManager.stop();
                setIsPlaying(false);
                setPosition(0);
            });

            sock.on('sync:updated', (report) => {
                if (!isMounted) return;
                updateDeviceReport(report);
            });

            reportInterval = setInterval(() => {
                if (!isMounted) return;
                const diagnostics = syncManager.getDiagnostics();
                setLocalMetrics({
                    clockOffsetMs: diagnostics.clockOffsetMs,
                    roundTripTimeMs: diagnostics.roundTripTimeMs,
                    playbackDriftMs: diagnostics.playbackDriftMs,
                    syncHealth: diagnostics.health,
                });

                if (sock.connected && roomId) {
                    sock.emit('sync:report', {
                        roomId,
                        clockOffsetMs: diagnostics.clockOffsetMs,
                        roundTripTimeMs: diagnostics.roundTripTimeMs,
                        playbackDriftMs: diagnostics.playbackDriftMs,
                    });
                }
            }, 2500);
        };

        const connectAndSetup = async () => {
            try {
                let activeToken = token;
                if (!activeToken) {
                    activeToken = await storage.getToken();
                }
                if (!activeToken) {
                    const created = await useSessionStore.getState().createGuest('Music Fan');
                    activeToken = created?.token || useSessionStore.getState().token;
                }
                if (!activeToken || !isMounted) return;
                const sock = await socketService.connect(activeToken);
                if (!isMounted || !sock) return;
                registerListeners(sock);
                if (roomId && sock.connected) {
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
