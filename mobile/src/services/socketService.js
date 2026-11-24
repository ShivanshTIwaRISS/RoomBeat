import { io } from 'socket.io-client';
import { SOCKET_URL, resolveServerUrl } from '../constants/config';
import { clockSync } from '../sync/ClockSync';
import AsyncStorage from '@react-native-async-storage/async-storage';
class SocketService {
    socket = null;
    isConnecting = false;
    clockPingInterval = null;
    async connect(token) {
        if (this.socket && this.socket.connected) {
            if (!this.clockPingInterval) this.startClockSync();
            return this.socket;
        }
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
     * Start NTP clock ping-pong bursts
     */
    startClockSync() {
        this.stopClockSync();
        // Initial burst of 8 rapid pings for quick convergence
        let burstCount = 0;
        const burstTimer = setInterval(() => {
            this.sendClockPing();
            burstCount++;
            if (burstCount >= 8) {
                clearInterval(burstTimer);
            }
        }, 300);
        // Steady periodic sync every 15 seconds
        this.clockPingInterval = setInterval(() => {
            this.sendClockPing();
        }, 15000);
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
