/**
 * Sjekker Gåris egne sider — det ingen annen jobb gjør.
 *
 * check-links.ts går den andre veien: den følger lenkene ut av gaari.no og
 * spør om arrangørens side finnes. Ingenting har hittil spurt om våre egne
 * sider svarer, eller om lenkene mellom dem fører noe sted. Da Kode-koret ga
 * 404 hos KODE 24. august 2026, var det en tilfeldig klikk som oppdaget det.
 *
 *   npx tsx scripts/check-site.ts               alle sider utenom arrangementer,
 *                                               pluss en stikkprøve på 60 av dem
 *   npx tsx scripts/check-site.ts --alle        hele sitemapet, ~3500 adresser
 *   npx tsx scripts/check-site.ts --arrangementer 300
 *   npx tsx scripts/check-site.ts --base http://localhost:5173
 *
 * Hvorfor ikke alt hver gang: hver adresse som er gått ut på dato tvinger
 * Vercel til å bygge siden på nytt, og ISR-skrivingene ligger allerede over
 * gratisgrensen. Samlingssidene og de faste sidene er få og viktige, så de tas
 * hver gang. Arrangementssidene er mange og like, så en stikkprøve holder —
 * feiler én av dem, feiler som regel alle.
 *
 * Avslutter med kode 1 hvis noe er galt, slik at GitHub Actions varsler.
 */
import { writeFileSync } from 'fs';

const BASE = argVerdi('--base') ?? 'https://gaari.no';
const ALLE = process.argv.includes('--alle');
const ARRANGEMENTER = Number(argVerdi('--arrangementer') ?? 60);
const SAMTIDIGE = 6;
const TIMEOUT_MS = 20_000;
const UA = 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)';

