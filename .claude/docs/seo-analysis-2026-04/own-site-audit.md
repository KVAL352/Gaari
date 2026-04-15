# Gaari.no — Own-Site SEO Audit: Titles, Meta Descriptions and H1s

Audit date: 2026-04-15

## How titles/meta are assembled

- **Collection pages**: `<title>{collection.title[lang]} — Gari</title>` (seasonal collections append current year to title)
- **Homepage**: `<title>Gari — {tagline}</title>`
- **Event detail pages**: `<title>{event title} — {date} — {venue} | Gari</title>`
- **Guide page**: Static title per language + `— Gari`
- **Meta descriptions**: Collection descriptions are appended with dynamic event count when fits in ~165 chars. Seasonal collections append year.

## Top GSC queries to match

| Query | Est. volume |
|---|---|
| hva skjer i bergen | High |
| konserter bergen | High |
| ting a gjore i bergen | High |
| hva skjer i bergen i dag | Medium |
| hva skjer i bergen denne helgen | Medium |
| bergen events | Medium (EN) |
| gratis bergen | Medium |
| teater bergen | Medium |
| utstillinger bergen | Medium |

---

## Page-by-page audit

| Page (slug) | Title Tag | Meta Description (truncated) | H1 | Issues |
|---|---|---|---|---|
| **Homepage NO** | `Gari — Ke' det gar i, Bergen?` | `Hva skjer i Bergen? Konserter, utstillinger, teater, mat og mer. Gari samler arrangementer fra 55 lokale kilder, oppdatert daglig.` | `Hva skjer i Bergen? Alle arrangementer pa ett sted` (sr-only) | **1. Brand-first title**: "Gari" is before the keyword. Nobody searches "Gari" — the title should lead with "Hva skjer i Bergen". **2. Tagline in title is dialect**: "Ke' det gar i" is charming but not searchable — GSC queries are standard Norwegian. **3. H1 is sr-only**: Google will still index it, but the visible H1 is `aria-hidden`. Fine technically, but unusual. |
| **Homepage EN** | `Gari — What's happening in Bergen?` | `What's on in Bergen? Concerts, exhibitions, theatre, food and more...` | `What's on in Bergen? All events in one place` (sr-only) | Same brand-first issue. Better query match than NO version. |
| **denne-helgen** (NO) | `Hva skjer i Bergen denne helgen — Gari` | `Konserter, utstillinger, mat og aktiviteter i Bergen denne helgen — samlet fra 55 lokale kilder, oppdatert daglig. {N} arrangementer akkurat na.` | `Hva skjer i Bergen denne helgen` | Good. Title matches the exact GSC query. Meta is keyword-rich and action-oriented. |
| **this-weekend** (EN) | `Things to Do in Bergen This Weekend — Gari` | `Things to do in Bergen this weekend — concerts, exhibitions, food and activities...` | `Things to Do in Bergen This Weekend` | Good. Strong query match for "things to do in bergen this weekend". |
| **i-dag** (NO) | `Hva skjer i Bergen i dag — Gari` | `Hva skjer i Bergen i dag? Konserter, utstillinger, teater og aktiviteter — oppdatert daglig. {N} arrangementer akkurat na.` | `Hva skjer i Bergen i dag` | Good. Exact match for GSC query. |
| **today-in-bergen** (EN) | `What's On in Bergen Today — Gari` | `What's happening in Bergen today? All events in one place...` | `What's On in Bergen Today` | Good. |
| **i-kveld** (NO) | `Hva skjer i Bergen i kveld — Gari` | `Hva skjer i Bergen i kveld? Konserter, teater, uteliv og kveldsarrangementer — oppdatert daglig fra 55 lokale kilder. {N} arrangementer akkurat na.` | `Hva skjer i Bergen i kveld` | Good. Exact match. |
| **konserter** (NO) | `Konserter i Bergen denne uken — Gari` | `Livemusikk i Bergen — Grieghallen, Ole Bull, Hulen, USF Verftet og flere scener. Oppdatert daglig fra 55 kilder. {N} arrangementer akkurat na.` | `Konserter i Bergen denne uken` | **Issue**: Title says "denne uken" but filter is actually next 2 weeks. "Konserter i Bergen" alone would be more evergreen and match the GSC query "konserter bergen" better. The time scope creates a mismatch. Also, meta description leads with "Livemusikk" rather than "Konserter" — the word people actually search. |
| **gratis** (NO) | `Gratis ting a gjore i Bergen — Gari` | `Gratis ting a gjore i Bergen de neste to ukene — utstillinger, konserter, turer og mer. Ingen billett nodvendig. {N} arrangementer akkurat na.` | `Gratis ting a gjore i Bergen` | Good. Matches "gratis bergen" and "ting a gjore i bergen" queries. |
| **free-things-to-do-bergen** (EN) | `Free Things to Do in Bergen This Week — Gari` | `Free events and activities in Bergen — exhibitions, concerts, hikes and more. No ticket needed. Updated daily. {N} events right now.` | `Free Things to Do in Bergen This Week` | **Issue**: Title says "This Week" but filter is next 2 weeks. Same scope mismatch as konserter. EN title would be stronger as just "Free Things to Do in Bergen" for evergreen ranking. |
| **familiehelg** (NO) | `Familiehelg i Bergen — Gari` | `Hva gjore med barn i Bergen denne helgen? Barneforestillinger, museumsaktiviteter og familieopplevelser. {N} arrangementer akkurat na.` | `Familiehelg i Bergen` | **Issue**: "Familiehelg" is a Gari brand term, not a search query. People search "ting a gjore med barn i bergen" or "familieaktiviteter bergen". The meta description has good keywords but the title/H1 miss the opportunity. Consider: "Familieaktiviteter i Bergen denne helgen". |
| **uteliv** (NO) | `Uteliv i Bergen denne uken — Gari` | `Uteliv i Bergen denne uken — konserter, klubber, livemusikk og barer med arrangement pa Hulen, Madam Felle, USF Verftet, Bergen Kjott og flere. {N} arrangementer akkurat na.` | `Uteliv i Bergen denne uken` | OK for "uteliv bergen" query. "denne uken" matches actual filter (this week). Meta is very long — at 170+ chars, Google will truncate. |
| **teater** (NO) | `Teater i Bergen — Gari` | `Teaterforestillinger i Bergen de neste to ukene — DNS, Det Vestnorske Teateret, BIT, Cornerteateret og Carte Blanche. Oppdatert daglig. {N} arrangementer akkurat na.` | `Teater i Bergen` | Good. Clean, evergreen title. Matches "teater bergen". Meta is strong with venue names. |
| **utstillinger** (NO) | `Utstillinger i Bergen — Gari` | `Utstillinger i Bergen de neste to ukene — KODE, Bergen Kunsthall, Bymuseet og flere. Samtidskunst, kulturhistorie og omvisninger. {N} arrangementer akkurat na.` | `Utstillinger i Bergen` | Good. Clean, evergreen title. Matches "utstillinger bergen". |
| **guide** (NO) | `Hva skjer i Bergen? Arrangementer og aktiviteter — Gari` | `Hva skjer i Bergen i dag, denne helgen og fremover? Konserter, teater, festivaler, familieaktiviteter og mer. Oppdatert daglig fra 55 lokale kilder.` | **No H1** | **Critical**: No H1 on the page. This is a structural SEO issue. The page has h2s but no h1. The title is good and matches the primary query well. |
| **guide** (EN) | `Things to Do in Bergen — Events and Activities — Gari` | `What's on in Bergen today, this weekend and beyond? Concerts, theatre, festivals, family activities and more...` | **No H1** | Same missing H1 issue. Title is strong for "things to do in bergen". |
| **paske** (NO) | `Paske i Bergen 2026 — Gari` (seasonal: year appended) | `Paske i Bergen 2026: konserter, gudstjenester, familieaktiviteter og utstillinger. Komplett oversikt, oppdatert daglig. {N} arrangementer akkurat na.` | `Paske i Bergen 2026` | Good. Year in title is smart for seasonal freshness. Matches "paske bergen". **Note**: description hardcodes "2026" in the collection config rather than being dynamic — will be stale in 2027 unless updated manually. |
| **easter-bergen** (EN) | `Easter in Bergen 2026 — Gari` | `Easter in Bergen 2026: concerts, services, family activities and exhibitions. Complete guide, updated daily.` | `Easter in Bergen 2026` | Good. Same hardcoded year concern as NO version. |
| **17-mai** (NO) | `17. mai i Bergen 2026 — Gari` | `17. mai-program i Bergen: barnetog, buekorps, konserter og arrangementer. Oppdatert oversikt fra 55 lokale kilder. {N} arrangementer akkurat na.` | `17. mai i Bergen 2026` | Good. Strong for "17 mai bergen". Year freshness signal works well. |
| **17th-of-may-bergen** (EN) | `17th of May in Bergen 2026 — Gari` | `17th of May in Bergen: parades, buekorps brigades, concerts and celebrations. Complete visitor guide updated daily.` | `17th of May in Bergen 2026` | Good. |
| **sankthans** (NO) | `Sankthans i Bergen 2026 — Gari` | `Sankthans i Bergen: bal, fester, konserter og midsommeraktiviteter. Finn alle arrangementer rundt 23. juni. {N} arrangementer akkurat na.` | `Sankthans i Bergen 2026` | Good. Matches "sankthans bergen". |
| **midsummer-bergen** (EN) | `Midsummer in Bergen 2026 — Gari` | `Midsummer Eve in Bergen: bonfires, celebrations and nearly 19 hours of daylight. Complete guide from 55 local sources.` | `Midsummer in Bergen 2026` | Good. "Midsummer bergen" is a small query volume. Could benefit from "Midsummer Eve (Sankt Hans)" for bilingual tourists. |
| **Event detail** (example) | `{Event Title} — 15. apr. 2026 — {Venue} \| Gari` | `{AI description, truncated to fit} — 15. apr. 2026, {Venue}, Bergen` | `{Event Title}` | Good structure. Date + venue in title is excellent for long-tail. Pipe separator instead of dash is fine. |

