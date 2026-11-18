# Detektivloggen

Skrives av skillen `detektiv` (`.claude/skills/detektiv/SKILL.md`). Én rad per
runde. Matrisen viser hva som er dekket; neste runde er første tomme celle,
lest rolle for rolle (kolonne for kolonne) ovenfra.

Tegn: `x` gjort, `d` delvis (før skillen, uten fast metode), tomt = ikke gjort.

## Matrisen

| Sidetype | 1 Data | 2 Innhold | 3 QA | 4 Frontend | 5 SEO | 6 Tilgj. | 7 Ytelse | 8 UX | 9 UI | 10 Personvern | 11 Analytiker |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Forside |  |  | d |  |  |  |  |  |  |  |  |
| Samlingssider |  | x | d (curl gjort, Chrome ikke) |  | d |  |  |  |  |  |  |
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
| 2026-11-18 | Samlingssider | 2 Innhold | 43 norske samlingssider fra sitemapen; 15 lest i detalj (tittel, ingress, kort), resten bare ingress og antall. Instrument: `curl` (ser ikke JavaScript) + `collections.ts` for filteret | 43 | 1: sesongfiltre brukte feil år (påske 0 mot minst 3, vinterferie 0 mot minst 10, høstferie viste to utstillinger fra okt. 2026 under «2027») | 5: Bergen Pride (36 ukentlige treff mot «Regnbuedagene»), for-ungdom (barnearrangementer), gratis («Ingen billett nødvendig»), festivaler («8 arrangementer»), tom sesong lover «komplett program» | 0 | `dad9e9b` |
| 2026-11-18 | Samlingssider | 3 QA (delvis) | alle 86 samlingssider i sitemapen, NO+EN. Instrument: `check-site.ts` (317 adresser) + `curl` av hreflang nb/en på hver side. Chrome kjørt på 5 sider: `/no/konserter` (filter bydel), `/no/utstillinger` (språkbytte, tomt filter), `/no/julemarked` (bydel Åsane gir 0, stemmer: Åsane har 8 arrangementer, ingen med jul), `/no/asane` (språkbytte, 8 kort begge språk), `/no/beyond-the-gates` (tom festival, ærlig tekst) | 86 (5 i Chrome) | 1: dagoverskrifter «1 arrangementer»/«1 events» (entall) | 1: filter uten treff viser tom flate uten melding | 1: filter ikke i adressen, tilbake-knappen forlater siden (strukturvalg, avklares) | ingen |

Positive tall for runde 3: `check-site` 317 adresser, 0 problemer; 170 hreflang-lenker (nb og en) på 86 samlingssider, alle 200 uten omdirigering. Min første sjekk testet bare `en`, fordi norsk er `hreflang="nb"` og ikke `no`; den ga «0 feil» på halve materialet. Rettet og kjørt på nytt.

Merknad til runden: kort per side teller bare det serveren sender første gang (ca. 24 per side), så antall kort er sammenlignet med ingressens tall bare der siden er under taket. Studentkveld er en poengregel (gratis + kveld gir poeng), så gratis leseklubb og debatt kommer med; det er regelen, ikke en feil. Antall «62» i konserter og julekonserter er tilfeldighet (34 mot 23 scener).

### Avgjort 2026-11-18 (runde 2), bygd samme dag (`dad9e9b`)

**Sesongåret:** filter og tittel velger år med samme funksjon, `seasonYearFor` i `collections.ts` (etter sluttmåneden gjelder neste år). Sluttmåneden står hardkodet i filtrene og som `seasonEndMonth` på samlingen; testen «sesongfiltre følger tittelåret» låser at de gir samme år i 10 samlinger på fire tidspunkt. Etter push: se at `/no/paske`, `/no/vinterferie` og `/no/hostferie` viser riktig (påminnelse 21. nov).

### Avgjort 2026-11-18, bygd samme dag (`2c9b718`, `e929381`, `a81afe8`)

1. **Hentingen:** én felles hentefunksjon for forsiden (`src/routes/[lang]/+page.server.ts`) og samlingssidene (`src/routes/[lang]/[collection]/+page.server.ts`). `is_canary=false` i alle omganger, sortering på `date_start` + `id`, test som låser at begge bruker den og at ingen lokkedue slipper gjennom etter rad 1 000. Etterpå: se at de tre lokkeduene er borte fra forsidens HTML (NO+EN).
2. **14-dagersgrensen:** står for klubber og serier, men pågående utstillinger slipper gjennom. Trenger en regel for hva en utstilling er (kategori og ord i tittelen; se hva `utstillinger`-samlingen allerede bruker). Kommentaren «60 days» rettes til 14. Tørrkjør: hvilke av de 47 kommer med, og tell utstillingssiden før og etter.
3. **`seedEvents`:** brukes bare lokalt (`dev`). I produksjon får besøkende en melding om at arrangementene ikke kan vises nå, og feilen logges. Gjelder forsiden, samlingssidene og arrangementssidene.
