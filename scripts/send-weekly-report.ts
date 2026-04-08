/**
 * Weekly report — sent every Monday morning summarising the previous week.
 *
 * Sections:
 *   1. Trafikk forrige uke (Umami: visitors, pageviews, week-over-week %)
 *   2. Sosial vekst (IG/FB followers, best post from social_insights)
 *   3. Nyhetsbrev (MailerLite: subscriber growth, last campaign open/click)
 *   4. Innhold (new events count + breakdown by category)
 *   5. Konklusjon (rule-based: simple "what worked / focus next week")
 *
 * Excluded by design (already in daily digest):
 *   - Scraper health
 *   - Pending inquiries / corrections / submissions
 *   - Detailed per-post social engagement
 *
 * Usage:
 *   cd scripts && npx tsx send-weekly-report.ts             (sends email)
 *   cd scripts && npx tsx send-weekly-report.ts --dry-run   (writes preview)
 *
 * Env vars: PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY,
 *           UMAMI_API_KEY, UMAMI_WEBSITE_ID, MAILERLITE_API_KEY,
 *           META_ACCESS_TOKEN, IG_USER_ID, FB_PAGE_ID
 */
import 'dotenv/config';
import { writeFileSync } from 'fs';
import { resolve } from 'path';
import { supabase } from './lib/supabase.js';

const DRY_RUN = process.argv.includes('--dry-run');
const REPORT_EMAIL = process.env.WEEKLY_REPORT_EMAIL || 'post@gaari.no';
const FROM_EMAIL = 'Gåri <noreply@gaari.no>';
const META_TOKEN = process.env.META_ACCESS_TOKEN || process.env.IG_ACCESS_TOKEN || '';
const IG_USER_ID = process.env.IG_USER_ID || '';
const FB_PAGE_ID = process.env.FB_PAGE_ID || '';

interface TrafficSection {
	thisWeekVisitors: number | null;
	prevWeekVisitors: number | null;
	thisWeekPageviews: number | null;
	prevWeekPageviews: number | null;
	weekChangePct: number | null;
	topPages: { url: string; views: number }[];
	topReferrers: { name: string; views: number }[];
}

interface SocialSection {
	igFollowers: number | null;
	igFollowersDelta: number | null;
	fbFollowers: number | null;
	fbFollowersDelta: number | null;
	bestIgPost: { caption: string; permalink: string; reach: number; likes: number; comments: number } | null;
	bestFbPost: { message: string; permalink: string; reach: number; reactions: number; comments: number } | null;
	totalReach: number | null;
}

interface NewsletterSection {
	currentSubscribers: number | null;
	subscribersDelta: number | null;
	lastCampaign: { subject: string; sentAt: string; opens: number; clicks: number; openRate: number; clickRate: number } | null;
}

interface ContentSection {
	newEvents: number;
	byCategory: { category: string; count: number }[];
	topVenues: { venue: string; count: number }[];
}

interface ReportData {
	weekStart: string;
	weekEnd: string;
	traffic: TrafficSection | null;
	social: SocialSection | null;
	newsletter: NewsletterSection | null;
	content: ContentSection;
}

// ── Helpers ──

function isoDayAgo(days: number): string {
	const d = new Date();
	d.setDate(d.getDate() - days);
	return d.toISOString();
}

function dateOnly(iso: string): string {
	return iso.slice(0, 10);
}

function pct(curr: number | null, prev: number | null): number | null {
	if (curr == null || prev == null || prev === 0) return null;
	return Math.round(((curr - prev) / prev) * 100);
}

// ── Data collection ──

