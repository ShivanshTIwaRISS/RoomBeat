"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const roomCode_1 = require("../src/utils/roomCode");
const response_1 = require("../src/utils/response");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const checksum_1 = require("../src/utils/checksum");
describe('RoomBeat Backend Core Utilities', () => {
    describe('Room Code Generation', () => {
        it('should generate a 6-character alphanumeric code', () => {
            const code = (0, roomCode_1.generateRoomCode)();
            expect(code).toBeDefined();
            expect(code.length).toBe(6);
        });
        it('should avoid confusing characters (0, O, 1, I)', () => {
            for (let i = 0; i < 50; i++) {
                const code = (0, roomCode_1.generateRoomCode)();
                expect(code).not.toMatch(/[0O1Il]/);
            }
        });
        it('should generate unique codes across multiple invocations', () => {
            const codes = new Set();
            for (let i = 0; i < 100; i++) {
                codes.add((0, roomCode_1.generateRoomCode)());
            }
            expect(codes.size).toBe(100);
        });
    });
    describe('Response Helpers', () => {
        it('should format successful responses correctly', () => {
            const res = (0, response_1.successResponse)('Track added', { id: '123' });
            expect(res.success).toBe(true);
            expect(res.message).toBe('Track added');
            expect(res.data).toEqual({ id: '123' });
        });
        it('should format error responses with code and details', () => {
            const err = (0, response_1.errorResponse)('Invalid room code', 'ROOM_NOT_FOUND', { code: 'ABC' });
            expect(err.success).toBe(false);
            expect(err.message).toBe('Invalid room code');
            expect(err.error?.code).toBe('ROOM_NOT_FOUND');
            expect(err.error?.details).toEqual({ code: 'ABC' });
        });
    });
    describe('File Checksum Calculator', () => {
        const tempFile = path_1.default.resolve(__dirname, 'test-temp.txt');
        beforeAll(() => {
            fs_1.default.writeFileSync(tempFile, 'RoomBeat Synchronized Audio Test');
        });
        afterAll(() => {
            if (fs_1.default.existsSync(tempFile)) {
                fs_1.default.unlinkSync(tempFile);
            }
        });
        it('should compute valid SHA-256 hash', async () => {
            const hash = await (0, checksum_1.calculateFileChecksum)(tempFile);
            expect(hash).toBeDefined();
            expect(hash.length).toBe(64); // SHA-256 is 64 hex characters
        });
    });
});
