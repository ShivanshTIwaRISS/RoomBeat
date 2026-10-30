"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seekPlaybackSchema = exports.playPlaybackSchema = exports.preparePlaybackSchema = void 0;
const zod_1 = require("zod");
exports.preparePlaybackSchema = zod_1.z.object({
    trackId: zod_1.z.string().uuid('Invalid track ID'),
});
exports.playPlaybackSchema = zod_1.z.object({
    delayMs: zod_1.z
        .number()
        .int()
        .min(0, 'Delay must be non-negative')
        .max(10000, 'Delay must be at most 10 seconds')
        .optional()
        .default(3000),
});
exports.seekPlaybackSchema = zod_1.z.object({
    positionMs: zod_1.z
        .number()
        .int()
        .min(0, 'Position must be non-negative'),
});
