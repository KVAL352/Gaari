# Billettsalg via tredjepart: kartlegging og anbefaling

Skrevet 2026-10-07. Research, ingen kode. Alt som ikke er lest direkte fra en kilde i kapittel 11 er merket **ikke verifisert**.

## 1. Hva vi vil ha

- Det er alltid gratis å være med i Gåri. Billettsalg er et tilbud oppå, ikke et vilkår.
- Arrangøren skal slippe å gjøre noe. Arrangementet ligger alt i Gåris base, så det eneste de sier er «jeg vil selge billettene mine hos dere». Resten skjer av seg selv.
- Gåri skal ta en andel per solgt billett, og andelen skal være tydelig lavere enn det arrangøren betaler i dag. Det arrangøren får for pengene skal være mer: synlighet på gaari.no, i nyhetsbrevet og i betalt markedsføring finansiert av salget.
- Gåri bygger ikke billettsystem selv. Betaling, billetter, refusjon og regnskap skal ligge hos en etablert leverandør med tillit i Norge og i EU/EØS.
- Gåri skal aldri selv ta imot billettpengene. Det er det som holder oss unna konsesjonsplikt (kapittel 8).

Det er et spenn mellom denne oppgaven og «Retning» i `OVERLEVERING.md`, der det står at løsningen skal bygges selv, ikke gjennom mellomledd. Dette dokumentet legger til grunn at leverandøren er motoren og Gåri er salgskanalen. Det er den eneste veien som ikke krever egen betalingsløsning.

## 2. Det vi visste fra før

- `docs/bergen-plattformer-research-2026-02.md` kartla plattformlandskapet i Bergen: Ticketmaster, TicketCo, Eventim, Billetto og kommunens kalender.
- Bookibud er konkurrent, ikke partner. Et midlertidig samarbeid ble avslått 2026-09-24, og Gåri skal ikke nevne egen billettløsning for dem. Se minnet `project_bookibud_api.md`.
- Beslutning 2026-09-24 (beslutningsloggen i minnet): betaling per solgt billett, ikke på forhånd. Gratis til det fører til et salg.
- `docs/legal-research-norway.md` § 2.4: Gåris forsvar under markedsføringsloven § 25 hviler på at Gåri sender trafikk til arrangøren, ikke erstatter dem. En billettkanal på gaari.no endrer ikke det så lenge arrangøren selv har sagt ja og er selger.
- Utklikk til arrangør måles alt: `utm_source=gaari` settes i `buildOutboundUrl()` i `src/lib/utils.ts`, og tabellen `venue_clicks` fylles av `/api/track-click`.

## 3. Hvor arrangementene selger billetter i dag

Telling 2026-10-07 av kommende, godkjente arrangementer i basen (plattform lest fra vertsnavnet i `ticket_url`).

| | Antall |
|---|---|
| Kommende godkjente arrangementer | 2 005 |
| Med billettlenke | 1 729 |
| TicketCo | minst 164 |
| Ticketmaster | 152 |
| Bookibud | 99 |
| Tix | 53 |
| Bergen kommune (billett.bergen.kommune.no) | 46 |
| EasyTicket | 18 |
| Billetto | 15 |
| Hoopla | 11 |
| Eventim | 11 |
| Egen nettside (ingen kjent plattform) | resten |

Prisfeltet er stort sett tomt, så plattformkolonnen er det pålitelige signalet på hvem som selger billetter. Tre ting følger av tabellen:

- De store husene er låst til store plattformer (Ticketmaster, Tix, TicketCo). Der er Gåri i beste fall en henvisningskanal.
- Et langt lavere antall ligger på selvbetjente plattformer med høy prosent (Hoopla, Billetto, Checkin). Der er bytte realistisk.
- Mange steder lenker til egen side eller har ingen billettlenke i det hele tatt. Der er det ingen plattform å konkurrere mot.

## 4. Tre modeller

