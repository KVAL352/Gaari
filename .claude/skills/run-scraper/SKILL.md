---
name: run-scraper
description: Run a single scraper by name and show the results summary
argument-hint: [scraper-name]
disable-model-invocation: true
allowed-tools: Bash(cd scripts && npx tsx scrape.ts *)
---

# Run a single scraper

Run the **$ARGUMENTS** scraper and report the results.

## Steps

1. Run the scraper:
   ```bash
   cd scripts && npx tsx scrape.ts $ARGUMENTS
   ```

2. Parse the output and report:
   - Events found vs inserted
   - Any errors or warnings
   - Whether events were skipped (already exists, opted out, etc.)

3. If the scraper fails, check:
   - Is the source URL reachable? (the site might be down)
   - Has the HTML structure changed? (common cause of scraper breakage)
   - Are there import errors? (missing dependencies)

## Available scrapers

To see all registered scrapers, check the `scrapers` object in `scripts/scrape.ts`.

Common ones: `visitbergen`, `bergenlive`, `bergenkommune`, `studentbergen`, `eventbrite`, `ticketco`, `dns`, `grieghallen`, `kode`, `kunsthall`
