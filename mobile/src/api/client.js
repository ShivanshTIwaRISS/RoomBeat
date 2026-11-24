import axios from 'axios';
import { API_BASE_URL } from '../constants/config';
import { storage } from '../utils/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const apiClient = axios.create({
    baseURL: `${API_BASE_URL}/api/v1`,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
});
// Request interceptor to attach dynamic server host and JWT token
apiClient.interceptors.request.use(async (config) => {
    try {
        let customHost = await AsyncStorage.getItem('roombeat_server_host');
        if (customHost) {
            customHost = customHost.trim().replace(/^https?:\/\//i, '').replace(/:\d+.*$/, '').replace(/\/.*$/, '');
            config.baseURL = `http://${customHost}:3000/api/v1`;
        }
    } catch (e) {}
    const token = await storage.getToken();
    if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
// Response interceptor to extract data payload
apiClient.interceptors.response.use((response) => response.data, (error) => {
    const message = error.response?.data?.message || error.message || 'Network request failed';
    const code = error.response?.data?.error?.code || 'NETWORK_ERROR';
    return Promise.reject({ message, code, status: error.response?.status });
});
