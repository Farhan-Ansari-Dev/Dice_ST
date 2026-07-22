/**
 * Compliance stage — turns visual observations into regulatory conclusions.
 *
 * Deliberately deterministic. The rules below are auditable, reproducible, and
 * reviewable by a compliance officer; an LLM is not asked to invent which
 * regulations apply. The vision model supplies facts, this file supplies law.
 *
 * Scope is India-first (BIS/FSSAI/WPC/CDSCO/LMPC/EPR) with EU/US export notes,
 * matching the consultancy's actual practice areas.
 */
import { randomUUID } from 'crypto';
import type {
  VisionObservations,
  ComplianceAssessment,
  ComplianceFinding,
  ProductAnalysis,
} from './types';

export const DISCLAIMER =
  'This assessment is derived solely from what is visible in the supplied photograph. ' +
  'It identifies which certifications and markings appear to APPLY and which appear ABSENT from the artwork. ' +
  'It is not a certificate, a test report, or evidence of conformity. ' +
  'The presence of a mark on packaging does not establish that a product is certified. ' +
  'Material composition, electrical safety, and chemical properties cannot be determined from an image and are never asserted here. ' +
  'Confirm all findings through accredited testing and the relevant authority before relying on them.';

type Category =
  | 'electronics' | 'food' | 'cosmetics' | 'toys' | 'apparel'
  | 'medical' | 'automotive' | 'footwear' | 'packaging'
  | 'furniture' | 'chemical' | 'other';

const CATEGORY_ALIASES: Record<string, Category> = {
  electronics: 'electronics', electronic: 'electronics', tech: 'electronics',
  electrical: 'electronics', appliance: 'electronics', it: 'electronics',
  food: 'food', beverage: 'food', foodstuff: 'food', grocery: 'food',
  cosmetics: 'cosmetics', cosmetic: 'cosmetics', skincare: 'cosmetics', personalcare: 'cosmetics',
  toys: 'toys', toy: 'toys',
  apparel: 'apparel', clothing: 'apparel', textile: 'apparel', garment: 'apparel',
  medical: 'medical', medicaldevice: 'medical', healthcare: 'medical',
  automotive: 'automotive', auto: 'automotive', vehicle: 'automotive',
  footwear: 'footwear', shoes: 'footwear',
  packaging: 'packaging',
  furniture: 'furniture',
  chemical: 'chemical', chemicals: 'chemical',
};

function normaliseCategory(raw: string): Category {
  const key = raw.toLowerCase().replace(/[^a-z]/g, '');
  return CATEGORY_ALIASES[key] ?? 'other';
}

/** A marking the artwork should carry, and how to spot it in OCR text. */
interface MarkingRule {
  mark: string;
  label: string;
  detail: string;
  reference?: string;
  severity: ComplianceFinding['severity'];
  /** Patterns that indicate the marking IS present in detected text. */
  patterns: RegExp[];
}

interface CategoryRules {
  certifications: Array<{ title: string; detail: string; reference?: string; severity: ComplianceFinding['severity'] }>;
  regulations: Array<{ title: string; detail: string; reference?: string; severity: ComplianceFinding['severity'] }>;
  standards: Array<{ title: string; detail: string; reference?: string; severity: ComplianceFinding['severity'] }>;
  markings: MarkingRule[];
  documentation: string[];
  nextSteps: string[];
}

