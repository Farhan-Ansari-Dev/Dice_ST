/**
 * Real geographic coordinates (approximate country centroids, WGS84) for the
 * markets plotted on the Global Markets map. These are geographic facts, not
 * fabricated business data. Whether a market has verified DICE data is decided
 * at runtime from the backend (coverage), NOT from this list.
 */
export interface WorldMarket {
  code: string; // ISO alpha-2
  name: string;
  flag: string;
  lat: number;
  lon: number;
}

export const WORLD_MARKETS: WorldMarket[] = [
  { code: 'US', name: 'United States', flag: '🇺🇸', lat: 39.8, lon: -98.6 },
  { code: 'CA', name: 'Canada', flag: '🇨🇦', lat: 56.1, lon: -106.3 },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷', lat: -14.2, lon: -51.9 },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽', lat: 23.6, lon: -102.5 },
  { code: 'AR', name: 'Argentina', flag: '🇦🇷', lat: -38.4, lon: -63.6 },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧', lat: 55.4, lon: -3.4 },
  { code: 'DE', name: 'Germany', flag: '🇩🇪', lat: 51.2, lon: 10.5 },
  { code: 'FR', name: 'France', flag: '🇫🇷', lat: 46.2, lon: 2.2 },
  { code: 'ES', name: 'Spain', flag: '🇪🇸', lat: 40.5, lon: -3.7 },
  { code: 'IT', name: 'Italy', flag: '🇮🇹', lat: 41.9, lon: 12.6 },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱', lat: 52.1, lon: 5.3 },
  { code: 'EU', name: 'European Union', flag: '🇪🇺', lat: 50.1, lon: 9.1 },
  { code: 'RU', name: 'Russia', flag: '🇷🇺', lat: 61.5, lon: 105.3 },
  { code: 'TR', name: 'Türkiye', flag: '🇹🇷', lat: 38.9, lon: 35.2 },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦', lat: 23.9, lon: 45.1 },
  { code: 'AE', name: 'United Arab Emirates', flag: '🇦🇪', lat: 23.4, lon: 53.8 },
  { code: 'ZA', name: 'South Africa', flag: '🇿🇦', lat: -30.6, lon: 22.9 },
  { code: 'NG', name: 'Nigeria', flag: '🇳🇬', lat: 9.1, lon: 8.7 },
  { code: 'EG', name: 'Egypt', flag: '🇪🇬', lat: 26.8, lon: 30.8 },
  { code: 'IN', name: 'India', flag: '🇮🇳', lat: 20.6, lon: 79.0 },
  { code: 'PK', name: 'Pakistan', flag: '🇵🇰', lat: 30.4, lon: 69.3 },
  { code: 'BD', name: 'Bangladesh', flag: '🇧🇩', lat: 23.7, lon: 90.4 },
  { code: 'CN', name: 'China', flag: '🇨🇳', lat: 35.9, lon: 104.2 },
  { code: 'JP', name: 'Japan', flag: '🇯🇵', lat: 36.2, lon: 138.3 },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷', lat: 35.9, lon: 127.8 },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬', lat: 1.35, lon: 103.8 },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾', lat: 4.2, lon: 101.98 },
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩', lat: -0.8, lon: 113.9 },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭', lat: 15.9, lon: 100.99 },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳', lat: 14.06, lon: 108.3 },
  { code: 'AU', name: 'Australia', flag: '🇦🇺', lat: -25.3, lon: 133.8 },
  { code: 'NZ', name: 'New Zealand', flag: '🇳🇿', lat: -40.9, lon: 174.9 },
];

/** Equirectangular projection: lon/lat → x/y within a [0..width, 0..height] box. */
export function project(lon: number, lat: number, width: number, height: number): { x: number; y: number } {
  const x = ((lon + 180) / 360) * width;
  const y = ((90 - lat) / 180) * height;
  return { x, y };
}
