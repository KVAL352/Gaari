-- Weekly GSC position snapshots for tracking ranking changes over time
CREATE TABLE IF NOT EXISTS gsc_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  query TEXT NOT NULL,
  clicks INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  ctr NUMERIC(5,4) DEFAULT 0,
  position NUMERIC(5,2) DEFAULT 0,
  page TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(snapshot_date, query)
);

CREATE INDEX IF NOT EXISTS idx_gsc_snapshots_date ON gsc_snapshots(snapshot_date);
CREATE INDEX IF NOT EXISTS idx_gsc_snapshots_query ON gsc_snapshots(query);
