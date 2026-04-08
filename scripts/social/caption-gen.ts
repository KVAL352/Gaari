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

	// Header
	lines.push(collectionTitle);
	lines.push('');

	// Event list with auto venue-tagging (no emojis — feedback_no_emojis)
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

	lines.push('');

	// CTA
	const ctaText = lang === 'en'
		? `See all ${events.length} events`
		: `Se alle ${events.length} arrangementer`;
	lines.push(`${ctaText}: ${collectionUrl}`);

	// Share CTA
	lines.push('');
	const shareText = lang === 'en'
		? 'Send to someone you want to hang out with'
		: 'Send til en du har lyst til å henge med';
	lines.push(shareText);

	// Hashtags
	lines.push('');
	lines.push(hashtags.join(' '));

	return lines.join('\n');
}
