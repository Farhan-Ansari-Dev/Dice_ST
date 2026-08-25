/**
 * DICE service catalogue — the certifications, testing and inspection services
 * Sanyog offers, grouped for the Services directory (Home preview + full page).
 * Presentation data only; the certification workflow itself is driven by the
 * backend. Names match the business exactly.
 */
export interface ServiceGroup {
  key: string;
  title: string;
  icon: string;
  items: string[];
}

export const SERVICE_GROUPS: ServiceGroup[] = [
  {
    key: 'international',
    title: 'International Certifications',
    icon: 'globe-outline',
    items: [
      'SASO Certification', 'SABER Certification', 'PCoC / SCoC', 'SFDA',
      'G-Mark Certification (GCC)', 'CE Marking', 'REACH', 'IECEE',
      'Energy Efficiency Rating (EER)', 'Water Efficiency Labelling (GCC)',
      'ECAS / MOIAT Certification', 'Egypt PVoC', 'Iraq PVoC', 'Tanzania PVoC',
      'Uganda PVoC', 'Nigeria SONCAP', 'Ivory Coast (CoC)', 'Ethiopia CoC',
      'Zimbabwe CoC', 'TIR Kuwait Certification', 'USFDA / FDA Registration',
      'USDA', 'Rodtap / Traceability', 'Company Registration (Overseas)',
      'Q Mark Certification',
    ],
  },
  {
    key: 'domestic',
    title: 'Domestic Certifications',
    icon: 'shield-checkmark-outline',
    items: [
      'BIS Certifications', 'ISI Certification', 'CRS Certification',
      'FMCS Certification', 'Scheme X Certification', 'ISO Certification',
      'WPC Certification', 'LMPC', 'PESO Certification', 'TEC Certification',
      'EPR Registration', 'FSSAI Registration', 'CDSCO', 'EIA / EHC',
      'GMP Certification', 'Company Registration', 'GST Registration',
      'MSME Registration', 'Startup India', 'Hallmark Certification',
      'Make in India', 'Trademark Registration', 'Sedex (SMETA)',
    ],
  },
  {
    key: 'testing',
    title: 'Testing',
    icon: 'flask-outline',
    items: [
      'Textile Testing', 'Paper & Cardboard', 'Packaging, Tapes & Glues',
      'Paints & Varnishes', 'Leather & Footwear', 'Building Materials',
      'Automobiles & Machineries', 'Electrical & Electronics', 'RoHS Testing',
      'RoHS India', 'Food & Cosmetics',
    ],
  },
  {
    key: 'inspection',
    title: 'Inspection',
    icon: 'search-outline',
    items: [
      'Pre-Shipment Inspection', 'Used Vehicle Inspection',
      'Food & Cosmetics Inspection', 'Container Inspection',
      'Health Certificate (Export)',
    ],
  },
];
