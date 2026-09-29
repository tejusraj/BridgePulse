import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, ScrollView, Pressable, StyleSheet, Modal, Animated, PanResponder, Easing, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Settings, ChevronRight, Crosshair } from 'lucide-react-native';
import { colors } from '../../theme/tokens';
import { useStore } from '../../state/store';
import { useScale } from '../../theme/scale';
import Text from './Text';
import { FONT_MONO } from '../../theme/fonts';

export default function DevMenu() {
  const [visible, setVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const { mu } = useScale();
  const { height: windowH } = useWindowDimensions();

  const translateY = useRef(new Animated.Value(windowH)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const tapCount = useRef(0);
  const tapTimer = useRef(null);

  const setScreen = useStore((s) => s.setScreen);
  const autoStartRadiusM = useStore((s) => s.autoStartRadiusM);
  const setAutoStartRadiusM = useStore((s) => s.setAutoStartRadiusM);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => gs.dy > 8,
    onMoveShouldSetPanResponderCapture: (_, gs) => gs.dy > 8,
    onPanResponderMove: (_, gs) => {
      if (gs.dy > 0) {
        translateY.setValue(gs.dy);
        const progress = Math.max(0, 1 - gs.dy / (windowH * 0.4));
        fadeAnim.setValue(progress);
      }
    },
    onPanResponderRelease: (_, gs) => {
      if (gs.dy > 100 || gs.vy > 0.5) {
        Animated.parallel([
          Animated.timing(translateY, {
            toValue: windowH,
            duration: 200,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true,
          })
        ]).start(() => setVisible(false));
      } else {
        Animated.parallel([
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            friction: 9,
            tension: 60,
          }),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true,
          })
        ]).start();
      }
    }
  }), [translateY, fadeAnim, windowH]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          bounciness: 2,
          speed: 14
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        })
      ]).start();
    }
  }, [visible]);

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: windowH,
        duration: 200,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      })
    ]).start(() => setVisible(false));
  };

  const handleVersionTap = () => {
    tapCount.current += 1;
    if (tapTimer.current) clearTimeout(tapTimer.current);

    if (tapCount.current >= 6) {
      tapCount.current = 0;
      closeMenu();
      setTimeout(() => setScreen('debug'), 300);
      return;
    }

    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, 2000);
  };

  return (
    <>
      <Pressable
        style={[styles.fab, { top: insets.top + mu(12), right: mu(12) }]}
        onPress={() => setVisible(true)}
      >
        <Settings size={mu(20)} color={colors.textSecondary} />
      </Pressable>

      <Modal visible={visible} transparent animationType="none" onRequestClose={closeMenu} statusBarTranslucent>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeMenu}>
              <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} />
          </Pressable>
          
          <Animated.View 
              {...panResponder.panHandlers}
              style={[
                  styles.sheet, 
                  { 
                      transform: [{ translateY }],
                      paddingBottom: insets.bottom + mu(24)
                  }
              ]}
          >
              <View style={styles.dragZone}>
                  <View style={styles.dragHandle} />
              </View>

              <View style={{ paddingHorizontal: mu(16) }}>
                  
                  <Text variant="caption" style={styles.sectionHeader}>Settings</Text>
                  <View style={styles.card}>
                      <SettingRow 
                          icon={Crosshair} 
                          label="Auto-start Radius" 
                          value={`${autoStartRadiusM}m`} 
                          onPress={() => setAutoStartRadiusM(autoStartRadiusM === 50 ? 100 : autoStartRadiusM === 100 ? 10000 : 50)}
                          isTop
                          isBottom
                      />
                  </View>

                  <Pressable onPress={handleVersionTap} style={{ alignItems: 'center', marginTop: mu(32) }}>
                      <Text variant="small" style={{ color: colors.textMuted }}>BridgePulse v1.0.0</Text>
                  </Pressable>
              </View>
          </Animated.View>
      </Modal>
    </>
  );
}

function SettingRow({ icon: Icon, label, value, onPress, isTop, isBottom }) {
    const { mu } = useScale();
    return (
        <Pressable 
            style={({ pressed }) => [
                styles.row,
                isTop && styles.rowTop,
                isBottom && styles.rowBottom,
                pressed && { backgroundColor: colors.surface }
            ]}
            onPress={onPress}
        >
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <View style={[styles.iconWrapper, { width: mu(28), height: mu(28), borderRadius: mu(6) }]}>
                    <Icon size={mu(16)} color={colors.accentText} />
                </View>
                <Text variant="body" style={{ marginLeft: mu(12) }}>{label}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {value && <Text variant="bodyS" style={{ color: colors.textSecondary, marginRight: mu(8), fontFamily: FONT_MONO }}>{value}</Text>}
                <ChevronRight size={mu(16)} color={colors.textMuted} />
            </View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    zIndex: 9999,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderStrong,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.bg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  dragZone: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderStrong,
  },
  sectionHeader: {
      color: colors.textMuted,
      marginBottom: 8,
      marginLeft: 12,
  },
  card: {
      backgroundColor: colors.surface2,
      borderRadius: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.borderStrong,
      overflow: 'hidden',
  },
  row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderStrong,
  },
  rowTop: {
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
  },
  rowBottom: {
      borderBottomWidth: 0,
      borderBottomLeftRadius: 16,
      borderBottomRightRadius: 16,
  },
  iconWrapper: {
      backgroundColor: colors.accentBg,
      alignItems: 'center',
      justifyContent: 'center',
  }
});
