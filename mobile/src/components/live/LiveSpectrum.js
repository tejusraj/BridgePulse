import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Line, Text as SvgText } from 'react-native-svg';
import { useScale } from '../../theme/scale';
import { colors } from '../../theme/tokens';
import { FONT_INTER, FONT_MONO } from '../../theme/fonts';
import { BINS } from '../../utils/signal';
import Card from '../ui/Card';

export default function LiveSpectrum({ spec, max, peakHz, peakIdx }) {
  const { mu, fs } = useScale();
  const [layout, setLayout] = useState({ width: 200, height: 100 });

  const onLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    setLayout({ width, height });
  }, []);

  const { width: w, height: h } = layout;

  // Plot area boundaries as fractions
  const xLeft = 0.0294 * w;
  const xRight = 0.9706 * w;
  const yTop = 0.0667 * h;
  const yBase = 0.7556 * h;
  const plotW = xRight - xLeft;
  const plotH = yBase - yTop;

  // Build filled path
  let pathD = '';
  if (spec && spec.length > 0) {
    const safeMax = (max || 1) * 1.1;
    const points = spec.map((val, j) => {
      const x = xLeft + ((BINS[j] - 1.5) / 20) * plotW;
      const barH = (val / safeMax) * plotH;
      const y = yBase - barH;
      return { x, y };
    });

    pathD = `M ${points[0].x.toFixed(1)} ${yBase.toFixed(1)}`;
    points.forEach((p) => {
      pathD += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
    });
    pathD += ` L ${points[points.length - 1].x.toFixed(1)} ${yBase.toFixed(1)} Z`;
  }

  // Peak line x position
  const peakX = peakHz != null
    ? xLeft + ((peakHz - 1.5) / 20) * plotW
    : null;

  // Peak label positioning
  const peakLabelX = peakX && peakX > 0.735 * w
    ? peakX - mu(4)
    : peakX ? peakX + mu(4) : 0;
  const peakLabelAnchor = peakX && peakX > 0.735 * w ? 'end' : 'start';

  // Tick positions
  const ticks = [
    { label: '2', x: xLeft + (0.5 / 20) * plotW, anchor: 'start' },
    { label: '5', x: xLeft + (3.5 / 20) * plotW, anchor: 'middle' },
    { label: '10', x: xLeft + (8.5 / 20) * plotW, anchor: 'middle' },
    { label: '15', x: xLeft + (13.5 / 20) * plotW, anchor: 'middle' },
    { label: '20 Hz', x: xLeft + (18.5 / 20) * plotW, anchor: 'end' },
  ];

  const tickFontSize = fs(11);

  return (
    <Card
      style={[styles.card, { borderRadius: mu(8), minHeight: 84, maxHeight: 140 }]}
    >
      <View
        style={styles.inner}
        onLayout={onLayout}
        accessibilityLabel="Frequency spectrum"
      >
        <Svg width={w} height={h}>
          {/* Filled spectrum */}
          {pathD.length > 0 && (
            <>
              <Path d={pathD} fill={colors.accentBg} stroke="none" />
              <Path d={pathD} fill="none" stroke={colors.accent} strokeWidth={mu(1.5)} />
            </>
          )}

          {/* Peak dashed line */}
          {peakX != null && (
            <>
              <Line
                x1={peakX}
                y1={yTop}
                x2={peakX}
                y2={yBase}
                stroke={colors.textSecondary}
                strokeWidth={1}
                strokeDasharray="3,3"
              />
              <SvgText
                x={peakLabelX}
                y={0.155 * h}
                textAnchor={peakLabelAnchor}
                fontSize={fs(11)}
                fontFamily={FONT_MONO}
                fill={colors.text}
              >
                {peakHz.toFixed(1)} Hz
              </SvgText>
            </>
          )}

          {/* X-axis tick labels */}
          {ticks.map((t) => (
            <SvgText
              key={t.label}
              x={t.x}
              y={0.933 * h}
              textAnchor={t.anchor}
              fontSize={tickFontSize}
              fontFamily={FONT_INTER}
              fill={colors.textMuted}
            >
              {t.label}
            </SvgText>
          ))}
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
