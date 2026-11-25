"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playbackService = exports.PlaybackService = void 0;
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
class PlaybackService {
    /**
     * Get current playback state for a room
     */
    async getPlaybackState(roomId) {
        let state = await database_1.prisma.playbackState.findUnique({
            where: { roomId },
            include: {
                room: {
                    include: {
                        members: {
                            where: { isActive: true },
                            include: { session: { select: { id: true, displayName: true, deviceName: true, connectionStatus: true } } },
                        },
                    },
                },
            },
        });
        if (!state) {
            state = await database_1.prisma.playbackState.create({
                data: { roomId },
                include: {
                    room: {
                        include: {
                            members: {
                                where: { isActive: true },
                                include: { session: { select: { id: true, displayName: true, deviceName: true, connectionStatus: true } } },
                            },
                        },
                    },
                },
            });
        }
        return {
            ...state,
            serverStartAt: state.serverStartAt ? state.serverStartAt.toString() : null,
        };
    }
    /**
     * Ensure requester is host
     */
    async ensureHost(roomId, requesterSessionId) {
        const member = await database_1.prisma.roomMember.findUnique({
            where: { roomId_sessionId: { roomId, sessionId: requesterSessionId } },
        });
        if (!member || member.role !== 'HOST' || !member.isActive) {
            throw new errorHandler_1.AppError('Only the room host can control playback', 403, 'FORBIDDEN');
        }
    }
    /**
     * Ensure requester is an active member
     */
    async ensureMember(roomId, requesterSessionId) {
        const member = await database_1.prisma.roomMember.findUnique({
            where: { roomId_sessionId: { roomId, sessionId: requesterSessionId } },
        });
        if (!member || !member.isActive) {
            throw new errorHandler_1.AppError('You are not an active member of this room', 403, 'FORBIDDEN');
        }
        return member;
    }
    /**
     * Prepare a track across devices (allowed for any active room member)
     */
    async prepareTrack(roomId, trackId, requesterSessionId) {
        await this.ensureMember(roomId, requesterSessionId);
        const track = await database_1.prisma.track.findUnique({
            where: { id: trackId },
        });
        if (!track || track.roomId !== roomId) {
            throw new errorHandler_1.AppError('Track not found in this room', 404, 'TRACK_NOT_FOUND');
        }
        const updated = await database_1.prisma.playbackState.upsert({
            where: { roomId },
            update: {
                currentTrackId: trackId,
                status: 'preparing',
                positionMs: 0,
                serverStartAt: null,
                sequenceNumber: { increment: 1 },
            },
            create: {
                roomId,
                currentTrackId: trackId,
                status: 'preparing',
                positionMs: 0,
                sequenceNumber: 1,
            },
        });
        return {
            playbackState: {
                ...updated,
                serverStartAt: null,
            },
            track,
        };
    }
    /**
     * Schedule synchronized playback at a future timestamp
     */
    async schedulePlay(roomId, requesterSessionId, positionMs = 0, delayMs = 900) {
        await this.ensureMember(roomId, requesterSessionId);
        const nowEpoch = Date.now();
        const clampedDelay = Math.max(400, Math.min(delayMs, 10000));
        const startAtServerEpochMs = BigInt(nowEpoch + clampedDelay);
        const updated = await database_1.prisma.playbackState.upsert({
            where: { roomId },
            update: {
                status: 'playing',
                positionMs,
                serverStartAt: startAtServerEpochMs,
                sequenceNumber: { increment: 1 },
            },
            create: {
                roomId,
                status: 'playing',
                positionMs,
                serverStartAt: startAtServerEpochMs,
                sequenceNumber: 1,
            },
        });
        return {
            playbackState: {
                ...updated,
                serverStartAt: updated.serverStartAt?.toString() ?? null,
            },
            startAtServerEpochMs: Number(startAtServerEpochMs),
            delayMs: clampedDelay,
        };
    }
    /**
     * Pause playback
     */
    async pausePlayback(roomId, requesterSessionId) {
        await this.ensureMember(roomId, requesterSessionId);
        const current = await database_1.prisma.playbackState.findUnique({ where: { roomId } });
        // Calculate elapsed time if playing
        let currentPosition = current?.positionMs || 0;
        if (current && current.status === 'playing' && current.serverStartAt) {
            const startMs = Number(current.serverStartAt);
            const now = Date.now();
            if (now > startMs) {
                currentPosition += (now - startMs);
            }
        }
        const updated = await database_1.prisma.playbackState.upsert({
            where: { roomId },
            update: {
                status: 'paused',
                positionMs: currentPosition,
                serverStartAt: null,
                sequenceNumber: { increment: 1 },
            },
            create: {
                roomId,
                status: 'paused',
                positionMs: currentPosition,
                sequenceNumber: 1,
            },
        });
        return {
            playbackState: {
                ...updated,
                serverStartAt: null,
            },
        };
    }
    /**
     * Seek to position
     */
    async seekPlayback(roomId, requesterSessionId, positionMs) {
        await this.ensureMember(roomId, requesterSessionId);
        const updated = await database_1.prisma.playbackState.upsert({
            where: { roomId },
            update: {
                positionMs,
                serverStartAt: null,
                status: 'paused',
                sequenceNumber: { increment: 1 },
            },
            create: {
                roomId,
                positionMs,
                status: 'paused',
                sequenceNumber: 1,
            },
        });
        return {
            playbackState: {
                ...updated,
                serverStartAt: null,
            },
        };
    }
    /**
     * Next track from queue
     */
    async nextTrack(roomId, requesterSessionId) {
        await this.ensureHost(roomId, requesterSessionId);
        // Get current queue
        const queue = await database_1.prisma.queueItem.findMany({
            where: { roomId },
            orderBy: { position: 'asc' },
            include: { track: true },
        });
        if (queue.length === 0) {
            throw new errorHandler_1.AppError('Queue is empty', 400, 'QUEUE_EMPTY');
        }
        // Pop the next track
        const nextItem = queue[0];
        await database_1.prisma.queueItem.delete({ where: { id: nextItem.id } });
        // Reorder remaining
        await database_1.prisma.queueItem.updateMany({
            where: { roomId, position: { gt: 0 } },
            data: { position: { decrement: 1 } },
        });
        const updated = await database_1.prisma.playbackState.upsert({
            where: { roomId },
            update: {
                currentTrackId: nextItem.trackId,
                positionMs: 0,
                status: 'preparing',
                serverStartAt: null,
                sequenceNumber: { increment: 1 },
            },
            create: {
                roomId,
                currentTrackId: nextItem.trackId,
                positionMs: 0,
                status: 'preparing',
                sequenceNumber: 1,
            },
        });
        return {
            playbackState: {
                ...updated,
                serverStartAt: null,
            },
            track: nextItem.track,
        };
    }
    /**
     * Stop playback
     */
    async stopPlayback(roomId, requesterSessionId) {
        await this.ensureHost(roomId, requesterSessionId);
        const updated = await database_1.prisma.playbackState.upsert({
            where: { roomId },
            update: {
                status: 'stopped',
                positionMs: 0,
                serverStartAt: null,
                sequenceNumber: { increment: 1 },
            },
            create: {
                roomId,
                status: 'stopped',
                positionMs: 0,
                sequenceNumber: 1,
            },
        });
        return {
            playbackState: {
                ...updated,
                serverStartAt: null,
            },
        };
    }
}
exports.PlaybackService = PlaybackService;
exports.playbackService = new PlaybackService();
