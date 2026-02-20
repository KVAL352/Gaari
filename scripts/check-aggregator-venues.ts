import { supabase } from './lib/supabase.js';
import { isAggregatorUrl } from './lib/venues.js';

const { data } = await supabase.from('events').select('venue_name, ticket_url, source');

const agg = new Map<string, { count: number; sources: Set<string> }>();

for (const e of data || []) {
	if (!e.ticket_url || !isAggregatorUrl(e.ticket_url)) continue;
	const name = (e.venue_name || 'Unknown').trim();
	if (!agg.has(name)) agg.set(name, { count: 0, sources: new Set() });
	const v = agg.get(name)!;
	v.count++;
	v.sources.add(e.source);
}

const sorted = [...agg.entries()].sort((a, b) => b[1].count - a[1].count);

console.log('=== Venues still with aggregator ticket_urls ===\n');
for (const [name, info] of sorted) {
	const src = [...info.sources].join(', ');
	console.log(`${String(info.count).padStart(4)} | ${name.slice(0, 50).padEnd(50)} | ${src}`);
}

const total = [...agg.values()].reduce((s, v) => s + v.count, 0);
console.log(`\nTotal remaining aggregator URLs: ${total}`);
console.log(`Unique venues with aggregator URLs: ${agg.size}`);
