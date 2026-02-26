# Gåri — SEO & AI Search Playbook

**Created:** 2026-02-25
**Updated:** 2026-02-26
**Source:** Claude Desktop strategy analysis (full strategy in session artifact)
**Purpose:** Prioritized action plan for traditional SEO + AI search visibility

---

## Current state (what's already solid)

- ✅ SvelteKit SSR — pages render complete HTML, no indexing issues
- ✅ Event JSON-LD on detail pages — `eventAttendanceMode: OfflineEventAttendanceMode`, `inLanguage`, `offers` with price/priceCurrency, `eventStatus`, `BreadcrumbList`
- ✅ CollectionPage JSON-LD on all 13 collection pages
- ✅ BreadcrumbList JSON-LD on event detail pages
- ✅ FAQPage JSON-LD on about page
- ✅ Organization + WebSite JSON-LD enriched with Bergen Wikidata entity
- ✅ hreflang (nb/en/x-default) on all pages
- ✅ Dynamic sitemap with all events + collections
- ✅ Google Search Console verified + sitemap submitted
- ✅ robots.txt with explicit AI crawler allowance (GPTBot, ClaudeBot, PerplexityBot, etc.)
- ✅ llms.txt (note: no major AI company has confirmed using it — keep at zero maintenance cost, but not a high-value strategy)
- ✅ ISR caching (s-maxage=300), self-hosted fonts, Lighthouse Performance 95
- ✅ Plausible analytics + UTM on all outbound links

---

## Gap analysis by priority

### CRITICAL — Do first (biggest impact, buildable now)

**✅ 1. Crawlable pagination (done 2026-02-26)**
The `LoadMore` button was a `<button>` — Googlebot cannot follow it. Events beyond the first ~12 displayed were invisible to search engines. This was likely the biggest hidden SEO problem on the site.

Fix: Changed `LoadMore.svelte` to render an `<a href="?page=N">` link (styled as a button) instead of a `<button onclick>`. The `handleLoadMore` function already updates `?page=N` in the URL — the button just needs to be a real link that Googlebot can follow.
Applied to: homepage (`+page.svelte`) + all collection pages.

**✅ 2. Bing Webmaster Tools + IndexNow (done 2026-02-26)**
ChatGPT uses Bing's search infrastructure. If Gåri isn't in Bing, it cannot appear in ChatGPT search results.

Actions completed:
- Signed up at bing.com/webmasters → added gaari.no → verified via CNAME
- Submitted sitemap: `https://gaari.no/sitemap.xml`
- IndexNow integrated into scraper pipeline (`pingIndexNow()` in `scrape.ts`), key file committed, GHA secret added

**✅ 3. startDate timezone offset in Event JSON-LD (done 2026-02-26)**
Google requires ISO 8601 with timezone (e.g., `2026-06-20T20:00:00+02:00`). Previously `event.date_start` was passed directly — without timezone, Google may reject the schema.

Fix: Created `toBergenIso()` in `seo.ts` that converts UTC timestamps to ISO 8601 with correct Bergen timezone offset (+01:00 CET or +02:00 CEST based on date). Applied to `generateEventJsonLd()` for `startDate`/`endDate`.

**✅ 4. ItemList inside CollectionPage JSON-LD (done 2026-02-26)**
CollectionPage schema previously had no `mainEntity`. Added `ItemList` with `ListItem` entries pointing to individual event detail URLs, giving AI engines a machine-readable list of what's on the page.

Fix: Updated `generateCollectionJsonLd()` in `seo.ts` to accept an `events` array and add:
```json
"mainEntity": {
  "@type": "ItemList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "url": "https://gaari.no/no/events/..." }
  ]
}
```
Capped at 50 items. Positions are 1-indexed.

**5. AI referral tracking in Plausible ✅ Done (2026-02-26)**
Inline script in `app.html` checks `document.referrer` against 9 AI domains and fires `window.plausible('ai-referral', { props: { source: domain } })`. Runs immediately after the Plausible queue stub so events are queued even before the async Plausible script loads. Domains tracked: chatgpt.com, chat.openai.com, perplexity.ai, claude.ai, gemini.google.com, copilot.microsoft.com, deepseek.com, you.com, phind.com.

**Manual step still needed:** Add "ai-referral" goal in Plausible dashboard → Settings → Goals → Add goal → Custom event → name: `ai-referral`.

**Important caveat:** Free ChatGPT users don't send referrer data (ChatGPT app opens links without a referrer header). AI traffic is always underreported in analytics — treat numbers as a floor, not a ceiling.

