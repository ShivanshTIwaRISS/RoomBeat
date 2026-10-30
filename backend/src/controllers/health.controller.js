"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHealth = void 0;
const database_1 = require("../config/database");
const response_1 = require("../utils/response");
const getHealth = async (_req, res) => {
    try {
        // Check DB connection
        await database_1.prisma.$queryRaw `SELECT 1`;
        return (0, response_1.sendSuccess)(res, {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptimeSeconds: process.uptime(),
            database: 'connected',
        }, 'RoomBeat API is running');
    }
    catch (err) {
        return (0, response_1.sendError)(res, 'Database connection error', 'DB_ERROR', 503, err);
    }
};
exports.getHealth = getHealth;
