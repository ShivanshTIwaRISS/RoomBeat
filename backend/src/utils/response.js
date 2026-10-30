"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.successResponse = successResponse;
exports.errorResponse = errorResponse;
exports.sendSuccess = sendSuccess;
exports.sendError = sendError;
function successResponse(message, data) {
    return {
        success: true,
        message,
        ...(data !== undefined && { data }),
    };
}
function errorResponse(message, code, details) {
    return {
        success: false,
        message,
        error: {
            code,
            ...(details !== undefined && { details }),
        },
    };
}
function sendSuccess(res, data, message = 'Operation completed', statusCode = 200) {
    return res.status(statusCode).json(successResponse(message, data));
}
function sendError(res, message = 'Something went wrong', code = 'INTERNAL_ERROR', statusCode = 500, details) {
    return res.status(statusCode).json(errorResponse(message, code, details));
}
