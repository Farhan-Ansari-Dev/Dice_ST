/**
 * Canonical market translation layer (single source).
 *
 * The mobile app, admin panel and APIs speak ISO 3166-1 alpha-2 country codes.
 * The compliance database stores a `country` value that is a *market* — which
 * may be a single country ("India") or a bloc ("Europe"). This is the ONE place
 * that maps an ISO code to the market name used in MarketRequirement /
 * MarketCertification. Do not duplicate this mapping anywhere else.
 *
 * A code that is not present here has no verified market coverage yet; callers
 * must return an honest "not catalogued" response rather than guess.
 */
export const ISO_TO_MARKET: Readonly<Record<string, string>> = Object.freeze({
  IN: 'India',
  AE: 'UAE',
  SA: 'Saudi Arabia',
  US: 'USA',
  GB: 'UK',
  // European Union / EEA single market — CE/RoHS apply across the bloc.
  DE: 'Europe',
  FR: 'Europe',
  IT: 'Europe',
  ES: 'Europe',
  NL: 'Europe',
  CA: 'Canada',
  AU: 'Australia',
  JP: 'Japan',
  KR: 'South Korea',
  SG: 'Singapore',
  MY: 'Malaysia',
  TH: 'Thailand',
  VN: 'Vietnam',
  ID: 'Indonesia',
  PH: 'Philippines',
  ZA: 'South Africa',
  BR: 'Brazil',
  MX: 'Mexico',
  NZ: 'New Zealand',
});

/** ISO alpha-2 code → market name, or null when the market is not catalogued. */
export function marketForCode(code: string | undefined | null): string | null {
  if (!code) return null;
  return ISO_TO_MARKET[String(code).trim().toUpperCase()] ?? null;
}

/** The ISO codes we have a verified market for. */
export const SUPPORTED_MARKET_CODES: string[] = Object.keys(ISO_TO_MARKET);

/**
 * Reverse lookup: market name → a representative ISO code. Used by the coverage
 * endpoint so the mobile can offer only markets that actually have data and send
 * a code the resolver understands (e.g. "India" → "IN", "Europe" → "DE").
 */
export function codeForMarket(name: string | undefined | null): string | null {
  if (!name) return null;
  const target = String(name).trim();
  const entry = Object.entries(ISO_TO_MARKET).find(([, v]) => v === target);
  return entry ? entry[0] : null;
}
