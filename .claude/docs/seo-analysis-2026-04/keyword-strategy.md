# Sokeordsstrategi for gaari.no — April 2026

## Del 1: Hvor vi allerede vises men ikke presterer (fra GSC)

Se `gsc-analysis.md` for fullstendig data. Oppsummert:

- 500 queries, 8 908 imp, 393 klikk, 1.7% ikke-merke CTR
- 32 striking-distance keywords (pos 4-15, >50 imp) = 4 539 imp
- Kannibaliseringsproblemer: paske (3 sider), 17. mai (3+ sider)
- Topp content gaps fra GSC: messer, stand-up, utendors

---

## Del 2: Sokeord vi IKKE er posisjonert for — men burde vaere

Basert pa konkurrentanalyse (Visit Bergen, Ticketmaster, BarniByen, Tripadvisor, altomnorge.com, Life in Norway), Google Autocomplete, og logisk kartlegging.

### A. Hoyvolumssokeord der konkurrentene dominerer

| Sokeord (NO) | Sokeord (EN) | Hvem ranker | Har vi side? | Prioritet |
|-------------|-------------|-------------|-------------|-----------|
| "hva skjer i bergen" | "what's on in bergen" | Visit Bergen, Bergen Kommune, altomnorge | /no/guide (pos 37!) | KRITISK |
| "ting a gjore i bergen" | "things to do in bergen" | Tripadvisor, Visit Bergen, Thon Hotels | NEI | HOY |
| "arrangementer bergen" | "events bergen" | Ticketmaster, Visit Bergen, Billetto | NEI (forsiden, ikke optimalisert) | HOY |
| "konserter bergen" | "concerts bergen" | Songkick, Bergen Live, Ticketmaster, Visit Bergen | /no/konserter (pos 24!) | HOY |
| "bergen aktiviteter" | "bergen activities" | Visit Bergen, Tripadvisor, GetYourGuide | NEI | MIDDELS |
| "gratis ting a gjore bergen" | "free things to do bergen" | Tripadvisor, Visit Bergen, studybergen | /no/gratis + /en/free-things.. (pos 21) | MIDDELS |
| "barn i bergen" / "barneaktiviteter bergen" | "kids activities bergen" | BarniByen, Visit Bergen, Bergen Kommune, barnasnorge | /no/familiehelg (delvis) | HOY |
| "uteliv bergen" | "nightlife bergen" | Old Irish Pub, Tripadvisor, utibergen.com, utdanningibergen | /no/uteliv (ukjent pos) | MIDDELS |

### B. Nisjesokeord uten konkurranse — lav-hengende frukt

Disse har lavere volum, men nesten ingen konkurranse. En dedikert side kan ranke pa forste side raskt.

| Sokeord | Konkurranse | Forslag |
|---------|-------------|---------|
| "stand-up bergen" / "komedie bergen" | Ticketmaster (liste), ingen dedikert lokal side | Ny collection: `/no/stand-up` |
| "quiz bergen" / "pubquiz bergen" | Facebook-grupper, enkeltpuber, Norges Quizforbund | Ny collection: `/no/quiz` |
| "messer bergen" / "marked bergen" | Euroexpo (industri), ingen kulturmesse-oversikt | Ny collection: `/no/messer` |
| "kurs bergen" / "workshop bergen" | Kursagenten, studiobeist, spredte | Ny collection: `/no/kurs` |
| "lopearrangementer bergen" / "lop bergen 2026" | Kondis terminlista, racedays (nisjeplattformer) | Ny collection: `/no/sport` |
| "date bergen" / "date kveld bergen" | YouWish, Tripadvisor, debergenske | Ny collection: `/no/date` |
| "foredrag bergen" / "debatt bergen" | Bergen Kommune, Litteraturhuset | Ny collection: `/no/foredrag` |
| "omvisninger bergen" / "guided tours bergen" | Visit Bergen, GetYourGuide | Ny collection: `/no/omvisninger` / `/en/guided-tours` |

