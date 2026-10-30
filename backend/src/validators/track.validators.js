"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackIdParamSchema = exports.trackUploadSchema = void 0;
const zod_1 = require("zod");
exports.trackUploadSchema = zod_1.z.object({
    title: zod_1.z
        .string()
        .min(1, 'Track title is required')
        .max(200, 'Track title must be at most 200 characters')
        .trim(),
    artist: zod_1.z
        .string()
        .max(200, 'Artist name must be at most 200 characters')
        .trim()
        .optional()
        .default('Unknown'),
    durationMs: zod_1.z
        .string()
        .transform((val) => (val ? parseInt(val, 10) : undefined))
        .pipe(zod_1.z.number().int().positive().optional())
        .optional(),
});
exports.trackIdParamSchema = zod_1.z.object({
    trackId: zod_1.z.string().uuid('Invalid track ID'),
});
