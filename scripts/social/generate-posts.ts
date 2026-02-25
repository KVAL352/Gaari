import { writeFileSync } from 'fs';
import { supabase } from '../lib/supabase.js';
import { getOsloNow, toOsloDateStr } from '../../src/lib/event-filters.js';
import { getCollection } from '../../src/lib/collections.js';
import { formatEventTime } from '../../src/lib/utils.js';
import { generateCarousel, type CarouselEvent } from './image-gen.js';
import { generateCaption, type CaptionEvent } from './caption-gen.js';
import type { GaariEvent } from '../../src/lib/types.js';

// ── Schedule config ──

interface CollectionSchedule {
	slug: string;
	/** Days of week to generate (0=Sun, 1=Mon, ..., 6=Sat). Empty = every day. */
	days: number[];
	postTime: string;
	hashtags: string[];
}

const SCHEDULES: CollectionSchedule[] = [
	{
		slug: 'denne-helgen',
		days: [4], // Thursday
		postTime: '16:00',
		hashtags: ['#bergen', '#bergenby', '#hvaskjer', '#hvaskjeribergen', '#helgibergen', '#bergenliv', '#bergensentrum', '#visitbergen', '#bergennorway', '#norgebergen']
	},
	{
		slug: 'i-kveld',
		days: [], // Daily
		postTime: '14:00',
		hashtags: ['#bergen', '#bergenby', '#hvaskjer', '#hvaskjeribergen', '#kveldibergen', '#bergenliv', '#bergensentrum', '#visitbergen', '#bergennorway', '#utibergen']
	},
	{
		slug: 'gratis',
		days: [1], // Monday
		postTime: '09:00',
		hashtags: ['#bergen', '#bergenby', '#hvaskjer', '#hvaskjeribergen', '#gratis', '#gratisibergen', '#gratisarrangementer', '#bergenliv', '#visitbergen', '#gratisbergen']
	},
	{
		slug: 'today-in-bergen',
		days: [], // Daily
		postTime: '09:00',
		hashtags: ['#bergen', '#bergennorway', '#visitbergen', '#todayinbergen', '#whattodoinbergen', '#bergenevents', '#thingstodoinbergen', '#bergentoday', '#norway', '#vestland']
	},
	{
		slug: 'familiehelg',
		days: [4], // Thursday
		postTime: '10:00',
		hashtags: ['#bergen', '#bergenby', '#hvaskjer', '#barnibergen', '#familiehelg', '#bergenfamilie', '#barninorge', '#familieliv', '#bergenbarn', '#visitbergen']
	},
	{
		slug: 'konserter',
		days: [1], // Monday
		postTime: '10:00',
		hashtags: ['#bergen', '#bergenby', '#hvaskjer', '#bergenkonsert', '#livemusikk', '#bergenmusikk', '#musikk', '#konsert', '#liveconcert', '#hvaskjeribergen']
	},
	{
		slug: 'studentkveld',
		days: [3, 4], // Wednesday + Thursday
		postTime: '15:00',
		hashtags: ['#bergen', '#bergenby', '#hvaskjer', '#studentbergen', '#bergenstudent', '#uib', '#hvlbergen', '#uteliv', '#bergennattliv', '#studentliv']
	},
	{
		slug: 'this-weekend',
		days: [4], // Thursday
		postTime: '10:00',
		hashtags: ['#bergen', '#bergennorway', '#visitbergen', '#thisweekend', '#weekendinbergen', '#bergenevents', '#whattodoinbergen', '#norway', '#bergenweekend', '#vestland']
	}
];

// Category-specific hashtags injected dynamically (up to 3 added per post)
const CATEGORY_HASHTAGS: Record<string, string[]> = {
	music: ['#bergenkonsert', '#livemusikk', '#bergenmusikk'],
	culture: ['#bergenkultur', '#kulturbergen', '#bergenutstilling'],
	theatre: ['#bergenteater', '#teater', '#forestilling'],
	family: ['#barnibergen', '#bergenfamilie', '#barnNorge'],
	food: ['#bergenmat', '#matibergen', '#bergenfood'],
	festival: ['#bergenfestival', '#festival', '#bergenby'],
	sports: ['#bergensport', '#idrettbergen', '#bergenidrott'],
	nightlife: ['#bergennattliv', '#uteliv', '#utpaabergen'],
	workshop: ['#bergenkurs', '#kurs', '#workshop'],
	student: ['#studentbergen', '#bergenstudent', '#studentliv'],
	tours: ['#bergentur', '#visitbergen', '#bergentours']
};

