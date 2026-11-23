import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, typography, spacing } from '../../theme';
import { ProgressBar } from '../common/ProgressBar';
import { formatDuration } from '../../utils/formatters';
export const NowPlaying = ({ track, positionMs, durationMs, isPlaying, onSeek, }) => {
    const effectiveDuration = durationMs || track?.durationMs || 1;
    const progress = Math.min(1, positionMs / effectiveDuration);
    return (<View style={styles.container}>
      {/* Artwork Placeholder */}
      <View style={styles.artwork}>
        <Text style={styles.artworkIcon}>NOW PLAYING</Text>
        {isPlaying && <View style={styles.pulseDot}/>}
      </View>

      {/* Track Metadata */}
      <View style={styles.metaContainer}>
        <Text style={styles.title} numberOfLines={1}>
          {track ? track.title : 'No Track Selected'}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {track ? track.artist : 'Select a track from the library'}
        </Text>
      </View>

      {/* Progress Bar & Timestamps */}
      <View style={styles.progressSection}>
        <ProgressBar progress={progress}/>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{formatDuration(positionMs)}</Text>
          <Text style={styles.timeText}>{formatDuration(effectiveDuration)}</Text>
        </View>
      </View>
    </View>);
};
const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        paddingVertical: spacing.md,
    },
    artwork: {
        width: 180,
        height: 180,
        borderRadius: borderRadius.xl,
        backgroundColor: colors.surfaceLight,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        position: 'relative',
        shadowColor: colors.black,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },
    artworkIcon: {
        fontSize: 11,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 2,
        textTransform: 'uppercase',
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
        width: '100%',
    },
    title: {
        ...typography.h2,
        textAlign: 'center',
        marginBottom: 4,
    },
    artist: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
    },
    progressSection: {
        width: '100%',
        paddingHorizontal: spacing.lg,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.xs,
    },
    timeText: {
        ...typography.small,
    },
});
