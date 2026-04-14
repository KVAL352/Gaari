# Frontend Routes

## Public pages
- `/[lang]/` — Main event listing with EventDiscovery filter. **Server-side loaded**, ISR cached (`s-maxage=300, stale-while-revalidate=600`).
- `/[lang]/about/` — About page. **Prerendered**.
- `/[lang]/guide/` — Events hub page with links to all collections. FAQ for "hva skjer i Bergen" queries. **Prerendered**.
- `/[lang]/datainnsamling/` — Data transparency page (opt-out form). Form action `?/optout`.
- `/[lang]/personvern/` — Privacy policy (GDPR). Bilingual inline, in sitemap.
- `/[lang]/tilgjengelighet/` — Accessibility statement (EAA/WCAG 2.2 AA). Bilingual inline, in sitemap.
- `/[lang]/nyhetsbrev/preferanser/` — Newsletter preferences. HMAC-signed token required. **Server-side loaded**.
- `/[lang]/submit/` — Event submission form (noindex). Only page with client-side Supabase (image uploads).
- `/[lang]/events/[slug]/` — Event detail page with related events, contextual collection link, OG image. **Server-side loaded**. Correction form action `?/correction`.
- `/[lang]/[collection]/` — 53 collection landing pages. **Server-side loaded**, ISR cached. Config in `$lib/collections.ts`. Cross-language slug redirect. Off-season pages show related collections + hint card.
- `/[lang]/venue/[venue]/` — Top 15 venue pages with LocalBusiness JSON-LD, upcoming events, map link. Config in `$lib/venues.ts`.
- `/[lang]/denne-uken/[uke]/` — Weekly blog post (year-week format, e.g. `2026-16`). Article JSON-LD, auto-generated from event data.
- `/[lang]/lenker/` — Link-in-bio page for Instagram/Facebook. Prerendered. UTM-tagged links.
- `/[lang]/for-arrangorer/` — B2B marketing page for venues. 7-section structure with pricing tiers.

## Content pages (social)
- `/r/[date]/[slug]/` — Per-day reel + stories landing page. Not in sitemap.
- `/r/week/[startdate]/` — Weekly aggregate page for batch posting.
- `/r/pitch/[venue]/` — B2B pitch report per venue. Dynamic, noindex. Shows events, mockups of promoted placement on collection pages and newsletter, Standard package details. Venue slug supports both æøå and ascii-normalized URLs.

## Admin (all protected by HMAC cookie)
- `/admin/corrections` — Correction review
- `/admin/optouts` — Data inquiry review
- `/admin/social` — Social post review
- `/admin/promotions` — Promoted placement management
- `/admin/login` / `/admin/logout`

## API endpoints
- `/api/health` — Health check (healthy/degraded/unhealthy, 5min cache)
- `/api/newsletter` — POST newsletter subscriptions (MailerLite + Resend welcome)
- `/api/calendar.ics` — iCal project calendar (token required)
- `/api/events.ics` — Public iCal feed (30-day, optional `?filter=`)
- `/api/stripe-webhook` — Stripe webhook (checkout.session.completed, subscription.deleted)
- `/api/csp-report` — CSP violation reports
- `/api/track-click` — POST venue click tracking (→ venue_clicks table)
- `/api/remind` — POST event reminder signup (→ event_reminders table)
- `/api/posting-status` — GET/POST/DELETE SoMe posting checklist state (→ social_posting_status table)
- `/u/api/send` — Umami beacon proxy with correct IP forwarding
- `/qr` — Dynamic QR redirect for sticker campaigns

## Generated
- `/og/[slug].png` — Per-event OG image (Satori + ResvgJS)
- `/og/c/[collection].png` — Collection OG image
- `/sitemap.xml` — Dynamic sitemap with hreflang
