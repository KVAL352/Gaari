/**
 * SEO Weekly Report — Automated Email Digest
 *
 * Gathers data from Plausible, Google Search Console, Bing Webmaster,
 * and Supabase. Sends an HTML email via Resend with traffic trends,
 * search insights, technical health checks, and content freshness.
 *
 * Usage:
 *   cd scripts && npx tsx seo-weekly-report.ts
 *   cd scripts && npx tsx seo-weekly-report.ts --dry-run
 *
 * Env vars:
 *   PLAUSIBLE_API_KEY, GSC_SERVICE_ACCOUNT, BING_WEBMASTER_KEY,
 *   RESEND_API_KEY, PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import 'dotenv/config';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

const SITE_ID = 'gaari.no';
const SITE_URL = 'https://gaari.no';
const GSC_SITE = 'sc-domain:gaari.no';
const REPORT_EMAIL = 'post@gaari.no';
const FROM_EMAIL = 'Gåri SEO <noreply@gaari.no>';
const DRY_RUN = process.argv.includes('--dry-run');
const TODAY = new Date().toISOString().slice(0, 10);

// ─── Types ──────────────────────────────────────────────────────────

interface TrafficData {
	current: { visitors: number; pageviews: number; bounceRate: number; visitDuration: number; visits: number };
	previous: { visitors: number; pageviews: number; bounceRate: number; visitDuration: number; visits: number };
}

interface GscQuery {
	query: string;
	clicks: number;
	impressions: number;
	ctr: number;
	position: number;
}

interface GscPage {
	page: string;
	clicks: number;
	impressions: number;
	ctr: number;
	position: number;
}

interface SitemapInfo {
	path: string;
	submitted: number;
	indexed: number;
}

interface BingCrawl {
	date: string;
	crawled: number;
	inIndex: number;
	errors: number;
}

interface Alert {
	severity: 'warning' | 'critical';
	message: string;
}

interface ContentInsight {
	type: 'opportunity' | 'ranking-drop' | 'content-gap' | 'faq-suggestion';
	label: string;
	detail: string;
}

interface ReportData {
	date: string;
	traffic: TrafficData | null;
	topPages: Array<{ page: string; visitors: number; pageviews: number }>;
	topSources: Array<{ source: string; visitors: number }>;
	aiReferrals: Array<{ source: string; visitors: number }>;
	gscQueries: GscQuery[];
	gscQueriesPrev: GscQuery[];
	gscPages: GscPage[];
	sitemaps: SitemapInfo[];
	bingCrawl: BingCrawl[];
	bingQueries: Array<{ query: string; impressions: number; clicks: number; avgPos: number }>;
	alerts: Alert[];
	insights: ContentInsight[];
	technicalHealth: {
		sitemapUrls: number;
		hreflangPairs: boolean;
		robotsOk: boolean;
		canonicalOk: boolean;
	};
	freshness: {
		recentEvents: number;
		templateDescriptions: number;
		totalEvents: number;
	};
}

// ─── Helpers ────────────────────────────────────────────────────────

function pct(n: number): string { return `${(n * 100).toFixed(1)}%`; }

function delta(current: number, previous: number): string {
	if (previous === 0) return current > 0 ? '+100%' : '0%';
	const change = ((current - previous) / previous) * 100;
	const arrow = change > 0 ? '↑' : change < 0 ? '↓' : '→';
	return `${arrow} ${Math.abs(change).toFixed(1)}%`;
}

function deltaColor(current: number, previous: number, higherIsBetter = true): string {
	const change = previous === 0 ? 0 : ((current - previous) / previous) * 100;
	if (Math.abs(change) < 1) return '#666';
	const good = higherIsBetter ? change > 0 : change < 0;
	return good ? '#16a34a' : '#dc2626';
}

// ─── Plausible ──────────────────────────────────────────────────────

async function fetchPlausibleAggregate(period: string, date?: string): Promise<{ visitors: number; pageviews: number; bounceRate: number; visitDuration: number; visits: number } | null> {
	const key = process.env.PLAUSIBLE_API_KEY;
	if (!key) return null;

	const params = new URLSearchParams({
		site_id: SITE_ID,
		period,
		metrics: 'visitors,pageviews,bounce_rate,visit_duration,visits'
	});
	if (date) params.set('date', date);

	try {
		const resp = await fetch(`https://plausible.io/api/v1/stats/aggregate?${params}`, {
			headers: { Authorization: `Bearer ${key}` }
		});
		if (!resp.ok) return null;
		const data = await resp.json() as { results: Record<string, { value: number }> };
		const r = data.results;
		return {
			visitors: r.visitors?.value ?? 0,
			pageviews: r.pageviews?.value ?? 0,
			bounceRate: r.bounce_rate?.value ?? 0,
			visitDuration: r.visit_duration?.value ?? 0,
			visits: r.visits?.value ?? 0
		};
	} catch { return null; }
}

async function fetchPlausibleBreakdown(property: string, limit = 15, filters?: string): Promise<Array<Record<string, unknown>>> {
	const key = process.env.PLAUSIBLE_API_KEY;
	if (!key) return [];

	const params = new URLSearchParams({
		site_id: SITE_ID,
		period: '7d',
		property,
		limit: String(limit),
		metrics: 'visitors,pageviews'
	});
	if (filters) params.set('filters', filters);

	try {
		const resp = await fetch(`https://plausible.io/api/v1/stats/breakdown?${params}`, {
			headers: { Authorization: `Bearer ${key}` }
		});
		if (!resp.ok) return [];
		const data = await resp.json() as { results: Array<Record<string, unknown>> };
		return data.results ?? [];
	} catch { return []; }
}

async function collectPlausible(): Promise<Pick<ReportData, 'traffic' | 'topPages' | 'topSources' | 'aiReferrals'>> {
	const key = process.env.PLAUSIBLE_API_KEY;
	if (!key) {
		console.log('⏭  Plausible: skipped (no PLAUSIBLE_API_KEY)');
		return { traffic: null, topPages: [], topSources: [], aiReferrals: [] };
	}

	console.log('📊 Fetching Plausible data...');

	// Current and previous week
	const prevDate = new Date();
	prevDate.setDate(prevDate.getDate() - 7);
	const prevDateStr = prevDate.toISOString().slice(0, 10);

	const [current, previous] = await Promise.all([
		fetchPlausibleAggregate('7d'),
		fetchPlausibleAggregate('7d', prevDateStr)
	]);

	const traffic: TrafficData | null = current && previous ? { current, previous } : null;

	// Breakdowns
	const [pagesRaw, sourcesRaw, aiRaw] = await Promise.all([
		fetchPlausibleBreakdown('event:page'),
		fetchPlausibleBreakdown('visit:source', 10),
		fetchPlausibleBreakdown('event:props:source', 10, 'event:name==ai-referral')
	]);

	const topPages = pagesRaw.map(r => ({
		page: r.page as string,
		visitors: r.visitors as number,
		pageviews: r.pageviews as number
	}));
	const topSources = sourcesRaw.map(r => ({
		source: r.source as string,
		visitors: r.visitors as number
	}));
	const aiReferrals = aiRaw.map(r => ({
		source: (r.source ?? 'unknown') as string,
		visitors: r.visitors as number
	}));

	return { traffic, topPages, topSources, aiReferrals };
}

// ─── Google Search Console ──────────────────────────────────────────

async function getGscAccessToken(): Promise<string | null> {
	const saPath = process.env.GSC_SERVICE_ACCOUNT;
	if (!saPath || !fs.existsSync(saPath)) return null;

	const sa = JSON.parse(fs.readFileSync(saPath, 'utf-8'));
	const now = Math.floor(Date.now() / 1000);
	const jwtHeader = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
	const jwtClaim = Buffer.from(JSON.stringify({
		iss: sa.client_email,
		scope: 'https://www.googleapis.com/auth/webmasters.readonly',
		aud: 'https://oauth2.googleapis.com/token',
		iat: now,
		exp: now + 3600
	})).toString('base64url');

	const signature = crypto.sign('RSA-SHA256', Buffer.from(`${jwtHeader}.${jwtClaim}`), sa.private_key);
	const jwt = `${jwtHeader}.${jwtClaim}.${signature.toString('base64url')}`;

	const resp = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
	});

	if (!resp.ok) return null;
	const { access_token } = await resp.json() as { access_token: string };
	return access_token;
}

async function fetchGscQueries(token: string, startDate: string, endDate: string): Promise<GscQuery[]> {
	try {
		const resp = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ startDate, endDate, dimensions: ['query'], rowLimit: 25 })
		});
		if (!resp.ok) return [];
		const data = await resp.json() as { rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> };
		return (data.rows ?? []).map(r => ({
			query: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position
		}));
	} catch { return []; }
}

async function fetchGscPages(token: string, startDate: string, endDate: string): Promise<GscPage[]> {
	try {
		const resp = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`, {
			method: 'POST',
			headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
			body: JSON.stringify({ startDate, endDate, dimensions: ['page'], rowLimit: 20 })
		});
		if (!resp.ok) return [];
		const data = await resp.json() as { rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> };
		return (data.rows ?? []).map(r => ({
			page: r.keys[0].replace(SITE_URL, ''), clicks: r.clicks, impressions: r.impressions, ctr: r.ctr, position: r.position
		}));
	} catch { return []; }
}

async function fetchGscSitemaps(token: string): Promise<SitemapInfo[]> {
	try {
		const resp = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/sitemaps`, {
			headers: { Authorization: `Bearer ${token}` }
		});
		if (!resp.ok) return [];
		const data = await resp.json() as { sitemap?: Array<{ path: string; contents: Array<{ submitted: string; indexed: string }> }> };
		return (data.sitemap ?? []).map(sm => ({
			path: sm.path,
			submitted: sm.contents?.reduce((s, c) => s + Number(c.submitted || 0), 0) ?? 0,
			indexed: sm.contents?.reduce((s, c) => s + Number(c.indexed || 0), 0) ?? 0
		}));
	} catch { return []; }
}

async function collectGsc(): Promise<Pick<ReportData, 'gscQueries' | 'gscQueriesPrev' | 'gscPages' | 'sitemaps'>> {
	const token = await getGscAccessToken();
	if (!token) {
		console.log('⏭  GSC: skipped (no GSC_SERVICE_ACCOUNT)');
		return { gscQueries: [], gscQueriesPrev: [], gscPages: [], sitemaps: [] };
	}

	console.log('📊 Fetching GSC data...');

	// Current period: last 7 days (with 3-day lag)
	const end = new Date();
	end.setDate(end.getDate() - 3);
	const start = new Date(end);
	start.setDate(start.getDate() - 6);

	// Previous period: 7 days before that
	const prevEnd = new Date(start);
	prevEnd.setDate(prevEnd.getDate() - 1);
	const prevStart = new Date(prevEnd);
	prevStart.setDate(prevStart.getDate() - 6);

	const fmt = (d: Date) => d.toISOString().slice(0, 10);

	const [queries, queriesPrev, pages, sitemaps] = await Promise.all([
		fetchGscQueries(token, fmt(start), fmt(end)),
		fetchGscQueries(token, fmt(prevStart), fmt(prevEnd)),
		fetchGscPages(token, fmt(start), fmt(end)),
		fetchGscSitemaps(token)
	]);

	return { gscQueries: queries, gscQueriesPrev: queriesPrev, gscPages: pages, sitemaps };
}

// ─── Bing Webmaster Tools ───────────────────────────────────────────

async function collectBing(): Promise<Pick<ReportData, 'bingCrawl' | 'bingQueries'>> {
	const key = process.env.BING_WEBMASTER_KEY;
	if (!key) {
		console.log('⏭  Bing: skipped (no BING_WEBMASTER_KEY)');
		return { bingCrawl: [], bingQueries: [] };
	}

	console.log('📊 Fetching Bing data...');
	const base = 'https://ssl.bing.com/webmaster/api.svc/json';
	const site = encodeURIComponent(SITE_URL);

	let bingCrawl: BingCrawl[] = [];
	let bingQueries: Array<{ query: string; impressions: number; clicks: number; avgPos: number }> = [];

	try {
		const resp = await fetch(`${base}/GetCrawlStats?siteUrl=${site}&apikey=${key}`);
		if (resp.ok) {
			const data = await resp.json() as { d: Array<{ Date: string; CrawledPages: number; InIndex: number; CrawlErrors: number }> };
			bingCrawl = (data.d ?? []).slice(-7).map(r => ({
				date: r.Date.split('T')[0], crawled: r.CrawledPages, inIndex: r.InIndex, errors: r.CrawlErrors
			}));
		}
	} catch { /* skip */ }

	try {
		const resp = await fetch(`${base}/GetQueryStats?siteUrl=${site}&apikey=${key}`);
		if (resp.ok) {
			const data = await resp.json() as { d: Array<{ Query: string; Impressions: number; Clicks: number; AvgImpressionPosition: number }> };
			bingQueries = (data.d ?? []).slice(0, 10).map(r => ({
				query: r.Query, impressions: r.Impressions, clicks: r.Clicks, avgPos: r.AvgImpressionPosition
			}));
		}
	} catch { /* skip */ }

	return { bingCrawl, bingQueries };
}

