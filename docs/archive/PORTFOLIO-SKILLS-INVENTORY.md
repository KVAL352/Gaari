# Gåri — the roles, the work, and the tools

**What Kjersti actually does on this project, translated into terms a recruiter recognises.**
Written 2026-08-18. Companion to `docs/PORTFOLIO-HANDOVER.md`.

The two documents divide the job:

- **`PORTFOLIO-HANDOVER.md`** — what Gåri *is*: the vision, the problem it solves, how it looks, and why. That is its own piece of work and this document does not duplicate it.
- **This document** — what the *work* is: every role Kjersti fills, the concrete tasks inside each one, and the tools she uses to do them.

Numbers are deliberately at the back (§7). They are supporting evidence, not the argument.

---

## 0. The problem this solves

A recruiter is reading for one thing: *what can this person do, and what would I be hiring her to do?*

A feature list does not answer that. "Collection pages as an editorial and SEO layer" describes something that exists on a website. It does not tell a reader that someone did the keyword research, decided which pages were worth building, wrote the editorial copy in two languages, built the filter logic behind each one, and now maintains them seasonally. That is four jobs, and the reader has to guess at all four.

On a normal team, the work below would be spread across a dozen people with a dozen job titles. Kjersti does all of it. That is the story, and it has to be told as *roles, tasks and tools* — not as features.

---

## 1. How to read this

Each role has four parts:

- **The role** — the job title a company would advertise for this work.
- **What the role means here** — one sentence, for a reader who has never seen the project.
- **What I do in it** — the actual tasks, first person, plain language.
- **Tools** — what she works in. Everything listed is verified in this repository unless marked *(verify)*, which means it is named in project documentation but cannot be confirmed from the code. Nothing here is assumed.

---

## 2. The role inventory

### A. Deciding what to build

#### Product owner / product manager

*Decides what gets built, what gets cut, and in what order.*

- Found the problem myself: event information in my city is scattered across every venue's own website, and the alternatives are tourism marketing or ticket-seller listings. Defined the gap and decided it was worth solving.
- Defined who the product is for — residents, students, expats and visitors deciding what to do — and wrote out how each of them arrives and what they need.
- Scoped the first version: decided what had to exist for launch and what could wait.
- Keep a written decision log. Every significant decision is numbered, dated, and recorded with its reasoning — including the decisions to *not* build something: no dark mode, no map view in version one, no infinite scroll, no search autocomplete.
- Maintain the roadmap and re-prioritise as the project changes, working alone and part-time alongside a master's degree.
- Researched the competing platforms in the city and positioned the product deliberately against them.
- Decide when something is finished, when something is wrong, and when to reverse an earlier decision.

**Tools:** Markdown decision log, strategy and journey documents kept in the repository itself; Git and GitHub as the record of what changed and when; a project calendar and a reminder system built into the product's own database rather than an external tool; VS Code. There is deliberately no separate project-management product — the repository is the system of record, which is why the reasoning is still readable six months later.

#### Business owner / commercial lead

*Turns the product into something that can pay for itself.*

**Read the accuracy note below before writing anything about money.**

- Designed a subscription model — tiers for venues plus single-event promotion — priced so smaller organisers would not be shut out, and built the whole thing: the marketing page, the payment handling, the placement rotation, the labelling, the reporting.
- Built the sales material: a marketing page for organisers, and generated per-venue reports showing what the platform does for that specific venue.
- Maintain a prospect list and run outreach myself — first contact, follow-up, negotiation.
- Am now reconsidering the model itself, because the one I built asks organisers to pay before the platform has proved its worth to them.

**Tools:** Stripe (payment links and webhooks); Supabase/PostgreSQL tables for placements, inquiries and a placement log; self-built report generators that produce a standalone HTML report per venue; click tracking that records which listings sent a visitor to a venue; Protonmail for all correspondence.

