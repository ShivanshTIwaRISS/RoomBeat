import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, } from 'react-native';
import { colors, borderRadius, typography } from '../../theme';
export const Button = ({ title, onPress, variant = 'primary', size = 'md', loading = false, disabled = false, style, textStyle, icon, }) => {
    const getVariantStyles = () => {
        switch (variant) {
            case 'primary':
                return {
                    button: {
                        backgroundColor: disabled ? colors.textDisabled : colors.primary,
                        borderWidth: 0,
                    },
                    text: {
                        color: disabled ? colors.textTertiary : colors.black,
                        fontWeight: '700',
                    },
                };
            case 'secondary':
                return {
                    button: {
                        backgroundColor: colors.surfaceLight,
                        borderWidth: 1,
                        borderColor: colors.surfaceBorder,
                    },
                    text: {
                        color: colors.textPrimary,
                        fontWeight: '600',
                    },
                };
            case 'outline':
                return {
                    button: {
                        backgroundColor: 'transparent',
                        borderWidth: 1.5,
                        borderColor: disabled ? colors.surfaceBorder : colors.primary,
                    },
                    text: {
                        color: disabled ? colors.textDisabled : colors.primary,
                        fontWeight: '600',
                    },
                };
            case 'danger':
                return {
                    button: {
                        backgroundColor: colors.errorMuted,
                        borderWidth: 1,
                        borderColor: colors.error,
                    },
                    text: {
                        color: colors.error,
                        fontWeight: '600',
                    },
                };
            case 'ghost':
            default:
                return {
                    button: {
                        backgroundColor: 'transparent',
                        borderWidth: 0,
                    },
                    text: {
                        color: colors.textPrimary,
                        fontWeight: '500',
                    },
                };
        }
    };
    const getSizeStyles = () => {
        switch (size) {
            case 'sm':
                return {
                    button: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: borderRadius.md },
                    text: { fontSize: 13 },
                };
            case 'lg':
                return {
                    button: { paddingVertical: 18, paddingHorizontal: 28, borderRadius: borderRadius.xl },
                    text: { fontSize: 17, letterSpacing: -0.2 },
                };
            case 'md':
            default:
                return {
                    button: { paddingVertical: 14, paddingHorizontal: 22, borderRadius: borderRadius.lg },
                    text: { fontSize: 15 },
                };
        }
    };
    const vStyles = getVariantStyles();
    const sStyles = getSizeStyles();
    return (<TouchableOpacity activeOpacity={0.8} onPress={onPress} disabled={disabled || loading} style={[styles.baseButton, vStyles.button, sStyles.button, style]}>
      {loading ? (<ActivityIndicator size="small" color={variant === 'primary' ? colors.black : colors.primary}/>) : (<>
          {icon}
          <Text style={[styles.baseText, vStyles.text, sStyles.text, icon ? { marginLeft: 8 } : undefined, textStyle]}>
            {title}
          </Text>
        </>)}
    </TouchableOpacity>);
};
const styles = StyleSheet.create({
    baseButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    baseText: {
        ...typography.body,
        textAlign: 'center',
    },
});