**A. Affiliate på kjøp.** Gåri lenker til leverandørens kjøpsside med sporing og får provisjon av kjøp som kom fra oss. Arrangøren gjør ingenting og merker ingenting. Provisjonen er lav, og den kommer fra leverandørens marginer, ikke fra en avtale med arrangøren.

**B. Henvisning av arrangører.** Gåri rekrutterer arrangører til en plattform og får en andel av deres salg i en periode. Arrangøren må opprette konto og legge inn arrangementene selv. Det bryter «de skal ikke gjøre noe».

**C. Gåri som salgskanal oppå en leverandør.** Arrangøren sier ja én gang. Gåri oppretter arrangementet og billettypene hos leverandøren gjennom leverandørens skrive-API, med data vi alt har, og viser kjøpsknappen på gaari.no. Leverandøren tar betalingen, utsteder billetten, håndterer refusjon og betaler arrangøren. Gåris andel trekkes i oppgjøret. Dette er modellen Kjersti beskriver.

Krav som modell C stiller til leverandøren:

1. Et API som kan opprette og endre arrangementer og billettyper på vegne av en arrangør.
2. En måte å knytte arrangørens konto, utbetaling og kundeforhold (KYC) til leverandøren uten at arrangøren må gjøre mer enn å godta vilkår og oppgi konto.
3. En avtalt pris for Gåri som er lavere enn listeprisen, slik at det blir rom for Gåris andel uten at arrangøren betaler mer enn i dag.
4. Avklart juridisk rolle: arrangøren er selger, leverandøren er formidler, Gåri er markedsplass og henviser.

Punkt 2 er det ærlige forbeholdet. «Null arbeid» betyr i praksis «si ja og oppgi et kontonummer». Ingen leverandør kan betale ut til noen de ikke har identifisert, og ingen kan ta betalt på vegne av en arrangør uten at arrangøren har godtatt leverandørens vilkår. Dette er min vurdering ut fra PSD2-reglene, ikke lest fra en bestemt leverandør.

## 5. Kandidater

Priser er fra leverandørenes egne prissider 2026-10-07, hvis ikke annet er sagt. «Delt inntekt» betyr at leverandøren har en publisert partner-, affiliate- eller forhandlermodell.

| Leverandør | Land | Pris for arrangør (lest) | Delt inntekt | Skrive-API | Juridisk rolle (lest fra vilkår) | Passer modell |
|---|---|---|---|---|---|---|
| Billetto AS | Oslo | 3,99 % + 7,99 kr per billett. Lavere ved over 1 000 billetter i året, etter avtale. Vipps | Ikke publisert. Må spørres om | Offentlig API finnes. Om det kan **opprette** arrangementer er **ikke verifisert** | Ikke lest i detalj | C, må forhandles |
| Tikkio AS | Giske | Ca. 4 % provisjon ifølge tredjepart, **ikke verifisert**. Arrangøren kan legge et servicegebyr på kjøper. Klarna | Ikke publisert | Ikke funnet | Arrangøren er selger, Tikkio er agent (hjelpesenteret) | C, må forhandles |
| pretix (rami.io GmbH) | Tyskland | 2,5 % av omsetning, maks 15 euro per billett, hostet. Egen betalingsleverandør kommer i tillegg | Nei, men prisen er så lav at Gåri kan legge sin andel oppå | Fullt API: opprette, endre, slette og klone arrangementer, team-tokens per arrangør | Arrangøren er selger og avtalepart med betalingsleverandøren. pretix er programvare | C, uten forhandling |
| Fienta | Estland | 3,5 % inkludert betaling, minst 0,40 euro per ordre | Affiliate: 1 % av henviste arrangørers salg første år | Dokumentasjonsside svarte 404 | Selger i arrangørens navn og for arrangørens regning (vilkårene) | B nå, C må spørres om |
| Checkin AS | Norge | 10 kr + 2 % + 2,5 %, minst 18 kr per billett | Ikke funnet | Ikke undersøkt | Ikke lest | Bytte-kandidat for kunder, ikke motor |
| LetsReg | Norge | 10 kr + 3,9 % | Ikke funnet | Ikke undersøkt | Ikke lest | Som Checkin |
| Hoopla | Norge | Kjøper betaler trinnvis: 5 kr til 100 kr, 15 til 149, 20 til 249, 25 til 349, 30 til 449, 35 til 699, 40 til 949, 45 til 1 099, 5 % over 1 100. Eks. mva | Ikke funnet. Arrangørsiden svarte 403 | Ikke funnet | Ikke lest | Bytte-kandidat for kunder |
| TicketCo | Bergen | Ikke publisert | Sier de er åpne for samarbeid, uten vilkår | Connect-API er for CRM og adgang, ikke tredjeparts salg | Ikke lest | Henvisning. Kan spørres, fordi de er i Bergen |
| Tix | Norden | Ikke publisert, enterprise | Nei | Ikke funnet åpent | Ikke lest | Ingen |
| Ticketmaster | Global | Ikke relevant | Affiliate via Impact, provisjon per marked. Det norske programmet er meldt inaktivt siden august 2026 av en tredjepartsliste, **ikke verifisert** | Nei | Ticketmaster er selger | A, hvis programmet finnes |
| Eventbrite | USA | Ikke relevant | Betaling per nye arrangør som verves, ikke per salg | Ja, men få Bergen-arrangører bruker dem | Ikke lest | Ingen |
| Weezevent | Frankrike | Prissidene svarte 404 | Ukjent | Ukjent | Ukjent | Ikke undersøkt videre |

