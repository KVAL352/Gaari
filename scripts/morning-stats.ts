/**
 * Morning stats helper for /morgen skill.
 * Fetches Umami traffic + MailerLite subscriber data in parallel.
 * Usage: npx tsx scripts/morning-stats.ts
 * Output: JSON to stdout
 */

import 'dotenv/config';

interface MorningStats {
	umami: {
		active: number;
		pageviews: number;
		visitors: number;
	} | null;
	mailerlite: {
		subscribers: number;
		lastCampaign: {
			name: string;
			date: string;
			open_rate: string | null;
			click_rate: string | null;
		} | null;
		totalSent: number;
	} | null;
}

async function fetchUmami(): Promise<MorningStats['umami']> {
	const apiKey = process.env.UMAMI_API_KEY;
	if (!apiKey) return null;

	const headers = { 'x-umami-api-key': apiKey };
	const websiteId = '5f889214-285b-4412-8066-015a18f8ce65';
	const now = Date.now();
	const dayAgo = now - 86400000;

	const [statsRes, activeRes] = await Promise.all([
		fetch(`https://api.umami.is/v1/websites/${websiteId}/stats?startAt=${dayAgo}&endAt=${now}`, { headers }),
		fetch(`https://api.umami.is/v1/websites/${websiteId}/active`, { headers }),
	]);

	const stats = await statsRes.json();
	const active = await activeRes.json();

	return {
		active: active.visitors ?? 0,
		pageviews: stats.pageviews ?? 0,
		visitors: stats.visitors ?? 0,
	};
}

async function fetchMailerLite(): Promise<MorningStats['mailerlite']> {
	const apiKey = process.env.MAILERLITE_API_KEY;
	if (!apiKey) return null;

	const headers = {
		Authorization: `Bearer ${apiKey}`,
		'Content-Type': 'application/json',
	};

	const [subsRes, campsRes] = await Promise.all([
		fetch('https://connect.mailerlite.com/api/subscribers?limit=0', { headers }),
		fetch('https://connect.mailerlite.com/api/campaigns?filter[status]=sent', { headers }),
	]);

	const subs = await subsRes.json();
	const camps = await campsRes.json();
	const latest = camps.data?.[0];

	return {
		subscribers: subs.total ?? 0,
		lastCampaign: latest
			? {
					name: latest.name,
					date: latest.scheduled_for || latest.created_at,
					open_rate: latest.stats?.open_rate?.string ?? null,
					click_rate: latest.stats?.click_rate?.string ?? null,
				}
			: null,
		totalSent: camps.data?.length ?? 0,
	};
}

async function main() {
	const [umami, mailerlite] = await Promise.all([
		fetchUmami().catch(() => null),
		fetchMailerLite().catch(() => null),
	]);

	const result: MorningStats = { umami, mailerlite };
	console.log(JSON.stringify(result));
}

main().catch(() => {
	console.log(JSON.stringify({ umami: null, mailerlite: null }));
});
