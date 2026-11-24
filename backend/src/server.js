"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.io = exports.server = void 0;
const http_1 = __importDefault(require("http"));
const app_1 = __importDefault(require("./app"));
const config_1 = require("./config");
const sockets_1 = require("./sockets");
const database_1 = require("./config/database");
const server = http_1.default.createServer(app_1.default);
exports.server = server;
// Initialize Socket.IO
const io = (0, sockets_1.initializeSockets)(server);
exports.io = io;
// Graceful shutdown handling
const shutdown = async () => {
    console.log('\n[Server] Shutting down gracefully...');
    io.close();
    server.close(async () => {
        await database_1.prisma.$disconnect();
        console.log('[Server] Closed all connections. Exiting.');
        process.exit(0);
    });
};
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
const os_1 = __importDefault(require("os"));

server.listen(config_1.config.port, '0.0.0.0', () => {
    console.log(`===============================================`);
    console.log(`🎵 RoomBeat Backend Server running on port ${config_1.config.port}`);
    console.log(`🌍 Environment: ${config_1.config.nodeEnv}`);
    console.log(`📡 Local API:  http://localhost:${config_1.config.port}/api/v1`);
    try {
        const ifaces = os_1.default.networkInterfaces();
        for (const name of Object.keys(ifaces)) {
            for (const iface of ifaces[name] || []) {
                if (iface.family === 'IPv4' && !iface.internal) {
                    console.log(`📱 Phone Access: http://${iface.address}:${config_1.config.port}`);
                }
            }
        }
    } catch(e) {}
    console.log(`⚡ WebSocket ready on port ${config_1.config.port}`);
    console.log(`===============================================`);
});
