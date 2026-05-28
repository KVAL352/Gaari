# IP Protection Playbook

**Sist oppdatert:** 2026-05-28
**Status:** Aktivt — lag-på-lag forsvar mot kopiering av Gåri-databasen

---

## 1. Trusselbilde

Konkurrenter eller "gråsone-aktører" som vurderer å bygge en lignende arrangementskalender for Bergen kan velge mellom:

1. **Bygge selv** — gjøre samme jobb vi har gjort: identifisere kilder, skrive scrapere, kuratere venues, kategorisere. Tar måneder. Vi heier på dette og er åpne for samarbeid.
2. **Kopiere oss** — scrape gaari.no, ta databasen, ta venue-mapping, ta AI-beskrivelser, og presentere som sitt eget. Tar timer. Dette må vi gjøre kostbart.

Strategien nedenfor gjør (2) juridisk og teknisk dyrere uten å hindre (1).

> Juridisk rammeverk er drøftet i [`docs/legal-research-norway.md`](legal-research-norway.md).

---

## 2. Forsvarslag

### Lag 1 — Bruksvilkår (juridisk fundament)

- **Side:** `/[lang]/vilkar` — eksplisitt forbud mot scraping, bulk-uttrekk og kommersiell gjenbruk.
- **Lenket fra:** footer på hver side, robots.txt-kommentar, sitemap.
- **Effekt:** Etablerer at vi har gitt eksplisitt beskjed. En "gråsone" som krenker dette kan ikke påberope seg at de ikke visste.
- **Lovgrunnlag som påberopes:**
  - Åndsverksloven § 24 (sui generis databasevern)
  - Åndsverksloven §§ 2–3 (åndsverk på egne tekster)
  - Markedsføringsloven §§ 25 og 30
  - Finn.no v Supersøk-presedensen

### Lag 2 — robots.txt-signaler

- Toppkommentar i `/static/robots.txt` peker på vilkårene og oppgir kontakt-epost.
- Cloudflare Content Signals (`ai-train=no`) signaliserer skille mellom AI-søk og AI-trening.
- Effekt: alle som påstår "jeg så ikke vilkårene" har bevist at de ikke leste robots.txt heller.

### Lag 3 — Canary events

Et canary-arrangement er et plausibelt-utseende, men oppdiktet event som kun finnes på Gåri. Hvis det dukker opp på en konkurrents side med samme tittel, venue og dato → udiskutabelt bevis på kopiering.

**Hvor de bor:** I `events`-tabellen med `is_canary = true`.

**Hvor de vises:**
- ✅ Event-detail-side (`/[lang]/events/[slug]`) — med synlig "Testdatapunkt"-banner og `<meta name="robots" content="noindex,nofollow">`.
- ✅ Sitemap (`/sitemap.xml`) — slik at scrapere som crawler sitemap finner URL-ene. Google respekterer noindex og indekserer dem ikke.
- ✅ Venue-side (`/[lang]/venue/[slug]`) — beitemark for venue-crawlere (begrenset til 50 events; canary kan falle utenfor for høyvolums-venues som Akvariet).
- ❌ Hjemmeside, samlinger, RSS, ICS — filtrerer ut `is_canary = true` så vanlige brukere ikke ser dem i listinger.

**Designvalget:** Sitemap er det dominante bait-flaten — det er der scrapere oppdager URL-er. Vi inkluderer canaries der, men `noindex,nofollow` hindrer Google fra å vise dem i søkeresultater. Malicious scrapere respekterer ikke noindex og tar dem med. Real users finner dem nesten aldri.

**Hvorfor synlig banner?** Hvis en bruker tilfeldigvis finner siden, må de få vite at det er testdata. Banneret er funksjonelt nødvendig for åpenhet. Naive scrapere som tar tittel/beskrivelse/venue uten å sjekke for advarsler kopierer fortsatt.

**Hvordan plante en canary:**

```bash
cd scripts
# Lag en JSON-fil med plausible-utseende data
cat > /tmp/canary-1.json <<'JSON'
{
  "title_no": "Jazzkveld med Eirik Hægstad-trio",
  "title_en": "Jazz Evening with Eirik Hægstad Trio",
  "description_no": "En kveld med moderne jazz i intim setting.",
  "venue_name": "Logen Teater",
  "address": "Øvre Ole Bulls plass 6, Bergen",
  "bydel": "Sentrum",
  "category": "music",
  "date_start": "2026-09-14T20:00:00+02:00",
  "price": "",
  "ticket_url": "https://gaari.no/no",
  "source_url": "https://gaari.no/no#canary-music-2026-09-14"
}
JSON

npx tsx canary-manage.ts add --json /tmp/canary-1.json
npx tsx canary-manage.ts list
```

**Designregler for en god canary:**

1. **Tittelen må være unik.** Bruk et artistnavn eller bandnavn som ikke finnes (Google først). Et navn som "Eirik Hægstad-trio" gir høy signal-til-støy.
2. **Venue skal være ekte.** En oppdiktet venue ser mistenkelig ut for både brukere og konkurrenter. Bruk en ekte venue som har mange events.
3. **Dato skal være langt frem i tid.** 3+ måneder ut. Færre tilfeldige brukere finner dem, og når datoen passerer slettes de av `removeExpiredEvents()`.
4. **Kategori skal være vanlig.** Music, culture, theatre — events i mer obskure kategorier (workshop, tours) ses sjeldnere.
5. **Pris settes tom eller "Trolig gratis".** Reduserer sjansen for at noen prøver å kjøpe billett.
6. **`ticket_url` peker tilbake til gaari.no.** Ingen risiko for at brukere blir sendt til feil sted.
7. **`source_url` må være unik.** Databasen har UNIQUE-indeks på `source_url`. Bruk en fragment som `https://gaari.no/no#canary-<kategori>-<dato>` for å holde det unikt.

