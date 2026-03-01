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
 *   PLAUSIBLE_API_KEY (optional), MAILERLITE_API_KEY (optional)
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { supabase } from './lib/supabase.js';
import { analyzeScraperHealth, type ScraperHealthStatus } from './lib/scraper-health.js';

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

interface Reminder {
	date: string;
	title: string;
	description: string;
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
	expiringPlacements: ExpiringPlacement[];
	festivalReminders: FestivalReminder[];
	reminders: Reminder[];
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
	const key = process.env.PLAUSIBLE_API_KEY;
	if (!key) {
		console.log('⏭  Plausible: skipped (no PLAUSIBLE_API_KEY)');
		return null;
	}

	console.log('📊 Fetching yesterday\'s traffic...');

	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	const dateStr = yesterday.toISOString().slice(0, 10);

	try {
		const params = new URLSearchParams({
			site_id: 'gaari.no',
			period: 'day',
			date: dateStr,
			metrics: 'visitors,pageviews'
		});

		const resp = await fetch(`https://plausible.io/api/v1/stats/aggregate?${params}`, {
			headers: { Authorization: `Bearer ${key}` }
		});

		if (!resp.ok) return null;
		const data = await resp.json() as { results: Record<string, { value: number }> };
		return {
			visitors: data.results.visitors?.value ?? 0,
			pageviews: data.results.pageviews?.value ?? 0
		};
	} catch { return null; }
}

async function collectSubscribers(): Promise<number | null> {
	const key = process.env.MAILERLITE_API_KEY;
	if (!key) {
		console.log('⏭  MailerLite: skipped (no MAILERLITE_API_KEY)');
		return null;
	}

	console.log('📧 Fetching subscriber count...');

	try {
		const resp = await fetch('https://connect.mailerlite.com/api/subscribers?limit=0', {
			headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }
		});
		if (!resp.ok) return null;
		const data = await resp.json() as { total: number };
		return data.total ?? 0;
	} catch { return null; }
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

function collectReminders(): Reminder[] {
	try {
		const remindersPath = path.join(import.meta.dirname, 'reminders.json');
		if (!fs.existsSync(remindersPath)) return [];
		const all: Reminder[] = JSON.parse(fs.readFileSync(remindersPath, 'utf-8'));
		return all.filter(r => r.date === TODAY);
	} catch { return []; }
}

// All 52 active scrapers registered in scrape.ts (keep in sync)
const EXPECTED_SCRAPERS = [
	'bergenlive', 'bergenkommune', 'studentbergen', 'dnt', 'eventbrite',
	'ticketco', 'hoopla', 'nordnessjobad', 'raabrent', 'bergenchamber',
	'colonialen', 'bergenkjott', 'paintnsip', 'bergenfilmklubb',
	'cornerteateret', 'dvrtvest', 'kunsthall', 'brettspill', 'mediacity',
	'forumscene', 'usfverftet', 'dns', 'olebull', 'grieghallen', 'kode',
	'litthusbergen', 'bergenbibliotek', 'floyen', 'bitteater', 'harmonien',
	'oseana', 'carteblanche', 'festspillene', 'bergenfest', 'bjorgvinblues',
	'bek', 'beyondthegates', 'brann', 'kulturhusetibergen', 'vvv',
	'bymuseet', 'museumvest', 'akvariet', 'kvarteret', 'fyllingsdalenteater',
	'ggbergen', 'oconnors', 'billetto', 'stenematglede', 'visitbergen',
	'biff', 'bergenpride'
];

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

	const trafficHtml = data.traffic ? `
		<h2 style="border-bottom:2px solid #C82D2D;padding-bottom:6px">Trafikk i går</h2>
		<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
			<tbody>
				<tr>
					<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px">Besøkende</td>
					<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">${data.traffic.visitors}</td>
				</tr>
				<tr>
					<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px">Sidevisninger</td>
					<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">${data.traffic.pageviews}</td>
				</tr>
			</tbody>
		</table>
	` : '';

	const subscriberHtml = data.subscribers !== null ? `
		<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
			<tbody>
				<tr>
					<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;font-size:14px">Nyhetsbrev-abonnenter</td>
					<td style="padding:10px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:600">${data.subscribers}</td>
				</tr>
			</tbody>
		</table>
	` : '';

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
	const [pending, scraper, scraperHealth, staleSources, lastPipeline, traffic, subscribers, expiringPlacements] = await Promise.all([
		collectPendingCounts(),
		collectScraperActivity(),
		collectScraperHealth(),
		collectStaleSources(),
		collectLastPipeline(),
		collectTraffic(),
		collectSubscribers(),
		collectExpiringPlacements()
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
		subscribers,
		expiringPlacements,
		festivalReminders,
		reminders
	};

	const total = pending.corrections + pending.submissions + pending.optouts + pending.inquiries;

	console.log(`\n📋 Summary:`);
	console.log(`   Pending tasks: ${total} (corrections: ${pending.corrections}, submissions: ${pending.submissions}, optouts: ${pending.optouts}, inquiries: ${pending.inquiries})`);
	console.log(`   New events (24h): ${scraper.newEvents24h}`);
	console.log(`   Active events: ${scraper.totalActiveEvents}`);
	if (traffic) console.log(`   Yesterday traffic: ${traffic.visitors} visitors, ${traffic.pageviews} pageviews`);
	if (subscribers !== null) console.log(`   Subscribers: ${subscribers}`);
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
