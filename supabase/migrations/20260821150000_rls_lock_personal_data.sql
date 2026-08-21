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
-- events — keep public read, drop the one personal column
-- ============================================================

REVOKE SELECT (submitter_email) ON events FROM anon;

-- ============================================================
-- promoted_placements — public site needs the display columns only
-- ============================================================

REVOKE SELECT (contact_email, notes, stripe_customer_id, stripe_subscription_id)
  ON promoted_placements FROM anon;

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
