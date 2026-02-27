-- Project calendar for tracking milestones, deadlines, and tasks
CREATE TABLE project_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'skipped')),
  category TEXT NOT NULL DEFAULT 'task' CHECK (category IN ('milestone', 'deadline', 'task', 'recurring', 'meeting')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for date-based queries
CREATE INDEX idx_project_calendar_due_date ON project_calendar (due_date);
CREATE INDEX idx_project_calendar_status ON project_calendar (status);

-- RLS: anon can read, service role can write
ALTER TABLE project_calendar ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anon_read_calendar" ON project_calendar FOR SELECT USING (true);
CREATE POLICY "service_write_calendar" ON project_calendar FOR ALL USING (auth.role() = 'service_role');

-- Seed with key milestones from the roadmap
INSERT INTO project_calendar (title, description, due_date, status, category) VALUES
  ('Review first week Plausible data', 'Launched Feb 26 — check traffic, sources, top pages', '2026-03-02', 'pending', 'task'),
  ('Build prospect list', 'Map 43 scraper sources → orgs, contacts, estimated tiers (Brønnøysundregistrene/Proff.no)', '2026-03-08', 'pending', 'task'),
  ('Set up Buttondown newsletter', 'Create account with gaari.bergen@proton.me', '2026-03-08', 'pending', 'task'),
  ('Draft first newsletter', 'Hva skjer i Bergen denne helgen — curated 10-15 events', '2026-03-15', 'pending', 'task'),
  ('First venue backlink email', 'Se arrangementer på Gåri — link request to top venue', '2026-03-09', 'pending', 'task'),
  ('3 weeks Plausible data', 'Enough data to generate meaningful venue referral reports', '2026-03-19', 'pending', 'milestone'),
  ('Generate first venue referral reports', 'Use Plausible data to create per-venue click reports', '2026-03-22', 'pending', 'task'),
  ('Finalize /for-arrangorer page', 'Complete B2B page copy + visuals, ready to unhide', '2026-03-22', 'pending', 'task'),
  ('Send first newsletter', 'First weekly Hva skjer i Bergen', '2026-03-19', 'pending', 'milestone'),
  ('4 weeks Plausible data — Phase C sales-ready', 'Full month of data. Start sales outreach.', '2026-03-26', 'pending', 'milestone'),
  ('First unsolicited venue emails', 'Gåri sendte X klikk til [venue] — top 5 venues', '2026-03-26', 'pending', 'task'),
  ('AI citation screenshots', 'Collect ChatGPT/Perplexity screenshots citing Gåri for pitch deck', '2026-03-26', 'pending', 'task'),
  ('In-person meetings top 5', 'Meet top 5 prospects with printed data', '2026-04-15', 'pending', 'milestone'),
  ('15-20 venues contacted', 'Target: personal outreach to 15-20 venues by end of April', '2026-04-30', 'pending', 'deadline'),
  ('Stripe billing integration', 'Build payment flow for venue subscriptions', '2026-04-30', 'pending', 'task'),
  ('Unhide /for-arrangorer', 'Add back to footer + sitemap', '2026-05-15', 'pending', 'task'),
  ('Early bird deadline', '3 months free for signups before this date', '2026-06-01', 'pending', 'deadline'),
  ('First early birds activated', '3-5 venues on free trial', '2026-06-15', 'pending', 'milestone'),
  ('First paid revenue', 'Early birds convert to paid tiers', '2026-09-01', 'pending', 'milestone'),
  ('MVA registration', 'Register before 50K cumulative threshold', '2026-11-01', 'pending', 'deadline');
