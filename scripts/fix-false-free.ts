import { supabase } from './lib/supabase.js';

// Reset events that were incorrectly marked as price "0" by the first fetch-prices script.
// These will show "Se pris" instead of "Gratis" until we can find their real prices.

const { data, error } = await supabase
	.from('events')
	.update({ price: '' })
	.in('source', ['visitbergen', 'bergenlive'])
	.eq('price', '0')
	.select('id, title_no');

if (error) {
	console.error('Error:', error.message);
} else {
	console.log(`Reset ${data.length} events from price "0" to "" (unknown):`);
	for (const e of data) {
		console.log(`  ${e.title_no}`);
	}
}
