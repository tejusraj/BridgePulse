import React, { useRef, useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Line, Polyline } from 'react-native-svg';
import { useScale } from '../../theme/scale';
import { colors } from '../../theme/tokens';
import Card from '../ui/Card';

export default function LiveWaveform({ samples }) {
  const { mu } = useScale();
  const [layout, setLayout] = useState({ width: 200, height: 100 });

  const onLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout({ width, height });
  }, []);

  const { width: w, height: h } = layout;

  const visibleSamples = samples.slice(-180);
  const points = visibleSamples
    .map((v, i) => {
      const x = (i / (visibleSamples.length - 1 || 1)) * w;
      const rawY = 0.5 * h - v * 0.422 * h;
      const y = Math.max(0.044 * h, Math.min(0.956 * h, rawY));
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');

  return (
    <Card
      style={[styles.card, { borderRadius: mu(8), minHeight: 84, maxHeight: 140 }]}
    >
      <View
        style={styles.inner}
        onLayout={onLayout}
        accessibilityLabel="Live acceleration waveform"
      >
        <Svg width={w} height={h}>
          {/* Mid line */}
          <Line
            x1={0}
            y1={h / 2}
            x2={w}
            y2={h / 2}
            stroke={colors.border}
            strokeWidth={1}
          />
          {/* Waveform */}
          {visibleSamples.length > 1 && (
            <Polyline
              points={points}
              fill="none"
              stroke={colors.accent}
              strokeWidth={mu(1.5)}
            />
          )}
        </Svg>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    overflow: 'hidden',
  },
  inner: {
    flex: 1,
  },
});
