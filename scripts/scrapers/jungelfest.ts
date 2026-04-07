import * as cheerio from 'cheerio';
import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, fetchHTML, bergenOffset } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

const SOURCE = 'jungelfest';
const TICKETCO_URL = 'https://jungelfest.ticketco.events/no/nb/e/jungelfest_2026';

// Festival edition — update yearly
const YEAR = 2026;
const DAY_DATES: Record<string, string> = {
	thursday: `${YEAR}-04-23`,
	friday: `${YEAR}-04-24`,
	saturday: `${YEAR}-04-25`,
};

const VENUE_INFO: Record<string, { name: string; address: string }> = {
	landmark: { name: 'Landmark', address: 'Rasmus Meyers allé 5, Bergen' },
	østre: { name: 'Østre', address: 'Østre Skostredet 3, Bergen' },
	ostre: { name: 'Østre', address: 'Østre Skostredet 3, Bergen' },
	kennel: { name: 'Kennel', address: 'Bergen' },
	steppeulven: { name: 'Steppeulven', address: 'Bergen' },
	rommet: { name: 'Rommet', address: 'Bergen' },
	'bergen assembly': { name: 'Bergen Assembly', address: 'Bergen' },
};

function titleCase(s: string): string {
	// Preserve all-caps acronyms (DJ, MC, USF, SULA), title-case the rest.
	return s
		.split(/(\s+)/)
		.map((word) => {
			if (/^\s+$/.test(word)) return word;
			if (word.length <= 3 && word === word.toUpperCase()) return word; // MC, DJ, SULA-like
			if (word === word.toUpperCase()) {
				return word.charAt(0) + word.slice(1).toLowerCase();
			}
			return word;
		})
		.join('');
}

interface ParsedItem {
	day: 'thursday' | 'friday' | 'saturday';
	artist: string;
	venueKey: string;
	kind: 'concert' | 'talk' | 'afterparty';
	freeText?: string; // for talk title or DJ list
	free?: boolean;
}

function buildIso(date: string, hour: number, minute = 0): string {
	const hh = String(hour).padStart(2, '0');
	const mm = String(minute).padStart(2, '0');
	const offset = bergenOffset(date);
	return new Date(`${date}T${hh}:${mm}:00${offset}`).toISOString();
}

