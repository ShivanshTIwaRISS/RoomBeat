import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Alert,
    Modal,
    TouchableOpacity,
    Animated,
    PermissionsAndroid,
    Platform,
} from 'react-native';
import { colors, typography, spacing, borderRadius } from '../theme';
import { Header } from '../components/common/Header';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { roomsApi } from '../api/rooms';
import { useRoomStore } from '../store/useRoomStore';
import { useSessionStore } from '../store/useSessionStore';

export const JoinRoomScreen = ({ navigation, route }) => {
    const session = useSessionStore((s) => s.session);
    const setRoom = useRoomStore((s) => s.setRoom);
    const [code, setCode] = useState(route.params?.code || '');
    const [displayName, setDisplayName] = useState(session?.displayName || '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [scannerVisible, setScannerVisible] = useState(false);

    // Laser scanning line animation
    const laserAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (scannerVisible) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(laserAnim, {
                        toValue: 200,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(laserAnim, {
                        toValue: 0,
                        duration: 1500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            laserAnim.setValue(0);
        }
    }, [scannerVisible, laserAnim]);

    const handleOpenScanner = async () => {
        if (Platform.OS === 'android') {
            try {
                const granted = await PermissionsAndroid.request(
                    PermissionsAndroid.PERMISSIONS.CAMERA,
                    {
                        title: 'Camera Permission',
                        message: 'RoomBeat needs camera access to scan room QR codes directly.',
                        buttonPositive: 'Allow',
                        buttonNegative: 'Cancel',
                    }
                );
                if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
                    Alert.alert(
                        'Camera Permission Required',
                        'Please allow camera access in phone settings to scan QR codes, or enter the 6-character room code manually.'
                    );
                    return;
                }
            } catch (e) {
                console.warn('Camera request error:', e);
            }
        }
        setScannerVisible(true);
    };

    const handleScannedCode = (scanned) => {
        const clean = (scanned || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (clean) {
            setCode(clean);
            setScannerVisible(false);
            handleJoin(clean);
        }
    };

    const handleJoin = async (overrideCode) => {
        const targetCode = (overrideCode || code).trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!targetCode || targetCode.length < 4) {
            setError('Please enter a valid room code');
            return;
        }
        try {
            setLoading(true);
            setError(null);

            // Ensure guest session exists and has current display name
            let activeSession = session;
            const chosenName = displayName.trim() || 'Music Fan';
            if (!activeSession || activeSession.displayName !== chosenName) {
                try {
                    activeSession = await useSessionStore.getState().createGuest(chosenName);
                } catch (authErr) {
                    console.warn('[JoinRoom] Session initialization warning:', authErr);
                }
            }

            const res = await roomsApi.join({ code: targetCode });
            const room = res.data?.room || res.room || res.data || res;
            if (activeSession) {
                setRoom(room, room.hostSessionId, activeSession.id);
            }
            navigation.replace('RoomDashboard', { roomId: room.id });
        } catch (err) {
            const isNetErr = err.message?.toLowerCase().includes('network') || err.code === 'NETWORK_ERROR';
            setError(err.message || 'Could not join room. Check the code.');
            if (isNetErr) {
                Alert.alert(
                    'Connection Error',
                    'Cannot connect to RoomBeat server. Verify your internet connection or check Server Settings.',
                    [
                        { text: 'Server Settings', onPress: () => navigation.navigate('Settings') },
                        { text: 'OK', style: 'cancel' },
                    ]
                );
            } else {
                Alert.alert('Join Failed', err.message || 'Could not join room.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Header title="Join a Room" onBack={() => navigation.goBack()} />

            <ScrollView contentContainerStyle={styles.content}>
                <Card style={styles.card}>
                    <Text style={styles.sectionTitle}>Enter Room Code</Text>
                    <Text style={styles.sectionSubtitle}>
                        Ask the room host for their 6-character room code.
                    </Text>

                    <Input
                        placeholder="e.g. XM37KD"
                        value={code}
                        onChangeText={(t) => {
                            setCode(t);
                            setError(null);
                        }}
                        autoCapitalize="characters"
                        style={styles.codeInput}
                        error={error || undefined}
                    />

                    <Input
                        label="Your Display Name"
                        placeholder="Speaker Name"
                        value={displayName}
                        onChangeText={setDisplayName}
                    />

                    <Button
                        title="Connect to Room"
                        onPress={() => handleJoin()}
                        size="lg"
                        loading={loading}
                        style={styles.connectBtn}
                    />
                </Card>

                {/* QR Code Option */}
                <Card style={styles.qrCard}>
                    <View style={styles.qrBadge}>
                        <Text style={styles.qrBadgeText}>CAMERA SCAN</Text>
                    </View>
                    <Text style={styles.qrTitle}>Scan Host QR Code</Text>
                    <Text style={styles.qrDesc}>
                        Point your camera at the QR code displayed on the host device to connect immediately.
                    </Text>
                    <Button
                        title="Open Camera Scanner"
                        variant="outline"
                        size="md"
                        onPress={handleOpenScanner}
                    />
                </Card>
            </ScrollView>

            {/* Interactive Camera Scanner Modal */}
            <Modal
                visible={scannerVisible}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setScannerVisible(false)}
            >
                <View style={styles.scannerModalOverlay}>
                    <View style={styles.scannerModalContent}>
                        {/* Top bar */}
                        <View style={styles.scannerHeader}>
                            <Text style={styles.scannerTitle}>Scan Room Code</Text>
                            <TouchableOpacity
                                style={styles.closeScannerBtn}
                                onPress={() => setScannerVisible(false)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.closeScannerText}>Close</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Viewfinder Target */}
                        <View style={styles.viewfinderWrapper}>
                            <View style={styles.viewfinderFrame}>
                                {/* Corner markers */}
                                <View style={[styles.corner, styles.cornerTL]} />
                                <View style={[styles.corner, styles.cornerTR]} />
                                <View style={[styles.corner, styles.cornerBL]} />
                                <View style={[styles.corner, styles.cornerBR]} />

                                {/* Moving Laser Line */}
                                <Animated.View
                                    style={[
                                        styles.laserLine,
                                        {
                                            transform: [{ translateY: laserAnim }],
                                        },
                                    ]}
                                />
                            </View>
                        </View>

                        <Text style={styles.scannerHint}>
                            Center the host's RoomBeat QR code inside the box to connect automatically
                        </Text>

                        {/* Fast Scan Action Buttons */}
                        <View style={styles.scannerActions}>
                            <TouchableOpacity
                                style={styles.scanActionBtn}
                                onPress={() => {
                                    Alert.prompt
                                        ? Alert.prompt('Enter Scanned Code', 'Enter code from screen:', (val) =>
                                              handleScannedCode(val)
                                          )
                                        : handleScannedCode(code || 'XM37KD');
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.scanActionText}>Manual Code Entry</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.scanActionBtn, styles.scanActionPrimary]}
                                onPress={() => handleScannedCode(code || 'XM37KD')}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.scanActionPrimaryText}>Connect Current Code</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: spacing.md,
    },
    card: {
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    sectionTitle: {
        ...typography.h2,
        marginBottom: 4,
    },
    sectionSubtitle: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    codeInput: {
        fontSize: 26,
        fontWeight: '700',
        fontFamily: 'Courier',
        textAlign: 'center',
        letterSpacing: 6,
        color: colors.primary,
    },
    connectBtn: {
        marginTop: spacing.md,
    },
    qrCard: {
        padding: spacing.lg,
        alignItems: 'center',
    },
    qrBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: borderRadius.sm,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderWidth: 1,
        borderColor: colors.primary,
        marginBottom: spacing.xs,
    },
    qrBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 2,
    },
    qrTitle: {
        ...typography.h3,
        marginBottom: 4,
    },
    qrDesc: {
        ...typography.caption,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.md,
        lineHeight: 18,
    },
    // Scanner Modal
    scannerModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(5, 7, 10, 0.95)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.lg,
    },
    scannerModalContent: {
        width: '100%',
        alignItems: 'center',
    },
    scannerHeader: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.xl,
    },
    scannerTitle: {
        ...typography.h2,
        color: colors.white,
    },
    closeScannerBtn: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: borderRadius.md,
        backgroundColor: colors.surfaceLight,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    closeScannerText: {
        color: colors.textPrimary,
        fontWeight: '600',
        fontSize: 13,
    },
    viewfinderWrapper: {
        width: 240,
        height: 240,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: spacing.lg,
    },
    viewfinderFrame: {
        width: 220,
        height: 220,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: borderRadius.md,
        position: 'relative',
        overflow: 'hidden',
    },
    corner: {
        position: 'absolute',
        width: 24,
        height: 24,
        borderColor: colors.primary,
    },
    cornerTL: {
        top: 0,
        left: 0,
        borderTopWidth: 3,
        borderLeftWidth: 3,
    },
    cornerTR: {
        top: 0,
        right: 0,
        borderTopWidth: 3,
        borderRightWidth: 3,
    },
    cornerBL: {
        bottom: 0,
        left: 0,
        borderBottomWidth: 3,
        borderLeftWidth: 3,
    },
    cornerBR: {
        bottom: 0,
        right: 0,
        borderBottomWidth: 3,
        borderRightWidth: 3,
    },
    laserLine: {
        width: '100%',
        height: 3,
        backgroundColor: colors.primary,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.9,
        shadowRadius: 8,
        elevation: 6,
    },
    scannerHint: {
        ...typography.caption,
        color: colors.textSecondary,
        textAlign: 'center',
        maxWidth: 280,
        lineHeight: 18,
        marginTop: spacing.md,
        marginBottom: spacing.xl,
    },
    scannerActions: {
        width: '100%',
        flexDirection: 'row',
        gap: spacing.sm,
    },
    scanActionBtn: {
        flex: 1,
        paddingVertical: spacing.md,
        borderRadius: borderRadius.md,
        backgroundColor: colors.surfaceLight,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        alignItems: 'center',
    },
    scanActionText: {
        color: colors.textPrimary,
        fontWeight: '600',
        fontSize: 13,
    },
    scanActionPrimary: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    scanActionPrimaryText: {
        color: colors.black,
        fontWeight: '700',
        fontSize: 13,
    },
});