function argVerdi(flagg: string): string | null {
	const i = process.argv.indexOf(flagg);
	return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

type Funn = {
	url: string;
	status: number;
	grunn: string;
	/** Siden vi fant lenken på. Tom for adresser som kom rett fra sitemapet. */
	fraSide: string;
};

// ─── Hente ──────────────────────────────────────────────────────────

async function hent(url: string, metode: 'GET' | 'HEAD' = 'GET') {
	const stopp = new AbortController();
	const klokke = setTimeout(() => stopp.abort(), TIMEOUT_MS);
	try {
		const res = await fetch(url, {
			method: metode,
			headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml' },
			redirect: 'follow',
			signal: stopp.signal
		});
		const kropp = metode === 'GET' ? await res.text() : '';
		return { status: res.status, url: res.url, kropp };
	} catch {
		return { status: 0, url, kropp: '' };
	} finally {
		clearTimeout(klokke);
	}
}

/** Kjør oppgavene noen om gangen. Vår egen side, så vi trenger ingen pause. */
async function iPuljer<T, R>(ting: T[], gjør: (t: T) => Promise<R>): Promise<R[]> {
	const ut: R[] = [];
	for (let i = 0; i < ting.length; i += SAMTIDIGE) {
		ut.push(...(await Promise.all(ting.slice(i, i + SAMTIDIGE).map(gjør))));
	}
	return ut;
}

// ─── Vurdere en side ────────────────────────────────────────────────

/**
 * En side kan svare 200 og likevel være tom for innhold. SvelteKit gir
 * feilsiden riktig statuskode, så statuskoden er til å stole på her — men en
 * side uten <h1> er som regel en side som ikke fikk data, og det er verdt et
 * varsel selv om den svarer 200.
 */
function utenSkråstrek(u: string): string {
	return u.replace(/\/+$/, '');
}

function manglerInnhold(kropp: string): boolean {
	return !/<h1[\s>]/i.test(kropp);
}

function interneLenker(kropp: string, fraUrl: string): string[] {
	const ut = new Set<string>();
	for (const treff of kropp.matchAll(/<a\s[^>]*href="([^"#]+)"/gi)) {
		const rå = treff[1];
		if (/^(mailto:|tel:|javascript:|data:)/i.test(rå)) continue;
		let full: URL;
		try {
			full = new URL(rå, fraUrl);
		} catch {
			continue;
		}
		if (full.origin !== new URL(BASE).origin) continue;
		full.hash = '';
		ut.add(full.toString());
	}
	return [...ut];
}

// ─── Kjøring ────────────────────────────────────────────────────────

async function sitemapAdresser(): Promise<string[]> {
	const res = await hent(`${BASE}/sitemap.xml`);
	if (res.status !== 200) {
		console.error(`sitemap.xml svarte HTTP ${res.status}. Avbryter.`);
		process.exit(1);
	}
	return [...res.kropp.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

/** Behold hver n-te, slik at utvalget sprer seg over hele lista og ikke bare toppen. */
function spredtUtvalg<T>(liste: T[], antall: number): T[] {
	if (liste.length <= antall) return liste;
	const steg = liste.length / antall;
	return Array.from({ length: antall }, (_, i) => liste[Math.floor(i * steg)]);
}

async function main() {
	const start = Date.now();
	const alle = await sitemapAdresser();
	const erArrangement = (u: string) => /\/(no|en)\/events\//.test(u);
	const faste = alle.filter((u) => !erArrangement(u));
	const arrangementer = alle.filter(erArrangement);

	const åSjekke = ALLE ? alle : [...faste, ...spredtUtvalg(arrangementer, ARRANGEMENTER)];
	console.log(
		`[check-site] ${BASE} — sitemap: ${alle.length} adresser ` +
			`(${faste.length} faste, ${arrangementer.length} arrangementer)`
	);
	console.log(`[check-site] Sjekker ${åSjekke.length}.\n`);

	const funn: Funn[] = [];
	const sett = new Map<string, number>();

	// 1. Sidene selv.
	const svar = await iPuljer(åSjekke, async (url) => {
		const res = await hent(url);
		sett.set(url, res.status);
		if (res.status !== 200) {
			funn.push({ url, status: res.status, grunn: res.status === 0 ? 'ikke svar' : 'feil status', fraSide: 'sitemap.xml' });
		} else if (manglerInnhold(res.kropp)) {
			funn.push({ url, status: 200, grunn: '200 men ingen <h1>', fraSide: 'sitemap.xml' });
		} else if (utenSkråstrek(res.url) !== utenSkråstrek(url)) {
			// En adresse vi selv legger i sitemapet skal svare direkte. Omdirigerer
			// den, sender vi soekemotorene til feil sted og skjuler samtidig at den
			// opprinnelige siden er borte — et 200 som egentlig er en 301.
			funn.push({ url, status: 200, grunn: `omdirigerer til ${res.url}`, fraSide: 'sitemap.xml' });
		}
		return { url, res };
	});

	// 2. Lenkene mellom dem. Bare fra de faste sidene — arrangementssidene lenker
	//    til de samme samlingene om og om igjen, og gir ingen ny informasjon.
	const lenker = new Map<string, string>(); // adresse -> første side vi så den på
	for (const { url, res } of svar) {
		if (erArrangement(url) || res.status !== 200) continue;
		for (const mål of interneLenker(res.kropp, url)) {
			if (!sett.has(mål) && !lenker.has(mål)) lenker.set(mål, url);
		}
	}
	// Samlingssidene lenker til rundt tolv hundre arrangementer til sammen, og aa
	// slaa opp alle daglig ville gi Vercel like mange ISR-oppfriskninger som en
	// full gjennomgang — nettopp det vi valgte bort over. De faste maalene er faa
	// og tas alle; arrangementsmaalene tas som stikkproeve. Feiler ett av dem,
	// feiler som regel hele klassen.
	const lenkeMål = [
		...[...lenker.keys()].filter((u) => !erArrangement(u)),
		...spredtUtvalg([...lenker.keys()].filter(erArrangement), ALLE ? Infinity : ARRANGEMENTER)
	];
	console.log(
		`[check-site] ${lenker.size} interne lenker peker utenfor det vi alt har sjekket; sjekker ${lenkeMål.length}.`
	);
	console.log('');

	await iPuljer(lenkeMål, async (mål) => {
		const res = await hent(mål, 'HEAD');
		sett.set(mål, res.status);
		if (res.status !== 200) {
			funn.push({ url: mål, status: res.status, grunn: 'intern lenke fører ingen steder', fraSide: lenker.get(mål)! });
		}
	});

	// ─── Rapport ───
	for (const f of funn.sort((a, b) => a.url.localeCompare(b.url))) {
		console.log(`  ${String(f.status).padStart(3)}  ${f.url}`);
		console.log(`       ${f.grunn} — sett på ${f.fraSide}`);
	}

	const sekunder = Math.round((Date.now() - start) / 1000);
	console.log(
		`\n[check-site] ${sett.size} adresser sjekket, ${funn.length} problemer, ${sekunder}s.`
	);

	const fil = process.env.SUMMARY_FILE;
	if (fil) {
		writeFileSync(
			fil,
			JSON.stringify(
				{ base: BASE, sjekket: sett.size, problemer: funn.length, funn, durationSeconds: sekunder },
				null,
				2
			)
		);
	}

	if (funn.length > 0) process.exit(1);
}

main();
