"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transferHostSchema = exports.roomIdParamSchema = exports.updateRoomSchema = exports.joinRoomSchema = exports.createRoomSchema = void 0;
const zod_1 = require("zod");
exports.createRoomSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(1, 'Room name is required')
        .max(100, 'Room name must be at most 100 characters')
        .trim(),
    isPrivate: zod_1.z.boolean().optional().default(false),
    maxDevices: zod_1.z
        .number()
        .int()
        .min(2, 'Max devices must be at least 2')
        .max(50, 'Max devices must be at most 50')
        .optional()
        .default(10),
});
exports.joinRoomSchema = zod_1.z.object({
    code: zod_1.z
        .string()
        .length(6, 'Room code must be exactly 6 characters')
        .toUpperCase(),
});
exports.updateRoomSchema = zod_1.z.object({
    name: zod_1.z
        .string()
        .min(1, 'Room name is required')
        .max(100, 'Room name must be at most 100 characters')
        .trim()
        .optional(),
    isPrivate: zod_1.z.boolean().optional(),
    maxDevices: zod_1.z
        .number()
        .int()
        .min(2, 'Max devices must be at least 2')
        .max(50, 'Max devices must be at most 50')
        .optional(),
});
exports.roomIdParamSchema = zod_1.z.object({
    roomId: zod_1.z.string().uuid('Invalid room ID'),
});
exports.transferHostSchema = zod_1.z.object({
    newHostSessionId: zod_1.z.string().uuid('Invalid session ID'),
});
