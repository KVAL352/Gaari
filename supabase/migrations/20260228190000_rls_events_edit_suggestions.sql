-- Enable RLS on events and edit_suggestions tables
-- (Applied manually via Supabase dashboard on 2026-02-28)

-- ============================================================
-- events table
-- ============================================================

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Anon can only read approved events (public website)
CREATE POLICY "Anon can read approved events"
  ON events FOR SELECT
  TO anon
  USING (status = 'approved');

-- Anon can only insert events with pending status (submit form)
CREATE POLICY "Anon can submit events"
  ON events FOR INSERT
  TO anon
  WITH CHECK (status = 'pending');

-- Service role has full access (scrapers, admin)
CREATE POLICY "Service role full access"
  ON events FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- edit_suggestions table
-- ============================================================

ALTER TABLE edit_suggestions ENABLE ROW LEVEL SECURITY;

-- Anyone can submit corrections (correction form)
CREATE POLICY "Anyone can submit corrections"
  ON edit_suggestions FOR INSERT
  TO public
  WITH CHECK (true);

-- Service role has full access (admin review)
CREATE POLICY "Service role full access"
  ON edit_suggestions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
