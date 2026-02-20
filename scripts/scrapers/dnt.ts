import { mapBydel } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, delay } from '../lib/utils.js';

const SOURCE = 'dnt';
const API_URL = 'https://www.dnt.no/api/activities';
const PAGE_SIZE = 50;

interface DNTActivity {
	id: number;
	pageTitle: string;
	url: string;
	level: string;
	activityViewModel: {
		eventLocation: string;
		imageUrl: string;
		mainType: string;
		targetGroups: string;
		duration: string;
		start: string;
		end: string;
		isFull: boolean;
		isCancelled: boolean;
		isOverdue: boolean;
	};
}

interface DNTResponse {
	totalMatching: number;
	pageCount: number;
	page: number;
	pageSize: number;
	pageHits: DNTActivity[];
}

function mapCategory(mainType: string): string {
	switch (mainType.toLowerCase()) {
		case 'fellestur': return 'tours';
		case 'kurs': return 'workshop';
		case 'arrangement': return 'culture';
		default: return 'sports';
	}
}

function mapAgeGroup(targetGroups: string): string {
	const lower = targetGroups.toLowerCase();
	if (lower.includes('barn')) return 'family';
	if (lower.includes('ungdom') && !lower.includes('voksne') && !lower.includes('senior')) return 'students';
	return 'all';
}

function parseVenue(eventLocation: string): { venue: string; address: string } {
	const parts = eventLocation.split(' / ');
	return {
		venue: parts[0]?.trim() || 'Bergen',
		address: parts[1]?.trim() || parts[0]?.trim() || 'Bergen',
	};
}

function buildDescription(activity: DNTActivity): string {
	const parts: string[] = [];
	const vm = activity.activityViewModel;

	if (activity.level && vm.mainType) {
		parts.push(`${activity.level} ${vm.mainType.toLowerCase()}`);
	} else if (vm.mainType) {
		parts.push(vm.mainType);
	}

	if (vm.duration) parts.push(vm.duration);

	const desc = parts.join(', ');
	if (vm.targetGroups) {
		return `${desc}. ${vm.targetGroups}`;
	}
	return desc;
}

export async function scrape(): Promise<{ found: number; inserted: number }> {
	console.log(`\n[${SOURCE}] Fetching DNT Bergen activities...`);

	let found = 0;
	let inserted = 0;
	let page = 1;
	let pageCount = 1;

	while (page <= pageCount) {
		const url = `${API_URL}?municipalities=4601&size=${PAGE_SIZE}&page=${page}`;
		const res = await fetch(url, {
			headers: {
				'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)',
				'Accept': 'application/json',
			},
		});

		if (!res.ok) {
			console.error(`[${SOURCE}] HTTP ${res.status} on page ${page}`);
			break;
		}

		const data: DNTResponse = await res.json();
		pageCount = data.pageCount;

		if (page === 1) {
			console.log(`[${SOURCE}] Found ${data.totalMatching} activities (${pageCount} pages)`);
		}

		for (const activity of data.pageHits) {
			found++;
			const vm = activity.activityViewModel;

			// Skip cancelled, overdue, or full activities
			if (vm.isCancelled || vm.isOverdue || vm.isFull) continue;

			const sourceUrl = `https://www.dnt.no${activity.url}`;
			if (await eventExists(sourceUrl)) continue;

			const { venue, address } = parseVenue(vm.eventLocation);
			const category = mapCategory(vm.mainType);
			const ageGroup = mapAgeGroup(vm.targetGroups);
			const bydel = mapBydel(venue);
			const datePart = vm.start.slice(0, 10);

			const success = await insertEvent({
				slug: makeSlug(activity.pageTitle, datePart),
				title_no: activity.pageTitle,
				description_no: buildDescription(activity),
				category,
				date_start: new Date(vm.start).toISOString(),
				date_end: vm.end ? new Date(vm.end).toISOString() : undefined,
				venue_name: venue,
				address,
				bydel,
				price: '',
				ticket_url: sourceUrl,
				source: SOURCE,
				source_url: sourceUrl,
				image_url: vm.imageUrl || undefined,
				age_group: ageGroup,
				language: 'no',
				status: 'approved',
			});

			if (success) {
				console.log(`  + ${activity.pageTitle} (${venue}, ${category})`);
				inserted++;
			}
		}

		page++;
		if (page <= pageCount) await delay(3000);
	}

	return { found, inserted };
}
