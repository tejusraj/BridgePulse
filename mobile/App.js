import React, { useCallback, useEffect } from 'react';
import { View, StyleSheet, BackHandler, Alert } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useAppFonts } from './src/theme/fonts';
import { colors } from './src/theme/tokens';
import { useStore } from './src/state/store';
import ScreenHost from './src/components/ui/ScreenHost';
import DevMenu from './src/components/ui/DevMenu';
import MapScreen from './src/screens/MapScreen';
import OnBridgeScreen from './src/screens/OnBridgeScreen';
import SummaryScreen from './src/screens/SummaryScreen';
import BridgeStatusScreen from './src/screens/BridgeStatusScreen';
import DebugSensorScreen from './src/screens/DebugSensorScreen';

SplashScreen.preventAutoHideAsync();

function AppContent() {
  const screen = useStore((s) => s.screen);
  const goMap = useStore((s) => s.goMap);

  useEffect(() => {
    const handler = () => {
      if (screen === 'onBridge') {
        Alert.alert(
          'Stop recording?',
          "This trip won't be sent.",
          [
            { text: 'Keep recording', style: 'cancel' },
            { text: 'Stop', style: 'destructive', onPress: goMap },
          ]
        );
        return true;
      }
      if (screen === 'summary' || screen === 'status' || screen === 'debug') {
        goMap();
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', handler);
    return () => sub.remove();
  }, [screen, goMap]);

  const renderScreen = () => {
    switch (screen) {
      case 'onBridge':
        return <OnBridgeScreen />;
      case 'summary':
        return <SummaryScreen />;
      case 'status':
        return <BridgeStatusScreen />;
      case 'debug':
        return <DebugSensorScreen />;
      default:
        return <MapScreen />;
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" translucent />
      <ScreenHost screenKey={screen}>
        {renderScreen()}
      </ScreenHost>
      <DevMenu />
    </View>
  );
}

export default function App() {
  const { fontsLoaded, fontError } = useAppFonts();

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded || fontError) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <View style={styles.root} onLayout={onLayoutRootView}>
        <AppContent />
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
});