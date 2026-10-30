"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerRoomHandlers = void 0;
const database_1 = require("../../config/database");
const room_service_1 = require("../../services/room.service");
// In-memory host disconnect grace period timer tracker: roomId -> NodeJS.Timeout
const hostDisconnectTimers = new Map();
const registerRoomHandlers = (io, socket) => {
    const session = socket.session;
    socket.on('room:join', async (data) => {
        if (!session)
            return;
        try {
            const room = await database_1.prisma.room.findUnique({
                where: { id: data.roomId },
                include: {
                    members: {
                        where: { isActive: true },
                        include: { session: { select: { id: true, displayName: true, deviceName: true, connectionStatus: true } } },
                    },
                    playbackState: true,
                },
            });
            if (!room) {
                socket.emit('server:error', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
                return;
            }
            // Cancel host disconnect grace timer if host reconnected
            if (room.hostSessionId === session.id && hostDisconnectTimers.has(room.id)) {
                clearTimeout(hostDisconnectTimers.get(room.id));
                hostDisconnectTimers.delete(room.id);
            }
            socket.join(room.id);
            // Notify others in room
            io.to(room.id).emit('room:device:joined', {
                sessionId: session.id,
                displayName: session.displayName,
                deviceName: session.deviceName,
                role: room.hostSessionId === session.id ? 'HOST' : 'SPEAKER',
                memberCount: room.members.length,
            });
            // Send initial state to the joined client
            socket.emit('room:joined', {
                room: {
                    id: room.id,
                    name: room.name,
                    code: room.code,
                    isPrivate: room.isPrivate,
                    maxDevices: room.maxDevices,
                    hostSessionId: room.hostSessionId,
                },
                members: room.members,
                playbackState: room.playbackState ? {
                    ...room.playbackState,
                    serverStartAt: room.playbackState.serverStartAt?.toString() ?? null,
                } : null,
            });
        }
        catch (err) {
            socket.emit('server:error', { code: 'JOIN_ERROR', message: err.message });
        }
    });
    socket.on('room:leave', async (data) => {
        if (!session)
            return;
        try {
            socket.leave(data.roomId);
            await room_service_1.roomService.leaveRoom(session.id, data.roomId);
            io.to(data.roomId).emit('room:device:left', {
                sessionId: session.id,
                displayName: session.displayName,
            });
        }
        catch (err) {
            socket.emit('server:error', { code: 'LEAVE_ERROR', message: err.message });
        }
    });
    socket.on('disconnect', async () => {
        if (!session)
            return;
        // Find active rooms this session belongs to
        const memberRooms = await database_1.prisma.roomMember.findMany({
            where: { sessionId: session.id, isActive: true },
            include: { room: true },
        });
        for (const member of memberRooms) {
            const room = member.room;
            io.to(room.id).emit('room:device:updated', {
                sessionId: session.id,
                status: 'disconnected',
            });
            if (room.hostSessionId === session.id) {
                // Start 30s grace period for host before transferring or closing
                const timer = setTimeout(async () => {
                    try {
                        // Find another active member to transfer host to
                        const otherMembers = await database_1.prisma.roomMember.findMany({
                            where: { roomId: room.id, isActive: true, NOT: { sessionId: session.id } },
                            orderBy: { joinedAt: 'asc' },
                        });
                        if (otherMembers.length > 0) {
                            const newHost = otherMembers[0];
                            await room_service_1.roomService.transferHost(session.id, room.id, newHost.sessionId);
                            io.to(room.id).emit('room:host_changed', {
                                roomId: room.id,
                                newHostId: newHost.sessionId,
                            });
                        }
                        else {
                            // Close room if empty
                            await database_1.prisma.room.update({
                                where: { id: room.id },
                                data: { status: 'closed' },
                            });
                            io.to(room.id).emit('room:closed', {
                                roomId: room.id,
                                reason: 'Host disconnected and room is empty',
                            });
                        }
                    }
                    catch (e) {
                        console.error('Error handling host disconnect grace expiry:', e);
                    }
                    finally {
                        hostDisconnectTimers.delete(room.id);
                    }
                }, 30000);
                hostDisconnectTimers.set(room.id, timer);
            }
        }
    });
};
exports.registerRoomHandlers = registerRoomHandlers;
