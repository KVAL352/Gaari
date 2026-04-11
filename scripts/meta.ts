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
	getCampaignAdInsights,
	getCampaignDailyInsights,
	getCampaignInsights,
	int,
	listAdAccounts,
	listCampaigns,
	nok,
	parseActions,
	pct,
	type Campaign,
	type Insight,
} from './lib/meta-api.js';

const args = process.argv.slice(2);
const asJson = args.includes('--json');
const campaignFlag = args.find(a => a.startsWith('--campaign='))?.split('=')[1];
const positional = args.filter(a => !a.startsWith('--'));

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
  ads daily [name|id]        Day-by-day breakdown
  ads slides [name|id]       Per-ad (carousel card) breakdown
  ads status                 Dashboard: active campaigns + key metrics
  ads check [name|id]        Flag deviations from success criteria
  ads report [name|id]       Generate markdown post-mortem report

Examples:
  npx tsx scripts/meta.ts ads status
  npx tsx scripts/meta.ts ads check boost-2026-04-08
  npx tsx scripts/meta.ts ads report boost-2026-04-08
  npx tsx scripts/meta.ts ads daily boost`,
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
		console.log(`New token length: ${newToken.length} chars`);
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
	if (asJson) {
		out({ campaign, daily });
		return;
	}
	console.log(`\n${campaign.name}\nDag-for-dag:\n`);
	console.log(formatDailyTable(daily));
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

		console.error(`Unknown subcommand: ${cmd}`);
		usage();
		process.exit(1);
	} catch (e: any) {
		console.error(`\nError: ${e.message}`);
		process.exit(1);
	}
}

main();
