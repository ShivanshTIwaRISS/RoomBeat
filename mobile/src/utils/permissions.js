import { PermissionsAndroid, Platform } from 'react-native';

/**
 * Requests all required Android runtime permissions for RoomBeat:
 * - Notifications (Android 13+): for foreground media controls
 * - Audio & Media reading (Android 13+ and legacy storage): for picking songs
 */
export const requestAppPermissions = async () => {
    if (Platform.OS !== 'android') return true;

    try {
        const permissions = [
            PermissionsAndroid.PERMISSIONS.CAMERA,
        ];

        // Notification permission for Android 13+ (API 33+)
        if (Platform.Version >= 33) {
            permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
            permissions.push('android.permission.READ_MEDIA_AUDIO');
        } else {
            // Android 12 and below
            permissions.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
        }

        const granted = await PermissionsAndroid.requestMultiple(permissions);
        console.log('[Permissions] Granted status:', granted);
        return granted;
    } catch (err) {
        console.warn('[Permissions] Permission request error:', err);
        return false;
    }
};
