# Collection Pages

59 collections total: 24 evergreen + 7 bydel + 14 seasonal + 14 festival.
Config in `$lib/collections.ts`, single dynamic `[lang]/[collection]/` route.

## Evergreen (24)
| Slug | Description | Window |
|------|-------------|--------|
| `denne-helgen` | Weekend events | weekend |
| `i-kveld` | Tonight | tonight |
| `gratis` | Free events | 2 weeks |
| `today-in-bergen` | Today (EN) | today |
| `familiehelg` | Family activities | weekend |
| `konserter` | Concerts | 2 weeks |
| `studentkveld` | Student nights | this week |
| `uteliv` | Adult nightlife/music evenings | this week |
| `this-weekend` | Weekend (EN) | weekend |
| `i-dag` | Today (NO) | today |
| `free-things-to-do-bergen` | Free (EN) | 2 weeks |
| `regndagsguide` | Indoor/rainy day | 2 weeks |
| `sentrum` | Bergen sentrum+Bergenhus | 2 weeks |
| `voksen` | Adults incl. sports | 2 weeks |
| `for-ungdom` | Youth 13-18 incl. theatre | 2 weeks |
| `teater` | Theatre | 2 weeks |
| `utstillinger` | Exhibitions/culture | 2 weeks |
| `mat-og-drikke` | Food events | 2 weeks |
| `quiz` | Pub quiz nights (keyword filter) | 2 weeks |
| `stand-up` | Stand-up comedy (keyword filter) | 2 weeks |
| `festivaler` | Festival hub (month-grouped cards) | 90 days |
| `foredrag` | Talks, lectures, debates (keyword) | 2 weeks |
| `i-morgen` | Tomorrow | tomorrow |
| `ting-a-gjore` | Everything (broad hub) | 2 weeks |

## EN hreflang slugs (resolve via SLUG_ALIASES)
| NO slug | EN slug |
|---------|---------|
| `festivaler` | `festivals-in-bergen` |
| `i-morgen` | `tomorrow-in-bergen` |
| `ting-a-gjore` | `things-to-do-bergen` |
| `regndagsguide` | `rainy-day-bergen` |
| `familiehelg` | `family-bergen` |
| `uteliv` | `nightlife-bergen` |

## Bydel (7)
All filter by `bydel` field, 2-week window: `bergenhus`, `laksevag`, `fyllingsdalen`, `asane`, `fana`, `ytrebygda`, `arna`.

## Seasonal (14, `seasonal: true`, year appended to title/H1)
| Slug (NO/EN) | Date range |
|-------------|------------|
| `17-mai` / `17th-of-may-bergen` | May 14-18 |
| `julemarked` / `christmas-bergen` | Nov 15-Dec 23 |
| `paske` / `easter-bergen` | Palm Sunday-Easter Monday |
| `sankthans` / `midsummer-bergen` | Jun 21-24 |
| `nyttarsaften` / `new-years-eve-bergen` | Dec 29-Jan 1 |
| `vinterferie` / `winter-break-bergen` | ISO week 9 |
| `hostferie` | ISO week 41 (no EN pair) |
| `fadderuke-bergen` | ISO weeks 33-34 (student freshers) |

## Festival (14, `seasonal: true`, filter by `source_url` domain)
| Slug (NO/EN) | Domain |
|-------------|--------|
| `festspillene` / `bergen-international-festival` | fib.no |
| `bergenfest` / `bergenfest-bergen` | bergenfest.no (maxPerVenue: 50) |
| `beyond-the-gates` / `beyond-the-gates-bergen` | beyondthegates.no |
| `nattjazz` / `nattjazz-bergen` | nattjazz.ticketco.no |
| `bergen-pride` / `bergen-pride-festival` | bergenpride.no + bergenpride.ticketco.events |
| `biff` / `biff-bergen` | biff.no |
| `borealis` / `borealis-bergen` | borealisfestival.no |

## Hub layout (festivaler)
The `festivaler` collection uses `hubCollections` config — instead of a flat event grid, it shows festival cards grouped by month. Each card has festival image/logo, date range, event count, and "Se program →" link. Config includes `fallbackImage` URLs from festival websites.

Template logic: `{#if hubGrouped.length > 0}` in `+page.svelte`, server resolves sub-collections in `+page.server.ts`.

## Features
- Each has `filterEvents(events, now)`, bilingual title/description/ogSubtitle, editorial, FAQ (5+), quickAnswer
- Optional `offSeasonHint` (contextual message when empty)
- `getCollection(slug)` returns config or undefined (404)
- `SLUG_ALIASES` resolve EN slugs to canonical collection
- `HREFLANG_PAIRS` map NO↔EN for redirect and hreflang tags
- Cross-language slug redirect (e.g. `/en/sankthans` -> `/en/midsummer-bergen`)
- JSON-LD: CollectionPage + ItemList + BreadcrumbList (FAQPage removed Apr 2026)
- Noindex on empty non-seasonal collections
- ISR cache: 3600s (1 hour)
- Promoted placement logic runs after filtering
