/**
 * Admin Operations CLI — manage pending tasks from Claude Code
 *
 * Usage:
 *   cd scripts && npx tsx admin-ops.ts list [corrections|submissions|optouts|inquiries]
 *   cd scripts && npx tsx admin-ops.ts approve <type> <id>
 *   cd scripts && npx tsx admin-ops.ts reject <type> <id> --feedback "..."
 *   cd scripts && npx tsx admin-ops.ts status <id> <new|contacted|converted|declined>
 *
 * Env vars: PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY
 */

import 'dotenv/config';
import { supabase } from './lib/supabase.js';

const FROM_EMAIL = 'Gåri <noreply@gaari.no>';

const ALLOWED_FIELDS = [
	'title_no', 'title_en', 'description_no', 'description_en',
	'venue_name', 'address', 'bydel', 'price', 'ticket_url',
	'category', 'date_start', 'date_end', 'image_url', 'age_group', 'language'
];

const INQUIRY_STATUSES = ['new', 'contacted', 'converted', 'declined'];

// ─── Helpers ────────────────────────────────────────────────────────

function shortId(id: string): string {
	return id.slice(0, 8);
}

function formatDate(d: string | null): string {
	if (!d) return '–';
	return new Date(d).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' });
}

function truncate(s: string | null, max = 40): string {
	if (!s) return '–';
	return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

async function resolveId(table: string, partialId: string): Promise<string> {
	// UUID columns don't support ilike — fetch IDs and filter client-side
	const { data, error } = await supabase
		.from(table)
		.select('id');

	if (error) throw new Error(`DB error: ${error.message}`);
	const matches = (data ?? []).filter(r => r.id.startsWith(partialId));
	if (matches.length === 0) throw new Error(`No match for ID prefix "${partialId}"`);
	if (matches.length > 1) throw new Error(`Ambiguous ID prefix "${partialId}" — ${matches.length} matches. Use more characters.`);
	return matches[0].id;
}

async function sendEmail(to: string, subject: string, text: string): Promise<void> {
	const key = process.env.RESEND_API_KEY;
	if (!key) {
		console.log('   ⏭  Email skipped (no RESEND_API_KEY)');
		return;
	}

	const resp = await fetch('https://api.resend.com/emails', {
		method: 'POST',
		headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
		body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, text })
	});

	if (resp.ok) {
		console.log(`   📧 Email sent to ${to}`);
	} else {
		console.error(`   ❌ Email failed: ${resp.status} ${await resp.text()}`);
	}
}

function parseArgs(): { command: string; type?: string; id?: string; feedback?: string; status?: string } {
	const args = process.argv.slice(2);
	const command = args[0];

	// Extract --feedback "..."
	let feedback: string | undefined;
	const fbIdx = args.indexOf('--feedback');
	if (fbIdx !== -1 && args[fbIdx + 1]) {
		feedback = args[fbIdx + 1];
	}

	if (command === 'list') {
		return { command, type: args[1] };
	}

	if (command === 'approve' || command === 'reject') {
		return { command, type: args[1], id: args[2], feedback };
	}

	if (command === 'status') {
		return { command, id: args[1], status: args[2] };
	}

	return { command: command || 'help' };
}

// ─── List ───────────────────────────────────────────────────────────

async function listAll() {
	const [corrections, submissions, optouts, inquiries] = await Promise.all([
		supabase.from('edit_suggestions').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
		supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
		supabase.from('opt_out_requests').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
		supabase.from('organizer_inquiries').select('id', { count: 'exact', head: true }).eq('status', 'new')
	]);

	const total = (corrections.count ?? 0) + (submissions.count ?? 0) + (optouts.count ?? 0) + (inquiries.count ?? 0);

	console.log(`\n📋 Pending tasks: ${total}\n`);
	console.log(`   Corrections:      ${corrections.count ?? 0}`);
	console.log(`   Submissions:      ${submissions.count ?? 0}`);
	console.log(`   Data inquiries:   ${optouts.count ?? 0}`);
	console.log(`   B2B inquiries:    ${inquiries.count ?? 0}`);
	console.log('');

	if (total > 0) {
		console.log('Use: list <type> for details');
	}
}

