import { Dimensions, Platform } from 'react-native';

export const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const DEV_API_HOST = Platform.OS === 'android' ? 'http://10.0.2.2:5001' : 'http://localhost:5001';
export const API_BASE_URL = __DEV__ ? `${DEV_API_HOST}/api/v2` : 'https://api.sanyogconformity.com/api/v2';
export const SOCKET_URL = __DEV__ ? DEV_API_HOST : 'https://api.sanyogconformity.com';

export const APP_NAME = 'DICE';
export const APP_VERSION = '1.0.0';

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'scs_auth_token',
  REFRESH_TOKEN: 'scs_refresh_token',
  USER_DATA: 'scs_user_data',
  ONBOARDING_DONE: 'scs_onboarding_done',
  PUSH_TOKEN: 'scs_push_token',
  THEME: 'scs_theme',
  USER_TYPE: 'scs_user_type',
  USER_TYPE_DONE: 'scs_user_type_done',
  BIOMETRIC_ENABLED: 'scs_biometric_enabled',
};

export const CERTIFICATION_STATUSES = {
  PENDING: 'pending',
  IN_REVIEW: 'in_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  ACTIVE: 'active',
} as const;

export const APPLICATION_STATUSES = {
  DRAFT: 'draft',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  ADDITIONAL_DOCS: 'additional_docs_required',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export const DOCUMENT_TYPES = {
  TEST_REPORT: 'test_report',
  CERTIFICATE: 'certificate',
  INVOICE: 'invoice',
  DECLARATION: 'declaration',
  AUTHORIZATION: 'authorization',
  OTHER: 'other',
};

export const SANYOG_SERVICES = [
  {
    category: 'Domestic Certifications',
    items: [
      { id: 'bis_isi', name: 'BIS ISI Certification', icon: 'medal-outline', color: '#6C63FF' },
      { id: 'bis_crs', name: 'BIS CRS Certification', icon: 'shield-checkmark-outline', color: '#6C63FF' },
      { id: 'bis_fmcs', name: 'BIS FMCS', icon: 'globe-outline', color: '#6C63FF' },
      { id: 'bis_scheme_x', name: 'BIS Scheme X', icon: 'flask-outline', color: '#6C63FF' },
      { id: 'iso', name: 'ISO Certification', icon: 'document-text-outline', color: '#FFB347' },
      { id: 'wpc', name: 'WPC Certification', icon: 'wifi-outline', color: '#00D4FF' },
      { id: 'lmpc', name: 'LMPC Registration', icon: 'scale-outline', color: '#9B59B6' },
      { id: 'peso', name: 'PESO Certification', icon: 'flame-outline', color: '#FF6B6B' },
      { id: 'tec', name: 'TEC Certification', icon: 'call-outline', color: '#3B82F6' },
      { id: 'epr', name: 'EPR Registration', icon: 'leaf-outline', color: '#00C896' },
      { id: 'fssai', name: 'FSSAI Registration', icon: 'nutrition-outline', color: '#F59E0B' },
      { id: 'cdsco', name: 'CDSCO', icon: 'medkit-outline', color: '#10B981' },
      { id: 'eia_ehc', name: 'EIA / EHC', icon: 'leaf-outline', color: '#00C896' },
      { id: 'gmp', name: 'GMP Certification', icon: 'checkmark-circle-outline', color: '#3B82F6' },
      { id: 'company_reg', name: 'Company Registration', icon: 'business-outline', color: '#8B5CF6' },
      { id: 'gst', name: 'GST Registration', icon: 'receipt-outline', color: '#F59E0B' },
      { id: 'msme', name: 'MSME Registration', icon: 'briefcase-outline', color: '#EC4899' },
      { id: 'startup_india', name: 'Startup India', icon: 'rocket-outline', color: '#EF4444' },
      { id: 'hallmark', name: 'Hallmark Certification', icon: 'diamond-outline', color: '#FFB347' },
      { id: 'make_in_india', name: 'Make in India', icon: 'flag-outline', color: '#F59E0B' },
      { id: 'trademark', name: 'Trademark Registration', icon: 'shield-outline', color: '#6C63FF' },
      { id: 'sedex', name: 'Sedex (SMETA)', icon: 'people-outline', color: '#10B981' },
    ]
  },
  {
    category: 'International Certifications',
    items: [
      { id: 'saso', name: 'SASO Certification', icon: 'globe-outline', color: '#10B981' },
      { id: 'saber', name: 'SABER Certification', icon: 'shield-checkmark-outline', color: '#3B82F6' },
      { id: 'pcoc_scoc', name: 'PCoC / SCoC', icon: 'document-text-outline', color: '#8B5CF6' },
      { id: 'sfda', name: 'SFDA', icon: 'medkit-outline', color: '#EC4899' },
      { id: 'gmark', name: 'G-Mark (GCC)', icon: 'ribbon-outline', color: '#F59E0B' },
      { id: 'ce_mark', name: 'CE Marking', icon: 'earth-outline', color: '#00D4FF' },
      { id: 'reach', name: 'REACH', icon: 'flask-outline', color: '#10B981' },
      { id: 'iecee', name: 'IECEE', icon: 'flash-outline', color: '#F59E0B' },
      { id: 'eer', name: 'Energy Efficiency Rating', icon: 'battery-charging-outline', color: '#10B981' },
      { id: 'water_eff', name: 'Water Efficiency (GCC)', icon: 'water-outline', color: '#00D4FF' },
      { id: 'ecas', name: 'ECAS / MOIAT', icon: 'ribbon-outline', color: '#6C63FF' },
      { id: 'egypt_pvoc', name: 'Egypt PVoC', icon: 'document-outline', color: '#FFB347' },
      { id: 'iraq_pvoc', name: 'Iraq PVoC', icon: 'document-outline', color: '#F59E0B' },
      { id: 'tanzania_pvoc', name: 'Tanzania PVoC', icon: 'document-outline', color: '#EF4444' },
      { id: 'uganda_pvoc', name: 'Uganda PVoC', icon: 'document-outline', color: '#10B981' },
      { id: 'nigeria_soncap', name: 'Nigeria SONCAP', icon: 'shield-outline', color: '#3B82F6' },
      { id: 'ivory_coast_coc', name: 'Ivory Coast CoC', icon: 'document-outline', color: '#FFB347' },
      { id: 'ethiopia_coc', name: 'Ethiopia CoC', icon: 'document-outline', color: '#EC4899' },
      { id: 'zimbabwe_coc', name: 'Zimbabwe CoC', icon: 'document-outline', color: '#F59E0B' },
      { id: 'tir_kuwait', name: 'TIR Kuwait', icon: 'boat-outline', color: '#8B5CF6' },
      { id: 'usfda', name: 'USFDA / FDA', icon: 'medkit-outline', color: '#EF4444' },
      { id: 'usda', name: 'USDA', icon: 'leaf-outline', color: '#10B981' },
      { id: 'rodtap', name: 'Rodtap / Traceability', icon: 'git-network-outline', color: '#3B82F6' },
      { id: 'company_reg_overseas', name: 'Company Registration (Overseas)', icon: 'business-outline', color: '#6C63FF' },
      { id: 'q_mark', name: 'Q Mark Certification', icon: 'checkmark-circle-outline', color: '#F59E0B' },
    ]
  },
  {
    category: 'Testing Services',
    items: [
      { id: 'test_textile', name: 'Textile Testing', icon: 'shirt-outline', color: '#EC4899' },
      { id: 'test_paper', name: 'Paper & Cardboard', icon: 'document-text-outline', color: '#F59E0B' },
      { id: 'test_packaging', name: 'Packaging, Tapes & Glues', icon: 'cube-outline', color: '#8B5CF6' },
      { id: 'test_paints', name: 'Paints & Varnishes', icon: 'color-palette-outline', color: '#10B981' },
      { id: 'test_leather', name: 'Leather & Footwear', icon: 'walk-outline', color: '#F59E0B' },
      { id: 'test_building', name: 'Building Materials', icon: 'business-outline', color: '#6C63FF' },
      { id: 'test_auto', name: 'Automobiles & Machineries', icon: 'car-outline', color: '#EF4444' },
      { id: 'test_electronics', name: 'Electrical & Electronics', icon: 'hardware-chip-outline', color: '#00D4FF' },
      { id: 'test_rohs', name: 'RoHS Testing', icon: 'flask-outline', color: '#10B981' },
      { id: 'test_rohs_india', name: 'RoHS India', icon: 'flask-outline', color: '#00C896' },
      { id: 'test_food', name: 'Food & Cosmetics', icon: 'nutrition-outline', color: '#FFB347' },
    ]
  },
  {
    category: 'Inspection Services',
    items: [
      { id: 'insp_preshipment', name: 'Pre-Shipment Inspection', icon: 'search-outline', color: '#3B82F6' },
      { id: 'insp_used_vehicle', name: 'Used Vehicle Inspection', icon: 'car-sport-outline', color: '#EF4444' },
      { id: 'insp_food', name: 'Food & Cosmetics Inspection', icon: 'eye-outline', color: '#F59E0B' },
      { id: 'insp_container', name: 'Container Inspection', icon: 'cube-outline', color: '#8B5CF6' },
      { id: 'insp_health', name: 'Health Certificate (Export)', icon: 'medkit-outline', color: '#10B981' },
    ]
  }
];

export const TOP_6_SERVICE_IDS = ['bis_crs', 'epr', 'wpc', 'fssai', 'saso', 'lab_test'];

export const PAYMENT_METHODS = [
  { id: 'upi', name: 'UPI Payment', icon: 'phone-portrait' },
  { id: 'netbanking', name: 'Net Banking', icon: 'business' },
  { id: 'card', name: 'Credit / Debit Card', icon: 'card' },
  { id: 'neft', name: 'NEFT / RTGS', icon: 'swap-horizontal' },
];

export const PAGINATION_LIMIT = 20;
export const QUERY_STALE_TIME = 5 * 60 * 1000; // 5 minutes
export const QUERY_CACHE_TIME = 30 * 60 * 1000; // 30 minutes

export const NOTIFICATION_CATEGORIES = {
  APPLICATION: 'application',
  CERTIFICATION: 'certification',
  PAYMENT: 'payment',
  DOCUMENT: 'document',
  SYSTEM: 'system',
  REMINDER: 'reminder',
};

// ── Onboarding Steps ─────────────────────────────────────────────────────────

// Step 1 – Primary Business Role (single select)
export const BUSINESS_ROLES = [
  { id: 'manufacturer',  label: 'Manufacturer',              icon: 'construct',           color: '#6C63FF' },
  { id: 'importer',      label: 'Importer',                  icon: 'download-outline',    color: '#00D4FF' },
  { id: 'exporter',      label: 'Exporter',                  icon: 'arrow-up-circle',     color: '#00C896' },
  { id: 'supplier',      label: 'Supplier / Trader',         icon: 'storefront',          color: '#FFB347' },
  { id: 'logistics',     label: 'Logistics / Shipping',      icon: 'boat',                color: '#FF6B6B' },
  { id: 'consultant',    label: 'Service Provider / Consultant', icon: 'briefcase',       color: '#9B59B6' },
  { id: 'individual',    label: 'Individual',                icon: 'person',              color: '#00D4FF' },
  { id: 'freelancer',    label: 'Freelancer',                icon: 'laptop',              color: '#E63946' },
] as const;

// Step 2 – Industry (multi select)
export const INDUSTRIES = [
  { id: 'electronics',  label: 'Electronics',       icon: 'hardware-chip',     color: '#6C63FF' },
  { id: 'medical',      label: 'Medical Devices',   icon: 'medkit',            color: '#FF6B6B' },
  { id: 'chemicals',    label: 'Chemicals',         icon: 'flask',             color: '#FFB347' },
  { id: 'toys',         label: 'Toys & Games',      icon: 'game-controller',   color: '#00C896' },
  { id: 'textiles',     label: 'Textiles',          icon: 'shirt',             color: '#9B59B6' },
  { id: 'telecom',      label: 'Telecom',           icon: 'cellular',          color: '#00D4FF' },
  { id: 'automotive',   label: 'Automotive',        icon: 'car',               color: '#FF9500' },
  { id: 'food',         label: 'Food & Beverage',   icon: 'restaurant',        color: '#00C896' },
  { id: 'cosmetics',    label: 'Cosmetics',         icon: 'rose',              color: '#FF6B6B' },
  { id: 'pharma',       label: 'Pharmaceuticals',   icon: 'bandage',           color: '#E63946' },
  { id: 'construction', label: 'Construction',      icon: 'hammer',            color: '#8B6914' },
  { id: 'energy',       label: 'Energy & Power',    icon: 'flash',             color: '#FFB347' },
  { id: 'agriculture',  label: 'Agriculture',       icon: 'leaf',              color: '#00A651' },
  { id: 'it_software',  label: 'IT & Software',     icon: 'code-slash',        color: '#6C63FF' },
  { id: 'defence',      label: 'Defence',           icon: 'shield',            color: '#4A4A8A' },
  { id: 'aerospace',    label: 'Aerospace',         icon: 'airplane',          color: '#1D3461' },
  { id: 'packaging',    label: 'Packaging',         icon: 'cube',              color: '#9B59B6' },
  { id: 'furniture',    label: 'Furniture',         icon: 'bed',               color: '#8B6914' },
] as const;

// Step 3 – Target Markets (multi select)
// First 6 are shown by default; rest revealed with "View More"
export const TARGET_MARKETS = [
  { id: 'india',      label: 'India',           flag: '🇮🇳', color: '#FF9500' },
  { id: 'uae',        label: 'UAE',             flag: '🇦🇪', color: '#00C896' },
  { id: 'saudi',      label: 'Saudi Arabia',    flag: '🇸🇦', color: '#00A07A' },
  { id: 'europe',     label: 'Europe (EU)',      flag: '🇪🇺', color: '#003399' },
  { id: 'usa',        label: 'USA',             flag: '🇺🇸', color: '#6C63FF' },
  { id: 'africa',     label: 'Africa',          flag: '🌍',  color: '#FFB347' },
  // extended — shown after "View More"
  { id: 'uk',         label: 'United Kingdom',  flag: '🇬🇧', color: '#C8102E' },
  { id: 'australia',  label: 'Australia',       flag: '🇦🇺', color: '#00843D' },
  { id: 'canada',     label: 'Canada',          flag: '🇨🇦', color: '#FF0000' },
  { id: 'japan',      label: 'Japan',           flag: '🇯🇵', color: '#BC002D' },
  { id: 'china',      label: 'China',           flag: '🇨🇳', color: '#DE2910' },
  { id: 'sea',        label: 'Southeast Asia',  flag: '🌏',  color: '#9B59B6' },
  { id: 'brazil',     label: 'Brazil',          flag: '🇧🇷', color: '#009C3B' },
  { id: 'gcc',        label: 'GCC Countries',   flag: '🌙',  color: '#00A07A' },
] as const;

// Step 4 – Interested Certifications (multi select)
export const ONBOARDING_CERTIFICATIONS = [
  { id: 'bis',   label: 'BIS',    desc: 'Bureau of Indian Standards',      color: '#6C63FF', icon: 'shield-checkmark' },
  { id: 'ce',    label: 'CE',     desc: 'European Conformity',              color: '#003399', icon: 'shield-half' },
  { id: 'saber', label: 'SABER',  desc: 'Saudi Standards Authority',        color: '#00A07A', icon: 'checkmark-circle' },
  { id: 'fda',   label: 'FDA',    desc: 'Food & Drug Administration (US)',  color: '#E63946', icon: 'medical' },
  { id: 'wpc',   label: 'WPC',    desc: 'Wireless Planning & Coordination', color: '#00D4FF', icon: 'wifi' },
  { id: 'tec',   label: 'TEC',    desc: 'Telecom Engineering Centre',       color: '#9B59B6', icon: 'cellular' },
  { id: 'epr',   label: 'EPR',    desc: 'Extended Producer Responsibility', color: '#00C896', icon: 'leaf' },
] as const;

// Step 5 – Company Size (single select)
export const COMPANY_SIZES = [
  { id: 'solo',    label: 'Individual / Solo',  desc: 'Just me',                      icon: 'person',    color: '#6C63FF' },
  { id: 'startup', label: 'Startup',             desc: '2 – 20 employees',             icon: 'rocket',    color: '#00D4FF' },
  { id: 'small',   label: 'Small Business',      desc: '20 – 100 employees',           icon: 'storefront',color: '#00C896' },
  { id: 'mid',     label: 'Mid-size Company',    desc: '100 – 500 employees',          icon: 'business',  color: '#FFB347' },
  { id: 'large',   label: 'Enterprise',          desc: '500+ employees',               icon: 'globe',     color: '#9B59B6' },
] as const;

// Step 6 – Business Goals (multi select)
export const BUSINESS_GOALS = [
  { id: 'faster_cert',    label: 'Faster Certification',    icon: 'flash',          color: '#FFB347' },
  { id: 'global',         label: 'Global Expansion',        icon: 'globe',          color: '#00D4FF' },
  { id: 'shipment',       label: 'Shipment Compliance',     icon: 'boat',           color: '#6C63FF' },
  { id: 'reduce_reject',  label: 'Reduce Rejections',       icon: 'shield-checkmark',color: '#00C896' },
  { id: 'ai_assist',      label: 'AI Assistance',           icon: 'sparkles',       color: '#9B59B6' },
  { id: 'automate',       label: 'Compliance Automation',   icon: 'settings',       color: '#FF6B6B' },
] as const;

export type BusinessRoleId    = (typeof BUSINESS_ROLES)[number]['id'];
export type IndustryId        = (typeof INDUSTRIES)[number]['id'];
export type TargetMarketId    = (typeof TARGET_MARKETS)[number]['id'];
export type CertificationOBId = (typeof ONBOARDING_CERTIFICATIONS)[number]['id'];
export type CompanySizeId     = (typeof COMPANY_SIZES)[number]['id'];
export type BusinessGoalId    = (typeof BUSINESS_GOALS)[number]['id'];

// Legacy – kept for any existing code that references USER_TYPES
export const USER_TYPES = BUSINESS_ROLES;
export type UserTypeId = BusinessRoleId;

// ── Certification Bodies (CB) ─────────────────────────────────────────────────
export const CERTIFICATION_BODIES: any[] = [];

// ── Homepage Feature Cards ────────────────────────────────────────────────────
export const HOME_FEATURE_CARDS = [
  {
    id: 'ai_quality',
    title: 'AI Product Quality\nIdentifier',
    subtitle: 'Scan any product or label to get instant quality, safety & composition insights',
    gradient: ['#1A1560', '#6C63FF', '#00D4FF'] as [string, string, string],
    icon: 'scan',
    badge: 'NEW',
    screen: 'AIAssistant',
    screenParams: { screen: 'AIProductQuality' },
  },
  {
    id: 'cb_finder',
    title: 'Find Your\nCertification Body',
    subtitle: 'Compare 50+ CBs on pricing, TAT, scope & reviews — and apply directly',
    gradient: ['#004D40', '#00C896', '#00E5AD'] as [string, string, string],
    icon: 'git-compare',
    badge: 'POPULAR',
    screen: 'Certifications',
    screenParams: { screen: 'CBComparison' },
  },
  {
    id: 'fast_track',
    title: 'BIS Fast\nTrack Program',
    subtitle: 'Get BIS IS 13252 certification in 3 weeks with dedicated expert support',
    gradient: ['#1A0A2E', '#9B59B6', '#6C63FF'] as [string, string, string],
    icon: 'flash',
    badge: 'OFFER',
    screen: 'Certifications',
    screenParams: {},
  },
  {
    id: 'regulation_feed',
    title: 'Live Regulatory\nUpdates',
    subtitle: 'AI-curated feed of BIS, FSSAI, WPC, EPR policy changes — delivered daily',
    gradient: ['#1A0D00', '#FF9500', '#FFB347'] as [string, string, string],
    icon: 'newspaper',
    badge: 'LIVE',
    screen: 'AIAssistant',
    screenParams: { screen: 'AIRegulationFeed' },
  },
  {
    id: 'doc_vault',
    title: 'Smart\nDocument Vault',
    subtitle: 'OCR-powered document management with auto-expiry alerts & one-tap sharing',
    gradient: ['#001133', '#0099CC', '#00D4FF'] as [string, string, string],
    icon: 'folder-open',
    badge: null,
    screen: 'Documents',
    screenParams: {},
  },
] as const;
