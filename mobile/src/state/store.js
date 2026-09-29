import { create } from 'zustand';

export const useStore = create((set, get) => ({
  screen: 'map',
  gps: 'acquiring',
  sensor: 'ready',
  
  bridges: [],
  selectedBridge: null,
  bridgesLoading: false,
  
  autoStartRadiusM: 50, // default 50 meters
  
  userLocation: null, // { latitude, longitude }
  trip: {
    progress: 0,
    elapsedMs: 0,
    peakHz: null,
    quality: null,
    sampleRate: null,
    qualityReasons: [],
  },
  lastTrip: null,

  setScreen: (screen) => set({ screen }),
  setGps: (gps) => set({ gps }),
  setSensor: (sensor) => set({ sensor }),
  setUserLocation: (loc) => set({ userLocation: loc }),
  
  setBridges: (bridges) => set({ bridges, bridgesLoading: false }),
  setSelectedBridge: (bridge) => set({ selectedBridge: bridge }),
  setBridgesLoading: (loading) => set({ bridgesLoading: loading }),
  setAutoStartRadiusM: (radius) => set({ autoStartRadiusM: radius }),

  updateTrip: (partial) =>
    set((state) => ({ trip: { ...state.trip, ...partial } })),

  beginTrip: () =>
    set({
      screen: 'onBridge',
      trip: {
        progress: 0,
        elapsedMs: 0,
        peakHz: null,
        quality: null,
        sampleRate: null,
        qualityReasons: [],
      },
    }),

  finishTrip: (finalData) =>
    set((state) => ({
      screen: 'summary',
      lastTrip: finalData || state.trip,
      trip: {
        progress: 0,
        elapsedMs: 0,
        peakHz: null,
        quality: null,
        sampleRate: null,
        qualityReasons: [],
      },
    })),

  goMap: () =>
    set({
      screen: 'map',
    }),
}));
