"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeSockets = void 0;
const socket_io_1 = require("socket.io");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const config_1 = require("../config");
const database_1 = require("../config/database");
const clock_handler_1 = require("./handlers/clock.handler");
const room_handler_1 = require("./handlers/room.handler");
const playback_handler_1 = require("./handlers/playback.handler");
const queue_handler_1 = require("./handlers/queue.handler");
const device_handler_1 = require("./handlers/device.handler");
const initializeSockets = (httpServer) => {
    const io = new socket_io_1.Server(httpServer, {
        cors: {
            origin: config_1.config.cors.origin,
            methods: ['GET', 'POST'],
            credentials: true,
        },
        transports: ['websocket', 'polling'],
        pingTimeout: 10000,
        pingInterval: 5000,
    });
    // Socket authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '');
            if (!token) {
                return next(new Error('Authentication token required'));
            }
            const decoded = jsonwebtoken_1.default.verify(token, config_1.config.jwt.secret);
            const session = await database_1.prisma.userSession.findUnique({
                where: { id: decoded.sessionId },
                select: {
                    id: true,
                    displayName: true,
                    deviceId: true,
                    deviceName: true,
                    platform: true,
                },
            });
            if (!session) {
                return next(new Error('Session not found'));
            }
            socket.session = session;
            next();
        }
        catch (err) {
            next(new Error('Invalid authentication token'));
        }
    });
    io.on('connection', (socket) => {
        const session = socket.session;
        console.log(`[Socket] Device connected: ${session?.displayName} (${session?.deviceId}) [socket: ${socket.id}]`);
        // Register all domain handlers
        (0, clock_handler_1.registerClockHandlers)(socket);
        (0, room_handler_1.registerRoomHandlers)(io, socket);
        (0, playback_handler_1.registerPlaybackHandlers)(io, socket);
        (0, queue_handler_1.registerQueueHandlers)(io, socket);
        (0, device_handler_1.registerDeviceHandlers)(io, socket);
        socket.on('disconnect', (reason) => {
            console.log(`[Socket] Device disconnected: ${session?.displayName} [reason: ${reason}]`);
        });
    });
    return io;
};
exports.initializeSockets = initializeSockets;
