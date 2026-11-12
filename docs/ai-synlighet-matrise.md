# AI-synlighet: matrise og arbeidsstrategi

Opprettet 2026-11-12. Erstatter ikke minnenotatet `ai-search-status.md`, men gir en fast metode for å finne svakhetene. Kjøres månedlig. Ingen betalte verktøy.

## Tre lag, sjekkes i rekkefølge

1. **Finner de oss?** Crawlere, indeksering, strukturert data.
2. **Nevner de oss?** Matrisen under.
3. **Stoler de på oss?** Hvem siteres i stedet, og hvilke lenker har vi.

## Lag 1: målt 2026-11-12

| Sjekk | Resultat | Merknad |
|---|---|---|
| robots.txt | 17 User-agent-linjer, GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot og Google-Extended har `Allow: /` | Sett live på gaari.no |
| llms.txt | 200, 9 550 byte | |
| llms-full.txt | 200, 14 476 byte | |
| Crawlere i Vercel-loggene | IKKE SJEKKET | Å ha lov er ikke det samme som å bli besøkt |
| Bing-indeksdekning | IKKE SJEKKET | Bing Webmaster, manuelt |
| JSON-LD stemmer med siden | IKKE SJEKKET denne gangen | Sist verifisert i mai |

## Lag 1b: AI-henvisninger i Umami (28 dager mot 28 før)

Referrer-målingen (hver kilde er tall fra Umami, 28 dager til 2026-11-12):

| Kilde | Siste 28 | 28 før |
|---|---|---|
| chatgpt.com | 1 | 12 |
| perplexity.ai | 1 | 0 |
| gemini.google.com | 3 | 3 |
| search.brave.com | 6 | 7 |
| kagi.com | 0 | 2 |

Hendelsen `ai-referral` (som også fanger besøk med strippet referrer) siste 28 dager: chatgpt.com 5, gemini.google.com 3, perplexity.ai 1.

Å merke seg:
- ChatGPT falt fra 12 til 1 på referrer-målingen. Tallene er små, så en tilfeldig svingning er mulig, men det er det største enkeltfallet og det bør forklares.
- De to målingene gir ulike tall for ChatGPT (1 mot 5). Det passer med cookie-fallbacken i `app.html`, men er ikke undersøkt.
- Brave Search er en søkemotor med AI-svar. Om den skal regnes som AI-kilde er et valg, ikke et faktum.
- Totalen er under 20 besøk av ca. 6 000. AI er ikke en trafikkilde ennå.

## Lag 2: spørringsmatrise (fylles ut manuelt)

Kjør hvert spørsmål to ganger per motor. Skriv N (nevnt uten lenke), S (siteres med lenke) eller 0 (fraværende). Skriv også alle andre domener som siteres, også når Gåri er nevnt. Kolonnen «Hvem i stedet» er konkurrentkartet: telles opp per spørsmålsgruppe i lag 3.

| # | Gruppe | Spørsmål | ChatGPT | Perplexity | Gemini | Google AI | Hvem i stedet |
|---|---|---|---|---|---|---|---|
| 1 | Bred | Hva skjer i Bergen i helgen? | S | | | | norskekalendere.no |
| 2 | Bred | Hva skjer i Bergen i kveld? | 0 | | | | ibergen.no |
| 3 | Bred | Arrangementer i Bergen | 0 | | | | visitbergen.com, bergenlive.no, olebullhuset.no |
| 4 | Bred | Things to do in Bergen this weekend | 0 | | | | ingen kildelenker utenom kart (mapbox.com) |
| 5 | Bred | Events in Bergen this month | 0 | | | | en.visitbergen.com, bergenlive.no, i-bergen.no, encoretrail.com |
| 6 | Kategori | Gratis ting å gjøre i Bergen | 0 | | | | ingen kildelenker utenom kart (mapbox.com) |
| 7 | Kategori | Konserter i Bergen | 0 | | | | visitbergen.com, bergenlive.no, konserterinorge.no |
| 8 | Kategori | Barnevennlige arrangementer i Bergen | 0 | | | | visitbergen.com, altskjer.no, kulturikveld.no |
| 9 | Kategori | Teater i Bergen | 0 | | | | visitbergen.com |
| 10 | Kategori | Quiz i Bergen | 0 | | | | oconnors.no, altskjer.no |
| 11 | Kategori | Studentarrangementer i Bergen | S | | | | samfunnetibergen.no, studentbergen.no, + én lenke som ikke kunne leses |
| 12 | Kategori | Jazz i Bergen | 0 | | | | bergenjazzforum.no, jazzinorge.no |
| 13 | Kategori | Free things to do in Bergen | 0 | | | | mapbox.com, + én lenke som ikke kunne leses |
| 14 | Kategori | Live music in Bergen | 0 | | | | ticketmaster.no, + én lenke som ikke kunne leses |
| 15 | Sesong | Julemarked i Bergen | 0 | | | | ingen kildelenker |
| 16 | Sesong | Nyttårsaften i Bergen | S (2 av 2) | | | | visitbergen.com, altskjer.no, norwaysbest.com, bergen.26north.no |
| 17 | Sesong | New Year's Eve in Bergen | 0 | | | | floyen.no, norwaysbest.com, + to lenker som ikke kunne leses |
| 18 | Sesong | Christmas markets in Bergen | 0 | | | | bergenjulemarked.no, en.visitbergen.com, de.visitbergen.com |
| 19 | Sesong | Nattjazz Bergen | 0 | | | | nattjazz.no (bare arrangøren) |
| 20 | Sted | Hva skjer på Hulen? | 0 | | | | hulen.ticketco.events (bare arrangøren) |
| 21 | Sted | Hva skjer i Grieghallen? | 0 | | | | grieghallen.no (bare arrangøren) |
| 22 | Sted | Hva skjer i Åsane? | 0 | | | | ingen kildelenker |
| 23 | Bydel | Hva skjer i Sentrum Bergen i dag? | S | | | | visitbergen.com, kulturikveld.no (Gåri først i kildelista: «Gåri – arrangementer i sentrum») |
| 24 | Arrangør | Hvor kan jeg annonsere arrangementet mitt i Bergen? | 0 | | | | visitbergen.com, myguidebergen.com, sammen.no, samfunnetibergen.no, bergen.kommune.no |
| 25 | Arrangør | Hvordan få arrangementet mitt inn i en kalender i Bergen? | 0 | | | | visitbergen.com, bergensentrum.no, norskekalendere.no |
| 26 | Arrangør | Where do I list my event in Bergen? | 0 | | | | visitbergen.com, myguidebergen.com, ticketco.events, facebook.com, norskekalendere.no |
| 27 | Merke | Hva er Gåri? | 0 | | | | ingen; ChatGPT kjenner ikke navnet og spør hva det er |
| 28 | Merke | gaari.no Bergen events | S | | | | bare gaari.no; beskrivelsen stemmer («free event calendar», «more than 60 local sources») |

