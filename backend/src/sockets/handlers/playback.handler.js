"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerPlaybackHandlers = void 0;
const playback_service_1 = require("../../services/playback.service");
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
};
exports.registerPlaybackHandlers = registerPlaybackHandlers;
