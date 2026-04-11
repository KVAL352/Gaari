-- Ad insights: daily snapshot of Meta Marketing API campaign performance.
-- Why: Meta aggregates/deletes granular insights after ~37 months, so we snapshot
-- to own DB for long-term campaign comparison. Written by the daily digest each
-- morning and/or on demand via `meta.ts ads daily --save`.
CREATE TABLE IF NOT EXISTS ad_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL DEFAULT 'meta' CHECK (platform IN ('meta')),
  campaign_id TEXT NOT NULL,
  campaign_name TEXT NOT NULL,
  short_name TEXT,                        -- e.g. "boost-2026-04-08" extracted from UTM
  date DATE NOT NULL,                     -- day the metrics cover (Europe/Oslo)
  impressions INTEGER,
  reach INTEGER,
  clicks INTEGER,                         -- all click types (including reactions)
  link_clicks INTEGER,                    -- inline_link_clicks only
  landing_page_views INTEGER,
  spend_nok NUMERIC(10,2),
  ctr_total NUMERIC(6,3),                 -- percent, e.g. 7.687
  ctr_link NUMERIC(6,3),                  -- percent for link clicks only
  cpc_all NUMERIC(10,2),                  -- NOK per click (all)
  cpc_link NUMERIC(10,2),                 -- NOK per link click
  cpm NUMERIC(10,2),                      -- NOK per 1000 impressions
  frequency NUMERIC(5,2),                 -- avg views per reached user
  raw JSONB NOT NULL DEFAULT '{}',        -- full insight response for future query
  fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE (platform, campaign_id, date)
);

-- Look up all rows for a specific campaign
CREATE INDEX IF NOT EXISTS idx_ad_insights_campaign
  ON ad_insights (campaign_id, date DESC);

-- Look up all rows for a date range (cross-campaign reports)
CREATE INDEX IF NOT EXISTS idx_ad_insights_date
  ON ad_insights (date DESC);

-- RLS: service role only (this is ops data, not public)
ALTER TABLE ad_insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_write_ad_insights" ON ad_insights
  FOR ALL TO service_role USING (true) WITH CHECK (true);
