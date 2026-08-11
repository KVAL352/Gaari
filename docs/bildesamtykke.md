# Bildesamtykke-register

Dette er fasiten over hvem som har gitt tillatelse til hva når det gjelder bilder.
Hvis det kommer et krav fra et bildebyrå, en fotograf eller en arrangør, er det
denne fila som skal svare på spørsmålet «hvorfor lå det bildet der?».

Registeret er versjonert i git. Det betyr at hver rad har en dato og en
commit bak seg, og at ingen kan endres uten at det står i historikken. Det er
med vilje: en påstand om samtykke er lite verdt uten et tidsstempel som ikke
kan flyttes i ettertid.

## Slik henger delene sammen

| Hvor | Hva ligger der |
|---|---|
| `scripts/lib/utils.ts` | De to allowlistene som faktisk styrer koden. Autoritativ for hva systemet gjør. |
| Denne fila | Menneskelig kontekst: hvem sa ja, til hva, og hvor beviset ligger. |
| Protonmail `Folders/Gaari/Avtaler` | Selve ja-e-postene. Permanent arkiv, slettes aldri. |
| Protonmail `Folders/Gaari/Juridisk` | Nei-svar, begrensninger og juridisk korrespondanse. Slettes aldri. |

`scripts/lib/__tests__/bildesamtykke.test.ts` sjekker at hver kilde i de to
listene i koden har en rad her, og motsatt. Legger noen til en kilde uten å
dokumentere den, feiler testen. Det er den mekanismen som hindrer at samtykke
og kode driver fra hverandre.

## To ulike nivåer

Det er avgjørende å holde disse fra hverandre, både juridisk og praktisk:

**Visning på gaari.no** (`IMAGE_APPROVED_SOURCES`) betyr at bildet hot-linkes.
Vi lagrer bare adressen; den besøkendes nettleser henter bildet fra arrangørens
egen server. Bildet forsvinner fra gaari.no i samme øyeblikk arrangøren fjerner
det. Dette kan hvile på hot-link/opt-out-policyen, altså varsel med mulighet
til å reservere seg.

**Aktiv promotering** (`PROMO_APPROVED_SOURCES`) betyr at bildet sendes ut i
Gåris egne kanaler: Facebook, Instagram, nyhetsbrev-headliner. Da forlater
bildet arrangørens kontroll. Dette krever alltid **eksplisitt skriftlig ja**.
Hot-link-policyen dekker det ikke, og et ja til visning er ikke et ja til dette.

## Eksplisitt skriftlig ja

Disse har svart skriftlig. E-posten ligger i `Avtaler`.

| Kilde | Hvem | Dato | Omfang | Merknad |
|---|---|---|---|---|
| `studiovertikal` | Sofie Vervaet | 2026-08-06 | Visning + SoMe | «Disse kan brukes i alle deres kanaler.» Sendte bildene selv som vedlegg. Bredeste samtykket i registeret. Eneste kilde vi hoster selv, se avsnittet under. |
| `bergenpride` | post@bergenpride.no | 2026-06-01 | Visning | «Vi bruker ikke tredjepartsbilder.» Ikke spurt om SoMe. |
| `visningsromusf` | Line Nord | 2026-05-07 | Visning + SoMe | Kom inn via B2B-skjemaet med bilderettigheter bekreftet. |
| `loddefjord` | Marjolein Roozen, Bergen kommune | 2026-04-23 | Visning + SoMe | Bildene hostes hos kommunen. Ansvaret ligger der. |
| `fyllingsdalenteater` | Yasmin Kamalkhani | 2026-04-22 | Visning + SoMe | Bekreftet både visningsrett og videredistribusjon. |
| `bitteater` | İrem Müftüoğlu | 2026-04-22 | Visning + SoMe | Bekreftet både visningsrett og videredistribusjon. |
| `akvariet` | Ingvild, markedskoordinator | 2026-04-21 | Visning + SoMe | Har rettigheter til bildene på egne arrangementssider. |
| `biff` | Ingebjørg Aarhus Braseth | 2026-04-21 | Visning + SoMe | KUN bilder hentet fra biff.no. Ikke Bergen Kino, ikke Visit Bergen. |
| `dns` | Annette Stople | 2026-04-20 | Visning + SoMe | |
| `grieghallen` | Lene Meyer Barnes | 2026-04-20 | Visning + SoMe | «Kan ta kontakt om det blir problematisert.» |
| `cornerteateret` | Millan Persdotter Persson | 2026-04-20 | Visning + SoMe | |
| `festspillene` | Christopher Brandt | 2026-04-19 | Visning + SoMe | Inkluderer kjøpt NTB-rettighet og fotografavtaler. |
| `gg-bergen` | Venue direkte | 2026-04 | Visning + SoMe | Bildene er levert til oss, ikke skrapet. |
| `artlab-manual` | Venue direkte | 2026-04 | Visning + SoMe | Bildene er levert til oss, ikke skrapet. |
| `brettspill` | Klubben | 2026-04 | Visning + SoMe | Fast gruppebilde fra Meetup, eid av klubben selv. |

