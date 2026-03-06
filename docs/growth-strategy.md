# Gåri — Vekststrategi mot 10 000 brukere

**Basert på:** Kanalanalyse mars 2026
**Mål:** 5 000–10 000 månedlige brukere innen 12 måneder
**Tilnærming:** Tre søyler — teknisk SEO, studentpartnerskap, direkte distribusjon

---

## Sammendrag: de tre søylene

| Søyle | Kanaler | Potensial | Status |
|-------|---------|-----------|--------|
| **Teknisk SEO** | Event schema, EØS-karusell, tidsbaserte landingssider | ★★★★★ | Delvis bygd |
| **Studentkanaler** | Kvarteret, StudentBergen, Fadderuke | ★★★★★ | Ikke startet |
| **Direkte distribusjon** | iCal-feeds, nyhetsbrev, web push | ★★★★★ | Nyhetsbrev live |

De høyest-verdi tiltakene er **gratis** og krever kun utviklertid.

---

## Teknisk backlog (prioritert)

### P0 — Gjør nå (uke 1–2)

#### 1. Event JSON-LD perfeksjonering (4–8 timer)
Eventbrites case study: **100 % økning i trafikk** etter fullstendig Event schema.

Sjekkliste per arrangement:
- [ ] `priceCurrency: "NOK"` på alle arrangementer — **også gratisarrangementer** (manglende diskvalifiserer fra Google Events)
- [ ] `image` (absolutt URL, helst 1200x630+)
- [ ] `organizer` med `name` + `url`
- [ ] `location` med komplett `PostalAddress` (streetAddress, addressLocality, addressCountry)
- [ ] `offers` med `availability` og `validFrom`
- [ ] Valider via Google Rich Results Test og schema.org validator

#### 2. Google EØS-karusell (30 min)
Søk om deltakelse i Googles beta for Carousel structured data (ItemList-schema) — kun tilgjengelig i EØS-land. Viser scrollbar horisontal karusell i søkeresultatene.

- [ ] Fyll ut Googles «aggregator features interest»-skjema
- [ ] Implementer `ItemList`-schema på samlingssider (allerede delvis gjort i collections JSON-LD)

#### 3. iCal-feeds med kategorifiltre (8–16 timer)
**Killer feature**: abonner på Bergen-arrangementer direkte i Google/Apple Calendar. Mye «stickier» enn nyhetsbrev.

- [ ] Implementer `/api/calendar.ics?filter=all` (generell feed)
- [ ] Filtervarianter: `/api/calendar.ics?filter=music`, `?filter=free`, `?filter=students`, `?filter=family`
- [ ] `webcal://`-protokoll for one-click subscribe i Apple Calendar
- [ ] Google Calendar URL-integrasjon
- [ ] Eksponér på hjemmeside, samlingsider og om-side

> Merk: `/api/calendar.ics` finnes allerede med token-auth (intern prosjektkalender). Lag en **offentlig** feed på annen URL.

#### 4. Apple Business Connect (30 min)
Gratis, risikofritt, gir synlighet på 1,5+ milliarder Apple-enheter. Showcases-funksjon lar Gåri fremheve kommende arrangementer.

- [ ] Registrér på businessconnect.apple.com
- [ ] Legg til Showcases med aktuelle arrangementer

### P1 — Uke 3–6

#### 5. RSS-feeds som infrastruktur (2–4 timer)
- [ ] `/feed` (alle arrangementer, nyeste først)
- [ ] `/feed/concerts`, `/feed/free-events`, `/feed/students`
- [ ] Annonsér i `<head>` med `<link rel="alternate" type="application/rss+xml">`

#### 6. Web push via OneSignal (2–4 timer)
Gratis opp til 10 000 abonnenter. ~6 % opt-in-rate, 8,2 % klikkrate på kontekstuelle varsler.

- [ ] Sett opp OneSignal på gaari.no
- [ ] Automatisert «Nye arrangementer denne uken» hver torsdag
- [ ] «Ikke gå glipp av helgen» fredag ettermiddag
- [ ] GDPR-compliance: nettleserens native prompt = eksplisitt samtykke

#### 7. Blogginnhold for long-tail SEO (8–12 timer)
Ingen av de store aktørene har dynamisk oppdatert innhold for disse søkene:

- [ ] «Ting å gjøre i Bergen når det regner» (200+ regndager — massivt søkepotensial). Koble til `/no/regndagsguide/`.
- [ ] «Gratis ting å gjøre i Bergen» — koble til `/no/gratis/` og `/en/free-things-to-do-bergen/`
- [ ] «Student guide Bergen» / «Studentguide til Bergen» — koble til `/no/studentkveld/`
- [ ] «Julearrangementer i Bergen 2026» — sesongspesifikt, koble til `/no/julemarked/`

