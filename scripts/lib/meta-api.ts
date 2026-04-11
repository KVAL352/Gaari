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
