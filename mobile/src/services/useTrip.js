import { useEffect, useRef, useCallback } from 'react';
import { DeviceMotion } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useStore } from '../state/store';
import {
  computeSpectrum,
  welchPSD,
  spectralSubtract,
  createBandpassFilter,
  gyroConfidence,
  WIN,
  CALIBRATION_MS,
} from '../utils/signal';

const CALIBRATION_DURATION_MS = CALIBRATION_MS;
const TRIP_DURATION_MS = 15000;
const TOTAL_DURATION_MS = CALIBRATION_DURATION_MS + TRIP_DURATION_MS;
const ACCEL_INTERVAL_MS = 16;
const SPECTRUM_INTERVAL_MS = 200;
const GYRO_DAMPEN = 0.15;

export function useTrip() {
  const liveBufferRef = useRef([]);
  const samplesRef = useRef([]);
  const allSamplesRef = useRef([]);
  const calibSamplesRef = useRef([]);
  const noiseBaselineRef = useRef(null);
  const prevSpecRef = useRef([]);
  const smoothedVal = useRef(0);
  const startTime = useRef(null);
  const subscriptionRef = useRef(null);
  const spectrumTimer = useRef(null);
  const progressTimer = useRef(null);
  const timestampsRef = useRef([]);
  const phaseRef = useRef('idle');
  const bandpassRef = useRef(null);
  const gyroWeightRef = useRef(1);
  const gravityRef = useRef({ x: 0, y: 0, z: -1 });

  const waveformListeners = useRef(new Set());
  const spectrumListeners = useRef(new Set());

  const subscribeWaveform = useCallback((fn) => {
    waveformListeners.current.add(fn);
    return () => waveformListeners.current.delete(fn);
  }, []);

  const subscribeSpectrum = useCallback((fn) => {
    spectrumListeners.current.add(fn);
    return () => spectrumListeners.current.delete(fn);
  }, []);

  const stop = useCallback(() => {
    if (subscriptionRef.current) {
      subscriptionRef.current.remove();
      subscriptionRef.current = null;
    }
    if (spectrumTimer.current) {
      clearInterval(spectrumTimer.current);
      spectrumTimer.current = null;
    }
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
    phaseRef.current = 'idle';
  }, []);

  const start = useCallback(() => {
    liveBufferRef.current = [];
    prevSpecRef.current = [];
    samplesRef.current = [];
    allSamplesRef.current = [];
    calibSamplesRef.current = [];
    noiseBaselineRef.current = null;
    smoothedVal.current = 0;
    timestampsRef.current = [];
    gyroWeightRef.current = 1;
    startTime.current = Date.now();
    phaseRef.current = 'calibrating';

    bandpassRef.current = createBandpassFilter();

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    DeviceMotion.setUpdateInterval(ACCEL_INTERVAL_MS);

    subscriptionRef.current = DeviceMotion.addListener((data) => {
      const now = Date.now();
      timestampsRef.current.push(now);
      const cutoff = now - 2000;
      timestampsRef.current = timestampsRef.current.filter(t => t > cutoff);

      const accelWithG = data.accelerationIncludingGravity;
      const accel = data.acceleration;

      let vertical = 0;
      if (accel && accelWithG) {
        const gx = accelWithG.x - (accel.x || 0);
        const gy = accelWithG.y - (accel.y || 0);
        const gz = accelWithG.z - (accel.z || 0);
        const gMag = Math.sqrt(gx * gx + gy * gy + gz * gz) || 9.81;

        gravityRef.current.x += 0.1 * (gx / gMag - gravityRef.current.x);
        gravityRef.current.y += 0.1 * (gy / gMag - gravityRef.current.y);
        gravityRef.current.z += 0.1 * (gz / gMag - gravityRef.current.z);

        const g = gravityRef.current;
        vertical = accel.x * g.x + accel.y * g.y + accel.z * g.z;
        vertical = vertical / 9.81;
      } else if (accelWithG) {
        const mag = Math.sqrt(
          accelWithG.x ** 2 + accelWithG.y ** 2 + accelWithG.z ** 2
        );
        vertical = mag / 9.81 - 1.0;
      }

      if (Math.abs(vertical) < 0.005) vertical = 0;

      const gyroWeight = gyroConfidence(data.rotationRate);
      gyroWeightRef.current = gyroWeightRef.current * 0.9 + gyroWeight * 0.1;

      const weighted = vertical * (GYRO_DAMPEN + (1 - GYRO_DAMPEN) * gyroWeight);
      const filtered = bandpassRef.current(weighted);

      const elapsed = now - startTime.current;
      const phase = phaseRef.current;

      if (phase === 'calibrating') {
        calibSamplesRef.current.push(filtered);

        if (elapsed >= CALIBRATION_DURATION_MS) {
          if (calibSamplesRef.current.length > 60) {
            const noiseResult = computeSpectrum(calibSamplesRef.current, []);
            noiseBaselineRef.current = noiseResult.spec;
          }
          phaseRef.current = 'recording';
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        }
      }

      if (phase === 'recording' || phase === 'calibrating') {
        liveBufferRef.current.push(filtered);
        samplesRef.current.push(filtered);

        if (liveBufferRef.current.length > WIN) {
          liveBufferRef.current = liveBufferRef.current.slice(-WIN);
        }
        if (samplesRef.current.length > 180) {
          samplesRef.current = samplesRef.current.slice(-180);
        }

        waveformListeners.current.forEach(fn => fn([...samplesRef.current]));
      }

      if (phase === 'recording') {
        allSamplesRef.current.push(filtered);
      }
    });

    spectrumTimer.current = setInterval(() => {
      if (liveBufferRef.current.length < 60) return;

      let result = computeSpectrum(liveBufferRef.current, prevSpecRef.current);
      prevSpecRef.current = result.spec;

      if (noiseBaselineRef.current && phaseRef.current === 'recording') {
        result = spectralSubtract(result, noiseBaselineRef.current);
      }

      let sampleRate = 0;
      const tsLen = timestampsRef.current.length;
      if (tsLen > 2) {
        const windowMs = timestampsRef.current[tsLen - 1] - timestampsRef.current[0];
        if (windowMs > 0) {
          sampleRate = Math.round((tsLen - 1) * 1000 / windowMs);
        }
      }

      useStore.setState((state) => ({
        trip: {
          ...state.trip,
          peakHz: result.peakHz,
          quality: result.quality,
          sampleRate,
          phase: phaseRef.current,
          gyroConfidence: Math.round(gyroWeightRef.current * 100),
        },
      }));

      spectrumListeners.current.forEach(fn => fn(result));
    }, SPECTRUM_INTERVAL_MS);

    progressTimer.current = setInterval(() => {
      const elapsed = Date.now() - startTime.current;
      const progress = Math.min(1, elapsed / TOTAL_DURATION_MS);

      useStore.setState((state) => ({
        trip: {
          ...state.trip,
          progress,
          elapsedMs: elapsed,
          phase: phaseRef.current,
        },
      }));

      if (elapsed >= TOTAL_DURATION_MS) {
        const allBridgeSamples = allSamplesRef.current;

        let finalResult;
        if (allBridgeSamples.length > 128) {
          finalResult = welchPSD(allBridgeSamples);
          if (noiseBaselineRef.current) {
            finalResult = spectralSubtract(finalResult, noiseBaselineRef.current);
          }
        } else {
          finalResult = computeSpectrum(allBridgeSamples, []);
        }

        stop();
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

        const state = useStore.getState();
        useStore.getState().finishTrip({
          ...state.trip,
          progress: 1,
          elapsedMs: TOTAL_DURATION_MS,
          peakHz: finalResult.peakHz,
          quality: finalResult.quality,
          phase: 'done',
          noiseCalibrated: !!noiseBaselineRef.current,
          welchSegments: finalResult.numSegments || 0,
        });
      }
    }, 50);
  }, [stop]);

  useEffect(() => {
    return () => stop();
  }, [stop]);

  return { start, stop, subscribeWaveform, subscribeSpectrum };
}
