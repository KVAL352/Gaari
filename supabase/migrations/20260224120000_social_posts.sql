CREATE TABLE IF NOT EXISTS social_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_slug TEXT NOT NULL,
  generated_date DATE NOT NULL DEFAULT CURRENT_DATE,
  event_count INTEGER NOT NULL,
  slide_count INTEGER NOT NULL,
  image_urls TEXT[] NOT NULL,
  caption TEXT NOT NULL,
  post_time TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collection_slug, generated_date)
);

ALTER TABLE social_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read social posts" ON social_posts FOR SELECT USING (true);