async function collectTraffic(): Promise<TrafficSection | null> {
	const key = process.env.UMAMI_API_KEY;
	const websiteId = process.env.UMAMI_WEBSITE_ID;
	if (!key || !websiteId) {
		console.log('Umami: skipped (missing keys)');
		return null;
	}

	const get = async (path: string) => {
		const resp = await fetch(`https://api.umami.is/v1/websites/${websiteId}/${path}`, {
			headers: { 'x-umami-api-key': key }
		});
		return resp.ok ? resp.json() : null;
	};

	try {
		const now = Date.now();
		const week = 7 * 86400000;
		const thisWeekStart = now - week;
		const prevWeekStart = now - 2 * week;

		const [thisWeek, prevWeek, urlsRaw, refRaw] = await Promise.all([
			get(`stats?startAt=${thisWeekStart}&endAt=${now}`),
			get(`stats?startAt=${prevWeekStart}&endAt=${thisWeekStart}`),
			get(`metrics?startAt=${thisWeekStart}&endAt=${now}&type=url`),
			get(`metrics?startAt=${thisWeekStart}&endAt=${now}&type=referrer`)
		]);

		const visitors = (s: any): number | null => s?.visitors?.value ?? s?.visitors ?? null;
		const pageviews = (s: any): number | null => s?.pageviews?.value ?? s?.pageviews ?? null;

		const thisWeekVisitors = visitors(thisWeek);
		const prevWeekVisitors = visitors(prevWeek);
		const thisWeekPageviews = pageviews(thisWeek);
		const prevWeekPageviews = pageviews(prevWeek);

		const topPages = Array.isArray(urlsRaw)
			? urlsRaw.slice(0, 5).map((p: { x: string; y: number }) => ({ url: p.x, views: p.y }))
			: [];

		const topReferrers = Array.isArray(refRaw)
			? refRaw.slice(0, 5).map((r: { x: string; y: number }) => ({ name: r.x || '(direkte)', views: r.y }))
			: [];

		return {
			thisWeekVisitors,
			prevWeekVisitors,
			thisWeekPageviews,
			prevWeekPageviews,
			weekChangePct: pct(thisWeekVisitors, prevWeekVisitors),
			topPages,
			topReferrers
		};
	} catch (err) {
		console.error('Umami fetch failed:', err);
		return null;
	}
}

async function collectSocial(): Promise<SocialSection | null> {
	const today = dateOnly(new Date().toISOString());
	const sevenDaysAgo = dateOnly(isoDayAgo(7));

	let igFollowers: number | null = null;
	let fbFollowers: number | null = null;

	if (META_TOKEN && IG_USER_ID) {
		try {
			const res = await fetch(
				`https://graph.facebook.com/v22.0/${IG_USER_ID}?fields=followers_count&access_token=${encodeURIComponent(META_TOKEN)}`
			);
			const data = await res.json();
			if (data.followers_count != null) igFollowers = data.followers_count;
		} catch { /* ignore */ }
	}

	if (META_TOKEN && FB_PAGE_ID) {
		try {
			const res = await fetch(
				`https://graph.facebook.com/v22.0/${FB_PAGE_ID}?fields=followers_count,fan_count&access_token=${encodeURIComponent(META_TOKEN)}`
			);
			const data = await res.json();
			if (data.followers_count != null) fbFollowers = data.followers_count;
			else if (data.fan_count != null) fbFollowers = data.fan_count;
		} catch { /* ignore */ }
	}

	// Snapshot today's followers in daily_metrics so next week's report has data
	if (igFollowers != null || fbFollowers != null) {
		try {
			await supabase
				.from('daily_metrics')
				.upsert({ date: today, ig_followers: igFollowers, fb_followers: fbFollowers }, { onConflict: 'date' });
		} catch { /* non-critical */ }
	}

	// Read 7-days-ago snapshot for delta
	let igFollowersDelta: number | null = null;
	let fbFollowersDelta: number | null = null;
	try {
		const { data } = await supabase
			.from('daily_metrics')
			.select('ig_followers, fb_followers')
			.eq('date', sevenDaysAgo)
			.maybeSingle();
		if (data?.ig_followers != null && igFollowers != null) {
			igFollowersDelta = igFollowers - data.ig_followers;
		}
		if (data?.fb_followers != null && fbFollowers != null) {
			fbFollowersDelta = fbFollowers - data.fb_followers;
		}
	} catch { /* non-critical */ }

	// Best posts last 7 days from social_insights
	const { data: igInsights } = await supabase
		.from('social_insights')
		.select('platform, post_id, permalink, caption, metrics, fetched_at')
		.eq('platform', 'instagram')
		.gte('fetched_at', isoDayAgo(7))
		.order('fetched_at', { ascending: false });

	const { data: fbInsights } = await supabase
		.from('social_insights')
		.select('platform, post_id, permalink, caption, metrics, fetched_at')
		.eq('platform', 'facebook')
		.gte('fetched_at', isoDayAgo(7))
		.order('fetched_at', { ascending: false });

	let bestIgPost: SocialSection['bestIgPost'] = null;
	let totalReach = 0;
	if (igInsights && igInsights.length > 0) {
		const ranked = igInsights
			.map(p => {
				const m = p.metrics || {};
				const reach = Number(m.reach ?? 0);
				totalReach += reach;
				return { post: p, reach, likes: Number(m.like_count ?? m.likes ?? 0), comments: Number(m.comments_count ?? m.comments ?? 0) };
			})
			.sort((a, b) => b.reach - a.reach);
		const top = ranked[0];
		if (top && top.reach > 0) {
			bestIgPost = {
				caption: (top.post.caption || '').slice(0, 80),
				permalink: top.post.permalink || '',
				reach: top.reach,
				likes: top.likes,
				comments: top.comments
			};
		}
	}

	let bestFbPost: SocialSection['bestFbPost'] = null;
	if (fbInsights && fbInsights.length > 0) {
		const ranked = fbInsights
			.map(p => {
				const m = p.metrics || {};
				const reach = Number(m.reach ?? m.impressions ?? 0);
				return {
					post: p,
					reach,
					reactions: Number(m.reactions ?? 0),
					comments: Number(m.comments ?? 0)
				};
			})
			.sort((a, b) => b.reach - a.reach);
		const top = ranked[0];
		if (top) {
			bestFbPost = {
				message: (top.post.caption || '').slice(0, 80),
				permalink: top.post.permalink || '',
				reach: top.reach,
				reactions: top.reactions,
				comments: top.comments
			};
		}
	}

	return {
		igFollowers,
		igFollowersDelta,
		fbFollowers,
		fbFollowersDelta,
		bestIgPost,
		bestFbPost,
		totalReach: totalReach > 0 ? totalReach : null
	};
}

