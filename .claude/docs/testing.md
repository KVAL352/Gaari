# Testing

**Vitest** unit test suite (`npm test` / `npm run test:watch`, <500ms). CI runs after type check. Run `npx vitest run` for current count.

## Test files
- `src/lib/__tests__/event-filters.test.ts` — matchesTimeOfDay, getWeekendDates, isSameDay, toOsloDateStr, getEasterDate, getISOWeekDates, getContextualHighlight, eventOverlapsRange, eventOnDay
- `src/lib/__tests__/utils.test.ts` — isFreeEvent, formatPrice, slugify, formatEventTime, toBergenIsoFromParts (begge sommertidsgrensene)
- `src/lib/__tests__/seo.test.ts` — safeJsonLd, generateEventJsonLd, toBergenIso, generateBreadcrumbJsonLd, generateCollectionJsonLd, computeCanonical
- `src/lib/__tests__/seo-audit.test.ts` — SEO validation rules (meta tags, JSON-LD, canonical URLs, sitemap, performance budgets, source counts)
- `src/lib/__tests__/collections.test.ts` — all collection slugs, filters, seasonal/festival, EN counterparts
- `scripts/lib/__tests__/utils.test.ts` — parseNorwegianDate, bergenOffset, normalizeTitle, slugify, detectFreeFromText, isOptedOut, isImageAllowed (sperren må treffe på venue_name, tittel og billettadresse; et FREMMED bilde uten `source` skal aldri vises, mens arrangørens EGEN opplasting under `events/` skal godtas, siden /submit bare laster opp når rettighetene er bekreftet. Sperrelisten står over unntaket: et Hulen-bilde sendt inn gjennom skjemaet avvises, og `fallback/` treffes aldri)
- `scripts/lib/__tests__/dedup.test.ts` — titlesMatch, scoreEvent, sammeSted og titlerMatcherPaaSammeSted (den løsere titteltesten som bare gjelder når sted og dato er like, og som aldri slår til når begge sider har samme kilde). Siden 2026-08-25 også: at `hentDedupKandidater()` filtrerer på `status = 'approved'`, slik at innsendinger til gjennomgang ikke kan slettes av pipeline; at `dedup-dryrun.ts` ikke henter rader på egen hånd, så tørrkjøringen ikke kan vise noe annet enn kjøringen gjør; at `deduplicate()` sletter taperens opplastede bilde og aldri et `fallback/`-bilde; og at `innsending` rangerer over billettplattformene, men under scenens egen kilde
- `scripts/lib/__tests__/workflow-env.test.ts` — at ingen workflow eksporterer `SUPABASE_URL` i stedet for `PUBLIC_SUPABASE_URL`. `send-reminders.yml` gjorde det, og siden `lib/supabase.ts` kaller `process.exit(1)` ved import uten den, gikk ingen påminnelser ut fra 21. til 24. august. Jobben var rød hver dag, men en rød cron-jobb ingen ser på er det samme som ingen jobb
- `src/lib/__tests__/events-column-grant.test.ts` — at anon-klienten aldri gjør `.from('events').select('*')`. RLS-grantet er kolonnevis, så Postgres avviser hele spørringen med 42501 når én kolonne mangler. `/api/health/deep` meldte «unhealthy» på alle åtte sjekkene i fire døgn mens siden gikk fint, og `/llms.txt` svarte «check gaari.no for current count» til hver AI-crawler. `supabaseAdmin` går utenom grantet, så admin-sidene er med vilje ikke omfattet
- `src/lib/__tests__/innsendingstekst.test.ts` — at innsendingsflyten følger de absolutte tekstreglene: ingen tankestrek i samtykketekstene, ingen emoji i varselet som sendes på e-post (der `✅` kom fram som et ødelagt tegn). Tittelseparatoren i `<title>` og tilbakepilen i navigasjonen er bevisst utelatt
- `scripts/lib/__tests__/scraper-health.test.ts` — classifyScrapers
- `scripts/lib/__tests__/source-watch.test.ts` — kildevakten: at bildeoppfoeringer i `image:`-navnerommet ikke telles som sider, at skraastrek-normalisering hindrer falskt varsel naar en kilde bytter sitemap-generator, sitemapindex, HTTP- og nettverksfeil som `unreachable` i stedet for kast, at én doed kilde ikke velter de andre eller digesten, og at `source-watch.json` har unike id-er og ferdig normalisert fasit
- `scripts/lib/__tests__/ticket-validation.test.ts` — validateTicketUrl
- `scripts/scrapers/__tests__/kode.test.ts` — KODEs seksjonstabell: at `buildSourceUrl` bruker slugen fra Sanity og aldri bygger `/arrangementer/`, seksjonen som ga 404 paa 61 av 68 arrangementer. Tabellen er laast fordi navnene ikke er utledbare — «Kurs og verksted» blir `/verksted/`, «Familieaktiviteter» blir `/familie/`. Daekker ogsaa at manglende seksjon gir `null` i stedet for en gjetning
- `scripts/lib/__tests__/bildesamtykke.test.ts` — samtykkeregisteret: dokumentet i takt med consent.json, SoMe krever dokumentert grunnlag, promo delmengde av visning, ingen dubletter, bevis og vurderingsfrist på hver kilde, nyKilde-validering. Etter delingen 2026-08-13 også: ingen e-post eller kontaktfelt i de offentlige filene, ingen sitat på avslagene, og at dokumentet blir identisk med og uten `private/consent-private.json` (som CI ikke har)
- `scripts/lib/__tests__/organizer-notice.test.ts` — bekreftelsen til B2B-arrangører: emne og lenkeliste ved ett kontra flere arrangementer, hilsen uten navn når navnet mangler, nekter å bygge brev uten arrangementer, og at bildeavsnittet følger omfanget i consent.json i stedet for en egen liste
- `scripts/lib/__tests__/consent-gap.test.ts` — samtykke-hullet: hvilke kilder som er promotering, kun-visning, aggregator eller utenfor registeret, telling av arrangementer med og uten bilde, og rangeringen som avgjør hvem det er verdt å spørre først
- `scripts/social/__tests__/venue-policy.test.ts` — venue-regelen: fjernBlokkerte, mandagsberegning, og strukturell sjekk av at hver publiserende generator importerer venue-policy
- `scripts/scrapers/__tests__/bookibud.test.ts` — Bookibud-parseren: at storskjermvisninger kjennes igjen paa liga eller Formel 1 og faar «Storskjerm: »-prefiks én gang, at kildens egen tittel kolliderer med kampen brann.ts legger inn samme dag mens prefikset skiller dem, kategori fra etikett eller tittel med klokkeslett som siste utvei, pris fra oere til kroner, og adressebygging
- `scripts/scrapers/__tests__/bookibud-pipeline.test.ts` — de fire kodeveiene ekte data aldri traff, kjoert med mocket fetch: at alle sider hentes og ikke bare den foerste, at avvik mot `total` gir advarsel, at to rader med samme `eventId` blir én rad med `date_end` fra siste dag mens et endagsarrangement ikke faar `date_end`, at avlyst og utsolgt sletter i stedet for aa legge inn, og at `ticket_url` bare settes naar arrangementet koster noe. Mutasjonssjekket: tre innfoerte feil gir fem roede tester
- `scripts/lib/__tests__/reminders.test.ts` — den sporede paaminnelsesfila: ingen e-postadresser, ingen telefonnummer, og ingen av navnene som ble fjernet 2026-08-21. Navnelista ligger i `private/pii-denylist.json`, saa sjekken hopper over seg selv i CI; en denylist over personopplysninger er selv personopplysninger
- `scripts/lib/__tests__/pii-i-repoet.test.ts` — hele treet: skanner alt `git ls-files` returnerer for e-postadresser og telefonnummer. Regelen spoer om lokaldelen er et rollenavn i stedet for aa vedlikeholde en allowlist, siden `info@` ikke identifiserer noen og `fornavn@` gjoer det. Telefonsoeket krever «tlf» eller «mobil» i naerheten - et bart aattesifret moenster traff `86400000` 69 ganger
- `scripts/lib/__tests__/newsletter-logging.test.ts` — sperrene mot personopplysninger i den offentlige Actions-loggen: at `loggbarSti()` fjerner abonnentens adresse fra `/subscribers/.../groups/...` men beholder endepunktnavn som `schedule`, og at `utenEpost()` vasker alle adresser ut av svarkroppene vi logger videre
- `src/lib/__tests__/student-filter.test.ts` — parseLowestPrice (Norwegian thousands), isStudentRelevant (exclusions + scoring system), studentRelevanceScore (venue/price/category/bydel signals), location penalty
- `src/lib/__tests__/query-timezone.test.ts` — UTC vs Oslo time regressions
- `src/lib/__tests__/image.test.ts` — bildeoptimalisering via kildens eget CDN. Sanity får `?w=&fm=webp&q=75&fit=max` (målt 1 096 380 B → 27 672 B), Squarespace `?format=800w`. Viktigste test er at ukjente verter slipper gjennom **urørt**: en gjettet parameter kan gi 404 eller beskjære motivet, og et knust bilde er verre enn et stort. `fit=max` fordi vi ikke vet hvor motivet er
- `src/lib/__tests__/sporingshendelser.test.ts` — at ingen umami-hendelse fyres fra to steder utilsiktet. `newsletter-signup` og `social-click` står på en tillatelsesliste fordi de skal fyres fra flere komponenter. Testen fanger dobbelttelling, ikke semantisk duplikat — `filter-brukt` og `filter-used` er ulike navn og ville sluppet gjennom. Det står i fila, så ingen tror den dekker mer enn den gjør
- `scripts/lib/__tests__/ai-descriptions.test.ts` — de to opphavsrettssperrene. `erAtomaertFaktum()` forkaster verdier over seks ord eller med avsluttende punktum, så arrangørens formuleringer ikke kan bæres videre gjennom et faktafelt. `harVerbatimOverlapp()` fanger åtte ord på rad, men krever fire vanlige ord i rekka — første utgave forkastet navnelister som «Selma French Bolstad, Øystein Aarnes Vik …», altså nettopp de beskrivelsene som hadde fått med besetningen. Klokkeslett måtte unntas punktumregelen: norsk tid skrives «19.00»
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
tilstanden da axe kjoerte. Begge ble funnet av eieren med oeynene. Legger du
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
- `src/lib/__tests__/ratebegrensning.test.ts` — getRateLimitTier: hvilke stier og metoder som telles mot API-kvoten. Fester begge veier, siden en for bred regel ville gjort sida ubrukelig etter tre sidelast
- `src/lib/__tests__/klientpakke.test.ts` — ingen `.svelte`-fil får importere `$lib/collections`. Katalogen er ~4 000 linjer, og en import av én liten funksjon derfra dro hele greia inn i klientpakken: forsiden gikk fra under budsjett til 211 KiB script mot en grense på 200. Svelte-check ga 0 feil og alle testene var grønne — bare Lighthouse i CI så det, altså etter push. Adresser hentes fra `$lib/collection-urls`, som ikke har lov til å importere katalogen
- `src/lib/__tests__/sitemap-samlinger.test.ts` — hver hreflang-adresse som lever skal stå i sitemapen, og ingen som er lagt ned. Seks engelske sider (`things-to-do-bergen`, `rainy-day-bergen`, `family-bergen`, `nightlife-bergen`, `festivals-in-bergen`, `tomorrow-in-bergen`) sto utenfor fordi sitemapen itererte over kanoniske slugger og aliasene aldri er egne samlinger
- `src/lib/__tests__/tidssider-paa-forsiden.test.ts` — `/no/i-dag` og `/no/i-kveld` 301-er til forsiden, mens `/en/i-kveld` og `/en/today-in-bergen` består. Testen finnes fordi det er lett å «rydde opp» i dette senere og ta med den engelske siden, som er vår beste samleside, på kjøpet
- `src/lib/__tests__/samlinger-aarsuavhengig.test.ts` — ingen årstall i tittel/beskrivelse, ingen tall i `dateHint`, ingen artistnavn i festivalbeskrivelser. Bergenfest lovet fjorårets lineup under en 2027-tittel. Faste datoer som 17. mai og 23. juni er fortsatt tillatt
- `scripts/lib/__tests__/sperre-har-invariant.test.ts` — krever at hver sperre i insertEvent også har en invariant i datakonsistens. Mekanisk håndhevelse av «en regel som bare gjelder framover rydder ikke det som ligger der»
- `scripts/lib/__tests__/sporingsparameter.test.ts` — utenSporing: kjenner igjen samme lenke med og uten henvisningskode, men slår ikke sammen to datoer av samme show
- `scripts/lib/__tests__/paminnelse-optin.test.ts` — dobbel opt-in henger sammen i tre filer. Den viktigste sjekker at send-reminders filtrerer på confirmed_at
- `scripts/scrapers/__tests__/grieghallen-tid.test.ts` — naken lokal tid fra kilden skal tolkes som Bergen-tid, ikke UTC
- `scripts/scrapers/__tests__/harmonien-turne.test.ts` — turnékonserter i utlandet skilles ut, uten å fjerne ekte Bergen-konserter
- `scripts/scrapers/__tests__/litthusbergen-tid.test.ts` — starttiden leses fra programsidens `h3`, som limer sammen dag+dato+maaned+tid uten skilletegn. Maanedstallet skjoev treffet over paa SLUTT-tiden, saa 25 av 25 arrangementer fikk sluttidspunktet som starttid og 97 rader maatte rettes. Testen importerer scraperens egen `startTidFraH3()`, ikke en kopi av regelen, og dekker ogsaa timetall uten ledende null («8:30»), som falt til standardverdien 19:00 og gjorde et frukostmoete til et kveldsarrangement. Siste test dokumenterer den gamle regelen, saa ingen gjeninnfoerer «ikke-siffer foran»

Verifiser alltid mot importgrafen, ikke mot at testen ble grønn lokalt. En
grønn kjøring på en maskin som har `scripts/node_modules` beviser ingenting
om CI.

**Fjerde gang, 2026-08-24: nå er selve fella tettet.** `ci.yml` kjører nå
`npm ci` i `scripts/` også, slik at CI har de samme pakkene som maskinen din.
Uten det steget sto CI rød fra 21. til 24. august — fire testfiler, åtte
kjøringer, uten at noen så det. De to reglene over gjelder fortsatt: en ren
modul er lettere å teste enn en mocket, og en test som ikke drar inn databasen
kjører raskere. Men de er ikke lenger det eneste som står mellom deg og en rød
CI.
