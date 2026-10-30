"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
const zod_1 = require("zod");
const response_1 = require("../utils/response");
function validate(schema, target = 'body') {
    return (req, res, next) => {
        try {
            const data = schema.parse(req[target]);
            req[target] = data;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const details = error.errors.map((err) => ({
                    field: err.path.join('.'),
                    message: err.message,
                }));
                res.status(400).json((0, response_1.errorResponse)('Validation failed', 'VALIDATION_ERROR', details));
                return;
            }
            next(error);
        }
    };
}
