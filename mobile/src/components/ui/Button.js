import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useScale } from '../../theme/scale';
import { colors, radii } from '../../theme/tokens';
import Text from './Text';

export default function Button({ label, icon: Icon, onPress, disabled, style }) {
  const { touch, mu } = useScale();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          minHeight: touch(36),
          borderRadius: mu(radii.button),
          backgroundColor: pressed ? colors.surface : 'transparent',
          opacity: disabled ? 0.5 : 1,
        },
        style,
      ]}
      accessibilityRole="button"
    >
      {Icon && <Icon size={mu(15)} color={colors.text} style={{ marginRight: mu(6) }} />}
      <Text variant="bodyS">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    width: '100%',
  },
});