const LMPC_MARKINGS: MarkingRule[] = [
  { mark: 'MRP', label: 'Maximum Retail Price declaration', detail: 'Legal Metrology (Packaged Commodities) Rules 2011 require the retail sale price inclusive of all taxes on every pre-packed commodity.', reference: 'LMPC Rules 2011, Rule 6', severity: 'important', patterns: [/\bM\.?R\.?P\.?\b/i, /maximum retail/i, /₹\s?\d/, /\brs\.?\s?\d/i] },
  { mark: 'IMPORTER', label: 'Importer / manufacturer name and address', detail: 'The name and full address of the manufacturer, packer, or importer must be declared on the principal display panel.', reference: 'LMPC Rules 2011, Rule 6(1)(a)', severity: 'important', patterns: [/imported by/i, /marketed by/i, /manufactured by/i, /packed by/i] },
  { mark: 'NET_QTY', label: 'Net quantity declaration', detail: 'Net weight, measure, or number must be declared in standard units.', reference: 'LMPC Rules 2011, Rule 8', severity: 'important', patterns: [/net (wt|weight|qty|quantity|vol|volume)/i, /\b\d+\s?(g|kg|ml|l|litre|liter|pcs|units?)\b/i] },
  { mark: 'DATE', label: 'Month and year of manufacture or import', detail: 'Date of manufacture, packing, or import must be declared.', reference: 'LMPC Rules 2011, Rule 6(1)(d)', severity: 'advisory', patterns: [/mfg|mfd|manufactur/i, /date of (packing|import|mfg)/i, /\b(0?[1-9]|1[0-2])\s?\/\s?(20)?\d{2}\b/] },
  { mark: 'CARE', label: 'Consumer care contact details', detail: 'A consumer-care telephone number or email address must be provided for grievance redressal.', reference: 'LMPC Rules 2011, Rule 6(1)(e)', severity: 'advisory', patterns: [/customer care/i, /consumer care/i, /helpline/i, /support@|care@|@[\w.-]+\.\w+/i] },
];

const COMMON: Pick<CategoryRules, 'documentation' | 'nextSteps'> = {
  documentation: [
    'Commercial invoice and packing list',
    'Bill of entry / shipping bill for the consignment',
    'Manufacturer declaration of product specification',
  ],
  nextSteps: [
    'Confirm the exact product classification and HS code, since applicable schemes follow from it',
    'Obtain accredited (NABL/ILAC) test reports for the standards identified above',
    'Have artwork reviewed against Legal Metrology declarations before the next print run',
  ],
};

