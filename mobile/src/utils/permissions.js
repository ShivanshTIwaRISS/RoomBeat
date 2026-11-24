import { PermissionsAndroid, Platform } from 'react-native';

/**
 * Safely requests required Android runtime permissions for RoomBeat:
 * - Camera: for QR code scanning
 * - Notifications (Android 13+): for foreground media controls
 * - Audio & Media reading: for picking songs
 */
export const requestAppPermissions = async () => {
    if (Platform.OS !== 'android') return true;

    try {
        const permissions = [];

        if (PermissionsAndroid.PERMISSIONS?.CAMERA) {
            permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);
        }

        if (Platform.Version >= 33) {
            if (PermissionsAndroid.PERMISSIONS?.POST_NOTIFICATIONS) {
                permissions.push(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
            }
            if (PermissionsAndroid.PERMISSIONS?.READ_MEDIA_AUDIO) {
                permissions.push(PermissionsAndroid.PERMISSIONS.READ_MEDIA_AUDIO);
            }
        } else {
            if (PermissionsAndroid.PERMISSIONS?.READ_EXTERNAL_STORAGE) {
                permissions.push(PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE);
            }
        }

        if (permissions.length > 0) {
            const granted = await PermissionsAndroid.requestMultiple(permissions);
            console.log('[Permissions] Granted status:', granted);
            return granted;
        }
        return true;
    } catch (err) {
        console.warn('[Permissions] Permission request error:', err);
        return false;
    }
};
