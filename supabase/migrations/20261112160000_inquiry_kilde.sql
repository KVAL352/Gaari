-- organizer_inquiries.kilde: hvilket skjema henvendelsen kom fra.
--
-- Skillet het til nå bare at meldingen startet med «Nettside-innsendelse».
-- B2B-skjemaets fritekst kunne derfor feilklassifiseres som bestilling av
-- scraper. Typen er nå en egen kolonne som skjemaene selv setter.
--
-- Rekkefølge: kjør denne FØR koden som skriver `kilde` går live. Før den er
-- kjørt feiler innsendingen fra /submit på en kolonne som ikke finnes.

ALTER TABLE organizer_inquiries
  ADD COLUMN IF NOT EXISTS kilde text NOT NULL DEFAULT 'b2b'
  CHECK (kilde IN ('b2b', 'nettside'));

-- Eksisterende rader: prefikset var skillet. Prefikset strippes etterpå, slik
-- at det ikke finnes to sannheter. Rekkefølgen er viktig: kilde først.
UPDATE organizer_inquiries
SET kilde = 'nettside'
WHERE kilde = 'b2b' AND message LIKE 'Nettside-innsendelse%';

UPDATE organizer_inquiries
SET message = NULLIF(btrim(regexp_replace(message, '^Nettside-innsendelse\s*', '')), '')
WHERE kilde = 'nettside' AND message LIKE 'Nettside-innsendelse%';

COMMENT ON COLUMN organizer_inquiries.kilde IS
  'b2b = /for-arrangorer (salg). nettside = /submit (bestilling av scraper, vi har lovet å ta kontakt).';
