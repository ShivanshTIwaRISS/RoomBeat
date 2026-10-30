import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, typography, spacing } from '../../theme';
import { Button } from './Button';
export const EmptyState = ({ icon = '🎵', title, description, actionTitle, onAction, }) => {
    return (<View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      {actionTitle && onAction && (<Button title={actionTitle} onPress={onAction} variant="secondary" size="sm" style={styles.actionButton}/>)}
    </View>);
};
const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: spacing.xl,
        marginVertical: spacing.lg,
    },
    icon: {
        fontSize: 44,
        marginBottom: spacing.md,
    },
    title: {
        ...typography.h3,
        marginBottom: spacing.xs,
        textAlign: 'center',
    },
    description: {
        ...typography.caption,
        color: colors.textSecondary,
        textAlign: 'center',
        maxWidth: 260,
        lineHeight: 18,
    },
    actionButton: {
        marginTop: spacing.md,
    },
});
