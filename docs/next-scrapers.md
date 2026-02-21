# Next Scrapers to Build

**Status:** Research completed 2026-02-21. Ready for implementation.

---

## High Priority

### 1. Bymuseet i Bergen (`bymuseet.no/event`)
- **Covers 9 museums:** Bryggens Museum, Håkonshallen, Rosenkrantztårnet, Gamle Bergen, Hordamuseet, Lepramuseet, Schøtstuene, Skolemuseet, Damsgård
- **Method:** WordPress server-rendered HTML
- **Events:** 200+ (many are recurring daily tours through Oct 2026)
- **robots.txt:** Permissive (only blocks WooCommerce/wp-admin)
- **Event sitemap:** `bymuseet.no/sitemap_index.xml` → `event-sitemap.xml` (140 URLs)
- **Listing page:** `bymuseet.no/event` — shows title, date (DD.MM.YYYY), venue, description snippet
- **Detail pages:** `/event/[slug]/` — full schedule with times, venue+address, pricing table, booking link (`shop.bymuseet.no`)
- **Filtering:** URL params for location (`?location=hordamuseet`), type, audience, date range
- **Legal:** Low risk — public cultural institution, factual event data
- **Implementation notes:**
  - Scrape listing page for event URLs, then fetch each detail page for times/prices
  - OR use the event sitemap XML for all event URLs directly
  - Venue name from location filter or detail page
  - Booking links go to `shop.bymuseet.no` (not an aggregator)
  - Consider dedup: some Bymuseet events may appear in VisitBergen or Bergen Kommune

---

## Medium Priority (already partially covered)

### 2. Kvarteret Direct API (`kvarteret.no/api/events/`)
- **Already covered by:** TicketCo scraper (subdomain `kvarteret`)
- **Direct API benefit:** Richer data — price breakdown, Norwegian descriptions, category tags, organizer info
- **Events:** Only 1 at time of research (sparse listing)
- **Response:** JSON array with `event_start`, `event_end`, `ticket_url`, `translations[]`, `categories[]`, `price`
- **Verdict:** Low priority — TicketCo already captures these events

### 3. Hulen Direct
- **Already covered by:** TicketCo scraper (subdomain `hulen`)
- **Site uses:** Sanity CMS + TicketCo iframe widget
- **TicketCo widget:** `ticketco.events/no/nb/widgets/organizers/104/events`
- **Events:** ~19 concerts
- **Verdict:** Already covered, no additional scraper needed

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

### Akvariet (`akvariet.no`)
- **Blocker:** No discoverable events page with structured listings
- **Verdict:** Not scrapable

### Kunsthall 3,14
- **Blocker:** Wix-based, JS-rendered
- **Verdict:** Not scrapable with current tools

### Lydgalleriet
- **Blocker:** Webflow site with only 2-3 exhibitions at a time
- **Verdict:** Too low volume to justify a scraper

---

## Already Covered (No New Scraper Needed)

These venues/sources are already scraped by existing scrapers:

| Venue | Covered By |
|-------|-----------|
| Kvarteret | `ticketco.ts` (subdomain `kvarteret`) |
| Hulen | `ticketco.ts` (subdomain `hulen`) |
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

## Complete Scraper Inventory (43 files)

```
barnasnorge.ts        bergenlive.ts         brann.ts              dnt.ts
bek.ts                beyondthegates.ts     brettspill.ts         dvrtvest.ts
bergenbibliotek.ts    bitteater.ts          carteblanche.ts       eventbrite.ts
bergenchamber.ts      bjorgvinblues.ts      colonialen.ts         festspillene.ts
bergenfest.ts         bergenkommune.ts      cornerteateret.ts     floyen.ts
bergenfilmklubb.ts    bergenkjott.ts        dns.ts                forumscene.ts
grieghallen.ts        kulturhusetibergen.ts litthusbergen.ts      olebull.ts
harmonien.ts          kulturikveld.ts       mediacity.ts          oseana.ts
hoopla.ts             kunsthall.ts          nordnessjobad.ts      paintnsip.ts
kode.ts               ticketco.ts           raabrent.ts           studentbergen.ts
usfverftet.ts         visitbergen.ts        vvv.ts
```
