import { getDistance } from '../utils/distance';

const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

let cachedBridges = null;
let cacheTimestamp = 0;
let lastLat = null;
let lastLng = null;

/**
 * Fetches bridges from OpenStreetMap via Overpass API within a given radius.
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @param {number} radiusM - Radius in meters
 * @returns {Promise<Array>} List of bridge objects
 */
export async function fetchNearbyBridges(lat, lng, radiusM = 5000) {
  const now = Date.now();
  
  if (
    cachedBridges &&
    now - cacheTimestamp < CACHE_TTL_MS &&
    lastLat != null &&
    lastLng != null
  ) {
    const distFromLastFetch = getDistance(lat, lng, lastLat, lastLng);
    if (distFromLastFetch < 1000) {
       const sorted = cachedBridges.map(b => ({
           ...b,
           distanceM: getDistance(lat, lng, b.lat, b.lng)
       })).sort((a, b) => a.distanceM - b.distanceM);
       return sorted;
    }
  }

  const overpassQuery = `[out:json];way[bridge=yes](around:${radiusM},${lat},${lng});out center;`;
  const url = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.status}`);
    }

    const data = await response.json();
    
    const bridges = data.elements
      .filter(el => el.type === 'way' && el.center)
      .map(el => {
        let name = el.tags?.name;
        if (!name) {
            name = el.tags?.ref ? `Bridge (${el.tags.ref})` : `Unnamed Bridge (${el.id})`;
        }
        
        return {
          id: `osm-${el.id}`,
          name: name,
          lat: el.center.lat,
          lng: el.center.lon,
          baselineHz: 2.0 + (el.id % 50) / 10,
          
        };
      });

    const uniqueBridges = [];
    for (const b of bridges) {
        const isDuplicate = uniqueBridges.some(ub => ub.name === b.name && getDistance(b.lat, b.lng, ub.lat, ub.lng) < 50);
        if (!isDuplicate) {
            uniqueBridges.push(b);
        }
    }

    const sortedBridges = uniqueBridges.map(b => ({
        ...b,
        distanceM: getDistance(lat, lng, b.lat, b.lng)
    })).sort((a, b) => a.distanceM - b.distanceM);

    cachedBridges = sortedBridges;
    cacheTimestamp = now;
    lastLat = lat;
    lastLng = lng;

    return sortedBridges;
  } catch (error) {
    console.warn("Failed to fetch bridges from Overpass:", error);
    throw error;
  }
}

export const FALLBACK_BRIDGES = [
  { id: 'fb-1', name: 'Habibganj Overbridge', lat: 23.23, lng: 77.43, baselineHz: 3.1 },
  { id: 'fb-2', name: 'Chetak Bridge', lat: 23.24, lng: 77.44, baselineHz: 2.8 },
  { id: 'fb-3', name: 'Subhash Nagar ROB', lat: 23.25, lng: 77.42, baselineHz: 3.5 },
  { id: 'fb-4', name: 'Retghat Bridge', lat: 23.255, lng: 77.395, baselineHz: 2.2 },
  { id: 'fb-5', name: 'Bairagarh Bridge', lat: 23.27, lng: 77.35, baselineHz: 4.1 },
];
