# Gåri — portfolio brief

**The single source of truth for the portfolio case study.**
Written 2026-08-18. Replaces `PORTFOLIO-HANDOVER.md`, `PORTFOLIO-SKILLS-INVENTORY.md` and `PORTFOLIO-VISION-AND-RELATIONSHIPS.md`, all three now in `docs/archive/`. If they disagree with this document, this document wins.

Everything here has been checked against the code as it stands on 2026-08-18. Where something could not be verified, it says so.

---

## 1. How to use this

The case study has to answer three questions, in this order:

1. **What is Gåri, and why does it exist?** → §2, §3
2. **What did Kjersti actually do?** → §4, §5
3. **Is any of this true?** → §11, §12

Most portfolios answer only the first. The reason this one is being rebuilt is that a recruiter is reading for the second, and a feature list does not answer it.

**§10 is the running order of the page, and it is decided.** Everything from §2 to §9 is source material to draw on, not the sequence to build in. Do not follow this document's own order when laying out the page.

Copy is **English**, first person, for an international audience — employers, studios, graduate programmes — who have never heard of Bergen and do not read Norwegian.

Two rules that override everything else in this document: **§9 (accuracy)** and **§7 (the design rules the page itself must obey)**. Breaking either undermines the case the page is making.

---

## 2. What Gåri is

A bilingual event platform for Bergen, Norway. It collects what is happening in the city — concerts, theatre, exhibitions, family events, food, sport, nightlife, student events, guided tours — from around sixty local venue and organiser websites, and presents them in one filterable listing.

