# Next Scrapers to Build

**Status:** Updated 2026-08-23. Most high-priority scrapers built. One remaining target (Hulen), plus one source we are waiting on (Homies Coffee).

---

## High Priority

### 1. Hulen (`hulen.no`)
- **Currently covered by:** TicketCo subdomain `hulen`
- **Direct scraper benefit:** Richer data from Sanity CMS
- **Method:** Next.js RSC + Sanity CMS (project ID: `gdx7kxvn`). Try Sanity API directly.
- **Events:** ~18 concerts
- **Verdict:** Worth building — important Bergen venue, Sanity API should be queryable

---

## Medium Priority (already partially covered)

### 2. Kvarteret Direct API (`kvarteret.no/api/events/`)
- **Already covered by:** TicketCo scraper (subdomain `kvarteret`)
- **Direct API benefit:** Richer data — price breakdown, Norwegian descriptions, category tags, organizer info
- **Events:** Only 1 at time of research (sparse listing)
- **Response:** JSON array with `event_start`, `event_end`, `ticket_url`, `translations[]`, `categories[]`, `price`
- **Verdict:** Low priority — TicketCo already captures these events

---

## Not Feasible (Technical Blockers)

### Bergen Kino (`bergenkino.no`)
- **Blocker:** Vue.js SPA, all movie/showtime data loaded via client-side JS
- **robots.txt:** Permissive (allows everything except `/my*`)
- **Sitemap:** Broken (returns `[object Object]` serialization)
- **API:** Internal methods discovered (`api.getMovies`, `api.getShowtimes`, `api.getDates`) but endpoints return 400 errors without proper client context
- **Movie URLs:** `/f/[slug]/[id]` pattern
- **Would need:** Headless browser (Playwright/Puppeteer) or reverse-engineering the Vue.js API calls via browser DevTools network tab
- **Verdict:** Too complex for current architecture (Cheerio-based). Could revisit if adding Playwright dependency.

### VilVite (`vilvite.no`)
- **Blocker:** Netflex CMS, JS-rendered program page
- **Verdict:** Not scrapable with current tools

### Kunsthall 3,14
- **Blocker:** Wix-based, JS-rendered
- **Verdict:** Not scrapable with current tools

### Lydgalleriet
- **Blocker:** Webflow site with only 2-3 exhibitions at a time
- **Verdict:** Too low volume to justify a scraper

---

## Venter på kilden (ingenting å scrape ennå)

Steder som med stor sannsynlighet får arrangementer, men som ikke har publisert
noe å hente ennå.

Disse overvåkes automatisk. `scripts/source-watch.json` holder én oppføring per
kilde, med `baselineUrls` som fasit: adressene sitemap inneholdt da vi undersøkte
den. Den daglige digesten henter sitemap for hver kilde og sier fra når settet
endrer seg, altså når kilden har publisert en ny side. Logikken ligger i
`scripts/lib/source-watch.ts`.

Vakten oppdaterer ikke fasiten selv. Den maser hver dag til et menneske har sett
på endringen og rettet `baselineUrls`. Uendrede kilder gir ingen seksjon i
digesten i det hele tatt.

I tillegg bør hver kilde ha en påminnelse i `reminders.json`, som en bakstopper
hvis kilden aldri får sitemap eller legger programmet på en plattform i stedet.

### Homies Coffee (`homiescoffee.com`)

- **Undersøkt:** 2026-08-23
- **robots.txt:** Fullt tillatende (`User-agent: *`, `Allow: /`), oppgir sitemap. Ingen hindring.
- **Status:** Ettsides ventelisteside. Sitemap inneholder bare forsiden og fem bildefiler.
  `/events`, `/event`, `/kalender`, `/calendar`, `/program`, `/whats-on`, `/agenda`,
  `/blog`, `/news` svarer alle 404. Null arrangementsdata.
- **Hvorfor den er interessant:** Markedsfører seg selv på pop-ups, DJ-kvelder og
  «coffee raves». Riktig innholdstype for Gåri, og det er ingen konkurrerende kilde
  som dekker den.
- **Selskap:** HOMIES AS, orgnr 938121567, Steinkjellergaten 8, 5003 Bergen, næring
  «Drift av restauranter», stiftet 22. juni 2026. Bydel blir Bergenhus (Sentrum).
  Merk: navn, by og bransje stemmer, men koblingen mellom selskapet og domenet er
  ikke bekreftet mot en primærkilde.
