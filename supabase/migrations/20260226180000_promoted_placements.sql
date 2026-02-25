-- Config: one row per paying venue+collection combo
CREATE TABLE promoted_placements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  venue_name TEXT NOT NULL,          -- must match event.venue_name exactly
  collection_slugs TEXT[] NOT NULL,  -- e.g. ['denne-helgen', 'this-weekend']
  tier TEXT NOT NULL CHECK (tier IN ('basis', 'standard', 'partner')),
  slot_share INT NOT NULL,           -- 15, 25, or 35
  active BOOLEAN NOT NULL DEFAULT true,
  start_date DATE NOT NULL,
  end_date DATE,                     -- null = open-ended
  contact_email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily impression aggregates (one row per placement+collection+day)
CREATE TABLE placement_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  placement_id UUID NOT NULL REFERENCES promoted_placements(id),
  collection_slug TEXT NOT NULL,
  venue_name TEXT NOT NULL,
  log_date DATE NOT NULL DEFAULT CURRENT_DATE,
  impression_count INT NOT NULL DEFAULT 1,
  UNIQUE(placement_id, collection_slug, log_date)
);

-- Atomic upsert function for impression logging
CREATE OR REPLACE FUNCTION log_placement_impression(
  p_placement_id UUID,
  p_collection_slug TEXT,
  p_venue_name TEXT,
  p_log_date DATE
) RETURNS void LANGUAGE sql AS $$
  INSERT INTO placement_log (placement_id, collection_slug, venue_name, log_date, impression_count)
  VALUES (p_placement_id, p_collection_slug, p_venue_name, p_log_date, 1)
  ON CONFLICT (placement_id, collection_slug, log_date)
  DO UPDATE SET impression_count = placement_log.impression_count + 1;
$$;

-- RLS
ALTER TABLE promoted_placements ENABLE ROW LEVEL SECURITY;
ALTER TABLE placement_log ENABLE ROW LEVEL SECURITY;

-- anon can read placements (needed by page.server.ts)
CREATE POLICY "anon_read_placements" ON promoted_placements FOR SELECT USING (true);
-- anon can upsert log entries (trusted: happens server-side in page.server.ts)
CREATE POLICY "anon_insert_log" ON placement_log FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update_log" ON placement_log FOR UPDATE USING (true);
CREATE POLICY "anon_read_log" ON placement_log FOR SELECT USING (true);
