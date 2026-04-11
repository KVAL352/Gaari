/**
 * Daily Digest — Admin Overview Email
 *
 * Collects pending task counts, scraper activity, traffic stats,
 * subscriber count, and expiring placements. Sends a single HTML
 * digest email to the admin.
 *
 * Usage:
 *   cd scripts && npx tsx send-daily-digest.ts
 *   cd scripts && npx tsx send-daily-digest.ts --dry-run
 *
 * Env vars:
 *   PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY,
 *   UMAMI_API_KEY (optional), UMAMI_WEBSITE_ID (optional), MAILERLITE_API_KEY (optional)
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { supabase } from './lib/supabase.js';
import { scrapers } from './scrape.js';
import { analyzeScraperHealth, type ScraperHealthStatus } from './lib/scraper-health.js';
import {
	CAMPAIGN_TARGETS,
	checkCampaign,
	getCampaignDailyInsights,
	listCampaigns,
	parseActions,
	saveDailyInsights,
	type Campaign,
	type CampaignCheck,
	type CheckStatus,
} from './lib/meta-api.js';

const REPORT_EMAIL = 'post@gaari.no';
const FROM_EMAIL = 'Gåri <noreply@gaari.no>';
const DRY_RUN = process.argv.includes('--dry-run');
const TODAY = new Date().toISOString().slice(0, 10);
const SITE_URL = 'https://gaari.no';

// ─── Types ──────────────────────────────────────────────────────────

interface PendingCounts {
	corrections: number;
	submissions: number;
	optouts: number;
	inquiries: number;
}

interface ScraperActivity {
	newEvents24h: number;
	totalActiveEvents: number;
}

interface TrafficData {
	visitors: number;
	pageviews: number;
	visitorsDelta: number | null;
	pageviewsDelta: number | null;
	weekVisitors: number | null;
	weekChange: number | null;
	topReferrers: { name: string; count: number }[] | null;
}

interface ExpiringPlacement {
	venue_name: string;
	tier: string;
	end_date: string;
	daysLeft: number;
}

interface SourceFreshness {
	source: string;
	totalEvents: number;
	upcomingEvents: number;
	latestDateStart: string;
}

interface PipelineRun {
	runId: string;
	runAt: string;
	scrapersRun: number;
	scrapersSkipped: string[];
	scrapersMissing: string[];
	slowScrapers: Array<{ name: string; durationMs: number }>;
}

interface FestivalReminder {
	name: string;
	startDate: string;
	endDate: string;
	daysUntil: number;
	checklist: string[];
}

interface NewsletterCampaign {
	name: string;
	subject: string;
	sentAt: string;
	recipients: number;
	opens: number;
	clicks: number;
	openRate: number;
	clickRate: number;
	unsubscribes: number;
	bounces: number;
}

interface NewsletterReport {
	campaigns: NewsletterCampaign[];
	totalRecipients: number;
	totalOpens: number;
	totalClicks: number;
	avgOpenRate: number;
	avgClickRate: number;
	totalUnsubscribes: number;
	totalBounces: number;
}

interface SocialStatus {
	postedYesterday: { ig: number; fb: number; stories: number };
	failedYesterday: number;
	failureNotes: string[];
	igFollowers: number | null;
	igFollowersDelta: number | null;
	fbFollowers: number | null;
	fbFollowersDelta: number | null;
}

interface Reminder {
	date: string;
	title: string;
	description: string;
}

interface CampaignBrief {
	id: string;
	name: string;
	shortName: string;      // stripped-down display name
	status: CheckStatus;    // ok | warning | critical
	checks: CampaignCheck[];
	daysElapsed: number;
	spendNok: number;
	dailyBudgetNok: number | null;
	totalBudgetNok: number | null;
	impressions: number;
	linkClicks: number;
	landingPageViews: number;
	ctrTotal: number;
	cpcLink: number;
	cpm: number;
	yesterday: {
		date: string;
		impressions: number;
		clicks: number;
		lpv: number;
		spendNok: number;
		ctr: number;
	} | null;
}

interface DigestData {
	date: string;
	pending: PendingCounts;
	scraper: ScraperActivity;
	scraperHealth: ScraperHealthStatus[];
	staleSources: SourceFreshness[];
	lastPipeline: PipelineRun | null;
	traffic: TrafficData | null;
	subscribers: number | null;
	subscribersPrev: number | null;
	expiringPlacements: ExpiringPlacement[];
	festivalReminders: FestivalReminder[];
	reminders: Reminder[];
	newsletterReport: NewsletterReport | null;
	socialStatus: SocialStatus | null;
	activeCampaigns: CampaignBrief[];
}

// ─── Data collectors ────────────────────────────────────────────────

async function collectPendingCounts(): Promise<PendingCounts> {
	console.log('📋 Counting pending tasks...');

	const [corrections, submissions, optouts, inquiries] = await Promise.all([
		supabase.from('edit_suggestions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
		supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
		supabase.from('opt_out_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
		supabase.from('organizer_inquiries').select('id', { count: 'exact', head: true }).eq('status', 'pending')
	]);

	return {
		corrections: corrections.count ?? 0,
		submissions: submissions.count ?? 0,
		optouts: optouts.count ?? 0,
		inquiries: inquiries.count ?? 0
	};
}

async function collectScraperActivity(): Promise<ScraperActivity> {
	console.log('🔄 Checking scraper activity...');

	const since = new Date();
	since.setHours(since.getHours() - 24);

	const [recent, total] = await Promise.all([
		supabase
			.from('events')
			.select('id', { count: 'exact', head: true })
			.eq('status', 'approved')
			.gte('created_at', since.toISOString())
			.gte('date_start', TODAY),
		supabase
			.from('events')
			.select('id', { count: 'exact', head: true })
			.eq('status', 'approved')
			.gte('date_start', TODAY)
	]);

	return {
		newEvents24h: recent.count ?? 0,
		totalActiveEvents: total.count ?? 0
	};
}

async function collectTraffic(): Promise<TrafficData | null> {
	const key = process.env.UMAMI_API_KEY;
	const websiteId = process.env.UMAMI_WEBSITE_ID;
	if (!key || !websiteId) {
		console.log('⏭  Umami: skipped (no UMAMI_API_KEY or UMAMI_WEBSITE_ID)');
		return null;
	}

	console.log('📊 Fetching traffic data...');

	const umamiGet = async (endpoint: string) => {
		const resp = await fetch(`https://api.umami.is/v1/websites/${websiteId}/${endpoint}`, {
			headers: { 'x-umami-api-key': key }
		});
		return resp.ok ? resp.json() : null;
	};

	try {
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayStart = new Date(yesterday.toISOString().slice(0, 10) + 'T00:00:00Z').getTime();
		const yesterdayEnd = yesterdayStart + 86400000;

		// This week (last 7 days) vs previous week (7 days before that)
		const now = Date.now();
		const thisWeekStart = now - 7 * 86400000;
		const prevWeekStart = now - 14 * 86400000;

		const [yesterdayStats, thisWeekStats, prevWeekStats, referrerData] = await Promise.all([
			umamiGet(`stats?startAt=${yesterdayStart}&endAt=${yesterdayEnd}`),
			umamiGet(`stats?startAt=${thisWeekStart}&endAt=${now}`),
			umamiGet(`stats?startAt=${prevWeekStart}&endAt=${thisWeekStart}`),
			umamiGet(`metrics?startAt=${thisWeekStart}&endAt=${now}&type=referrer`)
		]);

		const visitors = yesterdayStats?.pageviews != null ? (yesterdayStats.visitors?.value ?? yesterdayStats.visitors ?? 0) : 0;
		const pageviews = yesterdayStats?.pageviews != null ? (yesterdayStats.pageviews?.value ?? yesterdayStats.pageviews ?? 0) : 0;

		// Store yesterday's traffic in daily_metrics
		const dateStr = yesterday.toISOString().slice(0, 10);
		await supabase.from('daily_metrics').upsert(
			{ date: dateStr, visitors, pageviews },
			{ onConflict: 'date' }
		);

		// Get day-before-yesterday for delta
		const dayBefore = new Date(yesterday);
		dayBefore.setDate(dayBefore.getDate() - 1);
		const { data: prevRow } = await supabase.from('daily_metrics')
			.select('visitors, pageviews')
			.eq('date', dayBefore.toISOString().slice(0, 10))
			.single();

		const visitorsDelta = prevRow?.visitors != null ? visitors - prevRow.visitors : null;
		const pageviewsDelta = prevRow?.pageviews != null ? pageviews - prevRow.pageviews : null;

		// Week-over-week
		const weekVisitors = thisWeekStats?.visitors?.value ?? thisWeekStats?.visitors ?? null;
		const prevWeekVisitors = prevWeekStats?.visitors?.value ?? prevWeekStats?.visitors ?? null;
		const weekChange = (weekVisitors != null && prevWeekVisitors != null && prevWeekVisitors > 0)
			? Math.round((weekVisitors - prevWeekVisitors) / prevWeekVisitors * 100)
			: null;

		// Top referrers — consolidate subdomains (e.g. l.facebook.com, m.facebook.com → Facebook)
		const topReferrers = Array.isArray(referrerData)
			? (() => {
				const groups: Record<string, { label: string; pattern: RegExp }> = {
					facebook: { label: 'Facebook', pattern: /^(l\.|m\.|lm\.|web\.|www\.)?facebook\.com$/ },
					google: { label: 'Google', pattern: /^(www\.)?google\.[a-z.]+$/ },
					instagram: { label: 'Instagram', pattern: /^(l\.|www\.)?instagram\.com$/ },
				};
				const merged = new Map<string, number>();
				for (const r of referrerData as { x: string; y: number }[]) {
					const name = r.x || '(direkte)';
					let key = name;
					for (const [gk, g] of Object.entries(groups)) {
						if (g.pattern.test(name)) { key = gk; break; }
					}
					merged.set(key, (merged.get(key) ?? 0) + r.y);
				}
				return [...merged.entries()]
					.sort((a, b) => b[1] - a[1])
					.slice(0, 5)
					.map(([key, count]) => ({ name: groups[key]?.label ?? key, count }));
			})()
			: null;

		return { visitors, pageviews, visitorsDelta, pageviewsDelta, weekVisitors, weekChange, topReferrers };
	} catch { return null; }
}

async function collectSubscribers(): Promise<{ current: number | null; previous: number | null }> {
	const key = process.env.MAILERLITE_API_KEY;
	if (!key) {
		console.log('⏭  MailerLite: skipped (no MAILERLITE_API_KEY)');
		return { current: null, previous: null };
	}

	console.log('📧 Fetching subscriber count...');

	let current: number | null = null;
	try {
		const resp = await fetch('https://connect.mailerlite.com/api/subscribers?limit=0', {
			headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
		});
		if (resp.ok) {
			const data = await resp.json() as { total: number };
			current = data.total ?? 0;
		}
	} catch { /* current stays null */ }

	// Fetch yesterday's count from daily_metrics
	let previous: number | null = null;
	try {
		const yesterday = new Date();
		yesterday.setDate(yesterday.getDate() - 1);
		const yesterdayStr = yesterday.toISOString().slice(0, 10);
		const { data } = await supabase
			.from('daily_metrics')
			.select('subscribers')
			.eq('date', yesterdayStr)
			.single();
		if (data) previous = data.subscribers;
	} catch { /* previous stays null */ }

	// Store today's count
	if (current !== null) {
		try {
			await supabase
				.from('daily_metrics')
				.upsert({ date: TODAY, subscribers: current }, { onConflict: 'date' });
		} catch { /* non-critical */ }
	}

	return { current, previous };
}

