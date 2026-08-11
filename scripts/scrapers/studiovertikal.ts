import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, bergenOffset } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

/**
 * Studio Vertikal Klatresenter — Kokstad.
 *
 * Ingen nettverkskall. Studio Vertikal kjører booking via GoActiveBooking/BRP,
 * som er et bookingsystem uten offentlig programside å skrape (vurdert og
 * forkastet 2026-06-29). Tidene under er oppgitt skriftlig av Sofie Vervaet
 * (sofie@studiovertikal.no) i e-post 2026-07-01, der hun også ga eksplisitt
 * tillatelse til at arrangementene legges inn på gaari.no.
 *
 * Seniorklatringen er et fast ukentlig tilbud uten sluttdato, så den genereres
 * rullerende HORIZON_WEEKS frem i tid ved hver kjøring. Familiedagene er fire
 * konkrete datoer og listes eksplisitt.
 */

const SOURCE = 'studiovertikal';
const VENUE = 'Studio Vertikal';
const ADDRESS = 'Kokstadflaten 33, 5257 Kokstad';
const BASE_URL = 'https://studiovertikal.no';

// Hvor mange uker med seniorklatring som holdes synlig fremover.
const HORIZON_WEEKS = 8;

const THURSDAY = 4;
const SATURDAY = 6;

/**
 * Oppmøtetid for seniorklatring. Sofie 2026-07-01: "Klatringen er flyttet
 * mellom 9 juli til og med 6 august til kl 11:00 på grunn av våre
 * sommeråpningstider. I morgen og fra 13 august og utover høsten er det
 * oppmøte kl 10:00 igjen."
 *
 * Intervallene er inklusive i begge ender og sjekkes i rekkefølge.
 */
const SENIOR_TIMES: { from: string; until: string; hhmm: string }[] = [
	{ from: '2026-07-09', until: '2026-08-06', hhmm: '11:00' }, // sommeråpningstider
	{ from: '2026-08-13', until: '9999-12-31', hhmm: '10:00' }, // høst og videre
];

/**
 * Fire familiedager, bekreftet både i Sofies e-post og på
 * studiovertikal.no/familiedag/. Klokkeslettet manglet begge steder og ble
 * bekreftet av Sofie i e-post 2026-08-06: "Familiedag er i hele våre
 * åpningstider så lørdager er det mellom 11:00-20:00".
 *
 * Det er altså et drop-in-tilbud over hele dagen, ikke en økt med fast oppmøte.
 * Derfor settes både start og slutt, slik at visningen ikke gir inntrykk av at
 * man må møte presis kl. 11.
 */
const FAMILIEDAG_OPEN = '11:00';
const FAMILIEDAG_CLOSE = '20:00';

const FAMILIEDAGER: string[] = ['2026-08-15', '2026-09-12', '2026-10-10', '2026-11-28'];

/** YYYY-MM-DD i Oslo-tid for et gitt tidspunkt. */
function osloDate(d: Date): string {
	return d.toLocaleDateString('en-CA', { timeZone: 'Europe/Oslo' });
}

/** Oppmøtetid for seniorklatring på gitt dato, eller null utenfor kjent plan. */
function seniorTimeFor(date: string): string | null {
	for (const t of SENIOR_TIMES) {
		if (date >= t.from && date <= t.until) return t.hhmm;
	}
	return null;
}

/** Alle datoer for gitt ukedag fra i dag og HORIZON_WEEKS frem. */
function upcomingWeekdays(weekday: number, weeks: number): string[] {
	const out: string[] = [];
	const cursor = new Date();
	const horizon = new Date();
	horizon.setUTCDate(horizon.getUTCDate() + weeks * 7);

	while (cursor <= horizon) {
		if (cursor.getUTCDay() === weekday) out.push(osloDate(cursor));
		cursor.setUTCDate(cursor.getUTCDate() + 1);
	}
	return out;
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Genererer faste arrangementer for Studio Vertikal...`);

	const today = osloDate(new Date());

	type Planned = {
		date: string;
		hhmm: string;
		/** Stengetid. Settes kun for tilbud som varer hele dagen. */
		endHhmm?: string;
		title: string;
		category: string;
		ageGroup: string;
		price: string;
		path: string;
	};

	const planned: Planned[] = [];

	// Seniorklatring — ukentlig, torsdager.
	for (const date of upcomingWeekdays(THURSDAY, HORIZON_WEEKS)) {
		const hhmm = seniorTimeFor(date);
		if (!hhmm) continue; // utenfor kjent plan — hopp over heller enn å gjette
		planned.push({
			date,
			hhmm,
			title: 'Seniorklatring',
			category: 'sports',
			ageGroup: 'all',
			price: 'Se studiovertikal.no',
			path: '/seniorklatring/',
		});
	}

	// Familiedag — fire faste lørdager, åpent hele dagen.
	for (const date of FAMILIEDAGER) {
		if (date < today) continue;
		planned.push({
			date,
			hhmm: FAMILIEDAG_OPEN,
			endHhmm: FAMILIEDAG_CLOSE,
			title: 'Familiedag',
			category: 'family',
			ageGroup: 'family',
			price: '600 kr for hele familien',
			path: '/familiedag/',
		});
	}

	const found = planned.length;
	let inserted = 0;

	for (const p of planned) {
		// Én side dekker alle datoene, så datoen må inn i source_url for at
		// eventExists() skal kunne skille øktene fra hverandre.
		const sourceUrl = `${BASE_URL}${p.path}#${p.date}`;
		if (await eventExists(sourceUrl)) continue;

		const dateStart = new Date(`${p.date}T${p.hhmm}:00${bergenOffset(p.date)}`).toISOString();
		const dateEnd = p.endHhmm
			? new Date(`${p.date}T${p.endHhmm}:00${bergenOffset(p.date)}`).toISOString()
			: undefined;

		const aiDesc = await generateDescription({
			title: p.title,
			venue: VENUE,
			category: p.category,
			date: dateStart,
			price: p.price,
		});

		const success = await insertEvent({
			slug: makeSlug(p.title, p.date),
			title_no: p.title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			title_en: aiDesc.title_en,
			category: p.category,
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: VENUE,
			address: ADDRESS,
			bydel: mapBydel(VENUE),
			price: p.price,
			ticket_url: `${BASE_URL}${p.path}`,
			source: SOURCE,
			source_url: sourceUrl,
			age_group: p.ageGroup,
			language: 'no',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${p.title} ${p.date} kl. ${p.hhmm}`);
			inserted++;
		}
	}

	console.log(`[${SOURCE}] ${inserted} nye av ${found} planlagte`);
	return { found, inserted };
}
