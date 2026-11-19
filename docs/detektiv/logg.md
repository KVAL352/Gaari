# Detektivloggen

Skrives av skillen `detektiv` (`.claude/skills/detektiv/SKILL.md`). Én rad per
runde. Matrisen viser hva som er dekket; neste runde er første tomme celle,
lest rolle for rolle (kolonne for kolonne) ovenfra.

Tegn: `x` gjort, `d` delvis (før skillen, uten fast metode), tomt = ikke gjort.

## Matrisen

| Sidetype | 1 Data | 2 Innhold | 3 QA | 4 Frontend | 5 SEO | 6 Tilgj. | 7 Ytelse | 8 UX | 9 UI | 10 Personvern | 11 Analytiker |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Forside |  |  | d | d |  |  |  |  |  |  |  |
| Samlingssider |  | x | x |  | d |  |  |  |  |  |  |
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
| 2026-11-19 | Forside | 4 Frontend (delvis) | `/no` i Chrome desktop, to lastinger, datofilter «I morgen»; `svelte-check` over hele prosjektet | 1 | 0 | 1: ikke sjekket `/en`, mobil, andre filtre (påminnelse 23. nov) | 1: nyhetsbrevboksen dukker opp under filtrene ved første filter og flytter siden | ingen |

**Runde 4, del 2 (19. nov, samme økt, fullført etter hennes ønske):** `/en` (to lastinger) og `/no` med filtrene Student, Musikk & Konserter og I morgen. Nye positive tall: `/en` 0 konsollmeldinger, 33 kort, 29 bilder, 0 ødelagte, `lang="en"`; samme fire noder lastet som på `/no` (inkludert `nodes/1`, så det er ikke noe som bare skjer en gang). `?audience=student` gav 640 treff, `?audience=student&category=music` 212; begge filtrene gjenopprettes av adressen ved ny lasting (`pressed`: Student 640, Musikk & Konserter 303). «Vis flere arrangementer» gav 23, 37, 49 kort uten nettkall og uten dublettlenker, 0 konsollmeldinger. 0 funn, 0 rettinger.

**Ikke testet i runde 4 (hennes regel: alt som ikke er testet står her):**
- **Mobilbredde 390.** `resize_window` endret vinduet, men visningsflaten ble målt til 959, så 820 etter en stund; aldri 390. Alt jeg har sagt om mobil er altså ikke målt. Trenger Chrome med enhetsmodus, eller en annen metode.
- **Bydel («Hvor i Bergen?»), «Velg datoer», tid på dagen (Morgen/Dagtid/Kveld/Natt/Senkveld)** og «+7 til» kategorier: ikke klikket.
- **Filter på `/en`:** bare lastet, ingen filtre klikket.
- **Tilbake-knappen:** testet en gang, men historikken var forurenset av min egen direktenavigasjon til samme adresse, så svaret (ingen endring) viser ingenting. Må testes ren: forside, filter, filter, tilbake.
- **Tre filtre samtidig** og nullstill-knappen («Nullstill filtre»).
- **Tastaturbruk** (tab gjennom filtrene, Enter og mellomrom): hører til rolle 6, men dismiss-menyen i `EventCard` har et a11y-varsel fra `svelte-check` som ikke er prøvd.
- **Hva `nodes/1` er:** lastet i hver sidelasting, men ikke åpnet.
- **Umami-hendelser** (`filter-used` m.fl.): ikke sett i nettverk; Umami-skriptet lastet, men sending av hendelser ble ikke sjekket.
- **Nettverket per handling:** `read_network_requests` samler på tvers av navigasjoner, og `clear` slettet ikke det jeg trodde, så «ingen nettkall ved filtrering» er sett som fravær av nye rader, ikke som en ren måling. «Vis flere» ga tom liste etter `clear`, som også passer med null kall.
- Nyhetsbrevboksens hopp: sett én gang på `/no`, ikke målt som layoutforskyvning (CLS), ikke prøvd på `/en`.

