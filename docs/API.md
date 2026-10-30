# RoomBeat REST API Documentation

> **Base URL:** `http://<host>:3000/api/v1`
>
> **Authentication:** All endpoints (except session creation and health) require a Bearer token in the `Authorization` header:
> ```
> Authorization: Bearer <accessToken>
> ```
> Tokens are obtained from the `POST /api/v1/sessions/guest` endpoint.

## Response Format

All API responses follow a consistent envelope:

**Success:**
```json
{
  "success": true,
  "message": "Descriptive success message",
  "data": { }
}
```

**Error:**
```json
{
  "success": false,
  "message": "Descriptive error message",
  "error": {
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

---

## Table of Contents

- [Health](#health)
- [Sessions](#sessions)
- [Rooms](#rooms)
- [Tracks](#tracks)
- [Queue](#queue)
- [Playback](#playback)
- [Sync](#sync)

---

## Health

### `GET /api/v1/health`

Health check endpoint. No authentication required.

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Server is healthy",
  "data": {
    "status": "ok",
    "uptime": 12345,
    "timestamp": "2026-10-30T12:00:00.000Z"
  }
}
```

---

## Sessions

### `POST /api/v1/sessions/guest`

Create a new guest session. No authentication required.

**Request Body:**
```json
{
  "displayName": "Alice's Phone",
  "deviceId": "unique-device-uuid-v4",
  "deviceName": "Pixel 8 Pro",
  "platform": "android",
  "appVersion": "1.0.0"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `displayName` | string | ✅ | Human-readable name for this device/user |
| `deviceId` | string | ✅ | Unique device identifier (UUID v4) |
| `deviceName` | string | ✅ | Device model or name |
| `platform` | string | ❌ | `"android"` (default), `"ios"`, `"web"` |
| `appVersion` | string | ❌ | Client application version |

**Response `201 Created`:**
```json
{
  "success": true,
  "message": "Guest session created",
  "data": {
    "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresAt": "2026-11-06T12:00:00.000Z",
    "displayName": "Alice's Phone",
    "deviceId": "unique-device-uuid-v4",
    "deviceName": "Pixel 8 Pro",
    "platform": "android"
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `400` | `VALIDATION_ERROR` | Missing or invalid fields |
| `409` | `DEVICE_EXISTS` | A session already exists for this `deviceId` |

**Notes:**
- The `accessToken` is a JWT signed with the server's secret, valid for 7 days by default.
- The token payload contains `{ sessionId, deviceId }`.
- Store the token securely on the client for all subsequent requests.

---

### `GET /api/v1/sessions/me`

Get the current session's details.

**Auth Required:** ✅ Bearer Token

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Session retrieved",
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "displayName": "Alice's Phone",
    "deviceId": "unique-device-uuid-v4",
    "deviceName": "Pixel 8 Pro",
    "platform": "android",
    "appVersion": "1.0.0",
    "lastSeenAt": "2026-10-30T12:05:00.000Z",
    "connectionStatus": "online",
    "createdAt": "2026-10-30T12:00:00.000Z",
    "expiresAt": "2026-11-06T12:00:00.000Z"
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `401` | `AUTH_REQUIRED` | No `Authorization` header |
| `401` | `INVALID_TOKEN` | Malformed or expired JWT |
| `401` | `SESSION_NOT_FOUND` | Session deleted or does not exist |
| `401` | `SESSION_EXPIRED` | Session past `expiresAt` |

---

### `DELETE /api/v1/sessions/me`

Destroy the current session and invalidate the token.

**Auth Required:** ✅ Bearer Token

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Session destroyed",
  "data": null
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `401` | `AUTH_REQUIRED` | No `Authorization` header |
| `401` | `INVALID_TOKEN` | Malformed or expired JWT |

**Notes:**
- The session row is deleted from the database.
- The device is automatically removed from any rooms it had joined.
- Any rooms where this session was the host may be closed or transferred.

---

## Rooms

### `POST /api/v1/rooms`

Create a new room. The authenticated session becomes the host.

**Auth Required:** ✅ Bearer Token

**Request Body:**
```json
{
  "name": "Living Room Party",
  "isPrivate": false,
  "maxDevices": 10
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | ✅ | — | Room display name |
| `isPrivate` | boolean | ❌ | `false` | If `true`, room won't appear in public listings |
| `maxDevices` | number | ❌ | `10` | Maximum connected devices (1–50) |

**Response `201 Created`:**
```json
{
  "success": true,
  "message": "Room created",
  "data": {
    "id": "room-uuid-1234",
    "name": "Living Room Party",
    "code": "A7X9K2",
    "hostSessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "isPrivate": false,
    "maxDevices": 10,
    "status": "active",
    "createdAt": "2026-10-30T12:00:00.000Z",
    "expiresAt": "2026-10-31T12:00:00.000Z"
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `400` | `VALIDATION_ERROR` | Invalid field values |
| `401` | `AUTH_REQUIRED` | Not authenticated |

**Notes:**
- The room `code` is a randomly generated 6-character alphanumeric string used for joining.
- Rooms expire 24 hours after creation by default.
- The host is automatically added as a `RoomMember` with the role `HOST`.

---

### `GET /api/v1/rooms/:roomId`

Get room details by ID.

**Auth Required:** ✅ Bearer Token

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room's unique identifier |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Room retrieved",
  "data": {
    "id": "room-uuid-1234",
    "name": "Living Room Party",
    "code": "A7X9K2",
    "hostSessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "isPrivate": false,
    "maxDevices": 10,
    "status": "active",
    "createdAt": "2026-10-30T12:00:00.000Z",
    "expiresAt": "2026-10-31T12:00:00.000Z",
    "memberCount": 3,
    "members": [
      {
        "id": "member-uuid",
        "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "displayName": "Alice's Phone",
        "role": "HOST",
        "isActive": true,
        "joinedAt": "2026-10-30T12:00:00.000Z"
      }
    ]
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `404` | `ROOM_NOT_FOUND` | Room does not exist or has expired |

---

### `GET /api/v1/rooms/by-code/:code`

Look up a room by its join code.

**Auth Required:** ✅ Bearer Token

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `code` | string | The 6-character room join code |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Room found",
  "data": {
    "id": "room-uuid-1234",
    "name": "Living Room Party",
    "code": "A7X9K2",
    "hostSessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "isPrivate": false,
    "maxDevices": 10,
    "status": "active",
    "memberCount": 3
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `404` | `ROOM_NOT_FOUND` | No active room with this code |

---

### `POST /api/v1/rooms/join`

Join an existing room by code.

**Auth Required:** ✅ Bearer Token

**Request Body:**
```json
{
  "code": "A7X9K2"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `code` | string | ✅ | The 6-character room join code |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Joined room",
  "data": {
    "roomId": "room-uuid-1234",
    "role": "SPEAKER",
    "room": {
      "id": "room-uuid-1234",
      "name": "Living Room Party",
      "code": "A7X9K2",
      "status": "active"
    }
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `400` | `VALIDATION_ERROR` | Missing code |
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `404` | `ROOM_NOT_FOUND` | No active room with this code |
| `409` | `ALREADY_JOINED` | Session is already a member of this room |
| `403` | `ROOM_FULL` | Room has reached `maxDevices` |

**Notes:**
- New members join with the `SPEAKER` role by default.
- A `room:device:joined` socket event is broadcast to existing room members.

---

### `POST /api/v1/rooms/:roomId/leave`

Leave a room.

**Auth Required:** ✅ Bearer Token

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room to leave |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Left room",
  "data": null
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `404` | `ROOM_NOT_FOUND` | Room does not exist |
| `404` | `NOT_A_MEMBER` | Session is not a member of this room |

**Notes:**
- If the host leaves, host is transferred to the next member or the room is closed if empty.
- A `room:device:left` socket event is broadcast to remaining members.

---

### `GET /api/v1/rooms/:roomId/devices`

List all devices (members) currently in a room.

**Auth Required:** ✅ Bearer Token

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room ID |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Devices retrieved",
  "data": {
    "devices": [
      {
        "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "displayName": "Alice's Phone",
        "deviceName": "Pixel 8 Pro",
        "platform": "android",
        "role": "HOST",
        "isActive": true,
        "connectionStatus": "online",
        "joinedAt": "2026-10-30T12:00:00.000Z"
      },
      {
        "sessionId": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
        "displayName": "Bob's Tablet",
        "deviceName": "Galaxy Tab S9",
        "platform": "android",
        "role": "SPEAKER",
        "isActive": true,
        "connectionStatus": "online",
        "joinedAt": "2026-10-30T12:01:00.000Z"
      }
    ],
    "count": 2
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `404` | `ROOM_NOT_FOUND` | Room does not exist |

---

### `PATCH /api/v1/rooms/:roomId/settings`

Update room settings. **Host only.**

**Auth Required:** ✅ Bearer Token (must be host)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room to update |

**Request Body:**
```json
{
  "name": "Updated Room Name",
  "isPrivate": true,
  "maxDevices": 20
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | ❌ | New room name |
| `isPrivate` | boolean | ❌ | Toggle private mode |
| `maxDevices` | number | ❌ | New device limit (1–50) |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Room settings updated",
  "data": {
    "id": "room-uuid-1234",
    "name": "Updated Room Name",
    "isPrivate": true,
    "maxDevices": 20
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `400` | `VALIDATION_ERROR` | Invalid field values |
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `403` | `NOT_HOST` | Only the host can modify room settings |
| `404` | `ROOM_NOT_FOUND` | Room does not exist |

---

### `POST /api/v1/rooms/:roomId/host/transfer`

Transfer host role to another member. **Host only.**

**Auth Required:** ✅ Bearer Token (must be host)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room ID |

**Request Body:**
```json
{
  "targetSessionId": "b2c3d4e5-f6a7-8901-bcde-f12345678901"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `targetSessionId` | string | ✅ | Session ID of the new host |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Host transferred",
  "data": {
    "roomId": "room-uuid-1234",
    "previousHostId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "newHostId": "b2c3d4e5-f6a7-8901-bcde-f12345678901"
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `400` | `VALIDATION_ERROR` | Missing `targetSessionId` |
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `403` | `NOT_HOST` | Only the current host can transfer |
| `404` | `ROOM_NOT_FOUND` | Room does not exist |
| `404` | `TARGET_NOT_MEMBER` | Target session is not a room member |

---

### `DELETE /api/v1/rooms/:roomId`

Close and delete a room. **Host only.**

**Auth Required:** ✅ Bearer Token (must be host)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room to delete |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Room closed",
  "data": null
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `403` | `NOT_HOST` | Only the host can close the room |
| `404` | `ROOM_NOT_FOUND` | Room does not exist |

**Notes:**
- All members are removed and receive a `room:closed` socket event.
- Associated tracks, queue items, playback state, and sync reports are cascade deleted.

---

## Tracks

### `POST /api/v1/rooms/:roomId/tracks`

Upload an audio track to a room. Uses `multipart/form-data`.

**Auth Required:** ✅ Bearer Token (must be room member)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room to upload to |

**Request Body (`multipart/form-data`):**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `audio` | file | ✅ | Audio file (see allowed MIME types below) |
| `title` | string | ✅ | Track title |
| `artist` | string | ❌ | Artist name (default: `"Unknown"`) |
| `durationMs` | number | ❌ | Track duration in milliseconds |

**Allowed MIME types:**
- `audio/mpeg`, `audio/mp3`
- `audio/wav`, `audio/wave`, `audio/x-wav`
- `audio/ogg`
- `audio/flac`
- `audio/aac`
- `audio/mp4`, `audio/x-m4a`
- `audio/webm`

**Max file size:** 50 MB (52,428,800 bytes)

**Response `201 Created`:**
```json
{
  "success": true,
  "message": "Track uploaded",
  "data": {
    "id": "track-uuid-5678",
    "roomId": "room-uuid-1234",
    "filename": "song.mp3",
    "title": "My Song",
    "artist": "DJ Alice",
    "durationMs": 240000,
    "fileSize": 8456789,
    "mimeType": "audio/mpeg",
    "checksum": "sha256:abc123def456...",
    "uploadedBy": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "createdAt": "2026-10-30T12:10:00.000Z"
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `400` | `VALIDATION_ERROR` | Missing title or audio file |
| `400` | `INVALID_FILE_TYPE` | Unsupported MIME type |
| `400` | `FILE_TOO_LARGE` | Exceeds 50 MB limit |
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `403` | `NOT_A_MEMBER` | Not a member of this room |
| `404` | `ROOM_NOT_FOUND` | Room does not exist |

**Notes:**
- A SHA-256 checksum is computed from the file contents for integrity verification.
- The file is stored at `<UPLOAD_DIR>/<roomId>/<trackId>.<ext>`.
- Clients use the checksum to verify file integrity after download.

---

### `GET /api/v1/rooms/:roomId/tracks`

List all tracks in a room.

**Auth Required:** ✅ Bearer Token

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room ID |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Tracks retrieved",
  "data": {
    "tracks": [
      {
        "id": "track-uuid-5678",
        "title": "My Song",
        "artist": "DJ Alice",
        "durationMs": 240000,
        "fileSize": 8456789,
        "mimeType": "audio/mpeg",
        "checksum": "sha256:abc123def456...",
        "uploadedBy": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "createdAt": "2026-10-30T12:10:00.000Z"
      }
    ],
    "count": 1
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `404` | `ROOM_NOT_FOUND` | Room does not exist |

---

### `GET /api/v1/tracks/:trackId`

Get track metadata by ID.

**Auth Required:** ✅ Bearer Token

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `trackId` | string (UUID) | The track's unique identifier |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Track retrieved",
  "data": {
    "id": "track-uuid-5678",
    "roomId": "room-uuid-1234",
    "filename": "song.mp3",
    "title": "My Song",
    "artist": "DJ Alice",
    "durationMs": 240000,
    "fileSize": 8456789,
    "mimeType": "audio/mpeg",
    "checksum": "sha256:abc123def456...",
    "uploadedBy": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "createdAt": "2026-10-30T12:10:00.000Z"
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `404` | `TRACK_NOT_FOUND` | Track does not exist |

---

### `GET /api/v1/tracks/:trackId/audio`

Stream or download the audio file. Supports HTTP `Range` requests for partial content.

**Auth Required:** ✅ Bearer Token

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `trackId` | string (UUID) | The track's unique identifier |

**Request Headers (optional):**
```
Range: bytes=0-1048575
```

**Response `200 OK` / `206 Partial Content`:**
- **Content-Type:** The track's MIME type (e.g., `audio/mpeg`)
- **Content-Length:** Total file size or range size
- **Accept-Ranges:** `bytes`
- **Content-Range** (for `206`): `bytes 0-1048575/8456789`
- **Body:** Raw audio bytes

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `404` | `TRACK_NOT_FOUND` | Track does not exist |
| `404` | `FILE_NOT_FOUND` | Audio file missing on disk |
| `416` | `RANGE_NOT_SATISFIABLE` | Invalid byte range |

**Notes:**
- Mobile clients should use `Range` requests for efficient streaming and resume support.
- The response includes `Accept-Ranges: bytes` to indicate range support.

---

### `DELETE /api/v1/rooms/:roomId/tracks/:trackId`

Delete a track from a room. **Host or uploader only.**

**Auth Required:** ✅ Bearer Token (must be host or the uploader)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room ID |
| `trackId` | string (UUID) | The track to delete |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Track deleted",
  "data": null
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `403` | `NOT_AUTHORIZED` | Not the host or the uploader |
| `404` | `ROOM_NOT_FOUND` | Room does not exist |
| `404` | `TRACK_NOT_FOUND` | Track does not exist |

**Notes:**
- The audio file is deleted from disk.
- Any queue items referencing this track are also removed.
- If the track is currently playing, playback is stopped.

---

## Queue

### `GET /api/v1/rooms/:roomId/queue`

Get the current playback queue for a room.

**Auth Required:** ✅ Bearer Token

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room ID |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Queue retrieved",
  "data": {
    "queue": [
      {
        "id": "queue-item-uuid-1",
        "trackId": "track-uuid-5678",
        "position": 0,
        "addedAt": "2026-10-30T12:15:00.000Z",
        "track": {
          "id": "track-uuid-5678",
          "title": "My Song",
          "artist": "DJ Alice",
          "durationMs": 240000,
          "filename": "song.mp3"
        }
      },
      {
        "id": "queue-item-uuid-2",
        "trackId": "track-uuid-9012",
        "position": 1,
        "addedAt": "2026-10-30T12:16:00.000Z",
        "track": {
          "id": "track-uuid-9012",
          "title": "Another Song",
          "artist": "DJ Bob",
          "durationMs": 180000,
          "filename": "another.mp3"
        }
      }
    ],
    "count": 2
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `404` | `ROOM_NOT_FOUND` | Room does not exist |

---

### `POST /api/v1/rooms/:roomId/queue`

Add a track to the end of the queue.

**Auth Required:** ✅ Bearer Token (must be room member)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room ID |

**Request Body:**
```json
{
  "trackId": "track-uuid-5678"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `trackId` | string | ✅ | ID of the track to add |

**Response `201 Created`:**
```json
{
  "success": true,
  "message": "Track added to queue",
  "data": {
    "id": "queue-item-uuid-1",
    "trackId": "track-uuid-5678",
    "position": 0,
    "addedAt": "2026-10-30T12:15:00.000Z"
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `400` | `VALIDATION_ERROR` | Missing `trackId` |
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `403` | `NOT_A_MEMBER` | Not a member of this room |
| `404` | `ROOM_NOT_FOUND` | Room does not exist |
| `404` | `TRACK_NOT_FOUND` | Track does not exist in this room |

**Notes:**
- The track is appended at the next available position.
- A `queue:updated` socket event is broadcast to all room members.

---

### `PATCH /api/v1/rooms/:roomId/queue/reorder`

Reorder a queue item. **Host only.**

**Auth Required:** ✅ Bearer Token (must be host)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room ID |

**Request Body:**
```json
{
  "itemId": "queue-item-uuid-1",
  "newPosition": 2
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `itemId` | string | ✅ | Queue item ID to move |
| `newPosition` | number | ✅ | Target position (0-based) |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Queue reordered",
  "data": {
    "queue": [
      {
        "id": "queue-item-uuid-2",
        "trackId": "track-uuid-9012",
        "position": 0
      },
      {
        "id": "queue-item-uuid-3",
        "trackId": "track-uuid-3456",
        "position": 1
      },
      {
        "id": "queue-item-uuid-1",
        "trackId": "track-uuid-5678",
        "position": 2
      }
    ]
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `400` | `VALIDATION_ERROR` | Missing fields or invalid position |
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `403` | `NOT_HOST` | Only the host can reorder |
| `404` | `ROOM_NOT_FOUND` | Room does not exist |
| `404` | `ITEM_NOT_FOUND` | Queue item does not exist |

---

### `DELETE /api/v1/rooms/:roomId/queue/:itemId`

Remove a single item from the queue. **Host only.**

**Auth Required:** ✅ Bearer Token (must be host)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room ID |
| `itemId` | string (UUID) | The queue item to remove |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Queue item removed",
  "data": null
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `403` | `NOT_HOST` | Only the host can remove queue items |
| `404` | `ROOM_NOT_FOUND` | Room does not exist |
| `404` | `ITEM_NOT_FOUND` | Queue item does not exist |

**Notes:**
- Remaining items are re-indexed to fill the gap.
- A `queue:updated` socket event is broadcast.

---

### `DELETE /api/v1/rooms/:roomId/queue`

Clear the entire queue. **Host only.**

**Auth Required:** ✅ Bearer Token (must be host)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room ID |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Queue cleared",
  "data": null
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `403` | `NOT_HOST` | Only the host can clear the queue |
| `404` | `ROOM_NOT_FOUND` | Room does not exist |

---

## Playback

All playback endpoints are **host only** (except `GET` for state).

### `GET /api/v1/rooms/:roomId/playback`

Get current playback state.

**Auth Required:** ✅ Bearer Token

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room ID |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Playback state retrieved",
  "data": {
    "currentTrackId": "track-uuid-5678",
    "positionMs": 45000,
    "status": "playing",
    "serverStartAt": "1698667200000",
    "sequenceNumber": 5,
    "track": {
      "id": "track-uuid-5678",
      "title": "My Song",
      "artist": "DJ Alice",
      "durationMs": 240000
    }
  }
}
```

**Playback status values:** `idle`, `preparing`, `playing`, `paused`, `stopped`

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `404` | `ROOM_NOT_FOUND` | Room does not exist |

---

### `POST /api/v1/rooms/:roomId/playback/prepare`

Prepare a track for playback. Notifies all devices to download/buffer the track.

**Auth Required:** ✅ Bearer Token (must be host)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room ID |

**Request Body:**
```json
{
  "trackId": "track-uuid-5678"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `trackId` | string | ✅ | Track to prepare |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Track preparation started",
  "data": {
    "trackId": "track-uuid-5678",
    "status": "preparing"
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `400` | `VALIDATION_ERROR` | Missing `trackId` |
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `403` | `NOT_HOST` | Only the host can control playback |
| `404` | `ROOM_NOT_FOUND` | Room does not exist |
| `404` | `TRACK_NOT_FOUND` | Track does not exist |

**Notes:**
- Broadcasts `playback:prepare` to all room devices via Socket.IO.
- Devices should download the track audio and report `device:ready` when buffered.
- The playback state transitions to `preparing`.

---

### `POST /api/v1/rooms/:roomId/playback/play`

Start or resume playback with synchronized timing.

**Auth Required:** ✅ Bearer Token (must be host)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room ID |

**Request Body:**
```json
{
  "positionMs": 0,
  "delayMs": 3000
}
```

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `positionMs` | number | ❌ | Current position | Start position in milliseconds |
| `delayMs` | number | ❌ | `3000` | Delay before playback begins (gives devices time to prepare) |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Playback started",
  "data": {
    "status": "playing",
    "positionMs": 0,
    "startAtServerEpochMs": 1698667203000,
    "sequenceNumber": 6
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `403` | `NOT_HOST` | Only the host can control playback |
| `404` | `ROOM_NOT_FOUND` | Room does not exist |
| `409` | `NO_TRACK_PREPARED` | No track has been prepared |

**Notes:**
- The server calculates `startAtServerEpochMs = Date.now() + delayMs`.
- A `playback:scheduled` event is broadcast with the absolute server epoch time.
- Each device converts to local time using its clock offset and starts playback at the calculated local time.
- The `sequenceNumber` is incremented to prevent stale commands from being processed.

---

### `POST /api/v1/rooms/:roomId/playback/pause`

Pause playback on all devices.

**Auth Required:** ✅ Bearer Token (must be host)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room ID |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Playback paused",
  "data": {
    "status": "paused",
    "positionMs": 45000,
    "sequenceNumber": 7
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `403` | `NOT_HOST` | Only the host can control playback |
| `404` | `ROOM_NOT_FOUND` | Room does not exist |
| `409` | `NOT_PLAYING` | Nothing is currently playing |

---

### `POST /api/v1/rooms/:roomId/playback/seek`

Seek to a specific position in the current track.

**Auth Required:** ✅ Bearer Token (must be host)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room ID |

**Request Body:**
```json
{
  "positionMs": 120000
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `positionMs` | number | ✅ | Target position in milliseconds |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Seeked to position",
  "data": {
    "positionMs": 120000,
    "sequenceNumber": 8
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `400` | `VALIDATION_ERROR` | Missing or invalid `positionMs` |
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `403` | `NOT_HOST` | Only the host can control playback |
| `404` | `ROOM_NOT_FOUND` | Room does not exist |
| `409` | `NO_ACTIVE_TRACK` | No track is currently active |

---

### `POST /api/v1/rooms/:roomId/playback/next`

Skip to the next track in the queue.

**Auth Required:** ✅ Bearer Token (must be host)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room ID |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Skipped to next track",
  "data": {
    "trackId": "track-uuid-9012",
    "status": "preparing",
    "sequenceNumber": 9
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `403` | `NOT_HOST` | Only the host can control playback |
| `404` | `ROOM_NOT_FOUND` | Room does not exist |
| `404` | `QUEUE_EMPTY` | No next track in queue |

---

### `POST /api/v1/rooms/:roomId/playback/previous`

Go back to the previous track in the queue.

**Auth Required:** ✅ Bearer Token (must be host)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room ID |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Went to previous track",
  "data": {
    "trackId": "track-uuid-5678",
    "status": "preparing",
    "sequenceNumber": 10
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `403` | `NOT_HOST` | Only the host can control playback |
| `404` | `ROOM_NOT_FOUND` | Room does not exist |
| `404` | `NO_PREVIOUS_TRACK` | Already at the beginning of the queue |

---

### `POST /api/v1/rooms/:roomId/playback/stop`

Stop playback entirely and reset state to idle.

**Auth Required:** ✅ Bearer Token (must be host)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room ID |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Playback stopped",
  "data": {
    "status": "idle",
    "sequenceNumber": 11
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `403` | `NOT_HOST` | Only the host can control playback |
| `404` | `ROOM_NOT_FOUND` | Room does not exist |

---

## Sync

### `POST /api/v1/rooms/:roomId/sync/report`

Submit a synchronization report from a device.

**Auth Required:** ✅ Bearer Token (must be room member)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room ID |

**Request Body:**
```json
{
  "clockOffsetMs": -12.5,
  "roundTripTimeMs": 25.3,
  "playbackDriftMs": 5.2,
  "positionMs": 45000
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `clockOffsetMs` | number | ✅ | Estimated clock offset from server (ms) |
| `roundTripTimeMs` | number | ✅ | Round-trip time of the measurement (ms) |
| `playbackDriftMs` | number | ❌ | Current drift from expected playback position |
| `positionMs` | number | ❌ | Current playback position on this device |

**Response `201 Created`:**
```json
{
  "success": true,
  "message": "Sync report recorded",
  "data": {
    "id": "report-uuid-1234",
    "roomId": "room-uuid-1234",
    "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "clockOffsetMs": -12.5,
    "roundTripTimeMs": 25.3,
    "playbackDriftMs": 5.2,
    "positionMs": 45000,
    "recordedAt": "2026-10-30T12:20:00.000Z"
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `400` | `VALIDATION_ERROR` | Missing required fields |
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `403` | `NOT_A_MEMBER` | Not a member of this room |
| `404` | `ROOM_NOT_FOUND` | Room does not exist |

---

### `GET /api/v1/rooms/:roomId/sync/report`

Get recent sync reports for a room. **Host only.**

**Auth Required:** ✅ Bearer Token (must be host)

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room ID |

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `limit` | number | `50` | Max number of reports |
| `sessionId` | string | — | Filter by device session |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Sync reports retrieved",
  "data": {
    "reports": [
      {
        "id": "report-uuid-1234",
        "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        "displayName": "Alice's Phone",
        "clockOffsetMs": -12.5,
        "roundTripTimeMs": 25.3,
        "playbackDriftMs": 5.2,
        "positionMs": 45000,
        "recordedAt": "2026-10-30T12:20:00.000Z"
      }
    ],
    "count": 1
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `403` | `NOT_HOST` | Only the host can view sync reports |
| `404` | `ROOM_NOT_FOUND` | Room does not exist |

---

### `PATCH /api/v1/rooms/:roomId/devices/:deviceId/settings`

Update device-specific settings. **Device owner or host only.**

**Auth Required:** ✅ Bearer Token

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `roomId` | string (UUID) | The room ID |
| `deviceId` | string (UUID) | The session ID of the device |

**Request Body:**
```json
{
  "localVolume": 0.8,
  "latencyCompensationMs": 50
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `localVolume` | number | ❌ | Volume level 0.0–1.0 |
| `latencyCompensationMs` | number | ❌ | Milliseconds to offset playback start for this device |

**Response `200 OK`:**
```json
{
  "success": true,
  "message": "Device settings updated",
  "data": {
    "sessionId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "localVolume": 0.8,
    "latencyCompensationMs": 50
  }
}
```

**Error Codes:**
| Status | Code | Description |
|--------|------|-------------|
| `400` | `VALIDATION_ERROR` | Invalid field values |
| `401` | `AUTH_REQUIRED` | Not authenticated |
| `403` | `NOT_AUTHORIZED` | Not the device owner or host |
| `404` | `ROOM_NOT_FOUND` | Room does not exist |
| `404` | `DEVICE_NOT_FOUND` | Device is not a member of this room |

**Notes:**
- `latencyCompensationMs` is added to the device's start time to account for known audio pipeline delays.
- A `room:device:updated` socket event is broadcast when settings change.
