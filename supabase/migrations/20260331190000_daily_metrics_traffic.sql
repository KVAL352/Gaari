-- Add traffic columns to daily_metrics for week-over-week comparison
ALTER TABLE daily_metrics
ADD COLUMN IF NOT EXISTS visitors INTEGER,
ADD COLUMN IF NOT EXISTS pageviews INTEGER;
