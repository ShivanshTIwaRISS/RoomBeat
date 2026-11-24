import { socketService } from '../services/socketService';
import { useRoomStore } from '../store/useRoomStore';
import { usePlaybackStore } from '../store/usePlaybackStore';
import { playbackApi } from '../api/playback';
export const usePlayback = () => {
    const currentRoom = useRoomStore((s) => s.currentRoom);
    const isHost = useRoomStore((s) => s.isHost);
    const isPlaying = usePlaybackStore((s) => s.isPlaying);
    const positionMs = usePlaybackStore((s) => s.positionMs);
    const durationMs = usePlaybackStore((s) => s.durationMs);
    const prepare = (trackId) => {
        if (!currentRoom)
            return;
        const socket = socketService.getSocket();
        if (socket) {
            socket.emit('host:playback:prepare', { roomId: currentRoom.id, trackId });
        }
        else {
            playbackApi.prepare(currentRoom.id, trackId);
        }
    };
    const play = (customPositionMs) => {
        if (!currentRoom)
            return;
        usePlaybackStore.getState().setIsPlaying(true);
        const socket = socketService.getSocket();
        const pos = customPositionMs !== undefined ? customPositionMs : positionMs;
        if (socket && socket.connected) {
            socket.emit('host:playback:play', {
                roomId: currentRoom.id,
                positionMs: pos,
                delayMs: 3000,
            });
        }
        else {
            playbackApi.play(currentRoom.id, pos, 3000).catch(console.warn);
        }
    };
    const pause = () => {
        if (!currentRoom)
            return;
        usePlaybackStore.getState().setIsPlaying(false);
        const socket = socketService.getSocket();
        if (socket && socket.connected) {
            socket.emit('host:playback:pause', { roomId: currentRoom.id });
        }
        else {
            playbackApi.pause(currentRoom.id).catch(console.warn);
        }
    };
    const seek = (newPositionMs) => {
        if (!currentRoom)
            return;
        const socket = socketService.getSocket();
        if (socket) {
            socket.emit('host:playback:seek', { roomId: currentRoom.id, positionMs: newPositionMs });
        }
        else {
            playbackApi.seek(currentRoom.id, newPositionMs);
        }
    };
    const next = () => {
        if (!currentRoom)
            return;
        const socket = socketService.getSocket();
        if (socket) {
            socket.emit('host:playback:next', { roomId: currentRoom.id });
        }
        else {
            playbackApi.next(currentRoom.id);
        }
    };
    const previous = () => {
        if (!currentRoom)
            return;
        const socket = socketService.getSocket();
        if (socket) {
            socket.emit('host:playback:previous', { roomId: currentRoom.id });
        }
        else {
            playbackApi.previous(currentRoom.id);
        }
    };
    const stop = () => {
        if (!currentRoom)
            return;
        const socket = socketService.getSocket();
        if (socket) {
            socket.emit('host:playback:stop', { roomId: currentRoom.id });
        }
        else {
            playbackApi.stop(currentRoom.id);
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
