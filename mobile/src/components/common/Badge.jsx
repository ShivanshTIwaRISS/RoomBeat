import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, borderRadius, typography, spacing } from '../../theme';
export const Badge = ({ label, variant = 'muted' }) => {
    const getBadgeStyle = () => {
        switch (variant) {
            case 'success':
                return { bg: colors.successMuted, text: colors.success };
            case 'warning':
                return { bg: colors.warningMuted, text: colors.warning };
            case 'error':
                return { bg: colors.errorMuted, text: colors.error };
            case 'info':
                return { bg: colors.infoMuted, text: colors.info };
            case 'primary':
                return { bg: colors.primaryMuted, text: colors.primary };
            case 'muted':
            default:
                return { bg: colors.surfaceLight, text: colors.textSecondary };
        }
    };
    const { bg, text } = getBadgeStyle();
    return (<View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.text, { color: text }]}>{label}</Text>
    </View>);
};
const styles = StyleSheet.create({
    badge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 3,
        borderRadius: borderRadius.full,
        alignSelf: 'flex-start',
    },
    text: {
        ...typography.small,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
});
