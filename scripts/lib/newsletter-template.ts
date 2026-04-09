/**
 * HTML email template generator for Gåri weekly newsletter.
 * Funkis design system — inspired by social media slides.
 * Uses inline CSS (email client compatibility) and table layout.
 * MailerLite merge tag {$unsubscribe} handles unsubscribe links.
 */

const CATEGORY_COLORS: Record<string, string> = {
	music: '#AECDE8',
	culture: '#C5B8D9',
	theatre: '#E8B8C2',
	family: '#F5D49A',
	food: '#E8C4A0',
	festival: '#F5E0A0',
	sports: '#A8D4B8',
	nightlife: '#9BAED4',
	workshop: '#D4B89A',
	student: '#B8D4A8',
	tours: '#7FB8B8'
};

const CATEGORY_LABELS_NO: Record<string, string> = {
	music: 'Musikk', culture: 'Kultur', theatre: 'Teater', family: 'Familie',
	food: 'Mat & drikke', festival: 'Festival', sports: 'Sport', nightlife: 'Uteliv',
	workshop: 'Kurs', student: 'Student', tours: 'Turer'
};

const CATEGORY_LABELS_EN: Record<string, string> = {
	music: 'Music', culture: 'Culture', theatre: 'Theatre', family: 'Family',
	food: 'Food & Drink', festival: 'Festival', sports: 'Sports', nightlife: 'Nightlife',
	workshop: 'Workshop', student: 'Student', tours: 'Tours'
};

// Funkis palette
const FUNKIS = {
	iron: '#1C1C1E',
	red: '#C82D2D',
	redHover: '#A82424',
	green: '#1A6B35',
	white: '#FFFFFF',
	plaster: '#F5F3EE',
	plasterWarm: '#EDEAE3',
	textPrimary: '#141414',
	textSecondary: '#4D4D4D',
	textMuted: '#6B6862',
	borderSubtle: '#E8E8E4',
	shadow: '#B4BAC2',
};

export interface NewsletterEvent {
	slug: string;
	title: string;
	description: string;
	category: string;
	date_start: string;
	venue_name: string;
	bydel: string;
	price: string | number;
	ticket_url?: string;
	image_url?: string;
	promoted?: boolean;
}

export interface NewsletterData {
	lang: 'no' | 'en';
	events: NewsletterEvent[];
	subject: string;
	preheader: string;
	weekLabel: string;
	groupKey?: string;
	preferences?: {
		audience?: string;
		categories?: string;
		bydel?: string;
		price?: string;
	};
}

function formatDate(dateStart: string, lang: 'no' | 'en'): string {
	const d = new Date(dateStart);
	if (isNaN(d.getTime())) return '';
	return d.toLocaleDateString(lang === 'no' ? 'nb-NO' : 'en-GB', {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		timeZone: 'Europe/Oslo'
	});
}

function formatTime(dateStart: string): string {
	const d = new Date(dateStart);
	if (isNaN(d.getTime())) return '';
	// Hide midnight placeholder
	const h = d.getUTCHours();
	const m = d.getUTCMinutes();
	if (h === 0 && m === 0) return '';
	return d.toLocaleTimeString('nb-NO', {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Oslo'
	});
}

