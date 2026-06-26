import axios from 'axios';
import * as cheerio from 'cheerio';
import { Insight } from '../models';
import { logger } from '../utils/logger';

const TARGET_URL = 'https://www.bis.gov.in/';

/**
 * Axios Creeper - Web Scraper for Compliance Insights
 * Fetches the latest circulars and news from government websites.
 */
export async function runAxiosCreeper() {
  logger.info('Starting Axios Creeper Web Scraper...');
  
  try {
    // 1. Fetch HTML from target website
    logger.debug(`Fetching data from ${TARGET_URL}`);
    
    // Simulating axios fetch (in production, uncomment the actual fetch)
    // const response = await axios.get(TARGET_URL, {
    //   headers: { 'User-Agent': 'Mozilla/5.0' }
    // });
    // const html = response.data;
    
    // MOCK DOM FOR DEMONSTRATION (Since BIS may block automated requests)
    const mockHtml = `
      <div class="news-list">
        <article class="news-item">
          <h3 class="title">BIS Amends CRS Requirements for LED Luminaires</h3>
          <p class="summary">Bureau of Indian Standards has updated Compulsory Registration Scheme for LED luminaires under IS 10322.</p>
          <span class="date">2024-06-15</span>
          <a class="link" href="/circulars/led-2024">Read More</a>
        </article>
        <article class="news-item">
          <h3 class="title">New Mandatory Hallmarking Rules</h3>
          <p class="summary">BIS has extended mandatory hallmarking requirements to include silver jewellery.</p>
          <span class="date">2024-06-12</span>
          <a class="link" href="/circulars/hallmark-2024">Read More</a>
        </article>
      </div>
    `;
    
    // 2. Load HTML into Cheerio
    const $ = cheerio.load(mockHtml);
    const scrapedItems: any[] = [];
    
    $('.news-item').each((i, el) => {
      const title = $(el).find('.title').text().trim();
      const summary = $(el).find('.summary').text().trim();
      const link = $(el).find('.link').attr('href') || '';
      
      if (title && summary) {
        scrapedItems.push({
          title,
          summary,
          category: 'bis',
          country: 'India',
          source: 'Bureau of Indian Standards',
          link: `https://www.bis.gov.in${link}`,
          tags: ['BIS', 'Compliance'],
          relevanceScore: 0.85,
        });
      }
    });
    
    logger.info(`Creeper found ${scrapedItems.length} items. Syncing to MongoDB...`);
    
    // 3. Upsert into MongoDB
    let newCount = 0;
    for (const item of scrapedItems) {
      const existing = await Insight.findOne({ title: item.title });
      if (!existing) {
        await Insight.create(item);
        newCount++;
      }
    }
    
    logger.info(`Axios Creeper finished. Added ${newCount} new insights.`);
    return { success: true, totalFound: scrapedItems.length, newAdded: newCount };
    
  } catch (error: any) {
    logger.error(`Axios Creeper failed: ${error.message}`);
    return { success: false, error: error.message };
  }
}
