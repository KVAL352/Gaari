# Bergen Events Competitor SEO Audit

**Date**: 2026-04-15
**Fetched by**: Claude Code via WebFetch
**Note**: 4 of 6 pages were blocked by tool permissions. Data available for en.visitbergen.com and ticketmaster.no. The remaining 4 pages (visitbergen.com/hva-skjer, altomnorge, barnibyen, bergenlive) need manual fetching or a browser-based audit tool.

---

## Comparison Table

| Feature | en.visitbergen.com/whats-on | ticketmaster.no/discover/bergen | visitbergen.com/hva-skjer | altomnorge.com/.../bergen-... | barnibyen.no/bergen/ | bergenlive.no/konsertkalender |
|---|---|---|---|---|---|---|
| **Title tag** | "What's On in Bergen and the region - visitBergen.com" (approx) | "Arrangementer i Bergen - Oppdag hva som skjer i Bergen \| Ticketmaster" | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| **Meta description** | Not found / not set | Not found / not set | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| **H1** | "What's on in Bergen" + "What's On in Bergen and the region" | No H1 tag present | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| **JSON-LD types** | None | Event, BreadcrumbList | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| **Word count (approx)** | 1,200-1,400 | 8,000-10,000 | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| **Internal links** | ~90+ | ~150+ | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| **FAQ section** | No | No | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| **Editorial text** | Yes - cultural heritage copy about Bergen's music scene, composers, orchestras | No - pure event listings | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| **Schema markup** | None | Event + BreadcrumbList (detailed per-event) | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| **Breadcrumbs** | Yes (visual: Home > What's On) | Yes (structured data: Home > Cities > Bergen) | BLOCKED | BLOCKED | BLOCKED | BLOCKED |
| **Hreflang** | Not detected | Not detected | BLOCKED | BLOCKED | BLOCKED | BLOCKED |

---

## Detailed Findings

### 1. en.visitbergen.com/whats-on (FETCHED)

- **Strengths**: Editorial intro text about Bergen's cultural scene; category discovery cards (Concerts, Festivals, Shows/Theatre/Opera, Family Friendly, Exhibitions, Sports, Literature, Film, Conferences, Music Venues); multi-language navigation (NO/EN/DE); breadcrumb navigation; massive internal link network (~90+)
- **Weaknesses**: No JSON-LD structured data at all; no meta description; duplicate H1 tags; no FAQ section; no Event schema despite being an event page
- **Content structure**: Hero image section -> date/type filter panel -> "Discover more" section with 10 category cards -> editorial text about Bergen -> footer with extensive links

### 2. ticketmaster.no/discover/bergen (FETCHED)

- **Strengths**: Rich Event schema markup per listing (dates, venues, performers, pricing); BreadcrumbList structured data; very high content volume (8-10k words); chronological card grid with clear dates
- **Weaknesses**: No editorial content at all; no meta description; missing H1 tag; no FAQ section; purely transactional
- **Content structure**: Header with search -> chronological event card grid (April 15-18, 2026 visible) -> event cards with name, date/time, venue, ticket status

### 3-6. visitbergen.com/hva-skjer, altomnorge, barnibyen, bergenlive (NOT FETCHED)

These pages were blocked by tool permissions and need manual audit.

---

## What gaari.no Can Learn

### From Visit Bergen (en.visitbergen.com)
1. **Add editorial intro text to collection pages**: Visit Bergen wraps its listings in cultural context ("Bergen is a buzzing city..."). Gaari's collection pages could benefit from short editorial intros that serve both users and Google's helpful content signals.
2. **Category discovery cards**: The 10 visual category cards (Concerts, Festivals, Family, etc.) are a strong internal linking pattern. Gaari already has collection pages -- surfacing them as visual cards on the main event page would boost discoverability and crawlability.
3. **Multi-language navigation**: Visit Bergen has NO/EN/DE. Gaari has NO/EN but should ensure hreflang tags are properly set (Visit Bergen appears to lack them too -- an opportunity to do it better).

### From Ticketmaster (ticketmaster.no)
4. **Implement Event schema on event detail pages**: Ticketmaster has rich Event JSON-LD per listing. This is the single biggest SEO gap for any event site. Gaari should ensure every event detail page has Event schema with name, startDate, location, offers, performer where applicable.
5. **BreadcrumbList schema**: Ticketmaster uses structured breadcrumbs. Gaari should add BreadcrumbList JSON-LD to collection and event pages.
6. **High content volume matters**: Ticketmaster's 8-10k words of event content on a single page signals topical authority. Gaari's collection pages should aim for substantial event counts.

### General Observations
7. **Neither competitor has FAQ sections**: This is a clear opportunity. Adding FAQ schema to collection pages (e.g., "Hva skjer i Bergen i dag?", "Hvor finner jeg gratisarrangementer i Bergen?") could win featured snippets.
8. **Neither competitor has meta descriptions on these pages**: Both are missing this basic SEO element. Gaari should ensure every collection and listing page has a unique, keyword-rich meta description.
9. **Visit Bergen lacks Event schema entirely**: Despite being the official tourism site, they have zero structured data on their events page. Gaari can outperform them in rich results by implementing proper Event + FAQPage schema.
10. **Editorial + structured data = the winning combo**: Visit Bergen has editorial but no schema. Ticketmaster has schema but no editorial. The competitor that combines both will win. Gaari is well-positioned to be that competitor.

### Priority Actions for gaari.no
1. **HIGH**: Add Event JSON-LD to all event detail pages (if not already present)
2. **HIGH**: Add BreadcrumbList JSON-LD to collection pages
3. **HIGH**: Ensure meta descriptions exist on all collection pages
4. **MEDIUM**: Add FAQPage schema to collection pages (easy featured snippet wins)
5. **MEDIUM**: Add editorial intro paragraphs to top collection pages
6. **LOW**: Add visual category discovery cards to the main event listing page

---

## Pages That Need Manual Re-audit

Run these in a browser with DevTools to complete the table:

1. `https://www.visitbergen.com/hva-skjer` -- Norwegian version (likely mirrors EN structure)
2. `https://altomnorge.com/norske-byer/bergen-dagens-arrangementer/` -- New competitor, unknown structure
3. `https://www.barnibyen.no/bergen/` -- Family events niche competitor
4. `https://www.bergenlive.no/konsertkalender` -- Concert niche competitor
