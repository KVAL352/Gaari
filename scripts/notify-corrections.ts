/**
 * Beskjed til innsendere om at en rettelse de ba om er utført.
 *
 *   npx tsx scripts/notify-corrections.ts            send
 *   npx tsx scripts/notify-corrections.ts --dry-run  vis hvem som ville fått, uten å sende
 *
 * Kjøres av notify.yml, sammen med notify-submitters.ts. Samme prinsipp:
 * jobben avstemmer en tilstand (fixed_at satt, notified_at tom) og stempler i
 * samme runde, så ingen får to e-poster.
 *
 * Regel fra eieren 2026-11-17: bare de som selv har bedt om en endring får
 * epost. En rad i correction_requests finnes bare for dem. Vår egen opprydding
 * (f.eks. bilder fjernet av sperrelisten) gir ingen rad.
 *
 * Malen er godkjent av eieren 2026-11-17. Endres den, skal hun se den først.
 * Tabellen (migrasjon 20261117180000) må finnes før steget i notify.yml kjører.
 */
import { supabase } from './lib/supabase.js';
import { SITE, sendEmail, wrap } from './lib/notify.js';
import { maskEmail } from './lib/utils.js';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const dryRun = process.argv.includes('--dry-run');
const UTLOP_DAGER = 90;

type Rad = {
	id: string;
	email: string;
	events: { slug: string; title_no: string; status: string } | null;
};

export function bygg(tittel: string, slug: string): { subject: string; html: string } {
	const lenke = `${SITE}/no/events/${slug}`;
	return {
		subject: `Rettelsen din er gjort: ${tittel}`,
		html: wrap(`<p>Hei,</p>

<p>takk for beskjeden. Jeg har rettet arrangementet, og det ligger nå slik:</p>

<p><a href="${lenke}" style="color: #C82D2D;">${lenke}</a></p>

<p>Det kan ta opptil en time før siden viser rettelsen. Si fra hvis noe fortsatt ikke stemmer.</p>

<p>Med vennlig hilsen,<br />Kjersti</p>

<p style="color:#555;font-style:italic;">Thanks for letting me know. I have corrected your event, and the link above shows it as it is now. It can take up to an hour before the page is updated. Let me know if anything is still wrong.</p>`)
	};
}

async function main() {
	// Dataminimering: en forespørsel som aldri ble rettet skal ikke ligge med adresse for alltid.
	if (!dryRun) {
		const grense = new Date(Date.now() - UTLOP_DAGER * 86_400_000).toISOString();
		const { error: delErr } = await supabase
			.from('correction_requests')
			.delete()
			.is('fixed_at', null)
			.lt('created_at', grense);
		if (delErr) console.error('Kunne ikke slette utløpte forespørsler:', delErr.message);
	}

	const { data, error } = await supabase
		.from('correction_requests')
		.select('id, email, events(slug, title_no, status)')
		.not('fixed_at', 'is', null)
		.is('notified_at', null)
		.not('email', 'is', null);

	if (error) {
		console.error('Kunne ikke hente rettelser:', error.message);
		process.exit(1);
	}

	const rader = (data ?? []) as unknown as Rad[];
	if (!rader.length) {
		console.log('[notify-corrections] Ingen ventende rettelser.');
		return;
	}

	console.log(`[notify-corrections] ${rader.length} venter${dryRun ? ' (tørrkjøring)' : ''}`);

	let sendt = 0;
	for (const rad of rader) {
		const ev = rad.events;
		if (!ev || ev.status !== 'approved') {
			// Aldri send en lenke som ikke virker. Raden blir stående og vises her hver kjøring.
			console.error(`  HOPPER OVER ${rad.id}: arrangementet mangler eller er ikke godkjent`);
			continue;
		}
		console.log(`  ${maskEmail(rad.email)} <- ${ev.title_no}`);
		if (dryRun) continue;

		const { subject, html } = bygg(ev.title_no, ev.slug);
		if (!(await sendEmail(rad.email, subject, html))) continue;

		// Stemples og nulles umiddelbart etter sending, som i notify-submitters.ts.
		const { error: stampErr } = await supabase
			.from('correction_requests')
			.update({ notified_at: new Date().toISOString(), email: null })
			.eq('id', rad.id);

		if (stampErr) {
			console.error(`  ADVARSEL: e-post sendt, men stempling feilet for ${rad.id}: ${stampErr.message}`);
			console.error('  Sett notified_at og email = null manuelt, ellers sendes den på nytt.');
			continue;
		}
		sendt++;
	}

	console.log(`[notify-corrections] ${dryRun ? 0 : sendt} sendt`);
}

// Samme sperre som notify-submitters.ts: ikke kjør bare fordi noen importerer modulen.
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main().catch((err) => {
		console.error('[notify-corrections] Uventet feil:', err);
		process.exit(1);
	});
}
