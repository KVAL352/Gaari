import { makeSlug, eventExists, insertEvent, fetchHTML, bergenOffset } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'nattjazz';
const BASE_URL = 'https://www.nattjazz.no';

// 2026 spilleplan. Update for next year by changing this URL + the date guard below.
const SPILLEPLAN_URL = `${BASE_URL}/spilleplan2026`;
const FESTIVAL_LAST_DAY = '2026-06-07';

interface ConcertRecord {
	slug: string;
	title: string;
	date: string;          // YYYY-MM-DD
	time: string;          // HH:MM
	scene: string;         // e.g. "SARDINEN", "HALLEN USF"
	tagline?: string;
	fotokred?: string;     // photographer credit from Nattjazz CMS
}

function findNearestField(html: string, anchor: number, field: string, maxDistance = 4000): string | undefined {
	const re = new RegExp(`"${field}":"([^"\\\\]{1,200})"`, 'g');
	let best: string | undefined;
	let bestDist = maxDistance + 1;
	for (const m of html.matchAll(re)) {
		const dist = Math.abs((m.index ?? 0) - anchor);
		if (dist < bestDist) {
			bestDist = dist;
			best = m[1];
		}
	}
	return best;
}

function titleCase(s: string): string {
	// Only title-case strings that are entirely uppercase (Nattjazz convention).
	// Strings already in mixed case are left alone.
	const letters = s.replace(/[^A-ZÆØÅa-zæøå]/g, '');
	if (!letters || letters !== letters.toUpperCase()) return s;

	return s.toLowerCase().replace(/(?:^|[\s\-—–&/(])[a-zæøå]/g, ch => ch.toUpperCase());
}

function parseConcerts(html: string): ConcertRecord[] {
	// Each artist appears as a Wix CMS record. Anchor on the unique artist slug
	// (link-portfolio-1-title) and bind nearest fields within a tight 1500-char
	// window — wider windows let fields from neighbouring records leak in. A few
	// records (collab acts like "Møster/BBB/Garrubo") have no title1 in the CMS;
	// for those we fall back to a slug-derived display name.
	const linkRe = /"link-portfolio-1-title":"\\?\/artister\\?\/([a-z0-9-]+)"/g;
	const seen = new Set<string>();
	const out: ConcertRecord[] = [];

	for (const m of html.matchAll(linkRe)) {
		const slug = m[1];
		if (seen.has(slug)) continue;
		const anchor = m.index ?? 0;

		const title1 = findNearestField(html, anchor, 'title1', 1500);
		const date = findNearestField(html, anchor, 'date', 1500);
		const spilletid = findNearestField(html, anchor, 'spilletid', 1500);
		const scene = findNearestField(html, anchor, 'spillerDato1', 1500);
		const tagline = findNearestField(html, anchor, 'description', 1500);
		const fotokred = findNearestField(html, anchor, 'fotokred', 1500);

		// Require date — without it we can't insert anything sensible
		if (!date || !/^2\d{3}-\d{2}-\d{2}$/.test(date)) continue;

		// Parse time. Handle "18:30", "11.45 + 12.30", missing.
		// Default to 21:00 (typical festival start) when no time is given for the concert
		// (a few records on the spilleplan omit it — listings will still get correct day).
		let time = '21:00';
		if (spilletid) {
			const t = spilletid.trim();
			const tm = t.match(/(\d{1,2})[:.](\d{2})/);
			if (tm) {
				const hh = tm[1].padStart(2, '0');
				time = `${hh}:${tm[2]}`;
			}
		}

		// Fall back to slug-derived name when title1 is missing from the CMS record.
		const fallbackTitle = slug.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim()
			.replace(/\b[a-zæøå]/g, ch => ch.toUpperCase());
		const rawTitle = (title1 || fallbackTitle).trim();
		// Strip Nattjazz's free-concert markers (* / ** / ***)
		let cleanTitle = titleCase(rawTitle.replace(/\*+$/, '').trim());

		// Programserie "Jazz I Sikte: X" — flip to "X — Jazz i sikte" so dedup
		// doesn't merge two distinct concerts in the series on the same day.
		const series = cleanTitle.match(/^Jazz I Sikte:\s*(.+)$/i);
		if (series) cleanTitle = `${series[1].trim()} — Jazz i sikte`;

		seen.add(slug);
		out.push({
			slug,
			title: cleanTitle,
			date,
			time,
			scene: scene || '',
			tagline: tagline?.trim() || undefined,
			fotokred: fotokred?.trim() || undefined,
		});
	}

	return out;
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	// Skip when the festival period has ended (manual URL update needed for next year)
	const today = new Date(); today.setUTCHours(0, 0, 0, 0);
	if (new Date(FESTIVAL_LAST_DAY) < today) {
		console.warn(`[${SOURCE}] Festival period over (last day ${FESTIVAL_LAST_DAY}) — scraper needs URL update for next year`);
		return { found: 0, inserted: 0 };
	}

	console.log(`\n[${SOURCE}] Fetching spilleplan...`);

	const html = await fetchHTML(SPILLEPLAN_URL);
	if (!html) {
		console.error(`[${SOURCE}] Failed to fetch ${SPILLEPLAN_URL}`);
		return { found: 0, inserted: 0 };
	}

	const concerts = parseConcerts(html);
	console.log(`[${SOURCE}] ${concerts.length} concerts found in spilleplan`);

	let inserted = 0;
	for (const c of concerts) {
		const sourceUrl = `${BASE_URL}/artister/${c.slug}`;
		if (await eventExists(sourceUrl)) continue;

		const startIso = `${c.date}T${c.time}:00${bergenOffset(c.date)}`;
		// Sanity: skip past dates
		if (new Date(startIso) < today) continue;

		const displayTitle = `Nattjazz: ${c.title}`;
		// Normalize scene labels: "STUDIO USF " → "Studio USF", "ROMMET" → "Rommet",
		// "RØKERIET" → "Røkeriet". Split on whitespace so Æ/Ø/Å are preserved as
		// in-word characters (JavaScript's \b doesn't treat them as word chars).
		const sceneLabel = c.scene
			? c.scene.trim().toLowerCase().split(/\s+/)
				.map(w => w === 'usf' ? 'USF' : w.charAt(0).toUpperCase() + w.slice(1))
				.join(' ')
			: 'USF Verftet';

		const aiDesc = await generateDescription({
			title: `${c.title} på Nattjazz${c.tagline ? ` — ${c.tagline}` : ''}`,
			venue: 'USF Verftet',
			room: sceneLabel,
			category: 'music',
			date: new Date(startIso),
			price: '',
		});

		// Lagre fotokred selv om vi ikke viser bilde nå — hvis Nattjazz senere
		// godkjenner bildebruk, har vi kreditering klar uten å re-scrape.
		const success = await insertEvent({
			slug: makeSlug(displayTitle, c.date),
			title_no: displayTitle,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			title_en: aiDesc.title_en,
			category: 'music',
			date_start: startIso,
			venue_name: 'USF Verftet',
			address: 'Georgernes Verft 12, Bergen',
			bydel: 'Bergenhus',
			price: '',
			ticket_url: sourceUrl,
			source: SOURCE,
			source_url: sourceUrl,
			image_credit: c.fotokred,
			age_group: 'all',
			language: 'both',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${displayTitle} (${c.date} ${c.time}, ${sceneLabel})`);
			inserted++;
		}
	}

	return { found: concerts.length, inserted };
}
