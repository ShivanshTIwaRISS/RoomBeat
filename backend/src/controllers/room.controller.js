"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.closeRoom = exports.transferHost = exports.updateRoomSettings = exports.getRoomDevices = exports.leaveRoom = exports.joinRoom = exports.getRoomByCode = exports.getRoom = exports.createRoom = void 0;
const room_service_1 = require("../services/room.service");
const response_1 = require("../utils/response");
const createRoom = async (req, res) => {
    try {
        if (!req.session)
            return (0, response_1.sendError)(res, 'Unauthorized', 'UNAUTHORIZED', 401);
        const room = await room_service_1.roomService.createRoom(req.session.id, req.body);
        return (0, response_1.sendSuccess)(res, room, 'Room created successfully', 201);
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'ROOM_ERROR', err.statusCode || 500);
    }
};
exports.createRoom = createRoom;
const getRoom = async (req, res) => {
    try {
        const room = await room_service_1.roomService.getRoom(req.params.roomId);
        return (0, response_1.sendSuccess)(res, room, 'Room retrieved successfully');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'ROOM_ERROR', err.statusCode || 500);
    }
};
exports.getRoom = getRoom;
const getRoomByCode = async (req, res) => {
    try {
        const room = await room_service_1.roomService.getRoomByCode(req.params.code);
        return (0, response_1.sendSuccess)(res, room, 'Room preview retrieved successfully');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'ROOM_ERROR', err.statusCode || 500);
    }
};
exports.getRoomByCode = getRoomByCode;
const joinRoom = async (req, res) => {
    try {
        if (!req.session)
            return (0, response_1.sendError)(res, 'Unauthorized', 'UNAUTHORIZED', 401);
        const result = await room_service_1.roomService.joinRoom(req.session.id, req.body.code);
        return (0, response_1.sendSuccess)(res, result, 'Joined room successfully');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'ROOM_ERROR', err.statusCode || 500);
    }
};
exports.joinRoom = joinRoom;
const leaveRoom = async (req, res) => {
    try {
        if (!req.session)
            return (0, response_1.sendError)(res, 'Unauthorized', 'UNAUTHORIZED', 401);
        const result = await room_service_1.roomService.leaveRoom(req.session.id, req.params.roomId);
        return (0, response_1.sendSuccess)(res, result, 'Left room successfully');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'ROOM_ERROR', err.statusCode || 500);
    }
};
exports.leaveRoom = leaveRoom;
const getRoomDevices = async (req, res) => {
    try {
        const members = await room_service_1.roomService.getRoomMembers(req.params.roomId);
        return (0, response_1.sendSuccess)(res, members, 'Room devices retrieved successfully');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'ROOM_ERROR', err.statusCode || 500);
    }
};
exports.getRoomDevices = getRoomDevices;
const updateRoomSettings = async (req, res) => {
    try {
        if (!req.session)
            return (0, response_1.sendError)(res, 'Unauthorized', 'UNAUTHORIZED', 401);
        const updated = await room_service_1.roomService.updateRoom(req.session.id, req.params.roomId, req.body);
        return (0, response_1.sendSuccess)(res, updated, 'Room settings updated successfully');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'ROOM_ERROR', err.statusCode || 500);
    }
};
exports.updateRoomSettings = updateRoomSettings;
const transferHost = async (req, res) => {
    try {
        if (!req.session)
            return (0, response_1.sendError)(res, 'Unauthorized', 'UNAUTHORIZED', 401);
        const result = await room_service_1.roomService.transferHost(req.session.id, req.params.roomId, req.body.newHostSessionId);
        return (0, response_1.sendSuccess)(res, result, 'Host transferred successfully');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'ROOM_ERROR', err.statusCode || 500);
    }
};
exports.transferHost = transferHost;
const closeRoom = async (req, res) => {
    try {
        if (!req.session)
            return (0, response_1.sendError)(res, 'Unauthorized', 'UNAUTHORIZED', 401);
        const result = await room_service_1.roomService.closeRoom(req.session.id, req.params.roomId);
        return (0, response_1.sendSuccess)(res, result, 'Room closed successfully');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'ROOM_ERROR', err.statusCode || 500);
    }
};
exports.closeRoom = closeRoom;