async function collectNewsletter(): Promise<NewsletterSection | null> {
	const key = process.env.MAILERLITE_API_KEY;
	if (!key) {
		console.log('MailerLite: skipped (no key)');
		return null;
	}

	let currentSubscribers: number | null = null;
	try {
		const res = await fetch('https://connect.mailerlite.com/api/subscribers?limit=0', {
			headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
		});
		if (res.ok) {
			const data = await res.json() as { total: number };
			currentSubscribers = data.total ?? 0;
		}
	} catch { /* ignore */ }

	let prevSubscribers: number | null = null;
	try {
		const sevenDaysAgo = dateOnly(isoDayAgo(7));
		const { data } = await supabase
			.from('daily_metrics')
			.select('subscribers')
			.eq('date', sevenDaysAgo)
			.maybeSingle();
		if (data?.subscribers != null) prevSubscribers = data.subscribers;
	} catch { /* ignore */ }

	const subscribersDelta = currentSubscribers != null && prevSubscribers != null
		? currentSubscribers - prevSubscribers
		: null;

	// Last campaign stats
	let lastCampaign: NewsletterSection['lastCampaign'] = null;
	try {
		const res = await fetch('https://connect.mailerlite.com/api/campaigns?filter[status]=sent&limit=1', {
			headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
		});
		if (res.ok) {
			const data = await res.json() as { data: any[] };
			const c = data.data?.[0];
			if (c) {
				const opens = c.opens_count ?? 0;
				const clicks = c.clicks_count ?? 0;
				const sent = c.emails_sent_count ?? 1;
				lastCampaign = {
					subject: c.subject || '',
					sentAt: c.finished_at || c.created_at || '',
					opens,
					clicks,
					openRate: Math.round((opens / sent) * 100),
					clickRate: Math.round((clicks / sent) * 100)
				};
			}
		}
	} catch { /* ignore */ }

	return { currentSubscribers, subscribersDelta, lastCampaign };
}