function parseProgram(text: string): ParsedItem[] {
	const items: ParsedItem[] = [];
	const full = text.replace(/\s+/g, ' ');

	// The labels appear twice on the page (once in TICKET INFO, once in actual program).
	// Anchor on "CONCERT PROGRAM" — everything after it is the canonical program section.
	const cpIdx = full.indexOf('CONCERT PROGRAM');
	if (cpIdx === -1) return items;
	const t = full.slice(cpIdx);

	const concertMatch = t.match(/CONCERT PROGRAM[:\s]*(.*?)(?:TALKS\s*&|AFTERPARTIES|$)/i);
	const talksMatch = t.match(/TALKS\s*&\s*CONVERSATIONS[^:]*:\s*(.*?)(?:AFTERPARTIES|$)/i);
	const afterMatch = t.match(/AFTERPARTIES[:\s]*(.*?)(?:_{3,}|FESTIVAL APP|$)/i);

	const dayPattern = /(THURSDAY|FRIDAY|SATURDAY)\s*(\d{2}\.\d{2})[:\s]*/gi;

	function dayKey(label: string): 'thursday' | 'friday' | 'saturday' | null {
		const l = label.toLowerCase();
		if (l.startsWith('thu')) return 'thursday';
		if (l.startsWith('fri')) return 'friday';
		if (l.startsWith('sat')) return 'saturday';
		return null;
	}

	// CONCERTS — split by day, then "ARTIST (VENUE)" entries
	if (concertMatch) {
		const block = concertMatch[1];
		const parts = block.split(dayPattern);
		// parts: ["", "THURSDAY", "23.04", "...content...", "FRIDAY", "24.04", "...", ...]
		for (let i = 1; i < parts.length; i += 3) {
			const day = dayKey(parts[i]);
			if (!day) continue;
			const content = parts[i + 2] || '';
			const entryRegex = /([A-ZÆØÅa-zæøå0-9' .&-]+?)\s*\(([A-Za-zÆØÅæøå ]+)\)/g;
			let m: RegExpExecArray | null;
			while ((m = entryRegex.exec(content)) !== null) {
				const artist = m[1].trim();
				const venueKey = m[2].trim().toLowerCase();
				if (!artist || artist.length < 2) continue;
				items.push({ day, artist: titleCase(artist), venueKey, kind: 'concert' });
			}
		}
	}

	// TALKS — also dated, but format: "DAY DD.MM: Person: \"Title\" – talk"
	if (talksMatch) {
		const block = talksMatch[1];
		const parts = block.split(dayPattern);
		for (let i = 1; i < parts.length; i += 3) {
			const day = dayKey(parts[i]);
			if (!day) continue;
			const content = (parts[i + 2] || '').trim();
			// Take everything up to next "– talk" or end
			const talkMatch = content.match(/^(.*?)(?:–|-)\s*talk/i);
			const raw = (talkMatch ? talkMatch[1] : content).trim().replace(/[:]+$/, '').trim();
			if (!raw) continue;
			items.push({
				day,
				artist: raw,
				venueKey: 'bergen assembly',
				kind: 'talk',
				freeText: raw,
			});
		}
	}

	// AFTERPARTIES — format: "DAY DD.MM @ VENUE – DJ's: ..."
	if (afterMatch) {
		const block = afterMatch[1];
		const partyRegex = /(THURSDAY|FRIDAY|SATURDAY)\s*\d{2}\.\d{2}\s*@\s*([A-ZÆØÅ]+(?:\s+[A-ZÆØÅ]+)*)\s*[–-]/gi;
		let m: RegExpExecArray | null;
		while ((m = partyRegex.exec(block)) !== null) {
			const day = dayKey(m[1]);
			if (!day) continue;
			const venueKey = m[2].trim().toLowerCase();
			// Free entry except Rommet
			const free = !venueKey.includes('rommet');
			items.push({
				day,
				artist: `Jungelfest afterparty @ ${VENUE_INFO[venueKey]?.name || m[2].trim()}`,
				venueKey,
				kind: 'afterparty',
				free,
			});
		}
	}

	return items;
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	// Bail if all festival dates are in the past — needs yearly update
	const allPast = Object.values(DAY_DATES).every((d) => new Date(d) < new Date());
	if (allPast) {
		console.warn(`[${SOURCE}] All festival dates are in the past — update YEAR/DAY_DATES`);
		return { found: 0, inserted: 0 };
	}

	console.log(`\n[${SOURCE}] Fetching Jungelfest ${YEAR} program from TicketCo umbrella page...`);

	const html = await fetchHTML(TICKETCO_URL);
	if (!html) {
		console.error(`[${SOURCE}] Failed to fetch ${TICKETCO_URL}`);
		return { found: 0, inserted: 0 };
	}

	const $ = cheerio.load(html);
	const ogImage = $('meta[property="og:image"]').attr('content') || '';
	$('script,style').remove();
	const text = $('body').text();

	const items = parseProgram(text);
	console.log(`[${SOURCE}] Parsed ${items.length} program items`);

	let inserted = 0;
	for (const item of items) {
		const date = DAY_DATES[item.day];
		if (!date) continue;

		// Default times: concerts 20:00, talks 17:00, afterparties 23:00 CET/CEST
		const hour = item.kind === 'talk' ? 17 : item.kind === 'afterparty' ? 23 : 20;
		const dateStart = buildIso(date, hour);
		// End: concerts +3h, talks +1h, afterparties +3h (next day)
		const endHour = item.kind === 'talk' ? 18 : 23;
		const dateEnd = item.kind === 'afterparty'
			? buildIso(date, 23, 59)
			: buildIso(date, endHour, 59);

		const venue = VENUE_INFO[item.venueKey] || { name: item.venueKey, address: 'Bergen' };
		const bydel = mapBydel(venue.name) || 'Sentrum';

		const titlePrefix = item.kind === 'talk' ? 'Jungelfest talk' : 'Jungelfest';
		const title =
			item.kind === 'afterparty'
				? item.artist
				: `${titlePrefix}: ${item.artist}`;

		const slug = makeSlug(`jungelfest-${item.artist}`, date);
		const sourceUrl = `${TICKETCO_URL}#${date}-${slug}`;
		if (await eventExists(sourceUrl)) continue;

		const category = item.kind === 'talk' ? 'culture' : 'music';
		const aiDesc = await generateDescription({
			title: item.artist,
			venue: venue.name,
			category,
			date: dateStart,
			price: item.free ? '0' : '',
		});

		const success = await insertEvent({
			slug,
			title_no: title,
			description_no: aiDesc.no,
			description_en: aiDesc.en,
			title_en: aiDesc.title_en,
			category,
			date_start: dateStart,
			date_end: dateEnd,
			venue_name: venue.name,
			address: venue.address,
			bydel,
			price: item.free ? '0' : '',
			ticket_url: TICKETCO_URL,
			source: SOURCE,
			source_url: sourceUrl,
			image_url: ogImage,
			age_group: 'all',
			language: 'both',
			status: 'approved',
		});

		if (success) {
			console.log(`  + ${title} @ ${venue.name} (${date})`);
			inserted++;
		}
	}

	return { found: items.length, inserted };
}
