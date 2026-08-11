<!-- GENERERT FIL. Ikke rediger her.
     Kilden er scripts/lib/consent.json.
     Regenerer med: npx tsx scripts/consent.ts sync -->

# Bildesamtykke-register

Dette er fasiten over hvem som har gitt tillatelse til hva når det gjelder
bilder. Kommer det et krav fra et bildebyrå, en fotograf eller en arrangør, er
det denne oversikten som skal svare på spørsmålet «hvorfor lå det bildet der?».

Registeret er versjonert i git. Hver rad har en dato og en commit bak seg, og
ingenting kan endres uten at det står i historikken. Det er med vilje: en
påstand om samtykke er lite verdt uten et tidsstempel som ikke kan flyttes i
ettertid.

## Hvordan delene henger sammen

| Hvor | Hva som ligger der |
|---|---|
| `scripts/lib/consent.json` | Fasiten. Det eneste stedet du redigerer. |
| `scripts/lib/utils.ts` | Bygger de to allowlistene fra fasiten ved oppstart. |
| Denne fila | Generert lesbar utgave. Rediger aldri direkte. |
| Protonmail `Folders/Gaari/Avtaler` | Selve ja-e-postene. Permanent arkiv, slettes aldri. |
| Protonmail `Folders/Gaari/Juridisk` | Nei-svar og juridisk korrespondanse. Slettes aldri. |

Tidligere lå kildene i koden og begrunnelsen i dette dokumentet, og de kunne
drive fra hverandre uten at noen merket det. Nå finnes det bare ett sted å
gjøre feil, og `bildesamtykke.test.ts` feiler hvis dokumentet er utdatert.

## To ulike nivåer

**Visning på gaari.no** betyr at bildet hot-linkes. Vi lagrer bare adressen, og
den besøkendes nettleser henter bildet fra arrangørens egen server. Bildet
forsvinner fra gaari.no i samme øyeblikk arrangøren fjerner det. Dette kan hvile
på varsel med mulighet til å reservere seg.

**Aktiv promotering** betyr at bildet sendes ut i Gåris egne kanaler. Da forlater
bildet arrangørens kontroll, og det krever alltid et dokumentert ja. Koden håndhever
dette: en kilde uten grunnlag `dokumentert` kommer ikke inn i promo-listen, uansett
hva som står i omfang-feltet.

## Dokumentert samtykke (17)

Beviset er en e-post i `Avtaler` eller et lydopptak med tidspunkt. Formen er
likegyldig; det som teller er at samtykket kan vises fram.

| Kilde | Hvem | Dato | Omfang | Merknad |
|---|---|---|---|---|
| `julivillaveien` | Olav Stavsholt | 2026-08-11 | Visning | Krysset av for bilderettigheter i skjemaet. SoMe ikke besvart, spurt 2026-08-11. |
| `bookibud` | Geir Havard Kjorsvik | 2026-08-11 | Visning + SoMe | Muntlig ja i mote, med samtykke til opptak gitt innledningsvis. Sitat: Jo da, det har du. For vi har det i vare kanaler, at tredjeparten kan bruke hvis vi godkjenner. Sa det er jo kun for promotering. NB: Bookibud gir tillatelse pa vegne av arrangorene sine, ikke som opphavsmann. Gjelder events levert gjennom deres API. Kilden er ikke i drift enna; API-et er ikke bygget. |
| `studiovertikal` | Sofie Vervaet | 2026-08-06 | Visning + SoMe | «Disse kan brukes i alle deres kanaler.» Sendte bildene selv som vedlegg. Bredeste samtykket i registeret. ÅPENT PUNKT: familiedag-bildet viser et gjenkjennelig barn, og tillatelsen kommer fra lokalet, ikke fra foresatte. Spørsmål sendt 2026-08-11, venter på svar. |
| `bergenpride` | post@bergenpride.no | 2026-06-01 | Visning | «Dere må gjerne ha arrangementene på deres side. Vi bruker ikke tredjepartsbilder.» Ikke spurt om sosiale medier. |
| `visningsromusf` | Line Nord | 2026-05-07 | Visning + SoMe | Kom inn via B2B-skjemaet med bilderettigheter bekreftet. |
| `loddefjord` | Marjolein Roozen, Bergen kommune | 2026-04-23 | Visning + SoMe | Bildene hostes hos kommunen, så ansvaret ligger der. Vi handler i god tro basert på Marjoleins henvisning til kalenderen. |
| `bitteater` | İrem Müftüoğlu | 2026-04-22 | Visning + SoMe | Bekreftet både visningsrett og videredistribusjon. |
| `fyllingsdalenteater` | Yasmin Kamalkhani | 2026-04-22 | Visning + SoMe | Bekreftet både visningsrett og videredistribusjon. |
| `akvariet` | Ingvild, markedskoordinator | 2026-04-21 | Visning + SoMe | Har rettighetene til bildene på egne arrangementssider. |
| `biff` | Ingebjørg Aarhus Braseth | 2026-04-21 | Visning + SoMe | BEGRENSET: kun bilder hentet fra biff.no. Ikke Bergen Kino, ikke Visit Bergen. |
| `cornerteateret` | Millan Persdotter Persson | 2026-04-20 | Visning + SoMe |  |
| `dns` | Annette Stople | 2026-04-20 | Visning + SoMe |  |
| `grieghallen` | Lene Meyer Barnes | 2026-04-20 | Visning + SoMe | Sa samtidig at vi kan ta kontakt om det blir problematisert. |
| `festspillene` | Christopher Brandt | 2026-04-19 | Visning + SoMe | Inkluderer kjøpt NTB-rettighet og egne fotografavtaler. Bekreftet både 19. og 20. april. |
| `gg-bergen` | GG Bergen | 2026-04-01 (usikker) | Visning + SoMe | Bildene er levert direkte fra arrangøren, ikke skrapet. Eksakt dato ikke gjenfunnet. |
| `artlab-manual` | Konstantin | 2026-04-01 (usikker) | Visning + SoMe | Bildene er levert direkte fra arrangøren, ikke skrapet. Eksakt dato ikke gjenfunnet. |
| `brettspill` | Brettspillklubben | 2026-04-01 (usikker) | Visning + SoMe | Fast gruppebilde fra Meetup, eid av klubben selv. Eksakt dato ikke gjenfunnet. |

