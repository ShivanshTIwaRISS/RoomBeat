"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateDeviceSettings = exports.getRoomSyncReports = exports.submitSyncReport = void 0;
const sync_service_1 = require("../services/sync.service");
const response_1 = require("../utils/response");
const submitSyncReport = async (req, res) => {
    try {
        if (!req.session)
            return (0, response_1.sendError)(res, 'Unauthorized', 'UNAUTHORIZED', 401);
        const report = await sync_service_1.syncService.submitReport(req.session.id, {
            ...req.body,
            roomId: req.params.roomId,
        });
        return (0, response_1.sendSuccess)(res, report, 'Sync report recorded', 201);
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'SYNC_ERROR', err.statusCode || 500);
    }
};
exports.submitSyncReport = submitSyncReport;
const getRoomSyncReports = async (req, res) => {
    try {
        const reports = await sync_service_1.syncService.getRoomReports(req.params.roomId);
        return (0, response_1.sendSuccess)(res, reports, 'Room sync reports retrieved');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'SYNC_ERROR', err.statusCode || 500);
    }
};
exports.getRoomSyncReports = getRoomSyncReports;
const updateDeviceSettings = async (req, res) => {
    try {
        if (!req.session)
            return (0, response_1.sendError)(res, 'Unauthorized', 'UNAUTHORIZED', 401);
        const targetSessionId = req.params.deviceId || req.session.id;
        const settings = await sync_service_1.syncService.updateDeviceSettings(targetSessionId, req.body);
        return (0, response_1.sendSuccess)(res, settings, 'Device settings updated');
    }
    catch (err) {
        return (0, response_1.sendError)(res, err.message, err.code || 'SYNC_ERROR', err.statusCode || 500);
    }
};
exports.updateDeviceSettings = updateDeviceSettings;
