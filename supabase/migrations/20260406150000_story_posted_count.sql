-- Track how many stories have been posted (for staggered posting)
ALTER TABLE social_posts ADD COLUMN IF NOT EXISTS story_posted_count INTEGER DEFAULT 0;
