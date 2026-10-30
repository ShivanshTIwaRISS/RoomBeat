"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queueService = exports.QueueService = void 0;
const database_1 = require("../config/database");
const errorHandler_1 = require("../middleware/errorHandler");
class QueueService {
    /**
     * Get queue for a room ordered by position
     */
    async getQueue(roomId) {
        return database_1.prisma.queueItem.findMany({
            where: { roomId },
            orderBy: { position: 'asc' },
            include: {
                track: {
                    select: {
                        id: true,
                        title: true,
                        artist: true,
                        durationMs: true,
                        fileSize: true,
                        filename: true,
                        mimeType: true,
                        checksum: true,
                    },
                },
            },
        });
    }
    /**
     * Add a track to the end of the room queue
     */
    async addToQueue(roomId, trackId, requesterSessionId) {
        const member = await database_1.prisma.roomMember.findUnique({
            where: { roomId_sessionId: { roomId, sessionId: requesterSessionId } },
        });
        if (!member || !member.isActive) {
            throw new errorHandler_1.AppError('You are not an active member of this room', 403, 'FORBIDDEN');
        }
        const track = await database_1.prisma.track.findUnique({
            where: { id: trackId },
        });
        if (!track || track.roomId !== roomId) {
            throw new errorHandler_1.AppError('Track not found in this room', 404, 'TRACK_NOT_FOUND');
        }
        // Find highest position
        const lastItem = await database_1.prisma.queueItem.findFirst({
            where: { roomId },
            orderBy: { position: 'desc' },
        });
        const nextPosition = lastItem ? lastItem.position + 1 : 0;
        const item = await database_1.prisma.queueItem.create({
            data: {
                roomId,
                trackId,
                position: nextPosition,
            },
            include: {
                track: true,
            },
        });
        return item;
    }
    /**
     * Reorder a queue item
     */
    async reorderQueue(roomId, itemId, newPosition, requesterSessionId) {
        const member = await database_1.prisma.roomMember.findUnique({
            where: { roomId_sessionId: { roomId, sessionId: requesterSessionId } },
        });
        if (!member || member.role !== 'HOST') {
            throw new errorHandler_1.AppError('Only the room host can reorder the queue', 403, 'FORBIDDEN');
        }
        const item = await database_1.prisma.queueItem.findUnique({
            where: { id: itemId },
        });
        if (!item || item.roomId !== roomId) {
            throw new errorHandler_1.AppError('Queue item not found', 404, 'QUEUE_ITEM_NOT_FOUND');
        }
        const currentPosition = item.position;
        if (currentPosition === newPosition) {
            return this.getQueue(roomId);
        }
        // Atomic shift in a transaction
        await database_1.prisma.$transaction(async (tx) => {
            // Temporarily park item to -1 to avoid unique constraint collisions
            await tx.queueItem.update({
                where: { id: itemId },
                data: { position: -1 },
            });
            if (currentPosition < newPosition) {
                // Shift items down: item moved later in queue
                await tx.queueItem.updateMany({
                    where: {
                        roomId,
                        position: {
                            gt: currentPosition,
                            lte: newPosition,
                        },
                    },
                    data: {
                        position: { decrement: 1 },
                    },
                });
            }
            else {
                // Shift items up: item moved earlier in queue
                await tx.queueItem.updateMany({
                    where: {
                        roomId,
                        position: {
                            gte: newPosition,
                            lt: currentPosition,
                        },
                    },
                    data: {
                        position: { increment: 1 },
                    },
                });
            }
            await tx.queueItem.update({
                where: { id: itemId },
                data: { position: newPosition },
            });
        });
        return this.getQueue(roomId);
    }
    /**
     * Remove item from queue
     */
    async removeFromQueue(roomId, itemId, requesterSessionId) {
        const member = await database_1.prisma.roomMember.findUnique({
            where: { roomId_sessionId: { roomId, sessionId: requesterSessionId } },
        });
        if (!member || member.role !== 'HOST') {
            throw new errorHandler_1.AppError('Only the room host can remove items from queue', 403, 'FORBIDDEN');
        }
        const item = await database_1.prisma.queueItem.findUnique({
            where: { id: itemId },
        });
        if (!item || item.roomId !== roomId) {
            throw new errorHandler_1.AppError('Queue item not found', 404, 'QUEUE_ITEM_NOT_FOUND');
        }
        await database_1.prisma.$transaction(async (tx) => {
            await tx.queueItem.delete({
                where: { id: itemId },
            });
            // Shift subsequent positions down
            await tx.queueItem.updateMany({
                where: {
                    roomId,
                    position: { gt: item.position },
                },
                data: {
                    position: { decrement: 1 },
                },
            });
        });
        return this.getQueue(roomId);
    }
    /**
     * Clear entire queue
     */
    async clearQueue(roomId, requesterSessionId) {
        const member = await database_1.prisma.roomMember.findUnique({
            where: { roomId_sessionId: { roomId, sessionId: requesterSessionId } },
        });
        if (!member || member.role !== 'HOST') {
            throw new errorHandler_1.AppError('Only the room host can clear the queue', 403, 'FORBIDDEN');
        }
        await database_1.prisma.queueItem.deleteMany({
            where: { roomId },
        });
        return { message: 'Queue cleared' };
    }
}
exports.QueueService = QueueService;
exports.queueService = new QueueService();