async function listCorrections() {
	const { data, error } = await supabase
		.from('edit_suggestions')
		.select('id, event_id, field, suggested_value, reason, email, created_at')
		.eq('status', 'pending')
		.order('created_at', { ascending: false });

	if (error) { console.error('Error:', error.message); return; }
	if (!data || data.length === 0) { console.log('\n✅ No pending corrections\n'); return; }

	// Fetch event titles
	const eventIds = [...new Set(data.map(d => d.event_id))];
	const { data: events } = await supabase
		.from('events')
		.select('id, title_no')
		.in('id', eventIds);
	const titleMap = new Map((events ?? []).map(e => [e.id, e.title_no]));

	console.log(`\n📝 Pending corrections: ${data.length}\n`);
	for (const c of data) {
		console.log(`  ${shortId(c.id)}  ${formatDate(c.created_at)}  [${c.field}]`);
		console.log(`           Event: ${truncate(titleMap.get(c.event_id) ?? '?', 60)}`);
		console.log(`           Value: ${truncate(c.suggested_value, 60)}`);
		if (c.reason) console.log(`           Reason: ${truncate(c.reason, 60)}`);
		if (c.email) console.log(`           Email: ${c.email}`);
		console.log('');
	}
}

async function listSubmissions() {
	const { data, error } = await supabase
		.from('events')
		.select('id, title_no, venue_name, date_start, submitter_email, created_at')
		.eq('status', 'pending')
		.order('created_at', { ascending: false });

	if (error) { console.error('Error:', error.message); return; }
	if (!data || data.length === 0) { console.log('\n✅ No pending submissions\n'); return; }

	console.log(`\n📝 Pending submissions: ${data.length}\n`);
	for (const s of data) {
		console.log(`  ${shortId(s.id)}  ${formatDate(s.created_at)}  ${truncate(s.title_no, 50)}`);
		console.log(`           Venue: ${truncate(s.venue_name, 50)}  |  Date: ${formatDate(s.date_start)}`);
		if (s.submitter_email) console.log(`           Email: ${s.submitter_email}`);
		console.log('');
	}
}

async function listOptouts() {
	const { data, error } = await supabase
		.from('opt_out_requests')
		.select('id, organization, domain, contact_email, reason, created_at')
		.eq('status', 'pending')
		.order('created_at', { ascending: false });

	if (error) { console.error('Error:', error.message); return; }
	if (!data || data.length === 0) { console.log('\n✅ No pending data inquiries\n'); return; }

	console.log(`\n📝 Pending data inquiries: ${data.length}\n`);
	for (const o of data) {
		console.log(`  ${shortId(o.id)}  ${formatDate(o.created_at)}  ${o.organization}`);
		console.log(`           Domain: ${o.domain}  |  Email: ${o.contact_email}`);
		if (o.reason) console.log(`           Message: ${truncate(o.reason, 60)}`);
		console.log('');
	}
}

async function listInquiries() {
	const { data, error } = await supabase
		.from('organizer_inquiries')
		.select('id, name, organization, email, message, status, created_at')
		.eq('status', 'new')
		.order('created_at', { ascending: false });

	if (error) { console.error('Error:', error.message); return; }
	if (!data || data.length === 0) { console.log('\n✅ No new inquiries\n'); return; }

	console.log(`\n📝 New inquiries: ${data.length}\n`);
	for (const i of data) {
		console.log(`  ${shortId(i.id)}  ${formatDate(i.created_at)}  ${i.name} — ${i.organization}`);
		console.log(`           Email: ${i.email}`);
		if (i.message) console.log(`           Message: ${truncate(i.message, 60)}`);
		console.log('');
	}
}

// ─── Approve ────────────────────────────────────────────────────────

