# RoomBeat 🎵

### Every Phone. One Beat.

RoomBeat turns multiple smartphones into a synchronized wireless speaker system. Instead of using a single Bluetooth speaker, everyone connects their phones to the same RoomBeat session — all devices play the same music at the same time.

---

## 🚀 Features

- **Create & Join Rooms**: Host creates a room, others join via QR code or room code
- **Synchronized Playback**: All connected phones play the same track in sync
- **Real-time Controls**: Host controls playback (play, pause, seek, skip) across all devices
- **Music Library**: Upload and manage audio files (MP3, WAV, M4A)
- **Queue Management**: Build playlists with drag-to-reorder
- **Sync Dashboard**: Monitor clock offset, RTT, and playback drift per device
- **Device Calibration**: Fine-tune timing compensation per device
- **Background Playback**: Audio continues when app is backgrounded (Android)
- **Auto-Reconnect**: Handles network interruptions gracefully

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Native App                      │
│  ┌─────────┐ ┌──────────┐ ┌────────┐ ┌──────────────┐ │
│  │ Screens  │ │  Stores  │ │  Hooks │ │  API Client  │ │
│  └────┬─────┘ └────┬─────┘ └───┬────┘ └──────┬───────┘ │
│       │            │           │              │         │
│  ┌────▼────────────▼───────────▼──────────────▼───────┐ │
│  │          Socket.IO Client + Sync Engine            │ │
│  └────────────────────────┬───────────────────────────┘ │
│                           │                             │
│  ┌────────────────────────▼───────────────────────────┐ │
│  │     Native Audio Module (Kotlin / ExoPlayer)       │ │
│  │     - Monotonic clock access                       │ │
│  │     - Scheduled playback at precise timestamps     │ │
│  │     - Playback diagnostics                         │ │
│  └────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
                            │
                     WebSocket + HTTP
                            │
┌─────────────────────────────────────────────────────────┐
│                    Node.js Backend                       │
│  ┌───────────┐ ┌───────────┐ ┌──────────────────────┐  │
│  │  Express  │ │ Socket.IO │ │    Audio Storage     │  │
│  │  REST API │ │  Server   │ │  (File System)       │  │
│  └─────┬─────┘ └─────┬─────┘ └──────────────────────┘  │
│        │              │                                  │
│  ┌─────▼──────────────▼──────────────────────────────┐  │
│  │              Services Layer                        │  │
│  │   Session | Room | Track | Queue | Playback | Sync│  │
│  └──────────────────────┬────────────────────────────┘  │
│                         │                                │
│  ┌──────────────────────▼────────────────────────────┐  │
│  │            Prisma ORM → PostgreSQL                 │  │
│  └────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

## 📱 Tech Stack

### Mobile
- React Native + TypeScript
- Zustand (state management)
- TanStack Query (API data)
- Socket.IO Client (real-time)
- React Navigation
- Android ExoPlayer/Media3 (native audio)

### Backend
- Node.js + TypeScript + Express
- Socket.IO (real-time communication)
- Prisma ORM + PostgreSQL
- JWT authentication
- Multer (file uploads)
- Zod (validation)

## 📋 Prerequisites

- **Node.js** ≥ 18
- **npm** ≥ 9
- **Docker** & Docker Compose (for PostgreSQL)
- **Android Studio** with SDK 33+
- **Java** 17+
- **React Native CLI** environment set up
- Multiple Android phones on the same Wi-Fi network

## 🔧 Installation

### 1. Clone and install

```bash
cd RoomBeat

# Install backend dependencies
cd backend
npm install
cd ..

# Install mobile dependencies
cd mobile
npm install
cd ..
```

### 2. Environment setup

```bash
# Copy and edit environment file
cp .env.example backend/.env

# Edit backend/.env with your settings
# The defaults work for local development with Docker
```

### 3. Start PostgreSQL

```bash
docker-compose up -d
```

### 4. Initialize database

```bash
cd backend
npx prisma generate
npx prisma db push
```

### 5. Start backend

```bash
cd backend
npm run dev
```

