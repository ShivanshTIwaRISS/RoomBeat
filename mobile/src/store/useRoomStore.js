import { create } from 'zustand';
import { roomsApi } from '../api/rooms';
import { storage } from '../utils/storage';
export const useRoomStore = create((set, get) => ({
    currentRoom: null,
    members: [],
    isHost: false,
    isLoading: false,
    error: null,
    setRoom: (room, hostSessionId, currentSessionId) => {
        const isHost = hostSessionId === currentSessionId;
        set({ currentRoom: room, isHost, members: room.members || [] });
        storage.addRecentRoom({ id: room.id, name: room.name, code: room.code });
    },
    setMembers: (members) => {
        set({ members });
    },
    addMember: (member) => {
        set((state) => {
            const exists = state.members.some((m) => m.sessionId === member.sessionId);
            if (exists) {
                return {
                    members: state.members.map((m) => (m.sessionId === member.sessionId ? member : m)),
                };
            }
            return { members: [...state.members, member] };
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
                    return {
                        ...m,
                        session: {
                            ...m.session,
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
