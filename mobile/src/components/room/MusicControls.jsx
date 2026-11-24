import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Polygon, Rect } from 'react-native-svg';
import { colors, spacing } from '../../theme';

export const MusicControls = ({
    isPlaying,
    isHost = true,
    onPlay,
    onPause,
    onPrevious,
    onNext,
}) => {
    return (
        <View style={styles.container}>
            {/* Previous Button */}
            <TouchableOpacity
                onPress={onPrevious}
                style={[styles.secondaryButton, !isHost && styles.disabled]}
                disabled={!isHost}
                activeOpacity={0.7}
            >
                <Svg width="22" height="22" viewBox="0 0 24 24">
                    <Rect x="3" y="5" width="2.5" height="14" rx="1" fill={colors.textPrimary} />
                    <Polygon points="21,5 9,12 21,19" fill={colors.textPrimary} />
                </Svg>
            </TouchableOpacity>

            {/* Play / Pause Main Button */}
            <TouchableOpacity
                onPress={isPlaying ? onPause : onPlay}
                style={[styles.primaryButton, !isHost && styles.disabled]}
                disabled={!isHost}
                activeOpacity={0.85}
            >
                {isPlaying ? (
                    <Svg width="26" height="26" viewBox="0 0 24 24">
                        <Rect x="5" y="4" width="4.5" height="16" rx="2" fill={colors.black} />
                        <Rect x="14.5" y="4" width="4.5" height="16" rx="2" fill={colors.black} />
                    </Svg>
                ) : (
                    <Svg width="28" height="28" viewBox="0 0 24 24" style={{ marginLeft: 3 }}>
                        <Polygon points="5,3 20,12 5,21" fill={colors.black} />
                    </Svg>
                )}
            </TouchableOpacity>

            {/* Next Button */}
            <TouchableOpacity
                onPress={onNext}
                style={[styles.secondaryButton, !isHost && styles.disabled]}
                disabled={!isHost}
                activeOpacity={0.7}
            >
                <Svg width="22" height="22" viewBox="0 0 24 24">
                    <Polygon points="3,5 15,12 3,19" fill={colors.textPrimary} />
                    <Rect x="18.5" y="5" width="2.5" height="14" rx="1" fill={colors.textPrimary} />
                </Svg>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.lg,
        gap: spacing.xl,
    },
    primaryButton: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
        elevation: 10,
    },
    secondaryButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: colors.surfaceLight,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabled: {
        opacity: 0.35,
    },
});
