# Søkeordsoversikt og gapsanalyse, 12. november 2026

**Data:** Search Console 13. aug til 10. nov 2026 (90 d): 5 000 søk, 10 000 søk×side, 1 000 sider, 100 land, 9 928 søk×land. Googles autoforslag 12. nov på 11 språk (`autocomplete.json` i økta, ikke lagret). AI-tallene er fra `docs/ai-synlighet-matrise.md` (ChatGPT, én kjøring, 12. nov).

**Forbehold:** Søkeradene summerer 3 671 av 9 218 klikk. Resten er søk Google anonymiserer eller som faller under de 5 000 største. Long-tail er derfor *underrepresentert* her, ikke fraværende. Search Console viser bare søk der vi alt vises, så etterspørsel vi ikke har sider for er usynlig. Den måles med autoforslag, som gir ord, ikke volum.

## Nøkkeltall mot september

| Mål | Sept.-analysen | Nå | Merknad |
|---|---:|---:|---|
| Google-klikk per dag | 80,7 (august) | ca. 102 (90 d snitt) | ulike vinduer, ikke direkte sammenlignbart |
| Andel klikk fra Norge | ikke målt | 92 % av klikk, 89 % av visninger | |
| Merkesøk (gåri/gaari) av søkeklikk | 3,7 % | ca. 4 % | merkenavnet er fortsatt svakt, som i AI-matrisen #27 |

## Long-tail: lange søk konverterer best

| Ord i søket | Søk | Klikk | Visninger | CTR |
|---|---:|---:|---:|---:|
| 1 | 648 | 57 | 10 269 | 0,6 % |
| 2 | 1 735 | 462 | 40 378 | 1,1 % |
| 3 | 1 423 | 546 | 43 973 | 1,2 % |
| 4 | 757 | 718 | 29 246 | 2,5 % |
| 5 | 240 | 267 | 6 487 | 4,1 % |
| 6+ | 195 | 1 477 | 19 574 | 7,5 % |

Seks ords søk som «hva skjer i bergen i helgen» er der Gåri vinner. Korte navnesøk («grieghallen», «events») gir visninger og nesten ingen klikk, fordi arrangørens egen side står over oss.

## Temaer (ikke-merke)

