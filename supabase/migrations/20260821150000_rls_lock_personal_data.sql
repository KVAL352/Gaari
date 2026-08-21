-- Lock personal data away from the public anon key.
--
-- Background (audit 2026-08-21): RLS was enabled and writes were correctly
-- blocked, but read policies were permissive. The anon key ships in the browser
-- bundle, so every table below was readable by anyone on the internet. Measured
-- at the time: 1 submitter_email, 2 contact_email plus Stripe identifiers.
--
-- Note that RLS filters ROWS, not COLUMNS. "Anon can read approved events" is
-- correct and must stay — the public site depends on it — but it exposes every
-- column of an approved row, submitter_email included. Column privileges are
-- the right tool for that half.
--
-- Safe to apply: the admin pages read these tables through supabaseAdmin
-- (service_role), and the browser only ever INSERTs into events and
-- organizer_inquiries. Verified before writing this migration.

-- ============================================================
-- events — keep public read, drop the personal columns
-- ============================================================
--
-- A column-level REVOKE does nothing here. From the PostgreSQL docs: "if a
-- role has been granted privileges on a table, then revoking the same
-- privileges from individual columns will have no effect." The table-level
-- grant has to go first, then the wanted columns are granted back.
--
-- Verified against production on 2026-08-21: the column REVOKE this replaced
-- ran without error and changed nothing — submitter_email stayed readable.

REVOKE SELECT ON events FROM anon;
GRANT SELECT (
  id, slug, title_no, title_en, description_no, description_en, category,
  date_start, date_end, venue_name, address, bydel, latitude, longitude,
  price, ticket_url, source, source_url, image_url, age_group, language,
  status, created_at, updated_at, link_check_failures, link_checked_at,
  is_sold_out, image_credit, is_canary
) ON events TO anon;

-- is_canary is granted deliberately, not by oversight: the public queries
-- filter with .eq('is_canary', false), and Postgres requires SELECT on a
-- column used in a WHERE clause. The cost is that anon can enumerate the
-- decoys with ?is_canary=eq.true — confirmed working on 2026-08-21, all three
-- returned. Closing that needs a view that filters canaries server-side and
-- never exposes the flag. Tracked separately; see project_ip_protection.

-- ============================================================
-- promoted_placements — public site needs the display columns only
-- ============================================================

REVOKE SELECT ON promoted_placements FROM anon;
GRANT SELECT (
  id, venue_name, collection_slugs, tier, slot_share, active,
  start_date, end_date, created_at, logo_url
) ON promoted_placements TO anon;

-- ============================================================
-- Tables the browser never reads — no anon SELECT at all
-- ============================================================

REVOKE SELECT ON opt_out_requests FROM anon;
REVOKE SELECT ON organizer_inquiries FROM anon;
REVOKE SELECT ON edit_suggestions FROM anon;
REVOKE SELECT ON event_reminders FROM anon;
REVOKE SELECT ON placement_log FROM anon;
REVOKE SELECT ON scraper_runs FROM anon;

-- The insert paths stay open: /submit posts to events and organizer_inquiries
-- from the browser, and the correction form writes edit_suggestions. Those are
-- INSERT grants and are untouched above.
