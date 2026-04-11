/**
 * Meta Graph API helper — single entry point for FB Ads Marketing API,
 * Facebook Page insights, and Instagram media insights.
 *
 * Loads token + ad account ID from .env once. All callers use these helpers
 * instead of bare fetch() to get uniform error handling, rate-limit backoff,
 * and typed responses.
 *
 * Graph API version pinned to v22.0 — matches existing fetch-social-insights.ts.
 */
import dotenv from 'dotenv';
import { resolve } from 'path';

dotenv.config({ path: resolve(import.meta.dirname, '../../.env') });

export const META_TOKEN = process.env.META_ACCESS_TOKEN || '';
export const META_APP_ID = process.env.META_APP_ID || '';
export const META_APP_SECRET = process.env.META_APP_SECRET || '';
export const META_AD_ACCOUNT_ID = process.env.META_AD_ACCOUNT_ID || '';
export const FB_PAGE_ID = process.env.FB_PAGE_ID || '';
export const IG_USER_ID = process.env.IG_USER_ID || '';
export const GRAPH_API = 'https://graph.facebook.com/v22.0';

if (!META_TOKEN) {
	console.error('Missing META_ACCESS_TOKEN in .env');
	process.exit(1);
}

// ── Low-level HTTP ──

interface GraphError {
	message: string;
	type: string;
	code: number;
	error_subcode?: number;
	fbtrace_id?: string;
}

export class MetaApiError extends Error {
	constructor(public path: string, public err: GraphError) {
		super(`Graph API ${path}: ${err.message} (code ${err.code})`);
	}
}

function delay(ms: number): Promise<void> {
	return new Promise(r => setTimeout(r, ms));
}

/**
 * GET a Graph API path with the configured access token.
 * Retries once on transient rate limits (code 4, 17, 32, 613) after a short backoff.
 */
export async function graphGet<T = any>(path: string, attempt = 0): Promise<T> {
	const sep = path.includes('?') ? '&' : '?';
	const url = `${GRAPH_API}${path.startsWith('/') ? path : '/' + path}${sep}access_token=${encodeURIComponent(META_TOKEN)}`;
	const res = await fetch(url);
	const data = await res.json();

	if (data.error) {
		const transientCodes = [4, 17, 32, 613];
		if (attempt === 0 && transientCodes.includes(data.error.code)) {
			await delay(2000);
			return graphGet<T>(path, attempt + 1);
		}
		throw new MetaApiError(path, data.error);
	}

	return data as T;
}

/**
 * Walk paging.next links and collect all results into a single array.
 * Respects maxPages to avoid runaway pagination.
 */
export async function graphGetAll<T>(
	path: string,
	maxPages = 10,
): Promise<T[]> {
	const results: T[] = [];
	let current = path;
	let pages = 0;
	while (current && pages < maxPages) {
		const data = await graphGet<{ data: T[]; paging?: { next?: string } }>(current);
		if (Array.isArray(data.data)) results.push(...data.data);
		const next = data.paging?.next;
		if (!next) break;
		current = next.replace(GRAPH_API, '');
		pages++;
		if (pages < maxPages) await delay(300);
	}
	return results;
}

// ── Ad account ──

export interface AdAccount {
	id: string;
	account_id: string;
	name: string;
	account_status: number;
	currency: string;
	timezone_name: string;
	amount_spent: string;
	balance: string;
}

export async function listAdAccounts(): Promise<AdAccount[]> {
	const fields = 'id,account_id,name,account_status,currency,timezone_name,amount_spent,balance';
	return graphGetAll<AdAccount>(`/me/adaccounts?fields=${fields}`);
}

// ── Campaigns ──

export interface Campaign {
	id: string;
	name: string;
	status: 'ACTIVE' | 'PAUSED' | 'DELETED' | 'ARCHIVED';
	objective: string;
	created_time: string;
	daily_budget?: string;
	lifetime_budget?: string;
}

export async function listCampaigns(adAccountId?: string): Promise<Campaign[]> {
	const acc = adAccountId || META_AD_ACCOUNT_ID;
	if (!acc) throw new Error('META_AD_ACCOUNT_ID not set and no adAccountId passed');
	const fields = 'id,name,status,objective,created_time,daily_budget,lifetime_budget';
	return graphGetAll<Campaign>(`/${acc}/campaigns?fields=${fields}&limit=50`);
}

