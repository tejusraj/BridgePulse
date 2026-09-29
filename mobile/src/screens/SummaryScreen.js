import React, { useEffect, useRef, useCallback } from 'react';
import { View, StyleSheet, TouchableWithoutFeedback } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CircleCheck, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useScale } from '../theme/scale';
import { colors } from '../theme/tokens';
import { useStore } from '../state/store';
import Text from '../components/ui/Text';
import Card from '../components/ui/Card';

import Button from '../components/ui/Button';
import { uploadTrip } from '../services/uploadTrip';

export default function SummaryScreen() {
  const insets = useSafeAreaInsets();
  const { mu } = useScale();
  const lastTrip = useStore((s) => s.lastTrip);
  const goMap = useStore((s) => s.goMap);
  const setScreen = useStore((s) => s.setScreen);
  const bridge = useStore((s) => s.selectedBridge);

  const autoReturnTimer = useRef(null);
  const touched = useRef(false);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, []);

  useEffect(() => {
    if (lastTrip && bridge) {
      uploadTrip(lastTrip, bridge).catch(() => {});
    }
  }, []);

  useEffect(() => {
    autoReturnTimer.current = setTimeout(() => {
      if (!touched.current) {
        goMap();
      }
    }, 8000);
    return () => {
      if (autoReturnTimer.current) clearTimeout(autoReturnTimer.current);
    };
  }, [goMap]);

  const onTouch = useCallback(() => {
    touched.current = true;
    if (autoReturnTimer.current) {
      clearTimeout(autoReturnTimer.current);
      autoReturnTimer.current = null;
    }
  }, []);

  const quality = lastTrip?.quality ?? 0;
  const peakHz = lastTrip?.peakHz ?? 0;
  const sampleRate = lastTrip?.sampleRate ?? 0;
  const durationS = lastTrip ? Math.round(lastTrip.elapsedMs / 1000) : 12;

  

  return (
    <TouchableWithoutFeedback onPress={onTouch}>
      <View
        style={[
          styles.container,
          {
            paddingTop: mu(28) + insets.top,
            paddingHorizontal: mu(16),
            paddingBottom: mu(16) + insets.bottom,
          },
        ]}
      >
        {/* Header block */}
        <View style={[styles.header, { marginBottom: mu(16) }]}>
          <View style={[styles.checkCircle, { width: mu(56), height: mu(56), borderRadius: mu(28), marginBottom: mu(10) }]}>
            <CircleCheck size={mu(32)} color={colors.successText} />
          </View>
          <Text variant="title">Trip sent</Text>
          <Text variant="bodyS" style={styles.subtitle}>
            {bridge?.name || 'Bridge'} Â· {durationS} s trip
          </Text>
        </View>

        {/* Metric grid - 2 columns */}
        <View style={[styles.grid, { gap: mu(10), marginBottom: mu(12) }]}>
          <MetricCard label="Peak frequency" value={`${peakHz.toFixed(1)} Hz`} mu={mu} />
          <MetricCard label="Signal quality" value={`${quality} / 100`} mu={mu} />
          <MetricCard label="Sample rate" value={`${sampleRate} Hz`} mu={mu} />
          <MetricCard label="Duration" value={`${durationS} s`} mu={mu} />
        </View>

        

        {/* Privacy row */}
        <View style={[styles.privacyRow, { gap: mu(8), marginBottom: mu(16) }]}>
          <Lock size={mu(16)} color={colors.textSecondary} />
          <Text variant="small" style={styles.privacyText}>
            Your location stays on your phone. Only vibration features were sent.
          </Text>
        </View>

        {/* Buttons */}
        <View style={{ marginBottom: mu(8) }}>
          <Button label="Back to map" onPress={goMap} />
        </View>
        <Button
          label="View bridge status"
          onPress={() => {
            onTouch();
            setScreen('status');
          }}
        />
      </View>
    </TouchableWithoutFeedback>
  );
}

function MetricCard({ label, value, mu }) {
  return (
    <Card style={[cardStyles.card, { borderRadius: mu(8), paddingVertical: mu(10), paddingHorizontal: mu(12) }]}>
      <Text variant="caption" style={cardStyles.label}>{label}</Text>
      <Text variant="title">{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface2,
  },
  header: {
    alignItems: 'center',
  },
  checkCircle: {
    backgroundColor: colors.successBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: {
    color: colors.textSecondary,
    marginTop: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  privacyText: {
    color: colors.textSecondary,
    flex: 1,
  },
});

const cardStyles = StyleSheet.create({
  card: {
    width: '48%',
    flexGrow: 1,
  },
  label: {
    color: colors.textMuted,
    marginBottom: 4,
  },
});
