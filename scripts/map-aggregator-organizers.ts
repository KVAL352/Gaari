/**
 * Kartlegger hvilke arrangører vi bare når via billettplattformer.
 *
 * Aggregator-arrangementer har ofte tynn data: «Bergen» som venue_name,
 * generisk og:image, ingen adresse. Verre er at lenken går til plattformen og
 * ikke til arrangøren. Har arrangøren en egen side med program, er en dedikert
 * scraper bedre på alle måter, og dedup lar den vinne over aggregatorversjonen.
 *
 * Skriptet svarer på ett spørsmål: hvem er store nok til å være verdt en egen
 * scraper? Det henter ikke noe fra arrangørenes sider. Neste steg, inkludert
 * robots.txt, gjøres per kandidat etter sjekklisten i
 * docs/new-scraper-checklist.md.
 */
import { supabase } from './lib/supabase.js';
import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AGGREGATORER = ['ticketco', 'billetto', 'hoopla', 'tikkio', 'eventbrite'];
const her = dirname(fileURLToPath(import.meta.url));

/** Scrapere vi allerede har, utledet av filnavnene. Ingen liste å glemme. */
function eksisterendeScrapere(): Set<string> {
	return new Set(
		readdirSync(join(her, 'scrapers'))
			.filter((f) => f.endsWith('.ts'))
			.map((f) => f.replace(/\.ts$/, ''))
	);
}

function normaliser(navn: string): string {
	return navn
		.toLowerCase()
		.replace(/[^a-zæøå0-9]+/g, '')
		.trim();
}

async function main() {
	const scrapere = eksisterendeScrapere();

	const { data, error } = await supabase
		.from('events')
		.select('venue_name, source, source_url, ticket_url, date_start, image_url, address')
		.in('source', AGGREGATORER);
	if (error) throw new Error(error.message);

	console.log(`${data!.length} arrangementer fra ${AGGREGATORER.length} plattformer.\n`);

	type Rad = {
		venue: string;
		antall: number;
		kilder: Set<string>;
		utenAdresse: number;
		utenBilde: number;
		vert: Set<string>;
	};
	const per = new Map<string, Rad>();

	for (const e of data!) {
		const venue = (e.venue_name ?? '(uten sted)').trim();
		const n = normaliser(venue);
		if (!per.has(n))
			per.set(n, { venue, antall: 0, kilder: new Set(), utenAdresse: 0, utenBilde: 0, vert: new Set() });
		const r = per.get(n)!;
		r.antall++;
		r.kilder.add(e.source!);
		if (!e.address) r.utenAdresse++;
		if (!e.image_url) r.utenBilde++;
		// Underdomenet røper ofte at arrangøren har egen billettbutikk, som
		// sl.ticketco.events for Statsraad Lehmkuhl. Da finnes det som regel en
		// egen nettside bak også.
		try {
			r.vert.add(new URL(e.source_url ?? e.ticket_url ?? '').hostname);
		} catch {
			/* tom eller ugyldig url */
		}
	}

	const sortert = [...per.values()].sort((a, b) => b.antall - a.antall);

	console.log('Sted                                  ant  u/adr  u/bilde  plattform   egen billettvert');
	console.log('-'.repeat(100));
	for (const r of sortert.slice(0, 25)) {
		const dekket = scrapere.has(normaliser(r.venue)) ? ' [HAR SCRAPER]' : '';
		const verter = [...r.vert].filter((v) => !/^(www\.)?(ticketco|billetto|hoopla|tikkio|eventbrite)/.test(v));
		console.log(
			`${r.venue.slice(0, 36).padEnd(37)}${String(r.antall).padStart(3)}` +
				`${String(r.utenAdresse).padStart(7)}${String(r.utenBilde).padStart(9)}   ` +
				`${[...r.kilder].join(',').padEnd(11)} ${verter.slice(0, 2).join(' ')}${dekket}`
		);
	}

	const kandidater = sortert.filter((r) => r.antall >= 3 && !scrapere.has(normaliser(r.venue)));
	console.log(`\n${kandidater.length} steder med 3 eller flere arrangementer og ingen egen scraper.`);
	console.log(`Til sammen ${kandidater.reduce((s, r) => s + r.antall, 0)} arrangementer.`);
}

main();
