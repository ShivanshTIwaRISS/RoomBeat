"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerDeviceHandlers = void 0;
const database_1 = require("../../config/database");
const sync_service_1 = require("../../services/sync.service");
const registerDeviceHandlers = (io, socket) => {
    const session = socket.session;
    /**
     * Device has downloaded, checksummed, and prepared the track
     */
    socket.on('device:ready', async (data) => {
        if (!session)
            return;
        io.to(data.roomId).emit('room:device:updated', {
            sessionId: session.id,
            displayName: session.displayName,
            status: 'ready',
        });
    });
    /**
     * Device heartbeat to keep connection alive and update status
     */
    socket.on('device:heartbeat', async (data) => {
        if (!session)
            return;
        await database_1.prisma.userSession.update({
            where: { id: session.id },
            data: {
                lastSeenAt: new Date(),
                connectionStatus: 'online',
            },
        }).catch(() => { });
        socket.to(data.roomId).emit('room:device:updated', {
            sessionId: session.id,
            displayName: session.displayName,
            status: 'online',
            lastSeenAt: new Date().toISOString(),
            batteryLevel: data.batteryLevel,
            volume: data.volume,
        });
    });
    /**
     * Device playback position diagnostics report
     */
    socket.on('device:playback:report', async (data) => {
        if (!session)
            return;
        if (data.clockOffsetMs !== undefined && data.roundTripTimeMs !== undefined) {
            await sync_service_1.syncService.submitReport(session.id, {
                roomId: data.roomId,
                clockOffsetMs: data.clockOffsetMs,
                roundTripTimeMs: data.roundTripTimeMs,
                playbackDriftMs: data.playbackDriftMs,
                positionMs: data.positionMs,
            }).catch(() => { });
        }
        // Broadcast to room host / devices for sync monitoring
        socket.to(data.roomId).emit('sync:updated', {
            sessionId: session.id,
            displayName: session.displayName,
            positionMs: data.positionMs,
            clockOffsetMs: data.clockOffsetMs,
            playbackDriftMs: data.playbackDriftMs,
            timestamp: Date.now(),
        });
    });
};
exports.registerDeviceHandlers = registerDeviceHandlers;
