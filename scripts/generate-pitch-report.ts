/**
 * Pitch Report — Clean, sales-focused venue report for outreach.
 *
 * Generates a 4-section HTML report to attach to the pitch email:
 * 1. Header with venue name + gratis prøveprosjekt
 * 2. "Dere på Gåri i dag" — events, which pages they appear on
 * 3. "Med promotert plassering" — what changes, recommended pages, mockup
 * 4. CTA — "svar ja, jeg setter opp alt"
 *
 * Usage:
 *   cd scripts
 *   npx tsx generate-pitch-report.ts "Forum Scene"
 *   npx tsx generate-pitch-report.ts "Hulen" --pages konserter,denne-helgen,uteliv,sentrum
 */

import * as fs from 'fs';
import * as path from 'path';
import { supabase } from './lib/supabase.js';

const TODAY = new Date().toISOString().slice(0, 10);

// ─── CLI Args ──────────────────────────────────────────────────────

const args = process.argv.slice(2);
const pagesIdx = args.indexOf('--pages');
const customPages = pagesIdx !== -1 ? args[pagesIdx + 1]?.split(',').map(s => s.trim()) : null;
const venueName = args.find(a => !a.startsWith('--') && a !== customPages?.join(','));

if (!venueName) {
	console.error('Usage: npx tsx generate-pitch-report.ts "Venue Name" [--pages side1,side2,side3,side4]');
	process.exit(1);
}

// ─── Page metadata ─────────────────────────────────────────────────

const PAGE_LABELS: Record<string, string> = {
	'konserter': 'Konserter denne uken',
	'denne-helgen': 'Denne helgen i Bergen',
	'uteliv': 'Uteliv i Bergen',
	'sentrum': 'Sentrum',
	'teater': 'Teater i Bergen',
	'voksen': 'For voksne',
	'mat-og-drikke': 'Mat og drikke',
	'regndagsguide': 'Regndagsguide',
	'familiehelg': 'Familiehelg',
	'studentkveld': 'Studentkveld',
	'utstillinger': 'Utstillinger i Bergen',
	'gratis': 'Gratis i Bergen',
	'i-kveld': 'I kveld',
	'i-dag': 'I dag i Bergen',
};

// ─── Segment detection ─────────────────────────────────────────────

function detectPages(categories: string[]): string[] {
	const cats = new Set(categories);
	if (cats.has('music') || cats.has('nightlife')) return ['konserter', 'denne-helgen', 'uteliv', 'sentrum'];
	if (cats.has('theatre')) return ['teater', 'denne-helgen', 'voksen', 'sentrum'];
	if (cats.has('food')) return ['mat-og-drikke', 'denne-helgen', 'sentrum', 'voksen'];
	if (cats.has('culture')) return ['utstillinger', 'regndagsguide', 'familiehelg', 'denne-helgen'];
	if (cats.has('family')) return ['familiehelg', 'denne-helgen', 'regndagsguide', 'gratis'];
	if (cats.has('workshop')) return ['regndagsguide', 'denne-helgen', 'voksen', 'sentrum'];
	if (cats.has('student')) return ['studentkveld', 'uteliv', 'denne-helgen', 'konserter'];
	if (cats.has('sports')) return ['denne-helgen', 'voksen', 'sentrum', 'i-dag'];
	return ['denne-helgen', 'sentrum', 'voksen', 'i-kveld'];
}

// ─── Data fetching ─────────────────────────────────────────────────

interface VenueEvent {
	title_no: string;
	date_start: string;
	category: string;
	image_url: string | null;
}

async function fetchVenueData() {
	const nowUtc = new Date().toISOString();

	const { data, error } = await supabase
		.from('events')
		.select('title_no, date_start, category, image_url')
		.eq('venue_name', venueName)
		.eq('status', 'approved')
		.or(`date_end.gte.${nowUtc},and(date_end.is.null,date_start.gte.${nowUtc})`)
		.order('date_start', { ascending: true })
		.limit(200);

	if (error) {
		console.error('Failed to fetch events:', error.message);
		process.exit(1);
	}

	return (data ?? []) as VenueEvent[];
}

