"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerQueueHandlers = void 0;
const queue_service_1 = require("../../services/queue.service");
const registerQueueHandlers = (io, socket) => {
    const session = socket.session;
    socket.on('host:queue:update', async (data) => {
        if (!session)
            return;
        try {
            if (data.action === 'add' && data.trackId) {
                await queue_service_1.queueService.addToQueue(data.roomId, data.trackId, session.id);
            }
            else if (data.action === 'remove' && data.itemId) {
                await queue_service_1.queueService.removeFromQueue(data.roomId, data.itemId, session.id);
            }
            else if (data.action === 'reorder' && data.itemId && data.newPosition !== undefined) {
                await queue_service_1.queueService.reorderQueue(data.roomId, data.itemId, data.newPosition, session.id);
            }
            else if (data.action === 'clear') {
                await queue_service_1.queueService.clearQueue(data.roomId, session.id);
            }
            const updatedQueue = await queue_service_1.queueService.getQueue(data.roomId);
            io.to(data.roomId).emit('queue:updated', { queue: updatedQueue });
        }
        catch (err) {
            socket.emit('server:error', { code: 'QUEUE_UPDATE_ERROR', message: err.message });
        }
    });
};
exports.registerQueueHandlers = registerQueueHandlers;
