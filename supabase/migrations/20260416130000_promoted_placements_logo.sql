-- Partner logo for "Samarbeidspartnere" section on /for-arrangorer.
-- Null = not shown. Automatically hidden when placement becomes inactive
-- or end_date passes (driven by existing active/date filtering).
ALTER TABLE promoted_placements
  ADD COLUMN logo_url TEXT;
