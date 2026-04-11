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
		const igHandle = getVenueInstagram(event.venue);
		if (igHandle) {
			lines.push(`${event.title}, @${igHandle}${timePart}`);
		} else {
			lines.push(`${event.title} @ ${event.venue}${timePart}`);
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
