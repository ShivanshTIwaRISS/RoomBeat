"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackService = exports.TrackService = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const database_1 = require("../config/database");
const checksum_1 = require("../utils/checksum");
const errorHandler_1 = require("../middleware/errorHandler");
class TrackService {
    /**
     * Process uploaded track and persist metadata
     */
    async createTrack(roomId, uploaderSessionId, file, metadata) {
        const room = await database_1.prisma.room.findUnique({
            where: { id: roomId },
            include: { members: { where: { sessionId: uploaderSessionId, isActive: true } } },
        });
        if (!room) {
            throw new errorHandler_1.AppError('Room not found', 404, 'ROOM_NOT_FOUND');
        }
        if (room.members.length === 0) {
            throw new errorHandler_1.AppError('You are not an active member of this room', 403, 'FORBIDDEN');
        }
        const checksum = await (0, checksum_1.calculateFileChecksum)(file.path);
        const title = metadata?.title || path_1.default.parse(file.originalname).name;
        const artist = metadata?.artist || 'Unknown Artist';
        const track = await database_1.prisma.track.create({
            data: {
                roomId,
                filename: file.filename,
                title,
                artist,
                durationMs: metadata?.durationMs || null,
                fileSize: file.size,
                mimeType: file.mimetype,
                checksum,
                storagePath: file.path,
                uploadedBy: uploaderSessionId,
            },
            include: {
                uploader: {
                    select: { id: true, displayName: true, deviceName: true },
                },
            },
        });
        return track;
    }
    /**
     * Get all tracks for a room
     */
    async getRoomTracks(roomId) {
        return database_1.prisma.track.findMany({
            where: { roomId },
            orderBy: { createdAt: 'desc' },
            include: {
                uploader: {
                    select: { id: true, displayName: true, deviceName: true },
                },
            },
        });
    }
    /**
     * Get track by ID
     */
    async getTrackById(trackId) {
        const track = await database_1.prisma.track.findUnique({
            where: { id: trackId },
            include: {
                uploader: {
                    select: { id: true, displayName: true, deviceName: true },
                },
            },
        });
        if (!track) {
            throw new errorHandler_1.AppError('Track not found', 404, 'TRACK_NOT_FOUND');
        }
        return track;
    }
    /**
     * Delete track
     */
    async deleteTrack(trackId, requesterSessionId) {
        const track = await database_1.prisma.track.findUnique({
            where: { id: trackId },
            include: { room: true },
        });
        if (!track) {
            throw new errorHandler_1.AppError('Track not found', 404, 'TRACK_NOT_FOUND');
        }
        const isHost = track.room.hostSessionId === requesterSessionId;
        const isUploader = track.uploadedBy === requesterSessionId;
        if (!isHost && !isUploader) {
            throw new errorHandler_1.AppError('Only the host or track uploader can delete this track', 403, 'FORBIDDEN');
        }
        // Delete physical file
        try {
            if (fs_1.default.existsSync(track.storagePath)) {
                fs_1.default.unlinkSync(track.storagePath);
            }
        }
        catch (err) {
            console.error(`Failed to delete physical track file at ${track.storagePath}:`, err);
        }
        await database_1.prisma.track.delete({
            where: { id: trackId },
        });
        return { message: 'Track deleted successfully' };
    }
}
exports.TrackService = TrackService;
exports.trackService = new TrackService();
