/**
 * Skriv om korte beskrivelser med arrangørens egen tekst som faktagrunnlag.
 *
 * HVORFOR EN TIL
 *
 * backfill-descriptions.ts kjenner bare det som ligger i basen: tittel, sted,
 * kategori, dato, bydel. Med bare det blir en ærlig beskrivelse rundt 115
 * tegn — det er taket for hva metadataen bærer, ikke en svakhet ved prompten.
 *
 * Arrangørens omtale ligger på kildesida. Den henter vi her, sender den inn
 * som fakta, og får rundt 210 tegn med reelt innhold: regissør, besetning,
 * hva kurset går ut på, hvem det er for.
 *
 *   før:  «Mandagsfilmen: Hamnet — Kulturarrangement på Hovedbiblioteket»
 *   etter: «Filmen Hamnet vises mandag 7. desember i Auditoriet på
 *          Hovedbiblioteket i Bergen. Den er regissert av Chloé Zhao og har
 *          Paul Mescal og Jessie Buckley i hovedrollene.»
 *
 * ÅNDSVERKSLOVEN — hvorfor dette går i to steg
 *
 * Opphavsretten verner uttrykk, ikke fakta. At en film er regissert av Chloé
 * Zhao er en kjensgjerning hvem som helst kan gjengi; arrangørens formulering
 * om den er det ikke.
 *
 * Derfor deles jobben:
 *
 *   1. hentFakta() ser arrangørens tekst, men leverer bare atomære verdier —
 *      «Chloé Zhao», «film», «0-2 år», «19.00». erAtomaertFaktum() håndhever
 *      det i kode: er en verdi lengre enn seks ord, eller slutter et ord med
 *      punktum, er den en setning og forkastes.
 *   2. generateDescription() skriver fra de faktaene alene og ser aldri
 *      prosaen.
 *
 * Sperren følger altså av formen, ikke av en terskel noen har gjettet: får
 * uttrykk ikke plass i et faktafelt, kan det ikke bæres videre.
 *
 * Teksten lagres aldri. Den lever i minnet under kallet og kastes.
 * harVerbatimOverlapp() står igjen som en ekstra bunnplanke for den eldre
 * sourceText-veien.
 *
 * VÆR EN HØFLIG GJEST
 *
 * Én forespørsel per arrangement til arrangørens server. 1,5 sekund mellom
 * hver, 3 mot Bergen bibliotek. Kjør den heller i puljer med --limit enn å
 * hamre gjennom hele køen på én gang.
 *
 * Bruk:
 *   npx tsx backfill-descriptions-from-source.ts --dry-run --limit 5
 *   npx tsx backfill-descriptions-from-source.ts --source bergenbibliotek --limit 50
 *   npx tsx backfill-descriptions-from-source.ts --limit 200
 */
import 'dotenv/config';
import * as cheerio from 'cheerio';
import { supabase } from './lib/supabase.js';
import { fetchAllRows, fetchHTML, delay } from './lib/utils.js';
import { generateDescription, hentFakta } from './lib/ai-descriptions.js';

const argv = process.argv;
const DRY_RUN = argv.includes('--dry-run');
const flagg = (n: string): string | null => {
	const i = argv.indexOf(n);
	return i >= 0 ? argv[i + 1] ?? null : null;
};
const LIMIT = flagg('--limit') ? Number(flagg('--limit')) : null;
const SOURCE = flagg('--source');

/** Under denne lengden regner vi beskrivelsen som for tynn til å bli stående. */
const KORT_NOK_TIL_AA_BYTTES = 170;

const PAUSE_MS: Record<string, number> = { bergenbibliotek: 3000 };

interface Rad {
	id: string;
	source: string | null;
	source_url: string;
	title_no: string;
	venue_name: string | null;
	category: string;
	date_start: string;
	bydel: string | null;
	age_group: string | null;
	language: string | null;
	description_no: string | null;
}

/**
 * Hent arrangørens omtale fra kildesida.
 *
 * Rekkefølgen er ikke tilfeldig. Plone-sidene (bibliotekene) har egne felter
 * som gir ren brødtekst; og:description er en kortere ingress som finnes nesten
 * overalt; JSON-LD er siste utvei fordi den ofte er identisk med og:description.
 */
function hentKildetekst(html: string): string | undefined {
	const $ = cheerio.load(html);

	const plone = [
		$('div.documentDescription').first().text(),
		$('#parent-fieldname-text').first().text(),
	].join(' ').replace(/\s+/g, ' ').trim();
	if (plone.length > 80) return plone;

	for (const sel of ['meta[property="og:description"]', 'meta[name="description"]']) {
		const t = ($(sel).attr('content') ?? '').replace(/\s+/g, ' ').trim();
		if (t.length > 80) return t;
	}

	let fraJsonLd: string | undefined;
	$('script[type="application/ld+json"]').each((_, el) => {
		if (fraJsonLd) return;
		try {
			const d = JSON.parse($(el).text());
			const noder = Array.isArray(d) ? d : [d];
			for (const n of noder) {
				if (n?.description && typeof n.description === 'string') {
					const t = n.description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
					if (t.length > 80) { fraJsonLd = t; return; }
				}
			}
		} catch { /* ugyldig JSON-LD */ }
	});
	return fraJsonLd;
}

