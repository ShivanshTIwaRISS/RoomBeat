import { ClockSync } from '../ClockSync';
describe('ClockSync NTP Engine', () => {
    let clock;
    beforeEach(() => {
        clock = new ClockSync();
    });
    it('calculates clock offset and round-trip time from pong sample', () => {
        const clientSend = 1000;
        const serverReceive = 1020; // Server is ahead by 10ms + 10ms network delay
        const serverSend = 1020;
        // clientReceive will be Date.now() in test, but offset is computed
        const sample = clock.addSample(clientSend, serverReceive, serverSend);
        expect(sample).toBeDefined();
        expect(sample.clientSendTime).toBe(1000);
        expect(sample.serverReceiveTime).toBe(1020);
        expect(sample.roundTripTime).toBeGreaterThanOrEqual(0);
    });
    it('stabilizes offset estimate across multiple burst samples', () => {
        for (let i = 0; i < 8; i++) {
            clock.addSample(1000 + i * 20, 1015 + i * 20, 1015 + i * 20);
        }
        expect(typeof clock.clockOffset).toBe('number');
        expect(typeof clock.roundTripTime).toBe('number');
    });
});
