# Gåri — SEO & AI Search Playbook

**Created:** 2026-02-25
**Updated:** 2026-02-26
**Source:** Claude Desktop strategy analysis (full strategy in session artifact)
**Purpose:** Prioritized action plan for traditional SEO + AI search visibility

---

## Current state (what's already solid)

- ✅ SvelteKit SSR — pages render complete HTML, no indexing issues
- ✅ Event JSON-LD on detail pages — `eventAttendanceMode: OfflineEventAttendanceMode`, `inLanguage`, `offers` with price/priceCurrency, `eventStatus`, `BreadcrumbList`
- ✅ CollectionPage JSON-LD on all 8 collection pages
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

**1. Crawlable pagination**
The `LoadMore` button is a `<button>` — Googlebot cannot follow it. Events beyond the first ~12 displayed are invisible to search engines. This is likely the biggest hidden SEO problem on the site.

Fix: Change `LoadMore.svelte` to render an `<a href="?page=N">` link (styled as a button) instead of a `<button onclick>`. The `handleLoadMore` function already updates `?page=N` in the URL — the button just needs to be a real link that Googlebot can follow.
Apply to: homepage (`+page.svelte`) + all collection pages.

**2. Bing Webmaster Tools + IndexNow**
ChatGPT uses Bing's search infrastructure. If Gåri isn't in Bing, it cannot appear in ChatGPT search results.

Actions (manual, ~15 min):
- Sign up at bing.com/webmasters → add gaari.no → verify via DNS TXT or existing GSC connection (Bing can import from GSC)
- Submit sitemap: `https://gaari.no/sitemap.xml`
- Enable IndexNow in Bing Webmaster Tools (auto-notifies Bing on new/updated URLs)

**3. startDate timezone offset in Event JSON-LD**
Google requires ISO 8601 with timezone (e.g., `2026-06-20T20:00:00+02:00`). Currently `event.date_start` is passed directly — if stored without timezone, Google may reject the schema.

Fix: In `generateEventJsonLd()` in `seo.ts`, normalize `startDate`/`endDate` to include the Bergen timezone offset. Bergen is `+01:00` (CET) or `+02:00` (CEST). Use the existing `bergenOffset()` utility from `scripts/lib/utils.ts` — or create a frontend equivalent that appends the correct offset based on the date.

**4. ItemList inside CollectionPage JSON-LD**
Currently CollectionPage schema has no `mainEntity`. The strategy confirms: add `ItemList` with `ListItem` entries pointing to individual event detail URLs. This gives AI engines a machine-readable list of what's on the page.

Fix: Update `generateCollectionJsonLd()` in `seo.ts` to accept an `events` array and add:
```json
"mainEntity": {
  "@type": "ItemList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "url": "https://gaari.no/no/events/..." }
  ]
}
```

**5. AI referral tracking in Plausible**
Need to see which AI platforms send traffic. In Plausible, create a custom event `ai-referral` triggered when `document.referrer` matches known AI domains: `chat.openai.com`, `chatgpt.com`, `perplexity.ai`, `claude.ai`, `gemini.google.com`, `copilot.microsoft.com`.

Add to `app.html` as a small inline script, or use Plausible's Goals to track via UTM source matching. Note: free ChatGPT users don't send referrer — AI traffic is always underreported.

---

### IMPORTANT — Weeks 3–4

**6. Collection page editorial copy + answer capsules**
Collection pages currently have title + short description + event grid. No indexed text content beyond that.

Each collection page needs:
- 150–300 words of unique descriptive copy explaining the page's purpose
- 3–5 **answer capsules**: question H2 → 20–25 word direct answer immediately below (no links in the answer). This is the #1 driver of ChatGPT citations per empirical research.
- Example for `denne-helgen`:
  > **Hva skjer i Bergen denne helgen?**
  > Bergen har [N] arrangementer denne helgen, inkludert konserter, kunstutstillinger, familieaktiviteter og mye mer.

The event count can be injected server-side from `data.events.length`.

**7. FAQ schema on collection pages**
Add a small FAQ section to each collection page (3 questions max, tailored to the collection topic). Use `generateFaqJsonLd()` already built in `seo.ts`. Example for `gratis`:
- Q: Er alle arrangementer på denne siden gratis? A: Ja, alle arrangementer er registrert som gratis. Sjekk alltid hos arrangøren.
- Q: Finnes det gratis konserter i Bergen denne uken? A: Gåri viser alle gratis konserter og arrangementer i Bergen denne uken.

**8. BreadcrumbList on collection pages**
Currently only on event detail pages. Add to collection page `+page.svelte`:
`Home > Konserter i Bergen` / `Home > Denne helgen i Bergen` etc.
`generateBreadcrumbJsonLd()` is already in `seo.ts` — just needs to be called.

**9. Canonical strategy for filtered homepage views**
`?category=music` and `?bydel=Sentrum` produce substantially different content and should be indexable. Currently they use `replaceState` (no canonical tag change). Each should have a self-referencing canonical. Sort-order variants should canonical to unsorted. Filter combos producing <5 results should use `noindex`.

---

### MEDIUM TERM — Month 2–3

**10. Expand collection pages to ~20 (hub-and-spoke)**
Priority second wave:
- `/no/i-dag` — all today's events (not just evening)
- `/no/bydel/sentrum` + `/bergenhus` + `/fana` + `/nordnes` — neighborhood pages (Nordnes/Sandviken especially underserved)
- `/no/bergenfest-2026` — annual festival guide (persistent URL, updated each year)
- `/no/regndagsguide` — "hva kan man gjøre i Bergen når det regner" (high search volume, zero competition)
- `/no/julemarked-bergen` — seasonal (publish November)
- `/en/free-things-to-do-bergen` — tourists searching this have zero good results to find
- `/no/fadderuke-bergen` — student onboarding week (August, specific query, zero competition)

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

**15. Google Business Profile**
Create as "Event Planning Service" or "Tourist Information Center" — service-area business covering Bergen, no physical address needed. Links GBP to gaari.no and adds Bergen entity signals.

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

**Pagination is likely the biggest hidden problem**: Google only sees the first page of events. The entire event inventory beyond the first ~12 displayed is invisible to search crawlers.

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
5. **Editorial copy + answer capsules** on 8 collection pages — content work (ongoing)
6. ✅ **FAQ schema on collection pages** — `generateFaqJsonLdFromItems()`, 3 Q&A per collection, visible accordion (done 2026-02-26)
7. **New collection pages** — neighborhood pages, seasonal pages (ongoing)
8. ✅ **IndexNow integration** — `pingIndexNow()` in `scrape.ts`, key file committed (done 2026-02-26). Needs: GHA secret `INDEXNOW_KEY=10b12647d03f9ef9150742d712605119` + Bing Webmaster Tools manual signup.
9. **Sitemap segmentation** — optional, only needed if event count exceeds 50K

**Manual actions (not code):**
- [ ] Bing Webmaster Tools setup + sitemap submission (~15 min) — **do this now, unlocks ChatGPT citations**
- [ ] Add GHA secret `INDEXNOW_KEY = 10b12647d03f9ef9150742d712605119`
- [ ] Venue backlink outreach (ongoing, ~1 email/week)
- [ ] Google Business Profile setup (~30 min)
- [ ] Directory citations: Gulesider.no, Proff.no, 1881.no, Bergen Næringsråd (~1 hour total)
