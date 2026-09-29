export const FS = 60;
export const WIN = 256;
export const F0 = 3.1;
export const F_LOW = 1.5;
export const F_HIGH = 20;
export const CALIBRATION_MS = 5000;

export const BINS = Array.from({ length: 80 }, (_, i) => +(1.5 + i * 0.25).toFixed(2));

export function createBandpassFilter(fs = FS, fLow = F_LOW, fHigh = F_HIGH) {
  const dtHP = 1 / fs;
  const rcHP = 1 / (2 * Math.PI * fLow);
  const alphaHP = rcHP / (rcHP + dtHP);

  const dtLP = 1 / fs;
  const rcLP = 1 / (2 * Math.PI * fHigh);
  const alphaLP = dtLP / (rcLP + dtLP);

  let hp1_prev_x = 0, hp1_prev_y = 0;
  let hp2_prev_x = 0, hp2_prev_y = 0;
  let lp1_prev_y = 0;
  let lp2_prev_y = 0;

  return function filter(x) {
    const hp1 = alphaHP * (hp1_prev_y + x - hp1_prev_x);
    hp1_prev_x = x;
    hp1_prev_y = hp1;

    const hp2 = alphaHP * (hp2_prev_y + hp1 - hp2_prev_x);
    hp2_prev_x = hp1;
    hp2_prev_y = hp2;

    lp1_prev_y += alphaLP * (hp2 - lp1_prev_y);
    lp2_prev_y += alphaLP * (lp1_prev_y - lp2_prev_y);

    return lp2_prev_y;
  };
}

function hannWindow(N) {
  const w = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    w[i] = 0.5 * (1 - Math.cos(2 * Math.PI * i / (N - 1)));
  }
  return w;
}

function goertzelPower(buf, freq, fs) {
  const N = buf.length;
  const k = Math.round(freq * N / fs);
  const w = 2 * Math.PI * k / N;
  const coeff = 2 * Math.cos(w);
  let s0 = 0, s1 = 0, s2 = 0;
  for (let i = 0; i < N; i++) {
    s0 = buf[i] + coeff * s1 - s2;
    s2 = s1;
    s1 = s0;
  }
  return (s1 * s1 + s2 * s2 - coeff * s1 * s2) / (N * N);
}

export function computeSpectrum(buf, prev) {
  const N = buf.length;
  if (N < 32) return { spec: prev, max: 0, peakHz: 0, peakIdx: 0, quality: 20 };

  let mean = 0;
  for (const v of buf) mean += v;
  mean /= N;

  const x = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    x[i] = (buf[i] - mean) * (0.5 - 0.5 * Math.cos(2 * Math.PI * i / (N - 1)));
  }

  const spec = BINS.map((f, j) => {
    const om = 2 * Math.PI * f / FS;
    let re = 0, im = 0;
    for (let i = 0; i < N; i++) {
      re += x[i] * Math.cos(om * i);
      im -= x[i] * Math.sin(om * i);
    }
    const power = Math.hypot(re, im);
    return (prev[j] ?? 0) * 0.8 + power * 0.2;
  });

  let max = 0, pi = 0;
  spec.forEach((v, j) => { if (v > max) { max = v; pi = j; } });

  const sorted = [...spec].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)] || 1;
  const quality = Math.max(20, Math.min(96, Math.round(30 + 20 * Math.log2(Math.max(1, max / med)))));

  return { spec, max, peakHz: BINS[pi], peakIdx: pi, quality };
}

export function welchPSD(samples, fs = FS, segLen = 256, overlap = 0.5) {
  const N = samples.length;
  if (N < segLen) return computeSpectrum(samples, []);

  const step = Math.floor(segLen * (1 - overlap));
  const numSegments = Math.floor((N - segLen) / step) + 1;
  const window = hannWindow(segLen);

  const avgSpec = new Float64Array(BINS.length);

  for (let seg = 0; seg < numSegments; seg++) {
    const offset = seg * step;

    let mean = 0;
    for (let i = 0; i < segLen; i++) mean += samples[offset + i];
    mean /= segLen;

    const windowed = new Float64Array(segLen);
    for (let i = 0; i < segLen; i++) {
      windowed[i] = (samples[offset + i] - mean) * window[i];
    }

    for (let j = 0; j < BINS.length; j++) {
      const f = BINS[j];
      const om = 2 * Math.PI * f / fs;
      let re = 0, im = 0;
      for (let i = 0; i < segLen; i++) {
        re += windowed[i] * Math.cos(om * i);
        im -= windowed[i] * Math.sin(om * i);
      }
      avgSpec[j] += Math.hypot(re, im) / numSegments;
    }
  }

  let max = 0, pi = 0;
  const spec = Array.from(avgSpec);
  spec.forEach((v, j) => { if (v > max) { max = v; pi = j; } });

  const sorted = [...spec].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)] || 1;
  const quality = Math.max(20, Math.min(96, Math.round(30 + 20 * Math.log2(Math.max(1, max / med)))));

  return { spec, max, peakHz: BINS[pi], peakIdx: pi, quality, numSegments };
}

export function spectralSubtract(bridgeSpec, noiseSpec, alpha = 1.0) {
  if (!noiseSpec || noiseSpec.length === 0) return bridgeSpec;

  const result = bridgeSpec.spec.map((v, j) => {
    const noise = (noiseSpec[j] || 0) * alpha;
    return Math.max(0, v - noise);
  });

  let max = 0, pi = 0;
  result.forEach((v, j) => { if (v > max) { max = v; pi = j; } });

  const sorted = [...result].sort((a, b) => a - b);
  const med = sorted[Math.floor(sorted.length / 2)] || 1;
  const quality = Math.max(20, Math.min(96, Math.round(30 + 20 * Math.log2(Math.max(1, max / med)))));

  return { spec: result, max, peakHz: BINS[pi], peakIdx: pi, quality };
}

export function gyroConfidence(rotationRate) {
  if (!rotationRate) return 1;
  const { alpha, beta, gamma } = rotationRate;
  const angularMag = Math.sqrt(
    (alpha || 0) ** 2 + (beta || 0) ** 2 + (gamma || 0) ** 2
  );
  return 1 / (1 + angularMag / 30);
}
