-- Add Bluesky posting tracking columns to social_posts
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS bluesky_uri TEXT;
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS bluesky_posted_at TIMESTAMPTZ;

-- Index for finding unposted entries efficiently
CREATE INDEX IF NOT EXISTS idx_social_posts_bluesky_pending
  ON social_posts (generated_date)
  WHERE bluesky_uri IS NULL AND slide_count > 0;
