import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { colors, typography, spacing } from '../theme';
import { Button } from '../components/common/Button';
import { storage } from '../utils/storage';
const { width } = Dimensions.get('window');
const SLIDES = [
    {
        icon: '📱🔊',
        title: 'Your Phones, One Speaker System',
        description: 'Transform multiple smartphones in the same room into a unified, high-power distributed wireless speaker system.',
    },
    {
        icon: '⚡🔗',
        title: 'Connect Your Crew in Seconds',
        description: 'One person creates a room. Everyone joins by scanning a QR code or entering a 6-character room code. No complex pairing.',
    },
    {
        icon: '⏱️🎵',
        title: 'Feel Every Beat Together',
        description: 'Coordinated audio playback using high-precision NTP clock synchronization. Everyone hears the music simultaneously.',
    },
];
export const OnboardingScreen = ({ navigation }) => {
    const [currentIndex, setCurrentIndex] = useState(0);
    const handleFinish = async () => {
        await storage.setHasSeenOnboarding(true);
        navigation.replace('Home');
    };
    const handleNext = () => {
        if (currentIndex < SLIDES.length - 1) {
            setCurrentIndex(currentIndex + 1);
        }
        else {
            handleFinish();
        }
    };
    const slide = SLIDES[currentIndex];
    return (<View style={styles.container}>
      {/* Skip button on top */}
      <View style={styles.header}>
        {currentIndex < SLIDES.length - 1 ? (<TouchableOpacity onPress={handleFinish}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>) : (<View />)}
      </View>

      {/* Main Slide Content */}
      <View style={styles.slideContainer}>
        <View style={styles.iconCircle}>
          <Text style={styles.icon}>{slide.icon}</Text>
        </View>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.description}>{slide.description}</Text>
      </View>

      {/* Indicators & Actions */}
      <View style={styles.footer}>
        <View style={styles.indicators}>
          {SLIDES.map((_, i) => (<View key={i} style={[
                styles.dot,
                currentIndex === i ? styles.activeDot : styles.inactiveDot,
            ]}/>))}
        </View>

        <Button title={currentIndex === SLIDES.length - 1 ? 'Get Started' : 'Next'} onPress={handleNext} size="lg" style={styles.actionBtn}/>
      </View>
    </View>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'space-between',
        padding: spacing.lg,
    },
    header: {
        alignItems: 'flex-end',
        height: 40,
        justifyContent: 'center',
    },
    skipText: {
        ...typography.body,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    slideContainer: {
        alignItems: 'center',
        paddingHorizontal: spacing.md,
    },
    iconCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: colors.surface,
        borderWidth: 1.5,
        borderColor: colors.surfaceBorder,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: spacing.xl,
    },
    icon: {
        fontSize: 52,
    },
    title: {
        ...typography.h1,
        textAlign: 'center',
        marginBottom: spacing.md,
        lineHeight: 38,
    },
    description: {
        ...typography.body,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 320,
    },
    footer: {
        alignItems: 'center',
        marginBottom: spacing.md,
    },
    indicators: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: spacing.xl,
    },
    dot: {
        height: 8,
        borderRadius: 4,
    },
    activeDot: {
        width: 24,
        backgroundColor: colors.primary,
    },
    inactiveDot: {
        width: 8,
        backgroundColor: colors.surfaceBorder,
    },
    actionBtn: {
        width: '100%',
    },
});
