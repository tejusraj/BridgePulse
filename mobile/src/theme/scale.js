// Scale helper — converts mockup units (mu) to device pixels
// The mockup phone is 300 mu wide. This scales everything proportionally.

import { useWindowDimensions, PixelRatio } from 'react-native';

export const BASE_W = 300;
export const MAX_CONTENT_W = 480;

export function useScale() {
  const { width, height } = useWindowDimensions();
  const contentW = Math.min(width, MAX_CONTENT_W);
  const k = Math.min(1.35, Math.max(1.1, contentW / BASE_W));
  const mu = (n) => PixelRatio.roundToNearestPixel(n * k);
  const fs = (n) => Math.round(n * k);
  const touch = (n) => Math.max(48, mu(n));
  return { k, mu, fs, touch, width: contentW, height };
}