- **Kontakt:** Ingen adresse publisert. Den obfuskerte lenken på siden dekoder til
  malens plassholderverdi. Eneste åpne kanal er Instagram `@homiescoffeeclub`.
- **Domene:** Registrert 2. september 2025, utløp 2. september 2026. Sjekk at siden
  fortsatt lever før noe annet.
- **Overvåkes:** Ja, `id: homies` i `scripts/source-watch.json`. Fasit er den ene
  forsideadressen. Dukker det opp en adresse til, sier digesten fra samme dag.
- **Neste steg:** Påminnelse ligger til 2026-10-01 som bakstopper. Sannsynlig lavt
  volum, så vurder manuell innlegging framfor scraper. Manuelle kilder må inn i
  `SOURCE_RANK`, ellers sletter en scraper dem ved neste dedup.

---

## Already Covered (No New Scraper Needed)

These venues/sources are already scraped by existing scrapers:

| Venue | Covered By |
|-------|-----------|
| Akvariet | `akvariet.ts` (daily activity calendar, 14-day lookahead) |
| Bymuseet i Bergen | `bymuseet.ts` (WordPress HTML, event sitemap, 9 museums) |
| Det Akademiske Kvarter | `kvarteret.ts` + `ticketco.ts` (subdomain `kvarteret`) |
| Hulen | `ticketco.ts` (subdomain `hulen`) |
| Museum Vest | `museumvest.ts` (sitemap discovery, 3 Bergen museums) |
| Madam Felle | `ticketco.ts` (subdomain `madamefell`) |
| Victoria | `ticketco.ts` (subdomain `vic`) |
| Cinemateket | `ticketco.ts` (subdomain `cinemateketbergen`) |
| Borealis | `ticketco.ts` (subdomain `borealis`) |
| Nattjazz | `ticketco.ts` (subdomain `nattjazz`) |
| Litteraturhuset | `ticketco.ts` (subdomain `litthus`) + `litthusbergen.ts` |
| DNT Bergen | `dnt.ts` |
| Fløyen | `floyen.ts` |
| Forum Scene | `forumscene.ts` |
| Cornerteateret | `cornerteateret.ts` |
| USF Verftet | `usfverftet.ts` |
| DNS | `dns.ts` |
| Ole Bull | `olebull.ts` |
| Grieghallen | `grieghallen.ts` |
| KODE | `kode.ts` |
| Bergen Kunsthall | `kunsthall.ts` |
| Bergen Bibliotek | `bergenbibliotek.ts` |
| BIT Teatergarasjen | `bitteater.ts` |
| Harmonien | `harmonien.ts` |
| Oseana | `oseana.ts` |
| Carte Blanche | `carteblanche.ts` |
| Festspillene | `festspillene.ts` |
| Bergenfest | `bergenfest.ts` |
| Det Vestnorske Teateret | `dvrtvest.ts` |
| Bergen Kjøtt | `bergenkjott.ts` |
| Colonialen | `colonialen.ts` |
| Nordnes Sjøbad | `nordnessjobad.ts` |
| Paint'n Sip | `paintnsip.ts` |
| Bergen Filmklubb | `bergenfilmklubb.ts` |
| Råbrent | `raabrent.ts` |
| BEK | `bek.ts` |
| Beyond the Gates | `beyondthegates.ts` |
| SK Brann | `brann.ts` |
| Kulturhuset i Bergen | `kulturhusetibergen.ts` |
| VVV Festival | `vvv.ts` |

---

## Complete Scraper Inventory (46 files, 2 disabled)

```
akvariet.ts          barnasnorge.ts       bek.ts               bergenbibliotek.ts
bergenchamber.ts     bergenfest.ts        bergenfilmklubb.ts   bergenkjott.ts
bergenkommune.ts     bergenlive.ts        beyondthegates.ts    bitteater.ts
bjorgvinblues.ts     brann.ts             brettspill.ts        bymuseet.ts
carteblanche.ts      colonialen.ts        cornerteateret.ts    dns.ts
dnt.ts               dvrtvest.ts          eventbrite.ts        festspillene.ts
floyen.ts            forumscene.ts        grieghallen.ts       harmonien.ts
hoopla.ts            kode.ts              kulturhusetibergen.ts kunsthall.ts
kvarteret.ts         litthusbergen.ts     mediacity.ts         museumvest.ts
nordnessjobad.ts     olebull.ts           oseana.ts            paintnsip.ts
raabrent.ts          studentbergen.ts     ticketco.ts          usfverftet.ts
vvv.ts
```
