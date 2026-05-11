/**
 * One-off backfill — restore image URLs for existing Loddefjord events.
 * Fetches the calendar JSON from hvaskjeriloddefjord.no, maps each event's
 * imageId to a hot-linked URL, and updates the existing row.
 *
 * Hot-link only — we never download or re-host. Responsibility for the image
 * remains with Bergen Kommune as the calendar host.
 */
import 'dotenv/config';
import { updateEventImage } from './lib/utils.js';

interface LoddefjordEvent {
	id: number;
	title: string;
	urlText: string;
	imageId: number | null;
	startDate: string;
}

function fmt(d: Date): string {
	const dd = String(d.getDate()).padStart(2, '0');
	const mm = String(d.getMonth() + 1).padStart(2, '0');
	return `${dd}.${mm}.${d.getFullYear()}`;
}

async function main() {
	const from = new Date();
	const to = new Date();
	to.setMonth(to.getMonth() + 12);
	const url = `https://hvaskjeriloddefjord.no/wwdok/37199-0.html?type=items&datefrom=${fmt(from)}&dateto=${fmt(to)}`;
	const res = await fetch(url, {
		headers: { 'User-Agent': 'Gaari-Bergen-Events/1.0 (gaari.bergen@proton.me)' },
	});
	if (!res.ok) {
		console.error('Failed to fetch items:', res.status);
		process.exit(1);
	}
	const events = (await res.json()) as LoddefjordEvent[];
	console.log(`${events.length} events in calendar`);

	let updated = 0;
	let skipped = 0;
	let noImage = 0;

	for (const ev of events) {
		if (!ev.imageId) {
			noImage++;
			continue;
		}
		const sourceUrl = `https://hvaskjeriloddefjord.no/${ev.urlText}`;
		const imageUrl = `https://hvaskjeriloddefjord.no/images/${ev.imageId}`;
		const ok = await updateEventImage(sourceUrl, imageUrl);
		if (ok) {
			console.log(`  updated  ${ev.title}`);
			updated++;
		} else {
			skipped++;
		}
	}

	console.log(`\nDone. updated=${updated}  no_image=${noImage}  skipped=${skipped}`);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
