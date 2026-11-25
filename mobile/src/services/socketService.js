import { io } from 'socket.io-client';
import { SOCKET_URL, resolveServerUrl } from '../constants/config';
import { clockSync } from '../sync/ClockSync';
import AsyncStorage from '@react-native-async-storage/async-storage';
class SocketService {
    socket = null;
    currentToken = null;
    isConnecting = false;
    clockPingInterval = null;
    async connect(token) {
        if (this.socket && this.currentToken && token && this.currentToken !== token) {
            // Token changed (e.g. new guest session); reconnect with fresh auth
            this.disconnect();
        }
        if (this.socket && this.socket.connected) {
            if (!this.clockPingInterval) this.startClockSync();
            return this.socket;
        }
        this.currentToken = token || this.currentToken;
        let targetUrl = SOCKET_URL;
        try {
            const host = await AsyncStorage.getItem('roombeat_server_host');
            targetUrl = resolveServerUrl(host).socketUrl;
        } catch (e) {}

        if (this.socket) {
            if (token) this.socket.auth = { token };
            if (!this.socket.connected) {
                this.socket.connect();
            }
            return this.socket;
        }

        this.isConnecting = true;
        console.log(`[SocketService] Connecting to ${targetUrl}`);
        this.socket = io(targetUrl, {
            auth: { token },
            transports: ['polling', 'websocket'],
            reconnection: true,
            reconnectionAttempts: 20,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 25000,
        });
        this.socket.on('connect', () => {
            console.log(`[SocketService] Connected! ID: ${this.socket?.id}`);
            this.isConnecting = false;
            this.startClockSync();
        });
        this.socket.on('disconnect', (reason) => {
            console.log(`[SocketService] Disconnected: ${reason}`);
            this.stopClockSync();
        });
        this.socket.on('connect_error', (error) => {
            console.warn(`[SocketService] Connection error:`, error.message);
            this.isConnecting = false;
        });
        // Handle high-precision clock sync pong
        this.socket.on('clock:pong', (data) => {
            clockSync.addSample(data.clientSendTime, data.serverReceiveTime, data.serverSendTime);
        });
        return this.socket;
    }
    /**
     * Start NTP clock ping-pong bursts (waits 400ms for WebSocket upgrade so RTT is clean)
     */
    startClockSync() {
        this.stopClockSync();
        setTimeout(() => {
            let burstCount = 0;
            const burstTimer = setInterval(() => {
                this.sendClockPing();
                burstCount++;
                if (burstCount >= 6) {
                    clearInterval(burstTimer);
                }
            }, 180);
        }, 400);
        // Continuous low-overhead sync every 4 seconds so clock offset stays tight
        this.clockPingInterval = setInterval(() => {
            this.sendClockPing();
        }, 4000);
    }
    sendClockPing() {
        if (this.socket && this.socket.connected) {
            this.socket.emit('clock:ping', { clientSendTime: Date.now() });
        }
    }
    stopClockSync() {
        if (this.clockPingInterval) {
            clearInterval(this.clockPingInterval);
            this.clockPingInterval = null;
        }
    }
    getSocket() {
        return this.socket;
    }
    disconnect() {
        this.stopClockSync();
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
        this.isConnecting = false;
    }
}
export const socketService = new SocketService();
