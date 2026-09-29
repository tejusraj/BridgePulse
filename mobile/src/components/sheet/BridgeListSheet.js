import React, { useRef, useMemo, useState } from 'react';
import { View, StyleSheet, ScrollView, Animated, PanResponder, useWindowDimensions, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChevronUp, ChevronDown } from 'lucide-react-native';
import { useScale } from '../../theme/scale';
import { colors } from '../../theme/tokens';
import { useStore } from '../../state/store';
import { formatDistance } from '../../utils/format';
import Text from '../ui/Text';
import { FONT_MONO } from '../../theme/fonts';

const PEEK_HEIGHT = 180;

export default function BridgeListSheet() {
  const insets = useSafeAreaInsets();
  const { mu } = useScale();
  const { height: windowH } = useWindowDimensions();
  const sheetMaxHeight = windowH * 0.6;
  const peekHeight = PEEK_HEIGHT + insets.bottom;

  const bridges = useStore((s) => s.bridges);
  const bridgesLoading = useStore((s) => s.bridgesLoading);
  const selectedBridge = useStore((s) => s.selectedBridge);
  const setSelectedBridge = useStore((s) => s.setSelectedBridge);
  const setScreen = useStore((s) => s.setScreen);
  const gps = useStore((s) => s.gps);

  const [expanded, setExpanded] = useState(false);
  const animatedHeight = useRef(new Animated.Value(peekHeight)).current;
  const dragStartHeight = useRef(peekHeight);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
    onPanResponderGrant: () => {
      animatedHeight.stopAnimation((val) => {
        dragStartHeight.current = val;
      });
    },
    onPanResponderMove: (_, gs) => {
      const newHeight = Math.max(peekHeight, Math.min(sheetMaxHeight, dragStartHeight.current - gs.dy));
      animatedHeight.setValue(newHeight);
    },
    onPanResponderRelease: (_, gs) => {
      const currentHeight = dragStartHeight.current - gs.dy;
      const midPoint = (peekHeight + sheetMaxHeight) / 2;
      const shouldExpand = gs.vy < -0.5 || (Math.abs(gs.vy) < 0.5 && currentHeight > midPoint);

      if (shouldExpand) {
        setExpanded(true);
        Animated.spring(animatedHeight, {
          toValue: sheetMaxHeight,
          useNativeDriver: false,
          friction: 9,
          tension: 60,
        }).start();
      } else {
        setExpanded(false);
        Animated.spring(animatedHeight, {
          toValue: peekHeight,
          useNativeDriver: false,
          friction: 9,
          tension: 60,
        }).start();
      }
    }
  }), [animatedHeight, sheetMaxHeight, peekHeight]);

  const toggleSheet = () => {
    const isExpanding = !expanded;
    setExpanded(isExpanding);
    Animated.spring(animatedHeight, {
      toValue: isExpanding ? sheetMaxHeight : peekHeight,
      useNativeDriver: false,
      friction: 9,
      tension: 60,
    }).start();
  };

  const handleBridgePress = (bridge) => {
    setSelectedBridge(bridge);
    setScreen('status');
  };

  const renderBridgeItem = (bridge) => {
    const isSelected = selectedBridge && selectedBridge.id === bridge.id;
    return (
      <Pressable
        key={bridge.id}
        onPress={() => handleBridgePress(bridge)}
        style={[
            styles.bridgeCard,
            isSelected && styles.bridgeCardSelected,
            { padding: mu(12), marginBottom: mu(8), borderRadius: mu(8) }
        ]}
      >
        <View style={styles.cardHeader}>
            <Text variant="body" style={{ fontWeight: '500', flex: 1 }} numberOfLines={1}>{bridge.name}</Text>
            <Text variant="caption" style={[styles.distanceText, { fontFamily: FONT_MONO, fontVariant: ['tabular-nums'] }]}>{formatDistance(bridge.distanceM)}</Text>
        </View>
        
        {isSelected && bridge.baselineHz && (
            <Text variant="small" style={[styles.infoText, { marginTop: mu(8) }]}>
                Baseline frequency: {bridge.baselineHz.toFixed(1)} Hz
            </Text>
        )}
      </Pressable>
    );
  };

  return (
    <Animated.View style={[styles.sheet, { height: animatedHeight }]}>
      <View {...panResponder.panHandlers}>
          <View style={styles.dragZone}>
              <View style={styles.dragHandle} />
          </View>
          
          <View style={[styles.header, { paddingHorizontal: mu(16), paddingBottom: mu(12) }]}>
              <View>
                  <Text variant="titleS">
                      {bridgesLoading ? 'Searching for bridges...' : `${bridges.length} bridges nearby`}
                  </Text>
                  <Text variant="small" style={styles.subtext}>
                      {gps === 'denied' ? 'Location required to find bridges' : 'Tap a bridge to view status'}
                  </Text>
              </View>
              <Pressable onPress={toggleSheet} style={{ padding: 4 }}>
                  {expanded ? <ChevronDown color={colors.textMuted} /> : <ChevronUp color={colors.textMuted} />}
              </Pressable>
          </View>
      </View>

      <ScrollView 
          contentContainerStyle={{ paddingHorizontal: mu(16), paddingBottom: insets.bottom + mu(16) }}
          showsVerticalScrollIndicator={false}
          scrollEnabled={expanded}
      >
          {bridges.map(renderBridgeItem)}
          
          {!bridgesLoading && bridges.length === 0 && gps !== 'denied' && (
              <Text variant="bodyS" style={[styles.emptyText, { marginTop: mu(20) }]}>
                  No bridges found within 5 km. Try moving closer to a bridge.
              </Text>
          )}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: colors.surface2,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.borderStrong,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
  header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.borderStrong,
  },
  subtext: {
      color: colors.textSecondary,
      marginTop: 2,
  },
  bridgeCard: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderStrong,
  },
  bridgeCardSelected: {
      borderColor: colors.accent,
      backgroundColor: 'rgba(76, 141, 255, 0.05)',
  },
  cardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
  },
  distanceText: {
      color: colors.textSecondary,
  },
  infoText: {
      color: colors.textMuted,
  },
  emptyText: {
      color: colors.textSecondary,
      textAlign: 'center',
  }
});