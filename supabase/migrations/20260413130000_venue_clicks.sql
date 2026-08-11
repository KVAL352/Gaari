-- Per-venue click tracking for B2B sales documentation
CREATE TABLE IF NOT EXISTS venue_clicks (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    venue_name TEXT NOT NULL,
    event_slug TEXT NOT NULL,
    clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast per-venue aggregation queries
CREATE INDEX IF NOT EXISTS idx_venue_clicks_venue ON venue_clicks (venue_name, clicked_at DESC);

-- RLS: allow insert from anon (client-side tracking), restrict reads to service_role
ALTER TABLE venue_clicks ENABLE ROW LEVEL SECURITY;
CREATE POLICY venue_clicks_insert ON venue_clicks FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY venue_clicks_select ON venue_clicks FOR SELECT TO service_role USING (true);
