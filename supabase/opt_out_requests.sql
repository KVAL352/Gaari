-- Opt-out requests table for venues/organizers who want their events removed from Gåri
-- Run this in the Supabase SQL Editor

CREATE TABLE opt_out_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization TEXT NOT NULL,
  domain TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: allow anonymous inserts (the form), but only service role can read/manage
ALTER TABLE opt_out_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit opt-out requests"
  ON opt_out_requests FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "Service role can read opt-out requests"
  ON opt_out_requests FOR SELECT
  TO service_role
  USING (true);

CREATE POLICY "Service role can update opt-out requests"
  ON opt_out_requests FOR UPDATE
  TO service_role
  USING (true);