function escapeHtml(str: string): string {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Truncate at last whole word within limit, add ellipsis */
function truncateWord(str: string, max: number): string {
	if (str.length <= max) return str;
	const trimmed = str.slice(0, max);
	const lastSpace = trimmed.lastIndexOf(' ');
	const cut = lastSpace > max * 0.4 ? lastSpace : max - 1;
	return trimmed.slice(0, cut).replace(/[\s,–\-]+$/, '') + '\u2026';
}

function isFreeEvent(price: string | number | null | undefined): boolean {
	if (price === 0) return true;
	if (typeof price !== 'string' || price === '') return false;
	const normalized = price.trim().toLowerCase();
	if (normalized === '0' || normalized === 'free' || normalized === 'gratis') return true;
	return /^0\s*(kr|nok|,-|,00(\s*kr)?)$/i.test(normalized);
}

// ── Intro content ──

interface IntroContent {
	heading: string;
	body: string;
}

const AUDIENCE_LABELS_NO: Record<string, string> = {
	family: 'familien', student: 'studenter', voksen: 'kulturinteresserte',
	adult: 'voksne', tourist: 'deg som besøker Bergen', ungdom: 'ungdom'
};

const AUDIENCE_LABELS_EN: Record<string, string> = {
	family: 'families', student: 'students', voksen: 'culture lovers',
	adult: 'adults', tourist: 'visitors to Bergen', ungdom: 'young people'
};

function introContent(data: NewsletterData): IntroContent {
	const { lang, preferences, events } = data;
	const count = events.length;
	const isNo = lang === 'no';
	const labels = isNo ? CATEGORY_LABELS_NO : CATEGORY_LABELS_EN;

	const heading = isNo ? 'Hva skjer denne uken?' : 'What\u2019s on this week?';

	const audienceLabel = preferences?.audience
		? (isNo ? AUDIENCE_LABELS_NO : AUDIENCE_LABELS_EN)[preferences.audience] || ''
		: '';

	const catLabels: string[] = [];
	if (preferences?.categories) {
		for (const c of preferences.categories.split(',').slice(0, 3)) {
			const label = labels[c];
			if (label) catLabels.push(label.toLowerCase());
		}
	}

	const isFree = preferences?.price === 'free';
	const bydel = preferences?.bydel || '';

	let body: string;

	if (audienceLabel || catLabels.length > 0 || isFree || bydel) {
		const parts: string[] = [];
		if (audienceLabel) parts.push(isNo ? `for ${audienceLabel}` : `for ${audienceLabel}`);
		if (catLabels.length > 0) {
			const catStr = catLabels.length <= 2
				? catLabels.join(isNo ? ' og ' : ' and ')
				: catLabels.slice(0, -1).join(', ') + (isNo ? ' og ' : ' and ') + catLabels[catLabels.length - 1];
			parts.push(isNo ? `innen ${catStr}` : `in ${catStr}`);
		}
		if (bydel) parts.push(isNo ? `i ${bydel}` : `in ${bydel}`);

		const desc = parts.join(' ');
		const freeStr = isFree ? (isNo ? ', og alt er gratis' : ', and it\u2019s all free') : '';

		body = isNo
			? `${count} utvalgte arrangementer ${desc} denne uken${freeStr}.`
			: `${count} curated events ${desc} this week${freeStr}.`;
	} else {
		body = isNo
			? `${count} utvalgte arrangementer i Bergen denne uken.`
			: `${count} curated events in Bergen this week.`;
	}

	return { heading, body };
}

// ── Hero event card (full-width, image with dark gradient) ──

function heroEventCard(event: NewsletterEvent, lang: 'no' | 'en', baseUrl: string, utmBase: string): string {
	const color = CATEGORY_COLORS[event.category] || '#D8D8D4';
	const catLabel = (lang === 'no' ? CATEGORY_LABELS_NO : CATEGORY_LABELS_EN)[event.category] || event.category;
	const date = formatDate(event.date_start, lang);
	const time = formatTime(event.date_start);
	const eventUrl = `${baseUrl}/${lang}/events/${event.slug}?${utmBase}&utm_content=hero-${event.slug}`;
	const title = escapeHtml(truncateWord(event.title, 60));
	const venue = escapeHtml(truncateWord(event.venue_name, 35));
	const btnLabel = lang === 'no' ? 'Les mer' : 'Read more';
	const free = isFreeEvent(event.price);
	const freeLabel = lang === 'no' ? 'Trolig gratis' : 'Likely free';

	const promotedBadge = event.promoted
		? `<span style="display:inline-block;background:${FUNKIS.red};color:${FUNKIS.white};font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;margin-left:8px;">${lang === 'no' ? 'Fremhevet' : 'Featured'}</span>`
		: '';

	const freeBadge = free
		? `<span style="display:inline-block;background:${FUNKIS.green};color:${FUNKIS.white};font-size:11px;font-weight:600;padding:3px 10px;border-radius:20px;margin-left:8px;">${escapeHtml(freeLabel)}</span>`
		: '';

	// Hero: full-width image with gradient overlay text
	if (event.image_url) {
		return `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
			<tr>
				<td style="padding:0 24px 0;">
					<table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border-radius:8px;overflow:hidden;border-top:4px solid ${color};">
						<!-- Image with overlay -->
						<tr>
							<td background="${event.image_url}" bgcolor="${FUNKIS.iron}" width="552" height="280" style="background-image:url('${event.image_url}');background-size:cover;background-position:center;background-color:${FUNKIS.iron};border-radius:8px 8px 0 0;" valign="bottom">
								<!--[if gte mso 9]><v:rect xmlns:v="urn:schemas-microsoft-com:vml" fill="true" stroke="false" style="width:552px;height:280px;"><v:fill type="frame" src="${event.image_url}" /><v:textbox inset="0,0,0,0"><![endif]-->
								<div style="background:linear-gradient(to bottom, rgba(28,28,30,0) 30%, rgba(28,28,30,0.85) 100%);padding:100px 28px 24px;">
									<div style="margin:0 0 4px;">
										<span style="display:inline-block;background:${color};color:${FUNKIS.textPrimary};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;padding:4px 12px;border-radius:20px;font-family:'Arial Narrow',Arial,sans-serif;">${escapeHtml(catLabel)}</span>${promotedBadge}${freeBadge}
									</div>
									<p style="margin:8px 0 0;color:${FUNKIS.white};font-size:24px;font-weight:700;line-height:1.15;font-family:'Arial Narrow',Arial,sans-serif;letter-spacing:-0.01em;">${title}</p>
									<p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:14px;line-height:1.4;">
										${escapeHtml(date)}${time ? ` &middot; ${time}` : ''} &middot; ${venue}
									</p>
								</div>
								<!--[if gte mso 9]></v:textbox></v:rect><![endif]-->
							</td>
						</tr>
						<!-- CTA bar -->
						<tr>
							<td style="background:${FUNKIS.red};padding:0;" align="center">
								<table cellpadding="0" cellspacing="0" border="0" width="100%">
									<tr>
										<td style="padding:14px 28px;" align="center">
											<a href="${eventUrl}" style="color:${FUNKIS.white};text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.02em;">${btnLabel} &rarr;</a>
										</td>
									</tr>
								</table>
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>`;
	}

	// Fallback: no image — category-color background
	return `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
		<tr>
			<td style="padding:0 24px;">
				<table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border-radius:8px;overflow:hidden;border-top:4px solid ${color};">
					<tr>
						<td style="background:${color};padding:28px;">
							<div style="margin:0 0 4px;">
								<span style="display:inline-block;background:${FUNKIS.white};color:${FUNKIS.textPrimary};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;padding:4px 12px;border-radius:20px;font-family:'Arial Narrow',Arial,sans-serif;">${escapeHtml(catLabel)}</span>${promotedBadge}${freeBadge}
							</div>
							<p style="margin:8px 0 0;color:${FUNKIS.textPrimary};font-size:24px;font-weight:700;line-height:1.15;font-family:'Arial Narrow',Arial,sans-serif;">${title}</p>
							<p style="margin:6px 0 0;color:${FUNKIS.textSecondary};font-size:14px;line-height:1.4;">
								${escapeHtml(date)}${time ? ` &middot; ${time}` : ''} &middot; ${venue}
							</p>
						</td>
					</tr>
					<tr>
						<td style="background:${FUNKIS.red};padding:14px 28px;" align="center">
							<a href="${eventUrl}" style="color:${FUNKIS.white};text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.02em;">${btnLabel} &rarr;</a>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>`;
}

// ── Grid event card (2-column, category-colored left border) ──

function gridEventCard(event: NewsletterEvent, lang: 'no' | 'en', baseUrl: string, utmBase: string): string {
	const color = CATEGORY_COLORS[event.category] || '#D8D8D4';
	const catLabel = (lang === 'no' ? CATEGORY_LABELS_NO : CATEGORY_LABELS_EN)[event.category] || event.category;
	const date = formatDate(event.date_start, lang);
	const time = formatTime(event.date_start);
	const eventUrl = `${baseUrl}/${lang}/events/${event.slug}?${utmBase}&utm_content=event-${event.slug}`;
	const title = escapeHtml(truncateWord(event.title, 50));
	const venue = escapeHtml(truncateWord(event.venue_name, 30));
	const btnLabel = lang === 'no' ? 'Les mer' : 'Read more';
	const free = isFreeEvent(event.price);
	const freeLabel = lang === 'no' ? 'Trolig gratis' : 'Likely free';

	// Image or category-colored placeholder with centered label
	// Use dark text on light category colors for contrast
	const lightCategories = new Set(['family', 'festival', 'food', 'sports', 'student']);
	const placeholderTextColor = lightCategories.has(event.category) ? FUNKIS.textPrimary : FUNKIS.white;
	const placeholderShadow = lightCategories.has(event.category) ? 'none' : '0 1px 4px rgba(0,0,0,0.15)';

	const imageBlock = event.image_url
		? `<a href="${eventUrl}" style="text-decoration:none;display:block;line-height:0;"><img src="${event.image_url}" alt="" width="260" height="150" style="width:100%;height:150px;object-fit:cover;display:block;" /></a>`
		: `<a href="${eventUrl}" style="text-decoration:none;display:block;">
			<div style="width:100%;height:150px;background:${color};text-align:center;line-height:150px;">
				<span style="font-family:'Arial Narrow',Arial,sans-serif;font-size:14px;font-weight:700;color:${placeholderTextColor};text-transform:uppercase;letter-spacing:0.06em;text-shadow:${placeholderShadow};">${escapeHtml(catLabel)}</span>
			</div>
		</a>`;

	const badges: string[] = [];
	badges.push(`<span style="display:inline-block;background:${color};color:${FUNKIS.textPrimary};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;padding:3px 9px;border-radius:16px;font-family:'Arial Narrow',Arial,sans-serif;">${escapeHtml(catLabel)}</span>`);
	if (event.promoted) {
		badges.push(`<span style="display:inline-block;background:${FUNKIS.red};color:${FUNKIS.white};font-size:11px;font-weight:600;padding:3px 9px;border-radius:16px;margin-left:4px;">${lang === 'no' ? 'Fremhevet' : 'Featured'}</span>`);
	}
	if (free) {
		badges.push(`<span style="display:inline-block;background:${FUNKIS.green};color:${FUNKIS.white};font-size:11px;font-weight:600;padding:3px 9px;border-radius:16px;margin-left:4px;">${escapeHtml(freeLabel)}</span>`);
	}

	return `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border-radius:8px;overflow:hidden;background:${FUNKIS.white};border:1px solid ${FUNKIS.borderSubtle};border-top:4px solid ${color};">
			<tr>
				<td style="line-height:0;font-size:0;overflow:hidden;height:150px;">${imageBlock}</td>
			</tr>
			<tr>
				<td style="padding:12px 14px 14px;">
					<div style="margin:0 0 6px;">${badges.join('')}</div>
					<a href="${eventUrl}" style="text-decoration:none;">
						<p style="margin:0;color:${FUNKIS.textPrimary};font-size:15px;font-weight:700;line-height:1.3;">${title}</p>
					</a>
					<p style="margin:6px 0 0;color:${FUNKIS.textMuted};font-size:13px;line-height:1.4;">
						${escapeHtml(date)}${time ? ` &middot; ${time}` : ''}
					</p>
					<p style="margin:2px 0 0;color:${FUNKIS.textMuted};font-size:13px;">
						${venue}
					</p>
					<p style="margin:10px 0 0;">
						<a href="${eventUrl}" style="color:${FUNKIS.red};text-decoration:none;font-size:13px;font-weight:600;">${btnLabel} &rarr;</a>
					</p>
				</td>
			</tr>
		</table>`;
}

function buildEventGrid(events: NewsletterEvent[], lang: 'no' | 'en', baseUrl: string, utmBase: string): string {
	const cards = events.map(event => gridEventCard(event, lang, baseUrl, utmBase));
	const rows: string[] = [];

	for (let i = 0; i < cards.length; i += 2) {
		const left = cards[i];
		const right = cards[i + 1] || '';

		if (right) {
			rows.push(`<tr>
				<td width="50%" style="padding:0 6px 12px 0;vertical-align:top;">${left}</td>
				<td width="50%" style="padding:0 0 12px 6px;vertical-align:top;">${right}</td>
			</tr>`);
		} else {
			// Odd card — single column, half width
			rows.push(`<tr>
				<td width="50%" style="padding:0 6px 12px 0;vertical-align:top;">${left}</td>
				<td width="50%" style="padding:0 0 12px 6px;vertical-align:top;"></td>
			</tr>`);
		}
	}

	return `<table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
		${rows.join('\n')}
	</table>`;
}

// ── Shared layout pieces ──

function brandHeader(baseUrl: string, lang: 'no' | 'en', weekLabel: string, utmBase: string): string {
	return `<!-- Header -->
		<tr>
			<td style="background:${FUNKIS.white};padding:28px 32px 20px;">
				<table cellpadding="0" cellspacing="0" border="0" width="100%">
					<tr>
						<td>
							<a href="${baseUrl}/${lang}?${utmBase}" style="text-decoration:none;color:${FUNKIS.red};font-size:36px;font-weight:700;font-family:'Arial Narrow',Arial,sans-serif;letter-spacing:-0.02em;">G&aring;ri</a>
						</td>
						<td align="right" style="vertical-align:bottom;">
							<span style="color:${FUNKIS.textMuted};font-size:13px;font-weight:500;">${escapeHtml(weekLabel)}</span>
						</td>
					</tr>
				</table>
			</td>
		</tr>`;
}

function brandFooter(lang: 'no' | 'en', baseUrl: string, utmBase: string, prefsUrl: string): string {
	const footerText = lang === 'no'
		? 'Du mottar dette fordi du abonnerer p&aring; G&aring;ri sitt nyhetsbrev.'
		: 'You receive this because you subscribed to the G&aring;ri newsletter.';
	const unsubLabel = lang === 'no' ? 'Avslutt abonnement' : 'Unsubscribe';
	const managePrefsLabel = lang === 'no' ? 'Endre preferanser' : 'Manage preferences';
	const privacyLabel = lang === 'no' ? 'Personvern' : 'Privacy';

	return `<!-- Legal footer -->
		<tr>
			<td style="padding:16px 32px;background:${FUNKIS.plaster};text-align:center;">
				<p style="margin:0;color:${FUNKIS.textMuted};font-size:11px;line-height:1.7;">
					${footerText}<br />
					<a href="{$unsubscribe}" style="color:${FUNKIS.textMuted};text-decoration:underline;">${escapeHtml(unsubLabel)}</a> &middot;
					<a href="${prefsUrl}" style="color:${FUNKIS.textMuted};text-decoration:underline;">${escapeHtml(managePrefsLabel)}</a> &middot;
					<a href="${baseUrl}/${lang}/personvern?${utmBase}" style="color:${FUNKIS.textMuted};text-decoration:underline;">${escapeHtml(privacyLabel)}</a>
				</p>
			</td>
		</tr>`;
}

function emailShell(lang: 'no' | 'en', subject: string, preheader: string, innerRows: string): string {
	return `<!DOCTYPE html>
<html lang="${lang === 'no' ? 'nb' : 'en'}" xmlns="http://www.w3.org/1999/xhtml">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta http-equiv="X-UA-Compatible" content="IE=edge" />
	<title>${escapeHtml(subject)}</title>
	<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
	<style>
		body, table, td { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
		img { border: 0; outline: none; text-decoration: none; }
		a { color: ${FUNKIS.red}; }
		@media only screen and (max-width: 620px) {
			.email-container { width: 100% !important; }
			.grid-card { display: block !important; width: 100% !important; max-width: 100% !important; }
			.hero-img { height: 200px !important; }
			.section-pad { padding-left: 16px !important; padding-right: 16px !important; }
		}
	</style>
</head>
<body style="margin:0;padding:0;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;background:${FUNKIS.plaster};">
	<!-- Preheader -->
	<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(preheader)}</div>

	<!-- Wrapper -->
	<table cellpadding="0" cellspacing="0" border="0" width="100%" style="width:100%;min-width:100%;margin:0;padding:0;background:${FUNKIS.plaster};">
		<tr>
			<td align="center" style="padding:24px 16px;">
				<!-- Red frame (like social media slides) -->
				<table align="center" cellpadding="0" cellspacing="0" border="0" width="600" class="email-container" style="max-width:600px;width:100%;margin:0 auto;background:${FUNKIS.red};border-radius:12px;overflow:hidden;">
					<tr>
						<td style="padding:8px;">
							<!-- Inner container -->
							<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${FUNKIS.white};border-radius:6px;overflow:hidden;">
								${innerRows}
							</table>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>`;
}

// ── Main template ──

export function generateNewsletterHtml(data: NewsletterData): string {
	const baseUrl = 'https://gaari.no';
	const campaignSlug = data.groupKey
		? `weekly-${data.weekLabel}-${data.groupKey.replace(/[|,]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`
		: `weekly-${data.weekLabel}`;
	const utmBase = `utm_source=gaari&utm_medium=newsletter&utm_campaign=${encodeURIComponent(campaignSlug)}`;
	const intro = introContent(data);
	const lang = data.lang;
	const prefsUrl = `${baseUrl}/${lang}/nyhetsbrev/preferanser?email={$email}&token={$preference_token}&${utmBase}&utm_content=manage-prefs`;
	const subscribeUrl = `${baseUrl}/${lang}/about?${utmBase}&utm_content=subscribe#newsletter`;

	// All events come pre-sliced from the sender (MAX_EVENTS_PER_EMAIL)
	const allEvents = data.events;

	// Pick hero: promoted > broad-appeal category with image > any with image
	const heroCategories = new Set(['music', 'culture', 'festival', 'theatre', 'food']);
	const heroEvent =
		allEvents.find(e => e.promoted && e.image_url) ||
		allEvents.find(e => e.image_url && heroCategories.has(e.category)) ||
		allEvents.find(e => e.image_url) ||
		allEvents[0] || null;

	const gridEvents = heroEvent
		? allEvents.filter(e => e !== heroEvent)
		: [];

	const ctaLabel = lang === 'no' ? 'Se alle arrangementer' : 'See all events';
	const filterParams = new URLSearchParams();
	if (data.preferences?.audience) filterParams.set('audience', data.preferences.audience);
	if (data.preferences?.categories) filterParams.set('category', data.preferences.categories);
	if (data.preferences?.bydel) filterParams.set('bydel', data.preferences.bydel);
	if (data.preferences?.price) filterParams.set('price', data.preferences.price);
	const filterStr = filterParams.toString();
	const ctaUrl = `${baseUrl}/${lang}?${filterStr ? filterStr + '&' : ''}${utmBase}&utm_content=cta-all-events`;

	const forwardedText = lang === 'no' ? 'Fikk du dette videresendt?' : 'Was this forwarded to you?';
	const forwardedCta = lang === 'no' ? 'Meld deg p&aring; her' : 'Subscribe here';
	const shareText = lang === 'no' ? 'Kjenner du noen som vil like dette?' : 'Know someone who\u2019d enjoy this?';
	const shareCta = lang === 'no' ? 'Del nyhetsbrevet' : 'Share the newsletter';

	const innerRows = `
		${brandHeader(baseUrl, lang, data.weekLabel, utmBase)}

		<!-- Intro -->
		<tr>
			<td class="section-pad" style="padding:28px 32px 8px;">
				<p style="margin:0;color:${FUNKIS.textPrimary};font-size:24px;font-weight:700;line-height:1.2;font-family:'Arial Narrow',Arial,sans-serif;">${escapeHtml(intro.heading)}</p>
			</td>
		</tr>
		<tr>
			<td class="section-pad" style="padding:4px 32px 24px;">
				<p style="margin:0;color:${FUNKIS.textSecondary};font-size:15px;line-height:1.6;">${escapeHtml(intro.body)}</p>
			</td>
		</tr>

		<!-- Hero event -->
		<tr>
			<td style="padding:0 0 8px;">
				${heroEvent ? heroEventCard(heroEvent, lang, baseUrl, utmBase) : ''}
			</td>
		</tr>

		<!-- Event grid (2-column) on subtle background -->
		${gridEvents.length > 0 ? `<tr>
			<td style="padding:16px 24px 8px;background:${FUNKIS.plaster};">
				${buildEventGrid(gridEvents, lang, baseUrl, utmBase)}
			</td>
		</tr>` : ''}

		<!-- Main CTA -->
		<tr>
			<td style="padding:24px 32px 28px;" align="center">
				<table cellpadding="0" cellspacing="0" border="0">
					<tr>
						<td style="border-radius:8px;background:${FUNKIS.red};" align="center">
							<a href="${ctaUrl}" style="display:inline-block;padding:14px 48px;color:${FUNKIS.white};text-decoration:none;font-size:15px;font-weight:600;">${escapeHtml(ctaLabel)}</a>
						</td>
					</tr>
				</table>
			</td>
		</tr>

		<!-- Footer (share + forwarded + links combined) -->
		<tr>
			<td style="padding:20px 32px;border-top:1px solid ${FUNKIS.borderSubtle};background:${FUNKIS.plaster};text-align:center;">
				<p style="margin:0 0 12px;color:${FUNKIS.textSecondary};font-size:13px;">${shareText}
					<a href="mailto:?subject=${encodeURIComponent(data.subject)}&body=${encodeURIComponent((lang === 'no' ? 'Sjekk ut dette nyhetsbrevet fra Gåri: ' : 'Check out this newsletter from Gåri: ') + subscribeUrl)}" style="color:${FUNKIS.red};font-weight:600;text-decoration:underline;margin-left:4px;">${shareCta}</a>
				</p>
				<p style="margin:0 0 16px;color:${FUNKIS.textMuted};font-size:12px;">${forwardedText} <a href="${subscribeUrl}" style="color:${FUNKIS.red};text-decoration:underline;font-weight:600;">${forwardedCta}</a></p>
				<p style="margin:0 0 12px;">
					<a href="${baseUrl}/${lang}?${utmBase}" style="text-decoration:none;color:${FUNKIS.red};font-size:20px;font-weight:700;font-family:'Arial Narrow',Arial,sans-serif;letter-spacing:-0.02em;">G&aring;ri</a>
					<span style="display:block;color:${FUNKIS.textMuted};font-size:11px;margin-top:2px;">gaari.no</span>
				</p>
			</td>
		</tr>
		${brandFooter(lang, baseUrl, utmBase, prefsUrl)}`;

	return emailShell(lang, data.subject, data.preheader, innerRows);
}

// ── Quiet week template ──

export interface QuietWeekData {
	lang: 'no' | 'en';
	subject: string;
	weekLabel: string;
	groupKey?: string;
	preferences: {
		audience?: string;
		categories?: string;
		bydel?: string;
		price?: string;
	};
}

export function generateQuietWeekHtml(data: QuietWeekData): string {
	const baseUrl = 'https://gaari.no';
	const campaignSlug = data.groupKey
		? `weekly-${data.weekLabel}-${data.groupKey.replace(/[|,]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')}`
		: `weekly-${data.weekLabel}`;
	const utmBase = `utm_source=gaari&utm_medium=newsletter&utm_campaign=${encodeURIComponent(campaignSlug)}`;
	const lang = data.lang;
	const prefsUrl = `${baseUrl}/${lang}/nyhetsbrev/preferanser?email={$email}&token={$preference_token}&${utmBase}&utm_content=manage-prefs`;
	const browseUrl = `${baseUrl}/${lang}?${utmBase}&utm_content=cta-browse`;

	const heading = lang === 'no' ? 'Rolig uke?' : 'Quiet week?';
	const body = lang === 'no'
		? 'Ikke s&aring; mye som matcher filtrene dine denne uken. Men Bergen har alltid noe p&aring; gang!'
		: 'Not much matching your filters this week. But Bergen always has something going on!';
	const prefsLabel = lang === 'no' ? 'Endre preferansene dine' : 'Update your preferences';
	const browseLabel = lang === 'no' ? 'Se hva som skjer i Bergen' : 'See what\u2019s happening in Bergen';

	const innerRows = `
		${brandHeader(baseUrl, lang, data.weekLabel, utmBase)}

		<!-- Message -->
		<tr>
			<td class="section-pad" style="padding:32px 32px 0;">
				<p style="margin:0 0 12px;color:${FUNKIS.textPrimary};font-size:24px;font-weight:700;line-height:1.2;font-family:'Arial Narrow',Arial,sans-serif;">${heading}</p>
				<p style="margin:0;color:${FUNKIS.textSecondary};font-size:16px;line-height:1.6;">${body}</p>
			</td>
		</tr>

		<!-- Two CTA buttons -->
		<tr>
			<td class="section-pad" style="padding:28px 32px 32px;">
				<table cellpadding="0" cellspacing="0" border="0" width="100%">
					<tr>
						<td style="padding-bottom:12px;">
							<table cellpadding="0" cellspacing="0" border="0" width="100%">
								<tr>
									<td style="border-radius:8px;background:${FUNKIS.red};" align="center">
										<a href="${prefsUrl}" style="display:inline-block;padding:14px 0;width:100%;color:${FUNKIS.white};text-decoration:none;font-size:15px;font-weight:600;text-align:center;">${escapeHtml(prefsLabel)}</a>
									</td>
								</tr>
							</table>
						</td>
					</tr>
					<tr>
						<td>
							<table cellpadding="0" cellspacing="0" border="0" width="100%">
								<tr>
									<td style="border-radius:8px;border:2px solid ${FUNKIS.red};" align="center">
										<a href="${browseUrl}" style="display:inline-block;padding:14px 0;width:100%;color:${FUNKIS.red};text-decoration:none;font-size:15px;font-weight:600;text-align:center;">${escapeHtml(browseLabel)}</a>
									</td>
								</tr>
							</table>
						</td>
					</tr>
				</table>
			</td>
		</tr>

		${brandFooter(lang, baseUrl, utmBase, prefsUrl)}`;

	return emailShell(lang, data.subject, body, innerRows);
}

export function generateSubject(
	lang: 'no' | 'en',
	preferences?: { audience?: string; categories?: string; bydel?: string }
): string {
	if (!preferences?.audience && !preferences?.categories && !preferences?.bydel) {
		return lang === 'no' ? 'Hva skjer i Bergen denne uken?' : "What's happening in Bergen this week?";
	}

	const parts: string[] = [];

	if (preferences.categories) {
		const cats = preferences.categories.split(',');
		const labels = lang === 'no' ? CATEGORY_LABELS_NO : CATEGORY_LABELS_EN;
		if (cats.length === 1 && labels[cats[0]]) {
			parts.push(labels[cats[0]]);
		}
	}

	if (preferences.bydel) {
		parts.push(lang === 'no' ? `i ${preferences.bydel}` : `in ${preferences.bydel}`);
	}

	if (parts.length > 0) {
		const desc = parts.join(' ');
		return lang === 'no'
			? `${desc} denne uken`
			: `${desc} this week`;
	}

	const audienceLabels: Record<string, Record<string, string>> = {
		no: { family: 'Familieaktiviteter', student: 'Studentarrangementer', voksen: 'Kulturarrangementer', tourist: 'Events in Bergen', adult: 'Arrangementer for voksne' },
		en: { family: 'Family activities', student: 'Student events', voksen: 'Cultural events', tourist: 'Events in Bergen', adult: 'Events for adults' }
	};

	if (preferences.audience && audienceLabels[lang]?.[preferences.audience]) {
		return `${audienceLabels[lang][preferences.audience]} ${lang === 'no' ? 'denne uken' : 'this week'}`;
	}

	return lang === 'no' ? 'Hva skjer i Bergen denne uken?' : "What's happening in Bergen this week?";
}
