"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reorderQueueSchema = exports.removeFromQueueSchema = exports.addToQueueSchema = void 0;
const zod_1 = require("zod");
exports.addToQueueSchema = zod_1.z.object({
    trackId: zod_1.z.string().uuid('Invalid track ID'),
});
exports.removeFromQueueSchema = zod_1.z.object({
    itemId: zod_1.z.string().uuid('Invalid queue item ID'),
});
exports.reorderQueueSchema = zod_1.z.object({
    itemId: zod_1.z.string().uuid('Invalid queue item ID'),
    newPosition: zod_1.z
        .number()
        .int()
        .min(0, 'Position must be non-negative'),
});
