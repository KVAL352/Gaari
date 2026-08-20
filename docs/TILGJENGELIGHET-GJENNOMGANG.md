# Tilgjengelighet: gjennomgang og gjenstående arbeid

Skrevet 20. august 2026, etter en gjennomgang av koden i forbindelse med
porteføljesida til Kval Studio. Bakgrunnen er at casesida skal kunne si at Gåri
oppfyller WCAG 2.2 AA fullt ut. Da må det være sant hele veien, ikke nesten.

Fasit for hva som allerede er bygget inn er
`src/routes/[lang]/tilgjengelighet/+page.svelte`, som er den publiserte
erklæringen.

## Bekreftet på plass

| Område | Hvor det ligger |
|---|---|
| WCAG 2.2 AA og EAA erklært | `[lang]/tilgjengelighet/+page.svelte` |
| Farge aldri eneste signal | `StatusBadge.svelte`: farge + Lucide-ikon + ord + `aria-label` på alle seks merketyper |
| Hopp til innhold | `.skip-link` i `app.css:246` |
| Synlig fokus | `:focus-visible`, 2 px, `app.css:251` |
| Målt kontrast | 7,88:1, 6,96:1, 7,01:1, publisert i erklæringen |
| Tastaturmønster | Kalendermenyen følger WAI-ARIA: piltaster, Home/End, Escape gir fokus tilbake |
| ARIA | 51 `aria-label`, `aria-live="polite"`, `aria-required` på alle påkrevde skjemafelt |
| Trykkflater | Minst 44×44 px, WCAG 2.5.8 |
| Språkattributt | `lang` på `<html>` følger språkvalget, nb og en |
| Redusert bevegelse | `prefers-reduced-motion` i `app.css:262` og i `EventCard.svelte` |
| Lenker | Alltid understreket, ikke bare ved hover, WCAG 1.4.1 |

## Gjennomført 20. august 2026

**1. Gjennomgang uten mus — gjort, to feil rettet.**
Tastaturreisen ble kjørt med et skript som trykker Tab og noterer hvor fokus
faktisk havner. Fokusrekkefølgen følger sida, ingen fokusfeller, ingen elementer
uten fokusring, og ingen unåbare kontroller. To feil:

- Hopp-lenken flyttet ikke fokus. `href="#events"` flyttet bare rullingen, og
  `document.activeElement` ble `<body>`. Chrome lot neste Tab fortsette fra
  fragmentet, saa det saa ut til aa virke, men fokus stod ingen steder og en
  skjermleser fikk ingen ny posisjon aa annonsere. `<main>` har naa `tabindex="-1"`.
- Escape i søkefeltet mistet fokus. Aa lukke søket fjerner `<form>` med det
  fokuserte feltet fra DOM. Fokus føres naa tilbake til søkeknappen.

Kalendermenyen ble kontrollert mot paastanden i erklæringen og oppfyller den
fullt ut: piltaster, Home, End, ombrytning og Escape med fokus tilbake.

**2. Gjennomgang med skjermleser — ikke gjort.**
NVDA og VoiceOver kan ikke kjøres i dette miljøet, og resultatet er lyd som
ingen her kan høre. Punktet staar aapent. Tilgjengelighetstreet er kontrollert i
stedet, altsaa navn, roller og tilstander slik hjelpemidler leser dem, men det
er ikke det samme som aa høre hva NVDA faktisk sier.

**3. Test som stopper bygget — paa plass.**

- `e2e/a11y.spec.ts` — Playwright med axe-core over seks sider, i lys og mørk
  modus, pluss aapne tilstander (søkefelt, kalendermeny). I tillegg eksplisitte
  fokustester for de to feilene over, siden axe ikke ser fokushaandtering.
- `src/lib/__tests__/contrast.test.ts` — leser tokenene ut av `app.css` og regner
  kontrast for tekst og alle seks merketypene i begge moduser. Kontrollerer ogsaa
  at tallene i den publiserte erklæringen stemmer med tokenene.
- Koblet inn i CI etter byggesteget. Rapporten lastes opp naar noe feiler.

Testene kjører med en Supabase-URL som ikke svarer, saa rutene faller tilbake
paa `seedEvents`. Det gir de samme 18 arrangementene hver gang, med alle seks
merketypene representert.

### Feil funnet og rettet

| Hva | Hvor | Fant |
|---|---|---|
| Rød tekst 3,45:1 mot mørk bakgrunn | alle røde lenker i mørk modus | axe |
| «Trolig gratis» 2,90:1 | `--color-free` med hvit tekst, mørk modus | axe |
| «Gåri-uka» 4,45:1 | `bg-white/90` slapp bildet bak gjennom | axe |
| Hopp-lenken flyttet ikke fokus | `+layout.svelte` | manuelt |
| Escape mistet fokus | `Header.svelte` | manuelt |
| Fire felt manglet `aria-required` | nyhetsbrevskjemaene | manuelt |

Alle tre kontrastbruddene fantes bare i mørk modus. Det er grunnen til at ingen
hadde sett dem, og grunnen til at begge testene kjører i begge moduser.

Aksentfargen maatte deles i to. Én rødfarge kan ikke baade vaere lesbar som
tekst mot `#121212` og baere hvit tekst som knappeflate: det første krever
luminans over 0,226, det andre under 0,183. `--color-accent` er lysnet til
`#EF6B6B` i mørk modus, mens `--color-accent-fill` beholder `#C82D2D`.