> **Accuracy note — this is the one section where the repository will mislead you.**
>
> The subscription model is **built but not selling.** No promoted placement is running today, there are no paying customers, and the direction is under review. Kjersti is currently weighing a referral model instead: everything free on the site, and a percentage of ticket sales for visitors the site actually sends to a venue.
>
> Both `CLAUDE.md` and `PORTFOLIO-HANDOVER.md` describe the subscription tiers as the current business model. They are describing what was built, not what is live. Do not repeat them.
>
> What can honestly be written: that she designed and built a complete commercial layer — pricing, payment, placement, labelling, attribution reporting — and is now reconsidering the model on the evidence. That is a stronger story than a price list. Someone who ships a monetisation system and then questions whether it is the right one is showing judgement, not indecision.
>
> What cannot be written: revenue, customers, signed venues, prices as if they were in force, or the referral idea as if it were decided. It is a direction she is thinking about, and thinking is not a feature.

---

### B. Designing it

#### UX / interaction designer

*Decides how the product behaves and how people move through it.*

- Designed the core interaction — a step-by-step filter that asks *who is this for, when, what kind of thing, where in the city* — instead of presenting a wall of controls at once.
- Made every filter state live in the web address, so any view can be shared, bookmarked and reached with the back button.
- Mapped the user journeys: the local checking tonight, the parent planning a weekend, the visitor with three days, the organiser who wants to be listed.
- Designed the flows for the things people need to do — submit an event, suggest a correction, ask to be removed, subscribe and choose what the newsletter contains.
- Designed the states most products ignore: no results, no photo, cancelled, sold out, likely free.
- Designed for phones first, because that is where people check what is on tonight.

**Tools:** designed directly in code against a live development server rather than in a separate design file, so an interaction is tested by using it; browser developer tools; keyboard-only walkthroughs; the URL bar itself as the state model. *(verify: whether any separate design software is used for early sketching — nothing in the repository indicates it, and the design system lives in CSS.)*

#### Design system and visual identity designer

*Makes the product look like one coherent thing, and keeps it that way.*

- Built and named the design system — *Funkis*, after a 1938 functionalist building in Bergen — and derived the whole visual language from that: flat surfaces, honest materials, no decoration for its own sake.
- Defined the full token set: colour, typography, spacing, borders, shadows, and the rules for using them.
- Designed the components: the event card, the badges, the filter controls, the calendar, the navigation.
- Designed a colour-coded placeholder system so an event with no photograph still looks intentional rather than broken.
- Designed the brand marks — logo, favicon, stickers — and took the identity into print with posters in two sizes and press-ready files.
- Built the system that generates the sharing image for every single event and landing page automatically, from the same tokens.
- Wrote the design system documentation so the rules survive being forgotten.

**Tools:** the design system is authored as code — CSS custom properties in a single canonical stylesheet, with Tailwind CSS 4 on top; self-hosted Barlow Condensed and Inter; the Lucide icon set; Bits UI for accessible component primitives. All generated artwork — social images, logos, posters, stickers, QR codes — is produced programmatically with Satori, resvg and sharp rather than exported from a design tool. That is unusual and worth saying out loud: the visual identity is a program, so it cannot drift out of sync with the product.

#### Accessibility specialist

*Makes sure the product works for people who do not use it the way I do.*

- Set WCAG 2.2 AA as a build requirement rather than a later audit, and verified the contrast ratios by measurement.
- Made the whole product usable by keyboard, including the more complex components.
- Implemented the correct assistive-technology patterns rather than approximations, and made result counts announce themselves to screen readers.
- Made sure colour is never the only signal — every status is colour plus icon plus text.
- Set a minimum touch-target size everywhere, and made animation respect the visitor's reduced-motion setting.
- Chose text labels over flags for language switching, because a flag is a country and not a language.
- Wrote and published the accessibility statement.

