/**
 * Monthly placement impression report.
 * Usage: npx tsx scripts/generate-placement-report.ts [YYYY-MM]
 * Defaults to last month if no argument is provided.
 *
 * Outputs a markdown table to stdout — copy/paste into monthly client email.
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(process.cwd(), '../.env') });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const supabaseKey =
	process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseKey) {
	console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Determine the reporting month
function resolveMonth(arg?: string): { label: string; start: string; end: string } {
	if (arg && /^\d{4}-\d{2}$/.test(arg)) {
		const [year, month] = arg.split('-').map(Number);
		const start = `${arg}-01`;
		const lastDay = new Date(year, month, 0).getDate();
		const end = `${arg}-${String(lastDay).padStart(2, '0')}`;
		return { label: arg, start, end };
	}
	// Default: last month
	const now = new Date();
	const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
	const year = d.getFullYear();
	const month = d.getMonth() + 1;
	const monthStr = `${year}-${String(month).padStart(2, '0')}`;
	const start = `${monthStr}-01`;
	const lastDay = new Date(year, month, 0).getDate();
	const end = `${monthStr}-${String(lastDay).padStart(2, '0')}`;
	return { label: monthStr, start, end };
}

const month = resolveMonth(process.argv[2]);

console.log(`\n# Gåri — Plasserings-rapport: ${month.label}\n`);
console.log(`Periode: ${month.start} → ${month.end}\n`);

const { data, error } = await supabase
	.from('placement_log')
	.select('venue_name, collection_slug, log_date, impression_count')
	.gte('log_date', month.start)
	.lte('log_date', month.end);

if (error) {
	console.error('Failed to query placement_log:', error.message);
	process.exit(1);
}

if (!data || data.length === 0) {
	console.log('Ingen data for denne perioden.');
	process.exit(0);
}

// Aggregate: key = `${venue_name}|${collection_slug}`
const agg = new Map<string, { venue: string; collection: string; days: Set<string>; impressions: number }>();

for (const row of data) {
	const key = `${row.venue_name}|${row.collection_slug}`;
	if (!agg.has(key)) {
		agg.set(key, {
			venue: row.venue_name,
			collection: row.collection_slug,
			days: new Set(),
			impressions: 0
		});
	}
	const entry = agg.get(key)!;
	entry.days.add(row.log_date);
	entry.impressions += row.impression_count;
}

// Sort by venue name, then collection slug
const rows = Array.from(agg.values()).sort((a, b) => {
	const v = a.venue.localeCompare(b.venue, 'nb');
	return v !== 0 ? v : a.collection.localeCompare(b.collection);
});

// Print markdown table
const colWidths = {
	venue: Math.max(5, ...rows.map(r => r.venue.length)),
	collection: Math.max(10, ...rows.map(r => r.collection.length)),
	days: 12,
	impressions: 16
};

function pad(s: string, n: number): string {
	return s.padEnd(n);
}

const header =
	`| ${pad('Venue', colWidths.venue)} | ${pad('Samling', colWidths.collection)} | ${pad('Dager vist', colWidths.days)} | ${pad('Totale visninger', colWidths.impressions)} |`;
const separator =
	`|-${'-'.repeat(colWidths.venue)}-|-${'-'.repeat(colWidths.collection)}-|-${'-'.repeat(colWidths.days)}-|-${'-'.repeat(colWidths.impressions)}-|`;

console.log(header);
console.log(separator);

for (const r of rows) {
	console.log(
		`| ${pad(r.venue, colWidths.venue)} | ${pad(r.collection, colWidths.collection)} | ${pad(String(r.days.size), colWidths.days)} | ${pad(String(r.impressions), colWidths.impressions)} |`
	);
}

console.log(`\nTotal rader: ${rows.length}`);