### C. Engelske turistsokeord — sesongmuligheter

Visit Bergen og Life in Norway dominerer engelskspraaklig, men disse nisjene er apne:

| Sokeord | Volum-signal | Vaar status | Mulighet |
|---------|-------------|-------------|----------|
| "bergen events today" | GSC: 22 imp, pos 7.8 | /en/today-in-bergen | Fiks title: "Events in Bergen Today" |
| "bergen concerts this week" | Songkick dominerer | /en/konserter? | Trenger EN-variant |
| "free things to do in bergen" | Tripadvisor #1, Visit Bergen #2 | /en/free-things.. pos 21 | Trenger bedre innhold/FAQ |
| "bergen christmas market 2026" | GSC: 34 imp, pos 9.7 | /en/christmas-bergen | Fiks title med aar |
| "bergen rainy day activities" | Tripadvisor, diverse blogs | /no/regndagsguide (bare NO) | Lag EN-variant: `/en/rainy-day-bergen` |
| "bergen with kids" | BarniByen, Visit Bergen | Ingen EN familiehelg | Lag: `/en/family-weekend-bergen` |
| "bergen nightlife guide" | Old Irish Pub, Tripadvisor | Ingen EN uteliv | Lag: `/en/nightlife-bergen` |
| "bergen food events" / "food festival bergen" | Visit Bergen | /en/mat-og-drikke? | Trenger EN-variant |

### D. Tidsbaserte sokeord — der vi burde eie SERP

Disse er vaare kjernesokeord. Vi har sider, men ranker for darlig.

| Sokeord | Forventet volum | Var side | Problem |
|---------|----------------|---------|---------|
| "hva skjer i bergen i dag" | Hoyt (daglig) | /no/i-dag | Pos 24.8 — usynlig |
| "hva skjer i bergen denne helgen" | Hoyt (ukentlig) | /no/denne-helgen | Ukjent — bor vaere topp 3 |
| "hva skjer i bergen i kveld" | Middels (daglig) | /no/i-kveld | Ukjent |
| "konserter bergen i dag" | Middels | /no/konserter | Pos 8.9 — na langt ned |
| "bergen events this weekend" | Middels (EN turister) | /en/this-weekend | Pos 6.1, 0.2% CTR |
| "what to do in bergen today" | Middels | /en/today-in-bergen | Pos 8.1 |

---

## Del 3: Konkurrentkartlegging — hvem eier hva

### Visit Bergen (visitbergen.com) — Hovudkonkurrent
**Eier:** "hva skjer i bergen", "ting a gjore", "barn i bergen", festivaloversikter, "store byarrangement"
**Kategorier de har som vi mangler:** Omvisninger, Vinsmaking og mat, Konferanser/messer, Sport, Litteratur/debatt/foredrag
**Svakhet:** Ingen strukturert data (JSON-LD), treig oppdatering, ingen daglig/ukentlig dynamikk

### Ticketmaster (ticketmaster.no/discover/bergen)
**Eier:** "konserter bergen", "arrangementer bergen", "stand-up bergen"
**Svakhet:** Bare kommersielle events, ingen gratis/kultur, ingen lokal kontekst

### Tripadvisor
**Eier:** "ting a gjore bergen", "free things bergen", "nightlife bergen", "date bergen"
**Svakhet:** Statisk innhold, ikke event-basert, utdaterte anbefalinger

### BarniByen (barnibyen.no)
**Eier:** "gratis aktiviteter barn bergen", "barneaktiviteter bergen"
**Svakhet:** Ikke event-kalender, mer guide-format

### Songkick / Bandsintown
**Eier:** "concerts bergen 2026", "live music bergen"
**Svakhet:** Kun konserter, ingen norsk innhold, ingen lokal kontekst

### altomnorge.com — NY KONKURRENT
**Eier:** "hva skjer i bergen i dag", "det skjer i bergen"
**Merknad:** Ny aggregator som posisjonerer seg med SEO-optimaliserte artikler. Bor overvakes.