- **Live at** [gaari.no](https://gaari.no). The Norwegian-spelled address `gåri.no` also works and redirects.
- **The name** comes from the Bergen dialect phrase *"Ke det går i?"* — roughly "what's going on?". *Gåri* is the contracted spoken form. It needs a one-line gloss for an international reader, and it is a good naming story worth telling properly rather than in a parenthesis.
- **The tagline**, *"Ke det går i Bergen?"*, stays in dialect and untranslated on the site itself.
- **Built and run by** Kjersti V. Therkildsen, alone, alongside a master's at Keio Media Design.

**Bergen** needs one or two sentences of context, not a travel guide: Norway's second city, on the west coast, known for rain, seven mountains, and a dense cultural life relative to its size. Verify the population figure before printing it.

### The problem

Event information in Bergen is scattered. Every venue publishes its own programme on its own site in its own format. The alternatives that exist are tourism-board marketing or ticket-vendor listings, and both only show what they have a commercial interest in showing.

The premise: someone in Bergen should be able to answer *what can I do tonight* in one place, in under ten seconds, without being sold anything.

### Who it is for

Two groups, and the relationship between them is the product. See §3.

---

## 3. The vision — a digital town square

*This section is Kjersti's own argument, in her framing. Write it as her position — "I think", "the premise I built on" — not as received wisdom about platform design. It is more persuasive as a conviction she can defend.*

Everything happening in the city, in one place, easy to find.

The important part is who "everything" includes. A neighbourhood market run by four friends. A school doing something for the streets around it. A pop-up shop open for one afternoon. And, in the same listing, a sold-out concert in the biggest hall in town.

These are not competitors for attention — they benefit from each other. The person who came for the concert discovers the market three streets away. The market reaches an audience it could never have reached alone. The concert sits inside a picture of a city that is alive rather than a picture of one venue. **Density is the product.**

### Free to enter is structural, not a price decision

This is the load-bearing idea. The moment there is a gate, the people who cannot pay stop showing up — and the four friends with the market are exactly who a gate removes first. Remove enough of them and it is no longer a town square; it is a listings page for organisations with a marketing budget, which is precisely what already exists in Bergen and precisely what Gåri was built because of.

So: free to be listed, free to be in the newsletter, free to be posted on social media. Not generosity. The condition for the thing working at all.

> **Keep close to verbatim:** *the space itself has to be free to enter in order for the space to work.*

### The organiser side — three doors in

The whole relationship is designed around one principle: **meet them where they already are.**

**Door one — send in a single event.** For the small and local: the pop-up, the neighbourhood market, the school event, the one-off. One short form. Kjersti reads it herself, approves it if it belongs, and an automatic confirmation goes out saying it is live. Nothing more is asked.

*Verified.* The confirmation job is written to reconcile a state rather than fire on an action: it looks for events that are approved, have a submitter address, and have not been told yet. So approval can happen anywhere, nobody is told twice, and nobody is forgotten. `src/routes/[lang]/submit/`, `src/routes/admin/submissions/`, `scripts/notify-submitters.ts`.

**Door two — send in your programme page.** For anyone who already keeps a calendar: a venue, theatre, library, festival, club. They send the address of the page where their programme already lives and ask for it to be collected. From then on it happens daily, automatically, and they do nothing.

This is the part to explain slowly, because the principle underneath it is the interesting bit:

> **I am not asking them to change their habits. I am asking them to tell me where their workflow already is, so I can meet it there.**

Every aggregator that fails does so by demanding double work — log into another system, re-enter what you already published, keep two calendars in sync. Organisers will not, and should not have to. So the burden sits on Kjersti's side: she writes the integration against their page and maintains it when they redesign it. Their side of the arrangement is one email.

*Verified.* The submission page offers this as an explicit second path, landing in a separate organiser-inquiries table rather than the event queue.

**Door three — the open door.** A correction form on every single event. Ask for something to be added or presented differently. Ask for an image to be used differently, or not at all. Opt out entirely — at the level of a whole domain, not one event at a time. Or just ask a question.

And it is visible from outside: a public page explains exactly what is collected, how, how often, and how to stop it. Nobody has to ask in order to find out.

*Verified.* Correction flow on event pages, `opt_out_requests` and `edit_suggestions` tables, `/[lang]/datainnsamling/`, and the opt-out list applied on every pipeline run before anything is written.

**One nuance not to flatten:** social posting is free, but not unlimited or automatic. A fairness rule stops any single venue dominating the feed, and promoting a venue's own photographs requires their written permission. Free of charge is not free of rules, and the rules protect organisers rather than ration the service. Say it accurately — it strengthens the ethics section.

### The visitor side

**Before you do anything**, the page shows what is happening next, chronologically. Not a ranking, not an algorithm, not what someone paid to put there. The next thing happening in Bergen, then the one after. That is the honest default, and it serves someone standing on a street corner at six in the evening.

*Verified.* Ordered by start date ascending on the server, with ongoing multi-day events handled separately so a three-week exhibition does not sit permanently at the top.

**Then you shape it to yourself.** Who is this for — family, young people, students, adults, nightlife, a visitor. Then when, then what kind of thing, then where in the city, with time of day and price as refinements.

The premise underneath: **people are not personas.** The same person is a parent on Saturday morning, a student on Tuesday, and out with friends on Friday. The interface asks who this is for *right now* — a question about the occasion — instead of assuming a fixed identity and remembering it.

**Each audience is hand-built, and this is worth showing** because it looks like a simple filter and is not. No field in the data says "this is for students". Each audience is a classifier written by hand, combining the age group where a source supplied one, the category, the venue, and pattern matching against the Norwegian title and description — including the exclusions, so an 18+ event can never surface under family and a family event never surfaces under adults. The youth classifier alone matches a dozen ways Norwegian sources write "for young people", including age ranges written as text.

That is not a filter. It is a taxonomy she built because the source data does not have one.

**The landing pages do two jobs at once.** Curated pages for what people actually want — this weekend, family weekend, free things to do, a rainy day, each district, and each point in the year: midsummer, Christmas markets, Easter, the winter break, New Year's Eve. For a person they are a shortcut with real editorial copy. For search they answer a query someone is typing right now, including in AI assistants. The seasonal ones compute their own date windows — the Easter page calculates Easter, the midsummer page knows the celebration falls the weekend before the date, the winter-break page resolves the correct school week — so they work every year without being rebuilt.

### Why the two sides need each other

> The visitors are only served if the listing is complete. The listing is only complete if organisers of every size are in it. Organisers of every size are only in it if being in it costs nothing and demands nothing. So the free, open, low-friction relationship with organisers is not a nice gesture alongside the product — it *is* the product, seen from the other end.

That is the sentence the whole case study hangs on. Land it properly.

---

## 4. The roles, the work, the tools

On a normal team this would be a dozen people with a dozen job titles. This section exists so a reader can see the scope without having to infer it.

For each role: what it means here, the actual tasks in first person, and the tools. Everything is verified in the repository unless marked *(verify)*.

### Product owner / product manager
*Decides what gets built, what gets cut, and in what order.*

- Found the problem myself, defined the gap, and decided it was worth solving.
- Defined who the product is for and wrote out how each group arrives and what they need.
- Scoped the first version: what had to exist for launch, what could wait.
- Keep a written decision log. Every significant decision numbered, dated, and recorded with its reasoning — including the decisions *not* to build something: no dark mode, no map view in version one, no infinite scroll, no search autocomplete.
- Maintain and re-prioritise the roadmap, alone and part-time alongside a master's degree.
- Researched the competing platforms in the city and positioned deliberately against them.
- Decide when something is finished, when something is wrong, and when to reverse an earlier decision.

**Tools:** Markdown decision log, strategy and journey documents kept in the repository; Git and GitHub as the record of what changed and when; a project calendar and reminder system built into the product's own database. There is deliberately no separate project-management product — the repository is the system of record, which is why the reasoning is still readable six months later.

### Business and commercial
*Turns the product into something that can pay for itself.*

**Read §9 before writing anything about money.**

- Designed a subscription model — tiers for venues plus single-event promotion, priced so smaller organisers would not be shut out — and built all of it: marketing page, payment handling, placement rotation, labelling, reporting.
- Built per-venue reports showing what the platform does for that specific venue.
- Maintain a prospect list and run outreach myself.
- Am now reconsidering the model, because the one I built asks organisers to pay before the platform has proved its worth to them.

**Tools:** Stripe; PostgreSQL tables for placements, inquiries and a placement log; self-built report generators producing a standalone HTML report per venue; click tracking that records which listings sent a visitor to a venue; Protonmail for correspondence.

### UX / interaction designer
*Decides how the product behaves and how people move through it.*

- Designed the core interaction — a step-by-step filter asking who, when, what, where — instead of a wall of controls.
- Made every filter state live in the web address, so any view is shareable, bookmarkable and back-button safe.
- Mapped the user journeys: the local checking tonight, the parent planning a weekend, the visitor with three days, the organiser who wants to be listed.
- Designed the flows for what people need to do — submit, correct, opt out, subscribe and choose what the newsletter contains.
- Designed the states most products ignore: no results, no photo, cancelled, sold out, likely free.
- Designed for phones first, because that is where people check what is on tonight.

**Tools:** designed directly in code against a live development server rather than in a separate design file, so an interaction is tested by using it; browser developer tools; keyboard-only walkthroughs; the URL bar itself as the state model. *(verify: whether anything is used for early sketching — nothing in the repository indicates it.)*

### Design system and visual identity
*Makes the product look like one coherent thing, and keeps it that way.*

- Built and named the design system — *Funkis*, after a 1938 functionalist building in Bergen — and derived the whole visual language from it: flat surfaces, honest materials, no decoration for its own sake.
- Defined the full token set and the rules for using it.
- Designed the components: card, badges, filter controls, calendar, navigation.
- Designed a colour-coded placeholder system so an event with no photograph still looks intentional rather than broken.
- Designed the brand marks, and took the identity into print with posters in two sizes and press-ready files.
- Built the system that generates the sharing image for every event and landing page automatically, from the same tokens.
- Wrote the design system documentation so the rules survive being forgotten.

**Tools:** the design system is authored as code — CSS custom properties in one canonical stylesheet, Tailwind CSS 4 on top, self-hosted Barlow Condensed and Inter, the Lucide icon set, Bits UI for accessible primitives. All generated artwork — social images, logos, posters, stickers, QR codes — is produced programmatically with Satori, resvg and sharp rather than exported from a design tool. **No design software appears anywhere in this project.** Do not put a Figma or Adobe logo in the stack strip. The identity is a program, so it cannot drift out of sync with the product — that is worth one sentence of its own.

### Accessibility
*Makes sure the product works for people who do not use it the way I do.*

- Set WCAG 2.2 AA as a build requirement rather than a later audit, and verified the contrast ratios by measurement.
- Made the whole product usable by keyboard, including the more complex components.
- Implemented the correct assistive-technology patterns rather than approximations, and made result counts announce themselves.
- Made sure colour is never the only signal — every status is colour plus icon plus text.
- Set a minimum touch-target size everywhere, and made animation respect the visitor's reduced-motion setting.
- Chose text labels over flags for language switching, because a flag is a country and not a language.
- Wrote and published the accessibility statement.

**Tools:** accessibility linting built into the Svelte toolchain, failing the build rather than warning; keyboard-only testing; WAI-ARIA authoring patterns as the reference. *(verify: WebAIM's Contrast Checker is named as the intended tool in her own colour research, but the repository cannot confirm it was used.)*

### Bilingual content and copy
*Writes everything the visitor reads, in two languages.*

- Wrote the brand voice document and copy guidelines first, then wrote to them.
- Wrote all interface copy in Norwegian and English — every button, empty state, error message, tooltip, form label.
- Wrote editorial copy and FAQ content for every curated landing page, so each is a real page and not a filtered list with a heading.
- Wrote the organiser marketing copy, the newsletter, and the legal and policy pages in plain language.
- Made the copy decisions that carry the product's integrity, such as never writing "free" where the data only supports "likely free".

**Tools:** copy lives in typed source files and Markdown inside the repository, not a separate content system — so every wording change is reviewed, versioned and revertable like code.

### Frontend developer

- Build the whole front end: components, pages and interaction logic, in a current framework and a typed language.
- Built the bilingual structure into the routing itself rather than bolting translation on top, with the correct language signals for search engines.
- Handle the internationalised domain, so the Norwegian-spelled address works.
- Made data loading happen on the server, so nothing sensitive reaches the browser.
- Tuned caching per page type: time-sensitive listings refresh often, pages that rarely change do not.
- Set a written performance budget and hold the site to it; self-host the fonts; use analytics that need no cookie banner.

**Tools:** SvelteKit 2 and Svelte 5, TypeScript, Vite, Tailwind CSS 4, Bits UI, Lucide; Vercel with incremental static regeneration; a committed Lighthouse budget.

### Backend and database

- Designed the schema and evolve it through tracked migrations rather than ad-hoc changes.
- Set up row-level access rules so public data is public and nothing else is.
- Built the server endpoints: submissions, newsletter signup, payment callbacks, calendar feeds, health checks, click tracking.
- Built the internal admin area — moderating submissions, handling corrections and removal requests, managing promotions — with its own login.
- Do the unglamorous performance work, such as the indexes that stop a page getting slower as the data grows.

**Tools:** Supabase (managed PostgreSQL) with hand-written SQL migrations and row-level security; the Supabase client split into a public and an administrative path; SvelteKit server endpoints; Resend for transactional email; the Stripe SDK; signed-cookie authentication written from scratch rather than an off-the-shelf auth service.

### Data integrations
*Gets data in from sixty different websites and makes it consistent.*

- Built and maintain an integration for each source site. Every one is different, and they change without warning.
- Wrote the parsing that turns Norwegian dates and times, written a dozen different ways, into one machine-readable format.
- Designed the classification that maps free text into a fixed set of categories and city districts.
- Built the deduplication: the same concert appears on the venue site, the promoter site and the festival programme, so the system matches them and keeps the most reliable version.
- Built the rules that keep listings honest over time — refreshing events whose dates move, removing events that have passed, resolving links to the actual venue rather than to another aggregator.
- Built the classification that says *why* a source stopped producing events, not just that it did.
- Made the pipeline finish inside a fixed time budget, because it runs on a schedule that will not wait.

**Tools:** TypeScript on Node, kept as a separate application with its own dependencies; Cheerio for HTML parsing, deliberately chosen over a headless browser so the pipeline stays fast and cheap; a shared utility layer she wrote for dates, slugs, categories, venues, deduplication and source health; GitHub Actions as the scheduler.

### AI integration
*One specific job, with a fallback.*

- Norwegian copyright law protects the descriptions on source sites, so nothing can be copied. Every description is generated fresh as a short summary in both languages.
- Built the rate limiting and retry handling that keeps it inside the service's limits.
- Built a plain template fallback, so a failure degrades to something usable rather than to nothing.

**Tools:** Google Gemini 2.5 Flash via the official SDK, with the request budget and back-off written by hand.

### Quality assurance

- Built and maintain the automated test suite.
- Wrote tests that encode *policy*, not just logic — adding an image source without a documented permission entry fails the build. The rule cannot be forgotten because the machine enforces it.
- Set up the checks that run on every change: security audit, linting, type checking, tests, full production build.
- Run scheduled audits of data quality, broken links and stale events.

**Tools:** Vitest; ESLint and Prettier; the Svelte type checker; `npm audit` as a gate rather than a suggestion; GitHub Actions running all of it on every push.

### DevOps and automation

- Built the scheduled jobs that do the recurring work: collecting events, checking links, sweeping stale data, auditing quality and dependencies, sending the digest and the newsletter, publishing to social, generating reports, scanning for content theft.
- Manage deployment, environment configuration and secrets.
- Keep dependencies current and respond when a security advisory lands.

**Tools:** GitHub Actions for scheduling and CI; Vercel for deployment; Dependabot with a notification workflow she wrote herself; secrets across GitHub, Vercel and a local environment file.

### Monitoring and reliability

- Built two health checks: a light one polled continuously from outside, and a deep one verifying database, data freshness, pipeline, image health and data quality.
- Built a daily digest reporting the state of every source and flagging what needs attention.
- Set up structured error logging and security violation reporting from the live site.
- Diagnose and fix what breaks — usually a source site that redesigned overnight.

**Tools:** health endpoints she designed and built; UptimeRobot polling from outside *(named in project documentation)*; Vercel logs; a Content Security Policy reporting endpoint; the digest delivered by email.

### Internal tooling

- Built command-line tools for the operational work: administration, permission tracking, link quality, ticket-link auditing, prospect and placement reporting.
- The principle: anything done by hand twice gets a tool.

**Tools:** her own TypeScript command-line programs, plus a browser admin area for tasks that need eyes on the content.

### SEO

- Do the keyword research and decide which pages are worth building from what people actually search for.
- Built the curated landing pages that answer real searches.
- Implemented structured data so search engines understand each event as an event, with the time zone handled correctly.
- Handled crawlable pagination, language signals, sitemaps, instant index notification.
- Track performance and act on it.
- Maintain a seasonal calendar so the right pages are optimised *before* the season.
- Made the site legible to AI search assistants, and track referrals from them.

**Tools:** Google Search Console read programmatically through its API with a service account, so the data is stored before Google discards it; Bing Webmaster Tools with IndexNow; JSON-LD; an `llms.txt` file and explicit crawler permissions; her own scripts that snapshot search performance into the database and mail a weekly summary.

### Social media

- Built the pipeline that turns the week's events into posts — image, caption, scheduling — instead of making each by hand.
- Write the captions to a house style, per channel and per group.
- Built a fairness rule so no single venue dominates the feed.
- Manage distribution into local community groups, each with different rules.
- Collect and read the performance data afterwards.

**Tools:** the Meta Graph API for Instagram and Facebook, driven by a command-line tool she wrote; post artwork generated programmatically from the design tokens in carousel, story and reel formats; an AT Protocol client for Bluesky, built and then deliberately paused when the channel did not earn its keep.

### Email and CRM

- Run a weekly newsletter personalised to what each subscriber said they were interested in, and built the preference system that makes it possible.
- Handle transactional email: submission confirmations, organiser notices, correction acknowledgements, reminders.
- Manage the inbox — enquiries from venues, requests from users, replies to outreach.

**Tools:** MailerLite driven by her own send script rather than the web interface; Resend for transactional mail; Protonmail as the business inbox, with server-side filter rules she wrote to sort incoming mail automatically.

### Analytics

- Set up privacy-friendly analytics, self-proxied, with no cookie banner needed.
- Built the storage that snapshots search and social performance into the database, so trends survive the platforms' short retention windows.
- Built attribution tracking — which listings were seen, which links were clicked, where a visitor came from.
- Produce the recurring internal and customer-facing reports.
- Applied a strict rule to anything customer-facing: measured numbers only, never estimates.

**Tools:** Umami Cloud proxied through her own domain so it is not blocked; Google Search Console and Bing; the Meta insights API; purpose-built metrics tables in PostgreSQL; report generators producing standalone HTML.

### Legal and compliance
*The part most builders skip.*

- Researched what Norwegian law requires of a product like this, and wrote it down before building.
- Copyright: no description is ever copied from a source. Everything is regenerated.
- Marketing law: paid placement has to be identifiable, so the promotion system labels every promoted item by design rather than hiding it — built in from the start, before anything was ever sold. The labelling was a design constraint, not a concession made later.
- Data protection: privacy policy, data processing agreements, and analytics deliberately chosen to collect as little as possible.
- Collection ethics: a written checklist requiring the source's own crawling rules to be checked before a line of code is written; an honest identifier so any site owner can see who is requesting; deliberate delays between requests; and blanket exclusion of anything not meant to be public — kindergartens, schools, members-only events.
- Built a public page explaining exactly how data is collected, and a mechanism for any organiser to opt out entirely.
- Built a correction flow on every event, because aggregated data is sometimes wrong and fixing it should not require an email.

### Rights management
*See §5, story one — this role exists because of an incident.*

- Handled a copyright claim over an image from first contact to resolution.
- Changed the system rather than the image: a written policy, a permission register, and a rule that no source enters the approved list without a documented entry — enforced by a test.
- Run an ongoing campaign, source by source, to get written permission where it is missing, measuring the gap rather than assuming it.
- Built monitoring for content theft in the other direction, with a deliberate escalation ladder that stops well short of legal threats.

**Tools:** a permission register generated from a single source of truth and bound to the code by tests; a command-line tool reporting the current permission gap on demand; canary records planted in the data and a monthly automated scan; written agreements archived permanently in Protonmail.

### Stakeholder relations

- Handle all correspondence with venues and organisers — introductions, permission requests, removal requests, complaints, partnership offers.
- Moderate everything submitted by the public before it is published.
- Run partnership and backlink outreach.
- Keep an honest record of who said yes, who said no, who said no and later said yes, and why.

### Documentation and process

- Maintain the project documentation: design system, brand voice, copy rules, strategy, decision log, operational runbooks, and a mandatory checklist for adding a new source.
- Keep the commit history structured and readable, so the history is itself documentation.
- Separate private material — correspondence, personal data, permission evidence — from the public code repository, deliberately and by policy.

**Tools:** Markdown in the repository; Git with a strict conventional commit format; GitHub; Slidev for presentations; Playwright for automated screen recordings of the live site.

### The tools, gathered

For the stack strip. Everything verified in the repository except the one marked.

| Area | Tools |
|---|---|
| Language and runtime | TypeScript, Node, tsx |
| Frontend | SvelteKit 2, Svelte 5, Vite, Tailwind CSS 4, Bits UI, Lucide |
| Design | CSS token system, self-hosted Barlow Condensed and Inter, Satori, resvg, sharp, QRCode |
| Data and backend | Supabase, PostgreSQL, SQL migrations, row-level security |
| Data collection | Cheerio, custom parsing, normalisation and deduplication layer |
| AI | Google Gemini 2.5 Flash |
| Testing and quality | Vitest, ESLint, Prettier, svelte-check, npm audit |
| Hosting and automation | Vercel, GitHub Actions, Dependabot |
| Monitoring | Custom health endpoints, UptimeRobot *(per project documentation)*, Vercel logs, CSP reporting |
| Email | MailerLite, Resend, Protonmail with Sieve rules |
| Payments | Stripe |
| Search | Google Search Console API, Bing Webmaster Tools, IndexNow, JSON-LD, `llms.txt` |
| Social | Meta Graph API, AT Protocol (Bluesky, paused) |
| Analytics | Umami Cloud, self-proxied |
| Working environment | VS Code, Git, GitHub, Slidev, Playwright |

---

## 5. Four stories worth telling properly

Everything in §4 is capability. A reader nods and forgets it. What they carry away is an episode — something with a cause, a change, and a consequence.

These four are complete arcs, and all four are true. Give at least two of them real space.

### 5.1 A copyright claim, and what it changed

**What happened.** In April 2026 a photo agency made a copyright claim over an image on the site. Kjersti handled it herself, from first contact to resolution.

**What most people would do.** Remove the image, apologise, move on.

**What she did instead.** Treated the single image as evidence of a missing system, and built the system.

- A written image policy, stating the legal basis for displaying event photographs and the mechanism for any rights-holder to object.
- A permission register: who agreed to what, when, with a pointer to the evidence. Versioned in Git, so every row carries a date and a commit behind it and nothing can be changed without it showing in the history. That is deliberate — a claim of consent is worth little without a timestamp that cannot be moved afterwards.
- One source of truth. The register, the allowlists the code actually uses, and the human-readable document are all derived from a single file, so they cannot drift apart by accident.
- Enforcement by test. Grant a source permission for social media without a documented basis, or edit the generated document by hand, and the build fails with an error message telling you which command to run instead.

**And then a second lesson, which is worth including because it is uncomfortable.** The register itself became a problem: the repository is public, and the names and email addresses of the people who had replied were sitting in it. In August she split it in two — a public record with the facts, and a private one with the people — and moved the correspondence out of the repository entirely.

**Why it belongs in the portfolio.** Not because a claim arrived. Because the response was structural, and because the second mistake was found and fixed by her, not by someone else. Recruiters almost never get to see how a candidate behaves under real pressure with real consequences.

*Evidence:* `docs/bildesamtykke.md` (generated), `scripts/lib/consent.json`, `scripts/lib/__tests__/bildesamtykke.test.ts`, `docs/ip-protection.md`.
*Write it without naming the agency.*

### 5.2 A no that turned out to be a misunderstanding

**What happened.** Kjersti asked an organiser for permission to feature their events on social media. They said no. Following up, it turned out they had assumed it cost money. It does not — it is free, like everything else on the platform. Once that was clear, they said yes.

**Why it matters, and it is not a sales story.** The refusal was not about the offer. It was about the message. Someone read her words and drew a conclusion she had not intended, and the only reason she found out is that she followed up instead of recording a no and moving on. Then she changed how the request is written.

This is the closest thing in the whole project to user research, and it is the one moment where an outside person visibly changed the product's behaviour.

**Write it anonymised.** No name, no organisation. The story works without them, and the correspondence is private.

### 5.3 The filter she built, then replaced

**What happened.** The first version of the homepage had a conventional filter bar — the usual row of dropdowns for category, date, area. It is what everyone builds, and it is what she built.

**What was wrong with it.** It is overwhelming on a first visit. It presents every possible dimension at once and asks a stranger to construct a query, at the exact moment they know least about what is available.

**What replaced it.** A progressive flow that asks one question at a time — who is this for, when, what kind of thing, where — with time of day and price as refinements. And a decision that URL parameters are the single source of truth, so every state produced by that flow is shareable, bookmarkable and safe with the back button.

**The honest detail worth keeping:** the filter bar was not deleted. It was kept on the pages where the visitor already knows what they are looking for. The lesson is not "dropdowns are bad" — it is that the right control depends on how much the person already knows, and the homepage is where they know least.

*Evidence:* decision #26 in `docs/DECISION-LOG.md`, dated 2026-02-25, with the alternatives she considered and rejected recorded alongside it. The component is `src/lib/components/EventDiscovery.svelte`.

### 5.4 The mistake that had to happen three times

**What happened.** A dependency needed by one part of the project exists only in that part's own package file. The continuous integration server installs only the root dependencies. So any test that reaches that module passes on her machine and fails in CI — and the failure is invisible until it is pushed.

It caught her three times.

**What she did the third time.** Stopped fixing the instance and fixed the class: wrote it down, with both ways out ranked in order — first, remove the dependency by pulling the data from a module that deliberately imports nothing beyond Node; second, mock it where the database really is needed. And a rule for next time: **verify against the import graph, not against the fact that the test passed locally. A green run on a machine that has the extra dependencies proves nothing about CI.**

**Why include it.** Because it names a repeated mistake, which almost no portfolio does, and because the interesting part is not the bug — it is recognising the third occurrence as a different kind of problem from the first two.

*Evidence:* `.claude/docs/testing.md`, section added 2026-08-14.

---

## 6. The roles section on the page — build spec

Nineteen roles will not fit as prose, and compressing them to six loses the point. The decision: make the section **interactive**. Full scope visible at a glance; selecting a role opens the detail with a visual showing what that work looks like.

Build it to the standard the case study argues for. If the page breaks Gåri's own design and accessibility rules, it undercuts everything it claims.

**This section is the payoff for the role pills in the hero** (§10, part one). The pills state the scope in passing; this is where it is substantiated. Each pill links straight to its role here with that panel already open, so the two are one mechanism rather than two lists of the same words.

### Structure — two layers

**Layer one, always visible.** Six cluster headings with the role labels underneath. The whole scope, readable in about two seconds without a click:

| Cluster | Roles |
|---|---|
| **Product owner** — decided what to build, what to cut, and why | Product owner · Business lead |
| **Designer** — how it works, how it looks, how it reads, who it works for | UX · Design systems · Accessibility · Bilingual copy |
| **Developer** — the front end, the data, and the tests that keep it honest | Frontend · Backend · Data integrations · AI integration · QA |
| **Operator** — six months live, without a team | DevOps · Monitoring · Internal tooling |
| **Marketer** — getting it found, and knowing whether it worked | SEO · Social · Email · Analytics |
| **The person responsible** — the parts with consequences | Legal · Rights management · Stakeholder relations |

The last cluster is what separates this from a student project. Do not let it land at the bottom by accident.

**Layer two, on selection.** A panel with the role title, its one-sentence definition, three or four tasks, the tools row, and one visual. The content is an edit of §4, not new writing. Two or three roles also carry a story from §5 — those link out rather than expanding further.

### Interaction rules — not negotiable

- **Use the tabs pattern.** Role labels are tabs, the panel is the tab panel, arrow keys move between labels. A solved pattern with defined keyboard behaviour, and the same class of pattern already implemented in the product.
- **Click, never hover.** A hover-only reveal excludes every touch device and every keyboard user, which would be a strange thing to ship on a page arguing for accessibility.
- **One role open on load**, so the panel is never an empty box.
- **Announce the change** to assistive technology, or move focus into the panel.
- **Put the selected role in the URL** as a fragment, so a single role can be linked directly — the same principle as the product's own filter state, and worth a sentence of copy.
- **All panel content in the markup**, so without scripting it degrades to a long readable list.
- **Site rules apply:** 44×44px minimum targets, no gradients, the Funkis tokens, reduced motion respected.

### The media plan

The governing rule: **motion has to show a mechanism.** If an animation would only decorate, use a still. A decorative loop costs load time and credibility at once.

**Tier A — motion earns its place.** Four or five, made properly:

| Role | What the motion has to show |
|---|---|
| UX | The step-by-step filter being answered, with the address bar changing in step. Screen capture; the interaction explains itself. |
| Data integrations | Sixty sources collapsing into one listing, and two duplicate entries for the same concert merging. Authored diagram — the mechanism is invisible in the interface. |
| Design systems | One token changing, propagating through card, badge, button and generated sharing image. Authored. |
| Operator | A 24-hour clock with the scheduled jobs firing at their times, ending with the digest arriving. Authored. The clearest way to show the system runs without her. |
| Rights management | Optional: the register, an unregistered source added, the build failing. Terminal capture. |

**Tier B — a still does the job.** Most roles. Screenshots, an artefact photograph, a short code excerpt, a grid of generated sharing images, a page from a venue report.

**Tier C — text only, deliberately.** Legal and stakeholder relations. There is no honest image, and a stock illustration would cheapen the most credible material on the page. Leaving them plain reads as confidence.

### Weight

- **Load panel media on selection**, not on page load.
- **Prefer authored SVG and CSS over video** for diagrams: kilobytes rather than megabytes, sharp at any size, editable later.
- **Video only for real screen capture.** Under six seconds, muted, looping, no controls, with a poster frame. Re-encode for web — the existing recordings are 14 MB and 11 MB, which is a projector file.
- **The poster frame is also the reduced-motion state.** Someone who asked for less movement gets a still, not a paused video.

### Scope warning

Nineteen bespoke animations is weeks of work and the page does not need it. Five authored pieces plus stills elsewhere is achievable and reads as deliberate. Five excellent visuals and fourteen plain screenshots looks confident; nineteen mediocre animations looks padded, and a recruiter will read the padding rather than the work.

---

## 7. Design system and voice

The portfolio should look like it belongs to Gåri without being a clone. Tokens are canonical in `src/app.css` and documented in `docs/DESIGN-SYSTEM.md`.

**Funkis** — named after the Sundt building in Bergen (1938, architect Per Grieg), a landmark of Norwegian functionalist architecture. Clean lines, honest materials, purposeful form, function before decoration. A real design rationale with a photographable local referent, and it belongs in the case study.

### Core palette

| Token | Hex | Role |
|---|---|---|
| `--funkis-red` | `#C82D2D` | Sundt vermillion — the single accent |
| `--funkis-red-hover` | `#A82424` | Accent hover |
| `--funkis-red-subtle` | `#F9EEEE` | Accent tint |
| `--funkis-plaster` | `#F5F3EE` | Warm off-white |
| `--funkis-granite` | `#6B6862` | Stone grey |
| `--funkis-steel` | `#3A3A3C` | Dark grey |
| `--funkis-iron` | `#1C1C1E` | Near-black |
| `--color-bg` | `#F2F2F0` | Page background |
| `--color-text-primary` | `#141414` | Body text (7.88:1 on white) |
| `--color-text-secondary` | `#4D4D4D` | Secondary (6.96:1) |
| `--color-text-muted` | `#595959` | Muted (7.01:1) |

There is also a status-badge palette and an 11-colour category palette used for image placeholders, both in `DESIGN-SYSTEM.md`. The category palette is worth showing: soft, distinct, and the reason a photo-less event still looks intentional.

### Typography

Barlow Condensed for uppercase labels, not headings. Inter for all headings and body. Self-hosted `.woff2`. Tabular numerals on every date, time and price. Heading line-height 1.15.

### Hard rules — non-negotiable

- **No gradients.** Flat, honest surfaces.
- **Colour is never the only signal.** Every badge is colour plus icon plus text.
- **44×44px minimum touch targets.**
- **WCAG 2.2 AA**, verified — the contrast ratios above are measured, not aspirational.
- **Language switching uses text labels, never flags.**
- **No emoji.** Anywhere. This is an explicit standing rule of Kjersti's.

### Voice for the portfolio copy

Different from the site's own voice, which is warm, local and dialect-flavoured Norwegian. Portfolio copy is:

- **First person, plain.** "I built", "I decided", "I got this wrong at first". No corporate distance.
- **No buzzwords.** No "leveraging", "seamless", "cutting-edge", "revolutionising".
- **Specific over grand.** "The badge says 'likely free' because the pipeline cannot always be certain" beats "meticulous attention to detail".
- **Willing to name what is unfinished.** Dark mode designed but disabled. Map view planned, not built. Canonical URL strategy for filtered views unresolved. Roughly two-thirds of images still without written social-media permission. Saying so makes everything else more credible.
- **Norwegian terms glossed once, then used freely.** *bydel* = city district. *Gåri* = dialect contraction of "what's going on". *Funkis* = functionalism.

---

## 8. Assets

### Reusable, no concerns

- `assets/icons/brand-*.svg` in `outputs/Presentations/2026-05-27-AI-workflow/` — 19 clean, uniform tech and service logos, ideal for the stack strip.
- `static/favicon.svg`, `static/gaari-logo-1024.png`, `gaari-logo-500.png` — the red "G" mark.
- `static/stickers/` — vector brand marks.
- `print/` — posters A3 and A4, CMYK and PDF/X-1a, die-cut stickers. Good evidence the brand extends past the screen.
- `static/gaari-cover-1600.png`, `fb-cover.png`, `newsletter-og.png` — social and OG artwork.
- The generated OG images from `src/routes/og/` — a grid of them is a strong systematic-design artefact.

### The recording scripts are the most valuable thing in that folder

`record-gaari.mjs`, `record-screencasts.mjs` and `record-admin-social.mjs` launch headless Chromium at 1280×720 with `deviceScaleFactor: 2`, pre-scroll to force lazy-loaded images, then do an eased scroll tour and save a video. **Re-run these to generate fresh captures at the size the portfolio needs**, rather than reusing May's projector-sized files. They need `playwright-chromium`, already in that folder's package file.

### Press photos in screenshots — decided

**Use real screenshots of the live site as they are.** Kjersti's decision, 2026-08-18.

Context the agent should hold while doing it: Gåri displays event images by hot-linking them from the source venue, under a documented policy with an opt-out. That policy governs display on gaari.no, and screenshots on a separate site are a different context. She has weighed that and chosen the real thing, because a case study about a product should show the product.

Two practical constraints that follow from the decision rather than argue with it:

- **Prefer views where photographs are incidental rather than the subject.** A screenshot of the discovery flow, a single card, an event page, an admin view. Not a full-bleed collage of twenty press photographs — that is the same decision at several times the exposure, for no extra argument.
- **Keep the placeholder system in the imagery anyway.** A grid showing a mix of photographed and photo-less events is both honest about the data and the best possible showcase for `ImagePlaceholder` (§4, design system). It reads as a design decision rather than a gap.

If a rights-holder ever objects to a screenshot, the answer is the one already in place on the site: an opt-out that works, and an image removed on request.

### Media production standard — decided

**Kjersti wants video, and a high quality bar on everything.** That pulls against the performance argument the page itself makes, so resolve it the right way: **quality lives in the source file, weight is controlled by the loading strategy — never by degrading the asset.** A sharp clip that loads only when asked for is both. A soft clip that loads on page load is neither.

**Capture.** The Playwright scripts in `outputs/Presentations/2026-05-27-AI-workflow/` already do the hard part — they pre-scroll to force lazy-loaded images, force every `img` to eager, wait for the network to settle, then run an eased scroll tour. Reuse that logic. Two changes:

- **Raise the recording resolution.** The scripts currently record at 1280×720. Set `recordVideo.size` to 1920×1080 or 2560×1440 and raise the viewport to match. Note that `deviceScaleFactor: 2` is set in the existing context but almost certainly does **not** apply to Playwright's video output — *verify by checking the actual pixel dimensions of the file it produces* before assuming the current recordings are retina. They are probably not.
- **Playwright writes WebM natively.** Keep that as the master. Do not re-record from an MP4.

For the crispest possible result on a scripted UI tour, the alternative is a screenshot sequence assembled with ffmpeg: fully deterministic, any resolution, no encoder softness during motion. More work, better output. Worth it for the hero clip at least.

**ffmpeg is already on this machine**, bundled with TouchDesigner at `/c/Program Files/Derivative/TouchDesigner/bin/ffmpeg`. No install needed.

**Delivery.** Every clip ships as:

- Two encodes in one `<video>` element — WebM (VP9 or AV1) first, H.264 MP4 as fallback. The browser picks.
- `muted loop playsinline preload="none"` with a `poster` image.
- Poster in AVIF with a WebP fallback. **The poster is also the reduced-motion state** — a visitor who asked their system for less movement gets the still, not a paused player.
- Loaded when its panel is selected or when it enters the viewport. Never on page load.

**Budget.** Aim for 2 MB or less per clip at 1280 display width. It is a target to design against, not a law — but if a clip is heading for 10 MB, the answer is a shorter loop or a tighter crop, not a lower bitrate.

**Length.** Hero clip up to about twelve seconds. Role clips four to eight. Long enough to show the mechanism, short enough to loop without the reader noticing the seam.

**Stills.** Capture at 2× and deliver AVIF with a WebP fallback. Never upscale a smaller source.

**Diagrams stay vector.** The authored Tier A pieces in §6 — the pipeline, the token propagation, the 24-hour clock — should be SVG and CSS, not video and not raster. Kilobytes rather than megabytes, sharp at any size, and editable later without re-rendering.

**Do not reuse the May files.** `gaari-forside.mp4` is 13.8 MB at 1280×720: too heavy for the web and not sharp enough for a high-quality bar. It fails on both axes at once. Re-record.

### Leave out

Everything from the May presentation that belongs to the AI-workflow argument: the terminal recordings, the motherboard diagram, the human/AI swim lanes, the cost-per-month figures, the "one person plus AI equals eight roles" framing. That is a different deck for a different audience. And `cover-collage.jpg` needs compressing before any use — it is 2.2 MB.

---

## 9. Accuracy — read before writing a single number or claim

### The commercial layer — the repository will mislead you

The subscription model is **built but not selling.** No promoted placement is running, there are no paying customers, and the direction is under review. A referral model is being weighed — everything free, a share of ticket sales for visitors the site actually sends — but it is a direction, not a decision.

The organiser marketing page is **not reachable**: both language routes redirect to the homepage, the footer link is commented out, and it is absent from the sitemap. It has been hidden since April 2026.

`CLAUDE.md` and the archived handover both describe the subscription tiers as the current business model. They describe what was built, not what is live. **Do not repeat them.**

What can honestly be written: she designed and built a complete commercial layer — pricing, payment, placement, labelling, attribution reporting — and is now reconsidering the model on the evidence. That is a stronger story than a price list. Shipping a monetisation system and then questioning whether it is the right one is judgement, not indecision.

What cannot be written: revenue, customers, signed venues, prices as if in force, or the referral idea as if decided.

### Measured numbers only

Kjersti's standing rule, and it applies here: public-facing material shows **only measured numbers, never estimates.**

- Do not invent visitor counts, event counts, growth percentages, or time-saved figures.
- Any traffic or search figure must be re-measured from Umami, Search Console or Supabase before publication. The figures in the May deck are stale.
- If a number cannot be verified from a primary source, leave it out. A case study with no metrics is fine. One with a wrong metric is not.

### Never hardcode a count you can derive

The counts in §12 were derived on 2026-08-18 and will drift. Re-derive before publishing, and spot-check anything that looks impressive. Note that `CLAUDE.md` says 53 landing pages while the code says 59 — trust the code; several documents in `docs/` are February-vintage and undercount.

### Legal and factual care

- Describe data collection accurately: public event listings, robots.txt respected, honest User-Agent, rate-limited, opt-out available, non-public events excluded, descriptions regenerated rather than copied. Do not use "scraping" as a boast.
- Do not name any venue as a customer, partner or endorser without written confirmation.
- Do not use venue logos to imply partnership.
- Gloss Norwegian legal references for an international reader, and state them only as they appear in `docs/legal-research-norway.md`. Do not extrapolate.
- Anonymise story 5.2. Do not name the photo agency in 5.1.

### Verify before publishing

The site is live and changes. Check gaari.no directly, and hit `/api/health/deep` for current system state, before describing any feature in the present tense.

---

## 10. The page structure

**This is Kjersti's decision, not a suggestion.** Five movements, in this order. The logic is: the product earns its case first, and only then is the person behind it introduced. That ordering matters — by the time the reader reaches the roles, they have already seen what was built, so nothing needs a disclaimer in front of it.

### One — the idea

**The hero copy is decided. Use it as written:**

> # Everything happening in Bergen, in one place.
>
> An event platform for Norway's second largest city. Free to use, built, designed and run by me alone.

The headline is the product's promise, in the plainest words available — an international reader understands it without knowing anything about Bergen or Norway. The second line does three jobs: what it is, what it costs, and whose it is. No reader should have to scroll to learn that she made it, or that she made it by herself.

*Free to use* is accurate as written: nothing on the platform is charged to anyone today, for visitors or organisers. It is also the thesis of the whole page in three words — see §3. Do not soften it to "free tier" or similar.

*Bilingual* was deliberately cut from this line. It is true and it appears elsewhere; it is just not what the reader needs in the first two seconds.

The dialect name needs a gloss, but not in the headline — it costs a beat the hero does not have. Put it small, near the mark: *Gåri — from "Ke det går i?", Bergen dialect for "what's going on?"*

Short. What is the idea, and why does it exist?

This is the town square from §3, and it is the spine of the whole page: everything happening in the city in one place, small and large together, and free to enter because it cannot work otherwise. The problem statement lives here too — event information in Bergen is scattered, and the existing alternatives only show what they have a commercial interest in showing.

Keep it tight. It is an opening argument, not the whole case. One screen.

**The hero also carries the role pills** — small, quiet labels showing every role Kjersti fills. They are a glimpse, not the content: the reader sees the breadth immediately and then reads on. The depth arrives in section five.

Three rules for them:

- **They must not compete with the hero's first job**, which is still to say what Gåri is. Quiet type, low contrast, secondary weight. If a reader's eye lands on the pills before the tagline, they are too loud.
- **Each pill links to its role in section five**, opening that role's panel directly — the same URL-fragment mechanism specified in §6. The pill is a promise; clicking it should keep the promise rather than dump the reader at the top of a section to hunt.
- **Section five must not simply repeat the same flat list**, or the payoff reads as duplication. In the hero the roles are a glimpse of scope; in section five they are grouped into the six clusters, each with tasks, tools and a visual. Same material, different job.

### Two — the product at a glance

*Kjersti was unsure what this section is. Recommendation:* it is orientation. Before either flow can be explained, the reader needs a mental picture of the thing — what it looks like, what it contains, roughly how big it is.

One clear view of the interface, and one paragraph naming the pieces: a single listing of what is happening in Bergen, in Norwegian and English, collected automatically from around sixty local sources, updated twice a day. That is enough. The two sections that follow do the explaining; this one just gives them something to attach to.

Without it, section three opens with a filter flow for a product the reader cannot yet picture.

**Funkis belongs here too**, in two or three sentences — not as a separate design-system section later. The reader is looking at the interface at exactly this moment, and it is far cheaper to explain a design decision while it is visible than to describe it in the abstract two screens further down. Name the building, name the principle, and move on: the system is called Funkis after a 1938 functionalist building in Bergen, and the whole visual language follows from it — flat surfaces, honest materials, no decoration for its own sake, one accent colour taken from the building itself.

Do not put the token table on the page. It belongs in this brief (§7), not in a case study. The colour swatches can appear as an image if they earn their place; the hex values never do.

### Three — the visitor

How it works for someone looking for something to do.

- What you see before doing anything: everything happening in Bergen, next thing first.
- How you narrow it: who this is for, when, what kind of thing, where — the progressive flow.
- The dedicated pages: per audience, per moment in the week, per season. This weekend, family weekend, free things to do, midsummer, Christmas, Easter, the winter break.
- The premise underneath, worth stating explicitly: people are not personas. The same person is a parent on Saturday morning and out with friends on Friday.

Material in §3, "the visitor side". The hand-built audience classifiers are the detail that turns this from a feature description into evidence.

### Four — the organiser

How it works for someone with something to announce — and this is where the promise from section one is shown to be real rather than asserted.

The key messages, in this order:

1. **It is free for everyone.** Not a launch offer, not a trial. The condition for the thing working.
2. **Every size is invited.** A neighbourhood market and a festival sit in the same listing, and the design is built to hold both.
3. **Sending in one event is easy.** One short form, read by a person, confirmed automatically once approved.
4. **For anyone with recurring events, it is automatic.** Send in your programme or calendar page once. From then on it is collected and sorted daily, and you do nothing. **Send it once, and it is done.**
5. **Every channel is free too** — the listing, the newsletter, and social media. Free to be part of all of it.

Material in §3, "the organiser side". The principle to land is that she adapts to the organiser's existing workflow rather than asking them to change it.

*A structural note for the build:* sections three and four are both "how it works for someone", back to back, and will feel repetitive unless they are visually distinguished. Make them deliberately mirror each other — the same layout run in two directions. That turns a risk into an argument: the reader sees the two-sidedness rather than reading about it.

### Five — how I work

Only now does Kjersti appear.

The interactive roles section (§6), connecting everything the reader has just seen to the work that produced it, with the visual communication of each role. Two or three of the stories from §5 belong here, given real space.

The closing, in this order and nowhere earlier: the honest calibration of what the work does and does not demonstrate, and the single sentence about AI (§13). Both belong after the evidence, never before it.

---

## 11. Evidence index

| Topic | Look here |
|---|---|
| Product decisions | `docs/DECISION-LOG.md`, `docs/project-strategy.md`, `docs/CUSTOMER-JOURNEYS.md` |
| Discovery filter | `src/lib/components/EventDiscovery.svelte`, `src/lib/event-filters.ts` |
| Design system | `src/app.css` (canonical), `docs/DESIGN-SYSTEM.md`, `src/routes/og/`, `scripts/generate-print.ts` |
| Accessibility | `/[lang]/tilgjengelighet/`, component source |
| Voice and copy | `docs/BRAND-VOICE.md`, `docs/COPY-GUIDELINES.md`, `src/lib/collections.ts` |
| Frontend | `src/routes/`, `src/lib/components/`, `src/hooks.server.ts`, `lighthouse-budget.json` |
| Backend | `supabase/migrations/`, `src/lib/server/`, `src/routes/api/`, `src/routes/admin/` |
| Pipeline | `scripts/scrape.ts`, `scripts/scrapers/`, `scripts/lib/` |
| AI descriptions | `scripts/lib/ai-descriptions.ts` |
| Tests and CI | `scripts/lib/__tests__/`, `src/**/*.test.ts`, `.github/workflows/ci.yml` |
| Automation | `.github/workflows/` |
| Monitoring | `/api/health`, `/api/health/deep`, `scripts/lib/scraper-health.ts` |
| SEO | `src/lib/seo.ts`, `docs/seo-ai-playbook.md`, `/llms.txt` |
| Social | `scripts/social/`, `scripts/meta.ts` |
| Newsletter | `scripts/send-newsletter.ts`, `/[lang]/nyhetsbrev/preferanser/` |
| Legal | `docs/legal/`, `docs/legal-research-norway.md`, `docs/new-scraper-checklist.md`, `/[lang]/datainnsamling/` |
| Rights | `docs/bildesamtykke.md`, `scripts/lib/consent.json`, `scripts/canary-*.ts` |
| Submission flow | `src/routes/[lang]/submit/`, `scripts/notify-submitters.ts` |

---

## 12. Appendix: measured scale

Secondary. Use sparingly, where a section needs a sense of size. A recruiter reads for capability first.

Derived 2026-08-18, with the command to re-derive.

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

Two notes. **Line counts are a weak metric** — leave them out. And **commit-message discipline is itself evidence**: the history is conventional-commit formatted throughout, with `fix` slightly outnumbering `feat`. That is the honest shape of a maintained system. Do not hide it; it supports the operations argument.

---

## 13. Decisions

### Decided — build against these

**Format: a standalone case study.** Not one entry among several. Full length, all five movements from §10, its own navigation. The interactive roles section (§6) is built at full scale rather than compressed.

**Press photos: use real screenshots.** See §8.

**The AI question: include one honest sentence, near the end.** Stated and not elaborated.

The reasoning: "I did all of this alone" and "I use AI heavily to do it" are both true, and a reader who works in this industry will wonder how one person covers this many roles. Volunteering it costs nothing and pre-empts the question; appearing to hide it costs a lot.

Constraints on how it is written:
- **One sentence.** Not a paragraph, not a section, no percentage of the code, no tooling names beyond what is needed.
- **The AI-workflow argument stays out.** No "one person plus AI equals eight roles" framing, no cost figures, no time-saved claims. That is a separate presentation for an academic audience and it does not belong here.
- **First person, matter-of-fact.** It is an implementation detail she is choosing to state, not a confession and not a boast.
- **Place it with the closing calibration in §10, part five** — after the evidence, never before.

### Still open

1. **How prominent is she personally?** Portrait, a bio section, her name in the header? Affects the hero and the closing.
2. **Which limits to name.** The evidence does not support team leadership, work inside an established engineering process, or high-scale systems. Naming them honestly makes everything else more believable — but which ones, and how forcefully, is her decision. The right place is calibration at the end, after the evidence, never as a disclaimer at the start.
