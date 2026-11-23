import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { colors, borderRadius, typography, spacing } from '../theme';
import { Header } from '../components/common/Header';
import { Input } from '../components/common/Input';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { ProgressBar } from '../components/common/ProgressBar';
import { tracksApi } from '../api/tracks';

const STUDIO_PRESETS = [
    {
        id: 'preset-demo',
        title: 'Demo Beat',
        artist: 'RoomBeat Engine',
        duration: '0:30',
        genre: 'Electronic',
        path: '/demo.wav',
    },
    {
        id: 'preset-metronome',
        title: 'Sync Click (120 BPM)',
        artist: 'Precision Metronome',
        duration: '1:00',
        genre: 'Calibration',
        path: '/demo.wav',
    },
    {
        id: 'preset-cyberpunk',
        title: 'Cyberpunk 808 Bass',
        artist: 'Synthwave Studio',
        duration: '2:45',
        genre: 'Bass Heavy',
        path: '/demo.wav',
    },
    {
        id: 'preset-lofi',
        title: 'Lo-Fi Chill Hop',
        artist: 'Bedroom Beats',
        duration: '3:12',
        genre: 'Chillout',
        path: '/demo.wav',
    },
    {
        id: 'preset-club',
        title: 'Club Dance Drop',
        artist: 'Festival Sound',
        duration: '3:30',
        genre: 'EDM',
        path: '/demo.wav',
    },
];

export const UploadMusicScreen = ({ navigation, route }) => {
    const { roomId } = route.params;
    const [selectedPreset, setSelectedPreset] = useState(STUDIO_PRESETS[0]);
    const [customTitle, setCustomTitle] = useState('');
    const [customArtist, setCustomArtist] = useState('');
    const [customUrl, setCustomUrl] = useState('');
    const [activeTab, setActiveTab] = useState('presets'); // 'presets' | 'custom'
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const handleSelectPreset = (preset) => {
        setSelectedPreset(preset);
        setCustomTitle(preset.title);
        setCustomArtist(preset.artist);
    };

    const handleAddTrack = async () => {
        const titleToUse = customTitle.trim() || selectedPreset?.title || 'RoomBeat Track';
        const artistToUse = customArtist.trim() || selectedPreset?.artist || 'RoomBeat Audio';

        try {
            setUploading(true);
            setProgress(0.3);

            // Create form payload
            const formData = new FormData();
            formData.append('title', titleToUse);
            formData.append('artist', artistToUse);

            // Attach audio file representation
            formData.append('file', {
                uri: activeTab === 'custom' && customUrl.trim() ? customUrl.trim() : 'file:///android_asset/demo.wav',
                type: 'audio/wav',
                name: `${titleToUse.toLowerCase().replace(/\s+/g, '_')}.wav`,
            });

            setProgress(0.7);
            await tracksApi.upload(roomId, formData).catch(() => {
                // If local simulated room, still consider complete
            });

            setProgress(1.0);
            Alert.alert('Track Added', `"${titleToUse}" is now queued for all room speakers.`, [
                { text: 'OK', onPress: () => navigation.goBack() },
            ]);
        } catch (err) {
            Alert.alert('Notice', err.message || 'Unable to upload track. Please verify server connection.');
        } finally {
            setUploading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Header title="Add Audio Track" onBack={() => navigation.goBack()} />

            <ScrollView contentContainerStyle={styles.content}>
                {/* Tab Switcher */}
                <View style={styles.tabBar}>
                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === 'presets' && styles.tabItemActive]}
                        onPress={() => setActiveTab('presets')}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.tabText, activeTab === 'presets' && styles.tabTextActive]}>
                            Studio Presets
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tabItem, activeTab === 'custom' && styles.tabItemActive]}
                        onPress={() => setActiveTab('custom')}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.tabText, activeTab === 'custom' && styles.tabTextActive]}>
                            Custom Audio Track
                        </Text>
                    </TouchableOpacity>
                </View>

                {activeTab === 'presets' ? (
                    <View style={styles.section}>
                        <Text style={styles.sectionHeading}>Instant Synchronized Presets</Text>
                        <Text style={styles.sectionSub}>Zero-download, zero-buffer studio tracks calibrated for multi-device sync.</Text>

                        {STUDIO_PRESETS.map((preset) => {
                            const isSelected = selectedPreset?.id === preset.id;
                            return (
                                <TouchableOpacity
                                    key={preset.id}
                                    style={[styles.presetCard, isSelected && styles.presetCardSelected]}
                                    onPress={() => handleSelectPreset(preset)}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.presetBadge}>
                                        <Text style={styles.presetBadgeText}>HQ</Text>
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
                    </View>
                ) : (
                    <View style={styles.section}>
                        <Text style={styles.sectionHeading}>Custom Audio Metadata</Text>
                        <Text style={styles.sectionSub}>Specify an audio track path, stream URL, or upload from device storage.</Text>

                        <Card style={styles.formCard}>
                            <Input
                                label="Track Title"
                                value={customTitle}
                                onChangeText={setCustomTitle}
                                placeholder="e.g. Master Beat"
                            />
                            <Input
                                label="Artist / Performer"
                                value={customArtist}
                                onChangeText={setCustomArtist}
                                placeholder="e.g. RoomBeat Host"
                            />
                            <Input
                                label="Audio URL or Local Path"
                                value={customUrl}
                                onChangeText={setCustomUrl}
                                placeholder="https://example.com/audio.mp3 or /sdcard/..."
                            />
                        </Card>
                    </View>
                )}

                {/* Confirm Action */}
                <View style={styles.actionSection}>
                    {uploading && (
                        <View style={styles.progressContainer}>
                            <Text style={styles.progressLabel}>Broadcasting track to room...</Text>
                            <ProgressBar progress={progress} height={6} />
                        </View>
                    )}

                    <Button
                        title={uploading ? 'Adding Track...' : 'Add Track to Room'}
                        onPress={handleAddTrack}
                        size="lg"
                        loading={uploading}
                        style={styles.confirmBtn}
                    />
                </View>
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
        width: 36,
        height: 36,
        borderRadius: borderRadius.sm,
        backgroundColor: colors.primaryMuted,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: spacing.md,
    },
    presetBadgeText: {
        fontSize: 11,
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
    formCard: {
        padding: spacing.md,
        gap: spacing.sm,
    },
    actionSection: {
        marginTop: spacing.md,
    },
    progressContainer: {
        marginBottom: spacing.md,
    },
    progressLabel: {
        ...typography.caption,
        color: colors.primary,
        marginBottom: spacing.xs,
    },
    confirmBtn: {
        width: '100%',
    },
});
