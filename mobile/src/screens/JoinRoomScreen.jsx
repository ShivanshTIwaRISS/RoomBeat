import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert } from 'react-native';
import { colors, typography, spacing } from '../theme';
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
    const handleJoin = async () => {
        const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!cleanCode || cleanCode.length < 4) {
            setError('Please enter a valid room code');
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const res = await roomsApi.join({ code: cleanCode });
            const room = res.data?.room || res.room || res.data || res;
            if (session) {
                setRoom(room, room.hostSessionId, session.id);
            }
            navigation.replace('RoomDashboard', { roomId: room.id });
        }
        catch (err) {
            setError(err.message || 'Could not join room. Check the code.');
            Alert.alert('Join Failed', err.message || 'Could not join room.');
        }
        finally {
            setLoading(false);
        }
    };
    return (<View style={styles.container}>
      <Header title="Join a Room" onBack={() => navigation.goBack()}/>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.sectionTitle}>Enter Room Code</Text>
          <Text style={styles.sectionSubtitle}>
            Ask the room host for their 6-character room code.
          </Text>

          <Input placeholder="e.g. RB-7489" value={code} onChangeText={(t) => {
            setCode(t);
            setError(null);
        }} autoCapitalize="characters" style={styles.codeInput} error={error || undefined}/>

          <Input label="Your Display Name" placeholder="Speaker Name" value={displayName} onChangeText={setDisplayName}/>

          <Button title="Connect to Room" onPress={handleJoin} size="lg" loading={loading} style={styles.connectBtn}/>
        </Card>

        {/* QR Code Option */}
        <Card style={styles.qrCard}>
          <Text style={styles.qrIcon}>📷</Text>
          <Text style={styles.qrTitle}>Scan Host's QR Code</Text>
          <Text style={styles.qrDesc}>
            Join instantaneously by scanning the QR code displayed on the host device.
          </Text>
          <Button title="Open Camera Scanner" variant="outline" size="md" onPress={() => Alert.alert('QR Scanner', 'Camera permissions ready. Point camera at the Host screen.')}/>
        </Card>
      </ScrollView>
    </View>);
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
        fontSize: 24,
        fontWeight: '700',
        fontFamily: 'Courier',
        textAlign: 'center',
        letterSpacing: 4,
    },
    connectBtn: {
        marginTop: spacing.md,
    },
    qrCard: {
        padding: spacing.lg,
        alignItems: 'center',
    },
    qrIcon: {
        fontSize: 40,
        marginBottom: spacing.xs,
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
});
