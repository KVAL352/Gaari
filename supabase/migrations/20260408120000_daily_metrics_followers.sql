-- Add social follower columns to daily_metrics for week-over-week comparison
-- in the daily digest and weekly report.
ALTER TABLE daily_metrics
ADD COLUMN IF NOT EXISTS ig_followers INTEGER,
ADD COLUMN IF NOT EXISTS fb_followers INTEGER;
