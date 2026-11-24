import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { colors, borderRadius, typography, spacing } from '../theme';
import { Header } from '../components/common/Header';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ProgressBar } from '../components/common/ProgressBar';
import { tracksApi } from '../api/tracks';
import { nativeAudio } from '../audio/NativeAudioModule';
import { formatFileSize } from '../utils/formatters';
import { useRoomStore } from '../store/useRoomStore';
import { usePlaybackStore } from '../store/usePlaybackStore';

const STUDIO_PRESETS = [
    {
        id: 'preset-demo',
        title: 'RoomBeat Club Drop',
        artist: 'RoomBeat Engine',
        duration: '0:30',
        genre: 'Electronic',
    },
    {
        id: 'preset-cyberpunk',
        title: 'Cyberpunk 808 Bass',
        artist: 'Synthwave Studio',
        duration: '2:45',
        genre: 'Bass Heavy',
    },
    {
        id: 'preset-lofi',
        title: 'Lo-Fi Chill Hop',
        artist: 'Bedroom Beats',
        duration: '3:12',
        genre: 'Chillout',
    },
    {
        id: 'preset-metronome',
        title: 'Sync Click (120 BPM)',
        artist: 'Precision Metronome',
        duration: '1:00',
        genre: 'Calibration',
    },
];

