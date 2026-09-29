import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, AccessibilityInfo } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useScale } from '../../theme/scale';
import { colors } from '../../theme/tokens';
import Chip from '../ui/Chip';

export default function RecordingChip() {
  const insets = useSafeAreaInsets();
  const { mu } = useScale();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const reduceMotion = useRef(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      reduceMotion.current = v;
      if (!v) startPulse();
    });
    return () => pulseAnim.stopAnimation();
  }, []);

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.25,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  return (
    <View
      style={[
        styles.container,
        {
          left: mu(12),
          top: mu(12) + insets.top,
        },
      ]}
    >
      <View style={styles.chipWrap}>
        <View style={styles.dotWrap}>
          <Animated.View
            style={[
              styles.dot,
              { width: mu(7), height: mu(7), borderRadius: mu(7) / 2, opacity: pulseAnim },
            ]}
          />
        </View>
        <Chip label="On bridge · recording" />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 10,
  },
  chipWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dotWrap: {
    position: 'absolute',
    left: 8,
    zIndex: 1,
  },
  dot: {
    backgroundColor: colors.danger,
  },
});