### P2 — Løpende

#### 8. Nyhetsbrev optimering
Nyhetsbrev er live (MailerLite, torsdag 10:00 CET). Optimaliseringsmuligheter:

- [ ] Aktiver referral-program i MailerLite (3 invitasjoner = tidlig tilgang neste uke)
- [ ] A/B-test emnelinjer for høyere åpningsrate
- [ ] «Staff pick» — én redaksjonell anbefaling per uke
- [ ] Vekstmål: 50–200 abonnenter mnd 1–3, 500–1 500 mnd 6–12

---

## Partnerskap og outreach (prioritert)

### Uke 3–4: PR-offensiv

| Handling | Kanal | Tid | Kostnad |
|----------|-------|-----|---------|
| Pitch til **kode24** (hei@kode24.no) — «Solo-utvikler scraper 50+ bergenskilder» | Presse | 2t | 0 |
| Pitch til **Studvest** (redaksjonen@studvest.no) — «Gratis event-guide for studenter» | Presse | 1t | 0 |
| Post på **r/Norge** og **r/Norway** — «jeg bygde dette»-format | Reddit | 2t | 0 |
| **Jodel Bergen** — organisk post om tjenesten | Jodel | 30 min | 0 |
| Opprett **Bluesky**-konto (@gaari.no eller @gaari) | Bluesky | 1t | 0 |

**Sterkeste PR-vinkler:**
- kode24: teknisk hobbyprosjekt — AI-kategorisering, 56 scrapers, SvelteKit
- BT/BA: «Bergens svar på 'hva skjer?' — når Facebook Events ikke er nok»
- Studvest: praktisk verktøy for studenter, gratis
- Life in Norway: tospråklig tourist-vinkel

### Uke 5–8: Studentkanaler

| Handling | Kanal | Tid | Kostnad |
|----------|-------|-----|---------|
| Kontakt **Kvarteret** — dataintegrasjon/partnerskap | Partnerskap | 2t | 0 |
| Registrér på **StudentBergen.no** | Distribusjon | 1t | 0 |
| Kontakt **Sammen** (Studentsamskipnaden) — foreningsportal-integrasjon | Partnerskap | 2t | 0 |
| Kontakt **fadderkomitéer** UiB, NHH, HVL for august-partnerskap (start april–mai!) | Distribusjon | 3t | 0 |

> **Kvarteret**: 2 200+ arrangementer/år, 1 500 kapasitet, 9 scener, ~400 frivillige. En vinn-vinn: Gåri får massivt innhold, Kvarteret får distribusjon.

> **Fadderuken** (uke 33, august): 10 000–15 000 studenter samlet på Koengen. **Fadderkomitéene planlegger fra april–mai** — kontakt dem nå for å bli inkludert i velkomstmateriell.

### Uke 5–8: Institusjonelle kanaler

| Handling | Kanal | Tid | Kostnad |
|----------|-------|-----|---------|
| Kontakt **Bergen Kommune Kulturetaten** — «digital kulturkalender»-vinkel | Institusjonell | 2t | 0 |
| Kontakt **Visit Bergen** — datadelingsforslag (ikke standard medlemskap) | Partnerskap | 3t | 0 |
| Kontakt **Life in Norway** (David Nikel) — content-partnerskap | Innhold/backlinks | 1t | 0 |
| Kontakt **Heart My Backpack** (Silvia), **Fjords & Beaches** | Backlinks | 2t | 0 |

> **Bergen Kommune**: kommunens digitaliseringsstrategi 2021–2025 forplikter seg eksplisitt til åpne data for nye tjenester. Gåri løser et dokumentert behov. Kontakt: Allehelgens gate 5.

> **Visit Bergen**: ikke standard medlemskap (13 440 NOK/år). Foreslå datadeling — Gåri aggregerer fra 50+ kilder og kan berike deres kalender.

### Uke 9–12: B2B og bransje

| Handling | Kanal | Tid | Kostnad |
|----------|-------|-----|---------|
| **Bergen Næringsråd** — studentmedlemskap | Nettverk | 1t | 450 NOK |
| Kontakt **BRAK** (Musikkontoret) — musikkbransjeintro | B2B | 2t | 0 |
| Direkte venue-outreach: USF Verftet, Kulturhuset, Hulen, Bergen Kjøtt | B2B | 6–8t | 0 |
| Presentér Gåri på Bergen tech-meetup (javaBin, Nerdschool, ML) | Tech community | 4t | 0 |
| Pilot **Google Ads** turismesong mai–september (torsdag–søndag, Bergen) | Betalt | 4t | 1 000–2 000 NOK |
| QR-kode-klistremerker for studentboliger, kaféer, bibliotek | Fysisk | 2t | 200–500 NOK |