---

### IMPORTANT — Weeks 3–4

**✅ 6. Collection page editorial copy + answer capsules (done 2026-02-26)**
Collection pages previously had title + short description + event grid. No indexed text content beyond that.

Each collection page now has:
- 150–200 words of unique descriptive copy explaining the page's purpose
- 3–5 **answer capsules**: question H2 → 20–25 word direct answer immediately below (no links in the answer). This is the #1 driver of ChatGPT citations per empirical research.
- Example for `denne-helgen`:
  > **Hva skjer i Bergen denne helgen?**
  > Bergen har [N] arrangementer denne helgen, inkludert konserter, kunstutstillinger, familieaktiviteter og mye mer.

The event count is injected server-side from `data.events.length`. All 13 collections have editorial copy + answer capsules.

**✅ 7. FAQ schema on collection pages (done 2026-02-26)**
Added a small FAQ section to each collection page (3 questions max, tailored to the collection topic). Uses `generateFaqJsonLdFromItems()` in `seo.ts` with visible accordion. Example for `gratis`:
- Q: Er alle arrangementer på denne siden gratis? A: Ja, alle arrangementer er registrert som gratis. Sjekk alltid hos arrangøren.
- Q: Finnes det gratis konserter i Bergen denne uken? A: Gåri viser alle gratis konserter og arrangementer i Bergen denne uken.

**✅ 8. BreadcrumbList on collection pages (done 2026-02-26)**
Previously only on event detail pages. Added to collection page `+page.svelte`:
`Home > Konserter i Bergen` / `Home > Denne helgen i Bergen` etc.
`generateBreadcrumbJsonLd()` called from `[collection]/+page.svelte`.

**9. Canonical strategy for filtered homepage views ✅ Done (2026-02-26)**
`computeCanonical()` in `seo.ts` + `+page.server.ts`. Rules: single category/bydel → self-referencing canonical; category+bydel combined → canonical to category version; ?when=weekend/today → canonical to collection page; pagination → keep page param; noise params (time, price, audience) stripped. noindex when filtered event count <5 (thin content). 21 tests in `seo.test.ts`.

---

### MEDIUM TERM — Month 2–3

**10. Expand collection pages to ~20 (hub-and-spoke)**
Priority second wave (done and remaining):
- ✅ `/no/i-dag` — all today's events (done 2026-02-26)
- ✅ `/no/sentrum` — Bergen sentrum bydel, 2-week view (done 2026-02-26)
- ✅ `/no/regndagsguide` — indoor/rainy day events, 2-week view (done 2026-02-26)
- ✅ `/en/free-things-to-do-bergen` — free events, 2-week view (done 2026-02-26)
- ✅ `/no/voksen` — adult culture/music/theatre/tours/food/workshop, 2-week view (done 2026-02-26)
- `/no/bergenfest-2026` — annual festival guide (persistent URL, updated each year)
- `/no/julemarked-bergen` — seasonal (publish November)
- `/no/fadderuke-bergen` — student onboarding week (August, specific query, zero competition)
- Neighborhood pages (`/bergenhus`, `/fana`, `/nordnes`) — still to-do

Architecture: same single `[lang]/[collection]/` route with new entries in `collections.ts`.

**11. Venue backlink outreach**
For each of the 44+ scraped sources, request a "Se alle arrangementer på Gåri" link. Gåri already drives traffic to them — this is a mutual-benefit ask, not a cold pitch. Start with highest-click venues from Plausible reports.
Priority order: Grieghallen, USF Verftet, DNS, KODE, Ole Bull, Forum Scene, Kvarteret.

**12. Expired event handling — 410 responses**
Currently past events are deleted from DB (go to 404). For events with inbound links, a 410 Gone is processed faster by Google. For recurring annual events (Bergenfest, 17. mai), keep the URL and update for the next occurrence — this accumulates ranking signals.

Strategy:
- Recurring events → update in place, same URL each year
- One-off past events with no links → 404 (current, fine)
- Past events with inbound links → 301 redirect to venue page or category page

**13. IndexNow auto-submission**
After Bing Webmaster Tools is set up, implement IndexNow to auto-notify Bing/Yandex when new events are scraped. Options:
- Add IndexNow ping to `insertEvent()` in `scripts/lib/utils.ts`
- Or add a GHA step after scrape that pings `api.indexnow.org` with new event URLs

