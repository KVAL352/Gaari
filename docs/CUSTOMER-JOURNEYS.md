# Gåri — Customer Journeys

**Last updated:** 2026-02-23

---

## Audiences

| Audience | Who they are | What they want |
|----------|-------------|----------------|
| **Locals** | Bergen residents, all ages | "What's happening this weekend?" — browse by date, category, bydel |
| **Students** | UiB, NHH, HVL (~35,000 in Bergen) | Affordable or free events, student-specific, near Sentrum/Bergenhus |
| **Tourists** | Visitors and cruise passengers | "What can I do today?" — quick filters, English interface, tourist highlights |
| **Families** | Parents with children | Family-friendly events, free options, indoor activities (231 rain days/year) |

---

## Journey 1: Browse and Discover

**Persona:** Sara, 28, lives in Bergenhus. Looking for something to do this Saturday.

### Steps

| Step | What she sees | What she feels | What she does |
|------|--------------|----------------|---------------|
| 1. **Land on homepage** | Hero with "Ke det går i Bergen?", date quick-filters, event grid | Curious, slightly overwhelmed by options | Scans the hero, reads the tagline |
| 2. **Quick-filter: "Denne helgen"** | Grid updates to show Saturday + Sunday events | Focused — the list is now manageable | Scrolls through event cards |
| 3. **Filter by category** | Selects "Musikk & Konserter" — grid narrows further | Engaged — sees concerts she recognizes | Spots an interesting event |
| 4. **Open event detail** | Full event page: image, date/time, venue, price, description, ticket link | Decides whether to go — checks price and time | Clicks "Kjøp billett" (external ticket link) |
| 5. **Buy ticket (external)** | Leaves Gåri for the venue/ticket platform | Satisfied — found what she wanted quickly | Completes purchase on external site |

### Key design moments
- Date quick-filters must be immediately visible (above fold)
- Event cards must show: title, date, venue, price, image — enough to decide without clicking
- "Kjøp billett" / "Get Tickets" button links to external ticket_url (not internal purchase)
- URL updates with each filter so she can share: `/no/?when=weekend&category=music`

---

## Journey 2: Tourist Quick Discovery

**Persona:** James, 45, British cruise passenger. Has 8 hours in Bergen, speaks no Norwegian.

### Steps