/** Returns up to 3 category-specific hashtags based on the dominant categories in the events. */
function getCategoryHashtags(events: Array<{ category: string }>): string[] {
	// Count category occurrences
	const counts = new Map<string, number>();
	for (const e of events) {
		counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
	}
	// Pick top 2 categories by frequency
	const topCategories = [...counts.entries()]
		.sort((a, b) => b[1] - a[1])
		.slice(0, 2)
		.map(([cat]) => cat);

	const tags: string[] = [];
	for (const cat of topCategories) {
		const catTags = CATEGORY_HASHTAGS[cat];
		if (catTags && catTags.length > 0) {
			tags.push(catTags[0]); // take the most specific tag for each category
		}
	}
	return tags;
}

const MAX_CAROUSEL_EVENTS = 8;

function shouldGenerateToday(schedule: CollectionSchedule, dayOfWeek: number): boolean {
	return schedule.days.length === 0 || schedule.days.includes(dayOfWeek);
}

const ENGLISH_SLUGS = new Set(['today-in-bergen', 'this-weekend']);

function formatDateRange(now: Date, slug: string): string {
	const isEnSlug = ENGLISH_SLUGS.has(slug);
	const locale = isEnSlug ? 'en-GB' : 'nb-NO';

	// Weekend collections: show "fredag 28. feb – søndag 2. mars" range
	if (slug === 'denne-helgen' || slug === 'familiehelg' || slug === 'this-weekend') {
		const day = now.getDay();
		const daysToFri = day <= 5 ? 5 - day : 5 - day + 7;
		const fri = new Date(now);
		fri.setDate(now.getDate() + daysToFri);
		const sun = new Date(fri);
		sun.setDate(fri.getDate() + 2);
		const dateOpts: Intl.DateTimeFormatOptions = { weekday: 'long', day: 'numeric', month: 'short' };
		const friStr = fri.toLocaleDateString(locale, dateOpts);
		const sunStr = sun.toLocaleDateString(locale, dateOpts);
		return `${friStr} \u2013 ${sunStr}`;
	}

	// Week-range collections
	if (slug === 'gratis' || slug === 'konserter') {
		const endOfWeek = new Date(now);
		const daysToSun = now.getDay() === 0 ? 0 : 7 - now.getDay();
		endOfWeek.setDate(now.getDate() + daysToSun);
		const nowStr = now.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
		const endStr = endOfWeek.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
		return `${nowStr} \u2013 ${endStr}`;
	}

	return now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' });
}

async function fetchEvents(): Promise<GaariEvent[]> {
	// Use start of today (Oslo) so evening events are included even when run late
	const todayOslo = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Oslo' });
	const nowOslo = `${todayOslo}T00:00:00`;

	const { data, error } = await supabase
		.from('events')
		.select('id,slug,title_no,title_en,description_no,category,date_start,date_end,venue_name,address,bydel,price,ticket_url,image_url,age_group,language,status')
		.in('status', ['approved', 'cancelled'])
		.gte('date_start', nowOslo)
		.order('date_start', { ascending: true })
		.limit(500);

	if (error) throw new Error(`Supabase query failed: ${error.message}`);
	if (!data || data.length === 0) return [];

	return data.map(e => ({
		...e,
		price: e.price === '' || e.price === null ? '' : isNaN(Number(e.price)) ? e.price : Number(e.price)
	}));
}

async function uploadToStorage(path: string, buffer: Buffer, contentType: string): Promise<string> {
	const { error } = await supabase.storage
		.from('social-posts')
		.upload(path, buffer, { contentType, upsert: true });

	if (error) throw new Error(`Storage upload failed (${path}): ${error.message}`);

	const { data: urlData } = supabase.storage.from('social-posts').getPublicUrl(path);
	return urlData.publicUrl;
}

async function upsertSocialPost(row: {
	collection_slug: string;
	generated_date: string;
	event_count: number;
	slide_count: number;
	image_urls: string[];
	caption: string;
	post_time: string;
}) {
	const { error } = await supabase
		.from('social_posts')
		.upsert(row, { onConflict: 'collection_slug,generated_date' });

	if (error) throw new Error(`Upsert social_posts failed: ${error.message}`);
}

