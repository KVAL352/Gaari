/**
 * Canary Management CLI
 *
 * Plant, list and remove canary events — synthetic listings used to detect
 * if a third party has copied Gåri's database. A canary is a real-looking
 * event whose unique fingerprint (title + venue + date combo) exists only
 * on Gåri. If the same combination appears on another site, it was copied.
 *
 * Usage:
 *   cd scripts && npx tsx canary-manage.ts list
 *   cd scripts && npx tsx canary-manage.ts add --json canary.json
 *   cd scripts && npx tsx canary-manage.ts remove <id>
 *   cd scripts && npx tsx canary-manage.ts signatures   # print active fingerprints
 *
 * Example canary.json:
 *   {
 *     "title_no": "Jazzkveld med Eirik Hægstad-trio",
 *     "title_en": "Jazz Evening with Eirik Hægstad Trio",
 *     "description_no": "En kveld med moderne jazz på Logen Teater...",
 *     "venue_name": "Logen Teater",
 *     "address": "Øvre Ole Bulls plass 6, Bergen",
 *     "bydel": "Sentrum",
 *     "category": "music",
 *     "date_start": "2026-09-14T20:00:00+02:00",
 *     "price": "",
 *     "ticket_url": "https://gaari.no/no",
 *     "source_url": "https://gaari.no/no"
 *   }
 *
 * The slug is generated from title + date. The event is inserted with
 * status='approved' and is_canary=true. Pick titles, artist names and
 * dates that look plausible but DO NOT match a real event anywhere.
 *
 * Env vars: PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { supabase } from './lib/supabase.js';
import { slugify } from './lib/utils.js';

interface CanarySeed {
	title_no: string;
	title_en?: string;
	description_no: string;
	description_en?: string;
	venue_name: string;
	address?: string;
	bydel?: string;
	category: string;
	date_start: string;
	date_end?: string;
	price?: string;
	ticket_url: string;
	source_url: string;
	image_url?: string;
}

function fmtDate(d: string | null): string {
	if (!d) return '–';
	return new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short', year: 'numeric' });
}

async function listCanaries() {
	const { data, error } = await supabase
		.from('events')
		.select('id, slug, title_no, venue_name, date_start, status, created_at')
		.eq('is_canary', true)
		.order('created_at', { ascending: false });

	if (error) {
		console.error('Failed to list canaries:', error.message);
		process.exit(1);
	}

	if (!data || data.length === 0) {
		console.log('No canary events planted.');
		return;
	}

	console.log(`\n${data.length} canary event(s):\n`);
	for (const c of data) {
		console.log(`  ${c.id.slice(0, 8)}  ${fmtDate(c.date_start).padEnd(16)}  ${c.title_no}`);
		console.log(`            venue: ${c.venue_name}`);
		console.log(`            slug:  ${c.slug}`);
		console.log(`            url:   https://gaari.no/no/events/${c.slug}\n`);
	}
}

async function printSignatures() {
	const { data, error } = await supabase
		.from('events')
		.select('title_no, venue_name, date_start')
		.eq('is_canary', true);

	if (error) {
		console.error('Failed to read canaries:', error.message);
		process.exit(1);
	}

	console.log('\nActive canary fingerprints (use these to scan competitors):\n');
	for (const c of data || []) {
		const date = c.date_start ? new Date(c.date_start).toISOString().slice(0, 10) : '?';
		console.log(`  "${c.title_no}" — ${c.venue_name} — ${date}`);
	}
	console.log('');
}

async function addCanary(jsonPath: string) {
	const raw = readFileSync(jsonPath, 'utf-8');
	const seed: CanarySeed = JSON.parse(raw);

	const dateForSlug = seed.date_start.slice(0, 10);
	const slug = `${slugify(seed.title_no)}-${dateForSlug}`;

	const { data: existing } = await supabase
		.from('events')
		.select('id')
		.eq('slug', slug)
		.maybeSingle();

	if (existing) {
		console.error(`A row with slug "${slug}" already exists. Refusing to insert.`);
		process.exit(1);
	}

	const row = {
		slug,
		title_no: seed.title_no,
		title_en: seed.title_en ?? null,
		description_no: seed.description_no,
		description_en: seed.description_en ?? null,
		venue_name: seed.venue_name,
		address: seed.address ?? null,
		bydel: seed.bydel ?? null,
		category: seed.category,
		date_start: seed.date_start,
		date_end: seed.date_end ?? null,
		price: seed.price ?? '',
		ticket_url: seed.ticket_url,
		source_url: seed.source_url,
		image_url: seed.image_url ?? null,
		source: 'canary',
		status: 'approved',
		is_canary: true
	};

	const { data, error } = await supabase
		.from('events')
		.insert(row)
		.select('id, slug')
		.single();

	if (error) {
		console.error('Insert failed:', error.message);
		process.exit(1);
	}

	console.log(`Planted canary ${data.id.slice(0, 8)} — https://gaari.no/no/events/${data.slug}`);
	console.log('Reminder: visit the URL to confirm the test-data notice renders.');
}

async function removeCanary(id: string) {
	const { data: existing, error: lookupError } = await supabase
		.from('events')
		.select('id, slug, is_canary')
		.eq('id', id)
		.single();

	if (lookupError || !existing) {
		console.error(`No event with id ${id}`);
		process.exit(1);
	}

	if (!existing.is_canary) {
		console.error(`Event ${id} is not a canary. Refusing to delete.`);
		process.exit(1);
	}

	const { error } = await supabase.from('events').delete().eq('id', id);
	if (error) {
		console.error('Delete failed:', error.message);
		process.exit(1);
	}

	console.log(`Removed canary ${existing.slug}`);
}

const [cmd, ...args] = process.argv.slice(2);

switch (cmd) {
	case 'list':
		await listCanaries();
		break;
	case 'signatures':
		await printSignatures();
		break;
	case 'add': {
		const jsonFlag = args.indexOf('--json');
		if (jsonFlag === -1 || !args[jsonFlag + 1]) {
			console.error('Usage: canary-manage.ts add --json <path>');
			process.exit(1);
		}
		await addCanary(args[jsonFlag + 1]);
		break;
	}
	case 'remove': {
		const id = args[0];
		if (!id) {
			console.error('Usage: canary-manage.ts remove <id>');
			process.exit(1);
		}
		await removeCanary(id);
		break;
	}
	default:
		console.log('Usage:');
		console.log('  canary-manage.ts list');
		console.log('  canary-manage.ts signatures');
		console.log('  canary-manage.ts add --json <path>');
		console.log('  canary-manage.ts remove <id>');
		process.exit(1);
}
