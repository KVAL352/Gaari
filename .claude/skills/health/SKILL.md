---
name: health
description: Run website health audit — site status, data freshness, scrapers, security
user-invocable: true
argument-hint: [quick|full]
---

# Website health audit

Run a health audit on the Gåri production site and local project: **$ARGUMENTS**

## When to trigger

Activate this skill when the user says any of:
- `/health`, `/health quick`, `/health full`
- "helsesjekk", "helserapport", "sjekk helsen"
- "health check", "health audit", "site audit"
- "er siden oppe?", "is the site up?"
- "sjekk gaari.no", "check gaari.no"

## Scope

- No argument or `quick` = fast checks only (under 30 seconds)
- `full` = comprehensive audit including slower network checks

## Quick checks (always run)

Run checks 1–6 **in parallel** — they are independent.

### 1. Site reachability

```bash
curl -s -o /dev/null -w "%{http_code} %{time_total}s" https://gaari.no
```

- PASS: HTTP 200
- FAIL: non-200 or connection error. Report status code and response time.

### 2. API health

```bash
curl -s https://gaari.no/api/health
```

Parse JSON response:
- `status` → healthy / degraded / unhealthy
- `checks` where `name === 'events_exist'` → report event count from `detail`
- `checks` where `name === 'recent_scrape'` → report freshness from `detail`
- `duration_ms` → response time

PASS if status is `healthy`. WARN if `degraded`. FAIL if `unhealthy`.

### 3. SSL certificate

```bash
echo | openssl s_client -servername gaari.no -connect gaari.no:443 2>/dev/null | openssl x509 -noout -enddate -subject
```

Parse the `notAfter=` date and compute days until expiry.

- PASS: > 30 days remaining
- WARN: 7–30 days remaining
- FAIL: < 7 days or connection error

### 4. npm audit

```bash
npm audit --json 2>/dev/null | node -e "const d=require('fs').readFileSync(0,'utf8');try{const j=JSON.parse(d);const v=j.metadata?.vulnerabilities||{};console.log(JSON.stringify({critical:v.critical||0,high:v.high||0,moderate:v.moderate||0,low:v.low||0,total:v.total||0}))}catch{console.log('{\"error\":\"parse failed\"}')}"
```

- PASS: 0 critical and 0 high
- WARN: moderate or low only
- FAIL: any critical or high vulnerabilities

Report counts by severity: `{critical}C {high}H {moderate}M {low}L`.

### 5. Scraper status

```bash
gh run list --repo KVAL352/Gaari --workflow=scrape.yml --limit 3 --json status,conclusion,startedAt,updatedAt
```

- PASS: most recent run succeeded
- WARN: most recent succeeded but older run failed
- FAIL: most recent run failed

Report conclusion, time since last run.

### 6. Unit tests

```bash
npm test 2>&1
```

- PASS: all tests pass (should be 208)
- FAIL: any test failures

Report pass count / total count.

## Full audit (only when argument is "full")

Run checks 7–12 **in parallel** after quick checks complete.

### 7. Security headers

```bash
curl -s -D - -o /dev/null https://gaari.no | head -30
```

Check for these headers in the response:

| Header | PASS if |
|--------|---------|
| `Strict-Transport-Security` | present with `max-age >= 31536000` |
| `X-Frame-Options` | present (any value) |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | present (any value) |
| `Content-Security-Policy` | present (note key directives) |

Report each as PASS or MISSING.

### 8. Key routes responding

```bash
for url in \
  "https://gaari.no/no/" \
  "https://gaari.no/en/" \
  "https://gaari.no/no/about/" \
  "https://gaari.no/en/about/" \
  "https://gaari.no/sitemap.xml" \
  "https://gaari.no/no/datainnsamling/" \
  "https://gaari.no/no/denne-helgen/" \
  "https://gaari.no/robots.txt"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  echo "$code $url"
done
```

- PASS: all return 200
- WARN: some non-200
- FAIL: homepage or sitemap unreachable

### 9. Outdated dependencies

```bash
npm outdated --json 2>/dev/null || true
```

- INFO: count of outdated packages, list any with major version changes
- No PASS/FAIL — informational only

### 10. DNS resolution

```bash
nslookup gaari.no 2>/dev/null
nslookup xn--gri-ula.no 2>/dev/null
```

- PASS: both domains resolve (should point to Vercel: 76.76.21.21 or CNAME)
- FAIL: either domain fails to resolve

### 11. SEO basics

```bash
curl -s -o /dev/null -w "%{http_code}" https://gaari.no/sitemap.xml
curl -s https://gaari.no/robots.txt
```

Also use WebFetch on `https://gaari.no/sitemap.xml` to check it contains `<urlset>` with URLs and hreflang.

- PASS: sitemap 200 with valid XML, robots.txt accessible
- FAIL: missing or empty

### 12. Link checker status

```bash
gh run list --repo KVAL352/Gaari --workflow=link-check.yml --limit 1 --json status,conclusion,startedAt,updatedAt
```

- PASS: last run succeeded
- FAIL: last run failed

## Report format

After all checks complete, compile results:

```
## Site Health Audit — YYYY-MM-DD

### Production
- Site status: PASS/FAIL (HTTP {code}, {time}s)
- API health: PASS/WARN/FAIL ({status}, {eventCount} events, {recentCount} in 24h)
- SSL: PASS/WARN/FAIL (expires {date}, {days} days)

### Data Pipeline
- Last scraper run: PASS/WARN/FAIL ({conclusion}, {timeAgo})
- Recent history: {pass}/{total} succeeded

### Security
- npm audit: PASS/WARN/FAIL ({critical}C {high}H {moderate}M {low}L)

### Tests
- Unit tests: PASS/FAIL ({passed}/{total})

### Overall: HEALTHY / DEGRADED / UNHEALTHY
```

For full audits, add:

```
### Security Headers
- HSTS: PASS/MISSING
- X-Frame-Options: PASS/MISSING
- X-Content-Type-Options: PASS/MISSING
- Referrer-Policy: PASS/MISSING
- CSP: PRESENT/MISSING

### Routes
- {pass}/{total} key routes returning 200

### Infrastructure
- DNS gaari.no: PASS/FAIL
- DNS gåri.no: PASS/FAIL
- Outdated packages: {count}

### SEO
- Sitemap: PASS/FAIL
- robots.txt: PASS/FAIL
- Link checker: PASS/FAIL (last run {timeAgo})
```

## Overall status logic

- **HEALTHY**: all quick checks PASS
- **DEGRADED**: any WARN, or only full-audit checks fail
- **UNHEALTHY**: any quick check is FAIL

## Important

- All checks are **read-only** — this skill never modifies anything
- If any check times out or errors, report it as FAIL with the error — do not skip silently
- Keep the report concise — show details only for WARN and FAIL items
- PASS items get one line each, no extra detail needed
