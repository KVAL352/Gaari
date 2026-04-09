-- Track which event IDs were included in each social post
-- Used for cross-day deduplication: avoid repeating events across the week
ALTER TABLE social_posts ADD COLUMN event_ids UUID[] DEFAULT '{}';