async function collectExpiringPlacements(): Promise<ExpiringPlacement[]> {
	console.log('📅 Checking expiring placements...');

	const nextWeek = new Date();
	nextWeek.setDate(nextWeek.getDate() + 7);

	const { data } = await supabase
		.from('promoted_placements')
		.select('venue_name, tier, end_date')
		.eq('active', true)
		.not('end_date', 'is', null)
		.lte('end_date', nextWeek.toISOString().slice(0, 10))
		.gte('end_date', TODAY);

	if (!data || data.length === 0) return [];

	return data.map((p: { venue_name: string; tier: string; end_date: string }) => {
		const endDate = new Date(p.end_date);
		const now = new Date(TODAY);
		const daysLeft = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
		return { venue_name: p.venue_name, tier: p.tier, end_date: p.end_date, daysLeft };
	});
}

async function collectScraperHealth(): Promise<ScraperHealthStatus[]> {
	console.log('🔍 Analyzing scraper health...');
	try {
		return await analyzeScraperHealth(supabase);
	} catch (err: any) {
		console.error(`Scraper health check failed: ${err.message}`);
		return [];
	}
}

async function collectStaleSources(): Promise<SourceFreshness[]> {
	console.log('📡 Checking per-source freshness...');
	try {
		const nowUtc = new Date().toISOString();

		// Get all approved events with source info
		const { data, error } = await supabase
			.from('events')
			.select('source, date_start')
			.eq('status', 'approved');

		if (error || !data) return [];

		// Group by source: count total and upcoming
		const sources = new Map<string, { total: number; upcoming: number; latest: string }>();
		for (const e of data) {
			const s = sources.get(e.source) ?? { total: 0, upcoming: 0, latest: '' };
			s.total++;
			if (e.date_start >= nowUtc) s.upcoming++;
			if (e.date_start > s.latest) s.latest = e.date_start;
			sources.set(e.source, s);
		}

		// Flag sources with 0 upcoming events (all events have expired)
		const stale: SourceFreshness[] = [];
		for (const [source, info] of sources) {
			if (info.upcoming === 0) {
				stale.push({
					source,
					totalEvents: info.total,
					upcomingEvents: 0,
					latestDateStart: info.latest
				});
			}
		}

		// Sort by source name
		stale.sort((a, b) => a.source.localeCompare(b.source));
		return stale;
	} catch (err: any) {
		console.error(`Source freshness check failed: ${err.message}`);
		return [];
	}
}

// ─── Festival reminders ─────────────────────────────────────────────

// Upcoming festivals with scraper test checklists.
// Update dates annually when festival programmes are announced.
const FESTIVALS = [
	{
		name: 'Borealis',
		startDate: '2026-03-10',
		endDate: '2026-03-15',
		checklist: [
			'Test scraper: npx tsx scripts/scrape.ts borealis',
			'Sjekk at /festival-{year}/hva-skjer-{year}/ er publisert',
			'Oppdater FESTIVAL_YEAR og FESTIVAL_DATES i borealis.ts',
			'Verifiser at borealis er fjernet fra TicketCo SUBDOMAINS',
		],
	},
	{
		name: 'Bergen Pride',
		startDate: '2026-06-13',
		endDate: '2026-06-21',
		checklist: [
			'Test scraper: npx tsx scripts/scrape.ts bergenpride',
			'Sjekk at Vev-programsidene er publisert (PROGRAM_PAGES i bergenpride.ts)',
			'Oppdater PAGE_DATES hvis datoer endres',
			'Verifiser TicketCo: bergenpride.ticketco.events',
			'Sjekk collection: /no/bergen-pride/',
		],
	},
	{
		name: 'BIFF',
		startDate: '2026-10-14', // Tentative — update when announced
		endDate: '2026-10-21',
		checklist: [
			'Test scraper: npx tsx scripts/scrape.ts biff',
			'Verifiser at /program/today/all/all/all returnerer showtimes',
			'Sjekk /events for paneler og Q&A',
			'Sjekk collection: /no/biff/',
		],
	},
	{
		name: 'Festspillene',
		startDate: '2026-05-20', // Update when announced
		endDate: '2026-06-03',
		checklist: [
			'Test scraper: npx tsx scripts/scrape.ts festspillene',
			'Sjekk at Storyblok API returnerer 2026-events',
			'Sjekk collection: /no/festspillene/',
		],
	},
	{
		name: 'Bergenfest',
		startDate: '2026-06-10', // Update when announced
		endDate: '2026-06-13',
		checklist: [
			'Test scraper: npx tsx scripts/scrape.ts bergenfest',
			'Sjekk collection: /no/bergenfest/',
		],
	},
	{
		name: 'Beyond the Gates',
		startDate: '2026-08-19', // Update when announced
		endDate: '2026-08-22',
		checklist: [
			'Test scraper: npx tsx scripts/scrape.ts beyondthegates',
			'Sjekk collection: /no/beyond-the-gates/',
		],
	},
	{
		name: 'Nattjazz',
		startDate: '2026-05-22', // Update when announced
		endDate: '2026-06-03',
		checklist: [
			'Test scraper: npx tsx scripts/scrape.ts nattjazz (via ticketco)',
			'Sjekk collection: /no/nattjazz/',
		],
	},
];

