-- Migration: venue_clicks_destination
-- Created: 2026-09-02
--
-- Lagrer hvilket domene et utgaaende klikk faktisk gikk til.
--
-- HVORFOR
--
-- venue_clicks har venue_name og event_slug, men ikke hvor klikket havnet.
-- Maaldomenet ligger i events.ticket_url, og arrangementssider slettes naar
-- arrangementet er over. 2. september 2026 kunne bare 279 av 2 525 utgaaende
-- klikk (11 %) knyttes til et maaldomene — resten pekte paa arrangementer som
-- ikke lenger finnes.
--
-- Det er nettopp den koblingen som trengs naar Gaari skal vise en billettaktoer
-- hvor mye trafikk vi sender dem. Uten den maa tallet enten estimeres, eller
-- begrenses til de fire siste ukene. Kolonnen her gjoer det maalt og varig.
--
-- Bare vertsnavnet lagres, aldri hele adressen med spoerrestreng: domenet er
-- det rapporteringen trenger, og en full URL kan baere sporingsparametre.

ALTER TABLE venue_clicks
	ADD COLUMN IF NOT EXISTS destination_domain text;

COMMENT ON COLUMN venue_clicks.destination_domain IS
	'Vertsnavn klikket gikk til, uten www. Null for interne kortklikk og for rader fra foer 2. september 2026.';

-- Rapportering grupperer paa domene over et tidsrom.
CREATE INDEX IF NOT EXISTS idx_venue_clicks_destination
	ON venue_clicks (destination_domain, clicked_at DESC)
	WHERE destination_domain IS NOT NULL;
