import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../theme';
export const LoadingSpinner = ({ message }) => {
    return (<View style={styles.container}>
      <ActivityIndicator size="large" color={colors.primary}/>
      {message && <Text style={styles.message}>{message}</Text>}
    </View>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
    },
    message: {
        ...typography.caption,
        color: colors.textSecondary,
        marginTop: spacing.md,
    },
});
