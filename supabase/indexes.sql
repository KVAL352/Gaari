-- Recommended indexes for the events table.
-- Run these manually in Supabase SQL Editor.
-- Check existing indexes first: SELECT indexname FROM pg_indexes WHERE tablename = 'events';

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