async function main() {
	const startTime = Date.now();
	const now = getOsloNow();
	const dayOfWeek = now.getDay();
	const dateStr = toOsloDateStr(now);

	console.log(`Social post generation — ${dateStr} (day ${dayOfWeek})`);

	// Determine scheduled collections
	const scheduled = SCHEDULES.filter(s => shouldGenerateToday(s, dayOfWeek));
	if (scheduled.length === 0) {
		console.log('No collections scheduled for today.');
		return;
	}
	console.log(`Scheduled: ${scheduled.map(s => s.slug).join(', ')}\n`);

	// Fetch events
	const allEvents = await fetchEvents();
	if (allEvents.length === 0) {
		console.log('No events found in database. Exiting.');
		return;
	}
	console.log(`Fetched ${allEvents.length} events from Supabase\n`);

	// Filter to only active
	const active = allEvents.filter(e => e.status !== 'cancelled' && e.status !== 'expired');

	const results: Record<string, { eventCount: number; slideCount: number; success: boolean; error?: string }> = {};

	for (const schedule of scheduled) {
		console.log(`--- ${schedule.slug} ---`);
		const collection = getCollection(schedule.slug);
		if (!collection) {
			console.error(`Collection "${schedule.slug}" not found, skipping.`);
			results[schedule.slug] = { eventCount: 0, slideCount: 0, success: false, error: 'Collection not found' };
			continue;
		}

		// Apply collection filter
		const filtered = collection.filterEvents(active, now);
		if (filtered.length === 0) {
			console.log(`  0 events matched, skipping.\n`);
			results[schedule.slug] = { eventCount: 0, slideCount: 0, success: true };
			continue;
		}

		// Pick top events for carousel
		const topEvents = filtered
			.sort((a, b) => a.date_start.localeCompare(b.date_start))
			.slice(0, MAX_CAROUSEL_EVENTS);

		console.log(`  ${filtered.length} events matched, using ${topEvents.length} for carousel`);

		try {
			const isEnglish = ENGLISH_SLUGS.has(schedule.slug);
			const lang = isEnglish ? 'en' as const : 'no' as const;
			const title = isEnglish ? collection.title.en : collection.title.no;
			const collectionUrl = isEnglish
				? `gaari.no/en/${schedule.slug}`
				: `gaari.no/no/${schedule.slug}`;

			// Build carousel event data
			const carouselEvents: CarouselEvent[] = topEvents.map(e => ({
				title: e.title_no,
				venue: e.venue_name,
				time: formatEventTime(e.date_start, lang),
				category: e.category,
				imageUrl: e.image_url || undefined
			}));

			// Build caption event data
			const captionEvents: CaptionEvent[] = filtered.map(e => ({
				title: e.title_no,
				venue: e.venue_name,
				date_start: e.date_start,
				category: e.category
			}));

			const dateRange = formatDateRange(now, schedule.slug);

			// Generate carousel images (pass total event count for hook + CTA)
			const slides = await generateCarousel(
				title,
				dateRange,
				carouselEvents,
				collectionUrl,
				filtered.length
			);

			// Build final hashtag list: base tags + category-specific, capped at 15, deduplicated
			const categoryTags = getCategoryHashtags(topEvents);
			const allTags = [...new Set([...schedule.hashtags, ...categoryTags])].slice(0, 15);

			// Generate caption
			const caption = generateCaption(
				title,
				captionEvents,
				collectionUrl,
				allTags,
				lang
			);

			// Upload to Supabase Storage
			const imageUrls: string[] = [];
			for (let i = 0; i < slides.length; i++) {
				const path = `${dateStr}/${schedule.slug}/slide-${i + 1}.png`;
				const url = await uploadToStorage(path, slides[i], 'image/png');
				imageUrls.push(url);
				console.log(`  Uploaded slide ${i + 1}/${slides.length}`);
			}

			// Upload caption
			const captionPath = `${dateStr}/${schedule.slug}/caption.txt`;
			await uploadToStorage(captionPath, Buffer.from(caption, 'utf-8'), 'text/plain');
			console.log(`  Uploaded caption`);

			// Upsert metadata row
			await upsertSocialPost({
				collection_slug: schedule.slug,
				generated_date: dateStr,
				event_count: filtered.length,
				slide_count: slides.length,
				image_urls: imageUrls,
				caption,
				post_time: schedule.postTime
			});
			console.log(`  Upserted social_posts row\n`);

			results[schedule.slug] = { eventCount: filtered.length, slideCount: slides.length, success: true };
		} catch (err: any) {
			console.error(`  Failed: ${err.message}\n`);
			results[schedule.slug] = { eventCount: filtered.length, slideCount: 0, success: false, error: err.message };
		}
	}

	// Summary
	const durationSeconds = Math.round((Date.now() - startTime) / 1000);
	const generated = Object.entries(results).filter(([, r]) => r.success && r.slideCount > 0);
	const failed = Object.entries(results).filter(([, r]) => !r.success);

	console.log('=== Summary ===');
	for (const [slug, r] of Object.entries(results)) {
		const status = r.success ? (r.slideCount > 0 ? 'generated' : 'skipped (0 events)') : `FAILED: ${r.error}`;
		console.log(`  ${slug}: ${status} (${r.eventCount} events, ${r.slideCount} slides)`);
	}
	console.log(`\nDuration: ${durationSeconds}s`);

	const summary = {
		date: dateStr,
		collectionsScheduled: scheduled.length,
		collectionsGenerated: generated.length,
		collectionsFailed: failed.length,
		results,
		durationSeconds
	};

	console.log('\n' + JSON.stringify(summary));

	const summaryFile = process.env.SUMMARY_FILE;
	if (summaryFile) {
		writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
		console.log(`Summary written to ${summaryFile}`);
	}
}

main().catch(console.error);
