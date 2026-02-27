---
name: new-scraper
description: Scaffold a new event scraper for a Bergen venue or source. Creates the scraper file and registers it in scrape.ts.
argument-hint: [source-name] [url]
disable-model-invocation: true
---

# Create a new scraper

Create a new scraper for **$ARGUMENTS**.

## Steps

1. **Read an existing scraper for reference** — pick one from `scripts/scrapers/` that's similar to the target source (HTML → use `bjorgvinblues.ts`, JSON API → use `studentbergen.ts` or `kvarteret.ts`, WordPress → use `bek.ts`)

2. **Create the scraper file** at `scripts/scrapers/<source-name>.ts` following this structure:

```typescript
import * as cheerio from 'cheerio';
import { makeSlug, eventExists, insertEvent, fetchHTML } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = '<source-name>';
const BASE_URL = '<url>';

export async function scrape(): Promise<{ found: number; inserted: number }> {
    console.log(`\n[${SOURCE}] Starting scrape of <Source Name>...`);

    const html = await fetchHTML(BASE_URL);
    if (!html) {
        console.error(`[${SOURCE}] Failed to fetch page`);
        return { found: 0, inserted: 0 };
    }

    const $ = cheerio.load(html);
    let found = 0;
    let inserted = 0;

    // TODO: Select event elements
    const items = $('SELECTOR').toArray();
    console.log(`[${SOURCE}] ${items.length} events found`);

    for (const el of items) {
        // TODO: Extract title, date, venue, price, etc.
        found++;

        const sourceUrl = 'UNIQUE_EVENT_URL';
        if (await eventExists(sourceUrl)) continue;

        const aiDesc = await generateDescription({
            title, venue: 'VENUE', category: 'CATEGORY', date: startDate, price: ''
        });

        const success = await insertEvent({
            slug: makeSlug(title, dateStr),
            title_no: title,
            description_no: aiDesc.no,
            description_en: aiDesc.en,
            category: 'CATEGORY',
            date_start: startDate.toISOString(),
            venue_name: 'VENUE',
            address: 'ADDRESS',
            bydel: 'BYDEL',
            price: '',
            ticket_url: 'TICKET_URL',
            source: SOURCE,
            source_url: sourceUrl,
            image_url: undefined,
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
```

3. **Register in `scripts/scrape.ts`**:
   - Add import at top: `import { scrape as scrape<Name> } from './scrapers/<source-name>.js';`
   - Add to `scrapers` object (before `visitbergen` which is always last as the aggregator fallback)

4. **Add venue to `scripts/lib/venues.ts`** if the venue isn't already registered (check VENUE_URLS)

5. **Add bydel mapping to `scripts/lib/categories.ts`** if venue isn't already in `mapBydel()`

## Critical rules (from CLAUDE.md)

- **No copied descriptions**: Use `generateDescription()` from `ai-descriptions.ts` — NEVER store raw scraped text
- **No aggregator URLs in ticket_url**: Must point to actual venue/ticket pages. Check `venues.ts` AGGREGATOR_DOMAINS
- **Rate limiting**: Use 1-1.5s delays between requests via `delay()` from utils
- **Honest User-Agent**: Already set in `fetchHTML()` — don't override
- **Filter non-public events**: Skip barnehage/SFO/school events (check keywords)
- **source_url must be unique per event**: Use actual event detail URLs, or construct unique keys like `${BASE_URL}#${date}-${slug}`

## Categories

Valid categories: music, culture, theatre, family, food, festival, sports, nightlife, workshop, student, tours

Use `mapCategory()` from `scripts/lib/categories.ts` if the source provides its own category labels.

## Bydeler

Valid bydeler: Sentrum, Bergenhus, Fana, Ytrebygda, Laksevåg, Fyllingsdalen, Åsane, Arna

Use `mapBydel(venueName)` from `scripts/lib/categories.ts` for automatic mapping.

## Test the scraper

After creating, run: `cd scripts && npx tsx scrape.ts <source-name>`
