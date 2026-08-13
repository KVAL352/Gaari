/**
 * Bekreftelse til arrangører som ba om å bli lagt inn via B2B-skjemaet.
 *
 *   npx tsx scripts/notify-organizers.ts            send bekreftelser
 *   npx tsx scripts/notify-organizers.ts --dry-run  vis hvem som ville fått, uten å sende
 *
 * Kjøres som en del av den daglige pipelinen, rett etter notify-submitters.
 *
 * Søsteren til notify-submitters.ts, bygget på samme prinsipp: den avstemmer en
 * tilstand i stedet for å utføre en handling til rett tid. Den ser etter
 * henvendelser som er koblet til en kilde, har fått minst ett godkjent
 * arrangement, og ennå ikke er varslet. Derfor spiller det ingen rolle om
 * arrangementene ble lagt inn for hånd i Supabase eller av et skript, og derfor
 * kan ingen få to e-poster: tidsstempelet settes i samme runde.
 *
 * Forskjellen fra innsender-flyten er hva mottakeren faktisk har gjort. En
 * innsender har sendt oss ett arrangement. En arrangør har sendt oss nettsiden
 * sin og bedt om å bli med, og får ofte flere rader ut av det.
 *
 * Selve teksten ligger i lib/organizer-notice.ts, så testen kan bygge et brev
 * uten å starte denne jobben.
 */
import 'dotenv/config';
import { supabase } from './lib/supabase.js';
import { sendEmail } from './lib/notify.js';
import { bygg, type Arrangement, type Henvendelse } from './lib/organizer-notice.js';

const dryRun = process.argv.includes('--dry-run');

async function main() {
	const { data, error } = await supabase
		.from('organizer_inquiries')
		.select('id, name, email, event_source')
		.not('event_source', 'is', null)
		.is('notified_at', null);

	if (error) {
		console.error('Kunne ikke hente henvendelser:', error.message);
		process.exit(1);
	}

	const henvendelser = (data ?? []) as Henvendelse[];
	if (!henvendelser.length) {
		console.log('[notify-organizers] Ingen ventende bekreftelser.');
		return;
	}

	let sendt = 0;
	for (const h of henvendelser) {
		const { data: ev } = await supabase
			.from('events')
			.select('slug, title_no, date_start')
			.eq('source', h.event_source)
			.eq('status', 'approved')
			.order('date_start', { ascending: true });

		const arrangementer = (ev ?? []) as Arrangement[];

		// Koblingen finnes, men ingenting er publisert ennå. Da er det ikke noe å
		// bekrefte, og henvendelsen blir stående til neste morgen.
		if (!arrangementer.length) {
			console.log(`  ${h.email}: ingen godkjente arrangementer på "${h.event_source}" ennå, venter`);
			continue;
		}

		console.log(
			`  ${h.email} <- ${arrangementer.length} arrangement${arrangementer.length > 1 ? 'er' : ''} (${h.event_source})`
		);
		if (dryRun) continue;

		const { subject, html } = bygg(h, arrangementer);
		if (!(await sendEmail(h.email, subject, html))) continue;

		// Stemples umiddelbart etter sending. Krasjer jobben nå, er e-posten
		// allerede ute, og en manglende stempling ville gitt dublett i morgen.
		const { error: stampErr } = await supabase
			.from('organizer_inquiries')
			.update({ notified_at: new Date().toISOString(), status: 'converted' })
			.eq('id', h.id);

		if (stampErr) {
			console.error(`  ADVARSEL: e-post sendt, men stempling feilet for ${h.email}: ${stampErr.message}`);
			console.error('  Sett notified_at manuelt, ellers sendes den på nytt i morgen.');
			continue;
		}
		sendt++;
	}

	console.log(`[notify-organizers] ${dryRun ? 0 : sendt} bekreftelser sendt`);
}

main().catch((err) => {
	console.error('[notify-organizers] Uventet feil:', err);
	process.exit(1);
});
