import { supabase } from './supabase';

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

export async function uploadTrip(tripData, bridge) {
  if (!tripData || !bridge) return { success: false };

  try {
    const temperature = await fetchTemperature(bridge.lat, bridge.lng);

    const { error: bridgeErr } = await supabase.from('bridges').upsert({
      id: bridge.id,
      name: bridge.name,
      lat: bridge.lat,
      lng: bridge.lng,
      baseline_hz: bridge.baselineHz || null,
    }, { onConflict: 'id', ignoreDuplicates: false });

    if (bridgeErr) console.warn('bridge upsert failed:', bridgeErr.message);

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

    if (tripErr) return { success: false, error: tripErr.message };

    await supabase.rpc('increment_trip_count', { bridge_id_param: bridge.id });

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}
