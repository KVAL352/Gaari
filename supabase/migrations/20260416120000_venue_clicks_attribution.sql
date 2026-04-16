-- Fase 1 av promoted placement attribution: utvid venue_clicks med kontekst.
-- Gjør det mulig å skille klikk som kom fra Fremhevet vs. organisk vs. direkte.
-- Se docs/promoted-placement-attribution.md.

ALTER TABLE venue_clicks
    ADD COLUMN IF NOT EXISTS placement_id UUID REFERENCES promoted_placements(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS source_page TEXT,
    ADD COLUMN IF NOT EXISTS placement_context TEXT
        CHECK (placement_context IN ('promoted', 'organic', 'direct', 'newsletter', 'social'));

-- Indexes for the typical queries: per-venue+context over a time window,
-- and per-placement over a time window.
CREATE INDEX IF NOT EXISTS idx_venue_clicks_context
    ON venue_clicks (venue_name, placement_context, clicked_at DESC);

CREATE INDEX IF NOT EXISTS idx_venue_clicks_placement
    ON venue_clicks (placement_id, clicked_at DESC)
    WHERE placement_id IS NOT NULL;