/**
 * Find a campaign by name (substring, case-insensitive) or by exact ID.
 * Returns null if no match.
 */
export async function findCampaign(nameOrId: string): Promise<Campaign | null> {
	if (/^\d+$/.test(nameOrId)) {
		try {
			return await graphGet<Campaign>(
				`/${nameOrId}?fields=id,name,status,objective,created_time,daily_budget,lifetime_budget`,
			);
		} catch (e) {
			return null;
		}
	}
	const campaigns = await listCampaigns();
	const needle = nameOrId.toLowerCase();
	return campaigns.find(c => c.name.toLowerCase().includes(needle)) || null;
}

/** Find the single ACTIVE campaign, if there is exactly one. Otherwise return null. */
export async function findActiveCampaign(): Promise<Campaign | null> {
	const campaigns = await listCampaigns();
	const active = campaigns.filter(c => c.status === 'ACTIVE');
	return active.length === 1 ? active[0] : null;
}

// ── Insights ──

export interface Action {
	action_type: string;
	value: string;
}

export interface Insight {
	impressions?: string;
	clicks?: string;
	ctr?: string;
	cpc?: string;
	cpm?: string;
	spend?: string;
	reach?: string;
	frequency?: string;
	inline_link_clicks?: string;
	inline_link_click_ctr?: string;
	actions?: Action[];
	ad_id?: string;
	ad_name?: string;
	date_start: string;
	date_stop: string;
}

const INSIGHT_FIELDS = [
	'impressions',
	'clicks',
	'ctr',
	'cpc',
	'cpm',
	'spend',
	'reach',
	'frequency',
	'inline_link_clicks',
	'inline_link_click_ctr',
	'actions',
].join(',');

/** Campaign-level insights summed across all ads in the campaign. */
export async function getCampaignInsights(campaignId: string): Promise<Insight | null> {
	const data = await graphGet<{ data: Insight[] }>(
		`/${campaignId}/insights?fields=${INSIGHT_FIELDS}&date_preset=maximum`,
	);
	return data.data[0] || null;
}

/** Daily breakdown of campaign insights (one row per day). */
export async function getCampaignDailyInsights(campaignId: string): Promise<Insight[]> {
	const data = await graphGet<{ data: Insight[] }>(
		`/${campaignId}/insights?fields=${INSIGHT_FIELDS}&date_preset=maximum&time_increment=1`,
	);
	return data.data || [];
}

/** Per-ad (per-carousel-card) insights. level=ad surfaces each ad separately. */
export async function getCampaignAdInsights(campaignId: string): Promise<Insight[]> {
	const fields = `${INSIGHT_FIELDS},ad_id,ad_name`;
	const data = await graphGet<{ data: Insight[] }>(
		`/${campaignId}/insights?fields=${fields}&date_preset=maximum&level=ad`,
	);
	return data.data || [];
}

// ── Action helpers ──

/** Extract a single action value by type. Returns 0 if not present. */
export function actionValue(actions: Action[] | undefined, type: string): number {
	if (!actions) return 0;
	const hit = actions.find(a => a.action_type === type);
	return hit ? Number(hit.value) : 0;
}

/** Flatten actions[] into a typed subset. */
export interface ParsedActions {
	linkClicks: number;
	landingPageViews: number;
	pageEngagement: number;
	postEngagement: number;
	reactions: number;
	all: Record<string, number>;
}

export function parseActions(actions: Action[] | undefined): ParsedActions {
	const all: Record<string, number> = {};
	for (const a of actions || []) all[a.action_type] = Number(a.value);
	return {
		linkClicks: all['link_click'] || 0,
		landingPageViews: all['landing_page_view'] || 0,
		pageEngagement: all['page_engagement'] || 0,
		postEngagement: all['post_engagement'] || 0,
		reactions: all['post_reaction'] || 0,
		all,
	};
}

// ── Campaign success targets ──

/**
 * Targets mirror the success criteria logged in fb-boost-campaigns.md.
 * Used by `meta.ts ads check` and the daily digest campaign section.
 */
export const CAMPAIGN_TARGETS = {
	ctrTotal: 1.0,      // % — Total CTR floor
	ctrLink: 0.5,       // % — Link CTR floor (rough industry average for traffic ads)
	cpcLink: 1.75,      // NOK — link-click CPC ceiling
	cpm: 30.0,          // NOK — CPM ceiling (informational — we've seen 60+ in practice)
	minClicks7d: 200,   // link-click target for a 7-day campaign
} as const;

