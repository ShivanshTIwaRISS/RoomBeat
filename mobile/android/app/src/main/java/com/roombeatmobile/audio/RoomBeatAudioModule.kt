package com.roombeatmobile.audio

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.provider.MediaStore
import android.provider.OpenableColumns
import android.util.Log
import androidx.media3.common.AudioAttributes
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.io.File
import java.io.FileOutputStream
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

        const val REQUEST_CODE_PICK_AUDIO = 8492
        const val REQUEST_CODE_SCAN_QR = 8493
    }

    private var player: ExoPlayer? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    private var positionReportRunnable: Runnable? = null
    private var scheduledPlayRunnable: Runnable? = null
    private var isPrepared = false
    private var currentTrackUri: String? = null

    private var pickAudioPromise: Promise? = null
    private var scanQrPromise: Promise? = null

    init {
        reactContext.addActivityEventListener(object : BaseActivityEventListener() {
            override fun onActivityResult(activity: Activity, requestCode: Int, resultCode: Int, data: Intent?) {
                if (requestCode == REQUEST_CODE_PICK_AUDIO) {
                    if (resultCode == Activity.RESULT_OK && data?.data != null) {
                        try {
                            val uri = data.data!!
                            val contentResolver = reactApplicationContext.contentResolver
                            var fileName = "track_${System.currentTimeMillis()}.mp3"
                            contentResolver.query(uri, null, null, null, null)?.use { cursor ->
                                val nameIndex = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                                if (nameIndex != -1 && cursor.moveToFirst()) {
                                    val name = cursor.getString(nameIndex)
                                    if (!name.isNullOrBlank()) fileName = name
                                }
                            }
                            val destFile = File(reactApplicationContext.cacheDir, fileName)
                            contentResolver.openInputStream(uri)?.use { input ->
                                FileOutputStream(destFile).use { output ->
                                    input.copyTo(output)
                                }
                            }
                            val result = Arguments.createMap().apply {
                                putString("uri", "file://" + destFile.absolutePath)
                                putString("path", destFile.absolutePath)
                                putString("name", fileName)
                                putDouble("size", destFile.length().toDouble())
                            }
                            pickAudioPromise?.resolve(result)
                        } catch (e: Exception) {
                            pickAudioPromise?.reject("ERR_COPY_AUDIO", e.message, e)
                        }
                    } else {
                        pickAudioPromise?.reject("PICK_CANCELLED", "No audio file was selected")
                    }
                    pickAudioPromise = null
                } else if (requestCode == REQUEST_CODE_SCAN_QR) {
                    if (resultCode == Activity.RESULT_OK && data != null) {
                        val contents = data.getStringExtra("SCAN_RESULT") ?: ""
                        scanQrPromise?.resolve(contents)
                    } else {
                        scanQrPromise?.reject("SCAN_CANCELLED", "QR scan cancelled")
                    }
                    scanQrPromise = null
                }
            }
        })
    }

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
        val audioAttributes = AudioAttributes.Builder()
            .setUsage(C.USAGE_MEDIA)
            .setContentType(C.AUDIO_CONTENT_TYPE_MUSIC)
            .build()
        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(1500, 10000, 100, 250)
            .build()
        player = ExoPlayer.Builder(context)
            .setLoadControl(loadControl)
            .setAudioAttributes(audioAttributes, true)
            .build()
            .apply {
                volume = 1.0f
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

                // Skip redundant re-prepare if the exact same URI is already buffered/buffering
                if (trackUri == currentTrackUri &&
                    (p.playbackState == Player.STATE_READY || p.playbackState == Player.STATE_BUFFERING)
                ) {
                    Log.d(TAG, "Track already prepared/buffering: $trackUri")
                    promise.resolve(true)
                    return@post
                }

                isPrepared = false
                currentTrackUri = trackUri

                val uri = if (
                    trackUri.startsWith("http") ||
                    trackUri.startsWith("file://") ||
                    trackUri.startsWith("content://")
                ) {
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

                // If player went idle, re-prepare current URI automatically
                if (p.playbackState == Player.STATE_IDLE && currentTrackUri != null) {
                    val uriStr = currentTrackUri!!
                    val uri = if (uriStr.startsWith("http") || uriStr.startsWith("file://") || uriStr.startsWith("content://")) {
                        Uri.parse(uriStr)
                    } else {
                        Uri.fromFile(File(uriStr))
                    }
                    p.setMediaItem(MediaItem.fromUri(uri))
                    p.prepare()
                }

                val now = SystemClock.elapsedRealtime()
                // Compensate ~50ms for Android AudioTrack mixer startup latency
                val rawDelayMs = (targetMonotonicMs.toLong() - 50L) - now
                // Clamp positive delay so bad clock sync never causes a long silent wait
                val delayMs = if (rawDelayMs > 5000L) 1500L else rawDelayMs

                Log.d(TAG, "Scheduling play: position=$positionMs, targetMonotonic=$targetMonotonicMs, rawDelay=${rawDelayMs}ms, delay=${delayMs}ms")

                if (delayMs <= 0) {
                    // Target time already passed: catch up by seeking forward (+40ms seek-resume compensation)
                    val catchupMs = (-delayMs).coerceAtMost(30000L)
                    val targetPos = positionMs.toLong() + catchupMs + 40L
                    Log.w(TAG, "Target time passed by ${-delayMs}ms, catching up to pos=${targetPos}ms")
                    if (targetPos > 80 || p.playbackState == Player.STATE_ENDED) {
                        p.seekTo(targetPos)
                    }
                    p.playWhenReady = true
                    p.play()
                    promise.resolve(Arguments.createMap().apply {
                        putBoolean("scheduled", true)
                        putDouble("actualDelay", 0.0)
                        putDouble("targetMissMs", (-delayMs).toDouble())
                    })
                } else {
                    // Only seek if resuming mid-track (>80ms) or ended; skip seekTo(0) to avoid decoder flush jitter
                    if (positionMs > 80 || p.playbackState == Player.STATE_ENDED) {
                        p.seekTo(positionMs.toLong())
                    }
                    // Schedule playback at the target time
                    val runnable = Runnable {
                        val actualTime = SystemClock.elapsedRealtime()
                        val jitter = actualTime - targetMonotonicMs.toLong()
                        Log.d(TAG, "Executing scheduled play, jitter: ${jitter}ms")
                        if (p.playbackState == Player.STATE_ENDED) p.seekTo(0)
                        p.playWhenReady = true
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
                if (p.playbackState == Player.STATE_IDLE && currentTrackUri != null) {
                    val uriStr = currentTrackUri!!
                    val uri = if (uriStr.startsWith("http") || uriStr.startsWith("file://") || uriStr.startsWith("content://")) {
                        Uri.parse(uriStr)
                    } else {
                        Uri.fromFile(File(uriStr))
                    }
                    p.setMediaItem(MediaItem.fromUri(uri))
                    p.prepare()
                }
                if (p.playbackState == Player.STATE_ENDED) p.seekTo(0)
                p.playWhenReady = true
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
                scheduledPlayRunnable?.let { mainHandler.removeCallbacks(it) }
                scheduledPlayRunnable = null
                p.playWhenReady = false
                p.pause()
                emitEvent(EVENT_PLAYBACK_POSITION, Arguments.createMap().apply {
                    putDouble("positionMs", p.currentPosition.toDouble())
                    putDouble("durationMs", p.duration.toDouble())
                    putDouble("monotonicMs", SystemClock.elapsedRealtime().toDouble())
                    putBoolean("isPlaying", false)
                })
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
     * Temporarily adjust playback speed (e.g. 0.97 - 1.03) for glitch-free phase-locked sync.
     */
    @ReactMethod
    fun setPlaybackSpeed(speed: Double, promise: Promise) {
        mainHandler.post {
            try {
                val p = player ?: throw IllegalStateException("Player not initialized")
                p.setPlaybackSpeed(speed.toFloat().coerceIn(0.90f, 1.10f))
                promise.resolve(true)
            } catch (e: Exception) {
                promise.reject("ERR_SPEED", e.message, e)
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
                        mainHandler.postDelayed(this, 250) // Report every 250ms for tight UI & resume sync
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

    @ReactMethod
    fun pickAudioFile(promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("ERR_NO_ACTIVITY", "Current activity is null")
            return
        }
        pickAudioPromise = promise
        try {
            val intent = Intent(Intent.ACTION_GET_CONTENT).apply {
                type = "audio/*"
                addCategory(Intent.CATEGORY_OPENABLE)
            }
            activity.startActivityForResult(Intent.createChooser(intent, "Select Audio File"), REQUEST_CODE_PICK_AUDIO)
        } catch (e: Exception) {
            pickAudioPromise = null
            promise.reject("ERR_LAUNCH_PICKER", e.message, e)
        }
    }

    @ReactMethod
    fun openCameraScanner(promise: Promise) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            promise.reject("ERR_NO_ACTIVITY", "Current activity is null")
            return
        }
        try {
            val zxingIntent = Intent("com.google.zxing.client.android.SCAN").apply {
                putExtra("SCAN_MODE", "QR_CODE_MODE")
            }
            if (zxingIntent.resolveActivity(activity.packageManager) != null) {
                scanQrPromise = promise
                activity.startActivityForResult(zxingIntent, REQUEST_CODE_SCAN_QR)
                return
            }

            val cameraIntent = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
            if (cameraIntent.resolveActivity(activity.packageManager) != null) {
                activity.startActivity(cameraIntent)
                promise.resolve("CAMERA_OPENED")
                return
            }

            promise.reject("NO_SCANNER", "No camera application found")
        } catch (e: Exception) {
            promise.reject("ERR_SCANNER", e.message, e)
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

