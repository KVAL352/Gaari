# Gåri — Handover for the Portfolio / Case Study Build

**Written:** 2026-07-26
**Written for:** the agent building Kjersti's portfolio page about Gåri (separate repo, English copy)
**Source of truth for everything below:** this repo, `c:\Users\kjers\Projects\Gaari`

---

## 0. Read this part first

**What the portfolio is about:** the product. Gåri as a designed, working, publicly live website — the problem it solves, the decisions behind it, how it looks and behaves.

**What the portfolio is NOT about:** how Kjersti uses AI to build things. There is an existing deck (`outputs/Presentations/2026-05-27-AI-workflow/`) that covers exactly that, aimed at an academic audience. You will reuse *assets* and *facts* from it. Do not reuse its *argument*. No "one person + AI = 8 roles" framing, no motherboard diagram, no human/AI swim-lane diagram, no cost-per-month-of-Claude, no "20 minutes per scraper".

AI is still allowed to appear as an honest implementation detail — Gemini 2.5 Flash generates the bilingual event descriptions, and that is a genuine product decision worth one paragraph (see §4). The distinction is: AI in the *product* is on-topic; AI in the *workflow* is off-topic.

**Confirmed decisions from Kjersti (2026-07-26):**
- Portfolio copy is **English**, aimed at an international audience (employers, studios, graduate programmes).
- It lives in a **separate project/repo**, likely alongside other work. So Gåri must be described **from the outside** — assume the reader has never heard of it, does not know Bergen, and does not read Norwegian.

**Still open — ask Kjersti before you write final copy:**
1. Is this a standalone one-page case study, or one entry in a multi-project portfolio? (Changes length and how much scaffolding you build.)
2. How prominent should she be personally — is `assets/kjersti.jpg` used, is there an about/bio section, is her name in the header?
3. Does she want measured traffic/usage numbers in it at all? (See §7 — there are hard rules about this.)
4. Screenshots of the live site contain third-party press photos. See §6 — this needs her decision, not yours.

---

## 1. What Gåri is, in plain English

A bilingual (Norwegian/English) event aggregator for Bergen, Norway. It collects what's happening in the city — concerts, theatre, exhibitions, family events, food, sport, nightlife, student events, guided tours — from ~60 local venue and organiser websites, and presents them in one filterable listing.

