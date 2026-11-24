import axios from 'axios';
import { Platform } from 'react-native';
import { API_BASE_URL, resolveServerUrl } from '../constants/config';
import { storage } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Helper to get active baseURL
export const getActiveBaseUrl = async () => {
    try {
        const customHost = await AsyncStorage.getItem('roombeat_server_host');
        return resolveServerUrl(customHost).apiBaseUrl;
    } catch (e) {
        return API_BASE_URL;
    }
};

// Request interceptor to attach dynamic server host and JWT token
apiClient.interceptors.request.use(async (config) => {
    try {
        config.baseURL = await getActiveBaseUrl();
    } catch (e) {}

    let token = await storage.getToken();

    // Auto-create guest token if missing and not an auth call
    if (!token && !config.url?.includes('/sessions/guest')) {
        try {
            let deviceId = await storage.getDeviceId();
            if (!deviceId) {
                deviceId = 'device_' + Date.now();
                await storage.setDeviceId(deviceId);
            }
            const authRes = await axios.post(`${config.baseURL}/sessions/guest`, {
                displayName: 'Music Fan',
                deviceId,
                deviceName: Platform.OS === 'android' ? 'Android Device' : 'iOS Device',
                platform: Platform.OS,
            });
            const data = authRes.data?.data || authRes.data;
            if (data?.token) {
                token = data.token;
                await storage.setToken(token);
                if (data.session) await storage.setSession(data.session);
            }
        } catch (authErr) {
            console.warn('[apiClient] Pre-request guest auth warning:', authErr.message);
        }
    }

    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor to extract data payload and handle 401 transparent retry
apiClient.interceptors.response.use(
    (response) => response.data,
    async (error) => {
        const originalRequest = error.config;
        const status = error.response?.status;

        // Auto-recover from 401 (expired session, DB wiped, or invalid token)
        if (status === 401 && originalRequest && !originalRequest._retried && !originalRequest.url?.includes('/sessions/guest')) {
            originalRequest._retried = true;
            try {
                await storage.clearSession();
                const baseURL = await getActiveBaseUrl();
                let deviceId = await storage.getDeviceId();
                if (!deviceId) {
                    deviceId = 'device_' + Date.now();
                    await storage.setDeviceId(deviceId);
                }
                const guestRes = await axios.post(`${baseURL}/sessions/guest`, {
                    displayName: 'Music Fan',
                    deviceId,
                    deviceName: Platform.OS === 'android' ? 'Android Device' : 'iOS Device',
                    platform: Platform.OS,
                });
                const data = guestRes.data?.data || guestRes.data;
                if (data?.token) {
                    await storage.setToken(data.token);
                    if (data.session) await storage.setSession(data.session);
                    originalRequest.headers = originalRequest.headers || {};
                    originalRequest.headers.Authorization = `Bearer ${data.token}`;
                    return axios(originalRequest).then((res) => res.data);
                }
            } catch (reAuthErr) {
                console.warn('[apiClient] 401 auto-recovery error:', reAuthErr.message);
            }
        }

        const message = error.response?.data?.message || error.message || 'Network request failed';
        const code = error.response?.data?.error?.code || 'NETWORK_ERROR';
        return Promise.reject({ message, code, status: error.response?.status });
    }
);