**Tools:** the accessibility linting rules built into the Svelte toolchain, which fail the build rather than warn; keyboard-only testing; WAI-ARIA authoring patterns as the reference. *(verify: WebAIM's Contrast Checker is named as the intended tool in her own colour research document, but the repository cannot confirm it was the one used.)*

#### Content designer / bilingual copywriter

*Writes everything the visitor reads, in two languages.*

- Wrote the brand voice document and the copy guidelines first, then wrote to them.
- Wrote all interface copy in Norwegian and English — every button, empty state, error message, tooltip and form label.
- Wrote the editorial copy and FAQ content for every curated landing page, so each one is a real page and not a filtered list with a heading.
- Wrote the marketing copy for organisers, the newsletter copy, and the legal and policy pages in plain language.
- Made the copy decisions that carry the product's integrity, such as never writing "free" when the data only supports "likely free".

**Tools:** copy lives in typed source files and Markdown inside the repository, not in a separate content system — so every wording change is reviewed, versioned and revertable like code. Voice and copy rules are written documents she authored and works against.

---

### C. Building it

#### Frontend developer

*Builds what the visitor sees and interacts with.*

- Build the whole front end: components, pages and interaction logic, in a current framework and a typed language.
- Built the bilingual structure into the routing itself rather than bolting translation on top, with the correct language signals for search engines.
- Handle the internationalised domain name, so the Norwegian-spelled address works.
- Made data loading happen on the server, so nothing sensitive reaches the browser.
- Tuned caching per page type: time-sensitive listings refresh often, pages that rarely change do not.
- Set a written performance budget and hold the site to it; self-host the fonts; use analytics that need no cookie banner.

**Tools:** SvelteKit 2 and Svelte 5 with the modern reactivity model, TypeScript, Vite, Tailwind CSS 4, Bits UI, Lucide icons; Vercel for hosting with incremental static regeneration; a committed Lighthouse performance budget.

#### Backend and database developer

*Builds the parts nobody sees.*

- Designed the database schema and evolve it through tracked migrations rather than ad-hoc changes.
- Set up row-level access rules so public data is public and nothing else is.
- Built the server endpoints: submissions, newsletter signup, payment callbacks, calendar feeds, health checks, click tracking.
- Built the internal admin area — moderating submissions, handling corrections and removal requests, managing promotions — with its own login.
- Do the unglamorous performance work, such as adding the database indexes that stop a page getting slower as the data grows.

**Tools:** Supabase (managed PostgreSQL) with hand-written SQL migrations and row-level security policies; the Supabase JavaScript client, split into a public and an administrative path; SvelteKit server endpoints; Resend for transactional email; the Stripe SDK for payment webhooks; signed-cookie authentication written from scratch rather than an off-the-shelf auth service.

#### Data engineer / integrations developer

*Gets data in from sixty different websites and makes it consistent.*

- Built and maintain an integration for each source site. Every one is different, and they change without warning.
- Wrote the parsing that turns Norwegian date and time formats, written a dozen different ways, into one machine-readable format.
- Designed the classification that maps free-text descriptions into a fixed set of categories and city districts.
- Built the deduplication: the same concert appears on the venue site, the promoter site and the festival programme, so the system matches them and keeps the most reliable version.
- Built the rules that keep listings honest over time — refreshing events whose dates move, removing events that have passed, resolving links to the actual venue rather than to another aggregator.
- Built the classification that tells me *why* a source stopped producing events, rather than just that it did.
- Made the whole pipeline finish inside a fixed time budget, because it runs on a schedule that will not wait.

**Tools:** TypeScript run with tsx on Node, kept as a separate application with its own dependencies; Cheerio for HTML parsing, deliberately chosen over a headless browser so the pipeline stays fast and cheap; a shared utility layer she wrote for dates, slugs, categories, venues, deduplication and source health; GitHub Actions as the scheduler.

#### AI integration

*Uses a language model for one specific job, with a fallback.*

- Norwegian copyright law protects the descriptions on the source sites, so nothing can be copied. Every description is generated fresh as a short summary in both languages.
- Built the rate limiting and retry handling that keeps it inside the service's limits.
- Built a plain template fallback, so a failure degrades to something usable rather than to nothing.

**Tools:** Google Gemini 2.5 Flash via the official SDK, with the request budget and back-off written by hand.

#### Quality assurance / test engineer

*Stops mistakes reaching the live site.*

- Built and maintain the automated test suite.
- Wrote tests that encode *policy*, not just logic — adding an image source without a documented permission entry makes the build fail. The rule cannot be forgotten, because the machine enforces it.
- Set up the checks that run on every change: security audit, linting, type checking, tests, and a full production build.
- Run scheduled audits of data quality, broken links and stale events.

**Tools:** Vitest; ESLint and Prettier; the Svelte type checker; `npm audit` as a gate rather than a suggestion; GitHub Actions running all of it on every push.

---

### D. Running it

#### DevOps / automation engineer

*Makes the system run without me at the keyboard.*

- Built the scheduled jobs that do the recurring work: collecting events, checking links, sweeping stale data, auditing quality and dependencies, sending the digest, sending the newsletter, publishing to social media, generating reports, scanning for content theft.
- Manage deployment, environment configuration and secrets.
- Keep dependencies current and respond when a security advisory lands.

**Tools:** GitHub Actions for scheduling and continuous integration; Vercel for deployment; Dependabot with a notification workflow she wrote herself; secrets managed across GitHub, Vercel and a local environment file.

#### Site reliability / monitoring

*Notices when something breaks, ideally before anyone else does.*

- Built two health checks: a light one polled continuously by external uptime monitoring, and a deep one that verifies the database, data freshness, the pipeline, image health and data quality.
- Built a daily digest that reports the state of every source and flags what needs attention.
- Set up structured error logging and security violation reporting from the live site.
- Diagnose and fix what breaks — usually a source site that redesigned overnight.

**Tools:** health endpoints she designed and built; UptimeRobot polling from outside *(named in project documentation)*; Vercel's logs as the destination for structured errors; a Content Security Policy reporting endpoint; the daily digest delivered by email.

#### Internal tooling

*Builds the tools for the parts that still need a human.*

- Built a set of command-line tools for the operational work: administration, permission tracking, link quality, ticket-link auditing, prospect and placement reporting.
- The principle is simple: anything done by hand twice gets a tool.

**Tools:** her own command-line programs written in TypeScript and run with tsx, plus a browser-based admin area for the tasks that need eyes on the content.

---

### E. Getting it used

#### SEO specialist

*Makes the product findable.*

- Do the keyword research and decide which pages are worth building, based on what people actually search for.
- Built the curated landing pages that answer real searches — this weekend, free things to do, rainy days, per district, per season, per festival.
- Implemented structured data so search engines understand each event as an event, with the time zone handled correctly.
- Handled the technical side: crawlable pagination, language signals, sitemaps, instant index notification.
- Track performance and act on it.
- Maintain a seasonal calendar so the right pages are optimised *before* the season, not during it.
- Made the site legible to AI search assistants, and track referrals from them.

**Tools:** Google Search Console, read programmatically through its API with a service account so the data can be stored before Google discards it; Bing Webmaster Tools with IndexNow for instant indexing; JSON-LD structured data; an `llms.txt` file and explicit crawler permissions for AI assistants; her own reporting scripts that snapshot search performance into the database and mail a weekly summary.

#### Social media and community manager

*Distribution, day to day.*

- Built the pipeline that turns the week's events into social posts — image, caption, scheduling — instead of making each one by hand.
- Write the captions to a house style, per channel and per group.
- Built a fairness rule into the system so no single venue dominates the feed.
- Manage distribution into local community groups, each with different rules.
- Collect and read the performance data afterwards.

**Tools:** the Meta Graph API for Instagram and Facebook, driven by a command-line tool she wrote; post artwork generated programmatically from the design tokens, in carousel, story and reel formats; the AT Protocol client for Bluesky, built and then deliberately paused when the channel did not earn its keep.

#### Email and CRM

*The direct channel.*

- Run a weekly newsletter, personalised to what each subscriber said they were interested in.
- Built the preference system that makes that possible.
- Handle the transactional email: submission confirmations, notices to organisers, correction acknowledgements, reminders.
- Manage the inbox — enquiries from venues, requests from users, replies to outreach.

**Tools:** MailerLite for the newsletter, driven by her own send script rather than the web interface; Resend for transactional mail; Protonmail as the business inbox, with server-side Sieve filter rules she wrote to sort incoming mail automatically.

#### Analytics and reporting

*Knows whether any of it worked.*

- Set up privacy-friendly analytics, self-proxied, with no cookie banner needed.
- Built the storage that snapshots search and social performance into the database, so trends survive the platforms' short retention windows.
- Built attribution tracking — which listings were seen, which links were clicked, where a visitor came from — because a paying venue is entitled to know what it bought.
- Produce the recurring internal reports and the customer-facing ones.
- Applied a strict rule to anything customer-facing: measured numbers only, never estimates.

**Tools:** Umami Cloud, proxied through her own domain so it is not blocked; Google Search Console and Bing; the Meta insights API; purpose-built metrics tables in PostgreSQL; report generators that output standalone HTML.

---

### F. Keeping it legitimate

#### Legal and compliance

*The part most builders skip.*

- Researched what Norwegian law actually requires of a product like this, and wrote it down before building.
- Copyright: no description is ever copied from a source. Everything is regenerated.
- Marketing law: paid placement has to be identifiable, so the promotion system labels every promoted item by design rather than hiding it. Built into the system from the start, before anything was ever sold — which is the point. The labelling was a design constraint, not a concession made later. *(Nothing is currently promoted; see the accuracy note in §2A.)*
- Data protection: privacy policy, data processing agreements, and analytics deliberately chosen to collect as little as possible.
- Collection ethics: a written checklist requiring the source's own crawling rules to be checked before a single line of code is written; an honest identifier so any site owner can see exactly who is requesting; deliberate delays between requests; and blanket exclusion of anything not meant to be public — kindergartens, schools, members-only events.
- Built a public page explaining exactly how data is collected, and a mechanism for any organiser to opt out of being listed at all.
- Built a correction flow on every event, because aggregated data is sometimes wrong and fixing it should not require an email.

**Tools:** written policy documents and a mandatory checklist kept in the repository; the opt-out and correction mechanisms built into the product and its database; public transparency and privacy pages on the site itself.

#### Rights management and incident response

*What happened when it went wrong.*

- A copyright claim over an image arrived in April 2026. I handled it from first contact to resolution myself.
- Then changed the system rather than just the image: a written image policy, a permission register recording who agreed to what, and a rule that no source enters the approved list without a documented entry — enforced by an automated test.
- Run an ongoing campaign, source by source, to get written permission where it is missing, and track the gap by measuring it rather than assuming it.
- Built monitoring for content theft in the other direction, with a deliberate escalation ladder that stops well short of legal threats.

**Tools:** a permission register in Markdown, bound to the code by a test that fails the build; a command-line tool that reports the current permission gap on demand; canary records planted in the data and a monthly automated scan for them; written agreements archived in Protonmail and never deleted.

#### Stakeholder relations

*The people, not the code.*

- Handle all correspondence with venues and organisers — introductions, permission requests, removal requests, complaints, partnership offers.
- Moderate everything submitted by the public before it is published.
- Run partnership and backlink outreach.
- Keep an honest record of who said yes, who said no, who said no and later said yes, and why.

**Tools:** Protonmail with her own filter rules; the admin moderation interface she built; database tables for opt-out requests, correction suggestions and organiser inquiries; a private, deliberately non-public archive for anything containing personal data.

---

### G. Holding it together

#### Documentation and process

*So the project survives being put down and picked up again.*

- Maintain the project documentation: design system, brand voice, copy rules, strategy, decision log, operational runbooks, and a mandatory checklist for adding a new source.
- Keep the commit history structured and readable, so the history is itself documentation.
- Separate private material — correspondence, personal data, permission evidence — from the public code repository, deliberately and by policy.

**Tools:** Markdown in the repository; Git with a strict conventional commit format; GitHub; Slidev for presentations; Playwright for automated screen recordings of the live site.

---

## 3. The tools, gathered

For the tech-stack strip on the portfolio page. Grouped so a reader can scan it. Everything below is verified in the repository except the two marked.

| Area | Tools |
|---|---|
| Language and runtime | TypeScript, Node, tsx |
| Frontend | SvelteKit 2, Svelte 5, Vite, Tailwind CSS 4, Bits UI, Lucide |
| Design | CSS custom property token system, self-hosted Barlow Condensed and Inter, Satori, resvg, sharp, QRCode |
| Data and backend | Supabase, PostgreSQL, SQL migrations, row-level security |
| Data collection | Cheerio, custom parsing, normalisation and deduplication layer |
| AI | Google Gemini 2.5 Flash |
| Testing and quality | Vitest, ESLint, Prettier, svelte-check, npm audit |
| Hosting and automation | Vercel, GitHub Actions, Dependabot |
| Monitoring | Custom health endpoints, UptimeRobot *(per project documentation)*, Vercel logs, CSP reporting |
| Email | MailerLite, Resend, Protonmail with Sieve rules |
| Payments | Stripe |
| Search | Google Search Console API, Bing Webmaster Tools, IndexNow, JSON-LD, `llms.txt` |
| Social | Meta Graph API (Instagram, Facebook), AT Protocol (Bluesky, paused) |
| Analytics | Umami Cloud (self-proxied) |
| Working environment | VS Code, Git, GitHub, Slidev, Playwright |

Two notes for the portfolio agent:

- **No design software appears anywhere in this project.** The design system is CSS, and every visual asset — logo, posters, stickers, social images — is generated by code. Do not add a Figma or Adobe logo to the stack strip. *(verify with Kjersti whether anything is used for early sketching that simply leaves no trace in the repository.)*
- **WebAIM's Contrast Checker** is named as the intended contrast tool in her own colour research document, but the repository cannot confirm it was used. Ask before listing it.

---

## 4. The interactive roles section — build spec

Nineteen roles will not fit on a page as prose, and compressing them to six loses the point. The solution Kjersti has decided on: make the section **interactive**. The full scope is visible at a glance; selecting a role opens the detail, with a visual that shows what that work actually looks like.

This section specifies it. Build it to the standard the case study is arguing for — if the page breaks Gåri's own design and accessibility rules, it undercuts everything it claims.

### 4.1 Structure — two layers, not three

**Layer one, always visible.** Six cluster headings, with the role labels underneath each. This is the whole scope, readable in about two seconds without a single click:

| Cluster | Roles |
|---|---|
| **Product owner** — decided what to build, what to cut, and why | Product owner · Business lead |
| **Designer** — how it works, how it looks, how it reads, who it works for | UX · Design systems · Accessibility · Bilingual copy |
| **Developer** — the front end, the data, and the tests that keep it honest | Frontend · Backend · Data integrations · AI integration · QA |
| **Operator** — six months live, without a team | DevOps · Monitoring · Internal tooling |
| **Marketer** — getting it found, and knowing whether it worked | SEO · Social · Email · Analytics |
| **The person responsible** — the parts with consequences | Legal · Rights management · Stakeholder relations |

The last cluster is the one that separates this from a student project. Do not bury it at the bottom of the list by accident — it earns its place.

**Layer two, on selection.** A detail panel showing, for the selected role: the title, the one-sentence definition, three or four tasks, the tools row, and one visual. All of it is already written in §2 — the panel content is an edit of that material, not new writing.

Two or three roles also carry a full deep-dive elsewhere on the page. Those get a link out of the panel rather than a longer panel.

### 4.2 Interaction rules — not negotiable

- **Use the tabs pattern.** Role labels are tabs, the detail panel is the tab panel, with arrow-key navigation between labels. It is a solved pattern with defined keyboard behaviour, and it is the same class of pattern Kjersti already implemented on the product's calendar.
- **Click, never hover.** A hover-only reveal excludes every touch device and every keyboard user, and would be a strange thing to ship on a page arguing for accessibility.
- **One role open on load,** so the panel is never an empty box waiting to be discovered.
- **Announce the change** to assistive technology, or move focus into the panel on selection.
- **Put the selected role in the URL** as a fragment, so a single role can be linked directly. This is the same principle as the product's own filter state, and worth one sentence of copy: the portfolio page behaves the way the product does.
- **All panel content in the markup,** not fetched on demand. Without scripting it degrades to a long readable list, which is an acceptable worst case.
- **Site rules apply:** 44 by 44 pixel minimum targets, no gradients, the Funkis tokens, and reduced motion respected.

### 4.3 The media plan

The governing rule: **motion has to show a mechanism.** If an animation would only decorate, use a still image instead. A decorative loop costs load time and credibility at the same time.

**Tier A — motion earns its place.** Four or five, made properly:

| Role | What the motion has to show |
|---|---|
| UX designer | The step-by-step filter being answered — who, when, what, where — with the address bar changing in step. Screen capture; the interaction explains itself. |
| Data integrations | Sixty sources collapsing into one listing, and two duplicate entries for the same concert merging into one. Authored diagram, not screen capture — the mechanism is invisible in the interface. |
| Design systems | One token changing, and the change propagating through card, badge, button and generated sharing image. Authored. |
| Operator | A twenty-four hour clock with the scheduled jobs firing at their times, ending with the digest arriving. Authored. This is the clearest way to show that a system runs without her. |
| Rights management | Optional, and only if it can be done without drama: the permission register, an unregistered source added, the build failing. Screen capture of a terminal. |

**Tier B — a still does the job.** Most roles. Screenshots, an artefact photograph, a short code excerpt, a grid of generated sharing images, a page from a venue report.

**Tier C — text only, deliberately.** Legal, and stakeholder relations. There is no honest image for these, and a stock illustration would cheapen the most credible material on the page. Leaving them visually plain is a choice a reader will register as confidence.

### 4.4 What already exists, and what has to be made

**Reusable now:** the Playwright scripts in the presentation folder record the live site automatically — re-run them to produce fresh captures at whatever size the page needs, rather than reusing May's projector-sized files. Also available: the print assets, the generated sharing images, the brand icon set, and the admin interface.

**Has to be made:** the authored diagrams in Tier A. Those are the ones worth Kjersti's own time.

**Blocked until decided:** any capture of the live listing that shows third-party press photographs. See handover §6 — this is unresolved, and the recommended path is to re-record against a view where events render with the category placeholders instead. That is legally clean and doubles as a showcase for the placeholder system.

### 4.5 Weight

- **Load panel media on selection,** not on page load. Nineteen assets arriving at once would be indefensible on a page that praises the product's performance budget.
- **Prefer authored SVG and CSS over video** for the diagrams: kilobytes rather than megabytes, sharp at any size, and editable later without re-rendering.
- **Video only for real screen capture.** Short — under six seconds — muted, looping, no controls, with a poster frame. Re-encode for web; the existing recordings are 14 MB and 11 MB, which is a projector file, not a web file.
- **The poster frame is also the reduced-motion state.** A visitor who has asked their system for less movement should get a still image, not a paused video element.

### 4.6 A warning about scope

Nineteen bespoke animations is weeks of work, and the page does not need it. Five authored pieces plus stills everywhere else is achievable and reads as deliberate.

A page where five visuals are excellent and fourteen are plain screenshots looks confident. A page with nineteen mediocre animations looks padded, and a recruiter will read the padding rather than the work.

---

## 5. Where the evidence lives

So any claim above can be checked before it is written about.

| Role | Look here |
|---|---|
| Product owner | `docs/DECISION-LOG.md`, `docs/project-strategy.md`, `docs/CUSTOMER-JOURNEYS.md`, `docs/strategic-roadmap-v2.md` |
| Business owner | `/[lang]/for-arrangorer/`, `src/lib/promotion-config.ts`, `scripts/generate-pitch-report.ts`, `scripts/generate-prospect-report.ts`, `docs/outreach/` |
| UX designer | `src/lib/components/EventDiscovery.svelte`, `src/lib/event-filters.ts`, `docs/design-brief.md` |
| Design system | `src/app.css` (canonical), `docs/DESIGN-SYSTEM.md`, `src/routes/og/`, `scripts/generate-print.ts`, `print/`, `static/stickers/` |
| Accessibility | `/[lang]/tilgjengelighet/`, component source, `docs/DESIGN-SYSTEM.md` |
| Copywriter | `docs/BRAND-VOICE.md`, `docs/COPY-GUIDELINES.md`, `src/lib/collections.ts` |
| Frontend | `src/routes/`, `src/lib/components/`, `src/hooks.server.ts`, `lighthouse-budget.json` |
| Backend | `supabase/migrations/`, `src/lib/server/`, `src/routes/api/`, `src/routes/admin/` |
| Data engineer | `scripts/scrape.ts`, `scripts/scrapers/`, `scripts/lib/dedup.ts`, `categories.ts`, `venues.ts`, `utils.ts` |
| AI integration | `scripts/lib/ai-descriptions.ts` |
| QA | `scripts/lib/__tests__/`, `src/**/*.test.ts`, `.github/workflows/ci.yml` |
| DevOps | `.github/workflows/` |
| Monitoring | `/api/health`, `/api/health/deep`, `scripts/lib/scraper-health.ts`, `scripts/send-daily-digest.ts` |
| Internal tooling | `scripts/` |
| SEO | `src/lib/seo.ts`, `src/lib/collections.ts`, `docs/seo-ai-playbook.md`, `/llms.txt` |
| Social | `scripts/social/`, `scripts/meta.ts` |
| Email and CRM | `scripts/send-newsletter.ts`, `scripts/notify-organizers.ts`, `docs/email-sieve-filter.sieve` |
| Analytics | `supabase/migrations/` (metrics, search console, insights), `scripts/seo-weekly-report.ts` |
| Legal | `docs/legal/`, `docs/legal-research-norway.md`, `docs/new-scraper-checklist.md`, `/[lang]/datainnsamling/` |
| Rights management | `docs/ip-protection.md`, `docs/bildesamtykke.md`, `scripts/canary-*.ts`, `scripts/consent.ts` |

---

## 6. What these roles do not cover

Naming the limits makes everything above more credible, not less. State them plainly near the end of the case study, in Kjersti's own voice.

- **No team experience.** Everything here is solo. Nothing demonstrates code review, pairing, mentoring, or delivering inside someone else's process.
- **No large-scale systems.** This is a city-level product. Nothing demonstrates high traffic or high concurrency.
- **Managed platforms throughout.** The operations work is real, but there is no infrastructure-as-code, no container work, no on-call rotation. Describe it as running a system, not as site reliability engineering.
- **Data engineering at this size.** The pipeline is genuine, but it is scheduled scripts, not distributed processing. Describe it accurately and let the reader judge.
- **Trained as a designer, not an engineer.** True, and worth saying — but as calibration at the end, after the evidence, not as a disclaimer at the start.

---

## 7. Appendix: measured scale

Secondary. Use sparingly, and only where a section needs a sense of size.

All figures derived from the repository on 2026-08-18, with the command to re-derive them. They drift — re-check before publishing.

| Figure | On 2026-08-18 | How derived |
|---|---|---|
| Commits | 1,107 | `git log --oneline \| wc -l` |
| Active period | 2026-02-18 → 2026-08-14 | first and last commit dates |
| Active sources | 59 | `grep -c "^import { scrape as" scripts/scrape.ts` |
| Curated landing pages | 59 | `grep -c "^		slug: '" src/lib/collections.ts` |
| Components | 21 | `ls src/lib/components/*.svelte \| wc -l` |
| Pages / server endpoints | 28 / 23 | `find src/routes -name '+page.svelte' \| wc -l`, same for `+server.ts` |
| Tests | 1,081 across 17 files | `npx vitest run` |
| Scheduled and CI workflows | 17 | `ls .github/workflows/*.yml \| wc -l` |
| Database migrations | 35 | `ls supabase/migrations \| wc -l` |
| Operator scripts | 40 top-level, 19 shared, 20 social | `ls scripts/*.ts`, `scripts/lib/`, `scripts/social/` |

Two notes:

- **Line counts are a weak metric** and experienced readers discount them. Leave them out.
- **`CLAUDE.md` says 53 landing pages; the code says 59.** Trust the code. Several documents in `docs/` are February-vintage and undercount.

---

## 8. One thing that needs Kjersti's decision

The handover forbids the AI-workflow argument, and it is right to — that is a different presentation for a different audience. But "I did all of this alone" and "I use AI heavily to do it" are both true, and a reader who works in this industry will wonder how one person covers this many roles.

The clean resolution is one honest sentence near the end, stated and not elaborated. Volunteering it costs nothing and pre-empts the question. A page that appears to be hiding it costs a lot.

This is Kjersti's call, not the portfolio agent's.
