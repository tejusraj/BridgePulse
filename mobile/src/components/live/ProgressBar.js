import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useScale } from '../../theme/scale';
import { colors } from '../../theme/tokens';

export default function ProgressBar({ progress = 0 }) {
  const { mu } = useScale();

  return (
    <View style={[styles.track, { height: mu(4), borderRadius: mu(2) }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${Math.min(100, Math.max(0, progress * 100))}%`,
            borderRadius: mu(2),
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: colors.accent,
  },
});
