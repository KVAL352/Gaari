-- Rettelser innsendere har bedt om, og beskjed til dem når rettelsen er gjort.
--
-- Hvorfor en egen tabell: events.submitter_email nulles når bekreftelsen er
-- sendt (GDPR, formålet er oppfylt). Ber innsenderen om en rettelse etterpå,
-- finnes adressen bare i svareposten. Her lagres den kort, for ett formål:
-- å si fra når rettelsen er utført.
--
-- Livsløp:
--   1. Rad opprettes når vi har fått en rettelsesforespørsel (email + event_id).
--   2. Vi retter arrangementet og setter fixed_at.
--   3. notify-corrections.ts (notify.yml) sender brevet, setter notified_at og
--      nuller email i samme oppdatering.
--   4. Rader som aldri blir rettet slettes etter 90 dager av samme jobb.
--
-- Bare de som selv har bedt om en endring skal ha en rad her. Vår egen
-- opprydding (f.eks. bilder fjernet av sperrelisten) gir ingen rad og ingen epost.

CREATE TABLE IF NOT EXISTS correction_requests (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
	email TEXT,
	created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
	fixed_at TIMESTAMPTZ,
	notified_at TIMESTAMPTZ,
	-- Adressen skal være borte når brevet er sendt. Databasen håndhever det,
	-- ikke bare jobben.
	CONSTRAINT correction_email_nulled_after_notice
		CHECK (notified_at IS NULL OR email IS NULL)
);

COMMENT ON TABLE correction_requests IS
	'Innsenders rettelsesforespørsel. email slettes når notified_at settes. Se scripts/notify-corrections.ts.';

-- Ingen policyer: bare service role (som omgår RLS) skal lese adressene.
ALTER TABLE correction_requests ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_correction_requests_awaiting_notice
	ON correction_requests (fixed_at)
	WHERE fixed_at IS NOT NULL AND notified_at IS NULL;
