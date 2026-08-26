import { mapBydel, isFamilyTitle } from '../lib/categories.js';
import { makeSlug, eventExists, insertEvent, delay, deleteEventByUrl } from '../lib/utils.js';
import { generateDescription } from '../lib/ai-descriptions.js';

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
		subTypes: string;
		mainType: string;
		targetGroups: string;
		duration: string;
		start: string;
		end: string;
		isSignup: boolean;
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
		case 'dugnad': return 'culture';
		case 'annet': return 'culture';
		default: return 'sports';
	}
}

function mapAgeGroup(targetGroups: string): string {
	const lower = targetGroups.toLowerCase();
	if (isFamilyTitle(lower)) return 'family';
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

			// aktiviteter.dnt.no og ikke www.dnt.no.
			//
			// 25.-26. august svarte alle arrangementssidene under
			// www.dnt.no/aktiviteter-fra-deltager/ med HTTP 500 og deres egen
			// feilside «Noe gikk galt». Ikke botblokkering: ingen challenge,
			// cf-cache-status DYNAMIC, og EpiServer-cookies i svaret — altsaa
			// naadde forespoerselen applikasjonen deres, og applikasjonen
			// feilet. Vanlige brukere ser det samme.
			//
			// API-et paa samme domene virker fint, saa vi henter fortsatt
			// derfra. Men `activity.url` peker paa den oedelagte sida, og vi
			// sendte 119 brukere dit.
			//
			// aktiviteter.dnt.no/event/{id} er DNTs egen paameldingsportal:
			// svarer 200, 33 kB ekte innhold, selvrefererende canonical og
			// Event-JSON-LD. Verifisert mot tre arrangementer.
			//
			// /register/{id} — den gamle ticketUrl — svarer 403. Portalens
			// event-side har paameldingsknappen, saa vi peker begge dit.
			// source_url beholdes som www.dnt.no. Den er identiteten vaar:
			// eventExists(sourceUrl) avgjoer om en aktivitet alt er lagt inn.
			// Byttet vi skjema her, ville hver eneste DNT-tur sett ny ut og
			// blitt lagt inn paa nytt ved siden av den gamle.
			const sourceUrl = `https://www.dnt.no${activity.url}`;

			// ticket_url er derimot det brukeren klikker: arrangementssida
			// bruker `ticket_url || source_url`.
			//
			// /register/{id} svarte 403. Og www.dnt.no-sida svarte 500 med
			// deres egen feilside «Noe gikk galt» — ikke botblokkering, men en
			// ekte applikasjonsfeil: ingen challenge, cf-cache-status DYNAMIC,
			// EpiServer-cookies i svaret. Vanlige brukere saa det samme, og vi
			// sendte 119 av dem dit.
			//
			// aktiviteter.dnt.no/event/{id} er DNTs egen portal: 200, 33 kB
			// innhold, selvrefererende canonical og Event-JSON-LD. Verifisert
			// mot tre aktiviteter.
			const ticketUrl = `https://aktiviteter.dnt.no/event/${activity.id}`;

			// Skip cancelled/overdue, delete full (sold-out) activities
			if (vm.isCancelled || vm.isOverdue) continue;
			if (vm.isFull) {
				if (await deleteEventByUrl(sourceUrl)) console.log(`  - Removed full: ${activity.pageTitle}`);
				continue;
			}
			if (await eventExists(sourceUrl)) continue;

			const { venue: rawVenue, address } = parseVenue(vm.eventLocation);
			// Prefix with "DNT Bergen — " so it is obvious DNT organizes the trip
			// (raw venue is just the trail location, e.g. "Ulriken").
			const venue = rawVenue && rawVenue.toLowerCase() !== 'bergen'
				? `DNT Bergen — ${rawVenue}`
				: 'DNT Bergen';
			const category = mapCategory(vm.mainType);
			const ageGroup = mapAgeGroup(vm.targetGroups);
			const bydel = mapBydel(rawVenue);
			const datePart = vm.start.slice(0, 10);

			const subType = vm.subTypes?.replace(/^,\s*/, '').trim();
			const titleWithContext = subType
				? `${activity.pageTitle} (${subType}, ${activity.level || vm.mainType})`
				: activity.pageTitle;

			const aiDesc = await generateDescription({ title: titleWithContext, venue, category, date: vm.start, price: '' });

			const success = await insertEvent({
				slug: makeSlug(activity.pageTitle, datePart),
				title_no: activity.pageTitle,
				description_no: aiDesc.no,
				description_en: aiDesc.en,
				title_en: aiDesc.title_en,
				category,
				date_start: new Date(vm.start).toISOString(),
				date_end: vm.end ? new Date(vm.end).toISOString() : undefined,
				venue_name: venue,
				address,
				bydel,
				price: '',
				ticket_url: ticketUrl,
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
		if (page <= pageCount) await delay(1500);
	}

	return { found, inserted };
}
