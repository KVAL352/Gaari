/**
 * SEO & Analytics Report Script
 *
 * Queries Umami Analytics, Google Search Console, and Bing Webmaster Tools
 * to give a snapshot of search performance. Skips services without API keys.
 *
 * Required env vars (set in scripts/.env or pass inline):
 *   UMAMI_API_KEY         — from cloud.umami.is → Profile → API Keys
 *   UMAMI_WEBSITE_ID      — from cloud.umami.is → Settings → Website ID
 *   BING_WEBMASTER_KEY    — from Bing Webmaster Tools → Settings → API access
 *   GSC_SERVICE_ACCOUNT   — path to Google service account JSON file
 *
 * Usage:
 *   cd scripts && npx tsx seo-report.ts
 *   cd scripts && npx tsx seo-report.ts --period 7d
 */

import 'dotenv/config';
import * as crypto from 'crypto';
import * as fs from 'fs';

const SITE_ID = 'gaari.no';
const SITE_URL = 'https://gaari.no';
const GSC_SITE = 'sc-domain:gaari.no'; // Domain property in GSC (not URL prefix)
const period = process.argv.includes('--period') ? process.argv[process.argv.indexOf('--period') + 1] : 'day';

// ─── Helpers ────────────────────────────────────────────────────────

function header(title: string) {
	console.log(`\n${'═'.repeat(60)}`);
	console.log(`  ${title}`);
	console.log('═'.repeat(60));
}

function table(rows: Record<string, string | number>[]) {
	if (rows.length === 0) { console.log('  (no data)'); return; }
	console.table(rows);
}

function pct(n: number): string { return `${(n * 100).toFixed(1)}%`; }

// ─── Umami Analytics ────────────────────────────────────────────────

async function umamiReport() {
	const key = process.env.UMAMI_API_KEY;
	const websiteId = process.env.UMAMI_WEBSITE_ID;
	if (!key || !websiteId) { console.log('\n⏭  Umami: skipped (no UMAMI_API_KEY or UMAMI_WEBSITE_ID)'); return; }

	header('UMAMI ANALYTICS');
	const base = `https://api.umami.is/v1/websites/${websiteId}`;
	const hdrs = { 'x-umami-api-key': key };

	// Period → millisecond range
	const periodDays = period === '30d' ? 30 : period === '7d' ? 7 : 1;
	const endAt = Date.now();
	const startAt = endAt - periodDays * 86400000;

	// Realtime visitors
	try {
		const rt = await fetch(`${base}/active`, { headers: hdrs });
		if (rt.ok) {
			const data = await rt.json() as { visitors: number };
			console.log(`  🟢 Realtime visitors: ${data.visitors}`);
		}
	} catch { /* skip */ }

	// Aggregate stats
	try {
		const agg = await fetch(`${base}/stats?startAt=${startAt}&endAt=${endAt}`, { headers: hdrs });
		if (agg.ok) {
			const raw = await agg.json() as Record<string, unknown>;
			const val = (key: string): number => { const v = raw[key]; return typeof v === 'number' ? v : (v as { value?: number })?.value ?? 0; };
			const visits = val('visits') || 1;
			console.log(`\n  Period: ${period}`);
			console.log(`  Visitors:       ${val('visitors') || '—'}`);
			console.log(`  Page views:     ${val('pageviews') || '—'}`);
			console.log(`  Visits:         ${visits}`);
			console.log(`  Bounce rate:    ${visits > 0 ? Math.round((val('bounces') / visits) * 100) : '—'}%`);
			console.log(`  Avg duration:   ${visits > 0 ? Math.round(val('totaltime') / visits) : '—'}s`);
		}
	} catch (e) { console.error('  Aggregate error:', e); }

	// Top pages
	try {
		const pages = await fetch(`${base}/metrics?startAt=${startAt}&endAt=${endAt}&type=url&limit=15`, { headers: hdrs });
		if (pages.ok) {
			const data = await pages.json() as Array<{ x: string; y: number }>;
			console.log('\n  Top pages:');
			table(data.map(r => ({ page: r.x, visitors: r.y })));
		}
	} catch { /* skip */ }

	// Top sources
	try {
		const sources = await fetch(`${base}/metrics?startAt=${startAt}&endAt=${endAt}&type=referrer&limit=10`, { headers: hdrs });
		if (sources.ok) {
			const data = await sources.json() as Array<{ x: string; y: number }>;
			console.log('  Top traffic sources:');
			table(data.map(r => ({ source: r.x, visitors: r.y })));
		}
	} catch { /* skip */ }

	// Top countries
	try {
		const countries = await fetch(`${base}/metrics?startAt=${startAt}&endAt=${endAt}&type=country&limit=5`, { headers: hdrs });
		if (countries.ok) {
			const data = await countries.json() as Array<{ x: string; y: number }>;
			console.log('  Top countries:');
			table(data.map(r => ({ country: r.x, visitors: r.y })));
		}
	} catch { /* skip */ }

	// AI referral custom event
	try {
		const ai = await fetch(`${base}/event-data/values?startAt=${startAt}&endAt=${endAt}&event=ai-referral&propertyName=source`, { headers: hdrs });
		if (ai.ok) {
			const data = await ai.json() as Array<{ value: string; total: number }>;
			if (data.length > 0) {
				console.log('  AI search referrals:');
				table(data.map(r => ({ source: r.value ?? 'unknown', visitors: r.total })));
			} else {
				console.log('  AI search referrals: none yet');
			}
		}
	} catch { /* skip */ }
}

