/**
 * Format milliseconds into MM:SS or HH:MM:SS
 */
export const formatDuration = (ms) => {
    if (!ms || isNaN(ms) || ms < 0)
        return '0:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const paddedSeconds = seconds < 10 ? `0${seconds}` : `${seconds}`;
    if (hours > 0) {
        const paddedMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
        return `${hours}:${paddedMinutes}:${paddedSeconds}`;
    }
    return `${minutes}:${paddedSeconds}`;
};
/**
 * Format bytes into human-readable size
 */
export const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0)
        return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};
/**
 * Format latency / drift in ms
 */
export const formatMs = (ms) => {
    if (ms === null || ms === undefined || isNaN(ms))
        return '-- ms';
    const sign = ms > 0 ? '+' : '';
    return `${sign}${Math.round(ms)} ms`;
};
/**
 * Mask room code for display, e.g. "RB-9481"
 */
export const formatRoomCode = (code) => {
    if (!code)
        return '';
    const clean = code.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (clean.length <= 3)
        return clean;
    return `${clean.slice(0, 3)}-${clean.slice(3, 6)}`;
};
