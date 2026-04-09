# GitHub Actions

- **CI** (`ci.yml`): lint, type-check, test, build on push/PR to master.
- **Scrape** (`scrape.yml`): daily 6 AM UTC, 25min timeout. Secrets: SUPABASE + GEMINI_API_KEY.
- **Newsletter** (`newsletter.yml`): Thursdays 10:00 UTC. `scripts/send-newsletter.ts`. `--dry-run` via dispatch. Sends verification copy to `post@gaari.no` via Resend. Secrets: MAILERLITE_API_KEY, NEWSLETTER_SIGNING_SECRET, RESEND_API_KEY.
- **SEO Report** (`seo-report.yml`): 1st of month 09:00 UTC. `scripts/seo-weekly-report.ts`.
- **Daily Digest** (`daily-digest.yml`): weekdays 08:00 UTC. `scripts/send-daily-digest.ts`. Includes scraper health, stale sources, pipeline completeness, festival reminders.
- **Weekly Reel Batch** (`weekly-reels.yml`): Sunday 18:00 UTC (full), Thursday 15:00 UTC (re-assemble).
- **Social Posts** (`social-posts.yml`): FB 07:00 UTC, IG 14:00 UTC. `generate-posts.ts` + `post-to-socials.ts`.
- **Quality Audit** (`quality-audit.yml`): 1st of month 09:00 UTC. 10 automated checks.
- **Admin CLI** (`scripts/admin-ops.ts`): Local only. `cd scripts && npx tsx admin-ops.ts <list|approve|reject|status>`.
