import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useScale } from '../../theme/scale';
import { colors, radii } from '../../theme/tokens';

export default function Card({ children, style }) {
  const { mu } = useScale();

  return (
    <View
      style={[
        styles.card,
        {
          borderRadius: mu(radii.card),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
  },
});
