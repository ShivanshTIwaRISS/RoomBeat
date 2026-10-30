import { apiClient } from './client';
export const tracksApi = {
    upload: (roomId, formData) => apiClient.post(`/rooms/${roomId}/tracks`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    }),
    getRoomTracks: (roomId) => apiClient.get(`/rooms/${roomId}/tracks`),
    getTrack: (trackId) => apiClient.get(`/tracks/${trackId}`),
    deleteTrack: (roomId, trackId) => apiClient.delete(`/rooms/${roomId}/tracks/${trackId}`),
};
