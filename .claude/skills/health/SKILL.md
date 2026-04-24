---
name: health
description: Website health audit — site status, data freshness, scrapers. Make sure to use this skill whenever the user asks if things are working — "helsesjekk", "er siden oppe?", "health check", "sjekk gaari.no", "fungerer alt?", "is everything ok?", or any question about uptime, scraper runs, or data freshness.
user-invocable: true
argument-hint: "[quick|full]"
---

# Website health audit

Run a health audit on the Gåri production site and local project: **$ARGUMENTS**

## Scope

- No argument or `quick` = fast checks only (under 30 seconds)
- `full` = comprehensive audit including slower network checks

## Pre-loaded quick checks

### Site + API
!`curl -s -o /dev/null -w "HTTP %{http_code} in %{time_total}s" https://gaari.no 2>/dev/null || echo "UNREACHABLE"`

### API health (JSON)
!`curl -s https://gaari.no/api/health/deep 2>/dev/null || echo "API unreachable"`

### SSL certificate
!`echo | openssl s_client -servername gaari.no -connect gaari.no:443 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null || echo "SSL check failed"`

### Scraper runs (last 3)
!`gh run list --repo KVAL352/Gaari --workflow=scrape.yml --limit 3 --json conclusion,startedAt 2>/dev/null || echo "gh unavailable"`

### Unit tests
!`npm test 2>&1 | tail -3`

### npm audit summary
!`npm audit --json 2>/dev/null | node -e "const d=require('fs').readFileSync(0,'utf8');try{const j=JSON.parse(d);const v=j.metadata?.vulnerabilities||{};console.log(JSON.stringify({critical:v.critical||0,high:v.high||0,moderate:v.moderate||0,total:v.total||0}))}catch{console.log('parse failed')}" || echo "audit failed"`

### Key pages (status codes)
!`node .claude/skills/health/scripts/check-pages.mjs`

### IDN redirect (gåri.no → gaari.no)
!`node .claude/skills/health/scripts/check-idn.mjs`

### Integrations (Umami, Stripe, MailerLite, Sitemap)
!`node .claude/skills/health/scripts/check-integrations.mjs`

### Vercel deployment (last 3)
!`gh api repos/KVAL352/Gaari/deployments --jq '.[0:3] | .[] | .id' 2>/dev/null | while read id; do gh api "repos/KVAL352/Gaari/deployments/$id/statuses" --jq '.[0] | {state, created_at}' 2>/dev/null; done || echo 'gh unavailable'`

## Report format (quick)

```
## Site Health — YYYY-MM-DD

### Production
- Site: PASS/FAIL (HTTP {code}, {time}s)
- API: PASS/WARN/FAIL ({status}, {eventCount} events, {recentCount} in 24h)
- SSL: PASS/WARN (expires {date})
- Key pages: PASS/FAIL ({passed}/{total} return 200)
- IDN redirect: PASS/FAIL (gåri.no → gaari.no)
- Sitemap: PASS/FAIL (valid XML with urlset)

### Data Pipeline
- Last scraper: PASS/WARN/FAIL ({conclusion}, {timeAgo})
- Recent: {pass}/{total} succeeded
- Images: PASS/WARN/FAIL ({broken}/{sampled} broken URLs)
- DB size: PASS/WARN ({totalRows} rows)

### Integrations
- Umami: PASS/FAIL (proxy script loads)
- MailerLite: PASS/FAIL (API responds)
- Stripe: PASS/FAIL (webhook endpoint reachable)
- Vercel: PASS/WARN/FAIL (last deploy state)

### Code
- Tests: PASS/FAIL ({passed}/{total})
- Audit: PASS/WARN ({critical}C {high}H {moderate}M)

### Overall: HEALTHY / DEGRADED / UNHEALTHY
```

## Full audit (only when argument is "full")

Run these **in parallel** after quick checks:

### Security headers

```bash
curl -s -D - -o /dev/null https://gaari.no | head -30
```

Check: Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, CSP.

### DNS resolution

```bash
nslookup gaari.no 2>/dev/null
nslookup xn--gri-ula.no 2>/dev/null
```

### Outdated dependencies

```bash
npm outdated --json 2>/dev/null || true
```

## Overall status logic

- **HEALTHY**: all quick checks PASS
- **DEGRADED**: any WARN, or only full-audit checks fail
- **UNHEALTHY**: any quick check is FAIL

## Important

- All checks are **read-only** — never modify anything
- If any check times out, report as FAIL — do not skip silently
- Keep report concise — details only for WARN and FAIL items
