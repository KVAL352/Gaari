# Gåri — Project Strategy

**Tagline:** Ke det går i Bergen?
**Purpose:** A bilingual (NO/EN) event aggregator for Bergen kommune — one place to find everything happening in the city, from big concerts to small community events.

---

## 1. Target Audience

**Event-goers:** People in Bergen looking for things to do — locals, students, expats, tourists.
**Event organizers:** Venues, clubs, associations, municipalities wanting to reach people.

**Geography:** Bergen kommune (all bydeler)
**Language:** Bilingual Norwegian / English

---

## 2. Core Features

### MVP (v1) — Built
- Event listing with date, time, location, category, description
- Filter by category (music, culture, theatre, family, food, festival, sports, nightlife, workshop, student, tours)
- Filter by bydel/area
- Filter by date ("tonight", "this weekend", date range) via EventDiscovery progressive filter
- One-click calendar export (ICS) via CalendarDropdown
- Mobile-friendly responsive design
- Organizer submission form (all submissions reviewed before publishing)
- Community "suggest correction" on existing events
- Bilingual NO/EN interface
- 13 curated collection landing pages (SEO + paid placement)
- Promoted placement system for paying venues

### v2
- Map view
- Weekly email digest ("This week in Bergen")
- User accounts / saved favorites
- Search autocomplete

### Later
- API for other apps
- Organizer dashboard with analytics
- Self-serve promoted placement signup + Stripe
- Social features (going/interested)

---

## 3. Data Model

### Event
| Field | Type | Notes |
|-------|------|-------|
| title_no | text | Norwegian title |
| title_en | text | English title (optional) |
| description_no | text | Norwegian description (AI-generated) |
| description_en | text | English description (AI-generated, optional) |
| category | enum | music, culture, theatre, family, food, festival, sports, nightlife, workshop, student, tours |
| date_start | datetime | Start date and time |
| date_end | datetime | End date and time (optional) |
| recurring | json | Pattern for recurring events (null for one-off) |
| venue_name | text | Name of venue |
| address | text | Street address |
| bydel | enum | Sentrum, Bergenhus, Fana, Ytrebygda, Laksevåg, Fyllingsdalen, Åsane, Arna |
| latitude | float | For future map view |
| longitude | float | For future map view |
| price | text | "Free", amount, or "See link" |
| ticket_url | url | External ticket link (optional) |
| source | text | Where this event data came from |
| source_url | url | Original listing URL (unique — used for dedup and opt-out) |
| image_url | url | Event image (optional, hotlinked from source) |
| age_group | enum | all, family, 18+, students |
| status | enum | pending, approved, cancelled |
| created_at | timestamp | When inserted |

### Edit Suggestion
| Field | Type | Notes |
|-------|------|-------|
| event_id | reference | Which event |
| field | text | Which field to change |
| old_value | text | Current value |
| new_value | text | Suggested value |
| reason | text | Why (optional) |
| status | enum | pending, approved, rejected |

### Recurring Events
- Store pattern: `{"type": "weekly", "day": "thursday", "time": "19:00"}`
- Auto-generate individual event entries from pattern
- Individual occurrences can be overridden (cancelled, time changed)

---

## 4. Data Sources

### Phase 1 — Automated scraping (current)

44 active Cheerio-based scrapers covering:
- **General aggregators (6):** Visit Bergen, Bergen Kommune, StudentBergen, Bergen Live, Eventbrite, Hoopla
- **Ticket platforms (3):** TicketCo (multi-venue), Eventbrite, Hoopla
- **Performance venues (10):** Den Nationale Scene, Grieghallen, Ole Bull Huset, USF Verftet, Forum Scene, Cornerteateret, Det Vestnorske Teateret, BIT Teatergarasjen, Carte Blanche, Bergen Filharmoniske
- **Arts, culture & literature (6):** Bergen Kunsthall, KODE, Litteraturhuset, Media City Bergen, BEK, Bergen Filmklubb
- **Libraries, museums & landmarks (5):** Akvariet i Bergen, Bergen Bibliotek, Bymuseet i Bergen, Museum Vest, Fløyen
- **Food, nightlife & recreation (7):** Bergen Kjøtt, Colonialen, Råbrent, Paint'n Sip, Brettspill-cafe, Bjørgvin Blues Club, Nordnes Sjøbad
- **Sports & outdoor (2):** SK Brann, DNT Bergen
- **Festivals (4):** Festspillene, Bergenfest, Beyond the Gates, VVV
- **Other venues (3):** Kulturhuset i Bergen, Bergen Chamber, Oseana

Full source list in CLAUDE.md. Note: BarnasNorge scraper disabled Feb 25, 2026 — all venues now covered by dedicated scrapers.

