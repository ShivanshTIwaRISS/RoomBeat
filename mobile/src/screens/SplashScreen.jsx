import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { colors, typography, spacing } from '../theme';
import { storage } from '../utils/storage';
import { useSessionStore } from '../store/useSessionStore';
import { AudioWaveBackground } from '../components/home/AudioWaveBackground';
export const SplashScreen = ({ navigation }) => {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const initializeSession = useSessionStore((s) => s.initialize);
    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 20,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();
        const checkStateAndNavigate = async () => {
            await initializeSession();
            const seenOnboarding = await storage.getHasSeenOnboarding();
            setTimeout(() => {
                if (seenOnboarding) {
                    navigation.replace('Home');
                }
                else {
                    navigation.replace('Onboarding');
                }
            }, 2000);
        };
        checkStateAndNavigate();
    }, [navigation, initializeSession]);
    return (<View style={styles.container}>
      <Animated.View style={[
            styles.content,
            {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }],
            },
        ]}>
        <View style={styles.logoBadge}>
          <Text style={styles.logoIcon}>RB</Text>
        </View>
        <Text style={styles.brandTitle}>RoomBeat</Text>
        <Text style={styles.tagline}>Every Phone. One Beat.</Text>

        <View style={styles.waveWrapper}>
          <AudioWaveBackground />
        </View>
      </Animated.View>
    </View>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        alignItems: 'center',
    },
    logoBadge: {
        width: 88,
        height: 88,
        borderRadius: 44,
        backgroundColor: colors.surface,
        borderWidth: 2,
        borderColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.lg,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 8,
    },
    logoIcon: {
        fontSize: 40,
    },
    brandTitle: {
        ...typography.h1,
        fontSize: 38,
        letterSpacing: -1,
        marginBottom: spacing.xs,
    },
    tagline: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '700',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    waveWrapper: {
        marginTop: spacing.xl,
    },
});
