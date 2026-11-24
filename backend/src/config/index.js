"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config();
exports.config = {
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',
    isDev: process.env.NODE_ENV !== 'production',
    database: {
        url: process.env.DATABASE_URL || 'file:./dev.db',
    },
    jwt: {
        secret: process.env.JWT_SECRET || 'roombeat_dev_jwt_secret_change_in_production',
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
    upload: {
        dir: path_1.default.resolve(process.env.UPLOAD_DIR || './uploads'),
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '52428800', 10), // 50MB
        allowedMimeTypes: [
            'audio/mpeg',
            'audio/mp3',
            'audio/wav',
            'audio/wave',
            'audio/x-wav',
            'audio/ogg',
            'audio/flac',
            'audio/aac',
            'audio/mp4',
            'audio/x-m4a',
            'audio/webm',
        ],
    },
    cors: {
        origin: process.env.CORS_ORIGIN || '*',
    },
    room: {
        defaultMaxDevices: 10,
        codeLength: 6,
        expiresInHours: 24,
    },
    session: {
        expiresInDays: 7,
    },
    playback: {
        defaultDelayMs: 3000,
    },
    heartbeat: {
        intervalMs: 5000,
        timeoutMs: 15000,
    },
    hostDisconnect: {
        gracePeriodMs: 30000,
    },
    rateLimit: {
        windowMs: 60000, // 1 minute
        maxRequests: 100,
    },
};
