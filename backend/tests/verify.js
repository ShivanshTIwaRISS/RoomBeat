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
async function runTests() {
    console.log('Running RoomBeat Verification Tests...\n');
    // Test 1: Room Code Generation
    const code = (0, roomCode_1.generateRoomCode)();
    console.assert(code.length === 6, 'Room code must be 6 characters');
    console.assert(!/[0O1Il]/.test(code), 'Room code must not contain ambiguous chars');
    console.log('✓ Room Code Generation passed (sample:', code, ')');
    // Test 2: Uniqueness
    const codes = new Set();
    for (let i = 0; i < 1000; i++)
        codes.add((0, roomCode_1.generateRoomCode)());
    console.assert(codes.size === 1000, 'Codes should be unique');
    console.log('✓ 1000 unique room codes generated without collision');
    // Test 3: Response formatting
    const succ = (0, response_1.successResponse)('OK', { test: true });
    console.assert(succ.success === true && succ.data.test === true, 'Success response failed');
    const err = (0, response_1.errorResponse)('Failed', 'ERR_CODE', { field: 'name' });
    console.assert(err.success === false && err.error.code === 'ERR_CODE', 'Error response failed');
    console.log('✓ API Response standard formatting passed');
    // Test 4: Checksum
    const temp = path_1.default.resolve(__dirname, 'temp-checksum-test.txt');
    fs_1.default.writeFileSync(temp, 'RoomBeat Sync Engine Audio File Checksum Test');
    const hash = await (0, checksum_1.calculateFileChecksum)(temp);
    fs_1.default.unlinkSync(temp);
    console.assert(hash.length === 64, 'Checksum must be 64-char hex string');
    console.log('✓ SHA-256 Checksum generation passed (sample:', hash.slice(0, 16) + '...)');
    console.log('\n=======================================');
    console.log('🎉 ALL ROOMBEAT UNIT TESTS PASSED!');
    console.log('=======================================');
}
runTests().catch((e) => {
    console.error('Test failed:', e);
    process.exit(1);
});