---

## Summary of issues (priority order)

### Critical
1. **Homepage title is brand-first**: `Gari — Ke' det gar i, Bergen?` puts an unknown brand name before the keyword. Should be `Hva skjer i Bergen — Gari` (NO) and `What's On in Bergen — Gari` (EN). The dialect tagline is great for branding but terrible for title tags.
2. **Guide page has no H1**: Structural SEO gap on what is otherwise a strong hub page.

### High
3. **Konserter title scope mismatch**: Title says "denne uken" but content covers 2 weeks. Either change the title to "Konserter i Bergen" (evergreen) or narrow the filter to 1 week.
4. **Free-things EN title scope mismatch**: Says "This Week" but covers 2 weeks.
5. **Familiehelg title uses brand term**: "Familiehelg" is not a search query. Should include "barn" or "familieaktiviteter" in the title.

### Medium
6. **Paske/Easter descriptions hardcode year**: The description string includes "2026" literally in the collection config. This needs to be dynamic or manually bumped each year.
7. **Konserter meta description leads with "Livemusikk"**: The word "konserter" should appear first since that is what people search.
8. **Uteliv meta description exceeds 160 chars**: Will be truncated by Google, losing the venue names that make it compelling.

### Low / Nice to Have
9. **Homepage H1 is sr-only**: Not a problem per se (Google reads it), but a visible H1 or visible keyword heading in the hero section would reinforce topical relevance.
10. **"denne uken" / "this week" appears in several titles**: This is accurate for those collections, but evergreen titles (without time scope) tend to accumulate more SERP equity over time. Trade-off between freshness and permanence.

---

## Files referenced

- `src/lib/collections.ts` — collection title/description/editorial configs (lines 115+)
- `src/routes/[lang]/[collection]/+page.svelte` — title tag assembly (line 130: `{title} — Gari`)
- `src/routes/[lang]/[collection]/+page.svelte` — H1 (line 152-154)
- `src/routes/[lang]/+page.svelte` — homepage title (line 338: `Gari — {$t('tagline')}`)
- `src/lib/components/HeroSection.svelte` — homepage H1 (line 5-7, sr-only)
- `src/routes/[lang]/events/[slug]/+page.svelte` — event title (lines 34-39)
- `src/routes/[lang]/guide/+page.svelte` — guide title (line 374), no H1
- `src/lib/i18n/translations.ts` — tagline/heroSubtitle strings (lines 5-6, 238-239)
