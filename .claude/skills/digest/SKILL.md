---
name: digest
description: Run daily digest locally (dry-run or send)
argument-hint: "[dry-run|send]"
disable-model-invocation: true
allowed-tools: Bash(cd scripts && npx tsx *)
---

# Run daily digest

Run the daily digest in **$0** mode.

## What to do

If `$0` is empty or `dry-run`:

```bash
cd scripts && npx tsx send-daily-digest.ts --dry-run
```

Review the generated HTML preview in `.newsletter-preview/` and summarize:
- Pending task counts (corrections, submissions, opt-outs, inquiries)
- Scraper health alerts (broken, warning, dormant)
- Pipeline completeness
- Any reminders triggered for today

If `$0` is `send`:

```bash
cd scripts && npx tsx send-daily-digest.ts
```

Report the send result.

## Important

- Default is always `dry-run` — never send without the user explicitly saying `send`
- The real digest runs via GHA weekdays at 08:00 UTC — this is for local testing
