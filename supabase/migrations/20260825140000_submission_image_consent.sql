-- Lagre samtykket innsenderen faktisk ga.
--
-- HULLET: /submit laster bare opp et bilde når avsenderen har krysset av for at
-- de har rettighetene (src/routes/[lang]/submit/+page.svelte). Avkryssingen
-- styrer opplastingen, og så er den borte. Den lagres ingen steder, og varselet
-- på e-post noterer bare SoMe-svaret.
--
-- Hvorfor det er et problem: docs/bildesamtykke.md er det som skal svare på
-- «hvorfor lå det bildet der?» hvis det kommer et krav fra en fotograf eller et
-- bildebyrå. Hver rad i registeret har en dato og en commit bak seg. For
-- innsendte bilder kunne vi bare vise at porten fantes, gjennom koden og
-- git-historikken, men ikke at nettopp denne avsenderen gikk gjennom den. Det
-- er en svakere posisjon enn resten av registeret.
--
-- Funnet 2026-08-25, mens isImageAllowed() ble utvidet til å godta våre egne
-- opplastinger under events/. Unntaket hviler på at avkryssingen har skjedd, og
-- da bør avkryssingen finnes.
--
-- NULL betyr «ikke et innsendt bilde», altså alt som er scrapet. Det er ikke
-- det samme som nei, og de to må kunne skilles: et ubesvart felt og et
-- uttrykkelig nei ser like ut i ettertid hvis vi bare skriver ned ja-ene.

ALTER TABLE events
	ADD COLUMN IF NOT EXISTS image_rights_confirmed BOOLEAN,
	ADD COLUMN IF NOT EXISTS image_promo_consent BOOLEAN;

COMMENT ON COLUMN events.image_rights_confirmed IS
	'Krysset innsenderen av for at de har rettighetene til bildet? Settes av /submit ved innlegging. NULL = ikke en innsending (scrapet). Bevis for at bildet kunne vises på gaari.no.';

COMMENT ON COLUMN events.image_promo_consent IS
	'Sa innsenderen ja til at bildet kan brukes når Gåri omtaler arrangementet på Facebook og Instagram? NULL = ikke spurt. FALSE = uttrykkelig nei, og det er ikke det samme.';

-- Kolonnene er MED VILJE utelatt fra GRANT SELECT til anon i
-- 20260821150000_rls_lock_personal_data.sql. Grantet der er kolonnevis, så nye
-- kolonner er utilgjengelige for anon uten at noe mer gjøres. De besøkende har
-- ingen bruk for dem, og PUBLIC_EVENT_COLUMNS i src/lib/server/event-columns.ts
-- skal derfor ikke utvides.
--
-- INSERT-grantet er derimot på tabellnivå og uendret, så /submit kan skrive til
-- dem fra nettleseren uten videre.

-- Verifiser etter kjøring. Begge skal komme fram, og ingen av dem skal ligge i
-- anon-grantet:
--
--   select column_name, data_type
--   from information_schema.columns
--   where table_name = 'events'
--     and column_name in ('image_rights_confirmed', 'image_promo_consent');
--
--   select column_name
--   from information_schema.column_privileges
--   where table_name = 'events' and grantee = 'anon'
--     and column_name in ('image_rights_confirmed', 'image_promo_consent');
--   -- Skal gi null rader.
