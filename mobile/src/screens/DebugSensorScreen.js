import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Accelerometer } from 'expo-sensors';
import Svg, { Polyline, Line } from 'react-native-svg';
import { useScale } from '../theme/scale';
import { colors } from '../theme/tokens';
import Text from '../components/ui/Text';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const UPDATE_MS = 20;        // ~50 Hz sensor poll
const RENDER_MS = 100;       // redraw chart at 10 fps (no jitter)
const BUFFER_SIZE = 250;     // ~5 seconds at 50 Hz
const NOISE_FLOOR = 0.008;   // dead zone: ignore below this (g)
const SMOOTH_ALPHA = 0.3;    // low-pass filter: 0 = max smooth, 1 = raw

function formatG(val) {
  const sign = val < 0 ? '' : ' ';
  return `${sign}${val.toFixed(3)} g`;
}

export default function DebugSensorScreen() {
  const insets = useSafeAreaInsets();
  const { mu } = useScale();

  const [displayAccel, setDisplayAccel] = useState({ x: 0, y: 0, z: 0 });
  const [sampleRate, setSampleRate] = useState(null);
  const [samples, setSamples] = useState([]);
  const [layout, setLayout] = useState({ width: 200, height: 100 });

  const timestamps = useRef([]);
  const bufferRef = useRef([]);
  const smoothedVal = useRef(0);
  const smoothedAccel = useRef({ x: 0, y: 0, z: 0 });
  const subscriptionRef = useRef(null);
  const renderTimer = useRef(null);
  const [active, setActive] = useState(false);

  const startSensor = useCallback(() => {
    Accelerometer.setUpdateInterval(UPDATE_MS);

    subscriptionRef.current = Accelerometer.addListener((data) => {
      smoothedAccel.current = {
        x: smoothedAccel.current.x + SMOOTH_ALPHA * (data.x - smoothedAccel.current.x),
        y: smoothedAccel.current.y + SMOOTH_ALPHA * (data.y - smoothedAccel.current.y),
        z: smoothedAccel.current.z + SMOOTH_ALPHA * (data.z - smoothedAccel.current.z),
      };

      const now = Date.now();
      timestamps.current.push(now);
      const cutoff = now - 2000;
      timestamps.current = timestamps.current.filter((t) => t > cutoff);

      const mag = Math.sqrt(data.x * data.x + data.y * data.y + data.z * data.z);
      let vertical = mag - 1.0;

      if (Math.abs(vertical) < NOISE_FLOOR) {
        vertical = 0;
      }

      smoothedVal.current = smoothedVal.current + SMOOTH_ALPHA * (vertical - smoothedVal.current);

      bufferRef.current.push(smoothedVal.current);
      if (bufferRef.current.length > BUFFER_SIZE) {
        bufferRef.current = bufferRef.current.slice(-BUFFER_SIZE);
      }
    });

    renderTimer.current = setInterval(() => {
      setDisplayAccel({ ...smoothedAccel.current });
      setSamples([...bufferRef.current]);

      const tsLen = timestamps.current.length;
      if (tsLen > 2) {
        const windowMs = timestamps.current[tsLen - 1] - timestamps.current[0];
        if (windowMs > 0) {
          setSampleRate(Math.round((tsLen - 1) * 1000 / windowMs));
        }
      }
    }, RENDER_MS);

    setActive(true);
  }, []);

  const stopSensor = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    if (renderTimer.current) {
      clearInterval(renderTimer.current);
      renderTimer.current = null;
    }
    setActive(false);
  }, []);

  useEffect(() => {
    startSensor();
    return () => stopSensor();
  }, []);

  const onLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout({ width, height });
  }, []);

  const { width: w, height: h } = layout;

  const scaleG = 0.15;
  const points = samples
    .map((v, i) => {
      const x = (i / (samples.length - 1 || 1)) * w;
      const y = h / 2 - (v / scaleG) * (h / 2);
      const clampedY = Math.max(2, Math.min(h - 2, y));
      return `${x.toFixed(1)},${clampedY.toFixed(1)}`;
    })
    .join(' ');

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: mu(12) + insets.top,
          paddingHorizontal: mu(16),
          paddingBottom: mu(16) + insets.bottom,
        },
      ]}
    >
      <Text variant="titleS" style={{ marginBottom: mu(16) }}>
        Sensor debug
      </Text>

      {/* Raw accelerometer values */}
      <View style={[styles.row, { marginBottom: mu(12) }]}>
        <ValueCard label="X" value={formatG(displayAccel.x)} mu={mu} />
        <ValueCard label="Y" value={formatG(displayAccel.y)} mu={mu} />
        <ValueCard label="Z" value={formatG(displayAccel.z)} mu={mu} />
      </View>

      {/* Sample rate */}
      <Card style={[styles.rateCard, { borderRadius: mu(8), padding: mu(12), marginBottom: mu(12) }]}>
        <Text variant="caption" style={styles.label}>Measured sample rate</Text>
        <Text variant="title">
          {sampleRate != null ? `${sampleRate} Hz` : 'Measuring...'}
        </Text>
      </Card>

      {/* Waveform */}
      <Text variant="caption" style={[styles.label, { marginBottom: mu(4) }]}>
        Vertical acceleration (5 s window)
      </Text>
      <Card style={[styles.waveCard, { borderRadius: mu(8) }]}>
        <View style={styles.waveInner} onLayout={onLayout}>
          <Svg width={w} height={h}>
            {/* Grid lines at Â±0.05g and Â±0.1g */}
            <Line x1={0} y1={h * 0.167} x2={w} y2={h * 0.167} stroke={colors.border} strokeWidth={0.5} opacity={0.4} />
            <Line x1={0} y1={h * 0.333} x2={w} y2={h * 0.333} stroke={colors.border} strokeWidth={0.5} opacity={0.4} />
            <Line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke={colors.border} strokeWidth={1} />
            <Line x1={0} y1={h * 0.667} x2={w} y2={h * 0.667} stroke={colors.border} strokeWidth={0.5} opacity={0.4} />
            <Line x1={0} y1={h * 0.833} x2={w} y2={h * 0.833} stroke={colors.border} strokeWidth={0.5} opacity={0.4} />
            {samples.length > 1 && (
              <Polyline
                points={points}
                fill="none"
                stroke={colors.accent}
                strokeWidth={1.5}
              />
            )}
          </Svg>
        </View>
      </Card>

      <View style={{ marginTop: mu(12) }}>
        <Button
          label={active ? 'Stop sensor' : 'Start sensor'}
          onPress={active ? stopSensor : startSensor}
        />
      </View>
    </View>
  );
}

function ValueCard({ label, value, mu }) {
  return (
    <Card style={[valueStyles.card, { borderRadius: mu(8), padding: mu(10) }]}>
      <Text variant="caption" style={valueStyles.label}>{label}</Text>
      <Text variant="metric">{value}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface2,
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  label: {
    color: colors.textMuted,
    marginBottom: 4,
  },
  rateCard: {},
  waveCard: {
    flex: 1,
    maxHeight: 200,
    overflow: 'hidden',
  },
  waveInner: {
    flex: 1,
    minHeight: 120,
  },
});

const valueStyles = StyleSheet.create({
  card: {
    flex: 1,
    flexBasis: 0,
    minWidth: 0,
  },
  label: {
    color: colors.textMuted,
    marginBottom: 2,
  },
});
