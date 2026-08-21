# GitHub Actions

- **CI** (`ci.yml`): lint, type-check, test, build on push/PR to master.
- **Ytelsesbudsjett** (`lighthouse.yml`): push/PR til master. Bygger produksjonsbygget, serverer det med `vite preview`, og kjører `scripts/lighthouse-budget-check.mjs` mot fire sidetyper + engelsk forside. Tre kjøringer per side, median per måltall, `lighthouse-budget.json` som fasit. Feiler ved brudd. Supabase-URL settes til `.invalid` slik at sidene bruker seed-data og ser like ut hver kjøring. Bakgrunn og dagens tall: `docs/YTELSESBUDSJETT.md`.
- **Scrape** (`scrape.yml`): daily 6 AM UTC, 25min timeout. Secrets: SUPABASE + GEMINI_API_KEY + RESEND_API_KEY. Kjører to varslingsjobber som egne steg med `if: always()`, slik at folk får bekreftelse selv om en scraper feilet:
  - `notify-submitters.ts` — arrangementer sendt inn via `/submit`, koblet på `events.submitter_email`.
  - `notify-organizers.ts` — arrangører som sendte inn nettsiden sin via B2B-skjemaet, koblet på `organizer_inquiries.event_source`. Malen leser bildeomfang fra `consent.json` og kan derfor ikke love mer SoMe-bruk enn registeret gir.
- **Newsletter** (`newsletter.yml`): Thursdays 10:00 UTC. `scripts/send-newsletter.ts`. `--dry-run` via dispatch. Sends verification copy to `post@gaari.no` via Resend. Secrets: MAILERLITE_API_KEY, NEWSLETTER_SIGNING_SECRET, RESEND_API_KEY.
- **SEO Report** (`seo-report.yml`): 1st of month 09:00 UTC. `scripts/seo-weekly-report.ts`.
- **Daily Digest** (`daily-digest.yml`): weekdays 08:00 UTC. `scripts/send-daily-digest.ts`. Includes scraper health, stale sources, pipeline completeness, festival reminders, active Meta ad campaigns. Auto-snapshots ad insights to `ad_insights` table. Secrets: SUPABASE, RESEND_API_KEY, UMAMI, MAILERLITE_API_KEY, META_ACCESS_TOKEN, META_APP_ID, META_APP_SECRET, META_AD_ACCOUNT_ID, FB_PAGE_ID, IG_USER_ID.
- **Meta Daily Snapshot** (`meta-daily-snapshot.yml`): every day 07:30 UTC. `scripts/fetch-meta-daily.ts`. Captures FB/IG followers + IG daily insights into `meta_daily_snapshot` table. Mirrors followers to `daily_metrics` for digest week-over-week comparison.
- **Weekly Reel Batch** (`weekly-reels.yml`): Sunday 18:00 UTC (full), Thursday 15:00 UTC (re-assemble).
- **Social Posts** (`social-posts.yml`): FB 07:00 UTC, IG 14:00 UTC. `generate-posts.ts` + `post-to-socials.ts`.
- **Send Reminders** (`send-reminders.yml`): daily 16:00 UTC. `scripts/send-reminders.ts`. Sends event reminder emails for tomorrow via Resend.
- **Quality Audit** (`quality-audit.yml`): 1st of month 09:00 UTC. 10 automated checks.
- **Canary Scan** (`canary-scan-monthly.yml`): 1st of month 07:00 UTC. `scripts/canary-scan.ts --file canary-targets.txt`. Detects database copying by scanning competitor URLs for planted canary fingerprints. On hit: saves evidence locally, archives targets to Wayback Machine, writes action checklist with lawyer-review reminder, emails post@gaari.no, uploads evidence as 365-day artifact. Secrets: SUPABASE, RESEND_API_KEY.
- **Check Stale Events** (`check-stale-events.yml`): Mondays 06:00 UTC. `scripts/check-stale-events.ts`. Verifies that each upcoming event (within 30 days) still matches its source — title and date. Catches drift where a source updated an event but scraper short-circuited via `eventExists()`. Flagged events are reported (artifact + email), never auto-mutated. Manual resolution: delete row, let next scrape re-create. Secrets: SUPABASE, RESEND_API_KEY.
- **Admin CLI** (`scripts/admin-ops.ts`): Local only. `cd scripts && npx tsx admin-ops.ts <list|approve|reject|status>`.

## Tilgjengelighet i CI

`ci.yml` kjoerer axe-core mot WCAG 2.2 AA etter `npm test`, i to steg: en
browser-install (`npx playwright install --with-deps chromium`) og selve suiten
(`npm run test:a11y`). Feiler den, lastes `playwright-report/` opp som artefakt
med sju dagers levetid, slik at bruddet kan leses uten aa kjoere alt lokalt.

Steget bruker ikke Supabase-secrets. Dev-serveren startes mot en ugyldig vert,
se `.claude/docs/testing.md`.
