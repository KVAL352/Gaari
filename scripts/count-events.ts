import { supabase } from './lib/supabase.js';

const { count } = await supabase.from('events').select('*', { count: 'exact', head: true });
console.log(`Total events in DB: ${count}`);

for (const src of ['visitbergen', 'bergenlive', 'bergenkommune', 'kulturikveld', 'barnasnorge', 'seed']) {
	const r = await supabase.from('events').select('*', { count: 'exact', head: true }).eq('source', src);
	console.log(`  ${src}: ${r.count}`);
}
