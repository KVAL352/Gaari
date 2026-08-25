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
| `scripts/lib/consent.json` | Offentlig fasit. Slug, arrangør, dato, omfang, grunnlag, bevis-peker. |
| `private/consent-private.json` | Hvem som svarte, fra hvilken adresse, og hva de skrev. Gitignorert. |
| `scripts/lib/utils.ts` | Bygger de to allowlistene fra den offentlige fasiten ved oppstart. |
| Denne fila | Generert lesbar utgave. Rediger aldri direkte. |
| `private/bildesamtykke-full.md` | Samme dokument med personopplysningene i. |
| Protonmail `Folders/Gaari/Avtaler` | Selve ja-e-postene. Permanent arkiv, slettes aldri. |
| Protonmail `Folders/Gaari/Juridisk` | Nei-svar og juridisk korrespondanse. Slettes aldri. |

## Hvorfor registeret er delt i to

Dette repoet er offentlig. Fram til 2026-08-13 lå navn, e-postadresser og
ordrette sitater fra privat korrespondanse i fasiten, og dermed på nett. Ingen
av delene trengs for å svare på spørsmålet registeret finnes for. Slug, dato,
omfang, grunnlag og en peker til hvor beviset ligger gjør den jobben.

Koden virker uten den private fila. CI har den ikke, og skal ikke ha den.
Mangler den, står kontakt, e-post og merknad som tomme, og alt annet er likt.

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

## Bilder arrangøren har lastet opp selv

Ikke alle bilder på gaari.no kommer fra en kilde i tabellene under. Sender en
arrangør inn et arrangement gjennom `/submit` og laster opp et bilde, ligger fila
hos oss og ikke hos dem, og det finnes ingen rad å slå opp i her.

Grunnlaget er et annet: skjemaet laster bare opp fila når avsenderen har krysset
av for at de har rettighetene. Uten avkryssingen sendes ingen fil. Samtykket er
gitt per innsending og ikke per arrangør, og derfor står de ikke i registeret.

Sperrelisten står over dette. Har en arrangør sagt nei, hjelper det ikke at noen
andre laster opp bildet gjennom skjemaet.

**Hvor beviset ligger.** Fram til 2026-08-25 lå det ingen steder: avkryssingen
styrte om fila ble lastet opp, og så var den borte. Vi kunne vise at porten
fantes, gjennom koden og git-historikken, men ikke at nettopp denne avsenderen
gikk gjennom den. Nå skrives svaret på raden:

| Kolonne i `events` | Hva den sier |
|---|---|
| `image_rights_confirmed` | Avsenderen bekreftet å ha rettighetene. NULL = ikke en innsending. |
| `image_promo_consent` | Svaret på om bildet kan brukes på Facebook og Instagram. FALSE er et uttrykkelig nei, ikke et ubesvart felt. |
| `submitter_email` | Hvem som sendte inn. |
| `created_at` | Når. |

Ingen av de to samtykkekolonnene er lesbare for anon; de står med vilje utenfor
kolonnegrantet i `20260821150000_rls_lock_personal_data.sql`.

Rader som ble lagt inn før 2026-08-25 har NULL i begge, og for dem gjelder
fortsatt den svakere begrunnelsen over.

## Dokumentert samtykke (22)

Beviset er en e-post i `Avtaler` eller et lydopptak med tidspunkt. Formen er
likegyldig; det som teller er at samtykket kan vises fram.

| Kilde | Arrangør | Dato | Omfang | Bevis |
|---|---|---|---|---|
| `fortellerstraedet` | Fortellerstrædet | 2026-08-15 | Visning + SoMe | Avtaler |
| `highvoltage` | High Voltage Rockfest | 2026-08-14 | Visning + SoMe | Avtaler |
| `julivillaveien` | Jul i Villaveien | 2026-08-12 | Visning + SoMe | Avtaler |
| `bookibud` | Bookibud | 2026-08-11 | Visning + SoMe | Opptak fra mote 2026-08-11, ca 16:55 til 17:14 |
| `studiovertikal` | Studio Vertikal | 2026-08-06 | Visning + SoMe | Avtaler |
| `bergenpride` | Bergen Pride / Regnbuedagene | 2026-06-01 | Visning | Avtaler |
| `kode` | KODE | 2026-05-11 | Visning + SoMe | Avtaler |
| `bergenkjott` | Bergen Kjøtt | 2026-05-08 | Visning + SoMe | Avtaler |
| `visningsromusf` | Visningsrommet USF | 2026-05-07 | Visning + SoMe | Avtaler |
| `dnt` | DNT Bergen og Hordaland | 2026-05-06 | Visning + SoMe | Avtaler |
| `loddefjord` | Hva skjer i Loddefjord | 2026-04-23 | Visning + SoMe | Avtaler |
| `bitteater` | Bit Teatergarasjen | 2026-04-22 | Visning + SoMe | Avtaler |
| `fyllingsdalenteater` | Fyllingsdalen Teater | 2026-04-22 | Visning + SoMe | Avtaler |
| `akvariet` | Akvariet i Bergen | 2026-04-21 | Visning + SoMe | Avtaler |
| `biff` | BIFF | 2026-04-21 | Visning + SoMe | Avtaler |
| `cornerteateret` | Cornerteateret | 2026-04-20 | Visning + SoMe | Avtaler |
| `dns` | Den Nationale Scene | 2026-04-20 | Visning + SoMe | Avtaler |
| `grieghallen` | Grieghallen | 2026-04-20 | Visning + SoMe | Avtaler |
| `festspillene` | Festspillene i Bergen | 2026-04-19 | Visning + SoMe | Avtaler |
| `gg-bergen` | GG Bergen | 2026-04-01 (usikker) | Visning + SoMe | Avtaler |
| `artlab-manual` | Art Lab Bergen | 2026-04-01 (usikker) | Visning + SoMe | Avtaler |
| `brettspill` | Brettspillklubben | 2026-04-01 (usikker) | Visning + SoMe | Avtaler |

