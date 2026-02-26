/**
 * SEO & Analytics Report Script
 *
 * Queries Plausible, Google Search Console, and Bing Webmaster Tools
 * to give a snapshot of search performance. Skips services without API keys.
 *
 * Required env vars (set in scripts/.env or pass inline):
 *   PLAUSIBLE_API_KEY     — from plausible.io → Settings → API Keys
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
const period = process.argv.includes('--period') ? process.argv[process.argv.indexOf('--period') + 1] : '30d';

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

// ─── Plausible ──────────────────────────────────────────────────────

async function plausibleReport() {
	const key = process.env.PLAUSIBLE_API_KEY;
	if (!key) { console.log('\n⏭  Plausible: skipped (no PLAUSIBLE_API_KEY)'); return; }

	header('PLAUSIBLE ANALYTICS');
	const base = 'https://plausible.io/api/v1/stats';
	const headers = { Authorization: `Bearer ${key}` };

	// Realtime visitors
	try {
		const rt = await fetch(`${base}/realtime/visitors?site_id=${SITE_ID}`, { headers });
		if (rt.ok) console.log(`  🟢 Realtime visitors: ${await rt.text()}`);
	} catch { /* skip */ }

	// Aggregate stats
	try {
		const agg = await fetch(
			`${base}/aggregate?site_id=${SITE_ID}&period=${period}&metrics=visitors,pageviews,bounce_rate,visit_duration,visits`,
			{ headers }
		);
		if (agg.ok) {
			const data = await agg.json() as { results: Record<string, { value: number }> };
			const r = data.results;
			console.log(`\n  Period: ${period}`);
			console.log(`  Visitors:       ${r.visitors?.value ?? '—'}`);
			console.log(`  Page views:     ${r.pageviews?.value ?? '—'}`);
			console.log(`  Visits:         ${r.visits?.value ?? '—'}`);
			console.log(`  Bounce rate:    ${r.bounce_rate?.value ?? '—'}%`);
			console.log(`  Avg duration:   ${r.visit_duration?.value ?? '—'}s`);
		}
	} catch (e) { console.error('  Aggregate error:', e); }

	// Top pages
	try {
		const pages = await fetch(
			`${base}/breakdown?site_id=${SITE_ID}&period=${period}&property=event:page&limit=15&metrics=visitors,pageviews`,
			{ headers }
		);
		if (pages.ok) {
			const data = await pages.json() as { results: Array<{ page: string; visitors: number; pageviews: number }> };
			console.log('\n  Top pages:');
			table(data.results.map(r => ({ page: r.page, visitors: r.visitors, pageviews: r.pageviews })));
		}
	} catch { /* skip */ }

	// Top sources
	try {
		const sources = await fetch(
			`${base}/breakdown?site_id=${SITE_ID}&period=${period}&property=visit:source&limit=10&metrics=visitors`,
			{ headers }
		);
		if (sources.ok) {
			const data = await sources.json() as { results: Array<{ source: string; visitors: number }> };
			console.log('  Top traffic sources:');
			table(data.results.map(r => ({ source: r.source, visitors: r.visitors })));
		}
	} catch { /* skip */ }

	// Top countries
	try {
		const countries = await fetch(
			`${base}/breakdown?site_id=${SITE_ID}&period=${period}&property=visit:country&limit=5&metrics=visitors`,
			{ headers }
		);
		if (countries.ok) {
			const data = await countries.json() as { results: Array<{ country: string; visitors: number }> };
			console.log('  Top countries:');
			table(data.results.map(r => ({ country: r.country, visitors: r.visitors })));
		}
	} catch { /* skip */ }

	// AI referral custom event
	try {
		const ai = await fetch(
			`${base}/breakdown?site_id=${SITE_ID}&period=${period}&property=event:props:source&filters=event:name==ai-referral&metrics=visitors`,
			{ headers }
		);
		if (ai.ok) {
			const data = await ai.json() as { results: Array<{ source?: string; visitors: number }> };
			if (data.results.length > 0) {
				console.log('  AI search referrals:');
				table(data.results.map(r => ({ source: r.source ?? 'unknown', visitors: r.visitors })));
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

	await plausibleReport();
	await gscReport();
	await bingReport();

	console.log('\n' + '═'.repeat(60));
	console.log('  Report complete.');
	console.log('═'.repeat(60) + '\n');
}

main().catch(console.error);
