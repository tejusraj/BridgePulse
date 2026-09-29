import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScale } from '../theme/scale';
import { colors } from '../theme/tokens';
import { useStore } from '../state/store';
import Text from '../components/ui/Text';
import Card from '../components/ui/Card';
import { FONT_MONO } from '../theme/fonts';

export default function BridgeStatusScreen() {
  const insets = useSafeAreaInsets();
  const { mu } = useScale();
  const bridge = useStore((s) => s.selectedBridge);
  const lastTrip = useStore((s) => s.lastTrip);
  const goMap = useStore((s) => s.goMap);

  const hasRealData = lastTrip && lastTrip.peakHz;
  const displayFreq = hasRealData ? lastTrip.peakHz.toFixed(1) : '-';
  const displayQuality = hasRealData ? `${lastTrip.quality}%` : '-';
  const displayRate = hasRealData ? `${lastTrip.sampleRate} Hz` : '-';

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: mu(12) + insets.top,
          paddingHorizontal: mu(16),
          paddingBottom: mu(16) + insets.bottom,
        },
      ]}
    >
      <Pressable onPress={goMap} style={styles.backBtn} accessibilityRole="button">
        <Text variant="bodyS" style={{ color: colors.accent }}>
          Back
        </Text>
      </Pressable>

      <Text variant="titleS" style={{ marginTop: mu(12), marginBottom: mu(20) }}>
        {bridge?.name || 'Bridge'}
      </Text>

      {/* Metric cards */}
      <View style={[styles.grid, { gap: mu(10), marginBottom: mu(16) }]}>
        <Card style={[styles.metricCard, { borderRadius: mu(8), padding: mu(12) }]}>
          <Text variant="caption" style={styles.label}>Baseline frequency</Text>
          <Text variant="title">{bridge?.baselineHz?.toFixed(1) || '-'} Hz</Text>
        </Card>
        <Card style={[styles.metricCard, { borderRadius: mu(8), padding: mu(12) }]}>
          <Text variant="caption" style={styles.label}>Last measured</Text>
          <Text variant="title" style={{ fontFamily: FONT_MONO }}>{displayFreq} Hz</Text>
        </Card>
        <Card style={[styles.metricCard, { borderRadius: mu(8), padding: mu(12) }]}>
          <Text variant="caption" style={styles.label}>Signal quality</Text>
          <Text variant="title" style={{ fontFamily: FONT_MONO }}>{displayQuality}</Text>
        </Card>
        <Card style={[styles.metricCard, { borderRadius: mu(8), padding: mu(12) }]}>
          <Text variant="caption" style={styles.label}>Sample rate</Text>
          <Text variant="title" style={{ fontFamily: FONT_MONO }}>{displayRate}</Text>
        </Card>
      </View>

      {/* Status indicator */}
      {hasRealData && (
        <View style={[styles.realDataBadge, { marginBottom: mu(12), padding: mu(8), borderRadius: mu(6) }]}>
          <Text variant="small" style={{ color: colors.successText }}>
            Live data from your last crossing
          </Text>
        </View>
      )}

      {!hasRealData && (
        <View style={[styles.noDataBadge, { marginBottom: mu(12), padding: mu(8), borderRadius: mu(6) }]}>
          <Text variant="small" style={{ color: colors.textMuted }}>
            No trip recorded yet. Approach this bridge to collect data.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface2,
  },
  backBtn: {
    alignSelf: 'flex-start',
    padding: 4,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricCard: {
    width: '47%',
    flexGrow: 1,
  },
  label: {
    color: colors.textMuted,
    marginBottom: 4,
  },
  realDataBadge: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.success,
  },
  noDataBadge: {
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
});
