import 'dotenv/config';
import ProductCategory from '../models/ProductCategory';
import MarketCertification from '../models/MarketCertification';
import MarketRequirement from '../models/MarketRequirement';
import UserProduct from '../models/UserProduct';

import { connectMongo, disconnectMongo } from './mongo';

/**
 * Curated compliance mappings — NOT random, NOT mock.
 *
 * Every mapping below reflects real Indian electronics certification rules.
 * Certifications link to their Workflow via `workflow_cert_type` (the Workflow
 * owns documents / business info / stages / fees / references). Markets or
 * products with no verified mapping simply have no row here — the resolver then
 * returns an honest "not catalogued" result instead of guessing.
 */

// Real product categories (electronics). Keywords support resolver fallback.
const CATEGORIES: Array<{ name: string; keywords: string[] }> = [
  { name: 'Power Bank', keywords: ['power bank', 'powerbank', 'portable charger', 'battery pack'] },
  { name: 'Bluetooth Speaker', keywords: ['bluetooth speaker', 'wireless speaker', 'speaker'] },
  { name: 'Action Camera', keywords: ['action camera', 'sports camera', 'gopro'] },
  { name: 'Smart Watch', keywords: ['smart watch', 'smartwatch', 'wearable'] },
  { name: 'Wireless Earbuds', keywords: ['wireless earbuds', 'earbuds', 'tws', 'earphones'] },
  { name: 'Headphones', keywords: ['headphones', 'headset'] },
  { name: 'Smart Speaker', keywords: ['smart speaker', 'voice assistant'] },
  { name: 'Mobile Phone', keywords: ['mobile phone', 'smartphone', 'cell phone'] },
  { name: 'Laptop', keywords: ['laptop', 'notebook'] },
  { name: 'Tablet', keywords: ['tablet', 'ipad'] },
  { name: 'LED Bulb', keywords: ['led bulb', 'led light', 'led lamp'] },
  { name: 'Adapter', keywords: ['adapter', 'charger', 'power adapter'] },
];

// Real certifications. `workflow_cert_type` links to the seeded Workflow that
// owns the documents/business-info/references. Non-India certs are real
// definitions kept for future markets; they have no Workflow yet (honest empty
// documents until authored).
const CERTIFICATIONS: Array<{
  name: string;
  code: string;
  country: string;
  authority: string;
  time: string;
  cost: string;
  renewal: string;
  workflow_cert_type?: string;
}> = [
  {
    name: 'BIS CRS', code: 'BIS_CRS', country: 'India',
    authority: 'Bureau of Indian Standards (BIS)',
    time: '25–45 days', cost: '₹25,000 – ₹60,000', renewal: 'Valid 2 years, renewable',
    workflow_cert_type: 'BIS_CRS',
  },
  {
    name: 'WPC ETA', code: 'WPC_ETA', country: 'India',
    authority: 'Wireless Planning & Coordination Wing, DoT',
    time: '7–15 days', cost: '₹5,000 – ₹15,000', renewal: 'Valid for the equipment (no periodic renewal)',
    workflow_cert_type: 'WPC_ETA',
  },
  {
    name: 'TEC MTCTE', code: 'TEC_MTCTE', country: 'India',
    authority: 'Telecommunication Engineering Centre (TEC), DoT',
    time: '30–60 days', cost: 'Varies by product category', renewal: 'As per certificate validity',
    workflow_cert_type: 'TEC_ETA',
  },
  {
    name: 'EPR (E-Waste)', code: 'EPR_EWASTE', country: 'India',
    authority: 'Central Pollution Control Board (CPCB)',
    time: '30–45 days', cost: 'Varies by scale', renewal: 'Valid 5 years',
    workflow_cert_type: 'EPR',
  },
  { name: 'SASO SABER', code: 'SASO_SABER', country: 'Saudi Arabia', authority: 'SASO', time: '10–15 days', cost: 'Varies', renewal: 'Per shipment / annual' },
  { name: 'ECAS', code: 'ECAS_MOIAT', country: 'UAE', authority: 'MoIAT', time: '15–20 days', cost: 'Varies', renewal: '1 year' },
  { name: 'CE Marking', code: 'CE_MARK', country: 'Europe', authority: 'EU Notified Body', time: '30–60 days', cost: 'Varies', renewal: 'Self-declared / ongoing' },
  { name: 'FCC', code: 'FCC_ID', country: 'USA', authority: 'FCC', time: '20–30 days', cost: 'Varies', renewal: 'One-time per device' },
  { name: 'RoHS', code: 'ROHS_COMP', country: 'Europe', authority: 'EU (self-declaration)', time: '15–20 days', cost: 'Varies', renewal: 'Ongoing' },
];

