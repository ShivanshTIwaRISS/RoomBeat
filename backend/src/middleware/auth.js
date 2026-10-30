"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
async function authenticate(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json((0, response_1.errorResponse)('Authentication required', 'AUTH_REQUIRED'));
            return;
        }
        const token = authHeader.substring(7);
        let decoded;
        try {
            decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
        }
        catch {
            res.status(401).json((0, response_1.errorResponse)('Invalid or expired token', 'INVALID_TOKEN'));
            return;
        }
        const session = await database_1.prisma.userSession.findUnique({
            where: { id: decoded.sessionId },
            select: {
                id: true,
                displayName: true,
                deviceId: true,
                deviceName: true,
                platform: true,
                expiresAt: true,
            },
        });
        if (!session) {
            res.status(401).json((0, response_1.errorResponse)('Session not found', 'SESSION_NOT_FOUND'));
            return;
        }
        if (new Date() > session.expiresAt) {
            res.status(401).json((0, response_1.errorResponse)('Session expired', 'SESSION_EXPIRED'));
            return;
        }
        // Update last seen
        await database_1.prisma.userSession.update({
            where: { id: session.id },
            data: { lastSeenAt: new Date() },
        });
        req.session = {
            id: session.id,
            displayName: session.displayName,
            deviceId: session.deviceId,
            deviceName: session.deviceName,
            platform: session.platform,
        };
        next();
    }
    catch (error) {
        next(error);
    }
}
