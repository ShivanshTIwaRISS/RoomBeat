"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.refreshSessionSchema = exports.createGuestSessionSchema = void 0;
const zod_1 = require("zod");
exports.createGuestSessionSchema = zod_1.z.object({
    displayName: zod_1.z
        .string()
        .min(1, 'Display name is required')
        .max(50, 'Display name must be at most 50 characters')
        .trim(),
    deviceId: zod_1.z
        .string()
        .min(1, 'Device ID is required')
        .max(128, 'Device ID must be at most 128 characters'),
    deviceName: zod_1.z
        .string()
        .min(1, 'Device name is required')
        .max(100, 'Device name must be at most 100 characters')
        .trim(),
    platform: zod_1.z
        .enum(['android', 'ios', 'web', 'desktop'])
        .optional()
        .default('android'),
    appVersion: zod_1.z
        .string()
        .max(20, 'App version must be at most 20 characters')
        .optional(),
});
exports.refreshSessionSchema = zod_1.z.object({
    displayName: zod_1.z
        .string()
        .min(1, 'Display name is required')
        .max(50, 'Display name must be at most 50 characters')
        .trim()
        .optional(),
});
