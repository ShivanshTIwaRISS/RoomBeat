"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const track_controller_1 = require("../controllers/track.controller");
const auth_1 = require("../middleware/auth");
const upload_1 = require("../middleware/upload");
const router = (0, express_1.Router)();
// Track operations scoped under room
router.post('/rooms/:roomId/tracks', auth_1.authenticate, upload_1.uploadAudio.single('file'), track_controller_1.uploadTrack);
router.get('/rooms/:roomId/tracks', auth_1.authenticate, track_controller_1.getRoomTracks);
router.delete('/rooms/:roomId/tracks/:trackId', auth_1.authenticate, track_controller_1.deleteTrack);
// Global track operations
router.get('/tracks/:trackId', auth_1.authenticate, track_controller_1.getTrack);
router.get('/tracks/:trackId/audio', track_controller_1.streamAudioTrack); // Can be accessed with audio token or directly by media player
exports.default = router;
