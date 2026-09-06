export interface LocationPoint {
  id: string;
  name: string;
  category: 'CAMPUS' | 'TRANSIT' | 'DISTRICT' | 'HOSTEL';
  lat: number;
  lng: number;
  description: string;
}

// Key locations across Parul University campus and Vadodara district
export const VADODARA_LOCATIONS: LocationPoint[] = [
  // Parul University Campus Landmarks (Waghodia)
  {
    id: 'pu-main-gate',
    name: 'Parul University - Main Gate 1',
    category: 'CAMPUS',
    lat: 22.2895,
    lng: 73.361,
    description: 'Main University Entrance, Waghodia Road',
  },
  {
    id: 'pu-gate-2',
    name: 'Parul University - Gate 2 (Hostel Zone)',
    category: 'CAMPUS',
    lat: 22.2872,
    lng: 73.3655,
    description: 'Near Boys & Girls Residential Hostels',
  },
  {
    id: 'pu-library',
    name: 'PU Central Library & Admin Block',
    category: 'CAMPUS',
    lat: 22.2891,
    lng: 73.3638,
    description: 'Campus Center, Academic Block A',
  },
  {
    id: 'pu-hospital',
    name: 'Parul Sevashram Hospital',
    category: 'CAMPUS',
    lat: 22.288,
    lng: 73.362,
    description: 'Medical College & Emergency Care',
  },
  {
    id: 'pu-food-court',
    name: 'PU Student Central & Food Court',
    category: 'CAMPUS',
    lat: 22.2885,
    lng: 73.3641,
    description: 'Student hangout and transit waiting spot',
  },
  {
    id: 'pu-pit',
    name: 'Parul Institute of Technology (PIT)',
    category: 'CAMPUS',
    lat: 22.2902,
    lng: 73.3648,
    description: 'Engineering & Computing Sciences Block',
  },

  // Vadodara City & Transit Hubs
  {
    id: 'railway-station',
    name: 'Vadodara Central Railway Station',
    category: 'TRANSIT',
    lat: 22.3107,
    lng: 73.1812,
    description: 'Major railway junction connected to campus',
  },
  {
    id: 'sayajigunj-bus',
    name: 'Sayajigunj Central Bus Terminal (GSRTC)',
    category: 'TRANSIT',
    lat: 22.3086,
    lng: 73.1856,
    description: 'Central bus terminal for student commuting',
  },
  {
    id: 'alkapuri',
    name: 'Alkapuri Center',
    category: 'DISTRICT',
    lat: 22.3113,
    lng: 73.1706,
    description: 'Commercial and residential center',
  },
  {
    id: 'fatehgunj',
    name: 'Fatehgunj Circle',
    category: 'DISTRICT',
    lat: 22.3216,
    lng: 73.1884,
    description: 'Near University area and student PG hubs',
  },
  {
    id: 'waghodia-crossing',
    name: 'Waghodia Crossing Highway NH-48',
    category: 'TRANSIT',
    lat: 22.2982,
    lng: 73.2384,
    description: 'Direct highway intersection toward campus',
  },
  {
    id: 'manjalpur',
    name: 'Manjalpur Sports Complex',
    category: 'DISTRICT',
    lat: 22.2683,
    lng: 73.1932,
    description: 'South Vadodara student residential area',
  },
  {
    id: 'airport',
    name: 'Vadodara Airport (Civil Aerodrome Harni)',
    category: 'TRANSIT',
    lat: 22.3362,
    lng: 73.2263,
    description: 'Vadodara Domestic Airport',
  },
];

// Campus Geofence Boundary coordinates for Parul University Waghodia
export const PARUL_CAMPUS_GEOFENCE: [number, number][] = [
  [22.2925, 73.3585],
  [22.292, 73.3685],
  [22.2845, 73.369],
  [22.284, 73.359],
  [22.2925, 73.3585],
];
