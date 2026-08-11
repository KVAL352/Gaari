-- Bekreftelse til innsendere av arrangementer.
--
-- Hullet vi tetter: noen sender inn et arrangement, det blir godkjent, og
-- innsenderen får aldri vite noe. De får ikke sjekket at detaljene stemmer,
-- de får ingen lenke å dele, og de vet ikke om det er verdt å sende inn igjen.
--
-- Grunnen til at det trengs en kolonne og ikke bare en knapp i admin: godkjenning
-- skjer både i /admin/submissions og direkte i Supabase. En knapp virker bare det
-- ene stedet, og feiler stille det andre. Med et tidsstempel kan en jobb i stedet
-- avstemme tilstanden uavhengig av hvor godkjenningen skjedde, og den kan ikke
-- sende to ganger.
--
-- NULL betyr "ikke varslet ennå". Et tidsstempel betyr "varslet da".

ALTER TABLE events
	ADD COLUMN IF NOT EXISTS submitter_notified_at TIMESTAMPTZ;

COMMENT ON COLUMN events.submitter_notified_at IS
	'Når innsenderen fikk bekreftelse med lenke til det publiserte arrangementet. NULL = ikke varslet. Settes av scripts/notify-submitters.ts.';

-- Delvis indeks på nettopp de radene jobben leter etter. Tabellen har over 1700
-- rader, og bare en håndfull er innsendte med e-post, så en full skanning hver
-- morgen ville vært sløsing.
CREATE INDEX IF NOT EXISTS idx_events_awaiting_submitter_notice
	ON events (created_at)
	WHERE submitter_email IS NOT NULL AND submitter_notified_at IS NULL;