async function approveCorrection(partialId: string) {
	const id = await resolveId('edit_suggestions', partialId);

	const { data: correction, error } = await supabase
		.from('edit_suggestions')
		.select('event_id, field, suggested_value, email')
		.eq('id', id)
		.single();

	if (error || !correction) throw new Error(`Correction not found: ${error?.message}`);

	if (!ALLOWED_FIELDS.includes(correction.field)) {
		throw new Error(`Field "${correction.field}" is not in the allowed fields list`);
	}

	// Get event title
	const { data: event } = await supabase
		.from('events')
		.select('title_no')
		.eq('id', correction.event_id)
		.single();

	const eventTitle = event?.title_no ?? 'Ukjent arrangement';

	// Apply the correction
	const { error: updateErr } = await supabase
		.from('events')
		.update({ [correction.field]: correction.suggested_value })
		.eq('id', correction.event_id);

	if (updateErr) throw new Error(`Failed to update event: ${updateErr.message}`);

	// Mark as applied
	const { error: statusErr } = await supabase
		.from('edit_suggestions')
		.update({ status: 'applied' })
		.eq('id', id);

	if (statusErr) throw new Error(`Failed to update status: ${statusErr.message}`);

	console.log(`\n✅ Correction applied: [${correction.field}] → "${truncate(correction.suggested_value, 60)}"`);
	console.log(`   Event: ${eventTitle}`);

	// Send thank-you email
	if (correction.email) {
		await sendEmail(
			correction.email,
			`Rettelsen din for «${eventTitle}» er lagt inn`,
			[
				`Hei,`,
				``,
				`Takk for at du sendte inn en rettelse for «${eventTitle}» på Gåri.`,
				``,
				`Vi har nå oppdatert arrangementet med informasjonen du foreslo. Vi setter pris på at du hjelper oss med å holde informasjonen korrekt!`,
				``,
				`Vennlig hilsen`,
				`Gåri — gaari.no`
			].join('\n')
		);
	}

	console.log('');
}

async function approveSubmission(partialId: string) {
	const id = await resolveId('events', partialId);

	const { data: event } = await supabase
		.from('events')
		.select('title_no, status')
		.eq('id', id)
		.single();

	if (event?.status !== 'pending') {
		throw new Error(`Event is not pending (status: ${event?.status})`);
	}

	const { error } = await supabase
		.from('events')
		.update({ status: 'approved' })
		.eq('id', id);

	if (error) throw new Error(`Failed to approve: ${error.message}`);

	console.log(`\n✅ Submission approved: ${event.title_no}\n`);
}

async function approveOptout(partialId: string) {
	const id = await resolveId('opt_out_requests', partialId);

	const { data: optout } = await supabase
		.from('opt_out_requests')
		.select('organization, domain')
		.eq('id', id)
		.single();

	const { error } = await supabase
		.from('opt_out_requests')
		.update({ status: 'approved' })
		.eq('id', id);

	if (error) throw new Error(`Failed to approve: ${error.message}`);

	console.log(`\n✅ Opt-out approved: ${optout?.organization} (${optout?.domain})`);
	console.log(`   Events from ${optout?.domain} will be removed at next scraper run\n`);
}

// ─── Reject ─────────────────────────────────────────────────────────

