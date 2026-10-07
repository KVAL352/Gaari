# Trafikkanalyse nr. 2 og arbeidsplan, 7. oktober 2026

Kilder: Umami (28 dager mot 28 før, hentet med `node scripts/umami-via-cloudflare-dns.mjs --28`), Search Console (7. sept til 6. okt, via `scripts/seo-report.ts --period month`), `venue_clicks` i Supabase (30 og 90 dager). Vinduene er ikke helt like. Rekkefølgen under er forslag, Kjersti velger.

## Tallene

**Umami, 28 dager mot 28 før**
- Besøkende: 6 124 mot 4 195 (+46 %), og 2 814 før det. Jevnt rundt 200 besøk om dagen.
- Fluktrate 36 % (før 40 %). Besøkstid 147 sekunder (før 138).
- Enhet: mobil 3 490, laptop 2 348, desktop 238, nettbrett 65.
- Kilder: Google 3 151, Bing 156, DuckDuckGo 125, chatgpt.com 16.
- Inngangssider (de 500 største, 4 773 av 6 603 besøk): forsiden 1 707, arrangementssider 1 782 (minst 27 % av alle besøk), samlesider 1 130, stedssider 145. `/en` står for 1 138.

**Search Console, 30 dager**
- Norge: 94,4 % av klikkene (3 318). Ingen annet land over 1,1 %.
- `/no`: 1 102 klikk (ca. 31 %), 20 268 visninger.
- «hva skjer i bergen i dag»: 248 klikk, 1 754 visninger, 14,1 %, posisjon 3,8.
- «hva skjer i bergen i helgen»: 176 klikk, 2 425 visninger, 7,3 %, posisjon 4,0.
- «hva skjer i bergen»: 114 klikk, 3 617 visninger, 3,2 %, posisjon 6,4.
- `venue/grieghallen`: 45 klikk av 5 803 visninger (0,8 %). `venue/forum-scene`: 30 av 1 959 (1,5 %).
- Utløpte arrangementer med Google-klikk: Sigvart Dagsland 20. sept (43), Nations League 27. sept (42, 17,6 %), Klobb 11. sept (41).

**Utklikk til arrangører (`venue_clicks`)**
- 4 207 på 30 dager, 8 290 på 90 dager, 236 og 339 steder.
- Topp 30 dager: Bergen Street Food 286, Grieghallen 262, Litteraturhuset 248, Madam Felle 216, Ole Bull Scene 131. De fem står for 27 %.

## Det som ikke kan brukes

- **Land i Umami** viser 100 % USA. Kjent feil, vedtatt 25. august at geografi leses fra Search Console (se kommentaren i `src/routes/u/api/send/+server.ts`). Vedtatt 7. okt å la det ligge.
- **Sitemap «0 indeksert av 3 890»** i Search Console-API-et er trolig ikke reelt, siden siden har 99 000 visninger i Google. Årsaken er ikke undersøkt. Sjekk i Search Console-grensesnittet.
- **`/en`:** 24 % av innganger i Umami, men USA og Storbritannia har bare 1,1 % og 1,0 % av Google-klikkene. Tolkning, ikke bevist: de engelske sidene leses av folk i Bergen, ikke turister.

## Plan, rangert etter hva tallene viser

1. **Julemarked innen 15. okt.** Frist. Høstferie fikk 122 Google-klikk og 2 566 visninger uten nytt arbeid. Sjekk at siden viser de 7 arrangementene, og at tekst og FAQ stemmer for 2026.
2. **«I helgen», «i dag» og «hva skjer i bergen».** Størst avstand mellom visninger og klikk. Test tittel og beskrivelse på `denne-helgen` og forsiden mot søkeordene.
3. **Meta description for Grieghallen og Forum Scene.** Over 7 700 visninger, under 100 klikk.
4. **Utløpte arrangementssider.** Ca. 27 % av besøkene lander på arrangementer, mange av dem over. Sjekk hva besøkende ser og hvor de kan sendes videre. Sjekk også om `viva-latino` (410 i Check Links 6. okt) er samme mønster.
5. **Billettgjennomgangen** (`docs/billettstrategi.md`, kap. 6, 7, 9). Må avgjøres av henne først: kap. 9 strider mot «Retning» punkt 4.
6. **Åsane-scenesider.** `/no/asane`: 64 klikk, 1 943 visninger.
7. **Fellesverksted-samtykket.** Rad i `docs/bildesamtykke.md` og `CONSENT_RECORDS`, så ny skraping.
8. **Engelsk innhold.** Vurder det som tilbud til tilflyttede i Bergen. Sjekk de øverste engelske sidene på mobil (57 % av besøkene).
9. **Umami-omveien som fallback i `scripts/morning-stats.ts`**, så `/morgen` virker med VPN på.
10. **Sitemap-indeksering.** Bare en sjekk i Search Console.
