"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rateLimiter = rateLimiter;
const config_1 = require("../config");
const response_1 = require("../utils/response");
const store = new Map();
// Clean up expired entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of store.entries()) {
        if (entry.resetAt <= now) {
            store.delete(key);
        }
    }
}, 300000);
function rateLimiter(windowMs = config_1.config.rateLimit.windowMs, maxRequests = config_1.config.rateLimit.maxRequests) {
    return (req, res, next) => {
        const key = req.ip || req.socket.remoteAddress || 'unknown';
        const now = Date.now();
        const entry = store.get(key);
        if (!entry || entry.resetAt <= now) {
            store.set(key, { count: 1, resetAt: now + windowMs });
            next();
            return;
        }
        if (entry.count >= maxRequests) {
            const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
            res.set('Retry-After', String(retryAfter));
            res.status(429).json((0, response_1.errorResponse)('Too many requests, please try again later', 'RATE_LIMIT_EXCEEDED'));
            return;
        }
        entry.count++;
        next();
    };
}