const FESTIVAL_REMINDER_DAYS = 14; // Show reminder this many days before start

function collectFestivalReminders(): FestivalReminder[] {
	const now = new Date(TODAY);
	const reminders: FestivalReminder[] = [];

	for (const festival of FESTIVALS) {
		const start = new Date(festival.startDate);
		const end = new Date(festival.endDate);
		const daysUntil = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

		// Show reminder if festival is within FESTIVAL_REMINDER_DAYS or currently ongoing
		if (daysUntil <= FESTIVAL_REMINDER_DAYS && now.getTime() <= end.getTime()) {
			reminders.push({
				name: festival.name,
				startDate: festival.startDate,
				endDate: festival.endDate,
				daysUntil,
				checklist: festival.checklist,
			});
		}
	}

	return reminders.sort((a, b) => a.daysUntil - b.daysUntil);
}

async function collectNewsletterReport(): Promise<NewsletterReport | null> {
	// Only run on Fridays (day after Thursday newsletter send)
	const dayOfWeek = new Date().getUTCDay();
	if (dayOfWeek !== 5) return null; // 5 = Friday

	const key = process.env.MAILERLITE_API_KEY;
	if (!key) {
		console.log('⏭  Newsletter report: skipped (no MAILERLITE_API_KEY)');
		return null;
	}

	console.log('📰 Fetching newsletter campaign results...');

	try {
		// Fetch recently sent campaigns (last 3 days to catch Thursday send)
		const resp = await fetch('https://connect.mailerlite.com/api/campaigns?filter[status]=sent&limit=20', {
			headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
		});
		if (!resp.ok) return null;

		const data = await resp.json();
		const allCampaigns = data.data ?? [];

		// Filter to Gåri campaigns sent in the last 3 days
		const threeDaysAgo = new Date();
		threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

		const recentCampaigns: NewsletterCampaign[] = [];
		for (const c of allCampaigns) {
			const name: string = c.name ?? '';
			if (!name.startsWith('Gåri')) continue;

			const sentAt = c.finished_at ?? c.scheduled_for ?? c.created_at ?? '';
			if (!sentAt || new Date(sentAt) < threeDaysAgo) continue;

			const stats = c.stats ?? {};
			const sent = stats.sent ?? c.emails_sent ?? 0;
			const opens = stats.unique_opens_count ?? stats.opens_count ?? 0;
			const clicks = stats.unique_clicks_count ?? stats.clicks_count ?? 0;

			recentCampaigns.push({
				name,
				subject: c.emails?.[0]?.subject ?? name,
				sentAt,
				recipients: sent,
				opens,
				clicks,
				openRate: sent > 0 ? Math.round((opens / sent) * 100) : 0,
				clickRate: sent > 0 ? Math.round((clicks / sent) * 100) : 0,
				unsubscribes: stats.unsubscribes_count ?? 0,
				bounces: (stats.hard_bounces_count ?? 0) + (stats.soft_bounces_count ?? 0),
			});
		}

		if (recentCampaigns.length === 0) return null;

		const totalRecipients = recentCampaigns.reduce((sum, c) => sum + c.recipients, 0);
		const totalOpens = recentCampaigns.reduce((sum, c) => sum + c.opens, 0);
		const totalClicks = recentCampaigns.reduce((sum, c) => sum + c.clicks, 0);
		const totalUnsubscribes = recentCampaigns.reduce((sum, c) => sum + c.unsubscribes, 0);
		const totalBounces = recentCampaigns.reduce((sum, c) => sum + c.bounces, 0);

		return {
			campaigns: recentCampaigns,
			totalRecipients,
			totalOpens,
			totalClicks,
			avgOpenRate: totalRecipients > 0 ? Math.round((totalOpens / totalRecipients) * 100) : 0,
			avgClickRate: totalRecipients > 0 ? Math.round((totalClicks / totalRecipients) * 100) : 0,
			totalUnsubscribes,
			totalBounces,
		};
	} catch (err: any) {
		console.error(`Newsletter report failed: ${err.message}`);
		return null;
	}
}

function collectReminders(): Reminder[] {
	try {
		const remindersPath = path.join(import.meta.dirname, 'reminders.json');
		if (!fs.existsSync(remindersPath)) return [];
		const all: Reminder[] = JSON.parse(fs.readFileSync(remindersPath, 'utf-8'));
		return all.filter(r => r.date === TODAY);
	} catch { return []; }
}

const EXPECTED_SCRAPERS = Object.keys(scrapers);

const SLOW_SCRAPER_THRESHOLD_MS = 60_000; // 60s is suspiciously slow

async function collectLastPipeline(): Promise<PipelineRun | null> {
	console.log('🔧 Checking last pipeline run...');
	try {
		// Get the most recent run_id
		const { data: latest } = await supabase
			.from('scraper_runs')
			.select('run_id, run_at')
			.order('run_at', { ascending: false })
			.limit(1);

		if (!latest || latest.length === 0) return null;

		const runId = latest[0].run_id;
		const runAt = latest[0].run_at;

		// Get all entries for that run
		const { data: runs } = await supabase
			.from('scraper_runs')
			.select('scraper_name, skipped, duration_ms')
			.eq('run_id', runId);

		if (!runs) return null;

		const ranNames = new Set(runs.map(r => r.scraper_name));
		const skipped = runs.filter(r => r.skipped).map(r => r.scraper_name);
		const missing = EXPECTED_SCRAPERS.filter(name => !ranNames.has(name));
		const slow = runs
			.filter(r => !r.skipped && r.duration_ms > SLOW_SCRAPER_THRESHOLD_MS)
			.map(r => ({ name: r.scraper_name, durationMs: r.duration_ms }))
			.sort((a, b) => b.durationMs - a.durationMs);

		return {
			runId,
			runAt,
			scrapersRun: runs.filter(r => !r.skipped).length,
			scrapersSkipped: skipped,
			scrapersMissing: missing,
			slowScrapers: slow
		};
	} catch (err: any) {
		console.error(`Pipeline completeness check failed: ${err.message}`);
		return null;
	}
}

/**
 * Collect brief for each ACTIVE Meta Ads campaign.
 * Any failure (missing token, API error, no active campaigns) degrades to an
 * empty array — the digest must never fail because of Meta.
 */
