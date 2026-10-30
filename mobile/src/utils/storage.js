import AsyncStorage from '@react-native-async-storage/async-storage';
const STORAGE_KEYS = {
    TOKEN: '@roombeat:token',
    SESSION: '@roombeat:session',
    SETTINGS: '@roombeat:settings',
    RECENT_ROOMS: '@roombeat:recent_rooms',
    CALIBRATION_OFFSET: '@roombeat:calibration_offset',
    HAS_SEEN_ONBOARDING: '@roombeat:has_seen_onboarding',
};
export const storage = {
    async getToken() {
        return AsyncStorage.getItem(STORAGE_KEYS.TOKEN);
    },
    async setToken(token) {
        return AsyncStorage.setItem(STORAGE_KEYS.TOKEN, token);
    },
    async removeToken() {
        return AsyncStorage.removeItem(STORAGE_KEYS.TOKEN);
    },
    async getSession() {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.SESSION);
        return raw ? JSON.parse(raw) : null;
    },
    async setSession(session) {
        return AsyncStorage.setItem(STORAGE_KEYS.SESSION, JSON.stringify(session));
    },
    async removeSession() {
        return AsyncStorage.removeItem(STORAGE_KEYS.SESSION);
    },
    async getRecentRooms() {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.RECENT_ROOMS);
        return raw ? JSON.parse(raw) : [];
    },
    async addRecentRoom(room) {
        const existing = await storage.getRecentRooms();
        const filtered = existing.filter((r) => r.id !== room.id);
        const updated = [
            { ...room, lastJoinedAt: new Date().toISOString() },
            ...filtered,
        ].slice(0, 10);
        return AsyncStorage.setItem(STORAGE_KEYS.RECENT_ROOMS, JSON.stringify(updated));
    },
    async getDeviceId() {
        return AsyncStorage.getItem('@roombeat:device_id');
    },
    async setDeviceId(deviceId) {
        return AsyncStorage.setItem('@roombeat:device_id', deviceId);
    },
    async getHasSeenOnboarding() {
        const raw = await AsyncStorage.getItem(STORAGE_KEYS.HAS_SEEN_ONBOARDING);
        return raw === 'true';
    },
    async setHasSeenOnboarding(seen) {
        return AsyncStorage.setItem(STORAGE_KEYS.HAS_SEEN_ONBOARDING, seen ? 'true' : 'false');
    },
};
