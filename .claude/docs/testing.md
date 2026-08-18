# Testing

**Vitest** unit test suite (`npm test` / `npm run test:watch`, <500ms). CI runs after type check. Run `npx vitest run` for current count.

## Test files
- `src/lib/__tests__/event-filters.test.ts` — matchesTimeOfDay, getWeekendDates, isSameDay, toOsloDateStr, getEasterDate, getISOWeekDates, getContextualHighlight, eventOverlapsRange, eventOnDay
- `src/lib/__tests__/utils.test.ts` — isFreeEvent, formatPrice, slugify, formatEventTime, toBergenIsoFromParts (begge sommertidsgrensene)
- `src/lib/__tests__/seo.test.ts` — safeJsonLd, generateEventJsonLd, toBergenIso, generateBreadcrumbJsonLd, generateCollectionJsonLd, computeCanonical
- `src/lib/__tests__/seo-audit.test.ts` — SEO validation rules (meta tags, JSON-LD, canonical URLs, sitemap, performance budgets, source counts)
- `src/lib/__tests__/collections.test.ts` — all collection slugs, filters, seasonal/festival, EN counterparts
- `scripts/lib/__tests__/utils.test.ts` — parseNorwegianDate, bergenOffset, normalizeTitle, slugify, detectFreeFromText, isOptedOut, isImageAllowed (sperren må treffe på venue_name, tittel og billettadresse, og en innsending uten `source` skal aldri vise bilde)
- `scripts/lib/__tests__/dedup.test.ts` — titlesMatch, scoreEvent, sammeSted og titlerMatcherPaaSammeSted (den løsere titteltesten som bare gjelder når sted og dato er like, og som aldri slår til når begge sider har samme kilde)
- `scripts/lib/__tests__/scraper-health.test.ts` — classifyScrapers
- `scripts/lib/__tests__/ticket-validation.test.ts` — validateTicketUrl
- `scripts/lib/__tests__/bildesamtykke.test.ts` — samtykkeregisteret: dokumentet i takt med consent.json, SoMe krever dokumentert grunnlag, promo delmengde av visning, ingen dubletter, bevis og vurderingsfrist på hver kilde, nyKilde-validering. Etter delingen 2026-08-13 også: ingen e-post eller kontaktfelt i de offentlige filene, ingen sitat på avslagene, og at dokumentet blir identisk med og uten `private/consent-private.json` (som CI ikke har)
- `scripts/lib/__tests__/organizer-notice.test.ts` — bekreftelsen til B2B-arrangører: emne og lenkeliste ved ett kontra flere arrangementer, hilsen uten navn når navnet mangler, nekter å bygge brev uten arrangementer, og at bildeavsnittet følger omfanget i consent.json i stedet for en egen liste
- `scripts/lib/__tests__/consent-gap.test.ts` — samtykke-hullet: hvilke kilder som er promotering, kun-visning, aggregator eller utenfor registeret, telling av arrangementer med og uten bilde, og rangeringen som avgjør hvem det er verdt å spørre først
- `scripts/social/__tests__/venue-policy.test.ts` — venue-regelen: fjernBlokkerte, mandagsberegning, og strukturell sjekk av at hver publiserende generator importerer venue-policy
- `src/lib/__tests__/student-filter.test.ts` — parseLowestPrice (Norwegian thousands), isStudentRelevant (exclusions + scoring system), studentRelevanceScore (venue/price/category/bydel signals), location penalty
- `src/lib/__tests__/query-timezone.test.ts` — UTC vs Oslo time regressions
- `src/lib/__tests__/promotions.test.ts` — selectPromotedByDeficit convergence, multi-venue balancing, tier shares, newsletter rotation
- `src/lib/__tests__/promotions-roles.test.ts` — 5-role QA (business analyst, venue owner, end user, devops, legal) + mid-month join scenarios

## Config
Vitest reads from `vite.config.ts` (`test.include: ['src/**/*.test.ts', 'scripts/**/*.test.ts']`). Scraper tests mock `supabase.js` and `venues.js` via `vi.mock()`.

### Fella som har tatt oss tre ganger: dotenv finnes ikke i CI

`scripts/lib/supabase.ts` importerer `dotenv`, som bare ligger i
`scripts/package.json`. CI kjører `npm ci` i rota, så pakken mangler der og
bare der. En test som drar inn `utils.ts` (som importerer `supabase.ts`) går
derfor grønt lokalt og feiler i CI med `ERR_MODULE_NOT_FOUND`. Feilen er
usynlig før den er pushet.

To måter å unngå det, i prioritert rekkefølge:

1. **La modulen slippe avhengigheten.** Trenger koden bare samtykkeregisteret,
   hent `CONSENT_RECORDS` fra `consent-doc.ts`, som med vilje ikke importerer
   noe utover Node. Det var fiksen 2026-08-14 for `organizer-notice.ts`.
2. **Mock den**, når modulen faktisk trenger databasen:
   `vi.mock('../supabase.js', () => ({ supabase: {} }))`. Brukes i
   `bildesamtykke.test.ts` og `utils.test.ts`.

Verifiser alltid mot importgrafen, ikke mot at testen ble grønn lokalt. En
grønn kjøring på en maskin som har `scripts/node_modules` beviser ingenting
om CI.