// ─── HTML Generation ───────────────────────────────────────────────

const F = {
	iron: '#1C1C1E',
	red: '#C82D2D',
	white: '#FFFFFF',
	plaster: '#F5F3EE',
	bg: '#F8F8F6',
	text: '#141414',
	textSub: '#4D4D4D',
	textMuted: '#6B6862',
	border: '#E8E8E4',
};

const CAT_LABELS: Record<string, string> = {
	music: 'Musikk', culture: 'Kultur', theatre: 'Teater', family: 'Familie',
	food: 'Mat og drikke', festival: 'Festival', sports: 'Sport', nightlife: 'Uteliv',
	workshop: 'Kurs', student: 'Student', tours: 'Turer'
};

const CAT_COLORS: Record<string, string> = {
	music: '#AECDE8', culture: '#C5B8D9', theatre: '#E8B8C2', family: '#F5D49A',
	food: '#E8C4A0', festival: '#F5E0A0', sports: '#A8D4B8', nightlife: '#9BAED4',
	workshop: '#D4B89A', student: '#B8D4A8', tours: '#7FB8B8'
};

function esc(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function formatDate(dateStr: string): string {
	const d = new Date(dateStr);
	return d.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
}

function generateReport(events: VenueEvent[], pages: string[]): string {
	const eventCount = events.length;
	const categories = [...new Set(events.map(e => e.category))];

	// Pick a diverse set of events: avoid duplicate titles, prefer category variety
	const seen = new Set<string>();
	const diverse: VenueEvent[] = [];
	// First pass: one per title (avoids showing same show twice for different dates)
	for (const e of events) {
		const titleKey = e.title_no.toLowerCase().replace(/\s*\/\/.*$/, '').trim();
		if (!seen.has(titleKey) && diverse.length < 6) {
			seen.add(titleKey);
			diverse.push(e);
		}
	}
	// If we still have room, fill with remaining events
	if (diverse.length < 6) {
		for (const e of events) {
			if (diverse.length >= 6) break;
			if (!diverse.includes(e)) diverse.push(e);
		}
	}
	const showEvents = diverse;

	// Event rows
	const eventRows = showEvents.map((e, i) => `
		<tr style="${i % 2 === 1 ? `background:${F.bg};` : ''}">
			<td style="padding:10px 12px;border-bottom:1px solid ${F.border};font-size:14px;white-space:nowrap;color:${F.textSub};">${formatDate(e.date_start)}</td>
			<td style="padding:10px 12px;border-bottom:1px solid ${F.border};font-size:14px;color:${F.text};">${esc(e.title_no)}</td>
			<td style="padding:10px 12px;border-bottom:1px solid ${F.border};font-size:14px;">
				<span style="display:inline-block;padding:2px 10px;border-radius:20px;background:${CAT_COLORS[e.category] ?? '#ddd'};color:${F.text};font-size:12px;font-weight:600;">${CAT_LABELS[e.category] ?? e.category}</span>
			</td>
		</tr>`).join('');

	const moreText = eventCount > 6 ? `<p style="font-size:13px;color:${F.textMuted};font-style:italic;margin:8px 0 0;">+ ${eventCount - 6} arrangementer til</p>` : '';

	// Recommended pages
	const pageCards = pages.map(slug => {
		const label = PAGE_LABELS[slug] ?? slug;
		return `
			<div style="background:${F.white};border:1px solid ${F.border};border-radius:8px;padding:14px 16px;flex:1;min-width:120px;">
				<div style="font-size:14px;font-weight:600;color:${F.text};">${esc(label)}</div>
				<div style="font-size:12px;color:${F.textMuted};margin-top:2px;">gaari.no/no/${slug}</div>
			</div>`;
	}).join('');

	// Get up to 3 events with images for the hero collage — unique titles only
	const heroSeen = new Set<string>();
	const heroImages = events.filter(e => {
		if (!e.image_url) return false;
		const key = e.title_no.toLowerCase().replace(/\s*\/\/.*$/, '').trim();
		if (heroSeen.has(key)) return false;
		heroSeen.add(key);
		return true;
	}).slice(0, 3);
	const heroEvent = showEvents[0]; // Primary event for the mockup

	return `<!DOCTYPE html>
<html lang="nb">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Gåri — ${esc(venueName!)}</title>
</head>
<body style="margin:0;padding:0;background:${F.plaster};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">
<div style="background:${F.white};border-radius:12px;overflow:hidden;">

	<!-- Header with event images -->
	<div style="position:relative;">
		<!-- Image collage -->
		<div style="display:flex;height:200px;overflow:hidden;">
			${heroImages.length >= 3 ? `
			<div style="flex:2;overflow:hidden;"><img src="${heroImages[0].image_url}" alt="" style="width:100%;height:100%;object-fit:cover;"></div>
			<div style="flex:1;display:flex;flex-direction:column;">
				<div style="flex:1;overflow:hidden;"><img src="${heroImages[1].image_url}" alt="" style="width:100%;height:100%;object-fit:cover;"></div>
				<div style="flex:1;overflow:hidden;"><img src="${heroImages[2].image_url}" alt="" style="width:100%;height:100%;object-fit:cover;"></div>
			</div>` : heroImages.length >= 1 ? `
			<div style="flex:1;overflow:hidden;"><img src="${heroImages[0].image_url}" alt="" style="width:100%;height:100%;object-fit:cover;"></div>` : `
			<div style="flex:1;background:${F.iron};"></div>`}
		</div>
		<!-- Overlay with text -->
		<div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent, rgba(28,28,30,0.95));padding:24px 32px 20px;">
			<div style="font-family:'Arial Narrow',Arial,sans-serif;font-size:24px;font-weight:800;color:${F.white};letter-spacing:-0.02em;">GÅRI</div>
			<div style="font-size:22px;font-weight:700;color:${F.white};margin-top:4px;">${esc(venueName!)}</div>
		</div>
	</div>
	<!-- Badge under hero -->
	<div style="padding:16px 32px 0;">
		<span style="display:inline-block;background:${F.red};color:${F.white};padding:8px 20px;border-radius:6px;font-size:14px;font-weight:600;">Invitasjon til gratis prøveprosjekt</span>
	</div>

	<div style="padding:24px 32px 32px;">

		<!-- Section 1: Dere på Gåri i dag -->
		<h2 style="font-size:20px;font-weight:700;color:${F.text};margin:0 0 8px;">Dere på Gåri i dag</h2>
		<p style="font-size:14px;color:${F.textSub};margin:0 0 16px;">${esc(venueName!)} har ${eventCount} kommende arrangementer på gaari.no. Her er et utvalg:</p>

		<table style="width:100%;border-collapse:collapse;margin-bottom:8px;">
			<thead><tr>
				<th style="text-align:left;padding:8px 12px;border-bottom:2px solid ${F.red};font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:${F.textMuted};">Dato</th>
				<th style="text-align:left;padding:8px 12px;border-bottom:2px solid ${F.red};font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:${F.textMuted};">Arrangement</th>
				<th style="text-align:left;padding:8px 12px;border-bottom:2px solid ${F.red};font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:${F.textMuted};">Kategori</th>
			</tr></thead>
			<tbody>${eventRows}</tbody>
		</table>
		${moreText}

		<!-- Divider -->
		<div style="border-top:1px solid ${F.border};margin:28px 0;"></div>

		<!-- Section 2: Med promotert plassering -->
		<h2 style="font-size:20px;font-weight:700;color:${F.text};margin:0 0 8px;">Med promotert plassering</h2>
		<p style="font-size:14px;color:${F.textSub};margin:0 0 6px;">${esc(venueName!)} havner øverst på ${esc(PAGE_LABELS[pages[0]] ?? pages[0])} og tre andre sider. Hver fjerde besøkende på disse sidene ser arrangementene deres øverst (roteres automatisk mellom promoterte venues).</p>

		<div style="display:flex;flex-wrap:wrap;gap:10px;margin:16px 0 20px;">
			${pageCards}
		</div>

		<!-- How it looks on the collection page -->
		<div style="margin-bottom:24px;">
			<div style="font-size:15px;font-weight:600;color:${F.text};margin-bottom:12px;">Slik vises ${esc(venueName!)} på samlesiden</div>
			<!-- Mock: full page context -->
			<div style="background:${F.plaster};border-radius:12px;padding:12px;border:1px solid ${F.border};">
				<div style="background:${F.white};border-radius:8px;overflow:hidden;">

					<!-- Page header -->
					<div style="padding:20px 24px 8px;display:flex;justify-content:space-between;align-items:baseline;">
						<span style="color:${F.red};font-size:28px;font-weight:700;font-family:'Arial Narrow',Arial,sans-serif;letter-spacing:-0.02em;">Gåri</span>
						<span style="color:${F.textMuted};font-size:12px;">NO / EN</span>
					</div>

					<!-- Page title -->
					<div style="padding:12px 24px 16px;">
						<div style="font-size:22px;font-weight:700;color:${F.text};font-family:'Arial Narrow',Arial,sans-serif;line-height:1.2;">${esc(PAGE_LABELS[pages[0]] ?? pages[0])}</div>
						<div style="font-size:13px;color:${F.textSub};margin-top:4px;">Oppdatert daglig fra lokale kilder i Bergen</div>
					</div>

					<!-- Date group header -->
					<div style="padding:0 24px 8px;">
						<div style="font-size:13px;font-weight:600;color:${F.textMuted};text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid ${F.border};padding-bottom:6px;">${heroEvent ? formatDate(heroEvent.date_start) : 'I dag'}</div>
					</div>

					<!-- Event grid: 3 cards -->
					<div style="padding:8px 24px 16px;">
						<div style="display:flex;gap:10px;">
							<!-- Card 1: Promoted (venue's event with real data) -->
							<div style="flex:1;background:${F.white};border-radius:12px;overflow:hidden;border:1px solid ${F.border};box-shadow:0 1px 3px rgba(0,0,0,0.06);">
								${heroEvent?.image_url ? `<div style="position:relative;height:90px;overflow:hidden;">
									<img src="${heroEvent.image_url}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;">
									<span style="position:absolute;top:6px;right:6px;background:${F.white};border:1px solid ${F.red};border-radius:20px;padding:1px 8px;font-size:9px;font-weight:600;color:${F.text};">Fremhevet</span>
								</div>` : ''}
								<div style="padding:10px;">
									<div style="font-size:12px;font-weight:600;color:${F.text};line-height:1.3;margin-bottom:3px;">${esc(heroEvent?.title_no ?? '')}</div>
									<div style="font-size:10px;color:${F.textSub};margin-bottom:2px;">${heroEvent ? formatDate(heroEvent.date_start) : ''}</div>
									<div style="font-size:10px;color:${F.textSub};margin-bottom:4px;">${esc(venueName!)}, Sentrum</div>
									<div style="font-size:10px;color:${F.red};font-weight:500;">Les mer &rarr;</div>
								</div>
								<div style="border-top:1px solid ${F.border};padding:6px 10px;display:flex;justify-content:space-between;align-items:center;">
									<span style="font-size:10px;font-weight:600;color:${F.text};">Fra 350 kr</span>
									<span style="display:inline-block;padding:1px 7px;border-radius:20px;background:${CAT_COLORS[heroEvent?.category ?? 'music'] ?? '#ddd'};color:${F.text};font-size:9px;font-weight:600;">${CAT_LABELS[heroEvent?.category ?? 'music'] ?? ''}</span>
								</div>
							</div>
							<!-- Card 2: Regular event (no badge) -->
							<div style="flex:1;background:${F.white};border-radius:12px;overflow:hidden;border:1px solid ${F.border};opacity:0.45;">
								<div style="height:90px;background:#e0ddd8;"></div>
								<div style="padding:10px;">
									<div style="height:8px;background:#e0ddd8;border-radius:4px;width:75%;margin-bottom:5px;"></div>
									<div style="height:6px;background:#e0ddd8;border-radius:4px;width:50%;margin-bottom:3px;"></div>
									<div style="height:6px;background:#e0ddd8;border-radius:4px;width:60%;margin-bottom:6px;"></div>
									<div style="height:5px;background:${F.red};opacity:0.3;border-radius:3px;width:35%;"></div>
								</div>
								<div style="border-top:1px solid ${F.border};padding:6px 10px;display:flex;justify-content:space-between;align-items:center;">
									<div style="height:5px;background:#e0ddd8;border-radius:3px;width:30%;"></div>
									<div style="height:12px;background:#C5B8D9;border-radius:10px;width:35%;opacity:0.5;"></div>
								</div>
							</div>
							<!-- Card 3: Regular event (no badge) -->
							<div style="flex:1;background:${F.white};border-radius:12px;overflow:hidden;border:1px solid ${F.border};opacity:0.45;">
								<div style="height:90px;background:#e0ddd8;"></div>
								<div style="padding:10px;">
									<div style="height:8px;background:#e0ddd8;border-radius:4px;width:65%;margin-bottom:5px;"></div>
									<div style="height:6px;background:#e0ddd8;border-radius:4px;width:45%;margin-bottom:3px;"></div>
									<div style="height:6px;background:#e0ddd8;border-radius:4px;width:55%;margin-bottom:6px;"></div>
									<div style="height:5px;background:${F.red};opacity:0.3;border-radius:3px;width:35%;"></div>
								</div>
								<div style="border-top:1px solid ${F.border};padding:6px 10px;display:flex;justify-content:space-between;align-items:center;">
									<div style="height:5px;background:#e0ddd8;border-radius:3px;width:40%;"></div>
									<div style="height:12px;background:#F5D49A;border-radius:10px;width:30%;opacity:0.5;"></div>
								</div>
							</div>
						</div>
					</div>

				</div>
			</div>
		</div>

		<!-- How it looks in the newsletter -->
		<div style="margin-bottom:8px;">
			<div style="font-size:15px;font-weight:600;color:${F.text};margin-bottom:12px;">Slik vises ${esc(venueName!)} i nyhetsbrevet</div>
			<!-- Mock: full newsletter structure -->
			<div style="background:${F.plaster};border-radius:12px;padding:12px;border:1px solid ${F.border};">
				<div style="background:${F.white};border-radius:8px;overflow:hidden;">

					<!-- Header: Gåri + uke -->
					<div style="padding:20px 24px 8px;display:flex;justify-content:space-between;align-items:baseline;">
						<span style="color:${F.red};font-size:32px;font-weight:700;font-family:'Arial Narrow',Arial,sans-serif;letter-spacing:-0.02em;">Gåri</span>
						<span style="color:${F.textMuted};font-size:13px;">Uke 16</span>
					</div>

					<!-- Intro text -->
					<div style="padding:12px 24px 20px;">
						<div style="font-size:20px;font-weight:700;color:${F.text};font-family:'Arial Narrow',Arial,sans-serif;line-height:1.2;margin-bottom:4px;">Denne ukens utvalg</div>
						<div style="font-size:13px;color:${F.textSub};line-height:1.5;">Konserter, uteliv og kultur i Bergen denne uken.</div>
					</div>

					<!-- Hero event card (promoted) -->
					<div style="padding:0 24px;">
						<div style="border-radius:8px;overflow:hidden;border-top:4px solid ${CAT_COLORS[heroEvent?.category ?? 'music'] ?? '#ddd'};">
							${heroEvent?.image_url ? `
							<div style="background-image:url('${heroEvent.image_url}');background-size:cover;background-position:center;height:180px;">
								<div style="background:linear-gradient(to bottom, rgba(28,28,30,0) 30%, rgba(28,28,30,0.85) 100%);height:100%;display:flex;flex-direction:column;justify-content:flex-end;">
									<div style="padding:0 20px 16px;">
										<div style="margin-bottom:6px;">
											<span style="display:inline-block;background:${CAT_COLORS[heroEvent?.category ?? 'music'] ?? '#ddd'};color:${F.text};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;padding:3px 10px;border-radius:20px;font-family:'Arial Narrow',Arial,sans-serif;">${CAT_LABELS[heroEvent?.category ?? 'music'] ?? ''}</span>
											<span style="display:inline-block;background:${F.red};color:${F.white};font-size:10px;font-weight:600;padding:3px 9px;border-radius:20px;margin-left:4px;">Fremhevet</span>
										</div>
										<div style="color:${F.white};font-size:20px;font-weight:700;line-height:1.15;font-family:'Arial Narrow',Arial,sans-serif;">${esc(heroEvent?.title_no ?? '')}</div>
										<div style="color:rgba(255,255,255,0.8);font-size:12px;margin-top:4px;">${heroEvent ? formatDate(heroEvent.date_start) : ''} · ${esc(venueName!)}</div>
									</div>
								</div>
							</div>` : ''}
							<div style="background:${F.red};padding:12px 20px;text-align:center;">
								<span style="color:${F.white};font-size:13px;font-weight:600;letter-spacing:0.02em;">Les mer &rarr;</span>
							</div>
						</div>
					</div>

					<!-- Grid section on plaster background -->
					<div style="background:${F.plaster};padding:16px 24px;margin-top:16px;">
						<div style="display:flex;gap:10px;">
							<!-- Grid card 1 -->
							<div style="flex:1;border-radius:8px;overflow:hidden;background:${F.white};border:1px solid ${F.border};border-top:4px solid #C5B8D9;opacity:0.45;">
								<div style="height:75px;background:#ddd;"></div>
								<div style="padding:8px 10px;">
									<div style="margin-bottom:4px;"><span style="display:inline-block;background:#C5B8D9;border-radius:10px;padding:2px 7px;font-size:9px;font-weight:700;color:${F.text};">KULTUR</span></div>
									<div style="height:7px;background:#e0ddd8;border-radius:3px;width:80%;margin-bottom:4px;"></div>
									<div style="height:5px;background:#e0ddd8;border-radius:3px;width:55%;margin-bottom:3px;"></div>
									<div style="height:5px;background:#e0ddd8;border-radius:3px;width:45%;"></div>
								</div>
							</div>
							<!-- Grid card 2 -->
							<div style="flex:1;border-radius:8px;overflow:hidden;background:${F.white};border:1px solid ${F.border};border-top:4px solid #F5D49A;opacity:0.45;">
								<div style="height:75px;background:#ddd;"></div>
								<div style="padding:8px 10px;">
									<div style="margin-bottom:4px;"><span style="display:inline-block;background:#F5D49A;border-radius:10px;padding:2px 7px;font-size:9px;font-weight:700;color:${F.text};">FAMILIE</span></div>
									<div style="height:7px;background:#e0ddd8;border-radius:3px;width:70%;margin-bottom:4px;"></div>
									<div style="height:5px;background:#e0ddd8;border-radius:3px;width:60%;margin-bottom:3px;"></div>
									<div style="height:5px;background:#e0ddd8;border-radius:3px;width:40%;"></div>
								</div>
							</div>
						</div>
					</div>

					<!-- CTA button -->
					<div style="padding:20px 24px;text-align:center;">
						<span style="display:inline-block;background:${F.red};color:${F.white};padding:12px 40px;border-radius:8px;font-size:14px;font-weight:600;">Se alle arrangementer</span>
					</div>

				</div>
			</div>
		</div>

		<!-- Divider -->
		<div style="border-top:1px solid ${F.border};margin:28px 0;"></div>

		<!-- Section 3: Hva du får med Standard -->
		<h2 style="font-size:20px;font-weight:700;color:${F.text};margin:0 0 16px;">Hva ${esc(venueName!)} får med Standard</h2>

		<!-- Feature list -->
		<div style="margin-bottom:20px;">
			<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid ${F.border};">
				<div style="background:${F.red};color:${F.white};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0;">1</div>
				<div>
					<div style="font-size:14px;font-weight:600;color:${F.text};">Topp 3-plassering på 4 sider</div>
					<div style="font-size:13px;color:${F.textMuted};margin-top:2px;">Hver fjerde besøkende på de utvalgte sidene ser dere helt øverst</div>
				</div>
			</div>
			<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid ${F.border};">
				<div style="background:${F.red};color:${F.white};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0;">2</div>
				<div>
					<div style="font-size:14px;font-weight:600;color:${F.text};">Promotert i ukentlig nyhetsbrev</div>
					<div style="font-size:13px;color:${F.textMuted};margin-top:2px;">Arrangementet deres vises som hero-kort med bilde øverst i nyhetsbrevet</div>
				</div>
			</div>
			<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;border-bottom:1px solid ${F.border};">
				<div style="background:${F.red};color:${F.white};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0;">3</div>
				<div>
					<div style="font-size:14px;font-weight:600;color:${F.text};">Månedlig rapport</div>
					<div style="font-size:13px;color:${F.textMuted};margin-top:2px;">Se hvor mange som har sett og klikket videre til deres side</div>
				</div>
			</div>
			<div style="display:flex;align-items:flex-start;gap:12px;padding:12px 0;">
				<div style="background:${F.red};color:${F.white};width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0;">4</div>
				<div>
					<div style="font-size:14px;font-weight:600;color:${F.text};">Null arbeid for dere</div>
					<div style="font-size:13px;color:${F.textMuted};margin-top:2px;">Alt settes opp og vedlikeholdes av meg. Dere trenger bare å si ja.</div>
				</div>
			</div>
		</div>

		<!-- Offer box -->
		<div style="background:${F.iron};color:${F.white};border-radius:8px;padding:20px 24px;">
			<div style="font-size:16px;font-weight:700;margin-bottom:4px;">Gratis i 3 måneder</div>
			<div style="font-size:14px;color:#a0a0a0;">Standard-programmet koster normalt 3 500 kr/mnd. Etter prøveperioden velger dere selv om dere vil fortsette. Helt uforpliktende.</div>
		</div>

		<!-- Divider -->
		<div style="border-top:1px solid ${F.border};margin:28px 0;"></div>

		<!-- Section 4: CTA -->
		<div style="text-align:center;padding:8px 0 16px;">
			<div style="font-size:18px;font-weight:700;color:${F.text};margin-bottom:8px;">Svar ja på eposten</div>
			<div style="font-size:14px;color:${F.textSub};">Jeg setter opp alt. Dere trenger ikke gjøre noe.</div>
		</div>

	</div>

	<!-- Footer -->
	<div style="padding:16px 32px;background:${F.bg};border-top:1px solid ${F.border};text-align:center;">
		<div style="font-size:12px;color:${F.textMuted};">
			Kjersti Valland Therkildsen · <a href="https://gaari.no" style="color:${F.red};text-decoration:none;">gaari.no</a> · <a href="https://www.ba.no/s/5-8-3360284" style="color:${F.red};text-decoration:none;">Omtalt i BA</a>
		</div>
	</div>

</div>
</div>
</body>
</html>`;
}

// ─── Main ──────────────────────────────────────────────────────────

async function main() {
	console.log(`\nGåri Pitch Report — ${venueName}`);
	console.log('─'.repeat(40));

	const events = await fetchVenueData();
	console.log(`  ${events.length} kommende arrangementer`);

	if (events.length === 0) {
		console.log(`  Ingen kommende arrangementer for "${venueName}" — avbryter.`);
		process.exit(0);
	}

	const categories = [...new Set(events.map(e => e.category))];
	console.log(`  Kategorier: ${categories.join(', ')}`);

	const pages = customPages ?? detectPages(categories);
	console.log(`  Anbefalte sider: ${pages.join(', ')}`);

	const html = generateReport(events, pages);

	const outDir = path.resolve(process.cwd(), '../.prospect-reports');
	if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

	const filename = `pitch-${venueName.toLowerCase().replace(/[^a-z0-9æøå]/g, '-')}-${TODAY}.html`;
	const filePath = path.join(outDir, filename);
	fs.writeFileSync(filePath, html, 'utf-8');
	console.log(`  Lagret: ${filePath}`);
	console.log('\nFerdig.');
}

main().catch(err => {
	console.error('Fatal error:', err);
	process.exit(1);
});