const RULES: Record<Category, CategoryRules> = {
  electronics: {
    certifications: [
      { title: 'BIS Compulsory Registration (CRS)', detail: 'Most IT and audio-video equipment falls under the Compulsory Registration Order and must be registered with BIS before import or sale in India.', reference: 'MeitY CRO / IS 13252(Part 1)', severity: 'critical' },
      { title: 'WPC Equipment Type Approval', detail: 'Products containing Wi-Fi, Bluetooth, or other de-licensed-band radios require ETA from the Wireless Planning & Coordination wing.', reference: 'WPC ETA', severity: 'important' },
      { title: 'BIS registration for lithium cells', detail: 'Where a lithium-ion secondary cell or battery pack is fitted, that cell requires separate BIS registration.', reference: 'IS 16046', severity: 'important' },
    ],
    regulations: [
      { title: 'E-Waste (Management) Rules — EPR', detail: 'Producers of electrical and electronic equipment must obtain EPR authorisation from CPCB and meet collection targets.', reference: 'E-Waste Rules 2022', severity: 'important' },
      { title: 'Legal Metrology (Packaged Commodities) Rules', detail: 'Pre-packed goods must carry the statutory declarations.', reference: 'LMPC Rules 2011', severity: 'important' },
    ],
    standards: [
      { title: 'IS 13252 (Part 1) — Safety of IT equipment', detail: 'Safety requirements for information technology and audio-video equipment.', reference: 'IS 13252(Part 1)/IEC 60950-1', severity: 'advisory' },
      { title: 'EMC requirements for export', detail: 'EU markets require the EMC and RED directives; the US requires an FCC equipment authorisation.', reference: 'EU 2014/30/EU, 2014/53/EU; 47 CFR Part 15', severity: 'advisory' },
    ],
    markings: [
      { mark: 'BIS', label: 'BIS standard mark / R-number', detail: 'CRS-registered products must display the BIS self-declaration mark with the R-number.', reference: 'CRS labelling guidelines', severity: 'critical', patterns: [/\bBIS\b/i, /\bR-?\d{6,}/i, /\bISI\b/i] },
      ...LMPC_MARKINGS,
    ],
    documentation: ['BIS registration certificate (R-number)', 'WPC ETA certificate where radios are fitted', 'CPCB EPR authorisation', 'Safety test report to IS 13252(Part 1)', ...COMMON.documentation],
    nextSteps: ['Confirm whether the product appears in the Compulsory Registration Order schedule', 'Arrange safety testing at a BIS-recognised laboratory', ...COMMON.nextSteps],
  },
  food: {
    certifications: [
      { title: 'FSSAI licence', detail: 'Manufacture, import, and sale of food require an FSSAI licence or registration appropriate to turnover and activity.', reference: 'FSS Act 2006', severity: 'critical' },
    ],
    regulations: [
      { title: 'FSS (Packaging and Labelling) Regulations', detail: 'Mandatory declarations include the FSSAI logo and licence number, veg/non-veg mark, ingredients, nutritional information, allergens, and best-before date.', reference: 'FSS (Labelling & Display) Regulations 2020', severity: 'critical' },
      { title: 'Legal Metrology (Packaged Commodities) Rules', detail: 'Pre-packed food must carry the statutory declarations.', reference: 'LMPC Rules 2011', severity: 'important' },
    ],
    standards: [
      { title: 'Food safety management system', detail: 'FSSAI schedule 4 requires a documented FSMS; ISO 22000 or HACCP is commonly used to demonstrate it.', reference: 'FSS Schedule 4 / ISO 22000', severity: 'advisory' },
    ],
    markings: [
      { mark: 'FSSAI', label: 'FSSAI logo and 14-digit licence number', detail: 'The FSSAI logo with the licence number must appear on the label.', reference: 'FSS Labelling Regulations 2020', severity: 'critical', patterns: [/\bFSSAI\b/i, /\b\d{14}\b/] },
      { mark: 'VEG_MARK', label: 'Veg / non-veg indicator', detail: 'The green or brown filled circle in a square outline is mandatory on Indian food packaging.', reference: 'FSS Labelling Regulations 2020, Reg 5', severity: 'critical', patterns: [/\bveg\b/i, /vegetarian/i, /non-?veg/i] },
      { mark: 'ALLERGEN', label: 'Allergen declaration', detail: 'Presence of major allergens must be declared.', reference: 'FSS Labelling Regulations 2020, Reg 5(6)', severity: 'important', patterns: [/allergen/i, /contains:? .*(milk|soy|nut|wheat|gluten|egg)/i] },
      { mark: 'BEST_BEFORE', label: 'Best-before / use-by date', detail: 'Date of expiry, best before, or use by must be declared.', reference: 'FSS Labelling Regulations 2020', severity: 'critical', patterns: [/best before/i, /use by/i, /expiry|expires/i] },
      ...LMPC_MARKINGS,
    ],
    documentation: ['FSSAI licence copy', 'Product composition and nutritional analysis report', 'Shelf-life study', ...COMMON.documentation],
    nextSteps: ['Verify the FSSAI product category and standard applicable to this food', 'Commission nutritional analysis from a NABL-accredited laboratory', ...COMMON.nextSteps],
  },
  cosmetics: {
    certifications: [
      { title: 'CDSCO cosmetic registration', detail: 'Imported cosmetics require registration with CDSCO; domestic manufacture requires a state licence in Form 32.', reference: 'Cosmetics Rules 2020', severity: 'critical' },
    ],
    regulations: [
      { title: 'Cosmetics Rules 2020 labelling', detail: 'Label must declare ingredients in descending order, net content, batch number, manufacturing date, use-before date, and manufacturer details.', reference: 'Cosmetics Rules 2020, Ch. VI', severity: 'critical' },
      { title: 'Legal Metrology (Packaged Commodities) Rules', detail: 'Pre-packed cosmetics must carry the statutory declarations.', reference: 'LMPC Rules 2011', severity: 'important' },
    ],
    standards: [
      { title: 'IS 4707 cosmetic classification', detail: 'Indian standards classify cosmetic raw materials and restrict certain substances.', reference: 'IS 4707 (Part 1 & 2)', severity: 'advisory' },
    ],
    markings: [
      { mark: 'BATCH', label: 'Batch number', detail: 'A batch or lot identification is mandatory.', reference: 'Cosmetics Rules 2020', severity: 'important', patterns: [/batch|lot\b|\bB\.?No\.?/i] },
      { mark: 'INGREDIENTS', label: 'Ingredient list', detail: 'Full ingredient listing in descending order of quantity is mandatory.', reference: 'Cosmetics Rules 2020', severity: 'critical', patterns: [/ingredient/i, /\baqua\b/i, /\bINCI\b/i] },
      { mark: 'USE_BEFORE', label: 'Use-before / expiry date', detail: 'Use-before date must be declared.', reference: 'Cosmetics Rules 2020', severity: 'critical', patterns: [/use before/i, /best before/i, /expiry|exp\.?\s?date/i, /\bPAO\b/i] },
      ...LMPC_MARKINGS,
    ],
    documentation: ['CDSCO registration certificate or Form 32 licence', 'Product ingredient/formulation breakdown', 'Safety assessment report', ...COMMON.documentation],
    nextSteps: ['Confirm no ingredient appears on the prohibited-substance schedule', 'Arrange microbiological and stability testing', ...COMMON.nextSteps],
  },
  toys: {
    certifications: [
      { title: 'BIS certification under the Toys QCO', detail: 'Toys for children under 14 require BIS certification under the Toys (Quality Control) Order; imports without it are not permitted.', reference: 'Toys (QCO) 2020', severity: 'critical' },
    ],
    regulations: [
      { title: 'Toys Quality Control Order', detail: 'Both domestic and imported toys must bear the Standard Mark under a BIS licence.', reference: 'Toys (QCO) 2020', severity: 'critical' },
      { title: 'Legal Metrology (Packaged Commodities) Rules', detail: 'Pre-packed toys must carry the statutory declarations.', reference: 'LMPC Rules 2011', severity: 'important' },
    ],
    standards: [
      { title: 'IS 9873 — Safety of toys', detail: 'Covers mechanical and physical properties, flammability, and migration of certain elements.', reference: 'IS 9873 (Parts 1–9)', severity: 'important' },
      { title: 'EN 71 for EU export', detail: 'EU toy safety directive conformity is demonstrated against the EN 71 series.', reference: 'EN 71 / 2009/48/EC', severity: 'advisory' },
    ],
    markings: [
      { mark: 'BIS', label: 'BIS Standard Mark with licence number', detail: 'Toys must carry the ISI mark with the BIS licence number.', reference: 'Toys (QCO) 2020', severity: 'critical', patterns: [/\bBIS\b/i, /\bISI\b/i, /CM\/?L\s?-?\s?\d+/i] },
      { mark: 'AGE_GRADE', label: 'Age grading and warnings', detail: 'Age suitability and choking-hazard warnings must be displayed.', reference: 'IS 9873 Part 9 / LMPC', severity: 'critical', patterns: [/\b\d+\s?\+\s?(years|yrs)?/i, /age\s?(group|grade)/i, /choking/i, /small parts/i, /not suitable for/i] },
      ...LMPC_MARKINGS,
    ],
    documentation: ['BIS licence for the toy category', 'IS 9873 test reports from a BIS-recognised laboratory', ...COMMON.documentation],
    nextSteps: ['Confirm the toy falls within the QCO scope for the intended age group', 'Arrange mechanical, flammability, and element-migration testing', ...COMMON.nextSteps],
  },
  apparel: {
    certifications: [
      { title: 'No mandatory pre-market certification in India', detail: 'General apparel is not subject to compulsory BIS certification, but labelling and fibre-content rules still apply.', severity: 'info' },
    ],
    regulations: [
      { title: 'Legal Metrology (Packaged Commodities) Rules', detail: 'Pre-packed garments must carry the statutory declarations including size and fibre composition.', reference: 'LMPC Rules 2011', severity: 'important' },
      { title: 'Textile labelling requirements', detail: 'Fibre composition, size, and care instructions must be declared.', reference: 'IS 15546 / LMPC', severity: 'important' },
    ],
    standards: [
      { title: 'IS 15546 — Textile care labelling', detail: 'Specifies the care-symbol system for textile products.', reference: 'IS 15546', severity: 'advisory' },
      { title: 'OEKO-TEX / GOTS for export buyers', detail: 'Voluntary schemes frequently required contractually by EU and US buyers.', severity: 'info' },
    ],
    markings: [
      { mark: 'FIBRE', label: 'Fibre composition', detail: 'Percentage fibre composition must be declared.', reference: 'LMPC Rules 2011', severity: 'important', patterns: [/\d+\s?%\s?(cotton|polyester|wool|silk|nylon|viscose|linen|elastane|spandex)/i, /fibre|fiber composition/i] },
      { mark: 'CARE', label: 'Care instructions', detail: 'Washing and care symbols or instructions must be provided.', reference: 'IS 15546', severity: 'advisory', patterns: [/machine wash|hand wash|do not bleach|tumble dry|dry clean|iron/i] },
      { mark: 'SIZE', label: 'Size designation', detail: 'Size must be declared.', severity: 'advisory', patterns: [/\bsize\b/i, /\b(XS|S|M|L|XL|XXL|\d{2})\b/] },
      ...LMPC_MARKINGS,
    ],
    documentation: ['Fibre composition test report', 'Azo-dye and restricted-substance declaration for export', ...COMMON.documentation],
    nextSteps: ['Confirm buyer-specific scheme requirements for the destination market', 'Arrange fibre-composition and colourfastness testing', ...COMMON.nextSteps],
  },
  medical: {
    certifications: [
      { title: 'CDSCO medical device licence', detail: 'Medical devices are regulated by class (A/B/C/D); import requires an MD-14/MD-15 licence and manufacture an MD-5/MD-9.', reference: 'Medical Devices Rules 2017', severity: 'critical' },
    ],
    regulations: [
      { title: 'Medical Devices Rules 2017', detail: 'Registration, labelling, and post-market surveillance obligations apply according to risk class.', reference: 'MDR 2017', severity: 'critical' },
      { title: 'Legal Metrology (Packaged Commodities) Rules', detail: 'Pre-packed devices must carry the statutory declarations.', reference: 'LMPC Rules 2011', severity: 'important' },
    ],
    standards: [
      { title: 'ISO 13485 quality management', detail: 'Quality management system for medical devices, expected for licensing and export.', reference: 'ISO 13485', severity: 'important' },
      { title: 'ISO 14971 risk management', detail: 'Application of risk management to medical devices.', reference: 'ISO 14971', severity: 'advisory' },
    ],
    markings: [
      { mark: 'LICENCE', label: 'Manufacturing or import licence number', detail: 'The CDSCO licence number must appear on the label.', reference: 'MDR 2017, Ch. VI', severity: 'critical', patterns: [/\bMD-?\d+/i, /licence no|license no/i] },
      { mark: 'UDI_BATCH', label: 'Batch/lot number and manufacturing date', detail: 'Batch identification and dates of manufacture and expiry are mandatory.', reference: 'MDR 2017', severity: 'critical', patterns: [/batch|lot\b|\bLOT\b/i, /mfg|manufactur/i, /\bUDI\b/i] },
      { mark: 'STERILE', label: 'Sterility and single-use indicators', detail: 'Where applicable, sterilisation method and single-use symbols must be shown.', severity: 'important', patterns: [/sterile/i, /single use/i, /do not reuse/i, /\bEO\b|ethylene oxide/i] },
      ...LMPC_MARKINGS,
    ],
    documentation: ['CDSCO device licence appropriate to risk class', 'ISO 13485 certificate', 'Device master file and risk management file', 'Clinical evaluation or performance evaluation report', ...COMMON.documentation],
    nextSteps: ['Confirm the device risk classification under MDR 2017 Schedule', 'Engage a notified body for the destination market if exporting', ...COMMON.nextSteps],
  },
  automotive: {
    certifications: [
      { title: 'AIS / CMVR type approval', detail: 'Automotive components require type approval under the Central Motor Vehicles Rules against the applicable AIS standard.', reference: 'CMVR / AIS', severity: 'critical' },
    ],
    regulations: [
      { title: 'Central Motor Vehicles Rules', detail: 'Component-level conformity of production requirements apply.', reference: 'CMVR Rule 126', severity: 'important' },
      { title: 'Legal Metrology (Packaged Commodities) Rules', detail: 'Pre-packed parts must carry the statutory declarations.', reference: 'LMPC Rules 2011', severity: 'important' },
    ],
    standards: [
      { title: 'IATF 16949 quality management', detail: 'Automotive quality management system expected across the supply chain.', reference: 'IATF 16949', severity: 'advisory' },
    ],
    markings: [{ mark: 'PART_NO', label: 'Part number and manufacturer identification', detail: 'Component part number and manufacturer must be identifiable.', severity: 'advisory', patterns: [/part\s?(no|number)/i, /\bOE[MN]?\b/i] }, ...LMPC_MARKINGS],
    documentation: ['ARAI/ICAT type approval certificate', 'Conformity of production report', ...COMMON.documentation],
    nextSteps: ['Identify the applicable AIS standard for this component', 'Arrange type-approval testing at ARAI or ICAT', ...COMMON.nextSteps],
  },
  footwear: {
    certifications: [
      { title: 'BIS certification under the Footwear QCO', detail: 'Footwear is covered by a Quality Control Order requiring BIS certification.', reference: 'Footwear (QCO) 2024', severity: 'critical' },
    ],
    regulations: [
      { title: 'Footwear Quality Control Order', detail: 'Covered footwear must bear the Standard Mark under a BIS licence.', reference: 'Footwear (QCO)', severity: 'critical' },
      { title: 'Legal Metrology (Packaged Commodities) Rules', detail: 'Pre-packed footwear must carry the statutory declarations.', reference: 'LMPC Rules 2011', severity: 'important' },
    ],
    standards: [{ title: 'IS 6721 / IS 15298 footwear standards', detail: 'Applicable depending on whether the footwear is general or protective.', reference: 'IS 6721, IS 15298', severity: 'advisory' }],
    markings: [
      { mark: 'BIS', label: 'BIS Standard Mark with licence number', detail: 'Covered footwear must display the ISI mark and licence number.', reference: 'Footwear QCO', severity: 'critical', patterns: [/\bBIS\b/i, /\bISI\b/i, /CM\/?L\s?-?\s?\d+/i] },
      { mark: 'SIZE', label: 'Size designation', detail: 'Size must be marked.', severity: 'advisory', patterns: [/\bsize\b/i, /\bUK\s?\d+|\bEU\s?\d+|\bUS\s?\d+/i] },
      ...LMPC_MARKINGS,
    ],
    documentation: ['BIS licence for the footwear category', 'Test reports to the applicable IS standard', ...COMMON.documentation],
    nextSteps: ['Confirm whether this footwear type falls within the QCO schedule', ...COMMON.nextSteps],
  },
  packaging: {
    certifications: [{ title: 'Food-contact suitability where applicable', detail: 'Packaging intended for food contact must meet FSSAI packaging requirements.', reference: 'FSS (Packaging) Regulations 2018', severity: 'important' }],
    regulations: [
      { title: 'Plastic Waste Management Rules — EPR', detail: 'Producers, importers, and brand owners of plastic packaging require EPR registration with CPCB.', reference: 'PWM Rules 2016 (as amended)', severity: 'important' },
      { title: 'Legal Metrology (Packaged Commodities) Rules', detail: 'Statutory declarations apply to the packed commodity.', reference: 'LMPC Rules 2011', severity: 'important' },
    ],
    standards: [{ title: 'IS 9833 — Printing inks for food packaging', detail: 'Restricts inks used on packaging in contact with food.', reference: 'IS 9833', severity: 'advisory' }],
    markings: [
      { mark: 'RESIN_CODE', label: 'Plastic resin identification code', detail: 'Plastic packaging should carry the resin identification code and recyclability information.', reference: 'PWM Rules 2016', severity: 'advisory', patterns: [/\bPET\b|\bHDPE\b|\bLDPE\b|\bPVC\b|\bPP\b|\bPS\b/i, /recycl/i, /\b[1-7]\b\s?(PET|HDPE|PVC|LDPE|PP|PS)/i] },
      ...LMPC_MARKINGS,
    ],
    documentation: ['CPCB EPR registration for plastic packaging', 'Food-contact migration test report where applicable', ...COMMON.documentation],
    nextSteps: ['Register for plastic-packaging EPR if acting as a brand owner or importer', ...COMMON.nextSteps],
  },
  furniture: {
    certifications: [{ title: 'No general mandatory certification', detail: 'Furniture is not broadly subject to compulsory certification in India, though specific items may be.', severity: 'info' }],
    regulations: [{ title: 'Legal Metrology (Packaged Commodities) Rules', detail: 'Pre-packed furniture must carry the statutory declarations.', reference: 'LMPC Rules 2011', severity: 'important' }],
    standards: [{ title: 'IS 17631 / BIFMA for contract furniture', detail: 'Strength, durability, and stability standards commonly required by institutional buyers.', reference: 'IS 17631, ANSI/BIFMA', severity: 'advisory' }],
    markings: [...LMPC_MARKINGS],
    documentation: [...COMMON.documentation],
    nextSteps: [...COMMON.nextSteps],
  },
  chemical: {
    certifications: [{ title: 'BIS certification where a QCO applies', detail: 'Many industrial chemicals are covered by Quality Control Orders requiring BIS certification.', reference: 'Chemical QCOs', severity: 'critical' }],
    regulations: [
      { title: 'Manufacture, Storage and Import of Hazardous Chemicals Rules', detail: 'Classification, packaging, and labelling obligations apply to hazardous substances.', reference: 'MSIHC Rules 1989', severity: 'critical' },
      { title: 'Legal Metrology (Packaged Commodities) Rules', detail: 'Pre-packed chemicals must carry the statutory declarations.', reference: 'LMPC Rules 2011', severity: 'important' },
    ],
    standards: [{ title: 'GHS classification and labelling', detail: 'Globally Harmonised System pictograms, signal words, and hazard statements.', reference: 'GHS Rev. 9', severity: 'important' }],
    markings: [
      { mark: 'GHS', label: 'GHS hazard pictograms and signal word', detail: 'Hazard pictograms, a signal word, and hazard/precautionary statements must appear.', reference: 'GHS', severity: 'critical', patterns: [/danger|warning/i, /\bGHS\b/i, /hazard/i, /flammable|corrosive|toxic|irritant/i] },
      { mark: 'SDS', label: 'Safety data sheet reference', detail: 'A safety data sheet must accompany the product.', reference: 'MSIHC Rules 1989', severity: 'important', patterns: [/\bSDS\b|\bMSDS\b/i, /safety data sheet/i] },
      ...LMPC_MARKINGS,
    ],
    documentation: ['Safety data sheet (SDS) in the prescribed format', 'BIS licence where a QCO applies', ...COMMON.documentation],
    nextSteps: ['Confirm GHS classification for the substance or mixture', ...COMMON.nextSteps],
  },
  other: {
    certifications: [{ title: 'Product category could not be determined confidently', detail: 'Applicable certification schemes follow from the product category and HS code. Supply a clearer image or the product description to narrow this down.', severity: 'advisory' }],
    regulations: [{ title: 'Legal Metrology (Packaged Commodities) Rules', detail: 'Almost all pre-packed goods sold in India must carry the statutory declarations.', reference: 'LMPC Rules 2011', severity: 'important' }],
    standards: [],
    markings: [...LMPC_MARKINGS],
    documentation: [...COMMON.documentation],
    nextSteps: ['Re-scan with the product label filling the frame so declarations can be read', ...COMMON.nextSteps],
  },
};