### Phase 2 — Organizer outreach (future)
- Direct contact with major venues for iCal feeds or data agreements
- Student organizations (Kvarteret, Studentersamfunnet)
- Sports clubs via Idrettsrådet i Bergen
- Festival organizers (Festspillene, Bergenfest, Nattjazz, Borealis)

### Phase 3 — Self-sustaining (future)
- Organizer self-submission (main source)
- Community contributions and corrections
- Automated RSS/iCal feeds from partner venues

---

## 5. Moderation Model

- **Scraped events:** Inserted as `approved` automatically after passing deduplication and opt-out checks
- **Submitted events:** All organizer submissions start as `pending` — reviewed by admin before publishing
- **Existing events:** Community can "suggest correction" (reviewed before applied)
- **Opt-out system:** Venues can request removal via `/datainnsamling` — domain-based, approved by admin, pipeline enforces removal
- **Sold-out events:** Deleted from the database by scrapers on detection — prevents sending users to unavailable events
- **Verified organizers (v2):** Trusted organizers can auto-publish

---

## 6. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | SvelteKit 2 + Svelte 5 | Fast, great DX, excellent SSR — eliminates client-side data waterfall |
| Backend/DB | Supabase (PostgreSQL) | Database, storage, RLS — skip building 80% of backend |
| Hosting | Vercel | Auto-deploy from git, CDN edge, ISR caching |
| Domain | gåri.no + gaari.no | Both registered at Domeneshop → Vercel DNS |
| Fonts | Inter + Barlow Condensed (self-hosted woff2, no Google Fonts) | No external DNS roundtrip, CSP-safe, FCP improved from 3.8s → 1.7s |
| Email | gaari.bergen@proton.me | Project email |
| Analytics | Plausible Cloud (€9/mo) | No cookies, GDPR-compliant, UTM tracking, API for venue referral reports |
| AI Descriptions | Gemini 2.5 Flash | Bilingual event summaries <160 chars — avoids copyright issues |
| CI/CD | GitHub Actions | Lint/type-check/test/build on push + twice-daily scraping (6 AM & 6 PM UTC) |

### Why This Stack
- Server-side rendering means data arrives pre-rendered in HTML — no client-side fetch waterfall. Lighthouse Performance 95.
- Supabase provides database + storage + row-level security — no custom auth or API to build
- Vercel free tier handles current traffic. Plausible (€9/mo) is the only recurring cost besides domains (~150 NOK/year).

---

## 7. Site Structure

All public routes are language-prefixed (`/no/` or `/en/`). Norwegian is the default.

```
/[lang]/                    → Homepage with EventDiscovery filter
/[lang]/about/              → About page (prerendered)
/[lang]/datainnsamling/     → Data transparency + opt-out form
/[lang]/events/[slug]/      → Event detail page
/[lang]/submit/             → Event submission form (noindex)
/[lang]/[collection]/       → 13 curated collection pages

/admin/promotions           → Promoted placement management
/admin/social               → Social post review
/api/health                 → Health check endpoint
/og/[slug].png              → Per-event OG images
/sitemap.xml                → Dynamic sitemap with hreflang
```

**Collections:** denne-helgen, i-kveld, gratis, today-in-bergen, familiehelg, konserter, studentkveld, this-weekend, i-dag, free-things-to-do-bergen, regndagsguide, sentrum, voksen

**URL slug format:** `{slugified-title}-{YYYY-MM-DD}` (e.g., `bergenfest-apning-2026-03-15`)

---

## 8. Legal Considerations

**Approach taken:**
- HTML scraping with honest User-Agent (`Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)`)
- robots.txt respected on all scraped sources
- AI-generated descriptions (Gemini 2.5 Flash) — never copying copyrighted source text (åndsverksloven §§ 2–3)
- Only factual information aggregated: title, date, venue, price (not copyrightable)
- Opt-out system for any venue that objects
- Paid promoted content labeled "Fremhevet"/"Featured" (markedsføringsloven § 3)

**Must respect:**
- robots.txt on all sites
- GDPR for any personal data
- Copyright on editorial content — always generate, never copy
- Terms of service

**Avoid:**
- Scraping behind logins or paywalls
- Copying source descriptions or images
- Creating fake accounts
- Sending traffic to aggregator domains (ticket_url must point to actual venue/ticket pages)

---

## 9. Launch Strategy

1. ✅ Build MVP with SvelteKit + Supabase
2. ✅ Populate with events — 45 scrapers (43 active) run twice daily, 200+ events at any time
3. Soft launch — in progress (waiting for 3–4 weeks of analytics data before venue outreach)
4. Venue outreach — Phase C infrastructure built; outreach pending Plausible click data (venue referral reports)
5. ~~Social media~~ — paused (account creation issues); SEO + AI search is primary traffic channel
6. Iterate based on data

---

*Strategy document created: February 18, 2026*
*Last updated: February 26, 2026*
*Status: MVP live — pre-launch phase (analytics collection + SEO indexing)*
