"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clearQueue = exports.removeFromQueue = exports.reorderQueue = exports.addToQueue = exports.getQueue = void 0;
const queue_service_1 = require("../services/queue.service");
const response_1 = require("../utils/response");
const getQueue = async (req, res) => {
    try {
        const queue = await queue_service_1.queueService.getQueue(req.params.roomId);
        return (0, response_1.sendSuccess)(res, queue, 'Queue retrieved successfully');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'QUEUE_ERROR', err.statusCode || 500);
    }
};
exports.getQueue = getQueue;
const addToQueue = async (req, res) => {
    try {
        if (!req.session)
            return (0, response_1.sendError)(res, 'Unauthorized', 'UNAUTHORIZED', 401);
        const item = await queue_service_1.queueService.addToQueue(req.params.roomId, req.body.trackId, req.session.id);
        return (0, response_1.sendSuccess)(res, item, 'Track added to queue', 201);
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'QUEUE_ERROR', err.statusCode || 500);
    }
};
exports.addToQueue = addToQueue;
const reorderQueue = async (req, res) => {
    try {
        if (!req.session)
            return (0, response_1.sendError)(res, 'Unauthorized', 'UNAUTHORIZED', 401);
        const updated = await queue_service_1.queueService.reorderQueue(req.params.roomId, req.body.itemId, req.body.newPosition, req.session.id);
        return (0, response_1.sendSuccess)(res, updated, 'Queue reordered successfully');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'QUEUE_ERROR', err.statusCode || 500);
    }
};
exports.reorderQueue = reorderQueue;
const removeFromQueue = async (req, res) => {
    try {
        if (!req.session)
            return (0, response_1.sendError)(res, 'Unauthorized', 'UNAUTHORIZED', 401);
        const updated = await queue_service_1.queueService.removeFromQueue(req.params.roomId, req.params.itemId, req.session.id);
        return (0, response_1.sendSuccess)(res, updated, 'Item removed from queue');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'QUEUE_ERROR', err.statusCode || 500);
    }
};
exports.removeFromQueue = removeFromQueue;
const clearQueue = async (req, res) => {
    try {
        if (!req.session)
            return (0, response_1.sendError)(res, 'Unauthorized', 'UNAUTHORIZED', 401);
        const result = await queue_service_1.queueService.clearQueue(req.params.roomId, req.session.id);
        return (0, response_1.sendSuccess)(res, result, 'Queue cleared successfully');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'QUEUE_ERROR', err.statusCode || 500);
    }
};
exports.clearQueue = clearQueue;
