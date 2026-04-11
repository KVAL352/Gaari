/**
 * Meta CLI — unified entrypoint for FB Ads, FB Page, and IG data.
 *
 * Usage:
 *   npx tsx scripts/meta.ts <subcommand> [args] [--json]
 *
 * Subcommands:
 *   token                           Show current token scopes + expiry
 *   accounts                        List ad accounts accessible to token
 *
 *   ads campaigns                   List all campaigns on the configured ad account
 *   ads insights [name|id]          Campaign-level insights (defaults to single active)
 *   ads daily [name|id]             Day-by-day breakdown for a campaign
 *   ads slides [name|id]            Per-ad (per-carousel-card) breakdown
 *   ads status                      Dashboard: active campaigns + key metrics
 *
 * Flags:
 *   --json                          Output raw JSON instead of formatted text
 *   --campaign=<name|id>            Explicit campaign selector (alt to positional)
 *
 * Examples:
 *   npx tsx scripts/meta.ts ads status
 *   npx tsx scripts/meta.ts ads insights boost-2026-04-08
 *   npx tsx scripts/meta.ts ads daily boost-2026-04-08
 *   npx tsx scripts/meta.ts ads slides boost
 *   npx tsx scripts/meta.ts token
 */
import { execSync, spawnSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import {
	actionValue,
	checkCampaign,
	debugToken,
	extendToken,
	findActiveCampaign,
	findCampaign,
	generateCampaignReport,
	getBestDaysAnalysis,
	getCampaignAdInsights,
	getCampaignDailyInsights,
	getCampaignHistory,
	getCampaignInsights,
	getFbPageSnapshot,
	getFbPageInsights,
	getFollowerHistory,
	getIgProfileSnapshot,
	getIgUserInsights,
	getRecentPosts,
	int,
	listAdAccounts,
	listCampaigns,
	nok,
	parseActions,
	pct,
	rankByEngagement,
	saveDailyInsights,
	type Campaign,
	type Insight,
	type SocialInsightRow,
} from './lib/meta-api.js';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const asSave = args.includes('--save');
const campaignFlag = args.find(a => a.startsWith('--campaign='))?.split('=')[1];
const daysFlag = args.find(a => a.startsWith('--days='))?.split('=')[1];
const positional = args.filter(a => !a.startsWith('--'));

function daysArg(defaultDays: number): number {
	if (!daysFlag) return defaultDays;
	const n = Number(daysFlag);
	return Number.isFinite(n) && n > 0 ? n : defaultDays;
}

function out(data: unknown): void {
	if (asJson) {
		console.log(JSON.stringify(data, null, 2));
		return;
	}
	// Fall back on JSON if the caller didn't give us a pretty-printer for this shape
	console.log(typeof data === 'string' ? data : JSON.stringify(data, null, 2));
}

function usage(): void {
	console.log(
		`Usage: npx tsx scripts/meta.ts <subcommand> [args] [--json]

Subcommands:
  token                      Show current token scopes + expiry
  token extend               Exchange current token for a long-lived (~60d) one
                             and write it back to .env
  accounts                   List ad accounts accessible to token
  ads campaigns              List all campaigns on configured ad account
  ads insights [name|id]     Campaign-level insights (defaults to active)
  ads daily [name|id]        Day-by-day breakdown (add --save to upsert to ad_insights)
  ads slides [name|id]       Per-ad (carousel card) breakdown
  ads status                 Dashboard: active campaigns + key metrics
  ads check [name|id]        Flag deviations from success criteria
  ads report [name|id]       Generate markdown post-mortem report

  fb page                    Current FB page snapshot (followers, insights last 7d)
  fb posts [--days=N]        Recent FB posts ranked by engagement (from social_insights)

  ig profile                 Current IG profile snapshot (followers, insights last 7d)
  ig posts [--days=N]        Recent IG posts ranked by engagement (from social_insights)

  history followers [--days=N]  Follower trend + subscriber growth
  history campaigns          All campaigns summarized from ad_insights
  history best-days [--days=N]  Which weekday performs best on average

Examples:
  npx tsx scripts/meta.ts ads status
  npx tsx scripts/meta.ts fb posts --days=14
  npx tsx scripts/meta.ts ig profile
  npx tsx scripts/meta.ts history followers
  npx tsx scripts/meta.ts history best-days`,
	);
}

// ── Resolve campaign selector ──

async function resolveCampaign(selector: string | undefined): Promise<Campaign> {
	const needle = selector || campaignFlag;
	if (needle) {
		const found = await findCampaign(needle);
		if (!found) {
			console.error(`No campaign matched "${needle}"`);
			process.exit(1);
		}
		return found;
	}
	const active = await findActiveCampaign();
	if (!active) {
		console.error(
			'No single active campaign found — specify name or id explicitly.',
		);
		process.exit(1);
	}
	return active;
}

// ── Formatters ──

function shortName(name: string, max = 60): string {
	return name.length <= max ? name : name.slice(0, max - 1) + '…';
}

/**
 * Best-effort: push the new token to GitHub Actions secrets so that CI
 * workflows (daily digest) pick up the new value without manual intervention.
 * Returns { ok: true, repo } on success, { ok: false, reason } otherwise.
 */
function syncTokenToGha(newToken: string): { ok: boolean; repo?: string; reason?: string } {
	// Check that `gh` is on PATH and the user is authed
	const ghCheck = spawnSync('gh', ['auth', 'status'], { encoding: 'utf-8' });
	if (ghCheck.error || ghCheck.status !== 0) {
		return { ok: false, reason: 'gh CLI not installed or not authed' };
	}

	// Resolve the repo from git remote
	let repo: string;
	try {
		repo = execSync('gh repo view --json nameWithOwner -q .nameWithOwner', {
			encoding: 'utf-8',
		}).trim();
	} catch {
		return { ok: false, reason: 'could not resolve repo from git remote' };
	}
	if (!repo) return { ok: false, reason: 'empty repo name' };

	// Set the secret
	const setResult = spawnSync('gh', ['secret', 'set', 'META_ACCESS_TOKEN', '-R', repo], {
		input: newToken,
		encoding: 'utf-8',
	});
	if (setResult.status !== 0) {
		return { ok: false, reason: setResult.stderr || 'gh secret set failed' };
	}
	return { ok: true, repo };
}

function formatCampaignRow(c: Campaign): string {
	const budget = c.daily_budget
		? `${nok(Number(c.daily_budget) / 100)}/dag`
		: c.lifetime_budget
		? `${nok(Number(c.lifetime_budget) / 100)} total`
		: '—';
	const statusIcon = c.status === 'ACTIVE' ? '●' : c.status === 'PAUSED' ? '○' : '·';
	return `${statusIcon} ${c.id}  ${shortName(c.name, 50).padEnd(52)}  ${c.objective.padEnd(18)}  ${budget}`;
}

function formatInsightHeader(c: Campaign, i: Insight): string {
	const parsed = parseActions(i.actions);
	const lpv = parsed.landingPageViews;
	const linkClicks = Number(i.inline_link_clicks || 0);
	const spendNok = Number(i.spend || 0);
	const cpcLink = linkClicks > 0 ? spendNok / linkClicks : 0;
	const costPerLpv = lpv > 0 ? spendNok / lpv : 0;
	const ctrLink = Number(i.inline_link_click_ctr || 0);

	return [
		``,
		`${c.name}`,
		`Kampanje-ID: ${c.id}`,
		`Periode: ${i.date_start} → ${i.date_stop}`,
		``,
		`  Impressions     ${int(i.impressions).padStart(10)}`,
		`  Reach           ${int(i.reach).padStart(10)}`,
		`  Frequency       ${Number(i.frequency || 0).toFixed(2).padStart(10)}x`,
		``,
		`  CTR (alle)      ${pct(i.ctr).padStart(10)}`,
		`  CTR (lenke)     ${pct(ctrLink).padStart(10)}`,
		`  Clicks (alle)   ${int(i.clicks).padStart(10)}`,
		`  Link clicks     ${int(i.inline_link_clicks).padStart(10)}`,
		`  Landing views   ${int(lpv).padStart(10)}`,
		``,
		`  Spend           ${nok(i.spend).padStart(10)}`,
		`  CPC (alle)      ${nok(i.cpc).padStart(10)}`,
		`  CPC (lenke)     ${nok(cpcLink).padStart(10)}`,
		`  CPLPV           ${nok(costPerLpv).padStart(10)}`,
		`  CPM             ${nok(i.cpm).padStart(10)}`,
		``,
		`  Post engagement ${int(parsed.postEngagement).padStart(10)}`,
		`  Reactions       ${int(parsed.reactions).padStart(10)}`,
		``,
	].join('\n');
}

function formatDailyTable(rows: Insight[]): string {
	const header = `  Dato        Imp    Clicks  LPV   Spend     CPC     CTR`;
	const sep = `  ${'─'.repeat(header.length - 2)}`;
	const lines = rows.map(r => {
		const lpv = actionValue(r.actions, 'landing_page_view');
		const d = r.date_start;
		return `  ${d.padEnd(10)}  ${int(r.impressions).padStart(5)}  ${int(r.clicks).padStart(6)}  ${String(lpv).padStart(4)}  ${nok(r.spend).padStart(8)}  ${nok(r.cpc).padStart(6)}  ${pct(r.ctr).padStart(6)}`;
	});
	return [header, sep, ...lines].join('\n');
}

function formatSlideTable(rows: Insight[]): string {
	// Sort by landing_page_view descending
	const sorted = [...rows].sort(
		(a, b) =>
			actionValue(b.actions, 'landing_page_view') -
			actionValue(a.actions, 'landing_page_view'),
	);
	const header = `  Ad                                              Imp    Clicks  LPV   Spend     CTR`;
	const sep = `  ${'─'.repeat(header.length - 2)}`;
	const lines = sorted.map(r => {
		const lpv = actionValue(r.actions, 'landing_page_view');
		const name = shortName(r.ad_name || r.ad_id || '?', 46);
		return `  ${name.padEnd(46)}  ${int(r.impressions).padStart(5)}  ${int(r.clicks).padStart(6)}  ${String(lpv).padStart(4)}  ${nok(r.spend).padStart(8)}  ${pct(r.ctr).padStart(6)}`;
	});
	return [header, sep, ...lines].join('\n');
}

// ── Handlers ──

async function handleToken(action?: string): Promise<void> {
	if (action === 'extend') {
		const newToken = await extendToken();
		if (!newToken) {
			console.error('Token exchange returned no access_token');
			process.exit(1);
		}
		// Write back to .env — replace the META_ACCESS_TOKEN line in place
		const envPath = resolve(import.meta.dirname, '../.env');
		const envContent = readFileSync(envPath, 'utf-8');
		const updated = envContent.replace(
			/^META_ACCESS_TOKEN=.*$/m,
			`META_ACCESS_TOKEN=${newToken}`,
		);
		if (updated === envContent) {
			console.error('Could not find META_ACCESS_TOKEN line in .env to update');
			process.exit(1);
		}
		writeFileSync(envPath, updated);
		console.log('\nToken extended and written to .env.');

		// Best-effort sync to GHA secrets so the daily digest in CI uses the
		// same token. Silently skipped if `gh` CLI is missing or unauthed.
		const ghResult = syncTokenToGha(newToken);
		if (ghResult.ok) {
			console.log(`Synced META_ACCESS_TOKEN to GitHub Actions (${ghResult.repo}).`);
		} else if (ghResult.reason) {
			console.log(`GHA sync skipped: ${ghResult.reason}`);
		}

		console.log(`\nNew token length: ${newToken.length} chars`);
		console.log('Run `npx tsx scripts/meta.ts token` to verify new expiry.\n');
		return;
	}

	const info = await debugToken();
	if (!info) {
		console.error(
			'Could not debug token — META_APP_SECRET not set. Add it to .env to enable self-check.',
		);
		process.exit(1);
	}
	if (asJson) {
		out(info);
		return;
	}
	const expires = info.expires_at === 0
		? 'never (long-lived)'
		: new Date(info.expires_at * 1000).toISOString();
	console.log(
		`\nToken for ${info.application} (app ${info.app_id})\n` +
			`  Valid:   ${info.is_valid ? 'yes' : 'no'}\n` +
			`  Expires: ${expires}\n` +
			`  User:    ${info.user_id}\n` +
			`  Scopes:  ${info.scopes.join(', ')}\n`,
	);
}

async function handleAccounts(): Promise<void> {
	const accounts = await listAdAccounts();
	if (asJson) {
		out(accounts);
		return;
	}
	console.log(`\n${accounts.length} ad account(s):\n`);
	for (const a of accounts) {
		const status = a.account_status === 1 ? 'ACTIVE' : `status ${a.account_status}`;
		console.log(
			`  ${a.id}  ${a.name.padEnd(34)}  ${a.currency}  ${status}`,
		);
	}
	console.log('');
}

async function handleAdsCampaigns(): Promise<void> {
	const campaigns = await listCampaigns();
	if (asJson) {
		out(campaigns);
		return;
	}
	if (campaigns.length === 0) {
		console.log('\nNo campaigns found on configured ad account.\n');
		return;
	}
	console.log(`\n${campaigns.length} campaign(s):\n`);
	for (const c of campaigns) console.log(formatCampaignRow(c));
	console.log('');
}

async function handleAdsInsights(selector: string | undefined): Promise<void> {
	const campaign = await resolveCampaign(selector);
	const insight = await getCampaignInsights(campaign.id);
	if (!insight) {
		console.log(`\nNo insights data for ${campaign.name} yet.\n`);
		return;
	}
	if (asJson) {
		out({ campaign, insight });
		return;
	}
	console.log(formatInsightHeader(campaign, insight));
}

async function handleAdsDaily(selector: string | undefined): Promise<void> {
	const campaign = await resolveCampaign(selector);
	const daily = await getCampaignDailyInsights(campaign.id);
	if (daily.length === 0) {
		console.log(`\nNo daily data for ${campaign.name} yet.\n`);
		return;
	}

	let savedCount: number | null = null;
	if (asSave) {
		try {
			savedCount = await saveDailyInsights(campaign, daily);
		} catch (e: any) {
			console.error(`\n[save] ${e.message}`);
		}
	}

	if (asJson) {
		out({ campaign, daily, saved: savedCount });
		return;
	}
	console.log(`\n${campaign.name}\nDag-for-dag:\n`);
	console.log(formatDailyTable(daily));
	if (savedCount !== null) {
		console.log(`\n  Lagret ${savedCount} rad(er) i ad_insights.`);
	}
	console.log('');
}

async function handleAdsSlides(selector: string | undefined): Promise<void> {
	const campaign = await resolveCampaign(selector);
	const ads = await getCampaignAdInsights(campaign.id);
	if (ads.length === 0) {
		console.log(`\nNo per-ad data for ${campaign.name}.\n`);
		return;
	}
	if (asJson) {
		out({ campaign, ads });
		return;
	}
	console.log(`\n${campaign.name}\nPer ad / carousel-kort:\n`);
	console.log(formatSlideTable(ads));
	console.log('');
}

async function handleAdsCheck(selector: string | undefined): Promise<void> {
	const campaign = await resolveCampaign(selector);
	const result = await checkCampaign(campaign);
	if (!result) {
		console.log(`\nNo insights data for ${campaign.name} — can't run checks yet.\n`);
		return;
	}
	if (asJson) {
		out(result);
		return;
	}

	const icon = result.overall === 'ok' ? '✅' : result.overall === 'warning' ? '⚠️ ' : '❌';
	const verdict =
		result.overall === 'ok' ? 'All success criteria met'
		: result.overall === 'warning' ? 'Some metrics below target'
		: 'Performance is below expectations';

	console.log(`\n${campaign.name}`);
	console.log(`Overall: ${icon} ${verdict}\n`);

	for (const c of result.checks) {
		const statusIcon = c.status === 'ok' ? '✅' : c.status === 'warning' ? '⚠️ ' : '❌';
		console.log(`  ${statusIcon} ${c.metric.padEnd(14)}  ${c.message}`);
	}
	console.log('');
}

async function handleAdsReport(selector: string | undefined): Promise<void> {
	const campaign = await resolveCampaign(selector);
	const markdown = await generateCampaignReport(campaign);
	if (asJson) {
		out({ campaign, markdown });
		return;
	}
	// Write straight to stdout — user pipes or copies from terminal
	console.log(markdown);
}

async function handleAdsStatus(): Promise<void> {
	const campaigns = await listCampaigns();
	const active = campaigns.filter(c => c.status === 'ACTIVE');
	if (active.length === 0) {
		console.log('\nNo active campaigns.\n');
		if (campaigns.length > 0) {
			console.log('Most recent:');
			console.log(formatCampaignRow(campaigns[0]));
		}
		return;
	}
	if (asJson) {
		const withInsights = await Promise.all(
			active.map(async c => ({
				campaign: c,
				insight: await getCampaignInsights(c.id).catch(() => null),
			})),
		);
		out(withInsights);
		return;
	}
	for (const c of active) {
		const i = await getCampaignInsights(c.id);
		if (!i) {
			console.log(`\n${c.name}\n  (ingen insights ennå)\n`);
			continue;
		}
		console.log(formatInsightHeader(c, i));
	}
}

// ── FB / IG / history handlers ──

function firstLine(s: string | null | undefined, max = 60): string {
	if (!s) return '(no caption)';
	const trimmed = s.split('\n')[0].trim();
	return trimmed.length <= max ? trimmed : trimmed.slice(0, max - 1) + '…';
}

function formatPostRow(r: SocialInsightRow): string {
	const m = r.metrics || {};
	const date = r.posted_at.slice(0, 10);
	if (r.platform === 'ig') {
		const reach = m.reach ? ` reach:${m.reach}` : '';
		return `  ${date}  likes:${m.likes || 0}  comments:${m.comments || 0}  saved:${m.saved || 0}${reach}  ${firstLine(r.caption, 50)}`;
	}
	return `  ${date}  reactions:${m.reactions || 0}  comments:${m.comments || 0}  shares:${m.shares || 0}  ${firstLine(r.caption, 50)}`;
}

function groupPageInsightsByDate(rows: Awaited<ReturnType<typeof getFbPageInsights>>) {
	const byDate = new Map<string, Record<string, number>>();
	for (const r of rows) {
		const date = r.endTime.slice(0, 10);
		const entry = byDate.get(date) || {};
		entry[r.metric] = r.value;
		byDate.set(date, entry);
	}
	return [...byDate.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

async function handleFbPage(): Promise<void> {
	const snap = await getFbPageSnapshot();
	// FB page-level insights are mostly deprecated in v22 and unavailable for
	// small pages. Show a summary of recent posts from social_insights instead.
	const recentPosts = await getRecentPosts('fb', daysArg(14));
	if (asJson) {
		out({ snapshot: snap, recentPosts });
		return;
	}
	console.log('');
	if (snap) {
		console.log(`FB: ${snap.name || '(unknown)'}`);
		console.log(`  Followers: ${snap.followers}`);
	} else {
		console.log('FB: (could not fetch page snapshot)');
	}
	if (recentPosts.length === 0) {
		console.log('\n  Ingen FB-poster i social_insights ennå.\n');
		return;
	}
	const totals = recentPosts.reduce(
		(acc, r) => {
			const m = r.metrics || {};
			acc.reactions += m.reactions || 0;
			acc.comments += m.comments || 0;
			acc.shares += m.shares || 0;
			return acc;
		},
		{ reactions: 0, comments: 0, shares: 0 },
	);
	console.log(`\nSiste ${daysArg(14)} dager — ${recentPosts.length} poster:`);
	console.log(`  Totalt: ${totals.reactions} reaksjoner · ${totals.comments} kommentarer · ${totals.shares} delinger`);
	console.log(`  Snitt per post: ${(totals.reactions / recentPosts.length).toFixed(1)} reaksjoner, ${(totals.comments / recentPosts.length).toFixed(1)} kommentarer`);
	console.log('\n  Tip: `meta.ts fb posts --days=14` for full rangering.\n');
}

async function handleFbPosts(): Promise<void> {
	const days = daysArg(14);
	const rows = await getRecentPosts('fb', days);
	const ranked = rankByEngagement(rows);
	if (asJson) {
		out(ranked);
		return;
	}
	if (ranked.length === 0) {
		console.log(`\nIngen FB-poster i social_insights siste ${days} dager.\n`);
		return;
	}
	console.log(`\nFB-poster siste ${days} dager (${ranked.length} totalt, rangert etter engasjement):\n`);
	for (const r of ranked.slice(0, 20)) console.log(formatPostRow(r));
	console.log('');
}

async function handleIgProfile(): Promise<void> {
	const snap = await getIgProfileSnapshot();
	const insights = await getIgUserInsights(
		['reach', 'views', 'profile_views', 'website_clicks', 'accounts_engaged', 'total_interactions'],
		daysArg(7),
	);
	if (asJson) {
		out({ snapshot: snap, insights });
		return;
	}
	console.log('');
	if (snap) {
		console.log(`IG: @${snap.username || '(unknown)'}`);
		console.log(`  Followers: ${snap.followers}`);
		console.log(`  Follows:   ${snap.follows ?? '—'}`);
		console.log(`  Posts:     ${snap.mediaCount ?? '—'}`);
	}
	if (insights.length === 0) {
		console.log('\n  (ingen user insights — IG kan begrense metrics for kontoer under 100 followers)\n');
		return;
	}
	// Separate daily-series metrics (reach, follower_count) from total-value aggregates
	const byMetric = new Map<string, number>();
	const dailyReach: { date: string; value: number }[] = [];
	for (const r of insights) {
		if (r.metric === 'reach') {
			dailyReach.push({ date: r.endTime.slice(0, 10), value: r.value });
		} else {
			byMetric.set(r.metric, (byMetric.get(r.metric) || 0) + r.value);
		}
	}
	console.log(`\nSiste ${daysArg(7)} dager (totals):`);
	for (const [name, val] of byMetric) {
		console.log(`  ${name.padEnd(22)} ${String(val).padStart(8)}`);
	}
	if (dailyReach.length > 0) {
		console.log('\n  Daglig reach:');
		for (const d of dailyReach.sort((a, b) => a.date.localeCompare(b.date))) {
			console.log(`    ${d.date}  ${d.value}`);
		}
	}
	console.log('');
}

async function handleIgPosts(): Promise<void> {
	const days = daysArg(14);
	const rows = await getRecentPosts('ig', days);
	const ranked = rankByEngagement(rows);
	if (asJson) {
		out(ranked);
		return;
	}
	if (ranked.length === 0) {
		console.log(`\nIngen IG-poster i social_insights siste ${days} dager.\n`);
		return;
	}
	console.log(`\nIG-poster siste ${days} dager (${ranked.length} totalt, rangert etter engasjement):\n`);
	for (const r of ranked.slice(0, 20)) console.log(formatPostRow(r));
	console.log('');
}

async function handleHistoryFollowers(): Promise<void> {
	const days = daysArg(30);
	const rows = await getFollowerHistory(days);
	if (asJson) {
		out(rows);
		return;
	}
	if (rows.length === 0) {
		console.log('\nIngen follower-data tilgjengelig i daily_metrics.\n');
		return;
	}
	console.log(`\nFollower-historikk siste ${days} dager:\n`);
	console.log('  Dato        Subs  IG  FB');
	console.log('  ──────────────────────');
	for (const r of rows) {
		console.log(
			`  ${r.date}  ${String(r.subscribers ?? '—').padStart(4)}  ${String(r.ig_followers ?? '—').padStart(3)}  ${String(r.fb_followers ?? '—').padStart(2)}`,
		);
	}
	// Trend summary
	const withIg = rows.filter(r => r.ig_followers != null);
	const withFb = rows.filter(r => r.fb_followers != null);
	const withSubs = rows.filter(r => r.subscribers != null);
	const trend = (arr: typeof rows, key: 'ig_followers' | 'fb_followers' | 'subscribers'): string => {
		if (arr.length < 2) return '—';
		const first = arr[0][key] as number;
		const last = arr[arr.length - 1][key] as number;
		const delta = last - first;
		return delta >= 0 ? `+${delta}` : `${delta}`;
	};
	console.log(`\n  Endring: subs ${trend(withSubs, 'subscribers')}, IG ${trend(withIg, 'ig_followers')}, FB ${trend(withFb, 'fb_followers')}\n`);
}

async function handleHistoryCampaigns(): Promise<void> {
	const rows = await getCampaignHistory();
	if (asJson) {
		out(rows);
		return;
	}
	if (rows.length === 0) {
		console.log('\nIngen kampanje-historikk i ad_insights ennå.\n');
		return;
	}
	console.log(`\n${rows.length} kampanje(r) i ad_insights:\n`);
	console.log('  Kort navn              Periode            Dager  Spend    Klikk  LPV  Snitt CTR  Snitt CPC');
	console.log('  ───────────────────────────────────────────────────────────────────────────────────────');
	for (const r of rows) {
		const name = (r.short_name || r.campaign_id).padEnd(22).slice(0, 22);
		const period = `${r.first_date}→${r.last_date.slice(5)}`.padEnd(18);
		console.log(
			`  ${name}  ${period}  ${String(r.days).padStart(5)}  ${r.total_spend_nok.toFixed(2).padStart(7)}  ${String(r.total_link_clicks).padStart(5)}  ${String(r.total_landing_page_views).padStart(3)}  ${r.avg_ctr_total.toFixed(2).padStart(8)}%  ${r.avg_cpc_link.toFixed(2).padStart(8)} kr`,
		);
	}
	console.log('');
}

async function handleHistoryBestDays(): Promise<void> {
	const days = daysArg(60);
	const buckets = await getBestDaysAnalysis(days);
	if (asJson) {
		out(buckets);
		return;
	}
	const sorted = [...buckets].sort((a, b) => b.avgEngagement - a.avgEngagement);
	console.log(`\nBeste ukedager for posting (siste ${days} dager, snitt-engasjement):\n`);
	console.log('  Dag        Posts  Snitt engasjement');
	console.log('  ────────────────────────────────');
	for (const b of sorted) {
		const bar = '█'.repeat(Math.round(b.avgEngagement / 2));
		console.log(`  ${b.day.padEnd(9)}  ${String(b.postCount).padStart(5)}  ${String(b.avgEngagement).padStart(5)}  ${bar}`);
	}
	console.log('');
}

// ── Router ──

async function main(): Promise<void> {
	const [cmd, sub, ...rest] = positional;

	if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
		usage();
		return;
	}

	try {
		if (cmd === 'token') return void (await handleToken(sub));
		if (cmd === 'accounts') return void (await handleAccounts());

		if (cmd === 'ads') {
			if (!sub) {
				usage();
				process.exit(1);
			}
			if (sub === 'campaigns') return void (await handleAdsCampaigns());
			if (sub === 'insights') return void (await handleAdsInsights(rest[0]));
			if (sub === 'daily') return void (await handleAdsDaily(rest[0]));
			if (sub === 'slides') return void (await handleAdsSlides(rest[0]));
			if (sub === 'status') return void (await handleAdsStatus());
			if (sub === 'check') return void (await handleAdsCheck(rest[0]));
			if (sub === 'report') return void (await handleAdsReport(rest[0]));
			console.error(`Unknown ads subcommand: ${sub}`);
			usage();
			process.exit(1);
		}

		if (cmd === 'fb') {
			if (sub === 'page') return void (await handleFbPage());
			if (sub === 'posts') return void (await handleFbPosts());
			console.error(`Unknown fb subcommand: ${sub}`);
			usage();
			process.exit(1);
		}

		if (cmd === 'ig') {
			if (sub === 'profile') return void (await handleIgProfile());
			if (sub === 'posts') return void (await handleIgPosts());
			console.error(`Unknown ig subcommand: ${sub}`);
			usage();
			process.exit(1);
		}

		if (cmd === 'history') {
			if (sub === 'followers') return void (await handleHistoryFollowers());
			if (sub === 'campaigns') return void (await handleHistoryCampaigns());
			if (sub === 'best-days') return void (await handleHistoryBestDays());
			console.error(`Unknown history subcommand: ${sub}`);
			usage();
			process.exit(1);
		}

		console.error(`Unknown subcommand: ${cmd}`);
		usage();
		process.exit(1);
	} catch (e: any) {
		console.error(`\nError: ${e.message}`);
		process.exit(1);
	}
}

main();
