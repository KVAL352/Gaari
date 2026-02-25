# Gåri — Strategic Roadmap: Progress Tracker

**Last updated:** 2026-02-26 (evening)

---

## Phase Status

| Phase | Description | Status |
|-------|-------------|--------|
| A | Analytics + UTM tracking | ✅ Done |
| B1 | Curated landing pages (8 collections) | ✅ Done |
| B2 | Social post pipeline (built, on hold) | ⏸ Paused |
| B3 | Hashtag + SEO strategy | ✅ Done |
| B4 | AI & search engine optimization | ✅ Done |
| B5 | New collection pages (expand inventory) | 🔜 Next |
| C | Promoted placement system | 🔜 Next |
| D | Optimization (newsletter, Stripe, etc.) | 📅 Future |

---

## Phase A — Foundation ✅

**Goal:** Measure every click from day one.

- ✅ Plausible Cloud analytics on gaari.no
- ✅ `buildOutboundUrl()` utility — UTM on all outbound links (`ticket_url`, `source_url`)
- ✅ UTM contexts: `event_card`, `event_detail`, `collection`

**Pending (do when you have 3–4 weeks of data):**
- [ ] Export Plausible outbound click data by `utm_campaign` (venue)
- [ ] Generate simple referral reports for top 5–10 venues (trust-building, not a sales pitch)
- [ ] Note warm contacts for Phase C outreach

---

## Phase B — Content Engine

### B1 — Curated landing pages ✅

8 collections live at `/[lang]/[collection]/`:

| Slug | Language | Filter |
|------|----------|--------|
| `denne-helgen` | NO | Weekend events |
| `i-kveld` | NO | Tonight (evening/night) |
| `gratis` | NO | Free events this week |
| `today-in-bergen` | EN | All events today |
| `familiehelg` | NO | Family + weekend |
| `konserter` | NO | Music this week |
| `studentkveld` | NO | Student evening/night |
| `this-weekend` | EN | Weekend events |

All in sitemap with hreflang (priority 0.8, daily). JSON-LD `CollectionPage` schema with ItemList. Custom OG images via Satori. Editorial copy + answer capsules on all 8 pages.

### B2 — Social post pipeline ⏸ Paused

Pipeline is built and working (`scripts/social/`), but social media accounts are not being created. Strategy pivot: focus on SEO + AI search for organic traffic instead. Social remains an option if accounts become available later.

- ✅ Code complete: image generation, captions, GHA cron, admin review at `/admin/social`
- ⏸ No Instagram / Facebook accounts — paused indefinitely
- ⏸ Social post pipeline removed from Phase C prerequisites

### B3 — Hashtag + SEO strategy ✅

- ✅ Collection descriptions target Bergen search queries
- ✅ `getCategoryHashtags()` for social captions (available when/if social resumes)

### B4 — AI & Search Engine Optimization ✅

> Full SEO + AI search playbook: `docs/seo-ai-playbook.md`

**Foundation (2026-02-25):**
- ✅ `static/llms.txt`, `static/robots.txt` — AI crawler allowance
- ✅ Enriched Organization + WebSite JSON-LD (Bergen Wikidata entity)
- ✅ FAQPage JSON-LD + accordion on about page
- ✅ Google Search Console verified + sitemap submitted
- ✅ hreflang nb/en/x-default on all pages

**Technical SEO (2026-02-26):**
- ✅ Crawlable pagination — `<a href>` instead of `<button>`, full event inventory indexable
- ✅ Event JSON-LD timezone — `toBergenIso()` with correct CET/CEST offset
- ✅ ItemList in CollectionPage JSON-LD — machine-readable event list for AI engines
- ✅ BreadcrumbList on collection pages
- ✅ FAQ schema + answer capsules on all 8 collection pages (H2+p, always visible)
- ✅ IndexNow integration — new events pinged to Bing/Yandex after each scrape
- ✅ Bing Webmaster Tools verified (CNAME) + sitemap submitted + `INDEXNOW_KEY` GHA secret
- ✅ Editorial copy (150–200 words) + answer capsules on all 8 collection pages

**Remaining manual:**
- ✅ Google Business Profile — created, logo + cover uploaded, verified (done 2026-02-26)
- [ ] Directory citations — Gulesider.no, Proff.no, 1881.no, Bergen Næringsråd (~1 hour)
- [ ] Venue backlink outreach — 1 email/week, start with USF Verftet, Bergen Kunsthall, Litteraturhuset

### B5 — New collection pages 🔜

More pages = more placement inventory = stronger sales pitch. Build before Phase C outreach.

**Priority second wave:**

| Slug | Language | Target query | Placement buyer |
|------|----------|-------------|-----------------|
| `i-dag` | NO | hva skjer i bergen i dag | Any venue |
| `free-things-to-do-bergen` | EN | free things to do bergen | Bergen Kunsthall, Bibliotek |
| `bydel/sentrum` | NO | arrangementer bergen sentrum | Sentrum venues |
| `bydel/nordnes` | NO | arrangementer nordnes | USF Verftet, Akvariet |
| `bergenfest-2026` | NO/EN | bergenfest 2026 program | Bergenfest |
| `regndagsguide` | NO | hva gjøre i bergen når det regner | Akvariet, VilVite, KODE |

