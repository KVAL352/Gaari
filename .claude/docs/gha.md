# GitHub Actions

- **CI** (`ci.yml`): lint, type-check, test, build on push/PR to master.
- **Scrape** (`scrape.yml`): daily 6 AM UTC, 25min timeout. Secrets: SUPABASE + GEMINI_API_KEY.
- **Newsletter** (`newsletter.yml`): Thursdays 10:00 UTC. `scripts/send-newsletter.ts`. `--dry-run` via dispatch. Sends verification copy to `post@gaari.no` via Resend. Secrets: MAILERLITE_API_KEY, NEWSLETTER_SIGNING_SECRET, RESEND_API_KEY.
- **SEO Report** (`seo-report.yml`): 1st of month 09:00 UTC. `scripts/seo-weekly-report.ts`.
- **Daily Digest** (`daily-digest.yml`): weekdays 08:00 UTC. `scripts/send-daily-digest.ts`. Includes scraper health, stale sources, pipeline completeness, festival reminders, active Meta ad campaigns. Auto-snapshots ad insights to `ad_insights` table. Secrets: SUPABASE, RESEND_API_KEY, UMAMI, MAILERLITE_API_KEY, META_ACCESS_TOKEN, META_APP_ID, META_APP_SECRET, META_AD_ACCOUNT_ID, FB_PAGE_ID, IG_USER_ID.
- **Meta Daily Snapshot** (`meta-daily-snapshot.yml`): every day 07:30 UTC. `scripts/fetch-meta-daily.ts`. Captures FB/IG followers + IG daily insights into `meta_daily_snapshot` table. Mirrors followers to `daily_metrics` for digest week-over-week comparison.
- **Weekly Reel Batch** (`weekly-reels.yml`): Sunday 18:00 UTC (full), Thursday 15:00 UTC (re-assemble).
- **Social Posts** (`social-posts.yml`): FB 07:00 UTC, IG 14:00 UTC. `generate-posts.ts` + `post-to-socials.ts`.
- **Send Reminders** (`send-reminders.yml`): daily 16:00 UTC. `scripts/send-reminders.ts`. Sends event reminder emails for tomorrow via Resend.
- **Quality Audit** (`quality-audit.yml`): 1st of month 09:00 UTC. 10 automated checks.
- **Admin CLI** (`scripts/admin-ops.ts`): Local only. `cd scripts && npx tsx admin-ops.ts <list|approve|reject|status>`.
