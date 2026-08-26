# Gåri-casen, visuelle kandidater per rolle

Løpende liste. Fylles ut mens rolletekstene skrives, og brukes i visualiseringsrunden
etterpå. Merkelappene er de samme som i demosida: **Har den**, **Må lages**,
**Må fanges**, **Ren tekst**.

Regel som gjelder alle: ingen designprogramvare finnes i dette prosjektet, så et opptak
fra Figma eller Adobe ville vært usant. Alt visuelt må komme fra koden, produktet eller
trykksakene.

## Design system lead

Teksten sier nå at hun bygde hele det visuelle systemet og at alt kommer ut av det.
Den sier ikke lenger *hvordan* det henger sammen mekanisk. Det må bildet gjøre.

| # | Kandidat | Type | Hva den krever |
|---|---|---|---|
| 1 | **Én verdi endres, alt følger etter.** Editoren med `src/app.css` på den ene siden, den levende sida på den andre. Én `--funkis-*`-verdi endres, og kort, merke, knapp og navigasjon skifter samtidig | Må fanges, skjermopptak | Dev-server og editor side om side, 1920×1080 eller høyere, ca. 10 sekunder. Bytt til en *troverdig* alternativ farge, ikke en skrikende, ellers leser det som en feil og ikke som et system |
| 2 | **Rutenettet av genererte delebilder.** Tjue delebilder for tjue ulike arrangementer ved siden av hverandre, alle fra samme verdier | Må fanges, stillbilde | Hentes fra `/og`-ruta. Viser at systemet produserer hundrevis av utganger uten at noen tegner dem |
| 3 | **Skjerm og trykk i samme bilde.** Plakaten eller klistremerket fra `print/` sammen med grensesnittet | Må lages, montasje | Filene finnes allerede i `public/images/gaari/print/`. Sterkest på at systemet krysser fra skjerm til papir |
| 4 | **Komponentsettet på én flate.** Kort, merker, knapper, filterkontroll, kalender og navigasjon samlet | Må lages | Det finnes **ingen styleguide-rute** i Gåri-repoet, så denne må settes sammen for hånd. Ærlig så lenge den merkes som en oppstilling og ikke som en skjermdump |
| 5 | Autorert animasjon av token-kaskaden | Må lages | Reserveløsningen hvis opptak 1 ikke lar seg gjøre. Svakere, fordi den er tegnet og ikke ekte |

**Anbefaling:** 1 som hovedbilde, siden den er ekte og viser mekanismen, med 2 eller 3 som
stillbilde ved siden av. 1 er også den eneste hun kan ta opp selv i dag.

## UX designer

| # | Kandidat | Type | Merknad |
|---|---|---|---|
| 1 | Nåværende plan: filteret som besvares mens adressefeltet endrer seg | Må fanges | **Passer dårligere nå.** Teksten handler om hele opplevelsen, videoen om ett felt |
| 2 | Reisen gjennom sida: forsiden først, så tilpasningen til en helg eller til familie | Må fanges | Nærmere den nye teksten. Lengre opptak, ca. 20 sekunder |

Åpent: tilstandene (ingen treff, ingen bilde, avlyst) er ute av teksten. Skal de bæres
av et bilde, hører de til her.
