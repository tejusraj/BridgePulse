// Enhanced trip recording hook with research-backed noise removal.
// Techniques applied:
//   1. Vertical axis isolation (gravity dot product)  — Ozer & Feng 2019
//   2. Bandpass filter (1.5–20 Hz)                    — Standard SHM practice
//   3. Gyroscope confidence weighting                 — Sensor fusion
//   4. Pre-bridge noise calibration (spectral sub.)   — Yang et al. 2004
//   5. Welch's PSD for final analysis                 — Welch 1967
//   6. Temperature logging                            — added in uploadTrip

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

const CALIBRATION_DURATION_MS = CALIBRATION_MS;  // 5 seconds noise baseline
const TRIP_DURATION_MS = 15000;                   // 15 seconds bridge recording
const TOTAL_DURATION_MS = CALIBRATION_DURATION_MS + TRIP_DURATION_MS; // 20 seconds total
const ACCEL_INTERVAL_MS = 16;                     // ~60 Hz
const SPECTRUM_INTERVAL_MS = 200;                 // Spectrum update 5x/sec
const GYRO_DAMPEN = 0.15;                         // Low weight for high-rotation samples

export function useTrip() {
  // Buffers
  const liveBufferRef = useRef([]);       // Rolling window for live spectrum
  const samplesRef = useRef([]);          // Rolling waveform display buffer
  const allSamplesRef = useRef([]);       // ALL samples for final Welch's PSD
  const calibSamplesRef = useRef([]);     // Pre-bridge noise calibration samples
  const noiseBaselineRef = useRef(null);  // Noise spectrum from calibration
  const prevSpecRef = useRef([]);
  const smoothedVal = useRef(0);
  const startTime = useRef(null);
  const subscriptionRef = useRef(null);
  const spectrumTimer = useRef(null);
  const progressTimer = useRef(null);
  const timestampsRef = useRef([]);
  const phaseRef = useRef('idle');        // 'idle' | 'calibrating' | 'recording'
  const bandpassRef = useRef(null);       // Bandpass filter instance
  const gyroWeightRef = useRef(1);        // Current gyroscope confidence

  // Gravity vector for vertical axis isolation
  const gravityRef = useRef({ x: 0, y: 0, z: -1 });

  // Subscribers for live visualizations
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
    // Reset all buffers
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

    // Create fresh bandpass filter
    bandpassRef.current = createBandpassFilter();

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    DeviceMotion.setUpdateInterval(ACCEL_INTERVAL_MS);

    // ── DeviceMotion listener ──────────────────────────────────────────
    subscriptionRef.current = DeviceMotion.addListener((data) => {
      const now = Date.now();
      timestampsRef.current.push(now);
      const cutoff = now - 2000;
      timestampsRef.current = timestampsRef.current.filter(t => t > cutoff);

      // ── Vertical Axis Isolation ──
      // Use gravity vector to extract only vertical acceleration.
      // Bridge vibration is primarily vertical; this rejects lateral sway,
      // braking, and steering inputs.
      const accelWithG = data.accelerationIncludingGravity;
      const accel = data.acceleration;

      let vertical = 0;
      if (accel && accelWithG) {
        // Gravity = accelerationIncludingGravity - acceleration
        const gx = accelWithG.x - (accel.x || 0);
        const gy = accelWithG.y - (accel.y || 0);
        const gz = accelWithG.z - (accel.z || 0);
        const gMag = Math.sqrt(gx * gx + gy * gy + gz * gz) || 9.81;

        // Smooth gravity estimate (low-pass filter on gravity vector)
        gravityRef.current.x += 0.1 * (gx / gMag - gravityRef.current.x);
        gravityRef.current.y += 0.1 * (gy / gMag - gravityRef.current.y);
        gravityRef.current.z += 0.1 * (gz / gMag - gravityRef.current.z);

        // Project user acceleration onto gravity direction → vertical component
        const g = gravityRef.current;
        vertical = accel.x * g.x + accel.y * g.y + accel.z * g.z;

        // Normalize to g-units for consistency
        vertical = vertical / 9.81;
      } else if (accelWithG) {
        // Fallback: magnitude - 1g (old method)
        const mag = Math.sqrt(
          accelWithG.x ** 2 + accelWithG.y ** 2 + accelWithG.z ** 2
        );
        vertical = mag / 9.81 - 1.0;
      }

      // Dead zone to reject sensor noise floor
      if (Math.abs(vertical) < 0.005) vertical = 0;

      // ── Gyroscope Confidence ──
      // Car suspension creates rotational motion (pitch/roll).
      // Bridge vibration is translational (low angular velocity).
      const gyroWeight = gyroConfidence(data.rotationRate);
      gyroWeightRef.current = gyroWeightRef.current * 0.9 + gyroWeight * 0.1;

      // Apply gyroscope weighting: dampen samples with high rotation
      const weighted = vertical * (GYRO_DAMPEN + (1 - GYRO_DAMPEN) * gyroWeight);

      // ── Bandpass Filter (1.5–20 Hz) ──
      const filtered = bandpassRef.current(weighted);

      const elapsed = now - startTime.current;
      const phase = phaseRef.current;

      if (phase === 'calibrating') {
        // Collecting noise baseline (pre-bridge / approach road)
        calibSamplesRef.current.push(filtered);

        if (elapsed >= CALIBRATION_DURATION_MS) {
          // Calibration complete — compute noise spectrum
          if (calibSamplesRef.current.length > 60) {
            const noiseResult = computeSpectrum(calibSamplesRef.current, []);
            noiseBaselineRef.current = noiseResult.spec;
          }
          phaseRef.current = 'recording';
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
        }
      }

      if (phase === 'recording' || phase === 'calibrating') {
        // Store for live display
        liveBufferRef.current.push(filtered);
        samplesRef.current.push(filtered);

        if (liveBufferRef.current.length > WIN) {
          liveBufferRef.current = liveBufferRef.current.slice(-WIN);
        }
        if (samplesRef.current.length > 180) {
          samplesRef.current = samplesRef.current.slice(-180);
        }

        // Notify waveform subscribers
        waveformListeners.current.forEach(fn => fn([...samplesRef.current]));
      }

      if (phase === 'recording') {
        // Store ALL bridge samples for final Welch analysis
        allSamplesRef.current.push(filtered);
      }
    });

    // ── Live Spectrum Updates ──────────────────────────────────────────
    spectrumTimer.current = setInterval(() => {
      if (liveBufferRef.current.length < 60) return;

      let result = computeSpectrum(liveBufferRef.current, prevSpecRef.current);
      prevSpecRef.current = result.spec;

      // Apply spectral subtraction if we have a noise baseline
      if (noiseBaselineRef.current && phaseRef.current === 'recording') {
        result = spectralSubtract(result, noiseBaselineRef.current);
      }

      // Compute real sample rate
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

    // ── Progress + Auto-Finish Timer ──────────────────────────────────
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
        // ── Final Analysis: Welch's PSD with spectral subtraction ──
        const allBridgeSamples = allSamplesRef.current;

        let finalResult;
        if (allBridgeSamples.length > 128) {
          // Welch's averaged PSD → much lower noise than single FFT
          finalResult = welchPSD(allBridgeSamples);

          // Apply spectral subtraction if calibration was done
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