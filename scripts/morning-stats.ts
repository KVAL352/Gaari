/**
 * Morning stats helper for /morgen skill.
 * Fetches Umami traffic + MailerLite subscriber data in parallel.
 * Usage: npx tsx scripts/morning-stats.ts
 * Output: JSON to stdout
 */

import 'dotenv/config';

interface NewsletterHealth {
	status: 'ok' | 'warning' | 'critical' | 'no_data';
	issues: string[];
	sentAt: string | null;
	campaignCount: number;
	totalSent: number;
	totalDelivered: number;
	totalOpens: number;
	totalClicks: number;
	totalBounces: number;
	totalSpam: number;
	openRate: number;
	clickRate: number;
	bounceRate: number;
	spamRate: number;
}

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
		newsletterHealth: NewsletterHealth | null;
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

function evaluateNewsletterHealth(recent: any[]): NewsletterHealth {
	if (recent.length === 0) {
		const today = new Date();
		const dow = today.getUTCDay();
		// Newsletters go out Thursdays (dow=4). If it's Friday or later in the week
		// and no campaigns in last 48h, that's a critical signal.
		const isCritical = dow === 5 || dow === 6;
		return {
			status: isCritical ? 'critical' : 'no_data',
			issues: isCritical ? ['No newsletter campaigns found in the last 48h'] : [],
			sentAt: null,
			campaignCount: 0,
			totalSent: 0,
			totalDelivered: 0,
			totalOpens: 0,
			totalClicks: 0,
			totalBounces: 0,
			totalSpam: 0,
			openRate: 0,
			clickRate: 0,
			bounceRate: 0,
			spamRate: 0,
		};
	}

	let totalSent = 0;
	let totalDelivered = 0;
	let totalOpens = 0;
	let totalClicks = 0;
	let totalBounces = 0;
	let totalSpam = 0;
	let earliestSend: string | null = null;

	for (const c of recent) {
		const s = c.stats || {};
		totalSent += s.sent ?? 0;
		totalDelivered += s.deliveries_count ?? 0;
		totalOpens += s.unique_opens_count ?? s.opens_count ?? 0;
		totalClicks += s.clicks_count ?? 0;
		totalBounces += (s.hard_bounces_count ?? 0) + (s.soft_bounces_count ?? 0);
		totalSpam += s.spam_count ?? 0;
		const sent = c.scheduled_for || c.finished_at || c.created_at;
		if (sent && (!earliestSend || sent < earliestSend)) earliestSend = sent;
	}

	const denom = totalDelivered > 0 ? totalDelivered : totalSent;
	const openRate = denom > 0 ? (totalOpens / denom) * 100 : 0;
	const clickRate = denom > 0 ? (totalClicks / denom) * 100 : 0;
	const bounceRate = totalSent > 0 ? (totalBounces / totalSent) * 100 : 0;
	const spamRate = totalSent > 0 ? (totalSpam / totalSent) * 100 : 0;

	const issues: string[] = [];
	let status: NewsletterHealth['status'] = 'ok';

	if (openRate < 5) {
		issues.push(`Critically low open rate (${openRate.toFixed(1)}%)`);
		status = 'critical';
	} else if (openRate < 15) {
		issues.push(`Low open rate (${openRate.toFixed(1)}%)`);
		if (status === 'ok') status = 'warning';
	}
	if (bounceRate > 5) {
		issues.push(`High bounce rate (${bounceRate.toFixed(1)}%)`);
		if (status === 'ok') status = 'warning';
	}
	if (spamRate > 0.5) {
		issues.push(`Spam complaints detected (${spamRate.toFixed(2)}%)`);
		if (status === 'ok') status = 'warning';
	}

	return {
		status,
		issues,
		sentAt: earliestSend,
		campaignCount: recent.length,
		totalSent,
		totalDelivered,
		totalOpens,
		totalClicks,
		totalBounces,
		totalSpam,
		openRate,
		clickRate,
		bounceRate,
		spamRate,
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

	// Filter campaigns sent in last 48 hours for newsletter health check
	const cutoff = Date.now() - 48 * 60 * 60 * 1000;
	const recent = (camps.data || []).filter((c: any) => {
		const sent = c.scheduled_for || c.finished_at || c.created_at;
		if (!sent) return false;
		return new Date(sent).getTime() >= cutoff;
	});
	const newsletterHealth = evaluateNewsletterHealth(recent);

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
		newsletterHealth,
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
