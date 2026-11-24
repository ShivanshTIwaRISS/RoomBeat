import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, Alert } from 'react-native';
import { colors, typography, spacing } from '../theme';
import { Header } from '../components/common/Header';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { roomsApi } from '../api/rooms';
import { useRoomStore } from '../store/useRoomStore';
import { useSessionStore } from '../store/useSessionStore';
export const CreateRoomScreen = ({ navigation }) => {
    const session = useSessionStore((s) => s.session);
    const setRoom = useRoomStore((s) => s.setRoom);
    const [roomName, setRoomName] = useState('');
    const [displayName, setDisplayName] = useState(session?.displayName || '');
    const [maxDevices, setMaxDevices] = useState('10');
    const [isPrivate, setIsPrivate] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const handleCreate = async () => {
        if (!roomName.trim()) {
            setError('Please provide a room name');
            return;
        }
        try {
            setLoading(true);
            setError(null);
            const parsedMax = parseInt(maxDevices, 10) || 10;
            const res = await roomsApi.create({
                name: roomName.trim(),
                maxDevices: Math.min(30, Math.max(2, parsedMax)),
                isPrivate,
            });
            const room = res.data || res;
            if (session) {
                setRoom(room, room.hostSessionId, session.id);
            }
            navigation.replace('RoomDashboard', { roomId: room.id });
        }
        catch (err) {
            const isNetErr = err.message?.toLowerCase().includes('network') || err.code === 'NETWORK_ERROR';
            setError(err.message || 'Failed to create room');
            if (isNetErr) {
                Alert.alert(
                    'Connection Error',
                    'Cannot connect to RoomBeat server. Ensure your phone and computer are on the same Wi-Fi and verify the Server IP in Settings.',
                    [
                        { text: 'Server Settings', onPress: () => navigation.navigate('Settings') },
                        { text: 'OK', style: 'cancel' }
                    ]
                );
            } else {
                Alert.alert('Error', err.message || 'Failed to create room');
            }
        }
        finally {
            setLoading(false);
        }
    };
    return (<View style={styles.container}>
      <Header title="Create a Room" onBack={() => navigation.goBack()}/>

      <ScrollView contentContainerStyle={styles.content}>
        <Input label="Room Name" placeholder="e.g. Hostel Music Night" value={roomName} onChangeText={(t) => {
            setRoomName(t);
            setError(null);
        }} error={error || undefined}/>

        <Input label="Your Display Name" placeholder="Host Name" value={displayName} onChangeText={setDisplayName}/>

        <Input label="Maximum Connected Devices" placeholder="10" keyboardType="numeric" value={maxDevices} onChangeText={setMaxDevices}/>

        <Card style={styles.toggleCard}>
          <View style={styles.toggleRow}>
            <View>
              <Text style={styles.toggleTitle}>Private Room</Text>
              <Text style={styles.toggleSubtitle}>Only reachable with room code</Text>
            </View>
            <Switch value={isPrivate} onValueChange={setIsPrivate} trackColor={{ false: colors.surfaceBorder, true: colors.primary }} thumbColor={colors.white}/>
          </View>
        </Card>

        <Button title="Create & Start Hosting" onPress={handleCreate} size="lg" loading={loading} style={styles.submitBtn}/>
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
    toggleCard: {
        marginVertical: spacing.md,
    },
    toggleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    toggleTitle: {
        ...typography.bodyBold,
    },
    toggleSubtitle: {
        ...typography.small,
        marginTop: 2,
    },
    submitBtn: {
        marginTop: spacing.lg,
    },
});
