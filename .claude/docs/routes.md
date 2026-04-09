# Frontend Routes

## Public pages
- `/[lang]/` — Main event listing with EventDiscovery filter. **Server-side loaded**, ISR cached (`s-maxage=300, stale-while-revalidate=600`).
- `/[lang]/about/` — About page. **Prerendered**.
- `/[lang]/guide/` — Events hub page with links to all collections. FAQ for "hva skjer i Bergen" queries. **Prerendered**.
- `/[lang]/datainnsamling/` — Data transparency page (48 sources, opt-out form). Form action `?/optout`.
- `/[lang]/personvern/` — Privacy policy (GDPR). Bilingual inline, in sitemap.
- `/[lang]/tilgjengelighet/` — Accessibility statement (EAA/WCAG 2.2 AA). Bilingual inline, in sitemap.
- `/[lang]/nyhetsbrev/preferanser/` — Newsletter preferences. HMAC-signed token required. **Server-side loaded**.
- `/[lang]/submit/` — Event submission form (noindex). Only page with client-side Supabase (image uploads).
- `/[lang]/events/[slug]/` — Event detail page with related events, contextual collection link, OG image. **Server-side loaded**. Correction form action `?/correction`.
- `/[lang]/[collection]/` — 52 collection landing pages. **Server-side loaded**, ISR cached. Config in `$lib/collections.ts`. Cross-language slug redirect. Off-season pages show related collections + hint card.
- `/[lang]/lenker/` — Link-in-bio page for Instagram/Facebook. Prerendered. UTM-tagged links.
- `/[lang]/for-arrangorer/` — B2B marketing page for venues. 7-section structure with pricing tiers.

## Content pages (social)
- `/r/[date]/[slug]/` — Per-day reel + stories landing page. Not in sitemap.
- `/r/week/[startdate]/` — Weekly aggregate page for batch posting.

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
- `/qr` — Dynamic QR redirect for sticker campaigns

## Generated
- `/og/[slug].png` — Per-event OG image (Satori + ResvgJS)
- `/og/c/[collection].png` — Collection OG image
- `/sitemap.xml` — Dynamic sitemap with hreflang
