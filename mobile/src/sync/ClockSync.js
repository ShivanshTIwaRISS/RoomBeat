import { nativeAudio } from '../audio/NativeAudioModule';
export class ClockSync {
    samples = [];
    estimatedOffset = 0;
    estimatedRtt = 0;
    maxSamples = 10;
    get clockOffset() {
        return this.estimatedOffset;
    }
    get roundTripTime() {
        return this.estimatedRtt;
    }
    /**
     * Process a pong response from server:
     *
     * RTT = (clientReceive - clientSend) - (serverSend - serverReceive)
     * Offset = ((serverReceive - clientSend) + (serverSend - clientReceive)) / 2
     */
    addSample(clientSendTime, serverReceiveTime, serverSendTime) {
        const clientReceiveTime = Date.now();
        const roundTripTime = Math.max(0, clientReceiveTime - clientSendTime);
        const clockOffset = ((serverReceiveTime - clientSendTime) + (serverSendTime - clientReceiveTime)) / 2;
        const sample = {
            clientSendTime,
            serverReceiveTime,
            serverSendTime,
            clientReceiveTime,
            roundTripTime,
            clockOffset,
        };
        this.samples.push(sample);
        if (this.samples.length > this.maxSamples) {
            this.samples.shift();
        }
        this.computeEstimates();
        return sample;
    }
    /**
     * Calculate robust median offset, rejecting high RTT outliers
     */
    computeEstimates() {
        if (this.samples.length === 0)
            return;
        // Sort by RTT and take the best 60% of samples (lowest network jitter)
        const sortedByRtt = [...this.samples].sort((a, b) => a.roundTripTime - b.roundTripTime);
        const validCount = Math.max(1, Math.ceil(sortedByRtt.length * 0.6));
        const bestSamples = sortedByRtt.slice(0, validCount);
        // Median offset among best samples
        const offsets = bestSamples.map((s) => s.clockOffset).sort((a, b) => a - b);
        const mid = Math.floor(offsets.length / 2);
        this.estimatedOffset = offsets.length % 2 !== 0 ? offsets[mid] : (offsets[mid - 1] + offsets[mid]) / 2;
        // Median RTT
        const rtts = bestSamples.map((s) => s.roundTripTime).sort((a, b) => a - b);
        this.estimatedRtt = rtts[Math.floor(rtts.length / 2)];
    }
    /**
     * Convert server epoch timestamp to local monotonic clock timestamp
     */
    async serverEpochToLocalMonotonic(serverEpochMs) {
        const localEpochNow = Date.now();
        const localMonotonicNow = await nativeAudio.getMonotonicTimeMs();
        // Local epoch time corresponding to serverEpochMs
        const localTargetEpoch = serverEpochMs - this.estimatedOffset;
        // Map to monotonic clock
        const deltaMs = localTargetEpoch - localEpochNow;
        return localMonotonicNow + deltaMs;
    }
    reset() {
        this.samples = [];
        this.estimatedOffset = 0;
        this.estimatedRtt = 0;
    }
}
export const clockSync = new ClockSync();
