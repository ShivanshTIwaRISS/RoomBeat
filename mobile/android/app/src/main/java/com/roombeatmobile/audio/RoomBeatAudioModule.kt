package com.roombeatmobile.audio

import android.content.Context
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.security.MessageDigest

/**
 * RoomBeatAudioModule — Native Android audio engine for synchronized playback.
 *
 * Exposes methods to React Native for:
 * - Getting monotonic time
 * - Preparing audio tracks
 * - Scheduling playback at precise monotonic timestamps
 * - Controlling playback (play, pause, seek, stop)
 * - Retrieving playback diagnostics
 */
class RoomBeatAudioModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "RoomBeatAudio"
        private const val TAG = "RoomBeatAudio"

        // Events emitted to JS
        const val EVENT_PLAYBACK_STATE_CHANGED = "onPlaybackStateChanged"
        const val EVENT_PLAYBACK_ERROR = "onPlaybackError"
        const val EVENT_TRACK_PREPARED = "onTrackPrepared"
        const val EVENT_PLAYBACK_POSITION = "onPlaybackPosition"
    }

    private var player: ExoPlayer? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var positionReportRunnable: Runnable? = null
    private var scheduledPlayRunnable: Runnable? = null
    private var isPrepared = false
    private var currentTrackUri: String? = null

    // Time reference: offset between System.nanoTime() / 1_000_000 and System.currentTimeMillis()
    // This helps map monotonic time to wall clock for server time correlation
    private val monotonicToEpochOffset: Long =
        System.currentTimeMillis() - (SystemClock.elapsedRealtime())

    override fun getName(): String = NAME

    override fun initialize() {
        super.initialize()
        mainHandler.post {
            initializePlayer()
        }
    }

    private fun initializePlayer() {
        if (player != null) return

        val context = reactApplicationContext
        player = ExoPlayer.Builder(context)
            .build()
            .apply {
                addListener(object : Player.Listener {
                    override fun onPlaybackStateChanged(playbackState: Int) {
                        val state = when (playbackState) {
                            Player.STATE_IDLE -> "idle"
                            Player.STATE_BUFFERING -> "buffering"
                            Player.STATE_READY -> {
                                if (!isPrepared) {
                                    isPrepared = true
                                    emitEvent(EVENT_TRACK_PREPARED, Arguments.createMap().apply {
                                        putString("uri", currentTrackUri)
                                        putDouble("durationMs", duration.toDouble())
                                    })
                                }
                                "ready"
                            }
                            Player.STATE_ENDED -> "ended"
                            else -> "unknown"
                        }
                        emitEvent(EVENT_PLAYBACK_STATE_CHANGED, Arguments.createMap().apply {
                            putString("state", state)
                            putBoolean("isPlaying", isPlaying)
                        })
                    }

                    override fun onIsPlayingChanged(isPlaying: Boolean) {
                        emitEvent(EVENT_PLAYBACK_STATE_CHANGED, Arguments.createMap().apply {
                            putString("state", if (isPlaying) "playing" else "paused")
                            putBoolean("isPlaying", isPlaying)
                        })

                        if (isPlaying) {
                            startPositionReporting()
                        } else {
                            stopPositionReporting()
                        }
                    }

                    override fun onPlayerError(error: PlaybackException) {
                        Log.e(TAG, "Playback error: ${error.message}", error)
                        emitEvent(EVENT_PLAYBACK_ERROR, Arguments.createMap().apply {
                            putString("message", error.message ?: "Unknown playback error")
                            putInt("code", error.errorCode)
                        })
                    }
                })
            }
        Log.d(TAG, "ExoPlayer initialized")
    }

    /**
     * Returns the current monotonic time in milliseconds.
     * Uses SystemClock.elapsedRealtime() which is not affected by
     * wall clock changes (NTP updates, user changes, etc.)
     */
    @ReactMethod
    fun getMonotonicTimeMs(promise: Promise) {
        try {
            val monotonicMs = SystemClock.elapsedRealtime()
            promise.resolve(monotonicMs.toDouble())
        } catch (e: Exception) {
            promise.reject("ERR_MONOTONIC_TIME", e.message, e)
        }
    }

    /**
     * Returns the current wall-clock epoch time in milliseconds.
     * Used alongside monotonic time for clock sync calculations.
     */
    @ReactMethod
    fun getEpochTimeMs(promise: Promise) {
        try {
            promise.resolve(System.currentTimeMillis().toDouble())
        } catch (e: Exception) {
            promise.reject("ERR_EPOCH_TIME", e.message, e)
        }
    }

    /**
     * Returns both monotonic and epoch time atomically for accurate offset calculation.
     */
    @ReactMethod
    fun getTimeSnapshot(promise: Promise) {
        try {
            val monotonic = SystemClock.elapsedRealtime()
            val epoch = System.currentTimeMillis()
            val result = Arguments.createMap().apply {
                putDouble("monotonicMs", monotonic.toDouble())
                putDouble("epochMs", epoch.toDouble())
            }
            promise.resolve(result)
        } catch (e: Exception) {
            promise.reject("ERR_TIME_SNAPSHOT", e.message, e)
        }
    }

    /**
     * Prepares a track for playback.
     * @param trackUri - Local file URI or HTTP URL
     */
    @ReactMethod
    fun prepare(trackUri: String, promise: Promise) {
        mainHandler.post {
            try {
                val p = player ?: run {
                    initializePlayer()
                    player!!
                }

                isPrepared = false
                currentTrackUri = trackUri

                val uri = if (trackUri.startsWith("http")) {
                    Uri.parse(trackUri)
                } else {
                    Uri.fromFile(File(trackUri))
                }

                val mediaItem = MediaItem.fromUri(uri)
                p.setMediaItem(mediaItem)
                p.prepare()

                Log.d(TAG, "Preparing track: $trackUri")
                promise.resolve(true)
            } catch (e: Exception) {
                Log.e(TAG, "Failed to prepare track: ${e.message}", e)
                promise.reject("ERR_PREPARE", e.message, e)
            }
        }
    }

    /**
     * Schedules playback to start at a specific monotonic time.
     *
     * This is the KEY synchronization primitive:
     * 1. Each device calculates its local target monotonic time from the server's startAtServerEpochMs
     * 2. The native module waits until that monotonic time to start playback
     * 3. This achieves better precision than JavaScript setTimeout
     *
     * @param positionMs - Seek position before playing
     * @param targetMonotonicMs - Monotonic clock time at which to start playback
     */
    @ReactMethod
    fun schedulePlay(positionMs: Double, targetMonotonicMs: Double, promise: Promise) {
        mainHandler.post {
            try {
                val p = player ?: throw IllegalStateException("Player not initialized")

                // Cancel any previously scheduled play
                scheduledPlayRunnable?.let { mainHandler.removeCallbacks(it) }

                // Seek to position first
                p.seekTo(positionMs.toLong())

                val now = SystemClock.elapsedRealtime()
                val delayMs = targetMonotonicMs.toLong() - now

                Log.d(TAG, "Scheduling play: position=$positionMs, targetMonotonic=$targetMonotonicMs, delay=${delayMs}ms")

                if (delayMs <= 0) {
                    // Target time already passed, play immediately
                    Log.w(TAG, "Target time already passed by ${-delayMs}ms, playing immediately")
                    p.play()
                    promise.resolve(Arguments.createMap().apply {
                        putBoolean("scheduled", true)
                        putDouble("actualDelay", 0.0)
                        putDouble("targetMissMs", (-delayMs).toDouble())
                    })
                } else {
                    // Schedule playback at the target time
                    val runnable = Runnable {
                        val actualTime = SystemClock.elapsedRealtime()
                        val jitter = actualTime - targetMonotonicMs.toLong()
                        Log.d(TAG, "Executing scheduled play, jitter: ${jitter}ms")
                        p.play()
                    }
                    scheduledPlayRunnable = runnable
                    mainHandler.postDelayed(runnable, delayMs)

                    promise.resolve(Arguments.createMap().apply {
                        putBoolean("scheduled", true)
                        putDouble("actualDelay", delayMs.toDouble())
                        putDouble("targetMissMs", 0.0)
                    })
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to schedule play: ${e.message}", e)
                promise.reject("ERR_SCHEDULE_PLAY", e.message, e)
            }
        }
    }

    /**
     * Start playback immediately at current position.
     */
    @ReactMethod
    fun play(promise: Promise) {
        mainHandler.post {
            try {
                val p = player ?: throw IllegalStateException("Player not initialized")
                p.play()
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR_PLAY", e.message, e)
            }
        }
    }

    /**
     * Pause playback.
     */
    @ReactMethod
    fun pause(promise: Promise) {
        mainHandler.post {
            try {
                val p = player ?: throw IllegalStateException("Player not initialized")
                p.pause()
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR_PAUSE", e.message, e)
            }
        }
    }

    /**
     * Seek to a specific position.
     */
    @ReactMethod
    fun seek(positionMs: Double, promise: Promise) {
        mainHandler.post {
            try {
                val p = player ?: throw IllegalStateException("Player not initialized")
                p.seekTo(positionMs.toLong())
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR_SEEK", e.message, e)
            }
        }
    }

    /**
     * Stop playback and release the current media.
     */
    @ReactMethod
    fun stop(promise: Promise) {
        mainHandler.post {
            try {
                val p = player ?: throw IllegalStateException("Player not initialized")
                scheduledPlayRunnable?.let { mainHandler.removeCallbacks(it) }
                p.stop()
                p.clearMediaItems()
                isPrepared = false
                currentTrackUri = null
                stopPositionReporting()
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR_STOP", e.message, e)
            }
        }
    }

    /**
     * Get current playback position in milliseconds.
     */
    @ReactMethod
    fun getPlaybackPosition(promise: Promise) {
        mainHandler.post {
            try {
                val p = player ?: throw IllegalStateException("Player not initialized")
                promise.resolve(Arguments.createMap().apply {
                    putDouble("positionMs", p.currentPosition.toDouble())
                    putDouble("durationMs", p.duration.toDouble())
                    putDouble("bufferedPositionMs", p.bufferedPosition.toDouble())
                    putBoolean("isPlaying", p.isPlaying)
                    putDouble("monotonicMs", SystemClock.elapsedRealtime().toDouble())
                })
            } catch (e: Exception) {
                promise.reject("ERR_POSITION", e.message, e)
            }
        }
    }

    /**
     * Get comprehensive playback diagnostics for sync monitoring.
     */
    @ReactMethod
    fun getPlaybackDiagnostics(promise: Promise) {
        mainHandler.post {
            try {
                val p = player ?: throw IllegalStateException("Player not initialized")

                val playbackState = when (p.playbackState) {
                    Player.STATE_IDLE -> "idle"
                    Player.STATE_BUFFERING -> "buffering"
                    Player.STATE_READY -> "ready"
                    Player.STATE_ENDED -> "ended"
                    else -> "unknown"
                }

                promise.resolve(Arguments.createMap().apply {
                    putDouble("positionMs", p.currentPosition.toDouble())
                    putDouble("durationMs", p.duration.toDouble())
                    putDouble("bufferedPositionMs", p.bufferedPosition.toDouble())
                    putBoolean("isPlaying", p.isPlaying)
                    putString("playbackState", playbackState)
                    putDouble("playbackSpeed", p.playbackParameters.speed.toDouble())
                    putDouble("monotonicMs", SystemClock.elapsedRealtime().toDouble())
                    putDouble("epochMs", System.currentTimeMillis().toDouble())
                    putString("trackUri", currentTrackUri ?: "")
                    putBoolean("isPrepared", isPrepared)
                    putDouble("volume", p.volume.toDouble())
                })
            } catch (e: Exception) {
                promise.reject("ERR_DIAGNOSTICS", e.message, e)
            }
        }
    }

    /**
     * Set playback volume (0.0 to 1.0).
     */
    @ReactMethod
    fun setVolume(volume: Double, promise: Promise) {
        mainHandler.post {
            try {
                val p = player ?: throw IllegalStateException("Player not initialized")
                p.volume = volume.toFloat().coerceIn(0f, 1f)
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR_VOLUME", e.message, e)
            }
        }
    }

    /**
     * Release the player and all resources.
     */
    @ReactMethod
    fun release(promise: Promise) {
        mainHandler.post {
            try {
                stopPositionReporting()
                scheduledPlayRunnable?.let { mainHandler.removeCallbacks(it) }
                player?.release()
                player = null
                isPrepared = false
                currentTrackUri = null
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR_RELEASE", e.message, e)
            }
        }
    }

    /**
     * Calculate SHA-256 checksum of a local file.
     */
    @ReactMethod
    fun getFileChecksum(filePath: String, promise: Promise) {
        Thread {
            try {
                val file = File(filePath)
                if (!file.exists()) {
                    promise.reject("ERR_FILE_NOT_FOUND", "File not found: $filePath")
                    return@Thread
                }

                val digest = MessageDigest.getInstance("SHA-256")
                file.inputStream().use { input ->
                    val buffer = ByteArray(8192)
                    var bytesRead: Int
                    while (input.read(buffer).also { bytesRead = it } != -1) {
                        digest.update(buffer, 0, bytesRead)
                    }
                }

                val hash = digest.digest().joinToString("") { "%02x".format(it) }
                promise.resolve(hash)
            } catch (e: Exception) {
                promise.reject("ERR_CHECKSUM", e.message, e)
            }
        }.start()
    }

    // --- Private helpers ---

    private fun startPositionReporting() {
        stopPositionReporting()
        positionReportRunnable = object : Runnable {
            override fun run() {
                player?.let { p ->
                    if (p.isPlaying) {
                        emitEvent(EVENT_PLAYBACK_POSITION, Arguments.createMap().apply {
                            putDouble("positionMs", p.currentPosition.toDouble())
                            putDouble("durationMs", p.duration.toDouble())
                            putDouble("monotonicMs", SystemClock.elapsedRealtime().toDouble())
                            putBoolean("isPlaying", true)
                        })
                        mainHandler.postDelayed(this, 1000) // Report every 1 second
                    }
                }
            }
        }
        mainHandler.post(positionReportRunnable!!)
    }

    private fun stopPositionReporting() {
        positionReportRunnable?.let { mainHandler.removeCallbacks(it) }
        positionReportRunnable = null
    }

    private fun emitEvent(eventName: String, params: WritableMap) {
        try {
            reactApplicationContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                .emit(eventName, params)
        } catch (e: Exception) {
            Log.e(TAG, "Failed to emit event $eventName: ${e.message}")
        }
    }

    override fun onCatalystInstanceDestroy() {
        mainHandler.post {
            stopPositionReporting()
            scheduledPlayRunnable?.let { mainHandler.removeCallbacks(it) }
            player?.release()
            player = null
        }
    }
}

