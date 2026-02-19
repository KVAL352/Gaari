import { supabase } from './lib/supabase.js';

// Count how many scraped events have price='0'
const { data, count } = await supabase.from('events')
	.select('title_no', { count: 'exact' })
	.in('source', ['visitbergen', 'bergenlive'])
	.eq('price', '0');

console.log(`Scraped events with price "0": ${count}`);
console.log('Examples:');
for (const e of (data || []).slice(0, 10)) {
	console.log(`  ${e.title_no}`);
}
