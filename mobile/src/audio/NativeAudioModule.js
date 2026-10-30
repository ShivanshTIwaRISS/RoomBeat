import { NativeModules, NativeEventEmitter } from 'react-native';
const { RoomBeatAudio } = NativeModules;
class NativeAudioBridge {
    emitter = null;
    isNativeAvailable = !!RoomBeatAudio;
    constructor() {
        if (this.isNativeAvailable) {
            this.emitter = new NativeEventEmitter(RoomBeatAudio);
        }
    }
    get isAvailable() {
        return this.isNativeAvailable;
    }
    async getMonotonicTimeMs() {
        if (this.isNativeAvailable) {
            return RoomBeatAudio.getMonotonicTimeMs();
        }
        return Date.now();
    }
    async getEpochTimeMs() {
        if (this.isNativeAvailable) {
            return RoomBeatAudio.getEpochTimeMs();
        }
        return Date.now();
    }
    async prepare(trackUri) {
        if (this.isNativeAvailable) {
            return RoomBeatAudio.prepare(trackUri);
        }
        console.log(`[AudioMock] Prepared: ${trackUri}`);
        return true;
    }
    async schedulePlay(positionMs, targetMonotonicMs) {
        if (this.isNativeAvailable) {
            return RoomBeatAudio.schedulePlay(positionMs, targetMonotonicMs);
        }
        const now = await this.getMonotonicTimeMs();
        const delay = Math.max(0, targetMonotonicMs - now);
        console.log(`[AudioMock] Scheduled play in ${delay}ms at position ${positionMs}`);
        return { scheduled: true, actualDelay: delay, targetMissMs: 0 };
    }
    async play() {
        if (this.isNativeAvailable) {
            return RoomBeatAudio.play();
        }
        return true;
    }
    async pause() {
        if (this.isNativeAvailable) {
            return RoomBeatAudio.pause();
        }
        return true;
    }
    async seek(positionMs) {
        if (this.isNativeAvailable) {
            return RoomBeatAudio.seek(positionMs);
        }
        return true;
    }
    async stop() {
        if (this.isNativeAvailable) {
            return RoomBeatAudio.stop();
        }
        return true;
    }
    async getPlaybackPosition() {
        if (this.isNativeAvailable) {
            return RoomBeatAudio.getPlaybackPosition();
        }
        return {
            positionMs: 0,
            durationMs: 0,
            monotonicMs: await this.getMonotonicTimeMs(),
            isPlaying: false,
        };
    }
    async getPlaybackDiagnostics() {
        if (this.isNativeAvailable) {
            return RoomBeatAudio.getPlaybackDiagnostics();
        }
        const mono = await this.getMonotonicTimeMs();
        return {
            positionMs: 0,
            durationMs: 0,
            bufferedPositionMs: 0,
            isPlaying: false,
            playbackState: 'idle',
            playbackSpeed: 1.0,
            monotonicMs: mono,
            epochMs: Date.now(),
            trackUri: '',
            isPrepared: false,
            volume: 1.0,
        };
    }
    async setVolume(volume) {
        if (this.isNativeAvailable) {
            return RoomBeatAudio.setVolume(volume);
        }
        return true;
    }
    async getFileChecksum(filePath) {
        if (this.isNativeAvailable) {
            return RoomBeatAudio.getFileChecksum(filePath);
        }
        return 'checksum_placeholder';
    }
    onPositionUpdate(callback) {
        if (!this.emitter)
            return () => { };
        const sub = this.emitter.addListener('onPlaybackPosition', callback);
        return () => sub.remove();
    }
    onStateChange(callback) {
        if (!this.emitter)
            return () => { };
        const sub = this.emitter.addListener('onPlaybackStateChanged', callback);
        return () => sub.remove();
    }
}
export const nativeAudio = new NativeAudioBridge();
