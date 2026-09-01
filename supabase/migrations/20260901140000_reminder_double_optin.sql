-- Dobbel opt-in på arrangementspåminnelser.
--
-- HVORFOR
--
-- `POST /api/remind` skrev en hvilken som helst e-postadresse rett inn i
-- event_reminders, uten bekreftelse. Sikkerhetsrevisjonen 1. september 2026
-- fant to problemer med det:
--
--   1. Gåri kunne brukes til å plage noen med e-post de aldri har bedt om.
--      Angriperen trenger bare adressen deres og en arrangementslenke.
--   2. Vi behandlet en persons e-postadresse uten samtykke.
--
-- Ratebegrensningen på tre kall i minuttet per IP dempet det, men tre i
-- minuttet er 4 320 i døgnet fra én IP, og roterende IP-er omgår den helt.
--
-- Løsningen er at adressen ikke er påmeldt før eieren har klikket en lenke i
-- sin egen innboks. Da er samtykket bevisbart, og en angriper kan ikke melde
-- på noen andre enn seg selv.
--
-- Tabellen var tom da migrasjonen ble skrevet, så ingen eksisterende rader
-- måtte håndteres.

ALTER TABLE event_reminders
  ADD COLUMN IF NOT EXISTS confirm_token TEXT,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;

-- Oppslag skjer på tokenet når noen klikker bekreftelseslenka.
CREATE UNIQUE INDEX IF NOT EXISTS idx_event_reminders_confirm_token
  ON event_reminders (confirm_token)
  WHERE confirm_token IS NOT NULL;

-- Utsendingen henter på dato og filtrerer bort ubekreftede. Indeksen dekker
-- begge delene, slik at en voksende hale av ubekreftede rader ikke gjør
-- spørringen tyngre.
CREATE INDEX IF NOT EXISTS idx_event_reminders_klar
  ON event_reminders (event_date)
  WHERE confirmed_at IS NOT NULL AND sent_at IS NULL;
