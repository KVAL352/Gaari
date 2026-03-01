-- Scraper run tracking: one row per scraper per pipeline run
-- ~100 rows/day (50 scrapers × 2 runs), 90-day retention

CREATE TABLE scraper_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL,
  scraper_name TEXT NOT NULL,
  found INT NOT NULL DEFAULT 0,
  inserted INT NOT NULL DEFAULT 0,
  errored BOOLEAN NOT NULL DEFAULT false,
  error_message TEXT,
  duration_ms INT,
  skipped BOOLEAN NOT NULL DEFAULT false,
  run_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(run_id, scraper_name)
);

CREATE INDEX idx_scraper_runs_name_time ON scraper_runs (scraper_name, run_at DESC);
CREATE INDEX idx_scraper_runs_run_id ON scraper_runs (run_id);

ALTER TABLE scraper_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access"
  ON scraper_runs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