## Hot-link med varsel og opt-out (27)

Disse har ikke svart ja. De er varslet om at bildene vises, med mulighet til å
reservere seg. Grunnlaget er bildepolicyen, ikke samtykke.
**Ingen av disse skal brukes i sosiale medier.**

| Kilde | Aktivert | Grunnlag | Merknad |
|---|---|---|---|
| `bergenfest` | 2026-05-11 | hotlink | Fase 2. |
| `bergenfilmklubb` | 2026-05-11 | hotlink | Fase 2. |
| `bergenkjott` | 2026-05-11 | hotlink | Fase 2. |
| `billetto` | 2026-05-11 | hotlink | Fase 3, aggregator. Filtreres i tillegg av IMAGE_BLOCKED_VENUE_PATTERNS, siden arrangører som har sagt nei kan holde arrangementer som selges her. |
| `bodega` | 2026-05-11 | hotlink | Fase 2. Leverer via Google Calendar-feed uten bilder. |
| `bymuseet` | 2026-05-11 | hotlink | Fase 2. |
| `carteblanche` | 2026-05-11 | hotlink | Fase 2. |
| `colonialen` | 2026-05-11 | hotlink | Fase 2. |
| `dnt` | 2026-05-11 | hotlink | Fase 2. |
| `floyen` | 2026-05-11 | hotlink | Fase 2. |
| `forumscene` | 2026-05-11 | hotlink | Fase 2. |
| `generasjonsfestivalen` | 2026-05-11 | hotlink | Fase 2. |
| `kode` | 2026-05-11 | hotlink | Fase 1. Hot-link til Sanity CDN, som er et KODE-eid prosjekt. |
| `kulturhusetibergen` | 2026-05-11 | hotlink | Fase 2. |
| `kunsthall` | 2026-05-11 | hotlink | Fase 2. |
| `kvarteret` | 2026-05-11 | hotlink | Fase 2. |
| `litthusbergen` | 2026-05-11 | hotlink | Fase 2. |
| `museumvest` | 2026-05-11 | hotlink | Fase 1. Offentlig institusjon med egne ansatte som kuraterer bildene. |
| `nattjazz` | 2026-05-28 | hotlink | Aktivert 2026-05-28, rett før festivalstart. Krediterer hver fotograf i eget CMS, så image_credit lagres per arrangement. verifyHotlinkable sjekker Wix CDN ved hver innlegging. |
| `oconnors` | 2026-05-11 | hotlink | Fase 2. |
| `olebull` | 2026-05-11 | hotlink | Fase 2. |
| `ostre` | 2026-05-11 | hotlink | Fase 2. |
| `stenematglede` | 2026-05-11 | hotlink | Fase 2. |
| `studentbergen` | 2026-04-21 | hotlink | DELVIS JA: skriftlig godkjent kun for løp og turer de eier selv (Ulriken Opp, 7-fjellsturen, 17. mai, Bergen Eco Trail). Resten er arrangørbilder. Ligger derfor i visningslisten og ikke i promo-listen, selv om grunnlaget er skriftlig for en del av innholdet. |
| `ticketco` | 2026-05-11 | hotlink | Fase 3, aggregator. Samme filtrering som billetto. |
| `tikkio` | 2026-05-19 | plattform | API-en returnerer image_url på cdn.tikkio.com og er beregnet på discovery-bruk. Implisitt godkjent gjennom bruksvilkårene for API-et, ikke gjennom et personlig ja. |
| `usfverftet` | 2026-05-11 | hotlink | Fase 2. |