The server starts on `http://localhost:3000`.

### 6. Configure mobile app

Edit `mobile/src/constants/config.js`:

```javascript
// Replace with your computer's LAN IP address
// Find it with: ifconfig | grep "inet " | grep -v 127.0.0.1
export const DEFAULT_DEV_HOST = '192.168.x.x';
```

> ⚠️ **IMPORTANT**: Physical Android phones cannot reach `localhost`. You MUST use your computer's local network IP address.

### 7. Run mobile app

```bash
cd mobile

# Start Metro bundler
npx react-native start

# In another terminal, run on Android
npx react-native run-android
```

## 📱 Multi-Device Testing

### Setup
1. Connect all Android phones to the same Wi-Fi network as your development machine
2. Get your machine's LAN IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`
3. Update `API_BASE_URL` in the mobile config
4. Build and install the app on each phone

### Test Flow
1. **Phone A**: Create a room → note the room code
2. **Phone B, C, D**: Join room using the code
3. **Phone A**: Upload an audio file
4. Wait for all devices to show "Ready" status
5. **Phone A**: Press Play
6. All phones should begin playback simultaneously
7. Check the Sync Dashboard for timing metrics

### Expected Performance
- **Target**: Median start-time difference < 50ms on stable LAN Wi-Fi
- **Note**: This is a software-estimated metric. Actual acoustic sync depends on device audio pipeline latency.

## 📡 API Documentation

See [docs/API.md](docs/API.md) for complete REST API documentation.

## 🔌 Socket Events

See [docs/SOCKET_EVENTS.md](docs/SOCKET_EVENTS.md) for all real-time events.

## 🔄 Sync Algorithm

See [docs/SYNC_ALGORITHM.md](docs/SYNC_ALGORITHM.md) for the synchronization design.

## 📁 Project Structure

```
RoomBeat/
├── mobile/                  # React Native app
│   ├── src/
│   │   ├── api/            # API client & endpoints
│   │   ├── audio/          # JS-side audio manager
│   │   ├── components/     # Reusable UI components
│   │   ├── constants/      # Colors, config
│   │   ├── hooks/          # Custom React hooks
│   │   ├── navigation/     # React Navigation setup
│   │   ├── screens/        # All app screens
│   │   ├── services/       # Socket.IO service
│   │   ├── store/          # Zustand stores
│   │   ├── sync/           # Clock sync engine
│   │   ├── theme/          # Design system
│   │   ├── types/          # TypeScript types
│   │   └── utils/          # Helpers
│   └── android/            # Native Android code
│       └── .../audio/      # Kotlin ExoPlayer module
├── backend/                # Node.js server
│   ├── src/
│   │   ├── config/         # Environment config
│   │   ├── controllers/    # Route handlers
│   │   ├── middleware/     # Auth, validation, errors
│   │   ├── routes/         # Express routes
│   │   ├── services/       # Business logic
│   │   ├── sockets/        # Socket.IO handlers
│   │   ├── validators/     # Zod schemas
│   │   ├── utils/          # Helpers
│   │   └── types/          # TypeScript types
│   ├── prisma/             # Database schema
│   └── uploads/            # Audio file storage
├── docs/                   # Documentation
├── docker-compose.yml      # PostgreSQL
└── .env.example            # Environment template
```

## ⚠️ Known Limitations

1. **Sync precision**: Synchronization is software-estimated. Actual acoustic synchronization depends on each device's audio pipeline latency and has not been independently measured with recording equipment.
2. **iOS**: Architecture is prepared for iOS but the native audio module currently targets Android only.
3. **Playback-speed correction**: Micro-corrections via playback speed adjustment are behind a feature flag and not enabled by default.
4. **Battery**: Continuous playback and network activity will consume battery. Background playback uses a foreground service notification.
5. **File size**: Audio uploads are limited to 50MB by default.
6. **Network**: All devices must be on the same network with reasonable latency to the backend server.

## 📄 License

Private project. All rights reserved.

## 🙏 Credits

Built with ❤️ using React Native, Node.js, ExoPlayer, and Socket.IO.

