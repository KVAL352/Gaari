# Collection Pages

52 collections total: 18 evergreen + 7 bydel + 13 seasonal + 14 festival.
Config in `$lib/collections.ts`, single dynamic `[lang]/[collection]/` route.

## Evergreen (18)
| Slug | Description | Window |
|------|-------------|--------|
| `denne-helgen` | Weekend events | weekend |
| `i-kveld` | Tonight | tonight |
| `gratis` | Free events | 2 weeks |
| `today-in-bergen` | Today (EN) | today |
| `familiehelg` | Family weekend | weekend |
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

## Bydel (7)
All filter by `bydel` field, 2-week window: `bergenhus`, `laksevag`, `fyllingsdalen`, `asane`, `fana`, `ytrebygda`, `arna`.

## Seasonal (13, `seasonal: true`, year appended to title/H1)
| Slug (NO/EN) | Date range |
|-------------|------------|
| `17-mai` / `17th-of-may-bergen` | May 14-18 |
| `julemarked` / `christmas-bergen` | Nov 15-Dec 23 |
| `paske` / `easter-bergen` | Palm Sunday-Easter Monday |
| `sankthans` / `midsummer-bergen` | Jun 21-24 |
| `nyttarsaften` / `new-years-eve-bergen` | Dec 29-Jan 1 |
| `vinterferie` / `winter-break-bergen` | ISO week 9 |
| `hostferie` | ISO week 41 (no EN pair) |

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

## Features
- Each has `filterEvents(events, now)`, bilingual title/description/ogSubtitle, editorial, FAQ (5+), quickAnswer
- Optional `offSeasonHint` (contextual message when empty)
- `getCollection(slug)` returns config or undefined (404)
- `getAllCollectionSlugs()` for sitemap
- Cross-language slug redirect (e.g. `/en/sankthans` -> `/en/midsummer-bergen`)
- JSON-LD: CollectionPage + ItemList + BreadcrumbList + FAQPage
- Promoted placement logic runs after filtering