// ─── Supabase (event freshness) ─────────────────────────────────────

async function collectFreshness(): Promise<ReportData['freshness']> {
	const url = process.env.PUBLIC_SUPABASE_URL;
	const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
	if (!url || !key) {
		console.log('⏭  Supabase: skipped (no credentials)');
		return { recentEvents: 0, templateDescriptions: 0, totalEvents: 0 };
	}

	console.log('📊 Checking event freshness...');
	const headers = { apikey: key, Authorization: `Bearer ${key}` };

	// Count events created in last 24h
	const since = new Date();
	since.setHours(since.getHours() - 24);

	let recentEvents = 0;
	let totalEvents = 0;
	let templateDescriptions = 0;

	try {
		const resp = await fetch(
			`${url}/rest/v1/events?select=id&status=eq.approved&created_at=gte.${since.toISOString()}&date_start=gte.${TODAY}`,
			{ headers, method: 'HEAD' }
		);
		recentEvents = Number(resp.headers.get('content-range')?.split('/')[1] ?? 0);
	} catch { /* skip */ }

	try {
		const resp = await fetch(
			`${url}/rest/v1/events?select=id&status=eq.approved&date_start=gte.${TODAY}`,
			{ headers, method: 'HEAD' }
		);
		totalEvents = Number(resp.headers.get('content-range')?.split('/')[1] ?? 0);
	} catch { /* skip */ }

	// Count events with template-style descriptions (pattern: "X på Y. Z-arrangement i Bergen.")
	try {
		const resp = await fetch(
			`${url}/rest/v1/events?select=description_no&status=eq.approved&date_start=gte.${TODAY}&description_no=like.*arrangement i Bergen.*`,
			{ headers, method: 'HEAD' }
		);
		templateDescriptions = Number(resp.headers.get('content-range')?.split('/')[1] ?? 0);
	} catch { /* skip */ }

	return { recentEvents, templateDescriptions, totalEvents };
}

