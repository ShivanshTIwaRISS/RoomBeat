import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, StatusBar, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../../theme';

export const Header = ({ title, subtitle, onBack, rightAction, }) => {
    const insets = useSafeAreaInsets();
    const topInset = Math.max(insets.top, Platform.OS === 'android' ? (StatusBar.currentHeight || 24) : 0, 16);

    return (<View style={[styles.container, { paddingTop: topInset + 6 }]}>
      <View style={styles.leftContainer}>
        {onBack && (<TouchableOpacity onPress={onBack} style={styles.backButton} activeOpacity={0.7}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>)}
        <View style={styles.titleWrapper}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          {subtitle && <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>}
        </View>
      </View>
      {rightAction && <View style={styles.rightContainer}>{rightAction}</View>}
    </View>);
};
const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: spacing.md,
        paddingBottom: spacing.sm,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: colors.surfaceBorder,
    },
    leftContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    titleWrapper: {
        flex: 1,
    },
    backButton: {
        paddingRight: spacing.md,
        paddingVertical: spacing.xs,
    },
    backIcon: {
        color: colors.primary,
        fontSize: 24,
        fontWeight: '700',
    },
    title: {
        ...typography.h3,
    },
    subtitle: {
        ...typography.small,
        marginTop: 2,
    },
    rightContainer: {
        marginLeft: spacing.sm,
    },
});
