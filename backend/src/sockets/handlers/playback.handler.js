"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPlaybackHandlers = void 0;
const playback_service_1 = require("../../services/playback.service");
const activeYouTubeRooms = new Map();
exports.activeYouTubeRooms = activeYouTubeRooms;

const registerPlaybackHandlers = (io, socket) => {
    const session = socket.session;
    /**
     * Member or Host prepares track across all room devices
     */
    const handlePrepare = async (data) => {
        if (!session)
            return;
        try {
            const result = await playback_service_1.playbackService.prepareTrack(data.roomId, data.trackId, session.id);
            io.to(data.roomId).emit('playback:prepare', {
                trackId: result.track.id,
                trackUrl: `/api/v1/tracks/${result.track.id}/audio`,
                title: result.track.title,
                artist: result.track.artist,
                durationMs: result.track.durationMs,
                checksum: result.track.checksum,
                sequenceNumber: result.playbackState.sequenceNumber,
            });
        }
        catch (err) {
            socket.emit('server:error', { code: 'PREPARE_ERROR', message: err.message });
        }
    };
    socket.on('host:playback:prepare', handlePrepare);
    socket.on('room:playback:prepare', handlePrepare);
    /**
     * Host starts synchronized playback with future server epoch timestamp
     */
    socket.on('host:playback:play', async (data) => {
        if (!session)
            return;
        try {
            const result = await playback_service_1.playbackService.schedulePlay(data.roomId, session.id, data.positionMs ?? 0, data.delayMs ?? 3000);
            io.to(data.roomId).emit('playback:scheduled', {
                trackId: result.playbackState.currentTrackId,
                positionMs: result.playbackState.positionMs,
                startAtServerEpochMs: result.startAtServerEpochMs,
                sequenceNumber: result.playbackState.sequenceNumber,
            });
        }
        catch (err) {
            socket.emit('server:error', { code: 'PLAY_ERROR', message: err.message });
        }
    });
    /**
     * Host pauses playback
     */
    socket.on('host:playback:pause', async (data) => {
        if (!session)
            return;
        try {
            const result = await playback_service_1.playbackService.pausePlayback(data.roomId, session.id);
            io.to(data.roomId).emit('playback:pause', {
                positionMs: result.playbackState.positionMs,
                sequenceNumber: result.playbackState.sequenceNumber,
            });
        }
        catch (err) {
            socket.emit('server:error', { code: 'PAUSE_ERROR', message: err.message });
        }
    });
    /**
     * Host seeks position
     */
    socket.on('host:playback:seek', async (data) => {
        if (!session)
            return;
        try {
            const result = await playback_service_1.playbackService.seekPlayback(data.roomId, session.id, data.positionMs);
            io.to(data.roomId).emit('playback:seek', {
                positionMs: result.playbackState.positionMs,
                sequenceNumber: result.playbackState.sequenceNumber,
            });
        }
        catch (err) {
            socket.emit('server:error', { code: 'SEEK_ERROR', message: err.message });
        }
    });
    /**
     * Host skips to next track
     */
    socket.on('host:playback:next', async (data) => {
        if (!session)
            return;
        try {
            const result = await playback_service_1.playbackService.nextTrack(data.roomId, session.id);
            io.to(data.roomId).emit('playback:prepare', {
                trackId: result.track.id,
                trackUrl: `/api/v1/tracks/${result.track.id}/audio`,
                title: result.track.title,
                artist: result.track.artist,
                durationMs: result.track.durationMs,
                checksum: result.track.checksum,
                sequenceNumber: result.playbackState.sequenceNumber,
            });
        }
        catch (err) {
            socket.emit('server:error', { code: 'NEXT_ERROR', message: err.message });
        }
    });
    /**
     * Host restarts track
     */
    socket.on('host:playback:previous', async (data) => {
        if (!session)
            return;
        try {
            const result = await playback_service_1.playbackService.seekPlayback(data.roomId, session.id, 0);
            io.to(data.roomId).emit('playback:seek', {
                positionMs: 0,
                sequenceNumber: result.playbackState.sequenceNumber,
            });
        }
        catch (err) {
            socket.emit('server:error', { code: 'PREV_ERROR', message: err.message });
        }
    });
    /**
     * Host stops playback
     */
    socket.on('host:playback:stop', async (data) => {
        if (!session)
            return;
        try {
            const result = await playback_service_1.playbackService.stopPlayback(data.roomId, session.id);
            io.to(data.roomId).emit('playback:stop', {
                sequenceNumber: result.playbackState.sequenceNumber,
            });
        }
        catch (err) {
            socket.emit('server:error', { code: 'STOP_ERROR', message: err.message });
        }
    });
    /**
     * Synchronize room playback volume across all connected devices
     */
    socket.on('playback:volume', (data) => {
        if (!session || !data.roomId)
            return;
        io.to(data.roomId).emit('playback:volume', {
            volume: typeof data.volume === 'number' ? Math.max(0, Math.min(1, data.volume)) : 1.0,
            senderId: session.id,
            senderName: session.displayName,
        });
    });
    /**
     * Live Audio Streaming (System / Tab / Mic capture broadcast)
     */
    socket.on('stream:audio:start', (data) => {
        if (!session || !data.roomId)
            return;
        socket.to(data.roomId).emit('stream:audio:start', {
            senderId: session.id,
            senderName: session.displayName,
            sourceType: data.sourceType || 'system',
            title: data.title || 'Live Broadcast',
            sampleRate: data.sampleRate || 44100,
        });
    });
    socket.on('stream:audio:chunk', (data) => {
        if (!session || !data.roomId)
            return;
        socket.to(data.roomId).emit('stream:audio:chunk', {
            chunk: data.chunk,
            sampleRate: data.sampleRate || 44100,
            timestamp: data.timestamp,
        });
    });
    socket.on('stream:audio:stop', (data) => {
        if (!session || !data.roomId)
            return;
        socket.to(data.roomId).emit('stream:audio:stop', {
            senderId: session.id,
        });
    });
    /**
     * Synchronized YouTube Video Playback
     */
    socket.on('playback:youtube', (data) => {
        if (!session || !data.roomId)
            return;
        const ytState = {
            videoId: data.videoId,
            title: data.title || 'YouTube Audio',
            startAtServerEpochMs: data.startAtServerEpochMs || (Date.now() + 2500),
            positionSec: data.positionSec || 0,
            isPlaying: true,
            senderName: session.displayName,
        };
        activeYouTubeRooms.set(data.roomId, ytState);
        io.to(data.roomId).emit('playback:youtube', ytState);
    });
    socket.on('playback:youtube:sync', (data) => {
        if (!session || !data.roomId)
            return;
        const current = activeYouTubeRooms.get(data.roomId);
        if (current) {
            current.positionSec = data.currentTime || current.positionSec;
            current.isPlaying = Boolean(data.isPlaying);
            activeYouTubeRooms.set(data.roomId, current);
        }
        socket.to(data.roomId).emit('playback:youtube:sync', {
            currentTime: data.currentTime,
            isPlaying: data.isPlaying,
            serverTimestamp: Date.now(),
        });
    });
    socket.on('playback:youtube:control', (data) => {
        if (!session || !data.roomId)
            return;
        const current = activeYouTubeRooms.get(data.roomId);
        if (current) {
            if (data.action === 'pause') {
                current.isPlaying = false;
                current.positionSec = data.positionSec || current.positionSec;
            } else if (data.action === 'play') {
                current.isPlaying = true;
                current.startAtServerEpochMs = data.startAtServerEpochMs || Date.now();
                current.positionSec = data.positionSec || current.positionSec;
            } else if (data.action === 'seek') {
                current.positionSec = data.positionSec || 0;
            }
            activeYouTubeRooms.set(data.roomId, current);
        }
        socket.to(data.roomId).emit('playback:youtube:control', {
            action: data.action,
            positionSec: data.positionSec || 0,
            startAtServerEpochMs: data.startAtServerEpochMs || Date.now(),
            senderId: session.id,
        });
    });
};
exports.registerPlaybackHandlers = registerPlaybackHandlers;