const SEVERITY_WEIGHT: Record<ComplianceFinding['severity'], number> = {
  info: 0, advisory: 4, important: 9, critical: 16,
};

const finding = (
  title: string,
  detail: string,
  severity: ComplianceFinding['severity'],
  confidence: number,
  evidence: string,
  reasoning: string,
  reference?: string,
): ComplianceFinding => ({
  id: randomUUID(), title, detail, severity, reference,
  confidence: Math.min(1, Math.max(0, confidence)), evidence, reasoning,
});

/** Builds the searchable text corpus the marking rules are matched against. */
function corpusOf(o: VisionObservations): string {
  return [
    ...o.detectedText.map((t) => t.text),
    ...o.warningLabels.map((t) => t.text),
    ...o.visibleCertifications.map((c) => `${c.mark} ${c.observation}`),
    o.countryOfOrigin?.text ?? '',
    o.brand ?? '',
  ].join('\n');
}

export function assessCompliance(o: VisionObservations): { assessment: ComplianceAssessment; category: Category } {
  const category = normaliseCategory(o.productCategory);
  const rules = RULES[category];
  const corpus = corpusOf(o);

  // Confidence in the category drives confidence in everything derived from it.
  const categoryConfidence = o.detectedText.length
    ? Math.min(0.95, 0.55 + Math.min(0.4, o.detectedText.length * 0.05))
    : 0.5;

  const catEvidence = o.detectedText.length
    ? `Identified as "${o.productType}" from ${o.detectedText.length} legible text element(s) on the packaging`
    : `Identified as "${o.productType}" from visual appearance alone; no legible text was found`;

  const derived = (
    list: Array<{ title: string; detail: string; reference?: string; severity: ComplianceFinding['severity'] }>,
    kind: string,
  ) => list.map((r) =>
    finding(r.title, r.detail, r.severity, categoryConfidence, catEvidence,
      `${kind} follows from the product category "${category}". It is not derived from the image beyond that classification.`,
      r.reference));

  const missingVisibleMarkings: ComplianceFinding[] = [];
  const presentMarkings: string[] = [];

  for (const rule of rules.markings) {
    const hit = rule.patterns.some((p) => p.test(corpus));
    if (hit) { presentMarkings.push(rule.mark); continue; }
    missingVisibleMarkings.push(
      finding(
        `${rule.label} not visible`,
        rule.detail,
        rule.severity,
        // Absence is weaker evidence than presence — a mark may simply be on a
        // face of the pack the camera never saw.
        o.imageQualityNotes ? 0.5 : 0.7,
        `No text matching ${rule.label.toLowerCase()} was found among the ${o.detectedText.length} detected element(s)`,
        'The declaration is required for this product category but no matching text was legible. It may be present on a surface not captured in this photograph — verify against the physical artwork.',
        rule.reference,
      ),
    );
  }

  // Split declaration-type gaps from marking-type gaps for the report.
  const declarationMarks = new Set(LMPC_MARKINGS.map((m) => m.label.toLowerCase()));
  const missingDeclarations = missingVisibleMarkings.filter((f) =>
    declarationMarks.has(f.title.replace(' not visible', '').toLowerCase()));
  const missingMarkings = missingVisibleMarkings.filter((f) => !missingDeclarations.includes(f));

  const assessment: ComplianceAssessment = {
    applicableCertifications: derived(rules.certifications, 'This certification requirement'),
    applicableRegulations: derived(rules.regulations, 'This regulation'),
    applicableStandards: derived(rules.standards, 'This standard'),
    missingVisibleMarkings: missingMarkings,
    missingDeclarations,
    requiredDocumentation: rules.documentation.map((d) =>
      finding(d, 'Required to demonstrate conformity for this product category.', 'advisory',
        categoryConfidence, catEvidence, 'Standard evidentiary requirement for the identified category.')),
    recommendedNextSteps: rules.nextSteps.map((s) =>
      finding(s, 'Recommended action arising from this assessment.', 'advisory',
        categoryConfidence, catEvidence, 'Derived from the gaps identified above.')),
  };

  return { assessment, category };
}

