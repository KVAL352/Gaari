-- Track total page views per collection page per day.
-- Used by impression-based promoted placement logic to calculate
-- each venue's share of visibility (e.g. Standard = 25% of views).
CREATE TABLE collection_impressions (
  collection_slug TEXT NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  impression_count INT NOT NULL DEFAULT 1,
  PRIMARY KEY (collection_slug, log_date)
);

-- Atomic upsert: increment page view counter
CREATE OR REPLACE FUNCTION log_collection_impression(
  p_collection_slug TEXT,
  p_log_date DATE
) RETURNS void LANGUAGE sql AS $$
  INSERT INTO collection_impressions (collection_slug, log_date, impression_count)
  VALUES (p_collection_slug, p_log_date, 1)
  ON CONFLICT (collection_slug, log_date)
  DO UPDATE SET impression_count = collection_impressions.impression_count + 1;
$$;

-- RLS
ALTER TABLE collection_impressions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_insert_collection_impressions" ON collection_impressions FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_collection_impressions" ON collection_impressions FOR UPDATE USING (true);
CREATE POLICY "anon_read_collection_impressions" ON collection_impressions FOR SELECT USING (true);