export type CheckStatus = 'ok' | 'warning' | 'critical';

export interface CampaignCheck {
	metric: string;
	actual: number;
	target: number;
	status: CheckStatus;
	message: string;
}

export interface CampaignCheckResult {
	campaign: Campaign;
	overall: CheckStatus;
	checks: CampaignCheck[];
	summary: {
		impressions: number;
		linkClicks: number;
		landingPageViews: number;
		spendNok: number;
		ctrTotal: number;
		ctrLink: number;
		cpcLink: number;
		cpm: number;
	};
}

/** Parse an Insight into normalized numbers. */
function insightSummary(i: Insight) {
	const linkClicks = Number(i.inline_link_clicks || 0);
	const spendNok = Number(i.spend || 0);
	const parsed = parseActions(i.actions);
	return {
		impressions: Number(i.impressions || 0),
		linkClicks,
		landingPageViews: parsed.landingPageViews,
		spendNok,
		ctrTotal: Number(i.ctr || 0),
		ctrLink: Number(i.inline_link_click_ctr || 0),
		cpcLink: linkClicks > 0 ? spendNok / linkClicks : 0,
		cpm: Number(i.cpm || 0),
	};
}

function worst(a: CheckStatus, b: CheckStatus): CheckStatus {
	if (a === 'critical' || b === 'critical') return 'critical';
	if (a === 'warning' || b === 'warning') return 'warning';
	return 'ok';
}

/** Run all success-criteria checks against a campaign's aggregate insights. */
export async function checkCampaign(campaign: Campaign): Promise<CampaignCheckResult | null> {
	const insight = await getCampaignInsights(campaign.id);
	if (!insight) return null;
	const s = insightSummary(insight);
	const checks: CampaignCheck[] = [];

	const ctrStatus: CheckStatus =
		s.ctrTotal < CAMPAIGN_TARGETS.ctrTotal * 0.5 ? 'critical' :
		s.ctrTotal < CAMPAIGN_TARGETS.ctrTotal ? 'warning' : 'ok';
	checks.push({
		metric: 'CTR (alle)',
		actual: s.ctrTotal,
		target: CAMPAIGN_TARGETS.ctrTotal,
		status: ctrStatus,
		message: `${s.ctrTotal.toFixed(2)}% vs mål >${CAMPAIGN_TARGETS.ctrTotal}%`,
	});

	const cpcStatus: CheckStatus =
		s.cpcLink > CAMPAIGN_TARGETS.cpcLink * 1.5 ? 'critical' :
		s.cpcLink > CAMPAIGN_TARGETS.cpcLink ? 'warning' : 'ok';
	checks.push({
		metric: 'CPC (lenke)',
		actual: s.cpcLink,
		target: CAMPAIGN_TARGETS.cpcLink,
		status: s.linkClicks > 0 ? cpcStatus : 'warning',
		message: s.linkClicks > 0
			? `${s.cpcLink.toFixed(2)} kr vs mål <${CAMPAIGN_TARGETS.cpcLink} kr`
			: 'Ingen link clicks enda',
	});

	const cpmStatus: CheckStatus =
		s.cpm > CAMPAIGN_TARGETS.cpm * 2 ? 'warning' : 'ok';
	checks.push({
		metric: 'CPM',
		actual: s.cpm,
		target: CAMPAIGN_TARGETS.cpm,
		status: cpmStatus,
		message: `${s.cpm.toFixed(2)} kr vs mål <${CAMPAIGN_TARGETS.cpm} kr`,
	});

	const overall = checks.reduce<CheckStatus>((acc, c) => worst(acc, c.status), 'ok');
	return { campaign, overall, checks, summary: s };
}

// ── Campaign report generation (markdown) ──

/**
 * Generate a markdown report for a finished (or in-progress) campaign.
 * Intended for copy-pasting into fb-boost-campaigns.md as post-mortem.
 */
