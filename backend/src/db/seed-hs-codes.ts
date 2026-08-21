/**
 * Seed — curated, VERIFIED HS classification coverage for DICE.
 *
 * SOURCE: World Customs Organization Harmonized System, 2022 edition (HS-2022).
 *         Only internationally-standardized 4-digit headings and 6-digit
 *         subheadings are seeded here — these are harmonized across all WCO
 *         member states, so they can be stated with confidence. Country-specific
 *         8-digit national extensions (ITC-HS, HTS, TARIC, …) are intentionally
 *         NOT fabricated; an 8-digit input rolls up to its verified 6-digit
 *         parent instead.
 *
 * This is explicitly a CURATED SUBSET covering the 12 electronics categories
 * DICE currently has verified certification coverage for — it is
 * "Verified HS coverage currently available in DICE", NOT a complete global HS
 * database. Anything outside it resolves to NOT_IN_VERIFIED_DATASET → expert
 * review, never a fabricated code.
 *
 * INTEGRITY RULE: do not add a row you cannot tie to the source above. Prefer
 * fewer verified rows over a larger guessed dataset.
 */
import HsCode from '../models/HsCode';
import ProductCategory from '../models/ProductCategory';
import { logger } from '../utils/logger';

const SOURCE = 'WCO HS-2022';
const SOURCE_VERSION = '2022';

interface SeedRow {
  code: string;          // normalized digits-only
  description: string;   // official HS-2022 heading / subheading text
  /** ProductCategory name to link (1:1 only). Omit when a code spans categories. */
  category?: string;
  keywords: string[];
}

// 4-digit headings (Section XVI, Chapters 84–85). All harmonized worldwide.
const HEADINGS: SeedRow[] = [
  { code: '8471', description: 'Automatic data processing machines and units thereof', keywords: ['computer', 'data processing machine'] },
  { code: '8504', description: 'Electrical transformers, static converters (for example, rectifiers) and inductors', keywords: ['transformer', 'converter', 'rectifier', 'inductor'] },
  { code: '8507', description: 'Electric accumulators, including separators therefor, whether or not rectangular (including square)', keywords: ['accumulator', 'battery', 'storage battery'] },
  { code: '8517', description: 'Telephone sets, including smartphones and other telephones for cellular networks or for other wireless networks; other apparatus for the transmission or reception of voice, images or other data', keywords: ['telephone', 'communication apparatus'] },
  { code: '8518', description: 'Microphones and stands therefor; loudspeakers; headphones and earphones; audio-frequency electric amplifiers; electric sound amplifier sets', keywords: ['loudspeaker', 'microphone', 'audio'] },
  { code: '8525', description: 'Transmission apparatus for radio-broadcasting or television; television cameras, digital cameras and video camera recorders', keywords: ['camera', 'transmission apparatus'] },
  { code: '8539', description: 'Electrical filament or discharge lamps; light-emitting diode (LED) light sources; arc lamps', keywords: ['lamp', 'light source'] },
];

