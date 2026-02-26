-- Organizer inquiry form submissions from /for-arrangorer marketing page
CREATE TABLE organizer_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  organization TEXT NOT NULL,
  email TEXT NOT NULL,
  message TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'declined')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE organizer_inquiries ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an inquiry (anon insert)
CREATE POLICY "Anyone can submit an inquiry"
  ON organizer_inquiries FOR INSERT TO anon WITH CHECK (true);

-- Only service role can read/update (admin dashboard)
CREATE POLICY "Service role full access"
  ON organizer_inquiries FOR ALL TO service_role USING (true) WITH CHECK (true);