async function collectContent(): Promise<ContentSection> {
	const sevenDaysAgo = isoDayAgo(7);

	const { count: newEvents } = await supabase
		.from('events')
		.select('id', { count: 'exact', head: true })
		.gte('created_at', sevenDaysAgo);

	const { data: catRows } = await supabase
		.from('events')
		.select('category')
		.gte('created_at', sevenDaysAgo);

	const catMap = new Map<string, number>();
	for (const row of catRows || []) {
		catMap.set(row.category, (catMap.get(row.category) ?? 0) + 1);
	}
	const byCategory = [...catMap.entries()]
		.map(([category, count]) => ({ category, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 5);

	const { data: venueRows } = await supabase
		.from('events')
		.select('venue_name')
		.gte('created_at', sevenDaysAgo);

	const venueMap = new Map<string, number>();
	for (const row of venueRows || []) {
		venueMap.set(row.venue_name, (venueMap.get(row.venue_name) ?? 0) + 1);
	}
	const topVenues = [...venueMap.entries()]
		.map(([venue, count]) => ({ venue, count }))
		.sort((a, b) => b.count - a.count)
		.slice(0, 5);

	return { newEvents: newEvents ?? 0, byCategory, topVenues };
}

// ── Conclusion (rule-based) ──

function buildConclusion(d: ReportData): string[] {
	const points: string[] = [];

	if (d.traffic) {
		const c = d.traffic.weekChangePct;
		if (c == null) {
			points.push('Trafikk: ingen sammenligning ennå (første rapport).');
		} else if (c >= 10) {
			points.push(`Trafikken vokste ${c}% denne uka. Behold det du gjør.`);
		} else if (c >= 0) {
			points.push(`Trafikken er stabil (${c >= 0 ? '+' : ''}${c}%).`);
		} else if (c >= -10) {
			points.push(`Trafikken falt ${Math.abs(c)}%. Verdt å sjekke topp-referrere og om noe har endret seg.`);
		} else {
			points.push(`Trafikken falt ${Math.abs(c)}%. Gjennomgå hva som skjedde — inkludert sosiale poster og søk.`);
		}
	}

	if (d.social) {
		if (d.social.igFollowersDelta != null) {
			const delta = d.social.igFollowersDelta;
			if (delta > 0) points.push(`Instagram: +${delta} følgere denne uka.`);
			else if (delta === 0) points.push('Instagram: ingen ny følgervekst.');
			else points.push(`Instagram: ${delta} følgere (netto tap).`);
		}
		if (d.social.fbFollowersDelta != null) {
			const delta = d.social.fbFollowersDelta;
			if (delta > 0) points.push(`Facebook: +${delta} følgere denne uka.`);
		}
	}

	if (d.newsletter?.subscribersDelta != null) {
		const delta = d.newsletter.subscribersDelta;
		if (delta > 0) points.push(`Nyhetsbrev: +${delta} abonnenter denne uka.`);
		else if (delta < 0) points.push(`Nyhetsbrev: ${delta} abonnenter (avmeldinger).`);
	}

	if (d.content.newEvents > 0) {
		points.push(`${d.content.newEvents} nye arrangementer lagt til denne uka.`);
	}

	if (points.length === 0) points.push('Ingen data tilgjengelig denne uka.');
	return points;
}

// ── HTML email ──

function buildHtml(d: ReportData): string {
	const fmtDelta = (n: number | null, suffix = '') =>
		n == null ? '—' : n > 0 ? `+${n}${suffix}` : `${n}${suffix}`;

	const pctTag = (n: number | null) => {
		if (n == null) return '';
		const color = n >= 0 ? '#1A6B35' : '#C82D2D';
		const sign = n >= 0 ? '+' : '';
		return `<span style="color:${color};font-weight:700;">${sign}${n}%</span>`;
	};

	const conclusion = buildConclusion(d).map(p => `<li>${p}</li>`).join('');

	const trafficHtml = d.traffic ? `
		<table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
			<tr>
				<td style="padding:8px 0;color:#4D4D4D;">Besøkende</td>
				<td style="padding:8px 0;text-align:right;font-weight:700;">${d.traffic.thisWeekVisitors ?? '—'}</td>
				<td style="padding:8px 0;text-align:right;width:80px;">${pctTag(d.traffic.weekChangePct)}</td>
			</tr>
			<tr>
				<td style="padding:8px 0;color:#4D4D4D;">Sidevisninger</td>
				<td style="padding:8px 0;text-align:right;font-weight:700;">${d.traffic.thisWeekPageviews ?? '—'}</td>
				<td style="padding:8px 0;text-align:right;width:80px;"></td>
			</tr>
		</table>

		${d.traffic.topReferrers.length > 0 ? `
		<p style="margin:16px 0 6px;font-size:13px;color:#737373;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Topp referrere</p>
		<ol style="margin:0;padding-left:20px;font-size:14px;color:#141414;">
			${d.traffic.topReferrers.map(r => `<li>${r.name} (${r.views})</li>`).join('')}
		</ol>` : ''}
	` : '<p style="color:#737373;">Ingen trafikkdata tilgjengelig (Umami-keys mangler).</p>';

	const socialHtml = d.social ? `
		<table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
			<tr>
				<td style="padding:8px 0;color:#4D4D4D;">Instagram-følgere</td>
				<td style="padding:8px 0;text-align:right;font-weight:700;">${d.social.igFollowers ?? '—'}</td>
				<td style="padding:8px 0;text-align:right;width:80px;color:${(d.social.igFollowersDelta ?? 0) >= 0 ? '#1A6B35' : '#C82D2D'};font-weight:700;">${fmtDelta(d.social.igFollowersDelta)}</td>
			</tr>
			<tr>
				<td style="padding:8px 0;color:#4D4D4D;">Facebook-følgere</td>
				<td style="padding:8px 0;text-align:right;font-weight:700;">${d.social.fbFollowers ?? '—'}</td>
				<td style="padding:8px 0;text-align:right;width:80px;color:${(d.social.fbFollowersDelta ?? 0) >= 0 ? '#1A6B35' : '#C82D2D'};font-weight:700;">${fmtDelta(d.social.fbFollowersDelta)}</td>
			</tr>
		</table>

		${d.social.bestIgPost ? `
		<p style="margin:16px 0 6px;font-size:13px;color:#737373;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Beste IG-post denne uka</p>
		<p style="margin:0 0 4px;font-size:14px;">${d.social.bestIgPost.caption}…</p>
		<p style="margin:0;font-size:13px;color:#737373;">Reach ${d.social.bestIgPost.reach} · ${d.social.bestIgPost.likes} likes · ${d.social.bestIgPost.comments} kommentarer</p>
		` : ''}
	` : '';

	const newsletterHtml = d.newsletter ? `
		<table cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
			<tr>
				<td style="padding:8px 0;color:#4D4D4D;">Abonnenter</td>
				<td style="padding:8px 0;text-align:right;font-weight:700;">${d.newsletter.currentSubscribers ?? '—'}</td>
				<td style="padding:8px 0;text-align:right;width:80px;color:${(d.newsletter.subscribersDelta ?? 0) >= 0 ? '#1A6B35' : '#C82D2D'};font-weight:700;">${fmtDelta(d.newsletter.subscribersDelta)}</td>
			</tr>
		</table>

		${d.newsletter.lastCampaign ? `
		<p style="margin:16px 0 6px;font-size:13px;color:#737373;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Siste utsending</p>
		<p style="margin:0 0 4px;font-size:14px;">${d.newsletter.lastCampaign.subject}</p>
		<p style="margin:0;font-size:13px;color:#737373;">Open rate ${d.newsletter.lastCampaign.openRate}% · Click rate ${d.newsletter.lastCampaign.clickRate}%</p>
		` : ''}
	` : '';

	const contentHtml = `
		<p style="margin:0 0 6px;font-size:14px;">${d.content.newEvents} nye arrangementer denne uka</p>
		${d.content.byCategory.length > 0 ? `
		<p style="margin:16px 0 6px;font-size:13px;color:#737373;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;">Topp kategorier</p>
		<ol style="margin:0;padding-left:20px;font-size:14px;color:#141414;">
			${d.content.byCategory.map(c => `<li>${c.category} (${c.count})</li>`).join('')}
		</ol>` : ''}
	`;

	return `<!doctype html>
<html lang="nb">
<head>
	<meta charset="utf-8" />
	<meta name="viewport" content="width=device-width,initial-scale=1" />
	<title>Ukerapport Gåri</title>
</head>
<body style="margin:0;padding:24px;background:#fafaf7;font-family:Arial,Helvetica,sans-serif;color:#141414;">
	<div style="max-width:640px;margin:0 auto;">
		<h1 style="margin:0 0 4px;font-size:28px;">Ukerapport</h1>
		<p style="margin:0 0 24px;font-size:14px;color:#737373;">${d.weekStart} – ${d.weekEnd}</p>

		<section style="background:#fff;border:2px solid #e6e3da;border-radius:12px;padding:20px;margin-bottom:16px;">
			<h2 style="margin:0 0 12px;font-size:18px;">Trafikk</h2>
			${trafficHtml}
		</section>

		<section style="background:#fff;border:2px solid #e6e3da;border-radius:12px;padding:20px;margin-bottom:16px;">
			<h2 style="margin:0 0 12px;font-size:18px;">Sosial vekst</h2>
			${socialHtml}
		</section>

		<section style="background:#fff;border:2px solid #e6e3da;border-radius:12px;padding:20px;margin-bottom:16px;">
			<h2 style="margin:0 0 12px;font-size:18px;">Nyhetsbrev</h2>
			${newsletterHtml}
		</section>

		<section style="background:#fff;border:2px solid #e6e3da;border-radius:12px;padding:20px;margin-bottom:16px;">
			<h2 style="margin:0 0 12px;font-size:18px;">Innhold</h2>
			${contentHtml}
		</section>

		<section style="background:#fff;border:2px solid #C82D2D;border-radius:12px;padding:20px;margin-bottom:16px;">
			<h2 style="margin:0 0 12px;font-size:18px;color:#C82D2D;">Oppsummering</h2>
			<ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.6;color:#141414;">
				${conclusion}
			</ul>
		</section>

		<p style="margin:32px 0 0;font-size:12px;color:#737373;text-align:center;">
			Ukerapport fra <a href="https://gaari.no" style="color:#C82D2D;text-decoration:none;">Gåri</a>
		</p>
	</div>
</body>
</html>`;
}

async function sendEmail(html: string, weekStart: string, weekEnd: string): Promise<void> {
	const key = process.env.RESEND_API_KEY;
	if (!key) {
		console.warn('Skipping email: no RESEND_API_KEY');
		return;
	}
	const subject = `[Ukerapport] ${weekStart} – ${weekEnd}`;
	const resp = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ from: FROM_EMAIL, to: [REPORT_EMAIL], subject, html })
	});
	if (resp.ok) {
		const data = await resp.json() as { id: string };
		console.log(`Weekly report sent (Resend ID: ${data.id})`);
	} else {
		console.error(`Email failed: ${resp.status} ${await resp.text()}`);
	}
}

async function main() {
	const weekEnd = dateOnly(new Date().toISOString());
	const weekStart = dateOnly(isoDayAgo(7));

	console.log(`Weekly report — ${weekStart} to ${weekEnd}${DRY_RUN ? ' (DRY RUN)' : ''}\n`);

	const [traffic, social, newsletter, content] = await Promise.all([
		collectTraffic(),
		collectSocial(),
		collectNewsletter(),
		collectContent()
	]);

	const data: ReportData = { weekStart, weekEnd, traffic, social, newsletter, content };
	const html = buildHtml(data);

	if (DRY_RUN) {
		const previewPath = resolve('.weekly-report-preview.html');
		writeFileSync(previewPath, html);
		console.log(`\nDry run preview written to: ${previewPath}`);
		return;
	}

	await sendEmail(html, weekStart, weekEnd);
	console.log('Done.');
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
