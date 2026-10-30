import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, borderRadius } from '../../theme';
export const ProgressBar = ({ progress, onSeek, height = 4, }) => {
    const clampedProgress = Math.max(0, Math.min(1, progress || 0));
    const handlePress = (e) => {
        if (!onSeek)
            return;
        const { locationX } = e.nativeEvent;
        // We assume container width will be calculated or measured
    };
    return (<View style={[styles.container, { height }]}>
      <View style={[styles.fill, { width: `${clampedProgress * 100}%` }]}/>
      {clampedProgress > 0 && <View style={styles.thumb}/>}
    </View>);
};
const styles = StyleSheet.create({
    container: {
        width: '100%',
        backgroundColor: colors.surfaceBorder,
        borderRadius: borderRadius.full,
        overflow: 'visible',
        position: 'relative',
        justifyContent: 'center',
    },
    fill: {
        height: '100%',
        backgroundColor: colors.primary,
        borderRadius: borderRadius.full,
    },
    thumb: {
        position: 'absolute',
        right: -4,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
    },
});
