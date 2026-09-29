
/**
 * Format a distance in meters for display (straight-line).
 * Under 1000 m: "420 m away" (rounded to nearest 10).
 * 1000 m and over: "1.2 km away" (one decimal).
 */
export function formatDistance(meters) {
  if (meters < 1000) {
    return `${Math.round(meters / 10) * 10} m away`;
  }
  return `${(meters / 1000).toFixed(1)} km away`;
}

/**
 * Format elapsed milliseconds as m:ss.
 */
export function formatTimer(ms) {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, '0')}`;
}

/**
 * Format a number with fixed decimals.
 */
export function formatNum(value, decimals = 1) {
  if (value == null || isNaN(value)) return '--';
  return Number(value).toFixed(decimals);
}
