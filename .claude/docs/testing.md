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
- `scripts/lib/__tests__/source-watch.test.ts` — kildevakten: at bildeoppfoeringer i `image:`-navnerommet ikke telles som sider, at skraastrek-normalisering hindrer falskt varsel naar en kilde bytter sitemap-generator, sitemapindex, HTTP- og nettverksfeil som `unreachable` i stedet for kast, at én doed kilde ikke velter de andre eller digesten, og at `source-watch.json` har unike id-er og ferdig normalisert fasit
- `scripts/lib/__tests__/ticket-validation.test.ts` — validateTicketUrl
- `scripts/lib/__tests__/bildesamtykke.test.ts` — samtykkeregisteret: dokumentet i takt med consent.json, SoMe krever dokumentert grunnlag, promo delmengde av visning, ingen dubletter, bevis og vurderingsfrist på hver kilde, nyKilde-validering. Etter delingen 2026-08-13 også: ingen e-post eller kontaktfelt i de offentlige filene, ingen sitat på avslagene, og at dokumentet blir identisk med og uten `private/consent-private.json` (som CI ikke har)
- `scripts/lib/__tests__/organizer-notice.test.ts` — bekreftelsen til B2B-arrangører: emne og lenkeliste ved ett kontra flere arrangementer, hilsen uten navn når navnet mangler, nekter å bygge brev uten arrangementer, og at bildeavsnittet følger omfanget i consent.json i stedet for en egen liste
- `scripts/lib/__tests__/consent-gap.test.ts` — samtykke-hullet: hvilke kilder som er promotering, kun-visning, aggregator eller utenfor registeret, telling av arrangementer med og uten bilde, og rangeringen som avgjør hvem det er verdt å spørre først
- `scripts/social/__tests__/venue-policy.test.ts` — venue-regelen: fjernBlokkerte, mandagsberegning, og strukturell sjekk av at hver publiserende generator importerer venue-policy
- `src/lib/__tests__/student-filter.test.ts` — parseLowestPrice (Norwegian thousands), isStudentRelevant (exclusions + scoring system), studentRelevanceScore (venue/price/category/bydel signals), location penalty
- `src/lib/__tests__/query-timezone.test.ts` — UTC vs Oslo time regressions
- `src/lib/__tests__/promotions.test.ts` — selectPromotedByDeficit convergence, multi-venue balancing, tier shares, newsletter rotation
- `src/lib/__tests__/promotions-roles.test.ts` — 5-role QA (business analyst, venue owner, end user, devops, legal) + mid-month join scenarios
- `src/lib/__tests__/b2b-visibility.test.ts` — at arrangoersidene faktisk er skjult: at flagget staar av, og at kontaktskjemaet svarer 404 uten aa skrive til `organizer_inquiries` eller sende varsel-epost. SvelteKit kjoerer actions FOER load, saa redirecten i load stoppet ingen POST. Sperren ligger foran honeypot-grenen, saa den kan ikke brukes til aa faa 200 fra en skjult rute
- `src/lib/__tests__/storage-path.test.ts` — `eventImageStoragePath`: at endelsen utledes fra `image_url` (jpg/png/webp) i stedet for aa antas `.jpg`, og — viktigst — at `fallback/` aldri returneres. Fallback-bildene er DELTE per arrangoer, saa en sletting utloest av én avvist innsending ville fjernet bildet for alle andre. Daekker ogsaa hot-linkede URL-er, feil boette, sti-traversering og query-parametre
- `src/lib/__tests__/contrast.test.ts` — regner WCAG-kontrast ut av tokenene i `app.css` og feiler under 4,5:1 for tekst. Leser CSS-fila, saa en endret `--funkis-*`-verdi fanges uten at testen roeres. Daekker begge fargemoduser og tekst-paa-roed-flate

## E2E: tilgjengelighet (Playwright + axe-core)

`npx playwright test` — egen suite, ikke del av `npm test`. Kjoerer i CI etter
`npm test`, med egen browser-install og `--project=chromium`.

- `e2e/a11y.spec.ts` — axe-core mot WCAG 2.2 AA paa fire sider (forside NO/EN,
  samleside, arrangementsside, innsendingsskjema), i to prosjekter: `lys` og
  `mork`. I tillegg tilstander som ikke finnes naar sida staar i ro: aapent
  soekefelt, aapen kalendermeny, rullet ned til tilbake-til-toppen, og hovret
  arrangementskort.

**Hvorfor tilstandene har egne tester.** To kontrastbrudd slapp gjennom en ren
skanning i august 2026 fordi elementet ikke var i DOM eller ikke i den
tilstanden da axe kjoerte. Begge ble funnet av Kjersti med oeynene. Legger du
til en komponent som bare vises etter en handling, legg til en test som utfoerer
handlingen foerst.

**Databasen naas ikke under testen.** `playwright.config.ts` starter dev-serveren
med `PUBLIC_SUPABASE_URL=https://supabase.invalid`, saa suiten aldri er avhengig
av produksjonsdata eller av at CI har ekte noekler. Sidene rendres likevel med
innhold — maalt 21. august 2026 til 73 `.card` og 18 arrangementslenker paa
forsiden — saa axe skanner ekte markup og ikke en tom skjelettside. Hvor de
radene kommer fra naar SSR-kallet feiler er ikke sporet; det er verdt aa finne
ut av foer noen stoler paa at tallet holder seg.

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
