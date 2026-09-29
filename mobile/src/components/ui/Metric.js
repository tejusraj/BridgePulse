import React from 'react';
import { View, StyleSheet } from 'react-native';
import Text from './Text';
import { colors } from '../../theme/tokens';

export default function Metric({ label, value, style }) {
  return (
    <View style={[styles.container, style]}>
      <Text variant="caption" style={styles.label}>
        {label}
      </Text>
      <Text variant="metric">{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  label: {
    color: colors.textMuted,
    marginBottom: 2, // will be scaled naturally if needed, but 2 is fine for small gaps
  },
});
