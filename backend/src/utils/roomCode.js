"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRoomCode = generateRoomCode;
const nanoid_1 = require("nanoid");
// Exclude confusing characters: 0/O, 1/I/l
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const generate = (0, nanoid_1.customAlphabet)(ALPHABET, 6);
function generateRoomCode() {
    return generate();
}
