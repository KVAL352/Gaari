-- Add Instagram and Facebook posting tracking columns to social_posts
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS instagram_id TEXT;
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS instagram_posted_at TIMESTAMPTZ;
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS facebook_id TEXT;
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS facebook_posted_at TIMESTAMPTZ;

-- Index for finding unposted entries efficiently
CREATE INDEX IF NOT EXISTS idx_social_posts_ig_pending
  ON social_posts (generated_date)
  WHERE instagram_id IS NULL AND slide_count > 0;

CREATE INDEX IF NOT EXISTS idx_social_posts_fb_pending
  ON social_posts (generated_date)
  WHERE facebook_id IS NULL AND slide_count > 0;
