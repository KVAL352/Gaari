import type { Category } from '../../src/lib/types.js';
import { formatEventTime } from '../../src/lib/utils.js';
import { getVenueInstagram } from '../lib/venues.js';

export interface CaptionEvent {
	title: string;
	venue: string;
	date_start: string;
	category: Category;
}

const MAX_LISTED_EVENTS = 10;

export function generateCaption(
	collectionTitle: string,
	events: CaptionEvent[],
	collectionUrl: string,
	hashtags: string[],
	lang: 'no' | 'en' = 'no'
): string {
	const lines: string[] = [];

	// Line 1 — opening (collection title doubles as the hook)
	lines.push(collectionTitle);

	// Line 2 — link ALWAYS comes second (see feedback_social_content.md)
	const linkLabel = lang === 'en' ? 'Full overview' : 'Full oversikt';
	lines.push(`${linkLabel}: ${collectionUrl}`);

	// Highlights intro
	lines.push('');
	lines.push(lang === 'en' ? 'Some handpicked highlights:' : 'Her er noen utvalgte godbiter:');

	// Event list with auto venue-tagging (no emojis — see feedback_communication.md)
	const listed = events.slice(0, MAX_LISTED_EVENTS);
	for (const event of listed) {
		const time = formatEventTime(event.date_start, lang);
		const timePart = time ? (lang === 'en' ? `, ${time}` : `, kl. ${time}`) : '';
		// Stedet leses FOER oppslaget. getVenueInstagram() gaar gjennom hele
		// VENUE_INSTAGRAM og kaster paa undefined, saa et arrangement uten sted
		// vil velte hele captionen hvis den kalles foerst.
		const sted = (event.venue ?? '').trim();
		const igHandle = sted ? getVenueInstagram(sted) : null;
		if (igHandle) {
			lines.push(`${event.title}, @${igHandle}${timePart}`);
		} else if (sted) {
			lines.push(`${event.title} @ ${sted}${timePart}`);
		} else {
			// Uten stedsnavn skal «@» ikke skrives. Sto det tomt, ble linjen
			// «Koroevelse — mandag 14. september @ , kl. 19:00», altsaa en
			// krukke som ser oedelagt ut i et offentlig innlegg. Funnet i
			// fredagsposten 7. september 2026.
			lines.push(`${event.title}${timePart}`);
		}
	}

	if (events.length > MAX_LISTED_EVENTS) {
		const remaining = events.length - MAX_LISTED_EVENTS;
		lines.push(lang === 'en' ? `... and ${remaining} more` : `... og ${remaining} til`);
	}

	// Hashtags
	lines.push('');
	lines.push(hashtags.join(' '));

	return lines.join('\n');
}
