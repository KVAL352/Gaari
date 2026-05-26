/**
 * Refresh date_start/date_end for existing source='festspillene' events.
 *
 * Fetches current event times from Storyblok and UPDATEs the DB where the
 * stored time differs from Storyblok. Use when Festspillene flags time
 * corrections (e.g. Shafrin Zaman 2026-05-26).
 *
 * Usage:
 *   cd scripts && npx tsx refresh-festspillene-times.ts          # dry-run, prints diff
 *   cd scripts && npx tsx refresh-festspillene-times.ts --apply  # writes UPDATEs
 */

import 'dotenv/config';
import { supabase } from './lib/supabase.js';
import { bergenOffset, delay } from './lib/utils.js';

const SOURCE = 'festspillene';
const STORYBLOK_TOKEN = '9GLqtx9xc3ueOm5rVi0sZgtt';
const STORYBLOK_API = 'https://api.storyblok.com/v2/cdn/stories';

interface EventContent {
	SyncId: string;
	SyncName: string;
	SyncScene: string;
	SyncEventStartTime: string;
	SyncEventEndTime: string;
	SyncBookingLink: { url: string };
	SyncPrivateEvent: boolean;
}

interface StoryblokStory {
	content: EventContent;
	uuid: string;
	name: string;
}

function toIso(syncTime: string): string {
	const offset = bergenOffset(syncTime.slice(0, 10));
	return new Date(`${syncTime.replace(' ', 'T')}:00${offset}`).toISOString();
}

async function fetchStoryblokEvents(): Promise<StoryblokStory[]> {
	const all: StoryblokStory[] = [];
	let page = 1;
	while (true) {
		const url = `${STORYBLOK_API}?token=${STORYBLOK_TOKEN}&filter_query[component][in]=Event&per_page=100&page=${page}&version=published`;
		const res = await fetch(url, {
			headers: { 'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)' },
		});
		if (!res.ok) {
			console.error(`HTTP ${res.status} on page ${page}`);
			break;
		}
		const data = await res.json();
		const stories: StoryblokStory[] = data.stories || [];
		if (stories.length === 0) break;
		all.push(...stories);
		page++;
		if (page > 1) await delay(1000);
	}
	return all;
}

async function main() {
	const apply = process.argv.includes('--apply');
	console.log(`Mode: ${apply ? 'APPLY' : 'DRY-RUN'}\n`);

	const stories = await fetchStoryblokEvents();
	console.log(`Fetched ${stories.length} stories from Storyblok\n`);

	const now = new Date();
	const cutoff = new Date(now.getTime() - 86400000);
	const future = stories.filter(s => {
		const t = s.content.SyncEventStartTime;
		if (!t || !t.startsWith('2026-')) return false;
		if (s.content.SyncPrivateEvent) return false;
		return new Date(toIso(t)).getTime() > cutoff.getTime();
	});

	console.log(`${future.length} future 2026 public events in Storyblok\n`);

	const { data: dbEvents, error } = await supabase
		.from('events')
		.select('id, title_no, date_start, date_end, source_url')
		.eq('source', SOURCE)
		.gte('date_start', new Date(cutoff).toISOString());

	if (error) {
		console.error('DB error:', error.message);
		process.exit(1);
	}

	const dbBySourceUrl = new Map((dbEvents ?? []).map(e => [e.source_url, e]));
	console.log(`${dbEvents?.length ?? 0} future festspillene events in DB\n`);

	let updated = 0;
	let unchanged = 0;
	let missing = 0;

	for (const story of future) {
		const c = story.content;
		const syncId = c.SyncId || story.uuid;
		const ticketUrl = c.SyncBookingLink?.url || '';
		const sourceUrl = ticketUrl || `https://www.fib.no/program/2026/#${syncId}`;

		const dbEvent = dbBySourceUrl.get(sourceUrl);
		if (!dbEvent) {
			missing++;
			continue;
		}

		const expectedStart = toIso(c.SyncEventStartTime);
		const expectedEnd = c.SyncEventEndTime ? toIso(c.SyncEventEndTime) : null;

		const startChanged = new Date(dbEvent.date_start).getTime() !== new Date(expectedStart).getTime();
		const endChanged =
			(dbEvent.date_end ? new Date(dbEvent.date_end).getTime() : null) !==
			(expectedEnd ? new Date(expectedEnd).getTime() : null);

		if (!startChanged && !endChanged) {
			unchanged++;
			continue;
		}

		const fmt = (iso: string | null) =>
			iso
				? new Date(iso).toLocaleString('nb-NO', {
						day: '2-digit',
						month: 'short',
						hour: '2-digit',
						minute: '2-digit',
						timeZone: 'Europe/Oslo',
					})
				: '–';

		console.log(`◷ ${c.SyncName} (${c.SyncScene || '?'})`);
		if (startChanged) {
			console.log(`    start: ${fmt(dbEvent.date_start)} → ${fmt(expectedStart)}`);
		}
		if (endChanged) {
			console.log(`    end:   ${fmt(dbEvent.date_end)} → ${fmt(expectedEnd)}`);
		}

		if (apply) {
			const { error: updErr } = await supabase
				.from('events')
				.update({ date_start: expectedStart, date_end: expectedEnd })
				.eq('id', dbEvent.id);
			if (updErr) {
				console.log(`    ✗ UPDATE failed: ${updErr.message}`);
				continue;
			}
		}
		updated++;
	}

	console.log(
		`\nSummary: ${updated} ${apply ? 'updated' : 'would update'}, ${unchanged} unchanged, ${missing} in Storyblok but not in DB`,
	);
	if (!apply && updated > 0) {
		console.log('\nRe-run with --apply to write changes.');
	}
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
