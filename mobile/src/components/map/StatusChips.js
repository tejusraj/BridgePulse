import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScale } from '../../theme/scale';
import { colors } from '../../theme/tokens';
import Chip from '../ui/Chip';

export default function StatusChips({ gps, sensor }) {
  const insets = useSafeAreaInsets();
  const { mu } = useScale();

  const gpsLabel = gps === 'ready' ? 'GPS ready' : gps === 'acquiring' ? 'Finding GPS' : 'Location off';
  const gpsDot = gps === 'ready' ? 'success' : gps === 'acquiring' ? 'warning' : 'danger';

  const sensorLabel = sensor === 'ready' ? 'Sensor ready' : 'No motion sensor';
  const sensorDot = sensor === 'ready' ? 'success' : 'danger';

  return (
    <View
      style={[
        styles.container,
        {
          left: mu(12),
          top: mu(12) + insets.top,
          gap: mu(6),
        },
      ]}
    >
      <Chip label={gpsLabel} dotColor={gpsDot} />
      <Chip label={sensorLabel} dotColor={sensorDot} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
