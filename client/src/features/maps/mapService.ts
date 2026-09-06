export interface RouteResult {
  coordinates: [number, number][]; // [lat, lng] for Leaflet
  distanceKm: number;
  durationMinutes: number;
  estimatedFare: number; // in INR
}

/**
 * Calculates student/staff subsidized fare in INR
 * Base fare: ₹30, ₹12/km, minimum fare: ₹30
 */
export const calculateFare = (distanceKm: number): number => {
  const baseFare = 30;
  const perKmRate = 12;
  const fare = baseFare + distanceKm * perKmRate;
  return Math.max(30, Math.round(fare));
};

/**
 * Free OSRM (Open Source Routing Machine) API integration for Vadodara and India
 * No API key or credit card required.
 */
export const fetchDrivingRoute = async (
  start: [number, number], // [lat, lng]
  end: [number, number] // [lat, lng]
): Promise<RouteResult> => {
  try {
    // OSRM expects coordinates in lng,lat format
    const url = `https://router.project-osrm.org/route/v1/driving/${start[1]},${start[0]};${end[1]},${end[0]}?overview=full&geometries=geojson`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Routing request failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!data.routes || data.routes.length === 0) {
      throw new Error('No driving route found between these points.');
    }

    const route = data.routes[0];
    const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
    const durationMinutes = Math.max(1, Math.round(route.duration / 60));
    const estimatedFare = calculateFare(distanceKm);

    // Convert GeoJSON [lng, lat] to Leaflet [lat, lng]
    const coordinates: [number, number][] = route.geometry.coordinates.map(
      (coord: [number, number]) => [coord[1], coord[0]]
    );

    return {
      coordinates,
      distanceKm,
      durationMinutes,
      estimatedFare,
    };
  } catch (error) {
    console.warn('OSRM routing fallback used:', error);
    // Fallback straight-line interpolation if routing endpoint is temporarily unreachable
    const straightDistKm = calculateHaversineDistance(start, end);
    const estDuration = Math.max(5, Math.round(straightDistKm * 2.2));
    const estimatedFare = calculateFare(straightDistKm);

    return {
      coordinates: [start, end],
      distanceKm: straightDistKm,
      durationMinutes: estDuration,
      estimatedFare,
    };
  }
};

/**
 * Free Nominatim OpenStreetMap Geocoding for Vadodara / India locations
 */
export const searchVadodaraAddress = async (query: string) => {
  if (!query || query.trim().length < 2) return [];

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
      query + ', Vadodara, Gujarat'
    )}&limit=5`;

    const response = await fetch(url, {
      headers: {
        'Accept-Language': 'en',
      },
    });

    if (!response.ok) return [];

    const results = await response.json();
    return results.map((item: any) => ({
      name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
    }));
  } catch (error) {
    console.error('Nominatim search error:', error);
    return [];
  }
};

// Haversine formula calculation helper
function calculateHaversineDistance(coord1: [number, number], coord2: [number, number]): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((coord2[0] - coord1[0]) * Math.PI) / 180;
  const dLon = ((coord2[1] - coord1[1]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((coord1[0] * Math.PI) / 180) *
      Math.cos((coord2[0] * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
