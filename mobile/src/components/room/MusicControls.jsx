import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { colors, spacing } from '../../theme';
export const MusicControls = ({ isPlaying, isHost, onPlay, onPause, onPrevious, onNext, }) => {
    return (<View style={styles.container}>
      {/* Previous Button */}
      <TouchableOpacity onPress={onPrevious} disabled={!isHost} style={[styles.secondaryButton, !isHost && styles.disabled]} activeOpacity={0.7}>
        <Text style={styles.controlIcon}>⏮</Text>
      </TouchableOpacity>

      {/* Play / Pause Main Button */}
      <TouchableOpacity onPress={isPlaying ? onPause : onPlay} disabled={!isHost} style={[styles.primaryButton, !isHost && styles.disabled]} activeOpacity={0.8}>
        <Text style={styles.playIcon}>{isPlaying ? '⏸' : '▶'}</Text>
      </TouchableOpacity>

      {/* Next Button */}
      <TouchableOpacity onPress={onNext} disabled={!isHost} style={[styles.secondaryButton, !isHost && styles.disabled]} activeOpacity={0.7}>
        <Text style={styles.controlIcon}>⏭</Text>
      </TouchableOpacity>
    </View>);
};
const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.md,
        gap: spacing.xl,
    },
    primaryButton: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 10,
        elevation: 8,
    },
    secondaryButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: colors.surfaceLight,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        alignItems: 'center',
        justifyContent: 'center',
    },
    playIcon: {
        fontSize: 28,
        color: colors.black,
        marginLeft: 2,
    },
    controlIcon: {
        fontSize: 20,
        color: colors.textPrimary,
    },
    disabled: {
        opacity: 0.4,
    },
});