Bookibud er med vilje utelatt. Se kapittel 2.

## 6. Hva er normalt å ta, og hva «tydelig billigere» betyr

Samme billett til 250 kr, regnet ut fra listeprisene i kapittel 5. Betalingsgebyr er inkludert der leverandøren sier det, og markert der det kommer i tillegg.

| Leverandør | Kostnad på 250 kr | Andel | Hvem betaler som regel |
|---|---|---|---|
| Hoopla | 25 kr pluss mva, altså 31,25 kr | 10 % (12,5 % med mva) | Kjøper |
| Checkin | 21,25 kr | 8,5 % | Arrangør eller kjøper |
| LetsReg | 19,75 kr | 7,9 % | Arrangør eller kjøper |
| Billetto | 17,97 kr | 7,2 % | Arrangør, kan legges på kjøper |
| Tikkio | ca. 10 kr, **ikke verifisert** | ca. 4 % | Arrangør, servicegebyr kan legges på kjøper |
| Fienta | 8,75 kr | 3,5 % | Arrangør |
| pretix | 6,25 kr pluss betaling | 2,5 % pluss anslagsvis 1,5 til 3 % for kort eller Vipps | Arrangør |

Det norske normalnivået for små og mellomstore arrangører ligger altså rundt 7 til 10 % av billettprisen, ofte lagt på kjøperen som «billettavgift». Europeiske selvbetjente plattformer ligger på 2,5 til 4 %. Prosenten for Ticketmaster og Tix er ikke offentlig, og storhusene har egne avtaler.

Det følger to ting av dette som Kjersti bør ta stilling til:

1. **Gåri kan ikke bli billigere enn motoren den bruker, pluss sin egen andel, uten en forhandlet pris.** Bygger vi på Billetto til listepris (7,2 %) og tar 3 % selv, er arrangøren på 10 %, altså dyrere enn i dag. Bygger vi på pretix (2,5 % pluss betaling, rundt 4,5 til 5,5 %) og tar 2 %, er arrangøren på 6,5 til 7,5 %: litt billigere enn Billetto, klart billigere enn Hoopla og Checkin. Skal vi være *tydelig* billigere enn det norske normalnivået og samtidig tjene noe, må motoren koste under 4 % alt inkludert. Det peker mot pretix eller en volumavtale med Billetto eller Tikkio.
2. **«Mer for pengene» må komme fra synlighet, ikke fra pris alene.** Plassering på gaari.no, i nyhetsbrevet og i betalt annonsering er det Gåri har som ingen plattform har. Det er dette som gjør 6 % fra Gåri til noe annet enn 6 % fra pretix.

