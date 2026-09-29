import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useScale } from '../../theme/scale';
import { colors, radii, borderWidths } from '../../theme/tokens';
import Text from './Text';
import Dot from './Dot';

export default function Chip({ label, dotColor, style }) {
  const { mu } = useScale();

  return (
    <View
      style={[
        styles.chip,
        {
          paddingVertical: mu(4),
          paddingHorizontal: mu(9),
          borderRadius: radii.pill,
          gap: mu(6),
        },
        style,
      ]}
    >
      {dotColor && <Dot color={dotColor} />}
      <Text variant="caption">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
  },
});
