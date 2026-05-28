-- Canary events: planted entries used to detect database scraping by third parties.
--
-- A canary is a real-looking event whose unique combination of title/venue/date
-- exists only on Gåri. If it appears on another site, it was copied from us.
--
-- Canaries are excluded from sitemap, RSS, ICS and the homepage so legitimate
-- users rarely encounter them. They DO appear on venue pages and at their
-- direct /events/[slug] URL — that's the bait surface where scrapers find them.
-- The event-detail page renders a visible notice so anyone who clicks through
-- understands it is not a real event.
ALTER TABLE events
  ADD COLUMN is_canary BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN events.is_canary IS
  'When true, this is a synthetic event planted to detect scraping. Excluded from sitemap/feeds/homepage. Event-detail page shows a "test data" notice.';

-- Partial index: most queries filter "not canary"; index makes the rare
-- canary lookup fast (admin tooling, detection script).
CREATE INDEX IF NOT EXISTS idx_events_canary
  ON events (is_canary)
  WHERE is_canary = true;
