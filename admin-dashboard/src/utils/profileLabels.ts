/**
 * Human-readable labels for the onboarding profile enums the mobile app stores
 * as machine ids (business_role, company_size, industries, business_goals) and
 * for served-market country codes (target_markets).
 *
 * These MIRROR the source-of-truth lists in the mobile app
 * (`mobile-app/src/utils/constants.ts` and `mobile-app/src/config/servedMarkets.ts`).
 * Keep them in sync when those change. Unknown ids fall back to a prettified
 * version of the id itself, so nothing ever renders a bare snake_case token.
 */

export const BUSINESS_ROLE_LABELS: Record<string, string> = {
  manufacturer: 'Manufacturer',
  importer: 'Importer',
  exporter: 'Exporter',
  supplier: 'Supplier / Trader',
  logistics: 'Logistics / Shipping',
  consultant: 'Service Provider / Consultant',
  individual: 'Individual',
  freelancer: 'Freelancer',
}

export const COMPANY_SIZE_LABELS: Record<string, string> = {
  solo: 'Individual / Solo',
  startup: 'Startup',
  small: 'Small Business',
  mid: 'Mid-size Company',
  large: 'Enterprise',
}

export const INDUSTRY_LABELS: Record<string, string> = {
  electronics: 'Electronics',
  medical: 'Medical Devices',
  chemicals: 'Chemicals',
  toys: 'Toys & Games',
  textiles: 'Textiles',
  telecom: 'Telecom',
  automotive: 'Automotive',
  food: 'Food & Beverage',
  cosmetics: 'Cosmetics',
  pharma: 'Pharmaceuticals',
  construction: 'Construction',
  energy: 'Energy & Power',
  agriculture: 'Agriculture',
  it_software: 'IT & Software',
  defence: 'Defence',
  aerospace: 'Aerospace',
  packaging: 'Packaging',
  furniture: 'Furniture',
}

export const BUSINESS_GOAL_LABELS: Record<string, string> = {
  faster_cert: 'Faster Certification',
  global: 'Global Expansion',
  shipment: 'Shipment Compliance',
  reduce_reject: 'Reduce Rejections',
  ai_assist: 'AI Assistance',
  automate: 'Compliance Automation',
  product_id: 'Product Identification',
  reading_label: 'Reading Label',
}

// Served-market country codes → names (the app's TARGET_MARKETS are these codes).
export const MARKET_LABELS: Record<string, string> = {
  SA: 'Saudi Arabia',
  AE: 'United Arab Emirates',
  QA: 'Qatar',
  KW: 'Kuwait',
  IN: 'India',
  EG: 'Egypt',
  IQ: 'Iraq',
  TZ: 'Tanzania',
  UG: 'Uganda',
  NG: 'Nigeria',
  CI: "Côte d'Ivoire (Ivory Coast)",
  ET: 'Ethiopia',
  ZW: 'Zimbabwe',
  US: 'United States',
}

export const USER_ROLE_LABELS: Record<string, string> = {
  client: 'Client',
  admin: 'Admin',
  super_admin: 'Super Admin',
  employee: 'Employee',
  consultant: 'Consultant',
  cb: 'Certification Body',
  lab: 'Lab',
  ib: 'Inspection Body',
}

/** Prettify an unknown id: snake_case / kebab-case → Title Case. */
function prettify(id: string): string {
  return id
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (m) => m.toUpperCase())
    .trim()
}

/** Map a single id to its label (falls back to a prettified id). */
export function labelFor(map: Record<string, string>, id?: string | null): string {
  if (!id) return '—'
  return map[id] ?? prettify(String(id))
}

/** Map an array of ids to a comma-joined label string. */
export function labelList(map: Record<string, string>, ids?: string[] | null): string {
  if (!ids || ids.length === 0) return '—'
  return ids.map((id) => map[id] ?? prettify(String(id))).join(', ')
}
