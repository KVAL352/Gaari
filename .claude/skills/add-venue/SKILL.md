---
name: add-venue
description: Register a new Bergen venue in venues.ts and categories.ts (bydel mapping)
argument-hint: [venue-name] [website-url] [bydel]
disable-model-invocation: true
---

# Add a new venue

Register: **$ARGUMENTS**

## Steps

1. **Read `scripts/lib/venues.ts`** — check if the venue already exists (search by name, case-insensitive)

2. **Add to VENUE_URLS** in `scripts/lib/venues.ts`:
   - Key: lowercase venue name
   - Value: venue website URL (NOT an aggregator — check AGGREGATOR_DOMAINS list)
   - Add common name variations (e.g. "ole bull scene" and "ole bull huset")
   - Place alphabetically within the correct section (comments group venues by type)

3. **Read `scripts/lib/categories.ts`** — check `mapBydel()` function

4. **Add bydel mapping** in `mapBydel()` in `scripts/lib/categories.ts`:
   - Key: lowercase venue name (must match what scrapers produce)
   - Value: one of the valid bydeler

## Valid bydeler

Sentrum, Bergenhus, Fana, Ytrebygda, Laksevåg, Fyllingsdalen, Åsane, Arna

## Example

For "Fana Kulturhus" at `https://fanakulturhus.no` in Fana:

**venues.ts:**
```typescript
'fana kulturhus': 'https://fanakulturhus.no',
```

**categories.ts** (in `mapBydel`):
```typescript
'fana kulturhus': 'Fana',
```

## Important

- The venue name key must be **lowercase** — matching is case-insensitive
- Website URL must be the venue's **own site**, never an aggregator (visitbergen.com, barnasnorge.no, etc.)
- If the venue has multiple common names, add all variants pointing to the same URL