async function collectActiveCampaigns(): Promise<CampaignBrief[]> {
	if (!process.env.META_ACCESS_TOKEN || !process.env.META_AD_ACCOUNT_ID) {
		return [];
	}
	console.log('Checking active Meta campaigns...');

	try {
		const campaigns = await listCampaigns();
		const active = campaigns.filter(c => c.status === 'ACTIVE');
		if (active.length === 0) return [];

		const briefs: CampaignBrief[] = [];
		for (const c of active) {
			try {
				const check = await checkCampaign(c);
				if (!check) continue;
				const daily = await getCampaignDailyInsights(c.id);
				const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
				const yesterdayRow = daily.find(d => d.date_start === yesterdayStr);

				// Snapshot to ad_insights for long-term history — non-fatal.
				try {
					const rows = await saveDailyInsights(c, daily);
					if (rows > 0) console.log(`  Snapshotted ${rows} ad_insights row(s) for ${c.id}`);
				} catch (saveErr: any) {
					console.warn(`  ad_insights save failed (non-fatal): ${saveErr.message}`);
				}

				briefs.push({
					id: c.id,
					name: c.name,
					shortName: shortenCampaignName(c.name),
					status: check.overall,
					checks: check.checks,
					daysElapsed: daily.length,
					spendNok: check.summary.spendNok,
					dailyBudgetNok: c.daily_budget ? Number(c.daily_budget) / 100 : null,
					totalBudgetNok: c.lifetime_budget ? Number(c.lifetime_budget) / 100 : null,
					impressions: check.summary.impressions,
					linkClicks: check.summary.linkClicks,
					landingPageViews: check.summary.landingPageViews,
					ctrTotal: check.summary.ctrTotal,
					cpcLink: check.summary.cpcLink,
					cpm: check.summary.cpm,
					yesterday: yesterdayRow
						? {
								date: yesterdayRow.date_start,
								impressions: Number(yesterdayRow.impressions || 0),
								clicks: Number(yesterdayRow.clicks || 0),
								lpv: parseActions(yesterdayRow.actions).landingPageViews,
								spendNok: Number(yesterdayRow.spend || 0),
								ctr: Number(yesterdayRow.ctr || 0),
							}
						: null,
				});
			} catch (err: any) {
				console.warn(`  Skipping campaign ${c.name}: ${err.message}`);
			}
		}
		return briefs;
	} catch (err: any) {
		console.warn(`  Meta campaigns check failed (non-fatal): ${err.message}`);
		return [];
	}
}

/** Strip FB's auto-generated "[DD/MM/YYYY] Promoting <url>" prefix for display. */
function shortenCampaignName(name: string): string {
	// "[08/04/2026] Promoting https://gaari.no?...utm_campaign=boost-2026-04-08..."
	// → "boost-2026-04-08"
	const utmMatch = name.match(/utm_campaign=([^&\s]+)/);
	if (utmMatch) return utmMatch[1];
	const promotingMatch = name.match(/^\[[\d/]+\]\s+Promoting\s+(.+)/i);
	if (promotingMatch) return promotingMatch[1].slice(0, 60);
	return name.length > 60 ? name.slice(0, 59) + '…' : name;
}

async function collectSocialStatus(): Promise<SocialStatus | null> {
	console.log('Checking social status...');
	const META_TOKEN = process.env.META_ACCESS_TOKEN || process.env.IG_ACCESS_TOKEN || '';
	const IG_USER_ID = process.env.IG_USER_ID || '';
	const FB_PAGE_ID = process.env.FB_PAGE_ID || '';

	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	const yesterdayStart = yesterday.toISOString().slice(0, 10) + 'T00:00:00Z';
	const yesterdayEnd = yesterday.toISOString().slice(0, 10) + 'T23:59:59Z';
	const yesterdayDateStr = yesterday.toISOString().slice(0, 10);

	// Count posts published yesterday from social_posts table
	let igPosted = 0;
	let fbPosted = 0;
	let storiesPosted = 0;
	const failureNotes: string[] = [];

	try {
		const { data: posts } = await supabase
			.from('social_posts')
			.select('instagram_id, facebook_id, story_posted_count, instagram_posted_at, facebook_posted_at')
			.gte('generated_date', yesterdayDateStr)
			.lte('generated_date', yesterdayDateStr);

		for (const p of posts || []) {
			if (p.instagram_posted_at && p.instagram_posted_at >= yesterdayStart && p.instagram_posted_at <= yesterdayEnd) igPosted++;
			if (p.facebook_posted_at && p.facebook_posted_at >= yesterdayStart && p.facebook_posted_at <= yesterdayEnd) fbPosted++;
			if (p.story_posted_count) storiesPosted += p.story_posted_count;
		}
	} catch (err: any) {
		failureNotes.push(`Could not read social_posts: ${err.message}`);
	}

	// Live follower counts via Graph API
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

	// Snapshot today and read yesterday for delta
	const today = new Date().toISOString().slice(0, 10);
	if (igFollowers != null || fbFollowers != null) {
		try {
			await supabase
				.from('daily_metrics')
				.upsert({ date: today, ig_followers: igFollowers, fb_followers: fbFollowers }, { onConflict: 'date' });
		} catch { /* non-critical */ }
	}

	let igFollowersDelta: number | null = null;
	let fbFollowersDelta: number | null = null;
	try {
		const { data } = await supabase
			.from('daily_metrics')
			.select('ig_followers, fb_followers')
			.eq('date', yesterdayDateStr)
			.maybeSingle();
		if (data?.ig_followers != null && igFollowers != null) {
			igFollowersDelta = igFollowers - data.ig_followers;
		}
		if (data?.fb_followers != null && fbFollowers != null) {
			fbFollowersDelta = fbFollowers - data.fb_followers;
		}
	} catch { /* ignore */ }

	return {
		postedYesterday: { ig: igPosted, fb: fbPosted, stories: storiesPosted },
		failedYesterday: failureNotes.length,
		failureNotes,
		igFollowers,
		igFollowersDelta,
		fbFollowers,
		fbFollowersDelta
	};
}

// ─── HTML Email Template ────────────────────────────────────────────

