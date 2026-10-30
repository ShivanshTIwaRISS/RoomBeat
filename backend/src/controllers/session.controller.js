"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endSession = exports.updateDisplayName = exports.getCurrentSession = exports.createGuestSession = void 0;
const session_service_1 = require("../services/session.service");
const response_1 = require("../utils/response");
const createGuestSession = async (req, res) => {
    try {
        const result = await session_service_1.sessionService.createGuestSession(req.body);
        return (0, response_1.sendSuccess)(res, result, 'Guest session created successfully', 201);
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message || 'Failed to create guest session', err.code || 'SESSION_ERROR', err.statusCode || 500);
    }
};
exports.createGuestSession = createGuestSession;
const getCurrentSession = async (req, res) => {
    try {
        if (!req.session) {
            return (0, response_1.sendError)(res, 'Unauthorized', 'UNAUTHORIZED', 401);
        }
        const session = await session_service_1.sessionService.getSession(req.session.id);
        return (0, response_1.sendSuccess)(res, session, 'Session retrieved successfully');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message || 'Failed to get session', err.code || 'SESSION_ERROR', err.statusCode || 500);
    }
};
exports.getCurrentSession = getCurrentSession;
const updateDisplayName = async (req, res) => {
    try {
        if (!req.session) {
            return (0, response_1.sendError)(res, 'Unauthorized', 'UNAUTHORIZED', 401);
        }
        const { displayName } = req.body;
        if (!displayName || typeof displayName !== 'string' || displayName.trim().length < 1) {
            return (0, response_1.sendError)(res, 'displayName is required', 'VALIDATION_ERROR', 400);
        }
        const session = await session_service_1.sessionService.updateSession(req.session.id, displayName.trim().slice(0, 30));
        return (0, response_1.sendSuccess)(res, session, 'Display name updated successfully');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message || 'Failed to update display name', err.code || 'SESSION_ERROR', err.statusCode || 500);
    }
};
exports.updateDisplayName = updateDisplayName;
const endSession = async (req, res) => {
    try {
        if (!req.session) {
            return (0, response_1.sendError)(res, 'Unauthorized', 'UNAUTHORIZED', 401);
        }
        await session_service_1.sessionService.endSession(req.session.id);
        return (0, response_1.sendSuccess)(res, null, 'Session ended successfully');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message || 'Failed to end session', err.code || 'SESSION_ERROR', err.statusCode || 500);
    }
};
exports.endSession = endSession;

