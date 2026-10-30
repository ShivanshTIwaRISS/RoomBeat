import { apiClient } from './client';
export const syncApi = {
    submitReport: (roomId, data) => apiClient.post(`/rooms/${roomId}/sync/report`, data),
    getRoomReports: (roomId) => apiClient.get(`/rooms/${roomId}/sync/report`),
    updateDeviceSettings: (roomId, deviceId, settings) => apiClient.patch(`/rooms/${roomId}/devices/${deviceId}/settings`, settings),
};
