import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';
import { useScale } from '../../theme/scale';
import { FONT_INTER, FONT_INTER_MEDIUM, FONT_MONO } from '../../theme/fonts';
import { colors } from '../../theme/tokens';

export default function Text({ variant = 'body', style, children, ...props }) {
  const { fs } = useScale();

  const getVariantStyle = () => {
    switch (variant) {
      case 'caption':
        return { fontFamily: FONT_INTER, fontSize: fs(11), lineHeight: fs(11 * 1.5) };
      case 'small':
        return { fontFamily: FONT_INTER, fontSize: fs(12), lineHeight: fs(12 * 1.5) };
      case 'bodyS':
        return { fontFamily: FONT_INTER, fontSize: fs(13), lineHeight: fs(13 * 1.4) };
      case 'body':
        return { fontFamily: FONT_INTER, fontSize: fs(14), lineHeight: fs(14 * 1.4) };
      case 'metric':
        return { fontFamily: FONT_MONO, fontSize: fs(15), lineHeight: fs(15 * 1.3), fontVariant: ['tabular-nums'] };
      case 'titleS':
        return { fontFamily: FONT_INTER_MEDIUM, fontSize: fs(16), lineHeight: fs(16 * 1.3) };
      case 'title':
        return { fontFamily: FONT_INTER_MEDIUM, fontSize: fs(20), lineHeight: fs(20 * 1.3) };
      default:
        return { fontFamily: FONT_INTER, fontSize: fs(14) };
    }
  };

  return (
    <RNText
      maxFontSizeMultiplier={1.2}
      style={[styles.base, getVariantStyle(), style]}
      {...props}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  base: {
    color: colors.text,
  },
});
