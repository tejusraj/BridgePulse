import React, { useEffect, useRef, useState } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { colors } from '../../theme/tokens';
import { MAX_CONTENT_W } from '../../theme/scale';

export default function ScreenHost({ screenKey, children }) {
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [displayed, setDisplayed] = useState({ key: screenKey, content: children });

  useEffect(() => {
    if (screenKey !== displayed.key) {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start(() => {
        setDisplayed({ key: screenKey, content: children });
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }).start();
      });
    }
  }, [screenKey]);

  useEffect(() => {
    if (screenKey === displayed.key) {
      setDisplayed({ key: screenKey, content: children });
    }
  }, [children]);

  return (
    <View style={styles.outer}>
      <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
        {displayed.content}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
  },
  inner: {
    flex: 1,
    width: '100%',
    maxWidth: MAX_CONTENT_W,
  },
});
