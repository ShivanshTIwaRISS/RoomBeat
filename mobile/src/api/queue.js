import { apiClient } from './client';
export const queueApi = {
    getQueue: (roomId) => apiClient.get(`/rooms/${roomId}/queue`),
    addToQueue: (roomId, trackId) => apiClient.post(`/rooms/${roomId}/queue`, { trackId }),
    reorderQueue: (roomId, itemId, newPosition) => apiClient.patch(`/rooms/${roomId}/queue/reorder`, {
        itemId,
        newPosition,
    }),
    removeFromQueue: (roomId, itemId) => apiClient.delete(`/rooms/${roomId}/queue/${itemId}`),
    clearQueue: (roomId) => apiClient.delete(`/rooms/${roomId}/queue`),
};
