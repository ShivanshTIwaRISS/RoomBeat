"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const compression_1 = __importDefault(require("compression"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const routes_1 = __importDefault(require("./routes"));
const errorHandler_1 = require("./middleware/errorHandler");
const app = (0, express_1.default)();
// Security and utility middleware
app.use((0, helmet_1.default)({
    contentSecurityPolicy: false, // Allow web client scripts & audio context
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Allow audio streaming cross-origin
}));
app.use((0, cors_1.default)({
    origin: config_1.config.cors.origin,
    credentials: true,
}));
app.use((0, compression_1.default)());
app.use((0, morgan_1.default)(config_1.config.nodeEnv === 'development' ? 'dev' : 'combined'));
app.use(express_1.default.json({ limit: '10mb' }));
app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
// Serve web client and uploads
app.use(express_1.default.static(path_1.default.resolve(__dirname, '../public'), {
    setHeaders: (res) => {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
}));
app.use('/uploads', express_1.default.static(path_1.default.resolve(config_1.config.upload.dir)));
// API v1 Routes
app.use('/api/v1', routes_1.default);
// 404 handler
app.use((_req, res) => {
    res.status(404).json({
        success: false,
        message: 'API route not found',
        error: { code: 'NOT_FOUND' },
    });
});
// Global error handler
app.use(errorHandler_1.errorHandler);
exports.default = app;
