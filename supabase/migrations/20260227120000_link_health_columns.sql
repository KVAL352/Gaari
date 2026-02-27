-- Track broken link detection: strike counter + last check timestamp
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS link_check_failures integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS link_checked_at timestamptz;

-- Index for efficient batch processing: never-checked first, then oldest-checked
CREATE INDEX IF NOT EXISTS idx_events_link_checked
  ON events (link_checked_at NULLS FIRST)
  WHERE status = 'approved';
