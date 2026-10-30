import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert } from 'react-native';
import { colors, borderRadius, typography, spacing } from '../theme';
import { Header } from '../components/common/Header';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { queueApi } from '../api/queue';
import { useRoomStore } from '../store/useRoomStore';
import { usePlaybackStore } from '../store/usePlaybackStore';
import { usePlayback } from '../hooks/usePlayback';
import { formatDuration } from '../utils/formatters';
export const QueueScreen = ({ navigation, route }) => {
    const { roomId } = route.params;
    const isHost = useRoomStore((s) => s.isHost);
    const setCurrentTrack = usePlaybackStore((s) => s.setCurrentTrack);
    const { prepare } = usePlayback();
    const [queue, setQueue] = useState([]);
    const [loading, setLoading] = useState(true);
    const fetchQueue = async () => {
        try {
            setLoading(true);
            const res = await queueApi.getQueue(roomId);
            setQueue(res.data || res || []);
        }
        catch (err) {
            console.warn('Failed to fetch queue:', err);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchQueue();
    }, [roomId]);
    const handlePlayNow = (item) => {
        if (!isHost) {
            Alert.alert('Host Only', 'Only the room host can play tracks from the queue.');
            return;
        }
        setCurrentTrack(item.track);
        prepare(item.trackId);
        navigation.goBack();
    };
    const handleRemove = async (itemId) => {
        if (!isHost)
            return;
        try {
            const res = await queueApi.removeFromQueue(roomId, itemId);
            setQueue(res.data || res || []);
        }
        catch (err) {
            Alert.alert('Error', err.message || 'Failed to remove from queue');
        }
    };
    const handleClear = () => {
        if (!isHost)
            return;
        Alert.alert('Clear Queue', 'Remove all upcoming tracks?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Clear All',
                style: 'destructive',
                onPress: async () => {
                    await queueApi.clearQueue(roomId);
                    setQueue([]);
                },
            },
        ]);
    };
    return (<View style={styles.container}>
      <Header title="Room Queue" subtitle={`${queue.length} upcoming tracks`} onBack={() => navigation.goBack()} rightAction={isHost && queue.length > 0 ? (<TouchableOpacity onPress={handleClear}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity>) : undefined}/>

      <View style={styles.content}>
        {loading ? (<LoadingSpinner message="Loading queue..."/>) : queue.length === 0 ? (<EmptyState icon="📑" title="Queue is Empty" description="Add tracks from the music library to keep the party going." actionTitle="Go to Library" onAction={() => navigation.navigate('MusicLibrary', { roomId })}/>) : (<FlatList data={queue} keyExtractor={(item) => item.id} renderItem={({ item, index }) => (<View style={styles.itemCard}>
                <Text style={styles.itemPosition}>{index + 1}</Text>

                <TouchableOpacity style={styles.itemInfo} onPress={() => handlePlayNow(item)} activeOpacity={0.7}>
                  <Text style={styles.itemTitle} numberOfLines={1}>
                    {item.track.title}
                  </Text>
                  <Text style={styles.itemMeta}>
                    {item.track.artist} • {formatDuration(item.track.durationMs)}
                  </Text>
                </TouchableOpacity>

                {isHost && (<TouchableOpacity onPress={() => handleRemove(item.id)} style={styles.removeBtn}>
                    <Text style={styles.removeIcon}>✕</Text>
                  </TouchableOpacity>)}
              </View>)}/>)}
      </View>
    </View>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        flex: 1,
        padding: spacing.md,
    },
    clearText: {
        ...typography.caption,
        color: colors.error,
        fontWeight: '700',
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    itemPosition: {
        ...typography.bodyBold,
        fontFamily: 'Courier',
        width: 28,
        color: colors.primary,
    },
    itemInfo: {
        flex: 1,
    },
    itemTitle: {
        ...typography.bodyBold,
        marginBottom: 2,
    },
    itemMeta: {
        ...typography.small,
    },
    removeBtn: {
        padding: spacing.xs,
        marginLeft: spacing.sm,
    },
    removeIcon: {
        color: colors.textTertiary,
        fontSize: 16,
        fontWeight: '700',
    },
});
