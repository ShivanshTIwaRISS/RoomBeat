import { Platform } from 'react-native';
// Default Cloud & Local URLs
export const DEFAULT_CLOUD_URL = 'https://roombeat.onrender.com';
export const DEFAULT_DEV_HOST = '10.7.19.246';
export const DEFAULT_PORT = '3000';

// By default, connect directly to the 24/7 Cloud server on Render:
export const API_BASE_URL = `${DEFAULT_CLOUD_URL}/api/v1`;
export const SOCKET_URL = DEFAULT_CLOUD_URL;

export const resolveServerUrl = (rawHost) => {
    if (!rawHost || !rawHost.trim()) {
        return {
            apiBaseUrl: `${DEFAULT_CLOUD_URL}/api/v1`,
            socketUrl: DEFAULT_CLOUD_URL,
            isCloud: true,
            display: 'Cloud (Render)',
        };
    }
    const host = rawHost.trim();
    if (host.startsWith('http://') || host.startsWith('https://')) {
        const clean = host.replace(/\/+$/, '');
        return {
            apiBaseUrl: `${clean}/api/v1`,
            socketUrl: clean,
            isCloud: clean.includes('https://'),
            display: clean.replace(/^https?:\/\//, ''),
        };
    }
    if (host.includes('.onrender.com') || host.includes('.com') || host.includes('.app') || host.includes('.org') || host.includes('.io')) {
        const clean = `https://${host.replace(/\/+$/, '')}`;
        return {
            apiBaseUrl: `${clean}/api/v1`,
            socketUrl: clean,
            isCloud: true,
            display: host,
        };
    }
    // Local LAN IP (e.g. 10.7.19.246)
    const ip = host.replace(/^https?:\/\//i, '').replace(/:\d+.*$/, '').replace(/\/.*$/, '');
    const clean = `http://${ip}:${DEFAULT_PORT}`;
    return {
        apiBaseUrl: `${clean}/api/v1`,
        socketUrl: clean,
        isCloud: false,
        display: `${ip}:${DEFAULT_PORT}`,
    };
};
export const CONFIG = {
    appName: 'RoomBeat',
    tagline: 'Every Phone. One Beat.',
    version: '1.0.0',
    buildNumber: 1,
    // Audio & Sync Defaults
    defaultScheduleDelayMs: 3000,
    heartbeatIntervalMs: 5000,
    syncReportIntervalMs: 2000,
    clockSyncSamplesCount: 10,
    clockSyncIntervalMs: 30000,
    // Thresholds for Drift Detection
    driftThresholds: {
        excellent: 15, // <15ms
        good: 40, // <40ms
        attention: 90, // <90ms
        critical: 150, // >150ms requires resync
    },
};
