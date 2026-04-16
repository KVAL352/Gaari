/**
 * Monthly Venue Report — Automated performance report for promoted venues.
 *
 * Generates a branded HTML email showing impressions, clicks, share %,
 * and top events for a specific venue during a given month.
 *
 * Usage:
 *   cd scripts
 *   npx tsx generate-venue-report.ts "Hulen"                    # current month, save HTML
 *   npx tsx generate-venue-report.ts "Hulen" --month 2026-04    # specific month
 *   npx tsx generate-venue-report.ts "Hulen" --email addr       # send via Resend
 *   npx tsx generate-venue-report.ts --all                      # all active venues
 *   npx tsx generate-venue-report.ts --all --email              # send to each venue's contact_email
 */

import * as fs from 'fs';
import * as path from 'path';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.PUBLIC_SUPABASE_ANON_KEY ?? '';

if (!supabaseUrl || !supabaseKey) {
	console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env');
	process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── CLI Args ──────────────────────────────────────────────────────

const args = process.argv.slice(2);
const isAll = args.includes('--all');
const monthIdx = args.indexOf('--month');
const monthArg = monthIdx !== -1 ? args[monthIdx + 1] : undefined;
const emailIdx = args.indexOf('--email');
const emailTo = emailIdx !== -1 ? args[emailIdx + 1] : null;
const venueName = isAll ? null : args.find(a => !a.startsWith('--') && a !== monthArg && a !== emailTo);

if (!isAll && !venueName) {
	console.error('Usage: npx tsx generate-venue-report.ts "Venue Name" [--month YYYY-MM] [--email addr]');
	console.error('       npx tsx generate-venue-report.ts --all [--month YYYY-MM] [--email]');
	process.exit(1);
}

// ─── Date helpers ──────────────────────────────────────────────────

function resolveMonth(arg?: string): { label: string; start: string; end: string; labelNo: string } {
	let year: number, month: number;
	if (arg && /^\d{4}-\d{2}$/.test(arg)) {
		[year, month] = arg.split('-').map(Number);
	} else {
		const now = new Date();
		year = now.getFullYear();
		month = now.getMonth() + 1;
	}
	const monthStr = `${year}-${String(month).padStart(2, '0')}`;
	const start = `${monthStr}-01`;
	const lastDay = new Date(year, month, 0).getDate();
	const end = `${monthStr}-${String(lastDay).padStart(2, '0')}`;
	const monthNames = ['januar', 'februar', 'mars', 'april', 'mai', 'juni',
		'juli', 'august', 'september', 'oktober', 'november', 'desember'];
	return { label: monthStr, start, end, labelNo: `${monthNames[month - 1]} ${year}` };
}

const period = resolveMonth(monthArg);

// ─── Data fetching ─────────────────────────────────────────────────

interface PlacementData {
	id: string;
	venue_name: string;
	collection_slugs: string[];
	tier: string;
	slot_share: number;
	contact_email: string | null;
	start_date: string;
}

interface ReportData {
	placement: PlacementData;
	impressions: Map<string, number>; // collection_slug → count
	totalCollectionImpressions: Map<string, number>; // collection_slug → total page views
	clicks: number;
	topEvents: Array<{ title: string; slug: string; clicks: number }>;
}

async function fetchReportData(venue: PlacementData): Promise<ReportData> {
	// Fetch all data in parallel
	const [placementLogsResult, collectionImpsResult, clicksResult, topEventsResult] = await Promise.all([
		// Venue's promoted impressions this month
		supabase
			.from('placement_log')
			.select('collection_slug, impression_count')
			.eq('placement_id', venue.id)
			.gte('log_date', period.start)
			.lte('log_date', period.end),
		// Total collection page views this month
		supabase
			.from('collection_impressions')
			.select('collection_slug, impression_count')
			.in('collection_slug', venue.collection_slugs)
			.gte('log_date', period.start)
			.lte('log_date', period.end),
		// Ticket clicks this month
		supabase
			.from('venue_clicks')
			.select('event_slug')
			.eq('venue_name', venue.venue_name)
			.gte('clicked_at', `${period.start}T00:00:00`)
			.lte('clicked_at', `${period.end}T23:59:59`),
		// Top events by clicks
		supabase
			.from('venue_clicks')
			.select('event_slug')
			.eq('venue_name', venue.venue_name)
			.gte('clicked_at', `${period.start}T00:00:00`)
			.lte('clicked_at', `${period.end}T23:59:59`)
	]);

	// Aggregate placement impressions per collection
	const impressions = new Map<string, number>();
	for (const row of placementLogsResult.data ?? []) {
		const current = impressions.get(row.collection_slug) ?? 0;
		impressions.set(row.collection_slug, current + row.impression_count);
	}

	// Aggregate total collection impressions
	const totalCollectionImpressions = new Map<string, number>();
	for (const row of collectionImpsResult.data ?? []) {
		const current = totalCollectionImpressions.get(row.collection_slug) ?? 0;
		totalCollectionImpressions.set(row.collection_slug, current + row.impression_count);
	}

	// Count clicks and aggregate top events
	const clicksBySlug = new Map<string, number>();
	for (const row of clicksResult.data ?? []) {
		const current = clicksBySlug.get(row.event_slug) ?? 0;
		clicksBySlug.set(row.event_slug, current + 1);
	}

	const topEvents = Array.from(clicksBySlug.entries())
		.map(([slug, clicks]) => ({ title: slug.replace(/-\d{4}-\d{2}-\d{2}$/, '').replace(/-/g, ' '), slug, clicks }))
		.sort((a, b) => b.clicks - a.clicks)
		.slice(0, 5);

	return {
		placement: venue,
		impressions,
		totalCollectionImpressions,
		clicks: clicksResult.data?.length ?? 0,
		topEvents
	};
}

// ─── HTML Report ───────────────────────────────────────────────────

const FUNKIS = {
	iron: '#1C1C1E',
	red: '#C82D2D',
	green: '#1A6B35',
	neutral: '#4D4D4D',
	white: '#FFFFFF',
	plaster: '#F5F3EE',
	textPrimary: '#141414',
	textSecondary: '#4D4D4D',
	textMuted: '#6B6862',
	borderSubtle: '#E8E8E4',
};

const MIN_MATURE_DAYS = 14; // under 14 dager = for tynt datasett for å fargekode over/under mål

function daysActive(placement: PlacementData, periodEnd: string): number {
	const today = new Date().toISOString().slice(0, 10);
	const effectiveEnd = today < periodEnd ? today : periodEnd;
	const effectiveStart = placement.start_date > period.start ? placement.start_date : period.start;
	const ms = new Date(effectiveEnd).getTime() - new Date(effectiveStart).getTime();
	return Math.max(0, Math.floor(ms / 86400000) + 1);
}

function formatPeriodLabel(placement: PlacementData): string {
	const today = new Date().toISOString().slice(0, 10);
	const effectiveEnd = today < period.end ? today : period.end;
	const effectiveStart = placement.start_date > period.start ? placement.start_date : period.start;
	const days = daysActive(placement, period.end);
	const fmt = (d: string) => {
		const [y, m, day] = d.split('-');
		const months = ['jan.', 'feb.', 'mars', 'april', 'mai', 'juni', 'juli', 'aug.', 'sep.', 'okt.', 'nov.', 'des.'];
		return `${parseInt(day)}. ${months[parseInt(m) - 1]}`;
	};
	return `Periode: ${fmt(effectiveStart)} – ${fmt(effectiveEnd)} (${days} ${days === 1 ? 'dag' : 'dager'})`;
}

const TIER_LABELS: Record<string, string> = {
	basis: 'Basis',
	standard: 'Standard',
	partner: 'Partner'
};

function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function generateReportHtml(data: ReportData): string {
	const { placement, impressions, totalCollectionImpressions, clicks, topEvents } = data;

	// Calculate totals
	let totalVenueImpressions = 0;
	let totalPageViews = 0;
	for (const slug of placement.collection_slugs) {
		totalVenueImpressions += impressions.get(slug) ?? 0;
		totalPageViews += totalCollectionImpressions.get(slug) ?? 0;
	}
	const overallShare = totalPageViews > 0 ? (totalVenueImpressions / totalPageViews * 100) : 0;

	const days = daysActive(placement, period.end);
	const isMature = days >= MIN_MATURE_DAYS;

	// Fargelogikk: kun rødt/grønt når datasettet er modent (≥14 dager).
	// Ellers nøytral grå — tallet er for tynt til å signalisere over/under mål.
	function shareColor(share: number): string {
		if (!isMature) return FUNKIS.neutral;
		return share >= placement.slot_share ? FUNKIS.green : FUNKIS.red;
	}

	// Collection breakdown rows
	const collectionRows = placement.collection_slugs.map(slug => {
		const venueImps = impressions.get(slug) ?? 0;
		const totalImps = totalCollectionImpressions.get(slug) ?? 0;
		const share = totalImps > 0 ? (venueImps / totalImps * 100) : 0;
		return `
			<tr>
				<td style="padding:12px 16px;border-bottom:1px solid ${FUNKIS.borderSubtle};font-size:14px;color:${FUNKIS.textPrimary};">${escapeHtml(slug)}</td>
				<td style="padding:12px 16px;border-bottom:1px solid ${FUNKIS.borderSubtle};font-size:14px;color:${FUNKIS.textPrimary};text-align:right;font-variant-numeric:tabular-nums;">${venueImps.toLocaleString('nb-NO')}</td>
				<td style="padding:12px 16px;border-bottom:1px solid ${FUNKIS.borderSubtle};font-size:14px;color:${FUNKIS.textPrimary};text-align:right;font-variant-numeric:tabular-nums;">${totalImps.toLocaleString('nb-NO')}</td>
				<td style="padding:12px 16px;border-bottom:1px solid ${FUNKIS.borderSubtle};font-size:14px;font-weight:600;color:${shareColor(share)};text-align:right;">${share.toFixed(1)}%</td>
			</tr>`;
	}).join('');

	// Top events rows
	const topEventsHtml = topEvents.length > 0
		? topEvents.map((e, i) => `
			<tr>
				<td style="padding:10px 16px;border-bottom:1px solid ${FUNKIS.borderSubtle};font-size:14px;color:${FUNKIS.textSecondary};">${i + 1}.</td>
				<td style="padding:10px 16px;border-bottom:1px solid ${FUNKIS.borderSubtle};font-size:14px;color:${FUNKIS.textPrimary};">
					<a href="https://gaari.no/no/${escapeHtml(e.slug)}" style="color:${FUNKIS.textPrimary};text-decoration:none;">${escapeHtml(e.title)}</a>
				</td>
				<td style="padding:10px 16px;border-bottom:1px solid ${FUNKIS.borderSubtle};font-size:14px;color:${FUNKIS.textPrimary};text-align:right;font-variant-numeric:tabular-nums;">${e.clicks}</td>
			</tr>`).join('')
		: `<tr><td colspan="3" style="padding:16px;font-size:14px;color:${FUNKIS.textMuted};text-align:center;">Ingen klikk registrert denne perioden</td></tr>`;

	return `<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gåri — Rapport for ${escapeHtml(placement.venue_name)}</title>
</head>
<body style="margin:0;padding:0;background:${FUNKIS.plaster};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">

<div style="max-width:600px;margin:0 auto;padding:24px 16px;">

	<!-- Header -->
	<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
		<tr>
			<td>
				<div style="font-family:'Arial Narrow',Arial,sans-serif;font-size:28px;font-weight:800;color:${FUNKIS.iron};letter-spacing:-0.02em;">GÅRI</div>
				<div style="font-size:12px;color:${FUNKIS.textMuted};margin-top:2px;">Synlighetsrapport</div>
			</td>
			<td style="text-align:right;">
				<div style="font-size:14px;color:${FUNKIS.textSecondary};font-weight:600;">${escapeHtml(period.labelNo)}</div>
				<div style="font-size:12px;color:${FUNKIS.textMuted};">${TIER_LABELS[placement.tier]}-pakke — mål ${placement.slot_share}%</div>
			</td>
		</tr>
	</table>

	<!-- Venue name + data-status -->
	<div style="background:${FUNKIS.iron};color:${FUNKIS.white};padding:20px 24px;border-radius:12px;margin-bottom:24px;">
		<div style="font-family:'Arial Narrow',Arial,sans-serif;font-size:24px;font-weight:700;">${escapeHtml(placement.venue_name)}</div>
		<div style="font-size:13px;color:#a0a0a0;margin-top:4px;">${escapeHtml(formatPeriodLabel(placement))}</div>
		${!isMature ? `<div style="font-size:12px;color:#b5b5b5;margin-top:8px;font-style:italic;">Tidlig fase — tallene er tynne i starten og blir mer meningsfulle når dere har vært aktive en full måned.</div>` : ''}
	</div>

	<!-- Key metrics -->
	<table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
		<tr>
			<td style="width:33%;padding:0 4px 0 0;">
				<div style="background:${FUNKIS.white};border-radius:10px;padding:16px;text-align:center;border:1px solid ${FUNKIS.borderSubtle};">
					<div style="font-size:28px;font-weight:700;color:${FUNKIS.textPrimary};font-variant-numeric:tabular-nums;">${totalVenueImpressions.toLocaleString('nb-NO')}</div>
					<div style="font-size:11px;color:${FUNKIS.textMuted};margin-top:4px;text-transform:uppercase;letter-spacing:0.05em;">Topp-plasseringer</div>
				</div>
			</td>
			<td style="width:33%;padding:0 4px;">
				<div style="background:${FUNKIS.white};border-radius:10px;padding:16px;text-align:center;border:1px solid ${FUNKIS.borderSubtle};">
					<div style="font-size:28px;font-weight:700;color:${shareColor(overallShare)};font-variant-numeric:tabular-nums;">${overallShare.toFixed(1)}%</div>
					<div style="font-size:11px;color:${FUNKIS.textMuted};margin-top:4px;text-transform:uppercase;letter-spacing:0.05em;">Synlighetsandel</div>
				</div>
			</td>
			<td style="width:33%;padding:0 0 0 4px;">
				<div style="background:${FUNKIS.white};border-radius:10px;padding:16px;text-align:center;border:1px solid ${FUNKIS.borderSubtle};">
					<div style="font-size:28px;font-weight:700;color:${FUNKIS.textPrimary};font-variant-numeric:tabular-nums;">${clicks.toLocaleString('nb-NO')}</div>
					<div style="font-size:11px;color:${FUNKIS.textMuted};margin-top:4px;text-transform:uppercase;letter-spacing:0.05em;">Klikk på kampene</div>
				</div>
			</td>
		</tr>
	</table>

	<!-- Collection breakdown -->
	<div style="background:${FUNKIS.white};border-radius:10px;border:1px solid ${FUNKIS.borderSubtle};overflow:hidden;margin-bottom:24px;">
		<div style="padding:16px;border-bottom:1px solid ${FUNKIS.borderSubtle};">
			<div style="font-size:16px;font-weight:700;color:${FUNKIS.textPrimary};">Synlighet per samlesside</div>
			<div style="font-size:12px;color:${FUNKIS.textMuted};margin-top:2px;">Mål: ${placement.slot_share}% av sidevisningene</div>
		</div>
		<table width="100%" cellpadding="0" cellspacing="0">
			<tr style="background:${FUNKIS.plaster};">
				<th style="padding:10px 16px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:${FUNKIS.textMuted};text-align:left;">Side</th>
				<th style="padding:10px 16px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:${FUNKIS.textMuted};text-align:right;">Dine topp-plass.</th>
				<th style="padding:10px 16px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:${FUNKIS.textMuted};text-align:right;">Totalt</th>
				<th style="padding:10px 16px;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:${FUNKIS.textMuted};text-align:right;">Andel</th>
			</tr>
			${collectionRows}
		</table>
	</div>

	<!-- Top events -->
	<div style="background:${FUNKIS.white};border-radius:10px;border:1px solid ${FUNKIS.borderSubtle};overflow:hidden;margin-bottom:24px;">
		<div style="padding:16px;border-bottom:1px solid ${FUNKIS.borderSubtle};">
			<div style="font-size:16px;font-weight:700;color:${FUNKIS.textPrimary};">Hvilke kamper fanget oppmerksomheten?</div>
		</div>
		<table width="100%" cellpadding="0" cellspacing="0">
			${topEventsHtml}
		</table>
	</div>

	<!-- Metodikk -->
	<div style="background:${FUNKIS.white};border-radius:10px;border:1px solid ${FUNKIS.borderSubtle};padding:16px;margin-bottom:24px;">
		<div style="font-size:14px;font-weight:700;color:${FUNKIS.textPrimary};margin-bottom:8px;">Slik måler vi</div>
		<div style="font-size:13px;color:${FUNKIS.textSecondary};line-height:1.5;">
			<strong>Topp-plasseringer</strong> telles server-side hver gang en av deres kamper velges som Fremhevet på en av de promoterte sidene. <strong>Klikk</strong> telles når en besøkende trykker seg videre fra kortet. Ingen personlig informasjon (IP, cookies, bruker-ID) lagres. Tallene er faktisk målte — ingen estimater, ingen bransjesnitt.
		</div>
	</div>

	<!-- Footer -->
	<div style="padding:24px 0;border-top:1px solid ${FUNKIS.borderSubtle};">
		<div style="font-size:14px;color:${FUNKIS.textPrimary};line-height:1.6;margin-bottom:16px;">
			Har dere spørsmål eller ønsker annen plassering? Svar bare på denne e-posten.
		</div>
		<div style="font-size:14px;color:${FUNKIS.textPrimary};">
			— Kjersti
		</div>
		<div style="margin-top:16px;font-size:11px;color:${FUNKIS.textMuted};">
			<a href="https://gaari.no" style="font-family:'Arial Narrow',Arial,sans-serif;font-size:13px;font-weight:700;color:${FUNKIS.iron};text-decoration:none;">gaari.no</a>
			&nbsp;·&nbsp;
			<a href="mailto:Kjersti.Therkildsen@gaari.no" style="color:${FUNKIS.textMuted};text-decoration:none;">Kjersti.Therkildsen@gaari.no</a>
		</div>
	</div>

</div>
</body>
</html>`;
}

// ─── Send email ────────────────────────────────────────────────────

async function sendReport(to: string, venueName: string, html: string): Promise<boolean> {
	const resendKey = process.env.RESEND_API_KEY;
	if (!resendKey) {
		console.error('RESEND_API_KEY not set — cannot send email');
		return false;
	}

	const res = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: {
			'Authorization': `Bearer ${resendKey}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({
			from: 'Gåri <noreply@gaari.no>',
			to: [to],
			subject: `Synlighetsrapport ${period.labelNo} — ${venueName}`,
			html
		})
	});

	if (!res.ok) {
		console.error(`Failed to send to ${to}: ${res.status} ${await res.text()}`);
		return false;
	}

	console.log(`  Sent report to ${to}`);
	return true;
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
	console.log(`\nGåri Venue Report — ${period.labelNo}`);
	console.log('─'.repeat(50));

	// Fetch active placements
	const today = new Date().toISOString().slice(0, 10);
	const query = supabase
		.from('promoted_placements')
		.select('id, venue_name, collection_slugs, tier, slot_share, contact_email, start_date')
		.eq('active', true)
		.lte('start_date', today)
		.or(`end_date.is.null,end_date.gte.${today}`);

	if (!isAll && venueName) {
		query.eq('venue_name', venueName);
	}

	const { data: placements, error } = await query;

	if (error) {
		console.error('Failed to fetch placements:', error.message);
		process.exit(1);
	}

	if (!placements || placements.length === 0) {
		console.log(isAll ? 'Ingen aktive plasseringer funnet.' : `Ingen plassering funnet for "${venueName}".`);
		process.exit(0);
	}

	console.log(`${placements.length} plassering(er) funnet\n`);

	const outDir = path.resolve(process.cwd(), '../reports');
	if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

	for (const placement of placements) {
		console.log(`Genererer rapport for ${placement.venue_name}...`);

		const data = await fetchReportData(placement);
		const html = generateReportHtml(data);

		// Save HTML file
		const filename = `rapport-${placement.venue_name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${period.label}.html`;
		const filePath = path.join(outDir, filename);
		fs.writeFileSync(filePath, html, 'utf-8');
		console.log(`  Lagret: ${filePath}`);

		// Send email if requested
		if (emailIdx !== -1) {
			const recipient = emailTo || placement.contact_email;
			if (recipient) {
				await sendReport(recipient, placement.venue_name, html);
			} else {
				console.log(`  Ingen e-postadresse for ${placement.venue_name} — hopper over sending`);
			}
		}
	}

	console.log('\nFerdig.');
}

main().catch(err => {
	console.error('Fatal error:', err);
	process.exit(1);
});
