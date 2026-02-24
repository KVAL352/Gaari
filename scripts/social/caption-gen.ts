import type { Category } from '../../src/lib/types.js';
import { getCategoryIcon } from '../../src/lib/utils.js';
import { formatEventTime } from '../../src/lib/utils.js';

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

	// Event list
	const listed = events.slice(0, MAX_LISTED_EVENTS);
	for (const event of listed) {
		const icon = getCategoryIcon(event.category);
		const time = formatEventTime(event.date_start, lang);
		const timePart = time ? (lang === 'en' ? `, ${time}` : `, kl. ${time}`) : '';
		lines.push(`${icon} ${event.title} \u2014 ${event.venue}${timePart}`);
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
	lines.push(`${ctaText} \u2192 ${collectionUrl}`);

	// Hashtags
	lines.push('');
	lines.push(hashtags.join(' '));

	return lines.join('\n');
}
