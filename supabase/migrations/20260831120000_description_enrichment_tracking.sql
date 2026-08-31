-- Spor forsoek paa berikelse av beskrivelser.
--
-- HVORFOR
--
-- descriptions.yml plukket koeen som «de foerste 300 sortert paa id» blant
-- rader med beskrivelse under 170 tegn. Rader den ikke klarte aa forbedre fikk
-- ingen markering, saa de laa igjen i koeen og ble plukket paa nytt neste dag,
-- og dagen etter.
--
-- Kjoeringen 30. august behandlet 300 rader og forbedret 72. De 228 andre var
-- rader uten omtale paa kildesida (122), rader der resultatet ikke ble bedre
-- enn den gamle teksten (52), og sider som ikke lot seg hente (54). Alle 228
-- sto foerst i koeen igjen dagen etter.
--
-- Med rundt 80 nye arrangementer i doegnet og 72 som faktisk ble forbedret,
-- vokste koeen paa 1 022 sakte i stedet for aa toemmes. Jobben var groenn hver
-- dag mens den stod stille — den samme feilklassen som
-- link_check-kolonnene under loeste for lenkesjekken.
--
-- Speiler derfor 20260227120000_link_health_columns.sql: en teller og et
-- tidsstempel. Koeen sorteres etter tidsstempelet med aldri-forsoekt foerst,
-- saa rader som feilet havner bakerst i stedet for aa blokkere.
--
-- Ingen hard sperre etter N forsoek, med vilje: en arrangoer kan legge ut
-- omtalen senere, og da skal raden kunne hentes inn igjen. Rekkefoelgen
-- nedprioriterer den, den utelukker den ikke.

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS description_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description_tried_at timestamptz;

-- Ingen indeks her, i motsetning til link_health. Jobben henter alle kommende
-- rader med kildelenke uansett (rundt 2 000) og sorterer i minnet, fordi
-- lengdefilteret paa description_no ikke kan uttrykkes i PostgREST. En indeks
-- ville ikke blitt brukt. Flyttes sorteringen til basen senere, hoerer den til
-- her: (description_tried_at NULLS FIRST) WHERE status = 'approved'.
