import { create } from 'zustand';
export const useAppStore = create((set) => ({
    displayName: 'User',
    localVolume: 1.0,
    latencyCompensationMs: 0,
    keepScreenAwake: true,
    autoReconnect: true,
    theme: 'dark',
    setDisplayName: (displayName) => set({ displayName }),
    setLocalVolume: (localVolume) => set({ localVolume }),
    setLatencyCompensation: (latencyCompensationMs) => set({ latencyCompensationMs }),
    setKeepScreenAwake: (keepScreenAwake) => set({ keepScreenAwake }),
    setAutoReconnect: (autoReconnect) => set({ autoReconnect }),
}));
