# Contributing to Gåri

Thanks for wanting to help make Bergen's event scene more accessible!

## Getting Started

1. Fork the repo and clone it
2. `npm install` in the root (frontend)
3. `cd scripts && npm install` (scrapers)
4. Copy `.env.example` to `.env` and fill in your Supabase credentials
5. `npm run dev` to start the dev server

## Code Quality

Before committing, run:

```bash
npm run lint          # Check for code issues
npm run format:check  # Check formatting
npm run check         # TypeScript + Svelte type checking
```

To auto-fix:

```bash
npm run lint:fix      # Fix ESLint issues
npm run format        # Format all files with Prettier
```

## Project Conventions

### Language

- Norwegian is the primary language — `title_no` and `description_no` are always required
- English translations (`title_en`, `description_en`) are optional
- UI text goes in `src/lib/i18n/index.ts`

### Code Style

- Tabs for indentation
- Single quotes
- TypeScript strict mode
- Svelte 5 runes (`$state`, `$derived`, `$effect`) — not legacy stores

### Scrapers

If you add a new event source:

1. Create `scripts/scrapers/yoursource.ts` exporting `scrape(): Promise<{ found: number; inserted: number }>`
2. Register it in `scripts/scrape.ts`
3. Use `fetchHTML()` and `delay()` from `scripts/lib/utils.ts`
4. Always rate-limit requests (1-1.5s between fetches)
5. Set an honest `User-Agent` header
6. Check `eventExists(sourceUrl)` before inserting
7. Use `mapCategory()` and `mapBydel()` from `scripts/lib/categories.ts`
8. Point `ticket_url` to the actual venue/ticket page, not the aggregator

### Categories

music, culture, theatre, family, food, festival, sports, nightlife, workshop, student, tours

### Bydeler

Sentrum, Bergenhus, Fana, Ytrebygda, Laksevåg, Fyllingsdalen, Åsane, Arna

## Reporting Issues

Open an issue on GitHub with:
- What you expected
- What happened instead
- Steps to reproduce (if applicable)
- Screenshot (if UI-related)

## Contact

gaari.bergen@proton.me
