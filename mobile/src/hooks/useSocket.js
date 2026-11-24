import { useEffect } from 'react';
import { socketService } from '../services/socketService';
import { useSessionStore } from '../store/useSessionStore';
import { useRoomStore } from '../store/useRoomStore';
import { usePlaybackStore } from '../store/usePlaybackStore';
import { useSyncStore } from '../store/useSyncStore';
import { storage } from '../utils/storage';
import { clockSync } from '../sync/ClockSync';
import { nativeAudio } from '../audio/NativeAudioModule';
import { getActiveBaseUrl } from '../api/client';

export const useSocket = (roomId) => {
    const token = useSessionStore((s) => s.token);
    const addMember = useRoomStore((s) => s.addMember);
    const removeMember = useRoomStore((s) => s.removeMember);
    const updateMember = useRoomStore((s) => s.updateMember);
    const setPlaybackState = usePlaybackStore((s) => s.setPlaybackState);
    const setIsPlaying = usePlaybackStore((s) => s.setIsPlaying);
    const setIsPrepared = usePlaybackStore((s) => s.setIsPrepared);
    const setPosition = usePlaybackStore((s) => s.setPosition);
    const setDuration = usePlaybackStore((s) => s.setDuration);
    const setCurrentTrack = usePlaybackStore((s) => s.setCurrentTrack);
    const setMembers = useRoomStore((s) => s.setMembers);
    const updateDeviceReport = useSyncStore((s) => s.updateDeviceReport);
    const setLocalMetrics = useSyncStore((s) => s.setLocalMetrics);

    useEffect(() => {
        let isMounted = true;
        let reportInterval = null;

        // Subscribe to native ExoPlayer position updates
        const unsubscribePos = nativeAudio.onPositionUpdate((evt) => {
            if (!isMounted) return;
            try {
                if (evt && typeof evt.positionMs === 'number') {
                    setPosition(Math.round(evt.positionMs));
                }
            } catch (e) {}
        });

        const registerListeners = (sock) => {
            try {
                sock.off('room:joined');
                sock.off('room:device:joined');
                sock.off('room:device:left');
                sock.off('room:device:updated');
                sock.off('room:track:added');
                sock.off('playback:prepare');
                sock.off('playback:scheduled');
                sock.off('playback:pause');
                sock.off('playback:seek');
                sock.off('playback:stop');
                sock.off('playback:preset');
                sock.off('sync:updated');
                sock.off('connect');
            } catch (e) {}

            sock.on('connect', () => {
                console.log(`[useSocket] Socket connected! Joining room: ${roomId}`);
                try { if (roomId) sock.emit('room:join', { roomId }); } catch (e) {}
            });

            sock.on('room:joined', async (data) => {
                if (!isMounted) return;
                try {
                    if (Array.isArray(data?.members)) {
                        setMembers(data.members);
                    }
                    const ps = data?.playbackState;
                    if (ps && ps.currentTrackId) {
                        const baseUrl = await getActiveBaseUrl();
                        const audioUri = `${baseUrl}/tracks/${ps.currentTrackId}/audio`;
                        await nativeAudio.prepareIfNeeded(audioUri);
                        setIsPrepared(true);
                        if (ps.status === 'playing' && ps.serverStartAt) {
                            const serverEpochMs = Number(ps.serverStartAt);
                            const elapsedMs = Math.max(0, Date.now() + (clockSync.clockOffset || 0) - serverEpochMs);
                            const targetPos = (Number(ps.positionMs) || 0) + elapsedMs;
                            setIsPlaying(true);
                            setPosition(targetPos);
                            await nativeAudio.seek(targetPos);
                            await nativeAudio.play();
                        }
                    }
                } catch (e) {
                    console.warn('[Socket] room:joined sync error:', e);
                }
            });

            sock.on('playback:preset', async (data) => {
                if (!isMounted) return;
                try {
                    console.log('[Socket] playback:preset received:', data);
                    setPlaybackState({
                        currentTrackId: data.presetId,
                        status: 'prepared',
                    });
                    const baseUrl = await getActiveBaseUrl();
                    const serverRoot = baseUrl.replace('/api/v1', '');
                    const audioUri = `${serverRoot}/demo.wav`;
                    await nativeAudio.prepare(audioUri);
                    setIsPrepared(true);
                    setCurrentTrack({
                        id: data.presetId || 'preset-demo',
                        title: data.title || 'Studio Preset Beat',
                        artist: data.senderName || 'RoomBeat Studio',
                        durationMs: (data.durationSec || 30) * 1000,
                    });
                } catch (e) { console.warn('[Socket] preset error:', e); }
            });

            sock.on('room:device:joined', (data) => {
                if (!isMounted) return;
                try {
                    addMember(data);
                } catch (e) {
                    console.warn('[Socket] device joined handler error:', e);
                }
            });

            sock.on('room:device:left', (data) => {
                if (!isMounted) return;
                try { removeMember(data?.sessionId || data?.id); } catch (e) {}
            });

            sock.on('room:device:updated', (data) => {
                if (!isMounted) return;
                try { updateMember(data?.sessionId || data?.id, data); } catch (e) {}
            });

            sock.on('room:track:added', (data) => {
                if (!isMounted) return;
                try {
                    console.log('[Socket] room:track:added:', data?.track?.title);
                    if (data?.track) {
                        setCurrentTrack(data.track);
                    }
                } catch (e) {}
            });

            sock.on('playback:prepare', async (data) => {
                if (!isMounted) return;
                console.log('[Socket] playback:prepare for track:', data?.trackId);
                setIsPrepared(false);
                try {
                    const baseUrl = await getActiveBaseUrl();
                    const serverRoot = baseUrl.replace('/api/v1', '');
                    const audioUri = data?.trackUrl 
                        ? (data.trackUrl.startsWith('http') ? data.trackUrl : `${serverRoot}${data.trackUrl}`)
                        : data?.trackId 
                            ? `${baseUrl}/tracks/${data.trackId}/audio`
                            : `${serverRoot}/demo.wav`;

                    await nativeAudio.prepare(audioUri);
                    setIsPrepared(true);

                    if (data?.title) {
                        setCurrentTrack({
                            id: data.trackId,
                            title: data.title,
                            artist: data.artist || 'RoomBeat Audio',
                            durationMs: data.durationMs || 180000,
                        });
                        setDuration(data.durationMs || 180000);
                    }
                } catch (e) {
                    console.warn('[Socket] Failed to prepare track:', e);
                }
            });

            sock.on('playback:scheduled', async (data) => {
                if (!isMounted) return;
                try {
                    console.log('[Socket] playback:scheduled at server time:', data?.startAtServerEpochMs || data?.serverStartAt);
                    setIsPlaying(true);
                    if (data?.positionMs !== undefined) {
                        setPosition(data.positionMs);
                    }

                    // Compute target monotonic time using NTP clock offset
                    const serverEpochMs = Number(data?.startAtServerEpochMs || data?.serverStartAt || Date.now() + 1500);
                    const targetMonotonicMs = await clockSync.serverEpochToLocalMonotonic(serverEpochMs);
                    const pos = Number(data?.positionMs) || 0;

                    // Only prepare if not already prepared for this URI
                    try {
                        const baseUrl = await getActiveBaseUrl();
                        const serverRoot = baseUrl.replace('/api/v1', '');
                        const track = usePlaybackStore.getState().currentTrack;
                        const activeTrackId = data?.trackId || track?.id;
                        const isPreset = !activeTrackId || String(activeTrackId).startsWith('preset-');
                        const audioUri = isPreset
                            ? `${serverRoot}/demo.wav`
                            : `${baseUrl}/tracks/${activeTrackId}/audio`;
                        await nativeAudio.prepareIfNeeded(audioUri);
                    } catch (prepErr) {}

                    // Schedule playback with native high-precision timer
                    await nativeAudio.schedulePlay(pos, targetMonotonicMs);
                } catch (e) {
                    console.warn('[Socket] scheduled play error, playing immediately:', e);
                    try {
                        await nativeAudio.play();
                    } catch (playErr) {}
                }
            });

            sock.on('playback:pause', async (data) => {
                if (!isMounted) return;
                try {
                    setIsPlaying(false);
                    if (data?.positionMs !== undefined) {
                        setPosition(data.positionMs);
                    }
                    await nativeAudio.pause();
                } catch (e) { console.warn('[Socket] pause error:', e); }
            });

            sock.on('playback:seek', async (data) => {
                if (!isMounted) return;
                try {
                    if (data?.positionMs !== undefined) {
                        setPosition(data.positionMs);
                        await nativeAudio.seek(data.positionMs);
                    }
                } catch (e) { console.warn('[Socket] seek error:', e); }
            });

            sock.on('playback:stop', async () => {
                if (!isMounted) return;
                try {
                    setIsPlaying(false);
                    setPosition(0);
                    await nativeAudio.stop();
                } catch (e) { console.warn('[Socket] stop error:', e); }
            });

            sock.on('sync:updated', (report) => {
                if (!isMounted) return;
                try { updateDeviceReport(report?.sessionId, report); } catch (e) {}
            });

            // Sync reporting
            reportInterval = setInterval(() => {
                if (!isMounted) return;
                try {
                    const offsetMs = clockSync.clockOffset || 0;
                    const rttMs = clockSync.roundTripTime || 0;
                    setLocalMetrics({
                        clockOffsetMs: offsetMs,
                        roundTripTimeMs: rttMs,
                        playbackDriftMs: 0,
                        health: 'good',
                    });

                    if (sock.connected && roomId) {
                        sock.emit('sync:report', {
                            roomId,
                            clockOffsetMs: offsetMs,
                            roundTripTimeMs: rttMs,
                            playbackDriftMs: 0,
                        });
                    }
                } catch (e) {
                    console.warn('[useSocket] sync report error:', e);
                }
            }, 2500);
        };

        const connectAndSetup = async () => {
            try {
                let activeToken = token;
                if (!activeToken) {
                    try { activeToken = await storage.getToken(); } catch (e) {}
                }
                if (!activeToken) {
                    try {
                        const created = await useSessionStore.getState().createGuest('Music Fan');
                        activeToken = created?.token || useSessionStore.getState().token;
                    } catch (e) {
                        console.warn('[useSocket] guest creation failed:', e);
                    }
                }
                if (!activeToken || !isMounted) return;
                const sock = await socketService.connect(activeToken);
                if (!isMounted || !sock) return;
                registerListeners(sock);
                if (roomId && sock.connected) {
                    sock.emit('room:join', { roomId });
                }
            } catch (err) {
                console.warn('[useSocket] connect error:', err);
            }
        };

        connectAndSetup();

        return () => {
            isMounted = false;
            if (reportInterval) clearInterval(reportInterval);
            try { unsubscribePos(); } catch (e) {}
            try {
                const sock = socketService.getSocket();
                if (sock && roomId) {
                    sock.emit('room:leave', { roomId });
                }
            } catch (e) {}
        };
    }, [roomId, token]);
};
