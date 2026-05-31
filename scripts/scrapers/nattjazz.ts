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
	imageUrl?: string;     // hot-link URL on static.wixstatic.com
}

/**
 * Convert Wix internal image reference to a hot-linkable HTTPS URL.
 *
 * Input format (from Wix CMS):
 *   `wix:image://v1/991482_<hash>~mv2.jpg/<original-filename>#originWidth=W&originHeight=H`
 *
 * Output: static.wixstatic.com URL with 16:9 fill-transform (w=800, h=450),
 * matching the size we use for other festivals. Wix CDN respects Referer and
 * has no hot-link block as of 2026-05-28 — verifyHotlinkable() will catch any
 * future change automatically.
 */
function wixImageUrl(ref: string | undefined): string | undefined {
	if (!ref) return undefined;
	const m = ref.match(/^wix:image:\/\/v1\/(\S+?\.(?:jpg|jpeg|png|webp))\/([^#?]+)/i);
	if (!m) return undefined;
	const [, fileId, name] = m;
	return `https://static.wixstatic.com/media/${fileId}/v1/fill/w_800,h_450,al_c,q_85,enc_auto/${name}`;
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

/**
 * Like findNearestField but allows backslash-escaped characters in the value
 * (Wix image references contain `\/` and `~` sequences that the simpler regex
 * truncates at).
 */
function findNearestEscapedField(html: string, anchor: number, field: string, maxDistance = 4000): string | undefined {
	const re = new RegExp(`"${field}":"((?:[^"\\\\]|\\\\.){1,500})"`, 'g');
	let best: string | undefined;
	let bestDist = maxDistance + 1;
	for (const m of html.matchAll(re)) {
		const dist = Math.abs((m.index ?? 0) - anchor);
		if (dist < bestDist) {
			bestDist = dist;
			best = m[1];
		}
	}
	// Unescape JSON-style \/ and \" sequences so downstream parsers see real chars
	return best ? best.replace(/\\\//g, '/').replace(/\\"/g, '"') : best;
}

// Minimal HTML entity decoder for table-extracted titles (& → &amp;, etc).
// Cheerio would be overkill for the handful of entities Wix actually emits here.
function decodeEntities(s: string): string {
	return s
		.replace(/&amp;/g, '&')
		.replace(/&quot;/g, '"')
		.replace(/&#(?:x27|39);/g, "'")
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&nbsp;/g, ' ');
}

function titleCase(s: string): string {
	// Only title-case strings that are entirely uppercase (Nattjazz convention).
	// Strings already in mixed case are left alone.
	const letters = s.replace(/[^A-ZÆØÅa-zæøå]/g, '');
	if (!letters || letters !== letters.toUpperCase()) return s;

	return s.toLowerCase().replace(/(?:^|[\s\-—–&/(])[a-zæøå]/g, ch => ch.toUpperCase());
}

// Norwegian month names → number, used by parseTableRows() to decode date headers
// like "FREDAG 29 MAI" or "LØRDAG 6 JUNI".
const NB_MONTH: Record<string, number> = { 'MAI': 5, 'JUNI': 6, 'JULI': 7 };

/**
 * Authoritative source for date/time/venue/title: the visible HTML table.
 *
 * Date is determined by the most recent `<weekday> <day> <month>` header
 * preceding each artist row — same way a human reads the spilleplan. This
 * removes the previous JSON "nearest-date" fragility that occasionally
 * picked up a neighbour artist's date (e.g. Nubiyan Twist showing as
 * 2026-06-01 when its row is under FREDAG 29 MAI, 2026-05-29).
 *
 * Image and tagline still come from the Wix JSON anchored on the slug,
 * since the table doesn't carry those fields.
 */
function parseTableRows(html: string): Array<{ slug: string; title: string; date: string; time: string; scene: string; htmlPos: number }> {
	// 1) Index date headers by position
	const headerRe = /(?:FREDAG|LØRDAG|SØNDAG|MANDAG|TIRSDAG|ONSDAG|TORSDAG)\s+(\d{1,2})\s+(MAI|JUNI|JULI)/g;
	const headers: Array<[number, string]> = [];
	for (const m of html.matchAll(headerRe)) {
		const day = parseInt(m[1], 10);
		const mon = NB_MONTH[m[2]];
		if (!mon) continue;
		headers.push([m.index ?? 0, `2026-${String(mon).padStart(2, '0')}-${String(day).padStart(2, '0')}`]);
	}

	// 2) Match each artist row: three consecutive table cells (title, time, venue)
	// all pointing to the same /artister/<slug>. The {0,800} windows tolerate the
	// styling chunks Wix injects between cells. The time cell allows both `:` and
	// `.` separators (Bajazz family concerts use `11.45 + 12.30`).
	const rowRe = /\/artister\/([a-z0-9-]+)"[^>]*><div[^>]*>([^<]+)<\/div>[\s\S]{0,800}?\/artister\/\1"[^>]*><div[^>]*>(\d{1,2}[:.]\d{2}[^<]*)<\/div>[\s\S]{0,800}?\/artister\/\1"[^>]*><div[^>]*>([^<]+)<\/div>/g;
	const seen = new Set<string>();
	const rows: Array<{ slug: string; title: string; date: string; time: string; scene: string; htmlPos: number }> = [];

	for (const m of html.matchAll(rowRe)) {
		const slug = m[1];
		if (seen.has(slug)) continue;
		seen.add(slug);

		const pos = m.index ?? 0;
		// Latest date header BEFORE this row
		let date: string | null = null;
		for (const [dpos, ddate] of headers) {
			if (dpos < pos) date = ddate;
			else break;
		}
		if (!date) continue;

		// Time can be `21:00`, `11.45`, `11.45 + 12.30`. Take the first HH:MM-like
		// segment, normalise `.` to `:`. Multi-time entries are kept as the first
		// performance — same behaviour as the previous JSON-based parser.
		const timeMatch = m[3].match(/(\d{1,2})[:.](\d{2})/);
		if (!timeMatch) continue;
		const time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2]}`;

		rows.push({
			slug,
			title: decodeEntities(m[2].trim()),
			date,
			time,
			scene: decodeEntities(m[4].trim()),
			htmlPos: pos,
		});
	}

	return rows;
}

function parseConcerts(html: string): ConcertRecord[] {
	const rows = parseTableRows(html);
	const out: ConcertRecord[] = [];

	for (const row of rows) {
		// Supplementary fields (tagline, photographer credit, image) still come
		// from the Wix JSON. Anchor at the HTML-table row position — much tighter
		// than the previous global "nearest field" scan, and aligned with the
		// visual layout we just parsed.
		const tagline = findNearestField(html, row.htmlPos, 'description', 3000);
		const fotokred = findNearestField(html, row.htmlPos, 'fotokred', 3000);
		const imageRef = findNearestEscapedField(html, row.htmlPos, 'image', 3000);

		// Strip Nattjazz's free-concert markers (* / ** / ***) and title-case
		// purely-uppercase strings (e.g. "NUBIYAN TWIST" → "Nubiyan Twist").
		let cleanTitle = titleCase(row.title.replace(/\*+$/, '').trim());

		// Programserie "Jazz I Sikte: X" → "X — Jazz i sikte" so dedup doesn't
		// merge two distinct concerts in the series on the same day.
		const series = cleanTitle.match(/^Jazz I Sikte:\s*(.+)$/i);
		if (series) cleanTitle = `${series[1].trim()} — Jazz i sikte`;

		out.push({
			slug: row.slug,
			title: cleanTitle,
			date: row.date,
			time: row.time,
			scene: row.scene,
			tagline: tagline?.trim() || undefined,
			fotokred: fotokred?.trim() || undefined,
			imageUrl: wixImageUrl(imageRef),
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
			image_url: c.imageUrl,
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
