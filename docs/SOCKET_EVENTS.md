# RoomBeat Socket.IO Real-Time Communication Specification

RoomBeat uses authenticated WebSocket connections via Socket.IO for real-time room presence, synchronized playback scheduling, and low-latency clock synchronization.

---

## 1. Authentication Handshake

Every client must provide a valid JWT guest session token in the handshake auth object or Authorization header:

```typescript
const socket = io('http://SERVER_IP:3000', {
  auth: { token: 'jwt_guest_session_token' },
  transports: ['websocket', 'polling'],
});
```

If the token is missing or invalid, connection is rejected with an Error.

---

## 2. Client-to-Server Events

### `room:join`
Join a room by ID.
```json
{
  "roomId": "uuid-v4",
  "code": "RB9481"
}
```
- **Permission**: Any authenticated session
- **Server Behavior**: Adds socket to Socket.IO room channel `roomId`, verifies active membership, emits `room:joined` back to client, and broadcasts `room:device:joined` to other room devices.

### `room:leave`
Leave a room.
```json
{
  "roomId": "uuid-v4"
}
```
- **Permission**: Any authenticated session
- **Server Behavior**: Removes socket from room channel, marks `RoomMember.isActive = false`, broadcasts `room:device:left`.

### `clock:ping`
High-frequency ping for NTP-style clock offset calculation.
```json
{
  "clientSendTime": 1730300000120
}
```
- **Permission**: Any connected client
- **Server Behavior**: Immediately responds with `clock:pong`.

### `device:ready`
Notifies that this phone has downloaded, verified SHA-256 checksum, and prepared the current audio track in its native ExoPlayer.
```json
{
  "roomId": "uuid-v4"
}
```
- **Permission**: Active room participant
- **Server Behavior**: Broadcasts `room:device:updated` with status `ready`.

### `device:heartbeat`
Periodic keep-alive sent every 2.5 - 5 seconds.
```json
{
  "roomId": "uuid-v4",
  "batteryLevel": 85,
  "volume": 0.8
}
```
- **Permission**: Active room participant
- **Server Behavior**: Updates `UserSession.lastSeenAt`, broadcasts live status.

### `device:playback:report`
Reports local audio position and calculated drift.
```json
{
  "roomId": "uuid-v4",
  "positionMs": 24500,
  "clockOffsetMs": 14.5,
  "roundTripTimeMs": 22.0,
  "playbackDriftMs": 8.2
}
```
- **Permission**: Active room participant
- **Server Behavior**: Records `SyncReport` in database, broadcasts `sync:updated` to room.

### `host:playback:prepare`
Host selects a track to be prepared on all connected speaker devices.
```json
{
  "roomId": "uuid-v4",
  "trackId": "uuid-v4"
}
```
- **Permission**: Room HOST only
- **Server Behavior**: Sets room playback state to `preparing`, increments `sequenceNumber`, broadcasts `playback:prepare` with track metadata and download URL.

### `host:playback:play`
Host starts synchronized playback.
```json
{
  "roomId": "uuid-v4",
  "positionMs": 0,
  "delayMs": 3000
}
```
- **Permission**: Room HOST only
- **Server Behavior**: Calculates `startAtServerEpochMs = Date.now() + delayMs`. Updates canonical playback state. Broadcasts `playback:scheduled`.

### `host:playback:pause`
Host pauses playback across all room devices.
```json
{
  "roomId": "uuid-v4"
}
```
- **Permission**: Room HOST only
- **Server Behavior**: Updates room status to `paused`, records current position, broadcasts `playback:pause`.

### `host:playback:seek`
Host seeks to a specific position across all room devices.
```json
{
  "roomId": "uuid-v4",
  "positionMs": 45000
}
```
- **Permission**: Room HOST only
- **Server Behavior**: Updates position, broadcasts `playback:seek`.

### `host:playback:stop`
Host stops playback and clears media on all phones.
```json
{
  "roomId": "uuid-v4"
}
```

---

## 3. Server-to-Client Events

### `clock:pong`
Response to `clock:ping`.
```json
{
  "clientSendTime": 1730300000120,
  "serverReceiveTime": 1730300000132,
  "serverSendTime": 1730300000132
}
```

### `playback:prepare`
Broadcast to all devices in the room to begin downloading and caching the audio track.
```json
{
  "trackId": "uuid-v4",
  "trackUrl": "/api/v1/tracks/uuid-v4/audio",
  "title": "Bohemian Rhapsody",
  "artist": "Queen",
  "durationMs": 354000,
  "checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
  "sequenceNumber": 1
}
```

### `playback:scheduled`
Crucial playback synchronization event.
```json
{
  "trackId": "uuid-v4",
  "positionMs": 0,
  "startAtServerEpochMs": 1730300003000,
  "sequenceNumber": 2
}
```

### `playback:pause`
```json
{
  "positionMs": 14200,
  "sequenceNumber": 3
}
```

### `playback:seek`
```json
{
  "positionMs": 45000,
  "sequenceNumber": 4
}
```

### `playback:stop`
```json
{
  "sequenceNumber": 5
}
```

### `queue:updated`
Broadcast when queue items are added, removed, or reordered.
```json
{
  "queue": [
    {
      "id": "uuid-v4",
      "trackId": "uuid-v4",
      "position": 0,
      "track": { "title": "Track 1", "artist": "Artist 1" }
    }
  ]
}
```

### `sync:updated`
Live diagnostics for host and speaker dashboards.
```json
{
  "sessionId": "uuid-v4",
  "displayName": "Shivansh Galaxy",
  "positionMs": 24500,
  "clockOffsetMs": 12.3,
  "playbackDriftMs": 4.1,
  "timestamp": 1730300005000
}
```

