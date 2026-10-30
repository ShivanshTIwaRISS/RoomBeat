# RoomBeat Audio Synchronization Engine & Algorithm

## 1. The Core Challenge of Multi-Device Wireless Playback

When multiple smartphones attempt to play the same audio track over Wi-Fi without synchronization, they immediately sound like an echoing, incoherent mess. This happens due to:
1. **Clock Discrepancies**: Different phones have hardware clocks that drift by several milliseconds to seconds.
2. **Network Jitter**: Sending a network "Play" packet arrives at Phone A in 5ms and Phone B in 80ms.
3. **Audio Buffer & Hardware Latency**: Operating system audio pipelines (Android AudioFlinger, ALSA, DAC buffers) introduce 15ms to 80ms of hardware rendering latency.

RoomBeat solves this using a **3-stage synchronization architecture**:
1. Pre-caching and Preparation
2. High-Precision NTP-style Monotonic Clock Alignment
3. Future Scheduled Native Execution

---

## 2. Stage 1: Audio Pre-Caching & Checksum Verification

**No audio is streamed live over the socket.** Streaming live audio introduces buffering lag and packet dropouts.

Instead:
1. When host triggers track preparation, backend broadcasts `playback:prepare` with the track's HTTP download URL and SHA-256 checksum.
2. Each phone downloads the complete audio file into its local application cache directory (`RNFS.CachesDirectoryPath/roombeat_audio/`).
3. The phone validates the SHA-256 checksum against the server's record.
4. The local file URI is loaded into Android ExoPlayer (`MediaItem.fromUri(localPath)`), parsed, and buffered into memory.
5. When ExoPlayer enters `Player.STATE_READY`, the phone emits `device:ready`.
6. Playback is NOT started until devices report ready.

---

## 3. Stage 2: NTP Clock Offset Estimation

To execute actions simultaneously, all devices must share a synchronized concept of time without altering the phone's system clock.

### NTP Exchange Formula
Periodically (burst of 8 initial pings, followed by every 15s), the phone exchanges timestamps with the server:
- `t0` = Client Send Time (local `Date.now()`)
- `t1` = Server Receive Time (`Date.now()` on server)
- `t2` = Server Send Time (`Date.now()` on server)
- `t3` = Client Receive Time (local `Date.now()`)

$$\text{Round-Trip Time (RTT)} = (t_3 - t_0) - (t_2 - t_1)$$
$$\text{Clock Offset} = \frac{(t_1 - t_0) + (t_2 - t_3)}{2}$$

### Outlier Rejection & Robust Estimation
1. Samples with high RTT (caused by temporary Wi-Fi packet retransmissions) contain higher timing error.
2. RoomBeat collects a rolling buffer of 10 samples, sorts them by ascending RTT, and takes the lowest 60% of samples.
3. The median offset of these low-RTT samples is adopted as the canonical `clockOffset`.

---

## 4. Stage 3: Future Scheduled Playback via Native Monotonic Clock

When the host presses **Play**:
1. The server generates a target execution timestamp in the near future:
   $$\text{startAtServerEpochMs} = \text{Date.now()} + \text{delayMs} \quad (\text{default delay: 3000ms})$$
2. The server broadcasts `playback:scheduled` with `startAtServerEpochMs` and `positionMs`.
3. Each phone receives this message (e.g. 10ms–80ms later).
4. Each phone maps the future server epoch time into its own local monotonic clock:

$$\text{localTargetEpoch} = \text{startAtServerEpochMs} - \text{clockOffset}$$
$$\Delta = \text{localTargetEpoch} - \text{localEpochNow}$$
$$\text{targetMonotonicMs} = \text{SystemClock.elapsedRealtime()} + \Delta$$

5. The native Android module (`RoomBeatAudioModule.kt`) uses `Handler(Looper.getMainLooper()).postDelayed()` targeting `targetMonotonicMs`.
6. Monotonic clock (`SystemClock.elapsedRealtime()`) is used instead of wall-clock time because monotonic time never jumps during network time adjustments or user clock changes.

---

## 5. Stage 4: Playback Drift Monitoring & Detection

During playback, each phone emits position reports every 2.5 seconds:
1. **Canonical Server Position**:
   $$\text{elapsed} = \text{serverTimeNow} - \text{startAtServerEpochMs}$$
   $$\text{expectedPositionMs} = \text{basePositionMs} + \text{elapsed}$$
2. **Actual Position**: Reported directly from ExoPlayer's `currentPosition`.
3. **Drift**:
   $$\text{driftMs} = \text{actualPositionMs} - \text{expectedPositionMs} + \text{latencyCompensationMs}$$

### Classification:
- **Excellent**: $|\text{drift}| \le 15\text{ ms}$
- **Good**: $|\text{drift}| \le 40\text{ ms}$
- **Needs Attention**: $40\text{ ms} < |\text{drift}| \le 100\text{ ms}$
- **Critical**: $|\text{drift}| > 100\text{ ms}$ (triggers resync)

---

## 6. Hardware Latency Calibration

Different smartphone manufacturers use different audio hardware components (DACs, DSPs, speaker internal delay). For example, a Samsung device may have 35ms DAC buffer latency, while a Google Pixel has 22ms.

RoomBeat provides a **Device Calibration Screen** allowing users to adjust a persistent millisecond offset ($\pm 10\text{ ms}$ or $\pm 2\text{ ms}$) to fine-tune audible acoustic harmony without affecting other phones.

---

## 7. Performance Expectations & Realities

- **Target**: Median start-time alignment difference $< 50\text{ ms}$ on a stable local 5GHz or 2.4GHz Wi-Fi network.
- **Honest Engineering Note**: Software timestamps represent when the media framework writes audio samples to the audio track buffer. True acoustic alignment requires identical acoustic propagation distances and calibrated DAC latency compensation.

