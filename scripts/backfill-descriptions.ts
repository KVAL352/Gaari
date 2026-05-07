/**
 * One-off — re-generate AI descriptions for events with thin content (<80 chars).
 * Idempotent: skips events that already have a longer description.
 */
import 'dotenv/config';
import { supabase } from './lib/supabase.js';
import { generateDescription } from './lib/ai-descriptions.js';

const MIN_DESC_LEN = 80;

async function main() {
	const nowUtc = new Date().toISOString();
	let all: any[] = [];
	let from = 0;
	while (true) {
		const { data } = await supabase
			.from('events')
			.select('id, title_no, description_no, description_en, title_en, venue_name, category, date_start, price')
			.gte('date_start', nowUtc)
			.order('id')
			.range(from, from + 999);
		if (!data || data.length === 0) break;
		all = all.concat(data);
		if (data.length < 1000) break;
		from += 1000;
	}

	const thin = all.filter(e => (e.description_no || '').length < MIN_DESC_LEN);
	console.log(`Found ${thin.length} events with description <${MIN_DESC_LEN} chars (out of ${all.length} future events)\n`);

	let updated = 0;
	let unchanged = 0;
	let failed = 0;

	for (const e of thin) {
		try {
			const desc = await generateDescription({
				title: e.title_no,
				venue: e.venue_name || 'Bergen',
				category: e.category,
				date: e.date_start,
				price: e.price || '',
			});

			// Only update if AI actually produced something better
			if (!desc.no || desc.no.length < MIN_DESC_LEN) {
				console.log(`  unchanged   ${e.title_no.slice(0, 60)}`);
				unchanged++;
				continue;
			}

			const update: any = { description_no: desc.no, description_en: desc.en };
			if (desc.title_en && (!e.title_en || e.title_en.trim().length === 0)) {
				update.title_en = desc.title_en;
			}
			const { error } = await supabase.from('events').update(update).eq('id', e.id);
			if (error) {
				console.log(`  FAILED      ${e.title_no.slice(0, 60)}: ${error.message}`);
				failed++;
			} else {
				console.log(`  updated     ${e.title_no.slice(0, 60)}`);
				updated++;
			}
		} catch (err: any) {
			console.log(`  ERROR       ${e.title_no.slice(0, 60)}: ${err.message?.slice(0, 80)}`);
			failed++;
		}
	}

	console.log(`\nDone. updated=${updated}  unchanged=${unchanged}  failed=${failed}`);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