// ─── Live technical checks ──────────────────────────────────────────

async function checkTechnicalHealth(): Promise<ReportData['technicalHealth']> {
	console.log('🔍 Running technical health checks...');

	const result = { sitemapUrls: 0, hreflangPairs: true, robotsOk: false, canonicalOk: true };

	// Check sitemap
	try {
		const resp = await fetch(`${SITE_URL}/sitemap.xml`);
		if (resp.ok) {
			const xml = await resp.text();
			const locs = xml.match(/<loc>/g);
			result.sitemapUrls = locs?.length ?? 0;

			// Check hreflang pairs: every /no/ URL should have a /en/ counterpart
			const noUrls = xml.match(/gaari\.no\/no\//g)?.length ?? 0;
			const enUrls = xml.match(/gaari\.no\/en\//g)?.length ?? 0;
			result.hreflangPairs = Math.abs(noUrls - enUrls) < 5; // Allow small margin
		}
	} catch { /* skip */ }

	// Check robots.txt
	try {
		const resp = await fetch(`${SITE_URL}/robots.txt`);
		if (resp.ok) {
			const text = await resp.text();
			result.robotsOk = text.includes('Sitemap:') && text.includes('Disallow: /admin');
		}
	} catch { /* skip */ }

	// Spot-check canonicals on a few pages
	const checkPages = ['/no', '/no/denne-helgen', '/en/this-weekend'];
	for (const p of checkPages) {
		try {
			const resp = await fetch(`${SITE_URL}${p}`);
			if (resp.ok) {
				const html = await resp.text();
				const canonical = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/);
				if (!canonical || !canonical[1].startsWith('https://gaari.no')) {
					result.canonicalOk = false;
				}
			}
		} catch { /* skip */ }
	}

	return result;
}

// ─── Alerts ─────────────────────────────────────────────────────────

function detectAlerts(data: ReportData): Alert[] {
	const alerts: Alert[] = [];

	// Traffic drop >20%
	if (data.traffic) {
		const { current, previous } = data.traffic;
		if (previous.visitors > 0) {
			const drop = ((current.visitors - previous.visitors) / previous.visitors) * 100;
			if (drop < -20) {
				alerts.push({ severity: 'critical', message: `Trafikk-drop: ${drop.toFixed(0)}% færre besøkende denne uken (${current.visitors} vs ${previous.visitors})` });
			}
		}
	}

	// No new events in 24h
	if (data.freshness.recentEvents === 0) {
		alerts.push({ severity: 'warning', message: 'Ingen nye events de siste 24 timene — scraper-pipeline kan ha feilet' });
	}

	// Index coverage drop
	for (const sm of data.sitemaps) {
		if (sm.submitted > 0) {
			const ratio = sm.indexed / sm.submitted;
			if (ratio < 0.8) {
				alerts.push({ severity: 'warning', message: `Indeksdekning: bare ${(ratio * 100).toFixed(0)}% av ${sm.submitted} sider indeksert` });
			}
		}
	}

	// Ranking drops (compare current vs previous GSC queries)
	for (const q of data.gscQueries.slice(0, 10)) {
		const prev = data.gscQueriesPrev.find(p => p.query === q.query);
		if (prev && prev.position <= 10 && q.position - prev.position > 2) {
			alerts.push({
				severity: 'warning',
				message: `Ranking-drop: "${q.query}" falt fra posisjon ${prev.position.toFixed(1)} til ${q.position.toFixed(1)}`
			});
		}
	}

	// Technical health issues
	if (!data.technicalHealth.robotsOk) {
		alerts.push({ severity: 'critical', message: 'robots.txt mangler Sitemap-direktiv eller Disallow /admin' });
	}
	if (!data.technicalHealth.hreflangPairs) {
		alerts.push({ severity: 'warning', message: 'Sitemap: misforhold mellom antall NO- og EN-URLer (hreflang-par)' });
	}
	if (!data.technicalHealth.canonicalOk) {
		alerts.push({ severity: 'warning', message: 'Canonical-tag mangler eller peker feil på en eller flere sider' });
	}

	return alerts;
}

// ─── Content Insights ───────────────────────────────────────────────

function generateInsights(data: ReportData): ContentInsight[] {
	const insights: ContentInsight[] = [];

	// Collection slugs for matching
	const collectionKeywords = [
		'denne helgen', 'this weekend', 'i kveld', 'tonight', 'gratis', 'free',
		'familiehelg', 'family', 'konserter', 'concerts', 'student',
		'i dag', 'today', 'regndagsguide', 'sentrum', 'voksen', 'ungdom'
	];

	// High impression, low CTR (opportunities)
	for (const q of data.gscQueries) {
		if (q.impressions >= 50 && q.ctr < 0.02) {
			insights.push({
				type: 'opportunity',
				label: q.query,
				detail: `${q.impressions} impressions, ${pct(q.ctr)} CTR — forbedre meta description eller lag dedikert innhold`
			});
		}
	}

	// Ranking drops
	for (const q of data.gscQueries) {
		const prev = data.gscQueriesPrev.find(p => p.query === q.query);
		if (prev && q.position - prev.position > 3 && prev.impressions >= 20) {
			insights.push({
				type: 'ranking-drop',
				label: q.query,
				detail: `Posisjon ${prev.position.toFixed(1)} → ${q.position.toFixed(1)} (drop ${(q.position - prev.position).toFixed(1)})`
			});
		}
	}

	// Content gaps — queries not matching any collection keyword
	for (const q of data.gscQueries.slice(0, 20)) {
		if (q.impressions >= 30) {
			const queryLower = q.query.toLowerCase();
			const matches = collectionKeywords.some(kw => queryLower.includes(kw));
			if (!matches && queryLower.includes('bergen')) {
				insights.push({
					type: 'content-gap',
					label: q.query,
					detail: `${q.impressions} impressions — potensielt innhold som mangler dedikert side/FAQ`
				});
			}
		}
	}

	// FAQ suggestions from query patterns
	const faqPatterns = [
		/hva skjer i bergen (.+)/i,
		/(.+) i bergen/i,
		/bergen (.+) (2026|2025)/i,
		/what.s on in bergen (.+)/i,
		/things to do in bergen (.+)/i
	];

	for (const q of data.gscQueries.slice(0, 25)) {
		for (const pattern of faqPatterns) {
			const match = q.query.match(pattern);
			if (match && q.impressions >= 20) {
				insights.push({
					type: 'faq-suggestion',
					label: q.query,
					detail: `${q.impressions} impressions — vurder FAQ: "${q.query}?"`
				});
				break;
			}
		}
	}

	// Deduplicate insights by label
	const seen = new Set<string>();
	return insights.filter(i => {
		if (seen.has(i.label)) return false;
		seen.add(i.label);
		return true;
	});
}

// ─── HTML Email Template ────────────────────────────────────────────

function renderHtml(data: ReportData): string {
	const hasAlerts = data.alerts.length > 0;

	const alertsHtml = hasAlerts ? `
		<div style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:16px;margin-bottom:24px">
			<h2 style="color:#dc2626;margin:0 0 12px">Varsler (${data.alerts.length})</h2>
			${data.alerts.map(a => `
				<div style="padding:6px 0;border-bottom:1px solid #fecaca">
					<span style="color:${a.severity === 'critical' ? '#dc2626' : '#d97706'};font-weight:bold">
						${a.severity === 'critical' ? 'KRITISK' : 'ADVARSEL'}
					</span>
					${a.message}
				</div>
			`).join('')}
		</div>
	` : '';

	// Traffic section
	const trafficHtml = data.traffic ? `
		<h2 style="border-bottom:2px solid #C82D2D;padding-bottom:6px">Trafikk (7 dager)</h2>
		<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
			<thead><tr style="background:#f5f5f5">
				<th style="text-align:left;padding:8px;border:1px solid #ddd">Metrikk</th>
				<th style="text-align:right;padding:8px;border:1px solid #ddd">Denne uken</th>
				<th style="text-align:right;padding:8px;border:1px solid #ddd">Forrige uke</th>
				<th style="text-align:right;padding:8px;border:1px solid #ddd">Endring</th>
			</tr></thead>
			<tbody>
				${[
					['Besøkende', data.traffic.current.visitors, data.traffic.previous.visitors, true],
					['Sidevisninger', data.traffic.current.pageviews, data.traffic.previous.pageviews, true],
					['Besøk', data.traffic.current.visits, data.traffic.previous.visits, true],
					['Fluktrate', data.traffic.current.bounceRate, data.traffic.previous.bounceRate, false],
					['Besøksvarighet', data.traffic.current.visitDuration, data.traffic.previous.visitDuration, true]
				].map(([label, cur, prev, hib]) => `
					<tr>
						<td style="padding:8px;border:1px solid #ddd">${label}</td>
						<td style="text-align:right;padding:8px;border:1px solid #ddd">${label === 'Fluktrate' ? `${cur}%` : label === 'Besøksvarighet' ? `${cur}s` : cur}</td>
						<td style="text-align:right;padding:8px;border:1px solid #ddd">${label === 'Fluktrate' ? `${prev}%` : label === 'Besøksvarighet' ? `${prev}s` : prev}</td>
						<td style="text-align:right;padding:8px;border:1px solid #ddd;color:${deltaColor(cur as number, prev as number, hib as boolean)}">${delta(cur as number, prev as number)}</td>
					</tr>
				`).join('')}
			</tbody>
		</table>
	` : '<p style="color:#666">Plausible: ingen data (mangler API-nøkkel)</p>';

	// Top pages
	const topPagesHtml = data.topPages.length > 0 ? `
		<h3>Topp sider (besøkende)</h3>
		<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
			<thead><tr style="background:#f5f5f5">
				<th style="text-align:left;padding:6px;border:1px solid #ddd">Side</th>
				<th style="text-align:right;padding:6px;border:1px solid #ddd">Besøkende</th>
				<th style="text-align:right;padding:6px;border:1px solid #ddd">Sidevisninger</th>
			</tr></thead>
			<tbody>
				${data.topPages.slice(0, 10).map(p => `
					<tr>
						<td style="padding:6px;border:1px solid #ddd;font-family:monospace;font-size:13px">${p.page}</td>
						<td style="text-align:right;padding:6px;border:1px solid #ddd">${p.visitors}</td>
						<td style="text-align:right;padding:6px;border:1px solid #ddd">${p.pageviews}</td>
					</tr>
				`).join('')}
			</tbody>
		</table>
	` : '';

	// Top sources
	const topSourcesHtml = data.topSources.length > 0 ? `
		<h3>Trafikkkilder</h3>
		<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
			<thead><tr style="background:#f5f5f5">
				<th style="text-align:left;padding:6px;border:1px solid #ddd">Kilde</th>
				<th style="text-align:right;padding:6px;border:1px solid #ddd">Besøkende</th>
			</tr></thead>
			<tbody>
				${data.topSources.map(s => `
					<tr>
						<td style="padding:6px;border:1px solid #ddd">${s.source}</td>
						<td style="text-align:right;padding:6px;border:1px solid #ddd">${s.visitors}</td>
					</tr>
				`).join('')}
			</tbody>
		</table>
	` : '';

	// AI referrals
	const aiHtml = data.aiReferrals.length > 0 ? `
		<h3>AI-søkereferanser</h3>
		<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
			<thead><tr style="background:#f5f5f5">
				<th style="text-align:left;padding:6px;border:1px solid #ddd">Kilde</th>
				<th style="text-align:right;padding:6px;border:1px solid #ddd">Besøkende</th>
			</tr></thead>
			<tbody>
				${data.aiReferrals.map(a => `
					<tr>
						<td style="padding:6px;border:1px solid #ddd">${a.source}</td>
						<td style="text-align:right;padding:6px;border:1px solid #ddd">${a.visitors}</td>
					</tr>
				`).join('')}
			</tbody>
		</table>
	` : '';

	// GSC queries
	const gscHtml = data.gscQueries.length > 0 ? `
		<h2 style="border-bottom:2px solid #C82D2D;padding-bottom:6px">Google-søk (7 dager)</h2>
		<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
			<thead><tr style="background:#f5f5f5">
				<th style="text-align:left;padding:6px;border:1px solid #ddd">Søkeord</th>
				<th style="text-align:right;padding:6px;border:1px solid #ddd">Klikk</th>
				<th style="text-align:right;padding:6px;border:1px solid #ddd">Visninger</th>
				<th style="text-align:right;padding:6px;border:1px solid #ddd">CTR</th>
				<th style="text-align:right;padding:6px;border:1px solid #ddd">Posisjon</th>
			</tr></thead>
			<tbody>
				${data.gscQueries.slice(0, 15).map(q => {
					const prev = data.gscQueriesPrev.find(p => p.query === q.query);
					const posChange = prev ? q.position - prev.position : 0;
					const posColor = posChange > 1 ? '#dc2626' : posChange < -1 ? '#16a34a' : '#666';
					return `
						<tr>
							<td style="padding:6px;border:1px solid #ddd">${q.query}</td>
							<td style="text-align:right;padding:6px;border:1px solid #ddd">${q.clicks}</td>
							<td style="text-align:right;padding:6px;border:1px solid #ddd">${q.impressions}</td>
							<td style="text-align:right;padding:6px;border:1px solid #ddd">${pct(q.ctr)}</td>
							<td style="text-align:right;padding:6px;border:1px solid #ddd;color:${posColor}">${q.position.toFixed(1)}${posChange !== 0 ? ` (${posChange > 0 ? '+' : ''}${posChange.toFixed(1)})` : ''}</td>
						</tr>
					`;
				}).join('')}
			</tbody>
		</table>

		${data.sitemaps.length > 0 ? `
			<h3>Indeksdekning</h3>
			${data.sitemaps.map(sm => `
				<p style="margin:4px 0"><strong>${sm.path}:</strong> ${sm.indexed} indeksert / ${sm.submitted} innsendt (${sm.submitted > 0 ? Math.round(sm.indexed / sm.submitted * 100) : 0}%)</p>
			`).join('')}
		` : ''}
	` : '<p style="color:#666">GSC: ingen data</p>';

	// Content insights
	const insightsHtml = data.insights.length > 0 ? `
		<h2 style="border-bottom:2px solid #C82D2D;padding-bottom:6px">Innholdsanalyse</h2>
		${['opportunity', 'ranking-drop', 'content-gap', 'faq-suggestion'].map(type => {
			const items = data.insights.filter(i => i.type === type);
			if (items.length === 0) return '';
			const titles: Record<string, string> = {
				'opportunity': 'Muligheter (høy synlighet, lav CTR)',
				'ranking-drop': 'Ranking-fall',
				'content-gap': 'Innholdsgap',
				'faq-suggestion': 'FAQ-forslag'
			};
			return `
				<h3>${titles[type]}</h3>
				<ul style="margin:0 0 16px;padding-left:20px">
					${items.slice(0, 5).map(i => `<li style="margin:4px 0"><strong>${i.label}</strong> — ${i.detail}</li>`).join('')}
				</ul>
			`;
		}).join('')}
	` : '';

	// Bing
	const bingHtml = data.bingCrawl.length > 0 || data.bingQueries.length > 0 ? `
		<h2 style="border-bottom:2px solid #C82D2D;padding-bottom:6px">Bing</h2>
		${data.bingCrawl.length > 0 ? `
			<h3>Crawl-statistikk (7 dager)</h3>
			<table style="width:100%;border-collapse:collapse;margin-bottom:16px">
				<thead><tr style="background:#f5f5f5">
					<th style="padding:6px;border:1px solid #ddd">Dato</th>
					<th style="text-align:right;padding:6px;border:1px solid #ddd">Crawlet</th>
					<th style="text-align:right;padding:6px;border:1px solid #ddd">Indeksert</th>
					<th style="text-align:right;padding:6px;border:1px solid #ddd">Feil</th>
				</tr></thead>
				<tbody>
					${data.bingCrawl.map(c => `
						<tr>
							<td style="padding:6px;border:1px solid #ddd">${c.date}</td>
							<td style="text-align:right;padding:6px;border:1px solid #ddd">${c.crawled}</td>
							<td style="text-align:right;padding:6px;border:1px solid #ddd">${c.inIndex}</td>
							<td style="text-align:right;padding:6px;border:1px solid #ddd;color:${c.errors > 0 ? '#dc2626' : '#666'}">${c.errors}</td>
						</tr>
					`).join('')}
				</tbody>
			</table>
		` : ''}
		${data.bingQueries.length > 0 ? `
			<h3>Topp Bing-søk</h3>
			<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
				<thead><tr style="background:#f5f5f5">
					<th style="text-align:left;padding:6px;border:1px solid #ddd">Søkeord</th>
					<th style="text-align:right;padding:6px;border:1px solid #ddd">Visninger</th>
					<th style="text-align:right;padding:6px;border:1px solid #ddd">Klikk</th>
				</tr></thead>
				<tbody>
					${data.bingQueries.map(q => `
						<tr>
							<td style="padding:6px;border:1px solid #ddd">${q.query}</td>
							<td style="text-align:right;padding:6px;border:1px solid #ddd">${q.impressions}</td>
							<td style="text-align:right;padding:6px;border:1px solid #ddd">${q.clicks}</td>
						</tr>
					`).join('')}
				</tbody>
			</table>
		` : ''}
	` : '';

	// Technical health
	const techHtml = `
		<h2 style="border-bottom:2px solid #C82D2D;padding-bottom:6px">Teknisk helse</h2>
		<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
			<tbody>
				<tr>
					<td style="padding:8px;border:1px solid #ddd">Sitemap URLer</td>
					<td style="padding:8px;border:1px solid #ddd;text-align:right">${data.technicalHealth.sitemapUrls}</td>
				</tr>
				<tr>
					<td style="padding:8px;border:1px solid #ddd">Hreflang-par</td>
					<td style="padding:8px;border:1px solid #ddd;text-align:right;color:${data.technicalHealth.hreflangPairs ? '#16a34a' : '#dc2626'}">${data.technicalHealth.hreflangPairs ? 'OK' : 'MISFORHOLD'}</td>
				</tr>
				<tr>
					<td style="padding:8px;border:1px solid #ddd">robots.txt</td>
					<td style="padding:8px;border:1px solid #ddd;text-align:right;color:${data.technicalHealth.robotsOk ? '#16a34a' : '#dc2626'}">${data.technicalHealth.robotsOk ? 'OK' : 'FEIL'}</td>
				</tr>
				<tr>
					<td style="padding:8px;border:1px solid #ddd">Canonical-tagger</td>
					<td style="padding:8px;border:1px solid #ddd;text-align:right;color:${data.technicalHealth.canonicalOk ? '#16a34a' : '#dc2626'}">${data.technicalHealth.canonicalOk ? 'OK' : 'FEIL'}</td>
				</tr>
			</tbody>
		</table>
	`;

	// Freshness
	const freshHtml = `
		<h2 style="border-bottom:2px solid #C82D2D;padding-bottom:6px">Innholdsferskhet</h2>
		<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
			<tbody>
				<tr>
					<td style="padding:8px;border:1px solid #ddd">Aktive events (fremover)</td>
					<td style="padding:8px;border:1px solid #ddd;text-align:right">${data.freshness.totalEvents}</td>
				</tr>
				<tr>
					<td style="padding:8px;border:1px solid #ddd">Nye events siste 24t</td>
					<td style="padding:8px;border:1px solid #ddd;text-align:right;color:${data.freshness.recentEvents > 0 ? '#16a34a' : '#dc2626'}">${data.freshness.recentEvents}</td>
				</tr>
				<tr>
					<td style="padding:8px;border:1px solid #ddd">Template-beskrivelser</td>
					<td style="padding:8px;border:1px solid #ddd;text-align:right;color:${data.freshness.templateDescriptions > 10 ? '#d97706' : '#16a34a'}">${data.freshness.templateDescriptions}${data.freshness.totalEvents > 0 ? ` (${Math.round(data.freshness.templateDescriptions / data.freshness.totalEvents * 100)}%)` : ''}</td>
				</tr>
			</tbody>
		</table>
	`;

	return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:700px;margin:0 auto;padding:20px;color:#141414;background:#fff">
	<div style="border-bottom:4px solid #C82D2D;padding-bottom:12px;margin-bottom:24px">
		<h1 style="margin:0;font-size:24px">Gåri SEO-rapport</h1>
		<p style="margin:4px 0 0;color:#666">${TODAY} — Ukentlig oversikt</p>
	</div>

	${alertsHtml}
	${trafficHtml}
	${topPagesHtml}
	${topSourcesHtml}
	${aiHtml}
	${gscHtml}
	${insightsHtml}
	${bingHtml}
	${techHtml}
	${freshHtml}

	<div style="border-top:1px solid #ddd;padding-top:12px;margin-top:24px;color:#999;font-size:13px">
		<p>Generert automatisk av Gåri SEO-rapport. <a href="https://gaari.no" style="color:#C82D2D">gaari.no</a></p>
	</div>
</body>
</html>`;
}

// ─── Email via Resend ───────────────────────────────────────────────

async function sendEmail(html: string, hasAlerts: boolean): Promise<boolean> {
	const key = process.env.RESEND_API_KEY;
	if (!key) {
		console.error('Cannot send email: no RESEND_API_KEY');
		return false;
	}

	const subject = hasAlerts
		? `[SEO VARSEL] Ukentlig rapport — ${TODAY}`
		: `[SEO] Ukentlig rapport — ${TODAY}`;

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

function writeSummary(data: ReportData, emailSent: boolean) {
	const summaryFile = process.env.SUMMARY_FILE;
	if (!summaryFile) return;

	const summary = {
		date: TODAY,
		visitors: data.traffic?.current.visitors ?? 0,
		visitorsChange: data.traffic ? delta(data.traffic.current.visitors, data.traffic.previous.visitors) : 'N/A',
		gscQueries: data.gscQueries.length,
		gscTopQuery: data.gscQueries[0]?.query ?? 'N/A',
		sitemapUrls: data.technicalHealth.sitemapUrls,
		alertCount: data.alerts.length,
		insightCount: data.insights.length,
		recentEvents: data.freshness.recentEvents,
		totalEvents: data.freshness.totalEvents,
		emailSent
	};

	fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
	console.log(`\n📊 Gåri SEO Weekly Report — ${TODAY}`);
	if (DRY_RUN) console.log('   (dry run — will write HTML to file, not send email)\n');

	// Collect data in parallel where possible
	const [plausibleData, gscData, bingData, freshness, technicalHealth] = await Promise.all([
		collectPlausible(),
		collectGsc(),
		collectBing(),
		collectFreshness(),
		checkTechnicalHealth()
	]);

	const reportData: ReportData = {
		date: TODAY,
		...plausibleData,
		...gscData,
		...bingData,
		alerts: [],
		insights: [],
		technicalHealth,
		freshness
	};

	// Detect alerts and generate insights
	reportData.alerts = detectAlerts(reportData);
	reportData.insights = generateInsights(reportData);

	console.log(`\n📋 Summary:`);
	console.log(`   Visitors: ${reportData.traffic?.current.visitors ?? 'N/A'}`);
	console.log(`   GSC queries: ${reportData.gscQueries.length}`);
	console.log(`   Alerts: ${reportData.alerts.length}`);
	console.log(`   Insights: ${reportData.insights.length}`);
	console.log(`   Sitemap URLs: ${reportData.technicalHealth.sitemapUrls}`);
	console.log(`   Active events: ${reportData.freshness.totalEvents}`);
	console.log(`   Recent events (24h): ${reportData.freshness.recentEvents}`);

	// Render HTML
	const html = renderHtml(reportData);

	if (DRY_RUN) {
		const outDir = path.join(import.meta.dirname, 'output');
		if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
		const outPath = path.join(outDir, `seo-report-${TODAY}.html`);
		fs.writeFileSync(outPath, html);
		console.log(`\n📄 Report written to: ${outPath}`);
		writeSummary(reportData, false);
	} else {
		const sent = await sendEmail(html, reportData.alerts.length > 0);
		writeSummary(reportData, sent);
	}

	// Print alerts to console too
	if (reportData.alerts.length > 0) {
		console.log('\n⚠️  Alerts:');
		for (const a of reportData.alerts) {
			console.log(`   ${a.severity === 'critical' ? '🔴' : '🟡'} ${a.message}`);
		}
	}

	console.log('\n✅ Report complete.\n');
}

main().catch(err => {
	console.error('Report failed:', err);
	process.exit(1);
});