/** 0..100, higher = more outstanding compliance work. */
export function computeRiskScore(a: ComplianceAssessment, o: VisionObservations): number {
  const gaps = [...a.missingVisibleMarkings, ...a.missingDeclarations];
  const raw = gaps.reduce((sum, f) => sum + SEVERITY_WEIGHT[f.severity] * f.confidence, 0);

  const criticalReqs = a.applicableCertifications.filter((c) => c.severity === 'critical').length;
  const unverifiable = o.detectedText.length === 0 ? 12 : 0;

  return Math.max(0, Math.min(100, Math.round(raw + criticalReqs * 6 + unverifiable)));
}

export function buildAnalysis(o: VisionObservations, analysisId: string): ProductAnalysis {
  const { assessment, category } = assessCompliance(o);
  const riskScore = computeRiskScore(assessment, o);

  const confidence = assessment.applicableCertifications[0]?.confidence
    ?? (o.detectedText.length ? 0.7 : 0.5);

  return {
    analysisId,
    analysedAt: new Date().toISOString(),
    productCategory: category,
    productType: o.productType,
    brand: o.brand,
    detectedText: o.detectedText.map((t) => t.text),
    visibleCertifications: o.visibleCertifications.map((c) => c.mark),
    recommendedCertifications: assessment.applicableCertifications.map((c) => c.title),
    missingRequirements: [...assessment.missingVisibleMarkings, ...assessment.missingDeclarations].map((f) => f.title),
    riskScore,
    confidence: Math.round(confidence * 100) / 100,
    observations: o,
    assessment,
    disclaimer: DISCLAIMER,
  };
}
