export type ComplianceDomain = 'tech' | 'food' | 'cosmetics' | 'toys' | 'apparel' | 'medical' | 'automotive' | 'footwear';

export interface Insight {
  type: 'positive' | 'warning' | 'negative' | 'info';
  icon: string;
  color: string;
  title: string;
  desc: string;
}

export interface Score {
  label: string;
  value: number;
  color: string;
}

export interface DomainResult {
  productName: string;
  scores: Score[];
  insights: Insight[];
  certifications: string[];
  usageNotes: string;
  icon: string;
}

export const ComplianceDB: Record<ComplianceDomain, DomainResult> = {
  tech: {
    productName: 'Wireless Audio Device (Tech)',
    scores: [
      { label: 'Quality Build', value: 94, color: '#007BFF' },
      { label: 'Electrical Safety', value: 89, color: '#00C896' },
      { label: 'Compliance Readiness', value: 72, color: '#FFB347' },
    ],
    insights: [
      { type: 'positive', icon: 'checkmark-circle', color: '#00C896', title: 'RoHS Compliance Detected', desc: 'Material spectral analysis indicates absence of hazardous heavy metals (Lead, Cadmium, Mercury).' },
      { type: 'warning', icon: 'radio', color: '#FFB347', title: 'WPC ETA Approval Required', desc: 'Bluetooth 5.2 and 2.4GHz Wi-Fi modules detected. Equipment Type Approval (ETA) from WPC is mandatory for de-licensed bands.' },
      { type: 'negative', icon: 'battery-dead', color: '#FF6B6B', title: 'BIS Registration (IS 16046)', desc: 'The internal Lithium-ion secondary cell is missing the BIS IS 16046 safety certification mark. Cannot be imported.' },
      { type: 'info', icon: 'sync', color: '#6C63FF', title: 'EPR E-Waste Liability', desc: 'As a consumer electronic (CEEW), you must file for Extended Producer Responsibility (EPR) authorization via CPCB.' },
      { type: 'positive', icon: 'shield-checkmark', color: '#007BFF', title: 'IS 13252 (Part 1) Scope', desc: 'Main product housing matches IT/Audio Video equipment criteria for Compulsory Registration Order (CRO).' },
      { type: 'warning', icon: 'alert-circle', color: '#FFB347', title: 'Missing Package Declarations', desc: 'Legal Metrology (LMPC) rules mandate MRP, Month/Year of Import, and Customer Care details. Currently missing.' }
    ],
    certifications: ['BIS CRS (IS 13252)', 'BIS Battery (IS 16046)', 'WPC ETA', 'EPR (E-Waste)', 'LMPC Registration'],
    usageNotes: 'Dice AI recommends parallel processing: Register the battery under BIS first, as the final product BIS CRS requires the battery certificate. Apply for WPC simultaneously.',
    icon: 'hardware-chip'
  },
  food: {
    productName: 'Packaged Nutritional Item',
    scores: [
      { label: 'Dietary Health', value: 76, color: '#007BFF' },
      { label: 'FSSAI Safety', value: 98, color: '#00C896' },
      { label: 'Label Compliance', value: 65, color: '#FF6B6B' },
    ],
    insights: [
      { type: 'positive', icon: 'leaf', color: '#00C896', title: 'Ingredient Toxicology', desc: 'No banned additives (e.g., Brominated Vegetable Oil, artificial trans-fats) detected. Preservatives are within FSSAI safe limits.' },
      { type: 'warning', icon: 'fitness', color: '#FFB347', title: 'High Sucrose Content', desc: 'Contains 22g added sugars per 100g. If sold in certain international markets (like UK/Chile), mandatory front-of-pack "High Sugar" warning is required.' },
      { type: 'negative', icon: 'close-circle', color: '#FF6B6B', title: 'Missing Veg/Non-Veg Logo', desc: 'FSSAI mandates a Green (Veg) or Brown (Non-Veg/Vegan-exempt) dot enclosed in a square. Absent from principal display panel.' },
      { type: 'negative', icon: 'warning', color: '#FF6B6B', title: 'Allergen Declaration Violation', desc: 'Ingredients list contains "Whey" and "Almond Extract", but lacks the mandatory bolded "CONTAINS: MILK, TREE NUTS" warning.' },
      { type: 'info', icon: 'barcode', color: '#6C63FF', title: 'Nutritional Panel Formatting', desc: 'Nutritional facts must declare Energy (kcal), Protein (g), Carbohydrates (g), Total Sugars (g), and Sodium (mg) as per latest FSSAI draft.' },
      { type: 'positive', icon: 'shield-checkmark', color: '#007BFF', title: 'Shelf Life Declaration', desc: '"Best Before 12 Months" matches stability testing norms for this category.' }
    ],
    certifications: ['FSSAI Central License', 'NABL Lab Report (Nutrition)', 'Agmark (Optional)', 'Vegan Certification (Optional)'],
    usageNotes: 'Dice AI highly advises a complete packaging redesign to include the Veg Logo and correct Allergen warnings before submitting the label to FSSAI for approval. Failure to do so will result in rejection.',
    icon: 'nutrition'
  },
  cosmetics: {
    productName: 'Skincare/Cosmetic Formulation',
    scores: [
      { label: 'Skin Safety', value: 85, color: '#00C896' },
      { label: 'Chemical Purity', value: 90, color: '#007BFF' },
      { label: 'CDSCO Readiness', value: 55, color: '#FF6B6B' },
    ],
    insights: [
      { type: 'positive', icon: 'water', color: '#00C896', title: 'Heavy Metals Screen', desc: 'Formulation analysis indicates Lead (<20ppm) and Arsenic (<2ppm) are within safe cosmetic limits per BIS IS 4707.' },
      { type: 'warning', icon: 'alert-circle', color: '#FFB347', title: 'Paraben Warning', desc: 'Contains Propylparaben. While legal, it is highly discouraged in the EU market and requires specific warnings under CDSCO rules.' },
      { type: 'negative', icon: 'close-circle', color: '#FF6B6B', title: 'Form 42 Registration', desc: 'Foreign manufactured cosmetics require Form 42 import registration on the SUGAM portal prior to customs arrival. Not detected.' },
      { type: 'info', icon: 'eye', color: '#6C63FF', title: 'Dermatological Testing', desc: 'Product claims "Hypoallergenic". Substantiation reports from an NABL accredited lab must be submitted with the dossier.' },
      { type: 'negative', icon: 'document-text', color: '#FF6B6B', title: 'Missing Batch/Use-By', desc: 'Primary packaging must be printed with "Mfg. Lic. No.", Batch Number, and "Use before" date.' }
    ],
    certifications: ['CDSCO Form 42', 'BIS IS 4707 (Ingredients)', 'NABL Heavy Metal Test', 'EPR (Plastic Packaging)'],
    usageNotes: 'Dice AI suggests immediately initiating Form 42 registration via CDSCO SUGAM. Prepare the Free Sale Certificate (FSC) from the country of origin, as it is a mandatory prerequisite.',
    icon: 'color-palette'
  },
  toys: {
    productName: 'Children’s Toy / Play Item',
    scores: [
      { label: 'Physical Safety', value: 68, color: '#FFB347' },
      { label: 'Toxicity Level', value: 95, color: '#00C896' },
      { label: 'BIS Compliance', value: 40, color: '#FF6B6B' },
    ],
    insights: [
      { type: 'positive', icon: 'shield-checkmark', color: '#00C896', title: 'Phthalate Free', desc: 'PVC components tested negative for hazardous Phthalates (DEHP, DBP, BBP), meeting IS 9873 (Part 9) limits.' },
      { type: 'warning', icon: 'warning', color: '#FFB347', title: 'Choking Hazard Profile', desc: 'Contains detachable parts smaller than 31.7mm. If marketed for children under 3 years, this violates IS 9873 (Part 1).' },
      { type: 'negative', icon: 'close-circle', color: '#FF6B6B', title: 'No BIS ISI Mark', desc: 'Toys cannot be sold or imported in India without a valid BIS ISI Mark under the Toys (Quality Control) Order.' },
      { type: 'negative', icon: 'alert', color: '#FF6B6B', title: 'Missing Statutory Warnings', desc: 'Packaging must strictly display: "WARNING: CHOKING HAZARD - Small parts. Not for children under 3 years" in bold.' },
      { type: 'info', icon: 'flask', color: '#6C63FF', title: 'Flammability Testing', desc: 'Fabric/plush components require IS 9873 (Part 2) flammability testing to ensure burn rates are within limits.' }
    ],
    certifications: ['BIS ISI Mark (IS 9873)', 'NABL Toxicity Report', 'NABL Flammability Report', 'LMPC Registration'],
    usageNotes: 'Dice AI flags a critical block: The BIS Toys QCO is heavily enforced. You must apply for a BIS factory license (Scheme-I) immediately. Alter packaging to include choking hazard warnings.',
    icon: 'extension-puzzle'
  },
  apparel: {
    productName: 'Textile / Apparel Garment',
    scores: [
      { label: 'Fabric Quality', value: 92, color: '#007BFF' },
      { label: 'Chemical Safety', value: 88, color: '#00C896' },
      { label: 'Label Compliance', value: 75, color: '#FFB347' },
    ],
    insights: [
      { type: 'positive', icon: 'checkmark-circle', color: '#00C896', title: 'Azo Dye Compliance', desc: 'Fabric pigments comply with the prohibition of harmful Azo colorants which release carcinogenic amines.' },
      { type: 'warning', icon: 'flame', color: '#FFB347', title: 'Flammability Warning', desc: 'Lightweight synthetic blend detected. Consider conducting 16 CFR 1610 flammability testing if exporting to the US.' },
      { type: 'negative', icon: 'pricetag', color: '#FF6B6B', title: 'Care Label Missing', desc: 'Missing mandatory wash care instructions (ISO 3758 symbols) and fiber composition percentages (e.g., "80% Cotton, 20% Poly").' },
      { type: 'info', icon: 'earth', color: '#6C63FF', title: 'Eco-Textile Benchmarks', desc: 'If claiming "Organic", you must possess GOTS (Global Organic Textile Standard) transaction certificates.' },
      { type: 'positive', icon: 'shield-checkmark', color: '#007BFF', title: 'Skin Sensitization', desc: 'Formaldehyde limits are below 75 ppm, safe for direct skin contact clothing.' }
    ],
    certifications: ['Textile Committee Registration', 'Azo-Free Lab Report', 'GOTS (If Organic)', 'LMPC (Pre-packaged commodity)'],
    usageNotes: 'Dice AI recommends updating the garment inner labels to include exact fiber composition and ISO wash care symbols before mass production to avoid customs detentions.',
    icon: 'shirt'
  },
  medical: {
    productName: 'Class B Medical Device',
    scores: [
      { label: 'Clinical Safety', value: 96, color: '#00C896' },
      { label: 'Material Grade', value: 94, color: '#007BFF' },
      { label: 'CDSCO Compliance', value: 45, color: '#FF6B6B' },
    ],
    insights: [
      { type: 'positive', icon: 'shield-checkmark', color: '#00C896', title: 'Biocompatibility ISO 10993', desc: 'Patient-contact materials pass cytotoxicty, sensitization, and irritation tests required for Class B devices.' },
      { type: 'negative', icon: 'close-circle', color: '#FF6B6B', title: 'Missing MD-15 Import License', desc: 'As a notified medical device, Form MD-15 Import License from CDSCO is absolutely mandatory prior to shipping.' },
      { type: 'warning', icon: 'document-text', color: '#FFB347', title: 'Clinical Evaluation Report', desc: 'A comprehensive CER mapping predicate devices is required in the Sugam portal dossier.' },
      { type: 'info', icon: 'cog', color: '#6C63FF', title: 'ISO 13485 QMS', desc: 'Manufacturing site must hold a valid ISO 13485:2016 certificate. The Notified Body must be verifiable.' },
      { type: 'negative', icon: 'barcode', color: '#FF6B6B', title: 'UDI Labelling Failure', desc: 'Unique Device Identification (UDI) barcode missing from the primary packaging.' }
    ],
    certifications: ['CDSCO MD-15 (Import License)', 'ISO 13485', 'Biocompatibility (ISO 10993)', 'FSC (Free Sale Certificate)'],
    usageNotes: 'Dice AI identifies this as a highly regulated medical product. Do not initiate shipment until MD-15 is secured. Dossier preparation will require 4-6 weeks.',
    icon: 'medkit'
  },
  automotive: {
    productName: 'Automotive Spare Part (Lighting)',
    scores: [
      { label: 'Durability', value: 88, color: '#007BFF' },
      { label: 'Road Safety', value: 92, color: '#00C896' },
      { label: 'ARAI Compliance', value: 60, color: '#FFB347' },
    ],
    insights: [
      { type: 'positive', icon: 'checkmark-circle', color: '#00C896', title: 'Photometric Performance', desc: 'Lumen output and beam pattern comply with AIS-008 standards for automotive headlamps.' },
      { type: 'warning', icon: 'car', color: '#FFB347', title: 'TAC (Type Approval Certificate)', desc: 'Automotive lamps require Type Approval from ARAI/ICAT under CMVR rules before OEM or aftermarket sale.' },
      { type: 'negative', icon: 'close-circle', color: '#FF6B6B', title: 'Missing E-Mark', desc: 'No ECE (E-mark) homologation detected on the lens housing, which restricts European export viability.' },
      { type: 'info', icon: 'thermometer', color: '#6C63FF', title: 'Environmental Testing', desc: 'Vibration and thermal shock lab reports must be submitted along with the TAC application.' },
      { type: 'positive', icon: 'shield-checkmark', color: '#007BFF', title: 'IP Rating Verified', desc: 'Housing meets IP67 standards for dust and water ingress protection.' }
    ],
    certifications: ['ARAI/ICAT Type Approval', 'AIS-008 Lab Report', 'E-Mark (For EU Export)', 'BIS CRS (If electronic ballast)'],
    usageNotes: 'Dice AI advises sending physical samples to ARAI immediately, as automotive homologation testing has significant lead times (8-12 weeks).',
    icon: 'car'
  },
  footwear: {
    productName: 'Leather / Synthetic Footwear',
    scores: [
      { label: 'Material Quality', value: 85, color: '#00C896' },
      { label: 'Slip Resistance', value: 78, color: '#007BFF' },
      { label: 'BIS Compliance', value: 30, color: '#FF6B6B' },
    ],
    insights: [
      { type: 'positive', icon: 'walk', color: '#00C896', title: 'Flexing Endurance', desc: 'Outsole material meets the minimum SATRA flexing benchmarks.' },
      { type: 'negative', icon: 'close-circle', color: '#FF6B6B', title: 'BIS QCO Violation', desc: 'Footwear is under mandatory BIS Quality Control Orders. This specific category requires an ISI Mark under IS 15844 / IS 10702.' },
      { type: 'warning', icon: 'alert-circle', color: '#FFB347', title: 'Chromium VI Levels', desc: 'Leather components must be tested to ensure Chromium VI levels are < 3 mg/kg to avoid skin toxicity.' },
      { type: 'info', icon: 'pricetag', color: '#6C63FF', title: 'Size Marking Rules', desc: 'Shoe sizes must be clearly marked using the standardized Indian/UK sizing metric permanently on the outsole or tongue.' },
      { type: 'negative', icon: 'warning', color: '#FF6B6B', title: 'Missing Material Pictograms', desc: 'Lack of standard pictograms indicating materials for upper, lining, and outsole (mandatory for EU export).' }
    ],
    certifications: ['BIS Factory License (ISI Mark)', 'NABL Leather Toxicity Test', 'FDDI Lab Report'],
    usageNotes: 'Dice AI flags a total halt on import/domestic sale. The BIS Footwear QCO is strictly active. Overseas manufacturers must obtain a BIS license (FMCS) before shipping.',
    icon: 'footsteps'
  }
};
