"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.syncService = exports.SyncService = void 0;
const database_1 = require("../config/database");
class SyncService {
    /**
     * Record a sync diagnostic report from a device
     */
    async submitReport(sessionId, payload) {
        const report = await database_1.prisma.syncReport.create({
            data: {
                roomId: payload.roomId,
                sessionId,
                clockOffsetMs: payload.clockOffsetMs,
                roundTripTimeMs: payload.roundTripTimeMs,
                playbackDriftMs: payload.playbackDriftMs ?? null,
                positionMs: payload.positionMs ?? null,
            },
            include: {
                session: {
                    select: {
                        id: true,
                        displayName: true,
                        deviceName: true,
                        platform: true,
                    },
                },
            },
        });
        return report;
    }
    /**
     * Get latest sync reports for a room (per device)
     */
    async getRoomReports(roomId) {
        const members = await database_1.prisma.roomMember.findMany({
            where: { roomId, isActive: true },
            include: {
                session: {
                    select: {
                        id: true,
                        displayName: true,
                        deviceName: true,
                        platform: true,
                        connectionStatus: true,
                        lastSeenAt: true,
                        deviceSettings: true,
                    },
                },
            },
        });
        // Get the most recent report for each session
        const deviceReports = await Promise.all(members.map(async (m) => {
            const latestReport = await database_1.prisma.syncReport.findFirst({
                where: { roomId, sessionId: m.sessionId },
                orderBy: { recordedAt: 'desc' },
            });
            return {
                session: m.session,
                role: m.role,
                joinedAt: m.joinedAt,
                latestReport,
            };
        }));
        return deviceReports;
    }
    /**
     * Update device settings (local volume, latency compensation)
     */
    async updateDeviceSettings(sessionId, settings) {
        const updated = await database_1.prisma.deviceSettings.upsert({
            where: { sessionId },
            update: {
                ...(settings.localVolume !== undefined && { localVolume: settings.localVolume }),
                ...(settings.latencyCompensationMs !== undefined && { latencyCompensationMs: settings.latencyCompensationMs }),
            },
            create: {
                sessionId,
                localVolume: settings.localVolume ?? 1.0,
                latencyCompensationMs: settings.latencyCompensationMs ?? 0,
            },
        });
        return updated;
    }
}
exports.SyncService = SyncService;
exports.syncService = new SyncService();