**14. Sitemap segmentation**
Current sitemap has all URLs in one file. Segment into:
- `/sitemap-events.xml` — all events (up to 50K URLs)
- `/sitemap-collections.xml` — 8 collection pages
- `/sitemap-static.xml` — about, datainnsamling, homepage
- `/sitemap-index.xml` — references the above

---

### LONGER TERM — Month 3–6

**✅ 15. Google Business Profile (done 2026-02-26)**
Created as service-area business covering Bergen, verified. Logo + cover uploaded. Links GBP to gaari.no and adds Bergen entity signals.

**16. Norwegian directory citations**
Register on: Gulesider.no, Proff.no, 1881.no, Startside.no, Bergen Næringsråd, TripAdvisor.
Each is a citation signal + potential backlink.

**17. Bergen Events annual data report**
Original data = #2 strongest AI citation driver. Create "Bergen Events-rapport 2026": total events aggregated, most popular categories, busiest venues, seasonal peaks. Pitch to Bergens Tidende, Bergensavisen, NRK Vestland. One good media mention = high-DA backlink + AI training data.

**18. Embeddable event widget**
Small iframe/script venues can embed on their own site showing "Kommende arrangementer" from Gåri. Each embed is a backlink. Low-effort to build (a minimal endpoint returning a styled event list).

**19. Neighborhood event pages**
Events filtered by bydel as proper landing pages with editorial copy. Bergen's bydeler are underserved by every competitor. `/no/arrangementer/sentrum`, `/nordnes`, `/sandviken`, etc.

---

## Key findings to keep in mind

**Bing = ChatGPT**: Submit to Bing Webmaster Tools before anything else for AI visibility. This single action opens ChatGPT citations.

**Answer capsules > everything else for AI**: 20–25 word direct answers immediately after a question H2, with zero links in the answer. This is the empirically strongest ChatGPT citation signal, 4.2× more likely to be cited.

**llms.txt is unproven**: No major AI company has confirmed using it during crawling. Google's John Mueller confirmed Google ignores it. Keep the existing file (zero maintenance), but don't invest further effort here.

**Pagination is likely the biggest hidden problem**: Google only sees the first page of events. The entire event inventory beyond the first ~12 displayed is invisible to search crawlers. (Fixed 2026-02-26 — crawlable `<a>` links)

**Norwegian = structural advantage**: Norwegian-language content faces significantly lower competition than English. Well-optimized Norwegian pages rank faster and punch above their weight.

**Freshness matters for AI citations**: Most ChatGPT citations happen within 2–3 days of publishing. Gåri's twice-daily scrape is a real competitive advantage — lean into it with "Updated today" signals in page content.

**No competitor owns the recurring queries**: "Hva skjer i Bergen denne helgen", "i dag", "i kveld" — no one has dedicated, auto-updating pages for these. Gåri does. This is the biggest SEO opportunity.

---

## Implementation order (what to build next in Claude Code)

Ordered by impact-per-effort:

1. ✅ **Crawlable pagination** — `LoadMore.svelte` → `<a href data-sveltekit-noscroll>` (done 2026-02-26)
2. ✅ **startDate timezone normalization** — `toBergenIso()` in `seo.ts`, applied to Event JSON-LD (done 2026-02-26)
3. ✅ **ItemList in CollectionPage JSON-LD** — `generateCollectionJsonLd()` accepts events[], adds mainEntity (done 2026-02-26)
4. ✅ **BreadcrumbList on collection pages** — called from `[collection]/+page.svelte` (done 2026-02-26)
5. ✅ **Editorial copy + answer capsules** on all 13 collection pages (done 2026-02-26)
6. ✅ **FAQ schema on collection pages** — `generateFaqJsonLdFromItems()`, 3 Q&A per collection, visible accordion (done 2026-02-26)
7. **New collection pages** — neighborhood pages, seasonal pages (ongoing)
8. ✅ **IndexNow integration** — `pingIndexNow()` in `scrape.ts`, key file committed, GHA secret added (done 2026-02-26).
9. **Sitemap segmentation** — optional, only needed if event count exceeds 50K

**Manual actions (not code):**
- ✅ Bing Webmaster Tools verified (CNAME) + sitemap submitted + GHA secret added (done 2026-02-26)
- [ ] Venue backlink outreach (ongoing, ~1 email/week)
- ✅ Google Business Profile created, logo + cover uploaded, verified (done 2026-02-26)
- [ ] Directory citations: Gulesider.no, Proff.no, 1881.no, Bergen Næringsråd (~1 hour total)
