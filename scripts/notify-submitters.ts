/**
 * Bekreftelse til innsendere av arrangementer.
 *
 *   npx tsx scripts/notify-submitters.ts            send bekreftelser
 *   npx tsx scripts/notify-submitters.ts --dry-run  vis hvem som ville fått, uten å sende
 *
 * Kjøres som en del av den daglige pipelinen.
 *
 * Jobben avstemmer en tilstand i stedet for å utføre en handling til rett tid.
 * Den ser etter arrangementer som er godkjent, har en innsender-e-post, og ennå
 * ikke er varslet. Derfor spiller det ingen rolle om godkjenningen skjedde i
 * /admin/submissions eller direkte i Supabase, og derfor kan ingen få to
 * e-poster: tidsstempelet settes i samme runde.
 */
import { supabase } from './lib/supabase.js';
import { SITE, sendEmail, wrap } from './lib/notify.js';
import { maskEmail } from './lib/utils.js';

const dryRun = process.argv.includes('--dry-run');

type Rad = {
	id: string;
	slug: string;
	title_no: string;
	submitter_email: string;
};


/**
 * Malen er godkjent av eieren 2026-08-11. Endres den, skal hun se den først.
 *
 * Det engelske avsnittet står der fordi vi ikke lagrer innsenderens språk, bare
 * e-postadressen. Macbeth-innsendingen kom fra en tysk billettside, så norsk
 * alene ville truffet dårlig, og å gjette språk ut fra innholdet bommer.
 */
function bygg(rad: Rad): { subject: string; html: string } {
	const lenke = `${SITE}/no/events/${rad.slug}`;
	return {
		subject: `${rad.title_no} er lagt ut på gaari.no`,
		html: wrap(`<p>Hei,</p>

<p>takk for at du sendte inn arrangementet. Det ligger nå ute:</p>

<p><a href="${lenke}" style="color: #C82D2D;">${lenke}</a></p>

<p>Se gjerne over at detaljene stemmer, og si fra hvis noe er feil, så retter jeg det.</p>

<p>Send gjerne inn flere når du har noe på gang.</p>

<p>Med vennlig hilsen,<br />Kjersti</p>

<p style="color:#555;font-style:italic;">Thanks for submitting your event. It is now live at the link above. Please check that the details are correct and let me know if anything needs fixing.</p>`)
	};
}

async function send(rad: Rad): Promise<boolean> {
	const { subject, html } = bygg(rad);
	return sendEmail(rad.submitter_email, subject, html);
}

async function main() {
	const { data, error } = await supabase
		.from('events')
		.select('id, slug, title_no, submitter_email')
		.eq('status', 'approved')
		.not('submitter_email', 'is', null)
		.is('submitter_notified_at', null);

	if (error) {
		console.error('Kunne ikke hente innsendinger:', error.message);
		process.exit(1);
	}

	const rader = (data ?? []) as Rad[];
	if (!rader.length) {
		console.log('[notify-submitters] Ingen ventende bekreftelser.');
		return;
	}

	console.log(`[notify-submitters] ${rader.length} venter på bekreftelse${dryRun ? ' (tørrkjøring)' : ''}`);

	let sendt = 0;
	for (const rad of rader) {
		console.log(`  ${maskEmail(rad.submitter_email)} <- ${rad.title_no}`);
		if (dryRun) continue;

		if (!(await send(rad))) continue;

		// Stemples umiddelbart etter sending. Krasjer jobben nå, er e-posten
		// allerede ute, og en manglende stempling ville gitt dublett i morgen.
		const { error: stampErr } = await supabase
			.from('events')
			.update({ submitter_notified_at: new Date().toISOString() })
			.eq('id', rad.id);

		if (stampErr) {
			console.error(`  ADVARSEL: e-post sendt, men stempling feilet for ${rad.slug}: ${stampErr.message}`);
			console.error('  Sett submitter_notified_at manuelt, ellers sendes den på nytt i morgen.');
			continue;
		}
		sendt++;
	}

	console.log(`[notify-submitters] ${dryRun ? 0 : sendt} bekreftelser sendt`);
}

import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

/**
 * Sperre mot at modulen gjoer jobben sin bare fordi noen importerer den.
 *
 * 21. august 2026 importerte en test to hjelpefunksjoner fra
 * send-newsletter.ts, og modulen begynte en ekte utsending til 129
 * abonnenter. Den rakk aldri aa opprette kampanjen, men det var flaks:
 * testkjoeringen ble revet ned mens main() ventet paa abonnentlista.
 *
 * Samme sperre som scrape.ts og send-newsletter.ts bruker.
 */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main().catch((err) => {
		console.error('[notify-submitters] Uventet feil:', err);
		process.exit(1);
	});
}