async function rejectCorrection(partialId: string, feedback?: string) {
	const id = await resolveId('edit_suggestions', partialId);

	const { data: correction } = await supabase
		.from('edit_suggestions')
		.select('email, event_id, field')
		.eq('id', id)
		.single();

	if (!correction) throw new Error('Correction not found');

	// Get event title
	const { data: event } = await supabase
		.from('events')
		.select('title_no')
		.eq('id', correction.event_id)
		.single();

	const eventTitle = event?.title_no ?? 'Ukjent arrangement';

	// Mark as rejected
	const { error } = await supabase
		.from('edit_suggestions')
		.update({ status: 'rejected' })
		.eq('id', id);

	if (error) throw new Error(`Failed to reject: ${error.message}`);

	console.log(`\n✅ Correction rejected: [${correction.field}] for "${eventTitle}"`);

	// Send feedback email
	if (correction.email && feedback) {
		await sendEmail(
			correction.email,
			`Angående rettelsen din for «${eventTitle}»`,
			[
				`Hei,`,
				``,
				`Takk for at du sendte inn en rettelse for «${eventTitle}» på Gåri.`,
				``,
				`Dessverre kunne vi ikke legge inn rettelsen denne gangen. Her er tilbakemeldingen:`,
				``,
				feedback,
				``,
				`Ta gjerne kontakt dersom du har spørsmål.`,
				``,
				`Vennlig hilsen`,
				`Gåri — gaari.no`
			].join('\n')
		);
	} else if (!correction.email) {
		console.log('   (no email on file — no notification sent)');
	} else if (!feedback) {
		console.log('   (no feedback provided — no notification sent)');
	}

	console.log('');
}

async function rejectSubmission(partialId: string, feedback?: string) {
	const id = await resolveId('events', partialId);

	const { data: event } = await supabase
		.from('events')
		.select('title_no, submitter_email, image_url, slug')
		.eq('id', id)
		.single();

	if (!event) throw new Error('Event not found');

	// Send rejection email
	if (event.submitter_email && feedback) {
		await sendEmail(
			event.submitter_email,
			`Arrangementet ditt «${event.title_no}» ble ikke publisert`,
			[
				`Hei,`,
				``,
				`Takk for at du sendte inn arrangementet «${event.title_no}» til Gåri.`,
				``,
				`Dessverre kan vi ikke publisere det denne gangen. Her er tilbakemeldingen fra redaksjonen:`,
				``,
				feedback,
				``,
				`Du er velkommen til å sende inn på nytt dersom du retter opp i tilbakemeldingen.`,
				``,
				`Vennlig hilsen`,
				`Gåri — gaari.no`
			].join('\n')
		);
	}

	// Delete image from storage
	if (event.image_url && event.slug) {
		try {
			await supabase.storage.from('event-images').remove([`events/${event.slug}.jpg`]);
		} catch { /* skip */ }
	}

	// Delete event
	const { error } = await supabase.from('events').delete().eq('id', id);
	if (error) throw new Error(`Failed to delete: ${error.message}`);

	console.log(`\n✅ Submission rejected and deleted: ${event.title_no}\n`);
}

async function rejectOptout(partialId: string, feedback?: string) {
	const id = await resolveId('opt_out_requests', partialId);

	const { data: optout } = await supabase
		.from('opt_out_requests')
		.select('contact_email, organization')
		.eq('id', id)
		.single();

	if (!optout) throw new Error('Opt-out request not found');

	// Mark as rejected
	const { error } = await supabase
		.from('opt_out_requests')
		.update({ status: 'rejected' })
		.eq('id', id);

	if (error) throw new Error(`Failed to reject: ${error.message}`);

	console.log(`\n✅ Data inquiry rejected: ${optout.organization}`);

	// Send feedback email
	if (optout.contact_email && feedback) {
		await sendEmail(
			optout.contact_email,
			`Angående henvendelsen din om datainnsamling for ${optout.organization}`,
			[
				`Hei,`,
				``,
				`Takk for at du tok kontakt med Gåri angående datainnsamling for ${optout.organization}.`,
				``,
				feedback,
				``,
				`Ta gjerne kontakt igjen dersom du har spørsmål.`,
				``,
				`Vennlig hilsen`,
				`Gåri — gaari.no`
			].join('\n')
		);
	} else if (!feedback) {
		console.log('   (no feedback provided — no notification sent)');
	}

	console.log('');
}

