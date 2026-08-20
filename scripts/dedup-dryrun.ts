/**
 * Viser hva deduplicate() ville slettet, uten å slette noe.
 *
 * Finnes fordi dedup sletter rader. Endrer man reglene, må man kunne se
 * konsekvensen før den inntreffer, og særlig hvilke par som er nye etter
 * endringen. Uten dette er alternativet å kjøre og håpe.
 */
import { supabase } from './lib/supabase.js';
import { normalizeTitle } from './lib/utils.js';
import { titlesMatch, titlerMatcherPaaSammeSted, sammeSted, scoreEvent } from './lib/dedup.js';

async function main() {
	const rader: any[] = [];
	for (let fra = 0; ; fra += 1000) {
		const { data } = await supabase
			.from('events')
			.select('id, title_no, date_start, source, venue_name, image_url, ticket_url, description_no')
			.order('id')
			.range(fra, fra + 999);
		rader.push(...(data ?? []));
		if (!data || data.length < 1000) break;
	}
	console.log(`${rader.length} arrangementer gjennomgått.\n`);

	const perDag = new Map<string, any[]>();
	for (const e of rader) {
		const dag = (e.date_start ?? '').slice(0, 10);
		if (!perDag.has(dag)) perDag.set(dag, []);
		perDag.get(dag)!.push(e);
	}

	let gammel = 0;
	let ny = 0;

	for (const [, dagens] of perDag) {
		if (dagens.length < 2) continue;
		const norm = dagens.map((e) => ({ ...e, n: normalizeTitle(e.title_no) }));
		const brukt = new Set<number>();

		for (let i = 0; i < norm.length; i++) {
			if (brukt.has(i)) continue;
			const gruppe = [{ e: norm[i], viaSted: false }];
			brukt.add(i);
			for (let j = i + 1; j < norm.length; j++) {
				if (brukt.has(j)) continue;
				const gammeltTreff = titlesMatch(norm[i].n, norm[j].n, norm[i].source, norm[j].source);
				const stedTreff =
					sammeSted(norm[i].venue_name, norm[j].venue_name) &&
					titlerMatcherPaaSammeSted(norm[i].title_no, norm[j].title_no, norm[i].source, norm[j].source);
				if (gammeltTreff || stedTreff) {
					gruppe.push({ e: norm[j], viaSted: !gammeltTreff });
					brukt.add(j);
				}
			}
			if (gruppe.length < 2) continue;

			gruppe.sort((a, b) => scoreEvent(b.e) - scoreEvent(a.e));
			const beholdes = gruppe[0].e;
			for (let k = 1; k < gruppe.length; k++) {
				const { e, viaSted } = gruppe[k];
				if (viaSted) {
					ny++;
					console.log(`NY   ${e.date_start?.slice(0, 10)}  ${e.venue_name}`);
					console.log(`     slettes: [${e.source}] ${e.title_no.replace(/\s+/g, ' ').slice(0, 60)}`);
					console.log(`     beholdes: [${beholdes.source}] ${beholdes.title_no.replace(/\s+/g, ' ').slice(0, 60)}`);
				} else {
					gammel++;
				}
			}
		}
	}

	console.log(`\n${gammel} par ville blitt slettet av reglene som allerede fantes.`);
	console.log(`${ny} par er nye, altså funnet av sted-testen.`);
}

main();