Jeg anbefaler ikke å love en prosent utad før en leverandør har gitt pris skriftlig.

## 7. Hvem bør kontaktes først

Salgstall er ikke offentlige, og ingen leverandør deler dem. Det vi kan måle er to ting: hvor mange kommende arrangementer stedet har med billettlenke, og hvor mange som klikker seg ut fra gaari.no til stedet. Det siste er det nærmeste vi kommer «hvor mye Gåri alt bidrar». Klikk er fra `venue_clicks`, 2026-07-09 til 2026-10-07.

| Totalt | Siste 90 dager | Siste 30 dager |
|---|---|---|
| Utklikk | 8 285 | 4 205 |
| Steder med klikk | 339 | |

### 7.1 Best egnet for modell C: billetter uten plattform, eller uten billettlenke i det hele tatt

Her finnes det ingen leverandør å bytte fra. Arrangøren selger i døra, på egen side, eller ikke i det hele tatt. Gåri tilfører noe de ikke har.

| Sted | Kommende arrangementer | Billettlenke i dag | Utklikk 90 d | Utklikk 30 d |
|---|---|---|---|---|
| Bodega | 52 | Ingen | 314 | 120 |
| Litteraturhuset i Bergen | 62 | 35 egen side, 25 TicketCo | 318 | 248 |
| O'Connor's Irish Pub | 12 | Egen side | 193 | 66 |
| Bergen Fellesverksted | 50 | Egen side, 12 med pris | | |
| Bergen Næringsråd | 13 | Egen side | 66 | 25 |
| Studio Vertikal | 14 | Egen side | | |
| Råbrent | 11 | Egen side | | |
| Det Akademiske Kvarter (Teglverket) | 20 | Ingen | 53 | 13 |

Bodega og Litteraturhuset er de åpenbare første. Bodega har over hundre utklikk i måneden fra Gåri og ingen billettlenke. Litteraturhuset har halvparten av arrangementene på egen side og er alt delvis på TicketCo, så de vet hva en plattform koster. Tomme klikkfelt betyr at stedet ikke er blant de 45 med flest klikk, ikke null.

### 7.2 Byttekandidater: på dyre selvbetjente plattformer

Disse betaler 7 til 12 % i dag, se kapittel 6. Et tilbud på under det med synlighet oppå er lett å forklare.

| Plattform | Kommende arrangementer | Eksempler på steder |
|---|---|---|
| Billetto | 15 | Bergen Camping, Valsemøllen, Korskirken og flere små |
| Hoopla | 11 | |
| EasyTicket | 18 | |
| Checkin og LetsReg | få | |

Volumet er lavt, men hvert sted er lett å flytte fordi de alt er selvbetjente. Korskirken hadde 42 utklikk på 90 dager.

### 7.3 Låst til store plattformer: bare henvisning

Ticketmaster (Grieghallen, Ole Bull Scene), Tix (Oseana, alle 52), TicketCo (Madam Felle, 68) og Bookibud (Bergen Street Food: 13 av 99 på Bookibud, 80 merket gratis). Disse flytter ikke salget sitt for Gåris skyld. Men det er her klikkene er: Grieghallen 436, Madam Felle 375, Ole Bull Scene 295, Bergen Street Food 439 på 90 dager. Verdien for Gåri er en affiliate-avtale (modell A) eller å bruke klikktallene som argument overfor leverandøren i forhandling.

### 7.4 Rekkefølge for kontakt, når teksten er godkjent

