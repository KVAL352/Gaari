/**
 * Rydder de midlertidige MailerLite-gruppene nyhetsbrevet lager.
 *
 * send-newsletter.ts lager én gruppe per profil per utsending og har aldri
 * slettet dem. 20. oktober 2026 var det 963 grupper i kontoen, 961 av dem
 * `newsletter-*`. Om MailerLite har et tak på antall grupper er ikke
 * bekreftet, men finnes det et tak på 1 000, feiler hele utsendingen.
 *
 * Usage:
 *   npx tsx newsletter-cleanup-groups.ts                  # bare visning
 *   npx tsx newsletter-cleanup-groups.ts --apply --max 1  # slett den eldste
 *   npx tsx newsletter-cleanup-groups.ts --apply          # slett alle som kvalifiserer
 *
 * Sletter bare grupper med navnet send-newsletter.ts gir dem, eldre enn
 * 7 dager. Teller aktive abonnenter før og etter, og stopper hvis tallet
 * går ned: at sletting av en gruppe lar abonnentene stå, har vi ikke sett
 * bekreftet i noen kilde ennå.
 */

import dotenv from 'dotenv';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { mailerliteBase, lagMlFetch, utenEpost, type MlFetch } from './lib/mailerlite.js';

export const MIN_ALDER_DAGER = 7;

// Nøyaktig formen fra createAndSendCampaign: `newsletter-${Date.now()}-${navn}`.
const GRUPPENAVN = /^newsletter-(\d{13})-/;

export interface MlGruppe {
	id: string;
	name: string;
}

export interface Slettbar {
	id: string;
	name: string;
	laget: Date;
}

/** Grupper som kan slettes, eldste først. Alt annet røres ikke. */
export function velgSlettbare(grupper: MlGruppe[], naaMs: number, minAlderDager = MIN_ALDER_DAGER): Slettbar[] {
	const grense = naaMs - minAlderDager * 86_400_000;
	return grupper
		.flatMap((g) => {
			const m = GRUPPENAVN.exec(g.name);
			if (!m) return [];
			const ms = Number(m[1]);
			return ms < grense ? [{ id: String(g.id), name: g.name, laget: new Date(ms) }] : [];
		})
		.sort((a, b) => a.laget.getTime() - b.laget.getTime());
}

export async function hentAlleGrupper(mlFetch: MlFetch): Promise<MlGruppe[]> {
	const grupper: MlGruppe[] = [];
	const limit = 100;
	for (let side = 1; ; side++) {
		const params = new URLSearchParams({ limit: String(limit), page: String(side), 'filter[name]': 'newsletter-' });
		const res = await mlFetch(`/groups?${params}`);
		if (!res.ok) throw new Error(`GET /groups feilet: ${res.status} ${utenEpost(await res.text())}`);
		const json = await res.json();
		const data = json.data as MlGruppe[];
		grupper.push(...data);
		const sisteSide = Number(json.meta?.last_page);
		if (data.length < limit || (Number.isFinite(sisteSide) && side >= sisteSide)) break;
	}
	return grupper;
}

export async function tellAktiveAbonnenter(mlFetch: MlFetch): Promise<number> {
	let antall = 0;
	let cursor: string | null = null;
	while (true) {
		const params = new URLSearchParams({ 'filter[status]': 'active', limit: '100' });
		if (cursor) params.set('cursor', cursor);
		const res = await mlFetch(`/subscribers?${params}`);
		if (!res.ok) throw new Error(`GET /subscribers feilet: ${res.status}`);
		const json = await res.json();
		antall += (json.data as unknown[]).length;
		cursor = json.meta?.next_cursor ?? null;
		if (!cursor || json.data.length < 100) break;
	}
	return antall;
}

export interface Resultat {
	funnet: number;
	slettbare: number;
	slettet: number;
	feilet: number;
	abonnenterFor?: number;
	abonnenterEtter?: number;
	stoppet?: string;
}