export async function generateCampaignReport(campaign: Campaign): Promise<string> {
	const check = await checkCampaign(campaign);
	const daily = await getCampaignDailyInsights(campaign.id);
	if (!check) return `# ${campaign.name}\n\nIngen insights-data tilgjengelig.\n`;

	const s = check.summary;
	const firstDay = daily[0]?.date_start;
	const lastDay = daily[daily.length - 1]?.date_stop;
	const days = daily.length;

	const verdictIcon = check.overall === 'ok' ? '✅' : check.overall === 'warning' ? '⚠️' : '❌';
	const verdictText =
		check.overall === 'ok' ? 'Innfridde suksess-kriterier'
		: check.overall === 'warning' ? 'Delvis innfridd — se avvik under'
		: 'Leverte under forventning';

	const tableRow = (c: CampaignCheck): string => {
		const icon = c.status === 'ok' ? '✅' : c.status === 'warning' ? '⚠️' : '❌';
		return `| ${c.metric} | ${c.message} | ${icon} |`;
	};

	const dailyRows = daily
		.map(d => {
			const lpv = actionValue(d.actions, 'landing_page_view');
			return `| ${d.date_start} | ${Number(d.impressions).toLocaleString('nb-NO')} | ${d.clicks} | ${lpv} | ${Number(d.spend).toFixed(2)} kr | ${Number(d.ctr).toFixed(2)}% |`;
		})
		.join('\n');

	return `# ${campaign.name}

**Kampanje-ID:** ${campaign.id}
**Periode:** ${firstDay} → ${lastDay} (${days} dag${days === 1 ? '' : 'er'})
**Objective:** ${campaign.objective}
**Status:** ${campaign.status}

## Sluttresultat ${verdictIcon}

${verdictText}

| Metrikk | Resultat | Status |
|---|---|---|
${check.checks.map(tableRow).join('\n')}
| Link clicks | ${s.linkClicks} | ${s.linkClicks >= CAMPAIGN_TARGETS.minClicks7d ? '✅' : '⚠️'} |
| Landing page views | ${s.landingPageViews} | — |
| Total spend | ${s.spendNok.toFixed(2)} kr | — |
| Impressions | ${s.impressions.toLocaleString('nb-NO')} | — |

## Dag-for-dag

| Dato | Imp | Clicks | LPV | Spend | CTR |
|---|---|---|---|---|---|
${dailyRows}

---

*Generert ${new Date().toISOString().slice(0, 10)} via \`npx tsx scripts/meta.ts ads report ${campaign.id}\`.*
`;
}

// ── Formatting helpers (CLI-friendly) ──

export function nok(value: string | number | undefined, decimals = 2): string {
	if (value === undefined || value === null || value === '') return '—';
	const n = Number(value);
	if (Number.isNaN(n)) return '—';
	return `${n.toFixed(decimals)} kr`;
}

export function pct(value: string | number | undefined, decimals = 2): string {
	if (value === undefined || value === null || value === '') return '—';
	const n = Number(value);
	if (Number.isNaN(n)) return '—';
	return `${n.toFixed(decimals)}%`;
}

export function int(value: string | number | undefined): string {
	if (value === undefined || value === null || value === '') return '—';
	const n = Number(value);
	if (Number.isNaN(n)) return '—';
	return n.toLocaleString('nb-NO');
}

// ── Live page/profile insights (Graph API) ──

export interface FbPageSnapshot {
	pageId: string;
	name?: string;
	followers: number;
	fanCount?: number;
	postsLast28d?: number;
}

/** Fetch current FB page basics (followers, fan count). */
export async function getFbPageSnapshot(): Promise<FbPageSnapshot | null> {
	if (!FB_PAGE_ID) return null;
	try {
		const data = await graphGet<any>(
			`/${FB_PAGE_ID}?fields=name,followers_count,fan_count`,
		);
		return {
			pageId: FB_PAGE_ID,
			name: data.name,
			followers: data.followers_count ?? data.fan_count ?? 0,
			fanCount: data.fan_count,
		};
	} catch {
		return null;
	}
}

export interface IgProfileSnapshot {
	userId: string;
	username?: string;
	followers: number;
	follows?: number;
	mediaCount?: number;
}

/** Fetch current IG profile basics. */
export async function getIgProfileSnapshot(): Promise<IgProfileSnapshot | null> {
	if (!IG_USER_ID) return null;
	try {
		const data = await graphGet<any>(
			`/${IG_USER_ID}?fields=username,followers_count,follows_count,media_count`,
		);
		return {
			userId: IG_USER_ID,
			username: data.username,
			followers: data.followers_count ?? 0,
			follows: data.follows_count,
			mediaCount: data.media_count,
		};
	} catch {
		return null;
	}
}

