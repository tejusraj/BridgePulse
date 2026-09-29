import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeepAwake } from 'expo-keep-awake';
import { useScale } from '../theme/scale';
import { colors } from '../theme/tokens';
import { useStore } from '../state/store';
import { useTrip } from '../services/useTrip';
import { formatTimer } from '../utils/format';
import Text from '../components/ui/Text';
import BridgeStrip from '../components/live/BridgeStrip';
import RecordingChip from '../components/live/RecordingChip';
import ProgressBar from '../components/live/ProgressBar';
import MetricsRow from '../components/live/MetricsRow';
import LiveWaveform from '../components/live/LiveWaveform';
import LiveSpectrum from '../components/live/LiveSpectrum';

export default function OnBridgeScreen() {
  useKeepAwake();
  const insets = useSafeAreaInsets();
  const { mu } = useScale();

  const bridge = useStore((s) => s.selectedBridge);
  const trip = useStore((s) => s.trip);
  

  const { start, subscribeWaveform, subscribeSpectrum } = useTrip();

  const [samples, setSamples] = useState([]);
  const [specData, setSpecData] = useState(null);

  // Start recording on mount
  useEffect(() => {
    start();
  }, [start]);

  // Subscribe to waveform updates (avoids re-rendering entire screen)
  useEffect(() => {
    return subscribeWaveform((s) => setSamples(s));
  }, [subscribeWaveform]);

  // Subscribe to spectrum updates
  useEffect(() => {
    return subscribeSpectrum((s) => setSpecData(s));
  }, [subscribeSpectrum]);

  

  return (
    <View style={styles.container}>
      {/* Bridge strip with position marker */}
      <BridgeStrip progress={trip.progress} />
      <RecordingChip />

      {/* Panel */}
      <ScrollView
        style={styles.panel}
        contentContainerStyle={[
          styles.panelContent,
          {
            paddingVertical: mu(12),
            paddingHorizontal: mu(14),
            paddingBottom: mu(12) + insets.bottom,
          },
        ]}
      >
        {/* Header: bridge name + timer */}
        <View style={styles.headerRow}>
          <Text
            variant="body"
            style={{ fontWeight: '500' }}
            numberOfLines={1}
          >
            {bridge?.name || 'Bridge'}
          </Text>
          <Text variant="bodyS" style={styles.timer}>
            {formatTimer(trip.elapsedMs)}
          </Text>
        </View>

        {/* Progress bar */}
        <View style={{ marginTop: mu(8), marginBottom: mu(4) }}>
          <ProgressBar progress={trip.progress} />
        </View>

        {/* Progress labels */}
        <View style={[styles.progressLabels, { marginBottom: mu(10) }]}>
          <Text variant="caption" style={styles.muted}>
            {trip.phase === 'calibrating' ? 'Calibrating noise baseline...' : 'Recording bridge vibration'}
          </Text>
          <Text variant="caption" style={styles.muted}>
            {Math.round(trip.progress * 100)}%
          </Text>
        </View>

        {/* Metrics row */}
        <MetricsRow
          sampleRate={trip.sampleRate}
          quality={trip.quality}
          peakHz={trip.peakHz}
          gyroConfidence={trip.gyroConfidence}
        />

        {/* Waveform */}
        <Text variant="caption" style={[styles.muted, { marginBottom: mu(4) }]}>
          Vertical acceleration · live
        </Text>
        <LiveWaveform samples={samples} />

        {/* Spectrum */}
        <Text
          variant="caption"
          style={[styles.muted, { marginTop: mu(8), marginBottom: mu(4) }]}
        >
          Frequency spectrum
        </Text>
        <LiveSpectrum
          spec={specData?.spec}
          max={specData?.max}
          peakHz={specData?.peakHz}
          peakIdx={specData?.peakIdx}
        />

        {/* Footnote */}
        <Text variant="caption" style={[styles.muted, { marginTop: mu(8) }]}>
          Enhanced: bandpass filter + vertical isolation + noise subtraction
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface2,
  },
  panel: {
    flex: 1,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
  },
  panelContent: {
    flexGrow: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  timer: {
    color: colors.textSecondary,
    fontFamily: 'JetBrainsMono_400Regular',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  muted: {
    color: colors.textMuted,
  },
});
