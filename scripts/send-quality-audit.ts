/**
 * Monthly Quality Audit — Automated Codebase Health Check
 *
 * Checks llms.txt coverage, FAQ completeness, meta descriptions,
 * source count consistency, scraper health, content freshness,
 * collection integrity, and accessibility patterns. Sends an HTML
 * report email to the admin.
 *
 * Usage:
 *   cd scripts && npx tsx send-quality-audit.ts
 *   cd scripts && npx tsx send-quality-audit.ts --dry-run
 *
 * Env vars:
 *   PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
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

const MONTH_NAMES_NO = ['januar', 'februar', 'mars', 'april', 'mai', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'desember'];
const now = new Date();
const MONTH_YEAR = `${MONTH_NAMES_NO[now.getMonth()]} ${now.getFullYear()}`;
const MONTH_YEAR_CAP = MONTH_YEAR.charAt(0).toUpperCase() + MONTH_YEAR.slice(1);

// Root of the project (one level up from scripts/)
const ROOT = path.resolve(import.meta.dirname, '..');

// ─── Types ──────────────────────────────────────────────────────────

interface AuditCheck {
	name: string;
	status: 'pass' | 'warning' | 'fail';
	details: string;
}

interface ContentFreshness {
	totalEvents: number;
	eventsLast7d: number;
	eventsLast30d: number;
	templateDescriptionPct: number;
}

interface AuditData {
	date: string;
	month: string;
	checks: AuditCheck[];
	scraperHealth: ScraperHealthStatus[];
	freshness: ContentFreshness | null;
}

// ─── Check 1: llms.txt coverage ────────────────────────────────────

function checkLlmsTxt(): AuditCheck[] {
	console.log('📄 Checking llms.txt coverage...');
	const checks: AuditCheck[] = [];

	const llmsPath = path.join(ROOT, 'static', 'llms.txt');
	if (!fs.existsSync(llmsPath)) {
		checks.push({ name: 'llms.txt exists', status: 'fail', details: 'File not found at static/llms.txt' });
		return checks;
	}

	const content = fs.readFileSync(llmsPath, 'utf-8');

	// Extract all collection slugs from collections.ts
	const collectionsPath = path.join(ROOT, 'src', 'lib', 'collections.ts');
	const collectionsContent = fs.readFileSync(collectionsPath, 'utf-8');
	const slugMatches = collectionsContent.match(/slug:\s*'([^']+)'/g) || [];
	const allSlugs = slugMatches.map(m => m.match(/slug:\s*'([^']+)'/)?.[1]).filter(Boolean) as string[];

	// Check each collection slug has a URL in llms.txt
	const missingSlugs: string[] = [];
	for (const slug of allSlugs) {
		if (!content.includes(`/${slug}`)) {
			missingSlugs.push(slug);
		}
	}

	checks.push({
		name: 'llms.txt collection coverage',
		status: missingSlugs.length === 0 ? 'pass' : 'fail',
		details: missingSlugs.length === 0
			? `All ${allSlugs.length} collection slugs found`
			: `Missing ${missingSlugs.length} slugs: ${missingSlugs.join(', ')}`
	});

	// Check static pages
	const requiredPages = ['/no/about', '/en/about', '/no/datainnsamling', '/en/datainnsamling', '/no/personvern', '/en/personvern', '/no/tilgjengelighet', '/en/tilgjengelighet'];
	const missingPages = requiredPages.filter(p => !content.includes(p));
	checks.push({
		name: 'llms.txt static pages',
		status: missingPages.length === 0 ? 'pass' : 'warning',
		details: missingPages.length === 0
			? `All ${requiredPages.length} static pages found`
			: `Missing: ${missingPages.join(', ')}`
	});

	return checks;
}

// ─── Check 2: FAQ completeness ─────────────────────────────────────

function checkFaqCompleteness(): AuditCheck[] {
	console.log('❓ Checking FAQ completeness...');
	const checks: AuditCheck[] = [];

	const collectionsPath = path.join(ROOT, 'src', 'lib', 'collections.ts');
	const content = fs.readFileSync(collectionsPath, 'utf-8');

	// Extract slugs and count FAQ items per collection
	// We look for faq blocks and count { q: occurrences
	const slugMatches = content.match(/slug:\s*'([^']+)'/g) || [];
	const allSlugs = slugMatches.map(m => m.match(/slug:\s*'([^']+)'/)?.[1]).filter(Boolean) as string[];

	// Find FAQ blocks for each collection by splitting on slug patterns
	const shortFaqs: string[] = [];
	const parityIssues: string[] = [];

	for (const slug of allSlugs) {
		const slugIdx = content.indexOf(`slug: '${slug}'`);
		if (slugIdx === -1) continue;

		// Find the faq block after this slug
		const faqIdx = content.indexOf('faq:', slugIdx);
		if (faqIdx === -1 || faqIdx - slugIdx > 3000) continue; // no faq or too far away

		// Find next slug or end of array to bound our search
		const nextSlugIdx = content.indexOf("slug: '", slugIdx + 10);
		const faqBlock = content.slice(faqIdx, nextSlugIdx !== -1 ? nextSlugIdx : faqIdx + 5000);

		// Count NO and EN FAQ items
		const noMatch = faqBlock.match(/no:\s*\[/);
		const enMatch = faqBlock.match(/en:\s*\[/);
		if (!noMatch || !enMatch) continue;

		const noStart = faqBlock.indexOf('no: [');
		const noEnd = faqBlock.indexOf('],', noStart);
		const noBlock = faqBlock.slice(noStart, noEnd);
		const noCount = (noBlock.match(/\{\s*q:/g) || []).length;

		const enStart = faqBlock.indexOf('en: [');
		const enEnd = faqBlock.indexOf(']', enStart + 5);
		const enBlock = faqBlock.slice(enStart, enEnd);
		const enCount = (enBlock.match(/\{\s*q:/g) || []).length;

		if (noCount < 5 || enCount < 5) {
			shortFaqs.push(`${slug} (NO:${noCount}, EN:${enCount})`);
		}
		if (noCount !== enCount) {
			parityIssues.push(`${slug} (NO:${noCount} != EN:${enCount})`);
		}
	}

	checks.push({
		name: 'FAQ minimum 5 items',
		status: shortFaqs.length === 0 ? 'pass' : 'warning',
		details: shortFaqs.length === 0
			? 'All collections have 5+ FAQ items per language'
			: `${shortFaqs.length} below minimum: ${shortFaqs.join(', ')}`
	});

	checks.push({
		name: 'FAQ NO/EN parity',
		status: parityIssues.length === 0 ? 'pass' : 'fail',
		details: parityIssues.length === 0
			? 'All collections have matching NO/EN FAQ counts'
			: `Parity issues: ${parityIssues.join(', ')}`
	});

	return checks;
}

// ─── Check 3: Meta description coverage ────────────────────────────

function checkMetaDescriptions(): AuditCheck[] {
	console.log('📝 Checking meta descriptions...');
	const checks: AuditCheck[] = [];

	const routeChecks: Array<{ name: string; path: string }> = [
		{ name: 'Homepage', path: 'src/routes/[lang]/+page.svelte' },
		{ name: 'About', path: 'src/routes/[lang]/about/+page.svelte' },
		{ name: 'Datainnsamling', path: 'src/routes/[lang]/datainnsamling/+page.svelte' },
		{ name: 'Personvern', path: 'src/routes/[lang]/personvern/+page.svelte' },
		{ name: 'Tilgjengelighet', path: 'src/routes/[lang]/tilgjengelighet/+page.svelte' },
		{ name: 'Submit', path: 'src/routes/[lang]/submit/+page.svelte' },
		{ name: 'Newsletter prefs', path: 'src/routes/[lang]/nyhetsbrev/preferanser/+page.svelte' },
		{ name: 'Collection', path: 'src/routes/[lang]/[collection]/+page.svelte' },
		{ name: 'Event detail', path: 'src/routes/[lang]/events/[slug]/+page.svelte' },
	];

	const missing: string[] = [];
	for (const route of routeChecks) {
		const filePath = path.join(ROOT, route.path);
		if (!fs.existsSync(filePath)) continue;
		const content = fs.readFileSync(filePath, 'utf-8');
		if (!content.includes('name="description"') && !content.includes("name='description'")) {
			missing.push(route.name);
		}
	}

	checks.push({
		name: 'Meta descriptions',
		status: missing.length === 0 ? 'pass' : 'warning',
		details: missing.length === 0
			? `All ${routeChecks.length} routes have meta descriptions`
			: `Missing on: ${missing.join(', ')}`
	});

	return checks;
}

// ─── Check 4: Source count consistency ──────────────────────────────

function checkSourceCounts(): AuditCheck[] {
	console.log('🔢 Checking source count consistency...');
	const checks: AuditCheck[] = [];

	const filesToCheck = [
		{ name: 'llms.txt', path: 'static/llms.txt' },
		{ name: 'homepage', path: 'src/routes/[lang]/+page.svelte' },
		{ name: 'datainnsamling', path: 'src/routes/[lang]/datainnsamling/+page.svelte' },
	];

	const counts: Array<{ name: string; count: number }> = [];

	for (const file of filesToCheck) {
		const filePath = path.join(ROOT, file.path);
		if (!fs.existsSync(filePath)) continue;
		const content = fs.readFileSync(filePath, 'utf-8');

		// Look for patterns like "52 sources", "52 kilder", "52 active", "52 lokale"
		const matches = content.match(/(\d+)\s+(?:independent\s+)?(?:sources|kilder|active|lokale\s+kilder)/gi) || [];
		for (const m of matches) {
			const num = parseInt(m.match(/(\d+)/)?.[1] || '0');
			if (num >= 40 && num <= 100) { // reasonable range for source counts
				counts.push({ name: file.name, count: num });
				break; // one per file
			}
		}
	}

	const uniqueCounts = new Set(counts.map(c => c.count));
	checks.push({
		name: 'Source count consistency',
		status: uniqueCounts.size <= 1 ? 'pass' : 'fail',
		details: uniqueCounts.size <= 1
			? `All files report ${counts[0]?.count ?? '?'} sources`
			: `Inconsistent: ${counts.map(c => `${c.name}=${c.count}`).join(', ')}`
	});

	return checks;
}

// ─── Check 5: Scraper health ───────────────────────────────────────

async function checkScraperHealth(): Promise<ScraperHealthStatus[]> {
	console.log('🔍 Checking scraper health...');
	try {
		return await analyzeScraperHealth(supabase);
	} catch (err: any) {
		console.error(`  Scraper health failed: ${err.message}`);
		return [];
	}
}

// ─── Check 6: Content freshness ────────────────────────────────────

async function checkContentFreshness(): Promise<ContentFreshness | null> {
	console.log('📊 Checking content freshness...');
	try {
		const nowIso = new Date().toISOString();
		const d7 = new Date(Date.now() - 7 * 86400000).toISOString();
		const d30 = new Date(Date.now() - 30 * 86400000).toISOString();

		const [total, last7, last30, templateCount] = await Promise.all([
			supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'approved').gte('date_start', nowIso),
			supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'approved').gte('created_at', d7),
			supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'approved').gte('created_at', d30),
			supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'approved').gte('date_start', nowIso).or('description_no.is.null,description_no.eq.'),
		]);

		const totalCount = total.count ?? 0;
		const noDescCount = templateCount.count ?? 0;
		const templatePct = totalCount > 0 ? Math.round((noDescCount / totalCount) * 100) : 0;

		return {
			totalEvents: totalCount,
			eventsLast7d: last7.count ?? 0,
			eventsLast30d: last30.count ?? 0,
			templateDescriptionPct: templatePct,
		};
	} catch (err: any) {
		console.error(`  Content freshness failed: ${err.message}`);
		return null;
	}
}

// ─── Check 7: Collection page health ───────────────────────────────

function checkCollectionHealth(): AuditCheck[] {
	console.log('📚 Checking collection health...');
	const checks: AuditCheck[] = [];

	const collectionsPath = path.join(ROOT, 'src', 'lib', 'collections.ts');
	const content = fs.readFileSync(collectionsPath, 'utf-8');

	const slugMatches = content.match(/slug:\s*'([^']+)'/g) || [];
	const allSlugs = slugMatches.map(m => m.match(/slug:\s*'([^']+)'/)?.[1]).filter(Boolean) as string[];

	const missingFields: string[] = [];
	for (const slug of allSlugs) {
		const slugIdx = content.indexOf(`slug: '${slug}'`);
		const nextSlugIdx = content.indexOf("slug: '", slugIdx + 10);
		const block = content.slice(slugIdx, nextSlugIdx !== -1 ? nextSlugIdx : slugIdx + 5000);

		const required = ['title:', 'description:', 'editorial:', 'quickAnswer:'];
		for (const field of required) {
			if (!block.includes(field)) {
				missingFields.push(`${slug} missing ${field.replace(':', '')}`);
			}
		}
	}

	checks.push({
		name: 'Collection completeness',
		status: missingFields.length === 0 ? 'pass' : 'fail',
		details: missingFields.length === 0
			? `All ${allSlugs.length} collections have required fields`
			: `Issues: ${missingFields.join('; ')}`
	});

	return checks;
}

// ─── Check 8: Accessibility spot checks ────────────────────────────

function checkAccessibility(): AuditCheck[] {
	console.log('♿ Checking accessibility patterns...');
	const checks: AuditCheck[] = [];

	// Check FilterBar for min-height
	const filterBarPath = path.join(ROOT, 'src', 'lib', 'components', 'FilterBar.svelte');
	if (fs.existsSync(filterBarPath)) {
		const content = fs.readFileSync(filterBarPath, 'utf-8');
		const selectCount = (content.match(/<select/g) || []).length;
		const minHeightCount = (content.match(/min-h-\[44px\]/g) || []).length;
		checks.push({
			name: 'FilterBar touch targets',
			status: minHeightCount >= selectCount ? 'pass' : 'warning',
			details: `${minHeightCount}/${selectCount} selects have min-h-[44px]`
		});
	}

	// Check submit form for image dimensions
	const submitPath = path.join(ROOT, 'src', 'routes', '[lang]', 'submit', '+page.svelte');
	if (fs.existsSync(submitPath)) {
		const content = fs.readFileSync(submitPath, 'utf-8');
		const imgTags = content.match(/<img[^>]*>/g) || [];
		const missingDims = imgTags.filter(tag => !tag.includes('width='));
		checks.push({
			name: 'Image dimensions',
			status: missingDims.length === 0 ? 'pass' : 'warning',
			details: missingDims.length === 0
				? 'All images have width/height attributes'
				: `${missingDims.length} images missing width/height`
		});
	}

	// Check for skip link
	const headerPath = path.join(ROOT, 'src', 'lib', 'components', 'Header.svelte');
	if (fs.existsSync(headerPath)) {
		const content = fs.readFileSync(headerPath, 'utf-8');
		checks.push({
			name: 'Skip link present',
			status: content.includes('skip-link') ? 'pass' : 'fail',
			details: content.includes('skip-link') ? 'Skip link found in Header' : 'No skip link in Header'
		});
	}

	return checks;
}

// ─── HTML template ─────────────────────────────────────────────────

function renderHtml(data: AuditData): string {
	const passCount = data.checks.filter(c => c.status === 'pass').length;
	const warnCount = data.checks.filter(c => c.status === 'warning').length;
	const failCount = data.checks.filter(c => c.status === 'fail').length;
	const total = data.checks.length;

	const statusColor = (s: string) => {
		if (s === 'pass') return 'background:#D1FAE5;color:#065F46';
		if (s === 'warning') return 'background:#FEF3C7;color:#92400E';
		return 'background:#FEE2E2;color:#991B1B';
	};

	const statusLabel = (s: string) => s === 'pass' ? 'OK' : s === 'warning' ? 'Advarsel' : 'Feil';

	const scoreColor = failCount > 0 ? '#991B1B' : warnCount > 0 ? '#92400E' : '#065F46';

	const checksTable = data.checks.map(c => `
		<tr>
			<td style="padding:8px;border:1px solid #ddd">${c.name}</td>
			<td style="padding:8px;border:1px solid #ddd;text-align:center"><span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:12px;font-weight:600;${statusColor(c.status)}">${statusLabel(c.status)}</span></td>
			<td style="padding:8px;border:1px solid #ddd;font-size:13px">${c.details}</td>
		</tr>
	`).join('');

	// Scraper health summary
	const broken = data.scraperHealth.filter(s => s.status === 'broken');
	const warnings = data.scraperHealth.filter(s => s.status === 'warning');
	const scraperSummary = data.scraperHealth.length > 0
		? `<h2 style="font-size:16px;margin:24px 0 12px">Scraper-helse</h2>
		   <p style="margin:0 0 12px;font-size:14px;color:#4D4D4D">${broken.length} nede, ${warnings.length} advarsler, ${data.scraperHealth.filter(s => s.status === 'healthy').length} friske</p>
		   ${broken.length > 0 ? `<p style="font-size:13px;color:#991B1B"><strong>Nede:</strong> ${broken.map(s => s.scraper).join(', ')}</p>` : ''}
		   ${warnings.length > 0 ? `<p style="font-size:13px;color:#92400E"><strong>Advarsler:</strong> ${warnings.map(s => s.scraper).join(', ')}</p>` : ''}`
		: '';

	// Content freshness
	const freshnessSummary = data.freshness
		? `<h2 style="font-size:16px;margin:24px 0 12px">Innholdsfriskhet</h2>
		   <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
		   <tr><td style="padding:6px 8px;border:1px solid #ddd">Aktive arrangementer</td><td style="padding:6px 8px;border:1px solid #ddd;text-align:right;font-weight:600">${data.freshness.totalEvents}</td></tr>
		   <tr><td style="padding:6px 8px;border:1px solid #ddd">Nye siste 7 dager</td><td style="padding:6px 8px;border:1px solid #ddd;text-align:right;font-weight:600">${data.freshness.eventsLast7d}</td></tr>
		   <tr><td style="padding:6px 8px;border:1px solid #ddd">Nye siste 30 dager</td><td style="padding:6px 8px;border:1px solid #ddd;text-align:right;font-weight:600">${data.freshness.eventsLast30d}</td></tr>
		   <tr><td style="padding:6px 8px;border:1px solid #ddd">Uten AI-beskrivelse</td><td style="padding:6px 8px;border:1px solid #ddd;text-align:right;font-weight:600">${data.freshness.templateDescriptionPct}%</td></tr>
		   </table>`
		: '';

	return `<!DOCTYPE html>
<html lang="no">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#141414;background:#fff">
	<div style="border-bottom:4px solid #C82D2D;padding-bottom:12px;margin-bottom:24px">
		<h1 style="margin:0;font-size:22px">Gåri — Månedlig kvalitetssjekk</h1>
		<p style="margin:4px 0 0;color:#666;font-size:14px">${MONTH_YEAR_CAP}</p>
	</div>

	<div style="background:#f9f9f9;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center">
		<p style="margin:0;font-size:32px;font-weight:700;color:${scoreColor}">${passCount}/${total}</p>
		<p style="margin:4px 0 0;font-size:14px;color:#666">sjekker bestått</p>
		${failCount > 0 ? `<p style="margin:8px 0 0;font-size:13px;color:#991B1B">${failCount} feil</p>` : ''}
		${warnCount > 0 ? `<p style="margin:4px 0 0;font-size:13px;color:#92400E">${warnCount} advarsler</p>` : ''}
	</div>

	<h2 style="font-size:16px;margin:0 0 12px">Sjekkresultater</h2>
	<table style="width:100%;border-collapse:collapse;margin-bottom:24px">
		<thead><tr style="background:#f5f5f5">
			<th style="text-align:left;padding:8px;border:1px solid #ddd">Sjekk</th>
			<th style="text-align:center;padding:8px;border:1px solid #ddd;width:80px">Status</th>
			<th style="text-align:left;padding:8px;border:1px solid #ddd">Detaljer</th>
		</tr></thead>
		<tbody>${checksTable}</tbody>
	</table>

	${scraperSummary}
	${freshnessSummary}

	<div style="border-top:1px solid #ddd;padding-top:12px;margin-top:24px;color:#999;font-size:12px">
		<p style="margin:0">Automatisk generert den 1. i måneden. <a href="${SITE_URL}/admin/corrections" style="color:#C82D2D">Åpne admin</a></p>
	</div>
</body>
</html>`;
}

// ─── Email sending ─────────────────────────────────────────────────

async function sendEmail(html: string, issueCount: number): Promise<boolean> {
	const key = process.env.RESEND_API_KEY;
	if (!key) {
		console.error('Cannot send email: no RESEND_API_KEY');
		return false;
	}

	const subject = issueCount > 0
		? `[Månedlig kvalitetssjekk] ${MONTH_YEAR_CAP} — ${issueCount} funn`
		: `[Månedlig kvalitetssjekk] ${MONTH_YEAR_CAP} — Alt i orden`;

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

function writeSummary(checks: AuditCheck[], emailSent: boolean) {
	const summaryFile = process.env.SUMMARY_FILE;
	if (!summaryFile) return;

	const summary = {
		date: TODAY,
		month: MONTH_YEAR,
		total: checks.length,
		pass: checks.filter(c => c.status === 'pass').length,
		warnings: checks.filter(c => c.status === 'warning').length,
		failures: checks.filter(c => c.status === 'fail').length,
		emailSent
	};

	fs.writeFileSync(summaryFile, JSON.stringify(summary, null, 2));
	console.log(`📋 Summary written to ${summaryFile}`);
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
	console.log(`\n📋 Gåri Quality Audit — ${MONTH_YEAR_CAP}`);
	if (DRY_RUN) console.log('   (dry run)\n');

	// Parallel data collection
	const [llmsChecks, faqChecks, metaChecks, sourceChecks, scraperHealth, freshness, collectionChecks, a11yChecks] =
		await Promise.all([
			checkLlmsTxt(),
			checkFaqCompleteness(),
			checkMetaDescriptions(),
			checkSourceCounts(),
			checkScraperHealth(),
			checkContentFreshness(),
			checkCollectionHealth(),
			checkAccessibility(),
		]);

	const allChecks = [...llmsChecks, ...faqChecks, ...metaChecks, ...sourceChecks, ...collectionChecks, ...a11yChecks];
	const issues = allChecks.filter(c => c.status !== 'pass');

	console.log(`\n📊 Results: ${allChecks.length - issues.length} pass, ${issues.length} issues`);
	for (const check of allChecks) {
		const icon = check.status === 'pass' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
		console.log(`  ${icon} ${check.name}: ${check.details}`);
	}

	const auditData: AuditData = {
		date: TODAY,
		month: MONTH_YEAR_CAP,
		checks: allChecks,
		scraperHealth,
		freshness,
	};

	const html = renderHtml(auditData);

	if (DRY_RUN) {
		const outDir = path.join(import.meta.dirname, '.audit-preview');
		if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
		const outPath = path.join(outDir, `audit-${TODAY}.html`);
		fs.writeFileSync(outPath, html);
		console.log(`\n📄 Preview written to: ${outPath}`);
		writeSummary(allChecks, false);
	} else {
		const sent = await sendEmail(html, issues.length);
		writeSummary(allChecks, sent);
	}
}

main().catch(err => {
	console.error('Fatal error:', err);
	process.exit(1);
});
