import { apiClient, getActiveBaseUrl } from './client';
import { storage } from '../utils/storage';
import { Platform } from 'react-native';

export const tracksApi = {
    upload: async (roomId, formData) => {
        const baseUrl = await getActiveBaseUrl();
        let token = await storage.getToken();

        const doUpload = async (authToken) => {
            const res = await fetch(`${baseUrl}/rooms/${roomId}/tracks`, {
                method: 'POST',
                headers: {
                    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
                },
                body: formData,
            });
            const text = await res.text();
            let json = {};
            try { json = JSON.parse(text); } catch (e) {}
            return { status: res.status, ok: res.ok, json };
        };

        let result = await doUpload(token);

        // Auto-recover from 401 by creating a fresh guest session and retrying
        if (result.status === 401) {
            await storage.clearSession();
            let deviceId = await storage.getDeviceId();
            if (!deviceId) {
                deviceId = 'device_' + Date.now();
                await storage.setDeviceId(deviceId);
            }
            const gRes = await fetch(`${baseUrl}/sessions/guest`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    displayName: 'Music Fan',
                    deviceId,
                    deviceName: Platform.OS === 'android' ? 'Android Device' : 'iOS Device',
                    platform: Platform.OS,
                }),
            });
            const gJson = await gRes.json().catch(() => ({}));
            const newToken = gJson?.data?.token || gJson?.token;
            if (newToken) {
                await storage.setToken(newToken);
                if (gJson?.data?.session) await storage.setSession(gJson.data.session);
                result = await doUpload(newToken);
            }
        }

        if (!result.ok) {
            throw new Error(result.json?.message || `Upload failed (${result.status})`);
        }
        return result.json;
    },
    getRoomTracks: (roomId) => apiClient.get(`/rooms/${roomId}/tracks`),
    getTrack: (trackId) => apiClient.get(`/tracks/${trackId}`),
    deleteTrack: (roomId, trackId) => apiClient.delete(`/rooms/${roomId}/tracks/${trackId}`),
};
