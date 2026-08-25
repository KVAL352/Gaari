# Beskrivelser og opphavsrett

Hvorfor Gåri kan hente fakta fra arrangørens side, og hvordan koden hindrer
at formuleringene deres følger med.

**Beslutning 25. august 2026 av Kjersti**, etter en gjennomgang av risikoen.
Dette dokumentet er begrunnelsen, skrevet mens den var fersk.

---

## Problemet

Arrangementssidene våre hadde beskrivelser på rundt 115 tegn:

> «Mandagsfilmen: Hamnet — Kulturarrangement på Hovedbiblioteket»

Grunnen var ikke en dårlig prompt. Modellen visste bare tittel, sted,
kategori og dato, og 115 tegn er taket for hva den metadataen ærlig bærer.
Alt lengre ville vært oppdiktet — og et tidlig forsøk beviste det, med
«her kan du nyte høstfargene» og «oppmøte er kl. 09.00 ved DNT-kontoret».

Arrangørens egen omtale ligger på kildesida og inneholder det som mangler:
regissør, besetning, varighet, aldersgrense, klokkeslett.

## Hvorfor det er lov å bruke den

Åndsverksloven verner **uttrykk**, ikke **fakta**.

At *Hamnet* er regissert av Chloé Zhao og har Paul Mescal i en hovedrolle er
en kjensgjerning. Hvem som helst kan gjengi den. Biblioteket eier ikke
opplysningen — de har bare skrevet den ned først.

Måten de har formulert den på, er derimot deres.

## Hvordan koden holder de to fra hverandre

Jobben går i to steg, og prosaen krysser aldri mellom dem.

**Steg 1 — `hentFakta()`**
Ser kildesida. Leverer bare atomære verdier tilbake:

```json
{"form": "film", "regissør": "Chloé Zhao",
 "medvirkende": ["Paul Mescal", "Jessie Buckley"],
 "språk": "Engelsk", "varighet": "2 t 5 m", "klokkeslett": "18.00"}
```

**Steg 2 — `generateDescription()`**
Skriver fra faktaene alene. Ser aldri arrangørens tekst.

**Sperren — `erAtomaertFaktum()`**
Håndhever formen i kode, ikke i prompten:

- over seks ord → forkastes
- et ord som slutter med punktum → forkastes
- over 60 tegn → forkastes
- ukjent feltnavn → forkastes

Får en formulering ikke plass i et faktafelt, kan den ikke bæres videre.
Sperren følger av **formen**, ikke av en terskel noen har gjettet.

`harVerbatimOverlapp()` står igjen som en ekstra bunnplanke: deler et svar
åtte ord på rad med kilden, forkastes det. Den fanget et ekte tilfelle
første gang den kjørte.

## Det vi aldri gjør

- Vi **lagrer aldri** arrangørens tekst. Den lever i minnet under kallet.
- Vi **publiserer aldri** den. Ingen kolonne i basen inneholder den.
- Vi **sier aldri noe om pris** i beskrivelsen — prisen vises separat, med
  forbehold, etter markedsføringsloven.
- Vi **oppgir aldri et klokkeslett fra `date_start`**. 11 % av kommende
  arrangementer starter 18:00 UTC, som avslører at flere scrapere setter et
  standardklokkeslett. Bare tid som står på arrangørens side er bekreftet.

## Det som fortsatt er usikkert

Skrevet ned med vilje, så det ikke ser ut som vi mente å ha oversett det:

1. **Vi sender teksten til Google.** Den kopieres inn i en API-forespørsel
   under uttrekket. Forbigående behandling, slik enhver oversetter gjør —
   men det er en overføring til en tredjepart.
2. **Katalogvernet.** Åndsverksloven har et eget vern for databaser og
   kataloger ved siden av verksvernet, rettet mot systematisk uttrekk fra en
   samling. Vi henter fra 59 kilder. Hvor grensa går, vet vi ikke.
3. **Bruksvilkår er ikke robots.txt.** Vi sjekker robots.txt før vi bygger
   en scraper. Arrangørenes egne vilkår kan si noe annet om nettopp denne
   bruken.
4. **Vi ber selv andre om ikke å gjøre noe som ligner.** Vår robots.txt sier
   at systematisk innhøsting krever skriftlig avtale. Forskjellen er reell —
   vi lenker tilbake, sender trafikk til arrangøren og republiserer ikke
   teksten — men symmetrien er verdt å se.

Ingen av punktene ble vurdert som blokkerende. De står her fordi en vurdering
som bare viser argumentene for seg selv, ikke er en vurdering.

## Om noen spør

Rekkefølgen er: dette dokumentet, så `scripts/lib/ai-descriptions.ts`
(`hentFakta`, `erAtomaertFaktum`, `renskFakta`, `harVerbatimOverlapp`), så
testene i `scripts/lib/__tests__/ai-descriptions.test.ts`, som viser hvilke
angrep sperrene faktisk stopper.
