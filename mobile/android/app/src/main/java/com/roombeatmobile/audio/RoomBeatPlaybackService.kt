package com.roombeatmobile.audio

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.Bundle
import android.util.Log
import androidx.core.app.NotificationCompat
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.session.MediaSession
import androidx.media3.session.MediaSessionService

/**
 * Foreground service for background audio playback.
 * Ensures playback continues when the app is in the background.
 *
 * Uses Media3 MediaSessionService to:
 * - Keep audio playing when app is backgrounded
 * - Show persistent notification with playback controls
 * - Handle media session callbacks (play, pause from notification/headset)
 */
class RoomBeatPlaybackService : MediaSessionService() {

    companion object {
        private const val TAG = "RoomBeatPlaybackSvc"
        private const val NOTIFICATION_CHANNEL_ID = "roombeat_playback"
        private const val NOTIFICATION_ID = 1001
    }

    private var mediaSession: MediaSession? = null
    private var player: ExoPlayer? = null

    override fun onCreate() {
        super.onCreate()
        Log.d(TAG, "PlaybackService created")

        createNotificationChannel()

        player = ExoPlayer.Builder(this).build()
        mediaSession = MediaSession.Builder(this, player!!)
            .build()
    }

    override fun onGetSession(controllerInfo: MediaSession.ControllerInfo): MediaSession? {
        return mediaSession
    }

    override fun onDestroy() {
        mediaSession?.run {
            player.release()
            release()
            mediaSession = null
        }
        player = null
        super.onDestroy()
        Log.d(TAG, "PlaybackService destroyed")
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                NOTIFICATION_CHANNEL_ID,
                "RoomBeat Playback",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Audio playback controls for RoomBeat"
                setShowBadge(false)
            }

            val notificationManager = getSystemService(NotificationManager::class.java)
            notificationManager.createNotificationChannel(channel)
        }
    }
}

