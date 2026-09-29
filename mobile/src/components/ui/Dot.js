import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useScale } from '../../theme/scale';
import { colors } from '../../theme/tokens';

export default function Dot({ color, size = 7, style }) {
  const { mu } = useScale();
  const dim = mu(size);

  return (
    <View
      style={[
        styles.dot,
        {
          width: dim,
          height: dim,
          borderRadius: dim / 2,
          backgroundColor: colors[color] || color,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  dot: {},
});
