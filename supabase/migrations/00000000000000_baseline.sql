-- Baseline schema: applied manually before the migration system was adopted.
-- DO NOT run this migration against production — it has already been applied.
-- Kept here as documentation of the initial schema.

-- ============================================================
-- Opt-out requests table
-- ============================================================

CREATE TABLE opt_out_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization TEXT NOT NULL,
  domain TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

GRANT INSERT ON opt_out_requests TO anon;

ALTER TABLE opt_out_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit opt-out requests"
  ON opt_out_requests FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Service role can read opt-out requests"
  ON opt_out_requests FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can update opt-out requests"
  ON opt_out_requests FOR UPDATE
  TO service_role
  USING (true);

-- ============================================================
-- Events table indexes
-- ============================================================

-- Unique constraints (prevent duplicate inserts)
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_slug
  ON events (slug);

CREATE UNIQUE INDEX IF NOT EXISTS idx_events_source_url
  ON events (source_url);

-- Date range queries and homepage sort
CREATE INDEX IF NOT EXISTS idx_events_date_start
  ON events (date_start);

-- Composite: homepage query (approved events sorted by date)
CREATE INDEX IF NOT EXISTS idx_events_status_date
  ON events (status, date_start);

-- Partial index: only approved upcoming events (most common query)
CREATE INDEX IF NOT EXISTS idx_events_approved_upcoming
  ON events (date_start)
  WHERE status = 'approved';

-- Filter queries
CREATE INDEX IF NOT EXISTS idx_events_category
  ON events (category);

CREATE INDEX IF NOT EXISTS idx_events_bydel
  ON events (bydel);

-- Health check: recent scrape detection
CREATE INDEX IF NOT EXISTS idx_events_created_at
  ON events (created_at);
