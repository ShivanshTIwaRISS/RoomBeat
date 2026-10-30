"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roomService = exports.RoomService = void 0;
const database_1 = require("../config/database");
const config_1 = require("../config");
const roomCode_1 = require("../utils/roomCode");
const errorHandler_1 = require("../middleware/errorHandler");
class RoomService {
    /**
     * Create a new room
     */
    async createRoom(hostSessionId, payload) {
        // Generate unique room code with retry
        let code = '';
        let attempts = 0;
        const maxAttempts = 10;
        while (attempts < maxAttempts) {
            code = (0, roomCode_1.generateRoomCode)();
            const existing = await database_1.prisma.room.findUnique({ where: { code } });
            if (!existing)
                break;
            attempts++;
        }
        if (attempts >= maxAttempts) {
            throw new errorHandler_1.AppError('Failed to generate unique room code', 500, 'CODE_GENERATION_FAILED');
        }
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + config_1.config.room.expiresInHours);
        const room = await database_1.prisma.room.create({
            data: {
                name: payload.name,
                code,
                hostSessionId,
                isPrivate: payload.isPrivate ?? false,
                maxDevices: payload.maxDevices ?? config_1.config.room.defaultMaxDevices,
                expiresAt,
                members: {
                    create: {
                        sessionId: hostSessionId,
                        role: 'HOST',
                    },
                },
                playbackState: {
                    create: {},
                },
            },
            include: {
                members: {
                    include: { session: { select: { id: true, displayName: true, deviceName: true, connectionStatus: true } } },
                },
                playbackState: true,
            },
        });
        return room;
    }
    /**
     * Get room by ID
     */
    async getRoom(roomId) {
        const room = await database_1.prisma.room.findUnique({
            where: { id: roomId },
            include: {
                host: { select: { id: true, displayName: true, deviceName: true } },
                members: {
                    where: { isActive: true },
                    include: { session: { select: { id: true, displayName: true, deviceName: true, connectionStatus: true } } },
                },
                playbackState: true,
                _count: { select: { tracks: true, queueItems: true } },
            },
        });
        if (!room) {
            throw new errorHandler_1.AppError('Room not found', 404, 'ROOM_NOT_FOUND');
        }
        return room;
    }
    /**
     * Get room by code
     */
    async getRoomByCode(code) {
        const room = await database_1.prisma.room.findUnique({
            where: { code: code.toUpperCase() },
            include: {
                host: { select: { id: true, displayName: true, deviceName: true } },
                members: {
                    where: { isActive: true },
                    include: { session: { select: { id: true, displayName: true, deviceName: true, connectionStatus: true } } },
                },
                playbackState: true,
            },
        });
        if (!room) {
            throw new errorHandler_1.AppError('Room not found', 404, 'ROOM_NOT_FOUND');
        }
        return room;
    }
    /**
     * Join a room by code
     */
    async joinRoom(sessionId, code) {
        const room = await database_1.prisma.room.findUnique({
            where: { code: code.toUpperCase() },
            include: {
                members: { where: { isActive: true } },
            },
        });
        if (!room) {
            throw new errorHandler_1.AppError('Room not found', 404, 'ROOM_NOT_FOUND');
        }
        if (room.status !== 'active') {
            throw new errorHandler_1.AppError('Room is no longer active', 400, 'ROOM_INACTIVE');
        }
        if (new Date() > room.expiresAt) {
            throw new errorHandler_1.AppError('Room has expired', 400, 'ROOM_EXPIRED');
        }
        if (room.members.length >= room.maxDevices) {
            throw new errorHandler_1.AppError('Room is full', 400, 'ROOM_FULL');
        }
        // Check if already a member
        const existingMember = await database_1.prisma.roomMember.findUnique({
            where: { roomId_sessionId: { roomId: room.id, sessionId } },
        });
        if (existingMember) {
            if (existingMember.isActive) {
                throw new errorHandler_1.AppError('Already a member of this room', 400, 'ALREADY_MEMBER');
            }
            // Re-activate membership
            await database_1.prisma.roomMember.update({
                where: { id: existingMember.id },
                data: { isActive: true, joinedAt: new Date() },
            });
        }
        else {
            await database_1.prisma.roomMember.create({
                data: {
                    roomId: room.id,
                    sessionId,
                    role: 'SPEAKER',
                },
            });
        }
        return this.getRoom(room.id);
    }
    /**
     * Leave a room
     */
    async leaveRoom(sessionId, roomId) {
        const member = await database_1.prisma.roomMember.findUnique({
            where: { roomId_sessionId: { roomId, sessionId } },
        });
        if (!member) {
            throw new errorHandler_1.AppError('Not a member of this room', 400, 'NOT_MEMBER');
        }
        await database_1.prisma.roomMember.update({
            where: { id: member.id },
            data: { isActive: false },
        });
        // Check if the host left
        const room = await database_1.prisma.room.findUnique({
            where: { id: roomId },
            include: {
                members: { where: { isActive: true }, orderBy: { joinedAt: 'asc' } },
            },
        });
        if (room && room.hostSessionId === sessionId) {
            if (room.members.length > 0) {
                // Transfer to the longest-active member
                const newHost = room.members[0];
                await database_1.prisma.room.update({
                    where: { id: roomId },
                    data: { hostSessionId: newHost.sessionId },
                });
                await database_1.prisma.roomMember.update({
                    where: { id: newHost.id },
                    data: { role: 'HOST' },
                });
            }
            else {
                // Close the room if no members left
                await database_1.prisma.room.update({
                    where: { id: roomId },
                    data: { status: 'closed' },
                });
            }
        }
        return { roomId, sessionId };
    }
    /**
     * Update room settings (host only)
     */
    async updateRoom(sessionId, roomId, payload) {
        const room = await database_1.prisma.room.findUnique({ where: { id: roomId } });
        if (!room) {
            throw new errorHandler_1.AppError('Room not found', 404, 'ROOM_NOT_FOUND');
        }
        if (room.hostSessionId !== sessionId) {
            throw new errorHandler_1.AppError('Only the host can update room settings', 403, 'NOT_HOST');
        }
        return database_1.prisma.room.update({
            where: { id: roomId },
            data: {
                ...(payload.name !== undefined && { name: payload.name }),
                ...(payload.isPrivate !== undefined && { isPrivate: payload.isPrivate }),
                ...(payload.maxDevices !== undefined && { maxDevices: payload.maxDevices }),
            },
            include: {
                host: { select: { id: true, displayName: true, deviceName: true } },
                members: {
                    where: { isActive: true },
                    include: { session: { select: { id: true, displayName: true, deviceName: true, connectionStatus: true } } },
                },
                playbackState: true,
            },
        });
    }
    /**
     * Transfer host role
     */
    async transferHost(currentHostId, roomId, newHostSessionId) {
        const room = await database_1.prisma.room.findUnique({ where: { id: roomId } });
        if (!room) {
            throw new errorHandler_1.AppError('Room not found', 404, 'ROOM_NOT_FOUND');
        }
        if (room.hostSessionId !== currentHostId) {
            throw new errorHandler_1.AppError('Only the host can transfer host role', 403, 'NOT_HOST');
        }
        const newHostMember = await database_1.prisma.roomMember.findUnique({
            where: { roomId_sessionId: { roomId, sessionId: newHostSessionId } },
        });
        if (!newHostMember || !newHostMember.isActive) {
            throw new errorHandler_1.AppError('Target user is not an active member', 400, 'TARGET_NOT_MEMBER');
        }
        await database_1.prisma.$transaction([
            database_1.prisma.room.update({
                where: { id: roomId },
                data: { hostSessionId: newHostSessionId },
            }),
            database_1.prisma.roomMember.updateMany({
                where: { roomId, role: 'HOST' },
                data: { role: 'SPEAKER' },
            }),
            database_1.prisma.roomMember.update({
                where: { id: newHostMember.id },
                data: { role: 'HOST' },
            }),
        ]);
        return this.getRoom(roomId);
    }
    /**
     * Close a room (host only)
     */
    async closeRoom(sessionId, roomId) {
        const room = await database_1.prisma.room.findUnique({ where: { id: roomId } });
        if (!room) {
            throw new errorHandler_1.AppError('Room not found', 404, 'ROOM_NOT_FOUND');
        }
        if (room.hostSessionId !== sessionId) {
            throw new errorHandler_1.AppError('Only the host can close the room', 403, 'NOT_HOST');
        }
        await database_1.prisma.room.update({
            where: { id: roomId },
            data: { status: 'closed' },
        });
        // Deactivate all members
        await database_1.prisma.roomMember.updateMany({
            where: { roomId },
            data: { isActive: false },
        });
        return { roomId };
    }
    /**
     * Get active members of a room
     */
    async getRoomMembers(roomId) {
        return database_1.prisma.roomMember.findMany({
            where: { roomId, isActive: true },
            include: {
                session: {
                    select: { id: true, displayName: true, deviceName: true, connectionStatus: true, platform: true },
                },
            },
            orderBy: { joinedAt: 'asc' },
        });
    }
    /**
     * Check if a session is host of a room
     */
    async isHost(sessionId, roomId) {
        const room = await database_1.prisma.room.findUnique({
            where: { id: roomId },
            select: { hostSessionId: true },
        });
        return room?.hostSessionId === sessionId;
    }
    /**
     * Check if a session is a member of a room
     */
    async isMember(sessionId, roomId) {
        const member = await database_1.prisma.roomMember.findUnique({
            where: { roomId_sessionId: { roomId, sessionId } },
        });
        return !!member && member.isActive;
    }
    /**
     * Get rooms for a session
     */
    async getSessionRooms(sessionId) {
        return database_1.prisma.room.findMany({
            where: {
                members: { some: { sessionId, isActive: true } },
                status: 'active',
            },
            include: {
                host: { select: { id: true, displayName: true, deviceName: true } },
                _count: { select: { members: { where: { isActive: true } } } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
}
exports.RoomService = RoomService;
exports.roomService = new RoomService();