---

## Del 4: Prioritert handlingsplan

### FASE 1 — Fiks det vi har (uke 16-17) — CTR + kannibalisering

| # | Tiltak | Forventet effekt |
|---|--------|-----------------|
| 1.1 | **Fiks event-side titles** — dato+venue+artister i title tag for topp 10 events | +50-100 klikk/kvartal |
| 1.2 | **Sla sammen paskesider** — redirect /no/easter-bergen → /no/paske | +20-40 klikk |
| 1.3 | **Sla sammen 17. mai-sider** — redirect /no/17th-of-may-bergen → /en/17th-of-may-bergen | +10-20 klikk |
| 1.4 | **Optimaliser /no/konserter** — title "Konserter i Bergen denne uken", editorial intro | +15-30 klikk |
| 1.5 | **Optimaliser /no/guide** — title "Hva skjer i Bergen i dag — arrangementer og aktiviteter" | +10-20 klikk |

### FASE 2 — Nye collection-sider (uke 17-19) — content gaps

Prioritert etter sokepotensialet og hvor lite konkurranse det er:

| # | Ny collection | Slug NO / EN | Filter-logikk | Sokeord den fanger |
|---|--------------|-------------|----------------|-------------------|
| 2.1 | **Messer og markeder** | `/no/messer` | title match "messe\|marked\|fair\|expo" | barnas messe, friluftsmesse, platemesse, julemarked (overlapp OK) |
| 2.2 | **Stand-up og komedie** | `/no/stand-up` | category nightlife + title "stand-up\|comedy\|humor\|komedie" | stand-up bergen, komedie bergen, humor bergen |
| 2.3 | **Quiz og pub trivia** | `/no/quiz` | title match "quiz\|trivia\|quizkveld" | quiz bergen, pubquiz bergen, trivia bergen |
| 2.4 | **Sport og lop** | `/no/sport` | category sports OR title "lop\|maraton\|sykkel\|tur\|fjellsturen" | lopearrangementer bergen, 7-fjellsturen, bergenslopet |
| 2.5 | **Kurs og workshops** | `/no/kurs` | category workshop OR title "kurs\|workshop\|verksted" | kurs bergen, workshop bergen, kreativt kurs |

### FASE 3 — Engelske sider (uke 19-20) — turisttrafikk

| # | Ny/forbedret EN-side | Slug | Fanger |
|---|---------------------|------|--------|
| 3.1 | Rainy day guide | `/en/rainy-day-bergen` | "rainy day bergen", "indoor activities bergen" |
| 3.2 | Family weekend | `/en/family-weekend-bergen` | "bergen with kids", "family activities bergen" |
| 3.3 | Nightlife guide | `/en/nightlife-bergen` | "bergen nightlife", "bars bergen" |
| 3.4 | Forbedre /en/free-things-to-do-bergen | (eksisterer) | "free things to do bergen" — pos 21→5 |

### FASE 4 — Innholdsstrategi (lopende) — "ting a gjore"-segmentet

Vurdere en `/no/ting-a-gjore` + `/en/things-to-do-bergen` "hub page" som lenker til alle collections. Denne kan konkurrere med Tripadvisor/Visit Bergen pa det bredeste sokeordet. Krever:
- God editorial tekst (ikke bare eventliste)
- Intern lenking fra alle collections tilbake
- FAQ med "Hva kan man gjore i Bergen i dag?", "Hva er gratis i Bergen?" etc.

---

## Del 5: Maleindikator

| Mal | Na | Etter fase 1-2 | Etter fase 3-4 |
|-----|-----|-----------------|-----------------|
| Daglige organiske klikk | ~35 | ~50-60 | ~70-90 |
| Ikke-merke CTR | 1.7% | 3-4% | 5%+ |
| Collection-sider med >10 klikk/mnd | 3 | 8-10 | 12-15 |
| Topp 10-posisjoner (ikke-merke) | ~15 | ~25 | ~35 |
