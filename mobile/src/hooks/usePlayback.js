import { socketService } from '../services/socketService';
import { useRoomStore } from '../store/useRoomStore';
import { usePlaybackStore } from '../store/usePlaybackStore';
import { playbackApi } from '../api/playback';
import { nativeAudio } from '../audio/NativeAudioModule';
import { getActiveBaseUrl } from '../api/client';

export const usePlayback = () => {
    const currentRoom = useRoomStore((s) => s.currentRoom);
    const isHost = useRoomStore((s) => s.isHost);
    const isPlaying = usePlaybackStore((s) => s.isPlaying);
    const positionMs = usePlaybackStore((s) => s.positionMs);
    const durationMs = usePlaybackStore((s) => s.durationMs);

    const ensureAudioPrepared = async () => {
        try {
            const track = usePlaybackStore.getState().currentTrack;
            const baseUrl = await getActiveBaseUrl();
            const serverRoot = baseUrl.replace('/api/v1', '');
            const isPreset = !track?.id || String(track.id).startsWith('preset-');
            const audioUri = isPreset
                ? `${serverRoot}/demo.wav`
                : `${baseUrl}/tracks/${track.id}/audio`;
            await nativeAudio.prepareIfNeeded(audioUri);
        } catch (e) {
            console.warn('[usePlayback] prepareIfNeeded error:', e);
        }
    };

    const prepare = async (trackId) => {
        if (!currentRoom)
            return;
        try {
            const baseUrl = await getActiveBaseUrl();
            const serverRoot = baseUrl.replace('/api/v1', '');
            const isPreset = !trackId || String(trackId).startsWith('preset-');
            const audioUri = isPreset
                ? `${serverRoot}/demo.wav`
                : `${baseUrl}/tracks/${trackId}/audio`;
            await nativeAudio.prepare(audioUri);
        } catch (e) {}

        const socket = socketService.getSocket();
        if (socket && socket.connected) {
            socket.emit('host:playback:prepare', { roomId: currentRoom.id, trackId });
        }
        else {
            playbackApi.prepare(currentRoom.id, trackId).catch(console.warn);
        }
    };

    const play = async (customPositionMs) => {
        if (!currentRoom)
            return;
        usePlaybackStore.getState().setIsPlaying(true);
        await ensureAudioPrepared();

        const socket = socketService.getSocket();
        const pos = customPositionMs !== undefined ? customPositionMs : positionMs;
        if (socket && socket.connected) {
            socket.emit('host:playback:play', {
                roomId: currentRoom.id,
                positionMs: pos,
                delayMs: 1500,
            });
        }
        else {
            // Fallback: play locally right away AND notify backend via REST
            try {
                if (pos > 0) await nativeAudio.seek(pos);
                await nativeAudio.play();
            } catch (e) {
                console.warn('[usePlayback] local play fallback error:', e);
            }
            playbackApi.play(currentRoom.id, pos, 1500).catch(console.warn);
        }
    };

    const pause = async () => {
        if (!currentRoom)
            return;
        usePlaybackStore.getState().setIsPlaying(false);
        const socket = socketService.getSocket();
        if (socket && socket.connected) {
            socket.emit('host:playback:pause', { roomId: currentRoom.id });
        }
        else {
            try {
                await nativeAudio.pause();
            } catch (e) {}
            playbackApi.pause(currentRoom.id).catch(console.warn);
        }
    };

    const seek = async (newPositionMs) => {
        if (!currentRoom)
            return;
        usePlaybackStore.getState().setPosition(newPositionMs);
        const socket = socketService.getSocket();
        if (socket && socket.connected) {
            socket.emit('host:playback:seek', { roomId: currentRoom.id, positionMs: newPositionMs });
        }
        else {
            try {
                await nativeAudio.seek(newPositionMs);
            } catch (e) {}
            playbackApi.seek(currentRoom.id, newPositionMs).catch(console.warn);
        }
    };

    const next = () => {
        if (!currentRoom)
            return;
        const socket = socketService.getSocket();
        if (socket && socket.connected) {
            socket.emit('host:playback:next', { roomId: currentRoom.id });
        }
        else {
            playbackApi.next(currentRoom.id).catch(console.warn);
        }
    };

    const previous = () => {
        if (!currentRoom)
            return;
        const socket = socketService.getSocket();
        if (socket && socket.connected) {
            socket.emit('host:playback:previous', { roomId: currentRoom.id });
        }
        else {
            playbackApi.previous(currentRoom.id).catch(console.warn);
        }
    };

    const stop = async () => {
        if (!currentRoom)
            return;
        usePlaybackStore.getState().setIsPlaying(false);
        usePlaybackStore.getState().setPosition(0);
        const socket = socketService.getSocket();
        if (socket && socket.connected) {
            socket.emit('host:playback:stop', { roomId: currentRoom.id });
        }
        else {
            try {
                await nativeAudio.stop();
            } catch (e) {}
            playbackApi.stop(currentRoom.id).catch(console.warn);
        }
    };

    return {
        isHost,
        isPlaying,
        positionMs,
        durationMs,
        prepare,
        play,
        pause,
        seek,
        next,
        previous,
        stop,
    };
};