export async function ryddGrupper(opts: {
	mlFetch: MlFetch;
	naaMs: number;
	apply: boolean;
	max?: number;
	logg?: (linje: string) => void;
}): Promise<Resultat> {
	const logg = opts.logg ?? console.log;
	const grupper = await hentAlleGrupper(opts.mlFetch);
	const slettbare = velgSlettbare(grupper, opts.naaMs);
	const utvalg = opts.max === undefined ? slettbare : slettbare.slice(0, opts.max);

	logg(`Grupper med navn newsletter-*: ${grupper.length}`);
	logg(`Eldre enn ${MIN_ALDER_DAGER} dager (kan slettes): ${slettbare.length}`);
	if (slettbare.length > 0) {
		logg(`  Eldste: ${slettbare[0].laget.toISOString().slice(0, 10)}, nyeste: ${slettbare[slettbare.length - 1].laget.toISOString().slice(0, 10)}`);
	}
	const resultat: Resultat = { funnet: grupper.length, slettbare: slettbare.length, slettet: 0, feilet: 0 };

	if (!opts.apply) {
		logg(`Visning: ingenting slettet. Kjør med --apply${opts.max !== undefined ? ` --max ${opts.max}` : ''} for å slette ${utvalg.length}.`);
		return resultat;
	}
	if (utvalg.length === 0) return resultat;

	resultat.abonnenterFor = await tellAktiveAbonnenter(opts.mlFetch);
	logg(`Aktive abonnenter før: ${resultat.abonnenterFor}`);

	for (const g of utvalg) {
		const res = await opts.mlFetch(`/groups/${g.id}`, { method: 'DELETE' });
		if (res.ok) {
			resultat.slettet++;
			logg(`  Slettet ${g.name} (laget ${g.laget.toISOString().slice(0, 10)})`);
		} else {
			resultat.feilet++;
			logg(`  Feilet ${g.name}: ${res.status} ${utenEpost(await res.text())}`);
		}

		// Første sletting er prøven: forsvinner abonnenter med gruppa, stopper vi her.
		if (resultat.slettet === 1 && res.ok) {
			const etter = await tellAktiveAbonnenter(opts.mlFetch);
			if (etter < resultat.abonnenterFor) {
				resultat.abonnenterEtter = etter;
				resultat.stoppet = `Aktive abonnenter gikk fra ${resultat.abonnenterFor} til ${etter} etter første sletting`;
				logg(`STOPP: ${resultat.stoppet}`);
				return resultat;
			}
		}
	}

	resultat.abonnenterEtter = await tellAktiveAbonnenter(opts.mlFetch);
	logg(`Aktive abonnenter etter: ${resultat.abonnenterEtter}`);
	logg(`Slettet ${resultat.slettet}, feilet ${resultat.feilet}.`);
	if (resultat.abonnenterEtter < resultat.abonnenterFor) {
		resultat.stoppet = `Aktive abonnenter gikk fra ${resultat.abonnenterFor} til ${resultat.abonnenterEtter}`;
		logg(`ADVARSEL: ${resultat.stoppet}`);
	}
	return resultat;
}

function lesMax(argv: string[]): number | undefined {
	const i = argv.indexOf('--max');
	if (i === -1) return undefined;
	const n = Number(argv[i + 1]);
	if (!Number.isInteger(n) || n < 1) throw new Error('--max krever et helt tall over 0');
	return n;
}

async function main() {
	dotenv.config({ path: resolve(import.meta.dirname, '../.env') });
	const key = process.env.MAILERLITE_API_KEY;
	if (!key) throw new Error('MAILERLITE_API_KEY is not set');
	const mlFetch = lagMlFetch(mailerliteBase(), key);
	const r = await ryddGrupper({
		mlFetch,
		naaMs: Date.now(),
		apply: process.argv.includes('--apply'),
		max: lesMax(process.argv)
	});
	if (r.stoppet || r.feilet > 0) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
	main().catch((e) => {
		console.error(e instanceof Error ? e.message : e);
		process.exit(1);
	});
}
