# Ytelsesbudsjett

`lighthouse-budget.json` lå i repoet fra februar uten at noe kjørte den. Denne
gjennomgangen (21. august 2026) gjorde den til et krav, og målte hva sidene
faktisk ligger på.

## Slik håndheves den

`.github/workflows/lighthouse.yml` kjører på pull request og på push til
`master`. Den bygger produksjonsbygget, serverer det med `vite preview`, og
kjører `scripts/lighthouse-budget-check.mjs` mot fire sidetyper på norsk pluss
den engelske forsiden:

| sidetype          | sti                                |
| ----------------- | ---------------------------------- |
| forside           | `/no`                              |
| samleside         | `/no/denne-helgen`                 |
| arrangementsside  | `/no/events/aurora-grieghallen`    |
| innsendingsskjema | `/no/submit`                       |
| forside, engelsk  | `/en`                              |

Lokalt:

```
npm run build
npx vite preview --port 4173 --strictPort
npm install --no-save lighthouse@13.4.1
node scripts/lighthouse-budget-check.mjs --base http://localhost:4173
```

`--no-fail` gir måling uten dom. `--runs N` endrer antall kjøringer.

Tre valg det er verdt å kjenne til:

- **Produksjonsbygg, aldri `vite dev`.** Dev-serveren serverer umodulerte
  moduler uten minifisering. Tallene derfra måler byggeverktøyet, ikke siden.
- **Tre kjøringer, median per måltall, etter én forkastet oppvarming.** Én
  måling i CI svinger for mye. Median og ikke snitt: én treg kjøring skal ikke
  kunne dra et grønt resultat over grensen, og heller ikke omvendt.
  Oppvarmingen kom til 24. august, se «Første måling teller ikke» nedenfor.
- **Supabase-URL-en peker på `.invalid`.** Da faller rutene tilbake på
  seed-dataene, og sidene ser like ut hver kjøring. Samme grep som i
  `playwright.config.ts`. Konsekvensen står under «Det målingen ikke ser».

Lighthouse-versjonen er låst til 13.4.1 i `scripts/lighthouse-budget-check.mjs`.
En ny versjon kan flytte tallene uten at siden er endret. Pakken installeres med
`--no-save` og står derfor ikke i `package.json`.

## Målingen 21. august 2026

Median av tre kjøringer per side, mobiloppsett med simulert struping, kjørt på
en Windows-laptop mot `vite preview`. **Ikke** CI-tall — se forbeholdet nedenfor.

Før fiksen under:

| side             |  FCP |  LCP | TBT |   CLS |   SI | script  | total   |
| ---------------- | ---: | ---: | --: | ----: | ---: | ------: | ------: |
| forside          | 2793 | 4146 |  21 | 0.000 | 2793 | **209** | **768** |
| samleside        | 2443 | 4208 |  15 | 0.000 | 2443 |     192 | **721** |
| arrangementsside | 2350 | 3788 |   0 | 0.000 | 2350 |     197 | **639** |
| innsendingsskjema| 2274 | 3482 |   0 | 0.001 | 2274 | **223** |     337 |
| forside (EN)     | 2797 | 4152 |  30 | 0.000 | 4659 | **209** | **768** |
| **grense**       | 3500 | 5000 | 800 | 0.050 | 6000 |     200 |     500 |

Etter:

| side             |  FCP |  LCP | TBT |   CLS |   SI | script | total   |
| ---------------- | ---: | ---: | --: | ----: | ---: | -----: | ------: |
| forside          | 2499 | 3641 |  30 | 0.000 | 4442 |    141 | **701** |
| samleside        | 2295 | 3749 |  50 | 0.000 | 2299 |    124 | **653** |
| arrangementsside | 2126 | 3185 |   0 | 0.000 | 2126 |    128 | **570** |
| innsendingsskjema| 2525 | 3290 |  60 | 0.001 | 2525 |    154 |     268 |
| forside (EN)     | 2502 | 3645 |  26 | 0.000 | 4456 |    141 | **701** |

Tider i ms, størrelser i KiB overført. Uthevet = over grensen som gjaldt da
målingen ble gjort. `total`-kolonnen er tatt med for sammenligningens skyld;
den grensen ble byttet ut samme dag, se lenger ned.

**Alle tidsgrenser holder, med god margin.** Den verste enkeltmålingen av
femten brukte 76 % av LCP-grensen, 75 % av Speed Index, 72 % av FCP, 9 % av
TBT og 1 % av CLS. Ingen tidsgrense ligger nær nok til å slå ut tilfeldig på
denne maskinen.

## Det som ble rettet

Skriptgrensen var brutt på forsiden, `/submit` og `/en`, og lå 1–4 % under på
de to andre — altså innenfor støyen.

Årsaken var én import. `Footer.svelte` vises på alle sider og hentet
bunntekstlenkene sine fra `$lib/collections`. Den modulen er hele
samlingskatalogen: 53 samlinger med to-språklige beskrivelser, FAQ-er og
SEO-tekst, 338 kB kildekode. Trestrukturen kan ikke kaste dataene, bare fordi en
funksjon i modulen leser dem. Resultatet var **70 KiB komprimert JavaScript
lastet på hver eneste sidevisning**, for å tegne rundt tjue lenker. `/submit`,
som ikke viser en eneste samling, var den tyngste siden på nettstedet.

Katalogen leses nå på serveren, og bare slug og etikett sendes til nettleseren:

