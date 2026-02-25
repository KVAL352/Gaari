# Gåri — Strategic Roadmap: Progress Tracker

**Last updated:** 2026-02-25
**Full strategy doc:** See the original `strategic-roadmap-full.md` (in project root or session artifact)

---

## Phase Status

| Phase | Description | Status |
|-------|-------------|--------|
| A | Analytics + UTM tracking | ✅ Done |
| B1 | Curated landing pages (8 collections) | ✅ Done |
| B2 | Social post automation pipeline | ✅ Done |
| B3 | Hashtag + SEO strategy | 🔄 In progress |
| C | Promoted placement system | 🔜 Next (weeks 11–16) |
| D | Optimization (Meta API, newsletter, etc.) | 📅 Future |

---

## Phase A — Foundation ✅

**Goal:** Measure every click from day one.

- ✅ Plausible Cloud analytics on gaari.no
- ✅ `buildOutboundUrl()` utility — UTM on all outbound links (`ticket_url`, `source_url`)
- ✅ Custom events: `outbound-click`, `collection-page-view` (via Plausible)
- ✅ UTM contexts: `event_card`, `event_detail`, `collection`

**Pending (do when you have 3–4 weeks of data):**
- [ ] Export Plausible outbound click data by `utm_campaign` (venue)
- [ ] Generate simple referral reports for top 5–10 venues (trust-building, not a sales pitch)
- [ ] Note warm contacts for Phase C outreach

---

## Phase B — Content Engine ✅/🔄

### B1 — Curated landing pages ✅

8 collections live at `/[lang]/[collection]/`:

| Slug | Language | Filter |
|------|----------|--------|
| `denne-helgen` | NO | Weekend events |
| `i-kveld` | NO | Tonight (evening/night) |
| `gratis` | NO | Free events this week |
| `today-in-bergen` | EN | All events today |
| `familiehelg` | NO | Family + weekend |
| `konserter` | NO | Music this week |
| `studentkveld` | NO | Student evening/night |
| `this-weekend` | EN | Weekend events |

All in sitemap with hreflang (priority 0.8, daily). JSON-LD `CollectionPage` schema. Custom OG images via Satori (`/og/c/[collection].png`).

### B2 — Social post automation ✅

- ✅ `scripts/social/generate-posts.ts` — main pipeline
- ✅ `scripts/social/image-gen.ts` — Satori/Resvg 1080x1080 carousel slides
- ✅ `scripts/social/caption-gen.ts` — bilingual caption templates
- ✅ GHA cron at 07:00 UTC daily (`.github/workflows/social.yml`)
- ✅ Supabase Storage bucket `social-posts` — images + caption.txt uploaded per run
- ✅ `social_posts` table — metadata rows for admin review
- ✅ Admin review page at `/admin/social`

**Not yet done (Phase D):**
- [ ] Instagram business account created
- [ ] Facebook Page created
- [ ] Meta Graph API automation (Phase D — when posting > 30 min/week)

### B3 — Hashtag + SEO strategy 🔄

**Goal:** Right hashtags per collection + collection pages rank for Bergen search queries.

**Hashtag work:**
- [ ] Expand per-collection base hashtags from 3–5 → 10–12 tags
- [ ] Add `getCategoryHashtags()` — dynamic injection based on event categories in post
- [ ] Cap combined hashtag list at 15 (Instagram algorithm prefers fewer, relevant tags)
- [ ] Document final hashtag sets per collection

**SEO work:**
- [ ] Tighten collection `description` strings to target high-intent local queries
- [ ] Verify collection pages indexed in Google Search Console (once domain is live long enough)

**Target keywords:**
- `hva skjer i bergen denne helgen`
- `ting å gjøre i bergen`
- `gratis bergen` / `gratis arrangementer bergen`
- `things to do in Bergen today`
- `bergen today` / `today in bergen`

---

## Phase C — Promoted Placement 🔜

**Prerequisites before starting sales outreach:**
- ✅ 6–8 weeks of Plausible click data (start counting from Phase A completion)
- ✅ Collection pages live + indexed
- ✅ Social media active with 4+ weeks of posts
- [ ] Venue referral reports sent (Phase A pending item above)

**What to build:**
- [ ] Supabase tables: `promoted_placements`, `placement_log`
- [ ] Placement rotation logic in collection `+page.server.ts`
- [ ] "Fremhevet" badge on EventCard (conditional)
- [ ] Social post pipeline: include promoted events, decrement `social_posts_used`
- [ ] Monthly report generation script
- [ ] Admin UI at `/admin/promotions`

**Sales sequence (weeks 11–16):**
1. Send updated referral reports (with social + collection data) to warm contacts
2. Pitch meetings with 3–5 venues — bring printed reports
3. Close first 2–3 early bird clients (3 months free, then regular tier price)
4. September 2026: early birds convert to paid — use their data as case studies

**Tiers:**
| Tier | Target | NOK/mo | Top-3 share | Social posts/mo |
|------|--------|-------:|-------------|-----------------|
| Grasrot | Volunteer orgs | 0 | — | — |
| Basis | Small independent venues | 1 500 | 15% | 2 |
| Standard | Mid-size venues | 3 500 | 25% | 4 |
| Partner | Large institutions | 7 000 | 35% | 8 |

**Target first clients:** Grieghallen (Partner), USF Verftet (Standard), KODE (Standard), Bergen Kunsthall (Basis)

---

## Phase D — Optimization 📅

After core business is running (months 5–12):

- [ ] Full Meta Graph API automation (when manual posting > 30 min/week)
- [ ] Self-serve promoted placement signup + Stripe integration
- [ ] Additional seasonal collection pages (julebord, sommeren, innendørs, quiz)
- [ ] Newsletter (Buttondown or Resend) — weekly digest, same collection engine
- [ ] Visit Bergen data licensing pitch (NOK 50–100K/year)
- [ ] Ticketmaster affiliate program (Impact, ~1% commission, ~120–500 NOK/mo)

---

## Revenue Targets

| Milestone | Monthly revenue | What it takes |
|-----------|----------------:|---------------|
| First revenue | 3 500 NOK | 1 Standard client (Sep 2026 after early bird) |
| Ramen profitable | 10 500 NOK | 1 Partner + 1 Standard |
| Sustainable | 28 500 NOK | 2 Partners + 3 Standards + 2 Basis |

**Operating costs:** ~100–350 NOK/mo (domains + Plausible). First Basis client covers all costs.

---

## Key Decisions Made

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Analytics | Plausible Cloud (€9/mo) | Speed over cost; switch to self-hosted Umami later if needed |
| Business entity | ENK (already registered) | Can invoice immediately; convert to AS at ~200K NOK/yr |
| Promoted content labeling | "Fremhevet" | Required by markedsføringsloven § 3 |
| Pricing visibility | Not public initially | Negotiate with first 2–3 clients to find market rate |
| Social posting | Manual review from admin page | Practical until posting > 30 min/week; Meta API in Phase D |
| Sold-out events | Delete from DB | Prevents wasted user intent; handled in 9 scrapers |

---

## Open Decisions

1. **Umami vs Plausible long-term?** Currently Plausible Cloud. Revisit when/if costs matter at scale.
2. **Collection pages at launch count?** 8 live — add more based on social post engagement data.
3. **Promoted prices public?** Not yet — negotiate first, publish after 2–3 reference clients.
4. **ENK → AS conversion?** At ~200K NOK/year revenue.
5. **Newsletter timing?** After 1,000+ monthly visitors + social pipeline stable.
6. **Cruise ship day targeting?** `/en/today-in-bergen` weighted toward Sentrum on docking days. Nice-to-have.
