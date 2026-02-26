-- Add submitter_email column to events table
-- Nullable: scraped events won't have it, and it's optional on the submit form
ALTER TABLE events ADD COLUMN submitter_email TEXT;
