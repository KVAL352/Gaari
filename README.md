# Gåri — Bergen Event Aggregator

**Ke det går i Bergen?** A bilingual (NO/EN) event aggregator for Bergen, Norway. One place to find everything happening in the city — concerts, culture, theatre, family events, food, sports, and more.

**Live:** [gaari.no](https://gaari.no)

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | SvelteKit 2 + Svelte 5, Tailwind CSS 4 |
| Database | Supabase (PostgreSQL) |
| Hosting | Vercel |
| Scrapers | TypeScript + Cheerio, GitHub Actions |

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase project with `events` table

### Setup

```bash
git clone https://github.com/KVAL352/Gaari.git
cd Gaari
npm install
cp .env.example .env
# Fill in your Supabase credentials in .env
npm run dev
```

### Environment Variables

| Variable | Description |
|----------|-------------|
| `PUBLIC_SUPABASE_URL` | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key (client-side) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (scrapers only) |

## Project Structure

```
src/
  lib/
    components/     Svelte components (EventCard, FilterBar, etc.)
    i18n/           Bilingual translations (NO/EN)
    types.ts        TypeScript interfaces
    supabase.ts     Supabase client
  routes/
    [lang]/         Language-based routing (/no, /en)
      +page.svelte  Homepage with event listing
      events/       Event detail pages
      submit/       Event submission form
      about/        About page

scripts/
  scrape.ts         Main orchestrator (cleanup → scrape → dedup)
  scrapers/         Source-specific scrapers
  lib/
    utils.ts        Shared utilities (slug, dates, insert, dedup)
    dedup.ts        Cross-source deduplication
    categories.ts   Category and bydel mapping
    supabase.ts     Supabase client for scrapers

docs/               Project strategy, design brief, data sources
```

## Event Sources

| Source | Type | Events |
|--------|------|--------|
| [Visit Bergen](https://visitbergen.com/hva-skjer) | HTML scrape | ~1,000 |
| [Kultur i Kveld](https://kulturikveld.no) | HTML scrape | ~400 |
| [Bergen Kommune](https://bergen.kommune.no) | AJAX API | ~200 |
| [BarnasNorge](https://barnasnorge.no) | HTML scrape | ~150 |
| [StudentBergen](https://studentbergen.no) | JSON API | ~50 |
| [Bergen Live](https://bergenlive.no) | HTML scrape | ~40 |

Scrapers run automatically twice daily via GitHub Actions (7 AM / 7 PM CET).

### Running scrapers manually

```bash
cd scripts
npm install
npx tsx scrape.ts                  # All scrapers
npx tsx scrape.ts bergenlive       # Single scraper
```

The scrape pipeline:
1. Removes expired events
2. Runs selected scrapers (skips existing events by source_url)
3. Deduplicates across sources (normalized title + same date)

## Event Categories

music, culture, theatre, family, food, festival, sports, nightlife, workshop, student, tours

## Bydeler (Districts)

Sentrum, Bergenhus, Fana, Ytrebygda, Laksevåg, Fyllingsdalen, Åsane, Arna

## License

MIT

## Contact

gaari.bergen@proton.me
