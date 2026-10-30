import { create } from 'zustand';
const initialPlaybackState = {
    roomId: '',
    currentTrackId: null,
    positionMs: 0,
    status: 'idle',
    serverStartAt: null,
    sequenceNumber: 0,
};
export const usePlaybackStore = create((set) => ({
    currentTrack: null,
    playbackState: initialPlaybackState,
    positionMs: 0,
    durationMs: 0,
    isPlaying: false,
    isPrepared: false,
    downloadProgress: 0,
    setCurrentTrack: (track) => set({ currentTrack: track }),
    setPlaybackState: (updates) => set((state) => ({ playbackState: { ...state.playbackState, ...updates } })),
    setPosition: (positionMs) => set({ positionMs }),
    setDuration: (durationMs) => set({ durationMs }),
    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setIsPrepared: (isPrepared) => set({ isPrepared }),
    setDownloadProgress: (downloadProgress) => set({ downloadProgress }),
    reset: () => set({
        currentTrack: null,
        playbackState: initialPlaybackState,
        positionMs: 0,
        durationMs: 0,
        isPlaying: false,
        isPrepared: false,
        downloadProgress: 0,
    }),
}));
