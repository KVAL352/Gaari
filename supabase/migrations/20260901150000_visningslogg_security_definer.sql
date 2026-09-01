-- Lås visningsloggene, og la RPC-ene gjøre skrivingen i stedet.
--
-- HVORFOR
--
-- Sikkerhetsrevisjonen 1. september 2026 fant at anon kunne skrive fritt til
-- `collection_impressions` og `placement_log`. Policyene sto på
-- `WITH CHECK (true)` for både INSERT og UPDATE, altså helt åpne.
--
-- Grunnen var at RPC-ene `log_collection_impression` og
-- `log_placement_impression` kjørte med kallerens rettigheter, og kalleren er
-- anon: `src/lib/server/supabase.ts` bruker PUBLIC_SUPABASE_ANON_KEY, så også
-- vår egen serverkode skriver som anon. Åpne policyer var derfor nødvendige
-- for at vår egen logging skulle virke.
--
-- Det er ikke bare analysetall. Visningene er nevneren når hver kundes andel
-- av fremhevede plasseringer regnes ut, altså noe det faktureres på. Tall
-- hvem som helst kan blåse opp er ikke tall vi kan sende en kunde.
--
-- LØSNINGEN: gjør funksjonene SECURITY DEFINER, slik at de kjører som eier.
-- Da kan tabellene låses for anon mens vår egen skriving fortsatt virker.
--
-- DATOEN FLYTTES INN I FUNKSJONEN. Den var et parameter, så en angriper kunne
-- skrive til hvilken som helst dato, også bakover i tid. Nå regnes den ut som
-- Oslo-dato inne i funksjonen. Merk at CURRENT_DATE ikke duger: Supabase
-- kjører i UTC, og rundt midnatt ville det gitt feil dag i Bergen.
--
-- HVA STÅR IGJEN: den som kaller RPC-en kan fortsatt øke dagens teller med én
-- per kall. Det er en reell begrensning, men langt smalere enn før: ingen
-- vilkårlige tall, ingen bakdatering, ingen sletting. Full sperre krever at
-- serveren slutter å bruke anon-nøkkelen, som er en egen beslutning.

-- ── Samlingsvisninger ────────────────────────────────────────────────────

DROP FUNCTION IF EXISTS log_collection_impression(TEXT, DATE);

CREATE OR REPLACE FUNCTION log_collection_impression(p_collection_slug TEXT)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO collection_impressions (collection_slug, log_date, impression_count)
  VALUES (p_collection_slug, (now() AT TIME ZONE 'Europe/Oslo')::date, 1)
  ON CONFLICT (collection_slug, log_date)
  DO UPDATE SET impression_count = collection_impressions.impression_count + 1;
$$;

DROP POLICY IF EXISTS "anon_insert_collection_impressions" ON collection_impressions;
DROP POLICY IF EXISTS "anon_update_collection_impressions" ON collection_impressions;
REVOKE INSERT, UPDATE, DELETE ON collection_impressions FROM anon;

-- SELECT blir stående. Admin-sida og rapportene leser med samme anon-klient,
-- og tallene er ikke følsomme i seg selv.

-- ── Plasseringsvisninger ─────────────────────────────────────────────────

DROP FUNCTION IF EXISTS log_placement_impression(UUID, TEXT, TEXT, DATE);

CREATE OR REPLACE FUNCTION log_placement_impression(
  p_placement_id UUID,
  p_collection_slug TEXT,
  p_venue_name TEXT
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO placement_log (placement_id, collection_slug, venue_name, log_date, impression_count)
  VALUES (p_placement_id, p_collection_slug, p_venue_name, (now() AT TIME ZONE 'Europe/Oslo')::date, 1)
  ON CONFLICT (placement_id, collection_slug, log_date)
  DO UPDATE SET impression_count = placement_log.impression_count + 1;
$$;

DROP POLICY IF EXISTS "anon_insert_log" ON placement_log;
DROP POLICY IF EXISTS "anon_update_log" ON placement_log;
REVOKE INSERT, UPDATE, DELETE ON placement_log FROM anon;