1. Bodega og Litteraturhuset: spørre om de vil være pilot, uten å nevne pris før leverandøren er valgt.
2. O'Connor's, Bergen Fellesverksted, Bergen Næringsråd, Studio Vertikal, Råbrent: samme spørsmål, etter at piloten har kjørt én gang.
3. Stedene på Billetto, Hoopla og EasyTicket: når vi kan vise et tall som er lavere enn deres.
4. De store husene: aldri om bytte, bare om henvisning.

Ingen av disse skal kontaktes før Kjersti har sett teksten, og ikke før en leverandør er valgt. Et ja uten noe å koble det til er verre enn ingen spørring.

## 8. Juridisk ramme

Dette er lest fra lovtekst, men er ikke juridisk rådgivning. Bør bekreftes med regnskapsfører eller advokat før avtale signeres.

- **Angrerett.** Angrerettloven § 22 bokstav m unntar fritidsaktiviteter som leveres på en bestemt dato. Kjøper har altså ikke angrerett på en konsertbillett. Refusjon er dermed arrangørens vilkår, ikke lovens krav, og leverandøren håndterer den. Gåri skal ikke love refusjon.
- **Merverdiavgift.** Merverdiavgiftsloven § 3-7 unntar billetter til konserter, teater, opera og lignende fra mva. § 5-11 gir redusert sats for idrettsarrangementer. Mva-behandlingen følger arrangementet, ikke kanalen, og er arrangørens ansvar som selger. Gåris egen andel er derimot en tjeneste til arrangøren og er mva-pliktig på vanlig måte. Dette siste er min lesing, **ikke verifisert** mot en kilde.
- **Betalingstjenester (PSD2).** Finansforetaksforskriften § 1-7 bokstav b unntar handelsagenter som handler på vegne av bare én part i en betaling. Så lenge Gåri aldri mottar billettpengene og leverandøren er den som tar betalt og betaler ut, ligger Gåri utenfor konsesjonsplikt. Mottar Gåri pengene selv, gjelder meldeplikt til Finanstilsynet over 1 million euro i gjennomsnitt over tolv måneder (§ 1-8), og over det igjen konsesjon. Det er dette som gjør «aldri ta imot pengene» til et absolutt krav, ikke en preferanse.
- **Forbrukerkjøp og selger.** Leverandørens vilkår avgjør hvem kjøperen har avtale med. Hos Tikkio og Fienta er det arrangøren. Hos Ticketmaster er det Ticketmaster. Gåri må i egne vilkår si tydelig at Gåri formidler og ikke selger.
- **Personvern.** Kjøperdata ligger hos leverandøren. Gåri trenger bare aggregerte tall (antall solgt, omsetning per arrangement), samme linje som overfor Bookibud. Krever en leverandør at Gåri får persondata for å kunne regne ut andelen, er det et minus.
- **Tilgjengelighet.** Ikke undersøkt per leverandør. Kjøpsflyten vil ligge hos leverandøren, så det er deres WCAG-nivå som gjelder for kjøperen. Bør spørres om.

## 9. Anbefaling og rekkefølge

