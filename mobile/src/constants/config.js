import { Platform } from 'react-native';
// Default development URLs
// Physical devices must reach development computer via LAN IP (e.g. 192.168.1.100)
// Android Emulator uses 10.0.2.2 to access host machine localhost
// Your Mac's local LAN IP: works for physical phones on Wi-Fi as well as emulators
export const DEFAULT_DEV_HOST = '10.7.19.246';
export const DEFAULT_PORT = '3000';
export const API_BASE_URL = `http://${DEFAULT_DEV_HOST}:${DEFAULT_PORT}`;
export const SOCKET_URL = `http://${DEFAULT_DEV_HOST}:${DEFAULT_PORT}`;
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
