import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScale } from '../../theme/scale';
import { colors } from '../../theme/tokens';

export default function BridgeStrip({ progress = 0 }) {
  const insets = useSafeAreaInsets();
  const { mu } = useScale();
  const stripHeight = mu(110) + insets.top;

  const markerLeft = `${33.33 + 33.33 * progress}%`;

  return (
    <View style={[styles.strip, { height: stripHeight, paddingTop: insets.top }]}>
      {/* River - vertical band */}
      <View style={styles.river} />

      {/* Road - horizontal line */}
      <View style={styles.road} />

      {/* Bridge - highlighted segment */}
      <View style={styles.bridge} />

      {/* Position marker */}
      <View style={[styles.markerWrap, { left: markerLeft }]}>
        <View style={styles.markerOuter}>
          <View style={styles.markerInner} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  river: {
    position: 'absolute',
    left: '43.33%',
    width: '13.33%',
    top: 0,
    bottom: 0,
    backgroundColor: colors.accentBg,
  },
  road: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 6,
    backgroundColor: colors.borderStrong,
    marginTop: -3,
  },
  bridge: {
    position: 'absolute',
    left: '33.33%',
    width: '33.33%',
    top: '50%',
    height: 7,
    backgroundColor: colors.accent,
    marginTop: -3.5,
  },
  markerWrap: {
    position: 'absolute',
    top: '50%',
    marginTop: -7,
    marginLeft: -7,
  },
  markerOuter: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.surface2,
    borderWidth: 2,
    borderColor: colors.surface2,
  },
});
