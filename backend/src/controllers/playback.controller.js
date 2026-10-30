"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stopPlayback = exports.previousPlayback = exports.nextPlayback = exports.seekPlayback = exports.pausePlayback = exports.playPlayback = exports.preparePlayback = exports.getPlaybackState = void 0;
const playback_service_1 = require("../services/playback.service");
const response_1 = require("../utils/response");
const getPlaybackState = async (req, res) => {
    try {
        const state = await playback_service_1.playbackService.getPlaybackState(req.params.roomId);
        return (0, response_1.sendSuccess)(res, state, 'Playback state retrieved successfully');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'PLAYBACK_ERROR', err.statusCode || 500);
    }
};
exports.getPlaybackState = getPlaybackState;
const preparePlayback = async (req, res) => {
    try {
        if (!req.session)
            return (0, response_1.sendError)(res, 'Unauthorized', 'UNAUTHORIZED', 401);
        const result = await playback_service_1.playbackService.prepareTrack(req.params.roomId, req.body.trackId, req.session.id);
        return (0, response_1.sendSuccess)(res, result, 'Track preparation initiated');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'PLAYBACK_ERROR', err.statusCode || 500);
    }
};
exports.preparePlayback = preparePlayback;
const playPlayback = async (req, res) => {
    try {
        if (!req.session)
            return (0, response_1.sendError)(res, 'Unauthorized', 'UNAUTHORIZED', 401);
        const positionMs = req.body.positionMs ?? 0;
        const delayMs = req.body.delayMs ?? 3000;
        const result = await playback_service_1.playbackService.schedulePlay(req.params.roomId, req.session.id, positionMs, delayMs);
        return (0, response_1.sendSuccess)(res, result, 'Playback scheduled');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'PLAYBACK_ERROR', err.statusCode || 500);
    }
};
exports.playPlayback = playPlayback;
const pausePlayback = async (req, res) => {
    try {
        if (!req.session)
            return (0, response_1.sendError)(res, 'Unauthorized', 'UNAUTHORIZED', 401);
        const result = await playback_service_1.playbackService.pausePlayback(req.params.roomId, req.session.id);
        return (0, response_1.sendSuccess)(res, result, 'Playback paused');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'PLAYBACK_ERROR', err.statusCode || 500);
    }
};
exports.pausePlayback = pausePlayback;
const seekPlayback = async (req, res) => {
    try {
        if (!req.session)
            return (0, response_1.sendError)(res, 'Unauthorized', 'UNAUTHORIZED', 401);
        const result = await playback_service_1.playbackService.seekPlayback(req.params.roomId, req.session.id, req.body.positionMs);
        return (0, response_1.sendSuccess)(res, result, 'Playback seeked');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'PLAYBACK_ERROR', err.statusCode || 500);
    }
};
exports.seekPlayback = seekPlayback;
const nextPlayback = async (req, res) => {
    try {
        if (!req.session)
            return (0, response_1.sendError)(res, 'Unauthorized', 'UNAUTHORIZED', 401);
        const result = await playback_service_1.playbackService.nextTrack(req.params.roomId, req.session.id);
        return (0, response_1.sendSuccess)(res, result, 'Next track selected');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'PLAYBACK_ERROR', err.statusCode || 500);
    }
};
exports.nextPlayback = nextPlayback;
const previousPlayback = async (req, res) => {
    try {
        if (!req.session)
            return (0, response_1.sendError)(res, 'Unauthorized', 'UNAUTHORIZED', 401);
        // Seek back to start of current track if previous is called
        const result = await playback_service_1.playbackService.seekPlayback(req.params.roomId, req.session.id, 0);
        return (0, response_1.sendSuccess)(res, result, 'Restarted track');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'PLAYBACK_ERROR', err.statusCode || 500);
    }
};
exports.previousPlayback = previousPlayback;
const stopPlayback = async (req, res) => {
    try {
        if (!req.session)
            return (0, response_1.sendError)(res, 'Unauthorized', 'UNAUTHORIZED', 401);
        const result = await playback_service_1.playbackService.stopPlayback(req.params.roomId, req.session.id);
        return (0, response_1.sendSuccess)(res, result, 'Playback stopped');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'PLAYBACK_ERROR', err.statusCode || 500);
    }
};
exports.stopPlayback = stopPlayback;