function renderHtml(data: DigestData): string {
	const total = data.pending.corrections + data.pending.submissions + data.pending.optouts + data.pending.inquiries;
	const brokenScrapers = data.scraperHealth.filter(s => s.status === 'broken');
	const warningScrapers = data.scraperHealth.filter(s => s.status === 'warning');
	const pipelineMissing = data.lastPipeline?.scrapersMissing.length ?? 0;
	const urgentFestivals = data.festivalReminders.filter(f => f.daysUntil <= 3);
	const hasWarning = data.scraper.newEvents24h === 0 || total > 10 || brokenScrapers.length > 0 || data.staleSources.length >= 5 || pipelineMissing > 0 || urgentFestivals.length > 0;

	const warningHtml = hasWarning ? `
		<div style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:16px;margin-bottom:24px">
			<h2 style="color:#dc2626;margin:0 0 8px;font-size:16px">Trenger oppmerksomhet</h2>
			${data.scraper.newEvents24h === 0 ? '<p style="margin:4px 0;color:#991b1b">Ingen nye events de siste 24 timene — scraper-pipeline kan ha feilet</p>' : ''}
			${total > 10 ? `<p style="margin:4px 0;color:#991b1b">${total} ventende oppgaver — vurder å behandle dem</p>` : ''}
			${brokenScrapers.length > 0 ? `<p style="margin:4px 0;color:#991b1b">${brokenScrapers.length} scraper${brokenScrapers.length === 1 ? '' : 'e'} nede: ${brokenScrapers.map(s => s.name).join(', ')}</p>` : ''}
			${data.staleSources.length >= 5 ? `<p style="margin:4px 0;color:#991b1b">${data.staleSources.length} kilder har 0 kommende events</p>` : ''}
			${pipelineMissing > 0 ? `<p style="margin:4px 0;color:#991b1b">${pipelineMissing} scrapere manglet fra siste pipeline-kjoring</p>` : ''}
			${urgentFestivals.length > 0 ? urgentFestivals.map(f => `<p style="margin:4px 0;color:#991b1b">${f.name} ${f.daysUntil <= 0 ? 'pågår nå' : `starter om ${f.daysUntil} dag${f.daysUntil === 1 ? '' : 'er'}`} — test scraper!</p>`).join('') : ''}
		</div>
	` : '';

	const badgeColor = (count: number): string => {
		if (count === 0) return 'background:#D1FAE5;color:#065F46';
		if (count <= 3) return 'background:#FEF3C7;color:#92400E';
		return 'background:#FEE2E2;color:#991B1B';
	};

	const pendingHtml = `
		<h2 style="border-bottom:2px solid #C82D2D;padding-bottom:6px;margin-top:0">Ventende oppgaver</h2>
		<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
			<tbody>
				${[
					{ label: 'Rettelser', count: data.pending.corrections, url: '/admin/corrections' },
					{ label: 'Arrangementer', count: data.pending.submissions, url: '/admin/submissions' },
					{ label: 'Datahenvendelser', count: data.pending.optouts, url: '/admin/optouts' },
					{ label: 'Henvendelser', count: data.pending.inquiries, url: '/admin/innsendelser' }
				].map(item => `
					<tr>
						<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px">${item.label}</td>
						<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:center">
							<span style="display:inline-block;padding:2px 12px;border-radius:4px;font-size:13px;font-weight:600;${badgeColor(item.count)}">${item.count}</span>
						</td>
						<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right">
							<a href="${SITE_URL}${item.url}" style="color:#C82D2D;text-decoration:underline;font-size:13px">Åpne</a>
						</td>
					</tr>
				`).join('')}
			</tbody>
		</table>
	`;

	const scraperHtml = `
		<h2 style="border-bottom:2px solid #C82D2D;padding-bottom:6px">Scraper-aktivitet</h2>
		<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
			<tbody>
				<tr>
					<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px">Nye events (siste 24t)</td>
					<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;color:${data.scraper.newEvents24h > 0 ? '#16a34a' : '#dc2626'}">${data.scraper.newEvents24h}</td>
				</tr>
				<tr>
					<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px">Totalt aktive events</td>
					<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">${data.scraper.totalActiveEvents}</td>
				</tr>
			</tbody>
		</table>
	`;

	const healthStatusBadge = (status: ScraperHealthStatus['status']): string => {
		switch (status) {
			case 'broken': return 'background:#FEE2E2;color:#991B1B';
			case 'warning': return 'background:#FEF3C7;color:#92400E';
			case 'dormant': return 'background:#F3F4F6;color:#6B7280';
			default: return 'background:#D1FAE5;color:#065F46';
		}
	};

	const unhealthyScrapers = data.scraperHealth.filter(s => s.status !== 'healthy');
	const scraperHealthHtml = data.scraperHealth.length > 0 ? `
		<h2 style="border-bottom:2px solid #C82D2D;padding-bottom:6px">Scraper-helse</h2>
		${unhealthyScrapers.length === 0 ? `
			<p style="color:#065F46;font-size:14px;margin-bottom:24px">Alle ${data.scraperHealth.length} scrapere kjorer normalt</p>
		` : `
			<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
				<thead><tr style="background:#f5f5f5">
					<th style="text-align:left;padding:8px;border:1px solid #ddd;font-size:13px">Scraper</th>
					<th style="text-align:center;padding:8px;border:1px solid #ddd;font-size:13px">Status</th>
					<th style="text-align:right;padding:8px;border:1px solid #ddd;font-size:13px">Sist</th>
					<th style="text-align:right;padding:8px;border:1px solid #ddd;font-size:13px">Snitt</th>
				</tr></thead>
				<tbody>
					${unhealthyScrapers.map(s => `
						<tr>
							<td style="padding:8px;border:1px solid #ddd;font-size:14px">${s.name}</td>
							<td style="text-align:center;padding:8px;border:1px solid #ddd">
								<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;${healthStatusBadge(s.status)}">${s.status}</span>
							</td>
							<td style="text-align:right;padding:8px;border:1px solid #ddd;font-size:14px">${s.lastFound}</td>
							<td style="text-align:right;padding:8px;border:1px solid #ddd;font-size:14px">${s.avgFound}</td>
						</tr>
						<tr>
							<td colspan="4" style="padding:4px 8px 8px;border:1px solid #ddd;border-top:0;font-size:12px;color:#666">${s.reason}</td>
						</tr>
					`).join('')}
				</tbody>
			</table>
		`}
	` : '';

	const staleSourcesHtml = data.staleSources.length > 0 ? `
		<h2 style="border-bottom:2px solid #C82D2D;padding-bottom:6px">Kilde-friskhet</h2>
		<p style="font-size:13px;color:#666;margin:0 0 8px">Kilder med 0 kommende events — enten sesong-pause eller mulig problem.</p>
		<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
			<thead><tr style="background:#f5f5f5">
				<th style="text-align:left;padding:8px;border:1px solid #ddd;font-size:13px">Kilde</th>
				<th style="text-align:right;padding:8px;border:1px solid #ddd;font-size:13px">Events i DB</th>
				<th style="text-align:right;padding:8px;border:1px solid #ddd;font-size:13px">Siste event</th>
			</tr></thead>
			<tbody>
				${data.staleSources.map(s => `
					<tr>
						<td style="padding:8px;border:1px solid #ddd;font-size:14px">${s.source}</td>
						<td style="text-align:right;padding:8px;border:1px solid #ddd;font-size:14px">${s.totalEvents}</td>
						<td style="text-align:right;padding:8px;border:1px solid #ddd;font-size:14px;color:#92400E">${s.latestDateStart.slice(0, 10)}</td>
					</tr>
				`).join('')}
			</tbody>
		</table>
	` : '';

	const pipelineHtml = data.lastPipeline ? (() => {
		const p = data.lastPipeline;
		const hasIssues = p.scrapersSkipped.length > 0 || p.scrapersMissing.length > 0 || p.slowScrapers.length > 0;
		if (!hasIssues) return '';

		const rows: string[] = [];
		if (p.scrapersMissing.length > 0) {
			rows.push(`
				<tr>
					<td style="padding:8px;border:1px solid #ddd;font-size:14px;vertical-align:top">
						<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;background:#FEE2E2;color:#991B1B">Manglet</span>
					</td>
					<td style="padding:8px;border:1px solid #ddd;font-size:14px">${p.scrapersMissing.join(', ')}</td>
				</tr>
			`);
		}
		if (p.scrapersSkipped.length > 0) {
			rows.push(`
				<tr>
					<td style="padding:8px;border:1px solid #ddd;font-size:14px;vertical-align:top">
						<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;background:#FEF3C7;color:#92400E">Hoppet over</span>
					</td>
					<td style="padding:8px;border:1px solid #ddd;font-size:14px">${p.scrapersSkipped.join(', ')}</td>
				</tr>
			`);
		}
		if (p.slowScrapers.length > 0) {
			rows.push(`
				<tr>
					<td style="padding:8px;border:1px solid #ddd;font-size:14px;vertical-align:top">
						<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;background:#FEF3C7;color:#92400E">Treg</span>
					</td>
					<td style="padding:8px;border:1px solid #ddd;font-size:14px">${p.slowScrapers.map(s => `${s.name} (${(s.durationMs / 1000).toFixed(0)}s)`).join(', ')}</td>
				</tr>
			`);
		}

		return `
			<h2 style="border-bottom:2px solid #C82D2D;padding-bottom:6px">Siste pipeline-kjoring</h2>
			<p style="font-size:13px;color:#666;margin:0 0 8px">${p.scrapersRun} scrapere kjort — ${new Date(p.runAt).toLocaleString('no-NO', { timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}</p>
			<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
				<tbody>${rows.join('')}</tbody>
			</table>
		`;
	})() : '';

	const trafficHtml = data.traffic ? (() => {
		const t = data.traffic!;
		const deltaBadge = (val: number | null) => val !== null
			? ` <span style="font-size:13px;font-weight:400;color:${val > 0 ? '#16a34a' : val < 0 ? '#dc2626' : '#666'}">(${val > 0 ? '+' : ''}${val})</span>`
			: '';
		const weekRow = t.weekVisitors !== null ? `
				<tr>
					<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px">Siste 7 dager</td>
					<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">${t.weekVisitors} besøkende${t.weekChange !== null ? ` <span style="font-size:13px;font-weight:400;color:${t.weekChange > 0 ? '#16a34a' : t.weekChange < 0 ? '#dc2626' : '#666'}">(${t.weekChange > 0 ? '+' : ''}${t.weekChange}% fra forrige uke)</span>` : ''}</td>
				</tr>` : '';
		const referrerRows = t.topReferrers ? t.topReferrers.map(r => `
				<tr>
					<td style="padding:6px 12px;font-size:13px;color:#666">${r.name}</td>
					<td style="padding:6px 12px;text-align:right;font-size:13px">${r.count}</td>
				</tr>`).join('') : '';
		return `
		<h2 style="border-bottom:2px solid #C82D2D;padding-bottom:6px">Trafikk</h2>
		<table style="width:100%;border-collapse:collapse;margin-bottom:12px">
			<tbody>
				<tr>
					<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px">Besøkende i går</td>
					<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">${t.visitors}${deltaBadge(t.visitorsDelta)}</td>
				</tr>
				<tr>
					<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px">Sidevisninger i går</td>
					<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">${t.pageviews}${deltaBadge(t.pageviewsDelta)}</td>
				</tr>${weekRow}
			</tbody>
		</table>${referrerRows ? `
		<p style="font-size:13px;color:#666;margin:0 0 4px">Topp kilder (7 dager):</p>
		<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
			<tbody>${referrerRows}
			</tbody>
		</table>` : ''}`;
	})() : '';

	const subscriberHtml = data.subscribers !== null ? (() => {
		const delta = data.subscribersPrev !== null ? data.subscribers - data.subscribersPrev : null;
		const deltaStr = delta !== null
			? ` <span style="font-size:13px;font-weight:400;color:${delta > 0 ? '#16a34a' : delta < 0 ? '#dc2626' : '#666'}">(${delta > 0 ? '+' : ''}${delta})</span>`
			: '';
		return `
		<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
			<tbody>
				<tr>
					<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px">Nyhetsbrev-abonnenter</td>
					<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">${data.subscribers}${deltaStr}</td>
				</tr>
			</tbody>
		</table>
	`;
	})() : '';

	const newsletterHtml = data.newsletterReport ? (() => {
		const nr = data.newsletterReport;
		return `
			<h2 style="border-bottom:2px solid #C82D2D;padding-bottom:6px">Nyhetsbrev-rapport (torsdagens utsending)</h2>
			<table style="width:100%;border-collapse:collapse;margin-bottom:12px">
				<tbody>
					<tr>
						<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px">Mottakere</td>
						<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">${nr.totalRecipients}</td>
					</tr>
					<tr>
						<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px">Åpnet</td>
						<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;color:${nr.avgOpenRate >= 30 ? '#16a34a' : nr.avgOpenRate >= 15 ? '#d97706' : '#dc2626'}">${nr.totalOpens} (${nr.avgOpenRate}%)</td>
					</tr>
					<tr>
						<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px">Klikket</td>
						<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;color:${nr.avgClickRate >= 5 ? '#16a34a' : nr.avgClickRate >= 2 ? '#d97706' : '#dc2626'}">${nr.totalClicks} (${nr.avgClickRate}%)</td>
					</tr>
					${nr.totalUnsubscribes > 0 ? `<tr>
						<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px">Avmeldt</td>
						<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;color:#dc2626">${nr.totalUnsubscribes}</td>
					</tr>` : ''}
					${nr.totalBounces > 0 ? `<tr>
						<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px">Bounces</td>
						<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600;color:#dc2626">${nr.totalBounces}</td>
					</tr>` : ''}
				</tbody>
			</table>
			${nr.campaigns.length > 1 ? `
				<p style="font-size:13px;color:#666;margin:0 0 4px">Per segment:</p>
				<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
					<thead><tr style="background:#f5f5f5">
						<th style="text-align:left;padding:6px 8px;border:1px solid #ddd;font-size:12px">Segment</th>
						<th style="text-align:right;padding:6px 8px;border:1px solid #ddd;font-size:12px">Sendt</th>
						<th style="text-align:right;padding:6px 8px;border:1px solid #ddd;font-size:12px">Åpnet</th>
						<th style="text-align:right;padding:6px 8px;border:1px solid #ddd;font-size:12px">Klikk</th>
					</tr></thead>
					<tbody>
						${nr.campaigns.map(c => {
							// Extract segment key from campaign name (after " — ")
							const seg = c.name.includes(' — ') ? c.name.split(' — ')[1] : c.subject;
							return `<tr>
								<td style="padding:6px 8px;border:1px solid #ddd;font-size:13px">${seg}</td>
								<td style="text-align:right;padding:6px 8px;border:1px solid #ddd;font-size:13px">${c.recipients}</td>
								<td style="text-align:right;padding:6px 8px;border:1px solid #ddd;font-size:13px;color:${c.openRate >= 30 ? '#16a34a' : '#666'}">${c.opens} (${c.openRate}%)</td>
								<td style="text-align:right;padding:6px 8px;border:1px solid #ddd;font-size:13px;color:${c.clickRate >= 5 ? '#16a34a' : '#666'}">${c.clicks} (${c.clickRate}%)</td>
							</tr>`;
						}).join('')}
					</tbody>
				</table>
			` : ''}
		`;
	})() : '';

	const campaignsHtml = data.activeCampaigns.length > 0 ? (() => {
		const statusColor = (s: CheckStatus): string => {
			if (s === 'critical') return '#dc2626';
			if (s === 'warning') return '#d97706';
			return '#16a34a';
		};
		const statusLabel = (s: CheckStatus): string => {
			if (s === 'critical') return 'Krever oppmerksomhet';
			if (s === 'warning') return 'På vei — sjekk avvik';
			return 'På mål';
		};
		const checkBadge = (c: CampaignCheck): string => {
			const icon = c.status === 'ok' ? '✓' : c.status === 'warning' ? '!' : '✗';
			return `<span style="display:inline-block;padding:2px 8px;border-radius:3px;font-size:11px;font-weight:600;background:${c.status === 'ok' ? '#D1FAE5' : c.status === 'warning' ? '#FEF3C7' : '#FEE2E2'};color:${c.status === 'ok' ? '#065F46' : c.status === 'warning' ? '#92400E' : '#991B1B'};margin-right:4px">${icon} ${c.metric}</span>`;
		};
		const cards = data.activeCampaigns.map(c => {
			const budgetLabel = c.dailyBudgetNok
				? `${c.dailyBudgetNok.toFixed(0)} kr/dag`
				: c.totalBudgetNok
				? `${c.totalBudgetNok.toFixed(0)} kr total`
				: '—';
			const yesterdayBlock = c.yesterday
				? `
					<div style="margin-top:10px;padding:10px 12px;background:#f9fafb;border-radius:4px;font-size:13px">
						<strong style="color:#374151">I går (${c.yesterday.date}):</strong>
						${c.yesterday.impressions.toLocaleString('nb-NO')} visninger · ${c.yesterday.clicks} klikk · ${c.yesterday.lpv} LPV · ${c.yesterday.spendNok.toFixed(2)} kr · CTR ${c.yesterday.ctr.toFixed(2)}%
					</div>
				`
				: `<div style="margin-top:10px;padding:10px 12px;background:#f9fafb;border-radius:4px;font-size:13px;color:#6b7280">Ingen data for i går ennå</div>`;

			return `
				<div style="border:1px solid #e5e7eb;border-left:4px solid ${statusColor(c.status)};border-radius:6px;padding:14px 16px;margin-bottom:12px">
					<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:6px">
						<div>
							<div style="font-weight:600;font-size:15px;color:#141414">${c.shortName}</div>
							<div style="font-size:12px;color:#6b7280;margin-top:2px">Dag ${c.daysElapsed} · ${budgetLabel} · ${statusLabel(c.status)}</div>
						</div>
					</div>
					<table style="width:100%;margin-top:10px;border-collapse:collapse;font-size:13px">
						<tr>
							<td style="padding:4px 0;color:#6b7280">Spend totalt</td>
							<td style="padding:4px 0;text-align:right;font-weight:600">${c.spendNok.toFixed(2)} kr</td>
							<td style="padding:4px 0;color:#6b7280;padding-left:16px">Link clicks</td>
							<td style="padding:4px 0;text-align:right;font-weight:600">${c.linkClicks}</td>
						</tr>
						<tr>
							<td style="padding:4px 0;color:#6b7280">CTR (alle)</td>
							<td style="padding:4px 0;text-align:right;font-weight:600">${c.ctrTotal.toFixed(2)}%</td>
							<td style="padding:4px 0;color:#6b7280;padding-left:16px">Landing views</td>
							<td style="padding:4px 0;text-align:right;font-weight:600">${c.landingPageViews}</td>
						</tr>
						<tr>
							<td style="padding:4px 0;color:#6b7280">CPC (lenke)</td>
							<td style="padding:4px 0;text-align:right;font-weight:600">${c.cpcLink.toFixed(2)} kr</td>
							<td style="padding:4px 0;color:#6b7280;padding-left:16px">CPM</td>
							<td style="padding:4px 0;text-align:right;font-weight:600">${c.cpm.toFixed(2)} kr</td>
						</tr>
					</table>
					<div style="margin-top:10px">
						${c.checks.map(checkBadge).join('')}
					</div>
					${yesterdayBlock}
				</div>
			`;
		}).join('');

		return `
			<h2 style="border-bottom:2px solid #C82D2D;padding-bottom:6px">Aktive Meta-kampanjer</h2>
			${cards}
		`;
	})() : '';

	const socialHtml = data.socialStatus ? (() => {
		const ss = data.socialStatus!;
		const fmtDelta = (n: number | null) => {
			if (n == null) return '<span style="color:#737373">—</span>';
			if (n === 0) return '<span style="color:#737373">±0</span>';
			const color = n > 0 ? '#1A6B35' : '#C82D2D';
			const sign = n > 0 ? '+' : '';
			return `<span style="color:${color};font-weight:700">${sign}${n}</span>`;
		};

		const totalPosts = ss.postedYesterday.ig + ss.postedYesterday.fb + ss.postedYesterday.stories;
		const allOk = ss.failedYesterday === 0;
		const statusLine = totalPosts === 0
			? '<span style="color:#737373">Ingen poster i går</span>'
			: allOk
				? `<span style="color:#1A6B35;font-weight:700">Alt gikk etter planen</span> · ${ss.postedYesterday.ig} IG · ${ss.postedYesterday.fb} FB · ${ss.postedYesterday.stories} stories`
				: `<span style="color:#C82D2D;font-weight:700">Problemer i går</span> · ${ss.postedYesterday.ig} IG · ${ss.postedYesterday.fb} FB · ${ss.postedYesterday.stories} stories`;

		const failuresHtml = ss.failureNotes.length > 0
			? `<ul style="margin:8px 0 0;padding-left:20px;font-size:13px;color:#C82D2D">${ss.failureNotes.map(n => `<li>${n}</li>`).join('')}</ul>`
			: '';

		return `
			<h2 style="border-bottom:2px solid #C82D2D;padding-bottom:6px">Sosiale medier</h2>
			<p style="margin:0 0 12px;font-size:14px">${statusLine}</p>
			${failuresHtml}
			<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
				<tbody>
					<tr>
						<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#4D4D4D">Instagram-følgere</td>
						<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700">${ss.igFollowers ?? '—'}</td>
						<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;width:80px">${fmtDelta(ss.igFollowersDelta)}</td>
					</tr>
					<tr>
						<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px;color:#4D4D4D">Facebook-følgere</td>
						<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700">${ss.fbFollowers ?? '—'}</td>
						<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;width:80px">${fmtDelta(ss.fbFollowersDelta)}</td>
					</tr>
				</tbody>
			</table>
		`;
	})() : '';

	const festivalHtml = data.festivalReminders.length > 0 ? `
		<h2 style="border-bottom:2px solid #C82D2D;padding-bottom:6px">Kommende festivaler</h2>
		${data.festivalReminders.map(f => {
			const urgencyColor = f.daysUntil <= 0 ? '#dc2626' : f.daysUntil <= 3 ? '#d97706' : '#2563eb';
			const urgencyLabel = f.daysUntil <= 0 ? 'Pågår nå!' : f.daysUntil === 1 ? 'I morgen!' : `${f.daysUntil} dager`;
			return `
			<div style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid ${urgencyColor};border-radius:4px;padding:12px 16px;margin-bottom:12px">
				<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
					<strong style="font-size:15px">${f.name}</strong>
					<span style="display:inline-block;padding:2px 10px;border-radius:4px;font-size:12px;font-weight:600;background:${f.daysUntil <= 0 ? '#FEE2E2' : f.daysUntil <= 3 ? '#FEF3C7' : '#DBEAFE'};color:${urgencyColor}">${urgencyLabel}</span>
				</div>
				<p style="margin:0 0 8px;font-size:13px;color:#666">${f.startDate} → ${f.endDate}</p>
				<ul style="margin:0;padding-left:20px;font-size:13px;color:#333">
					${f.checklist.map(item => `<li style="margin:4px 0">${item}</li>`).join('')}
				</ul>
			</div>`;
		}).join('')}
	` : '';

	const remindersHtml = data.reminders.length > 0 ? `
		<h2 style="border-bottom:2px solid #C82D2D;padding-bottom:6px">Påminnelser</h2>
		${data.reminders.map(r => `
			<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-left:4px solid #2563eb;border-radius:4px;padding:12px 16px;margin-bottom:12px">
				<strong style="font-size:15px">${r.title}</strong>
				<p style="margin:8px 0 0;font-size:13px;color:#333">${r.description}</p>
			</div>
		`).join('')}
	` : '';

	const placementsHtml = data.expiringPlacements.length > 0 ? `
		<h2 style="border-bottom:2px solid #C82D2D;padding-bottom:6px">Utløpende plasseringer (7 dager)</h2>
		<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
			<thead><tr style="background:#f5f5f5">
				<th style="text-align:left;padding:8px;border:1px solid #ddd;font-size:13px">Sted</th>
				<th style="text-align:left;padding:8px;border:1px solid #ddd;font-size:13px">Tier</th>
				<th style="text-align:right;padding:8px;border:1px solid #ddd;font-size:13px">Utløper</th>
				<th style="text-align:right;padding:8px;border:1px solid #ddd;font-size:13px">Dager igjen</th>
			</tr></thead>
			<tbody>
				${data.expiringPlacements.map(p => `
					<tr>
						<td style="padding:8px;border:1px solid #ddd;font-size:14px">${p.venue_name}</td>
						<td style="padding:8px;border:1px solid #ddd;font-size:14px;text-transform:capitalize">${p.tier}</td>
						<td style="text-align:right;padding:8px;border:1px solid #ddd;font-size:14px">${p.end_date}</td>
						<td style="text-align:right;padding:8px;border:1px solid #ddd;font-size:14px;color:${p.daysLeft <= 2 ? '#dc2626' : '#d97706'};font-weight:600">${p.daysLeft}</td>
					</tr>
				`).join('')}
			</tbody>
		</table>
	` : '';

	return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#141414;background:#fff">
	<div style="border-bottom:4px solid #C82D2D;padding-bottom:12px;margin-bottom:24px">
		<h1 style="margin:0;font-size:22px">Gåri — Daglig oversikt</h1>
		<p style="margin:4px 0 0;color:#666;font-size:14px">${TODAY}</p>
	</div>

	${warningHtml}
	${pendingHtml}
	${scraperHtml}
	${scraperHealthHtml}
	${staleSourcesHtml}
	${pipelineHtml}
	${trafficHtml}
	${subscriberHtml}
	${newsletterHtml}
	${campaignsHtml}
	${socialHtml}
	${festivalHtml}
	${remindersHtml}
	${placementsHtml}

	<div style="border-top:1px solid #ddd;padding-top:12px;margin-top:24px;color:#999;font-size:12px">
		<p style="margin:0">Automatisk generert. <a href="${SITE_URL}/admin/calendar" style="color:#C82D2D">Åpne admin</a></p>
	</div>
</body>
</html>`;
}

// ─── Email via Resend ───────────────────────────────────────────────

async function sendEmail(html: string, totalPending: number, brokenScraperCount: number): Promise<boolean> {
	const key = process.env.RESEND_API_KEY;
	if (!key) {
		console.error('Cannot send email: no RESEND_API_KEY');
		return false;
	}

	const subject = brokenScraperCount > 0
		? `[Daglig oversikt] ${brokenScraperCount} scraper${brokenScraperCount === 1 ? '' : 'e'} nede`
		: totalPending > 0
			? `[Daglig oversikt] ${totalPending} ventende oppgave${totalPending === 1 ? '' : 'r'}`
			: `[Daglig oversikt] Alt i orden — ${TODAY}`;

	const resp = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${key}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: FROM_EMAIL,
			to: [REPORT_EMAIL],
			subject,
			html
		})
	});

	if (resp.ok) {
		const data = await resp.json() as { id: string };
		console.log(`✅ Email sent (Resend ID: ${data.id})`);
		return true;
	} else {
		console.error(`❌ Email failed: ${resp.status} ${await resp.text()}`);
		return false;
	}
}

// ─── Summary (for GHA) ─────────────────────────────────────────────

function writeSummary(data: DigestData, emailSent: boolean) {
	const summaryFile = process.env.SUMMARY_FILE;
	if (!summaryFile) return;

	const total = data.pending.corrections + data.pending.submissions + data.pending.optouts + data.pending.inquiries;
	const summary = {
		date: TODAY,
		pendingTotal: total,
		pendingCorrections: data.pending.corrections,
		pendingSubmissions: data.pending.submissions,
		pendingOptouts: data.pending.optouts,
		pendingInquiries: data.pending.inquiries,
		newEvents24h: data.scraper.newEvents24h,
		totalActiveEvents: data.scraper.totalActiveEvents,
		visitors: data.traffic?.visitors ?? null,
		subscribers: data.subscribers,
		expiringPlacements: data.expiringPlacements.length,
		emailSent
	};

	fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
	console.log(`\n📋 Gåri Daily Digest — ${TODAY}`);
	if (DRY_RUN) console.log('   (dry run — will write HTML to file, not send email)\n');

	// Collect data in parallel
	const [pending, scraper, scraperHealth, staleSources, lastPipeline, traffic, subscriberData, expiringPlacements, newsletterReport, socialStatus, activeCampaigns] = await Promise.all([
		collectPendingCounts(),
		collectScraperActivity(),
		collectScraperHealth(),
		collectStaleSources(),
		collectLastPipeline(),
		collectTraffic(),
		collectSubscribers(),
		collectExpiringPlacements(),
		collectNewsletterReport(),
		collectSocialStatus(),
		collectActiveCampaigns()
	]);

	const festivalReminders = collectFestivalReminders();
	const reminders = collectReminders();

	const digestData: DigestData = {
		date: TODAY,
		pending,
		scraper,
		scraperHealth,
		staleSources,
		lastPipeline,
		traffic,
		subscribers: subscriberData.current,
		subscribersPrev: subscriberData.previous,
		expiringPlacements,
		festivalReminders,
		reminders,
		newsletterReport,
		socialStatus,
		activeCampaigns
	};

	const total = pending.corrections + pending.submissions + pending.optouts + pending.inquiries;

	console.log(`\n📋 Summary:`);
	console.log(`   Pending tasks: ${total} (corrections: ${pending.corrections}, submissions: ${pending.submissions}, optouts: ${pending.optouts}, inquiries: ${pending.inquiries})`);
	console.log(`   New events (24h): ${scraper.newEvents24h}`);
	console.log(`   Active events: ${scraper.totalActiveEvents}`);
	if (traffic) {
		const wd = traffic.visitorsDelta !== null ? ` (${traffic.visitorsDelta > 0 ? '+' : ''}${traffic.visitorsDelta})` : '';
		const wk = traffic.weekChange !== null ? ` | Week: ${traffic.weekVisitors} (${traffic.weekChange > 0 ? '+' : ''}${traffic.weekChange}%)` : '';
		console.log(`   Yesterday: ${traffic.visitors} visitors${wd}, ${traffic.pageviews} pageviews${wk}`);
	}
	if (subscriberData.current !== null) {
		const delta = subscriberData.previous !== null ? ` (${subscriberData.current >= subscriberData.previous ? '+' : ''}${subscriberData.current - subscriberData.previous})` : '';
		console.log(`   Subscribers: ${subscriberData.current}${delta}`);
	}
	if (expiringPlacements.length > 0) console.log(`   Expiring placements: ${expiringPlacements.length}`);
	const brokenCount = scraperHealth.filter(s => s.status === 'broken').length;
	const warningCount = scraperHealth.filter(s => s.status === 'warning').length;
	if (scraperHealth.length > 0) {
		console.log(`   Scraper health: ${brokenCount} broken, ${warningCount} warning, ${scraperHealth.length} total`);
	}
	if (staleSources.length > 0) {
		console.log(`   Stale sources (0 upcoming events): ${staleSources.map(s => s.source).join(', ')}`);
	}
	if (festivalReminders.length > 0) {
		console.log(`   Festival reminders: ${festivalReminders.map(f => `${f.name} (${f.daysUntil <= 0 ? 'pågår' : f.daysUntil + 'd'})`).join(', ')}`);
	}
	if (newsletterReport) {
		console.log(`   Newsletter: ${newsletterReport.totalRecipients} sent, ${newsletterReport.totalOpens} opens (${newsletterReport.avgOpenRate}%), ${newsletterReport.totalClicks} clicks (${newsletterReport.avgClickRate}%)`);
	}
	if (activeCampaigns.length > 0) {
		for (const c of activeCampaigns) {
			const icon = c.status === 'ok' ? '✓' : c.status === 'warning' ? '!' : '✗';
			console.log(`   Meta campaign ${icon} ${c.shortName}: ${c.linkClicks} clicks, ${c.spendNok.toFixed(2)} kr, CPC ${c.cpcLink.toFixed(2)} kr, CTR ${c.ctrTotal.toFixed(2)}%`);
		}
	}
	if (lastPipeline) {
		console.log(`   Last pipeline: ${lastPipeline.scrapersRun} ran, ${lastPipeline.scrapersSkipped.length} skipped, ${lastPipeline.scrapersMissing.length} missing`);
		if (lastPipeline.slowScrapers.length > 0) {
			console.log(`   Slow scrapers (>${SLOW_SCRAPER_THRESHOLD_MS / 1000}s): ${lastPipeline.slowScrapers.map(s => `${s.name} (${(s.durationMs / 1000).toFixed(1)}s)`).join(', ')}`);
		}
	}

	// Render HTML
	const html = renderHtml(digestData);

	if (DRY_RUN) {
		const outDir = path.join(import.meta.dirname, '.digest-preview');
		if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
		const outPath = path.join(outDir, `digest-${TODAY}.html`);
		fs.writeFileSync(outPath, html);
		console.log(`\n📄 Preview written to: ${outPath}`);
		writeSummary(digestData, false);
	} else {
		const sent = await sendEmail(html, total, brokenCount);
		writeSummary(digestData, sent);
	}

	console.log('\n✅ Digest complete.\n');
}

main().catch(err => {
	console.error('Digest failed:', err);
	process.exit(1);
});
