import { logger } from '../utils/logger'
import { Insight } from '../models'

const SAMPLE_INSIGHTS = [
  {
    title: 'BIS Amends CRS Requirements for LED Luminaires',
    summary: 'Bureau of Indian Standards has updated Compulsory Registration Scheme for LED luminaires under IS 10322. Manufacturers must comply by March 2025.',
    category: 'bis',
    country: 'India',
    source: 'Bureau of Indian Standards',
    link: 'https://www.bis.gov.in',
    tags: ['BIS', 'LED', 'CRS', 'IS 10322'],
  },
  {
    title: 'FSSAI Tightens Import Regulations for Processed Foods',
    summary: 'FSSAI has issued new guidelines requiring enhanced lab testing for all imported processed food products. 30 additional parameters added to mandatory testing list.',
    category: 'fssai',
    country: 'India',
    source: 'FSSAI Official Gazette',
    link: 'https://www.fssai.gov.in',
    tags: ['FSSAI', 'Import', 'Food Safety', 'Testing'],
  },
  {
    title: 'WPC Issues Revised Spectrum Allocation for 5G Devices',
    summary: 'Wireless Planning & Coordination Wing has released revised spectrum allocation guidelines for 5G-enabled devices. New ETA process applies from January 2025.',
    category: 'wpc',
    country: 'India',
    source: 'WPC Wing, DoT',
    link: 'https://dot.gov.in',
    tags: ['WPC', '5G', 'Spectrum', 'ETA'],
  },
  {
    title: 'CPCB Raises EPR Collection Targets by 20% for FY 2025-26',
    summary: 'Central Pollution Control Board has increased Extended Producer Responsibility collection and recycling targets by 20% for e-waste and plastic packaging.',
    category: 'epr',
    country: 'India',
    source: 'CPCB Notification',
    link: 'https://cpcb.nic.in',
    tags: ['EPR', 'CPCB', 'E-waste', 'Recycling'],
  },
  {
    title: 'EU CE Marking: New Machinery Regulation Effective Jan 2027',
    summary: 'European Commission publishes final text of the new Machinery Regulation replacing the Machinery Directive 2006/42/EC. Transition period begins now.',
    category: 'international',
    country: 'EU',
    source: 'European Commission',
    link: 'https://ec.europa.eu',
    tags: ['CE', 'EU', 'Machinery', 'Regulation'],
  },
  {
    title: 'India Customs Introduces Faceless Assessment for Electronics',
    summary: 'CBIC has extended the faceless assessment scheme to cover all electronics imports at major ports. Expected to reduce clearance time by 40%.',
    category: 'customs',
    country: 'India',
    source: 'CBIC Circular',
    link: 'https://www.cbic.gov.in',
    tags: ['Customs', 'Electronics', 'Faceless Assessment', 'CBIC'],
  },
  {
    title: 'ISO 42001 AI Management Standard Now Available',
    summary: 'International Organization for Standardization has published ISO 42001, the first global standard for AI management systems. Indian companies can now seek certification.',
    category: 'iso',
    country: 'Global',
    source: 'ISO',
    link: 'https://www.iso.org',
    tags: ['ISO', 'AI', 'Management System', '42001'],
  },
  {
    title: 'BIS Mandatory Hallmarking Extended to Silver Jewellery',
    summary: 'BIS has extended mandatory hallmarking requirements to include silver jewellery and artefacts with effect from April 2025. All retailers must comply.',
    category: 'bis',
    country: 'India',
    source: 'Bureau of Indian Standards',
    link: 'https://www.bis.gov.in',
    tags: ['BIS', 'Hallmark', 'Silver', 'Jewellery'],
  },
]

/**
 * Seeds the insights table with sample regulatory updates.
 * In production, this would be replaced by an actual web scraper
 * or RSS feed parser pulling from government gazette sites.
 */
export async function seedInsights(): Promise<void> {
  try {
    const twentyFourHoursAgo = new Date()
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24)

    const recentCount = await Insight.countDocuments({
      createdAt: { $gt: twentyFourHoursAgo }
    })

    if (recentCount >= 3) {
      logger.debug('Insights already seeded for today, skipping')
      return
    }

    // Pick 3 random insights to insert today
    const shuffled = [...SAMPLE_INSIGHTS].sort(() => Math.random() - 0.5)
    const toInsert = shuffled.slice(0, 3)

    for (const insight of toInsert) {
      // Avoid duplicates by checking title
      const exists = await Insight.exists({ title: insight.title })
      if (exists) continue

      await Insight.create({
        ...insight,
        relevanceScore: Math.floor(Math.random() * 40) + 60,
      })
    }

    logger.info(`Successfully seeded ${toInsert.length} new insights`)
  } catch (err) {
    logger.error('Failed to seed insights', err)
  }
}
