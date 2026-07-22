/**
 * Editorial content for certification overview pages.
 *
 * Static, reviewed marketing/explanatory copy — not AI-generated and not a
 * placeholder. Sourced from SASA/SABER programme rules; the Apply action
 * creates a Lead rather than an Application, because none of the documentary
 * evidence an Application needs has been supplied at this point.
 */
export interface OverviewFaq {
  q: string;
  a: string;
}

export interface OverviewTimelineStep {
  label: string;
  detail: string;
  duration: string;
}

export interface CertificationOverview {
  id: string;
  name: string;
  tagline: string;
  authority: string;
  market: string;
  heroGradient: [string, string];
  whatItIs: string[];
  benefits: Array<{ icon: string; title: string; detail: string }>;
  timeline: OverviewTimelineStep[];
  requiredDocuments: string[];
  faqs: OverviewFaq[];
}

export const CERTIFICATION_OVERVIEWS: Record<string, CertificationOverview> = {
  pcoc_scoc: {
    id: 'pcoc_scoc',
    name: 'Saudi PCoC & SCoC',
    tagline: 'Product and Shipment Certificates of Conformity for the Saudi market',
    authority: 'SASO — Saudi Standards, Metrology and Quality Organization',
    market: 'Saudi Arabia',
    heroGradient: ['#1A0033', '#8E24AA'],
    whatItIs: [
      'Saudi Arabia requires every regulated product entering the country to be registered on the SABER platform and to hold a valid Certificate of Conformity.',
      'A PCoC (Product Certificate of Conformity) is issued once per product model against the applicable Saudi technical regulation. It is typically valid for one year.',
      'An SCoC (Shipment Certificate of Conformity) is issued per consignment and references the PCoC. Customs will not clear a shipment without it.',
      'In short: the PCoC certifies the product, the SCoC certifies the specific shipment. Both are needed to import.',
    ],
    benefits: [
      { icon: 'flash',            title: 'Faster customs clearance', detail: 'A valid SCoC is checked at the port. Consignments without one are held or returned at the importer\'s cost.' },
      { icon: 'shield-checkmark', title: 'Regulatory compliance',    detail: 'Meets the mandatory SABER registration requirement for regulated products entering Saudi Arabia.' },
      { icon: 'repeat',           title: 'Reusable product approval', detail: 'One PCoC covers repeat shipments of the same product for its validity period — only the SCoC is issued per consignment.' },
      { icon: 'business',         title: 'Market access',            detail: 'Required to sell into the Saudi market through recognised importers and distributors.' },
    ],
    timeline: [
      { label: 'Enquiry & scoping',     detail: 'We confirm your product\'s HS code, identify the applicable Saudi technical regulation, and determine whether it is regulated or unregulated.', duration: 'Day 1' },
      { label: 'Document collection',   detail: 'You supply the technical file, test reports and commercial documents listed below.', duration: 'Day 1–3' },
      { label: 'Gap review & testing',  detail: 'If existing test reports do not cover the Saudi requirement, we arrange testing at an accredited laboratory.', duration: 'Varies' },
      { label: 'SABER registration',    detail: 'Your product is registered on the SABER platform and the PCoC application is submitted to a SASO-approved Conformity Assessment Body.', duration: 'Day 3–5' },
      { label: 'PCoC issued',           detail: 'The Product Certificate of Conformity is issued, valid for one year.', duration: '1–2 days after submission' },
      { label: 'SCoC per shipment',     detail: 'For each consignment, the Shipment Certificate is issued against the PCoC and the commercial invoice.', duration: '1–2 days' },
    ],
    requiredDocuments: [
      'Commercial invoice and packing list',
      'Product technical file (specifications, datasheet, user manual)',
      'Test reports from an ISO/IEC 17025 accredited laboratory',
      'Product photographs, including all labels and markings',
      'Bill of lading or airway bill (for the SCoC)',
      'Importer\'s Saudi commercial registration number',
      'Manufacturer declaration of conformity',
      'HS code for the product',
    ],
    faqs: [
      { q: 'Do I need both a PCoC and an SCoC?', a: 'Yes, for regulated products. The PCoC certifies the product model and is valid for a year; the SCoC certifies each individual shipment and must be issued before customs clearance.' },
      { q: 'How long is a PCoC valid?', a: 'Normally one year from issue. Renewal requires the technical file to still be current and the product unchanged.' },
      { q: 'What happens if my shipment arrives without an SCoC?', a: 'Saudi customs will hold the consignment. Depending on the case it may be re-exported or destroyed, and demurrage is charged to the importer.' },
      { q: 'Is my product regulated?', a: 'It depends on the HS code and the applicable Saudi technical regulation. Submitting an enquiry is the fastest way to get a definitive answer — we check it against the current SASO regulation list.' },
      { q: 'Can you use my existing CE or BIS test reports?', a: 'Sometimes. Where the tested standard is equivalent to the Saudi requirement the reports can often be reused; otherwise additional testing is needed. We confirm this during the gap review.' },
      { q: 'Who issues the certificates?', a: 'A Conformity Assessment Body approved by SASO. We manage the submission and liaise with the CAB on your behalf.' },
    ],
  },
};

export function getCertificationOverview(id: string): CertificationOverview | undefined {
  return CERTIFICATION_OVERVIEWS[id];
}
