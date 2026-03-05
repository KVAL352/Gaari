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

2. **Create the scraper file** at `scripts/scrapers/<source-name>.ts` using the template at [template.ts](template.ts). Replace `__PLACEHOLDERS__` with actual values:
   - `__SOURCE__` → scraper key (e.g. `cafesanaa`)
   - `__BASE_URL__` → URL to scrape
   - `__VENUE__` → venue display name
   - `__SELECTOR__` → CSS selector for event elements
   - `__CATEGORY__` → one of the valid categories below
   - `__ADDRESS__` → street address

3. **Register in `scripts/scrape.ts`**:
   - Add import at top: `import { scrape as scrape<Name> } from './scrapers/<source-name>.js';`
   - Add to `scrapers` object in the appropriate section (fast scrapers first, slow ones last)

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
