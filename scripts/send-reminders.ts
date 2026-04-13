import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
	process.env.SUPABASE_URL!,
	process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = 'Gåri <post@gaari.no>';
const BASE_URL = 'https://gaari.no';

async function sendReminders() {
	// Find reminders for tomorrow that haven't been sent
	const tomorrow = new Date();
	tomorrow.setDate(tomorrow.getDate() + 1);
	const tomorrowStr = tomorrow.toISOString().slice(0, 10);

	const { data: reminders, error } = await supabase
		.from('event_reminders')
		.select('*')
		.eq('event_date', tomorrowStr)
		.is('sent_at', null);

	if (error) {
		console.error('Failed to fetch reminders:', error.message);
		process.exit(1);
	}

	if (!reminders || reminders.length === 0) {
		console.log(`No reminders to send for ${tomorrowStr}`);
		return;
	}

	console.log(`Sending ${reminders.length} reminders for ${tomorrowStr}`);

	for (const reminder of reminders) {
		const eventUrl = `${BASE_URL}/no/events/${reminder.event_slug}`;
		const subject = `Påminnelse: ${reminder.event_title} i morgen`;
		const html = `
			<div style="font-family: system-ui, sans-serif; max-width: 500px;">
				<h2 style="color: #1a1a1a;">Hei!</h2>
				<p>Du ba om å bli påminnet om dette arrangementet i morgen:</p>
				<div style="background: #f8f8f8; border-radius: 8px; padding: 16px; margin: 16px 0;">
					<strong>${reminder.event_title}</strong><br>
					${reminder.venue_name ? `<span style="color: #666;">${reminder.venue_name}, Bergen</span><br>` : ''}
					<span style="color: #666;">${reminder.event_date}</span>
				</div>
				<a href="${eventUrl}" style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">
					Se arrangement
				</a>
				<p style="margin-top: 24px; font-size: 13px; color: #999;">
					Denne påminnelsen ble sendt fra <a href="${BASE_URL}" style="color: #dc2626;">Gåri</a> — arrangementskalenderen for Bergen.
					<br>Vil du ha ukentlige tips? <a href="${BASE_URL}/no/nyhetsbrev" style="color: #dc2626;">Meld deg på nyhetsbrevet</a>.
				</p>
			</div>
		`;

		if (!RESEND_API_KEY) {
			console.log(`[dry-run] Would send to ${reminder.email}: ${subject}`);
			continue;
		}

		try {
			const res = await fetch('https://api.resend.com/emails', {
				method: 'POST',
				headers: {
					'Authorization': `Bearer ${RESEND_API_KEY}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					from: FROM_EMAIL,
					to: reminder.email,
					subject,
					html
				})
			});

			if (res.ok) {
				await supabase
					.from('event_reminders')
					.update({ sent_at: new Date().toISOString() })
					.eq('id', reminder.id);
				console.log(`✓ Sent to ${reminder.email} for ${reminder.event_title}`);
			} else {
				const err = await res.text();
				console.error(`✗ Failed ${reminder.email}: ${err}`);
			}
		} catch (e) {
			console.error(`✗ Error sending to ${reminder.email}:`, e);
		}

		// Rate limit: 100ms between sends
		await new Promise(r => setTimeout(r, 100));
	}

	console.log('Done.');
}

sendReminders();
