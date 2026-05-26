/**
 * Apply Festspillene time corrections from Shafrin Zaman 2026-05-26.
 *
 * Each entry is the festival's authoritative time. Matches existing rows by
 * source='festspillene', title LIKE pattern, and date_start day.
 *
 * Usage:
 *   cd scripts && npx tsx fix-festspillene-shafrin.ts          # dry-run
 *   cd scripts && npx tsx fix-festspillene-shafrin.ts --apply  # writes
 */

import 'dotenv/config';
import { supabase } from './lib/supabase.js';
import { bergenOffset } from './lib/utils.js';

interface Correction {
	titleMatch: string; // ILIKE pattern (use % wildcards)
	day: string; // YYYY-MM-DD
	start: string; // HH:MM in Bergen local time
	end: string; // HH:MM
}

const corrections: Correction[] = [
	// 27. mai — onsdag
	{ titleMatch: 'Festspillmøtet%', day: '2026-05-27', start: '09:00', end: '11:30' },
	{ titleMatch: 'Åpningsseremoni%', day: '2026-05-27', start: '12:30', end: '13:30' },
	{ titleMatch: 'Pianomesterklasse%', day: '2026-05-27', start: '10:00', end: '16:00' },
	{ titleMatch: 'Esa-Pekka Salonen%Bergen Filharmoniske%', day: '2026-05-27', start: '18:45', end: '20:15' },

	// 28. mai — torsdag
	{ titleMatch: 'Dirigentmesterklasse%', day: '2026-05-28', start: '11:00', end: '13:00' },
	{ titleMatch: 'Mesterklassekonsert%', day: '2026-05-28', start: '13:00', end: '14:15' },
	{ titleMatch: 'OperaOpptur%', day: '2026-05-28', start: '12:00', end: '15:00' },
	{ titleMatch: 'Studentradioen i Bergen%', day: '2026-05-28', start: '12:00', end: '14:00' },
	{ titleMatch: 'Mari Eriksmoen%Christian Grøvlen%', day: '2026-05-28', start: '19:00', end: '19:30' },
	{ titleMatch: 'Esa-Pekka Salonen%Bergen Filharmoniske%', day: '2026-05-28', start: '19:30', end: '21:00' },
	{ titleMatch: '%Hvem er vi%seks fot under%', day: '2026-05-28', start: '14:00', end: '18:00' },
	{ titleMatch: 'Lekoteket%', day: '2026-05-28', start: '15:00', end: '18:00' },
	{ titleMatch: 'Pianister fra%Jiri Hlinka%', day: '2026-05-28', start: '16:30', end: '17:00' },
	{ titleMatch: 'Kjærlighet%Død%sant%', day: '2026-05-28', start: '17:00', end: '18:00' },
	{ titleMatch: 'Unchained Melody%', day: '2026-05-28', start: '20:00', end: '21:00' },
	{ titleMatch: 'Mari Boine%', day: '2026-05-28', start: '19:30', end: '20:45' },
	{ titleMatch: 'Alexander Gadjiev%', day: '2026-05-28', start: '19:30', end: '21:05' },

	// 29. mai — fredag
	{ titleMatch: 'Lekoteket%', day: '2026-05-29', start: '10:00', end: '18:00' },
	{ titleMatch: 'Studentradioen i Bergen%', day: '2026-05-29', start: '12:00', end: '14:00' },
	{ titleMatch: 'OperaOpptur%', day: '2026-05-29', start: '12:00', end: '15:00' },
	{ titleMatch: '%Hvem er vi%seks fot under%', day: '2026-05-29', start: '14:00', end: '18:00' },
	{ titleMatch: 'Syng med%', day: '2026-05-29', start: '17:00', end: '18:00' },
	{ titleMatch: 'Hva er håp%', day: '2026-05-29', start: '17:00', end: '17:50' },
	{ titleMatch: 'Pop og politikk%', day: '2026-05-29', start: '17:00', end: '18:00' },
	{ titleMatch: 'Hagenkvartetten%', day: '2026-05-29', start: '18:00', end: '19:50' },
	{ titleMatch: 'Nordic Wind Orchestra%', day: '2026-05-29', start: '19:00', end: '19:30' },
	{ titleMatch: 'Cécile Lartigau%', day: '2026-05-29', start: '19:00', end: '20:00' },
	{ titleMatch: 'Unchained Melody%', day: '2026-05-29', start: '20:00', end: '21:00' },
	{ titleMatch: 'Lise Davidsen%', day: '2026-05-29', start: '20:30', end: '22:15' },
	{ titleMatch: 'Shovel Dance Collective%', day: '2026-05-29', start: '21:30', end: '22:30' },
	{ titleMatch: 'Landscaping%', day: '2026-05-29', start: '10:00', end: '18:00' },
];