// ── Page-level insights (daily aggregates for trending) ──

export interface PageInsightRow {
	metric: string;
	value: number;
	period: string;
	endTime: string;
}

/**
 * Fetch FB page-level insights. NOTE: Most legacy page_* metrics are
 * deprecated in v22, and small pages (<~30 followers) don't surface insights
 * at all. We attempt a best-effort fetch but expect many failures — calling
 * code must treat an empty array as "unavailable", not "no activity".
 *
 * Pass an empty metric array to skip entirely.
 */
export async function getFbPageInsights(
	metrics: string[],
	days = 7,
): Promise<PageInsightRow[]> {
	if (!FB_PAGE_ID || metrics.length === 0) return [];
	const since = Math.floor((Date.now() - days * 86400000) / 1000);
	const until = Math.floor(Date.now() / 1000);
	try {
		const data = await graphGet<any>(
			`/${FB_PAGE_ID}/insights?metric=${metrics.join(',')}&since=${since}&until=${until}&period=day`,
		);
		const rows: PageInsightRow[] = [];
		for (const item of data.data || []) {
			for (const v of item.values || []) {
				rows.push({
					metric: item.name,
					value: Number(v.value ?? 0),
					period: item.period,
					endTime: v.end_time,
				});
			}
		}
		return rows;
	} catch {
		return [];
	}
}

/**
 * Fetch IG user-level insights. v22 breaking change: most metrics require
 * `metric_type=total_value`, but `reach` and `follower_count` do NOT. We
 * split the call into two groups automatically.
 *
 * Valid default metrics: reach, follower_count
 * Valid total_value metrics: views, profile_views, website_clicks,
 *   accounts_engaged, total_interactions, likes, comments, shares, saves,
 *   replies, profile_links_taps
 */
const IG_DEFAULT_METRICS = new Set(['reach', 'follower_count']);

export async function getIgUserInsights(
	metrics: string[],
	days = 7,
): Promise<PageInsightRow[]> {
	if (!IG_USER_ID || metrics.length === 0) return [];
	const since = Math.floor((Date.now() - days * 86400000) / 1000);
	const until = Math.floor(Date.now() / 1000);
	const defaultSet = metrics.filter(m => IG_DEFAULT_METRICS.has(m));
	const totalSet = metrics.filter(m => !IG_DEFAULT_METRICS.has(m));
	const rows: PageInsightRow[] = [];

	if (defaultSet.length > 0) {
		try {
			const data = await graphGet<any>(
				`/${IG_USER_ID}/insights?metric=${defaultSet.join(',')}&since=${since}&until=${until}&period=day`,
			);
			for (const item of data.data || []) {
				for (const v of item.values || []) {
					rows.push({
						metric: item.name,
						value: Number(v.value ?? 0),
						period: item.period,
						endTime: v.end_time,
					});
				}
			}
		} catch {
			/* degrade silently */
		}
	}

	if (totalSet.length > 0) {
		try {
			const data = await graphGet<any>(
				`/${IG_USER_ID}/insights?metric=${totalSet.join(',')}&metric_type=total_value&since=${since}&until=${until}&period=day`,
			);
			for (const item of data.data || []) {
				// total_value responses have a different shape — single total_value field
				const tv = item.total_value?.value;
				if (tv != null) {
					rows.push({
						metric: item.name,
						value: Number(tv),
						period: item.period || 'day',
						endTime: new Date().toISOString(),
					});
					continue;
				}
				for (const v of item.values || []) {
					rows.push({
						metric: item.name,
						value: Number(v.value ?? 0),
						period: item.period,
						endTime: v.end_time,
					});
				}
			}
		} catch {
			/* degrade silently */
		}
	}

	return rows;
}

// ── DB query helpers (for historical analysis) ──

export interface SocialInsightRow {
	platform: 'ig' | 'fb';
	platform_id: string;
	posted_at: string;
	caption: string | null;
	permalink: string | null;
	metrics: Record<string, number>;
}

/** Query social_insights for a platform within the last N days. */
export async function getRecentPosts(
	platform: 'ig' | 'fb',
	days = 14,
): Promise<SocialInsightRow[]> {
	const { supabase } = await import('./supabase.js');
	const since = new Date(Date.now() - days * 86400000).toISOString();
	const { data, error } = await supabase
		.from('social_insights')
		.select('platform,platform_id,posted_at,caption,permalink,metrics')
		.eq('platform', platform)
		.gte('posted_at', since)
		.order('posted_at', { ascending: false });
	if (error) throw new Error(`social_insights query failed: ${error.message}`);
	return (data || []) as SocialInsightRow[];
}

