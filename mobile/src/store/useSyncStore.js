import { create } from 'zustand';
export const useSyncStore = create((set) => ({
    clockOffsetMs: 0,
    roundTripTimeMs: 0,
    playbackDriftMs: 0,
    health: 'excellent',
    deviceReports: {},
    lastSyncedAt: null,
    setLocalMetrics: (metrics) => set({
        ...metrics,
        lastSyncedAt: Date.now(),
    }),
    updateDeviceReport: (sessionId, report) => set((state) => ({
        deviceReports: {
            ...state.deviceReports,
            [sessionId]: report,
        },
    })),
    reset: () => set({
        clockOffsetMs: 0,
        roundTripTimeMs: 0,
        playbackDriftMs: 0,
        health: 'excellent',
        deviceReports: {},
        lastSyncedAt: null,
    }),
}));
