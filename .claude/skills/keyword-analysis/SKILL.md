---
name: keyword-analysis
description: Deep keyword research and SEO opportunity analysis. Pulls GSC, Bing, autocomplete data and produces prioritized action plan. Run monthly or when planning new content. Use whenever "sokeordsanalyse", "keyword research", "hva bor vi ranke for", "SEO-muligheter", "content gaps".
user-invocable: true
argument-hint: "[focus area or 'full']"
---

# Keyword Analysis & SEO Opportunity Finder

Run a data-driven keyword analysis for gaari.no. Compares current rankings with search demand to find gaps and opportunities. **$ARGUMENTS**

## Data sources (run in parallel)

### 1. GSC deep export (500 queries, 90 days)

Write a temp script to `scripts/gsc-keyword-export.ts`:

```typescript
import 'dotenv/config';
import * as crypto from 'crypto';
import * as fs from 'fs';

async function main() {
  const GSC_SITE = 'sc-domain:gaari.no';
  const sa = JSON.parse(fs.readFileSync(process.env.GSC_SERVICE_ACCOUNT!, 'utf-8'));
  const now = Math.floor(Date.now() / 1000);
  const jwtHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const jwtClaim = Buffer.from(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600
  })).toString('base64url');
  const signature = crypto.sign('RSA-SHA256', Buffer.from(`${jwtHeader}.${jwtClaim}`), sa.private_key);
  const jwt = `${jwtHeader}.${jwtClaim}.${signature.toString('base64url')}`;

  const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  });
  const { access_token } = await tokenResp.json() as any;
  if (!access_token) { console.error('No access token'); process.exit(1); }
  const h = { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' };

  const end = new Date(); end.setDate(end.getDate() - 2);
  const start = new Date(end); start.setDate(start.getDate() - 89);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  console.log(`Period: ${fmt(start)} → ${fmt(end)}`);

  async function gscQuery(dimensions: string[], rowLimit: number) {
    const r = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`, {
      method: 'POST', headers: h,
      body: JSON.stringify({ startDate: fmt(start), endDate: fmt(end), dimensions, rowLimit })
    });
    return r.json();
  }

  const queries = await gscQuery(['query'], 500) as any;
  const queryPages = await gscQuery(['query', 'page'], 1000) as any;
  const pages = await gscQuery(['page'], 200) as any;

  fs.writeFileSync('c:/tmp/gsc-queries.json', JSON.stringify(queries.rows || [], null, 2));
  fs.writeFileSync('c:/tmp/gsc-query-pages.json', JSON.stringify(queryPages.rows || [], null, 2));
  fs.writeFileSync('c:/tmp/gsc-pages.json', JSON.stringify(pages.rows || [], null, 2));
  console.log(`Queries: ${queries.rows?.length || 0}, Query+Page: ${queryPages.rows?.length || 0}, Pages: ${pages.rows?.length || 0}`);
}
main().catch(e => { console.error(e); process.exit(1); });
```

Run: `cd scripts && npx tsx gsc-keyword-export.ts` then delete the temp file.

### 2. Bing Webmaster data
!`cd scripts && npx tsx seo-report.ts --period 30d 2>&1 | head -80`

### 3. Current collection slugs
!`cd .. && grep "slug: '" src/lib/collections.ts | sed "s/.*slug: '//;s/'.*//" | sort`

### 4. Previous analysis baseline
Read `.claude/docs/seo-analysis-2026-04/README.md` for last analysis metrics. Compare.

## Analysis steps

Run these as parallel agents where possible:

### A. GSC Analysis (from exported data)
Read `c:/tmp/gsc-queries.json`, `c:/tmp/gsc-query-pages.json`, `c:/tmp/gsc-pages.json`.

Produce:
1. **Striking distance keywords** (pos 4-15, >50 imp) — sorted by impressions
2. **Zero-click queries** (>30 imp, 0 clicks) — grouped by theme
3. **Content gaps** — query clusters without dedicated collection pages
4. **Page cannibalization** — queries with 2+ competing pages
5. **Top performing pages** — what's working, replicate patterns
6. **Language split** — NO vs EN opportunity

### B. Google Autocomplete Mining
Fetch suggestions for 30 seed terms via:
`https://suggestqueries.google.com/complete/search?client=firefox&hl=no&q=QUERY`

Seeds (Norwegian): hva skjer i bergen, arrangementer bergen, konserter bergen, ting a gjore i bergen, bergen i dag, bergen denne helgen, bergen i kveld, gratis bergen, barn bergen, uteliv bergen, stand-up bergen, quiz bergen, messer bergen, teater bergen, festival bergen, kurs bergen, foredrag bergen, utstilling bergen, mat bergen, sport bergen

Seeds (English): things to do in bergen, bergen events, bergen concerts, bergen nightlife, free things bergen, bergen with kids, bergen this weekend, bergen rainy day, bergen food, bergen festival

Group suggestions by theme. Flag queries without landing pages.

### C. SERP Format Analysis
For top 10 target keywords, search Google (block gaari.no) and analyze:
- Top 3 ranking domains
- SERP features (event carousel, PAA, featured snippet, map pack)
- Content format that ranks (calendar, listicle, guide, FAQ)
- What gaari.no needs to match/beat

### D. Seasonal Timing Check
Read `seasonal-seo-calendar.md` from memory. Flag any deadlines within 4 weeks.

## Output format

Write full analysis to `.claude/docs/seo-analysis-{YYYY-MM}/` with:
- `gsc-analysis.md`
- `keyword-strategy.md`
- `serp-analysis.md`
- `autocomplete-mining.md`
- `README.md` (summary + metrics)

Then present a prioritized briefing:

```
## Sokeordsanalyse — {dato}

### Endring siden forrige analyse
- Daglige klikk: X → Y (±Z%)
- Ikke-merke CTR: X% → Y%
- Indekserte sider: X → Y
- Nye collections siden sist: [liste]

### Topp 5 muligheter
1. [Sokeord] — [impressions] imp, pos [X], [handling]
2. ...

### Content gaps (nye sider a lage)
- [slug-forslag] — fanger [sokeord-cluster], [estimert volum]

### Sesong-hast
- [Hva som haster innen N uker]

### Tekniske problemer
- [Cannibalisering, crawl errors, etc.]

### Anbefalte neste steg
1. ...
2. ...
3. ...
```

## Update knowledge system

After analysis:
1. Update `seo-insights.md` memory with new metrics
2. Update `competitor-landscape.md` if SERP composition changed
3. Update `seasonal-seo-calendar.md` if new deadlines discovered
4. Append decisions to `decisions-log.md` if actions taken

## When to run

- **Monthly**: Full analysis (all steps)
- **Before seasonal peaks**: Focus on seasonal keywords 4 weeks before peak
- **After major changes**: New collections, title rewrites, schema changes — check impact after 2-3 weeks
- **On demand**: When user asks about specific keyword opportunities

## Important

- GSC data has 2-3 day lag — don't compare with today's traffic
- Bing data is separate from Google — different query profiles
- Autocomplete changes over time — re-mine quarterly
- Never recommend paid tools (Ahrefs, Semrush) — use free data sources only
- Compare with previous analysis in `.claude/docs/seo-analysis-*/` to track progress
