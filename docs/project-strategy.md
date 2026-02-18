# Gåri — Project Strategy

**Tagline:** Ke det går i Bergen?
**Purpose:** A bilingual (NO/EN) event aggregator for Bergen kommune — one place to find everything happening in the city, from big concerts to small community events.

---

## 1. Target Audience

**Event-goers:** People in Bergen looking for things to do — locals, students, expats, tourists.
**Event organizers:** Venues, clubs, associations, municipalities wanting to reach people.

**Geography:** Bergen kommune (all bydeler)
**Language:** Bilingual Norwegian / English

---

## 2. Core Features

### MVP (v1)
- Event listing with date, time, location, category, description
- Filter by category (music, culture, theatre, family, food, festival, sports, nightlife, workshop, student, tours)
- Filter by bydel/area
- Filter by date ("tonight", "this weekend", date range) with quick-filter pills
- One-click calendar export (ICS)
- Mobile-friendly responsive design
- Organizer submission form (all submissions reviewed before publishing)
- Community "suggest correction" on existing events
- Bilingual NO/EN interface

### v2
- Map view
- Weekly email digest ("This week in Bergen")
- User accounts / saved favorites
- Search
- Verified organizer accounts (auto-publish)

### Later
- API for other apps
- Organizer dashboard with analytics
- Social features (going/interested)
- Google Maps / Apple Maps integration

---

## 3. Data Model

### Event
| Field | Type | Notes |
|-------|------|-------|
| title_no | text | Norwegian title |
| title_en | text | English title (optional) |
| description_no | text | Norwegian description |
| description_en | text | English description (optional) |
| category | enum | music, culture, theatre, family, food, festival, sports, nightlife, workshop, student, tours |
| date_start | datetime | Start date and time |
| date_end | datetime | End date and time (optional) |
| recurring | json | Pattern for recurring events (null for one-off) |
| venue_name | text | Name of venue |
| address | text | Street address |
| bydel | enum | Sentrum, Bergenhus, Fana, Ytrebygda, Laksevåg, Fyllingsdalen, Åsane, Arna |
| latitude | float | For future map view |
| longitude | float | For future map view |
| price | text | "Free", amount, or "See link" |
| ticket_url | url | External ticket link (optional) |
| source | text | Where this event data came from |
| source_url | url | Original listing URL |
| image_url | url | Event image (optional) |
| age_group | enum | all, family, 18+, students |
| language | enum | no, en, both |
| status | enum | pending, approved, expired, cancelled |
| created_at | timestamp | When submitted |
| updated_at | timestamp | Last edit |
| submitted_by | user_id | Who submitted (organizer or admin) |

### Edit Suggestion
| Field | Type | Notes |
|-------|------|-------|
| event_id | reference | Which event |
| field | text | Which field to change |
| old_value | text | Current value |
| new_value | text | Suggested value |
| reason | text | Why (optional) |
| submitted_by | user_id or null | Anonymous allowed |
| status | enum | pending, approved, rejected |

### Recurring Events
- Store pattern: `{"type": "weekly", "day": "thursday", "time": "19:00"}`
- Auto-generate individual event entries from pattern
- Individual occurrences can be overridden (cancelled, time changed)

---

## 4. Data Sources

### Phase 1 — Launch Content (API + curation)

**APIs / Structured Data:**
- Ticketmaster Norway (Bergen)
- TicketCo
- Eventim (Bergen)
- Eventbrite (Bergen)
- Billetto (Bergen)

**Public Calendars / Scraping (with permission/legal):**
- VisitBergen (hva-skjer) — broadest Bergen calendar
- Bergen Sentrum aktivitetskalender — auto-aggregates from ticket sites
- Bergen kommune (hvaskjer/kultur-og-idrett)
- Kultur i Kveld (Bergen)
- Friskus Bergen
- BarnasNorge (Bergen)