**Runde 4, del 3 (19. nov, desktop 1400 bred, Chrome):** testet av listen over: bydel, «Velg datoer», tid på dagen, filter på `/en`, tre filtre samtidig, «Nullstill filtre», tilbake-knappen og Umami. 0 rene feil, tre ting å se på.
- **Virker:** Kveld gir 29 kort og `?time=evening`; Kveld + Student + I morgen gir 8 kort, alle tre merket, og «Nullstill filtre» gir 33 kort og `/no` uten filter. Bydelsmenyen viser ni bydeler med antall (Sentrum 1011 … Arna 2); Arna gir 2 kort og `?bydel=Arna`. `/en`: Kveld + I morgen gir 17 kort, `lang="en"`, knappen heter «Reset filters». Arna + én dato uten treff gir «0 arrangementer», «Ingen treff» og en tydelig merket reserve («Populært akkurat nå», tre kort fra i dag), så det er ikke en feil. Rundens åpne punkt fra runde 3 (tom flate uten melding) er dermed lukket for forsiden.
- **Tilbake-knappen:** `history.length` var 2 etter flere filterbytter. Filteret bruker altså `replaceState`, så tilbake forlater siden i stedet for å angre siste filter. Strukturvalg, ikke rettet; avklares med henne.
- **«Velg datoer»:** to klikk (20. og 22. nov) ga `?when=2026-11-20`, én dag, og kalenderen lukket seg etter første klikk. Jeg vet ikke om den er ment som enkeltdato eller intervall. Ikke testet med tastatur.
- **Umami:** `window.umami` finnes og `/u/script.js` lastet, men ingen `fetch`- eller `beacon`-kall mot `/u/` ble målt, heller ikke for sidevisning. Årsak ukjent (kan være blokkering i testbrowseren). Hendelsene `filter-used` er derfor ikke sett. Ikke prøvd å sende en testhendelse, fordi det ville havnet i de ekte tallene.
- **UI:** på «Ingen treff»-visningen går teksten «Meld meg på» på påmeldingsknappen utenfor knappen (sett på 1456 px bredde, «på» havner under knappen). Ikke undersøkt på andre bredder.
- **Fortsatt ikke testet:** mobilbredde 390, tastaturbruk, hva `nodes/1` er, nyhetsbrevboksens hopp som CLS, «+7 til» kategorier, kategorifilteret «Hva vil du oppleve?», `/en` bydel og «Velg datoer».

Positive tall for runde 4: `svelte-check` 4 520 filer, 0 feil, 8 varsler (kjent: `state_referenced_locally` ×4, ubrukt CSS `.filter-select`, a11y-varsel på dismiss-menyen i `EventCard` som `svelte-ignore` ikke fanger, én label uten kontroll i preferanser, `line-clamp`). Konsoll: 0 meldinger ved lasting og ved filtrering (sporingen var på: 58 nettkall ble fanget). Nett: 58 kall ved lasting, alle 200/304, ingen kall ved filtrering (filtreringen er lokal), 29 bilder, 0 ødelagte, 34 `article`, `lang="nb"`, én `h1`, HTML 1 180 KB. Filteret ligger nå i adressen (`?when=tomorrow`), så det åpne punktet fra runde 3 er bygd.

Positive tall for runde 3: `check-site` 317 adresser, 0 problemer; 170 hreflang-lenker (nb og en) på 86 samlingssider, alle 200 uten omdirigering. Min første sjekk testet bare `en`, fordi norsk er `hreflang="nb"` og ikke `no`; den ga «0 feil» på halve materialet. Rettet og kjørt på nytt.

Merknad til runden: kort per side teller bare det serveren sender første gang (ca. 24 per side), så antall kort er sammenlignet med ingressens tall bare der siden er under taket. Studentkveld er en poengregel (gratis + kveld gir poeng), så gratis leseklubb og debatt kommer med; det er regelen, ikke en feil. Antall «62» i konserter og julekonserter er tilfeldighet (34 mot 23 scener).

### Avgjort 2026-11-18 (runde 2), bygd samme dag (`dad9e9b`)

**Sesongåret:** filter og tittel velger år med samme funksjon, `seasonYearFor` i `collections.ts` (etter sluttmåneden gjelder neste år). Sluttmåneden står hardkodet i filtrene og som `seasonEndMonth` på samlingen; testen «sesongfiltre følger tittelåret» låser at de gir samme år i 10 samlinger på fire tidspunkt. Etter push: se at `/no/paske`, `/no/vinterferie` og `/no/hostferie` viser riktig (påminnelse 21. nov).

### Avgjort 2026-11-18, bygd samme dag (`2c9b718`, `e929381`, `a81afe8`)

1. **Hentingen:** én felles hentefunksjon for forsiden (`src/routes/[lang]/+page.server.ts`) og samlingssidene (`src/routes/[lang]/[collection]/+page.server.ts`). `is_canary=false` i alle omganger, sortering på `date_start` + `id`, test som låser at begge bruker den og at ingen lokkedue slipper gjennom etter rad 1 000. Etterpå: se at de tre lokkeduene er borte fra forsidens HTML (NO+EN).
2. **14-dagersgrensen:** står for klubber og serier, men pågående utstillinger slipper gjennom. Trenger en regel for hva en utstilling er (kategori og ord i tittelen; se hva `utstillinger`-samlingen allerede bruker). Kommentaren «60 days» rettes til 14. Tørrkjør: hvilke av de 47 kommer med, og tell utstillingssiden før og etter.
3. **`seedEvents`:** brukes bare lokalt (`dev`). I produksjon får besøkende en melding om at arrangementene ikke kan vises nå, og feilen logges. Gjelder forsiden, samlingssidene og arrangementssidene.
