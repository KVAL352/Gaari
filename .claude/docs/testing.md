# Testing

**Vitest** unit test suite (`npm test` / `npm run test:watch`, <500ms). CI runs after type check. Run `npx vitest run` for current count.

## Test files
- `src/lib/__tests__/event-filters.test.ts` — matchesTimeOfDay, getWeekendDates, isSameDay, toOsloDateStr, getEasterDate, getISOWeekDates, getContextualHighlight, eventOverlapsRange, eventOnDay
- `src/lib/__tests__/utils.test.ts` — isFreeEvent, formatPrice, slugify, formatEventTime
- `src/lib/__tests__/seo.test.ts` — safeJsonLd, generateEventJsonLd, toBergenIso, generateBreadcrumbJsonLd, generateCollectionJsonLd, computeCanonical
- `src/lib/__tests__/seo-audit.test.ts` — SEO validation rules (meta tags, JSON-LD, canonical URLs, sitemap, performance budgets, source counts)
- `src/lib/__tests__/collections.test.ts` — all collection slugs, filters, seasonal/festival, EN counterparts
- `scripts/lib/__tests__/utils.test.ts` — parseNorwegianDate, bergenOffset, normalizeTitle, slugify, detectFreeFromText, isOptedOut
- `scripts/lib/__tests__/dedup.test.ts` — titlesMatch, scoreEvent
- `scripts/lib/__tests__/scraper-health.test.ts` — classifyScrapers
- `scripts/lib/__tests__/ticket-validation.test.ts` — validateTicketUrl
- `src/lib/__tests__/query-timezone.test.ts` — UTC vs Oslo time regressions
- `src/lib/__tests__/promotions.test.ts` — selectPromotedByDeficit convergence, multi-venue balancing, tier shares, newsletter rotation
- `src/lib/__tests__/promotions-roles.test.ts` — 5-role QA (business analyst, venue owner, end user, devops, legal) + mid-month join scenarios

## Config
Vitest reads from `vite.config.ts` (`test.include: ['src/**/*.test.ts', 'scripts/**/*.test.ts']`). Scraper tests mock `supabase.js` and `venues.js` via `vi.mock()`.
