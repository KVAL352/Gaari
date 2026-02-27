/**
 * HTML email template generator for Gåri weekly newsletter.
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
	tours: '#A8CCCC'
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
	return d.toLocaleTimeString('nb-NO', {
		hour: '2-digit',
		minute: '2-digit',
		timeZone: 'Europe/Oslo'
	});
}

function escapeHtml(str: string): string {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function introText(data: NewsletterData): string {
	const { lang, preferences, events } = data;
	const count = events.length;

	if (!preferences?.audience && !preferences?.categories && !preferences?.bydel) {
		return lang === 'no'
			? `Vi har funnet ${count} arrangementer for deg denne uken.`
			: `We found ${count} events for you this week.`;
	}

	const parts: string[] = [];
	if (preferences.categories) {
		const cats = preferences.categories.split(',');
		const labels = lang === 'no' ? CATEGORY_LABELS_NO : CATEGORY_LABELS_EN;
		if (cats.length === 1) {
			parts.push(labels[cats[0]]?.toLowerCase() || cats[0]);
		}
	}
	if (preferences.bydel) {
		parts.push(lang === 'no' ? `i ${preferences.bydel}` : `in ${preferences.bydel}`);
	}

	const desc = parts.length > 0 ? parts.join(' ') : '';
	return lang === 'no'
		? `${count} ${desc ? desc + '-' : ''}arrangementer denne uken.`
		: `${count} ${desc ? desc + ' ' : ''}events this week.`;
}

function eventCardCell(event: NewsletterEvent, lang: 'no' | 'en', baseUrl: string, utmParams: string): string {
	const color = CATEGORY_COLORS[event.category] || '#D8D8D4';
	const catLabel = (lang === 'no' ? CATEGORY_LABELS_NO : CATEGORY_LABELS_EN)[event.category] || event.category;
	const date = formatDate(event.date_start, lang);
	const time = formatTime(event.date_start);
	const eventUrl = `${baseUrl}/${lang}/events/${event.slug}?${utmParams}`;
	const title = escapeHtml(event.title.length > 45 ? event.title.slice(0, 42) + '...' : event.title);
	const venue = escapeHtml(event.venue_name.length > 25 ? event.venue_name.slice(0, 22) + '...' : event.venue_name);
	const btnLabel = lang === 'no' ? 'Les mer' : 'Read more';

	const imageBlock = event.image_url
		? `<a href="${eventUrl}" style="text-decoration:none;"><img src="${event.image_url}" alt="" width="176" height="120" style="width:100%;height:120px;object-fit:cover;border-radius:6px 6px 0 0;display:block;" /></a>`
		: `<div style="width:100%;height:120px;border-radius:6px 6px 0 0;background:${color};"></div>`;

	const promotedBadge = event.promoted
		? `<div style="position:absolute;top:6px;right:6px;background:#FFFFFF;border:1px solid #C82D2D;border-radius:9999px;padding:2px 8px;font-size:9px;font-weight:600;color:#C82D2D;line-height:1.4;">${lang === 'no' ? 'Fremhevet' : 'Featured'}</div>`
		: '';

	const borderStyle = event.promoted ? 'border:1.5px solid #C82D2D' : 'border:1px solid #E8E8E4';

	return `<td width="33%" valign="top" style="width:33.33%;padding:0 6px 16px;">
		<div style="background:#FFFFFF;${borderStyle};border-radius:6px;overflow:hidden;">
			<div style="line-height:0;font-size:0;overflow:hidden;height:120px;position:relative;">${imageBlock}${promotedBadge}</div>
			<div style="padding:10px 12px 14px;">
				<span style="display:inline-block;padding:2px 7px;border-radius:9999px;background:${color};color:#141414;font-size:10px;font-weight:600;letter-spacing:0.02em;">${escapeHtml(catLabel)}</span>
				<div style="height:44px;overflow:hidden;">
					<p style="color:#141414;font-size:14px;font-weight:700;line-height:1.3;margin:8px 0 0;">${title}</p>
				</div>
				<p style="color:#6B6862;font-size:11px;margin:6px 0 0;line-height:1.4;">
					${escapeHtml(date)}${time ? ` · ${time}` : ''}
				</p>
				<p style="color:#6B6862;font-size:11px;margin:3px 0 0;">
					&#128205; ${venue}
				</p>
				<table cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:10px;">
					<tr>
						<td style="border-radius:5px;background:#C82D2D;" align="center">
							<a href="${eventUrl}" style="display:inline-block;padding:7px 0;width:100%;color:#FFFFFF;text-decoration:none;font-size:12px;font-weight:600;text-align:center;">${btnLabel}</a>
						</td>
					</tr>
				</table>
			</div>
		</div>
	</td>`;
}

function emptyCell(): string {
	return `<td width="33%" style="width:33.33%;padding:0 6px 16px;">&nbsp;</td>`;
}

function buildEventGrid(events: NewsletterEvent[], lang: 'no' | 'en', baseUrl: string, utmParams: string): string {
	const rows: string[] = [];
	for (let i = 0; i < events.length; i += 3) {
		const cells = [
			eventCardCell(events[i], lang, baseUrl, utmParams),
			events[i + 1] ? eventCardCell(events[i + 1], lang, baseUrl, utmParams) : emptyCell(),
			events[i + 2] ? eventCardCell(events[i + 2], lang, baseUrl, utmParams) : emptyCell()
		];
		rows.push(`<tr>${cells.join('')}</tr>`);
	}
	return rows.join('\n');
}

export function generateNewsletterHtml(data: NewsletterData): string {
	const baseUrl = 'https://gaari.no';
	const utmParams = `utm_source=gaari&utm_medium=newsletter&utm_campaign=weekly-${data.weekLabel}`;
	const intro = introText(data);
	const maxEvents = 9;
	const events = data.events.slice(0, maxEvents);
	const lang = data.lang;

	const eventGrid = buildEventGrid(events, lang, baseUrl, utmParams);

	const ctaLabel = lang === 'no' ? 'Se alle arrangementer' : 'See all events';

	// Build CTA URL with subscriber's filter preferences
	const filterParams = new URLSearchParams();
	if (data.preferences?.audience) filterParams.set('audience', data.preferences.audience);
	if (data.preferences?.categories) filterParams.set('category', data.preferences.categories);
	if (data.preferences?.bydel) filterParams.set('bydel', data.preferences.bydel);
	if (data.preferences?.price) filterParams.set('price', data.preferences.price);
	const filterStr = filterParams.toString();
	const ctaUrl = `${baseUrl}/${lang}?${filterStr ? filterStr + '&' : ''}${utmParams}`;

	const footerText = lang === 'no'
		? 'Du mottar dette fordi du abonnerer på Gåri sitt nyhetsbrev.'
		: 'You receive this because you subscribed to the Gåri newsletter.';
	const unsubLabel = lang === 'no' ? 'Avslutt abonnement' : 'Unsubscribe';
	const prefsLabel = lang === 'no' ? 'Endre preferanser' : 'Manage preferences';
	const privacyLabel = lang === 'no' ? 'Personvern' : 'Privacy';
	const prefsUrl = `${baseUrl}/${lang}/nyhetsbrev/preferanser?email={$email}&${utmParams}`;

	return `<!DOCTYPE html>
<html lang="${lang === 'no' ? 'nb' : 'en'}" xmlns="http://www.w3.org/1999/xhtml">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta http-equiv="X-UA-Compatible" content="IE=edge" />
	<title>${escapeHtml(data.subject)}</title>
	<!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
	<style>
		body, table, td { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
		img { border: 0; outline: none; text-decoration: none; }
		a { color: #C82D2D; }
	</style>
</head>
<body style="margin:0;padding:0;background:#F4F4F2;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
	<!-- Preheader -->
	<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${escapeHtml(data.preheader)}</div>

	<!-- Wrapper -->
	<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F4F4F2;">
		<tr>
			<td align="center" style="padding:24px 16px;">
				<!-- Container -->
				<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:8px;overflow:hidden;">

					<!-- Red accent bar -->
					<tr>
						<td style="height:4px;background:#C82D2D;font-size:0;line-height:0;">&nbsp;</td>
					</tr>

					<!-- Header -->
					<tr>
						<td style="padding:32px 32px 0;">
							<table cellpadding="0" cellspacing="0" border="0" width="100%">
								<tr>
									<td>
										<a href="${baseUrl}/${lang}?${utmParams}" style="text-decoration:none;color:#141414;font-size:32px;font-weight:700;font-family:'Arial Narrow',Arial,sans-serif;letter-spacing:-0.02em;">Gåri</a>
									</td>
									<td align="right" style="color:#6B6862;font-size:13px;">
										${escapeHtml(data.weekLabel)}
									</td>
								</tr>
							</table>
						</td>
					</tr>

					<!-- Intro -->
					<tr>
						<td style="padding:16px 32px 28px;">
							<p style="margin:0;color:#4D4D4D;font-size:16px;line-height:1.6;">${escapeHtml(intro)}</p>
						</td>
					</tr>

					<!-- Events (3-column grid) -->
					<tr>
						<td style="padding:20px 18px 4px;background:#F8F8F6;">
							<table cellpadding="0" cellspacing="0" border="0" width="100%" style="table-layout:fixed;">
								${eventGrid}
							</table>
						</td>
					</tr>

					<!-- CTA -->
					<tr>
						<td style="padding:32px;" align="center">
							<table cellpadding="0" cellspacing="0" border="0">
								<tr>
									<td style="border-radius:8px;background:#C82D2D;" align="center">
										<a href="${ctaUrl}" style="display:inline-block;padding:14px 40px;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;">${escapeHtml(ctaLabel)}</a>
									</td>
								</tr>
							</table>
						</td>
					</tr>

					<!-- Footer -->
					<tr>
						<td style="padding:24px 32px;border-top:1px solid #E8E8E4;background:#F8F8F6;">
							<p style="margin:0;color:#6B6862;font-size:12px;line-height:1.7;">
								${escapeHtml(footerText)}<br />
								<a href="{$unsubscribe}" style="color:#C82D2D;text-decoration:underline;">${escapeHtml(unsubLabel)}</a> &middot;
								<a href="${prefsUrl}" style="color:#C82D2D;text-decoration:underline;">${escapeHtml(prefsLabel)}</a> &middot;
								<a href="${baseUrl}/${lang}/personvern?${utmParams}" style="color:#C82D2D;text-decoration:underline;">${escapeHtml(privacyLabel)}</a>
							</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>`;
}

export interface QuietWeekData {
	lang: 'no' | 'en';
	subject: string;
	weekLabel: string;
	preferences: {
		audience?: string;
		categories?: string;
		bydel?: string;
		price?: string;
	};
}

export function generateQuietWeekHtml(data: QuietWeekData): string {
	const baseUrl = 'https://gaari.no';
	const utmParams = `utm_source=gaari&utm_medium=newsletter&utm_campaign=weekly-${data.weekLabel}`;
	const lang = data.lang;

	const heading = lang === 'no'
		? 'Heisann du!'
		: 'Hey there!';

	const body = lang === 'no'
		? 'Her går det ikke i så mye denne uken med filtrene du har valgt. Men fortvil ikke — Bergen har alltid nokka på gang!'
		: 'Not much going on this week with your current filters. But don\'t worry — Bergen always has something happening!';

	const prefsLabel = lang === 'no' ? 'Endre preferansene dine' : 'Update your preferences';
	const browseLabel = lang === 'no' ? 'Se hva som skjer i Bergen' : 'See what\'s happening in Bergen';

	const prefsUrl = `${baseUrl}/${lang}/nyhetsbrev/preferanser?email={$email}&${utmParams}`;
	const browseUrl = `${baseUrl}/${lang}?${utmParams}`;

	const footerText = lang === 'no'
		? 'Du mottar dette fordi du abonnerer på Gåri sitt nyhetsbrev.'
		: 'You receive this because you subscribed to the Gåri newsletter.';
	const unsubLabel = lang === 'no' ? 'Avslutt abonnement' : 'Unsubscribe';
	const managePrefsLabel = lang === 'no' ? 'Endre preferanser' : 'Manage preferences';
	const privacyLabel = lang === 'no' ? 'Personvern' : 'Privacy';

	return `<!DOCTYPE html>
<html lang="${lang === 'no' ? 'nb' : 'en'}" xmlns="http://www.w3.org/1999/xhtml">
<head>
	<meta charset="UTF-8" />
	<meta name="viewport" content="width=device-width, initial-scale=1.0" />
	<meta http-equiv="X-UA-Compatible" content="IE=edge" />
	<title>${escapeHtml(data.subject)}</title>
	<style>
		body, table, td { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; }
		a { color: #C82D2D; }
	</style>
</head>
<body style="margin:0;padding:0;background:#F4F4F2;">
	<table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#F4F4F2;">
		<tr>
			<td align="center" style="padding:24px 16px;">
				<table cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;width:100%;background:#FFFFFF;border-radius:8px;overflow:hidden;">

					<!-- Red accent bar -->
					<tr>
						<td style="height:4px;background:#C82D2D;font-size:0;line-height:0;">&nbsp;</td>
					</tr>

					<!-- Header -->
					<tr>
						<td style="padding:32px 32px 0;">
							<table cellpadding="0" cellspacing="0" border="0" width="100%">
								<tr>
									<td>
										<a href="${baseUrl}/${lang}?${utmParams}" style="text-decoration:none;color:#141414;font-size:32px;font-weight:700;font-family:'Arial Narrow',Arial,sans-serif;letter-spacing:-0.02em;">Gåri</a>
									</td>
									<td align="right" style="color:#6B6862;font-size:13px;">
										${escapeHtml(data.weekLabel)}
									</td>
								</tr>
							</table>
						</td>
					</tr>

					<!-- Message -->
					<tr>
						<td style="padding:24px 32px 0;">
							<p style="margin:0 0 12px;color:#141414;font-size:22px;font-weight:700;line-height:1.3;">${heading}</p>
							<p style="margin:0;color:#4D4D4D;font-size:16px;line-height:1.6;">${body}</p>
						</td>
					</tr>

					<!-- Two CTA buttons -->
					<tr>
						<td style="padding:28px 32px 32px;">
							<table cellpadding="0" cellspacing="0" border="0" width="100%">
								<tr>
									<td style="padding-bottom:12px;">
										<table cellpadding="0" cellspacing="0" border="0" width="100%">
											<tr>
												<td style="border-radius:8px;background:#C82D2D;" align="center">
													<a href="${prefsUrl}" style="display:inline-block;padding:14px 0;width:100%;color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;text-align:center;">${escapeHtml(prefsLabel)}</a>
												</td>
											</tr>
										</table>
									</td>
								</tr>
								<tr>
									<td>
										<table cellpadding="0" cellspacing="0" border="0" width="100%">
											<tr>
												<td style="border-radius:8px;border:2px solid #C82D2D;" align="center">
													<a href="${browseUrl}" style="display:inline-block;padding:14px 0;width:100%;color:#C82D2D;text-decoration:none;font-size:15px;font-weight:600;text-align:center;">${escapeHtml(browseLabel)}</a>
												</td>
											</tr>
										</table>
									</td>
								</tr>
							</table>
						</td>
					</tr>

					<!-- Footer -->
					<tr>
						<td style="padding:24px 32px;border-top:1px solid #E8E8E4;background:#F8F8F6;">
							<p style="margin:0;color:#6B6862;font-size:12px;line-height:1.7;">
								${escapeHtml(footerText)}<br />
								<a href="{$unsubscribe}" style="color:#C82D2D;text-decoration:underline;">${escapeHtml(unsubLabel)}</a> &middot;
								<a href="${prefsUrl}" style="color:#C82D2D;text-decoration:underline;">${escapeHtml(managePrefsLabel)}</a> &middot;
								<a href="${baseUrl}/${lang}/personvern?${utmParams}" style="color:#C82D2D;text-decoration:underline;">${escapeHtml(privacyLabel)}</a>
							</p>
						</td>
					</tr>
				</table>
			</td>
		</tr>
	</table>
</body>
</html>`;
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
