import { apiClient } from './client';
export const roomsApi = {
    create: (data) => apiClient.post('/rooms', data),
    getById: (roomId) => apiClient.get(`/rooms/${roomId}`),
    getByCode: (code) => apiClient.get(`/rooms/by-code/${code}`),
    join: (data) => apiClient.post('/rooms/join', data),
    leave: (roomId) => apiClient.post(`/rooms/${roomId}/leave`),
    getDevices: (roomId) => apiClient.get(`/rooms/${roomId}/devices`),
    updateSettings: (roomId, data) => apiClient.patch(`/rooms/${roomId}/settings`, data),
    transferHost: (roomId, newHostSessionId) => apiClient.post(`/rooms/${roomId}/host/transfer`, { newHostSessionId }),
    close: (roomId) => apiClient.delete(`/rooms/${roomId}`),
};
