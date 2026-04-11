-- Daily Meta snapshot: captures follower counts, profile stats, and daily-level
-- insights for FB and IG. Fills the gap that daily_metrics left on weekends
-- (digest only runs weekdays) and makes trend analysis reliable.
--
-- Populated by scripts/fetch-meta-daily.ts via the meta-snapshot GHA workflow
-- (runs every day, including weekends).
CREATE TABLE IF NOT EXISTS meta_daily_snapshot (
  date DATE PRIMARY KEY,

  -- Facebook page
  fb_followers INTEGER,
  fb_fan_count INTEGER,

  -- Instagram account
  ig_followers INTEGER,
  ig_follows INTEGER,
  ig_media_count INTEGER,

  -- IG daily insights (sum / single-day values)
  ig_reach INTEGER,
  ig_views INTEGER,
  ig_profile_views INTEGER,
  ig_website_clicks INTEGER,
  ig_accounts_engaged INTEGER,
  ig_total_interactions INTEGER,

  -- Raw API response for future query — we may discover useful fields later
  raw JSONB NOT NULL DEFAULT '{}',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Look up recent days fast
CREATE INDEX IF NOT EXISTS idx_meta_daily_snapshot_date
  ON meta_daily_snapshot (date DESC);

-- RLS: service role only
ALTER TABLE meta_daily_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_write_meta_daily_snapshot" ON meta_daily_snapshot
  FOR ALL TO service_role USING (true) WITH CHECK (true);
