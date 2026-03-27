import { supabase } from '../lib/supabase.js';
import { postWithImages } from '../lib/bluesky-client.js';
import { getOsloNow, toOsloDateStr } from '../../src/lib/event-filters.js';

const BLUESKY_MAX_TEXT = 300; // Bluesky character limit

/** Bluesky collections to post — Phase 1: only weekend guide while building audience. */
const BLUESKY_SLUGS = new Set([
	'denne-helgen',   // Weekend guide (Thu)
]);

const ENGLISH_SLUGS = new Set(['today-in-bergen', 'this-weekend']);

/** Strip all emoji and zero-width joiners from text. */
function stripEmojis(text: string): string {
	return text
		.replace(/\p{Emoji_Presentation}/gu, '')
		.replace(/\p{Extended_Pictographic}/gu, '')
		.replace(/\u200D/g, '')
		.replace(/\uFE0F/g, '')
		.replace(/\s{2,}/g, ' ')
		.trim();
}

/** Extract event names from Instagram caption lines (skip title, strip emoji/venue/time). */
function extractEventNames(caption: string): string[] {
	const lines = caption.split('\n');
	const events: string[] = [];
	let skippedTitle = false;
	for (const line of lines) {
		// Skip hashtags, CTA lines, "and more" lines, empty lines
		if (line.startsWith('#') || line.startsWith('Se alle') || line.startsWith('See all') || line.startsWith('...') || !line.trim()) continue;
		// First non-empty line is the collection title — skip it
		if (!skippedTitle) { skippedTitle = true; continue; }
		const cleaned = stripEmojis(line);
		if (!cleaned) continue;
		// Event lines look like: "Event Name — Venue, kl. 17:00"
		const name = cleaned.split(' \u2014 ')[0]?.trim();
		if (name) events.push(name);
	}
	return events;
}

/** Bluesky caption templates. Natural, conversational, like a local tip. */
const TEMPLATES: Record<string, { no?: (events: string[], count: number, url: string) => string; en?: (events: string[], count: number, url: string) => string }> = {
	'i-kveld': {
		no: (events, count, url) => {
			const picks = events.slice(0, 3).join(', ');
			return `I Bergen i kveld kan du blant annet få med deg ${picks}.\n\nSjekk ${url} for alt som skjer i kveld.`;
		}
	},
	'today-in-bergen': {
		en: (events, count, url) => {
			const picks = events.slice(0, 3).join(', ');
			return `In Bergen today you can catch ${picks}, among others.\n\nSee everything happening today at ${url}`;
		}
	},
	'denne-helgen': {
		no: (events, count, url) => {
			const picks = events.slice(0, 3).join(', ');
			return `Denne helgen i Bergen kan du blant annet få med deg ${picks}.\n\nSe alt som skjer denne helgen på ${url}`;
		}
	},
	'this-weekend': {
		en: (events, count, url) => {
			const picks = events.slice(0, 3).join(', ');
			return `This weekend in Bergen: ${picks}, among others.\n\nSee the full weekend guide at ${url}`;
		}
	},
	'gratis': {
		no: (events, count, url) => {
			const picks = events.slice(0, 3).join(', ');
			return `Gratis i Bergen: ${picks}. Vi fant ${count} gratisarrangementer.\n\nSe alle på ${url}`;
		}
	},
	'konserter': {
		no: (events, count, url) => {
			const picks = events.slice(0, 3).join(', ');
			return `Konserter i Bergen: ${picks}. ${count} konserter totalt.\n\nSjekk alle på ${url}`;
		}
	},
	'teater': {
		no: (events, count, url) => {
			const picks = events.slice(0, 3).join(', ');
			return `Teater i Bergen: ${picks}. ${count} forestillinger de neste to ukene.\n\nSe alle på ${url}`;
		}
	},
	'utstillinger': {
		no: (events, count, url) => {
			const picks = events.slice(0, 3).join(', ');
			return `Utstillinger i Bergen: ${picks}. ${count} kulturarrangementer de neste to ukene.\n\nSe alle på ${url}`;
		}
	},
	'mat-og-drikke': {
		no: (events, count, url) => {
			const picks = events.slice(0, 3).join(', ');
			return `Mat i Bergen: ${picks}. ${count} matopplevelser de neste to ukene.\n\nSe alle på ${url}`;
		}
	}
};

