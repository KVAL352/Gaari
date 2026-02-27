---
name: new-collection
description: Add a new curated collection page to the site. Scaffolds the collection config entry in collections.ts.
argument-hint: [slug] [description]
disable-model-invocation: true
---

# Create a new collection

Create a new collection page for: **$ARGUMENTS**

## Steps

1. **Read `src/lib/collections.ts`** to understand the existing pattern and available filter helpers

2. **Add a new entry** to the `collections` array in `src/lib/collections.ts`:

```typescript
{
    id: '<unique-id>',
    slug: '<url-slug>',
    title: {
        no: '<Norwegian title>',
        en: '<English title>'
    },
    description: {
        no: '<Norwegian meta description, <160 chars>',
        en: '<English meta description, <160 chars>'
    },
    ogSubtitle: {
        no: '<Short Norwegian subtitle for OG image>',
        en: '<Short English subtitle for OG image>'
    },
    editorial: {
        no: ['<paragraph 1>', '<paragraph 2>', '<paragraph 3>'],
        en: ['<paragraph 1>', '<paragraph 2>', '<paragraph 3>']
    },
    faq: {
        no: [
            { q: '<Question?>', a: '<Answer>' },
            { q: '<Question?>', a: '<Answer>' },
            { q: '<Question?>', a: '<Answer>' }
        ],
        en: [
            { q: '<Question?>', a: '<Answer>' },
            { q: '<Question?>', a: '<Answer>' },
            { q: '<Question?>', a: '<Answer>' }
        ]
    },
    filterEvents: (events, now) => {
        // Filter logic using helpers from event-filters.ts
        return events.filter(e => /* ... */);
    }
}
```

3. **Write the filter function** using existing helpers from `src/lib/event-filters.ts`:
   - `isSameDay(dateStr, now)` — today filter
   - `getWeekendDates(now)` — returns `{ start, end }` for Fri-Sun
   - `matchesTimeOfDay(dateStart, timeOfDay)` — morning/daytime/evening/night
   - `toOsloDateStr(now)` — today in Oslo timezone
   - `getEndOfWeekDateStr(now)` — end of current week
   - `addDays(dateStr, n)` — add days to date string
   - `isFreeEvent(price)` — from `src/lib/utils.ts`

4. **Update `src/lib/collections.ts` tests** in `src/lib/__tests__/collections.test.ts`

## Content guidelines

- **Norwegian first**: All content bilingual, Norwegian primary
- **Descriptions**: <160 chars for SEO
- **Editorial**: 3 paragraphs, informative and SEO-friendly
- **FAQ**: 3 Q&A pairs per language, targeting long-tail search queries
- **Use "utvalgte"** (not "kuraterte") when referring to collection pages

## The collection page route

The `[lang]/[collection]/+page.server.ts` route automatically picks up new collections — no route changes needed. It calls `getCollection(slug)` which reads from the array.

## After adding

1. Run `npm test` to verify collection tests still pass
2. The collection automatically appears in the sitemap (via `getAllCollectionSlugs()`)
3. OG image is auto-generated at `/og/c/<slug>.png`
