import * as cheerio from 'cheerio';
import { makeSlug, eventExists, insertEvent, fetchHTML, delay } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';
import { mapBydel } from '../lib/categories.js';

const SOURCE = '__SOURCE__';
const BASE_URL = '__BASE_URL__';
const VENUE = '__VENUE__';

export async function scrape(): Promise<{ found: number; inserted: number }> {
    console.log(`\n[${SOURCE}] Starting scrape of ${VENUE}...`);

    const html = await fetchHTML(BASE_URL);
    if (!html) {
        console.error(`[${SOURCE}] Failed to fetch page`);
        return { found: 0, inserted: 0 };
    }

    const $ = cheerio.load(html);
    let found = 0;
    let inserted = 0;

    // TODO: Update selector to match event elements on the page
    const items = $('__SELECTOR__').toArray();
    console.log(`[${SOURCE}] ${items.length} events found`);

    for (const el of items) {
        // TODO: Extract event data from each element
        const title = '';
        const dateStr = '';
        const startDate = new Date(dateStr);
        const sourceUrl = '';
        const imageUrl = '';
        const price = '';
        const ticketUrl = '';

        found++;

        if (await eventExists(sourceUrl)) continue;

        await delay(1000);

        const aiDesc = await generateDescription({
            title, venue: VENUE, category: '__CATEGORY__', date: startDate, price
        });

        const success = await insertEvent({
            slug: makeSlug(title, dateStr),
            title_no: title,
            description_no: aiDesc.no,
            description_en: aiDesc.en,
            category: '__CATEGORY__',
            date_start: startDate.toISOString(),
            venue_name: VENUE,
            address: '__ADDRESS__',
            bydel: mapBydel(VENUE),
            price,
            ticket_url: ticketUrl,
            source: SOURCE,
            source_url: sourceUrl,
            image_url: imageUrl || undefined,
            age_group: 'all',
            language: 'no',
            status: 'approved',
        });

        if (success) {
            console.log(`  + ${title} (${dateStr})`);
            inserted++;
        }
    }

    return { found, inserted };
}
