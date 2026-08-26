/**
 * Engangsjobb — flytt DNT-lenkene fra sider som feiler til sider som virker.
 *
 * Alle arrangementssidene under www.dnt.no/aktiviteter-fra-deltager/ svarte
 * HTTP 500 i august 2026, med DNTs egen feilside «Noe gikk galt». Ikke
 * botblokkering — ingen challenge, cf-cache-status DYNAMIC, EpiServer-cookies
 * i svaret. Forespørselen nådde applikasjonen deres, og applikasjonen feilet.
 * Vanlige brukere ser det samme.
 *
 * Vi lenket 119 arrangementer dit.
 *
 * DNTs egen påmeldingsportal virker: `aktiviteter.dnt.no/event/{id}` svarer
 * 200 med 33 kB innhold, selvrefererende canonical og Event-JSON-LD.
 *
 * Scraperen er lagt om, men den regelen gjelder bare framover — radene som
 * alt ligger i basen blir stående til noen rydder dem. Det er denne jobben.
 * Se pattern_regler_gjelder_bare_framover.
 *
 * ID-en står i den gamle URL-en? Nei — den står ikke der. Derfor slår vi opp
 * mot DNTs API på nytt og matcher på tittel, og lar radene vi ikke finner
 * igjen være i fred framfor å gjette.
 *
 * Bruk:
 *   npx tsx fix-dnt-urls.ts            # tørrkjøring
 *   npx tsx fix-dnt-urls.ts --apply
 */
import 'dotenv/config';
import { supabase } from './lib/supabase.js';
import { fetchAllRows, normalizeTitle } from './lib/utils.js';

const APPLY = process.argv.includes('--apply');
const API_URL = 'https://www.dnt.no/api/activities';
const PAGE_SIZE = 50;

interface ApiAktivitet {
	id: number;
	pageTitle: string;
	activityViewModel?: { start?: string };
}

/**
 * Tittel alene duger ikke som noekkel.
 *
 * Scraperen vaar legger paa datosuffiks — «Enkel fottur i Kanadaskogen —
 * mandag 31. august» — mens API-et har grunntittelen. Og turene gjentas: samme
 * tur gaar mange datoer, hver med sin egen id. Matcher vi paa tittel alene,
 * traff 2 av 119, og de som traff ville faatt lenke til feil dato.
 */
function noekkel(tittel: string, dato: string): string {
	const utenDato = tittel.replace(/\s*[—–-]\s*(mandag|tirsdag|onsdag|torsdag|fredag|lørdag|søndag).*$/i, '');
	return `${normalizeTitle(utenDato)}|${dato.slice(0, 10)}`;
}

async function hentAlleFraApi(): Promise<Map<string, number>> {
	const kart = new Map<string, number>();
	for (let page = 1; page <= 20; page++) {
		const res = await fetch(`${API_URL}?municipalities=4601&size=${PAGE_SIZE}&page=${page}`, {
			headers: { 'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)' },
		});
		if (!res.ok) break;
		// pageCount fra svaret, ikke antall rader. API-et gir faerre enn
		// `size` per side, saa «kortere side betyr siste side» stopper etter
		// side én — og da fant jobben 2 av 119. Scraperen i dnt.ts har alltid
		// brukt pageCount; dette er den samme leksjonen om igjen.
		const data = (await res.json()) as { pageHits?: ApiAktivitet[]; pageCount?: number };
		const rader = data.pageHits ?? [];
		if (rader.length === 0) break;
		for (const a of rader) {
			const start = a.activityViewModel?.start;
			if (a.pageTitle && a.id && start) kart.set(noekkel(a.pageTitle, start), a.id);
		}
		if (data.pageCount && page >= data.pageCount) break;
		await new Promise(r => setTimeout(r, 1200));
	}
	return kart;
}

async function main() {
	const nowUtc = new Date().toISOString();
	const rader = await fetchAllRows<{ id: string; title_no: string; date_start: string; source_url: string; ticket_url: string | null }>(
		(fra, til) =>
			supabase
				.from('events')
				.select('id, title_no, date_start, source_url, ticket_url')
				.eq('source', 'dnt')
				.eq('status', 'approved')
				.or(`date_end.gte.${nowUtc},and(date_end.is.null,date_start.gte.${nowUtc})`)
				.or('ticket_url.is.null,ticket_url.like.%www.dnt.no%,ticket_url.like.%/register/%')
				.order('id', { ascending: true })
				.range(fra, til),
		'dnt-urls'
	);

	console.log(`${rader.length} kommende dnt-arrangementer peker paa www.dnt.no.`);
	if (rader.length === 0) return;

	const fraApi = await hentAlleFraApi();
	console.log(`${fraApi.size} aktiviteter hentet fra DNTs API.\n`);

	let treff = 0, bom = 0, feil = 0;
	for (const r of rader) {
		const id = fraApi.get(noekkel(r.title_no, r.date_start));
		if (!id) {
			// Ikke i API-et lenger — kanskje avlyst eller passert. La den staa;
			// lenkesjekken tar den om den er doed.
			console.log(`  ? ${r.title_no.slice(0, 54)}: ikke funnet i API-et`);
			bom++;
			continue;
		}
		const ny = `https://aktiviteter.dnt.no/event/${id}`;
		if (!APPLY) {
			console.log(`  [toerr] ${r.title_no.slice(0, 48).padEnd(50)} -> ${ny}`);
			treff++;
			continue;
		}
		const { error } = await supabase
			.from('events')
			.update({ ticket_url: ny, link_check_failures: 0 })
			.eq('id', r.id);
		if (error) { console.log(`  FEIL ${r.title_no.slice(0, 40)}: ${error.message}`); feil++; }
		else { console.log(`  ok   ${r.title_no.slice(0, 54)}`); treff++; }
	}

	console.log(`\nFerdig. flyttet=${treff}  ikke_i_api=${bom}  feilet=${feil}`);
	if (!APPLY) console.log('Toerrkjoering — ingenting er skrevet. Kjoer med --apply.');
}

main().catch(e => { console.error(e); process.exit(1); });