/** Rank a batch of social_insights rows by a computed engagement score. */
export function rankByEngagement(rows: SocialInsightRow[]): SocialInsightRow[] {
	const score = (r: SocialInsightRow): number => {
		const m = r.metrics || {};
		if (r.platform === 'ig') {
			return (m.likes || 0) + (m.comments || 0) * 3 + (m.shares || 0) * 5 + (m.saved || 0) * 4;
		}
		return (m.reactions || 0) + (m.comments || 0) * 3 + (m.shares || 0) * 5;
	};
	return [...rows].sort((a, b) => score(b) - score(a));
}

export interface FollowerHistoryRow {
	date: string;
	ig_followers: number | null;
	fb_followers: number | null;
	subscribers: number | null;
}

/** Get follower + subscriber counts from daily_metrics for the last N days. */
export async function getFollowerHistory(days = 30): Promise<FollowerHistoryRow[]> {
	const { supabase } = await import('./supabase.js');
	const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
	const { data, error } = await supabase
		.from('daily_metrics')
		.select('date,ig_followers,fb_followers,subscribers')
		.gte('date', since)
		.order('date', { ascending: true });
	if (error) throw new Error(`daily_metrics query failed: ${error.message}`);
	return (data || []) as FollowerHistoryRow[];
}

export interface CampaignHistoryRow {
	campaign_id: string;
	short_name: string | null;
	first_date: string;
	last_date: string;
	days: number;
	total_spend_nok: number;
	total_link_clicks: number;
	total_landing_page_views: number;
	avg_ctr_total: number;
	avg_cpc_link: number;
}

/** Summarize all campaigns from ad_insights into one row each. */
export async function getCampaignHistory(): Promise<CampaignHistoryRow[]> {
	const { supabase } = await import('./supabase.js');
	const { data, error } = await supabase
		.from('ad_insights')
		.select('campaign_id,short_name,date,spend_nok,link_clicks,landing_page_views,ctr_total,cpc_link')
		.order('date', { ascending: true });
	if (error) throw new Error(`ad_insights query failed: ${error.message}`);
	if (!data || data.length === 0) return [];

	const grouped = new Map<string, typeof data>();
	for (const row of data) {
		const list = grouped.get(row.campaign_id) || [];
		list.push(row);
		grouped.set(row.campaign_id, list);
	}

	const rows: CampaignHistoryRow[] = [];
	for (const [id, list] of grouped) {
		list.sort((a, b) => a.date.localeCompare(b.date));
		const totalSpend = list.reduce((s, r) => s + Number(r.spend_nok || 0), 0);
		const totalClicks = list.reduce((s, r) => s + (r.link_clicks || 0), 0);
		const totalLpv = list.reduce((s, r) => s + (r.landing_page_views || 0), 0);
		const avgCtr = list.reduce((s, r) => s + Number(r.ctr_total || 0), 0) / list.length;
		rows.push({
			campaign_id: id,
			short_name: list[0].short_name,
			first_date: list[0].date,
			last_date: list[list.length - 1].date,
			days: list.length,
			total_spend_nok: Number(totalSpend.toFixed(2)),
			total_link_clicks: totalClicks,
			total_landing_page_views: totalLpv,
			avg_ctr_total: Number(avgCtr.toFixed(2)),
			avg_cpc_link: totalClicks > 0 ? Number((totalSpend / totalClicks).toFixed(2)) : 0,
		});
	}
	return rows.sort((a, b) => b.last_date.localeCompare(a.last_date));
}

/** Analyze which weekday produces the best engagement on average. */
export async function getBestDaysAnalysis(days = 60): Promise<
	{ day: string; dayIndex: number; postCount: number; avgEngagement: number }[]