async function rejectInquiry(partialId: string, feedback?: string) {
	const id = await resolveId('organizer_inquiries', partialId);

	const { data: inquiry } = await supabase
		.from('organizer_inquiries')
		.select('email, name')
		.eq('id', id)
		.single();

	if (!inquiry) throw new Error('Inquiry not found');

	// Mark as declined
	const { error } = await supabase
		.from('organizer_inquiries')
		.update({ status: 'declined' })
		.eq('id', id);

	if (error) throw new Error(`Failed to decline: ${error.message}`);

	console.log(`\n✅ Inquiry declined: ${inquiry.name}`);

	// Send feedback email
	if (inquiry.email && feedback) {
		await sendEmail(
			inquiry.email,
			`Angående din henvendelse til Gåri`,
			[
				`Hei ${inquiry.name},`,
				``,
				`Takk for at du tok kontakt med Gåri.`,
				``,
				feedback,
				``,
				`Ta gjerne kontakt igjen dersom du har spørsmål.`,
				``,
				`Vennlig hilsen`,
				`Gåri — gaari.no`
			].join('\n')
		);
	} else if (!feedback) {
		console.log('   (no feedback provided — no notification sent)');
	}

	console.log('');
}

// ─── Status (inquiries only) ────────────────────────────────────────

async function updateInquiryStatus(partialId: string, newStatus: string) {
	if (!INQUIRY_STATUSES.includes(newStatus)) {
		throw new Error(`Invalid status "${newStatus}". Must be one of: ${INQUIRY_STATUSES.join(', ')}`);
	}

	const id = await resolveId('organizer_inquiries', partialId);

	const { data: inquiry } = await supabase
		.from('organizer_inquiries')
		.select('name, organization')
		.eq('id', id)
		.single();

	const { error } = await supabase
		.from('organizer_inquiries')
		.update({ status: newStatus })
		.eq('id', id);

	if (error) throw new Error(`Failed to update: ${error.message}`);

	console.log(`\n✅ Inquiry status updated: ${inquiry?.name} (${inquiry?.organization}) → ${newStatus}\n`);
}

// ─── Main ───────────────────────────────────────────────────────────

async function main() {
	const { command, type, id, feedback, status } = parseArgs();

	switch (command) {
		case 'list':
			if (!type) await listAll();
			else if (type === 'corrections') await listCorrections();
			else if (type === 'submissions') await listSubmissions();
			else if (type === 'optouts') await listOptouts();
			else if (type === 'inquiries') await listInquiries();
			else { console.error(`Unknown type: ${type}`); process.exit(1); }
			break;

		case 'approve':
			if (!type || !id) { console.error('Usage: approve <type> <id>'); process.exit(1); }
			if (type === 'correction') await approveCorrection(id);
			else if (type === 'submission') await approveSubmission(id);
			else if (type === 'optout') await approveOptout(id);
			else { console.error(`Cannot approve type: ${type}`); process.exit(1); }
			break;

		case 'reject':
			if (!type || !id) { console.error('Usage: reject <type> <id> [--feedback "..."]'); process.exit(1); }
			if (type === 'correction') await rejectCorrection(id, feedback);
			else if (type === 'submission') await rejectSubmission(id, feedback);
			else if (type === 'optout') await rejectOptout(id, feedback);
			else if (type === 'inquiry') await rejectInquiry(id, feedback);
			else { console.error(`Cannot reject type: ${type}`); process.exit(1); }
			break;

		case 'status':
			if (!id || !status) { console.error('Usage: status <id> <new|contacted|converted|declined>'); process.exit(1); }
			await updateInquiryStatus(id, status);
			break;

		default:
			console.log(`
Gåri Admin Operations

Usage:
  npx tsx admin-ops.ts list [corrections|submissions|optouts|inquiries]
  npx tsx admin-ops.ts approve <correction|submission|optout> <id>
  npx tsx admin-ops.ts reject <correction|submission|optout|inquiry> <id> [--feedback "..."]
  npx tsx admin-ops.ts status <id> <new|contacted|converted|declined>

IDs can be partial (first 8 characters).
`);
	}
}

main().catch(err => {
	console.error(`\n❌ ${err.message}\n`);
	process.exit(1);
});
