"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
exports.errorHandler = errorHandler;
exports.notFoundHandler = notFoundHandler;
class AppError extends Error {
    statusCode;
    code;
    constructor(message, statusCode, code) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.name = 'AppError';
    }
}
exports.AppError = AppError;
function errorHandler(err, _req, res, _next) {
    console.error('Error:', err);
    if (err instanceof AppError) {
        const response = {
            success: false,
            message: err.message,
            error: { code: err.code },
        };
        res.status(err.statusCode).json(response);
        return;
    }
    // Multer errors
    if (err.name === 'MulterError') {
        const multerErr = err;
        let message = 'File upload error';
        let statusCode = 400;
        if (multerErr.code === 'LIMIT_FILE_SIZE') {
            message = 'File size exceeds the maximum allowed limit';
        }
        else if (multerErr.code === 'LIMIT_UNEXPECTED_FILE') {
            message = 'Unexpected file field';
        }
        const response = {
            success: false,
            message,
            error: { code: `MULTER_${multerErr.code}` },
        };
        res.status(statusCode).json(response);
        return;
    }
    // Default 500 error
    const response = {
        success: false,
        message: process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message || 'Internal server error',
        error: { code: 'INTERNAL_ERROR' },
    };
    res.status(500).json(response);
}
function notFoundHandler(req, res) {
    const response = {
        success: false,
        message: `Route ${req.method} ${req.path} not found`,
        error: { code: 'NOT_FOUND' },
    };
    res.status(404).json(response);
}