function toIso(day: string, time: string): string {
	const offset = bergenOffset(day);
	return new Date(`${day}T${time}:00${offset}`).toISOString();
}

function fmtTime(iso: string | null): string {
	if (!iso) return '–';
	return new Date(iso).toLocaleString('nb-NO', {
		day: '2-digit',
		month: 'short',
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Oslo',
	});
}

async function main() {
	const apply = process.argv.includes('--apply');
	console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}\n`);

	let updated = 0;
	let unchanged = 0;
	let multiple = 0;
	let missing = 0;

	for (const c of corrections) {
		const dayStart = `${c.day}T00:00:00+02:00`;
		const dayEnd = `${c.day}T23:59:59+02:00`;
		const { data, error } = await supabase
			.from('events')
			.select('id, title_no, date_start, date_end')
			.eq('source', 'festspillene')
			.ilike('title_no', c.titleMatch)
			.gte('date_start', dayStart)
			.lte('date_start', dayEnd);

		if (error) {
			console.log(`✗ ${c.titleMatch} (${c.day}): DB error ${error.message}`);
			continue;
		}

		if (!data || data.length === 0) {
			console.log(`∅ MISSING: ${c.titleMatch} (${c.day})`);
			missing++;
			continue;
		}

		if (data.length > 1) {
			console.log(`! AMBIGUOUS: ${c.titleMatch} (${c.day}) — ${data.length} matches`);
			for (const m of data) console.log(`    - ${m.title_no} | ${fmtTime(m.date_start)}`);
			multiple++;
			continue;
		}

		const ev = data[0];
		const expectedStart = toIso(c.day, c.start);
		const expectedEnd = toIso(c.day, c.end);

		const startMatch = new Date(ev.date_start).getTime() === new Date(expectedStart).getTime();
		const endMatch =
			ev.date_end !== null && new Date(ev.date_end).getTime() === new Date(expectedEnd).getTime();

		if (startMatch && endMatch) {
			unchanged++;
			continue;
		}

		console.log(`◷ ${ev.title_no}`);
		if (!startMatch) console.log(`    start: ${fmtTime(ev.date_start)} → ${fmtTime(expectedStart)}`);
		if (!endMatch) console.log(`    end:   ${fmtTime(ev.date_end)} → ${fmtTime(expectedEnd)}`);

		if (apply) {
			const { error: updErr } = await supabase
				.from('events')
				.update({ date_start: expectedStart, date_end: expectedEnd })
				.eq('id', ev.id);
			if (updErr) {
				console.log(`    ✗ UPDATE failed: ${updErr.message}`);
				continue;
			}
		}
		updated++;
	}

	console.log(
		`\nSummary: ${updated} ${apply ? 'updated' : 'would update'}, ${unchanged} unchanged, ${missing} missing, ${multiple} ambiguous`,
	);
	if (multiple > 0) console.log('Resolve ambiguous matches by tightening titleMatch.');
	if (!apply && updated > 0) console.log('\nRe-run with --apply to write changes.');
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
