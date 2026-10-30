import React from 'react';
import { View, Text, TextInput, StyleSheet, } from 'react-native';
import { colors, borderRadius, typography, spacing } from '../../theme';
export const Input = ({ label, error, containerStyle, style, ...rest }) => {
    return (<View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput placeholderTextColor={colors.textTertiary} style={[
            styles.input,
            error ? styles.inputError : undefined,
            style,
        ]} {...rest}/>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>);
};
const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.md,
    },
    label: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
        fontWeight: '600',
    },
    input: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        borderRadius: borderRadius.md,
        paddingHorizontal: spacing.md,
        paddingVertical: 12,
        color: colors.textPrimary,
        fontSize: 16,
    },
    inputError: {
        borderColor: colors.error,
    },
    errorText: {
        ...typography.small,
        color: colors.error,
        marginTop: 4,
    },
});
