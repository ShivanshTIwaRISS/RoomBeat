"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSyncReportsQuerySchema = exports.submitSyncReportSchema = void 0;
const zod_1 = require("zod");
exports.submitSyncReportSchema = zod_1.z.object({
    roomId: zod_1.z.string().uuid('Invalid room ID'),
    clockOffsetMs: zod_1.z.number(),
    roundTripTimeMs: zod_1.z.number().min(0, 'Round trip time must be non-negative'),
    playbackDriftMs: zod_1.z.number().optional(),
    positionMs: zod_1.z.number().int().min(0).optional(),
});
exports.getSyncReportsQuerySchema = zod_1.z.object({
    limit: zod_1.z
        .string()
        .transform((val) => parseInt(val, 10))
        .pipe(zod_1.z.number().int().min(1).max(100))
        .optional()
        .default('20'),
});