**Venue Calendars:**
- Grieghallen, USF Verftet, DNS, Forum Scene, KODE, Bergen Bibliotek
- Det Akademiske Kvarter (~2,200 events/year)
- Bergen National Opera, Det Vestnorske Teateret, Kulturhuset, Bergen Kunsthall

**Music Discovery:**
- Bergen Live konsertkalender
- Songkick (Bergen)
- Bandsintown (Bergen)

**Outdoor / Sports:**
- Bergen og Hordaland Turlag (DNT)
- UT.no (Bergen)
- SK Brann, Bergen City Marathon

### Phase 2 — Organizer Outreach
- Direct contact with major venues for iCal feeds or data agreements
- Student organizations (Kvarteret, Studentersamfunnet)
- Sports clubs via Idrettsrådet i Bergen
- Festival organizers (Festspillene, Bergenfest, Nattjazz, Borealis)

### Phase 3 — Self-Sustaining
- Organizer self-submission (main source)
- Community contributions and corrections
- Automated RSS/iCal feeds from partner venues

---

## 5. Moderation Model

- **New events:** All submissions reviewed by admin before publishing
- **Existing events:** Community can "suggest correction" (reviewed before applied)
- **Verified organizers (v2):** Trusted organizers can auto-publish
- **Edit history:** All changes logged, rollback available
- **Quick actions:** "Report as cancelled" button for fast community reports

---

## 6. Tech Stack

| Layer | Technology | Why |
|-------|-----------|-----|
| Frontend | SvelteKit | Natural step from vanilla JS, fast, great DX |
| Backend/DB | Supabase (PostgreSQL) | Free tier, built-in auth + API + storage |
| Hosting | Vercel (free tier) | Auto-deploy from git, generous limits |
| Domain | gåri.no + gaari.no | Both registered at Domeneshop (Feb 18, 2026) |
| Email | gaari.bergen@proton.me | Project email (Proton Mail) |

### Why This Stack
- SvelteKit is the easiest modern framework coming from vanilla JS
- Supabase provides database, auth, file storage, and auto-generated API — skip building 80% of backend
- Vercel free tier: 100GB bandwidth/month, auto-deploys
- Supabase free tier: 500MB DB, 1GB storage, 50K auth users
- Total cost at launch: domain registration only (~150 NOK/year)

---

## 7. Site Structure

```
/                       → Homepage: featured + tonight/this week highlights
/events                 → Full listing with filters (category, bydel, date)
/events/[slug]          → Single event (details, map, calendar export, suggest edit)
/submit                 → Organizer submission form
/about                  → About, contact

/admin/review           → Pending submissions + edit suggestions
/admin/events           → Manage all events
/admin/sources          → Manage API imports
```

**URL format:** `/events/2026-03-15-bergenfest-opening` (date + slug)

---

## 8. Legal Considerations

**Safe approaches:**
- Official APIs with terms of use (Ticketmaster, Eventbrite, etc.)
- Open data (Bergen kommune, public institutions)
- RSS/iCal feeds (published for consumption)
- Schema.org structured data (designed for aggregation)
- Organizer self-submission
- Direct partnerships with venues

**Must respect:**
- robots.txt on all sites
- Terms of service
- GDPR for any personal data
- Copyright on editorial content (descriptions, photos) — don't copy, link instead

**Avoid:**
- Scraping behind logins or paywalls
- Copying copyrighted descriptions/photos
- Ignoring robots.txt
- Creating fake accounts

---

## 9. Launch Strategy

1. **Build MVP** with SvelteKit + Supabase
2. **Populate** with 100+ events from APIs + manual curation
3. **Soft launch** — share with friends, Bergen subreddit, student groups
4. **Organizer outreach** — email major venues with "your events are already listed, want to manage them?"
5. **Social media** — Instagram/TikTok with "This weekend in Bergen" content
6. **Iterate** based on feedback

---

*Strategy document created: February 18, 2026*
*Status: Planning phase — ready to build*
