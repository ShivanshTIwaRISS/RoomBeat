import RNFS from 'react-native-fs';
import { nativeAudio } from './NativeAudioModule';
import { API_BASE_URL } from '../constants/config';
export class AudioManager {
    cacheDir = `${RNFS.CachesDirectoryPath}/roombeat_audio`;
    currentTrackId = null;
    currentLocalUri = null;
    isPrepared = false;
    constructor() {
        this.ensureCacheDir();
    }
    async ensureCacheDir() {
        try {
            const exists = await RNFS.exists(this.cacheDir);
            if (!exists) {
                await RNFS.mkdir(this.cacheDir);
            }
        }
        catch (e) {
            console.warn('Could not initialize audio cache dir:', e);
        }
    }
    getLocalTrackPath(trackId, filename) {
        const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
        return `${this.cacheDir}/${trackId}_${safeName}`;
    }
    async isTrackCached(trackId, filename) {
        const localPath = this.getLocalTrackPath(trackId, filename);
        return RNFS.exists(localPath);
    }
    /**
     * Download track to local cache, verify checksum, and prepare player
     */
    async prepareTrack(trackId, filename, expectedChecksum, onProgress) {
        await this.ensureCacheDir();
        const localPath = this.getLocalTrackPath(trackId, filename);
        const exists = await RNFS.exists(localPath);
        if (!exists) {
            const downloadUrl = `${API_BASE_URL}/api/v1/tracks/${trackId}/audio`;
            console.log(`[AudioManager] Downloading track ${trackId} from ${downloadUrl}`);
            const downloadResult = await RNFS.downloadFile({
                fromUrl: downloadUrl,
                toFile: localPath,
                progress: (res) => {
                    const progress = res.bytesWritten / (res.contentLength || 1);
                    if (onProgress)
                        onProgress(progress);
                },
            }).promise;
            if (downloadResult.statusCode !== 200 && downloadResult.statusCode !== 206) {
                // Delete incomplete file
                await RNFS.unlink(localPath).catch(() => { });
                throw new Error(`Failed to download audio. Status code: ${downloadResult.statusCode}`);
            }
        }
        // Verify checksum if native audio module supports it
        if (expectedChecksum && nativeAudio.isAvailable) {
            try {
                const actualChecksum = await nativeAudio.getFileChecksum(localPath);
                if (actualChecksum && actualChecksum !== expectedChecksum) {
                    console.warn(`[AudioManager] Checksum mismatch: expected ${expectedChecksum}, got ${actualChecksum}`);
                }
            }
            catch (err) {
                console.warn('Checksum check failed:', err);
            }
        }
        // Prepare native audio player
        await nativeAudio.prepare(localPath);
        this.currentTrackId = trackId;
        this.currentLocalUri = localPath;
        this.isPrepared = true;
        return localPath;
    }
    /**
     * Schedule synchronized playback
     */
    async schedulePlay(positionMs, targetMonotonicMs) {
        return nativeAudio.schedulePlay(positionMs, targetMonotonicMs);
    }
    async play() {
        return nativeAudio.play();
    }
    async pause() {
        return nativeAudio.pause();
    }
    async seek(positionMs) {
        return nativeAudio.seek(positionMs);
    }
    async stop() {
        this.isPrepared = false;
        this.currentTrackId = null;
        return nativeAudio.stop();
    }
    async getPosition() {
        return nativeAudio.getPlaybackPosition();
    }
    async getDiagnostics() {
        return nativeAudio.getPlaybackDiagnostics();
    }
    async clearCache() {
        try {
            const exists = await RNFS.exists(this.cacheDir);
            if (exists) {
                await RNFS.unlink(this.cacheDir);
                await this.ensureCacheDir();
            }
        }
        catch (e) {
            console.error('Failed to clear audio cache:', e);
        }
    }
}
export const audioManager = new AudioManager();
