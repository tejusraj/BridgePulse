import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useScale } from '../../theme/scale';
import { colors } from '../../theme/tokens';
import Text from '../ui/Text';

export default function MetricsRow({ sampleRate, quality, peakHz, gyroConfidence }) {
  const { mu } = useScale();

  return (
    <View style={[styles.row, { marginBottom: mu(10) }]}>
      <MetricItem label="Sample rate" value={sampleRate ? `${sampleRate} Hz` : '--'} />
      <MetricItem label="Quality" value={quality != null ? `${quality}%` : '--'} />
      <MetricItem label="Peak freq" value={peakHz != null ? `${peakHz} Hz` : '--'} />
      <MetricItem label="Gyro conf." value={gyroConfidence != null ? `${gyroConfidence}%` : '--'} />
    </View>
  );
}

function MetricItem({ label, value }) {
  return (
    <View style={styles.item}>
      <Text variant="caption" style={styles.label}>
        {label}
      </Text>
      <Text variant="metric">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  item: {
    flex: 1,
  },
  label: {
    color: colors.textMuted,
    marginBottom: 2,
  },
});