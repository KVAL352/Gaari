-- Bekreftelse til arrangører som ber om å bli lagt inn via B2B-skjemaet.
--
-- Hullet vi tetter: /submit og /for-arrangorer skriver til hver sin tabell.
-- Et arrangement sendt inn via /submit havner i events med submitter_email, og
-- notify-submitters.ts finner det. En arrangør som i stedet sender inn nettsiden
-- sin havner i organizer_inquiries, som aldri er koblet til arrangementene vi
-- oppretter for dem. De fikk derfor aldri vite at det skjedde noe, uansett hvor
-- lang tid det tok. Oppdaget 2026-08-13 på High Voltage Rockfest.
--
-- Hvorfor event_source og ikke en event_id: en arrangør får ofte flere rader.
-- Jul i Villaveien ble til seks desemberdatoer fra én henvendelse. Kilde-slugen
-- er den koblingen som allerede finnes, den samme som styrer bildesamtykke i
-- consent.json, så det blir ett begrep å holde styr på i stedet for to.
--
-- Hvorfor et tidsstempel og ikke en knapp: arrangementene opprettes for hånd,
-- noen ganger i Supabase og noen ganger via et skript. En knapp virker bare ett
-- sted. Et tidsstempel lar jobben avstemme tilstanden uansett hvor raden ble
-- til, og gjør dobbeltsending umulig.
--
-- NULL betyr "ikke varslet ennå". Et tidsstempel betyr "varslet da".

ALTER TABLE organizer_inquiries
	ADD COLUMN IF NOT EXISTS event_source TEXT,
	ADD COLUMN IF NOT EXISTS notified_at TIMESTAMPTZ;

COMMENT ON COLUMN organizer_inquiries.event_source IS
	'events.source-slugen som ble brukt da arrangementene deres ble lagt inn. NULL = ingen arrangementer opprettet ennå, og da skal det ikke sendes bekreftelse.';

COMMENT ON COLUMN organizer_inquiries.notified_at IS
	'Når arrangøren fikk bekreftelse med lenker til det som ble publisert. NULL = ikke varslet. Settes av scripts/notify-organizers.ts.';

-- Delvis indeks på nettopp de radene jobben leter etter: koblet til arrangementer,
-- men ennå ikke varslet. Tabellen er liten i dag, men jobben kjører hver morgen.
CREATE INDEX IF NOT EXISTS idx_inquiries_awaiting_notice
	ON organizer_inquiries (created_at)
	WHERE event_source IS NOT NULL AND notified_at IS NULL;