Spørsmålene 15–23 er hentet fra sidene som faktisk får trafikk (julemarked, nyttårsaften, nattjazz, venue-sider, bydel). De viser om AI-svarene sender folk dit vi alt ranker.

### Kjøringslogg og metode

- 2026-11-12, ChatGPT, innlogget konto i midlertidig chat (ikke i historikken, men «Personlig tilpasset» var på og kan farge svarene). Én kjøring per spørsmål så langt, ikke to.
- Spørsmål 1: Gåri siteres med lenke og tekst («Gåri – 92 arrangementer i Bergen»). Spørsmål 2: ikke nevnt, ibergen.no siteres.
- Metode som virker: `chatgpt.com/?temporary-chat=true&q=<spørsmål>` fyller feltet, men sender ikke. Trykk Enter, vent ca. 18 sekunder, og les svaret med JS (`main` innerText og lenkedomener). Kostnad ca. 2 000 tokens per spørsmål, så ta noen få om gangen.
- 2026-11-12 (økt 2), ChatGPT, samme oppsett: spørsmål 6 til 10, én kjøring hver. Gåri fraværende på alle fem. Domener lest fra lenkene i `main`; kildeknapper uten lenke fanges ikke.
- 2026-11-12 (økt 2), spørsmål 11 til 15: Gåri siteres på 11 (studentarrangementer, gaari.no-lenke). Noen lenker kom ut som «[BLOCKED: JWT token]» fra nettleserverktøyet; domenet er ukjent. Lærdom: maks to spørsmål per batch, fem ble tidsavbrutt og kolliderte med neste batch.
- 2026-11-12 (økt 2), spørsmål 16 til 20: Gåri siteres på 16 begge gangene («Program og informasjon»). Ingen treff på engelsk nyttårsaften. Leseren returnerer nå også lenketeksten; da forsvant «[BLOCKED: JWT token]»-problemet.
- 2026-11-12 (økt 2), spørsmål 21 til 28: Gåri siteres på 23 og 28. Lenkene leses best som `lenketekst @ domene`; bare vertsnavnet blir av og til «[BLOCKED: JWT token]» i verktøyet.
- Fremgangsmåten fra første forsøk: ikke klikk på koordinater i ChatGPT-forsiden. Et klikk utløste Googles innloggingsflyt til OpenAI (avbrutt, ingenting godkjent). Bruk `find` og referanser.

### Opptelling etter første runde (ChatGPT, 2026-11-12)

Gåri siteres på 5 av 28: #1 helgen, #11 studentarrangementer, #16 nyttårsaften (2 av 2), #23 sentrum i dag, #28 domenenavnet. Én kjøring per spørsmål utenom #16.

Domener som siteres der Gåri også kunne vært svaret (arrangørenes egne sider og kart utelatt):

