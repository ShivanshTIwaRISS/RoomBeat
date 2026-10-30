import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, borderRadius, spacing } from '../../theme';
export const Card = ({ children, style, variant = 'default' }) => {
    const getVariantStyle = () => {
        switch (variant) {
            case 'elevated':
                return {
                    backgroundColor: colors.surfaceLight,
                    borderColor: colors.surfaceBorder,
                };
            case 'glow':
                return {
                    backgroundColor: colors.surface,
                    borderColor: colors.primary,
                    shadowColor: colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 12,
                    elevation: 6,
                };
            case 'default':
            default:
                return {
                    backgroundColor: colors.surface,
                    borderColor: colors.cardBorder,
                };
        }
    };
    return <View style={[styles.card, getVariantStyle(), style]}>{children}</View>;
};
const styles = StyleSheet.create({
    card: {
        borderRadius: borderRadius.lg,
        borderWidth: 1,
        padding: spacing.md,
    },
});