export const UploadMusicScreen = ({ navigation, route }) => {
    const { roomId } = route.params;
    const currentRoom = useRoomStore((s) => s.currentRoom);
    const setCurrentTrack = usePlaybackStore((s) => s.setCurrentTrack);

    const [activeTab, setActiveTab] = useState('phone'); // 'phone' | 'presets' | 'computer'
    const [pickedFile, setPickedFile] = useState(null);
    const [customTitle, setCustomTitle] = useState('');
    const [customArtist, setCustomArtist] = useState('');
    const [selectedPreset, setSelectedPreset] = useState(STUDIO_PRESETS[0]);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handlePickFile = async () => {
        try {
            const result = await nativeAudio.pickAudioFile();
            if (result && result.uri) {
                setPickedFile(result);
                const baseName = (result.name || 'Audio Track').replace(/\.[^/.]+$/, '');
                setCustomTitle(baseName);
                setCustomArtist('Phone Upload');
            }
        } catch (err) {
            if (err.message?.includes('CANCELLED')) return;
            Alert.alert(
                'File Picker',
                'Could not open file picker directly. You can also pick from the Studio Presets tab or upload from your computer browser.'
            );
        }
    };

    const handleUploadPickedFile = async () => {
        if (!pickedFile) {
            Alert.alert('No File Selected', 'Please tap "Choose Audio File" first.');
            return;
        }

        const titleToUse = customTitle.trim() || pickedFile.name || 'RoomBeat Track';
        const artistToUse = customArtist.trim() || 'Phone Speaker';

        try {
            setUploading(true);
            setProgress(0.2);

            const formData = new FormData();
            formData.append('title', titleToUse);
            formData.append('artist', artistToUse);
            formData.append('file', {
                uri: pickedFile.uri,
                type: 'audio/mpeg',
                name: pickedFile.name || 'track.mp3',
            });

            setProgress(0.6);
            const res = await tracksApi.upload(roomId, formData);
            const track = res?.data || res;

            setProgress(1.0);
            if (track) {
                setCurrentTrack(track);
            }

            Alert.alert(
                'Track Uploaded',
                `"${titleToUse}" is now queued and syncing across all devices in the room.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (err) {
            Alert.alert('Upload Error', err.message || 'Failed to upload audio track.');
        } finally {
            setUploading(false);
        }
    };

    const handleAddPreset = async () => {
        const titleToUse = selectedPreset?.title || 'RoomBeat Track';
        const artistToUse = selectedPreset?.artist || 'RoomBeat Audio';

        try {
            setUploading(true);
            setProgress(0.5);

            setCurrentTrack({
                id: selectedPreset.id,
                title: titleToUse,
                artist: artistToUse,
                durationMs: 30000,
            });

            setProgress(1.0);
            Alert.alert(
                'Preset Activated',
                `"${titleToUse}" is now ready to play in sync on all devices.`,
                [{ text: 'Start Playing', onPress: () => navigation.goBack() }]
            );
        } catch (err) {
            Alert.alert('Notice', err.message || 'Failed to select preset.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Header title="Add Audio Track" onBack={() => navigation.goBack()} />

            <ScrollView contentContainerStyle={styles.content}>
                {/* 3-way Tab Switcher */}
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === 'phone' && styles.tabItemActive]}
                        onPress={() => setActiveTab('phone')}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.tabText, activeTab === 'phone' && styles.tabTextActive]}>
                            From Phone
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === 'presets' && styles.tabItemActive]}
                        onPress={() => setActiveTab('presets')}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.tabText, activeTab === 'presets' && styles.tabTextActive]}>
                            Studio Beats
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === 'computer' && styles.tabItemActive]}
                        onPress={() => setActiveTab('computer')}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.tabText, activeTab === 'computer' && styles.tabTextActive]}>
                            From PC / Mac
                        </Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 'phone' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionHeading}>Upload Song from Phone Storage</Text>
                        <Text style={styles.sectionSub}>
                            Choose any MP3, WAV, or M4A file from your phone. It will be uploaded to the room and downloaded by all connected devices automatically.
                        </Text>

                        {/* File Picker Action Card */}
                        <Card style={styles.pickerCard}>
                            <TouchableOpacity
                                style={styles.pickButton}
                                onPress={handlePickFile}
                                activeOpacity={0.8}
                            >
                                <View style={styles.pickIconWrapper}>
                                    <Text style={styles.pickIcon}>AUDIO</Text>
                                </View>
                                <Text style={styles.pickBtnTitle}>
                                    {pickedFile ? 'Change Selected File' : 'Choose Audio File'}
                                </Text>
                                <Text style={styles.pickBtnSub}>
                                    Browse internal storage, Downloads, or Music
                                </Text>
                            </TouchableOpacity>

                            {pickedFile && (
                                <View style={styles.selectedFileBox}>
                                    <View style={styles.fileDetails}>
                                        <Text style={styles.fileName} numberOfLines={1}>
                                            {pickedFile.name}
                                        </Text>
                                        <Text style={styles.fileSize}>
                                            {formatFileSize(pickedFile.size)} • Ready to upload
                                        </Text>
                                    </View>
                                    <Text style={styles.checkMark}>READY</Text>
                                </View>
                            )}
                        </Card>

                        {pickedFile && (
                            <Card style={styles.metaCard}>
                                <Input
                                    label="Track Title"
                                    value={customTitle}
                                    onChangeText={setCustomTitle}
                                    placeholder="Song title"
                                />
                                <Input
                                    label="Artist Name"
                                    value={customArtist}
                                    onChangeText={setCustomArtist}
                                    placeholder="Artist name"
                                />

                                {uploading && (
                                    <View style={styles.progressBox}>
                                        <Text style={styles.progressText}>Uploading & Broadcasting to Room...</Text>
                                        <ProgressBar progress={progress} height={6} />
                                    </View>
                                )}

                                <Button
                                    title={uploading ? 'Uploading...' : 'Upload & Share with Room'}
                                    onPress={handleUploadPickedFile}
                                    size="lg"
                                    loading={uploading}
                                    style={styles.actionBtn}
                                />
                            </Card>
                        )}
                    </View>
                )}

                {activeTab === 'presets' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionHeading}>Instant Synchronized Presets</Text>
                        <Text style={styles.sectionSub}>
                            Pre-calibrated studio beats with zero waiting. Tap any preset to play together immediately.
                        </Text>

                        {STUDIO_PRESETS.map((preset) => {
                            const isSelected = selectedPreset?.id === preset.id;
                            return (
                                <TouchableOpacity
                                    key={preset.id}
                                    style={[styles.presetCard, isSelected && styles.presetCardSelected]}
                                    onPress={() => setSelectedPreset(preset)}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.presetBadge}>
                                        <Text style={styles.presetBadgeText}>BEAT</Text>
                                    </View>
                                    <View style={styles.presetInfo}>
                                        <Text style={[styles.presetTitle, isSelected && styles.presetTitleSelected]}>
                                            {preset.title}
                                        </Text>
                                        <Text style={styles.presetMeta}>
                                            {preset.artist} • {preset.duration} • {preset.genre}
                                        </Text>
                                    </View>
                                    <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                                        {isSelected && <View style={styles.radioInner} />}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}

                        <Button
                            title="Activate Selected Beat"
                            onPress={handleAddPreset}
                            size="lg"
                            loading={uploading}
                            style={styles.actionBtn}
                        />
                    </View>
                )}

                {activeTab === 'computer' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionHeading}>Upload from PC or Mac</Text>
                        <Text style={styles.sectionSub}>
                            You can easily drop entire music folders from your computer directly into this room.
                        </Text>

                        <Card style={styles.computerCard}>
                            <Text style={styles.stepTitle}>1. Open RoomBeat in your browser</Text>
                            <Text style={styles.urlDisplay}>https://roombeat.onrender.com</Text>

                            <Text style={styles.stepTitle}>2. Join this room code</Text>
                            <Text style={styles.codeDisplay}>{currentRoom?.code || '------'}</Text>

                            <Text style={styles.stepTitle}>3. Drag and drop any audio file</Text>
                            <Text style={styles.stepSub}>
                                The song will instantly show up on this phone and play in perfect synchronization!
                            </Text>
                        </Card>
                    </View>
                )}
            </ScrollView>
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
        paddingBottom: spacing.xxl,
    },
    tabBar: {
        flexDirection: 'row',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: 4,
        marginBottom: spacing.lg,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    tabItem: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: borderRadius.sm,
    },
    tabItemActive: {
        backgroundColor: colors.surfaceLight,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    tabText: {
        ...typography.caption,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    tabTextActive: {
        color: colors.primary,
        fontWeight: '700',
    },
    section: {
        marginBottom: spacing.lg,
    },
    sectionHeading: {
        ...typography.h3,
        marginBottom: 4,
    },
    sectionSub: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.md,
        lineHeight: 18,
    },
    pickerCard: {
        padding: spacing.md,
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    pickButton: {
        width: '100%',
        alignItems: 'center',
        paddingVertical: spacing.lg,
        borderWidth: 2,
        borderColor: colors.primary,
        borderStyle: 'dashed',
        borderRadius: borderRadius.lg,
        backgroundColor: 'rgba(16, 185, 129, 0.04)',
    },
    pickIconWrapper: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 4,
        borderRadius: borderRadius.sm,
        backgroundColor: colors.primaryMuted,
        marginBottom: spacing.sm,
    },
    pickIcon: {
        color: colors.primary,
        fontWeight: '800',
        fontSize: 12,
        letterSpacing: 1,
    },
    pickBtnTitle: {
        ...typography.bodyBold,
        fontSize: 16,
        marginBottom: 4,
    },
    pickBtnSub: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    selectedFileBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        backgroundColor: colors.surfaceLight,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginTop: spacing.md,
        borderWidth: 1,
        borderColor: colors.primary,
    },
    fileDetails: {
        flex: 1,
        marginRight: spacing.sm,
    },
    fileName: {
        ...typography.bodyBold,
        color: colors.textPrimary,
        marginBottom: 2,
    },
    fileSize: {
        ...typography.caption,
        color: colors.textSecondary,
    },
    checkMark: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 1,
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: colors.primaryMuted,
        borderRadius: borderRadius.sm,
    },
    metaCard: {
        padding: spacing.md,
        gap: spacing.sm,
    },
    progressBox: {
        marginVertical: spacing.sm,
    },
    progressText: {
        ...typography.caption,
        color: colors.primary,
        marginBottom: 4,
    },
    actionBtn: {
        marginTop: spacing.sm,
    },
    presetCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderRadius: borderRadius.md,
        padding: spacing.md,
        marginBottom: spacing.sm,
        borderWidth: 1,
        borderColor: colors.cardBorder,
    },
    presetCardSelected: {
        borderColor: colors.primary,
        backgroundColor: colors.surfaceLight,
    },
    presetBadge: {
        width: 44,
        height: 44,
        borderRadius: borderRadius.sm,
        backgroundColor: colors.primaryMuted,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    presetBadgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 1,
    },
    presetInfo: {
        flex: 1,
    },
    presetTitle: {
        ...typography.bodyBold,
        marginBottom: 2,
    },
    presetTitleSelected: {
        color: colors.primary,
    },
    presetMeta: {
        ...typography.small,
        color: colors.textSecondary,
    },
    radioCircle: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: colors.surfaceBorder,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: spacing.sm,
    },
    radioCircleSelected: {
        borderColor: colors.primary,
    },
    radioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
    },
    computerCard: {
        padding: spacing.lg,
        gap: spacing.sm,
    },
    stepTitle: {
        ...typography.caption,
        color: colors.textSecondary,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginTop: spacing.xs,
    },
    urlDisplay: {
        ...typography.bodyBold,
        color: colors.primary,
        fontFamily: 'Courier',
        backgroundColor: colors.surfaceLight,
        padding: spacing.sm,
        borderRadius: borderRadius.sm,
        marginBottom: spacing.sm,
    },
    codeDisplay: {
        ...typography.h1,
        color: colors.primary,
        fontFamily: 'Courier',
        letterSpacing: 4,
        textAlign: 'center',
        backgroundColor: colors.surfaceLight,
        padding: spacing.sm,
        borderRadius: borderRadius.sm,
        marginBottom: spacing.sm,
    },
    stepSub: {
        ...typography.small,
        color: colors.textSecondary,
        lineHeight: 18,
    },
});