| Tema | Klikk | Visninger | CTR | Snittpos | Vurdering |
|---|---:|---:|---:|---:|---|
| i dag / i kveld | 1 023 | 15 270 | 6,7 % | 5,3 | sterkest |
| helg | 668 | 10 191 | 6,6 % | 4,4 | sterk |
| konsert | 317 | 12 594 | 2,5 % | 8,6 | **størst gap** |
| jul (utenom julemarked) | 46 | 9 120 | 0,5 % | 8,7 | **haster** |
| julemarked | 39 | 8 537 | 0,5 % | 9,2 | **haster** |
| festival | 42 | 6 518 | 0,6 % | 9,3 | gap |
| engelske søk | 184 | 6 739 | 2,7 % | 5,4 | middels |
| bydel | 73 | 3 587 | 2,0 % | 9,6 | gap |
| quiz | 82 | 3 488 | 2,4 % | 7,6 | middels |
| uteliv / nightlife | 0 | 652 | 0,0 % | 12,1 | gap, også utenlandsk |
| student | 0 | 1 022 | 0,0 % | 9,8 | gap (ChatGPT siterer oss likevel, #11) |
| barn | 16 | 889 | 1,8 % | 13,4 | svak plassering |

Tallene for jul og julemarked er fra før julesidene (`86d76c7`) ble pushet 12. nov. Effekten kan tidligst ses i slutten av november.

## Gapsanalyse: Google

1. **Konserter.** 12 594 visninger, plass 8,6. «konsert bergen i dag» (2 051 visn, p6,4) lander på forsiden, ikke `/no/konserter` (35 visn). Samlesiden konkurrerer ikke på søkene den er laget for.
2. **Jul og julemarked.** 17 600 visninger, CTR 0,5 %, plass ca. 9. Topp nå, nedover etter 24. des.
3. **Enkeltarrangementer med stort søk.** Lysfesten (ca. 6 000 visn over tre varianter, p9, 14. nov), Julegøy (4 760, p8–9), Hallaien, Rosa sløyfe, Bergen Ølfestival, Studentlekene. Vi står på side 1, under arrangøren. Lite å vinne på plass, mer på tittel og utdrag («når er lysfesten i bergen 2026», 300 visn, 0 klikk, er et spørsmål vi kan svare på i utdraget).
4. **Scenesider.** «grieghallen program» (3 639 visn, p9,5, 9 klikk), Ole Bull Scene, Forum Scene, Åsane kulturhus (1 131, p11). Arrangøren eier navnet; vi kan vinne «program» og «i dag»-varianten.
5. **Engelske generiske søk.** «events» (3 619 visn, 0 klikk), «local weekend events» (487), «local events this weekend» (354): trolig søk fra Bergen-folk med engelsk Google, plass 4. Null klikk tyder på at tittelen ikke sier Bergen og helg tydelig nok. Ikke undersøkt.
6. **Forsiden tar alt.** De tre største søkene lander på `/no`, og samlesidene (`/no/denne-helgen`, `/no/i-dag`) får nesten ingenting. Det virker i dag, men gjør oss sårbare: alle egg i én kurv, og AI-motorene ser en forside, ikke svar på spørsmål.

## Gapsanalyse: AI-søk

Fra matrisen: sitert på 5 av 28. Mønsteret er det motsatte av Google: der vi er sterkest i Google (i kveld #2, i dag), er vi fraværende i ChatGPT, mens bydel (#23) og student (#11) gir treff. Konklusjonen i matrisen står: **vi har sidene, vi mangler tilliten** (lenker og omtale fra andre). Gap:

1. **Merkenavnet.** ChatGPT kjenner ikke «Gåri» (#27). Bare andres omtale hjelper.
2. **Engelsk.** 0 av 6 engelske spørsmål ga sitat. visitbergen.com tar dem.
3. **Kategori.** 1 av 9 (bare student). Konserter, gratis, teater, quiz, jazz: fraværende.
4. **Arrangørspørsmål.** 0 av 3. Tiltak 1 er pushet 12. nov, ikke målt.

## Google mot chatboter: hvordan folk søker

Verifisert (åpnet 12. nov):
- **Semrush, 7. april 2026** (https://www.semrush.com/blog/chatgpt-search-insights/), amerikansk klikkstrømpanel: ChatGPT-spørsmål som utløser søk var i snitt 4,7 ord i jan–feb 2025 og 8,7 ord i jan–feb 2026. Spørsmål uten søk falt fra 24,9 til 13,5 ord.
- **Google Search Central** (https://developers.google.com/search/docs/appearance/ai-features): «There are no additional requirements to appear in AI Overviews or AI Mode, nor other special optimizations necessary», og ingen egen strukturert data. Googles AI-svar bygger altså på vanlig SEO.

Ikke verifisert (bare fra annenhånds kilder): at ChatGPT-søk bygger på Bing, og at omtale av merkenavnet henger tettere sammen med AI-synlighet enn lenker gjør (Ahrefs, korrelasjon, ikke årsak). Ingen kilde funnet på hvordan folk spør AI om lokale arrangementer.

Våre egne tall peker samme vei: i Google vinner vi på 6-ords søk (7,5 % CTR), altså på søk som allerede ligner et spørsmål. Chatbot-spørsmålene er lengre og har situasjon i seg («med barn», «når det regner», «på torsdag»). Det er de samme long-tail-formene som autoforslagene viser.

## Lavthengende frukter (billigst først)

1. **Titler og utdrag på jul- og julemarkedssidene, nå.** 17 600 visninger med 0,5 % CTR. Julesidene er nettopp omskrevet; sjekk 26. nov om CTR har steget før noe mer endres.
2. **`/no/konserter` må ta «konsert bergen i dag/i kveld/denne helgen».** Tittel og H1 med «i dag» og «denne helgen», og lenke fra forsiden med den teksten. 12 594 visninger på temaet.
3. **Engelsk forside-tittel for «events this weekend».** 4 400+ visninger, 0 klikk, plass 4. Bare én tittel å endre. Sjekk først hva Google faktisk viser.
4. **Svar på «når er …»-spørsmål i utdraget på store arrangementssider** (dato og sted i meta-beskrivelsen). Lysfesten, Julegøy, Rosa sløyfe.
5. **Uteliv/nightlife.** 652 visninger, 0 klikk, og det største søket fra Storbritannia, USA, Nederland og Tyskland. `/no/uteliv` finnes; engelsk motpart finnes ikke i slug-lista.

## Språknisjer

**Målt:** søk på andre språk enn norsk og engelsk er nesten fraværende: tysk 25 søk / 263 visn (mest «bergen veranstaltungen heute»), fransk 1 generisk søk, kinesisk og japansk null. Utenlandske besøkende søker på engelsk eller på festivalnavn («beyond the gates 2027», «bergenfest 2027», «uitgaan bergen», «midsommar 2027 norwegen»). Det er forventet, siden Gåri bare finnes på norsk og engelsk.

**Autoforslag viser etterspørselen vi ikke ser:**
- **Tysk:** «bergen veranstaltungen heute/morgen/2026», «bergen weihnachtsmarkt 2026», «bergen heute abend». Ekte arrangementsetterspørsel. Ulempe: forveksles med Bergen auf Rügen og Bergen im Chiemgau.
- **Nederlandsk:** «bergen kerstmarkt 2026», «bergen noorwegen wat te doen». Forveksles med Bergen (NH) og Bergen op Zoom.
- **Fransk, spansk, polsk, ukrainsk, japansk, kinesisk:** bare turistsøk (vær, kart, severdigheter, fjord, fiskemarkedet). Ingen arrangementssøk i forslagene.
- **Polsk** dukker opp på en uventet måte: «stand up bergen polski». Polakker er en stor gruppe i Bergen, men arrangementssøkene deres går på norsk eller engelsk.

**Vurdering:** tysk er den eneste språknisjen der det finnes både målte søk og arrangementsforslag. Det er turister, ikke fastboende, og de kommer sommer og jul. En tysk versjon av noen få sesongsider (Weihnachtsmarkt, Mittsommer) er det minste forsøket som gir et svar. Hele nettstedet på tysk er ikke forsvarlig ut fra disse tallene. Kinesisk og japansk har ingen arrangementsetterspørsel i dataene. Spørsmålet om hvilke grupper som bor i Bergen (polsk, ukrainsk, internasjonale studenter, utenlandske ansatte) hører til demografikartet, ikke til søkeanalysen.

## Testspørsmål til AI-runden i desember

I tillegg til de 28 (dropp #19–#21), hentet fra søkene der vi taper i Google eller mangler i AI:

| # | Gruppe | Spørsmål | Hvorfor |
|---|---|---|---|
| 29 | Kategori | Konsert i Bergen i kveld | største Google-gap |
| 30 | Kategori | Uteliv i Bergen på torsdag | autoforslag, ukedag |
| 31 | Kategori | Quiz i Bergen på onsdag | autoforslag, ukedag |
| 32 | Kategori | Ting å gjøre i Bergen når det regner | autoforslag, regndagsguide finnes |
| 33 | Kategori | Ting å gjøre i Bergen med barn i helgen | barn: p13 i Google |
| 34 | Kategori | Stand-up i Bergen i desember | stand-up: p12,8 |
| 35 | Sesong | Når er Lysfesten i Bergen? | spørsmålsform, 0 klikk i Google |
| 36 | Sesong | Julekonserter i Bergen 2026 | ny side `86d76c7` |
| 37 | Engelsk | Bergen nightlife | største søk fra utlandet |
| 38 | Engelsk | What's on in Bergen tonight? | engelsk «i kveld» |
| 39 | Engelsk | Bergen in December what to do | autoforslag |
| 40 | Tysk | Bergen Norwegen Veranstaltungen heute | eneste språknisje med målte søk |
| 41 | Tysk | Weihnachtsmarkt Bergen Norwegen 2026 | sesong, tysk |
| 42 | Gruppe | Hva skjer i Bergen for studenter? | student: 0 klikk i Google, S i ChatGPT |
| 43 | Gruppe | Things to do in Bergen for international students | demografi, engelsk |

## Ikke gjort

- SERP-analyse (hvem står over oss på de 10 viktigste søkene). Krever websøk.
- Bing-søk per søkeord. Bare dekningen er hentet (2 267 i indeksen, null klikk).
- Demografikartet. Egen oppgave.
