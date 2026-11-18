# Detektivloggen

Skrives av skillen `detektiv` (`.claude/skills/detektiv/SKILL.md`). Én rad per
runde. Matrisen viser hva som er dekket; neste runde er første tomme celle,
lest rolle for rolle (kolonne for kolonne) ovenfra.

Tegn: `x` gjort, `d` delvis (før skillen, uten fast metode), tomt = ikke gjort.

## Matrisen

| Sidetype | 1 Data | 2 Innhold | 3 QA | 4 Frontend | 5 SEO | 6 Tilgj. | 7 Ytelse | 8 UX | 9 UI | 10 Personvern | 11 Analytiker |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Forside |  |  | d |  |  |  |  |  |  |  |  |
| Samlingssider |  |  | d |  | d |  |  |  |  |  |  |
| Arrangementssider | d |  | d |  | d |  |  |  |  |  |  |
| Stedssider | d |  | d |  |  |  |  |  |  |  |  |
| Denne uken |  |  |  |  |  |  |  |  |  |  |  |
| Skjemaer |  |  | d |  |  |  |  |  |  |  |  |
| Faste sider |  |  | d |  |  |  |  |  |  |  |  |
| Maskinflater |  |  |  |  |  |  |  |  |  |  |  |

Delvis-cellene er fra detektivrunden 17.–18. nov 2026: forside og filtre, alle
132 sider i sitemapen (svarkode), `/submit`, stedssidene og 34
arrangementssider (canonical, hreflang, strukturerte data). Seks rettinger,
blant dem `24c4eb4` (relaterte arrangementer) og `e509a75` (dato i tittel).

## Rundene

| Dato | Sidetype | Rolle | Utvalg | Sider | Feil | Undersøkes | Forbedring | Commits |
|---|---|---|---|---|---|---|---|---|
| 2026-11-18 | Samlingssider (+ forsiden, samme henting) | 1 Data | alle 86 samlingssider i sitemapen, NO+EN; bydelssidene mot basen | 86 | 1: tre lokkeduer i forsidens HTML (side 2 i hentingen mangler `is_canary`-filter) | 0 | 0 | ingen ennå: tre strukturvalg tatt, se under |

### Avgjort 2026-11-18, bygd samme dag (`2c9b718`, `e929381`, `a81afe8`)

1. **Hentingen:** én felles hentefunksjon for forsiden (`src/routes/[lang]/+page.server.ts`) og samlingssidene (`src/routes/[lang]/[collection]/+page.server.ts`). `is_canary=false` i alle omganger, sortering på `date_start` + `id`, test som låser at begge bruker den og at ingen lokkedue slipper gjennom etter rad 1 000. Etterpå: se at de tre lokkeduene er borte fra forsidens HTML (NO+EN).
2. **14-dagersgrensen:** står for klubber og serier, men pågående utstillinger slipper gjennom. Trenger en regel for hva en utstilling er (kategori og ord i tittelen; se hva `utstillinger`-samlingen allerede bruker). Kommentaren «60 days» rettes til 14. Tørrkjør: hvilke av de 47 kommer med, og tell utstillingssiden før og etter.
3. **`seedEvents`:** brukes bare lokalt (`dev`). I produksjon får besøkende en melding om at arrangementene ikke kan vises nå, og feilen logges. Gjelder forsiden, samlingssidene og arrangementssidene.