- `src/routes/[lang]/+layout.server.ts` (ny) — bunntekstlenkene
- `src/routes/[lang]/+page.server.ts` — «Utforsk Bergen»-kartet på forsiden
- `src/routes/[lang]/[collection]/+page.server.ts` — relaterte samlinger
- `src/routes/[lang]/guide/+page.server.ts` (ny) — ItemList-en i JSON-LD-en

Ingen komponent importerer `$lib/collections` lenger. Effekt: 68 KiB mindre på
forsiden, 69 på `/submit`, og LCP ned et halvt sekund. Bunnteksten rendrer de
samme 32 lenkene som før, kontrollert mot katalogen.

## Grensen som ble byttet ut: `total: 500`

Etter fiksen var dette det eneste bruddet, på de tre sidene som viser bilder.
Forsiden lå på 701 KiB, og besto av:

| type                |     KiB | kommentar              |
| ------------------- | ------: | ---------------------- |
| bilder              | **404** | hot-lenket, tredjepart |
| script              |     141 | vår kode               |
| fonter              |     115 | fem snitt, våre        |
| dokument            |      25 | vår SSR-HTML           |
| stilark             |      16 | vår CSS                |
| **sum uten bilder** | **297** | godt innenfor 500      |

Grensen ble altså brutt utelukkende av bilder vi ikke er avsender for. Vi
hot-lenker originalene fra arrangørenes egne sider, som er hele bildepolicyen —
og da er det arrangøren som bestemmer filstørrelsen. Én måling mot ekte
gaari.no samme dag viste 566 KiB bilder på forsiden, altså verre enn
seed-dataene. Et budsjett på `total` ville derfor enten stått rødt permanent,
eller vært satt så løst at det ikke betydde noe.

Grensen ble 21. august byttet mot grenser per type, for det koden vår faktisk
styrer:

| type       | grense | i dag (verste side) | margin |
| ---------- | -----: | ------------------: | -----: |
| script     |    200 |                 154 |   23 % |
| font       |    128 |                 115 |   10 % |
| stylesheet |     24 |                  16 |   33 % |
| document   |     40 |                  25 |   38 % |

Skriptgrensen er uendret fra februar. De tre andre er satt fra målingen med
margin, ikke fra en mal. Fontgrensen er den strammeste med vilje: 128 KiB gir
plass til de fem snittene vi har, men ikke til et sjette uten at noen tar
stilling til det.

Bildevekt og totalvekt rapporteres fortsatt av kjøreren, merket «uten grense,
kun rapportert», slik at det merkes om de vokser. Tidsgrensene fanger fortsatt
opp om bildene gjør siden treg.

## Første måling teller ikke (24. august)

Portvakten kjørte fire ganger over tre dager, alle grønne. Men TBT svingte
mistenkelig mye mellom kjøringer av samme side i samme jobb:

| kjøring     | forsiden          | innsendingsskjemaet |
| ----------- | ----------------- | ------------------- |
| 21. aug kl 13 | `[411, 10, 2]`  | `[235, 9, 254]`     |
| 21. aug kl 15 | `[516, 30, 30]` | `[119, 32, 35]`     |
| 23. aug kl 10 | `[422, 30, 208]`| `[124, 25, 52]`     |
| 23. aug kl 13 | `[520, 208, 50]`| `[132, 41, 34]`     |

Første gjetning var maskinstøy på en delt to-kjerners runner. Den var feil.
Over 20 sidemålinger var **den første av tre høyest i 13 av dem**, og snittet
lå på 171 ms mot 61 ms for kjøring to og tre. Det er ikke støy — støy trekker
begge veier. Det er en skjevhet som bare trekker oppover, og medianen av tre
arvet den: verste median var 235 ms der de to varme kjøringene lå på 9 og 254.

Derfor kastes nå én kjøring per side før de som telles. Merk at det ikke holder
å be om HTML-en først: workflowen henter allerede `/no` én gang for å vente på
serveren, og forsiden spratt likevel på første måling alle fire gangene. Noe
annet enn ruten er kaldt, og siden vi ikke vet hva, varmer vi opp med nøyaktig
det arbeidet som måles. Kostnaden er rundt ett minutt per kjøring.

`--no-warmup` gir de rå tallene om du vil se skjevheten selv.

## Det målingen ikke ser

- **Seed-dataene er lettere enn ekte data.** Én kjøring mot produksjon samme
  dag ga TBT 618 ms mot 21 ms lokalt, og et HTML-dokument på 210 KiB mot 25.
  Grunnen er at forsiden i produksjon rendrer langt flere arrangementer.
  Portvakten fanger altså regresjoner i *kode*, ikke i *datamengde*. TBT-grensen
  på 800 ms er i praksis ikke voktet — produksjon lå på 618 ms, og lokalt måler
  vi 30.
- **CI-tallene er ikke kjent.** Alt over er målt på en Windows-laptop. En
  GitHub-runner har to kjerner og er tregere. Første kjøring i CI er den
  virkelige grunnlinjen, og kan flytte tidstallene oppover.
- **Skriptvekten er reell, ikke et komprimeringsartefakt.** Produksjon målte
  208 KiB script mot 209 lokalt før fiksen, så gzip i `vite preview` og det
  Vercel serverer er i praksis likt her.

## Ikke gjort

- Fem fontfiler på til sammen 115 KiB lastes på hver side (Inter 400/500/600,
  Barlow Condensed 500/700). Om alle fem snittene virkelig trengs er et
  typografispørsmål, ikke et teknisk. To færre snitt ville frigjort ~46 KiB.
- Ingen måling av `/no/guide`, `/no/tilgjengelighet` eller admin-sidene.
  `nodes/29` (admin) er nå den største enkeltbiten i bygget med 55 KiB, men den
  lastes bare av innloggede.
