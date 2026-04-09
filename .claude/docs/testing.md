# Testing

**Vitest** unit test suite (846 tests, <500ms). `npm test` / `npm run test:watch`. CI runs after type check.

## Test files
- `src/lib/__tests__/event-filters.test.ts` — 57 tests: matchesTimeOfDay, getWeekendDates, isSameDay, toOsloDateStr, getEasterDate, getISOWeekDates, getContextualHighlight
- `src/lib/__tests__/utils.test.ts` — 41 tests: isFreeEvent, formatPrice, slugify, formatEventTime
- `src/lib/__tests__/seo.test.ts` — 55 tests: safeJsonLd, generateEventJsonLd, toBergenIso, generateBreadcrumbJsonLd, generateCollectionJsonLd, computeCanonical
- `src/lib/__tests__/seo-audit.test.ts` — 482 tests: SEO validation rules (meta tags, JSON-LD, canonical URLs, sitemap, performance budgets, source counts)
- `src/lib/__tests__/collections.test.ts` — 104 tests: all 52 slugs, filters, seasonal/festival, EN counterparts
- `scripts/lib/__tests__/utils.test.ts` — 50 tests: parseNorwegianDate, bergenOffset, normalizeTitle, slugify, detectFreeFromText, isOptedOut
- `scripts/lib/__tests__/dedup.test.ts` — 17 tests: titlesMatch, scoreEvent
- `scripts/lib/__tests__/scraper-health.test.ts` — 16 tests: classifyScrapers
- `scripts/lib/__tests__/ticket-validation.test.ts` — 18 tests: validateTicketUrl
- `src/lib/__tests__/query-timezone.test.ts` — 6 tests: UTC vs Oslo time regressions

## Config
Vitest reads from `vite.config.ts` (`test.include: ['src/**/*.test.ts', 'scripts/**/*.test.ts']`). Scraper tests mock `supabase.js` and `venues.js` via `vi.mock()`.