// ─── Google Search Console ──────────────────────────────────────────

async function gscReport() {
	const saPath = process.env.GSC_SERVICE_ACCOUNT;
	if (!saPath || !fs.existsSync(saPath)) {
		console.log('\n⏭  Google Search Console: skipped (no GSC_SERVICE_ACCOUNT or file not found)');
		return;
	}

	header('GOOGLE SEARCH CONSOLE');

	// Load service account and create JWT
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

	// Exchange JWT for access token
	const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`
	});

	if (!tokenResp.ok) {
		console.error('  Failed to get GSC access token:', await tokenResp.text());
		return;
	}

	const { access_token } = await tokenResp.json() as { access_token: string };
	const gscHeaders = { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' };

	// Calculate date range
	const endDate = new Date();
	endDate.setDate(endDate.getDate() - 1); // Yesterday (GSC data has 2-3 day lag)
	const startDate = new Date(endDate);
	startDate.setDate(startDate.getDate() - 29);
	const fmt = (d: Date) => d.toISOString().slice(0, 10);

	// Search performance — top queries
	try {
		const resp = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`, {
			method: 'POST',
			headers: gscHeaders,
			body: JSON.stringify({
				startDate: fmt(startDate),
				endDate: fmt(endDate),
				dimensions: ['query'],
				rowLimit: 20
			})
		});

		if (resp.ok) {
			const data = await resp.json() as { rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> };
			if (data.rows && data.rows.length > 0) {
				console.log(`\n  Top search queries (${fmt(startDate)} → ${fmt(endDate)}):`);
				table(data.rows.map(r => ({
					query: r.keys[0],
					clicks: r.clicks,
					impressions: r.impressions,
					ctr: pct(r.ctr),
					position: r.position.toFixed(1)
				})));
			} else {
				console.log('  No search query data yet (site may not be indexed)');
			}
		} else {
			console.error('  GSC query error:', await resp.text());
		}
	} catch (e) { console.error('  GSC error:', e); }

	// Top pages by clicks
	try {
		const resp = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/searchAnalytics/query`, {
			method: 'POST',
			headers: gscHeaders,
			body: JSON.stringify({
				startDate: fmt(startDate),
				endDate: fmt(endDate),
				dimensions: ['page'],
				rowLimit: 15
			})
		});

		if (resp.ok) {
			const data = await resp.json() as { rows?: Array<{ keys: string[]; clicks: number; impressions: number; ctr: number; position: number }> };
			if (data.rows && data.rows.length > 0) {
				console.log('\n  Top pages in search:');
				table(data.rows.map(r => ({
					page: r.keys[0].replace(SITE_URL, ''),
					clicks: r.clicks,
					impressions: r.impressions,
					ctr: pct(r.ctr),
					avgPos: r.position.toFixed(1)
				})));
			}
		}
	} catch { /* skip */ }

	// Index coverage (Inspection API is per-URL, so just get sitemaps instead)
	try {
		const resp = await fetch(`https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(GSC_SITE)}/sitemaps`, {
			headers: gscHeaders
		});

		if (resp.ok) {
			const data = await resp.json() as { sitemap?: Array<{ path: string; lastSubmitted: string; isPending: boolean; lastDownloaded: string; contents: Array<{ type: string; submitted: string; indexed: string }> }> };
			if (data.sitemap && data.sitemap.length > 0) {
				console.log('\n  Sitemaps:');
				for (const sm of data.sitemap) {
					console.log(`  ${sm.path}`);
					console.log(`    Last submitted: ${sm.lastSubmitted}`);
					console.log(`    Last downloaded: ${sm.lastDownloaded ?? 'never'}`);
					for (const c of sm.contents ?? []) {
						console.log(`    ${c.type}: ${c.indexed ?? '?'} indexed / ${c.submitted} submitted`);
					}
				}
			}
		}
	} catch { /* skip */ }
}

// ─── Bing Webmaster Tools ───────────────────────────────────────────

async function bingReport() {
	const key = process.env.BING_WEBMASTER_KEY;
	if (!key) { console.log('\n⏭  Bing Webmaster Tools: skipped (no BING_WEBMASTER_KEY)'); return; }

	header('BING WEBMASTER TOOLS');
	const base = 'https://ssl.bing.com/webmaster/api.svc/json';
	const site = encodeURIComponent(SITE_URL);

	// Crawl stats
	try {
		const resp = await fetch(`${base}/GetCrawlStats?siteUrl=${site}&apikey=${key}`);
		if (resp.ok) {
			const data = await resp.json() as { d: Array<{ Date: string; CrawledPages: number; InIndex: number; CrawlErrors: number }> };
			if (data.d && data.d.length > 0) {
				const recent = data.d.slice(-7);
				console.log('\n  Crawl stats (last 7 days):');
				table(recent.map(r => ({
					date: r.Date.split('T')[0],
					crawled: r.CrawledPages,
					inIndex: r.InIndex,
					errors: r.CrawlErrors
				})));
			}
		} else {
			console.error('  Bing crawl stats error:', resp.status, await resp.text());
		}
	} catch (e) { console.error('  Bing error:', e); }

	// URL traffic
	try {
		const resp = await fetch(`${base}/GetQueryStats?siteUrl=${site}&apikey=${key}`);
		if (resp.ok) {
			const data = await resp.json() as { d: Array<{ Query: string; Impressions: number; Clicks: number; AvgImpressionPosition: number }> };
			if (data.d && data.d.length > 0) {
				console.log('\n  Top Bing search queries:');
				table(data.d.slice(0, 15).map(r => ({
					query: r.Query,
					impressions: r.Impressions,
					clicks: r.Clicks,
					avgPos: r.AvgImpressionPosition.toFixed(1)
				})));
			} else {
				console.log('  No Bing query data yet');
			}
		}
	} catch { /* skip */ }

	// Page traffic
	try {
		const resp = await fetch(`${base}/GetPageStats?siteUrl=${site}&apikey=${key}`);
		if (resp.ok) {
			const data = await resp.json() as { d: Array<{ Query: string; Impressions: number; Clicks: number }> };
			if (data.d && data.d.length > 0) {
				console.log('\n  Top Bing pages:');
				table(data.d.slice(0, 10).map(r => ({
					page: r.Query,
					impressions: r.Impressions,
					clicks: r.Clicks
				})));
			}
		}
	} catch { /* skip */ }
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
	console.log(`\n📊 SEO Report for ${SITE_ID} — ${new Date().toISOString().slice(0, 10)}`);
	console.log(`   Period: ${period}`);

	await umamiReport();
	await gscReport();
	await bingReport();

	console.log('\n' + '═'.repeat(60));
	console.log('  Report complete.');
	console.log('═'.repeat(60) + '\n');
}

main().catch(console.error);