| Step | What he sees | What he feels | What he does |
|------|--------------|----------------|---------------|
| 1. **Google "things to do in Bergen today"** | Gåri event detail page or homepage in search results | Hopeful — needs a plan | Clicks through to Gåri |
| 2. **Language detection** | Site detects `en` from browser → English UI | Relieved — it's in English | Sees "What's going on in Bergen?" |
| 3. **Quick-filter: "Today"** | Events happening today | Focused — limited time | Scans options quickly |
| 4. **Browse by area** | Filters to "Sentrum" (he's near Bryggen) | Practical — wants nearby | Finds a walking tour and a Grieghallen concert |
| 5. **Event detail → calendar export** | Adds event to phone calendar (ICS download) | Organized — has a plan | Heads to the venue |

### Key design moments
- SEO must work: per-event OG images, hreflang, meta descriptions
- English must be fully functional — all labels, descriptions, empty states
- "Today" filter is critical for tourists and cruise passengers
- Bydel filter helps orient visitors who know "Sentrum" but not "Fyllingsdalen"

---

## Journey 3: Student on a Budget

**Persona:** Ling, 22, exchange student at NHH. Wants free/cheap things to do.

### Steps

| Step | What she sees | What she feels | What she does |
|------|--------------|----------------|---------------|
| 1. **Arrives via StudentBergen link or word of mouth** | Homepage with all events | Overwhelmed — too many options | Looks for student-relevant filters |
| 2. **Filters: "Gratis" + "Studentarrangementer"** | Free student events this week | Excited — affordable options | Browses event cards |
| 3. **Spots a quiz night at Kvarteret** | Event card: free, tonight, Sentrum | Interested — wants details | Taps the card |
| 4. **Event detail page** | Full info, description in both languages, free admission noted | Decided — she's going | Shares link with friends via URL |

### Key design moments
- Price filter ("Gratis" / "Free") is high value for students
- Student category maps from multiple sources (StudentBergen, TicketCo/Kvarteret)
- Share-friendly URLs — every filter state is in the URL

---

## Journey 4: Family Weekend Planning

**Persona:** Henrik and Marta, parents of two kids (4 and 7). Planning their Saturday.

### Steps

| Step | What they see | What they feel | What they do |
|------|--------------|----------------|---------------|
| 1. **Open Gåri on phone** | Homepage, scrolls to Saturday events | Planning mode — need to fill the day | Looks for family filters |
| 2. **Filter: "Familie & Barn" + "Denne helgen"** | Family events this weekend | Relieved — filtered to relevant options | Scans cards — checks images and prices |
| 3. **Compare options** | Multiple events with images, prices, locations | Weighing — which one fits? | Opens 2–3 event details in new tabs |
| 4. **Decide and plan** | Event detail with address, times, price for family | Confident — have a plan | Adds to calendar (ICS), notes the address |

### Key design moments
- Family category pulls from BarnasNorge, Bergen Kommune, venue calendars
- Price display must be clear — families budget for multiple tickets
- Indoor/outdoor info matters (Bergen rain) — Tier 3 filter, deferred to v2
- Load More (not infinite scroll) — parents often return to the list after checking details

---

## Journey 5: Event Submission

**Persona:** Anders, 35, organizes board game nights at a cafe. Wants to list his events.

### Steps

| Step | What he sees | What he feels | What he does |
|------|--------------|----------------|---------------|
| 1. **Finds submit link in footer** | "Send inn arrangement" / "Submit event" link | Hopeful — wants exposure | Navigates to `/submit` |
| 2. **Submission form** | Form: title, date, venue, category, description, ticket link | Cooperative — filling in details | Fills out the form |
| 3. **Submits** | Confirmation message: "Sendt inn — venter på godkjenning" | Satisfied but slightly uncertain | Waits for approval |
| 4. **Event appears (after admin review)** | Event is live on the site | Proud — his event is listed | Shares the link |

### Key design moments
- Submit page is blocked from search engines (robots.txt)
- All submitted events start as `status: 'pending'` — admin approves in Supabase dashboard
- No account required for submission (MVP) — verified organizer accounts in v2
- Form must capture: title_no, date_start, venue_name, category, description_no (minimum)

---

## Journey 6: Venue Opt-Out

**Persona:** Legal department at a venue that doesn't want their events listed.

### Steps

| Step | What they see | What they feel | What they do |
|------|--------------|----------------|---------------|
| 1. **Find data transparency page** | `/datainnsamling` — lists all 44 sources, explains scraping practice | Investigating — want to understand | Reads the explanation |
| 2. **Submit opt-out request** | Form: organization name, domain, email, reason | Serious — exercising their rights | Fills out the form |
| 3. **Request submitted** | `opt_out_requests` table entry with `status: 'pending'` | Expects action | Waits for confirmation |
| 4. **Admin approves** | Status changed to `'approved'` in Supabase dashboard | Resolved | Their events are removed |
| 5. **Pipeline respects opt-out** | `loadOptOuts()` caches approved domains; `insertEvent()` checks `isOptedOut()`; step 1b deletes existing events | No longer listed | Ongoing — every scrape run checks |

### Key design moments
- Transparency page (`/datainnsamling`) is critical for legal compliance
- Opt-out form uses client-side Supabase insert (anon key) — no login needed
- Workflow: pending → admin approves → approved → pipeline enforces
- Domain-based matching: opt-out applies to all events from that source domain

---

## Cross-Cutting Patterns

### All journeys share:
- **URL state management** — every filter combination is bookmarkable and shareable
- **Mobile-first** — 65%+ of users are on mobile (design-brief target)
- **Load More, not infinite scroll** — preserves scroll position, keyboard navigation, footer access
- **External tickets** — Gåri never sells tickets; all "buy" actions link to venue/platform
- **Bilingual** — language toggle always accessible in header; auto-detected on first visit

---

## References

- See `design-brief.md` for detailed component specs and UX patterns
- See `project-strategy.md` §1 for audience definitions
- See `BRAND-VOICE.md` for tone at each touchpoint
