-- Add story image URLs and tracking to social_posts
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS story_image_urls TEXT[];
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS story_posted_at TIMESTAMPTZ;
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS story_count INTEGER DEFAULT 0;
