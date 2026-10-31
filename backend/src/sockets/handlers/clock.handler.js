"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerClockHandlers = void 0;
const registerClockHandlers = (socket) => {
    /**
     * High-precision NTP-style clock sync ping/pong
     */
    socket.on('clock:ping', (data) => {
        const serverReceiveTime = Date.now();
        const serverSendTime = Date.now();
        socket.emit('clock:pong', {
            clientSendTime: data.clientSendTime,
            serverReceiveTime,
            serverSendTime,
            serverTime: serverSendTime,
        });
    });
};
exports.registerClockHandlers = registerClockHandlers;