| Domene | Antall spørsmål |
|---|---|
| visitbergen.com (inkl. en./de.) | 11 |
| bergenlive.no | 3 |
| altskjer.no | 3 |
| norskekalendere.no | 3 |
| myguidebergen.com | 2 |
| norwaysbest.com | 2 |
| kulturikveld.no | 2 |
| ibergen.no / i-bergen.no | 2 |
| samfunnetibergen.no | 2 |

Funn å tolke (ikke tolket ennå):
- Arrangørspørsmålene (#24 til #26): Gåri er fraværende på alle tre. `ai-search-status.md` sier ChatGPT anbefalte Gåri til arrangører i august. Det holder ikke nå, eller var tilfeldig.
- «Hva er Gåri?» (#27): ChatGPT kjenner ikke navnet. Med domenet (#28) er beskrivelsen riktig. Merkenavnet er svakt, domenet sterkt.
- Spørsmål om ett sted eller én festival (#19 til #21) gir bare arrangørens egen side. Lite å vinne der.
- Norsk og engelsk spriker: #16 S, #17 0.

## Lag 3: autoritet

Etter at matrisen er fylt ut:
1. Tell hvilke domener som siteres oftest i svarene der vi mangler.
2. Sammenlign med backlinkene vi har (litthusbergen.no, studentbergen.no) og målene på lista (bergen.kommune.no/hvaskjer, 1881-katalogen).
3. Velg 3 til 5 tiltak. Ikke flere.

### Tiltak etter første runde (2026-11-12)

Grunnlaget er tynt: én motor, én kjøring per spørsmål, innlogget konto. Tiltakene under er valgt fordi de er billige og ikke kan skade, ikke fordi matrisen beviser at de virker.

**Vi har sidene, vi mangler tilliten.** Gåri har egne samlingssider for de fleste spørsmålene vi tapte: gratis (#6, #13), konserter (#7), teater (#9), quiz (#10), julemarked (#15, #18), engelsk nyttårsaften (#17). Svaret er altså ikke flere sider. Unntakene er jazz (#12) og «denne måneden» (#5), og de er ikke grunn nok til nye sider etter én kjøring.

1. **Svar arrangørene i llms-filene.** `static/llms.txt` nevner ikke arrangører i det hele tatt, og `llms-full.txt` sier bare «Use the submission form at gaari.no», uten lenke. Legg inn et spørsmål og svar på norsk og engelsk («Hvor kan jeg legge inn arrangementet mitt i Bergen?» / «Where can I list my event in Bergen?») med lenke til `/no/submit` og `/no/for-arrangorer`. Svarer på #24 til #26. Usikkert: vi vet ikke om ChatGPT leser llms.txt; i mai var det bare et inntrykk.
2. **Sjekk Bing før noe annet tolkes.** Lag 1 har to hull: Bing-dekningen og crawlerne i Vercel-loggen. ChatGPT-søk antas å bygge på Bing, men det har vi ikke en verifisert kilde på. Se særlig om de engelske samlingssidene er indeksert (#16 S mot #17 0). Krever Bing Webmaster og Vercel-dashbordet, altså henne.
3. **Lenker fra domener som faktisk siteres, ikke fra konkurrenter.** visitbergen.com (11 av 28) er konkurrent og ikke et mål. kulturikveld.no er en aggregator vi selv skraper. Det som står igjen:
   - **bergen.kommune.no** ble sitert på #24 og står alt som mål i påminnelsen «Registrer Gåri i norske kataloger» (`scripts/reminders.json`). Matrisen styrker den, den legger ikke til noe nytt.
   - **samfunnetibergen.no** (2 av 28): vi har en relasjon gjennom Martin, og scraperen skal bygges. Når den er live, kan det spørres om en lenke, slik Litteraturhuset og StudentBergen har.
   - **norskekalendere.no, altskjer.no, myguidebergen.com**: ukjent om de er kataloger vi kan stå i eller konkurrenter. Se på dem før noen kontaktes.
   Dette er også det eneste som kan hjelpe merkenavnet (#27): «Gåri» blir kjent gjennom at andre skriver det, ikke gjennom våre egne filer.
4. **Andre runde før neste beslutning.** Kjør de 28 på nytt i desember, to ganger hver, og ta Perplexity og Gemini med. Bare de spørsmålene som er 0 i begge kjøringene regnes som tap. Sted- og festivalspørsmålene (#19 til #21) kan droppes fra runden; de gir bare arrangørens egen side.

Ikke valgt: egne sider for jazz og «denne måneden», og endringer i samlingssidene. Begge venter på andre runde.

## Krysskontroll mot egne data

- Search Console: samlingssider med mange visninger og få klikk.
- Google-fallet (google.com 2 895 til 2 453 mellom periodene) er ikke forklart. Sjekk om det er sesong eller ranking før noe tolkes.

## Hva som ikke kan gjøres herfra

De manuelle spørringene mot ChatGPT, Perplexity, Gemini og Google AI krever nettleser. Crawlerloggene krever Vercel-dashbordet, og Bing-dekningen krever Bing Webmaster.
