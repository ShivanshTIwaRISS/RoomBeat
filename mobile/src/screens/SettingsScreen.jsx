import React from 'react';
import { View, Text, StyleSheet, ScrollView, Switch, TouchableOpacity, Alert } from 'react-native';
import { colors, typography, spacing } from '../theme';
import { Header } from '../components/common/Header';
import { Card } from '../components/common/Card';
import { useAppStore } from '../store/useAppStore';
import { audioManager } from '../audio/AudioManager';
import { CONFIG } from '../constants/config';
export const SettingsScreen = ({ navigation }) => {
    const keepScreenAwake = useAppStore((s) => s.keepScreenAwake);
    const setKeepScreenAwake = useAppStore((s) => s.setKeepScreenAwake);
    const autoReconnect = useAppStore((s) => s.autoReconnect);
    const setAutoReconnect = useAppStore((s) => s.setAutoReconnect);
    const handleClearCache = async () => {
        Alert.alert('Clear Audio Cache', 'This will delete all temporarily cached tracks downloaded to this phone. Tracks will be re-downloaded when played.', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Clear Cache',
                style: 'destructive',
                onPress: async () => {
                    await audioManager.clearCache();
                    Alert.alert('Cache Cleared', 'All locally stored audio files have been cleared.');
                },
            },
        ]);
    };
    return (<View style={styles.container}>
      <Header title="Settings" onBack={() => navigation.goBack()}/>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Playback Settings */}
        <Text style={styles.sectionHeader}>Session & Playback</Text>
        <Card style={styles.card}>
          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Keep Screen Awake</Text>
              <Text style={styles.settingDesc}>Prevents phone from sleeping during music playback</Text>
            </View>
            <Switch value={keepScreenAwake} onValueChange={setKeepScreenAwake} trackColor={{ false: colors.surfaceBorder, true: colors.primary }} thumbColor={colors.white}/>
          </View>

          <View style={styles.divider}/>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingTitle}>Auto-Reconnect</Text>
              <Text style={styles.settingDesc}>Automatically rejoin room if Wi-Fi temporarily drops</Text>
            </View>
            <Switch value={autoReconnect} onValueChange={setAutoReconnect} trackColor={{ false: colors.surfaceBorder, true: colors.primary }} thumbColor={colors.white}/>
          </View>
        </Card>

        {/* Audio Storage */}
        <Text style={styles.sectionHeader}>Audio Storage & Cache</Text>
        <Card style={styles.card}>
          <TouchableOpacity style={styles.settingRow} onPress={handleClearCache} activeOpacity={0.7}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: colors.error }]}>Clear Cached Audio</Text>
              <Text style={styles.settingDesc}>Free up storage space on your device</Text>
            </View>
            <Text style={styles.actionArrow}>🗑️</Text>
          </TouchableOpacity>
        </Card>

        {/* About & Legal */}
        <Text style={styles.sectionHeader}>About</Text>
        <Card style={styles.card}>
          <View style={styles.settingRow}>
            <Text style={styles.settingTitle}>App Name</Text>
            <Text style={styles.settingValue}>{CONFIG.appName}</Text>
          </View>
          <View style={styles.divider}/>
          <View style={styles.settingRow}>
            <Text style={styles.settingTitle}>Tagline</Text>
            <Text style={styles.settingValue}>{CONFIG.tagline}</Text>
          </View>
          <View style={styles.divider}/>
          <View style={styles.settingRow}>
            <Text style={styles.settingTitle}>Version</Text>
            <Text style={styles.settingValue}>
              v{CONFIG.version} (Build {CONFIG.buildNumber})
            </Text>
          </View>
        </Card>
      </ScrollView>
    </View>);
};
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    content: {
        padding: spacing.md,
        paddingBottom: spacing.xxl,
    },
    sectionHeader: {
        ...typography.caption,
        color: colors.primary,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: spacing.xs,
        marginTop: spacing.md,
        marginLeft: 4,
    },
    card: {
        padding: spacing.md,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.xs,
    },
    settingInfo: {
        flex: 1,
        paddingRight: spacing.md,
    },
    settingTitle: {
        ...typography.bodyBold,
        marginBottom: 2,
    },
    settingDesc: {
        ...typography.small,
    },
    settingValue: {
        ...typography.caption,
        color: colors.textSecondary,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: colors.surfaceBorder,
        marginVertical: spacing.sm,
    },
    actionArrow: {
        fontSize: 18,
    },
});
