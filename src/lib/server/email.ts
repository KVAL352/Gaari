import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

const ADMIN_EMAIL = 'post@gaari.no';

function supabaseTableUrl(table: string): string {
	const ref = PUBLIC_SUPABASE_URL.replace('https://', '').split('.')[0];
	return `https://supabase.com/dashboard/project/${ref}/editor/${table}`;
}

let resend: Resend;

function getResend(): Resend {
	if (!resend) {
		if (!env.RESEND_API_KEY) {
			throw new Error('RESEND_API_KEY is not set');
		}
		resend = new Resend(env.RESEND_API_KEY);
	}
	return resend;
}

export async function sendRejectionEmail(
	to: string,
	eventTitle: string,
	feedback: string
): Promise<void> {
	await getResend().emails.send({
		from: 'Gåri <noreply@gaari.no>',
		to,
		subject: `Arrangementet ditt «${eventTitle}» ble ikke publisert`,
		text: [
			`Hei,`,
			``,
			`Takk for at du sendte inn arrangementet «${eventTitle}» til Gåri.`,
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
	});
}

export async function sendInquiryDeclineEmail(
	to: string,
	name: string,
	feedback: string
): Promise<void> {
	await getResend().emails.send({
		from: 'Gåri <noreply@gaari.no>',
		to,
		subject: `Angående din henvendelse til Gåri`,
		text: [
			`Hei ${name},`,
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
	});
}

export async function notifyInquiry(data: {
	name: string;
	organization: string;
	email: string;
	message: string | null;
}): Promise<void> {
	await getResend().emails.send({
		from: 'Gåri <noreply@gaari.no>',
		to: ADMIN_EMAIL,
		replyTo: data.email,
		subject: `[Inquiry] ${data.organization} — ${data.name}`,
		text: [
			`New inquiry from the B2B contact form (for-arrangorer).`,
			``,
			`Name: ${data.name}`,
			`Organization: ${data.organization}`,
			`Email: ${data.email}`,
			``,
			`Message:`,
			data.message || '(no message)',
			``,
			`---`,
			supabaseTableUrl('organizer_inquiries')
		].join('\n')
	});
}

export async function notifyOptOut(data: {
	organization: string;
	domain: string;
	contactEmail: string;
	reason: string | null;
}): Promise<void> {
	await getResend().emails.send({
		from: 'Gåri <noreply@gaari.no>',
		to: ADMIN_EMAIL,
		replyTo: data.contactEmail,
		subject: `[Opt-out] ${data.organization} (${data.domain})`,
		text: [
			`New opt-out request from the data transparency page (datainnsamling).`,
			``,
			`Organization: ${data.organization}`,
			`Domain: ${data.domain}`,
			`Contact email: ${data.contactEmail}`,
			``,
			`Reason:`,
			data.reason || '(no reason given)',
			``,
			`Action: Review and approve/reject in Supabase. When approved, the scraper pipeline will stop collecting from this domain.`,
			``,
			`---`,
			supabaseTableUrl('opt_out_requests')
		].join('\n')
	});
}

export async function notifySubmission(data: {
	title: string;
	venue: string;
	dateStart: string;
	ticketUrl: string | null;
	submitterEmail: string | null;
}): Promise<void> {
	await getResend().emails.send({
		from: 'Gåri <noreply@gaari.no>',
		to: ADMIN_EMAIL,
		...(data.submitterEmail ? { replyTo: data.submitterEmail } : {}),
		subject: `[Submission] ${data.title} — ${data.venue}`,
		text: [
			`New event submitted for review.`,
			``,
			`Title: ${data.title}`,
			`Venue: ${data.venue}`,
			`Date: ${data.dateStart}`,
			`Ticket URL: ${data.ticketUrl || '(none)'}`,
			`Submitter email: ${data.submitterEmail || '(not provided)'}`,
			``,
			`Review at /admin/submissions or in Supabase:`,
			supabaseTableUrl('events')
		].join('\n')
	});
}

export async function notifyCorrection(data: {
	eventTitle: string;
	eventSlug: string;
	field: string;
	suggestedValue: string;
	reason: string | null;
}): Promise<void> {
	await getResend().emails.send({
		from: 'Gåri <noreply@gaari.no>',
		to: ADMIN_EMAIL,
		subject: `[Correction] ${data.field} — ${data.eventTitle}`,
		text: [
			`New correction suggestion for an event.`,
			``,
			`Event: ${data.eventTitle}`,
			`Field: ${data.field}`,
			`Suggested value: ${data.suggestedValue}`,
			``,
			`Reason:`,
			data.reason || '(no reason given)',
			``,
			`---`,
			`Event: https://gaari.no/no/events/${data.eventSlug}`,
			supabaseTableUrl('edit_suggestions')
		].join('\n')
	});
}