Architecture: same `[lang]/[collection]/` route, new entries in `collections.ts`.

---

## Phase C — Promoted Placement 🔜

**Revised strategy:** Venues pay for top placement on SEO-optimized collection pages that rank for high-intent Bergen queries and get cited by ChatGPT/Bing. No social media component.

**Prerequisites before starting sales outreach:**
- ✅ Collection pages live + SEO-optimized (editorial copy, answer capsules, FAQ schema)
- ✅ Google Search Console + Bing Webmaster Tools set up
- ✅ IndexNow — new events submitted to Bing automatically
- [ ] 3–4 weeks of Plausible click data → venue referral reports
- [ ] B5 new collection pages built (more inventory = better pitch)
- [ ] Google Business Profile + directory citations done

**What to build:**
- [ ] Supabase tables: `promoted_placements`, `placement_log`
- [ ] Placement rotation logic in collection `+page.server.ts`
- [ ] "Fremhevet" badge on EventCard (conditional, labeled per markedsføringsloven § 3)
- [ ] Monthly report generation script
- [ ] Admin UI at `/admin/promotions`

**Sales pitch (revised):**
> "Gåri's collection pages rank for the exact queries your audience searches — hva skjer i Bergen denne helgen, konserter i Bergen, gratis Bergen. Your events appear at the top. We track every click we send you and share the report monthly."

**Sales sequence:**
1. Send referral reports to warm contacts (after 3–4 weeks of Plausible data)
2. Pitch meetings with 3–5 venues — concrete click numbers, no fluff
3. Close first 2–3 early bird clients (3 months free → paid September 2026)
4. Use early birds as case studies for remaining outreach

**Tiers (revised — no social posts component):**

| Tier | Target | NOK/mo | Top-3 share |
|------|--------|-------:|-------------|
| Grasrot | Volunteer orgs | 0 | — |
| Basis | Small independent venues | 1 500 | 15% |
| Standard | Mid-size venues | 3 500 | 25% |
| Partner | Large institutions | 7 000 | 35% |

**Target first clients:** Grieghallen (Partner), USF Verftet (Standard), KODE (Standard), Bergen Kunsthall (Basis)

**Collection → buyer mapping:**

| Collection | Primary buyer |
|------------|--------------|
| `denne-helgen` / `this-weekend` | Grieghallen, USF Verftet |
| `konserter` | Ole Bull, Forum Scene, Harmonien |
| `familiehelg` | Akvariet, KODE, VilVite |
| `studentkveld` | Kvarteret, DNS |
| `gratis` | Bergen Kunsthall, Bergen Bibliotek |
| `i-kveld` | Any venue with same-week inventory |
| `bydel/sentrum` | Grieghallen, Ole Bull, DNS |
| `bydel/nordnes` | USF Verftet, Akvariet |

---

## Phase D — Optimization 📅

After core business is running (months 5–12):

- [ ] Self-serve promoted placement signup + Stripe integration
- [ ] Newsletter (Buttondown or Resend) — weekly digest, same collection engine
- [ ] Visit Bergen data licensing pitch (NOK 50–100K/year)
- [ ] Ticketmaster affiliate program (Impact, ~1% commission)
- [ ] Social media — revisit if account situation resolves
- [ ] Additional seasonal collections (julebord, sommeren, innendørs, quiz)

---

## Revenue Targets

| Milestone | Monthly revenue | What it takes |
|-----------|----------------:|---------------|
| First revenue | 3 500 NOK | 1 Standard client (Sep 2026 after early bird) |
| Ramen profitable | 10 500 NOK | 1 Partner + 1 Standard |
| Sustainable | 28 500 NOK | 2 Partners + 3 Standards + 2 Basis |

**Operating costs:** ~100–350 NOK/mo (domains + Plausible). First Basis client covers all costs.

---

## Key Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Analytics | Plausible Cloud (€9/mo) | No cookies, no consent banner, full API for venue reports |
| Business entity | ENK (already registered) | Can invoice immediately; convert to AS at ~200K NOK/yr |
| Promoted content labeling | "Fremhevet" | Required by markedsføringsloven § 3 |
| Pricing visibility | Not public initially | Negotiate with first 2–3 clients to find market rate |
| Social media | Paused indefinitely | Account creation issues; SEO/AI search is stronger channel |
| Promoted placement pitch | Search placement only | Cleaner, measurable value prop without social |
| Sold-out events | Delete from DB | Prevents wasted user intent; 9 scrapers updated |
| AI search | Full stack (JSON-LD, IndexNow, answer capsules, Bing) | ChatGPT cites Bing results; now fully wired |

---

## Open Decisions

1. **More collection pages?** Yes — build B5 wave before Phase C outreach. Priority: `i-dag`, `free-things-to-do-bergen`, `bydel/` pages.
2. **Promoted prices public?** Not yet — negotiate first, publish after 2–3 reference clients.
3. **ENK → AS conversion?** At ~200K NOK/year revenue.
4. **Newsletter timing?** After 1,000+ monthly visitors.
5. **Reddit/forum strategy?** r/Bergen weekly "hva skjer" post — manual for now.
6. **Cruise ship day targeting?** `/en/today-in-bergen` weighted toward Sentrum on docking days. Nice-to-have.
