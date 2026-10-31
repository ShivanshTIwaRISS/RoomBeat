import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { colors, borderRadius, typography, spacing } from '../theme';
import { Header } from '../components/common/Header';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { useAppStore } from '../store/useAppStore';
import { syncManager } from '../sync/SyncManager';
import { formatMs } from '../utils/formatters';
export const DeviceCalibrationScreen = ({ navigation, }) => {
    const latencyCompensationMs = useAppStore((s) => s.latencyCompensationMs);
    const setLatencyCompensation = useAppStore((s) => s.setLatencyCompensation);
    const [currentCompensation, setCurrentCompensation] = useState(latencyCompensationMs);
    const handleAdjust = (deltaMs) => {
        const updated = Math.min(450, Math.max(-250, currentCompensation + deltaMs));
        setCurrentCompensation(updated);
        setLatencyCompensation(updated);
        syncManager.setLatencyCompensation(updated);
    };
    const handleSetPreset = (presetMs) => {
        setCurrentCompensation(presetMs);
        setLatencyCompensation(presetMs);
        syncManager.setLatencyCompensation(presetMs);
    };
    const handleReset = () => {
        setCurrentCompensation(0);
        setLatencyCompensation(0);
        syncManager.setLatencyCompensation(0);
    };
    const handleTestSound = () => {
        Alert.alert('Audio Ping Test', 'Playing short calibration chirp on this device...');
    };
    return (<View style={styles.container}>
      <Header title="Device Calibration" subtitle="Fine-tune hardware audio latency" onBack={() => navigation.goBack()}/>

      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>Manual Latency Offset</Text>
          <Text style={styles.cardDesc}>
            Different phone hardware models, DACs, and internal audio drivers process sound with varying internal delays. Adjust this offset if your phone sounds slightly behind or ahead of others.
          </Text>

          <View style={styles.offsetDisplay}>
            <Text style={styles.offsetNumber}>{formatMs(currentCompensation)}</Text>
            <Text style={styles.offsetLabel}>
              {currentCompensation > 0
            ? 'Plays earlier to compensate for hardware / Bluetooth delay'
            : currentCompensation < 0
                ? 'Plays later'
                : 'Default hardware timing'}
            </Text>
          </View>

          {/* Quick Output Presets (Bluetooth / Phone / Soundbar) */}
          <View style={styles.presetsRow}>
            <TouchableOpacity onPress={() => handleSetPreset(0)} style={[styles.presetBtn, currentCompensation === 0 && styles.presetBtnActive]} activeOpacity={0.7}>
              <Text style={[styles.presetBtnText, currentCompensation === 0 && styles.presetBtnTextActive]}>📱 Phone</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSetPreset(180)} style={[styles.presetBtn, currentCompensation === 180 && styles.presetBtnActive]} activeOpacity={0.7}>
              <Text style={[styles.presetBtnText, currentCompensation === 180 && styles.presetBtnTextActive]}>🎧 Bluetooth (+180ms)</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleSetPreset(260)} style={[styles.presetBtn, currentCompensation === 260 && styles.presetBtnActive]} activeOpacity={0.7}>
              <Text style={[styles.presetBtnText, currentCompensation === 260 && styles.presetBtnTextActive]}>🔊 Soundbar</Text>
            </TouchableOpacity>
          </View>

          {/* Stepper Controls */}
          <View style={styles.stepperRow}>
            <TouchableOpacity onPress={() => handleAdjust(-10)} style={styles.stepBtn} activeOpacity={0.7}>
              <Text style={styles.stepBtnText}>-10 ms</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleAdjust(-2)} style={styles.stepBtnSmall} activeOpacity={0.7}>
              <Text style={styles.stepBtnText}>-2</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleReset} style={styles.resetBtn} activeOpacity={0.7}>
              <Text style={styles.resetBtnText}>Reset</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleAdjust(+2)} style={styles.stepBtnSmall} activeOpacity={0.7}>
              <Text style={styles.stepBtnText}>+2</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => handleAdjust(+10)} style={styles.stepBtn} activeOpacity={0.7}>
              <Text style={styles.stepBtnText}>+10 ms</Text>
            </TouchableOpacity>
          </View>
        </Card>

        {/* Test Audio Ping */}
        <Card style={styles.testCard}>
          <Text style={styles.testTitle}>Speaker Test Ping</Text>
          <Text style={styles.testDesc}>
            Trigger a synchronized beep across the room to verify audible phase alignment.
          </Text>

          <Button title="Play Test Ping" variant="outline" onPress={handleTestSound} style={styles.testBtn}/>
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
    },
    card: {
        padding: spacing.lg,
        marginBottom: spacing.md,
    },
    cardTitle: {
        ...typography.h3,
        marginBottom: 4,
    },
    cardDesc: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
        lineHeight: 18,
    },
    offsetDisplay: {
        alignItems: 'center',
        marginVertical: spacing.md,
    },
    offsetNumber: {
        ...typography.h1,
        fontSize: 44,
        fontFamily: 'Courier',
        color: colors.primary,
    },
    offsetLabel: {
        ...typography.small,
        marginTop: 4,
        textAlign: 'center',
    },
    stepperRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.md,
    },
    presetsRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: spacing.md,
    },
    presetBtn: {
        flex: 1,
        backgroundColor: colors.surfaceLight,
        paddingVertical: 10,
        paddingHorizontal: 4,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
        alignItems: 'center',
        justifyContent: 'center',
    },
    presetBtnActive: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(200, 255, 0, 0.1)',
    },
    presetBtnText: {
        ...typography.small,
        fontWeight: '700',
        color: colors.textSecondary,
        fontSize: 10,
    },
    presetBtnTextActive: {
        color: colors.primary,
    },
    stepBtn: {
        backgroundColor: colors.surfaceLight,
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    stepBtnSmall: {
        backgroundColor: colors.surfaceLight,
        paddingHorizontal: 10,
        paddingVertical: 10,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        borderColor: colors.surfaceBorder,
    },
    stepBtnText: {
        ...typography.small,
        fontWeight: '700',
        color: colors.textPrimary,
    },
    resetBtn: {
        paddingHorizontal: 8,
    },
    resetBtnText: {
        ...typography.small,
        color: colors.error,
        fontWeight: '700',
    },
    testCard: {
        padding: spacing.lg,
    },
    testTitle: {
        ...typography.h3,
        marginBottom: 4,
    },
    testDesc: {
        ...typography.caption,
        color: colors.textSecondary,
        marginBottom: spacing.md,
    },
    testBtn: {
        marginTop: spacing.xs,
    },
});
