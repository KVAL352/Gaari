---
name: scraper-status
description: Show overview of all scrapers — active, disabled, and orphaned files
context: fork
agent: Explore
---

# Scraper status report

Generate a status report of all scrapers in the project.

## What to check

1. **Read `scripts/scrape.ts`** — find all imports and the `scrapers` object to identify:
   - Active scrapers (in the `scrapers` object)
   - Disabled scrapers (commented-out entries with reason)

2. **List all files in `scripts/scrapers/`** — compare against imports to find:
   - Orphaned files (exist on disk but not imported or commented out in scrape.ts)
   - New/untracked files (check git status)

3. **Count totals**:
   - Active scrapers
   - Disabled scrapers (with reasons)
   - Orphaned files (if any)

## Output format

```
## Scraper Status Report

**Active:** X scrapers
**Disabled:** Y scrapers
**Orphaned:** Z files

### Active scrapers
- bergenlive — Bergen Live (HTML)
- visitbergen — Visit Bergen (HTML pagination)
...

### Disabled scrapers
- barnasnorge — Disabled Feb 2026: venues covered by dedicated scrapers
...

### Orphaned files (not in scrape.ts)
- somefile.ts — no import found
...
```
