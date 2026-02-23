# Gåri — Project Context for Agents

**Last Updated:** February 23, 2026
**Owner:** Kjersti Valland Therkildsen
**Repo:** github.com/KVAL352/Gaari
**Location:** `C:\Users\kjers\Projects\Gaari\`
**Live:** Vercel hosting (SvelteKit) — gaari.no / gåri.no
**Full technical docs:** `C:\Users\kjers\Projects\Gaari\CLAUDE.md`

---

## What is Gåri?

A bilingual (Norwegian/English) event aggregator for Bergen, Norway. The name comes from Bergen dialect: "Ke' det går i?" means "What's going on?"

- **Frontend:** SvelteKit 2 + Svelte 5, Tailwind CSS 4, Funkis design system
- **Backend:** Supabase PostgreSQL
- **Scrapers:** 43 automated TypeScript scrapers (Cheerio), runs twice daily via GitHub Actions
- **AI:** Gemini 2.5 Flash generates bilingual event descriptions

## Current State (Feb 23, 2026)

### Homepage Filter: EventDiscovery

The homepage uses a **progressive pill-based discovery filter** that guides users step by step:

1. **Når? (When?)** — Always visible. Quick pills: I dag, I morgen, Denne helgen, Denne uken, Velg dato (inline calendar)
2. **Tid (Time of Day)** — Appears after date selection. Multi-select: Morgen, Dagtid, Kveld, Natt
3. **Hvem (Who)** — Appears after date selection. Single-select: Alle, Familie & Barn, Studenter, 18+, Turister
4. **Hva (What)** — Appears after date selection. Multi-select category pills (11 categories)

Additional:
- **Flere filtre** toggle reveals bydel (district) + price dropdowns
- **FilterBar is hidden** on homepage — EventDiscovery is the sole filter UI
- **URL params are the single source of truth** — all filters shareable via URL
- Components: `EventDiscovery.svelte`, `FilterPill.svelte`, `MiniCalendar.svelte`

### Price Disclaimer Policy

Scraped prices may be inaccurate. To reduce liability:
- **Soft language:** "Trolig gratis" / "Likely free" (never asserting "Gratis" / "Free")
- **Disclaimer:** "Sjekk alltid pris hos arrangør" / "Always verify price with organizer" on all event cards with known prices and on event detail pages
- Events with unknown prices show "Se pris" / "See price" (no disclaimer needed)

### Scraper Content Filtering

Non-public events are excluded from all scrapers:
- **Barnehage** (kindergarten) events — filtered in BarnasNorge, Bergen Kommune, Bergen Bibliotek
- **SFO** (after-school care) events — filtered in Bergen Bibliotek
- **School visits** (skoleklasse, skolebesøk, klassebesøk) — filtered in Bergen Bibliotek
- Keywords checked against title text, URL, and detail page content

### Key Business Rules

- **Norwegian first:** `title_no` required, English optional
- **No traffic to aggregators:** ticket URLs point to actual venue/ticket pages
- **Rate limiting:** 1–3s delays between scraper requests
- **Honest User-Agent:** `Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)`
- **Opt-out system:** Venues can request removal via `/datainnsamling` form

### Technical Quick Reference

| Area | Details |
|------|---------|
| Categories | music, culture, theatre, family, food, festival, sports, nightlife, workshop, student, tours |
| Bydeler | Sentrum, Bergenhus, Fana, Ytrebygda, Laksevåg, Fyllingsdalen, Åsane, Arna |
| TimeOfDay | morning (6–12), daytime (12–17), evening (17–22), night (22–6) |
| URL params | `when`, `time`, `audience`, `category`, `bydel`, `price`, `q`, `page` |
| 18+ filter | Excludes family events (not just explicitly tagged 18+) |
| Multi-select | Category supports comma-separated: `?category=music,culture` |

### Frontend Routes

- `/[lang]/` — Homepage with EventDiscovery filter
- `/[lang]/events/[slug]/` — Event detail page
- `/[lang]/about/` — About page
- `/[lang]/datainnsamling/` — Data transparency + opt-out form
- `/[lang]/submit/` — Event submission (blocked from search engines)

### 20 Frontend Components

Key new components (Feb 23):
- `EventDiscovery.svelte` — Progressive 4-step filter with inline calendar
- `FilterPill.svelte` — Reusable pill button (44px touch targets, aria-pressed)
- `MiniCalendar.svelte` — Inline month-grid date picker (single + range, bilingual)

### Hosting & Domains

- **Hosting:** Vercel (SvelteKit adapter)
- **Domains:** `gaari.no`, `www.gaari.no`, `gåri.no` (IDN, punycode: `xn--gri-ula.no`), `www.gåri.no`
- **DNS:** Domeneshop → Vercel (A record `76.76.21.21`, CNAME `cname.vercel-dns.com`)
- **SSL:** Auto-provisioned by Vercel (Let's Encrypt)

### GitHub Actions

- **CI:** lint, type-check, build on push/PR
- **Scrape:** cron at 6 AM & 6 PM UTC, 15min timeout
