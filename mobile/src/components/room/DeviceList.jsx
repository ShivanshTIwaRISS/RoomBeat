import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { DeviceCard } from './DeviceCard';
import { colors, typography, spacing } from '../../theme';
export const DeviceList = ({ members, maxDevices }) => {
    return (<View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Connected Speakers</Text>
        <Text style={styles.counter}>
          {members.length} / {maxDevices}
        </Text>
      </View>

      {members.map((member) => (<DeviceCard key={member.sessionId} member={member}/>))}
    </View>);
};
const styles = StyleSheet.create({
    container: {
        paddingHorizontal: spacing.md,
        marginTop: spacing.md,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.sm,
    },
    title: {
        ...typography.h3,
    },
    counter: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '700',
    },
});
