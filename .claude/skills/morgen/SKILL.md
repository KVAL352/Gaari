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

### Umami traffic (last 24h)
!`set -a && source .env && set +a && node -e "async function r(){const h={'x-umami-api-key':process.env.UMAMI_API_KEY};const w='5f889214-285b-4412-8066-015a18f8ce65';const n=Date.now();const s=await(await fetch('https://api.umami.is/v1/websites/'+w+'/stats?startAt='+(n-86400000)+'&endAt='+n,{headers:h})).json();const a=await(await fetch('https://api.umami.is/v1/websites/'+w+'/active',{headers:h})).json();console.log(JSON.stringify({active:a.visitors,pageviews:s.pageviews,visitors:s.visitors,bounces:s.bounces}));}r().catch(()=>console.log('Umami unavailable'));" 2>/dev/null || echo "Umami unavailable"`

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

### Trafikk (siste 24t)
- X besøkende, Y sidevisninger, Z aktive nå
- Bounce rate: X%

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
