import { error } from '@sveltejs/kit';
import { supabase } from '$lib/server/supabase';
import type { PageServerLoad } from './$types';

const BUCKET = 'social-media';

interface DayManifest {
	dayOfWeek: number;
	dayName: string;
	dateStr: string;
	slug: string;
	label: string;
	landingUrl: string;
	mp4Url: string | null;
	caption: string | null;
	storyCount: number;
	frameCount: number;
	durationSec: number;
	skipped: boolean;
	skipReason?: string;
}

interface WeekManifest {
	startMonday: string;
	endSaturday: string;
	generatedAt: string;
	days: DayManifest[];
	zipUrl?: string;
	storiesZipUrl?: string;
	carouselsZipUrl?: string;
}

export const load: PageServerLoad = async ({ params }) => {
	const { startdate } = params;
	if (!/^\d{4}-\d{2}-\d{2}$/.test(startdate)) throw error(404, 'Not found');

	const { data: urlData } = supabase.storage
		.from(BUCKET)
		.getPublicUrl(`week/${startdate}/manifest.json`);

	const res = await fetch(urlData.publicUrl);
	if (!res.ok) throw error(404, 'Week manifest not found');

	let manifest: WeekManifest;
	try {
		manifest = await res.json();
	} catch {
		throw error(500, 'Invalid week manifest');
	}

	// Fetch each day's stories.json so the checklist can render thumbnails per item.
	type StoryItem = { url: string; venue: string; igHandle: string | null; title: string };
	type DayChecklist = {
		dateStr: string;
		dayName: string;
		slug: string;
		label: string;
		stories: StoryItem[];
	};

	const checklist: DayChecklist[] = await Promise.all(
		manifest.days
			.filter(d => !d.skipped && d.storyCount > 0)
			.map(async d => {
				const { data: storyManifestUrl } = supabase.storage
					.from(BUCKET)
					.getPublicUrl(`${d.dateStr}/${d.slug}/stories.json`);
				try {
					const r = await fetch(storyManifestUrl.publicUrl);
					if (!r.ok) return { dateStr: d.dateStr, dayName: d.dayName, slug: d.slug, label: d.label, stories: [] };
					const stories = await r.json();
					return {
						dateStr: d.dateStr,
						dayName: d.dayName,
						slug: d.slug,
						label: d.label,
						stories: Array.isArray(stories) ? stories : []
					};
				} catch {
					return { dateStr: d.dateStr, dayName: d.dayName, slug: d.slug, label: d.label, stories: [] };
				}
			})
	);

	return { manifest, checklist };
};
