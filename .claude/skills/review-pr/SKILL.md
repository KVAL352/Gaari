---
name: review-pr
description: Review a pull request against Gaari project conventions and coding standards
argument-hint: [pr-number or branch]
disable-model-invocation: true
---

# Review PR

Review **$ARGUMENTS** against project conventions.

## Steps

1. **Get the PR diff**:
   - If a PR number: `gh pr diff $ARGUMENTS`
   - If a branch: `git diff master...$ARGUMENTS`

2. **Check each changed file** against the rules below

3. **Report findings** grouped by severity: Blocking / Warning / Nit

## Project-specific rules to check

### Scraper code (`scripts/scrapers/`)
- [ ] No raw scraped text stored as descriptions (must use `generateDescription()`)
- [ ] `ticket_url` does NOT point to aggregator domains (visitbergen.com, barnasnorge.no, etc.)
- [ ] Uses `eventExists(source_url)` before inserting
- [ ] Rate limiting: delays between requests (1-1.5s, 3s for Eventbrite)
- [ ] Filters out non-public events (barnehage, SFO, skoleklasse keywords)
- [ ] Uses `makeSlug(title, date)` for slug generation
- [ ] Registered in `scrape.ts` imports and `scrapers` object

### Frontend code (`src/`)
- [ ] Norwegian-first: `title_no` and `description_no` are required, English optional
- [ ] No client-side Supabase imports outside `/submit` page
- [ ] Server data loading uses `$lib/server/supabase.ts` (not `$lib/supabase.ts`)
- [ ] Form actions use `use:enhance` with server-side processing
- [ ] Price displays use soft language ("Trolig gratis", not "Gratis")
- [ ] Accessible: interactive elements have 44px min touch targets, proper ARIA
- [ ] No dark mode colors (tokens only, no `prefers-color-scheme` overrides yet)

### Collections (`src/lib/collections.ts`)
- [ ] Bilingual title, description (<160 chars), ogSubtitle
- [ ] Has editorial content (3 paragraphs per language)
- [ ] Has FAQ (3 Q&A pairs per language)
- [ ] Filter function uses helpers from `event-filters.ts`

### Database/migrations (`supabase/migrations/`)
- [ ] Uses `IF NOT EXISTS` / `IF EXISTS` for safety
- [ ] RLS policies if table needs anon access
- [ ] Proper index naming (`idx_<table>_<column>`)

### General
- [ ] No secrets or API keys committed
- [ ] No `.env` files committed (only `.env.example` and `.env.ci`)
- [ ] Tests added/updated for changed logic
- [ ] No unnecessary `console.log` in frontend code
