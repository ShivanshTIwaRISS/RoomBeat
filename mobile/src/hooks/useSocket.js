import { useEffect } from 'react';
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
    useEffect(() => {
        if (!token)
            return;
        const socket = socketService.connect(token);
        if (roomId) {
            socket.emit('room:join', { roomId });
        }
        // Room events
        socket.on('room:device:joined', (data) => {
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
        socket.on('room:device:left', (data) => {
            removeMember(data.sessionId);
        });
        socket.on('room:device:updated', (data) => {
            updateMember(data.sessionId, {
                connectionStatus: data.status,
                batteryLevel: data.batteryLevel,
                volume: data.volume,
            });
        });
        // Playback events
        socket.on('playback:prepare', async (data) => {
            console.log('[Socket] playback:prepare received:', data);
            setIsPrepared(false);
            setIsPlaying(false);
            setPlaybackState({
                currentTrackId: data.trackId,
                status: 'preparing',
                sequenceNumber: data.sequenceNumber,
            });
            if (data.durationMs)
                setDuration(data.durationMs);
            try {
                await audioManager.prepareTrack(data.trackId, `${data.trackId}.mp3`, data.checksum, (progress) => setDownloadProgress(progress));
                setIsPrepared(true);
                socket.emit('device:ready', { roomId: roomId || '' });
            }
            catch (err) {
                console.error('[Socket] Failed to prepare track:', err);
            }
        });
        // CRITICAL: Scheduled playback event!
        socket.on('playback:scheduled', async (data) => {
            console.log('[Socket] playback:scheduled received:', data);
            const targetMonotonicMs = await clockSync.serverEpochToLocalMonotonic(data.startAtServerEpochMs);
            setPlaybackState({
                positionMs: data.positionMs,
                status: 'playing',
                serverStartAt: data.startAtServerEpochMs.toString(),
                sequenceNumber: data.sequenceNumber,
            });
            setIsPlaying(true);
            await audioManager.schedulePlay(data.positionMs, targetMonotonicMs);
        });
        socket.on('playback:pause', async (data) => {
            await audioManager.pause();
            setIsPlaying(false);
            setPlaybackState({
                status: 'paused',
                positionMs: data.positionMs,
                sequenceNumber: data.sequenceNumber,
            });
        });
        socket.on('playback:seek', async (data) => {
            await audioManager.seek(data.positionMs);
            setPosition(data.positionMs);
            setPlaybackState({
                positionMs: data.positionMs,
                sequenceNumber: data.sequenceNumber,
            });
        });
        socket.on('playback:stop', async () => {
            await audioManager.stop();
            setIsPlaying(false);
            setIsPrepared(false);
            setPosition(0);
            setPlaybackState({ status: 'stopped', positionMs: 0 });
        });
        // Sync monitoring events
        socket.on('sync:updated', (data) => {
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
        const reportInterval = setInterval(async () => {
            if (socket.connected && roomId) {
                // Send heartbeat
                socket.emit('device:heartbeat', { roomId });
                // Calculate and report drift
                const diagnostics = await syncManager.getDiagnostics();
                setLocalMetrics({
                    clockOffsetMs: diagnostics.clockOffsetMs,
                    roundTripTimeMs: diagnostics.roundTripTimeMs,
                    playbackDriftMs: diagnostics.playbackDriftMs,
                    health: diagnostics.health,
                });
                socket.emit('device:playback:report', {
                    roomId,
                    positionMs: diagnostics.positionMs,
                    clockOffsetMs: diagnostics.clockOffsetMs,
                    roundTripTimeMs: diagnostics.roundTripTimeMs,
                    playbackDriftMs: diagnostics.playbackDriftMs,
                });
            }
        }, 2500);
        return () => {
            clearInterval(reportInterval);
            if (roomId) {
                socket.emit('room:leave', { roomId });
            }
        };
    }, [roomId, token]);
};
