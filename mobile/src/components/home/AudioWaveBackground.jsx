import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors } from '../../theme';
export const AudioWaveBackground = () => {
    const bars = [
        useRef(new Animated.Value(10)).current,
        useRef(new Animated.Value(24)).current,
        useRef(new Animated.Value(16)).current,
        useRef(new Animated.Value(32)).current,
        useRef(new Animated.Value(12)).current,
        useRef(new Animated.Value(28)).current,
        useRef(new Animated.Value(18)).current,
    ];
    useEffect(() => {
        const animations = bars.map((bar, i) => {
            const minH = 8 + (i % 3) * 4;
            const maxH = 28 + (i % 4) * 8;
            const duration = 500 + (i % 3) * 200;
            return Animated.loop(Animated.sequence([
                Animated.timing(bar, {
                    toValue: maxH,
                    duration,
                    useNativeDriver: false,
                }),
                Animated.timing(bar, {
                    toValue: minH,
                    duration,
                    useNativeDriver: false,
                }),
            ]));
        });
        animations.forEach((anim) => anim.start());
        return () => {
            animations.forEach((anim) => anim.stop());
        };
    }, []);
    return (<View style={styles.container}>
      {bars.map((bar, index) => (<Animated.View key={index} style={[
                styles.bar,
                { height: bar },
            ]}/>))}
    </View>);
};
const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: 48,
        gap: 6,
    },
    bar: {
        width: 4,
        borderRadius: 2,
        backgroundColor: colors.primary,
        opacity: 0.85,
    },
});
