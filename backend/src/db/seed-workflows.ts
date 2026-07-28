/**
 * Seed workflow definitions for India's 5 most common compliance schemes.
 *
 * Run once after Atlas is provisioned:
 *   DATABASE_URL=<atlas-uri> npx ts-node src/db/seed-workflows.ts
 *
 * Or via npm script:
 *   npm run db:seed:workflows
 *
 * Idempotent — re-running updates existing definitions in place.
 */
import { connectMongo, disconnectMongo } from './mongo';
import { Workflow } from '../models';

const WORKFLOWS: any[] = [
  // ═══════════════════════════════════════════════════════════════
  // 1. BIS CRS (Compulsory Registration Scheme)
  // ═══════════════════════════════════════════════════════════════
  {
    _id: 'wf_bis_crs_v1',
    cert_type: 'BIS_CRS',
    display_name: 'BIS Compulsory Registration (CRS)',
    description: 'Mandatory registration for electronics & IT goods sold in India under MeitY notification.',
    version: 1,
    active: true,
    issuing_body: 'Bureau of Indian Standards',
    country_code: 'IN',
    estimated_duration_days: 45,
    validity_period_months: 24,
    stages: [
      {
        id: 'submitted', label: 'Application Submitted', sla_days: 1, next_states: ['docs_review', 'cancelled'],
        required_docs: [
          { doc_type: 'application_form', label: 'Application Form (Form V)', mandatory: true },
          { doc_type: 'authorized_signatory_letter', label: 'Authorized Signatory Letter', mandatory: true },
          { doc_type: 'factory_license', label: 'Factory License', mandatory: true },
          { doc_type: 'trademark_certificate', label: 'Trademark Certificate', mandatory: false },
        ],
      },
      {
        id: 'docs_review', label: 'Document Verification', sla_days: 5,
        next_states: ['tech_review', 'docs_required', 'rejected'],
        required_docs: [],
        assignee_role: 'consultant',
      },
      {
        id: 'tech_review', label: 'Technical Review', sla_days: 10,
        next_states: ['testing', 'docs_required', 'rejected'],
        required_docs: [
          { doc_type: 'cdt_report', label: 'Critical Design Test Report', mandatory: true },
        ],
      },
      {
        id: 'testing', label: 'Lab Testing', sla_days: 21,
        next_states: ['approval_pending', 'docs_required', 'rejected'],
        required_docs: [
          { doc_type: 'lab_test_report', label: 'BIS-recognised Lab Test Report', mandatory: true },
        ],
      },
      {
        id: 'approval_pending', label: 'BIS Approval', sla_days: 7,
        next_states: ['approved', 'rejected', 'on_hold'],
        required_docs: [],
        assignee_role: 'admin',
      },
      {
        id: 'approved', label: 'Approved — Awaiting Cert', sla_days: 1, next_states: ['cert_issued'],
        required_docs: [],
        auto_advance: true,
      },
      {
        id: 'cert_issued', label: 'Certificate Issued', sla_days: 0, next_states: [], required_docs: [],
      },
    ],
    fee_structure: {
      application_fee_inr: 53000,
      annual_fee_inr: 25000,
      expedited_surcharge_inr: 20000,
      test_fee_inr: 75000,
    },
    customer_description: 'Required for laptops, mobiles, LED lights, power adapters, and 60+ other electronic categories.',
    required_business_info: ['gst_number', 'factory_address', 'trademark_certificate'],
    helpful_links: [
      { label: 'BIS CRS Notification', url: 'https://crsbis.in/BIS' },
      { label: 'Standard list', url: 'https://www.crsbis.in/BIS/standards' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 1b. WPC ETA (Equipment Type Approval for wireless devices)
  // ═══════════════════════════════════════════════════════════════
  {
    _id: 'wf_wpc_eta_v1',
    cert_type: 'WPC_ETA',
    display_name: 'WPC Equipment Type Approval (ETA)',
    description: 'Self-declaration approval for wireless equipment operating in de-licensed frequency bands (Bluetooth, Wi-Fi) sold in India.',
    version: 1,
    active: true,
    issuing_body: 'Wireless Planning & Coordination Wing, DoT',
    country_code: 'IN',
    estimated_duration_days: 12,
    validity_period_months: 0, // ETA is valid for the equipment; no periodic renewal.
    stages: [
      {
        id: 'submitted', label: 'Application Submitted', sla_days: 1, next_states: ['docs_review', 'cancelled'],
        required_docs: [
          { doc_type: 'rf_test_report', label: 'RF Test Report (accredited lab)', mandatory: true },
          { doc_type: 'technical_specification', label: 'Technical Specification / Datasheet', mandatory: true },
          { doc_type: 'product_brochure', label: 'Product Brochure / User Manual', mandatory: true },
          { doc_type: 'self_declaration', label: 'Self-Declaration of Conformity', mandatory: true },
          { doc_type: 'authorization_letter', label: 'Authorization Letter (if applicant is not the OEM)', mandatory: false },
        ],
      },
      {
        id: 'docs_review', label: 'Document Verification', sla_days: 3,
        next_states: ['approval_pending', 'docs_required', 'rejected'],
        required_docs: [],
        assignee_role: 'consultant',
      },
      {
        id: 'approval_pending', label: 'WPC Portal Grant', sla_days: 7,
        next_states: ['approved', 'rejected', 'on_hold'],
        required_docs: [],
        assignee_role: 'admin',
      },
      {
        id: 'approved', label: 'Approved — Awaiting ETA', sla_days: 1, next_states: ['cert_issued'],
        required_docs: [], auto_advance: true,
      },
      {
        id: 'cert_issued', label: 'ETA Certificate Issued', sla_days: 0, next_states: [], required_docs: [],
      },
    ],
    fee_structure: {
      application_fee_inr: 0, // No government fee for de-licensed band ETA.
    },
    customer_description: 'Required for any product with Bluetooth or Wi-Fi sold in India — speakers, earbuds, smart watches, action cameras.',
    required_business_info: ['company_name', 'gst_number', 'iec_code'],
    helpful_links: [
      { label: 'Saral Sanchar Portal', url: 'https://saralsanchar.gov.in/' },
      { label: 'WPC ETA Guidelines', url: 'https://dot.gov.in/spectrum-management/2457' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 2. EPR (Extended Producer Responsibility)
  // ═══════════════════════════════════════════════════════════════
  {
    _id: 'wf_epr_v1',
    cert_type: 'EPR',
    display_name: 'EPR Registration (CPCB)',
    description: 'Extended Producer Responsibility — mandatory for e-waste, plastic packaging, battery, and tyre producers.',
    version: 1,
    active: true,
    issuing_body: 'Central Pollution Control Board',
    country_code: 'IN',
    estimated_duration_days: 30,
    validity_period_months: 60,
    stages: [
      {
        id: 'submitted', label: 'Submitted to CPCB Portal', sla_days: 1, next_states: ['docs_review', 'cancelled'],
        required_docs: [
          { doc_type: 'cpcb_application', label: 'CPCB Online Application', mandatory: true },
          { doc_type: 'authorization_letter', label: 'Authorization Letter', mandatory: true },
          { doc_type: 'gst_certificate', label: 'GST Certificate', mandatory: true },
          { doc_type: 'cin_certificate', label: 'Certificate of Incorporation', mandatory: true },
        ],
      },
      { id: 'docs_review', label: 'Documents under CPCB Review', sla_days: 7, next_states: ['tech_review', 'docs_required', 'rejected'], required_docs: [] },
      {
        id: 'tech_review', label: 'EPR Plan Review', sla_days: 10, next_states: ['approval_pending', 'docs_required'],
        required_docs: [
          { doc_type: 'epr_plan', label: 'EPR Action Plan with collection targets', mandatory: true },
          { doc_type: 'pro_agreement', label: 'PRO Agreement (if outsourced)', mandatory: false },
        ],
      },
      { id: 'approval_pending', label: 'CPCB Approval', sla_days: 7, next_states: ['approved', 'rejected', 'on_hold'], required_docs: [] },
      { id: 'approved', label: 'Approved', sla_days: 1, next_states: ['cert_issued'], required_docs: [], auto_advance: true },
      { id: 'cert_issued', label: 'EPR Registration Number Issued', sla_days: 0, next_states: [], required_docs: [] },
    ],
    fee_structure: { application_fee_inr: 25000, annual_fee_inr: 25000 },
    customer_description: 'Required for any producer/importer dealing in e-waste, plastic packaging, batteries, or used tyres.',
    required_business_info: ['gst_number', 'cin', 'iec_code'],
    helpful_links: [
      { label: 'CPCB EPR Portal', url: 'https://eprplastic.cpcb.gov.in/' },
      { label: 'EPR Guidelines', url: 'https://cpcb.nic.in/uploads/plasticwaste/EPR_Guidelines.pdf' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 3. TEC ETA (Equipment Type Approval)
  // ═══════════════════════════════════════════════════════════════
  {
    _id: 'wf_tec_eta_v1',
    cert_type: 'TEC_ETA',
    display_name: 'TEC ETA (Equipment Type Approval)',
    description: 'Mandatory for telecom equipment sold or imported into India under Telecom Equipment Conformance regime.',
    version: 1,
    active: true,
    issuing_body: 'Telecommunication Engineering Centre',
    country_code: 'IN',
    estimated_duration_days: 60,
    validity_period_months: 60,
    stages: [
      {
        id: 'submitted', label: 'Application on TEC Portal', sla_days: 1, next_states: ['docs_review', 'cancelled'],
        required_docs: [
          { doc_type: 'tec_application', label: 'TEC Application Form', mandatory: true },
          { doc_type: 'product_specs', label: 'Product Specifications', mandatory: true },
          { doc_type: 'user_manual', label: 'User Manual', mandatory: true },
        ],
      },
      { id: 'docs_review', label: 'TEC Documents Review', sla_days: 10, next_states: ['tech_review', 'docs_required', 'rejected'], required_docs: [] },
      {
        id: 'tech_review', label: 'Technical Evaluation', sla_days: 15, next_states: ['testing', 'docs_required'],
        required_docs: [
          { doc_type: 'block_diagram', label: 'Block Diagram', mandatory: true },
          { doc_type: 'circuit_diagram', label: 'Circuit Diagram', mandatory: true },
        ],
      },
      {
        id: 'testing', label: 'CAB Lab Testing', sla_days: 25, next_states: ['approval_pending', 'docs_required'],
        required_docs: [
          { doc_type: 'cab_test_report', label: 'TEC-recognised CAB Lab Test Report', mandatory: true },
        ],
      },
      { id: 'approval_pending', label: 'TEC Approval', sla_days: 7, next_states: ['approved', 'rejected'], required_docs: [] },
      { id: 'approved', label: 'Approved', sla_days: 1, next_states: ['cert_issued'], required_docs: [], auto_advance: true },
      { id: 'cert_issued', label: 'ETA Certificate Issued', sla_days: 0, next_states: [], required_docs: [] },
    ],
    fee_structure: { application_fee_inr: 50000, test_fee_inr: 200000 },
    customer_description: 'Required for routers, modems, mobile phones, IoT devices, walkie-talkies — any device using public spectrum or telecom interfaces.',
    required_business_info: ['gst_number', 'iec_code'],
    helpful_links: [
      { label: 'TEC Portal', url: 'https://www.tec.gov.in/' },
      { label: 'MTCTE Process', url: 'https://www.mtcte.tec.gov.in/' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 4. LMPC (Legal Metrology Packaged Commodities)
  // ═══════════════════════════════════════════════════════════════
  {
    _id: 'wf_lmpc_v1',
    cert_type: 'LMPC',
    display_name: 'LMPC Registration (Legal Metrology)',
    description: 'Required for importers of pre-packaged commodities — declares quantity, MRP, manufacturer details on retail packaging.',
    version: 1,
    active: true,
    issuing_body: 'Department of Consumer Affairs (Legal Metrology Dept.)',
    country_code: 'IN',
    estimated_duration_days: 20,
    validity_period_months: 60,
    stages: [
      {
        id: 'submitted', label: 'Application to Legal Metrology', sla_days: 1, next_states: ['docs_review', 'cancelled'],
        required_docs: [
          { doc_type: 'lmpc_form', label: 'LMPC Application Form (Form V)', mandatory: true },
          { doc_type: 'iec_code', label: 'IEC Code Certificate', mandatory: true },
          { doc_type: 'address_proof', label: 'Importer Address Proof', mandatory: true },
          { doc_type: 'pan_card', label: 'PAN Card', mandatory: true },
        ],
      },
      { id: 'docs_review', label: 'Documents Verified', sla_days: 5, next_states: ['tech_review', 'docs_required', 'rejected'], required_docs: [] },
      {
        id: 'tech_review', label: 'Packaging Review', sla_days: 5, next_states: ['approval_pending', 'docs_required'],
        required_docs: [
          { doc_type: 'package_label', label: 'Sample Package Label (MRP, qty, mfg)', mandatory: true },
        ],
      },
      { id: 'approval_pending', label: 'Awaiting Inspector Visit', sla_days: 7, next_states: ['approved', 'rejected', 'on_hold'], required_docs: [] },
      { id: 'approved', label: 'Approved', sla_days: 1, next_states: ['cert_issued'], required_docs: [], auto_advance: true },
      { id: 'cert_issued', label: 'LMPC Number Issued', sla_days: 0, next_states: [], required_docs: [] },
    ],
    fee_structure: { application_fee_inr: 15000, annual_fee_inr: 10000 },
    customer_description: 'Mandatory for importers of pre-packed goods — applies separately per state in some cases.',
    required_business_info: ['iec_code', 'pan_number', 'gst_number'],
    helpful_links: [
      { label: 'Legal Metrology Portal', url: 'https://consumeraffairs.nic.in/' },
    ],
  },

  // ═══════════════════════════════════════════════════════════════
  // 5. FSSAI (Food Safety License)
  // ═══════════════════════════════════════════════════════════════
  {
    _id: 'wf_fssai_v1',
    cert_type: 'FSSAI',
    display_name: 'FSSAI License (Food Business)',
    description: 'Mandatory for any food-related business in India — Basic / State / Central tiers based on annual turnover.',
    version: 1,
    active: true,
    issuing_body: 'Food Safety and Standards Authority of India',
    country_code: 'IN',
    estimated_duration_days: 30,
    validity_period_months: 12,                  // can be 1–5 years; default 1
    stages: [
      {
        id: 'submitted', label: 'FoSCoS Application', sla_days: 1, next_states: ['docs_review', 'cancelled'],
        required_docs: [
          { doc_type: 'fssai_form_b', label: 'Form B Application', mandatory: true },
          { doc_type: 'gst_certificate', label: 'GST Certificate', mandatory: true },
          { doc_type: 'pan_card', label: 'PAN Card', mandatory: true },
          { doc_type: 'address_proof', label: 'Address Proof (premises)', mandatory: true },
          { doc_type: 'water_test_report', label: 'Water Test Report (recent)', mandatory: true },
        ],
      },
      { id: 'docs_review', label: 'FSSAI Document Review', sla_days: 7, next_states: ['tech_review', 'docs_required', 'rejected'], required_docs: [] },
      {
        id: 'tech_review', label: 'FBO Compliance Check', sla_days: 5, next_states: ['testing', 'docs_required'],
        required_docs: [
          { doc_type: 'food_safety_plan', label: 'Food Safety Management Plan', mandatory: true },
        ],
      },
      {
        id: 'testing', label: 'On-site Inspection', sla_days: 14, next_states: ['approval_pending', 'docs_required', 'rejected'],
        required_docs: [
          { doc_type: 'inspection_report', label: 'FBO Inspector Report', mandatory: true },
        ],
      },
      { id: 'approval_pending', label: 'FSSAI Approval', sla_days: 3, next_states: ['approved', 'rejected'], required_docs: [] },
      { id: 'approved', label: 'Approved', sla_days: 1, next_states: ['cert_issued'], required_docs: [], auto_advance: true },
      { id: 'cert_issued', label: '14-digit FSSAI Number Issued', sla_days: 0, next_states: [], required_docs: [] },
    ],
    fee_structure: { application_fee_inr: 7500, annual_fee_inr: 7500 },
    customer_description: 'Required for restaurants, food manufacturers, food importers, packaged food sellers, dairy units.',
    required_business_info: ['gst_number', 'pan_number'],
    helpful_links: [
      { label: 'FoSCoS Portal', url: 'https://foscos.fssai.gov.in/' },
      { label: 'License Tier Calculator', url: 'https://fssai.gov.in/cms/licensing-faq.php' },
    ],
  },
];

/**
 * Idempotent upsert of all workflow definitions. Assumes an active Mongo
 * connection so it can be reused by the CLI wrapper and by tests.
 */
export async function seedWorkflows(): Promise<void> {
  let inserted = 0, updated = 0;
  for (const wf of WORKFLOWS) {
    const existing = await Workflow.findById(wf._id);
    if (existing) {
      await Workflow.replaceOne({ _id: wf._id }, wf);
      updated++;
    } else {
      await Workflow.create(wf);
      inserted++;
    }
  }
  console.log(`[seed:workflows] ${inserted} inserted, ${updated} updated`);
}

async function main() {
  console.log('🌱 Seeding workflows...');
  await connectMongo();
  await seedWorkflows();
  await disconnectMongo();
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
}