## Unntaket: bilder vi hoster selv

Alt annet i registeret er hot-link. Studio Vertikal er unntaket: Sofie sendte
bildene direkte til oss som vedlegg, med skriftlig tillatelse uten forbehold.
De ligger derfor i `static/events/` og serveres fra gaari.no.

Det er en bevisst forskjell. Hot-link betyr at bildet forsvinner fra gaari.no
i samme øyeblikk arrangøren fjerner det, og det er nettopp den egenskapen som
gjør opt-out reell. Når vi hoster selv, mister arrangøren den bryteren. Da må
tillatelsen være tilsvarende tydelig, og den må ligge i `Avtaler`.

**Regel: hoster vi et bilde selv, skal e-posten med tillatelsen kunne siteres
ordrett.** Er du i tvil om ordlyden dekker det, hot-link i stedet.

### Bilder av barn

Familiedag-bildet består av to bilder side om side: et barn til venstre, en
voksen til høyre. Barnet er gjenkjennelig. Kjersti besluttet 2026-08-11 at
begge skal med.

**Åpent punkt:** tillatelsen er gitt av Studio Vertikal, altså av lokalet, ikke
av foresatte. Be Sofie bekrefte skriftlig at foresatte har samtykket til denne
bruken, og at samtykket også dekker Facebook og Instagram hvis bildet skal dit.
Legg svaret i `Avtaler` sammen med resten.

Grunnen til at terskelen er høyere her enn for andre bilder: repoet er
offentlig. Et bilde som først er committet, ligger permanent i git-historikken
og kan lastes ned selv om vi senere fjerner det fra siden. Å ta det ned er
altså ikke det samme som å gjøre det utilgjengelig.

Ved en eventuell henvendelse fra foresatte: fjern bildet fra `static/events/`
og fra `image_url` i basen umiddelbart, og si fra at git-historikken også kan
skrives om hvis de ber om det. Ikke vent på avklaring før bildet tas ned.

## Hot-link med varsel og opt-out

Disse har ikke svart ja. De er varslet skriftlig om at bildene vises som
hot-link, med mulighet til å reservere seg. Grunnlaget er bildepolicyen, ikke
samtykke. **Ingen av disse skal brukes i sosiale medier.**

| Fase | Aktivert | Kilder | Vurdering |
|---|---|---|---|
| 1 | 2026-05-11 | `museumvest`, `kode` | Offentlige institusjoner med egne ansatte som kuraterer bildene. Lav risiko. |
| 2 | 2026-05-11 | `dnt`, `bodega`, `bergenfest`, `olebull`, `forumscene`, `generasjonsfestivalen`, `litthusbergen`, `studentbergen`, `kulturhusetibergen`, `colonialen`, `oconnors`, `stenematglede`, `floyen`, `bergenkjott`, `bymuseet`, `ostre`, `bergenfilmklubb`, `carteblanche`, `kunsthall`, `usfverftet`, `kvarteret` | Venues og festivaler med egne ansatte. Varsel sendt samme dag. |
| 2 | 2026-05-28 | `nattjazz` | Krediterer hver fotograf i sitt eget CMS, så `image_credit` lagres per arrangement. |
| 3 | 2026-05-11 | `billetto`, `ticketco` | Aggregatorer. Plattformene er varslet. Filtreres i tillegg av `IMAGE_BLOCKED_VENUE_PATTERNS`. |
| 3 | 2026-05-19 | `tikkio` | Tikkio Public Discovery API leverer `image_url` selv, altså implisitt godkjent for discovery-bruk. |