async function main() {
	const nowUtc = new Date().toISOString();

	const alle = await fetchAllRows<Rad>(
		(fra, til) =>
			supabase
				.from('events')
				.select('id, source, source_url, title_no, venue_name, category, date_start, bydel, age_group, language, description_no')
				.eq('status', 'approved')
				.or(`date_end.gte.${nowUtc},and(date_end.is.null,date_start.gte.${nowUtc})`)
				.not('source_url', 'is', null)
				.order('id', { ascending: true })
				.range(fra, til),
		'kildetekst-backfill'
	);

	let koe = alle.filter(e => (e.description_no ?? '').length < KORT_NOK_TIL_AA_BYTTES);
	if (SOURCE) koe = koe.filter(e => e.source === SOURCE);
	if (LIMIT) koe = koe.slice(0, LIMIT);

	console.log(
		`${alle.length} kommende arrangementer med kildelenke. ` +
			`${koe.length} har beskrivelse under ${KORT_NOK_TIL_AA_BYTTES} tegn` +
			(SOURCE ? ` fra "${SOURCE}"` : '') + '.'
	);
	if (DRY_RUN) console.log('TØRRKJØRING — ingenting skrives.');
	if (koe.length === 0) return;
	console.log('');

	let bedre = 0, ingenKilde = 0, ikkeBedre = 0, feilet = 0;
	let foerSum = 0, etterSum = 0;

	for (const e of koe) {
		const pause = PAUSE_MS[e.source ?? ''] ?? 1500;
		try {
			const html = await fetchHTML(e.source_url);
			if (!html) { console.log(`  ✗ ${e.title_no.slice(0, 50)}: kunne ikke hente sida`); feilet++; await delay(pause); continue; }

			const kilde = hentKildetekst(html);
			if (!kilde) { console.log(`  – ${e.title_no.slice(0, 50)}: ingen omtale paa sida`); ingenKilde++; await delay(pause); continue; }

			// To steg. hentFakta() ser arrangoerens tekst og leverer bare
			// atomaere verdier tilbake — navn, form, varighet, klokkeslett.
			// Skrivesteget under ser aldri prosaen, saa det finnes ingen
			// formulering aa gjenbruke. Sperra foelger av formen.
			const fakta = await hentFakta(kilde);
			if (!fakta) { console.log(`  – ${e.title_no.slice(0, 50)}: ingen fakta aa hente ut`); ingenKilde++; await delay(pause); continue; }

			const d = await generateDescription({
				title: e.title_no,
				venue: e.venue_name || 'Bergen',
				category: e.category,
				date: e.date_start,
				bydel: e.bydel || undefined,
				ageGroup: e.age_group || undefined,
				language: e.language || undefined,
				facts: fakta,
			});

			const foer = (e.description_no ?? '').length;
			// Bare bytt hvis den nye faktisk er fyldigere. Faller modellen til
			// mal fordi svaret laa for taett paa kilden, er malen kortere — og
			// da skal den gamle staa.
			if (d.no.length <= foer) { console.log(`  = ${e.title_no.slice(0, 50)}: ikke bedre (${foer} → ${d.no.length})`); ikkeBedre++; await delay(pause); continue; }

			if (DRY_RUN) {
				console.log(`  [tørr] ${foer} → ${d.no.length}  ${d.no.slice(0, 96)}`);
			} else {
				const { error } = await supabase.from('events')
					.update({ description_no: d.no, description_en: d.en, ...(d.title_en ? { title_en: d.title_en } : {}) })
					.eq('id', e.id);
				if (error) { console.log(`  ✗ ${e.title_no.slice(0, 50)}: ${error.message}`); feilet++; await delay(pause); continue; }
				console.log(`  ✓ ${foer} → ${d.no.length}  ${e.title_no.slice(0, 56)}`);
			}
			bedre++; foerSum += foer; etterSum += d.no.length;
		} catch (err: any) {
			console.log(`  ✗ ${e.title_no.slice(0, 50)}: ${err?.message?.slice(0, 70)}`);
			feilet++;
		}
		await delay(pause);
	}

	console.log(
		`\nFerdig. forbedret=${bedre}  uten_omtale=${ingenKilde}  ikke_bedre=${ikkeBedre}  feilet=${feilet}`
	);
	if (bedre > 0) {
		console.log(`Snittlengde ${Math.round(foerSum / bedre)} → ${Math.round(etterSum / bedre)} tegn.`);
	}
}

main().catch(e => { console.error(e); process.exit(1); });