**Anbefalt rytme:** 2–4 canaries spredt utover året. For mange og det blir merkbart i listinger; for få og deteksjon blir treig.

### Lag 4 — Skanning av konkurrenter

```bash
cd scripts
# Sjekk en konkurrents homepage og sitemap
npx tsx canary-scan.ts https://example.com https://example.com/sitemap.xml

# Eller fra en fil med en URL per linje
npx tsx canary-scan.ts --file targets.txt
```

Resultater lagres som rå HTML + JSON i `outputs/canary-evidence/<timestamp>/` for senere bruk som bevis.

**Hvor ofte skanne:** Ukentlig manuelt, eller sett opp som GHA cron-jobb (`*/7 * * *`) når canaries er plantet.

### Lag 5 — Bevisinnsamling løpende

Selv uten canary-hit er det nyttig å arkivere konkurrenters innhold månedlig for senere sammenligning. Wayback Machine + lokal kopi av nøkkelsider.

---

## 3. Operativ workflow

### Når en ny "gråsone" dukker opp

1. **Identifiser dem.** Hvem driver siden? Hvilken bedrift? Domeneregistrant via `whois`.
2. **Arkiver deres åpningstilstand.** Lagre snapshot av deres data nå — så vi kan måle endring over tid.
3. **Plant en ny canary** med dato 3–6 måneder ut.
4. **Sett opp ukentlig skann** mot deres URL-er.
5. **Loggfør i memory** under outreach/competitor-tracking.

### Når en canary-hit oppdages

1. **Ikke konfronter umiddelbart.** Samle bevis først.
2. **Verifiser at hit ikke er falsk positiv.** Sjekk at tittel/venue-kombinasjon faktisk er fra Gåri og ikke en sammentreff.
3. **Lagre Wayback Machine-snapshot** av konkurrentens side: `https://web.archive.org/save/<url>`.
4. **Skann bredt** — hvis én canary er hit, finn alle. Skann også sider med våre AI-beskrivelser og venue-mapping.
5. **Dokumenter omfanget** — hvor mange events kopiert, hvor mange beskrivelser, hvor mange venues. Anslå hvor stor del av deres "database" som er vår.
6. **Konsulter advokat** før vi sender noe. Vurdering må inkludere:
   - Er det "vesentlig del" jf. åndsverksloven § 24?
   - Er utnyttelsen "utilbørlig" jf. markedsføringsloven § 25?
   - Hvilken type krav: opphørspålegg, erstatning, vinningsavståelse?
7. **Send formelt krav om opphør** via e-post (rekommandert post hvis nødvendig). Inkluder:
   - Henvisning til våre vilkår (`/vilkar`)
   - Bevis (skjermbilder med tidsstempel, Wayback-link, canary-IDs)
   - Frist (typisk 14 dager)
   - Konsekvenser ved manglende respons
8. **Eskalér til Forliksrådet eller Hordaland tingrett** hvis ikke imøtekommet.

### Når noen spør om samarbeid

Vi heier på folk som vil bygge sitt eget. Foreslå at de:
- Bygger sine egne scrapere fra de offentlige kildene
- Eventuelt deler venue-mapping (vi gjør gjerne det mot kreditering)
- Lenker tilbake til Gåri der det er relevant

Dette er trygt fordi: deres innsats blir kostbar uten å kopiere vår — som er målet hele veien.

---

## 4. Sjekkliste — er vi godt beskyttet?

- [x] `/[lang]/vilkar` publisert og lenket fra footer
- [x] `/vilkar` i sitemap
- [x] robots.txt-kommentar peker på vilkår
- [x] `is_canary`-kolonne i events-tabellen
- [x] Canaries filtrert fra hjemmeside, samlinger, sitemap, RSS, ICS
- [x] Event-detail-siden viser canary-banner
- [x] `scripts/canary-manage.ts` for å plante og fjerne
- [x] `scripts/canary-scan.ts` for å oppdage kopier
- [ ] Minst 2 canaries plantet (utestående — gjøres når du er klar)
- [ ] Skanne-cron satt opp (utestående — settes opp etter første canary)
- [ ] Wayback-arkivering av nøkkelsider månedlig (manuell rutine)

---

## 5. Hva som IKKE er beskyttelse

For å være ærlig om hva vi *ikke* har:

- **Vi blokkerer ikke scrapere teknisk.** Cloudflare-bot-deteksjon e.l. er ikke satt opp. Et tilstrekkelig motivert scraper kommer gjennom.
- **Vi watermarker ikke AI-beskrivelser systematisk.** Hver beskrivelse er unik fra Gemini, men det er ingen bevisst signatur i hver av dem.
- **Vi har ingen juridisk presedens.** Sui generis-vern for *vår* type database er sannsynlig, men ikke testet i rett. Verifiser med advokat før vi går i konfrontasjon.

Disse er mulige neste skritt hvis trusselen øker.