Merk om `studentbergen`: Stina Aadland Jensen bekreftet 2026-04-21 at bilder kan
brukes for løp og turer de eier selv (Ulriken Opp, 7-fjellsturen, 17. mai,
Bergen Eco Trail). Resten er arrangørbilder. Kilden ligger i hot-link-listen,
ikke i promo-listen, nettopp fordi samtykket er delvis.

## Nei og begrensninger

Disse skal aldri inn i noen av listene. E-postene ligger i `Juridisk`.

| Hvem | Dato | Hva de sa |
|---|---|---|
| SK Brann, Mads Liabø | 2026-04-17 | «Tredjeparter har vi ikke med i avtalene.» Klubblogo brukes som fallback. |
| BEK, Siren Løkaas | 2026-04-21 | Bildene kommer fra kunstnerne, altså tredjepart. BEK-logo som placeholder. |
| Bjørgvin Blues, Grethe | 2026-04-24 | Vil ikke følge opp tredjepartsrettigheter. Blokkert på venue-navn OG tittel, fordi de holder arrangementer på andre venues. |
| Hulen, Aurora Fykse | 2026-04-23 | Betinget ja: egne bilder MED fotografkreditering, eller plakat uten. Vi har ikke kreditering på plass, så kilden er blokkert inntil videre. |
| Beyond the Gates, Torgrim Øyre | 2026-05-26 | «Bilder vi bruker kommer fra mange forskjellige opphavsmenn.» Trukket ut av listen etter å ha vært inne. |
| Harmonien | 2026-04-17 | Kun autokvittering, aldri reelt svar. Purret 2026-05-05. Favicon brukes som fallback. |

## Innsendingsskjemaet spør nå selv

Fra 2026-08-11 spør `/[lang]/submit` om begge samtykkene, ikke bare det ene.
Først om vi kan vise bildene sammen med arrangementene, og deretter, som et
eget avkryssingsfelt, om de også kan brukes når Gåri omtaler arrangementet på
Facebook og Instagram. Feltet vises bare når de først har bekreftet at de har
rettighetene, siden det andre spørsmålet er meningsløst uten det første.

Svaret følger med varselet du får på e-post, og skiller mellom tre tilstander:
ja, uttrykkelig nei, og ikke spurt (ingen bilde lastet opp). Den forskjellen er
verdt å bevare. Et tomt felt kan bety både nei og ubesvart, og da er samtykket
ubrukelig som dokumentasjon i ettertid.

Bakgrunnen: Jul i Villaveien sendte inn 11. august og hadde krysset av for
bilderettigheter, men skjemaet spurte ikke om sosiale medier i det hele tatt.
Det utløste en e-postrunde som skjemaet burde tatt selv.

**Merk:** svaret lagres foreløpig ikke i databasen, bare i varselet. Skal det
bli en kilde du kan spørre senere, trenger `events` en egen kolonne.

## Rutine når noen svarer ja

Fire steg. Hopper du over ett, er samtykket i praksis borte når du trenger det.

1. **Flytt e-posten til `Folders/Gaari/Avtaler`.** Ikke la den ligge i innboksen.
2. **Legg kilden i riktig liste** i `scripts/lib/utils.ts`, med navn og dato i kommentaren.
3. **Legg til en rad her**, med omfang og eventuelle begrensninger.
4. **Kjør testene.** `npx vitest run bildesamtykke` sier fra hvis noe mangler.

Ved delvis ja, for eksempel «bare våre egne arrangementer», hører kilden hjemme
i visningslisten og ikke i promo-listen. Skriv begrensningen ordrett i
merknadsfeltet. Et halvt ja som er dokumentert som helt ja er verre enn
ingenting.
