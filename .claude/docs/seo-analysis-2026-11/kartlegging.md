# Hva vi må kartlegge for å få en gjennomtenkt SEO-strategiplan

Skrevet 12. november 2026, etter søkeordsoversikten og gapsanalysen (`README.md` i samme mappe). Dette er en liste over hva som mangler for å kunne velge, ikke selve planen. Hvert punkt har: spørsmålet, hvorfor det styrer strategien, hvor dataene finnes og hva det koster.

**Rekkefølge:** A og B først, fordi de avgjør hvilke av de andre som er verdt tiden. C til F kan gjøres i parallell. G er til slutt, fordi den bruker alt det andre.

## A. Hvem vi er til for (avgjør alt annet)

| Spørsmål | Hvorfor | Kilde | Kostnad |
|---|---|---|---|
| Hvilke grupper bruker Gåri i dag? | Strategien bør bygge på dem som alt kommer, ikke på gjetning | Umami (enhet, land, side, tid), `venue_clicks`, nyhetsbrevets preferansegrupper i MailerLite (språk, aldersgruppe, kategori), `?utm`-kilder | lav, data finnes |
| Hvilke grupper finnes i Bergen og hvor store er de? | Viser størrelsen på det vi kan vokse mot | SSB (innvandrerbefolkning, alder), UiB og HVL (internasjonale studenter), kommunen, Visit Bergen (turisttall) | middels, websøk via underagent, verifiser tallene selv |
| Hva trenger hver gruppe som vi kan gi? | En gruppe uten behov Gåri dekker er ikke en nisje | søkeord per gruppe (autoforslag, Search Console), Facebook-grupper de bruker (ekspat, studenter, polsk, ukrainsk), spørsmål på Reddit r/bergen (les, ikke post, jf. regelen om Reddit) | middels |
| Hva har retningen sagt? | Strategien skal ikke stride mot «Retning» i `OVERLEVERING.md` | `OVERLEVERING.md`, § «Retning» | lav |

Avgjørelse hun må ta etter A: hvilke 2 til 3 grupper vi prioriterer. Ikke flere, ellers blir det spredt.

## B. Hva målet er (ellers vet vi ikke hva «bedre» betyr)

- Er målet klikk fra Google, utklikk til arrangør, nyhetsbrevabonnenter, eller omtale fra andre? Det er fire ulike strategier.
- **Hva er en vellykket 2027?** Et tall hun kan stå inne for. I dag: ca. 100 klikk per dag fra Google, 240 abonnenter, 11,8 % av økter klikker ut (september). Spør henne hva hun vil ha mer av.
- Hvilket mål har inntektsmodellen? «Business model» i `CLAUDE.md` strider mot «Retning» (åpen sak siden 30. sept). Uten svar vet vi ikke om trafikk skal selges til arrangører eller bare gi dem synlighet.

## C. Hva vi har og hva som virker (innsiden)

1. **Sidetyper mot utfall.** Forside, samlesider, arrangementssider, scenesider: klikk, visninger, indeksering, og utklikk per type. September-analysen har tall for 90 dager; oppdater med november.
2. **Hvorfor forsiden tar alt.** De tre største søkene lander på `/no`. Er det bra (sterk side) eller skjult sårbarhet? Sjekk hva som skjer hvis Google bytter målside.
3. **Indeksdekning.** September: 58 % av arrangementssidene i utvalget. Hvor mange av 2 000+ sider ligger utenfor Google? URL-inspeksjon i utvalg, og sitemap mot indeks.
4. **Engelsk side.** Hvor stor del av engelske samlesider er indeksert (åpen sak: Bing-sjekk). Forklarer #16 mot #17 i AI-matrisen.
5. **Sesongkurven.** Juni ga 4 360 klikk, juli 1 355. Når kommer toppene i 2027 (nyttårsaften, sankthans, 17. mai, jul, festivalene), og hvilke sider må være klare hvor lenge før? `seasonal-seo-calendar.md` finnes; sjekk at den dekker nov 2026 til des 2027.
6. **Tekniske hindringer.** Core Web Vitals, ISR-forsinkelse (en time på event-sider), canonical og hreflang mellom `/no` og `/en`. Lighthouse-resultatet er ikke lest (åpen sak).

## D. Hva konkurrentene gjør (utsiden)