1. **Spør Billetto først.** Norsk selskap, Vipps, publisert API, priser som allerede sier «lavere ved volum, etter avtale». Spørsmålet er om API-et kan opprette arrangementer på vegne av en arrangør, og hva prisen blir for en kanal som bringer arrangører og kjøpere. Teksten til dem skrives etter at Kjersti har godkjent dette dokumentet.
2. **Spør Tikkio parallelt.** Også norsk, arrangøren er selger, provisjon oppgitt til rundt 4 %. Samme to spørsmål.
3. **Ha pretix som plan B.** Billigst, fullt API, ingen forhandling nødvendig. Ulempen er at hver arrangør må ha egen avtale med en betalingsleverandør (Stripe, Vipps via tredjepart, eller lignende), og det bryter med «null arbeid». Det kan løses ved at Gåri eier en pretix-organisator og betalingsavtalen, men da mottar Gåri pengene, og kapittel 8 slår inn. Pretix passer derfor bare om Billetto og Tikkio sier nei.
4. **Spør TicketCo om henvisning, ikke salg.** De er i Bergen og sier de vil samarbeide. Med 164 arrangementer i basen er en henvisningsavtale verdt å ha selv om modell C ikke er mulig hos dem.
5. **Søk Ticketmasters affiliate-program og Fientas affiliate-program nå.** Lavthengende: ingen avtale med arrangører, ingen kode utover sporingslenker. Ticketmaster gir provisjon på de mest klikkede stedene i basen. Verdien er usikker til det norske programmet er bekreftet aktivt.
6. **Ikke lov prosent utad** før minst én leverandør har gitt pris skriftlig.
7. **Pilot med Bodega og Litteraturhuset** når leverandør er valgt. Mål: ett arrangement hver, hele kjeden fra ja til utbetaling, før noen andre spørres.

Beslutningen Kjersti må ta først: om «bygge selv» i «Retning» kan leses som «eie kundeforholdet og kanalen», slik at motoren kan være en leverandør. Sier hun nei, finnes det ikke en vei uten egen betalingsløsning, og da er dette dokumentet et argument for å vente.

## 10. Ikke verifisert

- Om Billettos API kan opprette arrangementer på vegne av en arrangør (utviklersiden beskriver API-et, ikke rettighetene).
- Tikkios provisjonsnivå. Tallet 4 % er fra en tredjepart, ikke fra Tikkio.
- Om Ticketmasters norske affiliate-program er aktivt. En tredjepartsliste sier inaktivt siden august 2026.
- Fientas API, Weezevents priser og Hooplas arrangørvilkår: sidene svarte 404 eller 403.
- Betalingsgebyr oppå pretix (1,5 til 3 % er et anslag).
- Mva på Gåris egen andel.
- Tilgjengelighetsnivå hos alle leverandørene.
- Om noen av leverandørene krever persondata delt med Gåri for oppgjør.
- Klikktall for steder utenfor topp 45 er ikke hentet ut.

## 11. Kilder

Alle åpnet 2026-10-07. Sider som ikke svarte er listet i kapittel 10.

- Billetto: billetto.com/pricing, billetto.no/l/pricing, go.billetto.com/no-no/pricing, go.billetto.com/no-no/resources/developers
- Tikkio: tikkio.com, help.tikkio.com/nb/, help.tikkio.com/nb/articles/5945820
- pretix: pretix.eu/about/en/pricing, pretix.cloud/about/en/pricing, docs.pretix.eu/en/latest/api/index.html, docs.pretix.eu/en/latest/api/resources/events.html
- Fienta: fienta.com/pricing, fienta.com/terms, fienta.com/p/partners
- Checkin: checkin.no/priser, checkinevent.com/no/priser
- LetsReg: letsreg.com/no/priser
- Hoopla: hoopla.no, hoopla.no/priser
- TicketCo: ticketco.io/no, ticketco.io/no/product-ticketco-connect, ticketco.io/no/what-can-you-expect-as-a-partner-of-ticketco, ticketco.io/sv/stronger-together-trough-partnerships
- Tix: tix.no/en/lightbox/aboutus
- Ticketmaster: developer.ticketmaster.com/partners/distribution-partners/affiliate-sign-up, og tredjepartslisten affilitizer.com/programs/ticketmaster.no
- Eventbrite: tredjepartsbloggen affililist.com/blog/eventbrite-affiliate-program (Eventbrites egen hjelpeside svarte 404)
- Lovdata: angrerettloven § 22, merverdiavgiftsloven § 3-7, finansforetaksforskriften § 1-7
- Finanstilsynet: temasiden om meldeplikt for betalingstjenester unntatt konsesjonsplikt (PSD2)
- Egne data: tabellen `events` (kommende, godkjente) og `venue_clicks`, begge lest 2026-10-07
