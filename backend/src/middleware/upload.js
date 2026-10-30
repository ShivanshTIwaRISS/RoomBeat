"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadAudio = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const config_1 = require("../config");
const errorHandler_1 = require("./errorHandler");
const uploadDir = config_1.config.upload.dir;
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path_1.default.extname(file.originalname);
        cb(null, `roombeat-${uniqueSuffix}${ext}`);
    },
});
const fileFilter = (_req, file, cb) => {
    const allowedMimeTypes = [
        'audio/mpeg',
        'audio/mp3',
        'audio/wav',
        'audio/x-wav',
        'audio/m4a',
        'audio/x-m4a',
        'audio/aac',
        'audio/ogg',
        'application/octet-stream', // Some Android devices upload as octet-stream
    ];
    const allowedExtensions = ['.mp3', '.wav', '.m4a', '.aac', '.ogg'];
    const ext = path_1.default.extname(file.originalname).toLowerCase();
    if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
        cb(null, true);
    }
    else {
        cb(new errorHandler_1.AppError('Only audio files (.mp3, .wav, .m4a, .aac, .ogg) are allowed', 400, 'INVALID_FILE_TYPE'));
    }
};
exports.uploadAudio = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: config_1.config.upload.maxFileSize,
    },
    fileFilter,
});
