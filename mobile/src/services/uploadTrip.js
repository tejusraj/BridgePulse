// Upload trip data to Supabase after a bridge crossing.
// Called from SummaryScreen after finishTrip().
// Now includes ambient temperature from Open-Meteo API for temperature correction.

import { supabase } from './supabase';

/**
 * Fetch current temperature from Open-Meteo (free, no API key).
 * Returns temperature in Celsius, or null if fetch fails.
 */
async function fetchTemperature(lat, lng) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`;
    const res = await fetch(url, { timeout: 5000 });
    const data = await res.json();
    return data?.current_weather?.temperature ?? null;
  } catch {
    return null;
  }
}

/**
 * Uploads a trip record and upserts the bridge entry.
 * @param {Object} tripData - { peakHz, quality, sampleRate, elapsedMs, noiseCalibrated, welchSegments }
 * @param {Object} bridge   - { id, name, lat, lng, baselineHz }
 * @returns {Promise<{ success: boolean }>}
 */
export async function uploadTrip(tripData, bridge) {
  if (!tripData || !bridge) {
    console.warn('uploadTrip: missing trip or bridge data');
    return { success: false };
  }

  try {
    // Fetch ambient temperature (non-blocking, best-effort)
    const temperature = await fetchTemperature(bridge.lat, bridge.lng);

    // 1. Upsert bridge (creates it if first time, updates last_trip_at otherwise)
    const { error: bridgeErr } = await supabase.from('bridges').upsert({
      id: bridge.id,
      name: bridge.name,
      lat: bridge.lat,
      lng: bridge.lng,
      baseline_hz: bridge.baselineHz || null,
    }, { onConflict: 'id', ignoreDuplicates: false });

    if (bridgeErr) {
      console.warn('uploadTrip: bridge upsert failed:', bridgeErr.message);
    }

    // 2. Insert trip record (with temperature + noise calibration metadata)
    const { error: tripErr } = await supabase.from('trips').insert({
      bridge_id: bridge.id,
      peak_hz: tripData.peakHz,
      quality: tripData.quality,
      sample_rate: tripData.sampleRate || null,
      duration_ms: tripData.elapsedMs || null,
      lat: bridge.lat,
      lng: bridge.lng,
      temperature_c: temperature,
      noise_calibrated: tripData.noiseCalibrated || false,
      welch_segments: tripData.welchSegments || 0,
    });

    if (tripErr) {
      console.warn('uploadTrip: trip insert failed:', tripErr.message);
      return { success: false, error: tripErr.message };
    }

    // 3. Increment trip count (fires the health-update trigger too)
    await supabase.rpc('increment_trip_count', {
      bridge_id_param: bridge.id,
    });

    console.log('Trip uploaded successfully for', bridge.name,
      temperature !== null ? `(${temperature}°C)` : '(temp unavailable)');
    return { success: true };
  } catch (err) {
    console.warn('uploadTrip: network error:', err.message);
    return { success: false, error: err.message };
  }
}