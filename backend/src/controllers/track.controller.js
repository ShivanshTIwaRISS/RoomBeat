"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteTrack = exports.streamAudioTrack = exports.getTrack = exports.getRoomTracks = exports.uploadTrack = void 0;
const fs_1 = __importDefault(require("fs"));
const track_service_1 = require("../services/track.service");
const response_1 = require("../utils/response");
const uploadTrack = async (req, res) => {
    try {
        if (!req.session)
            return (0, response_1.sendError)(res, 'Unauthorized', 'UNAUTHORIZED', 401);
        if (!req.file)
            return (0, response_1.sendError)(res, 'Audio file is required', 'FILE_REQUIRED', 400);
        const metadata = {
            title: req.body.title,
            artist: req.body.artist,
            durationMs: req.body.durationMs ? parseInt(req.body.durationMs, 10) : undefined,
        };
        const track = await track_service_1.trackService.createTrack(req.params.roomId, req.session.id, req.file, metadata);
        return (0, response_1.sendSuccess)(res, track, 'Track uploaded successfully', 201);
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'UPLOAD_ERROR', err.statusCode || 500);
    }
};
exports.uploadTrack = uploadTrack;
const getRoomTracks = async (req, res) => {
    try {
        const tracks = await track_service_1.trackService.getRoomTracks(req.params.roomId);
        return (0, response_1.sendSuccess)(res, tracks, 'Tracks retrieved successfully');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'TRACK_ERROR', err.statusCode || 500);
    }
};
exports.getRoomTracks = getRoomTracks;
const getTrack = async (req, res) => {
    try {
        const track = await track_service_1.trackService.getTrackById(req.params.trackId);
        return (0, response_1.sendSuccess)(res, track, 'Track retrieved successfully');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'TRACK_ERROR', err.statusCode || 500);
    }
};
exports.getTrack = getTrack;
/**
 * Stream or download audio track with full HTTP Range Request support
 */
const streamAudioTrack = async (req, res) => {
    try {
        const track = await track_service_1.trackService.getTrackById(req.params.trackId);
        if (!fs_1.default.existsSync(track.storagePath)) {
            return (0, response_1.sendError)(res, 'Audio file not found on disk', 'FILE_NOT_FOUND', 404);
        }
        const stat = fs_1.default.statSync(track.storagePath);
        const fileSize = stat.size;
        const range = req.headers.range;
        if (range) {
            // Parse Range Header, e.g. "bytes=32324-"
            const parts = range.replace(/bytes=/, '').split('-');
            const start = parseInt(parts[0], 10);
            const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
            if (start >= fileSize || end >= fileSize) {
                res.status(416).setHeader('Content-Range', `bytes */${fileSize}`);
                return res.end();
            }
            const chunkSize = end - start + 1;
            const fileStream = fs_1.default.createReadStream(track.storagePath, { start, end });
            res.writeHead(206, {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunkSize,
                'Content-Type': track.mimeType || 'audio/mpeg',
                'ETag': `"${track.checksum}"`,
            });
            return fileStream.pipe(res);
        }
        else {
            // Entire file
            res.writeHead(200, {
                'Content-Length': fileSize,
                'Content-Type': track.mimeType || 'audio/mpeg',
                'Accept-Ranges': 'bytes',
                'ETag': `"${track.checksum}"`,
            });
            return fs_1.default.createReadStream(track.storagePath).pipe(res);
        }
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'AUDIO_STREAM_ERROR', err.statusCode || 500);
    }
};
exports.streamAudioTrack = streamAudioTrack;
const deleteTrack = async (req, res) => {
    try {
        if (!req.session)
            return (0, response_1.sendError)(res, 'Unauthorized', 'UNAUTHORIZED', 401);
        const result = await track_service_1.trackService.deleteTrack(req.params.trackId, req.session.id);
        return (0, response_1.sendSuccess)(res, result, 'Track deleted successfully');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'TRACK_ERROR', err.statusCode || 500);
    }
};
exports.deleteTrack = deleteTrack;
