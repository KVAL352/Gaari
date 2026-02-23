-- Add missing indexes for performance and observability

-- Clean duplicate source_urls before adding unique constraint
-- Keeps the row with the latest created_at for each duplicate source_url
DELETE FROM events
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (PARTITION BY source_url ORDER BY created_at DESC) AS rn
    FROM events
    WHERE source_url IS NOT NULL
  ) ranked
  WHERE rn > 1
);

-- Unique index on source_url (used by eventExists() on every scraper insert)
CREATE UNIQUE INDEX IF NOT EXISTS idx_events_source_url
  ON events (source_url);

-- Composite: homepage query (approved events sorted by date)
CREATE INDEX IF NOT EXISTS idx_events_status_date
  ON events (status, date_start);

-- Partial index: only approved upcoming events (most common query)
CREATE INDEX IF NOT EXISTS idx_events_approved_upcoming
  ON events (date_start)
  WHERE status = 'approved';

-- Health check: recent scrape detection
CREATE INDEX IF NOT EXISTS idx_events_created_at
  ON events (created_at);
