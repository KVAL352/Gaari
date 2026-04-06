-- Social insights: engagement metrics for all IG/FB posts (automated + manual)
CREATE TABLE IF NOT EXISTS social_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('ig', 'fb')),
  platform_id TEXT NOT NULL,
  social_post_id UUID REFERENCES social_posts(id) ON DELETE SET NULL,
  posted_at TIMESTAMPTZ,
  caption TEXT,
  permalink TEXT,
  metrics JSONB NOT NULL DEFAULT '{}',
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (platform, platform_id)
);

-- Find posts needing refresh (oldest fetched first)
CREATE INDEX IF NOT EXISTS idx_social_insights_refresh
  ON social_insights (fetched_at ASC);

-- Look up by platform
CREATE INDEX IF NOT EXISTS idx_social_insights_platform
  ON social_insights (platform, posted_at DESC);

-- RLS: anon can read, service role can write
ALTER TABLE social_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_social_insights" ON social_insights
  FOR SELECT TO anon USING (true);

CREATE POLICY "service_write_social_insights" ON social_insights
  FOR ALL TO service_role USING (true) WITH CHECK (true);
