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

### Social posts (last FB/IG runs)
!`gh run list --workflow=social-posts.yml --limit=2 --json conclusion,startedAt,name 2>/dev/null || echo "gh unavailable"`

### Last newsletter workflow
!`gh run list --workflow=newsletter.yml --limit=3 --json conclusion,startedAt 2>/dev/null || echo "gh unavailable"`

### Umami + MailerLite stats (single script)
!`cd /c/Users/kjers/Projects/Gaari && npx tsx scripts/morning-stats.ts 2>/dev/null || echo "Stats unavailable"`

### Today's reminders
!`cd /c/Users/kjers/Projects/Gaari && node -e "const r=require('./scripts/reminders.json');const t=new Date().toISOString().slice(0,10);const w=new Date(Date.now()+7*864e5).toISOString().slice(0,10);const hits=r.filter(x=>x.date<=w).sort((a,b)=>a.date.localeCompare(b.date));hits.forEach(x=>console.log(x.date<t?'OVERDUE':'',x.date,x.title))" 2>/dev/null || echo "Reminders unavailable"`

## Then do these in parallel

1. **Check email** — use the `email` skill to check all Protonmail folders
2. **Check tasks** — use the `tasks` skill to list pending/overdue items
3. **Quick memory lint** — run a lightweight check (no full lint, just critical issues):
   - Check that all files in MEMORY.md exist on disk
   - Flag any project-type memory files where `last_verified` in frontmatter is >21 days old

## Briefing format

Present everything as one compact briefing:

```
## God morgen!

### Siden
- gaari.no: [oppe/nede] (X events, sist scrapet Y timer siden)

### Epost
- X ulest i innboks
- Y ubehandlede henvendelser (corrections/submissions/optouts)

### Oppgaver
- X forfalt
- Y denne uken

### Trafikk (siste 24t)
- X besokende, Y sidevisninger, Z aktive na
- Snitt sider/besok: Y/X

### Nyhetsbrev
- X abonnenter
- Siste utsending: kampanjenavn (dato) — apningsrate X%, klikkrate X%

### Sosiale medier
- Siste FB/IG-posting: status + tidspunkt

### Kode
- Branch: <current>
- Ucommittede endringer: X filer / rent

### Paminnelser (denne uken)
- [OVERDUE] ... (flagg tydelig)
- [I dag] ...
- [Denne uken] ...

### Vedlikehold
- X stale memory-filer (>21 dager, type: project)
- Broken refs: [ja/nei]

### Neste steg
- Prioritert liste basert pa: overdue reminders > innkommende henvendelser > dagens rytme > vedlikehold
```

## Day awareness

Check what day of the week it is and suggest day-appropriate activities in "Neste steg":

| Dag | Fokus |
|-----|-------|
| Mandag | Sjekk trafikktall (Umami), oppfolging outreach, GSC |
| Tirsdag-onsdag | Feature-arbeid, SEO-justeringer |
| Torsdag | Nyhetsbrev gar ut automatisk. LinkedIn-post? |
| Fredag | "Denne helgen"-post i FB-grupper (bruk /fb-post) |
| Lordag | Valgfritt: stikk innom venues med klistremerker |

## Deadline warnings

Flag any of these if <14 days away:
- Meta token renewal (expires date in social-infra.md)
- Early Bird B2B pricing deadline (project_b2b_pricing.md)
- Upcoming seasonal content deadlines (17. mai, sankthans)
- Quarterly security check (reminders.json)

Show as a "DEADLINE"-linje ovenfor "Neste steg" i briefingen.

## Important

- This skill is read-only — never make changes during /morgen
- Keep the briefing to one screen — details on request
- If site is down or degraded, flag it prominently at the top
- No emojis in output
