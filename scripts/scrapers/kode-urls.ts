/**
 * Adressene til KODEs egne sider. Egen fil, og med vilje uten en eneste import.
 *
 * `kode.ts` drar inn `lib/utils.js`, som drar inn `supabase.ts`, som importerer
 * `dotenv` — en pakke som bare ligger i `scripts/package.json`. CI kjoerer
 * `npm ci` i rota og feiler derfor med ERR_MODULE_NOT_FOUND paa enhver test som
 * roerer den grafen, uansett hvor groenn den er lokalt. Se «Fella som har tatt
 * oss tre ganger» i `.claude/docs/testing.md`. Regelen under er ren, saa den
 * hoerer hjemme et sted testen kan naa uten aa dra med seg resten.
 */
/**
 * KODE bygger sine egne URL-er som /hva-skjer/<seksjon>/<arrangement>.
 *
 * Seksjonen er ikke utledbar fra navnet paa arrangementstypen. «Kurs og
 * verksted» ligger under /verksted/, «Familieaktiviteter» under /familie/ og
 * «Arrangement» under /arrangement/ i entall. Seksjonen /arrangementer/, som
 * denne filen gjettet paa fram til 2026-08-24, finnes ikke i det hele tatt —
 * 61 av 68 KODE-arrangementer pekte dermed paa en 404.
 *
 * Feilen var vanskelig aa se fordi kodebergen.no kjoerer Next.js med
 * `fallback: true`: foerste kall til en ukjent sti svarer 200 med et tomt skall
 * og bygger siden i bakgrunnen, saa lenkesjekken fikk gronn status foerste gang
 * og 404 etterpaa. Sjekk aldri en slik lenke bare én gang.
 *
 * Sanity har seksjonen liggende som slug paa eventType-dokumentet. Vi spoer om
 * den i stedet for aa utlede den. Mangler den, har vi ingen lenke — da hopper vi
 * over arrangementet framfor aa sende folk til en feilside.
 */
export function buildSourceUrl(eventSlug: string, typeSlug: string | null): string | null {
	const seksjon = (typeSlug ?? '').trim();
	const arrangement = (eventSlug ?? '').trim();
	if (!seksjon || !arrangement) return null;
	return `https://www.kodebergen.no/hva-skjer/${encodeURIComponent(seksjon)}/${encodeURIComponent(arrangement)}`;
}
