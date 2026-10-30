import { clockSync } from './ClockSync';
import { audioManager } from '../audio/AudioManager';
import { CONFIG } from '../constants/config';
export class SyncManager {
    lastReportedDrift = 0;
    latencyCompensationMs = 0;
    setLatencyCompensation(ms) {
        this.latencyCompensationMs = ms;
    }
    /**
     * Determine health category based on estimated playback drift
     */
    classifyHealth(driftMs) {
        const absDrift = Math.abs(driftMs);
        if (absDrift <= CONFIG.driftThresholds.excellent)
            return 'excellent';
        if (absDrift <= CONFIG.driftThresholds.good)
            return 'good';
        if (absDrift <= CONFIG.driftThresholds.attention)
            return 'attention';
        return 'critical';
    }
    /**
     * Calculate current playback drift against canonical server playback state:
     * expectedPosition = now - serverStartAt
     * drift = actualPosition - expectedPosition
     */
    async calculateDrift(serverStartAtEpochMs, basePositionMs = 0) {
        const posReport = await audioManager.getPosition();
        const currentPositionMs = posReport.positionMs;
        if (!serverStartAtEpochMs) {
            return { driftMs: 0, currentPositionMs };
        }
        // Canonical server time now
        const serverNow = Date.now() + clockSync.clockOffset;
        const elapsedSinceStart = Math.max(0, serverNow - serverStartAtEpochMs);
        const expectedPositionMs = basePositionMs + elapsedSinceStart;
        // Positive drift = playing ahead; Negative drift = playing behind
        const rawDriftMs = currentPositionMs - expectedPositionMs;
        const compensatedDriftMs = rawDriftMs + this.latencyCompensationMs;
        this.lastReportedDrift = compensatedDriftMs;
        return { driftMs: compensatedDriftMs, currentPositionMs };
    }
    async getDiagnostics(serverStartAtEpochMs) {
        const { driftMs, currentPositionMs } = await this.calculateDrift(serverStartAtEpochMs);
        return {
            clockOffsetMs: clockSync.clockOffset,
            roundTripTimeMs: clockSync.roundTripTime,
            playbackDriftMs: driftMs,
            positionMs: currentPositionMs,
            health: this.classifyHealth(driftMs),
            isReady: true,
        };
    }
}
export const syncManager = new SyncManager();
