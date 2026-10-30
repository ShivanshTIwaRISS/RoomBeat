import { create } from 'zustand';
import { Platform } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../utils/storage';
import { sessionsApi } from '../api/sessions';
export const useSessionStore = create((set, get) => ({
    session: null,
    token: null,
    isLoading: true,
    error: null,
    initialize: async () => {
        try {
            set({ isLoading: true, error: null });
            const savedToken = await storage.getToken();
            const savedSession = await storage.getSession();
            if (savedToken && savedSession) {
                set({ token: savedToken, session: savedSession, isLoading: false });
                // Refresh session in background
                sessionsApi.getMe()
                    .then((res) => {
                    const data = res.data || res;
                    if (data && data.id) {
                        set({ session: data });
                        storage.setSession(data);
                    }
                })
                    .catch(() => { });
            }
            else {
                set({ isLoading: false });
            }
        }
        catch (err) {
            set({ isLoading: false, error: err.message });
        }
    },
    createGuest: async (displayName) => {
        try {
            set({ isLoading: true, error: null });
            let deviceId = await storage.getDeviceId();
            if (!deviceId) {
                deviceId = uuidv4();
                await storage.setDeviceId(deviceId);
            }
            const deviceName = `${Platform.OS === 'android' ? 'Android' : 'iOS'} Device`;
            const response = await sessionsApi.createGuest({
                displayName,
                deviceId,
                deviceName,
                platform: Platform.OS,
            });
            const { session, token } = response.data || response;
            await storage.setToken(token);
            await storage.setSession(session);
            set({ session, token, isLoading: false });
            return session;
        }
        catch (err) {
            set({ isLoading: false, error: err.message });
            throw err;
        }
    },
    clearSession: async () => {
        await storage.removeToken();
        await storage.removeSession();
        set({ session: null, token: null });
    },
}));
