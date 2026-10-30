# RoomBeat Testing Strategy & Verification Guide

This guide describes how to run automated unit tests, integration tests, and physical multi-device synchronization evaluations.

---

## 1. Automated Backend Tests

Backend tests cover:
- Health check and DB connectivity
- Guest session generation and JWT issuance
- Room code generation uniqueness
- Track SHA-256 checksum integrity
- NTP clock offset calculation formulas

### Running Backend Unit & API Tests:
```bash
cd backend
npm test
```

---

## 2. Multi-Device Physical Testing Guide

To test synchronized audio playback across 3 or more physical Android smartphones:

### Preparation:
1. Connect all smartphones to the **same Wi-Fi network** (5 GHz recommended for lower jitter).
2. Find the development machine's local IP address:
   ```bash
   # On macOS:
   ifconfig | grep "inet " | grep -v 127.0.0.1
   # e.g., 192.168.1.145
   ```
3. Update `mobile/src/constants/config.ts`:
   ```typescript
   export const DEFAULT_DEV_HOST = '192.168.1.145'; // Your LAN IP
   ```
4. Start backend:
   ```bash
   cd backend
   docker-compose up -d  # Start PostgreSQL
   npx prisma db push    # Apply schema
   npm run dev           # Start Express + Socket.IO
   ```
5. Install and launch the mobile application on Phone A, Phone B, and Phone C:
   ```bash
   cd mobile
   npx react-native run-android
   ```

### Execution Steps:
1. **Phone A (Host)**:
   - Tap **Create Room**.
   - Enter room name (e.g., "Hostel Beat Night").
   - Tap **Create & Start Hosting**.
   - Note the 6-character room code (or tap **QR** in the top right to show the QR code).

2. **Phone B & Phone C (Speakers)**:
   - Tap **Join Room**.
   - Enter the room code or point camera at Phone A's screen.
   - Tap **Connect to Room**.
   - Verify that Phone B and Phone C appear in Phone A's "Connected Speakers" list.

3. **Audio Preparation**:
   - On Phone A, tap **Library** $\to$ **+ Upload**.
   - Pick an MP3 or WAV audio file from the device storage.
   - Wait for upload to complete.
   - Tap the track $\to$ backend broadcasts `playback:prepare`.
   - Watch the status badges on all phones transition:
     `Preparing` $\to$ `Downloading (0% - 100%)` $\to$ `Ready`.

4. **Synchronized Playback**:
   - On Phone A, tap the green **Play** button.
   - The backend schedules playback 3 seconds in the future (`delayMs = 3000`).
   - All 3 phones start playing simultaneously at the target monotonic timestamp.

5. **Synchronization Evaluation**:
   - Tap **Sync Dashboard** on any phone.
   - Observe real-time metrics:
     - **Clock Offset** (typical on local Wi-Fi: $0\text{ms} - 30\text{ms}$)
     - **Network RTT** (typical on local Wi-Fi: $4\text{ms} - 25\text{ms}$)
     - **Playback Drift** (target: $< 50\text{ms}$)

6. **Drift Adjustment**:
   - If a specific phone hardware has inherent DAC latency, open **Calibrate** on that phone and adjust $+10\text{ms}$ or $-10\text{ms}$ to align its acoustic output with the rest of the room.

