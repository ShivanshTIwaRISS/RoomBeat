import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, } from 'react-native';
import { colors, borderRadius, typography, spacing } from '../theme';
import { Header } from '../components/common/Header';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { tracksApi } from '../api/tracks';
import { queueApi } from '../api/queue';
import { useRoomStore } from '../store/useRoomStore';
import { usePlaybackStore } from '../store/usePlaybackStore';
import { usePlayback } from '../hooks/usePlayback';
import { formatDuration, formatFileSize } from '../utils/formatters';
export const MusicLibraryScreen = ({ navigation, route, }) => {
    const { roomId } = route.params;
    const isHost = useRoomStore((s) => s.isHost);
    const setCurrentTrack = usePlaybackStore((s) => s.setCurrentTrack);
    const { prepare } = usePlayback();
    const [tracks, setTracks] = useState([]);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const fetchTracks = async () => {
        try {
            setLoading(true);
            const res = await tracksApi.getRoomTracks(roomId);
            setTracks(res.data || res || []);
        }
        catch (err) {
            console.warn('Failed to fetch tracks:', err);
        }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => {
        fetchTracks();
        const unsub = navigation.addListener('focus', fetchTracks);
        return unsub;
    }, [roomId, navigation]);
    const handlePlayNow = async (track) => {
        if (!isHost) {
            Alert.alert('Host Control', 'Only the room host can initiate track playback.');
            return;
        }
        setCurrentTrack(track);
        usePlaybackStore.getState().setDuration(track.durationMs || 180000);
        await prepare(track.id);
        navigation.goBack();
    };
    const handleAddToQueue = async (track) => {
        try {
            await queueApi.addToQueue(roomId, track.id);
            Alert.alert('Queue Updated', `"${track.title}" added to queue.`);
        }
        catch (err) {
            Alert.alert('Error', err.message || 'Failed to add track to queue');
        }
    };
    const filteredTracks = tracks.filter((t) => t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.artist.toLowerCase().includes(search.toLowerCase()));
    return (<View style={styles.container}>
      <Header title="Music Library" subtitle={`${tracks.length} tracks available`} onBack={() => navigation.goBack()} rightAction={isHost ? (<Button title="+ Upload" size="sm" onPress={() => navigation.navigate('UploadMusic', { roomId })}/>) : undefined}/>

      <View style={styles.content}>
        <Input placeholder="Search tracks or artists..." value={search} onChangeText={setSearch} containerStyle={styles.searchBar}/>

        {loading ? (<LoadingSpinner message="Loading room audio files..."/>) : filteredTracks.length === 0 ? (<EmptyState icon="NO TRACKS" title="No Tracks Yet" description={isHost
                ? 'Upload an MP3, WAV, or M4A file from your phone to start playing.'
                : 'Waiting for the room host to upload tracks.'} actionTitle={isHost ? 'Upload Audio File' : undefined} onAction={isHost ? () => navigation.navigate('UploadMusic', { roomId }) : undefined}/>) : (<FlatList data={filteredTracks} keyExtractor={(item) => item.id} renderItem={({ item }) => (<View style={styles.trackCard}>
                <TouchableOpacity style={styles.trackInfo} onPress={() => handlePlayNow(item)} activeOpacity={0.7}>
                  <View style={styles.trackIcon}>
                    <Text style={styles.iconText}>TRACK</Text>
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.trackTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.trackMeta}>
                      {item.artist} • {formatDuration(item.durationMs)} • {formatFileSize(item.fileSize)}
                    </Text>
                  </View>
                </TouchableOpacity>

                <View style={styles.actions}>
                  <TouchableOpacity onPress={() => handleAddToQueue(item)} style={styles.queueBtn}>
                    <Text style={styles.queueBtnText}>+ Queue</Text>
                  </TouchableOpacity>
                </View>
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
    searchBar: {
        marginBottom: spacing.sm,
    },
    trackCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.cardBorder,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
    },
    trackInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: spacing.md,
    },
    trackIcon: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.sm,
        backgroundColor: colors.surfaceLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    iconText: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 1,
        textTransform: 'uppercase',
    },
    textContainer: {
        flex: 1,
    },
    trackTitle: {
        ...typography.bodyBold,
        marginBottom: 2,
    },
    trackMeta: {
        ...typography.small,
    },
    actions: {
        marginLeft: spacing.sm,
    },
    queueBtn: {
        backgroundColor: colors.surfaceLight,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: borderRadius.sm,
    },
    queueBtnText: {
        ...typography.small,
        color: colors.primary,
        fontWeight: '700',
    },
});