1. **SERP-analyse for de 10 viktigste søkene** (ikke gjort): hvem står over oss, hvilket format (kalender, liste, guide), hvilke SERP-funksjoner (arrangementskarusell, «folk spør også»). Websøk, ikke Google-bruk fra koden.
2. **Konkurrentenes dekning:** visitbergen.com (konkurrent, jf. minnet), bergenlive.no, altskjer.no, norskekalendere.no, ibergen.no, kulturikveld.no. Hva dekker de som vi ikke gjør, og omvendt? Er noen kataloger vi kan stå i i stedet for å konkurrere?
3. **Backlinkgap.** Hvem lenker til dem og ikke til oss? Gratis kilder: Bing Webmaster (backlinks), Ahrefs gratisverktøy for egne sider, manuell sjekk. Ikke betalte verktøy (regel).
4. **Internasjonale aktører** for de språkgruppene vi velger: hvem rangerer på «bergen veranstaltungen heute» eller «bergen events international»?

## E. Hvordan folk faktisk søker (etterspørselen)

1. **Long-tail utover det vi alt vises på.** Search Console viser bare det vi vises for. Autoforslag på flere hundre frø, per gruppe fra A (f.eks. «bergen for internasjonale studenter», «ting å gjøre i bergen for tilflyttere»), gir ordene men ikke volumet. Volum er usikkert uten betalte verktøy; si det i planen.
2. **Spørsmålsformer.** «Når er …», «hvor kan jeg …», «hva koster …». Dette er formen i AI-spørsmål også. Kartlegg hvilke spørsmålsmønstre som gir treff i autoforslag og «folk spør også».
3. **Chatbot-søk.** Hvilke spørsmål gir oss sitat, og hvem sitert i stedet (matrisen har dette for ChatGPT, én kjøring). Mangler Perplexity, Gemini og Google AI. Desemberrunden dekker det.
4. **Lokalt søk.** Google Maps og Business Profile: har Gåri en profil, og trenger vi en? Ikke undersøkt. Usikkert om det passer for en nettside uten fast adresse.

## F. Autoritet og omtale (det som flytter AI-synlighet)

Matrisen konkluderer med at tillit mangler, ikke sider. Kartlegg:
1. Alle lenker vi har i dag, og fra hvem (litthusbergen.no, studentbergen.no, arrangører).
2. Mulige lenkemål med realistisk sjanse: bergen.kommune.no/hvaskjer, samfunnetibergen.no, UiB-sider for studenter, utlendingsrettede sider (kommunens og UiBs internasjonale sider), foreninger for grupper fra A.
3. Hva vi kan tilby i bytte: data om kommende arrangementer, en widget, en felles side. Hva er lovlig? Regel: ingen trafikk til aggregatorer og ingen kopiert tekst.
4. Merkenavnet «Gåri». ChatGPT kjenner det ikke. Plan for hvor navnet nevnes sammen med «Bergen» og «arrangementer».

## G. Strategiplanen selv (bruker alt over)

Planen bør svare på sju ting, og bare det:
1. Mål og måltall for 2027 (fra B).
2. 2 til 3 målgrupper (fra A).
3. Per gruppe: sider vi lager eller endrer, og søk de skal ta (fra E, D).
4. Sesongkalender med frister (fra C5).
5. Tekniske tiltak med rekkefølge (fra C).
6. Omtale- og lenkeplan (fra F).
7. Måling: hvilket tall sjekkes når, og hva som får oss til å bytte kurs. Tall som følger datamengden måles som andel, ikke antall (jf. `CLAUDE.md`).

## Det vi ikke kan vite herfra

- Søkevolum for ord vi ikke vises på (krever betalt verktøy eller Google Keyword Planner via konto).
- Hvordan Perplexity, Gemini og Google AI svarer (må kjøres av henne eller via nettleser, en motor om gangen).
- Hvem som faktisk bor i Bergen med interesse for Gåri: SSB gir størrelser, ikke interesse. Interessen må måles på sikt via Umami og nyhetsbrevets valg.
- Om en språknisje lønner seg uten et forsøk. Planen bør foreslå et lite, tidsavgrenset forsøk (f.eks. tre tyske sesongsider) med en forhåndssatt terskel.

## Forslag til rekkefølge på arbeidet

1. A (gruppene) og B (målet): én økt, avsluttes med at hun velger.
2. C, D og E: to til tre økter, kan deles, hver for seg og med kort sammendrag.
3. F: én økt, hun må godkjenne all kontakt (aldri send før hun har sett teksten).
4. G: én økt, Opus (strategi og arkitekturvalg).
