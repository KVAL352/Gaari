---
name: scraper-status
description: Show overview of all scrapers — active, disabled, and orphaned files
context: fork
agent: Explore
---

# Scraper status report

Generate a status report by comparing registered scrapers against files on disk.

## Live data

### Scraper registrations in scrape.ts
!`grep -E "(import|from '\./scrapers/|^\s+\w+:|\\/\\/.*disabled)" scripts/scrape.ts`

### Scraper files on disk
!`ls scripts/scrapers/*.ts 2>/dev/null`

### Last pipeline run (GitHub Actions)
!`gh run list --workflow=scrape.yml --limit 3 --json status,conclusion,startedAt,updatedAt 2>/dev/null || echo "gh CLI not available"`

## Your task

Compare the data above to identify:

1. **Active scrapers** — imported and in the `scrapers` object
2. **Disabled scrapers** — commented out with reason
3. **Orphaned files** — exist on disk but not registered in scrape.ts

## Output format

```
## Scraper Status Report

**Active:** X scrapers
**Disabled:** Y scrapers
**Orphaned:** Z files
**Last pipeline:** conclusion (time ago)

### Active scrapers
- bergenlive — Bergen Live (HTML)
...

### Disabled scrapers
- barnasnorge — Disabled Feb 2026: venues covered by dedicated scrapers
...

### Orphaned files (not in scrape.ts)
- somefile.ts — no import found
...
```
