import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet, Alert, Pressable } from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Navigation } from 'lucide-react-native';
import { colors } from '../../theme/tokens';
import { useStore } from '../../state/store';
import { getDistance } from '../../utils/distance';
import { fetchNearbyBridges } from '../../services/bridges';
import { FALLBACK_BRIDGES } from '../../services/bridges';
import StylizedMap from './StylizedMap';
import Text from '../ui/Text';

function buildLeafletHTML() {
  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>
  * { margin:0; padding:0; }
  html, body, #map { width:100%; height:100%; background: ${colors.bg}; }
  
  /* Dark-mode inversion + muted saturation so UI elements pop over the base layer */
  .leaflet-tile-pane {
    filter: invert(100%) hue-rotate(180deg) brightness(0.85) contrast(95%) saturate(0.55);
  }

  .user-marker-outer {
    width: 28px; height: 28px; border-radius: 14px;
    background: rgba(76, 141, 255, 0.2);
    display: flex; align-items: center; justify-content: center;
  }
  .user-marker-inner {
    width: 14px; height: 14px; border-radius: 7px;
    background: ${colors.accent};
    border: 2px solid ${colors.surface2};
  }

  /* Bridge Markers */
  .bridge-marker {
    width: 12px; height: 12px; border-radius: 6px;
    background: ${colors.textMuted};
    border: 2px solid ${colors.surface2};
    transition: all 0.2s ease;
  }
  .bridge-marker.selected {
    width: 20px; height: 20px; border-radius: 10px;
    background: ${colors.accent};
    box-shadow: 0 0 0 4px rgba(76, 141, 255, 0.3);
    z-index: 1000 !important;
  }

  .leaflet-control-attribution { font-size: 9px !important; opacity: 0.6; background: transparent !important; color: ${colors.textMuted} !important; }
  .leaflet-control-attribution a { color: ${colors.textMuted} !important; }
  .leaflet-control-zoom { display: none; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  var firstFix = true;
  var map = L.map('map', {
    zoomControl: false,
    attributionControl: true,
    center: [23.26, 77.41],
    zoom: 13
  });

  var tileOk = true;
  var tileLayer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19
  }).addTo(map);

  tileLayer.on('tileerror', function() {
    if (tileOk) {
      tileOk = false;
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'tilesFailed' }));
    }
  });

  var userIcon = L.divIcon({
    className: '',
    html: '<div class="user-marker-outer"><div class="user-marker-inner"></div></div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  });
  var userMarker = null;
  
  var bridgeMarkers = {};
  var selectedBridgeId = null;

  function updateUserPosition(lat, lng) {
    if (!userMarker) {
      userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 9999 }).addTo(map);
    } else {
      userMarker.setLatLng([lat, lng]);
    }
    if (firstFix) {
      firstFix = false;
      map.setView([lat, lng], 15, { animate: true, duration: 0.8 });
    }
  }

  function centerOnUser() {
    if (userMarker) {
      map.setView(userMarker.getLatLng(), 15, { animate: true });
    }
  }

  function createBridgeIcon(isSelected) {
    return L.divIcon({
      className: '',
      html: '<div class="bridge-marker' + (isSelected ? ' selected' : '') + '"></div>',
      iconSize: isSelected ? [20, 20] : [12, 12],
      iconAnchor: isSelected ? [10, 10] : [6, 6]
    });
  }

  function addBridgeMarkers(bridgesJson) {
    var bridges = JSON.parse(bridgesJson);
    
    for (var id in bridgeMarkers) {
      map.removeLayer(bridgeMarkers[id]);
    }
    bridgeMarkers = {};

    bridges.forEach(function(b) {
      var isSelected = b.id === selectedBridgeId;
      var marker = L.marker([b.lat, b.lng], { 
        icon: createBridgeIcon(isSelected),
        zIndexOffset: isSelected ? 1000 : 0
      }).addTo(map);
      
      marker.on('click', function() {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'bridgeSelected', id: b.id }));
      });
      
      bridgeMarkers[b.id] = marker;
    });
  }

  function highlightBridge(id) {
    var oldId = selectedBridgeId;
    selectedBridgeId = id;

    // Reset old
    if (oldId && bridgeMarkers[oldId]) {
      bridgeMarkers[oldId].setIcon(createBridgeIcon(false));
      bridgeMarkers[oldId].setZIndexOffset(0);
    }
    // Highlight new (no pan - user stays centered on their location)
    if (id && bridgeMarkers[id]) {
      bridgeMarkers[id].setIcon(createBridgeIcon(true));
      bridgeMarkers[id].setZIndexOffset(1000);
    }
  }

  // Signal ready
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
</script>
</body>
</html>`;
}

// Permission priming screen - shown before system dialog
function LocationPrimingScreen({ onContinue }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[primingStyles.container, { paddingBottom: insets.bottom + 32 }]}>
      <View style={primingStyles.content}>
        <View style={primingStyles.iconCircle}>
          <Navigation size={32} color={colors.accent} />
        </View>
        <Text variant="titleS" style={primingStyles.heading}>
          Location access
        </Text>
        <Text variant="body" style={primingStyles.body}>
          BridgePulse detects nearby bridges to monitor their structural condition.
        </Text>
      </View>
      <Pressable style={primingStyles.button} onPress={onContinue}>
        <Text variant="body" style={primingStyles.buttonText}>Continue</Text>
      </Pressable>
    </View>
  );
}

const primingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 120,
  },
  content: {
    alignItems: 'center',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accentBg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  heading: {
    color: colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  body: {
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    backgroundColor: colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default function LeafletMap({ children }) {
  const webViewRef = useRef(null);
  const [mapReady, setMapReady] = useState(false);
  const [tilesFailed, setTilesFailed] = useState(false);
  const [loadTimeout, setLoadTimeout] = useState(false);
  const [permDenied, setPermDenied] = useState(false);
  const [showPriming, setShowPriming] = useState(true);
  const [hasFirstFix, setHasFirstFix] = useState(false);
  const locationSubscription = useRef(null);
  const bridgesFetched = useRef(false);
  const htmlSource = useRef({ html: buildLeafletHTML() });
  const insets = useSafeAreaInsets();

  const setGps = useStore((s) => s.setGps);
  const setUserLocation = useStore((s) => s.setUserLocation);
  
  const bridges = useStore((s) => s.bridges);
  const selectedBridge = useStore((s) => s.selectedBridge);
  const setBridges = useStore((s) => s.setBridges);
  const setBridgesLoading = useStore((s) => s.setBridgesLoading);
  const setSelectedBridge = useStore((s) => s.setSelectedBridge);

  // Fallback timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!mapReady) setLoadTimeout(true);
    }, 4000);
    return () => clearTimeout(timer);
  }, [mapReady]);

  const markerData = bridges.map(b => ({ id: b.id, lat: b.lat, lng: b.lng }));
  const markerDataStr = JSON.stringify(markerData);

  useEffect(() => {
    if (mapReady && webViewRef.current) {
      const safeJsString = JSON.stringify(markerDataStr);
      const js = `if(typeof addBridgeMarkers==='function') addBridgeMarkers(${safeJsString}); true;`;
      webViewRef.current.injectJavaScript(js);
    }
  }, [markerDataStr, mapReady]);

  useEffect(() => {
    if (mapReady && webViewRef.current) {
      const id = selectedBridge ? selectedBridge.id : null;
      const js = `if(typeof highlightBridge==='function') highlightBridge(${id ? "'" + id + "'" : "null"}); true;`;
      webViewRef.current.injectJavaScript(js);
    }
  }, [selectedBridge, mapReady]);

  const requestLocationAndTrack = useCallback(async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setPermDenied(true);
      setGps('denied');
      Alert.alert(
        "Location Required", 
        "BridgePulse needs location access to find nearby bridges. Please enable it in your phone settings."
      );
      return;
    }

    setGps('acquiring');

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 3000,
        distanceInterval: 15,
      },
      async (loc) => {
        const coords = loc.coords;
        setUserLocation(coords);
        setGps('ready');
        setHasFirstFix(true);

        if (webViewRef.current && mapReady) {
          const js = `if(typeof updateUserPosition==='function') updateUserPosition(${coords.latitude},${coords.longitude}); true;`;
          webViewRef.current.injectJavaScript(js);
        }

        // Update bridge distances on each GPS tick
        const currentBridges = useStore.getState().bridges;
        if (currentBridges.length > 0) {
          const updated = currentBridges.map(b => ({
            ...b,
            distanceM: getDistance(coords.latitude, coords.longitude, b.lat, b.lng)
          })).sort((a, b) => a.distanceM - b.distanceM);
          setBridges(updated);
        }

        // Geofence: auto-start trip when near a bridge
        const storeState = useStore.getState();
        if (
          storeState.screen === 'map' &&
          storeState.bridges.length > 0
        ) {
          const autoRadius = storeState.autoStartRadiusM;
          const nearest = storeState.bridges[0]; // already sorted by distance
          if (nearest && nearest.distanceM <= autoRadius) {
            storeState.setSelectedBridge(nearest);
            storeState.beginTrip();
          }
        }

        if (!bridgesFetched.current) {
          try {
            setBridgesLoading(true);
            const fetchedBridges = await fetchNearbyBridges(coords.latitude, coords.longitude, 5000);
            setBridges(fetchedBridges);
            bridgesFetched.current = true;
            
            if (fetchedBridges.length > 0 && !useStore.getState().selectedBridge) {
              setSelectedBridge(fetchedBridges[0]);
            }
          } catch (e) {
            const fallbacksWithDist = FALLBACK_BRIDGES.map(b => ({
              ...b,
              distanceM: getDistance(coords.latitude, coords.longitude, b.lat, b.lng)
            })).sort((a, b) => a.distanceM - b.distanceM);
            
            setBridges(fallbacksWithDist);
            bridgesFetched.current = true;
            if (fallbacksWithDist.length > 0 && !useStore.getState().selectedBridge) {
              setSelectedBridge(fallbacksWithDist[0]);
            }
          } finally {
            setBridgesLoading(false);
          }
        }
      }
    );
  }, [mapReady]);

  // Check if permission was already granted (skip priming)
  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        setShowPriming(false);
        requestLocationAndTrack();
      }
    })();
    return () => {
      if (locationSubscription.current) {
        locationSubscription.current.remove();
      }
    };
  }, [mapReady]);

  const handlePrimingContinue = () => {
    setShowPriming(false);
    requestLocationAndTrack();
  };

  const onMessage = useCallback((event) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      switch (data.type) {
        case 'mapReady':
          setMapReady(true);
          break;
        case 'tilesFailed':
        case 'mapError':
          setTilesFailed(true);
          break;
        case 'bridgeSelected':
          const bridge = useStore.getState().bridges.find(b => b.id === data.id);
          if (bridge) setSelectedBridge(bridge);
          break;
      }
    } catch (e) {}
  }, []);

  const handleLocateMe = () => {
    if (webViewRef.current && mapReady) {
      webViewRef.current.injectJavaScript('if(typeof centerOnUser==="function") centerOnUser(); true;');
    } else if (permDenied) {
      Alert.alert("Location Required", "Please enable location access in settings to find your position.");
    }
  };

  // Show priming screen before system dialog
  if (showPriming) {
    return (
      <View style={styles.container}>
        <LocationPrimingScreen onContinue={handlePrimingContinue} />
        {children}
      </View>
    );
  }

  const useFallback = tilesFailed || loadTimeout;

  if (permDenied || useFallback) {
    return (
      <View style={styles.container}>
        <StylizedMap />
        {children}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webViewRef}
        style={styles.webview}
        source={htmlSource.current}
        onMessage={onMessage}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scalesPageToFit={false}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        onError={() => setTilesFailed(true)}
        onHttpError={() => setTilesFailed(true)}
      />

      {/* Loading state before first GPS fix */}
      {!hasFirstFix && mapReady && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color={colors.accent} style={{ marginBottom: 12 }} />
          <Text variant="bodyS" style={{ color: colors.textSecondary }}>
            Finding your location…
          </Text>
        </View>
      )}

      {!mapReady && (
        <View style={styles.spinner}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      )}

      {/* Locate Me Button */}
      {mapReady && (
        <Pressable 
            style={[styles.locateBtn, { bottom: 200 + insets.bottom }]} 
            onPress={handleLocateMe}
            accessibilityRole="button"
            accessibilityLabel="Locate me"
        >
            <Navigation size={20} color={colors.accentText} />
        </Pressable>
      )}

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  spinner: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.bg,
  },
  loadingOverlay: {
    position: 'absolute',
    top: '40%',
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locateBtn: {
    position: 'absolute',
    right: 16,
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
  }
});