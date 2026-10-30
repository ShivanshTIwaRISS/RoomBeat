import { apiClient } from './client';
export const sessionsApi = {
    createGuest: (payload) => apiClient.post('/sessions/guest', payload),
    getMe: () => apiClient.get('/sessions/me'),
    endSession: () => apiClient.delete('/sessions/me'),
};