/** Build a natural Bluesky caption — text only, link card handles the visual. */
function buildCaption(caption: string, slug: string, eventCount: number): string {
	const isEn = ENGLISH_SLUGS.has(slug);
	const events = extractEventNames(caption);
	const url = isEn ? `gaari.no/en/${slug}` : `gaari.no/no/${slug}`;

	const template = TEMPLATES[slug];
	let text: string;

	if (template) {
		const fn = isEn ? template.en : template.no;
		text = fn ? fn(events, eventCount, url) : '';
	}

	if (!text!) {
		const picks = events.slice(0, 3).join(', ');
		text = isEn
			? `In Bergen: ${picks}. ${eventCount} events.\n\n${url}`
			: `I Bergen: ${picks}. ${eventCount} arrangementer.\n\n${url}`;
	}

	if (text.length > BLUESKY_MAX_TEXT) {
		text = text.slice(0, BLUESKY_MAX_TEXT - 1) + '\u2026';
	}

	return text;
}

async function main() {
	const now = getOsloNow();
	const dateStr = toOsloDateStr(now);
	const dryRun = process.argv.includes('--dry-run');

	console.log(`Bluesky posting — ${dateStr}${dryRun ? ' (DRY RUN)' : ''}\n`);

	// Fetch today's social posts that haven't been posted to Bluesky
	const { data: posts, error } = await supabase
		.from('social_posts')
		.select('*')
		.eq('generated_date', dateStr)
		.is('bluesky_uri', null)
		.gt('slide_count', 0);

	if (error) {
		console.error(`Supabase query failed: ${error.message}`);
		process.exit(1);
	}

	if (!posts || posts.length === 0) {
		console.log('No unposted social posts for today.');
		return;
	}

	// Filter to Bluesky-eligible collections
	const eligible = posts.filter(p => BLUESKY_SLUGS.has(p.collection_slug));
	if (eligible.length === 0) {
		console.log('No Bluesky-eligible collections to post today.');
		return;
	}

	console.log(`Found ${eligible.length} posts to publish: ${eligible.map(p => p.collection_slug).join(', ')}\n`);

	let posted = 0;
	let failed = 0;

	for (const post of eligible) {
		const slug = post.collection_slug;
		console.log(`--- ${slug} ---`);

		try {
			// Build text-only caption with link
			const caption = buildCaption(post.caption, slug, post.event_count);
			const isEn = ENGLISH_SLUGS.has(slug);
			const linkUrl = isEn
				? `https://gaari.no/en/${slug}`
				: `https://gaari.no/no/${slug}`;

			console.log(`  Caption (${caption.length} chars):`);
			console.log(`  ${caption.split('\n').join('\n  ')}`);

			if (dryRun) {
				console.log(`  [DRY RUN] Would post text + link card\n`);
				posted++;
				continue;
			}

			// Post text with link card (no images — cleaner on Bluesky)
			console.log(`  Posting to Bluesky...`);
			const result = await postWithImages(caption, [], linkUrl);
			console.log(`  Posted: ${result.uri}\n`);

			// Update social_posts row
			const { error: updateError } = await supabase
				.from('social_posts')
				.update({
					bluesky_uri: result.uri,
					bluesky_posted_at: new Date().toISOString()
				})
				.eq('id', post.id);

			if (updateError) {
				console.error(`  Warning: post succeeded but DB update failed: ${updateError.message}`);
			}

			posted++;

			// Rate limit: wait 2s between posts
			if (eligible.indexOf(post) < eligible.length - 1) {
				await new Promise(r => setTimeout(r, 2000));
			}
		} catch (err: any) {
			console.error(`  FAILED: ${err.message}\n`);
			failed++;
		}
	}

	console.log(`\n=== Summary ===`);
	console.log(`  Posted: ${posted}`);
	console.log(`  Failed: ${failed}`);

	if (failed > 0 && posted === 0) {
		process.exit(1);
	}
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