### Rettet i erklæringen

- Kontrasttallene var feil. Paastanden var 7,88 / 6,96 / 7,01. Maalt: 13,6 / 7,5
  / 5,9 som laveste verdi paa tvers av lys og mørk modus.
- «Alle klikkbare elementer er minst 44×44 px (WCAG 2.5.8)» var feil to ganger.
  Flere maal er mindre, og 44×44 hører til SC 2.5.5 paa nivaa AAA. SC 2.5.8 er
  AA-kriteriet og krever 24×24, med unntak for lenker i løpende tekst.
- «Alle nødvendige skjemafelt har `aria-required`» stemte ikke for fire felt.
  Feltene er rettet, ikke setningen.

### Ikke gjort

**1. Skjermlesergjennomgang.** NVDA og VoiceOver kan ikke kjøres i agentmiljøet,
og resultatet er lyd ingen der kan høre. Tilgjengelighetstreet er kontrollert i
stedet — navn, roller og tilstander slik hjelpemidler leser dem — og det var
slik de fire manglende `aria-required` ble funnet. Men det er ikke det samme som
å høre hva NVDA faktisk sier, og punktet er ikke avhaket.

Det som gjenstår er én gjennomgang av forsiden, ett arrangementskort og
innsendingsskjemaet, med notat om hva som leses opp. Særlig verdt å lytte etter:
om merkene gir mening uten farge, om filterknappenes `aria-pressed` annonseres
som av/på, og om «Legg til i kalender»-menyen oppfører seg som en meny.

**2. `<code>`-taggene på erklæringssida vises som råtekst.** Avsnittene
«Semantisk HTML og landemerker», «Dynamisk språkattributt» og «ARIA-attributter»
skriver ut `<code>&lt;header&gt;</code>` bokstavelig i stedet for å formatere
det. Strengene inneholder markup, men skrives ut med `{...}` i Svelte, som
escaper HTML. Feilen er eldre enn denne gjennomgangen og er synlig i begge
fargemoduser. Den ble oppdaget ved å ta skjermbilde, ikke ved å lese koden.

Ingen av disse to ligger i `scripts/reminders.json`. Den fila tilhørte en annen
økt da dette ble skrevet, og skulle ikke røres. De bør legges inn der.

### Verdt aa vite

`hooks.server.ts` 301-omdirigerer enhver vert som ikke er `gaari.no` eller
`localhost`. Med `127.0.0.1` i Playwright-oppsettet kjørte hele suiten mot
produksjonssiden uten aa si fra. Det er en felle for enhver som setter opp en
lokal server paa noe annet enn `localhost`. En egen test vokter det naa.

## Kjent begrensning, allerede publisert

Alternativtekst på arrangementsbilder genereres fra tittel og sted, siden bildene
hentes automatisk fra kildesidene. Erklæringen sier dette selv.

---

## Prompt til Gåri-agenten

Les `docs/TILGJENGELIGHET-GJENNOMGANG.md` først. Den sier hva som allerede er
bekreftet på plass, og hva som gjenstår. Oppgaven din er de tre punktene under
«Gjenstår», i den rekkefølgen. Ikke bygg om noe som allerede virker.

**1. Gjennomgang uten mus.** Gå gjennom hele reisen med kun tastatur: forside,
filter, arrangementskort, arrangementsside, innsendingsskjema, språkbytte og
nyhetsbrevpåmelding. Skriv ned hva som faktisk skjer, ikke hva som burde skje.
Se etter fokus som forsvinner, fokusfeller, elementer som ikke kan nås, og
rekkefølge som ikke følger sida. Rett det du finner.

**2. Gjennomgang med skjermleser.** Kjør NVDA eller VoiceOver over forsiden, ett
arrangementskort og innsendingsskjemaet. Noter hva som leses opp, særlig om
merkene, filterknappene og skjemafeltene gir mening uten skjerm. Rett det som er
uforståelig. Er en skjermleser ikke tilgjengelig i miljøet ditt, si fra i stedet
for å gjette, og gjør punkt 1 og 3 ferdig.

**3. Test som stopper bygget.** Legg inn `axe-core` i en Playwright-test over
fire representative sider: forsiden, en samleside, en arrangementsside og
innsendingsskjemaet. Testen skal feile ved brudd på WCAG 2.2 AA. Koble den inn i
CI på samme måte som de andre testene. Alt annet som er viktig i dette
prosjektet er bundet til en test, og dette er ikke.

**Regler.**

- `src/routes/[lang]/tilgjengelighet/+page.svelte` er en publisert erklæring med
  tilsynsorgan oppgitt. Den skal kun si det som er sant. Finner du noe der som
  ikke stemmer, rett erklæringen, ikke bare koden.
- Kontrasttallene i erklæringen (7,88:1, 6,96:1, 7,01:1) skal måles på nytt mot
  gjeldende tokens. Stemmer de ikke, oppdater tallene.
- Endrer du en `--funkis-*`-verdi, sjekk kontrasten på nytt før du lagrer.
- Ingen nye avhengigheter utover det punkt 3 krever.

**Rapporter tilbake** med hva du fant, hva du rettet, og hva du ikke fikk gjort.
Fant du ingenting på et punkt, si det rett ut. Casesida i porteføljen skal kunne
si at Gåri oppfyller WCAG 2.2 AA fullt ut, og det skal være sant.