// Real India requirements: product category → required certification codes.
const INDIA_REQUIREMENTS: Record<string, string[]> = {
  'Power Bank': ['BIS_CRS'],
  'Bluetooth Speaker': ['BIS_CRS', 'WPC_ETA'],
  'Action Camera': ['BIS_CRS', 'WPC_ETA'],
  'Smart Watch': ['BIS_CRS', 'WPC_ETA'],
  'Wireless Earbuds': ['BIS_CRS', 'WPC_ETA'],
  'Smart Speaker': ['BIS_CRS', 'WPC_ETA'],
  'Mobile Phone': ['BIS_CRS', 'WPC_ETA', 'TEC_MTCTE'],
  'Laptop': ['BIS_CRS', 'WPC_ETA'],
  'Tablet': ['BIS_CRS', 'WPC_ETA'],
  'Headphones': ['BIS_CRS'],
  'LED Bulb': ['BIS_CRS'],
  'Adapter': ['BIS_CRS'],
};

/**
 * Idempotent-by-replacement seed of the Market Access collections. Assumes an
 * active Mongo connection (does not connect/disconnect) so it can be reused by
 * the CLI wrapper and by tests.
 */
export async function seedMarketAccessData(): Promise<void> {
  await ProductCategory.deleteMany({});
  await MarketCertification.deleteMany({});
  await MarketRequirement.deleteMany({});
  await UserProduct.deleteMany({});

  const categoryByName = new Map<string, any>();
  for (const c of CATEGORIES) {
    const doc = await ProductCategory.create({
      categoryName: c.name,
      keywords: c.keywords,
      industry: 'Electronics',
      description: `${c.name} — consumer electronics product category.`,
    });
    categoryByName.set(c.name, doc);
  }

  const certByCode = new Map<string, any>();
  for (const c of CERTIFICATIONS) {
    const doc = await MarketCertification.create({
      certificationName: c.name,
      code: c.code,
      country: c.country,
      authority: c.authority,
      estimatedTimeline: c.time,
      estimatedCost: c.cost,
      renewalCycle: c.renewal,
      workflow_cert_type: c.workflow_cert_type,
    });
    certByCode.set(c.code, doc);
  }

  let rules = 0;
  for (const [categoryName, certCodes] of Object.entries(INDIA_REQUIREMENTS)) {
    const category = categoryByName.get(categoryName);
    if (!category) continue;
    const requiredCertifications = certCodes
      .map((code) => certByCode.get(code)?._id)
      .filter(Boolean);
    if (requiredCertifications.length === 0) continue;

    await MarketRequirement.findOneAndUpdate(
      { country: 'India', productCategoryId: category._id },
      {
        country: 'India',
        productCategoryId: category._id,
        requiredCertifications,
        optionalCertifications: [],
        marketReadinessRules: 'Mandatory certifications required before sale in India.',
      },
      { upsert: true },
    );
    rules++;
  }

  console.log(
    `[seed:market-access] ${categoryByName.size} categories, ${certByCode.size} certifications, ${rules} India requirement rules`,
  );
}

// CLI entry point — connects, seeds, disconnects.
async function main() {
  await connectMongo();
  await seedMarketAccessData();
  console.log('Seed Complete!');
  await disconnectMongo();
  process.exit(0);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
