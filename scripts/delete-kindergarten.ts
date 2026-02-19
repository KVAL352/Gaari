import { supabase } from './lib/supabase.js';

console.log('Searching for kindergarten events...');

const { data, error } = await supabase
	.from('events')
	.select('id, title_no, source')
	.ilike('title_no', '%barnehage%');

if (error) {
	console.error('Query error:', error.message);
	process.exit(1);
}

console.log(`Found ${data.length} events with "barnehage" in title:`);
for (const e of data) {
	console.log(`  [${e.source}] ${e.title_no}`);
}

// Also search for "barnehager" in title (broader match)
const { data: data2 } = await supabase
	.from('events')
	.select('id, title_no, source')
	.ilike('title_no', '%barnehager%');

if (data2 && data2.length > 0) {
	// Merge, dedup by id
	const seen = new Set(data.map(e => e.id));
	for (const e of data2) {
		if (!seen.has(e.id)) {
			data.push(e);
			seen.add(e.id);
			console.log(`  [${e.source}] ${e.title_no}`);
		}
	}
}

if (data.length === 0) {
	console.log('No kindergarten events found.');
	process.exit(0);
}

console.log(`\nDeleting ${data.length} events...`);
let deleted = 0;
for (const e of data) {
	const { error: delErr } = await supabase.from('events').delete().eq('id', e.id);
	if (!delErr) {
		deleted++;
	} else {
		console.error(`  Failed to delete ${e.id}: ${delErr.message}`);
	}
}
console.log(`Deleted ${deleted} kindergarten events.`);