// 6-digit subheadings — the internationally-fixed classification detail.
const SUBHEADINGS: SeedRow[] = [
  {
    code: '847130',
    description: 'Portable automatic data processing machines, weighing not more than 10 kg, consisting of at least a central processing unit, a keyboard and a display',
    category: 'Laptop',
    keywords: ['laptop', 'notebook', 'tablet', 'ipad', 'portable computer'],
  },
  {
    code: '850440',
    description: 'Static converters',
    category: 'Adapter',
    keywords: ['adapter', 'charger', 'power adapter', 'power supply', 'static converter'],
  },
  {
    code: '850760',
    description: 'Electric accumulators — Lithium-ion',
    category: 'Power Bank',
    keywords: ['power bank', 'powerbank', 'portable charger', 'battery pack', 'lithium-ion battery'],
  },
  {
    code: '851713',
    description: 'Smartphones',
    category: 'Mobile Phone',
    keywords: ['smartphone', 'mobile phone', 'cell phone', 'iphone', 'android phone'],
  },
  {
    code: '851714',
    description: 'Other telephones for cellular networks or for other wireless networks',
    keywords: ['feature phone', 'cellular telephone', 'mobile handset'],
  },
  {
    code: '851762',
    description: 'Machines for the reception, conversion and transmission or regeneration of voice, images or other data, including switching and routing apparatus',
    category: 'Smart Watch',
    keywords: ['smart watch', 'smartwatch', 'wearable', 'router', 'network apparatus'],
  },
  {
    code: '851821',
    description: 'Single loudspeakers, mounted in their enclosures',
    keywords: ['single loudspeaker', 'speaker'],
  },
  {
    code: '851822',
    description: 'Multiple loudspeakers, mounted in the same enclosure',
    category: 'Bluetooth Speaker',
    keywords: ['bluetooth speaker', 'wireless speaker', 'smart speaker', 'voice assistant speaker', 'loudspeaker'],
  },
  {
    code: '851830',
    description: 'Headphones and earphones, whether or not combined with a microphone, and sets consisting of a microphone and one or more loudspeakers',
    category: 'Headphones',
    keywords: ['headphones', 'headset', 'earphones', 'earbuds', 'wireless earbuds', 'tws'],
  },
  {
    code: '852589',
    description: 'Other television cameras, digital cameras and video camera recorders',
    category: 'Action Camera',
    keywords: ['action camera', 'sports camera', 'gopro', 'digital camera', 'video camera'],
  },
  {
    code: '853952',
    description: 'Light-emitting diode (LED) lamps',
    category: 'LED Bulb',
    keywords: ['led bulb', 'led light', 'led lamp', 'led'],
  },
];

const SECTION_XVI = 'XVI'; // Chapters 84 & 85

function toDisplay(code: string): string {
  // 4-digit headings display bare; 6/8-digit group after the 4-digit heading.
  return code.length <= 4 ? code : `${code.slice(0, 4)}.${code.slice(4)}`;
}

/**
 * Seed the verified HS dataset. Idempotent: clears the collection first so a
 * re-seed always reflects the source table above exactly (no partial drift).
 */
export async function seedHsCodes(): Promise<void> {
  await HsCode.deleteMany({});

  // Resolve category names → ids (reuse existing ProductCategory records).
  const categories = await ProductCategory.find({}).lean();
  const categoryByName = new Map<string, any>();
  for (const c of categories as any[]) categoryByName.set(c.categoryName, c._id);

  const now = new Date();
  const rows = [
    ...HEADINGS.map((r) => ({ ...r, level: 4 as const })),
    ...SUBHEADINGS.map((r) => ({ ...r, level: 6 as const })),
  ];

  const docs = rows.map((r) => {
    const categoryId = r.category ? categoryByName.get(r.category) : undefined;
    if (r.category && !categoryId) {
      // Category link requested but the ProductCategory isn't seeded — link is
      // dropped (kept honest) but the code itself is still valid.
      logger.warn(`[seed:hs-codes] category "${r.category}" not found for ${r.code}; leaving unlinked`);
    }
    return {
      code: r.code,
      displayCode: toDisplay(r.code),
      level: r.level,
      description: r.description,
      chapter: r.code.slice(0, 2),
      heading: r.code.slice(0, 4),
      section: SECTION_XVI,
      keywords: r.keywords,
      productCategoryId: categoryId,
      source: SOURCE,
      sourceVersion: SOURCE_VERSION,
      verifiedAt: now,
      active: true,
    };
  });

  await HsCode.insertMany(docs);
  logger.info(
    `[seed:hs-codes] ${docs.length} verified HS codes (${HEADINGS.length} headings, ${SUBHEADINGS.length} subheadings) from ${SOURCE}`,
  );
}

// Allow `ts-node src/db/seed-hs-codes.ts` for a one-off manual seed.
if (require.main === module) {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { connectMongo } = require('./mongo');
  (async () => {
    await connectMongo();
    await seedHsCodes();
    process.exit(0);
  })().catch((e) => {
    logger.error(`[seed:hs-codes] failed: ${String(e)}`);
    process.exit(1);
  });
}