> {
	const fb = await getRecentPosts('fb', days);
	const ig = await getRecentPosts('ig', days);
	const all = [...fb, ...ig];
	const dayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
	const buckets: Record<number, { count: number; total: number }> = {};
	for (let i = 0; i < 7; i++) buckets[i] = { count: 0, total: 0 };
	for (const r of all) {
		const day = new Date(r.posted_at).getDay();
		const m = r.metrics || {};
		const engagement = r.platform === 'ig'
			? (m.likes || 0) + (m.comments || 0) + (m.saved || 0) + (m.shares || 0)
			: (m.reactions || 0) + (m.comments || 0) + (m.shares || 0);
		buckets[day].count++;
		buckets[day].total += engagement;
	}
	return Object.entries(buckets).map(([idx, b]) => ({
		dayIndex: Number(idx),
		day: dayNames[Number(idx)],
		postCount: b.count,
		avgEngagement: b.count > 0 ? Number((b.total / b.count).toFixed(1)) : 0,
	}));
}

// ── Historical snapshot (Supabase) ──

/**
 * Extract the short campaign name (e.g. "boost-2026-04-08") from the auto-generated
 * FB name "[DD/MM/YYYY] Promoting https://...utm_campaign=...".
 */
export function extractShortCampaignName(name: string): string {
	const utmMatch = name.match(/utm_campaign=([^&\s]+)/);
	if (utmMatch) return utmMatch[1];
	const promotingMatch = name.match(/^\[[\d/]+\]\s+Promoting\s+(.+)/i);
	if (promotingMatch) return promotingMatch[1].slice(0, 60);
	return name.length > 60 ? name.slice(0, 59) + '…' : name;
}

/**
 * Upsert daily insight rows into the `ad_insights` Supabase table.
 * One row per (campaign_id, date). Repeat calls update the latest numbers
 * for each day — Meta can still emit new actions for "yesterday" hours after
 * UTC midnight, so re-fetching is expected.
 *
 * Returns the number of rows upserted. Errors are thrown so callers can decide
 * whether to treat them as fatal.
 */
export async function saveDailyInsights(
	campaign: Campaign,
	daily: Insight[],
): Promise<number> {
	if (daily.length === 0) return 0;
	// Lazy import so the helper doesn't force a supabase client on all consumers
	const { supabase } = await import('./supabase.js');
	const shortName = extractShortCampaignName(campaign.name);
	const rows = daily.map(i => {
		const parsed = parseActions(i.actions);
		const linkClicks = Number(i.inline_link_clicks || 0);
		const spendNok = Number(i.spend || 0);
		return {
			platform: 'meta',
			campaign_id: campaign.id,
			campaign_name: campaign.name,
			short_name: shortName,
			date: i.date_start,
			impressions: Number(i.impressions || 0),
			reach: Number(i.reach || 0),
			clicks: Number(i.clicks || 0),
			link_clicks: linkClicks,
			landing_page_views: parsed.landingPageViews,
			spend_nok: spendNok,
			ctr_total: Number(i.ctr || 0),
			ctr_link: Number(i.inline_link_click_ctr || 0),
			cpc_all: Number(i.cpc || 0),
			cpc_link: linkClicks > 0 ? Number((spendNok / linkClicks).toFixed(2)) : 0,
			cpm: Number(i.cpm || 0),
			frequency: Number(i.frequency || 0),
			raw: i,
			fetched_at: new Date().toISOString(),
		};
	});

	const { error } = await supabase
		.from('ad_insights')
		.upsert(rows, { onConflict: 'platform,campaign_id,date' });

	if (error) throw new Error(`ad_insights upsert failed: ${error.message}`);
	return rows.length;
}

// ── Daily Meta snapshot (for meta_daily_snapshot table) ──

export interface MetaDailySnapshot {
	date: string;
	fb_followers: number | null;
	fb_fan_count: number | null;
	ig_followers: number | null;
	ig_follows: number | null;
	ig_media_count: number | null;
	ig_reach: number | null;
	ig_views: number | null;
	ig_profile_views: number | null;
	ig_website_clicks: number | null;
	ig_accounts_engaged: number | null;
	ig_total_interactions: number | null;
	raw: Record<string, unknown>;
}

/**
 * Fetch today's follower counts + IG daily insights and upsert to
 * `meta_daily_snapshot`. Called by the daily meta-snapshot GHA workflow
 * (runs every day, including weekends).
 *
 * Also mirrors follower counts into `daily_metrics.ig_followers` /
 * `fb_followers` to keep the digest's week-over-week comparison working.
 */