- **Live at:** [gaari.no](https://gaari.no) (also `gåri.no`, which redirects — the IDN domain is handled in `src/hooks.server.ts`)
- **Name:** from the Bergen dialect phrase *"Ke det går i?"* — roughly "What's going on?". "Gåri" is the contracted spoken form. For an international reader this needs a one-line gloss; it is a genuinely nice naming story and worth telling properly.
- **Tagline:** *"Ke det går i Bergen?"* — deliberately in dialect, untranslated on the site itself.
- **Built and run by:** Kjersti V. Therkildsen, alone, as a side project alongside a master's at Keio Media Design.

### The problem it solves

Event information in Bergen is scattered: every venue publishes its own programme on its own site, in its own format. There is no neutral, complete, well-designed overview. The existing options are either tourism-board marketing pages or ticket-vendor listings — both of which only show what they have a commercial interest in showing.

Gåri's premise: a resident should be able to answer "what can I do tonight?" in one place, in under ten seconds, without being sold anything.

### Who it's for

- **Primary:** people in Bergen deciding what to do — locals, students, expats, tourists.
- **Secondary:** venues and organisers who want to reach those people. This is where the revenue model sits (§5).

### The honest framing on Kjersti's role

She is a designer and master's student, not a professional developer, and she is direct about this. The portfolio should not oversell her as a software engineer. The interesting claim is stronger than that anyway: she identified a real gap in her own city, designed a product-grade answer to it, shipped it, and has been operating it in production — content, SEO, distribution, legal compliance, and a B2B offer included. Frame it as **product and design ownership end to end**, not as engineering.

---

## 2. Source material you can mine

### The existing deck

`outputs/Presentations/2026-05-27-AI-workflow/`

| File | What it is | Use for the portfolio? |
|---|---|---|
| `slides.md` | 1000-line Slidev deck, Norwegian | Read it for facts and phrasing. Do not port slides. |
| `style.css` | Funkis design tokens ported to Slidev | Useful reference for token names; canonical source is `src/app.css` |
| `assets/*.mp4` | 9 screen recordings | Selectively — see §6 |
| `assets/icons/brand-*.svg` | 19 tech/service logos (Svelte, Supabase, Vercel, Tailwind, Gemini, Stripe, Meta, etc.) | **Yes** — ideal for a tech-stack strip |
| `assets/icons/cat-*.svg` | 8 discipline icons (dev, design, content, SEO, comms, social, ops, biz) | Only if you build a "what the role covered" section; these were made for the AI-roles slide |
| `assets/icons/s10-*.svg` | 6 abstract icons (speed, flow, iterate, design, func, logic) | Probably not — they belong to the AI-workflow argument |
| `assets/cover-collage.jpg` | 2.2 MB screenshot collage of the event grid | Maybe, as a hero — but see §6 on press photos, and it needs compressing |
| `assets/kjersti.jpg` | 153 KB portrait | Ask Kjersti first |
| `record-gaari.mjs`, `record-screencasts.mjs`, `record-admin-social.mjs` | Playwright scripts that record the live site | **Very useful** — re-run these to generate fresh, correctly-sized captures instead of reusing May's videos |

The recording scripts are the most valuable thing in that folder for you. `record-gaari.mjs` launches headless Chromium at 1280×720 with `deviceScaleFactor: 2`, pre-scrolls to force lazy-loaded images, then does an eased smooth-scroll tour and saves a video. Adapt it to produce stills or a shorter loop at whatever dimensions the portfolio needs. It requires `playwright-chromium` (already in that folder's `package.json`).

### Project documentation worth reading

In `docs/`:

| File | Why you care | Freshness |
|---|---|---|
| `BRAND-VOICE.md` | Voice attributes, name origin, example copy | Feb 2026, still accurate |
| `DESIGN-SYSTEM.md` | Full token table, typography, components, a11y rules | Feb 2026 — token values current, component list undercounts |
| `design-brief.md` | Original component specs and interaction patterns | Historical, good for "the thinking" |
| `project-strategy.md` | Audience, feature roadmap, MVP scope | Feb 2026 — "13 collection pages" is now badly out of date |
| `SITE-ANALYSIS.md` | Route inventory, SEO feature matrix | **Stale (Feb 2026).** Says 14 routes / 13 collections; reality is much larger. Useful for *what kinds of things exist*, not for counts. |
| `DECISION-LOG.md` | Why things were decided the way they were | Best source for design-rationale copy |
| `CUSTOMER-JOURNEYS.md` | User journeys | Useful for a "how people use it" section |
| `COPY-GUIDELINES.md` | Copy rules | Applies to the site; adapt tone for a portfolio |
| `growth-strategy.md`, `strategic-roadmap-v2.md` | Business/growth thinking | Background only |
| `ip-protection.md`, `legal-research-norway.md`, `legal/` | Copyright, GDPR, scraping law | Read before writing anything about data collection (§7) |

In `.claude/docs/`: `components.md`, `routes.md`, `collections.md`, `scrapers.md`, `social.md`, `testing.md`, `gha.md`. These are maintained closer to the code than `docs/` is — prefer them for technical detail.

`CLAUDE.md` at the repo root is the compressed project brief. Read it first; it will orient you in five minutes.

---

## 3. The design system — use it

The portfolio should look like it belongs to Gåri without being a clone of it. All tokens live in `src/app.css` (canonical) and are documented in `docs/DESIGN-SYSTEM.md`.

**Name:** *Funkis* — after the Sundt building in Bergen (1938, architect Per Grieg), a landmark of Norwegian functionalist architecture. The design philosophy follows from that: clean lines, honest materials, purposeful form, function before decoration. This is a real design-rationale story with a photographable local referent, and it should be in the case study.

### Core palette

| Token | Hex | Role |
|---|---|---|
| `--funkis-red` | `#C82D2D` | Sundt vermillion — the single accent colour |
| `--funkis-red-hover` | `#A82424` | Accent hover |
| `--funkis-red-subtle` | `#F9EEEE` | Accent tint |
| `--funkis-plaster` | `#F5F3EE` | Warm off-white |
| `--funkis-plaster-warm` | `#EDEAE3` | Warmer variant |
| `--funkis-shadow-light` | `#D4D1CA` | Light border/shadow |
| `--funkis-granite` | `#6B6862` | Stone grey |
| `--funkis-steel` | `#3A3A3C` | Dark grey |
| `--funkis-iron` | `#1C1C1E` | Near-black |
| `--color-bg` | `#F2F2F0` | Page background |
| `--color-text-primary` | `#141414` | Body text (7.88:1 on white) |
| `--color-text-secondary` | `#4D4D4D` | Secondary (6.96:1) |
| `--color-text-muted` | `#595959` | Muted (7.01:1) |

There are also status-badge colours (today/free/sold-out/last-tickets/cancelled) and an 11-colour category palette used for image placeholders — both in `DESIGN-SYSTEM.md` §"Status badge colors" and §"Category placeholder colors". The category placeholder palette is a nice thing to show: soft, distinct, and it means an event without a photo still looks intentional rather than broken.

### Typography

- **Display:** Barlow Condensed — used for uppercase labels, not for headings
- **Body:** Inter — used for all headings and body text
- Self-hosted `.woff2` in `static/fonts/`
- `font-variant-numeric: tabular-nums` on every date, time and price
- Heading line-height 1.15

### Hard design rules from Kjersti (these are non-negotiable)

- **No gradients.** Functional, flat, honest surfaces only.
- **Colour is never the only signal.** Every badge is colour + icon + text.
- **44×44px minimum touch targets** everywhere.
- **WCAG 2.2 AA**, verified — the contrast ratios above are measured, not aspirational.
- Language switching uses **text labels, never flags**.

If the portfolio page itself violates these, it undercuts the case study it's making. Build it to the same standard.

---

## 4. What's actually worth showing — the substance

Pick from these. They are ranked roughly by how much they say about Kjersti as a designer, not by technical impressiveness.

**1. EventDiscovery — the progressive filter.** The centrepiece interaction. Instead of a wall of filter controls, it asks in sequence: *Who?* (family, youth, adult, student, 18+, tourist) → *When?* (today, this weekend, date picker, time of day) → *What?* (category, price) → *Where?* (city district). URL search params are the source of truth, so every filter state is shareable and back-button-safe. Built as an ARIA-correct pill/grid pattern with full keyboard navigation. File: `src/lib/components/EventDiscovery.svelte`, logic in `src/lib/event-filters.ts`.

**2. The card and the missing-image problem.** Most aggregators look terrible because a third of their events have no usable photo. Gåri's answer: `ImagePlaceholder.svelte` renders a category-coloured field with a category icon, so a photo-less event reads as a deliberate design state. Show a grid with a mix of both. This is a small decision that carries a lot of design judgement.

**3. Bilingual as a structural choice, not a translation layer.** Routing is `/[lang]/` with `no` and `en`. Norwegian is primary and required (`title_no`, `description_no`); English is generated. `hreflang` `nb`/`en`/`x-default` on everything. This matters for the actual audience — Bergen has a large student and expat population that the Norwegian-only incumbents ignore.

**4. AI-generated descriptions — the legal-design decision.** Event descriptions are never copied from the source site. Norwegian copyright law (*åndsverksloven*) protects the original text, so every description is regenerated from scratch by Gemini 2.5 Flash as a short bilingual summary (<160 characters), with a plain template as fallback. This is the one place where AI belongs in this portfolio: it is a design constraint resolved by a technical choice. One paragraph, framed as *"how do you aggregate without plagiarising?"*

**5. Honest pricing language.** The scrapers can often infer that an event is free, but not always reliably. So the badge never says "Free" — it says *"Trolig gratis"* / *"Likely free"*. Similarly, the site never links to other aggregators; ticket links always resolve to the actual venue or ticket page (`scripts/lib/venues.ts`, `resolveTicketUrl`). Small, unglamorous, and exactly the kind of integrity detail that reads well.

**6. Collection pages as an editorial/SEO layer.** Curated landing pages — "this weekend", "free things to do", "rainy day guide", per-district, per-season, per-festival — each with genuine editorial copy and FAQ content rather than a bare filtered list. Defined in `src/lib/collections.ts`. This is where product design meets content strategy.

**7. Operating it, not just building it.** Automated collection twice daily, health endpoints (`/api/health`, `/api/health/deep`), anomaly detection that classifies each source as healthy/warning/dormant/broken, a daily digest email, uptime monitoring. Worth one compact section: a portfolio that shows *maintenance* is rarer and more credible than one that shows a launch.

**8. Data ethics as a visible feature.** A public data-collection transparency page (`/[lang]/datainnsamling/`), an opt-out request form for venues, an honest User-Agent string, rate limiting between requests, robots.txt checked before any source is added, and explicit exclusion of non-public events (kindergartens, schools, members-only). Also: a "suggest a correction" flow on every event. See §7 before writing about this.

**9. Accessibility, done properly.** Full keyboard navigation, WAI-ARIA menu pattern on the calendar dropdown, `aria-live` result counts, skip link, `prefers-reduced-motion` respected, a dedicated `/[lang]/tilgjengelighet/` accessibility statement page. Under-sold in the deck; portfolios that show real a11y work stand out.

**10. Performance discipline.** ISR caching on Vercel (1 hour on time-sensitive listings, 24 hours on event detail pages), self-hosted fonts, cookieless analytics with no consent banner, and a committed performance budget at `lighthouse-budget.json` (LCP ≤ 5000 ms, CLS ≤ 0.05, total resources ≤ 500 KB, scripts ≤ 200 KB). If you want a performance figure in the case study, run Lighthouse against the live site yourself and quote what you measure.

---

## 5. Business model — include it, briefly

Gåri is a real commercial attempt, not a demo. Promoted placement subscriptions for venues (three tiers, 1,500 / 3,500 / 9,000 NOK per month) plus à la carte single-event promotion (750 NOK). Payment via Stripe payment links. There is a B2B marketing page at `/[lang]/for-arrangorer/` (`/for-organizers/` in English).

The design-relevant part: **every promoted item is labelled "Fremhevet" / "Featured"**, because Norwegian marketing law (*markedsføringsloven* § 3) requires paid placement to be identifiable. So the monetisation had to be designed to be visible rather than hidden. That is the angle to take — a designer resolving a commercial requirement and a legal one without degrading the listing.

**Do not state revenue, customer counts, or signed clients** unless Kjersti explicitly gives you figures and clears them for publication.

---

## 6. Assets — what to reuse, and one thing to be careful about

### The press-photo problem — resolve this with Kjersti before publishing

Gåri displays event images by **hot-linking** them from the source venue's site, under a documented image policy with an opt-out mechanism (`docs/ip-protection.md`, and Kjersti's own image-policy notes). That policy governs display **on gaari.no**. It does not automatically cover republishing those same photographs inside a screenshot on a different website.

This is not hypothetical: there was a copyright claim over an image in April 2026, which was resolved, and Kjersti now runs deliberate IP-protection practices as a result. Reusing `cover-collage.jpg` or `gaari-forside.mp4` on a public portfolio page means republishing a screen full of third-party press photos in a new context.

**Do not decide this yourself.** Put the options to Kjersti:
- (a) Use real screenshots as-is and accept the exposure.
- (b) Re-record against a filtered view or local build where events render with category placeholders instead of photos — visually clean, legally clean, and it doubles as a showcase for the placeholder system (§4.2).
- (c) Blur or stylise the photo areas.
- (d) Use screenshots of pages that are photo-light — the discovery filter, the accessibility page, the transparency page, the B2B page.

Option (b) is the one worth recommending.

### Reusable, no concerns

- `assets/icons/brand-*.svg` — clean, uniform, ideal for a tech-stack row
- `static/favicon.svg`, `static/gaari-logo-1024.png`, `static/gaari-logo-500.png` — the red "G" mark
- `static/stickers/gaari-G-sticker.svg`, `gaari-badge-sticker.svg` — vector brand marks
- `print/poster-a3.png`, `poster-a4.png`, `sticker-circle-v2.svg` — print collateral, good evidence that the brand extends past the screen
- `static/gaari-cover-1600.png`, `fb-cover.png`, `newsletter-og.png` — social/OG artwork
- The per-event and per-collection OG image generators (`src/routes/og/`, built with Satori + resvg) — the generated images themselves are a nice systematic-design artefact to show as a grid

### Needs work before reuse

- Every `.mp4` in the deck is sized for a projector, not the web: `gaari-forside.mp4` is 14 MB, `litthus-events.mp4` is 11 MB, `admin-social.mp4` is 4.3 MB. Re-encode, shorten, or better, re-record with the Playwright scripts at the size you actually need.
- `cover-collage.jpg` is 2.2 MB. Compress.
- `litthus-events.mp4`, `claude-terminal.mp4`, `meta-cli.mp4`, `morning-terminal.mp4`, `newsletter-cli.mp4`, `seo-digest.mp4` are all terminal/tooling recordings — they belong to the AI-workflow story. Leave them out.

---

## 7. Facts, numbers, and hard rules

### Never hardcode a count you can derive

This is a standing instruction from Kjersti, and the deck's numbers are already drifting. The deck says "57 sources" and "13 collection pages"; `SITE-ANALYSIS.md` says 13 collections; `CLAUDE.md` says 53; the code today says something else again. Anything you write in July that was counted in February will be wrong by autumn.

Derive from the repo at build time, or state it as approximate ("around sixty local sources"):

```bash
# Active scrapers (imports not commented out)
grep -c "^import { scrape as" scripts/scrape.ts

# Total scraper files, including retired ones
ls scripts/scrapers/*.ts | wc -l

# Collection pages
grep -cE "^\s{2}\{" src/lib/collections.ts   # verify against the actual array shape first

# Svelte components
ls src/lib/components/*.svelte | wc -l

# Test files / test count
find src scripts -name '*.test.ts' -not -path '*/node_modules/*' | wc -l
npx vitest run                                # for the real assertion count

# GitHub Actions workflows
ls .github/workflows/*.yml | wc -l
```

Two warnings from doing this while writing this handover: a naive `find` for test files picked up `node_modules` and returned 202 instead of 13, and a naive `grep` for collections over-counted. **Verify any count you generate by spot-checking it.** If a number looks impressive, that is a reason to check it twice, not to use it.

### Measured data only — this is a firm rule

Kjersti's standing rule: public-facing material shows **only measured numbers, never estimates**. It applies here.

- The deck's "~30% of traffic from Facebook groups" was measured in Umami in May 2026. It is now two months old. **Re-measure or omit.**
- Do not invent visitor counts, event counts, growth percentages, or time-saved figures.
- If a number can't be verified from Umami, Google Search Console, or Supabase directly, leave it out. A case study with no metrics is fine. One with a wrong metric is not.
- "Approximately" plus a real figure beats a precise-sounding invention.

### Legal and factual care

- Data collection: describe it accurately — public event listings, robots.txt respected, honest User-Agent, rate-limited, opt-out available, non-public events excluded, descriptions regenerated rather than copied. Do not use the word "scraping" as a boast, and do not imply anything is taken without regard for the source.
- Do not name venues as customers, partners, or endorsers without written confirmation. Check with Kjersti.
- Do not use venue logos to imply partnership. `static/logos/brann.svg` exists for a functional reason in a report, not as a client badge.
- Norwegian legal references (*åndsverksloven*, *markedsføringsloven* § 3, GDPR) should be glossed for an international reader, and stated only as they appear in `docs/legal-research-norway.md`. Don't extrapolate.

### Verify before you publish

The site is live and changes. Check `gaari.no` yourself, and hit `/api/health/deep` for current system state, before describing any feature in the present tense. Features listed in `SITE-ANALYSIS.md` as "planned" may now exist, and vice versa.

---

## 8. Voice for the portfolio copy

Different from the site's own voice (which is warm, local, dialect-flavoured Norwegian). Portfolio copy should be:

- **First person, plain.** "I built", "I decided", "I got this wrong at first". Kjersti writes in first person and dislikes corporate distance.
- **No em-dash-heavy, no-buzzword prose.** No "leveraging", "seamless", "cutting-edge", "revolutionising". No **emoji**, anywhere — this is an explicit rule of hers.
- **Specific over grand.** "The badge says 'likely free' because the scraper can't always be certain" is worth more than "meticulous attention to detail".
- **Willing to name what's unfinished.** Dark mode is designed but disabled. A map view is planned, not built. Canonical URL strategy for filter params is unresolved. Saying so makes everything else more credible.
- **Bergen needs context.** Norway's second city, roughly 290,000 people (verify before printing), on the west coast, famous for rain, seven mountains, and a dense cultural scene. One or two sentences, not a travel guide.
- **Norwegian terms need glossing.** *bydel* = city district. *Gåri* = dialect contraction of "what's going on". *Funkis* = functionalism. Gloss once, then use freely.

---

## 9. Suggested structure

A starting point, not a prescription. Adapt after asking Kjersti question 1 in §0.

1. **Hero** — the mark, the tagline with a one-line gloss, one sentence on what it is, a live link.
2. **The problem** — scattered event information, and why the existing options don't solve it.
3. **The product** — the discovery flow as the centrepiece, with real interface imagery.
4. **Design system** — Funkis, the Sundt building, the tokens, the type, the no-gradients rule.
5. **Three or four decisions worth explaining** — pick from §4. Depth over coverage. Each one: the constraint, the options, the choice, the consequence.
6. **How it runs** — collection pipeline, monitoring, the fact that it has been operating continuously rather than launched and abandoned.
7. **Ethics and accessibility** — data transparency, opt-out, WCAG AA, labelled paid placement.
8. **Where it stands** — what's live, what's next, what she'd do differently. Measured numbers only, or none.
9. **Credits and stack** — the `brand-*.svg` icon strip, one line on the role scope.

---

## 10. Quick technical reference

| Layer | Choice |
|---|---|
| Frontend | SvelteKit 2 + Svelte 5 (runes: `$state`, `$derived`, `$effect`) |
| Styling | Tailwind CSS 4 + CSS custom properties in `src/app.css` |
| Database | Supabase (PostgreSQL) — schema in `supabase/`; don't quote a table count, the deck's "9" is already out of date |
| Hosting | Vercel, SvelteKit adapter, ISR caching |
| Collection | Standalone TypeScript + Cheerio in `scripts/`, own `package.json` |
| Scheduling | GitHub Actions cron |
| Text generation | Gemini 2.5 Flash (bilingual event descriptions) |
| Email | Resend (transactional) + MailerLite (weekly newsletter) |
| Payments | Stripe payment links |
| Analytics | Umami Cloud, self-proxied at `/u/`, cookieless |
| Monitoring | UptimeRobot against `/api/health` |
| Testing | Vitest |
| Routing | `/[lang]/` with `no` (default) and `en` |

Key files if you need to look something up:

- `CLAUDE.md` — project brief, read first
- `src/app.css` — canonical design tokens
- `src/lib/collections.ts` — collection page definitions
- `src/lib/components/EventDiscovery.svelte` — the filter system
- `src/lib/components/EventCard.svelte`, `ImagePlaceholder.svelte` — the card and its fallback
- `src/routes/og/` — generated OG images (Satori + resvg)
- `scripts/scrape.ts` — pipeline orchestrator
- `scripts/lib/` — shared utilities (`utils.ts`, `categories.ts`, `dedup.ts`, `venues.ts`, `ai-descriptions.ts`, `scraper-health.ts`)
- `lighthouse-budget.json` — the committed performance budget

---

## 11. Checklist before handing the portfolio back to Kjersti

- [ ] Every number in the copy was derived from the repo or measured from a live source, and spot-checked
- [ ] No estimated or invented metrics anywhere
- [ ] The press-photo question (§6) was put to Kjersti and answered
- [ ] No venue is named or implied as a customer or partner without written confirmation
- [ ] No emoji, no gradients
- [ ] The page itself passes WCAG AA contrast and has 44px touch targets
- [ ] Norwegian terms glossed for an international reader
- [ ] Nothing from the AI-workflow argument leaked in
- [ ] Live features verified against `gaari.no` as it is today, not as `SITE-ANALYSIS.md` described it in February
- [ ] Something unfinished is named honestly
