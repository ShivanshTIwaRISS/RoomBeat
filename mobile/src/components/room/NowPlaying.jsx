import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { colors, borderRadius, typography, spacing } from '../../theme';
import { ProgressBar } from '../common/ProgressBar';
import { formatDuration } from '../../utils/formatters';

export const NowPlaying = ({
    track,
    positionMs,
    durationMs,
    isPlaying,
    onSeek,
}) => {
    const effectiveDuration = durationMs || track?.durationMs || 180000;
    const progress = Math.min(1, Math.max(0, positionMs / effectiveDuration));

    return (
        <View style={styles.container}>
            {/* Vinyl / Soundwave Artwork Card */}
            <View style={styles.artwork}>
                {/* Visualizer Soundwave SVG */}
                <Svg width="100" height="60" viewBox="0 0 100 60">
                    <Rect x="5" y={isPlaying ? 15 : 25} width="6" height={isPlaying ? 30 : 10} rx="3" fill={colors.primary} />
                    <Rect x="18" y={isPlaying ? 8 : 22} width="6" height={isPlaying ? 44 : 16} rx="3" fill={colors.primary} opacity={0.9} />
                    <Rect x="31" y={isPlaying ? 18 : 26} width="6" height={isPlaying ? 24 : 8} rx="3" fill={colors.primary} />
                    <Rect x="44" y={isPlaying ? 4 : 20} width="6" height={isPlaying ? 52 : 20} rx="3" fill={colors.primary} />
                    <Rect x="57" y={isPlaying ? 12 : 24} width="6" height={isPlaying ? 36 : 12} rx="3" fill={colors.primary} opacity={0.9} />
                    <Rect x="70" y={isPlaying ? 6 : 22} width="6" height={isPlaying ? 48 : 16} rx="3" fill={colors.primary} />
                    <Rect x="83" y={isPlaying ? 16 : 26} width="6" height={isPlaying ? 28 : 8} rx="3" fill={colors.primary} />
                </Svg>

                <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>
                        {isPlaying ? 'SYNCHRONIZED' : 'IDLE'}
                    </Text>
                </View>

                {isPlaying && <View style={styles.pulseDot} />}
            </View>

            {/* Track Metadata */}
            <View style={styles.metaContainer}>
                <Text style={styles.title} numberOfLines={1}>
                    {track ? track.title : 'RoomBeat Synchronized Stream'}
                </Text>
                <Text style={styles.artist} numberOfLines={1}>
                    {track ? track.artist : 'Select or queue a studio preset'}
                </Text>
            </View>

            {/* Progress Bar & Timestamps */}
            <View style={styles.progressSection}>
                <ProgressBar progress={progress} />
                <View style={styles.timeRow}>
                    <Text style={styles.timeText}>{formatDuration(positionMs)}</Text>
                    <Text style={styles.timeText}>{formatDuration(effectiveDuration)}</Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: spacing.sm,
    },
    artwork: {
        width: 190,
        height: 190,
        borderRadius: borderRadius.xl,
        backgroundColor: colors.surfaceLight,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.md,
        position: 'relative',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    badgeContainer: {
        marginTop: spacing.md,
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
        backgroundColor: 'rgba(16, 185, 129, 0.12)',
        borderWidth: 1,
        borderColor: colors.primary,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 2,
    },
    pulseDot: {
        position: 'absolute',
        top: 14,
        right: 14,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: colors.primary,
    },
    metaContainer: {
        alignItems: 'center',
        marginBottom: spacing.md,
        paddingHorizontal: spacing.lg,
    },
    title: {
        ...typography.h2,
        textAlign: 'center',
        marginBottom: 2,
    },
    artist: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    progressSection: {
        width: '100%',
        paddingHorizontal: spacing.md,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.xs,
    },
    timeText: {
        ...typography.caption,
        color: colors.textSecondary,
        fontFamily: 'Courier',
    },
});