export async function fetchAndSaveDailySnapshot(): Promise<MetaDailySnapshot> {
	const today = new Date().toISOString().slice(0, 10);

	const [fb, ig, igInsights] = await Promise.all([
		getFbPageSnapshot(),
		getIgProfileSnapshot(),
		getIgUserInsights(
			['reach', 'views', 'profile_views', 'website_clicks', 'accounts_engaged', 'total_interactions'],
			1, // just today
		),
	]);

	// Sum IG insight values across any returned rows (daily + total_value both
	// end up as single numbers for a 1-day window)
	const igSum = (metric: string): number | null => {
		const rows = igInsights.filter(r => r.metric === metric);
		if (rows.length === 0) return null;
		return rows.reduce((s, r) => s + r.value, 0);
	};

	const snapshot: MetaDailySnapshot = {
		date: today,
		fb_followers: fb?.followers ?? null,
		fb_fan_count: fb?.fanCount ?? null,
		ig_followers: ig?.followers ?? null,
		ig_follows: ig?.follows ?? null,
		ig_media_count: ig?.mediaCount ?? null,
		ig_reach: igSum('reach'),
		ig_views: igSum('views'),
		ig_profile_views: igSum('profile_views'),
		ig_website_clicks: igSum('website_clicks'),
		ig_accounts_engaged: igSum('accounts_engaged'),
		ig_total_interactions: igSum('total_interactions'),
		raw: { fb, ig, igInsights },
	};

	const { supabase } = await import('./supabase.js');

	// Upsert into meta_daily_snapshot (primary record)
	const { error: snapErr } = await supabase
		.from('meta_daily_snapshot')
		.upsert(
			{
				...snapshot,
				fetched_at: new Date().toISOString(),
			},
			{ onConflict: 'date' },
		);
	if (snapErr) throw new Error(`meta_daily_snapshot upsert failed: ${snapErr.message}`);

	// Mirror followers to daily_metrics for backwards compatibility with digest.
	// Uses onConflict: date to not overwrite subscriber/visitor columns.
	if (snapshot.fb_followers != null || snapshot.ig_followers != null) {
		const { error: dmErr } = await supabase
			.from('daily_metrics')
			.upsert(
				{
					date: today,
					ig_followers: snapshot.ig_followers,
					fb_followers: snapshot.fb_followers,
				},
				{ onConflict: 'date', ignoreDuplicates: false },
			);
		if (dmErr) {
			// Non-fatal — the main snapshot succeeded
			console.warn(`daily_metrics mirror failed (non-fatal): ${dmErr.message}`);
		}
	}

	return snapshot;
}

/** Read recent snapshots from meta_daily_snapshot for trending. */
export async function getMetaDailyHistory(days = 30): Promise<MetaDailySnapshot[]> {
	const { supabase } = await import('./supabase.js');
	const since = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
	const { data, error } = await supabase
		.from('meta_daily_snapshot')
		.select('*')
		.gte('date', since)
		.order('date', { ascending: true });
	if (error) throw new Error(`meta_daily_snapshot query failed: ${error.message}`);
	return (data || []) as MetaDailySnapshot[];
}

// ── Token self-check ──

export interface TokenInfo {
	app_id: string;
	application: string;
	scopes: string[];
	expires_at: number;
	is_valid: boolean;
	user_id: string;
}

/** Debug the current token using an app-level access token. */
export async function debugToken(): Promise<TokenInfo | null> {
	if (!META_APP_ID || !META_APP_SECRET) return null;
	const appToken = `${META_APP_ID}|${META_APP_SECRET}`;
	const url = `${GRAPH_API}/debug_token?input_token=${encodeURIComponent(META_TOKEN)}&access_token=${encodeURIComponent(appToken)}`;
	const res = await fetch(url);
	const data = await res.json();
	return data.data || null;
}

/** Exchange the current short-lived token for a long-lived (~60 day) one. */
export async function extendToken(): Promise<string | null> {
	if (!META_APP_ID || !META_APP_SECRET) {
		throw new Error('META_APP_ID and META_APP_SECRET required to extend token');
	}
	const url =
		`${GRAPH_API}/oauth/access_token?grant_type=fb_exchange_token` +
		`&client_id=${META_APP_ID}` +
		`&client_secret=${encodeURIComponent(META_APP_SECRET)}` +
		`&fb_exchange_token=${encodeURIComponent(META_TOKEN)}`;
	const res = await fetch(url);
	const data = await res.json();
	if (data.error) throw new MetaApiError('/oauth/access_token', data.error);
	return data.access_token || null;
}
