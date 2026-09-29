import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useStore } from '../state/store';
import LeafletMap from '../components/map/LeafletMap';
import StatusChips from '../components/map/StatusChips';
import BridgeListSheet from '../components/sheet/BridgeListSheet';
import { colors } from '../theme/tokens';

export default function MapScreen() {
  const gps = useStore((s) => s.gps);
  const sensor = useStore((s) => s.sensor);

  return (
    <View style={styles.container}>
      <View style={styles.mapArea}>
        <LeafletMap>
          <StatusChips gps={gps} sensor={sensor} />
        </LeafletMap>
      </View>

      <BridgeListSheet />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  mapArea: {
    flex: 1,
    // The map now takes the full screen behind the sheet
  },
});
