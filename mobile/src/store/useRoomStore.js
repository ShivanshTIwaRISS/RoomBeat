import { create } from 'zustand';
import { roomsApi } from '../api/rooms';
import { storage } from '../utils/storage';
const normalizeMember = (m) => {
    if (!m) return null;
    const sessionId = m.sessionId || m.id || '';
    const session = m.session || {
        id: sessionId,
        displayName: m.displayName || 'Speaker',
        deviceName: m.deviceName || 'Mobile Device',
        platform: m.platform || 'android',
        connectionStatus: 'online',
    };
    return {
        ...m,
        sessionId,
        role: m.role || 'SPEAKER',
        session: {
            id: session.id || sessionId,
            displayName: session.displayName || m.displayName || 'Speaker',
            deviceName: session.deviceName || m.deviceName || 'Mobile Device',
            platform: session.platform || m.platform || 'android',
            connectionStatus: session.connectionStatus || 'online',
        },
    };
};

export const useRoomStore = create((set, get) => ({
    currentRoom: null,
    members: [],
    isHost: false,
    isLoading: false,
    error: null,
    setRoom: (room, hostSessionId, currentSessionId) => {
        const isHost = hostSessionId === currentSessionId;
        const normalizedMembers = (room?.members || []).map(normalizeMember).filter(Boolean);
        set({ currentRoom: room, isHost, members: normalizedMembers });
        storage.addRecentRoom({ id: room.id, name: room.name, code: room.code });
    },
    setMembers: (members) => {
        set({ members: (members || []).map(normalizeMember).filter(Boolean) });
    },
    addMember: (member) => {
        const normalized = normalizeMember(member);
        if (!normalized) return;
        set((state) => {
            const exists = state.members.some((m) => m.sessionId === normalized.sessionId);
            if (exists) {
                return {
                    members: state.members.map((m) => (m.sessionId === normalized.sessionId ? normalized : m)),
                };
            }
            return { members: [...state.members, normalized] };
        });
    },
    removeMember: (sessionId) => {
        set((state) => ({
            members: state.members.filter((m) => m.sessionId !== sessionId),
        }));
    },
    updateMember: (sessionId, updates) => {
        set((state) => ({
            members: state.members.map((m) => {
                if (m.sessionId === sessionId) {
                    const existingSession = m.session || {};
                    return {
                        ...m,
                        ...updates,
                        session: {
                            ...existingSession,
                            ...updates,
                        },
                    };
                }
                return m;
            }),
        }));
    },
    leaveRoom: async () => {
        const { currentRoom } = get();
        if (currentRoom) {
            await roomsApi.leave(currentRoom.id).catch(() => { });
        }
        set({ currentRoom: null, members: [], isHost: false });
    },
    clearRoom: () => {
        set({ currentRoom: null, members: [], isHost: false });
    },
}));
