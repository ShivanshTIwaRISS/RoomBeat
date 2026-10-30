# RoomBeat System Architecture

## 1. High-Level Overview

RoomBeat is architected as a distributed client-server audio system designed for synchronized multi-device wireless playback.

```
┌────────────────────────────────────────────────────────┐
│                   React Native Frontend                │
│                                                        │
│  UI Layer (Screens: Dashboard, Library, Queue, Sync)  │
│                           │                            │
│  State Management (Zustand: Session, Room, Playback)  │
│              │                          │              │
│       TanStack Query             Sync Engine           │
│       (REST Client)           (NTP + Drift Calc)       │
│              │                          │              │
│       Axios (HTTP API)           Socket.IO Client      │
│              │                          │              │
│              └────────────┬─────────────┘              │
│                           │                            │
│                  Native Audio Module                   │
│          (Kotlin / Android Media3 / ExoPlayer)         │
└───────────────────────────┼────────────────────────────┘
                            │
               HTTP / REST + WebSockets
                            │
┌───────────────────────────┼────────────────────────────┐
│                   Node.js Express Backend              │
│                                                        │
│              HTTP Endpoints + Socket.IO Server         │
│                           │                            │
│              JWT Auth & Rate Limiter Middleware        │
│                           │                            │
│         Domain Services (Room, Track, Queue, Playback) │
│                           │                            │
│              Prisma ORM (PostgreSQL 16)                │
└────────────────────────────────────────────────────────┘
```

---

## 2. Key Architecture Decisions

| Component | Choice | Rationale |
| :--- | :--- | :--- |
| **Mobile Runtime** | React Native + TypeScript | Cross-platform UI development with direct bridge access to native Android audio frameworks. |
| **Audio Engine** | Android Media3 / ExoPlayer | High reliability, low hardware buffer jitter, foreground service audio session support. |
| **State Management** | Zustand | Lightweight, outside-of-React state subscriptions, minimal re-renders for 60fps audio progress. |
| **Data Fetching** | TanStack Query + Axios | Automatic caching, stale-while-revalidate, retry mechanics for intermittent Wi-Fi. |
| **Real-time Comms** | Socket.IO | Multiplexed channels, binary/JSON support, auto-reconnect with room-based broadcast routing. |
| **Backend** | Express + TypeScript | Fast execution, native WebSocket integration, straightforward streaming with HTTP Range headers. |
| **Database** | PostgreSQL + Prisma ORM | ACID compliance for room states, unique constraints for room codes, fast indexing on active sessions. |

---

## 3. Data Flow

### A. Room Creation & Joining
1. Host enters room name and parameters $\to$ `POST /api/v1/rooms`.
2. Backend creates room record, assigns unique 6-character room code, and establishes host relationship.
3. Speakers enter code $\to$ `POST /api/v1/rooms/join` or scan QR code.
4. Sockets connect using guest session JWT $\to$ join Socket.IO room channel $\to$ exchange presence.

### B. Track Upload & Caching
1. Host selects audio file (MP3/WAV/M4A) $\to$ `POST /api/v1/rooms/:roomId/tracks`.
2. Backend validates MIME/extension, computes SHA-256 hash, stores file in `./uploads/`.
3. Host triggers `host:playback:prepare` $\to$ all speaker phones download file to disk cache via `GET /api/v1/tracks/:trackId/audio`.
4. Devices verify SHA-256 checksum and prepare native audio player.

### C. Synchronized Playback
1. Host presses **Play** $\to$ server computes future execution epoch $T_{\text{target}} = \text{now} + 3000\text{ms}$.
2. Server broadcasts `playback:scheduled` with $T_{\text{target}}$ and track sequence number.
3. Every device converts $T_{\text{target}}$ into local monotonic time using its NTP clock offset.
4. Native Android ExoPlayer schedules start at that exact monotonic timestamp.

---

## 4. Security & Privacy

1. **Guest Session Authentication**: Stateless JWT tokens containing device ID and session ID, validated on every REST route and Socket handshake.
2. **Host-Only Access Control**: Only the room host can prepare tracks, trigger playback commands, or reorder the queue.
3. **Upload Validation**: Strict MIME type checking and file size limits (50MB) with sanitization of uploaded filenames.
4. **Range Request Protection**: Byte-range parsing validates bounds to prevent denial-of-service memory exhaustion.