## Bilder vi hoster selv

Alt annet er hot-link. Disse har sendt bildene direkte til oss, og de ligger
i `static/events/` og serveres fra gaari.no.

Det er en bevisst forskjell. Hot-link betyr at bildet forsvinner fra gaari.no i
samme øyeblikk arrangøren fjerner det, og nettopp den egenskapen gjør opt-out
reell. Når vi hoster selv, mister arrangøren den bryteren.

**Regel: hoster vi et bilde selv, skal e-posten med tillatelsen kunne siteres
ordrett.** Er du i tvil om ordlyden dekker det, hot-link i stedet.

- `gg-bergen` (GG Bergen)
- `artlab-manual` (Art Lab Bergen)
- `studiovertikal` (Studio Vertikal)

## Bilder av mennesker

Opphavsretten og retten til eget bilde er to ulike ting. Arrangøren eier det
første. Det andre tilhører personen som er avbildet, og for et barn er det
foresatte som råder over det. En arrangør kan ikke gi bort noe som ikke er
deres å gi.

Repoet er offentlig. Et bilde som er committet ligger permanent i
git-historikken og kan lastes ned selv om vi fjerner det fra siden. Å ta det
ned er ikke det samme som å gjøre det utilgjengelig.

Tar noen kontakt: fjern bildet fra `static/events/` og fra `image_url` i basen
umiddelbart. Avklar etterpå, ikke før.

| Kilde | Viser barn | Merknad |
|---|---|---|
| `studiovertikal` | Ja | «Disse kan brukes i alle deres kanaler.» Sendte bildene selv som vedlegg. Bredeste samtykket i registeret. ÅPENT PUNKT: familiedag-bildet viser et gjenkjennelig barn, og tillatelsen kommer fra lokalet, ikke fra foresatte. Spørsmål sendt 2026-08-11, venter på svar. |

## Nei og begrensninger (6)

Disse skal aldri inn i noen liste. E-postene ligger i `Juridisk`.

| Hvem | Dato | Hva de sa | Følge |
|---|---|---|---|
| SK Brann (Mads Liabø) | 2026-04-17 | Tredjeparter har vi ikke med i avtalene. | Klubblogo brukes som fallback. |
| BEK (Siren Løkaas) | 2026-04-21 | Bildene kommer fra kunstnerne, altså tredjepart. | BEK-logo som placeholder. |
| Bjørgvin Blues (Grethe) | 2026-04-24 | Blir for omfattende å følge opp tredjepartsrettigheter. | Blokkert på BÅDE venue-navn og tittel, fordi de holder arrangementer på andre venues. Se IMAGE_BLOCKED_VENUE_PATTERNS. |
| Hulen (Aurora Fykse, styreleder) | 2026-04-23 | Ja til egne bilder med fotografkreditering, eller plakat uten kreditering. | Betinget ja vi ikke kan oppfylle ennå. Blokkert inntil kreditering er på plass. |
| Beyond the Gates (Torgrim Øyre) | 2026-05-26 | Vi kan ikke gi deg noe entydig svar her. Bilder vi bruker kommer fra mange forskjellige opphavsmenn. | Trukket ut av listen etter å ha vært inne. |
| Bergen Filharmoniske / Harmonien (marked@harmonien.no) | 2026-04-17 | Kun autokvittering, aldri reelt svar. | Purret 2026-05-05. Favicon brukes som fallback inntil videre. |

## Rutine når noen svarer ja

1. **Flytt e-posten til `Folders/Gaari/Avtaler`.** Ikke la den ligge i innboksen.
2. **Legg til en oppføring i `scripts/lib/consent.json`** med hvem, når, omfang og hvor beviset ligger.
3. **Kjør `npx tsx scripts/consent.ts sync`.** Dokumentet og allowlistene følger med av seg selv.
4. **Kjør testene.** `npx vitest run bildesamtykke` sier fra hvis noe skurrer.

Ved delvis ja, for eksempel «bare våre egne arrangementer», gi omfang `visning`
og skriv begrensningen ordrett i merknaden. Et halvt ja som er dokumentert som
helt ja er verre enn ingenting.

## Skjemaet spør selv

Fra 2026-08-11 spør innsendingsskjemaet om begge samtykkene, ikke bare det ene.
Først om vi kan vise bildene, deretter, som et eget felt, om de også kan brukes
på Facebook og Instagram. Det andre feltet vises bare når det første er krysset
av, siden spørsmålet er meningsløst uten.

Varselet skiller mellom ja, uttrykkelig nei og ikke spurt. Den forskjellen er
verdt å bevare: et tomt felt kan bety både nei og ubesvart, og da er samtykket
ubrukelig som dokumentasjon.
