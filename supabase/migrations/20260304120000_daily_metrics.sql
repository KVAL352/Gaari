-- Daily metrics snapshot for digest comparisons
CREATE TABLE daily_metrics (
  date DATE PRIMARY KEY,
  subscribers INTEGER
);

-- Allow digest script (service role) full access
-- No anon access needed
ALTER TABLE daily_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access" ON daily_metrics
  FOR ALL USING (true) WITH CHECK (true);