> **Vill Vill Vest** (november): Bergens musikk- og bransjekonferanse. Det beste enkelt-B2B-arrangementet for Gåri. Konferansepass ~2 000–3 000 NOK.

---

## Søkeord å eie

### Norsk (prioritert)
| Søkeord | Anslått volum | Nåværende dekning |
|---------|--------------|------------------|
| hva skjer i bergen | 5 000–12 000/mnd | `/no/guide/` |
| hva skjer i bergen i dag | Høy (long-tail) | `/no/i-dag/` |
| hva skjer i bergen denne helgen | Høy (long-tail) | `/no/denne-helgen/` |
| gratis arrangementer bergen | Middels | `/no/gratis/` |
| konserter bergen | 1 500–4 000/mnd | `/no/konserter/` |
| ting å gjøre i bergen når det regner | Lav konkurranse | `/no/regndagsguide/` |
| studentarrangementer bergen | Lav konkurranse | `/no/studentkveld/` |

### Engelsk (turisttrafikk ~1 million besøkende/år)
| Søkeord | Anslått volum | Nåværende dekning |
|---------|--------------|------------------|
| things to do in bergen | 3 000–8 000/mnd | `/en/guide/` |
| free things to do in bergen | Middels | `/en/free-things-to-do-bergen/` |
| things to do in bergen this weekend | Long-tail | `/en/this-weekend/` |
| bergen events | Middels | `/en/` |
| things to do in bergen when it rains | Lav konkurranse | Bloggpost mangler |

---

## Hva som ikke er verdt å prioritere

| Kanal | Begrunnelse |
|-------|-------------|
| TikTok | 3–5 poster/uke, lav link-ut-rate, soloutvikler-kostnad for høy |
| Discord (ny server) | Ingen Bergen-community Discord finnes. Kan ikke moderere alene. |
| Google Business Profile | Gråsone for aggregator, suspensjonsrisiko. Bruk Event schema i stedet. |
| Hacker News | Lokale aggregatorer får 0–3 poeng. Kun teknisk bloggpost har sjanse. |
| Nextdoor | Ikke tilgjengelig i Norge. |
| Finn.no | Ingen event-listingseksjon. |
| Betalt SEM (nå) | 5–10 NOK CPC = 200–400 klikk/2 000 NOK. For lite volum for ML. Utsett til direkteinntekter. |

---

## Vekstmål og milepæler

| Måned | Brukere/mnd | Nyhetsbrev | Nøkkelmilestep |
|-------|-------------|------------|----------------|
| Mars 2026 | ~500 | ~50 | Event schema + iCal live |
| April 2026 | ~800 | ~100 | Kvarteret-partnerskap + kode24-dekning |
| Mai 2026 | ~1 200 | ~200 | Visit Bergen-samtale, SEO begynner å virke |
| Juni 2026 | ~1 800 | ~300 | Turistsesong + Fadderuke-forberedelse |
| August 2026 | ~2 500 | ~500 | Fadderuke-tilstedeværelse |
| Oktober 2026 | ~4 000 | ~800 | Høstkulturses. + Vill Vill Vest |
| Februar 2027 | ~8 000 | ~1 500 | SEO og partnerskap akkumulert |

---

## Kanalkart (ROI per innsatsenhet)

```
Høyt potensial, lav innsats:
  ✓ Event JSON-LD perfeksjonering
  ✓ Google EØS-karusell-søknad
  ✓ Apple Business Connect
  ✓ kode24-pitch
  ✓ Studvest-pitch

Høyt potensial, middels innsats:
  → iCal-feeds med kategorifiltre
  → Kvarteret-partnerskap
  → StudentBergen-registrering
  → Fadderuke-forberedelse (start april!)
  → Blogginnhold for long-tail SEO

Middels potensial, lav innsats:
  → r/Norge og r/Norway-post
  → Bluesky-konto
  → Jodel Bergen

Langsiktig investering:
  → Visit Bergen datadeling
  → Bergen Kommune Kulturetaten
  → Vill Vill Vest B2B
  → Life in Norway / reisebloggere
```

---

*Dokument opprettet: 2026-03-06*
*Basert på: Kanalanalyse «Gåris vei til 10 000 brukere»*
*Neste revisjon: etter 90-dagerspunktet (juni 2026)*
