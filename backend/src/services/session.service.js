"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sessionService = exports.SessionService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../config/database");
const config_1 = require("../config");
class SessionService {
    /**
     * Create a guest session with JWT token
     */
    async createGuestSession(payload) {
        // Check if a session already exists for this device
        const existingSession = await database_1.prisma.userSession.findUnique({
            where: { deviceId: payload.deviceId },
        });
        if (existingSession) {
            // Refresh existing session
            const token = this.generateToken(existingSession.id, existingSession.deviceId);
            const tokenHash = await bcryptjs_1.default.hash(token, 10);
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + config_1.config.session.expiresInDays);
            const updated = await database_1.prisma.userSession.update({
                where: { id: existingSession.id },
                data: {
                    displayName: payload.displayName,
                    accessTokenHash: tokenHash,
                    deviceName: payload.deviceName,
                    platform: payload.platform || 'android',
                    appVersion: payload.appVersion,
                    lastSeenAt: new Date(),
                    connectionStatus: 'online',
                    expiresAt,
                },
            });
            return {
                session: {
                    id: updated.id,
                    displayName: updated.displayName,
                    deviceId: updated.deviceId,
                    deviceName: updated.deviceName,
                    platform: updated.platform,
                    expiresAt: updated.expiresAt,
                },
                token,
            };
        }
        // Create new session
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + config_1.config.session.expiresInDays);
        // We'll create the session first, then generate the token
        const session = await database_1.prisma.userSession.create({
            data: {
                displayName: payload.displayName,
                deviceId: payload.deviceId,
                deviceName: payload.deviceName,
                platform: payload.platform || 'android',
                appVersion: payload.appVersion,
                accessTokenHash: '', // Will be updated
                connectionStatus: 'online',
                expiresAt,
            },
        });
        const token = this.generateToken(session.id, session.deviceId);
        const tokenHash = await bcryptjs_1.default.hash(token, 10);
        await database_1.prisma.userSession.update({
            where: { id: session.id },
            data: { accessTokenHash: tokenHash },
        });
        return {
            session: {
                id: session.id,
                displayName: session.displayName,
                deviceId: session.deviceId,
                deviceName: session.deviceName,
                platform: session.platform,
                expiresAt: session.expiresAt,
            },
            token,
        };
    }
    /**
     * Get session by ID
     */
    async getSession(sessionId) {
        return database_1.prisma.userSession.findUnique({
            where: { id: sessionId },
            select: {
                id: true,
                displayName: true,
                deviceId: true,
                deviceName: true,
                platform: true,
                appVersion: true,
                lastSeenAt: true,
                connectionStatus: true,
                createdAt: true,
                expiresAt: true,
            },
        });
    }
    /**
     * End session
     */
    async endSession(sessionId) {
        return database_1.prisma.userSession.update({
            where: { id: sessionId },
            data: {
                connectionStatus: 'offline',
                expiresAt: new Date(),
            },
        });
    }
    /**
     * Update session display name
     */
    async updateSession(sessionId, displayName) {
        return database_1.prisma.userSession.update({
            where: { id: sessionId },
            data: { displayName },
            select: {
                id: true,
                displayName: true,
                deviceId: true,
                deviceName: true,
                platform: true,
                expiresAt: true,
            },
        });
    }
    /**
     * Mark session connection status
     */
    async updateConnectionStatus(sessionId, status) {
        return database_1.prisma.userSession.update({
            where: { id: sessionId },
            data: {
                connectionStatus: status,
                lastSeenAt: new Date(),
            },
        });
    }
    /**
     * Verify JWT token and return decoded payload
     */
    verifyToken(token) {
        return jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
    }
    /**
     * Generate JWT token
     */
    generateToken(sessionId, deviceId) {
        const payload = { sessionId, deviceId };
        return jsonwebtoken_1.default.sign(payload, config_1.config.jwt.secret, {
            expiresIn: config_1.config.jwt.expiresIn,
        });
    }
}
exports.SessionService = SessionService;
exports.sessionService = new SessionService();
