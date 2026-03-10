---
name: morgen
description: Morning routine — email, tasks, site health, and git status in one go. Make sure to use this skill whenever the user opens a session or asks what's going on — "god morgen", "morgen", "morning", "hva skjer", "la oss starte", "status", "what do we have today", or any session-opening phrase, even without saying "morgen".
user-invocable: true
argument-hint: "[quick]"
---

# God morgen! Her er oversikten.

Run all morning checks in parallel, then present a single unified briefing.

## Pre-loaded data

### Git status
!`git status --short 2>/dev/null`

### Site health
!`curl -s https://gaari.no/api/health 2>/dev/null || echo "Site unreachable"`

### Last scraper run
!`gh run list --workflow=scrape.yml --limit 1 --json conclusion,startedAt 2>/dev/null || echo "gh unavailable"`

### Last digest
!`gh run list --workflow=daily-digest.yml --limit 1 --json conclusion,startedAt 2>/dev/null || echo "gh unavailable"`

## Then do these in parallel

1. **Check email** — use the `email` skill to check all Protonmail folders
2. **Check tasks** — use the `tasks` skill to list pending/overdue items

## Briefing format

Present everything as one compact briefing:

```
## God morgen! 🌅

### Siden
- gaari.no: ✅ oppe / ❌ nede (X events, sist scrapet Y timer siden)

### Epost
- X ulest i innboks
- Y ubehandlede henvendelser (corrections/submissions/optouts)

### Oppgaver
- X forfalt
- Y denne uken

### Kode
- Branch: <current>
- Ucommittede endringer: X filer / rent

### Neste steg
- Prioritert liste basert på forfalt + innkommende henvendelser
```

## Important

- This skill is read-only — never make changes
- Keep the briefing to one screen — details on request
- If site is down or degraded, flag it prominently at the top
