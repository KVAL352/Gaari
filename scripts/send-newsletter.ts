/**
 * Gåri Weekly Newsletter — sends personalized event digests via MailerLite campaigns.
 *
 * Usage:
 *   npx tsx send-newsletter.ts              # Send to all active subscribers
 *   npx tsx send-newsletter.ts --dry-run    # Generate HTML to disk, don't send
 *
 * Environment: MAILERLITE_API_KEY, PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { supabase } from './lib/supabase.js';
import { getOsloNow, toOsloDateStr, addDays } from '../src/lib/event-filters.js';
import { generateNewsletterHtml, generateQuietWeekHtml, generateSubject } from './lib/newsletter-template.js';
import type { GaariEvent } from '../src/lib/types.js';
import dotenv from 'dotenv';
import { resolve } from 'path';
import { writeFileSync, mkdirSync } from 'fs';

dotenv.config({ path: resolve(import.meta.dirname, '../.env') });

const MAILERLITE_API_KEY = process.env.MAILERLITE_API_KEY;
const SUMMARY_FILE = process.env.SUMMARY_FILE;
const DRY_RUN = process.argv.includes('--dry-run');
const MAX_EVENTS_PER_EMAIL = 12;
const MAILERLITE_BASE = 'https://connect.mailerlite.com/api';

// ── Types ──

interface MailerLiteSubscriber {
	id: string;
	email: string;
	status: string;
	fields: Record<string, string | null>;
}

interface PreferenceProfile {
	lang: 'no' | 'en';
	audience: string;
	categories: string;
	bydel: string;
	price: string;
}

interface GroupedSubscribers {
	profile: PreferenceProfile;
	emails: string[];
}

// ── MailerLite API helpers ──

async function mlFetch(path: string, options: RequestInit = {}): Promise<Response> {
	return fetch(`${MAILERLITE_BASE}${path}`, {
		...options,
		headers: {
			'Authorization': `Bearer ${MAILERLITE_API_KEY}`,
			'Content-Type': 'application/json',
			'Accept': 'application/json',
			...options.headers
		}
	});
}

async function fetchAllSubscribers(): Promise<MailerLiteSubscriber[]> {
	const subscribers: MailerLiteSubscriber[] = [];
	let cursor: string | null = null;

	while (true) {
		const params = new URLSearchParams({ 'filter[status]': 'active', limit: '100' });
		if (cursor) params.set('cursor', cursor);

		const res = await mlFetch(`/subscribers?${params}`);
		if (!res.ok) {
			console.error('MailerLite list subscribers failed:', res.status, await res.text());
			break;
		}

		const json = await res.json();
		const items = json.data as MailerLiteSubscriber[];
		subscribers.push(...items);

		// MailerLite uses cursor-based pagination
		const nextCursor = json.meta?.next_cursor;
		if (!nextCursor || items.length < 100) break;
		cursor = nextCursor;
	}

	return subscribers;
}

async function createAndSendCampaign(
	name: string,
	subject: string,
	htmlContent: string,
	subscriberEmails: string[]
): Promise<{ success: boolean; campaignId?: string; error?: string }> {
	// Step 1: Create a temporary group for this segment
	const groupName = `newsletter-${Date.now()}-${name.slice(0, 30)}`;
	const groupRes = await mlFetch('/groups', {
		method: 'POST',
		body: JSON.stringify({ name: groupName })
	});

	if (!groupRes.ok) {
		const err = await groupRes.text();
		return { success: false, error: `Failed to create group: ${err}` };
	}

	const group = await groupRes.json();
	const groupId = group.data.id;

	// Step 2: Import subscribers into the group
	const importRes = await mlFetch(`/subscribers/import`, {
		method: 'POST',
		body: JSON.stringify({
			subscribers: subscriberEmails.map(email => ({ email })),
			groups: [groupId],
			resubscribe: false
		})
	});

	if (!importRes.ok) {
		const err = await importRes.text();
		return { success: false, error: `Failed to import subscribers: ${err}` };
	}

	// Wait for import to process
	await delay(2000);

	// Step 3: Create campaign targeting the group
	const campaignRes = await mlFetch('/campaigns', {
		method: 'POST',
		body: JSON.stringify({
			name,
			type: 'regular',
			groups: [groupId],
			emails: [{
				subject,
				from_name: 'Gåri',
				from: 'noreply@gaari.no',
				content: htmlContent
			}]
		})
	});

	if (!campaignRes.ok) {
		const err = await campaignRes.text();
		return { success: false, error: `Failed to create campaign: ${err}` };
	}

	const campaign = await campaignRes.json();
	const campaignId = campaign.data.id;

	// Step 4: Schedule for immediate send
	const sendRes = await mlFetch(`/campaigns/${campaignId}/schedule`, {
		method: 'POST',
		body: JSON.stringify({ delivery: 'instant' })
	});

	if (!sendRes.ok) {
		const err = await sendRes.text();
		return { success: false, error: `Failed to schedule campaign: ${err}`, campaignId };
	}

	return { success: true, campaignId };
}

// ── Event fetching ──

async function fetchUpcomingEvents(): Promise<GaariEvent[]> {
	const now = getOsloNow();
	const todayStr = toOsloDateStr(now);
	const nextWeekStr = toOsloDateStr(addDays(now, 7));

	const { data, error } = await supabase
		.from('events')
		.select('id,slug,title_no,title_en,description_no,description_en,category,date_start,date_end,venue_name,address,bydel,price,ticket_url,image_url,age_group,language,status')
		.eq('status', 'approved')
		.gte('date_start', `${todayStr}T00:00:00`)
		.lte('date_start', `${nextWeekStr}T23:59:59`)
		.order('date_start', { ascending: true })
		.limit(200);

	if (error) {
		console.error('Supabase query failed:', error);
		return [];
	}

	return (data || []) as GaariEvent[];
}

// ── Event filtering (mirrors homepage logic) ──

function isFreeEvent(price: string | number | null): boolean {
	if (price === 0) return true;
	if (typeof price !== 'string' || price === '') return false;
	const normalized = price.trim().toLowerCase();
	if (normalized === '0' || normalized === 'free' || normalized === 'gratis') return true;
	return /^0\s*(kr|nok|,-|,00(\s*kr)?)$/i.test(normalized);
}

function filterEventsForProfile(events: GaariEvent[], profile: PreferenceProfile): GaariEvent[] {
	let filtered = [...events];

	// Audience filter (mirrors +page.svelte)
	if (profile.audience === 'family') {
		filtered = filtered.filter(e => e.age_group === 'family');
	} else if (profile.audience === 'student') {
		filtered = filtered.filter(e => e.age_group === 'students' || e.category === 'student');
	} else if (profile.audience === 'adult') {
		filtered = filtered.filter(e => e.age_group !== 'family' && e.category !== 'family');
	} else if (profile.audience === 'voksen') {
		const adultCategories = new Set(['culture', 'music', 'theatre', 'tours', 'food', 'workshop']);
		filtered = filtered.filter(e => adultCategories.has(e.category));
	} else if (profile.audience === 'tourist') {
		filtered = filtered.filter(e => e.language === 'en' || e.language === 'both');
	} else if (profile.audience === 'ungdom') {
		const youthCategories = new Set(['music', 'culture', 'sports', 'workshop', 'festival', 'student']);
		const youthRe = /\bungdom|\btenåring|\bfor\s+unge?\b|\bteen|\b1[0-5]\s*[-–]\s*1[5-9]\s*år|\bfra\s+1[0-5]\s+år/i;
		filtered = filtered.filter(e => {
			if (e.age_group === '18+') return false;
			if (e.category === 'nightlife' || e.category === 'food') return false;
			return youthCategories.has(e.category) || e.age_group === 'family' || e.category === 'family' || youthRe.test(e.title_no) || youthRe.test(e.description_no);
		});
	}

	// Category filter
	if (profile.categories) {
		const cats = profile.categories.split(',');
		filtered = filtered.filter(e => cats.includes(e.category));
	}

	// Bydel filter
	if (profile.bydel) {
		filtered = filtered.filter(e => e.bydel === profile.bydel);
	}

	// Price filter
	if (profile.price === 'free') {
		filtered = filtered.filter(e => isFreeEvent(e.price));
	} else if (profile.price === 'paid') {
		filtered = filtered.filter(e => !isFreeEvent(e.price));
	}

	return filtered;
}

// ── Subscriber grouping ──

function getProfile(sub: MailerLiteSubscriber): PreferenceProfile {
	return {
		lang: (sub.fields.preference_lang as 'no' | 'en') || 'no',
		audience: sub.fields.preference_audience || '',
		categories: sub.fields.preference_categories || '',
		bydel: sub.fields.preference_bydel || '',
		price: sub.fields.preference_price || ''
	};
}

function profileKey(p: PreferenceProfile): string {
	return `${p.lang}|${p.audience}|${p.categories}|${p.bydel}|${p.price}`;
}

function groupSubscribers(subscribers: MailerLiteSubscriber[]): Map<string, GroupedSubscribers> {
	const groups = new Map<string, GroupedSubscribers>();
	for (const sub of subscribers) {
		const profile = getProfile(sub);
		const key = profileKey(profile);
		const existing = groups.get(key);
		if (existing) {
			existing.emails.push(sub.email);
		} else {
			groups.set(key, { profile, emails: [sub.email] });
		}
	}
	return groups;
}

// ── Promoted venues ──

async function fetchPromotedVenueNames(): Promise<Set<string>> {
	const today = toOsloDateStr(getOsloNow());
	const { data, error } = await supabase
		.from('promoted_placements')
		.select('venue_name')
		.eq('active', true)
		.lte('start_date', today)
		.or(`end_date.is.null,end_date.gte.${today}`);

	if (error) {
		console.error('Failed to fetch promoted placements:', error.message);
		return new Set();
	}

	return new Set((data || []).map(r => r.venue_name));
}

// ── Helpers ──

function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function getWeekLabel(now: Date, lang: 'no' | 'en'): string {
	const weekNum = getISOWeek(now);
	return lang === 'no' ? `Uke ${weekNum}` : `Week ${weekNum}`;
}

function getISOWeek(date: Date): number {
	const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
	d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// ── Main ──

async function main() {
	console.log(`Gåri Newsletter — ${DRY_RUN ? 'DRY RUN' : 'LIVE SEND'}`);
	console.log('─'.repeat(50));

	if (!MAILERLITE_API_KEY) {
		console.error('MAILERLITE_API_KEY is not set');
		process.exit(1);
	}

	// 1. Fetch subscribers
	console.log('Fetching subscribers from MailerLite...');
	const subscribers = await fetchAllSubscribers();
	console.log(`  ${subscribers.length} active subscribers`);

	if (subscribers.length === 0) {
		console.log('No subscribers — nothing to send.');
		writeSummary({ subscribers: 0, groups: 0, sent: 0, errors: 0 });
		return;
	}

	// 2. Fetch events
	console.log('Fetching upcoming events from Supabase...');
	const allEvents = await fetchUpcomingEvents();
	console.log(`  ${allEvents.length} events in the next 7 days`);

	if (allEvents.length === 0) {
		console.log('No upcoming events — skipping newsletter.');
		writeSummary({ subscribers: subscribers.length, groups: 0, sent: 0, errors: 0, skipped: 'no events' });
		return;
	}

	// 2b. Fetch promoted venues
	console.log('Fetching promoted placements...');
	const promotedVenues = await fetchPromotedVenueNames();
	console.log(`  ${promotedVenues.size} promoted venues`);

	// 3. Group subscribers by preference profile
	const groups = groupSubscribers(subscribers);
	console.log(`  ${groups.size} preference groups`);

	// 4. Generate and send per group
	const now = getOsloNow();
	const weekLabel = getWeekLabel(now, 'no');
	let sentCount = 0;
	let errorCount = 0;

	for (const [key, group] of groups) {
		const { profile, emails } = group;
		const lang = profile.lang;

		// Filter events for this profile
		const events = filterEventsForProfile(allEvents, profile);

		// Prepare newsletter data
		const subject = events.length === 0
			? (lang === 'no' ? 'Rolig uke i Bergen?' : 'Quiet week in Bergen?')
			: generateSubject(lang, {
				audience: profile.audience,
				categories: profile.categories,
				bydel: profile.bydel
			});

		let html: string;

		if (events.length === 0) {
			// Quiet week — no events match their preferences
			html = generateQuietWeekHtml({
				lang,
				subject,
				weekLabel: getWeekLabel(now, lang),
				preferences: {
					audience: profile.audience,
					categories: profile.categories,
					bydel: profile.bydel,
					price: profile.price
				}
			});
		} else {
			// Pick 1 promoted event per paying venue, place them first
			const promotedPicks: GaariEvent[] = [];
			const usedVenues = new Set<string>();
			for (const e of events) {
				if (promotedVenues.has(e.venue_name) && !usedVenues.has(e.venue_name)) {
					promotedPicks.push(e);
					usedVenues.add(e.venue_name);
				}
			}
			const promotedIds = new Set(promotedPicks.map(e => e.id));
			const rest = events.filter(e => !promotedIds.has(e.id));
			const ordered = [...promotedPicks, ...rest];

			const newsletterEvents = ordered.slice(0, MAX_EVENTS_PER_EMAIL).map(e => ({
				slug: e.slug,
				title: lang === 'en' && e.title_en ? e.title_en : e.title_no,
				description: lang === 'en' && e.description_en ? e.description_en : e.description_no,
				category: e.category,
				date_start: e.date_start,
				venue_name: e.venue_name,
				bydel: e.bydel,
				price: e.price,
				ticket_url: e.ticket_url ?? undefined,
				image_url: e.image_url ?? undefined,
				promoted: promotedIds.has(e.id)
			}));

			const preheader = lang === 'no'
				? `${events.length} arrangementer i Bergen denne uken`
				: `${events.length} events in Bergen this week`;

			html = generateNewsletterHtml({
				lang,
				events: newsletterEvents,
				subject,
				preheader,
				weekLabel: getWeekLabel(now, lang),
				preferences: {
					audience: profile.audience,
					categories: profile.categories,
					bydel: profile.bydel,
					price: profile.price
				}
			});
		}

		if (DRY_RUN) {
			// Write HTML to disk for inspection
			const outDir = resolve(import.meta.dirname, '../.newsletter-preview');
			mkdirSync(outDir, { recursive: true });
			const safeKey = key.replace(/[|]/g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
			writeFileSync(resolve(outDir, `${safeKey}.html`), html);
			console.log(`  [${key}] ${emails.length} subscribers, ${events.length} events → preview saved`);
			console.log(`    Subject: ${subject}`);
			sentCount += emails.length;
		} else {
			// Create and send MailerLite campaign
			const campaignName = `Gåri ${weekLabel} — ${key.slice(0, 40)}`;
			console.log(`  [${key}] Sending to ${emails.length} subscribers (${events.length} events)...`);
			console.log(`    Subject: ${subject}`);

			const result = await createAndSendCampaign(campaignName, subject, html, emails);
			if (result.success) {
				console.log(`    ✓ Campaign ${result.campaignId} sent`);
				sentCount += emails.length;
			} else {
				console.error(`    ✗ Failed: ${result.error}`);
				errorCount++;
			}

			// Rate limit between campaigns
			await delay(1000);
		}
	}

	console.log('─'.repeat(50));
	console.log(`Done. ${sentCount} emails ${DRY_RUN ? 'previewed' : 'sent'}, ${errorCount} errors.`);

	writeSummary({
		subscribers: subscribers.length,
		groups: groups.size,
		sent: sentCount,
		errors: errorCount,
		dryRun: DRY_RUN
	});
}

function writeSummary(data: Record<string, unknown>) {
	if (SUMMARY_FILE) {
		writeFileSync(SUMMARY_FILE, JSON.stringify(data, null, 2));
	}
}

main().catch(err => {
	console.error('Newsletter script failed:', err);
	process.exit(1);
});