## Hot-link med varsel og opt-out (24)

Disse har ikke svart ja. De er varslet om at bildene vises, med mulighet til å
reservere seg. Grunnlaget er bildepolicyen, ikke samtykke.
**Ingen av disse skal brukes i sosiale medier.**

| Kilde | Arrangør | Aktivert | Grunnlag |
|---|---|---|---|
| `bergenfest` | Bergenfest | 2026-05-11 | hotlink |
| `bergenfilmklubb` | Bergen Filmklubb | 2026-05-11 | hotlink |
| `billetto` | Billetto | 2026-05-11 | hotlink |
| `bodega` | Bodega | 2026-05-11 | hotlink |
| `bymuseet` | Bymuseet i Bergen | 2026-05-11 | hotlink |
| `carteblanche` | Carte Blanche | 2026-05-11 | hotlink |
| `colonialen` | Colonialen | 2026-05-11 | hotlink |
| `floyen` | Fløyen | 2026-05-11 | hotlink |
| `forumscene` | Forum Scene | 2026-05-11 | hotlink |
| `generasjonsfestivalen` | Generasjonsfestivalen | 2026-05-11 | hotlink |
| `kulturhusetibergen` | Kulturhuset i Bergen | 2026-05-11 | hotlink |
| `kunsthall` | Bergen Kunsthall | 2026-05-11 | hotlink |
| `kvarteret` | Det Akademiske Kvarter | 2026-05-11 | hotlink |
| `litthusbergen` | Litteraturhuset i Bergen | 2026-05-11 | hotlink |
| `museumvest` | Museum Vest | 2026-05-11 | hotlink |
| `nattjazz` | Nattjazz | 2026-05-28 | hotlink |
| `oconnors` | O'Connors | 2026-05-11 | hotlink |
| `olebull` | Ole Bull Scene | 2026-05-11 | hotlink |
| `ostre` | Østre | 2026-05-11 | hotlink |
| `stenematglede` | Stene Matglede | 2026-05-11 | hotlink |
| `studentbergen` | Utdanning i Bergen / StudentBergen | 2026-04-21 | hotlink |
| `ticketco` | TicketCo | 2026-05-11 | hotlink |
| `tikkio` | Tikkio | 2026-05-19 | plattform |
| `usfverftet` | USF Verftet | 2026-05-11 | hotlink |

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

| Kilde | Arrangør | Viser barn |
|---|---|---|
| `studiovertikal` | Studio Vertikal | Ja |
| `julivillaveien` | Jul i Villaveien | Nei |

## Nei og begrensninger (6)

Disse skal aldri inn i noen liste. E-postene ligger i `Juridisk`, og hvem som
svarte og hva de skrev står i den private halvdelen av registeret.

| Hvem | Dato | Følge |
|---|---|---|
| SK Brann | 2026-04-17 | Klubblogo brukes som fallback. |
| BEK | 2026-04-21 | BEK-logo som placeholder. |
| Bjørgvin Blues | 2026-04-24 | Blokkert på BÅDE venue-navn og tittel, fordi de holder arrangementer på andre venues. Se IMAGE_BLOCKED_VENUE_PATTERNS. |
| Hulen | 2026-04-23 | Betinget ja vi ikke kan oppfylle ennå. Blokkert inntil kreditering er på plass. |
| Beyond the Gates | 2026-05-26 | Trukket ut av listen etter å ha vært inne. |
| Bergen Filharmoniske / Harmonien | 2026-04-17 | Purret 2026-05-05. Favicon brukes som fallback inntil videre. |

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
