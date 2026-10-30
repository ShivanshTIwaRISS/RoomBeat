import { apiClient } from './client';
export const playbackApi = {
    getState: (roomId) => apiClient.get(`/rooms/${roomId}/playback`),
    prepare: (roomId, trackId) => apiClient.post(`/rooms/${roomId}/playback/prepare`, { trackId }),
    play: (roomId, positionMs, delayMs) => apiClient.post(`/rooms/${roomId}/playback/play`, { positionMs, delayMs }),
    pause: (roomId) => apiClient.post(`/rooms/${roomId}/playback/pause`),
    seek: (roomId, positionMs) => apiClient.post(`/rooms/${roomId}/playback/seek`, { positionMs }),
    next: (roomId) => apiClient.post(`/rooms/${roomId}/playback/next`),
    previous: (roomId) => apiClient.post(`/rooms/${roomId}/playback/previous`),
    stop: (roomId) => apiClient.post(`/rooms/${roomId}/playback/stop`),
};
